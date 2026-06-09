// kymostudio editor — a tiny zero-dependency Node server that renders the
// kymo flowchart DSL (the native `bpmn { }` block) to SVG.
//
//   POST /api/render  { source }  ->  { svg } | { error }
//
// Rendering is delegated to the Python reference renderer (parse -> resolve
// layout -> SVG) via `render_kymo.py`: the source is piped on stdin and the
// SVG comes back on stdout. The Rust CLI does not render the `.kymo` DSL, so
// this path uses the Python engine + the `kymostudio-core` layout core.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToSvg, PYTHON, PYTHONPATH } from "./render.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "0.0.0.0";

// ── Live document state ────────────────────────────────────────────────
// The current editor source, shared across all connected browsers AND the
// MCP server (which edits/reads it via /api/doc). Updates are pushed to every
// open browser over Server-Sent Events, so an MCP `set_diagram` shows up live.
const DEFAULT_DOC = `flowchart TD {
  A[Nhận đơn hàng] --> B{Còn hàng?}
  B -->|Có| C[Thanh toán]
  B -->|Không| D[Thông báo khách]
  C --> E[Đóng gói]
  E --> F((Giao hàng))
  D --> G[Hủy đơn]
}`;
let currentDoc = DEFAULT_DOC;
const sseClients = new Set();

function broadcastDoc(origin) {
  const data = `data: ${JSON.stringify({ source: currentDoc, origin })}\n\n`;
  for (const c of sseClients) {
    try {
      c.write(data);
    } catch {
      sseClients.delete(c);
    }
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end(body);
}
function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), {
    "Content-Type": "application/json; charset=utf-8",
  });
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/render") {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch {
        return sendJson(res, 400, { error: "invalid JSON body" });
      }
      const source = typeof payload.source === "string" ? payload.source : "";
      if (!source.trim()) return sendJson(res, 400, { error: "empty source" });
      try {
        const svg = await renderToSvg(source);
        return sendJson(res, 200, { svg });
      } catch (e) {
        return sendJson(res, 422, { error: String(e.message || e) });
      }
    }

    // Current shared document (read by the browser on load and by MCP get).
    if (req.method === "GET" && req.url === "/api/doc") {
      return sendJson(res, 200, { source: currentDoc });
    }

    // Set the shared document (from a browser edit or an MCP set_diagram) and
    // push it to every other open browser via SSE.
    if (req.method === "POST" && req.url === "/api/doc") {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch {
        return sendJson(res, 400, { error: "invalid JSON body" });
      }
      if (typeof payload.source !== "string") {
        return sendJson(res, 400, { error: "source must be a string" });
      }
      currentDoc = payload.source;
      broadcastDoc(payload.origin || "unknown");
      return sendJson(res, 200, { ok: true });
    }

    // Live document stream (Server-Sent Events).
    if (req.method === "GET" && req.url === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`data: ${JSON.stringify({ source: currentDoc, origin: "init" })}\n\n`);
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    if (req.method === "GET" && req.url === "/api/health") {
      return sendJson(res, 200, { ok: true, python: PYTHON, pythonpath: PYTHONPATH, clients: sseClients.size });
    }

    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      const body = await readFile(join(__dirname, "public/index.html"));
      return send(res, 200, body, { "Content-Type": "text/html; charset=utf-8" });
    }

    return send(res, 404, "Not found", { "Content-Type": "text/plain" });
  } catch (e) {
    return sendJson(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`kymo editor on http://${HOST}:${PORT}  (python: ${PYTHON})`);
});
