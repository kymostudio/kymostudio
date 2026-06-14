// style-overlay.mjs — pixel-overlay diff of three flowchart renderers vs
// mermaid.js 11.15: merman (kymo-mermaid port), kymo native, kymo mermaid-style.
// Produces the 4-column table in research/2026-06-14-flowchart-mermaid-style.md.
// Run: node style-overlay.mjs   (needs Chrome + the bench deps pixelmatch/pngjs)
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
const K1="/home/claude-code/projects/workspace_kymostudio/k1", RA=K1+"/packages/render-api";
const DS=K1+"/benches/mermaid-format/datasets/mermaid-cypress/flowchart";
const MERMAID=K1+"/packages/editor/node_modules/mermaid/dist/mermaid.min.js";
const require=createRequire(RA+"/package.json");
const benchReq=createRequire(K1+"/benches/mermaid-format/package.json");
const pixelmatch=(await import(benchReq.resolve("pixelmatch"))).default;
const {PNG}=benchReq("pngjs");
const core=await import(require.resolve("kymostudio-core"));
core.initSync({module:readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm"))});
const merman=await import(require.resolve("kymo-mermaid"));
merman.initSync({module:readFileSync(require.resolve("kymo-mermaid/kymo_mermaid_bg.wasm"))});
const browser=await puppeteer.launch({executablePath:"/usr/bin/google-chrome-stable",headless:"new",args:["--no-sandbox"]});
const mp=await browser.newPage();await mp.setContent("<body></body>");await mp.addScriptTag({path:MERMAID});
await mp.evaluate(()=>window.mermaid.initialize({startOnLoad:false,securityLevel:"loose"}));
const mjs=s=>mp.evaluate(async x=>{try{const{svg}=await window.mermaid.render("m"+Math.floor(performance.now()),x);return svg}catch{return"__ERR__"}},s);
function dims(svg){const m=svg.match(/viewBox="[\d.\- ]*?([\d.]+) ([\d.]+)"/);if(m)return{W:Math.max(1,Math.ceil(+m[1])),H:Math.max(1,Math.ceil(+m[2]))};return{W:800,H:600}}
async function rast(svg){const{W,H}=dims(svg);const p=await browser.newPage();await p.setViewport({width:Math.min(W,5000)+4,height:Math.min(H,9000)+4,deviceScaleFactor:1});
  const u="data:image/svg+xml;base64,"+Buffer.from(svg).toString("base64");
  await p.setContent(`<body style="margin:0;background:#fff"><img id=x width=${W} height=${H} src="${u}"></body>`);
  await p.waitForSelector("#x");await p.evaluate(()=>{const i=document.getElementById("x");return i.complete||new Promise(r=>i.onload=r)});
  const b=await (await p.$("#x")).screenshot({type:"png"});await p.close();return PNG.sync.read(b)}
function pad(png,W,H){const o=Buffer.alloc(W*H*4,255);for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){const si=(y*png.width+x)*4,di=(y*W+x)*4,a=png.data[si+3]/255;o[di]=Math.round(png.data[si]*a+255*(1-a));o[di+1]=Math.round(png.data[si+1]*a+255*(1-a));o[di+2]=Math.round(png.data[si+2]*a+255*(1-a));o[di+3]=255}return o}
function diff(a,b){const W=Math.max(a.width,b.width),H=Math.max(a.height,b.height);const n=pixelmatch(pad(a,W,H),pad(b,W,H),Buffer.alloc(W*H*4),W,H,{threshold:0.1});return n/(W*H)}
const files=readdirSync(DS).filter(f=>f.endsWith(".mmd")).sort().slice(0,5);
console.log("file".padEnd(30),"merman  kymo-native  kymo-mermaid");
const acc={me:[],kn:[],km:[]};
for(const f of files){const src=readFileSync(DS+"/"+f,"utf8");
  const m=await mjs(src);if(m==="__ERR__"){console.log(f,"mermaid ERR");continue}const mP=await rast(m);
  let dme=NaN; try{dme=diff(await rast(merman.mermaidRenderSvg(src)),mP)}catch(e){}
  const dkn=diff(await rast(core.mermaidToSvg(src)),mP);
  const dkm=diff(await rast(core.mermaidToSvgStyled(src,"mermaid")),mP);
  acc.me.push(dme);acc.kn.push(dkn);acc.km.push(dkm);
  console.log(f.padEnd(30),(dme*100).toFixed(1).padStart(6)+"%",(dkn*100).toFixed(1).padStart(8)+"%",(dkm*100).toFixed(1).padStart(11)+"%");}
const avg=a=>{const v=a.filter(x=>!isNaN(x));return v.reduce((s,x)=>s+x,0)/v.length*100};
console.log("MEAN".padEnd(30),avg(acc.me).toFixed(1).padStart(6)+"%",avg(acc.kn).toFixed(1).padStart(8)+"%",avg(acc.km).toFixed(1).padStart(11)+"%");
await browser.close();
