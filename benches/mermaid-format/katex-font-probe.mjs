// katex-font-probe.mjs — what font does Chrome's MathML engine ACTUALLY use?
//
// The bench reference = katex renderToString(output:"mathml") → Chrome native
// MathML. We classified katex_001/002 residual as "cross-engine font floor" but
// never characterised the font. This asks Chrome directly via CDP
// CSS.getPlatformFontsForNode (the resolved render font per node), then measures
// per-glyph advance in Chrome vs kymo-tex to quantify the metric gap.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const require = (await import("node:module")).createRequire(import.meta.url);
const puppeteer = require(HERE + "/node_modules/puppeteer");
const KYMO_BIN = ROOT + "/packages/rust/kymo-tex/target/release/kymo-layout";
const katexJs = readFileSync(HERE + "/node_modules/katex/dist/katex.min.js", "utf8");
const katexCss = readFileSync(HERE + "/node_modules/katex/dist/katex.min.css", "utf8");

// representative glyphs spanning the divergent cases
const SAMPLES = [
  ["latin var", "x"], ["latin", "f"], ["digit", "1"],
  ["greek lc α", "\\alpha"], ["greek lc π", "\\pi"], ["greek lc ξ", "\\xi"],
  ["greek uc Γ", "\\Gamma"], ["greek uc Ω", "\\Omega"],
  ["rel ∀", "\\forall"], ["rel ⊂", "\\subset"], ["rel →", "\\to"], ["rel ∈", "\\in"],
  ["bb ℝ", "\\R"], ["bb ℕ", "\\N"],
  ["op ∑", "\\sum"], ["op ∫", "\\int"],
];

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
const client = await page.createCDPSession();
await client.send("DOM.enable");
await client.send("CSS.enable");
await page.setContent(
  `<!doctype html><html><head><style>${katexCss}
   html,body{margin:0;padding:0;font-size:16px}</style>
   <script>${katexJs}</script></head><body><div id="m"></div></body></html>`,
  { waitUntil: "networkidle0" }
);

// kymo per-glyph advance (em)
const kymoEm = {};
const kOut = execFileSync(KYMO_BIN, {
  input: SAMPLES.map(([, l]) => l).join("\n") + "\n",
}).toString().trim().split("\n").map((l) => JSON.parse(l));
SAMPLES.forEach(([, l], i) => (kymoEm[l] = kOut[i].error ? null : kOut[i].box.width));

console.log("glyph        latex      | Chrome render font (familyName, glyphs) | Chrome w(px) | kymo w(em→px@19.3) | k/c");
console.log("-".repeat(112));
const S = 19.299; // em→px from construct-diff
const seen = new Map();
for (const [name, latex] of SAMPLES) {
  const { ok } = await page.evaluate((latex) => {
    const el = document.getElementById("m");
    try {
      el.innerHTML = window.katex.renderToString(latex, { displayMode: true, output: "mathml", throwOnError: false });
    } catch (e) { return { ok: false }; }
    return { ok: !!el.querySelector("math") };
  }, latex);
  if (!ok) { console.log(`${name.padEnd(12)} ${latex.padEnd(10)} | (no render)`); continue; }

  const { root } = await client.send("DOM.getDocument");
  // the leaf text-bearing node: mi/mn/mo
  const q = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#m mi, #m mn, #m mo" });
  let fontDesc = "—", chromeW = null;
  if (q.nodeId) {
    const pf = await client.send("CSS.getPlatformFontsForNode", { nodeId: q.nodeId });
    fontDesc = pf.fonts.map((f) => `${f.familyName} (${f.glyphCount}g${f.isCustomFont ? ",custom" : ""})`).join(" + ") || "—";
    for (const f of pf.fonts) seen.set(f.familyName, (seen.get(f.familyName) || 0) + 1);
  }
  chromeW = await page.evaluate(() => {
    const n = document.querySelector("#m mi, #m mn, #m mo");
    return n ? n.getBoundingClientRect().width : null;
  });
  const kw = kymoEm[latex] != null ? kymoEm[latex] * S : null;
  const ratio = kw != null && chromeW ? (kw / chromeW) : null;
  console.log(
    `${name.padEnd(12)} ${latex.padEnd(10)} | ${fontDesc.padEnd(38)} | ${(chromeW?.toFixed(2) ?? "—").padStart(7)}     |` +
    ` ${(kw?.toFixed(2) ?? "—").padStart(7)}            | ${ratio ? ratio.toFixed(2) : "—"}`
  );
}

console.log("\n── fonts Chrome resolved for MathML glyphs (familyName → count) ──");
for (const [fam, n] of [...seen.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${fam}  ×${n}`);
await browser.close();
