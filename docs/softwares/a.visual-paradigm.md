---
title: Visual Paradigm — External Reference
document_id: REF-VISUAL-PARADIGM-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - a.visual-paradigm.comparision.md
  - ../diagrams/bpmn/README.md
  - ../formats/kymo-dsl/README.md
  - ../diagrams/best-practices.md
authors:
  - Vũ Anh
language: en
keywords:
  - visual-paradigm
  - uml
  - bpmn
  - archimate
  - modeling-tool
  - prior-art
upstream:
  project: Visual Paradigm
  homepage: https://www.visual-paradigm.com/
  developer_site: https://www.visual-paradigm.com/features/bpmn-tool/
  license: Commercial (per-edition); free non-commercial Community Edition
  version_reviewed: "Visual Paradigm 17 line (2026)"
  access_date: 2026-05-20
---

# Visual Paradigm — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-VISUAL-PARADIGM-001                                     |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [Visual Paradigm](https://www.visual-paradigm.com/)           |
| License           | Commercial (+ free Community Edition)                         |
| Version Reviewed  | Visual Paradigm 17 line (2026)                               |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`visual-paradigm.comparision.md`](./a.visual-paradigm.comparision.md), [`bpmn/README.md`](../diagrams/bpmn/README.md), [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Visual Paradigm's design choices so the team can consult them when reasoning about multi-notation modelling and authoring UX. No code or behaviour in this repository depends on it. Visual Paradigm is a broad **modelling toolset** — a different category from kymo (a static diagram DSL).

## 1. Overview

**Visual Paradigm** is a commercial, full-featured modelling toolset supporting **BPMN, UML, ArchiMate**, ERD, and more, with team collaboration and round-trip engineering between models and code. It targets analysts, architects, and developers who want one tool across software design and business-process modelling. Much of the widely cited online BPMN tutorial material (gateway types, orchestration vs choreography) comes from Visual Paradigm's guides.

- Homepage: <https://www.visual-paradigm.com/>
- BPMN tool: <https://www.visual-paradigm.com/features/bpmn-tool/>

## 2. Editions and licensing

- **Commercial** — sold across editions (Modeler → Standard → Professional → Enterprise) unlocking more notations and team features.
- A free, non-commercial **Community Edition** is available for personal/educational use.

## 3. Capabilities

- Multi-notation modelling with **round-trip engineering** (model ↔ source code).
- Team collaboration, a model repository, and document generation.
- Extensive built-in **guidance content** (the "BPMN guide" tutorials) integrated with the tool.

## 4. BPMN support and conformance

- Full BPMN 2.0 Process Modeling, with pools/lanes, events, gateways, sub-processes; also choreography/conversation views.
- Standard **BPMN 2.0 XML** interchange.
- Modelling and design focus; not a process-execution engine.

## 5. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of Visual Paradigm against kymo, and open questions for kymo — lives in [`visual-paradigm.comparision.md`](a.visual-paradigm.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream Visual Paradigm has not moved).

## 6. References

All accessed 2026-05-20.

- Visual Paradigm homepage — <https://www.visual-paradigm.com/>
- BPMN tool — <https://www.visual-paradigm.com/features/bpmn-tool/>
- BPMN guides — <https://www.visual-paradigm.com/guide/bpmn/>
