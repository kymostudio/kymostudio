// Regenerate the 5-column visual-proof assets for
// research/2026-06-14-flowchart-mermaid-style.md from one shared source, all
// rasterised the same way (Chrome, deviceScaleFactor 2, white bg).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
const K1 = "/home/claude-code/projects/workspace_kymostudio/k1", RA = K1 + "/packages/render-api";
const MERMAID = K1 + "/packages/editor/node_modules/mermaid/dist/mermaid.min.js";
const ASSETS = K1 + "/benches/mermaid-format/research/assets/2026-06-14-style/";
const require = createRequire(RA + "/package.json");
const core = await import(require.resolve("kymostudio-core"));
core.initSync({ module: readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm")) });
const merman = await import(require.resolve("kymo-mermaid"));
merman.initSync({ module: readFileSync(require.resolve("kymo-mermaid/kymo_mermaid_bg.wasm")) });

const SRC = `flowchart TD
  A[Start] --> B{Decide}
  B -->|yes| C[Do it]
  B -->|no| D[Skip]
  C --> E((End))
  subgraph S [Section]
    C
    D
  end`;

const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome-stable", headless: "new", args: ["--no-sandbox"] });
const mp = await browser.newPage(); await mp.setContent("<body></body>"); await mp.addScriptTag({ path: MERMAID });
await mp.evaluate(() => window.mermaid.initialize({ startOnLoad: false, securityLevel: "loose" }));
const mjs = s => mp.evaluate(async x => { const { svg } = await window.mermaid.render("m" + Math.floor(performance.now()), x); return svg; }, s);

async function save(svg, path) {
  const m = svg.match(/viewBox="[\d.\- ]*?([\d.]+) ([\d.]+)"/);
  const W = m ? Math.ceil(+m[1]) : 500, H = m ? Math.ceil(+m[2]) : 400;
  const p = await browser.newPage(); await p.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 2 });
  const u = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
  await p.setContent(`<body style="margin:0;background:#fff"><img id=x width=${W} height=${H} src="${u}"></body>`);
  await p.waitForSelector("#x"); await p.evaluate(() => { const i = document.getElementById("x"); return i.complete || new Promise(r => i.onload = r); });
  await (await p.$("#x")).screenshot({ path }); await p.close();
  console.log(path.split("/").pop(), W + "x" + H);
}

await save(core.mermaidToSvg(SRC), ASSETS + "kymo-native.png");
await save(core.mermaidToSvgStyled(SRC, "mermaid"), ASSETS + "kymo-mermaid-style.png");
await save(core.mermaidToSvgDagre(SRC), ASSETS + "kymo-dagre.png");
await save(merman.mermaidRenderSvg(SRC), ASSETS + "merman.png");
await save(await mjs(SRC), ASSETS + "mermaidjs.png");
await browser.close();
