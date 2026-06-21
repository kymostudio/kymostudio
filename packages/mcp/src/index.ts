import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import * as jose from "jose";

export interface Env {
  OAUTH_KV: KVNamespace;
  DB: D1Database;
  MCP_OBJECT: DurableObjectNamespace;
  EDITOR_ROOM: DurableObjectNamespace;
  USER_CHANNEL: DurableObjectNamespace;
  OAUTH_PROVIDER: any;
  GOOGLE_CLIENT_ID: string;
  ALLOWED_EMAILS: string;
  ICONS: R2Bucket;
  ICON_ADMIN_EMAILS: string;
}

const EDITOR_URL = "https://editor.kymo.studio";
const GOOGLE_JWKS = jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

async function verifyGoogleIdToken(idToken: string, clientId: string) {
  const { payload } = await jose.jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  return payload as { email?: string; sub?: string; name?: string };
}
function emailAllowed(email: string | undefined, env: Env): boolean {
  if (!email) return false;
  const list = (env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.length === 0 || list.includes(email.toLowerCase());
}
function roomFor(env: Env, id: string) {
  return env.EDITOR_ROOM.get(env.EDITOR_ROOM.idFromName(id));
}

// ---- Browser session: a Worker-issued opaque httpOnly cookie (CR-KEDITOR-002). ----
// The Google ID token is verified ONCE at /api/session login; the long-lived
// session of record is this cookie, backed by the `sessions` D1 table. Sliding
// idle window + a hard absolute cap; ids are stored HASHED so a DB leak is not a
// session leak. This replaces "the raw 1h Google ID token as the per-call
// credential" — the legacy token is still accepted during migration (see the
// fallback in resolveAuth). editor.kymo.studio and mcp.kymo.studio share the
// registrable domain kymo.studio, so one Domain=kymo.studio cookie spans both.
const SESSION_COOKIE = "__Secure-kymo_sess";
const SESSION_IDLE_MS = 14 * 24 * 60 * 60 * 1000; // sliding renewal window
const SESSION_ABS_MS = 30 * 24 * 60 * 60 * 1000;  // absolute cap → re-auth via Google
const SESSION_RENEW_MS = 24 * 60 * 60 * 1000;     // throttle the sliding write to ≤1/day
const COOKIE_DOMAIN = "kymo.studio";
const ICONS_URL = "https://icons.kymo.studio";
const ALLOWED_ORIGINS = new Set([EDITOR_URL, ICONS_URL, "http://localhost:8231", "http://127.0.0.1:8231", "http://localhost:8099", "http://127.0.0.1:8099"]);

let sessionsTableReady = false;
async function ensureSessionsTable(env: Env) {
  if (sessionsTableReady) return;
  try { await env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (id_hash TEXT PRIMARY KEY, email TEXT, name TEXT, created_at INTEGER, last_seen INTEGER, expires_at INTEGER, ua TEXT, revoked INTEGER)").run(); } catch {}
  sessionsTableReady = true;
}

function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function getCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") || "").split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}
function sessionCookie(value: string, maxAgeSec: number): string {
  return `${SESSION_COOKIE}=${value}; Domain=${COOKIE_DOMAIN}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}
function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Domain=${COOKIE_DOMAIN}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
function corsFor(request: Request, methods: string): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : EDITOR_URL,
    "access-control-allow-methods": methods,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-credentials": "true",
    "vary": "Origin",
  };
}

async function createSession(env: Env, email: string, name: string, ua: string): Promise<string> {
  await ensureSessionsTable(env);
  const raw = randomToken();
  const now = Date.now();
  await env.DB.prepare("INSERT INTO sessions (id_hash, email, name, created_at, last_seen, expires_at, ua, revoked) VALUES (?,?,?,?,?,?,?,0)")
    .bind(await sha256hex(raw), email, (name || "").slice(0, 200), now, now, now + SESSION_IDLE_MS, (ua || "").slice(0, 200)).run();
  return raw;
}
async function revokeSession(env: Env, request: Request, all: boolean) {
  const raw = getCookie(request, SESSION_COOKIE);
  if (!raw) return;
  await ensureSessionsTable(env);
  const h = await sha256hex(raw);
  if (all) {
    const row = await env.DB.prepare("SELECT email FROM sessions WHERE id_hash=?").bind(h).first<{ email: string }>();
    if (row?.email) { try { await env.DB.prepare("DELETE FROM sessions WHERE email=?").bind(row.email).run(); } catch {} return; }
  }
  try { await env.DB.prepare("DELETE FROM sessions WHERE id_hash=?").bind(h).run(); } catch {}
}

type AuthOk = { email: string; name?: string; setCookie?: string };
type AuthErr = { error: "unauthorized" | "forbidden"; email?: string };
// Resolve the caller's identity from (1) the session cookie [preferred], else
// (2) a legacy Google id_token in ?id_token= / Authorization: Bearer [migration].
// `renew` performs the throttled sliding-window write (REST only — skip for WS
// upgrades, where attaching Set-Cookie to a 101 is awkward and a REST call renews
// soon enough anyway). Returns the email (+ a Set-Cookie value when it renewed).
async function resolveAuth(request: Request, env: Env, renew = true): Promise<AuthOk | AuthErr> {
  const raw = getCookie(request, SESSION_COOKIE);
  if (raw) {
    await ensureSessionsTable(env);
    const h = await sha256hex(raw);
    const row = await env.DB.prepare("SELECT email, name, created_at, last_seen, expires_at, revoked FROM sessions WHERE id_hash=?").bind(h).first<any>();
    const now = Date.now();
    if (row && !row.revoked && now < row.expires_at && now < row.created_at + SESSION_ABS_MS) {
      if (!emailAllowed(row.email, env)) return { error: "forbidden", email: row.email };
      let setCookie: string | undefined;
      if (renew && now - row.last_seen > SESSION_RENEW_MS) {
        const newExp = Math.min(now + SESSION_IDLE_MS, row.created_at + SESSION_ABS_MS);
        try { await env.DB.prepare("UPDATE sessions SET last_seen=?, expires_at=? WHERE id_hash=?").bind(now, newExp, h).run(); } catch {}
        setCookie = sessionCookie(raw, Math.floor((newExp - now) / 1000));
      }
      return { email: row.email, name: row.name, setCookie };
    }
    // stale/revoked cookie → fall through to the legacy token (migration grace)
  }
  const idToken = new URL(request.url).searchParams.get("id_token") || (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (idToken) {
    try {
      const p = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
      if (!emailAllowed(p.email, env)) return { error: "forbidden", email: p.email };
      return { email: p.email!, name: p.name };
    } catch { /* fall through to unauthorized */ }
  }
  return { error: "unauthorized" };
}

// ---- Icons admin: live add/edit/delete, managed in the DB (no code commits). ----
// The website (icons.kymo.studio) ships a STATIC manifest; admin mutations are a
// dynamic OVERLAY kept in the D1 table `icon_overrides` (the runtime catalogue).
// The site merges static ⊕ overlay at load, so changes show without a redeploy.
// Art binaries live in R2 at the manifest path (`icons/<set>/…`), served by
// cdn.kymo.studio; `ver` (an edit timestamp) busts the CDN cache on replace.
type Variant = { variant: string; key: string; path: string; ver: number };
type Brand = { set: string; slug: string; name: string; color: string; variants: Variant[] };
const ICON_CDN = "https://cdn.kymo.studio";
const VORDER: Record<string, number> = { icon: 0, color: 1, text: 2, brand: 3 };

function isIconAdmin(email: string | undefined, env: Env): boolean {
  if (!email) return false;
  const list = (env.ICON_ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.length > 0 && list.includes(email.toLowerCase());
}
const iconSlug = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
function b64ToBytes(b64: string): Uint8Array {
  const s = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64; // tolerate data: URLs
  const bin = atob(s.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Runtime catalogue in D1: `brands` (1 row/brand — the display metadata) +
// `icons` (N variant rows/brand, linked by set_id+brand). A tombstone (hide a
// static manifest icon) is an icons row with brand NULL + removed=1. Art binaries
// live in R2 at `icons/<set>/<brand>[-variant].<ext>`, served by cdn.kymo.studio.
let iconTablesReady = false;
async function ensureIconTables(env: Env) {
  if (iconTablesReady) return;
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS brands (set_id TEXT, slug TEXT, name TEXT, color TEXT, grp TEXT, created_at INTEGER, PRIMARY KEY (set_id, slug))").run();
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS icons (key TEXT PRIMARY KEY, set_id TEXT, brand TEXT, variant TEXT, path TEXT, ver INTEGER, removed INTEGER DEFAULT 0, updated_at INTEGER)").run();
  } catch { /* ignore */ }
  iconTablesReady = true;
}
// Whole runtime catalogue for the site: brands (with grouped variants), a flat
// map of each brand's default variant (back-compat), and removed tombstones.
async function readCatalog(env: Env): Promise<{ brands: Brand[]; icons: Record<string, { path: string; ver: number }>; removed: string[] }> {
  await ensureIconTables(env);
  const brands = new Map<string, Brand>(); // "set:slug" -> Brand
  const flat: Record<string, { path: string; ver: number }> = {};
  const removed: string[] = [];
  try {
    const br = await env.DB.prepare("SELECT set_id, slug, name, color FROM brands").all<any>();
    for (const b of br.results || []) brands.set(`${b.set_id}:${b.slug}`, { set: b.set_id, slug: b.slug, name: b.name || b.slug, color: b.color || "", variants: [] });
    const ic = await env.DB.prepare("SELECT key, set_id, brand, variant, path, ver, removed FROM icons").all<any>();
    for (const r of ic.results || []) {
      if (r.removed) { removed.push(r.key); continue; }
      if (!r.path) continue;
      const bk = r.brand ? `${r.set_id}:${r.brand}` : null;
      if (bk && brands.has(bk)) brands.get(bk)!.variants.push({ variant: r.variant, key: r.key, path: r.path, ver: r.ver || 0 });
      else flat[r.key] = { path: r.path, ver: r.ver || 0 }; // brand-less single icon
    }
  } catch { /* empty / unavailable */ }
  const out: Brand[] = [];
  for (const b of brands.values()) {
    if (!b.variants.length) continue;
    b.variants.sort((a, z) => (VORDER[a.variant] ?? 9) - (VORDER[z.variant] ?? 9));
    const def = b.variants.find((v) => v.variant === "color") || b.variants.find((v) => v.variant === "icon") || b.variants[0];
    flat[`${b.set}:${b.slug}`] = { path: def.path, ver: def.ver }; // default variant under the brand key
    out.push(b);
  }
  return { brands: out, icons: flat, removed };
}
async function upsertBrand(env: Env, set: string, slug: string, name: string, color: string) {
  await ensureIconTables(env);
  await env.DB.prepare("INSERT INTO brands (set_id, slug, name, color, created_at) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(set_id, slug) DO UPDATE SET name=?3, color=?4")
    .bind(set, slug, name, color, Date.now()).run();
}
async function upsertIconRow(env: Env, key: string, set: string | null, brand: string | null, variant: string | null, path: string | null, ver: number | null, removed: number) {
  await ensureIconTables(env);
  await env.DB.prepare("INSERT INTO icons (key, set_id, brand, variant, path, ver, removed, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8) ON CONFLICT(key) DO UPDATE SET set_id=?2, brand=?3, variant=?4, path=?5, ver=?6, removed=?7, updated_at=?8")
    .bind(key, set, brand, variant, path, ver, removed, Date.now()).run();
}
async function lookupIconRow(env: Env, key: string): Promise<{ set_id: string | null; brand: string | null; variant: string | null; path: string | null; removed: number } | null> {
  await ensureIconTables(env);
  return await env.DB.prepare("SELECT set_id, brand, variant, path, removed FROM icons WHERE key=?1").bind(key).first<any>();
}
// Add or replace an icon variant. brand defaults to a slug of name; variant 'icon'.
async function addIcon(env: Env, input: { set: string; name?: string; brand?: string; variant?: string; image: string; format?: string }) {
  const ext: "png" | "svg" = (input.format || "png").toLowerCase() === "svg" ? "svg" : "png";
  const set = iconSlug(input.set || "");
  const brand = iconSlug(input.brand || input.name || "");
  const variant = (input.variant || "icon").toLowerCase();
  if (!set || brand === "x") throw new Error("set and name/brand are required");
  const bytes = b64ToBytes(input.image || "");
  if (!bytes.length) throw new Error("empty image");
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const head = new TextDecoder().decode(bytes.slice(0, 256)).toLowerCase();
  if (ext === "png" && !isPng) throw new Error("not a PNG (use format:'svg' for SVG)");
  if (ext === "svg" && !head.includes("<svg")) throw new Error("not an SVG");
  const suffix = variant === "icon" ? "" : `-${variant}`;
  const key = `${set}:${brand}${suffix}`;
  const path = `icons/${set}/${brand}${suffix}.${ext}`;
  const ver = Date.now();
  await env.ICONS.put(path, bytes, { httpMetadata: { contentType: ext === "svg" ? "image/svg+xml" : "image/png", cacheControl: "public, max-age=31536000" } });
  await upsertBrand(env, set, brand, input.name || brand, "");
  await upsertIconRow(env, key, set, brand, variant, path, ver, 0);
  return { key, path, brand, variant, url: `${ICON_CDN}/${path}?v=${ver}` };
}
// Delete a key. Overlay-added → purge art + row (+ the brand if it has no more
// variants). Static manifest icon → tombstone row (removed=1).
async function deleteIcon(env: Env, key: string) {
  if (!key) throw new Error("key is required");
  const row = await lookupIconRow(env, key);
  if (row && row.path && !row.removed) {
    try { await env.ICONS.delete(row.path); } catch { /* ignore */ }
    await env.DB.prepare("DELETE FROM icons WHERE key=?1").bind(key).run();
    if (row.brand) {
      const left = await env.DB.prepare("SELECT count(*) AS n FROM icons WHERE set_id=?1 AND brand=?2").bind(row.set_id, row.brand).first<any>();
      if (!left || !left.n) await env.DB.prepare("DELETE FROM brands WHERE set_id=?1 AND slug=?2").bind(row.set_id, row.brand).run();
    }
  } else {
    await upsertIconRow(env, key, null, null, null, null, null, 1);
  }
  return { key, removed: true };
}
async function resolveIconPath(env: Env, key: string): Promise<{ path: string; ext: "png" | "svg" } | null> {
  const row = await lookupIconRow(env, key);
  let path: string | undefined = row?.path || undefined;
  if (!path) {
    try { path = ((await fetch(`${ICONS_URL}/icons-manifest.json`).then((r) => r.json())) as any)?.icons?.[key]; } catch { /* ignore */ }
  }
  if (!path) return null;
  return { path, ext: path.toLowerCase().endsWith(".svg") ? "svg" : "png" };
}
// Replace the art of an existing icon (keeps its brand/variant); busts CDN cache.
async function editIcon(env: Env, input: { key: string; image: string; format?: string }) {
  if (!input.key) throw new Error("key is required");
  const resolved = await resolveIconPath(env, input.key);
  if (!resolved) throw new Error(`unknown icon key: ${input.key}`);
  const ext = (input.format || resolved.ext).toLowerCase() === "svg" ? "svg" : "png";
  const bytes = b64ToBytes(input.image || "");
  if (!bytes.length) throw new Error("empty image");
  const ver = Date.now();
  await env.ICONS.put(resolved.path, bytes, { httpMetadata: { contentType: ext === "svg" ? "image/svg+xml" : "image/png", cacheControl: "public, max-age=31536000" } });
  const row = await lookupIconRow(env, input.key);
  await upsertIconRow(env, input.key, row?.set_id ?? null, row?.brand ?? null, row?.variant ?? "icon", resolved.path, ver, 0);
  return { key: input.key, path: resolved.path, url: `${ICON_CDN}/${resolved.path}?v=${ver}` };
}

// ---- Diagram + workspace persistence: Cloudflare D1 (database of record). ----
// The EditorRoom DO holds the live document; D1 keeps the queryable copy:
// metadata always, plus a source snapshot (refreshed on rename/kind change,
// throttled during typing, flushed when a tab closes).
type IdxEntry = { id: string; title: string; updatedAt: number; kind?: string; ws?: string; hasThumb?: boolean };

// `thumb` (a rendered SVG snapshot for the Diagrams list) was added after the
// table shipped — self-migrate idempotently so cold/local/prod D1s converge
// without a separate migration step. The duplicate-column error on re-run is
// expected and swallowed; a per-isolate flag keeps it off the hot path.
let thumbColReady = false;
async function ensureThumbColumn(env: Env) {
  if (thumbColReady) return;
  try { await env.DB.prepare("ALTER TABLE diagrams ADD COLUMN thumb TEXT").run(); } catch {}
  thumbColReady = true;
}

// `parent_id` turns the flat `workspaces` table into a FOLDER tree (NULL/"" = a
// root folder). Added after the table shipped — self-migrate idempotently like
// `thumb` above, so existing workspaces simply become root folders with no data
// migration. A diagram's `ws` is its parent-folder id ("" = root level).
let folderColReady = false;
async function ensureFolderColumn(env: Env) {
  if (folderColReady) return;
  try { await env.DB.prepare("ALTER TABLE workspaces ADD COLUMN parent_id TEXT").run(); } catch {}
  folderColReady = true;
}

// Deletes are SOFT: a `deleted` timestamp column (NULL = live) on both tables.
// Rows stay in D1 (recoverable / auditable); lists just exclude deleted rows.
let deletedColReady = false;
async function ensureDeletedColumn(env: Env) {
  if (deletedColReady) return;
  try { await env.DB.prepare("ALTER TABLE diagrams ADD COLUMN deleted INTEGER").run(); } catch {}
  try { await env.DB.prepare("ALTER TABLE workspaces ADD COLUMN deleted INTEGER").run(); } catch {}
  deletedColReady = true;
}

// `project_id` adds a PROJECT layer ABOVE folders: a project owns many folders
// (workspaces) + diagrams. Added after both tables shipped — self-migrate
// idempotently like the columns above. Pre-projects rows have project_id NULL;
// they are adopted into the user's default project lazily (see
// `ensureDefaultProject`), and default-scoped lists also sweep in NULL rows so
// an editor that doesn't yet send `?project=` keeps seeing everything.
let projectColsReady = false;
async function ensureProjectColumns(env: Env) {
  if (projectColsReady) return;
  try { await env.DB.prepare("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, owner TEXT, name TEXT, created_at INTEGER, deleted INTEGER)").run(); } catch {}
  try { await env.DB.prepare("ALTER TABLE workspaces ADD COLUMN project_id TEXT").run(); } catch {}
  try { await env.DB.prepare("ALTER TABLE diagrams ADD COLUMN project_id TEXT").run(); } catch {}
  projectColsReady = true;
}

async function listIndex(env: Env, email: string, proj?: ProjectScope): Promise<IdxEntry[]> {
  await migrateKvToD1(env, email);
  await ensureThumbColumn(env);
  await ensureDeletedColumn(env);
  await ensureProjectColumns(env);
  const scope = proj ? (proj.isDefault ? " AND (project_id = ?2 OR project_id IS NULL)" : " AND project_id = ?2") : "";
  const stmt = env.DB.prepare(
    `SELECT id, title, kind, ws, updated_at, (thumb IS NOT NULL AND thumb != '') AS has_thumb FROM diagrams WHERE owner = ?1 AND deleted IS NULL${scope} ORDER BY updated_at DESC`
  );
  const rs = await (proj ? stmt.bind(email, proj.id) : stmt.bind(email))
    .all<{ id: string; title: string; kind: string; ws: string; updated_at: number; has_thumb: number }>();
  return (rs.results ?? []).map((r) => ({ id: r.id, title: r.title, kind: r.kind, ws: r.ws, updatedAt: r.updated_at, hasThumb: !!r.has_thumb }));
}

async function touchIndex(env: Env, email: string, id: string, title?: string, kind?: string) {
  await env.DB.prepare(
    `INSERT INTO diagrams (id, owner, title, kind, updated_at) VALUES (?1, ?2, COALESCE(?3, 'Untitled'), COALESCE(?4, 'kymo'), ?5)
     ON CONFLICT(id) DO UPDATE SET title = COALESCE(?3, title), kind = COALESCE(?4, kind), updated_at = ?5`
  ).bind(id, email, title ?? null, kind ?? null, Date.now()).run();
  await env.OAUTH_KV.put(`last:${email}`, id);
}

async function removeFromIndex(env: Env, email: string, id: string) {
  await env.DB.prepare("DELETE FROM diagrams WHERE id = ?1 AND owner = ?2").bind(id, email).run();
  const last = await env.OAUTH_KV.get(`last:${email}`);
  if (last === id) {
    const next = await env.DB.prepare("SELECT id FROM diagrams WHERE owner = ?1 ORDER BY updated_at DESC LIMIT 1")
      .bind(email).first<{ id: string }>();
    if (next) await env.OAUTH_KV.put(`last:${email}`, next.id);
    else await env.OAUTH_KV.delete(`last:${email}`);
  }
}

// Soft delete: mark the row `deleted` (keep it + its room DO content for
// recovery). Returns 403 when the diagram isn't found / not owned.
async function destroyDiagram(env: Env, email: string, id: string): Promise<number> {
  await ensureDeletedColumn(env);
  const res = await env.DB.prepare("UPDATE diagrams SET deleted = ?1 WHERE id = ?2 AND owner = ?3 AND deleted IS NULL")
    .bind(Date.now(), id, email).run();
  // fix the "last opened" pointer if it pointed at this diagram
  const last = await env.OAUTH_KV.get(`last:${email}`);
  if (last === id) {
    const next = await env.DB.prepare("SELECT id FROM diagrams WHERE owner = ?1 AND deleted IS NULL ORDER BY updated_at DESC LIMIT 1")
      .bind(email).first<{ id: string }>();
    if (next) await env.OAUTH_KV.put(`last:${email}`, next.id);
    else await env.OAUTH_KV.delete(`last:${email}`);
  }
  // 0 changes = not found / not owned / already deleted → treat unknown as forbidden
  if (!res.meta.changes) {
    const owned = await env.DB.prepare("SELECT 1 FROM diagrams WHERE id = ?1 AND owner = ?2").bind(id, email).first();
    if (!owned) return 403;
  }
  return 200;
}

// Permanent delete (from the trash / auto-purge): wipe the room DO + drop the row.
async function hardDeleteDiagram(env: Env, email: string, id: string) {
  try {
    await roomFor(env, id).fetch("https://room/destroy", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: email }),
    });
  } catch {}
  await env.DB.prepare("DELETE FROM diagrams WHERE id = ?1 AND owner = ?2").bind(id, email).run();
}

// Cron: permanently remove everything soft-deleted before `cutoff` (all owners).
async function purgeOldDeleted(env: Env, cutoff: number) {
  await ensureDeletedColumn(env);
  const ds = await env.DB.prepare("SELECT id, owner FROM diagrams WHERE deleted IS NOT NULL AND deleted < ?1")
    .bind(cutoff).all<{ id: string; owner: string }>();
  for (const r of ds.results ?? []) await hardDeleteDiagram(env, r.owner, r.id);
  await env.DB.prepare("DELETE FROM workspaces WHERE deleted IS NOT NULL AND deleted < ?1").bind(cutoff).run();
}

// One-time per-user migration of the old KV layout (idx:<email>:<id> metadata
// keys, legacy idx:<email> list value, wss/wsmap JSON values) into D1. Sources
// come from each room DO. Guarded by a d1done flag; INSERT OR IGNORE keeps it
// idempotent if KV list() lag echoes already-deleted keys.
function idxKey(email: string, id: string) { return `idx:${email}:${id}`; }
async function migrateKvToD1(env: Env, email: string) {
  if (await env.OAUTH_KV.get(`d1done:${email}`)) return;
  const wssRaw = await env.OAUTH_KV.get(`wss:${email}`);
  if (wssRaw != null) {
    try {
      for (const w of JSON.parse(wssRaw) as { id: string; name: string; createdAt?: number }[]) {
        if (w && w.id) await env.DB.prepare("INSERT OR IGNORE INTO workspaces (id, owner, name, created_at) VALUES (?1, ?2, ?3, ?4)")
          .bind(w.id, email, w.name || "Workspace", w.createdAt ?? Date.now()).run();
      }
    } catch {}
    await env.OAUTH_KV.delete(`wss:${email}`);
  }
  let wsmap: Record<string, string> = {};
  const wsmapRaw = await env.OAUTH_KV.get(`wsmap:${email}`);
  try { wsmap = JSON.parse(wsmapRaw || "{}"); } catch {}

  const entries = new Map<string, IdxEntry>();
  const legacy = await env.OAUTH_KV.get(`idx:${email}`);
  if (legacy != null) {
    try { for (const e of JSON.parse(legacy) as IdxEntry[]) if (e && e.id) entries.set(e.id, e); } catch {}
  }
  let cursor: string | undefined;
  do {
    const page = await env.OAUTH_KV.list<IdxEntry>({ prefix: `idx:${email}:`, cursor });
    for (const k of page.keys) {
      const id = k.name.slice(`idx:${email}:`.length);
      entries.set(id, { id, title: k.metadata?.title ?? "Untitled", updatedAt: k.metadata?.updatedAt ?? 0, kind: k.metadata?.kind });
    }
    cursor = "cursor" in page ? page.cursor : undefined;
  } while (cursor);

  for (const e of entries.values()) {
    let kind = e.kind, source = "";
    try {
      const r = await roomFor(env, e.id).fetch(`https://room/get?email=${encodeURIComponent(email)}`);
      if (r.ok) { const j = (await r.json()) as { source?: string; kind?: string }; source = j.source ?? ""; kind = kind || j.kind; }
    } catch {}
    await env.DB.prepare(
      "INSERT OR IGNORE INTO diagrams (id, owner, title, kind, ws, source, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    ).bind(e.id, email, e.title || "Untitled", kind || "kymo", wsmap[e.id] || "", source, e.updatedAt || Date.now()).run();
    await env.OAUTH_KV.delete(idxKey(email, e.id));
  }
  if (legacy != null) await env.OAUTH_KV.delete(`idx:${email}`);
  if (wsmapRaw != null) await env.OAUTH_KV.delete(`wsmap:${email}`);
  await env.OAUTH_KV.put(`d1done:${email}`, "1");
}

// ---- Folders: a tree of named groups (D1 `workspaces` rows; parent_id "" = a
// root folder). A diagram's `ws` is its parent-folder id ("" = root level). ----
type Workspace = { id: string; name: string; parentId: string; createdAt: number };
async function listWorkspaces(env: Env, email: string, proj?: ProjectScope): Promise<Workspace[]> {
  await migrateKvToD1(env, email);
  await ensureFolderColumn(env);
  await ensureDeletedColumn(env);
  await ensureProjectColumns(env);
  const scope = proj ? (proj.isDefault ? " AND (project_id = ?2 OR project_id IS NULL)" : " AND project_id = ?2") : "";
  const stmt = env.DB.prepare(`SELECT id, name, parent_id, created_at FROM workspaces WHERE owner = ?1 AND deleted IS NULL${scope} ORDER BY created_at`);
  const rs = await (proj ? stmt.bind(email, proj.id) : stmt.bind(email))
    .all<{ id: string; name: string; parent_id: string | null; created_at: number }>();
  return (rs.results ?? []).map((r) => ({ id: r.id, name: r.name, parentId: r.parent_id || "", createdAt: r.created_at }));
}

// Would moving folder `id` under `newParent` create a cycle? True if newParent
// IS id or is a descendant of id. Walks parent links via the folder map.
function wouldCycle(folders: Workspace[], id: string, newParent: string): boolean {
  if (!newParent) return false; // moving to root is always safe
  if (newParent === id) return true;
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cur: string | undefined = newParent;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    if (cur === id) return true;
    seen.add(cur);
    cur = byId.get(cur)?.parentId || undefined;
  }
  return false;
}
async function assignWorkspace(env: Env, email: string, diagramId: string, ws: string) {
  if (ws) {
    // a brand-new diagram may not be indexed yet — create the row so it lands in the workspace
    await env.DB.prepare(
      `INSERT INTO diagrams (id, owner, ws, updated_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(id) DO UPDATE SET ws = ?3`
    ).bind(diagramId, email, ws, Date.now()).run();
  } else {
    await env.DB.prepare("UPDATE diagrams SET ws = '' WHERE id = ?1 AND owner = ?2").bind(diagramId, email).run();
  }
}

// ---- Projects: the layer ABOVE folders. A project owns many folders + diagrams
// (D1 `projects` rows; `project_id` columns on workspaces + diagrams). ----
type Project = { id: string; name: string; createdAt: number };
// The resolved project a request is scoped to. `isDefault` = the user's oldest
// project, which also owns pre-projects rows (project_id NULL) for back-compat.
type ProjectScope = { id: string; isDefault: boolean };

// Ensure the user has at least one project. On first use create "Personal" and
// ADOPT every pre-projects row (project_id IS NULL) into it, so existing folders
// + diagrams keep showing. Returns the default (oldest) project's id.
// A per-owner DETERMINISTIC id for the default project, so the concurrent
// requests an editor fires on first load (diagrams + workspaces in parallel)
// all compute the SAME id — INSERT OR IGNORE then collapses them to one row
// instead of racing in three separate "Personal" projects.
async function defaultProjectId(email: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("kymo-default-project:" + email));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return "def" + hex.slice(0, 13); // 16-char, globally unique per owner
}
async function ensureDefaultProject(env: Env, email: string): Promise<string> {
  await ensureProjectColumns(env);
  let row = await env.DB.prepare("SELECT id FROM projects WHERE owner = ?1 AND deleted IS NULL ORDER BY created_at LIMIT 1")
    .bind(email).first<{ id: string }>();
  if (row) return row.id;
  const id = await defaultProjectId(email);
  // race-safe: only the first of N concurrent inserts wins (PK conflict on the
  // shared deterministic id), the rest are ignored.
  await env.DB.prepare("INSERT OR IGNORE INTO projects (id, owner, name, created_at) VALUES (?1, ?2, 'Personal', ?3)")
    .bind(id, email, Date.now()).run();
  // re-read so we adopt rows into whichever row actually landed
  row = await env.DB.prepare("SELECT id FROM projects WHERE owner = ?1 AND deleted IS NULL ORDER BY created_at LIMIT 1")
    .bind(email).first<{ id: string }>();
  const finalId = row?.id || id;
  await env.DB.prepare("UPDATE workspaces SET project_id = ?1 WHERE owner = ?2 AND project_id IS NULL").bind(finalId, email).run();
  await env.DB.prepare("UPDATE diagrams SET project_id = ?1 WHERE owner = ?2 AND project_id IS NULL").bind(finalId, email).run();
  return finalId;
}

async function listProjects(env: Env, email: string): Promise<Project[]> {
  await ensureDefaultProject(env, email);
  const rs = await env.DB.prepare("SELECT id, name, created_at FROM projects WHERE owner = ?1 AND deleted IS NULL ORDER BY created_at")
    .bind(email).all<{ id: string; name: string; created_at: number }>();
  return (rs.results ?? []).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

// Resolve the project to scope a request to. Explicit `?project=<id>` must be
// owned + live; omitted → the user's default project. An editor that never
// sends `project` thus always lands on the default → it keeps working unchanged.
async function resolveProject(env: Env, email: string, projectId: string | null): Promise<ProjectScope | null> {
  const def = await ensureDefaultProject(env, email);
  if (!projectId) return { id: def, isDefault: true };
  const row = await env.DB.prepare("SELECT id FROM projects WHERE id = ?1 AND owner = ?2 AND deleted IS NULL").bind(projectId, email).first();
  if (!row) return null;
  return { id: projectId, isDefault: projectId === def };
}

// Move a diagram to a project (NULL/"" leaves it where it is — no-op guard at call site).
async function assignProject(env: Env, email: string, diagramId: string, projectId: string) {
  await env.DB.prepare(
    `INSERT INTO diagrams (id, owner, project_id, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(id) DO UPDATE SET project_id = ?3`
  ).bind(diagramId, email, projectId, Date.now()).run();
}

// Create a project. Names are trimmed + capped at 40 chars (same as the API).
// Keeps the default "Personal" project as the oldest one (ensureDefaultProject).
async function createProject(env: Env, email: string, name: string): Promise<Project> {
  await ensureDefaultProject(env, email);
  const p: Project = { id: crypto.randomUUID().slice(0, 8), name: name.trim().slice(0, 40), createdAt: Date.now() };
  await env.DB.prepare("INSERT INTO projects (id, owner, name, created_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(p.id, email, p.name, p.createdAt).run();
  return p;
}

// Rename a live project. Returns false if no such (owned, live) project.
async function renameProject(env: Env, email: string, id: string, name: string): Promise<boolean> {
  await ensureProjectColumns(env);
  const res = await env.DB.prepare("UPDATE projects SET name = ?1 WHERE id = ?2 AND owner = ?3 AND deleted IS NULL")
    .bind(name.trim().slice(0, 40), id, email).run();
  return !!res.meta.changes;
}

// Soft-delete a project AND cascade to its folders + diagrams. Always keep at
// least one project (can't delete your only one). Mirrors the /api/projects
// DELETE handler so the MCP and browser paths stay in lockstep.
async function deleteProjectCascade(env: Env, email: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const projs = await listProjects(env, email);
  if (!projs.some((p) => p.id === id)) return { ok: false, error: "not found" };
  if (projs.length <= 1) return { ok: false, error: "cannot delete your only project" };
  const now = Date.now();
  await env.DB.prepare("UPDATE diagrams SET deleted = ?1 WHERE owner = ?2 AND project_id = ?3 AND deleted IS NULL").bind(now, email, id).run();
  await env.DB.prepare("UPDATE workspaces SET deleted = ?1 WHERE owner = ?2 AND project_id = ?3 AND deleted IS NULL").bind(now, email, id).run();
  await env.DB.prepare("UPDATE projects SET deleted = ?1 WHERE id = ?2 AND owner = ?3").bind(now, id, email).run();
  return { ok: true };
}

// Resolve a user-supplied project reference (id OR name, case-insensitive) to a
// project. Lets MCP callers say project: "Work" instead of an opaque id.
async function findProject(env: Env, email: string, ref: string): Promise<Project | null> {
  const r = ref.trim().toLowerCase();
  if (!r) return null;
  const projs = await listProjects(env, email);
  return projs.find((p) => p.id.toLowerCase() === r) || projs.find((p) => p.name.toLowerCase() === r) || null;
}

// ---- Open-tab state (VS Code window state): which diagrams are open in a
// project + which is active. Stored per project in KV (`tabs:<email>:<id>`),
// the same store the `/api/tabs` route and the editor read/write. The MCP
// `ui_list_open_files` / `ui_close_file` tools read/mutate it here so they stay in
// lockstep with the live editor (which re-persists on the next change). ----
type TabState = { tabs: string[]; active: string | null };
async function readTabs(env: Env, email: string, projectId: string): Promise<TabState> {
  const raw = await env.OAUTH_KV.get(`tabs:${email}:${projectId}`);
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (j && Array.isArray(j.tabs)) return { tabs: j.tabs.filter((x: any) => typeof x === "string"), active: typeof j.active === "string" ? j.active : null };
    } catch {}
  }
  return { tabs: [], active: null };
}
async function writeTabs(env: Env, email: string, projectId: string, state: TabState) {
  await env.OAUTH_KV.put(`tabs:${email}:${projectId}`, JSON.stringify({ tabs: state.tabs.slice(0, 40), active: state.active }));
}
// Remove a diagram from a project's open-tab set. VS Code rule for the active
// tab: closing it activates the right neighbour, else the left. Returns whether
// the tab was actually open (so the caller can report a no-op cleanly).
function closeTabState(state: TabState, id: string): { next: TabState; wasOpen: boolean } {
  const i = state.tabs.indexOf(id);
  if (i < 0) return { next: state, wasOpen: false };
  const tabs = state.tabs.filter((x) => x !== id);
  const active = state.active === id ? (tabs[i] ?? tabs[i - 1] ?? null) : state.active;
  return { next: { tabs, active }, wasOpen: true };
}

// ---- One diagram = one EditorRoom DO (keyed by diagram id). Owner-scoped. ----
export class EditorRoom extends DurableObject<Env> {
  source = ""; owner = ""; title = ""; diagramId = ""; kind = ""; // kind "" = kymo (native)
  lastIdx = 0; // last indexUpsert (in-memory) — throttles KV writes during typing
  thumb = ""; lastThumbSrc: string | null = null; // memoized list-thumbnail SVG (per source)
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.source = (await ctx.storage.get<string>("source")) ?? "";
      this.owner = (await ctx.storage.get<string>("owner")) ?? "";
      this.title = (await ctx.storage.get<string>("title")) ?? "";
      this.diagramId = (await ctx.storage.get<string>("diagramId")) ?? "";
      this.kind = (await ctx.storage.get<string>("kind")) ?? "";
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/ws")) {
      // Session cookie [preferred] or legacy ?id_token= [migration] — the WS
      // handshake carries the Domain=kymo.studio cookie. No sliding renewal here.
      const auth = await resolveAuth(request, this.env, false);
      if ("error" in auth) return new Response(auth.error, { status: auth.error === "forbidden" ? 403 : 401 });
      const email: string | undefined = auth.email;
      const dParam = url.searchParams.get("d");
      if (dParam && this.diagramId !== dParam) { this.diagramId = dParam; await this.ctx.storage.put("diagramId", dParam); }
      if (!this.owner) { this.owner = email!; await this.ctx.storage.put("owner", email!); } // index happens on first write, not on connect
      else if (this.owner !== email) return new Response("forbidden: not your diagram", { status: 403 });
      const pair = new WebSocketPair();
      const client = pair[0], server = pair[1];
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: "doc", source: this.source, title: this.title, kind: this.kind || "kymo", origin: "server" }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname.endsWith("/set") && request.method === "POST") {
      const b = (await request.json()) as { source?: string; origin?: string; owner?: string; title?: string; kind?: string; id?: string };
      if (this.owner && b.owner && this.owner !== b.owner) return Response.json({ error: "forbidden" }, { status: 403 });
      if (!this.owner && b.owner) { this.owner = b.owner; await this.ctx.storage.put("owner", b.owner); }
      if (b.id && this.diagramId !== b.id) { this.diagramId = b.id; await this.ctx.storage.put("diagramId", b.id); }
      let changedSource = false, changedTitle = false;
      if (typeof b.kind === "string") { this.kind = b.kind; await this.ctx.storage.put("kind", this.kind); }
      if (typeof b.source === "string") { this.source = b.source; await this.ctx.storage.put("source", this.source); changedSource = true; }
      if (typeof b.title === "string") { this.title = b.title; await this.ctx.storage.put("title", this.title); changedTitle = true; }
      if (changedSource) this.broadcast({ type: "doc", source: this.source, title: this.title, kind: this.kind || "kymo", origin: b.origin ?? "mcp" });
      else if (changedTitle) this.broadcast({ type: "meta", title: this.title });
      await this.indexUpsert(); // one write per API call (MCP edits), not per-keystroke
      return Response.json({ ok: true, bytes: this.source.length, clients: this.ctx.getWebSockets().length });
    }
    if (url.pathname.endsWith("/destroy") && request.method === "POST") {
      const b = (await request.json()) as { owner?: string };
      if (this.owner && b.owner !== this.owner) return Response.json({ error: "forbidden" }, { status: 403 });
      for (const ws of this.ctx.getWebSockets()) { try { ws.close(1000, "deleted"); } catch {} }
      await this.ctx.storage.deleteAll();
      this.source = ""; this.owner = ""; this.title = ""; this.diagramId = ""; this.kind = "";
      return Response.json({ ok: true });
    }
    if (url.pathname.endsWith("/get")) {
      const requester = url.searchParams.get("email") ?? "";
      if (this.owner && requester && this.owner !== requester) return Response.json({ error: "forbidden" }, { status: 403 });
      return Response.json({ source: this.source, title: this.title, owner: this.owner, kind: this.kind || "kymo" });
    }
    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let data: any; try { data = JSON.parse(message); } catch { return; }
    if (data && data.type === "set" && typeof data.source === "string") {
      this.source = data.source;
      await this.ctx.storage.put("source", this.source);
      let kindChanged = false;
      if (typeof data.kind === "string" && data.kind !== this.kind) { this.kind = data.kind; await this.ctx.storage.put("kind", this.kind); kindChanged = true; }
      if (kindChanged || Date.now() - this.lastIdx > 30_000) await this.indexUpsert(); // kind changes are rare — index immediately
      this.broadcast({ type: "doc", source: this.source, title: this.title, kind: this.kind || "kymo", origin: data.origin ?? "browser" }, ws);
    }
    if (data && data.type === "rename" && typeof data.title === "string") {
      this.title = data.title;
      await this.ctx.storage.put("title", this.title);
      await this.indexUpsert();
      this.broadcast({ type: "meta", title: this.title }, ws);
    }
  }

  // Render a list-thumbnail (full SVG, scaled down by the <img> on the client).
  // render.kymo.studio is content-addressed-cached, so re-renders of an unchanged
  // source are edge hits; memoize per source to skip even that on rename flushes.
  // Oversized renders are dropped (placeholder shown) to keep D1 rows small.
  async thumbFor(): Promise<string> {
    if (!this.source.trim()) return "";
    if (this.lastThumbSrc === this.source) return this.thumb;
    let svg = "";
    try {
      const r = await fetch(`https://render.kymo.studio/${encodeURIComponent(this.kind || "kymo")}/svg`, {
        method: "POST", headers: { "content-type": "text/plain" }, body: this.source,
      });
      if (r.ok) { const s = await r.text(); if (s.length <= 40_000 && s.includes("<svg")) svg = s; }
    } catch {}
    this.thumb = svg; this.lastThumbSrc = this.source;
    return svg;
  }

  async indexUpsert() {
    if (!this.owner || !this.diagramId) return;
    await ensureThumbColumn(this.env);
    const thumb = await this.thumbFor();
    await this.env.DB.prepare(
      `INSERT INTO diagrams (id, owner, title, kind, source, thumb, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(id) DO UPDATE SET title = ?3, kind = ?4, source = ?5, thumb = COALESCE(NULLIF(?6, ''), thumb), updated_at = ?7`
    ).bind(this.diagramId, this.owner, this.title || "Untitled", this.kind || "kymo", this.source, thumb, Date.now()).run();
    this.lastIdx = Date.now();
  }
  async webSocketClose(ws: WebSocket) {
    try { ws.close(); } catch {}
    await this.indexUpsert(); // flush the latest source to D1 when a tab disconnects
  }
  broadcast(obj: unknown, except?: WebSocket) {
    const msg = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) { if (ws === except) continue; try { ws.send(msg); } catch {} }
  }
}

// ---- MCP connection registry (FR-AI-11, CR-KAI-001). Per-user index of which
// MCP CLIENTS (Claude / Cursor / Claude Code …) are connected, fed by a heartbeat
// from KymoMCP on every tool call. MCP is stateless HTTP (no disconnect event), so
// "connected" = seen recently; "outdated" = any of four reasons below. Stored in the
// per-user UserChannel DO's ctx.storage (clients hold no WebSocket here). ----
export const MCP_SERVER_VERSION = "0.4.1";          // KymoMCP server.version (compared for `server` outdated)
const MCP_MIN_PROTOCOL = "2025-06-18";              // hosts below this report `protocol` outdated
const MCP_STALE_MS = 10 * 60_000;                   // no activity beyond this → not connected / `stale`
const MCP_HARD_TTL = 15 * 60_000;                   // beyond this → pruned (treated as gone)
const MCP_MIN_CLIENT: Record<string, string> = {};  // best-effort recommended-minimum client versions (advisory)

type McpConn = { connId: string; sessionId?: string; client: string; clientVersion: string; protocol: string; serverVersion: string; connectedAt: number; lastSeenAt: number };

// Less-than for dotted version strings ("1.2.0" < "1.10.0"); non-numeric / missing → not-less (no opinion).
function verLt(a: string, b: string): boolean {
  if (!a || !b) return false;
  const pa = a.split(".").map((n) => parseInt(n, 10)), pb = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return false;
    if (x !== y) return x < y;
  }
  return false;
}

// Compute the outdated reasons for a record against the current server constants.
function mcpOutdated(rec: McpConn, now: number): string[] {
  const reasons: string[] = [];
  if (rec.serverVersion && rec.serverVersion !== MCP_SERVER_VERSION) reasons.push("server");
  if (now - rec.lastSeenAt > MCP_STALE_MS) reasons.push("stale");
  if (rec.protocol && verLt(rec.protocol, MCP_MIN_PROTOCOL)) reasons.push("protocol");
  const min = MCP_MIN_CLIENT[rec.client];
  if (min && verLt(rec.clientVersion, min)) reasons.push("client");
  return reasons;
}

// ---- One UserChannel DO per signed-in user (keyed by email). Every open
// editor tab of that user connects here; it carries no document, only control
// messages — `{type:"open", id}` so the MCP `ui_open_diagram` tool can switch
// which diagram a tab is showing, `{type:"open-project", id}` so `ui_open_project`
// can switch the active project the tab's explorer is scoped to, and
// `{type:"close", id}` so `ui_close_file` can close a tab — without knowing which
// room/project the tab currently has open.
// Auth + ownership are enforced in the worker before routing here (the DO is
// only reachable through the email-keyed /userws route), so the DO trusts it. ----
type SockMeta = { focusedAt: number; pinned: boolean; pinnedAt: number; session?: string; project?: string | null; projectName?: string | null; diagram?: string | null; title?: string | null };
const sockMeta = (ws: WebSocket): SockMeta => {
  const m = ws.deserializeAttachment() as Partial<SockMeta> | null;
  return { focusedAt: m?.focusedAt ?? 0, pinned: m?.pinned ?? false, pinnedAt: m?.pinnedAt ?? 0,
    session: m?.session, project: m?.project ?? null, projectName: m?.projectName ?? null, diagram: m?.diagram ?? null, title: m?.title ?? null };
};

export class UserChannel extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get("upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0], server = pair[1];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ focusedAt: 0, pinned: false, pinnedAt: 0 });
      // Tell the newcomer it isn't the pinned AI target (another window may be).
      try { server.send(JSON.stringify({ type: "ai-target", pinned: false })); } catch {}
      // Send the current MCP connection snapshot so a freshly-opened tab shows the
      // registry immediately (the push on change covers everything afterwards).
      try { server.send(JSON.stringify({ type: "mcp-connections", ...(await this.snapshotConns()) })); } catch {}
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname.endsWith("/push") && request.method === "POST") {
      const msg = JSON.stringify(await request.json());
      // Deliver control messages (open / open-project / close) to the ONE editor
      // window the user wants: the explicitly PINNED window, else the most-recently
      // FOCUSED one, else broadcast (no window has reported anything yet) so the
      // message is never silently dropped.
      const target = this.pickTarget();
      const dests = target ? [target] : this.ctx.getWebSockets();
      let clients = 0;
      for (const ws of dests) { try { ws.send(msg); clients++; } catch {} }
      return Response.json({ ok: true, clients });
    }
    // List open editor windows (sessions) with what each is showing + which is the target.
    if (url.pathname.endsWith("/sessions") && request.method === "GET") {
      const target = this.pickTarget();
      let focused: WebSocket | null = null, fAt = 0;
      for (const ws of this.ctx.getWebSockets()) { const m = sockMeta(ws); if (m.focusedAt > fAt) { fAt = m.focusedAt; focused = ws; } }
      const sessions = this.ctx.getWebSockets().map((ws) => {
        const m = sockMeta(ws);
        return { session: m.session || "?", project: m.project, projectName: m.projectName, diagram: m.diagram, title: m.title, focused: ws === focused, pinned: m.pinned, target: ws === target };
      });
      return Response.json({ sessions });
    }
    // Make a specific session the pinned AI target (clears any other pin).
    if (url.pathname.endsWith("/target") && request.method === "POST") {
      const { session } = (await request.json()) as { session?: string };
      let found = false;
      for (const ws of this.ctx.getWebSockets()) {
        const m = sockMeta(ws);
        if (session && m.session === session) { ws.serializeAttachment({ ...m, pinned: true, pinnedAt: Date.now() }); found = true; }
        else if (m.pinned) { ws.serializeAttachment({ ...m, pinned: false }); }
      }
      if (found) this.notifyTarget();
      return Response.json({ ok: found });
    }
    // Long-poll for prompts the user typed in the editor panel (web → this session).
    // Drains the durable inbox; waits up to ~25s for a new one, else returns empty.
    if (url.pathname.endsWith("/inbox-wait") && request.method === "POST") {
      // A process is now listening → tell open editor windows so they enable the
      // chat composer (it's disabled until something is waiting for the message).
      for (const ws of this.ctx.getWebSockets()) { try { ws.send(JSON.stringify({ type: "listening", ts: Date.now() })); } catch {} }
      for (let i = 0; i < 32; i++) {
        const inbox = ((await this.ctx.storage.get<any[]>("inbox")) || []);
        if (inbox.length) { await this.ctx.storage.delete("inbox"); return Response.json({ messages: inbox }); }
        await new Promise((r) => setTimeout(r, 800));
      }
      return Response.json({ messages: [] });
    }
    // MCP connection registry (FR-AI-11): KymoMCP heartbeats here on each tool call.
    if (url.pathname.endsWith("/mcp-seen") && request.method === "POST") {
      const b = (await request.json().catch(() => ({}))) as Partial<McpConn> & { ts?: number };
      const connId = String(b.connId || "").slice(0, 128);
      if (!connId) return Response.json({ ok: false });
      const now = b.ts || Date.now();
      const prev = await this.ctx.storage.get<McpConn>(`conn:${connId}`);
      const rec: McpConn = {
        connId,
        sessionId: String(b.sessionId || prev?.sessionId || "").slice(0, 128) || undefined,
        client: String(b.client || prev?.client || "?").slice(0, 80),
        clientVersion: String(b.clientVersion || prev?.clientVersion || "?").slice(0, 40),
        protocol: String(b.protocol || prev?.protocol || "").slice(0, 40),
        serverVersion: String(b.serverVersion || prev?.serverVersion || "").slice(0, 40),
        connectedAt: prev?.connectedAt || now,
        lastSeenAt: now,
      };
      await this.ctx.storage.put(`conn:${connId}`, rec);
      // Live-push the new state to open editor windows (no poll) + arm the alarm so
      // an ungracefully-dropped connection (no DELETE) ages out on its own.
      await this.broadcastConns();
      await this.ctx.storage.setAlarm(Date.now() + MCP_STALE_MS);
      return Response.json({ ok: true });
    }
    // A connection went away cleanly (KymoMCP.destroy on the MCP `DELETE` session-end):
    // drop it and push the new state so the browser reflects the disconnect immediately.
    if (url.pathname.endsWith("/mcp-gone") && request.method === "POST") {
      const b = (await request.json().catch(() => ({}))) as { connId?: string };
      const connId = String(b.connId || "").slice(0, 128);
      if (connId) { await this.ctx.storage.delete(`conn:${connId}`); await this.broadcastConns(); }
      return Response.json({ ok: true });
    }
    // List the user's MCP connections + a {total, connected, outdated} summary; prune dead ones.
    if (url.pathname.endsWith("/mcp-connections") && request.method === "GET") {
      return Response.json(await this.snapshotConns());
    }
    return new Response("not found", { status: 404 });
  }

  // Which socket should receive a control push: pinned wins (most-recent pin),
  // then most-recently-focused, else null → caller broadcasts.
  private pickTarget(): WebSocket | null {
    let pinned: WebSocket | null = null, pinnedAt = 0;
    let focused: WebSocket | null = null, focusedAt = 0;
    for (const ws of this.ctx.getWebSockets()) {
      const m = sockMeta(ws);
      if (m.pinned && m.pinnedAt >= pinnedAt) { pinnedAt = m.pinnedAt; pinned = ws; }
      if (m.focusedAt > focusedAt) { focusedAt = m.focusedAt; focused = ws; }
    }
    return pinned ?? focused;
  }

  // After a pin/unpin, tell every window whether IT is now the pinned AI target
  // so each ✨ button reflects the single active window.
  private notifyTarget() {
    let pinned: WebSocket | null = null, pinnedAt = 0;
    const all = this.ctx.getWebSockets();
    for (const ws of all) { const m = sockMeta(ws); if (m.pinned && m.pinnedAt >= pinnedAt) { pinnedAt = m.pinnedAt; pinned = ws; } }
    for (const ws of all) { try { ws.send(JSON.stringify({ type: "ai-target", pinned: ws === pinned })); } catch {} }
  }

  // MCP connection registry (FR-AI-11): build the {connections, summary} snapshot,
  // pruning records past HARD_TTL. Connected = seen within STALE_MS; outdated = any
  // of the four reasons (server / stale / protocol / client).
  private async snapshotConns(): Promise<{ connections: (McpConn & { outdated: boolean; reasons: string[] })[]; summary: { total: number; connected: number; outdated: number } }> {
    const now = Date.now();
    const map = await this.ctx.storage.list<McpConn>({ prefix: "conn:" });
    const connections: (McpConn & { outdated: boolean; reasons: string[] })[] = [];
    const dead: string[] = [];
    for (const [key, rec] of map) {
      if (now - rec.lastSeenAt > MCP_HARD_TTL) { dead.push(key); continue; }
      const reasons = mcpOutdated(rec, now);
      connections.push({ ...rec, outdated: reasons.length > 0, reasons });
    }
    if (dead.length) await this.ctx.storage.delete(dead);
    connections.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    const connected = connections.filter((c) => now - c.lastSeenAt <= MCP_STALE_MS).length;
    const outdated = connections.filter((c) => c.outdated).length;
    return { connections, summary: { total: connections.length, connected, outdated } };
  }

  // Push the current connection snapshot to every open editor window (live, no poll).
  private async broadcastConns() {
    const snap = await this.snapshotConns();
    const msg = JSON.stringify({ type: "mcp-connections", ...snap });
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(msg); } catch {} }
  }

  // Backstop for ungraceful drops (no MCP DELETE → no /mcp-gone): re-evaluate freshness
  // and push. snapshotConns() prunes dead rows; reschedule while any remain so a stalled
  // connection flips to `stale` (and drops out of `connected`) without a reader.
  async alarm() {
    await this.broadcastConns();
    const remaining = await this.ctx.storage.list<McpConn>({ prefix: "conn:" });
    if (remaining.size > 0) await this.ctx.storage.setAlarm(Date.now() + MCP_STALE_MS);
  }

  // The editor reports `{type:"focus"}` (window gained focus) and `{type:"pin"|"unpin"}`
  // (user clicked ✨ to claim/release this window as the AI target).
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let data: any; try { data = JSON.parse(message); } catch { return; }
    if (!data) return;
    if (data.type === "focus") {
      ws.serializeAttachment({ ...sockMeta(ws), focusedAt: Date.now() });
    } else if (data.type === "hello" || data.type === "ctx") {
      // Window announced its session id + current project/diagram (for ui_list_sessions).
      const m = sockMeta(ws);
      ws.serializeAttachment({ ...m, session: data.session ?? m.session, project: data.project ?? null, projectName: data.projectName ?? null, diagram: data.diagram ?? null, title: data.title ?? null });
    } else if (data.type === "pin") {
      // Exclusive: this window becomes the target, clear every other window's pin.
      for (const other of this.ctx.getWebSockets()) {
        if (other !== ws) { const m = sockMeta(other); if (m.pinned) other.serializeAttachment({ ...m, pinned: false }); }
      }
      ws.serializeAttachment({ ...sockMeta(ws), pinned: true, pinnedAt: Date.now() });
      this.notifyTarget();
    } else if (data.type === "unpin") {
      ws.serializeAttachment({ ...sockMeta(ws), pinned: false });
      this.notifyTarget();
    } else if (data.type === "prompt" && typeof data.text === "string" && data.text.trim()) {
      // User typed in the editor panel → queue it for the agent's wait_for_user_message.
      // Carry the panel's "Simulate UI" toggle so the agent knows to pass simulate:true.
      const inbox = ((await this.ctx.storage.get<any[]>("inbox")) || []);
      inbox.push({ text: data.text.trim().slice(0, 4000), simulate: !!data.simulate });
      await this.ctx.storage.put("inbox", inbox.slice(-50));
    }
  }
}

// ---- MCP server: per-user multi-diagram tools (owner = props.email). ----
export class KymoMCP extends McpAgent<Env, unknown, { email: string; name?: string; clientId?: string }> {
  server = new McpServer({ name: "kymostudio", version: MCP_SERVER_VERSION });

  // The transport session id (DO name is `streamable-http:<id>` / `sse:<id>`) — rotates
  // on every reconnect.
  private sessionId(): string { return this.name.split(":")[1] || ""; }
  // Registry key (FR-AI-11): the OAuth client_id (Dynamic Client Registration) is STABLE
  // across reconnects, so a `/mcp` reconnect of the same install updates ONE row. It is
  // present in props for tokens minted after this shipped; pre-existing tokens fall back
  // to the (rotating) session id — those are deduped in the panel by grouping per client.
  private connId(): string { return this.props?.clientId || this.sessionId(); }

  // Upsert this connection in the per-user registry (FR-AI-11). Reads clientInfo from
  // the live handshake + protocol from the persisted initialize request. UserChannel
  // pushes the change to open editor windows. Fire-and-forget. No tool call required.
  private async mcpHeartbeat(protocol?: string) {
    try {
      const id = this.connId(); const email = this.props?.email;
      if (!id || !email) return;
      const ci = this.server.server.getClientVersion();
      let proto = protocol;
      if (proto === undefined) { const ir = await this.getInitializeRequest().catch(() => undefined) as any; proto = String(ir?.params?.protocolVersion || ""); }
      await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(email)).fetch("https://chan/mcp-seen", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ connId: id, sessionId: this.sessionId(), client: ci?.name || "?", clientVersion: ci?.version || "?", protocol: proto, serverVersion: MCP_SERVER_VERSION, ts: Date.now() }),
      });
    } catch {}
  }

  // Refresh presence on every DO wake (incl. the idle SSE reconnect Cloudflare forces
  // ~every 5 min) so an alive-but-idle client isn't aged out by the registry alarm.
  // Only once the handshake is on record — avoids a phantom row before `initialize`.
  async onStart(props?: { email: string; name?: string; clientId?: string }) {
    await super.onStart(props);
    try { if (await this.getInitializeRequest()) await this.mcpHeartbeat(); } catch {}
  }

  // Clean session end (FR-AI-11): the MCP `DELETE` (client disconnect / reconnect)
  // routes to agent.destroy() — drop this connection from the registry and push the
  // change so the editor reflects the disconnect IMMEDIATELY, before tearing down.
  async destroy() {
    try {
      const id = this.connId();
      const email = this.props?.email;
      if (id && email) {
        await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(email)).fetch("https://chan/mcp-gone", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ connId: id }),
        });
      }
    } catch {}
    await super.destroy();
  }

  async init() {
    const me = () => this.props.email;
    const link = (id: string) => `${EDITOR_URL}/?d=${id}`;
    const projLink = (id: string) => `${EDITOR_URL}/?p=${id}`;
    // Auto-narrate tool activity to the editor's Live Activity feed (kind "action")
    // so every MCP mutation shows up without the agent calling ui_status. The MCP
    // tools differ from a bare API edit precisely by this side-effect.
    const feed = (kind: "action" | "result", text: string) =>
      this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "status", kind, text: String(text).slice(0, 500), ts: Date.now() }),
      }).then(() => {}).catch(() => {});
    // Tell open editor windows to refetch their project list after a server-side
    // project mutation (rename/delete) so the switcher + Manage-projects modal don't
    // show a stale entry until reload. (new_project already pushes open-project.)
    const projectsChanged = () =>
      this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "projects-changed" }),
      }).then(() => {}).catch(() => {});
    // Appended to every write/UI tool's description so ANY MCP client narrates first —
    // the panel then reads request → reasoning → action without relying on memory.
    const NARRATE = " Before calling this, narrate to the user's editor panel: first call ui_status(kind:\"user\", <the user's request>) then ui_status(kind:\"thinking\", <your plan/reasoning>) — so the Live Activity feed reads request → reasoning → action.";

    // MCP connection registry (FR-AI-11, CR-KAI-001). Register the moment the
    // `initialize` handshake completes — so a reconnect shows up in the editor
    // IMMEDIATELY, with no tool call (clientInfo is populated by now).
    this.server.server.oninitialized = () => { this.mcpHeartbeat().catch(() => {}); };
    // Per-tool heartbeat: refreshes lastSeen (keeps long-idle sessions out of `stale`)
    // and carries the live protocol header. Registration itself is on connect/onStart.
    const seen = (extra: any) => {
      const ph = extra?.requestInfo?.headers?.["mcp-protocol-version"];
      return this.mcpHeartbeat(Array.isArray(ph) ? (ph[0] || "") : (ph || "")).catch(() => {});
    };
    // Thin wrapper around server.tool that heartbeats the registry before delegating.
    const tool = (name: string, desc: string, schema: any, handler: (args: any, extra: any) => any) =>
      this.server.tool(name, desc, schema, async (args: any, extra: any) => { await seen(extra); return handler(args, extra); });

    tool(
      "new_diagram",
      "Create a NEW diagram for the signed-in user and open it live. Returns its id + URL. A user can own many diagrams. Optionally seed a title and initial DSL; otherwise a minimal scaffold is used." + NARRATE,
      {
        title: z.string().optional().describe("A short name for the diagram (for list_diagrams)."),
        source: z.string().optional().describe("Optional initial kymo DSL (flowchart TD { ... }). Defaults to a minimal scaffold."),
        kind: z.string().optional().describe("Diagram kind: 'kymo' (default, native DSL) or a kroki.io type (plantuml, c4plantuml, mermaid, graphviz, d2, dbml, ditaa, erd, excalidraw, nomnoml, pikchr, structurizr, svgbob, symbolator, tikz, umlet, vega, vegalite, wavedrom, wireviz, bpmn, bytefield, blockdiag, seqdiag, actdiag, nwdiag, packetdiag, rackdiag)."),
        project: z.string().optional().describe("Project to file this diagram under — its id or name (from list_projects). Omit to use your default project."),
      },
      async ({ title, source, kind, project }) => {
        let proj: Project | null = null;
        if (project) {
          proj = await findProject(this.env, me(), project);
          if (!proj) return { content: [{ type: "text", text: `No project named/id "${project}" — use list_projects (or new_project).` }] };
        }
        const id = crypto.randomUUID().slice(0, 8);
        const src = source ?? `flowchart TD {\n  A[${title ?? "Bắt đầu"}]\n}`;
        await roomFor(this.env, id).fetch("https://room/set", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, source: src, origin: "mcp", owner: me(), title: title ?? "Untitled", kind: kind && kind !== "kymo" ? kind : undefined }),
        });
        await touchIndex(this.env, me(), id, title ?? "Untitled", kind && kind !== "kymo" ? kind : "kymo");
        if (proj) await assignProject(this.env, me(), id, proj.id);
        const where = proj ? ` in project "${proj.name}"` : "";
        await feed("action", `Created ${kind ?? "kymo"} "${title ?? "Untitled"}"${where}`);
        return { content: [{ type: "text", text: `Created ${kind ?? "kymo"} diagram "${title ?? "Untitled"}"${where} (id ${id}). Open: ${link(id)}` }] };
      }
    );

    tool(
      "list_diagrams",
      "List the signed-in user's diagrams (id, title, URL), most-recent first. Pass `project` (id or name) to list only that project's diagrams; omit for your default project.",
      { project: z.string().optional().describe("Project id or name (from list_projects) to scope the list. Omit for your default project.") },
      async ({ project }) => {
        let scope: ProjectScope | undefined;
        let label = "";
        if (project) {
          const proj = await findProject(this.env, me(), project);
          if (!proj) return { content: [{ type: "text", text: `No project named/id "${project}" — use list_projects.` }] };
          const resolved = await resolveProject(this.env, me(), proj.id);
          if (resolved) { scope = resolved; label = ` in project "${proj.name}"`; }
        }
        const list = await listIndex(this.env, me(), scope);
        if (!list.length) return { content: [{ type: "text", text: `No diagrams${label} yet — use new_diagram.` }] };
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const lines = list.map((d) => {
          const when = d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "";
          return `- ${d.title || "Untitled"} [${d.kind || "kymo"}] — ${link(d.id)} (id ${d.id}${when ? `, updated ${when}` : ""})`;
        });
        return { content: [{ type: "text", text: `${list.length} diagram(s)${label}:\n${lines.join("\n")}` }] };
      }
    );

    tool(
      "edit_diagram",
      "Edit one of your diagrams: update its content (`source`) and/or rename it (`title`). Pushes live to editor.kymo.studio. Pass `id` to target a specific diagram; omit to use your most recent. At least one of source/title is required. Use the `flowchart TD { ... }` block syntax for source." + NARRATE,
      {
        source: z.string().optional().describe("New full diagram source (replaces the content)."),
        title: z.string().optional().describe("New name for the diagram (rename)."),
        id: z.string().optional().describe("Diagram id (from new_diagram/list_diagrams). Omit to use your most recent."),
        kind: z.string().optional().describe("Change the diagram kind: 'kymo' or a kroki.io type (plantuml, mermaid, graphviz, …)."),
      },
      async ({ source, title, id, kind }) => {
        if (source === undefined && title === undefined && kind === undefined) return { content: [{ type: "text", text: "Provide `source`, `title` and/or `kind` to edit." }] };
        const did = id ?? (await this.env.OAUTH_KV.get(`last:${me()}`));
        if (!did) return { content: [{ type: "text", text: "No diagram yet — call new_diagram first (or pass id)." }] };
        const body: Record<string, unknown> = { id: did, origin: "mcp", owner: me() };
        if (source !== undefined) body.source = source;
        if (title !== undefined) body.title = title;
        if (kind !== undefined) body.kind = kind === "kymo" ? "" : kind;
        const r = await roomFor(this.env, did).fetch("https://room/set", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (r.status === 403) return { content: [{ type: "text", text: `Diagram ${did} isn't yours.` }] };
        const j = (await r.json()) as { clients: number };
        await touchIndex(this.env, me(), did, title, kind === undefined ? undefined : (kind === "kymo" || kind === "" ? "kymo" : kind));
        const what = [source !== undefined ? "content" : null, title !== undefined ? `renamed to \"${title}\"` : null].filter(Boolean).join(", ");
        await feed("action", `Edited ${title ? `"${title}"` : `diagram ${did}`} (${what || "content"})`);
        return { content: [{ type: "text", text: `Edited ${did} (${what}; ${j.clients} live tab(s)). ${link(did)}` }] };
      }
    );

    tool(
      "get_diagram",
      "Get the kymo DSL of one of your diagrams. Pass `id`, or omit to use your most recent.",
      { id: z.string().optional().describe("Diagram id. Omit to use your most recent.") },
      async ({ id }) => {
        const did = id ?? (await this.env.OAUTH_KV.get(`last:${me()}`));
        if (!did) return { content: [{ type: "text", text: "(no diagram)" }] };
        const r = await roomFor(this.env, did).fetch(`https://room/get?email=${encodeURIComponent(me())}`);
        if (r.status === 403) return { content: [{ type: "text", text: `Diagram ${did} isn't yours.` }] };
        const j = (await r.json()) as { source: string; kind?: string };
        return { content: [
          { type: "text", text: j.source && j.source.length ? j.source : "(empty)" },
          { type: "text", text: `(kind: ${j.kind || "kymo"})` },
        ] };
      }
    );

    tool(
      "delete_diagram",
      "Permanently delete one of your diagrams (content and listing). Cannot be undone." + NARRATE,
      { id: z.string().describe("Diagram id to delete (from list_diagrams).") },
      async ({ id }) => {
        const st = await destroyDiagram(this.env, me(), id);
        if (st === 403) return { content: [{ type: "text", text: `Diagram ${id} isn't yours.` }] };
        await feed("action", `Deleted diagram ${id}`);
        return { content: [{ type: "text", text: `Deleted diagram ${id}.` }] };
      }
    );

    tool(
      "ui_open_diagram",
      "Switch the diagram currently shown in the signed-in user's open editor tab(s) to this one — live navigation in the browser, without changing its content. Pass `id` (from list_diagrams), or omit to use your most recent. Returns how many live tabs were switched (0 = no editor tab open right now)." + NARRATE,
      { id: z.string().optional().describe("Diagram id to open. Omit to use your most recent.") },
      async ({ id }) => {
        const did = id ?? (await this.env.OAUTH_KV.get(`last:${me()}`));
        if (!did) return { content: [{ type: "text", text: "No diagram yet — call new_diagram first (or pass id)." }] };
        const owned = await this.env.DB.prepare("SELECT 1 FROM diagrams WHERE id = ?1 AND owner = ?2 AND deleted IS NULL")
          .bind(did, me()).first();
        if (!owned) return { content: [{ type: "text", text: `Diagram ${did} isn't yours (or is in Trash).` }] };
        await this.env.OAUTH_KV.put(`last:${me()}`, did);
        const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "open", id: did }),
        });
        const j = (await r.json()) as { clients: number };
        const where = j.clients ? `${j.clients} live tab(s) switched` : "no live editor tab open right now — use the link below";
        await feed("action", `Opened diagram ${did}`);
        return { content: [{ type: "text", text: `Opened ${did} (${where}). ${link(did)}` }] };
      }
    );

    // ---- Projects: the layer above folders. Each user always has at least one
    // (a default "Personal"); diagrams can be filed under any project. ----
    tool(
      "list_projects",
      "List the signed-in user's projects (id, name, created date). Every user has at least one default project ('Personal').",
      {},
      async () => {
        const projs = await listProjects(this.env, me());
        const def = await ensureDefaultProject(this.env, me());
        const lines = projs.map((p) => {
          const when = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : "";
          return `- ${p.name} (id ${p.id}${p.id === def ? ", default" : ""}${when ? `, created ${when}` : ""})`;
        });
        return { content: [{ type: "text", text: `${projs.length} project(s):\n${lines.join("\n")}` }] };
      }
    );

    tool(
      "new_project",
      "Create a NEW project for the signed-in user. Returns its id + name. File diagrams under it via new_diagram's `project` arg or move_diagram. Set `simulate:true` to create by animating the editor's real New-project UI instead (only when the user asks for it / the panel's Simulate toggle is on)." + NARRATE,
      {
        name: z.string().describe("A short name for the project (max 40 chars)."),
        simulate: z.boolean().optional().describe("Default false. false = create server-side, return the id, and live-switch the editor (no reload). true = drive the editor's real New-project UI (open switcher → type name → submit; no reload) — use only when the user opted into UI simulation (e.g. the panel's Simulate toggle); returns no id."),
      },
      async ({ name, simulate }) => {
        const n = name.trim();
        if (!n) return { content: [{ type: "text", text: "Provide a non-empty project name." }] };
        // simulate=true: drive the REAL New-project UI in the editor (open switcher →
        // fill name input → submit; no reload). If a live window receives it, the
        // editor's own createProject does the create + switch. Falls back to a
        // server-side create when no editor window is connected.
        if (simulate) {
          const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "ui-new-project", name: n }),
          }).catch(() => null);
          const clients = r ? (((await r.json().catch(() => ({}))) as { clients?: number }).clients ?? 0) : 0;
          if (clients > 0) {
            await feed("action", `Tạo project "${n}" (mô phỏng UI trong editor)…`);
            return { content: [{ type: "text", text: `Triggered the editor to create project "${n}" by simulating the New-project UI (no reload); it will switch to the new project.` }] };
          }
          // no live window → fall through to the plain create below
        }
        // Default: create server-side (returns the id) and live-switch the editor —
        // it refetches the project list first, so no page reload.
        const p = await createProject(this.env, me(), n);
        await feed("action", `Created project "${p.name}"`);
        await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "open-project", id: p.id }),
        }).then(() => {}).catch(() => {});
        return { content: [{ type: "text", text: `Created project "${p.name}" (id ${p.id}). Open: ${projLink(p.id)}` }] };
      }
    );

    tool(
      "rename_project",
      "Rename one of your projects. Identify it by id or current name." + NARRATE,
      {
        project: z.string().describe("The project to rename — its id or current name (from list_projects)."),
        name: z.string().describe("The new project name (max 40 chars)."),
      },
      async ({ project, name }) => {
        if (!name.trim()) return { content: [{ type: "text", text: "Provide a non-empty new name." }] };
        const proj = await findProject(this.env, me(), project);
        if (!proj) return { content: [{ type: "text", text: `No project named/id "${project}" — use list_projects.` }] };
        await renameProject(this.env, me(), proj.id, name);
        await projectsChanged();
        return { content: [{ type: "text", text: `Renamed project ${proj.id} → "${name.trim().slice(0, 40)}".` }] };
      }
    );

    tool(
      "delete_project",
      "Delete one of your projects AND everything inside it (its folders + diagrams move to Trash, recoverable for 30 days). You can't delete your only project. Set `simulate:true` to delete by animating the editor's real Manage-projects UI instead (only when the user asks / the panel's Simulate toggle is on)." + NARRATE,
      {
        project: z.string().describe("The project to delete — its id or name (from list_projects)."),
        simulate: z.boolean().optional().describe("Default false (delete server-side directly). true = drive the editor's real Manage-projects modal (open it → filter to the project → click delete → confirm) — use only when the user opted into UI simulation (e.g. the panel's Simulate toggle)."),
      },
      async ({ project, simulate }) => {
        const proj = await findProject(this.env, me(), project);
        if (!proj) return { content: [{ type: "text", text: `No project named/id "${project}" — use list_projects.` }] };
        // simulate=true: drive the real Manage-projects UI (open modal → filter →
        // click delete → confirm). If a live window receives it, the editor performs
        // the delete itself; falls back to a server-side delete when none is connected.
        if (simulate) {
          const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "ui-delete-project", id: proj.id }),
          }).catch(() => null);
          const clients = r ? (((await r.json().catch(() => ({}))) as { clients?: number }).clients ?? 0) : 0;
          if (clients > 0) {
            await feed("action", `Xoá project "${proj.name}" (mô phỏng UI trong editor)…`);
            return { content: [{ type: "text", text: `Triggered the editor to delete project "${proj.name}" by simulating the Manage-projects UI (open → filter → delete → confirm).` }] };
          }
          // no live window → fall through to the server-side delete below
        }
        const res = await deleteProjectCascade(this.env, me(), proj.id);
        if (!res.ok) return { content: [{ type: "text", text: res.error === "cannot delete your only project" ? "Can't delete your only project — create another first." : `Project ${proj.id} not found.` }] };
        await feed("action", `Deleted project "${proj.name}" (moved to Trash)`);
        await projectsChanged();
        return { content: [{ type: "text", text: `Deleted project "${proj.name}" (id ${proj.id}) and moved its contents to Trash.` }] };
      }
    );

    tool(
      "move_diagram",
      "Move one of your diagrams into a project. Pass the diagram `id` (from list_diagrams) and the target `project` (id or name). Moving across projects clears its folder (folders are project-local)." + NARRATE,
      {
        id: z.string().describe("Diagram id to move (from list_diagrams)."),
        project: z.string().describe("Target project — its id or name (from list_projects)."),
      },
      async ({ id, project }) => {
        const owned = await this.env.DB.prepare("SELECT 1 FROM diagrams WHERE id = ?1 AND owner = ?2 AND deleted IS NULL").bind(id, me()).first();
        if (!owned) return { content: [{ type: "text", text: `Diagram ${id} isn't yours (or is in Trash).` }] };
        const proj = await findProject(this.env, me(), project);
        if (!proj) return { content: [{ type: "text", text: `No project named/id "${project}" — use list_projects (or new_project).` }] };
        await assignProject(this.env, me(), id, proj.id);
        await this.env.DB.prepare("UPDATE diagrams SET ws = '' WHERE id = ?1 AND owner = ?2").bind(id, me()).run();
        await feed("action", `Moved diagram ${id} → "${proj.name}"`);
        return { content: [{ type: "text", text: `Moved diagram ${id} to project "${proj.name}".` }] };
      }
    );

    tool(
      "ui_open_project",
      "Switch the ACTIVE project in the signed-in user's open editor tab(s) — the project the sidebar/explorer is filtered to — without changing any content (the project sibling of ui_open_diagram). Pass `project` (id or name from list_projects), or omit to use your most recently opened project. Returns how many live tabs were switched (0 = no editor tab open right now)." + NARRATE,
      { project: z.string().optional().describe("Project id or name to switch to. Omit to use your most recently opened project.") },
      async ({ project }) => {
        let proj: Project | null = null;
        if (project) {
          proj = await findProject(this.env, me(), project);
          if (!proj) return { content: [{ type: "text", text: `No project named/id "${project}" — use list_projects (or new_project).` }] };
        } else {
          const lastId = await this.env.OAUTH_KV.get(`lastproj:${me()}`);
          proj = lastId ? await findProject(this.env, me(), lastId) : null;
          if (!proj) { // fall back to the default ("Personal") project
            const defId = await ensureDefaultProject(this.env, me());
            proj = await findProject(this.env, me(), defId);
          }
          if (!proj) return { content: [{ type: "text", text: "No project to open — use new_project first." }] };
        }
        await this.env.OAUTH_KV.put(`lastproj:${me()}`, proj.id);
        const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "open-project", id: proj.id }),
        });
        const j = (await r.json()) as { clients: number };
        const where = j.clients ? `${j.clients} live tab(s) switched` : "no live editor tab open right now — use the link below";
        await feed("action", `Switched to project "${proj.name}"`);
        return { content: [{ type: "text", text: `Switched active project to "${proj.name}" (id ${proj.id}; ${where}). Open: ${projLink(proj.id)}` }] };
      }
    );

    // ---- Open files (tabs): the diagrams currently open in a project's editor,
    // VS Code-style. Mirrors the live editor's tab strip and the `/api/tabs`
    // store, so list/close stay in lockstep with the browser. ----
    tool(
      "ui_list_open_files",
      "List the diagrams currently OPEN as tabs in a project's editor (VS Code-style window state), marking the active one. Pass `project` (id or name); omit to use your most recently opened project (or your default).",
      { project: z.string().optional().describe("Project id or name (from list_projects). Omit to use your most recently opened project.") },
      async ({ project }) => {
        let proj: Project | null = null;
        if (project) {
          proj = await findProject(this.env, me(), project);
          if (!proj) return { content: [{ type: "text", text: `No project named/id "${project}" — use list_projects.` }] };
        } else {
          const lastId = await this.env.OAUTH_KV.get(`lastproj:${me()}`);
          proj = lastId ? await findProject(this.env, me(), lastId) : null;
          if (!proj) { const defId = await ensureDefaultProject(this.env, me()); proj = await findProject(this.env, me(), defId); }
          if (!proj) return { content: [{ type: "text", text: "No project yet — use new_project first." }] };
        }
        const state = await readTabs(this.env, me(), proj.id);
        if (!state.tabs.length) return { content: [{ type: "text", text: `No open files in project "${proj.name}" (id ${proj.id}).` }] };
        // Resolve titles for the open ids (skip ones since deleted).
        const ph = state.tabs.map((_, i) => `?${i + 2}`).join(",");
        const rs = await this.env.DB.prepare(`SELECT id, title, kind FROM diagrams WHERE owner = ?1 AND deleted IS NULL AND id IN (${ph})`)
          .bind(me(), ...state.tabs).all<{ id: string; title: string; kind: string }>();
        const byId = new Map((rs.results ?? []).map((r) => [r.id, r]));
        const lines = state.tabs.map((id) => {
          const row = byId.get(id);
          const star = id === state.active ? "● " : "  ";
          const title = row ? (row.title || "Untitled") : "(deleted)";
          return `${star}${title} [${row?.kind || "kymo"}] — ${link(id)} (id ${id})`;
        });
        return { content: [{ type: "text", text: `${state.tabs.length} open file(s) in project "${proj.name}" (● = active):\n${lines.join("\n")}` }] };
      }
    );

    tool(
      "ui_close_file",
      "Close an open diagram tab in the editor (VS Code-style) — removes it from the project's open-files set and live-closes it in any open editor tab(s), without deleting the diagram. Pass the diagram `id` (from ui_list_open_files / list_diagrams)." + NARRATE,
      { id: z.string().describe("Diagram id of the open tab to close (from ui_list_open_files).") },
      async ({ id }) => {
        const row = await this.env.DB.prepare("SELECT project_id FROM diagrams WHERE id = ?1 AND owner = ?2 AND deleted IS NULL")
          .bind(id, me()).first<{ project_id: string | null }>();
        if (!row) return { content: [{ type: "text", text: `Diagram ${id} isn't yours (or is in Trash).` }] };
        const def = await ensureDefaultProject(this.env, me());
        const projectId = row.project_id || def;
        const state = await readTabs(this.env, me(), projectId);
        const { next, wasOpen } = closeTabState(state, id);
        if (!wasOpen) return { content: [{ type: "text", text: `Diagram ${id} isn't open as a tab — nothing to close.` }] };
        await writeTabs(this.env, me(), projectId, next);
        // Live-close it in any editor tab showing this project.
        const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "close", id }),
        });
        const j = (await r.json()) as { clients: number };
        const where = j.clients ? `${j.clients} live tab(s) notified` : "no live editor tab open right now";
        await feed("action", `Closed tab ${id}`);
        return { content: [{ type: "text", text: `Closed tab ${id} (${next.tabs.length} file(s) still open; ${where}).` }] };
      }
    );

    // ---- Sessions (windows): each OPEN editor window has a short session id.
    // List them, then switch which one AI commands target. ----
    tool(
      "ui_list_sessions",
      "List the user's OPEN editor windows ('sessions'). Each has a short session id and shows its project + active diagram; the one AI control commands (ui_open_diagram / ui_open_project / ui_close_file) currently act on is marked '← AI target'. Use ui_switch_session to change it. Returns nothing open if no editor window is connected.",
      {},
      async () => {
        const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/sessions");
        const { sessions } = (await r.json()) as { sessions: Array<{ session: string; project: string | null; projectName: string | null; diagram: string | null; title: string | null; focused: boolean; pinned: boolean; target: boolean }> };
        if (!sessions.length) return { content: [{ type: "text", text: "No editor windows are open right now." }] };
        const lines = sessions.map((s) => {
          const where = s.projectName ? `project "${s.projectName}"` : s.project ? `project ${s.project}` : "no project";
          const doc = s.title ? ` · ${s.title}` : "";
          const flags = [s.target ? "← AI target" : "", s.pinned ? "pinned" : (s.focused ? "focused" : "")].filter(Boolean).join(", ");
          return `- ${s.session} — ${where}${doc}${flags ? `  (${flags})` : ""}`;
        });
        return { content: [{ type: "text", text: `${sessions.length} open window(s):\n${lines.join("\n")}\n\nSwitch the target with ui_switch_session(session).` }] };
      }
    );

    tool(
      "ui_switch_session",
      "Make a specific open editor window the AI target — subsequent ui_open_diagram / ui_open_project / ui_close_file act on THAT window. Pass the `session` id from ui_list_sessions. The window's ✨ Connect-AI toggle flips on to confirm.",
      { session: z.string().describe("Session id of the window to target (from ui_list_sessions).") },
      async ({ session }) => {
        const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/target", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ session }),
        });
        const { ok } = (await r.json()) as { ok: boolean };
        return { content: [{ type: "text", text: ok ? `AI target switched to window ${session}. Control commands now act there.` : `No open window with session "${session}" — run ui_list_sessions for current ids.` }] };
      }
    );

    // ---- Live activity feed: stream what you're doing to the editor's Connect-AI
    // panel so the user can watch progress in the browser. ----
    tool(
      "ui_status",
      "Stream a short status line to the user's editor 'Connect AI' panel so they can watch your work live in the browser. Call it LIBERALLY as you work — one short line each: echo the user's request (kind 'user'), your plan/reasoning before acting (kind 'thinking'), the action you're taking (kind 'action'), and the outcome (kind 'result'). Routes to the user's active editor window (the pinned one, see ui_switch_session).",
      {
        text: z.string().describe("One short line to display (a request echo, a thought, an action, or a result)."),
        kind: z.enum(["user", "thinking", "action", "result"]).optional().describe("user = the user's request · thinking = your reasoning/plan · action = what you're doing · result = the outcome. Default 'thinking'."),
      },
      async ({ text, kind }) => {
        const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/push", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "status", kind: kind ?? "thinking", text: String(text).slice(0, 2000), ts: Date.now() }),
        });
        const j = (await r.json()) as { clients: number };
        return { content: [{ type: "text", text: j.clients ? `shown in ${j.clients} window(s)` : "no live editor window — open editor.kymo.studio (or run ui_list_sessions)" }] };
      }
    );

    // ---- Receive prompts the user types in the editor panel (web → this session).
    // Long-polls ~25s; call it in a loop to stay responsive to the user's web input. ----
    tool(
      "wait_for_user_message",
      "Wait for a message the user types into their editor's Connect AI panel (editor.kymo.studio) and return it — this is how the user drives YOU from the web. Long-polls up to ~25s; returns the queued message(s), or a timeout note. Call it in a loop to keep listening; act on each message (narrate via ui_status, edit diagrams), then call it again.",
      {},
      async () => {
        const r = await this.env.USER_CHANNEL.get(this.env.USER_CHANNEL.idFromName(me())).fetch("https://chan/inbox-wait", { method: "POST" });
        const { messages } = (await r.json()) as { messages: any[] };
        if (!messages || !messages.length) return { content: [{ type: "text", text: "(no message yet — timed out. Call wait_for_user_message again to keep listening.)" }] };
        // Back-compat: older entries were bare strings; normalize to {text, simulate}.
        const items = messages.map((m) => (typeof m === "string" ? { text: m, simulate: false } : { text: String(m?.text ?? ""), simulate: !!m?.simulate }));
        const anySim = items.some((it) => it.simulate);
        const hint = anySim ? "\n\n[Simulate UI = ON] If this leads to creating or deleting a project, pass simulate:true (new_project / delete_project) so the editor animates the real UI (create: open switcher → type name → submit; delete: open Manage-projects → filter → delete → confirm)." : "";
        return { content: [{ type: "text", text: `The user typed in the editor panel:\n${items.map((it) => "• " + it.text).join("\n")}${hint}` }] };
      }
    );

    // ── Icons admin (icons.kymo.studio): add/edit/delete are ADMIN-only; list is open. ──
    const notAdmin = { content: [{ type: "text" as const, text: "Not authorized — icon add/edit/delete is admin-only." }] };
    tool(
      "add_icon",
      "ADMIN-ONLY. Add a NEW icon to the kymo library (icons.kymo.studio) or REPLACE an existing one. A brand (e.g. 'openai') groups multiple variants (icon/color/text/brand); the gallery shows one card per brand with a variant switcher. Art is stored on the kymo-icons CDN and appears live (no redeploy). Provide the image as base64 (PNG, or SVG with format:'svg').",
      {
        set: z.string().describe("Icon set, e.g. 'ai', 'diagrams', 'custom'."),
        name: z.string().describe("Brand name / slug, e.g. 'openai' (also the brand grouping key)."),
        variant: z.string().optional().describe("Variant: 'icon' (default), 'color', 'text', or 'brand'."),
        image: z.string().describe("Base64-encoded image bytes (data: URLs accepted)."),
        format: z.string().optional().describe("'png' (default) or 'svg'."),
      },
      async ({ set, name, variant, image, format }) => {
        if (!isIconAdmin(me(), this.env)) return notAdmin;
        try {
          const r = await addIcon(this.env, { set, name, variant, image, format });
          return { content: [{ type: "text", text: `Added \`${r.key}\` (brand ${r.brand}, ${r.variant}) → ${r.url}\nLive: https://icons.kymo.studio/?q=${encodeURIComponent(r.brand)}` }] };
        } catch (e: any) { return { content: [{ type: "text", text: `add_icon failed: ${e?.message || e}` }] }; }
      }
    );
    tool(
      "edit_icon",
      "ADMIN-ONLY. Replace the art of an EXISTING icon by key (e.g. 'aws:compute-ec2'). Busts the CDN cache so the new art shows live.",
      {
        key: z.string().describe("Existing icon key (from list_icons), e.g. 'aws:compute-ec2'."),
        image: z.string().describe("Base64-encoded new image bytes."),
        format: z.string().optional().describe("'png' (default) or 'svg'."),
      },
      async ({ key, image, format }) => {
        if (!isIconAdmin(me(), this.env)) return notAdmin;
        try {
          const r = await editIcon(this.env, { key, image, format });
          return { content: [{ type: "text", text: `Edited \`${r.key}\` → ${r.url}` }] };
        } catch (e: any) { return { content: [{ type: "text", text: `edit_icon failed: ${e?.message || e}` }] }; }
      }
    );
    tool(
      "delete_icon",
      "ADMIN-ONLY. Remove/hide an icon by key (e.g. 'aws:compute-ec2'). Hidden on the site immediately; overlay-added art is also deleted from the CDN.",
      { key: z.string().describe("Icon key to remove (from list_icons).") },
      async ({ key }) => {
        if (!isIconAdmin(me(), this.env)) return notAdmin;
        try {
          const r = await deleteIcon(this.env, key);
          return { content: [{ type: "text", text: `Removed icon \`${r.key}\`.` }] };
        } catch (e: any) { return { content: [{ type: "text", text: `delete_icon failed: ${e?.message || e}` }] }; }
      }
    );
    tool(
      "list_icons",
      "List icons in the kymo library (live: static manifest ⊕ admin overlay). Optionally filter by a substring matched against the icon key.",
      {
        query: z.string().optional().describe("Substring to match against keys, e.g. 'lambda' or 'aws:'."),
        limit: z.number().optional().describe("Max results (default 50, max 200)."),
      },
      async ({ query, limit }) => {
        try {
          const m = (await fetch(`${ICONS_URL}/icons-manifest.json`).then((r) => r.json())) as any;
          const o = await readCatalog(this.env);
          const map = new Map<string, string>(Object.entries((m?.icons || {}) as Record<string, string>));
          for (const k of o.removed) map.delete(k);
          for (const [k, v] of Object.entries(o.icons)) map.set(k, v.path);
          const q = (query || "").toLowerCase();
          const all = [...map.keys()].filter((k) => !q || k.toLowerCase().includes(q)).sort();
          const lim = Math.max(1, Math.min(limit || 50, 200));
          const lines = all.slice(0, lim).map((k) => `- ${k} → ${ICON_CDN}/${map.get(k)}`);
          return { content: [{ type: "text", text: `${all.length} icon(s)${q ? ` matching "${query}"` : ""}${all.length > lim ? ` (showing ${lim})` : ""}:\n${lines.join("\n")}` }] };
        } catch (e: any) { return { content: [{ type: "text", text: `list_icons failed: ${e?.message || e}` }] }; }
      }
    );
  }
}

function loginPage(clientId: string, oauthReqJson: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in &middot; kymostudio</title>
<script src="https://accounts.google.com/gsi/client" async></script>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b0c;color:#eee}
.card{text-align:center;padding:32px 40px;border:1px solid #222;border-radius:14px;background:#141416}
h2{margin:0 0 4px}p{color:#9aa;margin:6px 0 18px}#msg{color:#f66;min-height:1.2em;margin-top:14px}</style></head>
<body><div class="card">
<h2>kymostudio</h2><p>Sign in with Google to authorize Claude.</p>
<div id="g_id_onload" data-client_id="${clientId}" data-callback="onCred" data-auto_prompt="false"></div>
<div class="g_id_signin" data-type="standard" data-theme="filled_black" data-size="large"></div>
<p id="msg"></p></div>
<script>
const OAUTH_REQ = ${JSON.stringify(oauthReqJson)};
async function onCred(resp){
  const m=document.getElementById("msg"); m.textContent="Signing in…";
  try{ const r=await fetch("/authorize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({credential:resp.credential,oauthReq:OAUTH_REQ})});
    if(r.ok){ const j=await r.json(); location.href=j.redirectTo; return; }
    const j=await r.json().catch(()=>({})); m.textContent=j.error==="forbidden"?("Not allowed: "+(j.email||"")):("Sign-in failed ("+(j.error||r.status)+")");
  }catch(e){ m.textContent="Sign-in error: "+e.message; }
}
</script></body></html>`;
}

const defaultHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/authorize" && request.method === "GET") {
      const oauthReq = await env.OAUTH_PROVIDER.parseAuthRequest(request);
      return new Response(loginPage(env.GOOGLE_CLIENT_ID, JSON.stringify(oauthReq)), { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.pathname === "/authorize" && request.method === "POST") {
      const body = (await request.json()) as { credential: string; oauthReq: string };
      let p: { email?: string; sub?: string; name?: string };
      try { p = await verifyGoogleIdToken(body.credential, env.GOOGLE_CLIENT_ID); }
      catch { return Response.json({ error: "invalid_token" }, { status: 401 }); }
      if (!emailAllowed(p.email, env)) return Response.json({ error: "forbidden", email: p.email }, { status: 403 });
      const oauthReq = JSON.parse(body.oauthReq);
      const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReq, userId: p.sub as string, scope: oauthReq.scope ?? [],
        metadata: { email: p.email }, props: { email: p.email, name: p.name, clientId: oauthReq.clientId },
      });
      return Response.json({ redirectTo });
    }
    if (url.pathname === "/") return new Response("kymo-mcp (Google auth). MCP: /mcp or /sse. Editor live channel: /ws?d=<id>&id_token=…\n", { headers: { "content-type": "text/plain" } });
    return new Response("not found", { status: 404 });
  },
};

const apiHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/sse" || url.pathname === "/sse/message") return KymoMCP.serveSSE("/sse").fetch(request, env, ctx);
    return KymoMCP.serve("/mcp").fetch(request, env, ctx);
  },
};

const oauthProvider = new OAuthProvider({
  apiRoute: ["/mcp", "/sse"],
  apiHandler: apiHandler as any,
  defaultHandler: defaultHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

// /ws is handled before the OAuth provider (it would drop the WebSocket upgrade).
// The diagram id comes from ?d=<id>; auth + ownership are enforced in the DO.
export default {
  // Daily cron: permanently purge anything in the trash older than 30 days.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purgeOldDeleted(env, Date.now() - 30 * 24 * 60 * 60 * 1000));
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const d = url.searchParams.get("d") || "default";
      return roomFor(env, d).fetch(request);
    }
    // Per-user control channel: every open editor tab connects here so the MCP
    // `ui_open_diagram` tool can live-switch which diagram the tab shows. The DO is
    // keyed by email, so verify + resolve the email BEFORE routing the upgrade.
    if (url.pathname === "/userws") {
      // Session cookie [preferred] or legacy ?id_token= [migration]. No renewal on WS.
      const auth = await resolveAuth(request, env, false);
      if ("error" in auth) return new Response(auth.error, { status: auth.error === "forbidden" ? 403 : 401 });
      return env.USER_CHANNEL.get(env.USER_CHANNEL.idFromName(auth.email)).fetch(request);
    }
    // Browser session (CR-KEDITOR-002): POST {credential} → verify Google once →
    // set the httpOnly session cookie; DELETE → revoke (?all=1 = sign out everywhere);
    // GET /api/me → resolve the cookie back to {email,name} on load.
    if (url.pathname === "/api/session") {
      const cors = corsFor(request, "POST, DELETE, OPTIONS");
      if (request.method === "OPTIONS") return new Response(null, { headers: cors });
      if (request.method === "POST") {
        let body: any; try { body = await request.json(); } catch { body = {}; }
        let p: { email?: string; name?: string };
        try { p = await verifyGoogleIdToken(String(body?.credential || ""), env.GOOGLE_CLIENT_ID); }
        catch { return Response.json({ error: "invalid_token" }, { status: 401, headers: cors }); }
        if (!emailAllowed(p.email, env)) return Response.json({ error: "forbidden", email: p.email }, { status: 403, headers: cors });
        const raw = await createSession(env, p.email!, p.name || "", request.headers.get("user-agent") || "");
        return Response.json({ email: p.email, name: p.name }, { headers: { ...cors, "set-cookie": sessionCookie(raw, Math.floor(SESSION_IDLE_MS / 1000)) } });
      }
      if (request.method === "DELETE") {
        await revokeSession(env, request, url.searchParams.get("all") === "1");
        return Response.json({ ok: true }, { headers: { ...cors, "set-cookie": clearSessionCookie() } });
      }
      return new Response("method not allowed", { status: 405, headers: cors });
    }
    if (url.pathname === "/api/me") {
      const cors = corsFor(request, "GET, OPTIONS");
      if (request.method === "OPTIONS") return new Response(null, { headers: cors });
      const auth = await resolveAuth(request, env);
      if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.error === "forbidden" ? 403 : 401, headers: cors });
      const headers = auth.setCookie ? { ...cors, "set-cookie": auth.setCookie } : cors;
      return Response.json({ email: auth.email, name: auth.name }, { headers });
    }
    // MCP connection registry for the signed-in user (FR-AI-11): how many MCP clients
    // are connected + how many are outdated. Forwards to the per-user UserChannel DO.
    if (url.pathname === "/api/connections") {
      const cors = corsFor(request, "GET, OPTIONS");
      if (request.method === "OPTIONS") return new Response(null, { headers: cors });
      const auth = await resolveAuth(request, env);
      if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.error === "forbidden" ? 403 : 401, headers: cors });
      const r = await env.USER_CHANNEL.get(env.USER_CHANNEL.idFromName(auth.email)).fetch("https://chan/mcp-connections");
      const data = await r.json();
      const headers = auth.setCookie ? { ...cors, "set-cookie": auth.setCookie } : cors;
      return Response.json(data, { headers });
    }
    // Force-download an icon: stream the R2 art with Content-Disposition:attachment
    // so the browser SAVES it (the `download` attr is ignored cross-origin to the
    // CDN). Public — anyone can download a public icon by key.
    if (url.pathname === "/api/icons/download") {
      const key = url.searchParams.get("key") || "";
      if (!key) return new Response("missing key", { status: 400 });
      const resolved = await resolveIconPath(env, key);
      if (!resolved) return new Response("not found", { status: 404 });
      const obj = await env.ICONS.get(resolved.path);
      if (!obj) return new Response("not found", { status: 404 });
      const filename = key.replace(/[:/]/g, "-") + "." + resolved.ext;
      return new Response(obj.body, {
        headers: {
          "content-type": resolved.ext === "svg" ? "image/svg+xml" : "image/png",
          "content-disposition": `attachment; filename="${filename}"`,
          "cache-control": "public, max-age=3600",
        },
      });
    }
    // Icons admin (icons.kymo.studio): GET the live overlay [public, for the site
    // to merge with its static manifest]; POST add/replace + DELETE hide [icon-admin].
    if (url.pathname === "/api/icons") {
      const cors = corsFor(request, "GET, POST, PATCH, DELETE, OPTIONS");
      if (request.method === "OPTIONS") return new Response(null, { headers: cors });
      if (request.method === "GET") {
        const c = await readCatalog(env);
        return Response.json({ brands: c.brands, icons: c.icons, removed: c.removed }, { headers: { ...cors, "cache-control": "no-store" } });
      }
      const auth = await resolveAuth(request, env);
      if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.error === "forbidden" ? 403 : 401, headers: cors });
      if (!isIconAdmin(auth.email, env)) return Response.json({ error: "forbidden", email: auth.email }, { status: 403, headers: cors });
      if (auth.setCookie) cors["set-cookie"] = auth.setCookie;
      try {
        if (request.method === "POST") {
          const body: any = await request.json().catch(() => ({}));
          return Response.json({ ok: true, ...(await addIcon(env, body)) }, { headers: cors });
        }
        if (request.method === "PATCH") {
          const body: any = await request.json().catch(() => ({}));
          return Response.json({ ok: true, ...(await editIcon(env, body)) }, { headers: cors });
        }
        if (request.method === "DELETE") {
          const key = url.searchParams.get("key") || ((await request.json().catch(() => ({}))) as any).key;
          return Response.json({ ok: true, ...(await deleteIcon(env, String(key || ""))) }, { headers: cors });
        }
      } catch (e: any) {
        return Response.json({ error: String(e?.message || e) }, { status: 400, headers: cors });
      }
      return new Response("method not allowed", { status: 405, headers: cors });
    }
    // Browser-callable APIs for the signed-in user (session cookie or legacy token).
    if (url.pathname === "/api/diagrams" || url.pathname === "/api/diagrams/thumb" || url.pathname === "/api/workspaces" || url.pathname === "/api/projects" || url.pathname === "/api/trash" || url.pathname === "/api/tabs") {
      const cors: Record<string, string> = corsFor(request, "GET, POST, PATCH, PUT, DELETE, OPTIONS");
      if (request.method === "OPTIONS") return new Response(null, { headers: cors });
      const auth = await resolveAuth(request, env);
      if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.error === "forbidden" ? 403 : 401, headers: cors });
      const email: string = auth.email;
      if (auth.setCookie) cors["set-cookie"] = auth.setCookie; // propagates to all responses built with `headers: cors`

      // Per-diagram thumbnail SVG for the Diagrams list — separate route so the
      // list JSON stays small and the browser lazy-loads + caches each <img>.
      if (url.pathname === "/api/diagrams/thumb") {
        const id = url.searchParams.get("id") || "";
        if (!id) return new Response("missing id", { status: 400, headers: cors });
        await ensureThumbColumn(env);
        const row = await env.DB.prepare("SELECT thumb, source, kind FROM diagrams WHERE id = ?1 AND owner = ?2")
          .bind(id, email).first<{ thumb: string | null; source: string | null; kind: string | null }>();
        if (!row) return new Response("no thumb", { status: 404, headers: cors });
        let thumb = row.thumb || "";
        // Backfill on demand: a diagram saved before the thumb feature (or whose
        // render failed) has source but no thumb — render it now, once, and store.
        if (!thumb && row.source && row.source.trim()) {
          try {
            const r = await fetch(`https://render.kymo.studio/${encodeURIComponent(row.kind || "kymo")}/svg`, {
              method: "POST", headers: { "content-type": "text/plain" }, body: row.source,
            });
            if (r.ok) { const s = await r.text(); if (s.length <= 40_000 && s.includes("<svg")) thumb = s; }
          } catch {}
          if (thumb) await env.DB.prepare("UPDATE diagrams SET thumb = ?1 WHERE id = ?2 AND owner = ?3").bind(thumb, id, email).run();
        }
        if (!thumb) return new Response("no thumb", { status: 404, headers: cors });
        return new Response(thumb, { headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=120", ...cors } });
      }

      // Trash: list / restore / permanently delete soft-deleted diagrams + folders.
      if (url.pathname === "/api/trash") {
        await ensureFolderColumn(env);
        await ensureDeletedColumn(env);
        await ensureProjectColumns(env);
        if (request.method === "GET") {
          const d = await env.DB.prepare("SELECT id, title, kind, deleted FROM diagrams WHERE owner = ?1 AND deleted IS NOT NULL ORDER BY deleted DESC")
            .bind(email).all<{ id: string; title: string; kind: string; deleted: number }>();
          const f = await env.DB.prepare("SELECT id, name, deleted FROM workspaces WHERE owner = ?1 AND deleted IS NOT NULL ORDER BY deleted DESC")
            .bind(email).all<{ id: string; name: string; deleted: number }>();
          const p = await env.DB.prepare("SELECT id, name, deleted FROM projects WHERE owner = ?1 AND deleted IS NOT NULL ORDER BY deleted DESC")
            .bind(email).all<{ id: string; name: string; deleted: number }>();
          return Response.json({
            diagrams: (d.results ?? []).map((r) => ({ id: r.id, title: r.title, kind: r.kind, deletedAt: r.deleted })),
            folders: (f.results ?? []).map((r) => ({ id: r.id, name: r.name, deletedAt: r.deleted })),
            projects: (p.results ?? []).map((r) => ({ id: r.id, name: r.name, deletedAt: r.deleted })),
          }, { headers: cors });
        }
        if (request.method === "POST") { // restore
          const b = (await request.json().catch(() => ({}))) as { kind?: string; id?: string };
          if (!b.id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
          if (b.kind === "diagram") {
            await env.DB.prepare("UPDATE diagrams SET deleted = NULL WHERE id = ?1 AND owner = ?2").bind(b.id, email).run();
            return Response.json({ ok: true }, { headers: cors });
          }
          if (b.kind === "folder") {
            const all = (await env.DB.prepare("SELECT id, parent_id, deleted FROM workspaces WHERE owner = ?1").bind(email)
              .all<{ id: string; parent_id: string | null; deleted: number | null }>()).results ?? [];
            // restore the folder + its whole subtree (descendant folders + their diagrams)
            const sub = new Set<string>([b.id]);
            for (let g = true; g; ) { g = false; for (const x of all) if (x.parent_id && sub.has(x.parent_id) && !sub.has(x.id)) { sub.add(x.id); g = true; } }
            const ids = [...sub]; const ph = ids.map((_, i) => `?${i + 2}`).join(",");
            await env.DB.prepare(`UPDATE workspaces SET deleted = NULL WHERE owner = ?1 AND id IN (${ph})`).bind(email, ...ids).run();
            await env.DB.prepare(`UPDATE diagrams SET deleted = NULL WHERE owner = ?1 AND ws IN (${ph})`).bind(email, ...ids).run();
            // if its old parent is gone/still-trashed, bring it to the root so it's reachable
            const me = all.find((x) => x.id === b.id);
            const parent = me?.parent_id || "";
            const parentActive = !parent || all.some((x) => x.id === parent && x.deleted == null);
            if (parent && !parentActive) await env.DB.prepare("UPDATE workspaces SET parent_id = '' WHERE id = ?1 AND owner = ?2").bind(b.id, email).run();
            return Response.json({ ok: true }, { headers: cors });
          }
          if (b.kind === "project") {
            // restore the project + everything inside it (folders + diagrams)
            await env.DB.prepare("UPDATE projects SET deleted = NULL WHERE id = ?1 AND owner = ?2").bind(b.id, email).run();
            await env.DB.prepare("UPDATE workspaces SET deleted = NULL WHERE owner = ?1 AND project_id = ?2").bind(email, b.id).run();
            await env.DB.prepare("UPDATE diagrams SET deleted = NULL WHERE owner = ?1 AND project_id = ?2").bind(email, b.id).run();
            return Response.json({ ok: true }, { headers: cors });
          }
          return Response.json({ error: "bad kind" }, { status: 400, headers: cors });
        }
        if (request.method === "DELETE") { // purge permanently
          if (url.searchParams.get("all")) {
            const d = (await env.DB.prepare("SELECT id FROM diagrams WHERE owner = ?1 AND deleted IS NOT NULL").bind(email).all<{ id: string }>()).results ?? [];
            await Promise.all(d.map((r) => hardDeleteDiagram(env, email, r.id)));
            await env.DB.prepare("DELETE FROM workspaces WHERE owner = ?1 AND deleted IS NOT NULL").bind(email).run();
            await env.DB.prepare("DELETE FROM projects WHERE owner = ?1 AND deleted IS NOT NULL").bind(email).run();
            return Response.json({ ok: true }, { headers: cors });
          }
          const id = url.searchParams.get("id") || "";
          if (!id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
          if (url.searchParams.get("kind") === "project") {
            // purge the project + every folder + diagram inside it
            const dl = (await env.DB.prepare("SELECT id FROM diagrams WHERE owner = ?1 AND project_id = ?2").bind(email, id).all<{ id: string }>()).results ?? [];
            await Promise.all(dl.map((r) => hardDeleteDiagram(env, email, r.id)));
            await env.DB.prepare("DELETE FROM workspaces WHERE owner = ?1 AND project_id = ?2").bind(email, id).run();
            await env.DB.prepare("DELETE FROM projects WHERE owner = ?1 AND id = ?2").bind(email, id).run();
          } else if (url.searchParams.get("kind") === "folder") {
            const all = (await env.DB.prepare("SELECT id, parent_id FROM workspaces WHERE owner = ?1").bind(email)
              .all<{ id: string; parent_id: string | null }>()).results ?? [];
            const sub = new Set<string>([id]);
            for (let g = true; g; ) { g = false; for (const x of all) if (x.parent_id && sub.has(x.parent_id) && !sub.has(x.id)) { sub.add(x.id); g = true; } }
            const ids = [...sub]; const ph = ids.map((_, i) => `?${i + 2}`).join(",");
            const dl = (await env.DB.prepare(`SELECT id FROM diagrams WHERE owner = ?1 AND ws IN (${ph})`).bind(email, ...ids).all<{ id: string }>()).results ?? [];
            await Promise.all(dl.map((r) => hardDeleteDiagram(env, email, r.id)));
            await env.DB.prepare(`DELETE FROM workspaces WHERE owner = ?1 AND id IN (${ph})`).bind(email, ...ids).run();
          } else {
            await hardDeleteDiagram(env, email, id);
          }
          return Response.json({ ok: true }, { headers: cors });
        }
        return Response.json({ error: "method not allowed" }, { status: 405, headers: cors });
      }

      if (url.pathname === "/api/projects") {
        await ensureProjectColumns(env);
        if (request.method === "POST") {
          const b = (await request.json().catch(() => ({}))) as { name?: string };
          const name = (b.name || "").trim().slice(0, 40);
          if (!name) return Response.json({ error: "missing name" }, { status: 400, headers: cors });
          const project = await createProject(env, email, name);
          return Response.json({ ok: true, project }, { headers: cors });
        }
        if (request.method === "PATCH") {
          const b = (await request.json().catch(() => ({}))) as { id?: string; name?: string };
          if (!b.id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
          const name = (b.name || "").trim().slice(0, 40);
          if (!name) return Response.json({ error: "missing name" }, { status: 400, headers: cors });
          if (!(await renameProject(env, email, b.id, name))) return Response.json({ error: "not found" }, { status: 404, headers: cors });
          return Response.json({ ok: true }, { headers: cors });
        }
        if (request.method === "DELETE") {
          const id = url.searchParams.get("id") || "";
          if (!id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
          const res = await deleteProjectCascade(env, email, id);
          if (!res.ok) return Response.json({ error: res.error }, { status: res.error === "not found" ? 404 : 400, headers: cors });
          return Response.json({ ok: true }, { headers: cors });
        }
        return Response.json({ projects: await listProjects(env, email) }, { headers: cors });
      }

      if (url.pathname === "/api/workspaces") {
        await ensureFolderColumn(env);
        if (request.method === "POST") {
          // Create a folder, optionally nested under `parentId`.
          const b = (await request.json().catch(() => ({}))) as { name?: string; parentId?: string };
          const name = (b.name || "").trim().slice(0, 40);
          if (!name) return Response.json({ error: "missing name" }, { status: 400, headers: cors });
          const parentId = (b.parentId || "").trim();
          if (parentId) {
            const p = await env.DB.prepare("SELECT id FROM workspaces WHERE id = ?1 AND owner = ?2").bind(parentId, email).first();
            if (!p) return Response.json({ error: "parent not found" }, { status: 400, headers: cors });
          }
          const proj = await resolveProject(env, email, url.searchParams.get("project"));
          if (!proj) return Response.json({ error: "project not found" }, { status: 400, headers: cors });
          const ws: Workspace = { id: crypto.randomUUID().slice(0, 8), name, parentId, createdAt: Date.now() };
          await env.DB.prepare("INSERT INTO workspaces (id, owner, name, parent_id, project_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
            .bind(ws.id, email, ws.name, parentId, proj.id, ws.createdAt).run();
          return Response.json({ ok: true, workspace: ws }, { headers: cors });
        }
        if (request.method === "PATCH") {
          // Rename and/or move (reparent) a folder. `parentId` "" = move to root.
          const b = (await request.json().catch(() => ({}))) as { id?: string; name?: string; parentId?: string };
          if (!b.id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
          const name = b.name !== undefined ? (b.name || "").trim().slice(0, 40) : undefined;
          if (name !== undefined && !name) return Response.json({ error: "missing name" }, { status: 400, headers: cors });
          if (b.parentId !== undefined) {
            const parentId = (b.parentId || "").trim();
            const folders = await listWorkspaces(env, email);
            if (!folders.some((f) => f.id === b.id)) return Response.json({ error: "not found" }, { status: 404, headers: cors });
            if (parentId && !folders.some((f) => f.id === parentId)) return Response.json({ error: "parent not found" }, { status: 400, headers: cors });
            if (wouldCycle(folders, b.id, parentId)) return Response.json({ error: "cannot move a folder into itself" }, { status: 400, headers: cors });
            await env.DB.prepare("UPDATE workspaces SET parent_id = ?1 WHERE id = ?2 AND owner = ?3").bind(parentId, b.id, email).run();
          }
          if (name !== undefined) {
            const res = await env.DB.prepare("UPDATE workspaces SET name = ?1 WHERE id = ?2 AND owner = ?3").bind(name, b.id, email).run();
            if (!res.meta.changes && b.parentId === undefined) return Response.json({ error: "not found" }, { status: 404, headers: cors });
          }
          return Response.json({ ok: true }, { headers: cors });
        }
        if (request.method === "DELETE") {
          // Soft-delete a folder AND everything inside it — every nested subfolder
          // and every diagram in that subtree (rows stay in D1, just flagged).
          const id = url.searchParams.get("id") || "";
          if (!id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
          const all = await listWorkspaces(env, email);
          if (!all.some((f) => f.id === id)) return Response.json({ error: "not found" }, { status: 404, headers: cors });
          // the folder + all descendant folders
          const doomed = new Set<string>([id]);
          for (let grew = true; grew; ) { grew = false; for (const f of all) if (f.parentId && doomed.has(f.parentId) && !doomed.has(f.id)) { doomed.add(f.id); grew = true; } }
          const ids = [...doomed];
          const ph = ids.map((_, i) => `?${i + 2}`).join(",");
          // soft-delete each diagram in those folders
          const rs = await env.DB.prepare(`SELECT id FROM diagrams WHERE owner = ?1 AND deleted IS NULL AND ws IN (${ph})`).bind(email, ...ids).all<{ id: string }>();
          await Promise.all((rs.results ?? []).map((r) => destroyDiagram(env, email, r.id)));
          // soft-delete the folder rows
          await env.DB.prepare(`UPDATE workspaces SET deleted = ?1 WHERE owner = ?2 AND id IN (${ids.map((_, i) => `?${i + 3}`).join(",")})`).bind(Date.now(), email, ...ids).run();
          return Response.json({ ok: true }, { headers: cors });
        }
        {
          const proj = await resolveProject(env, email, url.searchParams.get("project"));
          if (!proj) return Response.json({ error: "project not found" }, { status: 400, headers: cors });
          return Response.json({ workspaces: await listWorkspaces(env, email, proj) }, { headers: cors });
        }
      }

      // Per-project open-tab state (VS Code window state) in KV: which diagrams
      // are open + which is active. Independent of last:/lastproj: (MCP-only).
      if (url.pathname === "/api/tabs") {
        if (request.method === "GET") {
          const proj = await resolveProject(env, email, url.searchParams.get("project"));
          if (!proj) return Response.json({ error: "project not found" }, { status: 400, headers: cors });
          return Response.json(await readTabs(env, email, proj.id), { headers: cors });
        }
        if (request.method === "PUT") {
          const b = (await request.json().catch(() => ({}))) as { project?: string; tabs?: unknown; active?: unknown };
          const proj = await resolveProject(env, email, b.project ?? url.searchParams.get("project"));
          if (!proj) return Response.json({ error: "project not found" }, { status: 400, headers: cors });
          const tabs = Array.isArray(b.tabs) ? (b.tabs as any[]).filter((x) => typeof x === "string") : [];
          const active = typeof b.active === "string" ? b.active : null;
          await writeTabs(env, email, proj.id, { tabs, active });
          return Response.json({ ok: true }, { headers: cors });
        }
        return Response.json({ error: "method not allowed" }, { status: 405, headers: cors });
      }

      if (request.method === "DELETE") {
        const id = url.searchParams.get("id") || "";
        if (!id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
        const st = await destroyDiagram(env, email, id);
        if (st === 403) return Response.json({ error: "forbidden" }, { status: 403, headers: cors });
        return Response.json({ ok: true }, { headers: cors });
      }
      if (request.method === "PATCH") {
        // move a diagram to a folder ("" = root) and/or another project, rename it,
        // and/or seed a brand-new diagram's content (source/kind) on Save.
        const b = (await request.json().catch(() => ({}))) as { id?: string; ws?: string; title?: string; project?: string; source?: string; kind?: string };
        if (!b.id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
        // Rename-only (existing diagram). When `source` is present this is a brand-new
        // diagram whose title rides along with the content write below, so skip here
        // (its row doesn't exist yet → the ownership check would 403).
        if (b.title !== undefined && b.source === undefined) {
          const title = (b.title || "").trim().slice(0, 60) || "Untitled";
          const owned = await env.DB.prepare("SELECT 1 FROM diagrams WHERE id = ?1 AND owner = ?2").bind(b.id, email).first();
          if (!owned) return Response.json({ error: "forbidden" }, { status: 403, headers: cors });
          // route through the room so the DO, D1 and any live editors all update
          await roomFor(env, b.id).fetch("https://room/set", {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: email, id: b.id, title }),
          }).catch(() => {});
        }
        if (b.project !== undefined && b.project) {
          // moving across projects also clears the folder (folders are project-local)
          const proj = await resolveProject(env, email, b.project);
          if (!proj) return Response.json({ error: "project not found" }, { status: 400, headers: cors });
          // a brand-new diagram isn't indexed until its room first autosaves — let
          // assignProject create the row (it's INSERT-OR-UPDATE) so saving into a
          // non-default project doesn't 403. Only reject when a row already exists
          // and belongs to someone else, so this can't hijack another owner's id.
          const existing = await env.DB.prepare("SELECT owner FROM diagrams WHERE id = ?1").bind(b.id).first<{ owner: string }>();
          if (existing && existing.owner !== email) return Response.json({ error: "forbidden" }, { status: 403, headers: cors });
          await assignProject(env, email, b.id, proj.id);
          if (b.ws === undefined) await env.DB.prepare("UPDATE diagrams SET ws = '' WHERE id = ?1 AND owner = ?2").bind(b.id, email).run();
        }
        if (b.ws !== undefined) await assignWorkspace(env, email, b.id, b.ws || "");
        // Seed a new diagram's content into its room on Save. Writing through the DO
        // (which stores the doc AND indexes it to D1) makes the diagram durable
        // immediately — no dependence on the editor's WebSocket staying open, so a
        // quick "New diagram → New diagram" can't lose the first one's content.
        if (b.source !== undefined) {
          const existing = await env.DB.prepare("SELECT owner FROM diagrams WHERE id = ?1").bind(b.id).first<{ owner: string }>();
          if (existing && existing.owner !== email) return Response.json({ error: "forbidden" }, { status: 403, headers: cors });
          const title = (b.title || "").trim().slice(0, 60);
          await roomFor(env, b.id).fetch("https://room/set", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ owner: email, id: b.id, source: b.source, kind: b.kind, ...(title ? { title } : {}), origin: "create" }),
          }).catch(() => {});
        }
        return Response.json({ ok: true }, { headers: cors });
      }
      // Search across title + source + kind (content search — titles are often "Untitled").
      const q = url.searchParams.get("q");
      if (q !== null) {
        await ensureDeletedColumn(env);
        if (!q.trim()) return Response.json({ diagrams: [] }, { headers: cors });
        const like = "%" + q.trim().replace(/[%_\\]/g, "") + "%";
        const rs = await env.DB.prepare(
          "SELECT id, title, kind FROM diagrams WHERE owner = ?1 AND deleted IS NULL AND (title LIKE ?2 OR source LIKE ?2 OR kind LIKE ?2) ORDER BY updated_at DESC LIMIT 50"
        ).bind(email, like).all<{ id: string; title: string; kind: string }>();
        return Response.json({ diagrams: (rs.results ?? []).map((r) => ({ id: r.id, title: r.title, kind: r.kind })) }, { headers: cors });
      }
      const proj = await resolveProject(env, email, url.searchParams.get("project"));
      if (!proj) return Response.json({ error: "project not found" }, { status: 400, headers: cors });
      const diagrams = await listIndex(env, email, proj); // migrate runs here first, so workspaces sees D1 rows
      const workspaces = await listWorkspaces(env, email, proj);
      const projects = await listProjects(env, email);
      return Response.json({ email, diagrams, workspaces, projects, project: proj.id }, { headers: cors });
    }
    // Public caching proxy for kroki.io renders: POST /api/render/<kind>/svg with
    // the diagram source as the body (mirrors kroki's own API). kroki renders
    // mermaid server-side with puppeteer (~2.5s, and it has bad days) — caching
    // the SVG by content hash means every visitor after the first gets the
    // diagram in one edge round-trip. Share links are immutable-by-construction
    // (?s= encodes the source), so a 1-year TTL is safe: new content = new key.
    {
      const m = url.pathname.match(/^\/api\/render\/([a-z0-9]+)\/svg$/);
      if (m) {
        const cors: Record<string, string> = {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-expose-headers": "x-render-cache",
        };
        if (request.method === "OPTIONS") return new Response(null, { headers: cors });
        if (request.method !== "POST") return Response.json({ error: "POST only" }, { status: 405, headers: cors });
        const kind = m[1];
        const source = await request.text();
        if (!source.trim()) return Response.json({ error: "empty source" }, { status: 400, headers: cors });
        if (source.length > 512 * 1024) return Response.json({ error: "source too large" }, { status: 413, headers: cors });

        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(kind + "\0" + source));
        const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
        // Cache API only matches GET requests — synthesize a GET key from the content hash.
        const cacheKey = new Request(`${url.origin}/api/render/${kind}/svg?h=${hash}`, { method: "GET" });
        const cache = caches.default;

        const hit = await cache.match(cacheKey);
        if (hit) {
          const res = new Response(hit.body, hit);
          res.headers.set("x-render-cache", "hit");
          Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
          return res;
        }

        let upstream: Response;
        try {
          upstream = await fetch(`https://kroki.io/${kind}/svg`, {
            method: "POST",
            headers: { "content-type": "text/plain" },
            body: source,
          });
        } catch (e: any) {
          return Response.json({ error: `kroki unreachable: ${e?.message ?? e}` }, { status: 502, headers: cors });
        }
        if (!upstream.ok) {
          // kroki errors (bad source, ENOSPC days, …) are relayed but never cached.
          return new Response(await upstream.text(), {
            status: upstream.status,
            headers: { "content-type": "text/plain", "x-render-cache": "miss", ...cors },
          });
        }
        const svg = await upstream.text();
        const res = new Response(svg, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml",
            "cache-control": "public, max-age=31536000, immutable",
            "x-render-cache": "miss",
            ...cors,
          },
        });
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
        return res;
      }
    }
    return oauthProvider.fetch(request, env, ctx);
  },
};
