/**
 * Icon loader — JS mirror of `src/icons.py:get_icon`.
 *
 * Built-in glyphs (from `icons-builtin.js`) are returned synchronously
 * wrapped in `Promise.resolve()`. File-backed PNG icons are resolved
 * lazily: on first request the manifest is fetched, then the PNG bytes
 * are fetched and embedded as a base64 `<image>` tag inside an SVG
 * fragment. Subsequent lookups are cache hits.
 *
 * Configure the base URL with `setIconBaseURL(url)` before the first
 * call — defaults to `""` (paths are relative to the page).
 */
import { ICONS } from "./icons-builtin.js";

const IMAGE_SIZE = 64;
const _cache = new Map(Object.entries(ICONS));   // builtin keys start cached
let _manifest = null;
let _manifestPromise = null;
let _baseURL = "";

/** Set the URL prefix used to fetch the manifest + icon files. */
export function setIconBaseURL(url) {
  _baseURL = url.endsWith("/") ? url.slice(0, -1) : url;
}

/** Optional override for tests: inject a manifest map directly. */
export function setManifest(map) {
  _manifest = { ...map };
}

/** Optional override for tests: register a single key → SVG fragment. */
export function registerIcon(key, svg) {
  _cache.set(key, svg);
}

async function loadManifest() {
  if (_manifest) return _manifest;
  if (_manifestPromise) return _manifestPromise;
  const url = `${_baseURL}/icons-manifest.json`.replace(/^\//, "");
  _manifestPromise = fetch(url).then(r => {
    if (!r.ok) throw new Error(`manifest fetch failed: ${r.status}`);
    return r.json();
  }).then(m => (_manifest = m));
  return _manifestPromise;
}

function pngBytesToImageTag(bytes, size = IMAGE_SIZE) {
  // Base64-encode the PNG bytes for embedding in an SVG `<image>` tag.
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = (typeof btoa !== "undefined") ? btoa(bin) : Buffer.from(bytes).toString("base64");
  const half = (size / 2) | 0;
  return `<image href="data:image/png;base64,${b64}" ` +
         `x="-${half}" y="-${half}" width="${size}" height="${size}"/>`;
}

function svgTextToInline(text, size = IMAGE_SIZE) {
  const half = (size / 2) | 0;
  return `<svg x="-${half}" y="-${half}" width="${size}" height="${size}" ` +
         `overflow="visible">${text}</svg>`;
}

/**
 * Resolve `key` to an SVG fragment. Returns a Promise; built-in icons
 * resolve immediately, file-backed PNGs/SVGs after a network fetch.
 * Throws when the key is not in the built-in registry and not in the
 * manifest.
 */
export async function getIcon(key) {
  if (_cache.has(key)) return _cache.get(key);

  const manifest = await loadManifest();
  const path = manifest[key];
  if (!path) throw new Error(`unknown icon: ${JSON.stringify(key)}`);

  const url = _baseURL ? `${_baseURL}/${path}` : path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`icon fetch failed: ${path} (${res.status})`);

  let svg;
  if (path.endsWith(".svg")) {
    svg = svgTextToInline(await res.text());
  } else {
    const buf = new Uint8Array(await res.arrayBuffer());
    svg = pngBytesToImageTag(buf);
  }
  _cache.set(key, svg);
  return svg;
}

export { ICONS };
