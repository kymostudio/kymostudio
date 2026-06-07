import "./_init.mjs";
/**
 * Shared helpers for the Python↔JS conformance suite (`conformance.test.js`).
 *
 * The JS implementation asserts its resolved model + BPMN export against the
 * committed goldens under `conformance/golden/` (written by Python, the
 * reference impl). This module is the JS mirror of
 * `packages/python/tests/_conformance.py` — keep the two in sync. It produces
 * the same canonical, language-neutral JSON shape (snake_case keys, arrays for
 * points, integral-float collapse). See `conformance/README.md`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// `canonicalModel` is the `.kymo.json` body serializer (single source of truth, incl.
// `layout_trees`); the conformance model comparison now covers layout trees too.
import { parseBpmn, toBpmn, modelDict as canonicalModel } from "../dist/index.js";
export { canonicalModel };

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
export const SAMPLES_DIR = join(repoRoot, "samples");
export const CORPUS_DIR = join(repoRoot, "conformance", "corpus");
export const GOLDEN_DIR = join(repoRoot, "conformance", "golden");
export const EXPORT_BPMN_DIR = join(GOLDEN_DIR, "export_bpmn");
// .bpmn import corpus: repo samples + minimal fixtures + the vendored MIWG corpus.
const FIXTURES_BPMN_DIR = join(repoRoot, "packages", "python", "tests", "fixtures", "bpmn");
const CORPUS_BPMN_DIR = join(repoRoot, "packages", "python", "tests", "corpus_bpmn");
export const KNOWN_DIVERGENCES_PATH = join(repoRoot, "conformance", "known_divergences.json");

function globByStem(dirs, ext) {
  const byStem = new Map();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) {
      if (f.endsWith(ext)) byStem.set(f.slice(0, -ext.length), join(dir, f));
    }
  }
  return [...byStem.keys()].sort().map((stem) => ({ stem, path: byStem.get(stem) }));
}

// ── Corpus discovery (mirror corpus_files / bpmn_corpus_files) ─────────────
export function corpusFiles() {
  return globByStem([SAMPLES_DIR, CORPUS_DIR], ".kymo");
}

export function bpmnCorpusFiles() {
  return globByStem([SAMPLES_DIR, FIXTURES_BPMN_DIR, CORPUS_BPMN_DIR], ".bpmn");
}

export function loadKnownDivergences() {
  return existsSync(KNOWN_DIVERGENCES_PATH)
    ? JSON.parse(readFileSync(KNOWN_DIVERGENCES_PATH, "utf8"))
    : {};
}

// ── Canonical model ────────────────────────────────────────────────────────
/** JSON-neutral normalisation: arrays recursed, `-0`→`0`; numbers otherwise
 *  kept as-is (JS has a single number type, so `5.0` is already `5`, and a
 *  genuine fraction survives to surface a real divergence). */
function norm(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(norm);
  if (typeof value === "number") return value === 0 ? 0 : value; // collapse -0
  return value; // string | boolean
}

// `canonicalModel` (= `modelDict`) is imported above from the library — the single
// source of truth for the `.kymo.json` body. `norm` is kept here for the BPMN digest.

// ── BPMN import (.bpmn → model) ────────────────────────────────────────────
export function isBpmn(d) {
  return d.components.some((c) => String(c.shape).startsWith("bpmn-"));
}

/** Canonical model of a `.bpmn` import. Mirror of Python `import_model`: an
 *  importer that throws is recorded as `{status:"error"}` (no type/message —
 *  language-specific), so both-error matches and error-vs-success diverges. */
export function importModel(xmlText) {
  try {
    return canonicalModel(parseBpmn(xmlText));
  } catch {
    return { status: "error" };
  }
}

// ── BPMN export digest (model → .bpmn → re-import) ──────────────────────────
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const SEP = String.fromCharCode(0); // NUL separator, mirrors Python `_edge_key`'s "\x00"
const edgeKey = (e) => [e.src, e.dst, e.bpmn_flow || "", JSON.stringify(e.points)].join(SEP);

/** Sorted BPMN-relevant subset of a (re-imported) diagram — mirror of `_digest`. */
function digest(d) {
  const components = d.components
    .map((c) => ({ id: c.id, shape: c.shape, icon: c.icon, size: norm(c.size), pos: norm(c.pos) }))
    .sort(byId);
  const regions = d.regions
    .map((r) => ({ id: r.id, style: r.style, label: r.label, bounds: norm(r.bounds) }))
    .sort(byId);
  const edges = d.edges
    .map((e) => ({ src: e.src, dst: e.dst, bpmn_flow: e.bpmnFlow, points: norm(e.points) }))
    .sort((a, b) => {
      const ka = edgeKey(a), kb = edgeKey(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  return { width: norm(d.width), height: norm(d.height), components, regions, edges };
}

/** Digest of a BPMN XML string via the real importer — used for a language's own
 *  export AND the committed Python export (cross-import interop). */
export function digestOfXml(xmlText) {
  return digest(parseBpmn(xmlText));
}

export function bpmnDigest(d) {
  return digestOfXml(toBpmn(d));
}
