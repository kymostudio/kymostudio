---
title: BPMN 2.0 Import — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-BPMN-PARSER-001
version: "0.1"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the BPMN importer; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-BPMN-PARSER-001
  - FEAT-BPMN-PARSER-001
  - BPMN-MAP-001
  - REF-BPMN-001
  - DESIGN-BPMN-EXPORT-001
  - KYMO-DSL-001
  - REF-BPMNIO-CMP-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - bpmn
  - import
  - parser
  - diagram-interchange
---

# BPMN 2.0 Import — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-BPMN-PARSER-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-PARSER-001`, `FEAT-BPMN-PARSER-001` (the SRS derived from the needs below) |

> This doc owns the `SN-BPMN-PARSER-NN`
> stakeholder needs; the SRS (`FEAT-BPMN-PARSER-001`) derives `FR`/`NFR` from them.

## 1. Problem & motivation

kymo authors diagrams from its own `.kymo` DSL, but the world's process models already exist as
**BPMN 2.0 XML** exported by Camunda Modeler, bpmn.io, SAP Signavio, Bizagi, Visual Paradigm and ~20
other tools (`REF-BPMN-001` surveys the standard). To render, convert, or re-export those models,
kymo must first **ingest** them. Unlike a `.kymo` source, a `.bpmn` file already carries its own
geometry in a **Diagram-Interchange** (DI) section — shape bounds and edge waypoints — so importing
is a matter of *reading* layout, not *computing* it.

The feature is a **BPMN 2.0 XML importer** — `from_bpmn` (Python) / `parseBpmn` (JS) — that turns a
`.bpmn` document into a **fully-resolved** kymo `Diagram` the existing SVG renderer can draw directly:
geometry comes from DI (each `<bpmndi:BPMNShape>` `<dc:Bounds>` gives a node box, each
`<bpmndi:BPMNEdge>` `<di:waypoint>` list a flow polyline — so **no layout/alignment pass runs**); every
flow-node element maps to a `bpmn-*` glyph and pools/lanes/groups/expanded-subprocesses map to
`Region`s (the exact reverse of `BPMN-MAP-001`'s table); and the parser is **namespace-agnostic**,
matching on *local* tag names so it accepts the `bpmn:` / `bpmn2:` / default-namespace prefix any tool
emits.

Two properties make it non-trivial and worth specifying on its own: it is the **inverse** of BPMN
export (`DESIGN-BPMN-EXPORT-001`) — the two together give a `.bpmn` → kymo → `.bpmn` round-trip and
share one classification table; and it exists as **two independent implementations** kept at parity,
now locked by a cross-language conformance suite (`TEST-BPMN-PARSER-001`).

## 2. Users & context of operations (ConOps)

- **Who:** users bringing real-world `.bpmn` models (from Camunda, bpmn.io, Signavio, Bizagi, Visual
  Paradigm, …) into kymo to render, convert, or re-export them, plus engineers and maintainers
  verifying cross-language parity and robustness against real-world corpora.
- **Substrate it builds on (unchanged):** the kymo `Diagram` model + SVG renderer (the importer feeds
  it a fully-resolved diagram); the shared classification with BPMN export (`DESIGN-BPMN-EXPORT-001`,
  one source-of-truth table); and the CLI dispatch, which routes `.bpmn` straight to the importer.
- **Scenario:** a `.bpmn` file with a DI section is parsed into a fully-resolved `Diagram` whose
  geometry is read (not computed) — `cli` skips `layout()` / `resolve_alignments()` — so the renderer
  draws it directly; the same file imports to the same model in Python and JS.

## 3. Goals & non-goals

- **Goals:** turn a standard BPMN 2.0 XML file into a fully-resolved kymo `Diagram` (geometry from DI;
  semantic elements → `bpmn-*` glyphs; containers → `Region`s), namespace-agnostically; keep the two
  implementations (`from_bpmn` / `parseBpmn`) at **byte-for-byte model parity**; robust over the full
  MIWG corpus; no new runtime deps; no layout pass.
- **Non-goals (v1):** DI-less files (no geometry to read — out of scope); lossless handling of advanced
  containers (vertical pools normalised to horizontal; pools beyond the first and nested
  `<childLaneSet>` hierarchies flattened); executable semantics (`<conditionExpression>` bodies,
  listeners, forms, IO not interpreted); and element types outside `BPMN-MAP-001`'s catalogue (skipped,
  not approximated).

## 4. Stakeholder needs (`SN-BPMN-PARSER`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-PARSER-01` | kymo must **ingest** standard BPMN 2.0 XML — as emitted by Camunda, bpmn.io, Signavio and ~20 peer tools — into a fully-resolved `Diagram`, so it can render, convert, and re-export real-world process models. | The world's process models already exist as `.bpmn`; kymo must read them to participate in the ecosystem. |
| `SN-BPMN-PARSER-02` | Import must **read** the file's authored Diagram-Interchange geometry rather than computing layout — node boxes from `<dc:Bounds>`, flow polylines from `<di:waypoint>`s — so no auto-layout/alignment pass perturbs it. | DI carries the layout; recomputing it would discard the author's intent. |
| `SN-BPMN-PARSER-03` | The parser must be **namespace-agnostic** and **robust**: accept the `bpmn:` / `bpmn2:` / default-namespace prefix any tool emits, and parse the full vendored MIWG corpus (~120 files) without raising or producing a partial/corrupt `Diagram`. | Real-world files vary in namespacing and encoding; robustness is a product property. |
| `SN-BPMN-PARSER-04` | The capability must exist as **two independent implementations** (`from_bpmn` in Python, `parseBpmn` in JS) that import the **same** `.bpmn` to the **same** canonical model, the JS one dependency-free. | Cross-language model parity is the headline guarantee, locked by the conformance suite. |

## 5. Scope

**In scope (product level):** the `from_bpmn` / `parseBpmn` importer — DI-geometry resolution,
namespace-agnostic semantic → `bpmn-*` glyph mapping, container (`pool`/`lane`/`group`/expanded
sub-process) → `Region` mapping, coordinate normalisation, and cross-language model parity — mirrored
in Python and JS, no layout pass, no new runtime deps. **Out of scope (v1):** DI-less files, lossless
advanced containers, executable semantics, and out-of-catalogue element types (see §3 non-goals; the
SRS `FEAT-BPMN-PARSER-001` §4 records the deferral).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `INTRO-BPMN-PARSER-001` §1–3 (problem/concept) and the stakeholder-needs portion of `FEAT-BPMN-PARSER-001` §1; minted `SN-BPMN-PARSER-01..04` (feature-scoped). |
