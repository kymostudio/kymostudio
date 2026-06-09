// kymostudio web-app — a tiny zero-dependency Node server that renders the
// kymo flowchart DSL (the native `bpmn { }` block) to SVG.
//
//   POST /api/render  { source }  ->  { svg } | { error }
//
// Rendering is delegated to the Python reference renderer (parse -> resolve
// layout -> SVG) via `render_kymo.py`: the source is piped on stdin and the
// SVG comes back on stdout. The Rust CLI does not render the `.kymo` DSL, so
// this path uses the Python engine + the `kymostudio-core` layout core.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "0.0.0.0";

// Python interpreter: the in-package venv, else `python3` on PATH.
function resolvePython() {
  if (process.env.KYMO_PYTHON) return process.env.KYMO_PYTHON;
  const venv = join(__dirname, ".venv/bin/python");
  return existsSync(venv) ? venv : "python3";
}
const PYTHON = resolvePython();
// Where the `kymo` Python package lives (so `import kymo` resolves).
const PYTHONPATH =
  process.env.KYMO_PYTHONPATH || resolve(__dirname, "../python/src");
const RENDER_SCRIPT = join(__dirname, "render_kymo.py");

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

// Pipe `source` through render_kymo.py and resolve with the SVG (or reject
// with the renderer's stderr).
function renderToSvg(source) {
  return new Promise((resolveRun, rejectRun) => {
    const proc = spawn(PYTHON, [RENDER_SCRIPT], {
      env: { ...process.env, PYTHONPATH },
      timeout: 15_000,
    });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", (e) => rejectRun(new Error(e.message)));
    proc.on("close", (code) => {
      if (code === 0) resolveRun(out);
      else rejectRun(new Error((err || `renderer exited ${code}`).trim()));
    });
    proc.stdin.end(source);
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

    if (req.method === "GET" && req.url === "/api/health") {
      return sendJson(res, 200, { ok: true, python: PYTHON, pythonpath: PYTHONPATH });
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
  console.log(`kymo web-app on http://${HOST}:${PORT}  (python: ${PYTHON})`);
});
