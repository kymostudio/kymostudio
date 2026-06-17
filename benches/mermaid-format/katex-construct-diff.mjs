// katex-construct-diff.mjs — Part-A research harness.
//
// Question it answers: in kymo's math residual vs the mermaid.js reference,
// how much is SYSTEMATIC (per-construct metric divergence we can fix, raster-safe)
// vs the irreducible cross-engine FLOOR (Chrome-MathML font metrics)?
//
// Method (per-expression, exact pairing — no fragile SVG DOM matching):
//   reference  = the SAME chain the bench measures: katex 0.16.47
//                renderToString(displayMode:true, output:"mathml") → Chrome
//                (puppeteer Chromium) renders MathML natively → getBoundingClientRect.
//   kymo       = kymo-tex `kymo-layout` bin (LaTeX → em box), the engine behind
//                the shipped raster-safe path.
//   A single global em→px scale S is fit across ALL expressions (absorbs the
//   unknown font-size). After that, per-construct deviation of height%/width%
//   from 100 = systematic divergence; flat ~100 = within floor.
//
// Output: a per-expression table (kymo vs Chrome, normalized) + the MathML
//   sub-constructs Chrome emitted per node, + JSON dump for reproducibility.
//
// Run:  node katex-construct-diff.mjs    (from benches/mermaid-format)

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const require = (await import("node:module")).createRequire(import.meta.url);
const puppeteer = require(HERE + "/node_modules/puppeteer");

const FIXDIR = HERE + "/datasets/mermaid-cypress/flowchart/";
const FILES = ["katex_000", "katex_001", "katex_002"];
const KYMO_BIN = ROOT + "/packages/rust/kymo-tex/target/release/kymo-layout";
const KATEX_JS = HERE + "/node_modules/katex/dist/katex.min.js";
const KATEX_CSS = HERE + "/node_modules/katex/dist/katex.min.css";
const OUTJSON = HERE + "/research/assets/2026-06-16-worst10/construct-diff.json";

// ── 1. extract every $$…$$ math segment, with a short label ──────────────────
//    mermaid escapes a literal backslash as `\\`; un-escape once so katex/kymo
//    see real LaTeX (`\\relax`→`\relax`, and `\\\\`→`\\` keeps a real linebreak).
const unescape = (s) => s.replace(/\\\\/g, "\\");
const exprs = [];
for (const f of FILES) {
  const src = readFileSync(FIXDIR + f + ".mmd", "utf8");
  let i = 0;
  for (const m of src.matchAll(/\$\$([\s\S]+?)\$\$/g)) {
    const latex = unescape(m[1]).replace(/\s+/g, " ").trim();
    exprs.push({ file: f, idx: i++, latex, short: latex.slice(0, 34) });
  }
}

// ── 2. kymo side: pipe all LaTeX (one per line) → em boxes ────────────────────
const kymoOut = execFileSync(KYMO_BIN, [], {
  input: exprs.map((e) => e.latex).join("\n") + "\n",
  maxBuffer: 64 << 20,
}).toString();
const kymoLines = kymoOut.trim().split("\n").map((l) => JSON.parse(l));
exprs.forEach((e, k) => {
  const r = kymoLines[k];
  e.kymo = r.error
    ? { err: r.message }
    : { w: r.box.width, h: r.box.height + r.box.depth };
});

// ── 3. reference side: katex→MathML rendered by Chrome, measured natively ─────
const katexJs = readFileSync(KATEX_JS, "utf8");
const katexCss = readFileSync(KATEX_CSS, "utf8");
const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 2000, height: 2000, deviceScaleFactor: 1 });
await page.setContent(
  `<!doctype html><html><head><style>${katexCss}
   html,body{margin:0;padding:0}
   body{font-size:16px}
   #m{position:absolute;left:0;top:0}</style>
   <script>${katexJs}</script></head><body><div id="m"></div></body></html>`,
  { waitUntil: "networkidle0" }
);

for (const e of exprs) {
  const meas = await page.evaluate((latex) => {
    const el = document.getElementById("m");
    try {
      // EXACT mermaid chain: displayMode:true, output:"mathml".
      el.innerHTML = window.katex.renderToString(latex, {
        displayMode: true,
        output: "mathml",
        throwOnError: false,
      });
    } catch (err) {
      return { err: String(err) };
    }
    const math = el.querySelector("math");
    if (!math) return { err: "no <math>" };
    const r = math.getBoundingClientRect();
    // sub-construct census Chrome actually laid out
    const census = {};
    for (const tag of ["mfrac", "mtable", "msqrt", "mover", "munder"]) {
      const n = el.querySelectorAll(tag).length;
      if (n) census[tag] = n;
    }
    const stretch = [...el.querySelectorAll("mo[stretchy='true'], mo[minsize]")]
      .map((o) => o.getAttribute("minsize") || "auto");
    if (stretch.length) census.stretchy = stretch;
    return { w: r.width, h: r.height, census };
  }, e.latex);
  e.ref = meas;
}
await browser.close();

// ── 4. fit one global em→px scale S, then compute per-construct deviation ─────
const ok = exprs.filter((e) => e.kymo.w && e.ref.w && !e.ref.err);
// scale from HEIGHT (least affected by glyph-width style differences)
const ratios = ok.map((e) => e.ref.h / e.kymo.h).sort((a, b) => a - b);
const S = ratios[Math.floor(ratios.length / 2)]; // median em→px

const rows = exprs.map((e) => {
  if (e.kymo.err || e.ref.err)
    return { ...e, note: e.kymo.err || e.ref.err };
  const kw = e.kymo.w * S, kh = e.kymo.h * S;
  return {
    ...e,
    wPct: (100 * kw) / e.ref.w,
    hPct: (100 * kh) / e.ref.h,
    aKymo: e.kymo.w / e.kymo.h,
    aRef: e.ref.w / e.ref.h,
    refW: e.ref.w, refH: e.ref.h,
    census: e.ref.census,
  };
});

// ── 5. report ────────────────────────────────────────────────────────────────
const fmt = (n, d = 0) => (n == null ? "—" : n.toFixed(d));
const pct = (n) => (n == null ? "—" : (n >= 99.5 && n <= 100.5 ? " " : (n < 100 ? "-" : "+")) + fmt(Math.abs(100 - n), 1) + "%");
console.log(`\nem→px scale S = ${S.toFixed(3)} (median over ${ok.length} exprs)\n`);
console.log("file       # | height% Δh | width%  Δw | aspect k/ref | MathML constructs · stretchy minsizes");
console.log("-".repeat(110));
for (const r of rows) {
  if (r.note) { console.log(`${r.file} ${r.idx}  SKIP (${r.note.slice(0, 60)})`); continue; }
  const cs = r.census || {};
  const con = Object.entries(cs).filter(([k]) => k !== "stretchy").map(([k, v]) => `${k}×${v}`).join(" ");
  const st = cs.stretchy ? `  ⟨${cs.stretchy.join(",")}⟩` : "";
  console.log(
    `${r.file} ${r.idx}  | ${fmt(r.hPct, 1).padStart(6)} ${pct(r.hPct).padStart(6)} |` +
    ` ${fmt(r.wPct, 1).padStart(6)} ${pct(r.wPct).padStart(6)} |` +
    ` ${fmt(r.aKymo, 2)}/${fmt(r.aRef, 2)} |  ${r.short}${con ? "  ["+con+"]" : ""}${st}`
  );
}

// classification summary
const dev = (r) => r.hPct == null ? null : Math.max(Math.abs(100 - r.hPct), Math.abs(100 - r.wPct));
const sys = rows.filter((r) => dev(r) != null && dev(r) > 5);
const floor = rows.filter((r) => dev(r) != null && dev(r) <= 5);
console.log("\n── classification (after global scale normalisation) ──");
console.log(`  within ±5% (floor / well-matched): ${floor.length}  →  ${floor.map(r=>r.file+"#"+r.idx).join(", ")}`);
console.log(`  systematic >±5% (fixable lever):   ${sys.length}  →  ${sys.map(r=>`${r.file}#${r.idx}(h${fmt(r.hPct,0)} w${fmt(r.wPct,0)})`).join(", ")}`);

writeFileSync(OUTJSON, JSON.stringify({ S, rows }, null, 2));
console.log(`\nwrote ${OUTJSON}`);
