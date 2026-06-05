/**
 * Icon loader — JS mirror of `packages/python/src/kymo/icons.py:get_icon`.
 *
 * kymo Icons v2 — P1 addressing (CR-ICONS-002 / FR-1, FR-4, FR-11):
 * resolution is built-in glyph → alias (parent chain + transforms, cycle
 * guarded) → collision-proof `prefix:name` address → legacy
 * `<provider>-<name>` key. Built-in glyphs resolve synchronously (wrapped in
 * a Promise); file-backed icons are fetched + cached on first request.
 *
 * The manifest may be the v2 shape `{ icons, legacy, aliases }` or the legacy
 * flat `{ key: path }` map (still accepted, e.g. via `setManifest`).
 *
 * Configure the base URL with `setIconBaseURL(url)` before the first call —
 * defaults to `""` (paths are relative to the page).
 */
import { ICONS } from "./icons-builtin.js";

type AliasEntry = { parent: string; rotate?: number; hflip?: boolean; vflip?: boolean };
type ManifestV2 = {
  icons: Record<string, string>;
  legacy?: Record<string, string>;
  aliases?: Record<string, AliasEntry>;
};
type Manifest = Record<string, string> | ManifestV2;

const IMAGE_SIZE = 64;
const _cache = new Map<string, string>(Object.entries(ICONS));   // builtin keys start cached
let _addrPaths: Record<string, string> | null = null;            // prefix:name → path
let _legacy: Record<string, string> = {};                        // legacy key → address
const _aliases: Record<string, AliasEntry> = {};                 // alias → entry
let _manifestPromise: Promise<void> | null = null;
let _baseURL = "";

/** `prefix:name` grammar (DESIGN-ICONS-CR002 §2). */
const ADDR_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isAddress(key: string): boolean {
  return ADDR_RE.test(key);
}

/** Set the URL prefix used to fetch the manifest + icon files. */
export function setIconBaseURL(url: string): void {
  _baseURL = url.endsWith("/") ? url.slice(0, -1) : url;
}

function ingest(m: Manifest): void {
  if (m && typeof m === "object" && "icons" in m && (m as ManifestV2).icons) {
    const v2 = m as ManifestV2;
    _addrPaths = { ...v2.icons };
    _legacy = { ...(v2.legacy ?? {}) };
    Object.assign(_aliases, v2.aliases ?? {});
  } else {
    // Legacy flat `{ key: path }` map — treat keys as directly resolvable.
    _addrPaths = { ...(m as Record<string, string>) };
    _legacy = {};
  }
}

/** Optional override for tests: inject a manifest (v2 or flat) directly. */
export function setManifest(map: Manifest): void {
  ingest(map);
}

/** Optional override for tests: register a single key → SVG fragment. */
export function registerIcon(key: string, svg: string): void {
  _cache.set(key, svg);
}

/** Register `addr` as an alias of `parent` (synonym or transformed variant, FR-4). */
export function registerAlias(addr: string, entry: AliasEntry): void {
  _aliases[addr] = entry;
}

async function loadManifest(): Promise<void> {
  if (_addrPaths) return;
  if (_manifestPromise) return _manifestPromise;
  const url = `${_baseURL}/icons-manifest.json`.replace(/^\//, "");
  _manifestPromise = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`manifest fetch failed: ${r.status}`);
    return r.json() as Promise<Manifest>;
  }).then((m) => ingest(m));
  return _manifestPromise;
}

function pngBytesToImageTag(bytes: Uint8Array, size = IMAGE_SIZE): string {
  // Base64-encode the PNG bytes for embedding in an SVG `<image>` tag.
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  const b64 = (typeof btoa !== "undefined") ? btoa(bin) : Buffer.from(bytes).toString("base64");
  const half = (size / 2) | 0;
  return `<image href="data:image/png;base64,${b64}" ` +
         `x="-${half}" y="-${half}" width="${size}" height="${size}"/>`;
}

function svgTextToInline(text: string, size = IMAGE_SIZE): string {
  const half = (size / 2) | 0;
  return `<svg x="-${half}" y="-${half}" width="${size}" height="${size}" ` +
         `overflow="visible">${text}</svg>`;
}

function applyTransforms(fragment: string, e: AliasEntry): string {
  const ops: string[] = [];
  if (e.rotate) ops.push(`rotate(${(e.rotate | 0) * 90})`);
  const sx = e.hflip ? -1 : 1;
  const sy = e.vflip ? -1 : 1;
  if (sx !== 1 || sy !== 1) ops.push(`scale(${sx},${sy})`);
  return ops.length ? `<g transform="${ops.join(" ")}">${fragment}</g>` : fragment;
}

function resolvePath(key: string): string | undefined {
  const paths = _addrPaths ?? {};
  if (key in paths) return paths[key];
  if (key in _legacy) return paths[_legacy[key] as string];
  return undefined;
}

/**
 * Resolve `key` to an SVG fragment. Built-in icons resolve immediately;
 * aliases walk their parent chain (cycle-guarded); file-backed icons resolve
 * after a network fetch. Throws when no registry knows the key.
 */
export async function getIcon(key: string, seen: ReadonlySet<string> = new Set()): Promise<string> {
  if (_cache.has(key)) return _cache.get(key)!;

  if (key in _aliases) {
    if (seen.has(key)) throw new Error(`alias cycle: ${JSON.stringify(key)}`);
    const e = _aliases[key] as AliasEntry;
    const base = await getIcon(e.parent, new Set(seen).add(key));
    const svg = applyTransforms(base, e);
    _cache.set(key, svg);
    return svg;
  }

  await loadManifest();
  const path = resolvePath(key);
  if (!path) throw new Error(`unknown icon: ${JSON.stringify(key)}`);

  const url = _baseURL ? `${_baseURL}/${path}` : path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`icon fetch failed: ${path} (${res.status})`);

  let svg: string;
  if (path.endsWith(".svg")) {
    svg = svgTextToInline(await res.text());
  } else {
    const buf = new Uint8Array(await res.arrayBuffer());
    svg = pngBytesToImageTag(buf);
  }
  _cache.set(key, svg);
  return svg;
}

/** All collision-proof `prefix:name` addresses (sorted), once the manifest is loaded. */
export async function iconAddresses(): Promise<string[]> {
  await loadManifest();
  return Object.keys(_addrPaths ?? {}).sort();
}

export { ICONS };
