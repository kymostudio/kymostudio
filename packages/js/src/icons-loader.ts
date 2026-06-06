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

type IconRecord = { path?: string; body?: string; category?: string; width?: number; height?: number };
type SetFile = { prefix: string; width?: number; height?: number; icons: Record<string, IconRecord>;
                 aliases?: Record<string, AliasEntry>; info?: unknown };
type SetCache = { icons: Record<string, IconRecord>; missing: Set<string>; width: number; height: number };

const IMAGE_SIZE = 64;
const _cache = new Map<string, string>(Object.entries(ICONS));   // builtin keys start cached
let _addrPaths: Record<string, string> | null = null;            // prefix:name → path (injected/flat)
let _legacy: Record<string, string> = {};                        // legacy key → address
const _aliases: Record<string, AliasEntry> = {};                 // alias → entry
let _manifestPromise: Promise<void> | null = null;
let _baseURL = "";

// On-demand per-set loading (FR-9, NFR-4): one request per prefix, cached,
// with a `missing` set so a name is never re-requested.
const _sets = new Map<string, SetCache>();
const _setPromises = new Map<string, Promise<SetCache>>();

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

/** Reset all on-demand caches (manifest, per-set, resolved fragments) back to
 *  built-ins only. Primarily for tests / re-hosting under a new base URL. */
export function resetIconCaches(): void {
  _addrPaths = null;
  _legacy = {};
  _manifestPromise = null;
  _sets.clear();
  _setPromises.clear();
  for (const k of [..._cache.keys()]) if (!(k in ICONS)) _cache.delete(k);
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

// ── Inline IconifyJSON body rendering (mirror of icons.py:render_record +
// icons_pipeline.makeIdsSafe). Vendored sets (e.g. `ai:`) ship the SVG body
// inline; we render it crisp and recolourable, suffixing every element id per
// use so the same icon inlined N times never collides (FR-7). Brand art with
// its own fills/gradients renders verbatim. ────────────────────────────────
let _recordUses = 0;

function makeIdsSafe(body: string, suffix: string): string {
  const ids = new Set([...body.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map((m) => m[1] as string));
  let out = body;
  for (const old of ids) {
    const safe = old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const next = `${old}-${suffix}`;
    out = out.replace(new RegExp(`(\\bid\\s*=\\s*")(${safe})(")`, "g"), `$1${next}$3`);
    out = out.split(`url(#${old})`).join(`url(#${next})`);
    out = out.replace(new RegExp(`((?:xlink:)?href\\s*=\\s*")#${safe}(")`, "g"), `$1#${next}$2`);
  }
  return out;
}

function renderRecord(rec: IconRecord, size = IMAGE_SIZE): string {
  const w = rec.width ?? 24;
  const h = rec.height ?? 24;
  const body = makeIdsSafe(rec.body ?? "", `i${++_recordUses}`);
  const half = (size / 2) | 0;
  return `<svg x="-${half}" y="-${half}" width="${size}" height="${size}" ` +
         `viewBox="0 0 ${w} ${h}" overflow="visible">${body}</svg>`;
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

/** Fetch one per-set IconifyJSON file (`sets/<prefix>.json`) on demand and
 *  cache it. One request per prefix; subsequent icons of that set are hits. */
async function loadSet(prefix: string): Promise<SetCache> {
  const hit = _sets.get(prefix);
  if (hit) return hit;
  const inflight = _setPromises.get(prefix);
  if (inflight) return inflight;
  const url = `${_baseURL}/sets/${prefix}.json`.replace(/^\//, "");
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`set fetch failed: ${prefix} (${r.status})`);
    return r.json() as Promise<SetFile>;
  }).then((set) => {
    const rec: SetCache = {
      icons: set.icons ?? {}, missing: new Set(),
      width: set.width ?? 24, height: set.height ?? 24,
    };
    if (set.aliases) Object.assign(_aliases, set.aliases);
    _sets.set(prefix, rec);
    return rec;
  });
  _setPromises.set(prefix, p);
  return p;
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

  let path: string | undefined;
  if (isAddress(key) && !(_addrPaths && key in _addrPaths)) {
    // On-demand: fetch only this icon's set (FR-9, NFR-4) — not the catalogue.
    const prefix = key.slice(0, key.indexOf(":"));
    const local = key.slice(prefix.length + 1);
    const set = await loadSet(prefix);
    if (set.missing.has(local)) throw new Error(`unknown icon: ${JSON.stringify(key)}`);
    const rec = set.icons[local];
    if (!rec) { set.missing.add(local); throw new Error(`unknown icon: ${JSON.stringify(key)}`); }
    if (rec.body !== undefined) {
      // Vendored inline IconifyJSON set (e.g. `ai:`): render fresh per call so
      // ids stay unique across repeated inlines (FR-7) — hence NOT cached.
      return renderRecord({ body: rec.body, width: rec.width ?? set.width, height: rec.height ?? set.height });
    }
    path = rec.path;
  } else {
    await loadManifest();
    path = resolvePath(key);
  }
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
