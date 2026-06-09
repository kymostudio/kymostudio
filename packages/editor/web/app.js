// Client-side render: parse the kymo flowchart DSL and render SVG entirely in
// the browser via the JS engine (kymostudio) + kymostudio-core wasm (inlined).
// No server round-trip — every keystroke re-renders locally (~tens of ms).
import { initSync, setManifest, setIconBaseURL, parseDiagram, renderSVG } from "kymostudio";
import manifest from "kymostudio/icons-manifest.json";
import wasmBytes from "kymostudio-core/kymostudio_core_bg.wasm";

initSync(wasmBytes);
setManifest(manifest);
setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons");

const SAMPLE = `flowchart TD {
  A[Nhận đơn hàng] --> B{Còn hàng?}
  B -->|Có| C[Thanh toán]
  B -->|Không| D[Thông báo khách]
  C --> E[Đóng gói]
  E --> F((Giao hàng))
  D --> G[Hủy đơn]
}`;

const $ = (id) => document.getElementById(id);
const srcEl = $("src"), previewEl = $("preview"), statusEl = $("status");
let lastSvg = "";

function setStatus(msg, err) { statusEl.textContent = msg; statusEl.classList.toggle("error", !!err); }

async function render() {
  const source = srcEl.value;
  if (!source.trim()) { previewEl.innerHTML = ""; setStatus("Nhập nguồn flowchart…"); return; }
  const t0 = performance.now();
  try {
    const svg = await renderSVG(parseDiagram(source));
    lastSvg = svg;
    previewEl.innerHTML = svg;
    setStatus(`OK · ${svg.length} bytes · ${Math.round(performance.now() - t0)}ms`);
  } catch (e) { setStatus(String(e?.message ?? e), true); }
}

let timer = null;
srcEl.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 120); });
$("download").addEventListener("click", () => {
  if (!lastSvg) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lastSvg], { type: "image/svg+xml" }));
  a.download = "flowchart.svg"; a.click(); URL.revokeObjectURL(a.href);
});

srcEl.value = SAMPLE;
render();
