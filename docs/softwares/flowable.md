---
title: Flowable — External Reference
document_id: REF-FLOWABLE-001
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
  - ./activiti.md
  - ./camunda.md
authors:
  - Vũ Anh
language: en
keywords:
  - flowable
  - bpmn-engine
  - cmmn
  - dmn
  - java
  - activiti-fork
  - prior-art
upstream:
  project: Flowable
  homepage: https://www.flowable.com/open-source
  repository: https://github.com/flowable/flowable-engine
  license: Apache-2.0 (Flowable Open Source) + commercial Flowable Enterprise
  version_reviewed: "Flowable 7.x line (2026)"
  access_date: 2026-05-20
---

# Flowable — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-FLOWABLE-001                                            |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [`flowable/flowable-engine`](https://github.com/flowable/flowable-engine) |
| License           | Apache-2.0 (+ commercial Enterprise)                          |
| Version Reviewed  | Flowable 7.x line (2026)                                      |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`bpmn/README.md`](../diagrams/bpmn/README.md), [`activiti.md`](./activiti.md), [`camunda.md`](./camunda.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Flowable's design choices so the team can consult them when reasoning about BPMN execution and model interchange. No code or behaviour in this repository depends on Flowable. Flowable is a **process-execution engine**, a different category from kymo (a static diagram DSL).

## 1. Overview

**Flowable** is a compact, Java-based engine for **BPMN 2.0**, **CMMN 1.1** (case management), and **DMN** (decisions). It is designed to be **embedded** in JVM applications — especially Spring / Spring Boot — and is a common choice when a team wants a process engine inside their own service rather than a separate platform.

- Open-source home: <https://www.flowable.com/open-source>
- Repository: <https://github.com/flowable/flowable-engine>

## 2. Lineage — a fork of Activiti

Flowable was created in **2017** when **Joram Barrez** and **Tijs Rademakers** — core developers of [Activiti](./activiti.md) — forked the project. The fork started from the latest Activiti release, **5.21.0**, and continued as **Flowable 5.22.0**, adding features such as transient variables along with enhancements and fixes. This makes Flowable a sibling of Camunda, which had earlier (2013) forked the same Activiti codebase. The shared ancestry is why the three engines feel familiar to one another.

## 3. Editions and licensing

- **Flowable Open Source** — **Apache-2.0**, the engine and core libraries.
- **Flowable (Enterprise)** — a commercial platform layering modelling, work management, and operations on top of the open engine.

## 4. Architecture / tech stack

- **Java**, with first-class Spring / Spring Boot integration.
- Embeddable engine plus optional REST app and a web modeller.
- Persists process state to a relational database; supports clustering for scale.

## 5. BPMN support and conformance

- Executes the **Common Executable** subset of BPMN 2.0 — full token semantics, gateways, events, timers, and service/user tasks.
- Unusually broad notation coverage in one engine: **BPMN + CMMN + DMN** together, useful where processes, cases, and decisions co-exist.
- Deploys standard **BPMN 2.0 XML**.

## 6. Comparison vs `kymo`

| Axis                  | Flowable                                                 | kymo (this repo)                                                  |
|-----------------------|----------------------------------------------------------|-------------------------------------------------------------------|
| Primary purpose       | Embeddable BPMN/CMMN/DMN **execution** engine            | Render static architecture diagrams                               |
| Notation              | BPMN 2.0 (+ CMMN, DMN)                                   | kymo `.diagram` DSL                                              |
| Implementation        | Java (Spring-friendly)                                   | Python renderer + JS data-model port                              |
| Semantics             | Full execution semantics                                 | None — visual only                                               |
| Output                | Running instances, history                               | SVG / animated SVG / WebP                                        |
| Licence               | Apache-2.0 (+ commercial)                                | Apache-2.0                                                        |

## 7. Lessons we may consider borrowing

Listed without commitment — these are observations, not roadmap items.

- **Embeddability as a design goal.** Flowable's "drop the engine into your app" ethos parallels kymo's "import the library or call the CLI" model; keeping the core a clean library (not a service) is worth preserving.
- **One core, several notations.** Flowable supports BPMN/CMMN/DMN on one engine. kymo similarly serves several output targets (SVG/WebP/Figma/Excalidraw) from one model — the analogy reinforces keeping the model neutral and the back-ends thin.
- **Healthy forks signal a healthy data format.** That Activiti could be forked into Camunda and Flowable is largely because the BPMN XML interchange is standardised. A stable, documented kymo model/format would similarly de-risk downstream tooling.

## 8. References

All accessed 2026-05-20.

- Flowable open source — <https://www.flowable.com/open-source>
- Repository — <https://github.com/flowable/flowable-engine>
- Documentation — <https://www.flowable.com/open-source/docs/>
- Fork history — <https://ecmarchitect.com/archives/2016/10/15/4192>
