---
title: SAP Signavio — External Reference
document_id: REF-SIGNAVIO-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - z.signavio.comparision.md
  - ../diagrams/bpmn/README.md
  - ../formats/kymo-dsl/README.md
  - ../diagrams/best-practices.md
authors:
  - Vũ Anh
language: en
keywords:
  - signavio
  - sap
  - process-manager
  - bpmn
  - process-mining
  - prior-art
upstream:
  project: SAP Signavio (Process Manager / Modeler)
  homepage: https://www.signavio.com/
  developer_site: https://help.sap.com/docs/signavio-process-manager
  license: Commercial SaaS (30-day trial)
  version_reviewed: "SAP Signavio cloud (2026)"
  access_date: 2026-05-20
---

# SAP Signavio — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-SIGNAVIO-001                                            |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [SAP Signavio](https://www.signavio.com/)                     |
| License           | Commercial SaaS (30-day trial)                                |
| Version Reviewed  | SAP Signavio cloud (2026)                                    |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`signavio.comparision.md`](./z.signavio.comparision.md), [`bpmn/README.md`](../diagrams/bpmn/README.md), [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures SAP Signavio's design choices so the team can consult them when reasoning about collaborative modelling and process governance. No code or behaviour in this repository depends on Signavio. Signavio is an enterprise **process-management suite** — a different category and price point from kymo (a static diagram DSL).

## 1. Overview

**SAP Signavio** is a cloud-based **business-process management** platform. Its modelling component (**Process Manager** / **Process Modeler**) lets distributed teams author processes in **BPMN 2.0** (and **EPC**), collaborate and review, run **simulations**, model decisions with **DMN**, and govern a shared process repository. **Signavio was acquired by SAP in 2021** and is now part of the SAP Signavio suite, integrating with **Process Intelligence** (process mining).

- Homepage: <https://www.signavio.com/>
- Product: <https://www.signavio.com/products/process-modeler/>

## 2. Editions and licensing

- **Commercial SaaS** — subscription, enterprise-oriented; a **30-day free trial** is offered.
- Delivered as part of the broader SAP Signavio transformation suite (modelling + intelligence + governance + collaboration hub).

## 3. Capabilities beyond drawing

Signavio's differentiator is the layer **around** the diagram:

- **Collaboration & governance** — shared repository, review workflows, dictionaries of reusable elements, approval/release states.
- **Simulation** — run-throughs that estimate cost, time, and resource utilisation from the model.
- **Process Intelligence** — process **mining** from event logs, comparing the modelled "to-be" against the mined "as-is".
- **DMN** — decision modelling alongside BPMN.

## 4. BPMN support and conformance

- Full BPMN 2.0 modelling (Process Modeling conformance), plus **EPC** for SAP-centric audiences.
- Standard **BPMN 2.0 XML** import/export for interchange with engines and other tools.
- Modelling/governance focus rather than execution; engines consume the exported models.

## 5. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of SAP Signavio against kymo, and open questions for kymo — lives in [`signavio.comparision.md`](z.signavio.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream SAP Signavio has not moved).

## 6. References

All accessed 2026-05-20.

- SAP Signavio homepage — <https://www.signavio.com/>
- Process Modeler — <https://www.signavio.com/products/process-modeler/>
- BPMN at Signavio — <https://www.signavio.com/bpmn-2-0-for-efficient-process-design/>
- SAP product page — <https://www.sap.com/products/business-transformation-management/signavio-process-manager.html>
- BPMN docs — <https://help.sap.com/docs/signavio-process-manager/user-guide/bpmn>
