#!/usr/bin/env node
// Coverage bench over the raw datasets (merman, mermaid-cypress, mermaid-to-svg):
// render every source through merman (all grammars) and, where kymo has its own
// engine (flowchart, sequence), through kymo too. Per grammar: render success and
// whether the SVG is raster-safe (<text> survives PNG/PDF; <foreignObject> does
// not). Each render runs in a worker with a timeout, so a source that sends a
// renderer into a non-terminating loop is recorded as a timeout, not a hang.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { Worker } from "node:worker_threads";

const HERE = new URL(".", import.meta.url).pathname;
const DS = HERE + "datasets/";
const OUT = HERE + "results/coverage/";
mkdirSync(OUT, { recursive: true });
const RA = process.env.RENDER_API_DIR || HERE + "../../packages/render-api";
const WORKER = HERE + "cov-worker.mjs";
const TIMEOUT = 4000; // ms per source before we declare a hang

const DATASETS = ["merman", "mermaid-cypress", "mermaid-to-svg"];

function spawn() {
  const w = new Worker(WORKER, { workerData: { RA } });
  const ready = new Promise((res) => w.once("message", () => res()));
  return { w, ready };
}

let { w, ready } = spawn();
await ready;

// Run one source with a timeout; on timeout terminate + respawn the worker.
async function render(src, grammar) {
  return new Promise(async (resolve) => {
    let done = false;
    const timer = setTimeout(async () => {
      if (done) return;
      done = true;
      await w.terminate();
      ({ w, ready } = spawn());
      await ready;
      resolve({ timeout: true });
    }, TIMEOUT);
    const onMsg = (m) => {
      if (done || !m.result) return;
      done = true;
      clearTimeout(timer);
      w.off("message", onMsg);
      resolve(m.result);
    };
    w.on("message", onMsg);
    w.postMessage({ src, grammar });
  });
}

function blank() {
  return { n: 0, merman_ok: 0, merman_fo: 0, merman_text: 0, kymo_n: 0, kymo_ok: 0, timeout: 0 };
}

const all = {};
let count = 0;
for (const ds of DATASETS) {
  const base = DS + ds + "/";
  if (!existsSync(base)) continue;
  const grammars = readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const byG = {};
  for (const g of grammars) {
    const gdir = base + g + "/";
    const files = readdirSync(gdir).filter((f) => f.endsWith(".mmd"));
    const acc = blank();
    for (const f of files) {
      const src = readFileSync(gdir + f, "utf8");
      acc.n++;
      const r = await render(src, g);
      if (r.timeout) {
        acc.timeout++;
      } else {
        acc.merman_ok += r.merman_ok;
        acc.merman_fo += r.merman_fo;
        acc.merman_text += r.merman_text;
        acc.kymo_n += r.kymo_n;
        acc.kymo_ok += r.kymo_ok;
      }
      if (++count % 200 === 0) process.stderr.write(`  ${count} rendered\n`);
    }
    byG[g] = acc;
  }
  writeFileSync(OUT + ds + ".json", JSON.stringify(byG, null, 2) + "\n");
  all[ds] = byG;
  const tot = Object.values(byG).reduce((a, b) => a + b.n, 0);
  const to = Object.values(byG).reduce((a, b) => a + b.timeout, 0);
  console.error(`${ds}: ${tot} sources, ${grammars.length} grammars, ${to} timeouts`);
}

writeFileSync(OUT + "all.json", JSON.stringify(all, null, 2) + "\n");
await w.terminate();
console.error("wrote results/coverage/*.json");
