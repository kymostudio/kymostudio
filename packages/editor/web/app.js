// Client-side render: parse the kymo flowchart DSL and render SVG entirely in
// the browser via the JS engine (kymostudio) + kymostudio-core wasm (inlined).
// No server round-trip for rendering. A WebSocket to the kymo-mcp Worker keeps
// the doc in sync so Claude (via MCP set_diagram) can push diagrams live.
import { initSync, setManifest, setIconBaseURL, parseDiagram, renderSVG } from "kymostudio";
import manifest from "kymostudio/icons-manifest.json";
import wasmBytes from "kymostudio-core/kymostudio_core_bg.wasm";

initSync(wasmBytes);
setManifest(manifest);
setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons");

const MCP_WS = "wss://kymo-mcp.anhv-ict91.workers.dev/ws";

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
let live = false;

function setStatus(msg, err) {
  statusEl.textContent = (live ? "⚡ " : "") + msg;
  statusEl.classList.toggle("error", !!err);
}

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
srcEl.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => { render(); pushDoc(); }, 120);
});
$("download").addEventListener("click", () => {
  if (!lastSvg) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lastSvg], { type: "image/svg+xml" }));
  a.download = "flowchart.svg"; a.click(); URL.revokeObjectURL(a.href);
});

// ---- Live sync with the kymo-mcp editor room (Claude pushes via set_diagram) ----
const myId = Math.random().toString(36).slice(2);
let ws = null;

function pushDoc() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "set", source: srcEl.value, origin: myId }));
  }
}

function connect() {
  try { ws = new WebSocket(MCP_WS); } catch { return; }
  ws.addEventListener("open", () => { live = true; render(); });
  ws.addEventListener("close", () => { live = false; render(); setTimeout(connect, 2000); });
  ws.addEventListener("error", () => { try { ws.close(); } catch {} });
  ws.addEventListener("message", (e) => {
    let data; try { data = JSON.parse(e.data); } catch { return; }
    if (!data || data.type !== "doc" || data.origin === myId) return;
    const incoming = String(data.source ?? "");
    if (!incoming.trim()) { pushDoc(); return; } // seed an empty room with our content
    if (incoming === srcEl.value) return;
    srcEl.value = incoming;
    render();
  });
}

srcEl.value = SAMPLE;
render();
connect();
