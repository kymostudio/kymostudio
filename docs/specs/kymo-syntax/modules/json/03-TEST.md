---
title: kymo.json Interchange Format — Test Documentation
document_id: TEST-KYMOJSON-001
version: "1.1"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the kymo.json serializer/loader
review_cycle: On phase completion, or on schema change
supersedes: null
related_documents:
  - FEAT-KYMOJSON-001          # Introduction
  - DESIGN-KYMOJSON-001         # Design
  - PLAN-KYMOJSON-001           # Plan
  - KYMOJSON-MAP-001            # The normative schema
authors:
  - Vũ Anh
language: en
keywords:
  - kymo.json
  - test
  - round-trip
  - conformance
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo.json Interchange Format — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-KYMOJSON-001                                  |
| Version      | 1.1                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-KYMOJSON-001, FEAT-KYMOJSON-001, DESIGN-KYMOJSON-001, PLAN-KYMOJSON-001 |

Verifies FEAT-KYMOJSON-001 (FR/NFR IDs). Covers 12207 Verification & Validation. The
headline checks are the **round-trip** (load-fixpoint + render-equivalence) and
**cross-language byte parity** of `.kymo.json`.

## 1. Test approach and levels

- **Unit** — the envelope shape; the layout-tree canonical form ↔ native conversion;
  array↔tuple coercion on load (Python).
- **Round-trip** — over the corpus (`samples/*.kymo` + `conformance/corpus/*.kymo`, and
  BPMN-imported models): `export → parse → export` is byte-stable, and `render(parse(
  export(d)))` equals `render(d)`.
- **Cross-language conformance** — Python and JS emit byte-identical `.kymo.json`
  (model body incl. `layout_trees`); each loads the other's file. This rides the
  existing golden conformance suite, whose model serializer **is** `.kymo.json`'s
  `model_dict`.

## 2. Test items, environment, tooling

`packages/python` (`uv run --group dev python -m pytest` — `tests/test_kymojson.py`,
`tests/test_conformance.py`), `packages/js` (`npm test` → `node --test` —
`tests/kymojson.test.js`, `tests/conformance.test.js`), and the CLI (`kymo --json`,
`kymo <file>.kymo.json`).

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-1** | Envelope | FR-1, NFR-4 | Output is `{format:"kymo.json", version:1, diagram:{…}}`; `diagram` has exactly the 8 model keys |
| **TC-2** | Model body | FR-2 | Body matches KYMOJSON-MAP-001 (snake_case, arrays, int-collapse, parse order, full field set) |
| **TC-3** | Layout trees | FR-3 | `layout { }` diagrams serialize `layout_trees` in leaf/group form; `bpmn_blocks` absent |
| **TC-4** | Load-fixpoint | FR-4, FR-5 | `export∘parse∘export` byte-identical; loaded layout trees equal the originals |
| **TC-5** | No-layout on load | FR-6 | `.kymo.json` loads fully positioned; `cli` runs neither `layout()` nor `resolve_alignments()` |
| **TC-6** | Reject foreign JSON | FR-5 | A non-`kymo.json` `format` is rejected (raises) |
| **TC-7** | CLI round-trip | FR-7 | `kymo x.kymo --json` then `kymo x.kymo.json` renders byte-identical SVG to `kymo x.kymo` |
| **TC-8** | Render-equivalence | NFR-2 | `render(parse(export(d)))` == `render(d)` across the corpus (incl. Figma hybrid path) |
| **TC-9** | Cross-language byte parity | FR-8, NFR-1 | Python and JS produce byte-identical `.kymo.json` (incl. `layout_trees`) per corpus file; conformance model goldens match |
| **TC-10** | No runtime deps | NFR-3 | Python stdlib `json`; JS `JSON`; CI carries no new deps |

## 4. Pass/fail criteria

A phase passes when its mapped cases pass and the full Python suite + JS `npm test`
are green. A cross-language `.kymo.json` mismatch (model body, incl. `layout_trees`) is
a **failure** to reconcile toward Python, not a re-baseline.

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-1 | TC-1 |
| FR-2 | TC-2 |
| FR-3 | TC-3 |
| FR-4 | TC-4 |
| FR-5 | TC-4, TC-6 |
| FR-6 | TC-5 |
| FR-7 | TC-7 |
| FR-8 | TC-9 |
| NFR-1 | TC-9 |
| NFR-2 | TC-8 |
| NFR-3 | TC-10 |
| NFR-4 | TC-1 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — test documentation for the `.kymo.json` round-trip + cross-language parity. |
| 1.1     | 2026-06-12 | Vũ Anh | **Relocated** into `docs/specs/kymo-syntax/modules/json/` (the kymo-syntax umbrella's json module). Annex B.1 path updated. No test content changed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-syntax/modules/json/03-TEST.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the traceability
matrix in the same revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used) so
traceability links remain valid.
