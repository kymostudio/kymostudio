import "./_init.mjs";
/**
 * `.kymo.json` round-trip + envelope tests (toKymoJson / parseKymoJson) — JS side.
 *
 * Covers the load-fixpoint, render-equivalence, the versioned envelope, and that
 * `layout_trees` survive the round-trip. Cross-language Python↔JS parity of the
 * `.kymo.json` body is covered by the conformance suite. Mirror of
 * `packages/python/tests/test_kymojson.py`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  parseBpmn, parseDiagram, renderSVG, toKymoJson, parseKymoJson,
} from "../dist/index.js";
import { FORMAT, VERSION } from "../dist/to-kymojson.js";
import { corpusFiles, bpmnCorpusFiles } from "./_conformance.mjs";

const read = (p) => readFileSync(p, "utf8");
const kymo = corpusFiles();

for (const { stem, path } of kymo) {
  test(`kymo.json round-trip — ${stem}`, async () => {
    const d1 = parseDiagram(read(path));
    const j1 = toKymoJson(d1);
    const d2 = parseKymoJson(j1);
    assert.equal(toKymoJson(d2), j1, "export∘parse∘export must be a byte-stable fixpoint");
    assert.equal(await renderSVG(d2), await renderSVG(d1), "loaded .kymo.json must render identically");
  });
}

test("envelope shape", () => {
  const payload = JSON.parse(toKymoJson(parseDiagram(read(kymo[0].path))));
  assert.equal(payload.format, FORMAT);
  assert.equal(FORMAT, "kymo.json");
  assert.equal(payload.version, VERSION);
  assert.equal(VERSION, 1);
  assert.deepEqual(
    Object.keys(payload.diagram).sort(),
    ["components", "edges", "height", "layout_trees", "regions", "subtitle", "title", "width"],
  );
});

test("layout_trees preserved through round-trip", () => {
  const cand = kymo.map((f) => parseDiagram(read(f.path))).find((d) => d.layoutTrees.length);
  if (!cand) return; // no layout { } case in corpus
  const d2 = parseKymoJson(toKymoJson(cand));
  assert.deepEqual(d2.layoutTrees, cand.layoutTrees);
});

test("rejects foreign json", () => {
  assert.throws(() => parseKymoJson('{"format":"not-kymo","version":1,"diagram":{}}'));
});

// also confirm a BPMN-imported model round-trips (empty layout_trees path)
test("bpmn-imported model round-trips", () => {
  const bpmn = bpmnCorpusFiles().find((f) => f.stem === "order");
  if (!bpmn) return;
  const d1 = parseBpmn(read(bpmn.path));
  assert.equal(toKymoJson(parseKymoJson(toKymoJson(d1))), toKymoJson(d1));
});
