// katex-legacy-rescore.mjs — does forcing mermaid to KaTeX (forceLegacyMathML)
// give a FAIR, reproducible reference, and how far does kymo's Δ drop?
//
// Renders the mermaid.js reference for katex_000/001/002 TWO ways via mmdc
// (same flags as worst10-grid): (a) default output:"mathml" (= current bench
// reference, macOS→STIX Two Math), (b) forceLegacyMathML:true → KaTeX
// output:"htmlAndMathml" (KaTeX webfonts, OS-independent, SAME engine as kymo).
// Then scores kymo (mermaidToSvgDagre) against each with accuracy.py's mean-abs.
// Non-destructive: legacy refs go to /tmp; committed assets untouched.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const require = createRequire(import.meta.url);
const puppeteer = (await import("puppeteer-core")).default;
const { PNG } = require("pngjs");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FIXDIR = HERE + "/datasets/mermaid-cypress/flowchart/";
const TMP = "/tmp/katex-rescore/";
mkdirSync(TMP, { recursive: true });
const FILES = ["katex_000", "katex_001", "katex_002"];

const merman = await import(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid.js");
merman.initSync({ module: readFileSync(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid_bg.wasm") });

// mmdc confs — identical flags to worst10-grid, only the math output mode differs
const CONF_MML = TMP + "conf_mathml.json", CONF_LEG = TMP + "conf_legacy.json";
const PPTR = TMP + "pptr.json", CSS = TMP + "ref.css";
writeFileSync(CONF_MML, JSON.stringify({ securityLevel: "loose", flowchart: { useMaxWidth: false } }));
// themeCSS zeroes the `.katex-display` margin (1em) BEFORE mermaid measures the
// label — otherwise the margin is baked into the node-rect height (~86px vs ~47px),
// an HTML-display artifact, not math geometry. (A `-C` cssFile applies too late.)
writeFileSync(CONF_LEG, JSON.stringify({ securityLevel: "loose", forceLegacyMathML: true, themeCSS: ".katex-display{margin:0 !important}", flowchart: { useMaxWidth: false } }));
const RENDER_FLAGS = ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--force-color-profile=srgb"];
writeFileSync(PPTR, JSON.stringify({ args: RENDER_FLAGS }));
writeFileSync(CSS, ".katex, .katex *, foreignObject, foreignObject * { text-rendering: geometricPrecision !important; }\n");

function refPng(file, conf, tag) {
  const out = TMP + tag + "_" + file + ".png";
  execFileSync("npx", ["mmdc", "-i", FIXDIR + file + ".mmd", "-o", out,
    "-b", "white", "-s", "2", "-c", conf, "-p", PPTR, "-C", CSS],
    { cwd: HERE, stdio: ["ignore", "ignore", "pipe"] });
  return PNG.sync.read(readFileSync(out));
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: RENDER_FLAGS });
function svgDims(svg) {
  const vb = svg.match(/viewBox="([\d.\- ]+)"/);
  if (vb) { const a = vb[1].trim().split(/\s+/).map(Number); if (a.length === 4) return { W: Math.max(1, Math.ceil(a[2])), H: Math.max(1, Math.ceil(a[3])) }; }
  return { W: 800, H: 600 };
}
function pinSvgSize(svg, W, H) {
  const open = svg.match(/<svg\b[^>]*>/); if (!open) return svg;
  let tag = open[0].replace(/\s(width|height)="[^"]*"/g, "").replace(/\sstyle="[^"]*"/g, "");
  return svg.replace(open[0], tag.replace(/<svg\b/, `<svg width="${W}" height="${H}"`));
}
async function svgToPng(svg) {
  const { W, H } = svgDims(svg);
  const p = await browser.newPage();
  await p.setViewport({ width: Math.min(W, 5000) + 8, height: Math.min(H, 9000) + 8, deviceScaleFactor: 2 });
  await p.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff;display:inline-block">` + pinSvgSize(svg, W, H) + `</body></html>`, { waitUntil: "load" });
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
    out[di] = Math.round(png.data[si] * a + 255 * (1 - a));
    out[di + 1] = Math.round(png.data[si + 1] * a + 255 * (1 - a));
    out[di + 2] = Math.round(png.data[si + 2] * a + 255 * (1 - a));
  }
  return out;
}
function resizeWhite(buf, srcW, srcH, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4, 255), sx = srcW / dstW, sy = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    const fy = (y + 0.5) * sy - 0.5, y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(srcH - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < dstW; x++) {
      const fx = (x + 0.5) * sx - 0.5, x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(srcW - 1, x0 + 1), wx = fx - x0, di = (y * dstW + x) * 4;
      for (let c = 0; c < 3; c++) {
        const p00 = buf[(y0 * srcW + x0) * 4 + c], p01 = buf[(y0 * srcW + x1) * 4 + c], p10 = buf[(y1 * srcW + x0) * 4 + c], p11 = buf[(y1 * srcW + x1) * 4 + c];
        const top = p00 + (p01 - p00) * wx, bot = p10 + (p11 - p10) * wx;
        out[di + c] = Math.round(top + (bot - top) * wy);
      }
    }
  }
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

const pct = (x) => (x * 100).toFixed(2) + "%";
console.log("\nfile        kymo Δ vs mathml-ref (current)   kymo Δ vs KaTeX-legacy-ref   improvement");
console.log("-".repeat(86));
for (const f of FILES) {
  const src = readFileSync(FIXDIR + f + ".mmd", "utf8");
  const kPng = await svgToPng(merman.mermaidToSvgDagre(src));
  const mml = refPng(f, CONF_MML, "mathml");
  const leg = refPng(f, CONF_LEG, "legacy");
  const dMml = diffMeanAbs(kPng, mml), dLeg = diffMeanAbs(kPng, leg);
  console.log(`${f.padEnd(11)} ${pct(dMml).padStart(10)}                     ${pct(dLeg).padStart(10)}              ${((1 - dLeg / dMml) * 100).toFixed(0)}% lower`);
}
await browser.close();
console.log("\nlegacy refs saved under", TMP);
