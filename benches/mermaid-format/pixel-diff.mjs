import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";

const K1 = "/home/claude-code/projects/workspace_kymostudio/k1";
const RA = K1 + "/packages/render-api";
const DS = K1 + "/benches/mermaid-format/datasets";
const MERMAID = K1 + "/packages/editor/node_modules/mermaid/dist/mermaid.min.js";
const CHROME = "/usr/bin/google-chrome-stable";
const OUT = "/home/claude-code/pixeltest/"; mkdirSync(OUT, { recursive: true });

const require = createRequire(RA + "/package.json");
const benchReq = createRequire(K1 + "/benches/mermaid-format/package.json");
const pixelmatch = (await import(benchReq.resolve("pixelmatch"))).default;
const { PNG } = benchReq("pngjs");
const core = await import(require.resolve("kymostudio-core"));
core.initSync({ module: readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm")) });
core.registerFont(new Uint8Array(readFileSync(RA + "/fonts/Roboto-Regular.ttf")));
core.registerFont(new Uint8Array(readFileSync(RA + "/fonts/Roboto-Bold.ttf")));
const KY = { flowchart: core.mermaidToSvg };

// known-divergent skip set
const kd = JSON.parse(readFileSync(DS + "/known-divergent.json", "utf8"));
const skipSet = new Set([...(kd.legacy||[]), ...(kd.exotic||[])].map(e => e.file));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
const mmPage = await browser.newPage();
await mmPage.setContent("<!DOCTYPE html><html><body></body></html>");
await mmPage.addScriptTag({ path: MERMAID });
await mmPage.evaluate(() => window.mermaid.initialize({ startOnLoad: false, securityLevel: "loose" }));

const mermaidSvg = (src) => mmPage.evaluate(async (s) => {
  try { const { svg } = await window.mermaid.render("mm" + Math.floor(performance.now()), s); return svg; }
  catch { return "__ERR__"; }
}, src);

// natural pixel size from the SVG's viewBox (fallback width/height attrs)
function svgDims(svg) {
  const vb = svg.match(/viewBox="([\d.\- ]+)"/);
  if (vb) { const a = vb[1].trim().split(/\s+/).map(Number); if (a.length === 4) return { W: Math.max(1, Math.ceil(a[2])), H: Math.max(1, Math.ceil(a[3])) }; }
  const w = svg.match(/\bwidth="(\d+)/), h = svg.match(/\bheight="(\d+)/);
  if (w && h) return { W: +w[1], H: +h[1] };
  return { W: 800, H: 600 };
}
// rasterize an SVG via Chrome at its natural viewBox size (DSF 1)
async function svgToPngChrome(svg) {
  const { W, H } = svgDims(svg);
  const p = await browser.newPage();
  await p.setViewport({ width: Math.min(W, 5000) + 4, height: Math.min(H, 9000) + 4, deviceScaleFactor: 1 });
  const url = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
  await p.setContent(`<body style="margin:0;background:#fff"><img id="x" width="${W}" height="${H}" src="${url}"></body>`);
  await p.waitForSelector("#x");
  await p.evaluate(() => { const i = document.getElementById("x"); return i.complete || new Promise(r => (i.onload = r)); });
  const buf = await (await p.$("#x")).screenshot({ type: "png" });
  await p.close();
  return PNG.sync.read(buf);
}

// composite a PNG onto a W*H white RGBA buffer at (0,0)
function padToWhite(png, W, H) {
  const out = Buffer.alloc(W * H * 4, 255);
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const si = (y * png.width + x) * 4, di = (y * W + x) * 4;
    const a = png.data[si + 3] / 255;
    out[di]   = Math.round(png.data[si]   * a + 255 * (1 - a));
    out[di+1] = Math.round(png.data[si+1] * a + 255 * (1 - a));
    out[di+2] = Math.round(png.data[si+2] * a + 255 * (1 - a));
    out[di+3] = 255;
  }
  return out;
}

function diffPct(kPng, mPng, savePrefix) {
  const W = Math.max(kPng.width, mPng.width), H = Math.max(kPng.height, mPng.height);
  const a = padToWhite(kPng, W, H), b = padToWhite(mPng, W, H);
  const diff = Buffer.alloc(W * H * 4);
  const n = pixelmatch(a, b, diff, W, H, { threshold: 0.1 });
  if (savePrefix) {
    const wp = (buf, name) => { const png = new PNG({ width: W, height: H }); buf.copy(png.data); writeFileSync(name, PNG.sync.write(png)); };
    wp(a, savePrefix + ".kymo.png"); wp(b, savePrefix + ".mermaid.png"); wp(diff, savePrefix + ".diff.png");
  }
  return { pct: n / (W * H), n, W, H };
}

// ---- self-test: same SVG both sides -> ~0 ----
const testSvg = core.mermaidToSvg("flowchart TD\n A[Start]-->B{Q}\n B-->|yes|C[Do]\n B-->|no|D[Skip]\n C-->E((End))\n D-->E");
{ const png = await svgToPngChrome(testSvg); const r = diffPct(png, png); console.log(`SELF-TEST same-svg diffPct=${(r.pct*100).toFixed(3)}% (expect ~0)`); }

// ---- flowchart sample ----
const dir = DS + "/mermaid-cypress/flowchart";
const files = readdirSync(dir).filter(f => f.endsWith(".mmd")).sort().slice(0, 5);
const rows = [];
for (const f of files) {
  const rel = "mermaid-cypress/flowchart/" + f;
  if (skipSet.has(rel)) { console.log("skip divergent", f); continue; }
  const src = readFileSync(dir + "/" + f, "utf8");
  let ksvg; try { ksvg = KY.flowchart(src); } catch (e) { console.log("kymo ERR", f, e.message.slice(0,50)); continue; }
  const msvg = await mermaidSvg(src);
  if (msvg === "__ERR__") { console.log("mermaid ERR", f); continue; }
  const kPng = await svgToPngChrome(ksvg), mPng = await svgToPngChrome(msvg);
  const r = diffPct(kPng, mPng);
  rows.push({ f, ...r });
  console.log(`${f.padEnd(42)} diff=${(r.pct*100).toFixed(1)}%  kymo ${kPng.width}x${kPng.height}  mm ${mPng.width}x${mPng.height}`);
}
rows.sort((a,b)=>b.pct-a.pct);
// save kymo|mermaid|diff for EVERY source in the small set
for (const r of rows) {
  const src = readFileSync(dir + "/" + r.f, "utf8");
  const kPng = await svgToPngChrome(KY.flowchart(src)), mPng = await svgToPngChrome(await mermaidSvg(src));
  diffPct(kPng, mPng, OUT + r.f.replace(/\.mmd$/,""));
}
console.log(`saved ${rows.length} overlays to ${OUT}`);
const pcts = rows.map(r=>r.pct).sort((a,b)=>a-b);
const mean = pcts.reduce((s,x)=>s+x,0)/pcts.length;
const med = pcts[Math.floor(pcts.length/2)];
const p90 = pcts[Math.floor(pcts.length*0.9)];
console.log(`\nflowchart n=${pcts.length} mean=${(mean*100).toFixed(1)}% median=${(med*100).toFixed(1)}% p90=${(p90*100).toFixed(1)}%`);
await browser.close();
