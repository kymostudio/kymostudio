---
title: kymo.json Interchange Format — Requirements
document_id: FEAT-KYMOJSON-001
version: "1.2"
issue_date: 2026-06-06
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the kymo.json serializer/loader
review_cycle: On phase completion, or on schema change
supersedes: null
related_documents:
  - DESIGN-KYMOJSON-001         # Design
  - TEST-KYMOJSON-001           # Test documentation
  - PLAN-KYMOJSON-001           # Plan
  - KYMOJSON-MAP-001            # The normative schema
authors:
  - Vũ Anh
language: en
keywords:
  - kymo.json
  - requirements
  - round-trip
  - traceability
  - product-description
  - conops
  - stakeholder-requirements
  - serialization
  - interchange
  - intermediate-representation
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# kymo.json Interchange Format — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-KYMOJSON-001                                  |
| Version      | 1.2                                                |
| Status       | Released                                           |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-KYMOJSON-001, TEST-KYMOJSON-001, PLAN-KYMOJSON-001, KYMOJSON-MAP-001 |

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.
Each requirement carries a stable ID for traceability from TEST-KYMOJSON-001. Schema:
KYMOJSON-MAP-001; realisation: DESIGN-KYMOJSON-001.

---

## Part A — Product context (ConOps & Stakeholder Requirements)

> This part owns the `SN-KYMOJSON-NN` stakeholder needs; the requirements (Part C)
> derive `FR`/`NFR` from them.

### A.1 Problem & motivation

kymo's architecture has a clean seam: front-ends (the `.kymo` DSL parser the BPMN
importer `DESIGN-BPMN-PARSER-001`, a `.py` `DIAGRAM`) build a resolved `Diagram`; back-ends (SVG,
Figma, Excalidraw, WebP, BPMN export `BPMN-MAP-001`) turn it into output. But that resolved model could
never be **persisted** — every render re-parsed from source, and the model was observable only through
a renderer or as a throwaway conformance-test artifact. A serialized model unlocks **caching,
VCS-diffing, inspection, and a stable hand-off** between the Python and JS implementations — the role
an intermediate representation plays for a compiler.

### A.2 Users & context of operations (ConOps)

- **Who:** engineers and tooling that need to cache, diff, inspect, or exchange a resolved kymo
  `Diagram`; the maintainers of the kymo serializers and their consumers.
- **The artifact:** **`.kymo.json`** — a versioned, lossless JSON serialization of the resolved
  `Diagram`. **Bidirectional** (written from any `Diagram` via CLI `--json` / library `export` /
  `toKymoJson`; read back into a `Diagram` that renders identically via `parse` / `parseKymoJson`),
  **lossless** (includes `layout_trees`, the `layout { }` auto-layout AST the Figma back-end consumes),
  and **JSON** (human-inspectable, tooling-friendly: `jq`, schema validation).
- **Substrate it builds on:** the resolved `Diagram` produced by the front-end pipeline (parse →
  layout → alignment), in both `packages/python` and `packages/js`, kept at parity by the conformance
  suite. It follows the norm for IRs that decouple front-ends from back-ends (Pandoc JSON AST, LLVM IR,
  Excalidraw/tldraw scene files), as opposed to write-only render dumps.

### A.3 Goals & non-goals

- **Goals:** a versioned, lossless, bidirectional JSON serialization of the resolved `Diagram`;
  deterministic, byte-stable output; cross-language byte-parity (Python ↔ JS) including `layout_trees`;
  render-equivalence after a round-trip; no new runtime dependencies.
- **Non-goals (v1):** a model → `.kymo` DSL back-emitter (round-trips the *model*, not the original
  `.kymo` text/comments); editor ephemera (selection/UI/undo state); schema evolution beyond
  ignore-unknown-fields (migrations deferred). The normative schema is `KYMOJSON-MAP-001`.

### A.4 Stakeholder needs (`SN-KYMOJSON`)

| ID | Need |
|----|------|
| `SN-KYMOJSON-01` | The resolved kymo `Diagram` SHALL be **persistable to a file** and loadable back, so a render need not re-parse the original source every time. |
| `SN-KYMOJSON-02` | The persisted model SHALL be **lossless** — a re-loaded diagram is faithful to every back-end (including the Figma back-end's `layout_trees`). |
| `SN-KYMOJSON-03` | The format SHALL be **human-inspectable and tooling-friendly** (JSON: `jq`, schema validation, VCS-diffing), not an opaque dump. |
| `SN-KYMOJSON-04` | The model SHALL be **exchangeable between the Python and JS implementations** — a stable hand-off whose output is byte-identical across languages. |

### A.5 Scope

**In scope (product level):** a versioned, lossless, bidirectional `.kymo.json` serialization of the
resolved `Diagram`, mirrored in `packages/python` and `packages/js`, plus a CLI `--json` output target
and a `.kymo.json` input source. **Out of scope (v1):** see §A.3 non-goals; Part C §4 carries the
detailed constraints/out-of-scope list, and the normative schema is `KYMOJSON-MAP-001`.

---

## Part B — Introduction

### B.1 Purpose and scope

This document introduces the **`.kymo.json`** format — a serialization of the
resolved kymo `Diagram` — and is the entry point to its document set. It states the
problem, the concept, and the terminology, and maps the reader to the requirements (Part C),
the design (DESIGN-KYMOJSON-001), the test documentation (TEST-KYMOJSON-001), and the plan
(PLAN-KYMOJSON-001). The normative schema is KYMOJSON-MAP-001; this set conforms to
ISO/IEC/IEEE 12207:2017 and 15289:2019.

### B.2 Background

kymo's architecture has a clean seam: front-ends (the `.kymo` DSL parser the BPMN importer DESIGN-BPMN-PARSER-001, a `.py` `DIAGRAM`) build a resolved
`Diagram`; back-ends (SVG, Figma, Excalidraw, WebP, BPMN export BPMN-MAP-001) turn it
into output. But that resolved model could never be **persisted** — every render
re-parsed from source, and the model was observable only through a renderer or as a
throwaway conformance-test artifact. A serialized model unlocks caching, VCS-diffing,
inspection, and a stable hand-off between the Python and JS implementations — the role
an intermediate representation plays for a compiler.

### B.3 Feature concept

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

Behaviour is specified in Part C; the schema in KYMOJSON-MAP-001; the
architecture in DESIGN-KYMOJSON-001.

### B.4 Audience

Engineers implementing or reviewing the kymo serializers and their consumers, and
maintainers verifying round-trip fidelity and cross-language parity.

### B.5 Terms and abbreviations

- **Resolved `Diagram`** — the model after the front-end pipeline (parse → layout →
  alignment); positions are absolute.
- **IR / interchange** — a stable serialized model at the front-end/back-end seam.
- **Envelope** — the `{format, version, diagram}` wrapper (KYMOJSON-MAP-001).
- **`layout_trees`** — the `layout { }` auto-layout AST; consumed by the Figma back-end.
- **Load-fixpoint** — `export(parse(x)) == x`.

### B.6 Document map

This feature's docs use a two-layer model in this folder — a **baselined spec**
(`01-REQUIREMENTS`–`03-TEST`) and a **living plan** (`04-PLAN.md` + `CR/`). The documents for kymo-json:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` | `FEAT-KYMOJSON-001` | *what product problem, whose needs, and what must it do? (ConOps + StRS + SRS, `SN-KYMOJSON`, `FR`/`NFR`)* |
| 02 | `02-DESIGN.md` | `DESIGN-KYMOJSON-001` | *how is it built?* |
| 03 | `03-TEST.md` | `TEST-KYMOJSON-001` | *how do we know it's right?* |
| — | `docs/specs/kymo-json/04-PLAN.md` | `PLAN-KYMOJSON-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only. The normative schema is **KYMOJSON-MAP-001**.

**Change management:** a change to this baselined spec is raised as a change-request in
`docs/specs/kymo-json/CR/` and re-baselined (bump version + record in Annex A).

---

## Part C — Requirements (SRS)

Stakeholder needs (`SN-KYMOJSON-01..04`, ISO 29148 §6.4.2 ConOps) are owned by Part A:
persist the resolved kymo `Diagram` to a versioned JSON file and load it back, so the model can be
cached, diffed, inspected, exchanged between the Python and JS implementations, and fed to any back-end
without re-parsing the original source. This part specifies the serializer/loader behaviour and surface
that meets those needs; the scope/out-of-scope boundary is in §C.4.

### C.1 Scope and stakeholder needs

Stakeholder needs (`SN-KYMOJSON-01..04`, ISO 29148 §6.4.2 ConOps) are owned by the product
description in **Part A** (§A.4): persist the resolved kymo `Diagram` to a
versioned JSON file and load it back, so the model can be cached, diffed, inspected, exchanged between
the Python and JS implementations, and fed to any back-end without re-parsing the original source.
This section specifies the serializer/loader behaviour and surface that meets those needs; the
scope/out-of-scope boundary is in §C.4.

### C.2 Functional requirements

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

### C.3 Non-functional requirements

- **NFR-1** **Cross-language parity** — for the same source, Python and JS SHALL emit
  **byte-identical** `.kymo.json` (incl. `layout_trees`), and each SHALL load the
  other's file to the same model. The model body is the single-source serializer the
  conformance suite compares.
- **NFR-2** **Render-equivalence** — `render(load(export(d)))` SHALL equal `render(d)`
  for every back-end; the Figma back-end SHALL remain on its hybrid (nested-frame) path.
- **NFR-3** **No new runtime dependencies** — Python stdlib `json`; JS `JSON`.
- **NFR-4** **Versioned & forward-compatible** — a mandatory top-level `version`; the
  `"format"` key is the authoritative type marker regardless of filename.

### C.4 Constraints, assumptions, out-of-scope (v1)

- **Resolved model, not editable source** — `.kymo.json` round-trips the model, not the
  original `.kymo` text/comments; there is no model → `.kymo` DSL back-emitter.
- **No editor ephemera** — selection/UI/undo state is not part of the model.
- **Schema evolution** beyond ignore-unknown-fields (migrations) is deferred.

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description (FEAT-KYMOJSON-001). Extracted from FEAT-KYMOJSON-001 §1–§3 (purpose/background/concept) and FEAT-KYMOJSON-001 §1 (scope & stakeholder needs); minted feature-scoped needs `SN-KYMOJSON-01..04`. |
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue of FEAT-KYMOJSON-001 — requirements for the bidirectional, lossless `.kymo.json` format, traced in TEST-KYMOJSON-001. |
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue of FEAT-KYMOJSON-001 — introduces the `.kymo.json` bidirectional, lossless resolved-model interchange format. |
| 1.1     | 2026-05-25 | Vũ Anh | FEAT-KYMOJSON-001 §6 reworked to document map; §1 reading map updated to include product description. |
| 1.1     | 2026-05-25 | Vũ Anh | FEAT-KYMOJSON-001 §1 stakeholder needs moved to FEAT-KYMOJSON-001; §1 now points there. `FEAT-KYMOJSON-001` added to related documents. No requirement content changed. |
| 1.2     | 2026-06-06 | Vũ Anh | **Consolidation.** FEAT-KYMOJSON-001 (00-PRODUCT), FEAT-KYMOJSON-001 (01-INTRO), and FEAT-KYMOJSON-001 (02-FEATURE) merged losslessly into this single `01-REQUIREMENTS.md` under Parts A/B/C. Folder normalised to 4-file structure. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository at `docs/specs/kymo-json/01-REQUIREMENTS.md`;
the authoritative source is the main-branch working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes; available to anyone with repository read
access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (`DESIGN`/`TEST`/`PLAN`)
and `KYMOJSON-MAP-001` consistent; increment `version`; append a row to Annex A. New stakeholder needs
are minted in Part A only, through a baseline or an approved change-request. Adding/changing a
requirement requires: edit the relevant FR/NFR (preserving IDs); update TEST-KYMOJSON-001's
traceability matrix and KYMOJSON-MAP-001 as needed.

### B.4 Backwards Compatibility
Requirement IDs (`FR-`/`NFR-`) and stakeholder need IDs (`SN-KYMOJSON-`) are stable; a removed
item SHALL be marked withdrawn (not re-used) so traceability links remain valid. On any feature
change, reconcile with KYMOJSON-MAP-001 (schema) and DESIGN-KYMOJSON-001 (design) before release.
