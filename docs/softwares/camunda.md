---
title: Camunda — External Reference
document_id: REF-CAMUNDA-001
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
  - ./bpmn-io.md
  - ../DSL.md
authors:
  - Vũ Anh
language: en
keywords:
  - camunda
  - zeebe
  - bpmn-engine
  - dmn
  - process-orchestration
  - prior-art
upstream:
  project: Camunda
  homepage: https://camunda.com/
  repository: https://github.com/camunda/camunda
  license: "Camunda 7 CE: Apache-2.0 (EoL). Camunda 8: source-available (Camunda License v1), proprietary compiled"
  version_reviewed: "Camunda 8 (current); Camunda 7 CE (EoL)"
  access_date: 2026-05-20
---

# Camunda — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-CAMUNDA-001                                              |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [`camunda/camunda`](https://github.com/camunda/camunda)       |
| License           | C7 CE: Apache-2.0 (EoL) · C8: source-available + proprietary  |
| Version Reviewed  | Camunda 8 (current); Camunda 7 CE (EoL)                       |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`bpmn/README.md`](../diagrams/bpmn/README.md), [`bpmn-io.md`](./bpmn-io.md), [`DSL.md`](../DSL.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Camunda's design choices so the team can consult them when reasoning about process notation and model interchange. No code or behaviour in this repository depends on Camunda. Camunda is a **process-execution platform**, a different category from kymo (a static diagram DSL); it is included because it authored bpmn.io and exemplifies BPMN's "executable model" ambition.

## 1. Overview

**Camunda** is a process-orchestration vendor whose platform executes **BPMN 2.0** processes and **DMN** decisions. A model authored as BPMN XML is deployed to the engine and run: tasks are dispatched to workers, gateways route tokens, timers fire, and the engine tracks each running instance. Camunda also created and maintains [bpmn.io / bpmn-js](./bpmn-io.md), the web modeler used to draw those processes.

## 2. Camunda 7 vs Camunda 8 — two products

Camunda is really two generations with different architectures and licences:

| Aspect        | Camunda 7                                              | Camunda 8                                                       |
|---------------|--------------------------------------------------------|-----------------------------------------------------------------|
| Engine        | Java/Spring library, embeddable in a JVM app           | **Zeebe** — a distributed, cloud-native workflow engine         |
| Deployment    | Single JVM / relational DB                            | Clustered, event-streaming architecture                         |
| Community ed. | Apache-2.0 (free) — **now End-of-Life**               | **No** Apache-2.0 edition                                       |
| Licence       | Apache-2.0                                             | **Source-available** under **Camunda License v1**; compiled software proprietary; production use is paid (free in development) |
| Source        | Public                                                | Public (readable/contributable) but not OSS-free for production |

The shift from Camunda 7's permissive, embeddable OSS engine to Camunda 8's source-available commercial model is the headline story for anyone evaluating the platform.

## 3. Architecture / tech stack

- **Camunda 7** — a Java process engine that embeds in a Spring application; BPMN/DMN parsed and executed against a relational database; REST API and Java API for task workers.
- **Camunda 8** — **Zeebe** is the core: a horizontally scalable engine built on event streaming, decoupling the engine from a single database and targeting high-throughput, distributed orchestration. Supporting components (Operate, Tasklist, Identity, Optimize) ship under the Camunda License.

## 4. BPMN support and conformance

- Executes the **Common Executable** subset of BPMN 2.0 (see [`bpmn/README.md` §6](../diagrams/bpmn/README.md)): the engine interprets the operational semantics — token flow, gateway routing, event handling — not merely the symbols.
- Pairs BPMN with **DMN** for decision logic (Business Rule tasks) and historically with CMMN for case management.
- Consumes standard **BPMN 2.0 XML**; the diagram layout (BPMN DI) authored in bpmn.io round-trips alongside the executable model.

## 5. Ecosystem and adopters

Camunda is one of the most widely deployed BPMN engines in enterprise process automation. Its open modeler (bpmn.io) has spread BPMN literacy well beyond Camunda's own customer base — most online "what does this BPMN symbol mean" material is illustrated with bpmn.io.

## 6. Comparison vs `kymo`

| Axis                  | Camunda                                                  | kymo (this repo)                                                  |
|-----------------------|----------------------------------------------------------|-------------------------------------------------------------------|
| Primary purpose       | **Execute** BPMN processes (orchestration runtime)       | Render static architecture diagrams                               |
| Artifact              | Executable BPMN 2.0 XML model                           | `.diagram` DSL source → SVG                                       |
| Semantics             | Full token/execution semantics                          | None — purely visual                                             |
| Implementation        | Java (C7) / Zeebe distributed engine (C8)               | Python renderer + JS data-model port                              |
| Output                | Running process instances, audit history                | SVG / animated SVG / WebP                                         |
| Licence               | C7 CE Apache-2.0 (EoL); C8 source-available + paid       | Apache-2.0                                                       |
| Relation              | Author of bpmn.io (kymo's nearest renderer analogue)    | —                                                                |

## 7. Lessons we may consider borrowing

Listed without commitment — these are observations, not roadmap items.

- **Separate the model from the picture.** Camunda's model is executable data; the diagram is a view (BPMN DI). kymo's value is the picture, but the same discipline — a stable data model, with rendering as one consumer — keeps options open (e.g. exporting to other targets, as `to_figma.py`/`to_excalidraw.py` already hint).
- **Licensing as a first-class decision.** The Camunda 7→8 relicensing is a cautionary tale: kymo's Apache-2.0 stance is an asset worth protecting deliberately.
- **A modeler that teaches the notation.** bpmn.io's role in spreading BPMN literacy suggests that an approachable authoring surface is itself a distribution strategy.

## 8. References

All accessed 2026-05-20.

- Camunda homepage — <https://camunda.com/>
- Camunda 8 repository — <https://github.com/camunda/camunda>
- Camunda 7 (EoL notice) — <https://github.com/camunda/camunda-bpm-platform>
- Camunda 8 licensing — <https://docs.camunda.io/docs/reference/licenses/>
- "How Open is Camunda Platform 8?" — <https://camunda.com/blog/2022/05/how-open-is-camunda-platform-8/>
- bpmn.io — <https://bpmn.io/>
