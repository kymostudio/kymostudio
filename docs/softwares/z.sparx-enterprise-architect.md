---
title: Sparx Enterprise Architect — External Reference
document_id: REF-SPARX-EA-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - REF-SPARX-EA-CMP-001
  - BPD-DGM-001
authors:
  - Vũ Anh
language: en
keywords:
  - sparx-systems
  - enterprise-architect
  - uml
  - sysml
  - archimate
  - bpmn
  - prior-art
upstream:
  project: Sparx Systems Enterprise Architect
  homepage: https://sparxsystems.com/
  developer_site: https://sparxsystems.com/platforms/business_process_modeling.html
  license: Commercial proprietary (per-seat editions)
  version_reviewed: "Enterprise Architect 16/17 line (2026)"
  access_date: 2026-05-20
---

# Sparx Enterprise Architect — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-SPARX-EA-001                                            |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [Sparx Systems EA](https://sparxsystems.com/)                 |
| License           | Commercial proprietary                                        |
| Version Reviewed  | Enterprise Architect 16/17 line (2026)                       |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`sparx-enterprise-architect.comparision.md`](./z.sparx-enterprise-architect.comparision.md), `bpmn/README.md`, `kymo-dsl/`, [`best-practices.md`](../diagrams/best-practices.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Enterprise Architect's design choices so the team can consult them when reasoning about multi-notation modelling. No code or behaviour in this repository depends on it. Enterprise Architect is a broad **modelling tool** — a different category from kymo (a static diagram DSL); BPMN is one of many notations it supports.

## 1. Overview

**Enterprise Architect (EA)** by **Sparx Systems** is a comprehensive, commercial modelling tool. It is a model-driven platform spanning **UML, SysML, ArchiMate, and BPMN**, used heavily in enterprise architecture, systems engineering, and software design. With a reported **1,000,000+ users**, it is one of the most established repository-based modelling tools.

- Homepage: <https://sparxsystems.com/>
- BPMN platform page: <https://sparxsystems.com/platforms/business_process_modeling.html>

## 2. Editions and licensing

- **Commercial proprietary** — sold per seat across editions (e.g. Professional, Corporate, Unified, Ultimate) that unlock progressively more frameworks and team features.
- Desktop application (Windows-native; runs on other platforms via compatibility layers), with a shared model repository for teams.

## 3. Architecture and positioning

- A **repository-based** modelling environment: many diagrams over a shared underlying model, with traceability between elements across notations.
- BPMN sits alongside UML/SysML/ArchiMate, so a business process can be linked to the system and architecture models that realise it — its main draw over single-notation tools.

## 4. BPMN support and conformance

- BPMN 2.0 modelling within the broader repository; pools/lanes, events, gateways, sub-processes.
- Standard **BPMN 2.0 XML** import/export; some editions support model simulation and execution-oriented extensions.
- Strength is **cross-notation traceability**, not process execution.

## 5. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of Enterprise Architect against kymo, and open questions for kymo — lives in [`sparx-enterprise-architect.comparision.md`](z.sparx-enterprise-architect.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream Enterprise Architect has not moved).

## 6. References

All accessed 2026-05-20.

- Sparx Systems homepage — <https://sparxsystems.com/>
- Enterprise Architect — <https://www.sparxsystems.us/enterprise-architect/>
- BPMN modelling — <https://sparxsystems.com/platforms/business_process_modeling.html>
