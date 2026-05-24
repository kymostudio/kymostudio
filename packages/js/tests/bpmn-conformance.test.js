/**
 * Python↔JS BPMN *format* conformance — bidirectional (JS side).
 *
 * Asserts, against the Python-written snapshots under `conformance/golden/`:
 *   • IMPORT  — every corpus `.bpmn` imports to the same canonical model;
 *   • EXPORT  — each exportable model's `toBpmn()` re-imports to the same digest;
 *   • INTEROP — Python's committed export XML re-imports (in JS) to the same
 *               digest as JS's own export → true cross-language interop.
 *
 * Read-only — never writes goldens. Stems in `conformance/known_divergences.json`
 * are skipped (tracked, not hidden). See `conformance/README.md`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseBpmn } from "../dist/index.js";
import {
  bpmnCorpusFiles, importModel, bpmnDigest, digestOfXml, loadKnownDivergences,
  GOLDEN_DIR, EXPORT_BPMN_DIR,
} from "./_conformance.mjs";

const corpus = bpmnCorpusFiles();
assert.ok(corpus.length > 0, "bpmn corpus is empty");
const byStem = new Map(corpus.map(({ stem, path }) => [stem, path]));
const known = loadKnownDivergences();

const importGolden = JSON.parse(readFileSync(join(GOLDEN_DIR, "bpmn_import.json"), "utf8"));
const exportGolden = JSON.parse(readFileSync(join(GOLDEN_DIR, "bpmn_export.json"), "utf8"));
// Matches INTEROP_STEMS in packages/python/tests/test_bpmn_conformance.py.
const INTEROP_STEMS = ["collaboration", "events", "gateways", "no_di", "order", "order-fulfillment"];
const read = (p) => readFileSync(p, "utf8"); // Node "utf8" replaces invalid bytes, like Python errors="replace"

// ── Import direction (.bpmn → model) ──────────────────────────────────────
for (const { stem, path } of corpus) {
  test(`bpmn import — ${stem}`, (t) => {
    if (stem in known) return t.skip(`known divergence: ${known[stem]}`);
    assert.ok(stem in importGolden, `${stem} missing from bpmn_import.json — regenerate`);
    assert.deepEqual(importModel(read(path)), importGolden[stem]);
  });
}

// ── Export direction (model → .bpmn → re-import digest) ───────────────────
for (const stem of Object.keys(exportGolden)) {
  test(`bpmn export — ${stem}`, (t) => {
    if (stem in known) return t.skip(`known divergence: ${known[stem]}`);
    const path = byStem.get(stem);
    assert.ok(path, `${stem} not found in corpus`);
    assert.deepEqual(bpmnDigest(parseBpmn(read(path))), exportGolden[stem]);
  });
}

// ── Export interop (committed Python XML ⇄ JS's own export) ───────────────
for (const stem of INTEROP_STEMS) {
  test(`bpmn export interop — ${stem}`, () => {
    const xmlPath = join(EXPORT_BPMN_DIR, `${stem}.bpmn`);
    assert.ok(existsSync(xmlPath), `missing export_bpmn/${stem}.bpmn — regenerate`);
    const own = bpmnDigest(parseBpmn(read(byStem.get(stem))));
    assert.deepEqual(digestOfXml(read(xmlPath)), own, "JS-import(Python export) ≠ JS-import(JS export)");
  });
}
