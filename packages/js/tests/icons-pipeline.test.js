/**
 * kymo Icons v2 — P4 pipeline (CR-ICONS-005 / TC-2, TC-5, TC-6), JS mirror of
 * packages/python/tests/test_icons_pipeline.py.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { normalize, parseColors, toRecord, makeIdsSafe } from "../scripts/icons-pipeline.mjs";

const SAMPLE =
  '<?xml version="1.0"?><!-- cruft -->' +
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  "<title>home</title><style>.x{}</style>" +
  '<path fill="#ff0000" d="M3 12l9-9 9 9"/>' +
  '<rect id="bg" fill="#fff" width="4" height="4"/><use href="#bg"/></svg>';

// ── TC-2 — sparse record (FR-3) ────────────────────────────────────────────
test("toRecord returns body-only with dims, cruft stripped", () => {
  const rec = toRecord(SAMPLE);
  assert.equal(rec.width, 24);
  assert.equal(rec.height, 24);
  assert.ok(!rec.body.includes("<svg") && !rec.body.includes("</svg>"));
  assert.ok(rec.body.includes("<path"));
  assert.ok(!rec.body.includes("<style") && !rec.body.includes("<!--"));
});

// ── TC-5 — recolour (FR-6) ──────────────────────────────────────────────────
test("parseColors recolours concrete colours to currentColor", () => {
  const out = parseColors('<path fill="#ff0000" stroke="none"/>');
  assert.match(out, /fill="currentColor"/);
  assert.match(out, /stroke="none"/);
});

test("normalize keeps currentColor body", () => {
  assert.match(normalize(SAMPLE), /currentColor/);
});

// ── TC-6 — id/defs-safe inlining (FR-7) ─────────────────────────────────────
test("makeIdsSafe namespaces ids and references", () => {
  const out = makeIdsSafe('<rect id="bg"/><use href="#bg"/><path fill="url(#bg)"/>', "u1");
  assert.match(out, /id="bg-u1"/);
  assert.match(out, /href="#bg-u1"/);
  assert.ok(out.includes("url(#bg-u1)"));
  assert.ok(!/id="bg"/.test(out));
});

test("distinct suffixes yield non-colliding ids", () => {
  const rec = toRecord(SAMPLE);
  const a = makeIdsSafe(rec.body, "i1");
  const b = makeIdsSafe(rec.body, "i2");
  const ids = (s) => new Set([...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const ia = ids(a); const ib = ids(b);
  assert.ok(ia.size && [...ia].every((x) => !ib.has(x)));
});
