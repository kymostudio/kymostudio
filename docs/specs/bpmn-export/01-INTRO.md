---
title: BPMN 2.0 Export — Introduction
document_id: INTRO-BPMN-EXPORT-001
version: "1.0"
issue_date: 2026-05-23
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of the kymo renderers, BPMN importer, and DSL
review_cycle: On phase completion, or on BPMN-mapping change
supersedes: null
related_documents:
  - FEAT-BPMN-EXPORT-001    # Requirements
  - DESIGN-BPMN-EXPORT-001    # Design
  - TEST-BPMN-EXPORT-001    # Test documentation
  - PLAN-BPMN-EXPORT-001   # Plan
  - BPMN-MAP-001                 # BPMN importer element mapping (this feature inverts it)
  - KYMO-DSL-001                # kymo DSL language specification (bpmn { } block)
  - DESIGN-BPMN-DSL-001       # BPMN-in-DSL design
  - REF-BPMNIO-CMP-001          # bpmn.io comparison (lossless round-trip benchmark)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - export
  - round-trip
  - interchange
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Export — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-BPMN-EXPORT-001                                        |
| Version      | 1.0                                                         |
| Status       | Released                                                    |
| Issue Date   | 2026-05-23                                                  |
| Owner        | `diagrams/` project                                         |
| Related      | FEAT-BPMN-EXPORT-001, DESIGN-BPMN-EXPORT-001, TEST-BPMN-EXPORT-001, PLAN-BPMN-EXPORT-001 |

## 1. Purpose and scope

This document introduces the **BPMN 2.0 export** feature and is the entry point to
its document set. It states the problem, the concept, and the terminology, and maps
the reader to the requirements (FEAT-BPMN-EXPORT-001), the design
(DESIGN-BPMN-EXPORT-001), the test documentation (TEST-BPMN-EXPORT-001), and
the plan (PLAN-BPMN-EXPORT-001). The set conforms to ISO/IEC/IEEE 12207:2017
(life-cycle processes) and ISO/IEC/IEEE 15289:2019 (information-item content).

## 2. Background

kymo can already **import** BPMN 2.0 XML (`from_bpmn`, BPMN-MAP-001) and, since
KYMO-DSL-001 §6.9, **author** BPMN textually with the `bpmn { }` block. But all of
kymo's *output* paths are **one-way**: SVG, animated WebP, Figma, and Excalidraw —
none is a standard, machine-readable interchange format. The tool comparisons under
`docs/softwares/` make this the recurring gap: bpmn.io (REF-BPMNIO-CMP-001), Camunda
(REF-CAMUNDA-CMP-001), Signavio (REF-SIGNAVIO-CMP-001), and Flowable
(REF-FLOWABLE-CMP-001) all *"round-trip standard BPMN 2.0 XML losslessly"* while
*"kymo's exporters are one-way with no standard interchange format."*

## 3. Feature concept

Add a **BPMN 2.0 XML emitter** — `to_bpmn` — that is the **inverse of `from_bpmn`**:
it turns a kymo `Diagram` (whose components are `bpmn-*` glyphs, whether imported
from `.bpmn` or authored with the `bpmn { }` block) back into a complete, well-formed
BPMN 2.0 document — both the **semantic** model (`<process>` / `<collaboration>`
with events, tasks, gateways, flows) and the **Diagram-Interchange** geometry
(`<bpmndi:BPMNDiagram>` with shape bounds + edge waypoints).

- **Round-trip**: `.bpmn` → import → kymo `Diagram` → **export** → `.bpmn` preserves
  the structure and layout — closing the interchange gap above.
- **Inverse mapping**: every `(shape, marker)` and `bpmn_flow` maps back to the BPMN
  element it came from (the exact reverse of BPMN-MAP-001's table).
- **Reuse**: emits a `.bpmn` from any `Diagram`; the CLI gains a `--bpmn` target and
  the Python/JS libraries gain `export` / `toBpmn`.

The behaviour is specified as requirements in FEAT-BPMN-EXPORT-001; the
architecture and mapping in DESIGN-BPMN-EXPORT-001.

## 4. Audience

Engineers implementing or reviewing the kymo emitters and BPMN importer, and
maintainers verifying round-trip fidelity against real-world `.bpmn` corpora.

## 5. Terms and abbreviations

- **BPMN** — Business Process Model and Notation 2.0 (OMG).
- **DI** — BPMN Diagram Interchange: the `<bpmndi:*>` geometry (shape bounds, edge waypoints).
- **Semantic model** — the `<process>` / `<collaboration>` element tree (the *meaning*, distinct from the *diagram*).
- **Round-trip** — import then export (or vice-versa) preserving structure + layout.
- **Importer** — `from_bpmn` (BPMN-MAP-001); this feature is its inverse.
- **Emitter** — an output back-end (`to_svg`, `to_figma`, …); `to_bpmn` is the new one.

## 6. Document map

Read in order:

| # | Information item | Document | Standard role (15289) |
|---|------------------|----------|-----------------------|
| 1 | Introduction (this) | INTRO-BPMN-EXPORT-001 | Concept / overview |
| 2 | Requirements | FEAT-BPMN-EXPORT-001 | Requirements specification |
| 3 | Design | DESIGN-BPMN-EXPORT-001 | Design / architecture |
| 4 | Test documentation | TEST-BPMN-EXPORT-001 | Test plan / cases / traceability |
| 5 | Plan | PLAN-BPMN-EXPORT-001 | Plan |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue. |
| 1.0 | 2026-05-24 | Vũ Anh | Released — P4 complete: BPMN-MAP-001 Export section added; doc set marked Released; importer-mapping citations repointed. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-export/01-INTRO.md`; the authoritative
source is the main-branch working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone with
repository read access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set
(REQ/DSN/TST/PLAN) consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any feature change, reconcile it with
FEAT-BPMN-EXPORT-001 (the normative requirements) before release.
