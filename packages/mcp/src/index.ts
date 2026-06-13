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
  OAUTH_PROVIDER: any;
  GOOGLE_CLIENT_ID: string;
  ALLOWED_EMAILS: string;
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

async function listIndex(env: Env, email: string): Promise<IdxEntry[]> {
  await migrateKvToD1(env, email);
  await ensureThumbColumn(env);
  await ensureDeletedColumn(env);
  const rs = await env.DB.prepare(
    "SELECT id, title, kind, ws, updated_at, (thumb IS NOT NULL AND thumb != '') AS has_thumb FROM diagrams WHERE owner = ?1 AND deleted IS NULL ORDER BY updated_at DESC"
  ).bind(email).all<{ id: string; title: string; kind: string; ws: string; updated_at: number; has_thumb: number }>();
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
async function listWorkspaces(env: Env, email: string): Promise<Workspace[]> {
  await migrateKvToD1(env, email);
  await ensureFolderColumn(env);
  await ensureDeletedColumn(env);
  const rs = await env.DB.prepare("SELECT id, name, parent_id, created_at FROM workspaces WHERE owner = ?1 AND deleted IS NULL ORDER BY created_at")
    .bind(email).all<{ id: string; name: string; parent_id: string | null; created_at: number }>();
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
      const idToken = url.searchParams.get("id_token") ?? "";
      let email: string | undefined;
      try {
        const p = await verifyGoogleIdToken(idToken, this.env.GOOGLE_CLIENT_ID);
        email = p.email;
        if (!emailAllowed(email, this.env)) return new Response("forbidden", { status: 403 });
      } catch { return new Response("unauthorized", { status: 401 }); }
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

// ---- MCP server: per-user multi-diagram tools (owner = props.email). ----
export class KymoMCP extends McpAgent<Env, unknown, { email: string; name?: string }> {
  server = new McpServer({ name: "kymostudio", version: "0.4.1" });

  async init() {
    const me = () => this.props.email;
    const link = (id: string) => `${EDITOR_URL}/?d=${id}`;

    this.server.tool(
      "new_diagram",
      "Create a NEW diagram for the signed-in user and open it live. Returns its id + URL. A user can own many diagrams. Optionally seed a title and initial DSL; otherwise a minimal scaffold is used.",
      {
        title: z.string().optional().describe("A short name for the diagram (for list_diagrams)."),
        source: z.string().optional().describe("Optional initial kymo DSL (flowchart TD { ... }). Defaults to a minimal scaffold."),
        kind: z.string().optional().describe("Diagram kind: 'kymo' (default, native DSL) or a kroki.io type (plantuml, c4plantuml, mermaid, graphviz, d2, dbml, ditaa, erd, excalidraw, nomnoml, pikchr, structurizr, svgbob, symbolator, tikz, umlet, vega, vegalite, wavedrom, wireviz, bpmn, bytefield, blockdiag, seqdiag, actdiag, nwdiag, packetdiag, rackdiag)."),
      },
      async ({ title, source, kind }) => {
        const id = crypto.randomUUID().slice(0, 8);
        const src = source ?? `flowchart TD {\n  A[${title ?? "Bắt đầu"}]\n}`;
        await roomFor(this.env, id).fetch("https://room/set", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, source: src, origin: "mcp", owner: me(), title: title ?? "Untitled", kind: kind && kind !== "kymo" ? kind : undefined }),
        });
        await touchIndex(this.env, me(), id, title ?? "Untitled", kind && kind !== "kymo" ? kind : "kymo");
        return { content: [{ type: "text", text: `Created ${kind ?? "kymo"} diagram "${title ?? "Untitled"}" (id ${id}). Open: ${link(id)}` }] };
      }
    );

    this.server.tool(
      "list_diagrams",
      "List the signed-in user's diagrams (id, title, URL), most-recent first.",
      {},
      async () => {
        const list = await listIndex(this.env, me());
        if (!list.length) return { content: [{ type: "text", text: "No diagrams yet — use new_diagram." }] };
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const lines = list.map((d) => {
          const when = d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "";
          return `- ${d.title || "Untitled"} [${d.kind || "kymo"}] — ${link(d.id)} (id ${d.id}${when ? `, updated ${when}` : ""})`;
        });
        return { content: [{ type: "text", text: `${list.length} diagram(s):\n${lines.join("\n")}` }] };
      }
    );

    this.server.tool(
      "edit_diagram",
      "Edit one of your diagrams: update its content (`source`) and/or rename it (`title`). Pushes live to editor.kymo.studio. Pass `id` to target a specific diagram; omit to use your most recent. At least one of source/title is required. Use the `flowchart TD { ... }` block syntax for source.",
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
        return { content: [{ type: "text", text: `Edited ${did} (${what}; ${j.clients} live tab(s)). ${link(did)}` }] };
      }
    );

    this.server.tool(
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

    this.server.tool(
      "delete_diagram",
      "Permanently delete one of your diagrams (content and listing). Cannot be undone.",
      { id: z.string().describe("Diagram id to delete (from list_diagrams).") },
      async ({ id }) => {
        const st = await destroyDiagram(this.env, me(), id);
        if (st === 403) return { content: [{ type: "text", text: `Diagram ${id} isn't yours.` }] };
        return { content: [{ type: "text", text: `Deleted diagram ${id}.` }] };
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
        metadata: { email: p.email }, props: { email: p.email, name: p.name },
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
    // Browser-callable APIs for the signed-in user (Google id_token).
    if (url.pathname === "/api/diagrams" || url.pathname === "/api/diagrams/thumb" || url.pathname === "/api/workspaces" || url.pathname === "/api/trash") {
      const cors: Record<string, string> = {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
      };
      if (request.method === "OPTIONS") return new Response(null, { headers: cors });
      const idToken = url.searchParams.get("id_token") || (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      let email: string;
      try {
        const pl = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
        if (!emailAllowed(pl.email, env)) return Response.json({ error: "forbidden" }, { status: 403, headers: cors });
        email = pl.email!;
      } catch {
        return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
      }

      // Per-diagram thumbnail SVG for the Diagrams list — separate route so the
      // list JSON stays small and the browser lazy-loads + caches each <img>.
      if (url.pathname === "/api/diagrams/thumb") {
        const id = url.searchParams.get("id") || "";
        if (!id) return new Response("missing id", { status: 400, headers: cors });
        await ensureThumbColumn(env);
        const row = await env.DB.prepare("SELECT thumb FROM diagrams WHERE id = ?1 AND owner = ?2")
          .bind(id, email).first<{ thumb: string | null }>();
        if (!row || !row.thumb) return new Response("no thumb", { status: 404, headers: cors });
        return new Response(row.thumb, { headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=120", ...cors } });
      }

      // Trash: list / restore / permanently delete soft-deleted diagrams + folders.
      if (url.pathname === "/api/trash") {
        await ensureFolderColumn(env);
        await ensureDeletedColumn(env);
        if (request.method === "GET") {
          const d = await env.DB.prepare("SELECT id, title, kind, deleted FROM diagrams WHERE owner = ?1 AND deleted IS NOT NULL ORDER BY deleted DESC")
            .bind(email).all<{ id: string; title: string; kind: string; deleted: number }>();
          const f = await env.DB.prepare("SELECT id, name, deleted FROM workspaces WHERE owner = ?1 AND deleted IS NOT NULL ORDER BY deleted DESC")
            .bind(email).all<{ id: string; name: string; deleted: number }>();
          return Response.json({
            diagrams: (d.results ?? []).map((r) => ({ id: r.id, title: r.title, kind: r.kind, deletedAt: r.deleted })),
            folders: (f.results ?? []).map((r) => ({ id: r.id, name: r.name, deletedAt: r.deleted })),
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
          return Response.json({ error: "bad kind" }, { status: 400, headers: cors });
        }
        if (request.method === "DELETE") { // purge permanently
          if (url.searchParams.get("all")) {
            const d = (await env.DB.prepare("SELECT id FROM diagrams WHERE owner = ?1 AND deleted IS NOT NULL").bind(email).all<{ id: string }>()).results ?? [];
            await Promise.all(d.map((r) => hardDeleteDiagram(env, email, r.id)));
            await env.DB.prepare("DELETE FROM workspaces WHERE owner = ?1 AND deleted IS NOT NULL").bind(email).run();
            return Response.json({ ok: true }, { headers: cors });
          }
          const id = url.searchParams.get("id") || "";
          if (!id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
          if (url.searchParams.get("kind") === "folder") {
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
          const ws: Workspace = { id: crypto.randomUUID().slice(0, 8), name, parentId, createdAt: Date.now() };
          await env.DB.prepare("INSERT INTO workspaces (id, owner, name, parent_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5)")
            .bind(ws.id, email, ws.name, parentId, ws.createdAt).run();
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
        return Response.json({ workspaces: await listWorkspaces(env, email) }, { headers: cors });
      }

      if (request.method === "DELETE") {
        const id = url.searchParams.get("id") || "";
        if (!id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
        const st = await destroyDiagram(env, email, id);
        if (st === 403) return Response.json({ error: "forbidden" }, { status: 403, headers: cors });
        return Response.json({ ok: true }, { headers: cors });
      }
      if (request.method === "PATCH") {
        // move a diagram to a workspace ("" = Personal)
        const b = (await request.json().catch(() => ({}))) as { id?: string; ws?: string };
        if (!b.id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
        await assignWorkspace(env, email, b.id, b.ws || "");
        return Response.json({ ok: true }, { headers: cors });
      }
      const diagrams = await listIndex(env, email); // migrate runs here first, so workspaces sees D1 rows
      const workspaces = await listWorkspaces(env, email);
      return Response.json({ email, diagrams, workspaces }, { headers: cors });
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
