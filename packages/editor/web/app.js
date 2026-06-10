// Client-side render (kymostudio + kymostudio-core wasm). Local edit/render need
// no auth. Receiving live updates over the kymo-mcp WebSocket requires Google
// sign-in. Each diagram is a separate room: editor.kymo.studio/?d=<id>; with no
// ?d the user gets their personal default diagram.
import { initSync, setManifest, setIconBaseURL, parseDiagram, renderSVG } from "kymostudio";
import manifest from "kymostudio/icons-manifest.json";
import wasmBytes from "kymostudio-core/kymostudio_core_bg.wasm";

initSync(wasmBytes);
setManifest(manifest);
setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons");

const GOOGLE_CLIENT_ID = "745071116390-6idggmrtohc6heg6gvuubaamkt8dr68u.apps.googleusercontent.com";
const MCP_WS = "wss://mcp.kymo.studio/ws";

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
let lastSvg = "", live = false;

function setStatus(msg, err) { statusEl.textContent = (live ? "⚡ " : "") + msg; statusEl.classList.toggle("error", !!err); }

async function render() {
  const source = srcEl.value;
  if (!source.trim()) { previewEl.innerHTML = ""; setStatus("Nhập nguồn flowchart…"); return; }
  const t0 = performance.now();
  try {
    const svg = await renderSVG(parseDiagram(source));
    lastSvg = svg; previewEl.innerHTML = svg;
    setStatus(`OK · ${svg.length} bytes · ${Math.round(performance.now() - t0)}ms`);
  } catch (e) { setStatus(String(e?.message ?? e), true); }
}

let timer = null;
srcEl.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { render(); pushDoc(); }, 120); });
$("download").addEventListener("click", () => {
  if (!lastSvg) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lastSvg], { type: "image/svg+xml" }));
  a.download = "flowchart.svg"; a.click(); URL.revokeObjectURL(a.href);
});
$("newbtn").addEventListener("click", () => {
  const id = (self.crypto && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  location.href = "/?d=" + id;
});

// ---- Live sync (per-diagram room, requires Google sign-in) ----
const myId = Math.random().toString(36).slice(2);
let ws = null, idToken = null, roomId = null;

function pushDoc() { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "set", source: srcEl.value, origin: myId })); }

function connect() {
  if (!idToken || !roomId) return;
  try { ws = new WebSocket(MCP_WS + "?id_token=" + encodeURIComponent(idToken) + "&d=" + encodeURIComponent(roomId)); } catch { return; }
  ws.addEventListener("open", () => { live = true; render(); });
  ws.addEventListener("close", () => { live = false; render(); if (!tokenValid(idToken)) { signOut(); initGoogle(); } });
  ws.addEventListener("error", () => { try { ws.close(); } catch {} });
  ws.addEventListener("message", (e) => {
    let data; try { data = JSON.parse(e.data); } catch { return; }
    if (!data || data.type !== "doc" || data.origin === myId) return;
    const incoming = String(data.source ?? "");
    if (!incoming.trim()) { pushDoc(); return; }
    if (incoming === srcEl.value) return;
    srcEl.value = incoming; render();
  });
}

function jwtField(jwt, field) {
  try { return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))[field]; } catch { return null; }
}

function tokenValid(t) {
  const exp = t && jwtField(t, "exp");
  return !!(exp && exp * 1000 > Date.now() + 30000);
}

function applyToken(token) {
  idToken = token;
  const email = jwtField(token, "email"), sub = jwtField(token, "sub");
  const d = new URLSearchParams(location.search).get("d");
  roomId = d || ("u-" + sub + "-default");
  whoEl.innerHTML = (email ? `<b>${email}</b>` : "") + " · " + (d ? `diagram ${d}` : "diagram chính");
  const btn = $("gbtn"); if (btn) btn.style.display = "none";
  connect();
}

function signOut() {
  try { localStorage.removeItem("kymo_idtoken"); } catch {}
  idToken = null;
}

function onCredential(resp) {
  try { localStorage.setItem("kymo_idtoken", resp.credential); } catch {}
  applyToken(resp.credential);
}

function initGoogle() {
  if (!window.google || !google.accounts || !google.accounts.id) { setTimeout(initGoogle, 150); return; }
  whoEl.textContent = "Đăng nhập để nhận live update →";
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential, auto_select: true });
  google.accounts.id.renderButton($("gbtn"), { type: "standard", theme: "filled_black", size: "medium", text: "signin_with" });
  google.accounts.id.prompt();
}

srcEl.value = SAMPLE; render();
const saved = (() => { try { return localStorage.getItem("kymo_idtoken"); } catch { return null; } })();
if (tokenValid(saved)) applyToken(saved);
else { signOut(); initGoogle(); }
