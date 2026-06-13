#!/usr/bin/env node
// Accuracy bench: ground truth is **mermaid.js itself** (v11, rendered in
// headless Chrome via puppeteer) — NOT merman. merman (kymo-mermaid) lacks
// KaTeX and has render quirks, so it is never the reference here.
//
// Metric: raster-safe label recall. For each source we render the reference
// with mermaid.js and kymo with its own engine, then measure what fraction of
// the reference's *visible* word-tokens appear in kymo's <text> (the text that
// survives to PNG/PDF). Non-visible reference text is excluded: KaTeX MathML
// <annotation> (raw TeX), accessibility <title>/<desc>, and hidden link menus.
//
// Setup (run once in this directory):
//   npm i puppeteer-core
// Requires a Chrome/Chromium (CHROME env, default google-chrome-stable) and a
// local mermaid build (MERMAID env, default packages/editor's mermaid dist).
// Reference SVGs' tokens are cached under results/mermaidjs-cache/.
//
//   N=200 node accuracy-mermaidjs.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

const HERE = new URL(".", import.meta.url).pathname;
const DS = HERE + "datasets/";
const RA = HERE + "../../packages/render-api";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const MERMAID = process.env.MERMAID || HERE + "../../packages/editor/node_modules/mermaid/dist/mermaid.min.js";
const CACHE = HERE + "results/mermaidjs-cache/"; mkdirSync(CACHE, { recursive: true });
const N = parseInt(process.env.N || "200");

// Legacy/ambiguous fixtures kymo intentionally diverges on (see
// datasets/known-divergent.json) — excluded from the headline score.
const DIVERGENT = new Set(
  (JSON.parse(readFileSync(DS + "known-divergent.json", "utf8")).legacy || []).map((d) => d.file),
);

const require = createRequire(RA + "/package.json");
const core = await import(require.resolve("kymostudio-core"));
core.initSync({ module: readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm")) });
const KY = { flowchart: core.mermaidToSvg, sequence: core.mermaidSequenceToSvg, state: core.mermaidStateToSvg };

const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#x?[0-9a-fA-F]+;/g, " ").replace(/&amp;/g, "&");
const clean = (svg) => svg.replace(/<annotation\b[\s\S]*?<\/annotation>/g, " ").replace(/<title[\s\S]*?<\/title>/g, " ").replace(/<desc[\s\S]*?<\/desc>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<a [^>]*xlink:href[\s\S]*?<\/a>/g, " ");
const toks = (s) => [...new Set((s.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []))];
const refTokens = (svg) => { const s = clean(svg); const fo = [...s.matchAll(/<foreignObject[\s\S]*?<\/foreignObject>/g)].map((m) => m[0]); const tx = [...s.matchAll(/<text[\s\S]*?<\/text>/g)].map((m) => m[0]); return toks(decode((fo.join(" ") + " " + tx.join(" ")).replace(/<[^>]+>/g, " "))); };
const kymoTokens = (svg) => { const tx = [...clean(svg).matchAll(/<text[\s\S]*?<\/text>/g)].map((m) => m[0].replace(/<[^>]+>/g, " ")); return new Set(toks(decode(tx.join(" ")))); };

let browser, page;
async function ensureBrowser() {
  if (browser) return;
  browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  page = await browser.newPage();
  await page.setContent("<!DOCTYPE html><html><body></body></html>");
  await page.addScriptTag({ path: MERMAID });
  await page.evaluate(() => window.mermaid.initialize({ startOnLoad: false, securityLevel: "loose" }));
}
const mermaidRender = (src) => page.evaluate(async (s) => { try { const { svg } = await window.mermaid.render("mm" + Math.floor(performance.now()), s); return svg; } catch { return "__ERR__"; } }, src);

for (const g of ["flowchart", "sequence", "state"]) {
  const files = [];
  for (const ds of ["merman", "mermaid-cypress", "mermaid-to-svg"]) {
    const dir = DS + ds + "/" + g + "/"; if (!existsSync(dir)) continue;
    for (const fn of readdirSync(dir).filter((x) => x.endsWith(".mmd"))) files.push([ds, fn, dir + fn]);
  }
  if (!files.length) continue;
  const step = Math.max(1, Math.floor(files.length / N));
  const sample = files.filter((_, i) => i % step === 0).slice(0, N);
  let scored = 0, sum = 0, perf = 0, referr = 0, legacy = 0; const mc = {}, ex = {};
  for (const [ds, fn, path] of sample) {
    if (DIVERGENT.has(ds + "/" + g + "/" + fn)) { legacy++; continue; }
    const src = readFileSync(path, "utf8");
    const cf = CACHE + g + "__" + ds + "__" + fn + ".json";
    let rt;
    if (existsSync(cf)) { const c = JSON.parse(readFileSync(cf, "utf8")); rt = c === "ERR" ? null : c; }
    else { await ensureBrowser(); const svg = await mermaidRender(src); if (svg === "__ERR__") { writeFileSync(cf, '"ERR"'); rt = null; } else { rt = refTokens(svg); writeFileSync(cf, JSON.stringify(rt)); } }
    if (!rt || rt.length === 0) { referr++; continue; }
    let kt; try { kt = kymoTokens(KY[g](src)); } catch { kt = new Set(); }
    const miss = rt.filter((t) => !kt.has(t));
    scored++; sum += 1 - miss.length / rt.length; if (!miss.length) perf++;
    for (const m of miss) { mc[m] = (mc[m] || 0) + 1; if (!ex[m]) ex[m] = fn; }
  }
  if (!scored) continue;
  console.log(`\n${g.toUpperCase()} (mermaid.js 11 truth, n=${scored}, ref-skip ${referr}, legacy-excluded ${legacy}): ${(100 * sum / scored).toFixed(1)}% recall, ${(100 * perf / scored).toFixed(0)}% perfect, ${scored - perf} imperfect`);
  const top = Object.entries(mc).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length) console.log("  misses: " + top.map(([t, n]) => `${t}(${n})`).join("  "));
}
if (browser) await browser.close();
