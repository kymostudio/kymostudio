---
title: kymo.json Interchange Format — Requirements
document_id: FEAT-KYMOJSON-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the kymo.json serializer/loader
review_cycle: On phase completion, or on schema change
supersedes: null
related_documents:
  - PROD-KYMOJSON-001           # Product description (owns the SN- stakeholder needs)
  - INTRO-KYMOJSON-001          # Introduction
  - DESIGN-KYMOJSON-001         # Design
  - TEST-KYMOJSON-001           # Test documentation
  - PLAN-KYMOJSON-001           # Plan
  - KYMOJSON-MAP-001            # The normative schema
  - KYMO-DSL-001                # kymo DSL front-end
authors:
  - Vũ Anh
language: en
keywords:
  - kymo.json
  - requirements
  - round-trip
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo.json Interchange Format — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-KYMOJSON-001                                  |
| Version      | 1.1                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | PROD-KYMOJSON-001 (stakeholder needs), INTRO-KYMOJSON-001, DESIGN-KYMOJSON-001, TEST-KYMOJSON-001, PLAN-KYMOJSON-001 |

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.
Each requirement carries a stable ID for traceability from TEST-KYMOJSON-001. Concept:
INTRO-KYMOJSON-001; schema: KYMOJSON-MAP-001; realisation: DESIGN-KYMOJSON-001.

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-KYMOJSON-01..04`, ISO 29148 §6.4.2 ConOps) are owned by the product
description **`PROD-KYMOJSON-001`** (`00-PRODUCT.md`): persist the resolved kymo `Diagram` to a
versioned JSON file and load it back, so the model can be cached, diffed, inspected, exchanged between
the Python and JS implementations, and fed to any back-end without re-parsing the original source.
This document specifies the serializer/loader behaviour and surface that meets those needs; the
scope/out-of-scope boundary is in §4.

## 2. Functional requirements

**Serialize (write)**
- **FR-1** A serializer SHALL turn a resolved `Diagram` into a `.kymo.json` string: an
  envelope `{ "format": "kymo.json", "version": <int>, "diagram": <model> }`.
- **FR-2** The `diagram` body SHALL contain `width`, `height`, `title`, `subtitle`, and
  the full `components` / `regions` / `edges` field set (snake_case; points/bounds as
  arrays; integral floats as ints; `-0`→`0`; parse order preserved) per KYMOJSON-MAP-001.
- **FR-3** The body SHALL include `layout_trees` (the `layout { }` AST) in the canonical
  leaf/group form, so the serialization is **lossless** for the Figma back-end. The
  transient `bpmn_blocks` AST SHALL NOT be serialized.
- **FR-4** Output SHALL be **deterministic** (byte-stable for a given `Diagram`).

**Load (read)**
- **FR-5** A loader SHALL turn a `.kymo.json` string back into a fully-resolved
  `Diagram` (the inverse of FR-1/FR-3), rejecting input whose `format` is not
  `"kymo.json"`, and SHALL ignore unknown top-level fields (forward compatibility).
- **FR-6** A loaded `Diagram` is already resolved; consumers SHALL NOT run a layout or
  alignment pass over it (the CLI routes `.kymo.json` like `.bpmn`).

**Interface**
- **FR-7** The Python CLI SHALL gain a `--json` output target (writing `<stem>.kymo.json`)
  and SHALL accept a `.kymo.json` input source; the Python library SHALL expose
  `to_kymojson.export(d)` / `from_kymojson.parse(text)`.
- **FR-8** The feature SHALL exist with equivalent functionality in both
  `packages/python` and `packages/js` (`toKymoJson(d)` / `parseKymoJson(text)`).

## 3. Non-functional requirements

- **NFR-1** **Cross-language parity** — for the same source, Python and JS SHALL emit
  **byte-identical** `.kymo.json` (incl. `layout_trees`), and each SHALL load the
  other's file to the same model. The model body is the single-source serializer the
  conformance suite compares.
- **NFR-2** **Render-equivalence** — `render(load(export(d)))` SHALL equal `render(d)`
  for every back-end; the Figma back-end SHALL remain on its hybrid (nested-frame) path.
- **NFR-3** **No new runtime dependencies** — Python stdlib `json`; JS `JSON`.
- **NFR-4** **Versioned & forward-compatible** — a mandatory top-level `version`; the
  `"format"` key is the authoritative type marker regardless of filename.

## 4. Constraints, assumptions, out-of-scope (v1)

- **Resolved model, not editable source** — `.kymo.json` round-trips the model, not the
  original `.kymo` text/comments; there is no model → `.kymo` DSL back-emitter.
- **No editor ephemera** — selection/UI/undo state is not part of the model.
- **Schema evolution** beyond ignore-unknown-fields (migrations) is deferred.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — requirements for the bidirectional, lossless `.kymo.json` format, traced in TEST-KYMOJSON-001. |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to the new product description `PROD-KYMOJSON-001` (minted `SN-KYMOJSON-01..04`); §1 now points there. Added `PROD-KYMOJSON-001` to related documents. No requirement content changed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-json/02-FEATURE.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs);
update TEST-KYMOJSON-001's traceability matrix and KYMOJSON-MAP-001 as needed; increment
`version`; append a row to Annex A.

### B.4 Backwards Compatibility
Requirement IDs are stable; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid.
