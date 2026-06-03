---
title: kymo.json Interchange Format — Introduction
document_id: INTRO-KYMOJSON-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of the kymo model, serializers, and front/back-ends
review_cycle: On phase completion, or on schema change
supersedes: null
related_documents:
  - PROD-KYMOJSON-001           # Product description (ConOps + StRS)
  - FEAT-KYMOJSON-001           # Requirements
  - DESIGN-KYMOJSON-001         # Design
  - TEST-KYMOJSON-001           # Test documentation
  - PLAN-KYMOJSON-001           # Plan
  - KYMOJSON-MAP-001            # The normative schema (envelope + model body)
  - DESIGN-BPMN-PARSER-001      # BPMN importer front-end (produces this model)
  - BPMN-MAP-001                # BPMN import/export (a sibling format)
authors:
  - Vũ Anh
language: en
keywords:
  - kymo.json
  - serialization
  - intermediate-representation
  - interchange
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo.json Interchange Format — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-KYMOJSON-001                                          |
| Version      | 1.1                                                         |
| Status       | Released                                                    |
| Issue Date   | 2026-05-25                                                  |
| Owner        | `diagrams/` project                                         |
| Related      | PROD-KYMOJSON-001, FEAT-KYMOJSON-001, DESIGN-KYMOJSON-001, TEST-KYMOJSON-001, PLAN-KYMOJSON-001 |

## 1. Purpose and scope

This document introduces the **`.kymo.json`** format — a serialization of the
resolved kymo `Diagram` — and is the entry point to its document set. It states the
problem, the concept, and the terminology, and maps the reader to the product
description (PROD-KYMOJSON-001), the requirements (FEAT-KYMOJSON-001), the design
(DESIGN-KYMOJSON-001), the test documentation (TEST-KYMOJSON-001), and the plan
(PLAN-KYMOJSON-001). The normative schema is KYMOJSON-MAP-001; this set conforms to
ISO/IEC/IEEE 12207:2017 and 15289:2019.

## 2. Background

kymo's architecture has a clean seam: front-ends (the `.kymo` DSL parser the BPMN importer DESIGN-BPMN-PARSER-001, a `.py` `DIAGRAM`) build a resolved
`Diagram`; back-ends (SVG, Figma, Excalidraw, WebP, BPMN export BPMN-MAP-001) turn it
into output. But that resolved model could never be **persisted** — every render
re-parsed from source, and the model was observable only through a renderer or as a
throwaway conformance-test artifact. A serialized model unlocks caching, VCS-diffing,
inspection, and a stable hand-off between the Python and JS implementations — the role
an intermediate representation plays for a compiler.

## 3. Feature concept

A **versioned, lossless JSON serialization** of the resolved `Diagram`, named
`.kymo.json`:

- **Bidirectional** — written from any `Diagram` (CLI `--json`, library `export` /
  `toKymoJson`) and read back into a `Diagram` that renders identically (library
  `parse` / `parseKymoJson`; the CLI loads `.kymo.json` like any other source). This
  follows the norm for IRs that decouple front-ends from back-ends (Pandoc JSON AST,
  LLVM IR, Excalidraw/tldraw scene files), as opposed to write-only render dumps.
- **Lossless** — includes `layout_trees` (the `layout { }` auto-layout AST the Figma
  back-end consumes), so a re-loaded diagram is faithful to every back-end.
- **JSON** — human-inspectable and tooling-friendly (`jq`, schema validation); hence
  the `.kymo.json` extension rather than an opaque custom one.

Behaviour is specified in FEAT-KYMOJSON-001; the schema in KYMOJSON-MAP-001; the
architecture in DESIGN-KYMOJSON-001.

## 4. Audience

Engineers implementing or reviewing the kymo serializers and their consumers, and
maintainers verifying round-trip fidelity and cross-language parity.

## 5. Terms and abbreviations

- **Resolved `Diagram`** — the model after the front-end pipeline (parse → layout →
  alignment); positions are absolute.
- **IR / interchange** — a stable serialized model at the front-end/back-end seam.
- **Envelope** — the `{format, version, diagram}` wrapper (KYMOJSON-MAP-001).
- **`layout_trees`** — the `layout { }` auto-layout AST; consumed by the Figma back-end.
- **Load-fixpoint** — `export(parse(x)) == x`.

## 6. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec**
(`00-PRODUCT`–`04-TEST`) and a **living plan** (`PLAN.md` + `CR/`). The documents for kymo-json:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-KYMOJSON-001` | *what product problem & whose needs (`SN-KYMOJSON`)?* |
| 01 | `01-INTRO.md` | `INTRO-KYMOJSON-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-KYMOJSON-001` | *what must it do? (SRS, `FR`/`NFR`)* |
| 03 | `03-DESIGN.md` | `DESIGN-KYMOJSON-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-KYMOJSON-001` | *how do we know it's right?* |
| — | `docs/specs/kymo-json/PLAN.md` | `PLAN-KYMOJSON-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only. The normative schema is **KYMOJSON-MAP-001**.

**Change management:** a change to this baselined spec is raised as a change-request in
`docs/specs/kymo-json/CR/` and re-baselined (bump version + record in Annex A).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — introduces the `.kymo.json` bidirectional, lossless resolved-model interchange format. |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** §6 reworked to a document map that defers the ISO/lifecycle model to the standard and adds `00-PRODUCT` (`PROD-KYMOJSON-001`) + a change-management pointer to `docs/specs/kymo-json/CR/`; §1 reading map updated to include the product description. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-json/01-INTRO.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in alongside the feature; available to all repository readers.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (REQ/DSN/TST/PLAN)
and KYMOJSON-MAP-001 consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any feature change, reconcile it with
FEAT-KYMOJSON-001 (requirements) and KYMOJSON-MAP-001 (schema) before release.
