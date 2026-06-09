// Shared rendering core for the kymo flowchart DSL — used by both the HTTP
// server (server.js) and the MCP server (mcp-server.js).
//
//   renderToSvg(source) -> SVG string   (Python: parse -> layout -> to_svg)
//   svgToPng(svg)       -> PNG Buffer   (Rust kymo CLI: resvg rasterizer)

import { spawn, execFile } from "node:child_process";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Python interpreter: the in-package venv, else `python3` on PATH.
export function resolvePython() {
  if (process.env.KYMO_PYTHON) return process.env.KYMO_PYTHON;
  const venv = join(__dirname, ".venv/bin/python");
  return existsSync(venv) ? venv : "python3";
}
export const PYTHON = resolvePython();
// Where the `kymo` Python package lives (so `import kymo` resolves).
export const PYTHONPATH =
  process.env.KYMO_PYTHONPATH || resolve(__dirname, "../python/src");
const RENDER_SCRIPT = join(__dirname, "render_kymo.py");

// The `kymo` Rust CLI (SVG -> PNG rasterizer): env override, the in-repo
// release build, or `kymo` on PATH.
export function resolveKymoBin() {
  if (process.env.KYMO_BIN) return process.env.KYMO_BIN;
  const inRepo = resolve(__dirname, "../rust/kymostudio/target/release/kymo");
  return existsSync(inRepo) ? inRepo : "kymo";
}

// Pipe `source` through render_kymo.py; resolve with the SVG or reject with
// the renderer's stderr.
export function renderToSvg(source) {
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

// Rasterize an SVG string to a PNG Buffer via the kymo CLI (resvg). `scale`
// 1.0 = intrinsic size. Rejects if the CLI is missing or errors.
export async function svgToPng(svg, scale = 2) {
  const bin = resolveKymoBin();
  const dir = await mkdtemp(join(tmpdir(), "kymo-png-"));
  const inSvg = join(dir, "f.svg");
  const outPng = join(dir, "f.png");
  try {
    await writeFile(inSvg, svg, "utf8");
    await new Promise((res, rej) => {
      execFile(
        bin,
        [inSvg, outPng, "-s", String(scale)],
        { timeout: 15_000, maxBuffer: 16 * 1024 * 1024 },
        (e, _so, se) => (e ? rej(new Error((se || e.message).trim())) : res()),
      );
    });
    return await readFile(outPng);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
