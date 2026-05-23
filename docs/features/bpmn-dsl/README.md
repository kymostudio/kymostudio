---
title: BPMN in the kymo DSL — Feature Documentation (Index)
status: Proposed
owner: diagrams/ project
authors:
  - Vũ Anh
language: en
note: Index/navigation only — not a numbered information item, so it carries no document_id. The numbered docs below are the 12207/15289 information items.
---

# BPMN in the kymo DSL — Feature Documentation

A Mermaid-style `bpmn { }` block for the kymo DSL: describe a process as typed
nodes + flows and have the engine lay it out (with optional `@ (x,y)` pins),
reusing the existing renderer.

This folder is a per-feature **document set** structured per ISO/IEC/IEEE
12207:2017 (life-cycle processes) and 15289:2019 (information-item content).
Read in order:

| # | Document | document_id | 15289 item |
|---|----------|-------------|------------|
| 1 | [Introduction](01-INTRO.md) | `FEAT-BPMN-DSL-001` | Concept / overview |
| 2 | [Requirements](02-FEATURE.md) | `FEAT-BPMN-DSL-REQ-001` | Requirements specification |
| 3 | [Design](03-DESIGN.md) | `FEAT-BPMN-DSL-DSN-001` | Design / architecture |
| 4 | [Test documentation](04-TEST.md) | `FEAT-BPMN-DSL-TST-001` | Test plan / cases / traceability |
| 5 | [Plan](05-PLAN.md) | `FEAT-BPMN-DSL-PLAN-001` | Plan |

Cross-references between these documents use `document_id`s (stable across
renames), per the repository's documentation convention. Related: the kymo DSL
spec `DSL-LANG-001` and the BPMN importer mapping `BPD-DGM-001`.

**Status:** Proposed — estimated ~32 story points (see `FEAT-BPMN-DSL-PLAN-001`
§6); implementation proceeds per its milestones.
