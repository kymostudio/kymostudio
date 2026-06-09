import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DurableObject } from "cloudflare:workers";
import { z } from "zod";

export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  EDITOR_ROOM: DurableObjectNamespace;
}

const ROOM_NAME = "default";

// Shared live editor room: holds the current DSL and fans it out to every
// connected editor tab over WebSocket (hibernatable).
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

  async webSocketClose(ws: WebSocket) {
    try { ws.close(); } catch {}
  }

  broadcast(obj: unknown, except?: WebSocket) {
    const msg = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(msg); } catch {}
    }
  }
}

function roomStub(env: Env) {
  return env.EDITOR_ROOM.get(env.EDITOR_ROOM.idFromName(ROOM_NAME));
}

export class KymoMCP extends McpAgent<Env> {
  server = new McpServer({ name: "kymo-editor", version: "0.1.0" });

  async init() {
    this.server.tool(
      "set_diagram",
      "Push a kymo flowchart DSL to the LIVE editor at https://editor.kymo.studio. Every open editor tab updates and re-renders in real time. Use the `flowchart TD { ... }` block syntax (nodes like A[Label], B{Decision}, edges A --> B, A -->|label| B).",
      { source: z.string().describe("The full kymo flowchart DSL source to display in the editor.") },
      async ({ source }) => {
        const r = await roomStub(this.env).fetch("https://room/set", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source, origin: "mcp" }),
        });
        const j = (await r.json()) as { bytes: number; clients: number };
        return { content: [{ type: "text", text: `Pushed ${j.bytes} chars to editor.kymo.studio (${j.clients} live tab(s) updated).` }] };
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ws" || url.pathname === "/set" || url.pathname === "/get") {
      return roomStub(env).fetch(request);
    }
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return KymoMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    if (url.pathname === "/mcp") {
      return KymoMCP.serve("/mcp").fetch(request, env, ctx);
    }
    if (url.pathname === "/") {
      return new Response("kymo-mcp - MCP: /mcp (Streamable HTTP) or /sse - editor live channel: /ws\n", { headers: { "content-type": "text/plain" } });
    }
    return new Response("not found", { status: 404 });
  },
};
