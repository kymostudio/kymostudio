// engine-bench.mjs — multi-engine pixel-Δ bench vs the mermaid.js reference.
//
// Scores three native renderers against mermaid.js (mmdc), per file, with the
// pixel-Δ metric (mean per-channel |Δ|, the 2026-06-16 metric):
//   • kymo   — mermaidToSvgDagre (own parser + merman/dugong layout + raster-safe SVG)
//   • merman — mermaidRenderSvg  (faithful Rust port of mermaid.js, foreignObject)
//   • mmdr   — mermaid-rs-renderer (independent pure-Rust, resvg)
// All four SVGs rasterised through the SAME Chromium pipeline (DSF 2,
// geometricPrecision, no hinting) so the metric is pure render difference.
//
// Run:  node engine-bench.mjs [--all | file1 file2 ...]   (from benches/mermaid-format)

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const FIXDIR = HERE + "/datasets/mermaid-cypress/flowchart/";
const TMP = "/tmp/engine-bench/";
mkdirSync(TMP, { recursive: true });
const MMDR = process.env.MMDR || (process.env.HOME + "/.cargo/bin/mmdr");
const argv = process.argv.slice(2);
const FILES = argv.includes("--all")
  ? readdirSync(FIXDIR).filter((f) => /^flowchart(-v2)?_\d+\.mmd$/.test(f)).map((f) => f.replace(/\.mmd$/, "")).sort()
  : argv.length ? argv.filter((a) => !a.startsWith("--")) : ["flowchart_023", "flowchart_029", "flowchart-v2_080"];

const require = (await import("node:module")).createRequire(import.meta.url);
const puppeteer = (await import("puppeteer-core")).default;
const { PNG } = require("pngjs");
const m = await import(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid.js");
m.initSync({ module: readFileSync(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid_bg.wasm") });

const RENDER_FLAGS = ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--force-color-profile=srgb"];
writeFileSync(TMP + "conf.json", JSON.stringify({ securityLevel: "loose", forceLegacyMathML: true, themeCSS: ".katex-display{margin:0 !important}", flowchart: { useMaxWidth: false } }));
writeFileSync(TMP + "pptr.json", JSON.stringify({ args: RENDER_FLAGS }));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: RENDER_FLAGS });

// ── per-engine SVG producers (return string or throw) ────────────────────────
function refSvg(f) {
  const out = TMP + "ref_" + f + ".svg";
  execFileSync("npx", ["mmdc", "-i", FIXDIR + f + ".mmd", "-o", out, "-c", TMP + "conf.json", "-p", TMP + "pptr.json"], { cwd: HERE, stdio: ["ignore", "ignore", "pipe"] });
  return readFileSync(out, "utf8");
}
const kymoSvg = (src) => m.mermaidToSvgDagre(src);
const mermanSvg = (src) => m.mermaidRenderSvg(src);
function mmdrSvg(f) {
  const out = TMP + "mmdr_" + f + ".svg";
  execFileSync(MMDR, ["-i", FIXDIR + f + ".mmd", "-o", out], { stdio: ["ignore", "ignore", "pipe"] });
  return readFileSync(out, "utf8");
}

// ── rasterise + pixel-Δ (same pipeline for all) ──────────────────────────────
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

// ── geometry extraction (all 5 metrics) ──────────────────────────────────────
const num = (s) => parseFloat(s);
function elemBox(tag, el) {
  const a = (n) => { const x = el.match(new RegExp(`\\b${n}="([-\\d.]+)`)); return x ? num(x[1]) : NaN; };
  if (tag === "circle") { const r = a("r"); return { cx: a("cx"), cy: a("cy"), w: 2 * r, h: 2 * r }; }
  if (tag === "ellipse") { return { cx: a("cx"), cy: a("cy"), w: 2 * a("rx"), h: 2 * a("ry") }; }
  if (tag === "rect") { const x = a("x"), y = a("y"), w = a("width"), h = a("height"); return { cx: x + w / 2, cy: y + h / 2, w, h }; }
  const src = tag === "polygon" ? (el.match(/points="([^"]*)"/)?.[1] || "") : (el.match(/\bd="([^"]*)"/)?.[1] || "");
  const ns = [...src.matchAll(/-?\d+\.?\d*/g)].map(Number); if (ns.length < 2) return null;
  const xs = ns.filter((_, i) => i % 2 === 0), ys = ns.filter((_, i) => i % 2 === 1);
  return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}
function shapeBox(chunk) { for (const t of ["circle", "ellipse", "rect", "polygon", "path"]) { const e = chunk.match(new RegExp(`<${t}\\b[^>]*>`)); if (e) { const b = elemBox(t, e[0]); if (b) return b; } } return null; }
function shapeSize(chunk) { const b = shapeBox(chunk); return b ? { w: b.w, h: b.h } : { w: NaN, h: NaN }; }
// mermaid + merman share structure. Count node groups by id (every node has one);
// the transform may sit on the <g>, or — for clickable nodes — on a wrapping <a>.
function mermaidNodes(svg) {
  const sec = svg.slice(svg.indexOf('class="nodes"'));
  const st = [...sec.matchAll(/<g class="[^"]*\bnode\b[^"]*"[^>]*\bid="[^"]*flowchart-[^"]*"[^>]*>/g)];
  return st.map((mm, i) => {
    const chunk = sec.slice(mm.index, i + 1 < st.length ? st[i + 1].index : undefined);
    let tr = mm[0].match(/transform="translate\(([-\d.]+),\s*([-\d.]+)\)"/);
    if (!tr) { tr = [...sec.slice(Math.max(0, mm.index - 240), mm.index).matchAll(/<a[^>]*transform="translate\(([-\d.]+),\s*([-\d.]+)\)"/g)].pop(); }
    const sz = shapeSize(chunk);
    if (tr) return { cx: num(tr[1]), cy: num(tr[2]), ...sz };
    const b = shapeBox(chunk); return { cx: b ? b.cx : NaN, cy: b ? b.cy : NaN, ...sz };
  });
}
// kymo wraps each node in <g class="fc-node" data-id="X"> — one per node (robust to
// multi-shape nodes like cylinders and empty-label nodes). Center from its 1st shape.
function kymoNodes(svg) {
  const o = [];
  for (const mm of svg.matchAll(/<g class="fc-node" data-id="([^"]*)">/g)) {
    const chunk = svg.slice(mm.index, svg.indexOf("</g>", mm.index));
    const sm = chunk.match(/<(ellipse|rect|polygon|path)\b[^>]*class="fc-shape[^"]*"[^>]*>/);
    const g = sm ? elemBox(sm[1], sm[0]) : null;
    o.push(g ? { id: mm[1], ...g } : { id: mm[1], cx: NaN, cy: NaN, w: NaN, h: NaN });
  }
  return o;
}
// mmdr: no node ids/classes. Nodes = shapes that are NOT bg / edge-label / arrowhead:
//   rect (skip data-edge-id + the x0/y0 canvas bg), circle (dedupe concentric), ellipse,
//   polygon (skip ~12px arrowheads via bbox > 20px). Strip <defs> markers first.
function mmdrNodes(svg) {
  const body = svg.replace(/<defs>[\s\S]*?<\/defs>/, "");
  const vb = svg.match(/viewBox="[\d.\- ]*?\s([\d.]+)\s([\d.]+)"/); const W = vb ? +vb[1] : 1e9;
  const out = [], seen = new Set();
  for (const mm of body.matchAll(/<(rect|circle|ellipse|polygon)\b[^>]*>/g)) {
    const tag = mm[1], el = mm[0];
    if (el.includes("data-edge-id")) continue;
    const b = elemBox(tag, el); if (!b || isNaN(b.cx)) continue;
    if (tag === "rect" && Math.abs(b.cx - W / 2) < 2 && b.w >= W - 2) continue; // canvas bg
    if (tag === "polygon" && b.w < 20) continue; // arrowhead
    if (tag === "circle") { const k = `${Math.round(b.cx)},${Math.round(b.cy)}`; if (seen.has(k)) continue; seen.add(k); }
    out.push(b);
  }
  return out;
}
function edgesOf(svg, sel) { const o = []; for (const mm of svg.matchAll(/<path\b[^>]*>/g)) { const tag = mm[0], cls = tag.match(/class="([^"]*)"/)?.[1] || ""; if (!sel(cls)) continue; const d = tag.match(/\bd="([^"]*)"/)?.[1]; if (d && /^\s*M/.test(d)) { const pts = flatten(d); if (pts.length) o.push(pts); } } return o; }
function flatten(d) { const t = d.match(/[MLCZ]|-?\d+\.?\d*/gi) || []; const p = []; let i = 0, cx = 0, cy = 0; const P = (x, y) => { cx = x; cy = y; p.push([x, y]); };
  while (i < t.length) { const c = t[i++]; if (c === "M" || c === "L") P(+t[i++], +t[i++]); else if (c === "C") { const x1 = +t[i++], y1 = +t[i++], x2 = +t[i++], y2 = +t[i++], x = +t[i++], y = +t[i++], sx = cx, sy = cy; for (let k = 1; k <= 8; k++) { const u = k / 8, v = 1 - u; P(v*v*v*sx+3*v*v*u*x1+3*v*u*u*x2+u*u*u*x, v*v*v*sy+3*v*v*u*y1+3*v*u*u*y2+u*u*u*y); } } else if (/^[-\d.]/.test(c)) P(+c, +t[i++]); } return p; }
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const centroid = (ps) => ps.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map((v) => v / ps.length);
function greedyMatch(A, B) { const used = new Set(), pairs = []; for (const a of A) { let bi = -1, bd = Infinity; B.forEach((b, j) => { if (!used.has(j)) { const d = dist([a.cx, a.cy], [b.cx, b.cy]); if (d < bd) { bd = d; bi = j; } } }); if (bi >= 0) { used.add(bi); pairs.push([a, B[bi], bd]); } } return pairs; }
// Pair nodes by id when BOTH sides expose one (kymo `data-id` ↔ mermaid `flowchart-<id>`);
// else fall back to nearest-neighbour (mmdr has no ids). Id-matching removes the
// subgraph mispairing that inflated NN position errors.
function matchNodes(A, B) {
  if (A.length && B.length && A.every((n) => n.id != null) && B.every((n) => n.id != null)) {
    const byId = new Map(B.map((n) => [n.id, n]));
    return A.map((a) => { const b = byId.get(a.id); return b ? [a, b, dist([a.cx, a.cy], [b.cx, b.cy])] : null; }).filter(Boolean);
  }
  return greedyMatch(A, B);
}
function sampleDist(p, q) { const near = (pt, poly) => Math.min(...poly.map((x) => dist(pt, x))); const ds = [...p.map((x) => near(x, q)), ...q.map((x) => near(x, p))]; return { mean: ds.reduce((a, b) => a + b, 0) / ds.length, max: Math.max(...ds) }; }
const med = (xs) => { xs = xs.filter((v) => v === v).sort((a, b) => a - b); return xs.length ? xs[xs.length >> 1] : NaN; };
function compareGeom(eN, eE, mN, mE, diag) {
  const topo = eN.length === mN.length && eE.length === mE.length;
  if (!eN.length || !mN.length) return { topo, pos: NaN, size: NaN, edge: NaN };
  const cm = centroid(mN.map((n) => [n.cx, n.cy])), ce = centroid(eN.map((n) => [n.cx, n.cy])), t = [cm[0] - ce[0], cm[1] - ce[1]];
  const pairs = matchNodes(eN.map((n) => ({ ...n, cx: n.cx + t[0], cy: n.cy + t[1] })), mN);
  const pos = med(pairs.map((p) => p[2]));
  const size = med(pairs.map((p) => Math.abs(p[0].w - p[1].w)).filter((x) => x === x));
  const ea = eE.map((p) => p.map((q) => [q[0] + t[0], q[1] + t[1]])); const used = new Set(), ed = [];
  for (const ke of ea) { let bi = -1, bd = Infinity; mE.forEach((me, j) => { if (!used.has(j)) { const d = dist(centroid(ke), centroid(me)); if (d < bd) { bd = d; bi = j; } } }); if (bi >= 0) { used.add(bi); ed.push(sampleDist(ke, mE[bi]).mean); } }
  return { topo, pos, size, edge: med(ed) };
}
const isEdge = (c) => /\bedge\b/.test(c) || /\blink\b/.test(c) || c.includes("flowchart-link");

// ── run (5 metrics × 3 engines) ──────────────────────────────────────────────
const pc = (x) => x == null ? " err " : (x * 100).toFixed(2).padStart(5) + "%";
const px = (x) => isNaN(x) ? "  –" : x.toFixed(1);
console.log("\nfile                | engine  pixel-Δ topo pos/size/edge(px)");
console.log("-".repeat(72));
const rows = [];
for (const f of FILES) {
  let refSvgStr, refPng;
  try { refSvgStr = refSvg(f); refPng = await svgToPng(refSvgStr); } catch { console.log(`${f.padEnd(20)} REF-ERR`); continue; }
  const mN = mermaidNodes(refSvgStr), mE = edgesOf(refSvgStr, isEdge), diag = (() => { const v = refSvgStr.match(/viewBox="[\d.\- ]*?\s([\d.]+)\s([\d.]+)"/); return v ? Math.hypot(+v[1], +v[2]) : 1; })();
  const src = readFileSync(FIXDIR + f + ".mmd", "utf8");
  const row = { f, diag };
  for (const [name, prod, geom] of [
    ["kymo", () => kymoSvg(src), (svg) => ({ n: kymoNodes(svg), e: edgesOf(svg, (c) => c.includes("edge-path")) })],
    ["merman", () => mermanSvg(src), (svg) => ({ n: mermaidNodes(svg), e: edgesOf(svg, isEdge) })],
    ["mmdr", () => mmdrSvg(f), (svg) => ({ n: mmdrNodes(svg), e: edgesOf(svg, (c) => c.includes("edgePath")) })],
  ]) {
    const r = {};
    let svg = null;
    try { svg = prod(); r.pixel = diffMeanAbs(await svgToPng(svg), refPng); } catch { r.pixel = null; }
    if (svg && geom) { try { const g = geom(svg); Object.assign(r, compareGeom(g.n, g.e, mN, mE, diag)); } catch { } }
    row[name] = r;
    const g = r.pos !== undefined ? `${r.topo ? "✓" : "✗"} ${px(r.pos)}/${px(r.size)}/${px(r.edge)}` : "(pixel only)";
    console.log(`${f.padEnd(19)} | ${name.padEnd(7)} ${pc(r.pixel)}  ${g}`);
  }
  rows.push(row);
}
await browser.close();

// summary
function summ(eng, metric, sub) {
  const xs = rows.map((r) => sub ? r[eng]?.[metric]?.[sub] : r[eng]?.[metric]).filter((v) => typeof v === "number" && v === v).sort((a, b) => a - b);
  return xs.length ? { median: xs[xs.length >> 1], mean: xs.reduce((a, b) => a + b, 0) / xs.length, p90: xs[Math.floor(xs.length * 0.9)], max: xs[xs.length - 1], n: xs.length } : null;
}
console.log("\n=== summary (all metrics vs mermaid.js) ===");
for (const e of ["kymo", "merman", "mmdr"]) {
  const p = summ(e, "pixel"), po = summ(e, "pos"), sz = summ(e, "size"), ed = summ(e, "edge");
  const topoOk = rows.filter((r) => r[e]?.topo === true).length, topoN = rows.filter((r) => r[e] && r[e].topo !== undefined).length;
  console.log(`  ${e}`);
  console.log(`     pixel-Δ   median ${p ? (p.median*100).toFixed(2)+"%" : "–"}  p90 ${p ? (p.p90*100).toFixed(2)+"%" : "–"}  max ${p ? (p.max*100).toFixed(2)+"%" : "–"}  (n=${p?.n})`);
  if (po) console.log(`     topology  ${topoOk}/${topoN} ✓   pos med ${po.median.toFixed(1)}px  size med ${sz?sz.median.toFixed(1):"–"}px  edge med ${ed?ed.median.toFixed(1):"–"}px`);
  else console.log(`     coordinate metrics: N/A (mmdr SVG has no node ids/classes; concentric-circle + inline-arrow primitives defeat id-less matching)`);
}
writeFileSync(TMP + "engine-bench.json", JSON.stringify(rows, null, 2));
console.log("wrote", TMP + "engine-bench.json");
