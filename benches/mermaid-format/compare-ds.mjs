// Per dataset -> per diagram type: mermaid.js vs kymo vs merman.
// Reference = mermaid.js VISIBLE labels (foreignObject + text). Metric = raster-
// safe recall: fraction of those labels surviving resvg/svg2pdf rasterisation
// (only <text>, foreignObject dropped) for EACH tool — including mermaid.js's
// own SVG (which also loses foreignObject labels without a browser).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
const K1 = "/home/claude-code/projects/workspace_kymostudio/k1";
const DS = K1 + "/benches/mermaid-format/datasets/";
const RA = K1 + "/packages/render-api";
const MERMAID = K1 + "/packages/editor/node_modules/mermaid/dist/mermaid.min.js";
const CACHE = K1 + "/benches/mermaid-format/results/mjs-vr-cache/"; mkdirSync(CACHE, { recursive: true });
const require = createRequire(RA + "/package.json");
const core = await import(require.resolve("kymostudio-core"));
core.initSync({ module: readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm")) });
const merman = await import(require.resolve("kymo-mermaid"));
merman.initSync({ module: readFileSync(require.resolve("kymo-mermaid/kymo_mermaid_bg.wasm")) });
const KYMO = { flowchart: core.mermaidToSvg, sequence: core.mermaidSequenceToSvg, state: core.mermaidStateToSvg, class: core.mermaidClassToSvg, er: core.mermaidErToSvg, block: core.mermaidBlockToSvg };
const kymoRender = (g, src) => (KYMO[g] ? KYMO[g](src) : merman.mermaidRenderSvg(src));
const decode = s => s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&#x?[0-9a-fA-F]+;/g," ").replace(/&amp;/g,"&");
const stripHidden = svg => svg.replace(/<annotation\b[\s\S]*?<\/annotation>/g," ").replace(/<title[\s\S]*?<\/title>/g," ").replace(/<desc[\s\S]*?<\/desc>/g," ").replace(/<style[\s\S]*?<\/style>/g," ").replace(/<a [^>]*xlink:href[\s\S]*?<\/a>/g," ");
const toks = s => [...new Set((s.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]))];
const visTokens = svg => { const s=stripHidden(svg); const fo=[...s.matchAll(/<foreignObject[\s\S]*?<\/foreignObject>/g)].map(m=>m[0]); const tx=[...s.matchAll(/<text[\s\S]*?<\/text>/g)].map(m=>m[0]); return toks(decode((fo.join(" ")+" "+tx.join(" ")).replace(/<[^>]+>/g," "))); };
const allTokens = svg => { const sx=stripHidden(svg); const fo=[...sx.matchAll(/<foreignObject[\s\S]*?<\/foreignObject>/g)].map(m=>m[0]); const tx=[...sx.matchAll(/<text[\s\S]*?<\/text>/g)].map(m=>m[0]); return new Set(toks(decode((fo.join(" ")+" "+tx.join(" ")).replace(/<[^>]+>/g," ")))); };
const rasterTokens = svg => { const s=stripHidden(svg).replace(/<foreignObject[\s\S]*?<\/foreignObject>/g," "); const tx=[...s.matchAll(/<text[\s\S]*?<\/text>/g)].map(m=>m[0]); return new Set(toks(decode(tx.join(" ").replace(/<[^>]+>/g," ")))); };
const recall = (ref, got) => { if(!ref.length) return null; let h=0; for(const t of ref) if(got.has(t)) h++; return h/ref.length; };
let browser, page;
async function mjs(src){ if(!browser){ browser=await puppeteer.launch({executablePath:"/usr/bin/google-chrome-stable",headless:"new",args:["--no-sandbox","--disable-gpu"]}); page=await browser.newPage(); await page.setContent("<!DOCTYPE html><html><body></body></html>"); await page.addScriptTag({path:MERMAID}); await page.evaluate(()=>window.mermaid.initialize({startOnLoad:false,securityLevel:"loose"})); } return page.evaluate(async s=>{ try{ const {svg}=await window.mermaid.render("m"+Math.floor(performance.now()),s); return svg; }catch{ return "__ERR__"; } }, src); }
const N = parseInt(process.env.N||"50");
const grammars = new Set();
for (const ds of ["merman","mermaid-cypress","mermaid-to-svg"]) { const p=DS+ds; if(!existsSync(p))continue; for(const g of readdirSync(p)){ try{ if(statSync(p+"/"+g).isDirectory() && readdirSync(p+"/"+g).some(f=>f.endsWith(".mmd"))) grammars.add(g); }catch{} } }
const order = [...grammars].sort();
const out = {};
for (const ds of ["merman","mermaid-cypress","mermaid-to-svg"]) {
  out[ds] = [];
  for (const g of order) {
    const dir=DS+ds+"/"+g+"/"; if(!existsSync(dir))continue;
    const files=readdirSync(dir).filter(x=>x.endsWith(".mmd"));
    const step=Math.max(1,Math.floor(files.length/N)); const sample=files.filter((_,i)=>i%step===0).slice(0,N);
    let n=0,mjsB=0,mjsR=0,kB=0,kR=0,mB=0,mR=0;
    for (const fn of sample) {
      const src=readFileSync(dir+fn,"utf8"); const cf=CACHE+ds+"__"+g+"__"+fn+".json"; let vis,rast;
      if(existsSync(cf)){ const c=JSON.parse(readFileSync(cf,"utf8")); if(c==="ERR"){continue;} vis=c.vis; rast=new Set(c.raster); }
      else { const svg=await mjs(src); if(svg==="__ERR__"){writeFileSync(cf,'"ERR"');continue;} vis=visTokens(svg); rast=rasterTokens(svg); writeFileSync(cf,JSON.stringify({vis,raster:[...rast]})); }
      if(!vis.length)continue;
      let ksvg,msvg; try{ ksvg=kymoRender(g,src); }catch{ ksvg=""; } try{ msvg=merman.mermaidRenderSvg(src); }catch{ msvg=""; }
      n++;
      mjsR+=recall(vis,rast); mjsB+=1; // mermaid.js is the browser reference
      kB+=recall(vis,allTokens(ksvg)); kR+=recall(vis,rasterTokens(ksvg));
      mB+=recall(vis,allTokens(msvg)); mR+=recall(vis,rasterTokens(msvg));
    }
    if(n) out[ds].push({g, n, mjsB:+(100*mjsB/n).toFixed(0), mjsR:+(100*mjsR/n).toFixed(0), kB:+(100*kB/n).toFixed(0), kR:+(100*kR/n).toFixed(0), mB:+(100*mB/n).toFixed(0), mR:+(100*mR/n).toFixed(0), own:!!KYMO[g]});
  }
}
if(browser) await browser.close();
for (const ds of ["merman","mermaid-cypress","mermaid-to-svg"]) {
  console.log("\n### "+ds);
  console.log("diagram        | n   | mermaid.js b/r | kymo b/r   | merman b/r | engine");
  console.log("---------------|-----|---------------|------------|------------|------");
  for (const r of out[ds]) console.log(`${r.g.padEnd(14)} | ${String(r.n).padStart(3)} | ${(r.mjsB+"/"+r.mjsR).padStart(13)} | ${(r.kB+"/"+r.kR).padStart(10)} | ${(r.mB+"/"+r.mR).padStart(10)} | ${r.own?"own":""}`);
}
writeFileSync(K1+"/benches/mermaid-format/results/compare-by-dataset.json", JSON.stringify({truth:"mermaid.js 11 visible labels",metric:"raster-safe recall under resvg/svg2pdf",datasets:out},null,2)+"\n");
console.log("\nwrote results/compare-by-dataset.json");
