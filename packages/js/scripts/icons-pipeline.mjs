/**
 * SVG normalize pipeline — JS mirror of packages/python/src/kymo/icons_pipeline.py
 * (P4 / CR-ICONS-005, FR-3/FR-6/FR-7/FR-8). Regex-based, ZERO dependencies.
 *
 *   cleanupSvg → parseColors(currentColor) → minify  (+ toRecord, makeIdsSafe)
 *
 * Vectorization rides on this; sourcing vector originals for the raster PNGs
 * is the external prerequisite (RES-ICONS-001 §7.1). `kymo icons download
 * --from iconify` runs normalize() on fetched art.
 */
const DROP_BLOCKS = /<\?xml[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>|<!--[\s\S]*?-->|<(script|style|metadata|title|desc)\b[\s\S]*?<\/\1>/gi;
const COLOR_ATTR = /\b(fill|stroke)\s*=\s*"(?!none|currentColor|url\()[^"]*"/gi;
const WS = />\s+</g;
const SVG_OPEN = /<svg\b[^>]*>/i;
const VIEWBOX = /viewBox\s*=\s*"([^"]+)"/i;
const WH = /\b(width|height)\s*=\s*"([0-9.]+)/gi;
const ID_DEF = /\bid\s*=\s*"([^"]+)"/g;

export const cleanupSvg = (t) => t.replace(DROP_BLOCKS, "").trim();
export const parseColors = (t) => t.replace(COLOR_ATTR, (_m, a) => `${a}="currentColor"`);
export const minify = (t) => t.replace(WS, "><").trim();
export const normalize = (t) => minify(parseColors(cleanupSvg(t)));

function dims(openTag) {
  const vb = VIEWBOX.exec(openTag);
  if (vb) {
    const p = vb[1].replace(/,/g, " ").trim().split(/\s+/);
    if (p.length === 4) return [Math.round(+p[2]), Math.round(+p[3])];
  }
  const wh = {};
  for (const m of openTag.matchAll(WH)) wh[m[1].toLowerCase()] = +m[2];
  return [Math.round(wh.width ?? 24), Math.round(wh.height ?? 24)];
}

export function toRecord(text) {
  const doc = normalize(text);
  const m = SVG_OPEN.exec(doc);
  if (!m) return { body: doc, width: 24, height: 24 };
  const body = doc.slice(m.index + m[0].length).replace(/<\/svg>\s*$/i, "").trim();
  const [width, height] = dims(m[0]);
  return { body, width, height };
}

export function makeIdsSafe(body, suffix) {
  const ids = new Set([...body.matchAll(ID_DEF)].map((m) => m[1]));
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
