---
title: Lucidchart — External Reference
document_id: REF-LUCIDCHART-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - lucidchart.comparision.md
  - ../diagrams/bpmn/README.md
  - ./drawio.md
  - ../formats/kymo-dsl/README.md
authors:
  - Vũ Anh
language: en
keywords:
  - lucidchart
  - lucid-software
  - diagramming
  - saas
  - bpmn
  - collaboration
  - prior-art
upstream:
  project: Lucidchart (Lucid Software)
  homepage: https://www.lucidchart.com/
  developer_site: https://www.lucidchart.com/pages/tutorial/bpmn-symbols-explained
  license: Proprietary SaaS (freemium)
  version_reviewed: "Lucidchart cloud (2026)"
  access_date: 2026-05-20
---

# Lucidchart — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-LUCIDCHART-001                                          |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [Lucidchart](https://www.lucidchart.com/)                     |
| License           | Proprietary SaaS (freemium)                                   |
| Version Reviewed  | Lucidchart cloud (2026)                                      |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`lucidchart.comparision.md`](./lucidchart.comparision.md), [`bpmn/README.md`](../diagrams/bpmn/README.md), [`drawio.md`](./drawio.md), [`kymo-dsl/`](../formats/kymo-dsl/README.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Lucidchart's design choices so the team can consult them when reasoning about collaborative, web-based diagramming. No code or behaviour in this repository depends on Lucidchart. Lucidchart is a **general-purpose** diagram SaaS (BPMN is one shape set), in the same broad category as [draw.io](./drawio.md) rather than the BPMN-specialised tools.

## 1. Overview

**Lucidchart** (by **Lucid Software**) is a web-based, proprietary diagramming platform for flowcharts, network/infrastructure diagrams, UML, mind maps, and **BPMN**. It is built around **real-time collaboration**: multiple users edit the same canvas simultaneously, seeing each other's changes live. BPMN is offered as a shape library, not as a specialised, semantics-aware modeller.

- Homepage: <https://www.lucidchart.com/>
- BPMN symbols guide: <https://www.lucidchart.com/pages/tutorial/bpmn-symbols-explained>

## 2. Editions and licensing

- **Proprietary SaaS**, **freemium** — a free tier with paid Individual / Team / Enterprise plans.
- Entirely **browser-based** (runs on any HTML5 browser); no local install required.

## 3. Capabilities

- Broad template/shape catalogue across many diagram domains.
- **Real-time multi-user collaboration** with comments and presence.
- Integrations with the wider Lucid suite (Lucidspark) and third-party platforms (Google Workspace, Atlassian, etc.).
- Data-linking and (in places) automated diagram generation from imported data.

## 4. BPMN support

- BPMN drawn from a **shape library**; symbols only, **no execution semantics** and no native standard **BPMN 2.0 XML** engine interchange (it is a drawing tool).
- Excellent for communicating a process to stakeholders; not for running or validating one.

## 5. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of Lucidchart against kymo, and open questions for kymo — lives in [`lucidchart.comparision.md`](lucidchart.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream Lucidchart has not moved).

## 6. References

All accessed 2026-05-20.

- Lucidchart homepage — <https://www.lucidchart.com/>
- BPMN symbols explained — <https://www.lucidchart.com/pages/tutorial/bpmn-symbols-explained>
- BPMN gateway types — <https://www.lucidchart.com/pages/tutorial/bpmn-gateway-types>
- Lucidchart (Wikipedia) — <https://en.wikipedia.org/wiki/Lucidchart>
