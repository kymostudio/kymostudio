---
title: BPMN 2.0 Import — Test Documentation
document_id: TEST-BPMN-PARSER-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the BPMN importer
review_cycle: On phase completion, or on BPMN-mapping change
supersedes: null
related_documents:
  - INTRO-BPMN-PARSER-001        # Introduction
  - FEAT-BPMN-PARSER-001         # Requirements (traced below)
  - DESIGN-BPMN-PARSER-001       # Design
  - PLAN-BPMN-PARSER-001         # Plan
  - BPMN-MAP-001                 # BPMN element mapping (the import table under test)
  - DESIGN-BPMN-EXPORT-001       # BPMN export (round-trip counterpart)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - import
  - test
  - conformance
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Import — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-BPMN-PARSER-001                               |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-BPMN-PARSER-001, FEAT-BPMN-PARSER-001, DESIGN-BPMN-PARSER-001, PLAN-BPMN-PARSER-001 |

Verifies FEAT-BPMN-PARSER-001 (FR/NFR IDs). Covers 12207 Verification & Validation.
The headline checks are **robustness over the full MIWG corpus** and **cross-language
import parity** (Python ≡ JS) against BPMN-MAP-001.

## 1. Test approach and levels

- **Unit** — the classification tables `(element tag → shape, marker)` and flow-kind
  rules; the DI `Bounds → centre` math and waypoint/label extraction; namespace
  local-name matching.
- **Integration** — `parse()` on whole `.bpmn` files (`samples/*.bpmn`, fixtures) → a
  resolved `Diagram` that renders to a valid SVG.
- **Corpus robustness** — the vendored MIWG corpus (`packages/python/tests/corpus_bpmn/`,
  ~120 files) is parsed + rendered and compared to a committed snapshot
  (`baseline.json`: status, node/edge counts, SVG hash); it gates every build.
- **Cross-language conformance (key)** — for every `.bpmn` in samples + fixtures + the
  full MIWG corpus, the Python and JS imports SHALL produce the **same canonical model**
  (`conformance/golden/bpmn_import.json`, Python-written; the JS suite asserts against it).

## 2. Test items, environment, tooling

`packages/python` (`uv run --group dev python -m pytest` — `tests/test_bpmn.py`,
`tests/test_bpmn_corpus.py`, `tests/test_bpmn_conformance.py`), `packages/js`
(`npm test` → `node --test` — `tests/bpmn.test.js`, `tests/bpmn-conformance.test.js`),
the shared conformance corpus + goldens under `conformance/`, and the MIWG corpus +
`baseline.json`.

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-1** | Node classification | FR-3 | Each element tag → expected `(shape, marker)`; `*EventDefinition` → marker; exclusive `X` only when `isMarkerVisible="true"` |
| **TC-2** | Flow mapping | FR-4 | `sequence`/`message`/`association`; `default` from source `default=`; `conditional` from `<conditionExpression>` (source not a gateway) |
| **TC-3** | DI geometry | FR-5 | `<dc:Bounds>` → centre `pos` + `size`; `<di:waypoint>`s → `Edge.points`; `<BPMNLabel>` → flow `label_pos` + node `label_box` |
| **TC-4** | Coordinate normalisation | FR-6 | Geometry shifted so the top-left extent is `(MARGIN, MARGIN)`; canvas sized from shifted extents |
| **TC-5** | Containers | FR-7 | Pools/lanes/groups/expanded subprocess → regions (`pool`/`lane`/`outer`/`inner`); collapsed subprocess → `bpmn-subprocess` component |
| **TC-6** | Namespace-agnostic | FR-2 | The same model is produced whether tags use `bpmn:` / `bpmn2:` / default namespace |
| **TC-7** | Resolved, no layout | FR-1, NFR-4 | `.bpmn` imports fully positioned; `cli` runs neither `layout()` nor `resolve_alignments()` |
| **TC-8** | MIWG corpus robustness | NFR-2 | All ~120 corpus files parse without raising; `baseline.json` (status/counts/SVG hash) matches — no drift |
| **TC-9** | Cross-language import parity | FR-8, NFR-1 | For samples + fixtures + 120 MIWG files, JS `parseBpmn` and Python `from_bpmn` produce the identical canonical model (`bpmn_import.json`); `known_divergences.json` empty |
| **TC-10** | Rounding parity | NFR-1 | Coordinates use half-to-even (`round` / `pyRound`); replacing `pyRound` with `Math.round` in the JS importer makes TC-9 fail (negative check) |
| **TC-11** | No runtime deps | NFR-3 | Python uses stdlib `ElementTree`; JS importer is dependency-free; CI carries no new deps |

## 4. Pass/fail criteria

A phase passes when its mapped test cases pass and the full Python suite (incl. the
BPMN corpus gate) and JS `npm test` are green. Any cross-language model mismatch on a
corpus file (`bpmn_import.json`) is a **failure** to be reconciled (default to Python),
or — only with explicit justification — tracked in `known_divergences.json`; it is not a
silent re-baseline. Corpus drift (changed status/counts/SVG hash) is likewise a failure.

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-1 | TC-7 |
| FR-2 | TC-6 |
| FR-3 | TC-1 |
| FR-4 | TC-2 |
| FR-5 | TC-3 |
| FR-6 | TC-4 |
| FR-7 | TC-5 |
| FR-8 | TC-9 |
| NFR-1 | TC-9, TC-10 |
| NFR-2 | TC-8 |
| NFR-3 | TC-11 |
| NFR-4 | TC-7 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — test documentation for the shipped BPMN importer, incl. the cross-language conformance gate. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-parser/04-TEST.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the traceability
matrix in the same revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used) so
traceability links remain valid.
