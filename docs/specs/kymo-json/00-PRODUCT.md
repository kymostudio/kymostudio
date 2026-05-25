---
title: kymo.json Interchange Format — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-KYMOJSON-001
version: "0.1"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the .kymo.json interchange format; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-KYMOJSON-001          # Introduction
  - FEAT-KYMOJSON-001           # Requirements (SRS derived from the needs below)
  - KYMOJSON-MAP-001            # The normative schema (envelope + model body)
  - KYMO-DSL-001                # kymo DSL front-end (produces this model)
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - kymo.json
  - serialization
  - interchange
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# kymo.json Interchange Format — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-KYMOJSON-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-KYMOJSON-001`, `FEAT-KYMOJSON-001` (the SRS derived from the needs below) |

> This doc owns the `SN-KYMOJSON-NN`
> stakeholder needs; the SRS (`FEAT-KYMOJSON-001`) derives `FR`/`NFR` from them.

## 1. Problem & motivation

kymo's architecture has a clean seam: front-ends (the `.kymo` DSL parser `KYMO-DSL-001`, the BPMN
importer `DESIGN-BPMN-PARSER-001`, a `.py` `DIAGRAM`) build a resolved `Diagram`; back-ends (SVG,
Figma, Excalidraw, WebP, BPMN export `BPMN-MAP-001`) turn it into output. But that resolved model could
never be **persisted** — every render re-parsed from source, and the model was observable only through
a renderer or as a throwaway conformance-test artifact. A serialized model unlocks **caching,
VCS-diffing, inspection, and a stable hand-off** between the Python and JS implementations — the role
an intermediate representation plays for a compiler.

## 2. Users & context of operations (ConOps)

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

## 3. Goals & non-goals

- **Goals:** a versioned, lossless, bidirectional JSON serialization of the resolved `Diagram`;
  deterministic, byte-stable output; cross-language byte-parity (Python ↔ JS) including `layout_trees`;
  render-equivalence after a round-trip; no new runtime dependencies.
- **Non-goals (v1):** a model → `.kymo` DSL back-emitter (round-trips the *model*, not the original
  `.kymo` text/comments); editor ephemera (selection/UI/undo state); schema evolution beyond
  ignore-unknown-fields (migrations deferred). The normative schema is `KYMOJSON-MAP-001`.

## 4. Stakeholder needs (`SN-KYMOJSON`)

| ID | Need |
|----|------|
| `SN-KYMOJSON-01` | The resolved kymo `Diagram` SHALL be **persistable to a file** and loadable back, so a render need not re-parse the original source every time. |
| `SN-KYMOJSON-02` | The persisted model SHALL be **lossless** — a re-loaded diagram is faithful to every back-end (including the Figma back-end's `layout_trees`). |
| `SN-KYMOJSON-03` | The format SHALL be **human-inspectable and tooling-friendly** (JSON: `jq`, schema validation, VCS-diffing), not an opaque dump. |
| `SN-KYMOJSON-04` | The model SHALL be **exchangeable between the Python and JS implementations** — a stable hand-off whose output is byte-identical across languages. |

## 5. Scope

**In scope (product level):** a versioned, lossless, bidirectional `.kymo.json` serialization of the
resolved `Diagram`, mirrored in `packages/python` and `packages/js`, plus a CLI `--json` output target
and a `.kymo.json` input source. **Out of scope (v1):** see §3 non-goals; the SRS (`FEAT-KYMOJSON-001`
§4) carries the detailed constraints/out-of-scope list, and the normative schema is `KYMOJSON-MAP-001`.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `INTRO-KYMOJSON-001` §1–§3 (purpose/background/concept) and `FEAT-KYMOJSON-001` §1 (scope & stakeholder needs); minted feature-scoped needs `SN-KYMOJSON-01..04`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository; the authoritative source is the main-branch working
tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes; available to anyone with repository read
access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (`INTRO`/`FEAT`/`DESIGN`/`TEST`/`PLAN`)
and `KYMOJSON-MAP-001` consistent; increment `version`; append a row to Annex A. New stakeholder needs
are minted here only, through a baseline or an approved change-request.

### B.4 Backwards Compatibility
This is the product context; on any feature change, reconcile it with `FEAT-KYMOJSON-001` (requirements)
and `KYMOJSON-MAP-001` (schema) before release.
