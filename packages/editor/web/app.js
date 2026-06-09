// Client-side render (kymostudio + kymostudio-core wasm, inlined). Local editing
// and rendering need no auth. To RECEIVE live updates (Claude's set_diagram push
// over the kymo-mcp WebSocket), the user signs in with Google — only then does the
// editor open the authenticated /ws channel.
import { initSync, setManifest, setIconBaseURL, parseDiagram, renderSVG } from "kymostudio";
import manifest from "kymostudio/icons-manifest.json";
import wasmBytes from "kymostudio-core/kymostudio_core_bg.wasm";

initSync(wasmBytes);
setManifest(manifest);
setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons");

const GOOGLE_CLIENT_ID = "745071116390-6idggmrtohc6heg6gvuubaamkt8dr68u.apps.googleusercontent.com";
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
const srcEl = $("src"), previewEl = $("preview"), statusEl = $("status"), whoEl = $("whoami");
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

// ---- Live sync (requires Google sign-in) ----
const myId = Math.random().toString(36).slice(2);
let ws = null, idToken = null;

function pushDoc() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "set", source: srcEl.value, origin: myId }));
  }
}

function connect() {
  if (!idToken) return;
  try { ws = new WebSocket(MCP_WS + "?id_token=" + encodeURIComponent(idToken)); }
  catch { return; }
  ws.addEventListener("open", () => { live = true; render(); });
  ws.addEventListener("close", () => { live = false; render(); });
  ws.addEventListener("error", () => { try { ws.close(); } catch {} });
  ws.addEventListener("message", (e) => {
    let data; try { data = JSON.parse(e.data); } catch { return; }
    if (!data || data.type !== "doc" || data.origin === myId) return;
    const incoming = String(data.source ?? "");
    if (!incoming.trim()) { pushDoc(); return; }
    if (incoming === srcEl.value) return;
    srcEl.value = incoming;
    render();
  });
}

function emailOf(jwt) {
  try { return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email; }
  catch { return null; }
}

function onCredential(resp) {
  idToken = resp.credential;
  const email = emailOf(idToken);
  whoEl.innerHTML = email ? `<b>${email}</b> · live` : "live";
  const btn = $("gbtn"); if (btn) btn.style.display = "none";
  connect();
}

function initGoogle() {
  if (!window.google || !google.accounts || !google.accounts.id) { setTimeout(initGoogle, 150); return; }
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential, auto_select: true });
  google.accounts.id.renderButton($("gbtn"), { type: "standard", theme: "filled_black", size: "medium", text: "signin_with" });
  google.accounts.id.prompt(); // One Tap for returning users
}

srcEl.value = SAMPLE;
render();
whoEl.textContent = "Đăng nhập để nhận live update →";
initGoogle();
