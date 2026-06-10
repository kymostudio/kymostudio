import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import * as jose from "jose";

export interface Env {
  OAUTH_KV: KVNamespace;
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

// per-user diagram index (which diagram ids a user owns), stored in OAUTH_KV under idx:<email>
type IdxEntry = { id: string; title: string; updatedAt: number };
async function listIndex(env: Env, email: string): Promise<IdxEntry[]> {
  const raw = await env.OAUTH_KV.get(`idx:${email}`);
  return raw ? (JSON.parse(raw) as IdxEntry[]) : [];
}
async function touchIndex(env: Env, email: string, id: string, title?: string) {
  const list = await listIndex(env, email);
  const i = list.findIndex((d) => d.id === id);
  const now = Date.now();
  if (i >= 0) { if (title != null) list[i].title = title; list[i].updatedAt = now; }
  else list.push({ id, title: title ?? "Untitled", updatedAt: now });
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  await env.OAUTH_KV.put(`idx:${email}`, JSON.stringify(list));
  await env.OAUTH_KV.put(`last:${email}`, id);
}

// ---- One diagram = one EditorRoom DO (keyed by diagram id). Owner-scoped. ----
export class EditorRoom extends DurableObject<Env> {
  source = ""; owner = ""; title = ""; diagramId = "";
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.source = (await ctx.storage.get<string>("source")) ?? "";
      this.owner = (await ctx.storage.get<string>("owner")) ?? "";
      this.title = (await ctx.storage.get<string>("title")) ?? "";
      this.diagramId = (await ctx.storage.get<string>("diagramId")) ?? "";
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
      if (!this.owner) { this.owner = email!; await this.ctx.storage.put("owner", email!); await this.indexUpsert(); }
      else if (this.owner !== email) return new Response("forbidden: not your diagram", { status: 403 });
      const pair = new WebSocketPair();
      const client = pair[0], server = pair[1];
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: "doc", source: this.source, title: this.title, origin: "server" }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname.endsWith("/set") && request.method === "POST") {
      const b = (await request.json()) as { source?: string; origin?: string; owner?: string; title?: string };
      if (this.owner && b.owner && this.owner !== b.owner) return Response.json({ error: "forbidden" }, { status: 403 });
      if (!this.owner && b.owner) { this.owner = b.owner; await this.ctx.storage.put("owner", b.owner); }
      this.source = String(b.source ?? "");
      await this.ctx.storage.put("source", this.source);
      if (typeof b.title === "string") { this.title = b.title; await this.ctx.storage.put("title", b.title); }
      this.broadcast({ type: "doc", source: this.source, title: this.title, origin: b.origin ?? "mcp" });
      return Response.json({ ok: true, bytes: this.source.length, clients: this.ctx.getWebSockets().length });
    }
    if (url.pathname.endsWith("/get")) {
      const requester = url.searchParams.get("email") ?? "";
      if (this.owner && requester && this.owner !== requester) return Response.json({ error: "forbidden" }, { status: 403 });
      return Response.json({ source: this.source, title: this.title, owner: this.owner });
    }
    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let data: any; try { data = JSON.parse(message); } catch { return; }
    if (data && data.type === "set" && typeof data.source === "string") {
      this.source = data.source;
      await this.ctx.storage.put("source", this.source);
      this.broadcast({ type: "doc", source: this.source, title: this.title, origin: data.origin ?? "browser" }, ws);
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
    const key = `idx:${this.owner}`;
    const raw = await this.env.OAUTH_KV.get(key);
    const list = raw ? (JSON.parse(raw) as { id: string; title: string; updatedAt: number }[]) : [];
    const i = list.findIndex((d) => d.id === this.diagramId);
    const now = Date.now();
    if (i >= 0) { if (this.title) list[i].title = this.title; list[i].updatedAt = now; }
    else list.push({ id: this.diagramId, title: this.title || "Untitled", updatedAt: now });
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    await this.env.OAUTH_KV.put(key, JSON.stringify(list));
  }
  async webSocketClose(ws: WebSocket) { try { ws.close(); } catch {} }
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
      },
      async ({ title, source }) => {
        const id = crypto.randomUUID().slice(0, 8);
        const src = source ?? `flowchart TD {\n  A[${title ?? "Bắt đầu"}]\n}`;
        await roomFor(this.env, id).fetch("https://room/set", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: src, origin: "mcp", owner: me(), title: title ?? "Untitled" }),
        });
        await touchIndex(this.env, me(), id, title ?? "Untitled");
        return { content: [{ type: "text", text: `Created diagram "${title ?? "Untitled"}" (id ${id}). Open: ${link(id)}` }] };
      }
    );

    this.server.tool(
      "list_diagrams",
      "List the signed-in user's diagrams (id, title, URL), most-recent first.",
      {},
      async () => {
        const list = await listIndex(this.env, me());
        if (!list.length) return { content: [{ type: "text", text: "No diagrams yet — use new_diagram." }] };
        return { content: [{ type: "text", text: list.map((d) => `- ${d.id} · ${d.title} · ${link(d.id)}`).join("\n") }] };
      }
    );

    this.server.tool(
      "set_diagram",
      "Push kymo DSL to one of your diagrams (live). Pass `id` to target a specific diagram; if omitted, updates your most-recent one. Use the `flowchart TD { ... }` syntax.",
      {
        source: z.string().describe("The full kymo flowchart DSL."),
        id: z.string().optional().describe("Diagram id (from new_diagram/list_diagrams). Omit to use your most recent."),
      },
      async ({ source, id }) => {
        const did = id ?? (await this.env.OAUTH_KV.get(`last:${me()}`));
        if (!did) return { content: [{ type: "text", text: "No diagram yet — call new_diagram first (or pass id)." }] };
        const r = await roomFor(this.env, did).fetch("https://room/set", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ source, origin: "mcp", owner: me() }),
        });
        if (r.status === 403) return { content: [{ type: "text", text: `Diagram ${did} isn't yours.` }] };
        const j = (await r.json()) as { clients: number };
        await touchIndex(this.env, me(), did);
        return { content: [{ type: "text", text: `Updated "${did}" (${j.clients} live tab(s)). ${link(did)}` }] };
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
        const j = (await r.json()) as { source: string };
        return { content: [{ type: "text", text: j.source && j.source.length ? j.source : "(empty)" }] };
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
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> | Response {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const d = url.searchParams.get("d") || "default";
      return roomFor(env, d).fetch(request);
    }
    return oauthProvider.fetch(request, env, ctx);
  },
};
