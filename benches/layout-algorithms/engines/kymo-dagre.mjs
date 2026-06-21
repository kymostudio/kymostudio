// kymo-dagre — kymo's own dagre engine (packages/rust/kymo-layout), via wasm.
// Graph JSON in → positioned geometry out. No mermaid, no SVG, no render.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/rust/kymo-layout/pkg");
let mod;
async function init() {
  if (mod) return mod;
  mod = await import(PKG + "/kymo_layout.js");
  mod.initSync({ module: readFileSync(PKG + "/kymo_layout_bg.wasm") });
  return mod;
}

export const name = "kymo-dagre";
export async function layout(graph) {
  const m = await init();
  if (!m.dagreLayout) throw new Error("kymo_layout wasm lacks dagreLayout — rebuild with --features wasm");
  // output is already {width,height,nodes:[{id,x,y,width,height}],edges:[{points:[[x,y]]}]}
  return JSON.parse(m.dagreLayout(JSON.stringify(graph)));
}
