/**
 * Python↔JS conformance: assert the JS resolved model + BPMN export of every
 * corpus `.kymo` matches the committed golden under `conformance/golden/`
 * (written by Python, the reference impl). A green run here + a green Python
 * run locks parity. Read-only — never writes goldens. See `conformance/README.md`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseDiagram } from "../dist/index.js";
import { corpusFiles, canonicalModel, bpmnDigest, isBpmn, GOLDEN_DIR } from "./_conformance.mjs";

const corpus = corpusFiles();
assert.ok(corpus.length > 0, "conformance corpus is empty");

function loadGolden(stem, kind) {
  const path = join(GOLDEN_DIR, `${stem}.${kind}.json`);
  assert.ok(
    existsSync(path),
    `missing golden ${stem}.${kind}.json — generate via Python: KYMO_UPDATE_CONFORMANCE=1 pytest tests/test_conformance.py`,
  );
  return JSON.parse(readFileSync(path, "utf8"));
}

for (const { stem, path } of corpus) {
  test(`conformance model — ${stem}`, () => {
    const diagram = parseDiagram(readFileSync(path, "utf8"));
    assert.deepEqual(canonicalModel(diagram), loadGolden(stem, "model"));
  });

  test(`conformance bpmn export — ${stem}`, (t) => {
    const diagram = parseDiagram(readFileSync(path, "utf8"));
    if (!isBpmn(diagram)) {
      t.skip(`${stem} is not a BPMN diagram`);
      return;
    }
    assert.deepEqual(bpmnDigest(diagram), loadGolden(stem, "bpmn"));
  });
}
