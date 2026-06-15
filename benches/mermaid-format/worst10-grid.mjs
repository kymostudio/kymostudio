// Render the top-10 worst production flowchart fixtures through all three
// engines and score kymo & merman against the mermaid.js reference:
//   - mermaid.js 11 reference — rendered by the OFFICIAL @mermaid-js/mermaid-cli
//     (mmdc) in real Chromium → PNG. This is the canonical render: foreignObject
//     HTML labels, classDef fills, multi-line <br/> all come out faithful (an
//     <img>-loaded SVG breaks on them; that's why we shell out to mmdc).
//   - kymo — production dagre engine (mermaidToSvgDagre, + kymo-tex).
//   - merman — mermaidRenderSvg (full engine, render-api's fallback).
// kymo/merman emit SVG, rasterized INLINE in the same Chromium DOM (DSF 2).
// Metric = pixel-overlay vs the mermaid.js PNG (pixelmatch n/(W*H), threshold
// 0.1, padded to white at max dims) — same as pixel-diff.mjs.
//
// Writes:
//   research/assets/2026-06-15-worst10/{kymo,merman,mermaidjs}/<file>.png
//   research/assets/2026-06-15-worst10/scores.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");                 // repo root
const require = createRequire(import.meta.url);
const pixelmatch = (await import("pixelmatch")).default;
const { PNG } = require("pngjs");

const CHROME = process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FIXDIR = HERE + "/datasets/mermaid-cypress/flowchart/";
const OUTDIR = HERE + "/research/assets/2026-06-15-worst10/";
for (const sub of ["kymo", "merman", "mermaidjs"]) mkdirSync(OUTDIR + sub, { recursive: true });

// the production engine (kymo's own dagre flowchart renderer + kymo-tex)
const core = await import(ROOT + "/packages/rust/kymostudio-core/pkg/kymostudio_core.js");
core.initSync({ module: readFileSync(ROOT + "/packages/rust/kymostudio-core/pkg/kymostudio_core_bg.wasm") });
// merman full engine (render-api's fallback path)
const merman = await import(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid.js");
merman.initSync({ module: readFileSync(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid_bg.wasm") });

const FILES = [
  "katex_001", "flowchart-v2_050", "flowchart-v2_043", "katex_002", "flowchart_020",
  "flowchart-icon_001", "flowchart_013", "flowchart-icon_004", "flowchart_035", "katex_000",
];

// mmdc reference: official mermaid-cli, white bg, scale 2 (matches DSF 2),
// securityLevel loose (honours click/classDef/html labels like the editor).
const MMDC_CONF = OUTDIR + "_mmdc.json", PPTR_CONF = OUTDIR + "_pptr.json", CSS_CONF = OUTDIR + "_ref.css";
writeFileSync(MMDC_CONF, JSON.stringify({ securityLevel: "loose", flowchart: { useMaxWidth: false } }));
// Rasterise the reference the SAME way kymo's raster-safe paths are: NO font
// hinting (`--font-render-hinting=none`), CPU rasterisation (`--disable-gpu`,
// fixed-point → deterministic glyph positions), fixed colour profile. Otherwise
// the reference's foreignObject text is hinted + GPU-jittered while kymo's
// <path> fill is not — an unfair gap that doesn't exist in kymo's real
// (resvg/server-side, unhinted) output.
const RENDER_FLAGS = ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--force-color-profile=srgb"];
writeFileSync(PPTR_CONF, JSON.stringify({ args: RENDER_FLAGS }));
// `text-rendering: geometricPrecision` makes the browser draw glyph outlines
// "with comparable geometric precision to path data" (suspends hinting) — so the
// reference text matches kymo's outline fills (MDN/W3C SVG text-rendering).
writeFileSync(CSS_CONF, ".katex, .katex *, foreignObject, foreignObject * { text-rendering: geometricPrecision !important; }\n");
// FontAwesome (fa:) packs from unpkg so `fa:fa-bell` draws a real glyph.
const ICON_PACKS = ["@iconify-json/fa", "@iconify-json/fa-solid"];
// The `aws:arch-amazon-*` icons have NO public Iconify pack — they're AWS's
// proprietary set; mermaid's own cypress harness registers a SIMPLIFIED test
// pack (3 colour boxes, "issue #7185"). We mirror exactly that pack from
// `iconpacks/aws.json` and serve it so the mmdc reference draws the same boxes
// mermaid's tests do (not a "?" placeholder). The server MUST be a separate
// process: mmdc runs under a blocking execFileSync, so an in-process server
// would never answer its fetch (event loop blocked → Chrome protocolTimeout).
const PACK_PORT = 8731;
const packServer = spawn(process.execPath, ["-e", `
  const http = require("http"), fs = require("fs");
  const body = fs.readFileSync(${JSON.stringify(HERE + "/iconpacks/aws.json")});
  http.createServer((_q, r) => { r.writeHead(200, {"content-type":"application/json","access-control-allow-origin":"*"}); r.end(body); })
    .listen(${PACK_PORT}, "127.0.0.1");
`], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 400));   // let it bind
const AWS_URL = `aws#http://127.0.0.1:${PACK_PORT}/aws.json`;
function mermaidRefPng(file) {
  const out = OUTDIR + "mermaidjs/" + file + ".png";
  execFileSync("npx", ["mmdc", "-i", FIXDIR + file + ".mmd", "-o", out,
    "-b", "white", "-s", "2", "-c", MMDC_CONF, "-p", PPTR_CONF, "-C", CSS_CONF,
    "--iconPacks", ...ICON_PACKS, "--iconPacksNamesAndUrls", AWS_URL],
    { cwd: HERE, stdio: ["ignore", "ignore", "pipe"] });
  return PNG.sync.read(readFileSync(out));
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: RENDER_FLAGS });

function svgDims(svg) {
  const vb = svg.match(/viewBox="([\d.\- ]+)"/);
  if (vb) { const a = vb[1].trim().split(/\s+/).map(Number); if (a.length === 4) return { W: Math.max(1, Math.ceil(a[2])), H: Math.max(1, Math.ceil(a[3])) }; }
  const w = svg.match(/\bwidth="(\d+)/), h = svg.match(/\bheight="(\d+)/);
  if (w && h) return { W: +w[1], H: +h[1] };
  return { W: 800, H: 600 };
}
// Pin the <svg> root to its natural viewBox size: drop the responsive
// width="100%"/max-width that mermaid emits, set explicit width/height.
function pinSvgSize(svg, W, H) {
  const open = svg.match(/<svg\b[^>]*>/);
  if (!open) return svg;
  let tag = open[0]
    .replace(/\s(width|height)="[^"]*"/g, "")
    .replace(/\sstyle="[^"]*"/g, "");
  tag = tag.replace(/<svg\b/, `<svg width="${W}" height="${H}"`);
  return svg.replace(open[0], tag);
}
// Rasterize by rendering the SVG INLINE in the Chromium DOM (not via an <img>
// data-URI): the HTML parser is lenient and, crucially, <foreignObject> HTML
// labels render with real fonts — so mermaid.js / merman multi-line (<br/>)
// labels come out faithful instead of breaking the way img-loaded SVG does.
async function svgToPng(svg, savePath) {
  const { W, H } = svgDims(svg);
  const p = await browser.newPage();
  await p.setViewport({ width: Math.min(W, 5000) + 8, height: Math.min(H, 9000) + 8, deviceScaleFactor: 2 });
  await p.setContent(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head>` +
    `<body style="margin:0;background:#fff;display:inline-block">` +
    pinSvgSize(svg, W, H) + `</body></html>`,
    { waitUntil: "load" }
  );
  const el = await p.$("svg");
  // let fonts + any embedded raster (foreignObject <img>) settle
  await p.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const imgs = [...document.images];
    await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
  });
  const buf = await el.screenshot({ type: "png" });
  await p.close();
  if (savePath) writeFileSync(savePath, buf);
  return PNG.sync.read(buf);
}
function padToWhite(png, W, H) {
  const out = Buffer.alloc(W * H * 4, 255);
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const si = (y * png.width + x) * 4, di = (y * W + x) * 4;
    const a = png.data[si + 3] / 255;
    out[di] = Math.round(png.data[si] * a + 255 * (1 - a));
    out[di + 1] = Math.round(png.data[si + 1] * a + 255 * (1 - a));
    out[di + 2] = Math.round(png.data[si + 2] * a + 255 * (1 - a));
    out[di + 3] = 255;
  }
  return out;
}
// pixelmatch-count overlay (harsh on size mismatch): differing pixels / area.
function diffPixelmatch(aPng, refPng) {
  const W = Math.max(aPng.width, refPng.width), H = Math.max(aPng.height, refPng.height);
  const a = padToWhite(aPng, W, H), b = padToWhite(refPng, W, H);
  const n = pixelmatch(a, b, null, W, H, { threshold: 0.1 });
  return n / (W * H);
}
// bilinear resize of a white-composited RGBA buffer (srcW×srcH) → (dstW×dstH)
function resizeWhite(buf, srcW, srcH, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4, 255);
  const sx = srcW / dstW, sy = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    const fy = (y + 0.5) * sy - 0.5, y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(srcH - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < dstW; x++) {
      const fx = (x + 0.5) * sx - 0.5, x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(srcW - 1, x0 + 1), wx = fx - x0;
      const di = (y * dstW + x) * 4;
      for (let c = 0; c < 3; c++) {
        const p00 = buf[(Math.max(0, y0) * srcW + x0) * 4 + c], p01 = buf[(Math.max(0, y0) * srcW + x1) * 4 + c];
        const p10 = buf[(y1 * srcW + x0) * 4 + c], p11 = buf[(y1 * srcW + x1) * 4 + c];
        const top = p00 + (p01 - p00) * wx, bot = p10 + (p11 - p10) * wx;
        out[di + c] = Math.round(top + (bot - top) * wy);
      }
    }
  }
  return out;
}
// accuracy.py's mean_abs_diff: resize `other` to ref size, mean luminance of
// the per-pixel RGB |Δ| (0..255). Returned normalised to 0..1 (×100 = the doc's %).
function diffMeanAbs(aPng, refPng) {
  const W = refPng.width, H = refPng.height;
  const ref = padToWhite(refPng, W, H);
  let oth = padToWhite(aPng, aPng.width, aPng.height);
  if (aPng.width !== W || aPng.height !== H) oth = resizeWhite(oth, aPng.width, aPng.height, W, H);
  let sum = 0;
  for (let i = 0; i < W * H; i++) {
    const j = i * 4;
    const dr = Math.abs(ref[j] - oth[j]), dg = Math.abs(ref[j + 1] - oth[j + 1]), db = Math.abs(ref[j + 2] - oth[j + 2]);
    sum += 0.299 * dr + 0.587 * dg + 0.114 * db;
  }
  return sum / (W * H) / 255;
}

const rows = [];
for (const f of FILES) {
  const src = readFileSync(FIXDIR + f + ".mmd", "utf8");
  let kSvg = null, mSvg = null, kErr = null, mErr = null;
  try { kSvg = core.mermaidToSvgDagre(src); } catch (e) { kErr = String(e?.message || e).slice(0, 80); }
  try { mSvg = merman.mermaidRenderSvg(src); } catch (e) { mErr = String(e?.message || e).slice(0, 80); }

  let jPng = null, jErr = null;
  try { jPng = mermaidRefPng(f); } catch (e) { jErr = String(e?.stderr || e?.message || e).slice(0, 120); }
  const kPng = kSvg ? await svgToPng(kSvg, OUTDIR + "kymo/" + f + ".png") : null;
  const mPng = mSvg ? await svgToPng(mSvg, OUTDIR + "merman/" + f + ".png") : null;

  const kScore = (kPng && jPng) ? diffMeanAbs(kPng, jPng) : null;
  const mScore = (mPng && jPng) ? diffMeanAbs(mPng, jPng) : null;
  const kPM = (kPng && jPng) ? diffPixelmatch(kPng, jPng) : null;
  const mPM = (mPng && jPng) ? diffPixelmatch(mPng, jPng) : null;
  rows.push({ f, kScore, mScore, kPixelmatch: kPM, mPixelmatch: mPM, kErr, mErr, jOk: !!jPng });
  const pct = (x) => x == null ? "  --  " : (x * 100).toFixed(2) + "%";
  console.log(`${f.padEnd(20)} kymo ${pct(kScore)} (pm ${pct(kPM)})  merman ${pct(mScore)} (pm ${pct(mPM)})  ${jErr ? "mjsERR:" + jErr : ""}${kErr ? " kErr:" + kErr : ""}${mErr ? " mErr:" + mErr : ""}`);
}
await browser.close();
packServer.kill();
writeFileSync(OUTDIR + "scores.json", JSON.stringify(rows, null, 2) + "\n");
console.log("\nwrote", OUTDIR + "scores.json");
