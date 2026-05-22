/**
 * kymostudio playground — a fully client-side editor that compiles a
 * `.kymo` DSL (or a BPMN 2.0 `.bpmn` file) to SVG in the browser, with no
 * server. It bundles the dependency-free `kymostudio` JS package; esbuild
 * inlines the package, the icon manifest, and the starter samples into
 * `kymo.bundle.js` (see build.sh), so the deployed page is pure static assets.
 *
 * Sharing mirrors play.d2lang.com: the source is deflate-compressed and
 * base64url-encoded into the `?script=` query param, decoded on load.
 */
import {
  parseDiagram,
  parseBpmn,
  renderSVG,
  setManifest,
  setIconBaseURL,
} from "../../packages/js/dist/index.js";
import manifest from "../../packages/js/icons-manifest.json";

// Starter diagrams. esbuild's `text` loader inlines these file contents as
// strings at build time (the real `samples/` dir is not deployed to Pages).
import aiqSrc from "../../samples/aiq.kymo";
import dataSrc from "../../samples/data.kymo";
import awsSrc from "../../samples/aws_1.kymo";
import orderBpmn from "../../samples/order.bpmn";

// Built-in vector icons render with zero network. The ~2300 file-backed icons
// (cloud-provider logos) are fetched lazily from jsDelivr — the repo is public.
setManifest(manifest);
setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main");

const SAMPLES = {
  aiq: { label: "AIQ architecture", src: aiqSrc },
  data: { label: "Data pipeline", src: dataSrc },
  aws: { label: "AWS reference", src: awsSrc },
  order: { label: "BPMN · Order", src: orderBpmn },
};

// ── DOM ──────────────────────────────────────────────────────────────
const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const errorBox = document.getElementById("error");
const sampleSel = document.getElementById("sample");
const copyBtn = document.getElementById("copy");
const downloadBtn = document.getElementById("download");
const bgBtns = Array.from(document.querySelectorAll("[data-bg]"));
const toast = document.getElementById("toast");

// ── Theme + render ─────────────────────────────────────────────────────
// The toggle re-themes the whole app via [data-theme] on <html> (header,
// editor, panes, preview); the SVG canvas background follows the active theme.
// "None" makes only the canvas transparent (checkerboard) while keeping the
// current page theme.
const THEME_BG = { light: "#f8fafc", dark: "#0f172a" };
let theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
let transparent = false;
let lastSVG = ""; // last successful render, used for download
let renderToken = 0;

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  preview.classList.toggle("checker", transparent);
}
function svgBackground() {
  return transparent ? null : THEME_BG[theme];
}

/** Heuristic: BPMN files are XML; everything else is the .kymo DSL. */
function isBpmn(src) {
  const head = src.slice(0, 600);
  return /<\?xml/.test(head) || /<([a-zA-Z]+:)?definitions[\s>]/.test(head);
}

async function render() {
  const src = editor.value;
  const token = ++renderToken;
  try {
    const diagram = isBpmn(src) ? parseBpmn(src) : parseDiagram(src);
    const svg = await renderSVG(diagram, { background: svgBackground() });
    if (token !== renderToken) return; // a newer keystroke superseded us
    lastSVG = svg;
    preview.innerHTML = svg;
    errorBox.hidden = true;
  } catch (err) {
    if (token !== renderToken) return;
    errorBox.textContent = err && err.message ? err.message : String(err);
    errorBox.hidden = false; // keep the last good preview underneath
  }
}

let debounceId;
function scheduleRender() {
  clearTimeout(debounceId);
  debounceId = setTimeout(() => {
    render();
    syncURL();
  }, 220);
}

// ── URL sharing (deflate-raw + base64url; "1" prefix = compressed) ─────
function b64urlEncode(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encodeSource(src) {
  const bytes = new TextEncoder().encode(src);
  if (typeof CompressionStream !== "undefined") {
    const cs = new CompressionStream("deflate-raw");
    const w = cs.writable.getWriter();
    w.write(bytes);
    w.close();
    const buf = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    return "1" + b64urlEncode(buf);
  }
  return "0" + b64urlEncode(bytes);
}

async function decodeSource(tokenStr) {
  const scheme = tokenStr[0];
  const bytes = b64urlDecode(tokenStr.slice(1));
  if (scheme === "1" && typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("deflate-raw");
    const w = ds.writable.getWriter();
    w.write(bytes);
    w.close();
    const out = new Uint8Array(await new Response(ds.readable).arrayBuffer());
    return new TextDecoder().decode(out);
  }
  return new TextDecoder().decode(bytes);
}

async function syncURL() {
  const token = await encodeSource(editor.value);
  const url = new URL(location.href);
  url.searchParams.set("script", token);
  history.replaceState(null, "", url);
}

async function loadFromURL() {
  const token = new URL(location.href).searchParams.get("script");
  if (!token) return false;
  try {
    editor.value = await decodeSource(token);
    return true;
  } catch {
    return false;
  }
}

// ── Toast ──────────────────────────────────────────────────────────────
let toastId;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastId);
  toastId = setTimeout(() => toast.classList.remove("show"), 1600);
}

// ── Wiring ─────────────────────────────────────────────────────────────
editor.addEventListener("input", scheduleRender);

// Tab inserts two spaces instead of moving focus.
editor.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const { selectionStart: s, selectionEnd: end } = editor;
  editor.value = editor.value.slice(0, s) + "  " + editor.value.slice(end);
  editor.selectionStart = editor.selectionEnd = s + 2;
  scheduleRender();
});

for (const key of Object.keys(SAMPLES)) {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = SAMPLES[key].label;
  sampleSel.appendChild(opt);
}
sampleSel.addEventListener("change", () => {
  const s = SAMPLES[sampleSel.value];
  if (!s) return;
  editor.value = s.src;
  render();
  syncURL();
});

copyBtn.addEventListener("click", async () => {
  await syncURL();
  try {
    await navigator.clipboard.writeText(location.href);
    showToast("Share link copied");
  } catch {
    showToast("Copy failed — URL is in the address bar");
  }
});

downloadBtn.addEventListener("click", () => {
  if (!lastSVG) return;
  const blob = new Blob([lastSVG], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "diagram.svg";
  a.click();
  URL.revokeObjectURL(url);
});

for (const btn of bgBtns) {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.bg; // "light" | "dark" | "transparent"
    if (mode === "transparent") transparent = true;
    else { theme = mode; transparent = false; }
    bgBtns.forEach((b) => b.classList.toggle("active", b === btn));
    applyTheme();
    render();
  });
}

// ── Init ───────────────────────────────────────────────────────────────
// Runs on `pageshow` (not module-eval) so it executes *after* the browser
// restores any prior textarea value on reload/bfcache — otherwise a restored
// value would clobber a `?script=` shared link. A shared link always wins; an
// empty editor falls back to the default sample; otherwise the restored value
// is kept.
async function boot() {
  const loaded = await loadFromURL();
  if (!loaded && !editor.value.trim()) {
    editor.value = SAMPLES.aiq.src;
    sampleSel.value = "aiq";
  }
  applyTheme();
  render();
}
window.addEventListener("pageshow", boot);
boot(); // also run immediately for first paint when no restoration occurs
