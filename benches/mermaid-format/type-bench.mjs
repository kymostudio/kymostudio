// type-bench.mjs — cross-type pixel-Δ accuracy bench vs the mermaid.js reference.
//
// Scores kymo's NATIVE per-type renderers (sequence/class/state/er/block/
// mindmap/kanban/requirement) against mermaid.js (mmdc), with the pixel-Δ metric
// (mean per-channel |Δ|, the 2026-06-16 metric). Both SVGs are rasterised through
// the SAME Chromium pipeline (DSF 2, geometricPrecision, no hinting) — crucially
// the mmdc reference keeps its HTML <foreignObject> labels (which vanish under
// resvg/rsvg), so the comparison is fair.
//
// kymo SVG comes from the `render_native` example binary (auto-dispatches by the
// diagram's leading keyword). Coordinate metrics (topology/pos/size/edge) are
// flowchart-specific (id-matching) and reported N/A here — this pass is pixel-Δ +
// render-success-rate per type, the honest measurable baseline across types.
//
// Run:  node type-bench.mjs [type1 type2 ...] [--limit N]   (from benches/mermaid-format)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const DSDIR = HERE + "/datasets/mermaid-cypress/";
const TMP = "/tmp/type-bench/";
mkdirSync(TMP, { recursive: true });
const KYMO_BIN = ROOT + "/packages/rust/kymo-mermaid/target/release/examples/render_native";

const ALL_TYPES = ["sequence", "class", "state", "er", "block", "mindmap", "kanban", "requirement"];
const argv = process.argv.slice(2);
const limIdx = argv.indexOf("--limit");
const LIMIT = limIdx >= 0 ? +argv[limIdx + 1] : Infinity;
const TYPES = argv.filter((a) => !a.startsWith("--") && a !== String(LIMIT)).length
  ? argv.filter((a) => ALL_TYPES.includes(a))
  : ALL_TYPES;

const require = (await import("node:module")).createRequire(import.meta.url);
const puppeteer = (await import("puppeteer-core")).default;
const { PNG } = require("pngjs");

const RENDER_FLAGS = ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--force-color-profile=srgb"];
writeFileSync(TMP + "conf.json", JSON.stringify({ securityLevel: "loose", forceLegacyMathML: true, themeCSS: ".katex-display{margin:0 !important}", flowchart: { useMaxWidth: false } }));
writeFileSync(TMP + "pptr.json", JSON.stringify({ args: RENDER_FLAGS }));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: RENDER_FLAGS });

// ── SVG producers ─────────────────────────────────────────────────────────────
function kymoSvg(mmd) {
  return execFileSync(KYMO_BIN, [mmd], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }).toString();
}
function refSvg(mmd, tag) {
  const out = TMP + "ref_" + tag + ".svg";
  execFileSync("npx", ["mmdc", "-i", mmd, "-o", out, "-c", TMP + "conf.json", "-p", TMP + "pptr.json"], { cwd: HERE, stdio: ["ignore", "ignore", "pipe"] });
  return readFileSync(out, "utf8");
}

// ── rasterise + pixel-Δ (same pipeline for both) ──────────────────────────────
function svgDims(svg) {
  const vb = svg.match(/viewBox="([\d.\- ]+)"/);
  if (vb) { const a = vb[1].trim().split(/\s+/).map(Number); if (a.length === 4) return { W: Math.max(1, Math.ceil(a[2])), H: Math.max(1, Math.ceil(a[3])) }; }
  const w = svg.match(/\bwidth="(\d+)/), h = svg.match(/\bheight="(\d+)/);
  return w && h ? { W: +w[1], H: +h[1] } : { W: 800, H: 600 };
}
function pinSvgSize(svg, W, H) {
  const open = svg.match(/<svg\b[^>]*>/); if (!open) return svg;
  const tag = open[0].replace(/\s(width|height)="[^"]*"/g, "").replace(/\sstyle="[^"]*"/g, "").replace(/<svg\b/, `<svg width="${W}" height="${H}"`);
  return svg.replace(open[0], tag);
}
async function svgToPng(svg) {
  const { W, H } = svgDims(svg);
  const p = await browser.newPage();
  await p.setViewport({ width: Math.min(W, 5000) + 8, height: Math.min(H, 9000) + 8, deviceScaleFactor: 2 });
  await p.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>.katex,.katex *,foreignObject,foreignObject *{text-rendering:geometricPrecision !important}</style></head>` +
    `<body style="margin:0;background:#fff;display:inline-block">` + pinSvgSize(svg, W, H) + `</body></html>`, { waitUntil: "load" });
  const el = await p.$("svg");
  await p.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  const buf = await el.screenshot({ type: "png" });
  await p.close();
  return PNG.sync.read(buf);
}
function padToWhite(png, W, H) {
  const out = Buffer.alloc(W * H * 4, 255);
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const si = (y * png.width + x) * 4, di = (y * W + x) * 4, a = png.data[si + 3] / 255;
    out[di] = Math.round(png.data[si] * a + 255 * (1 - a)); out[di + 1] = Math.round(png.data[si + 1] * a + 255 * (1 - a)); out[di + 2] = Math.round(png.data[si + 2] * a + 255 * (1 - a));
  }
  return out;
}
function resizeWhite(buf, srcW, srcH, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4, 255), sx = srcW / dstW, sy = srcH / dstH;
  for (let y = 0; y < dstH; y++) { const fy = (y + 0.5) * sy - 0.5, y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(srcH - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < dstW; x++) { const fx = (x + 0.5) * sx - 0.5, x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(srcW - 1, x0 + 1), wx = fx - x0, di = (y * dstW + x) * 4;
      for (let c = 0; c < 3; c++) { const p00 = buf[(y0 * srcW + x0) * 4 + c], p01 = buf[(y0 * srcW + x1) * 4 + c], p10 = buf[(y1 * srcW + x0) * 4 + c], p11 = buf[(y1 * srcW + x1) * 4 + c]; const top = p00 + (p01 - p00) * wx, bot = p10 + (p11 - p10) * wx; out[di + c] = Math.round(top + (bot - top) * wy); } } }
  return out;
}
function diffMeanAbs(aPng, refPng) {
  const W = refPng.width, H = refPng.height, ref = padToWhite(refPng, W, H);
  let oth = padToWhite(aPng, aPng.width, aPng.height);
  if (aPng.width !== W || aPng.height !== H) oth = resizeWhite(oth, aPng.width, aPng.height, W, H);
  let sum = 0;
  for (let i = 0; i < W * H; i++) { const j = i * 4; sum += 0.299 * Math.abs(ref[j] - oth[j]) + 0.587 * Math.abs(ref[j + 1] - oth[j + 1]) + 0.114 * Math.abs(ref[j + 2] - oth[j + 2]); }
  return sum / (W * H) / 255;
}

// ── run ───────────────────────────────────────────────────────────────────────
const rows = [];
console.log("\ntype         file                    kymo  mmdc  pixel-Δ");
console.log("-".repeat(60));
for (const t of TYPES) {
  const dir = DSDIR + t + "/";
  if (!existsSync(dir)) { console.log(`(no dir for ${t})`); continue; }
  const files = readdirSync(dir).filter((f) => f.endsWith(".mmd")).sort().slice(0, LIMIT);
  for (const f of files) {
    const mmd = dir + f, tag = t + "_" + f.replace(/\.mmd$/, "");
    const row = { type: t, f, kymo: false, mmdc: false, pixel: null };
    let kSvg = null, rSvg = null, rPng = null;
    try { kSvg = kymoSvg(mmd); row.kymo = true; } catch { }
    try { rSvg = refSvg(mmd, tag); row.mmdc = true; rPng = await svgToPng(rSvg); } catch { }
    if (kSvg && rPng) {
      try { row.pixel = diffMeanAbs(await svgToPng(kSvg), rPng); } catch { }
    }
    rows.push(row);
    const px = row.pixel == null ? "  –" : (row.pixel * 100).toFixed(2) + "%";
    console.log(`${t.padEnd(12)} ${f.padEnd(23)} ${row.kymo ? "✓" : "✗"}     ${row.mmdc ? "✓" : "✗"}    ${px}`);
  }
}
await browser.close();

// ── summary per type ────────────────────────────────────────────────────────
const med = (xs) => { xs = xs.slice().sort((a, b) => a - b); return xs.length ? xs[xs.length >> 1] : NaN; };
const pct = (x) => (x * 100).toFixed(2) + "%";
console.log("\n=== summary per type (pixel-Δ vs mermaid.js, Chromium reference) ===");
console.log("type         n   kymo-ok  mmdc-ok  both  pixel med / p90 / max");
for (const t of TYPES) {
  const rs = rows.filter((r) => r.type === t);
  if (!rs.length) continue;
  const kok = rs.filter((r) => r.kymo).length, mok = rs.filter((r) => r.mmdc).length;
  const px = rs.map((r) => r.pixel).filter((v) => typeof v === "number").sort((a, b) => a - b);
  const both = px.length;
  const pstr = both ? `${pct(med(px))} / ${pct(px[Math.floor(both * 0.9)] ?? px[both - 1])} / ${pct(px[both - 1])}` : "–";
  console.log(`${t.padEnd(12)} ${String(rs.length).padStart(3)}  ${String(kok).padStart(6)}  ${String(mok).padStart(7)}  ${String(both).padStart(4)}  ${pstr}`);
}
// overall
const allpx = rows.map((r) => r.pixel).filter((v) => typeof v === "number").sort((a, b) => a - b);
if (allpx.length) console.log(`ALL          ${String(rows.length).padStart(3)}  ${String(rows.filter(r=>r.kymo).length).padStart(6)}  ${String(rows.filter(r=>r.mmdc).length).padStart(7)}  ${String(allpx.length).padStart(4)}  ${pct(med(allpx))} / ${pct(allpx[Math.floor(allpx.length*0.9)])} / ${pct(allpx[allpx.length-1])}`);
console.log("\nNote: topology/pos/size/edge = N/A (id-matching is flowchart-specific;");
console.log("non-flowchart node classes differ per type). This pass = pixel-Δ + success-rate.");
writeFileSync(TMP + "type-bench.json", JSON.stringify(rows, null, 2));
console.log("wrote", TMP + "type-bench.json");
