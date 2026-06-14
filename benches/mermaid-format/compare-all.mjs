// Compare kymo vs merman vs mermaid.js across ALL diagram types.
// Ground truth = mermaid.js 11 (visible tokens). Metric = raster-safe label
// recall: fraction of mermaid.js's visible word-tokens present in each engine's
// raster-safe <text> (foreignObject stripped — what survives PNG/PDF).
// kymo routes flowchart/graph->mermaidToSvg, sequence->mermaidSequenceToSvg,
// state->mermaidStateToSvg, everything else -> merman (mirrors render-api).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
const K1 = "/home/claude-code/projects/workspace_kymostudio/k1";
const DS = K1 + "/benches/mermaid-format/datasets/";
const RA = K1 + "/packages/render-api";
const MERMAID = K1 + "/packages/editor/node_modules/mermaid/dist/mermaid.min.js";
const CACHE = K1 + "/benches/mermaid-format/results/mermaidjs-all-cache/"; mkdirSync(CACHE, { recursive: true });
const require = createRequire(RA + "/package.json");
const core = await import(require.resolve("kymostudio-core"));
core.initSync({ module: readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm")) });
const merman = await import(require.resolve("kymo-mermaid"));
merman.initSync({ module: readFileSync(require.resolve("kymo-mermaid/kymo_mermaid_bg.wasm")) });
const KYMO = { flowchart: core.mermaidToSvg, sequence: core.mermaidSequenceToSvg, state: core.mermaidStateToSvg };
const kymoRender = (g, src) => (KYMO[g] ? KYMO[g](src) : merman.mermaidRenderSvg(src));
const decode = s => s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ").replace(/&#x?[0-9a-fA-F]+;/g," ").replace(/&amp;/g,"&");
const stripHidden = svg => svg.replace(/<annotation\b[\s\S]*?<\/annotation>/g," ").replace(/<title[\s\S]*?<\/title>/g," ").replace(/<desc[\s\S]*?<\/desc>/g," ").replace(/<style[\s\S]*?<\/style>/g," ").replace(/<a [^>]*xlink:href[\s\S]*?<\/a>/g," ");
const toks = s => new Set((s.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]));
// mermaid.js visible tokens: text + foreignObject (its labels live there)
const visTokens = svg => { const s=stripHidden(svg); const fo=[...s.matchAll(/<foreignObject[\s\S]*?<\/foreignObject>/g)].map(m=>m[0]); const tx=[...s.matchAll(/<text[\s\S]*?<\/text>/g)].map(m=>m[0]); return toks(decode((fo.join(" ")+" "+tx.join(" ")).replace(/<[^>]+>/g," "))); };
// raster-safe tokens: only <text> after stripping foreignObject
const rasterTokens = svg => { const s=stripHidden(svg).replace(/<foreignObject[\s\S]*?<\/foreignObject>/g," "); const tx=[...s.matchAll(/<text[\s\S]*?<\/text>/g)].map(m=>m[0]); return toks(decode(tx.join(" ").replace(/<[^>]+>/g," "))); };
const recall = (ref, got) => { if(!ref.size) return null; let h=0; for(const t of ref) if(got.has(t)) h++; return h/ref.size; };

let browser, page;
async function mjs(src){
  if(!browser){ browser=await puppeteer.launch({executablePath:"/usr/bin/google-chrome-stable",headless:"new",args:["--no-sandbox","--disable-gpu"]}); page=await browser.newPage(); await page.setContent("<!DOCTYPE html><html><body></body></html>"); await page.addScriptTag({path:MERMAID}); await page.evaluate(()=>window.mermaid.initialize({startOnLoad:false,securityLevel:"loose"})); }
  return page.evaluate(async s=>{ try{ const {svg}=await window.mermaid.render("m"+Math.floor(performance.now()),s); return svg; }catch{ return "__ERR__"; } }, src);
}
const N = parseInt(process.env.N||"50");
// gather all grammars present
const grammars = new Set();
for (const ds of ["merman","mermaid-cypress","mermaid-to-svg"]) { const p=DS+ds; if(!existsSync(p))continue; for(const g of readdirSync(p)){ try{ if(statSync(p+"/"+g).isDirectory() && readdirSync(p+"/"+g).some(f=>f.endsWith(".mmd"))) grammars.add(g); }catch{} } }
const order = [...grammars].sort();
const rows = [];
for (const g of order) {
  const files=[]; for(const ds of ["merman","mermaid-cypress","mermaid-to-svg"]){const dir=DS+ds+"/"+g+"/";if(!existsSync(dir))continue;for(const fn of readdirSync(dir).filter(x=>x.endsWith(".mmd")))files.push([ds,fn,dir+fn]);}
  if(!files.length)continue;
  const step=Math.max(1,Math.floor(files.length/N)); const sample=files.filter((_,i)=>i%step===0).slice(0,N);
  let n=0,kSum=0,mSum=0,refSkip=0;
  for (const [ds,fn,path] of sample) {
    const src=readFileSync(path,"utf8");
    const cf=CACHE+g+"__"+ds+"__"+fn+".json"; let ref;
    if(existsSync(cf)){ const c=JSON.parse(readFileSync(cf,"utf8")); ref=c==="ERR"?null:new Set(c); }
    else { const svg=await mjs(src); if(svg==="__ERR__"){writeFileSync(cf,'"ERR"');ref=null;} else { const t=[...visTokens(svg)]; writeFileSync(cf,JSON.stringify(t)); ref=new Set(t); } }
    if(!ref||ref.size===0){refSkip++;continue;}
    let kt,mt; try{ kt=rasterTokens(kymoRender(g,src)); }catch{ kt=new Set(); } try{ mt=rasterTokens(merman.mermaidRenderSvg(src)); }catch{ mt=new Set(); }
    const kr=recall(ref,kt), mr=recall(ref,mt); if(kr==null)continue; n++; kSum+=kr; mSum+=mr;
  }
  if(n) rows.push({g, n, kymo:+(100*kSum/n).toFixed(1), merman:+(100*mSum/n).toFixed(1), own: !!KYMO[g]});
}
if(browser) await browser.close();
console.log("\ndiagram        | n   | kymo   | merman | engine");
console.log("---------------|-----|--------|--------|-------");
for (const r of rows) console.log(`${r.g.padEnd(14)} | ${String(r.n).padStart(3)} | ${String(r.kymo).padStart(5)}% | ${String(r.merman).padStart(5)}% | ${r.own?"kymo":"(merman)"}`);
writeFileSync(K1+"/benches/mermaid-format/results/compare-all.json", JSON.stringify({truth:"mermaid.js 11",metric:"raster-safe label recall",rows},null,2)+"\n");
console.log("\nwrote results/compare-all.json");
