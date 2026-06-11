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
type IdxEntry = { id: string; title: string; updatedAt: number; kind?: string; ws?: string };

async function listIndex(env: Env, email: string): Promise<IdxEntry[]> {
  await migrateKvToD1(env, email);
  const rs = await env.DB.prepare(
    "SELECT id, title, kind, ws, updated_at FROM diagrams WHERE owner = ?1 ORDER BY updated_at DESC"
  ).bind(email).all<{ id: string; title: string; kind: string; ws: string; updated_at: number }>();
  return (rs.results ?? []).map((r) => ({ id: r.id, title: r.title, kind: r.kind, ws: r.ws, updatedAt: r.updated_at }));
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

async function destroyDiagram(env: Env, email: string, id: string): Promise<number> {
  const r = await roomFor(env, id).fetch("https://room/destroy", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ owner: email }),
  });
  if (r.status === 403) return 403;
  await removeFromIndex(env, email, id);
  return 200;
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

// ---- Workspaces: named groups of diagrams (D1 rows; ws "" = Personal). ----
type Workspace = { id: string; name: string; createdAt: number };
async function listWorkspaces(env: Env, email: string): Promise<Workspace[]> {
  await migrateKvToD1(env, email);
  const rs = await env.DB.prepare("SELECT id, name, created_at FROM workspaces WHERE owner = ?1 ORDER BY created_at")
    .bind(email).all<{ id: string; name: string; created_at: number }>();
  return (rs.results ?? []).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
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
      server.send(JSON.stringify({ type: "doc", source: this.source, title: this.title, kind: this.kind || undefined, origin: "server" }));
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
      if (changedSource) this.broadcast({ type: "doc", source: this.source, title: this.title, kind: this.kind || undefined, origin: b.origin ?? "mcp" });
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
      this.broadcast({ type: "doc", source: this.source, title: this.title, kind: this.kind || undefined, origin: data.origin ?? "browser" }, ws);
    }
    if (data && data.type === "rename" && typeof data.title === "string") {
      this.title = data.title;
      await this.ctx.storage.put("title", this.title);
      await this.indexUpsert();
      this.broadcast({ type: "meta", title: this.title }, ws);
    }
  }

  async indexUpsert() {
    if (!this.owner || !this.diagramId) return;
    await this.env.DB.prepare(
      `INSERT INTO diagrams (id, owner, title, kind, source, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(id) DO UPDATE SET title = ?3, kind = ?4, source = ?5, updated_at = ?6`
    ).bind(this.diagramId, this.owner, this.title || "Untitled", this.kind || "kymo", this.source, Date.now()).run();
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
  server = new McpServer({ name: "kymo-editor", version: "0.3.0" });

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
<title>Sign in &middot; kymo editor</title>
<script src="https://accounts.google.com/gsi/client" async></script>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b0c;color:#eee}
.card{text-align:center;padding:32px 40px;border:1px solid #222;border-radius:14px;background:#141416}
h2{margin:0 0 4px}p{color:#9aa;margin:6px 0 18px}#msg{color:#f66;min-height:1.2em;margin-top:14px}</style></head>
<body><div class="card">
<h2>kymo editor</h2><p>Sign in with Google to authorize Claude.</p>
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const d = url.searchParams.get("d") || "default";
      return roomFor(env, d).fetch(request);
    }
    // Browser-callable APIs for the signed-in user (Google id_token).
    if (url.pathname === "/api/diagrams" || url.pathname === "/api/workspaces") {
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

      if (url.pathname === "/api/workspaces") {
        if (request.method === "POST") {
          const b = (await request.json().catch(() => ({}))) as { name?: string };
          const name = (b.name || "").trim().slice(0, 40);
          if (!name) return Response.json({ error: "missing name" }, { status: 400, headers: cors });
          const ws: Workspace = { id: crypto.randomUUID().slice(0, 8), name, createdAt: Date.now() };
          await env.DB.prepare("INSERT INTO workspaces (id, owner, name, created_at) VALUES (?1, ?2, ?3, ?4)")
            .bind(ws.id, email, ws.name, ws.createdAt).run();
          return Response.json({ ok: true, workspace: ws }, { headers: cors });
        }
        if (request.method === "PATCH") {
          const b = (await request.json().catch(() => ({}))) as { id?: string; name?: string };
          const name = (b.name || "").trim().slice(0, 40);
          if (!b.id || !name) return Response.json({ error: "missing id/name" }, { status: 400, headers: cors });
          const res = await env.DB.prepare("UPDATE workspaces SET name = ?1 WHERE id = ?2 AND owner = ?3")
            .bind(name, b.id, email).run();
          if (!res.meta.changes) return Response.json({ error: "not found" }, { status: 404, headers: cors });
          return Response.json({ ok: true, workspace: { id: b.id, name } }, { headers: cors });
        }
        if (request.method === "DELETE") {
          const id = url.searchParams.get("id") || "";
          if (!id) return Response.json({ error: "missing id" }, { status: 400, headers: cors });
          await env.DB.prepare("DELETE FROM workspaces WHERE id = ?1 AND owner = ?2").bind(id, email).run();
          // its diagrams fall back to Personal
          await env.DB.prepare("UPDATE diagrams SET ws = '' WHERE owner = ?1 AND ws = ?2").bind(email, id).run();
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
    return oauthProvider.fetch(request, env, ctx);
  },
};
