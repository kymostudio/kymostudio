#!/usr/bin/env node
// Extract graphviz.wasm from @viz-js/viz. The package embeds the bytes inside
// its JS and runtime-compiles them — workerd forbids that, and the emscripten
// build exposes no instantiateWasm hook. So: intercept WebAssembly.instantiate
// in node, run one render, write the captured bytes next to this script.
// Runs at install/build time (CI + local deploy), not in the worker.
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const orig = WebAssembly.instantiate.bind(WebAssembly);
let captured = null;
WebAssembly.instantiate = (bin, imports) => {
  if (bin instanceof ArrayBuffer || ArrayBuffer.isView(bin)) {
    captured = Buffer.from(bin.buffer ?? bin, bin.byteOffset ?? 0, bin.byteLength);
  }
  return orig(bin, imports);
};
const { instance } = await import("@viz-js/viz");
const viz = await instance();
if (viz.renderString("digraph{a->b}", { format: "svg" }).length < 100) throw new Error("probe render failed");
if (!captured) throw new Error("no wasm captured");
fs.writeFileSync(path.join(here, "graphviz.wasm"), captured);
console.log(`graphviz.wasm extracted (${captured.length} bytes)`);
