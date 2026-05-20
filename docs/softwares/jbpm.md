---
title: jBPM — External Reference
document_id: REF-JBPM-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - jbpm.comparision.md
  - ../diagrams/bpmn/README.md
  - ./activiti.md
  - ../DSL.md
authors:
  - Vũ Anh
language: en
keywords:
  - jbpm
  - drools
  - kie
  - red-hat
  - bpmn-engine
  - business-rules
  - prior-art
upstream:
  project: jBPM (KIE / Red Hat)
  homepage: https://www.jbpm.org/
  repository: https://github.com/kiegroup/jbpm
  license: Apache-2.0
  version_reviewed: "jBPM 7.x (KIE); Kogito as cloud-native successor"
  access_date: 2026-05-20
---

# jBPM — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-JBPM-001                                                |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [`kiegroup/jbpm`](https://github.com/kiegroup/jbpm)           |
| License           | Apache-2.0                                                    |
| Version Reviewed  | jBPM 7.x (KIE); Kogito successor                             |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`jbpm.comparision.md`](./jbpm.comparision.md), [`bpmn/README.md`](../diagrams/bpmn/README.md), [`activiti.md`](./activiti.md), [`DSL.md`](../DSL.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures jBPM's design choices and its place in the history of open-source BPM. No code or behaviour in this repository depends on jBPM. jBPM is a **process-execution toolkit**, a different category from kymo (a static diagram DSL).

## 1. Overview

**jBPM** is a Java **business-process** toolkit from **Red Hat**, developed under the **KIE** (Knowledge Is Everything) group. It executes **BPMN 2.0** processes and is distinctive for its tight integration with **Drools**, the rules engine — making it a natural fit where workflows are driven by complex business rules and decisions.

- Homepage: <https://www.jbpm.org/>
- Repository: <https://github.com/kiegroup/jbpm>

## 2. History — the original open-source BPM

jBPM launched in **2003** and was, for roughly seven years, the **only** open-source BPM product — until Activiti arrived in 2010. It predates the Activiti→Camunda/Flowable fork tree entirely and represents an independent lineage. In the cloud-native era, Red Hat's **Kogito** project carries the KIE stack (jBPM + Drools) toward containerised, serverless deployment.

## 3. Editions and licensing

- **Apache-2.0**, open source, backed by Red Hat.
- Part of the broader **KIE** platform: jBPM (processes) + Drools (rules) + OptaPlanner (constraint solving), with **Kogito** as the cloud-native successor.

## 4. Architecture / tech stack

- **Java**; embeddable engine plus tooling (web designer, KIE workbench).
- Process state persisted to a database; integrates with the Drools rules runtime so process and decision logic share a knowledge session.

## 5. BPMN support and conformance

- Executes **BPMN 2.0** with standard token semantics (events, gateways, tasks, sub-processes).
- Strongest where **rules + process** combine: Business Rule tasks delegate to Drools/DMN, keeping decision logic out of the flow.

## 6. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of jBPM against kymo, and open questions for kymo — lives in [`jbpm.comparision.md`](jbpm.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream jBPM has not moved).

## 7. References

All accessed 2026-05-20.

- jBPM homepage — <https://www.jbpm.org/>
- Repository — <https://github.com/kiegroup/jbpm>
- KIE group — <https://www.kiegroup.org/>
- Open-source BPM comparison — <https://medium.com/capital-one-tech/2022-open-source-bpm-comparison-33b7b53e9c98>
