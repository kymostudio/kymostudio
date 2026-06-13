#!/usr/bin/env node
// Render every corpus diagram with all three engines, rasterize, and score
// raster-safe text recall. Writes raw SVG/PNG to results/raw/ and recall.json.
//
//   kymo       — kymostudio-core own engine (mermaidToSvg / mermaidSequenceToSvg)
//   merman     — kymo-mermaid full engine (mermaidRenderSvg), the merman port
//   mermaidjs  — mermaid.js itself, via kroki.io (SVG + puppeteer PNG = ground truth)
//
// Run from this directory:  node render.mjs   (needs render-api node_modules on the path)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const HERE = new URL(".", import.meta.url).pathname;
const RAW = HERE + "results/raw/";
mkdirSync(RAW, { recursive: true });

// Resolve the wasm engines from the render-api package (built there).
const RA = process.env.RENDER_API_DIR || HERE + "../../packages/render-api";
const require = createRequire(RA + "/package.json");

const core = await import(require.resolve("kymostudio-core"));
core.initSync({ module: readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm")) });
core.registerFont(new Uint8Array(readFileSync(RA + "/fonts/Roboto-Regular.ttf")));
core.registerFont(new Uint8Array(readFileSync(RA + "/fonts/Roboto-Bold.ttf")));

const merman = await import(require.resolve("kymo-mermaid"));
merman.initSync({ module: readFileSync(require.resolve("kymo-mermaid/kymo_mermaid_bg.wasm")) });

const KROKI = "https://kroki.io/mermaid";
const SCALE = 2;

// Text that survives rasterization = text inside <text> (foreignObject is dropped
// by resvg/svg2pdf). Strip foreignObject first, then collect <text> content.
function rasterText(svg) {
  const noFO = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/g, " ");
  return [...noFO.matchAll(/<text[\s\S]*?<\/text>/g)]
    .map((m) => m[0].replace(/<[^>]+>/g, ""))
    .join(" ")
    .replace(/\s+/g, " ");
}
// All text content regardless of wrapper (foreignObject HTML included).
function allText(svg) {
  return svg.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}
function recall(text, labels) {
  const hit = labels.filter((l) => text.includes(l));
  return { hit: hit.length, total: labels.length, missing: labels.filter((l) => !text.includes(l)) };
}

async function kroki(source, fmt) {
  const r = await fetch(`${KROKI}/${fmt}`, {
    method: "POST",
    headers: { "content-type": "text/plain", "user-agent": "kymo-bench/1.0" },
    body: source,
  });
  if (!r.ok) throw new Error(`kroki ${fmt} ${r.status}`);
  return fmt === "png" ? Buffer.from(await r.arrayBuffer()) : await r.text();
}

const DS = HERE + "datasets/";
const corpus = JSON.parse(readFileSync(DS + "mermaid-kymo/corpus.json", "utf8"));
const out = [];

for (const c of corpus) {
  const row = { id: c.id, grammar: c.grammar, engines: {} };

  // kymo
  try {
    const svg = c.grammar === "flowchart" ? core.mermaidToSvg(c.source) : core.mermaidSequenceToSvg(c.source);
    writeFileSync(RAW + `${c.id}.kymo.svg`, svg);
    writeFileSync(RAW + `${c.id}.kymo.png`, Buffer.from(core.svgToPng(new TextEncoder().encode(svg), SCALE)));
    row.engines.kymo = { svg_recall: recall(allText(svg), c.labels), raster_recall: recall(rasterText(svg), c.labels) };
  } catch (e) {
    row.engines.kymo = { error: String(e).slice(0, 80) };
  }

  // merman
  try {
    const svg = merman.mermaidRenderSvg(c.source);
    writeFileSync(RAW + `${c.id}.merman.svg`, svg);
    writeFileSync(RAW + `${c.id}.merman.png`, Buffer.from(core.svgToPng(new TextEncoder().encode(svg), SCALE)));
    row.engines.merman = { svg_recall: recall(allText(svg), c.labels), raster_recall: recall(rasterText(svg), c.labels) };
  } catch (e) {
    row.engines.merman = { error: String(e).slice(0, 80) };
  }

  // mermaid.js (kroki): SVG for recall, PNG (puppeteer) as the visual reference
  try {
    const svg = await kroki(c.source, "svg");
    const png = await kroki(c.source, "png");
    writeFileSync(RAW + `${c.id}.mermaidjs.svg`, svg);
    writeFileSync(RAW + `${c.id}.mermaidjs.png`, png);
    row.engines.mermaidjs = { svg_recall: recall(allText(svg), c.labels), raster_recall: recall(rasterText(svg), c.labels) };
  } catch (e) {
    row.engines.mermaidjs = { error: String(e).slice(0, 80) };
  }

  out.push(row);
  console.error(`rendered ${c.id}`);
}

writeFileSync(HERE + "results/recall.json", JSON.stringify(out, null, 2) + "\n");
console.error("wrote results/recall.json");
