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

const ROOM_NAME = "default";
const GOOGLE_JWKS = jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

async function verifyGoogleIdToken(idToken: string, clientId: string) {
  const { payload } = await jose.jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  return payload as { email?: string; email_verified?: boolean; sub?: string; name?: string };
}

function emailAllowed(email: string | undefined, env: Env): boolean {
  if (!email) return false;
  const list = (env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.length === 0 || list.includes(email.toLowerCase());
}

function roomStub(env: Env) {
  return env.EDITOR_ROOM.get(env.EDITOR_ROOM.idFromName(ROOM_NAME));
}

// ---- Shared live editor room: holds the DSL, fans out over WebSocket. ----
export class EditorRoom extends DurableObject<Env> {
  source = "";
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.source = (await ctx.storage.get<string>("source")) ?? "";
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/ws")) {
      // Receiving live updates requires a valid Google identity in the allowlist.
      const idToken = url.searchParams.get("id_token") ?? "";
      try {
        const p = await verifyGoogleIdToken(idToken, this.env.GOOGLE_CLIENT_ID);
        if (!emailAllowed(p.email, this.env)) return new Response("forbidden", { status: 403 });
      } catch {
        return new Response("unauthorized", { status: 401 });
      }
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: "doc", source: this.source, origin: "server" }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname.endsWith("/set") && request.method === "POST") {
      const body = (await request.json()) as { source?: string; origin?: string };
      this.source = String(body.source ?? "");
      await this.ctx.storage.put("source", this.source);
      this.broadcast({ type: "doc", source: this.source, origin: body.origin ?? "mcp" });
      return Response.json({ ok: true, bytes: this.source.length, clients: this.ctx.getWebSockets().length });
    }
    if (url.pathname.endsWith("/get")) {
      return Response.json({ source: this.source, clients: this.ctx.getWebSockets().length });
    }
    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let data: any;
    try { data = JSON.parse(message); } catch { return; }
    if (data && data.type === "set" && typeof data.source === "string") {
      this.source = data.source;
      await this.ctx.storage.put("source", this.source);
      this.broadcast({ type: "doc", source: this.source, origin: data.origin ?? "browser" }, ws);
    }
  }
  async webSocketClose(ws: WebSocket) { try { ws.close(); } catch {} }

  broadcast(obj: unknown, except?: WebSocket) {
    const msg = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(msg); } catch {}
    }
  }
}

// ---- MCP server (protected by the OAuth provider; props.email set on grant). ----
export class KymoMCP extends McpAgent<Env, unknown, { email: string; name?: string }> {
  server = new McpServer({ name: "kymo-editor", version: "0.2.0" });

  async init() {
    this.server.tool(
      "set_diagram",
      "Push a kymo flowchart DSL to the LIVE editor at https://editor.kymo.studio. Every signed-in editor tab updates and re-renders in real time. Use the `flowchart TD { ... }` block syntax.",
      { source: z.string().describe("The full kymo flowchart DSL source to display in the editor.") },
      async ({ source }) => {
        const r = await roomStub(this.env).fetch("https://room/set", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source, origin: "mcp" }),
        });
        const j = (await r.json()) as { bytes: number; clients: number };
        return { content: [{ type: "text", text: `Pushed ${j.bytes} chars to editor.kymo.studio (${j.clients} live tab(s)).` }] };
      }
    );
    this.server.tool(
      "get_diagram",
      "Get the kymo DSL currently shown in the live editor at editor.kymo.studio.",
      {},
      async () => {
        const r = await roomStub(this.env).fetch("https://room/get");
        const j = (await r.json()) as { source: string };
        return { content: [{ type: "text", text: j.source && j.source.length ? j.source : "(editor is empty)" }] };
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
<h2>kymo editor</h2>
<p>Sign in with Google to authorize Claude.</p>
<div id="g_id_onload" data-client_id="${clientId}" data-callback="onCred" data-auto_prompt="false"></div>
<div class="g_id_signin" data-type="standard" data-theme="filled_black" data-size="large"></div>
<p id="msg"></p>
</div>
<script>
const OAUTH_REQ = ${JSON.stringify(oauthReqJson)};
async function onCred(resp){
  const m = document.getElementById("msg"); m.textContent = "Signing in…";
  try{
    const r = await fetch("/authorize",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({credential:resp.credential,oauthReq:OAUTH_REQ})});
    if(r.ok){ const j = await r.json(); location.href = j.redirectTo; return; }
    const j = await r.json().catch(()=>({}));
    m.textContent = j.error==="forbidden" ? ("Not allowed: "+(j.email||"")) : ("Sign-in failed ("+(j.error||r.status)+")");
  }catch(e){ m.textContent = "Sign-in error: "+e.message; }
}
</script></body></html>`;
}

// ---- Default handler: editor /ws + the Google sign-in (login UI for the OAuth flow). ----
const defaultHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") return roomStub(env).fetch(request);

    if (url.pathname === "/authorize" && request.method === "GET") {
      const oauthReq = await env.OAUTH_PROVIDER.parseAuthRequest(request);
      return new Response(loginPage(env.GOOGLE_CLIENT_ID, JSON.stringify(oauthReq)), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === "/authorize" && request.method === "POST") {
      const body = (await request.json()) as { credential: string; oauthReq: string };
      let p: { email?: string; sub?: string; name?: string };
      try { p = await verifyGoogleIdToken(body.credential, env.GOOGLE_CLIENT_ID); }
      catch { return Response.json({ error: "invalid_token" }, { status: 401 }); }
      if (!emailAllowed(p.email, env)) return Response.json({ error: "forbidden", email: p.email }, { status: 403 });
      const oauthReq = JSON.parse(body.oauthReq);
      const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReq,
        userId: p.sub as string,
        scope: oauthReq.scope ?? [],
        metadata: { email: p.email },
        props: { email: p.email, name: p.name },
      });
      return Response.json({ redirectTo });
    }
    if (url.pathname === "/") {
      return new Response("kymo-mcp (Google auth). MCP: /mcp or /sse. Editor live channel: /ws (needs id_token).\n", {
        headers: { "content-type": "text/plain" },
      });
    }
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

// Handle the editor WebSocket BEFORE the OAuth provider — the provider re-wraps
// Responses and would drop the `webSocket` from the 101 upgrade. /ws does its own
// Google-id-token auth inside the EditorRoom DO.
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> | Response {
    const url = new URL(request.url);
    if (url.pathname === "/ws") return roomStub(env).fetch(request);
    return oauthProvider.fetch(request, env, ctx);
  },
};
