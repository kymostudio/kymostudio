---
title: BPMN 2.0 Import — Introduction
document_id: INTRO-BPMN-PARSER-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of the kymo BPMN importer, renderers, and DSL
review_cycle: On phase completion, or on BPMN-mapping change
supersedes: null
related_documents:
  - PROD-BPMN-PARSER-001         # Product description (ConOps & stakeholder needs)
  - FEAT-BPMN-PARSER-001         # Requirements
  - DESIGN-BPMN-PARSER-001       # Design
  - TEST-BPMN-PARSER-001         # Test documentation
  - PLAN-BPMN-PARSER-001         # Plan
  - BPMN-MAP-001                 # BPMN element mapping (this feature realises the import direction)
  - DESIGN-BPMN-EXPORT-001       # BPMN export design (the inverse / round-trip counterpart)
  - REF-BPMNIO-CMP-001           # bpmn.io comparison (round-trip benchmark)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - import
  - parser
  - diagram-interchange
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Import — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-BPMN-PARSER-001                                       |
| Version      | 1.1                                                         |
| Status       | Released                                                    |
| Issue Date   | 2026-05-25                                                  |
| Owner        | `diagrams/` project                                         |
| Related      | PROD-BPMN-PARSER-001, FEAT-BPMN-PARSER-001, DESIGN-BPMN-PARSER-001, TEST-BPMN-PARSER-001, PLAN-BPMN-PARSER-001 |

## 1. Purpose and scope

This document introduces the **BPMN 2.0 import** feature — the parser that turns a
standard `.bpmn` file into a kymo `Diagram` — and is the entry point to its document
set. It states the problem, the concept, and the terminology, and maps the reader to
the requirements (FEAT-BPMN-PARSER-001), the design (DESIGN-BPMN-PARSER-001), the test
documentation (TEST-BPMN-PARSER-001), and the plan (PLAN-BPMN-PARSER-001). The set
conforms to ISO/IEC/IEEE 12207:2017 (life-cycle processes) and ISO/IEC/IEEE 15289:2019
(information-item content). The element-level mapping is normative in BPMN-MAP-001 and
is referenced, not duplicated, here.

## 2. Background

kymo authors diagrams from its own `.kymo` DSL, but the world's process models already
exist as **BPMN 2.0 XML** exported by Camunda Modeler, bpmn.io, SAP Signavio, Bizagi,
Visual Paradigm and ~20 other tools (REF-BPMN-001 surveys the standard). To render,
convert, or re-export those models, kymo must first **ingest** them. Unlike a
`.kymo` source, a `.bpmn` file already carries its own geometry in a **Diagram-
Interchange** (DI) section — shape bounds and edge waypoints — so importing is a
matter of *reading* layout, not *computing* it.

Two properties make this feature non-trivial and worth specifying on its own:

- It is the **inverse** of BPMN export (DESIGN-BPMN-EXPORT-001): the two together give
  a `.bpmn` → kymo → `.bpmn` round-trip, and they share one classification table.
- It exists as **two independent implementations** — Python (`from_bpmn`) and
  dependency-free TypeScript (`parseBpmn`) — kept at parity. The same `.bpmn` must
  import to the same model in both; that parity is now locked by a cross-language
  conformance suite (see TEST-BPMN-PARSER-001).

## 3. Feature concept

A **BPMN 2.0 XML importer** — `from_bpmn` (Python) / `parseBpmn` (JS) — that turns a
`.bpmn` document into a **fully-resolved** kymo `Diagram` the existing SVG renderer can
draw directly:

- **Geometry from DI**: each `<bpmndi:BPMNShape>` `<dc:Bounds>` gives a node's box;
  each `<bpmndi:BPMNEdge>` `<di:waypoint>` list gives a flow's polyline. Because the
  coordinates are authored in the file, **no layout or alignment pass runs** — `cli`
  skips `layout()` / `resolve_alignments()` for `.bpmn` sources.
- **Semantic → glyph mapping**: every flow-node element maps to a `bpmn-*` glyph
  `(shape, marker)`, and pools / lanes / groups / expanded sub-processes map to
  `Region`s — the exact reverse of BPMN-MAP-001's table.
- **Namespace-agnostic**: the parser matches on *local* tag names, so it accepts the
  `bpmn:` / `bpmn2:` / default-namespace prefix any tool emits.

The behaviour is specified as requirements in FEAT-BPMN-PARSER-001; the architecture,
classification, and geometry in DESIGN-BPMN-PARSER-001.

## 4. Audience

Engineers implementing or reviewing the kymo BPMN importer and its JS port, and
maintainers verifying cross-language parity and robustness against real-world `.bpmn`
corpora.

## 5. Terms and abbreviations

- **BPMN** — Business Process Model and Notation 2.0 (OMG; ISO/IEC 19510). See REF-BPMN-001.
- **DI** — BPMN Diagram Interchange: the `<bpmndi:*>` geometry (shape bounds, edge waypoints).
- **`BPMNShape` / `dc:Bounds`** — a node's authored box (`x`, `y`, `width`, `height`).
- **`BPMNEdge` / `di:waypoint`** — a flow's authored polyline points.
- **Semantic model** — the `<process>` / `<collaboration>` element tree (the *meaning*, distinct from the *diagram*).
- **Glyph / marker** — a kymo `bpmn-*` shape and its sub-type marker (event-definition / task-type / gateway-type), carried in `Component.icon`.
- **Pool / lane** — BPMN swimlanes; imported as `Region`s (`pool` / `lane`).
- **Emitter** — the inverse output back-end `to_bpmn` (DESIGN-BPMN-EXPORT-001).

## 6. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–`04-TEST`) and a **living plan** (`PLAN.md` + `CR/`). The documents for bpmn-parser:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | PROD-BPMN-PARSER-001 | *what product problem & whose needs (`SN-BPMN-PARSER`)?* |
| 01 | `01-INTRO.md` (this) | INTRO-BPMN-PARSER-001 | *where do I start?* |
| 02 | `02-FEATURE.md` | FEAT-BPMN-PARSER-001 | *what must it do? (requirements, `FR`/`NFR`)* |
| 03 | `03-DESIGN.md` | DESIGN-BPMN-PARSER-001 | *how is it built?* |
| 04 | `04-TEST.md` | TEST-BPMN-PARSER-001 | *how do we know it's right?* |
| — | `docs/specs/bpmn-parser/PLAN.md` | PLAN-BPMN-PARSER-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Reading order: **`01-INTRO`** (this) → **`00-PRODUCT`** (product context + `SN-BPMN-PARSER` needs) →
**`02-FEATURE`** → **`03-DESIGN`** → **`04-TEST`**; for delivery status read `PLAN-BPMN-PARSER-001`.
Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only. The element mapping shared with export is `BPMN-MAP-001`; the standard itself
is `REF-BPMN-001`.

- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/bpmn-parser/CR/` and re-baselined (bump version + record in Annex A).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — retroactive spec of the shipped BPMN importer; cross-language Python↔JS parity locked by the conformance suite (TEST-BPMN-PARSER-001). |
| 1.1 | 2026-05-25 | Vũ Anh | **Doc reorganization.** §6 trimmed to a document map and adds `00-PRODUCT` (`PROD-BPMN-PARSER-001`); reading order + change-management updated. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-parser/01-INTRO.md`; the authoritative source
is the main-branch working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone with
repository read access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set
(REQ/DSN/TST/PLAN) consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any feature change, reconcile it with
FEAT-BPMN-PARSER-001 (the normative requirements) and BPMN-MAP-001 (the normative
mapping) before release.
