---
title: Bizagi Modeler — External Reference
document_id: REF-BIZAGI-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - ../diagrams/bpmn/README.md
  - ../DSL.md
  - ../BEST_PRACTICE_DIAGRAMS.md
authors:
  - Vũ Anh
language: en
keywords:
  - bizagi
  - bizagi-modeler
  - bpmn
  - free-modeler
  - simulation
  - prior-art
upstream:
  project: Bizagi Modeler
  homepage: https://www.bizagi.com/en/platform/modeler
  developer_site: https://help.bizagi.com/process-modeler/
  license: Free (proprietary freeware); broader Bizagi platform is commercial
  version_reviewed: "Bizagi Modeler (desktop, 2026)"
  access_date: 2026-05-20
---

# Bizagi Modeler — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-BIZAGI-001                                              |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [Bizagi Modeler](https://www.bizagi.com/en/platform/modeler)  |
| License           | Free (proprietary freeware)                                   |
| Version Reviewed  | Bizagi Modeler (desktop, 2026)                               |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`bpmn/README.md`](../diagrams/bpmn/README.md), [`DSL.md`](../DSL.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Bizagi Modeler's design choices so the team can consult them when reasoning about approachable BPMN authoring. No code or behaviour in this repository depends on Bizagi. Bizagi Modeler is a **process-modelling tool** — a different category from kymo (a static diagram DSL).

## 1. Overview

**Bizagi Modeler** is a **free** desktop tool for drawing, documenting, and simulating business processes in **BPMN 2.0**. It is widely used for training and documentation because it is genuinely free (no time limit, no user cap) while still offering a polished, full BPMN palette — events, gateways, tasks, sub-processes, pools and lanes.

- Product: <https://www.bizagi.com/en/platform/modeler>
- Help: <https://help.bizagi.com/process-modeler/>

## 2. Editions and licensing

- **Bizagi Modeler** — proprietary **freeware**, available without time limits or restrictions on the number of users, so teams can fully trial it before any commitment. Windows desktop (with cloud/web options).
- **Bizagi Studio / Automation** — the broader low-code automation platform that turns models into running applications is **commercial**; Modeler is the free on-ramp to it.

## 3. Capabilities

- Drag-and-drop BPMN 2.0 modelling with the full descriptive/analytical palette.
- **Documentation export** — generate Word/PDF/web documentation directly from the model (a notable strength for process documentation).
- **Simulation** — token-based what-if analysis (resource/time/cost) layered on the model.
- Collaboration features for shared review.

## 4. BPMN support and conformance

- BPMN 2.0 Process Modeling conformance; pools/lanes, sub-processes, events, gateways.
- Standard **BPMN 2.0 XML** import/export, so models move to engines or other tools.
- Modelling/documentation focus; execution happens in the separate Bizagi automation platform.

## 5. Comparison vs `kymo`

| Axis                  | Bizagi Modeler                                           | kymo (this repo)                                                  |
|-----------------------|----------------------------------------------------------|-------------------------------------------------------------------|
| Primary purpose       | Free BPMN modelling + documentation                      | Render static architecture diagrams                               |
| Notation              | BPMN 2.0                                                 | kymo `.diagram` DSL                                             |
| Authoring             | WYSIWYG desktop editor                                   | Local text DSL                                                   |
| Standout feature      | One-click process documentation export                   | Animated SVG / WebP output                                        |
| Cost                  | Free (freeware); commercial upsell platform              | Apache-2.0, free                                                 |

## 6. Lessons we may consider borrowing

Listed without commitment — these are observations, not roadmap items.

- **Generated documentation from the model.** Bizagi's "export the diagram as a documented spec" is a compelling pattern; kymo could emit a structured description (component list, edges, regions) alongside the SVG for accessibility and review.
- **Free tool as an on-ramp.** Bizagi's freeware Modeler funnels users to a paid platform; the lesson for an Apache-2.0 project is subtler — a frictionless free core builds the audience that any future tooling would serve.

## 7. References

All accessed 2026-05-20.

- Bizagi Modeler — <https://www.bizagi.com/en/platform/modeler>
- Modeler help — <https://help.bizagi.com/process-modeler/>
- Bizagi platform — <https://www.bizagi.com/>
