---
title: Activiti — External Reference
document_id: REF-ACTIVITI-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - activiti.comparision.md
  - ../diagrams/bpmn/README.md
  - ./flowable.md
  - ./camunda.md
authors:
  - Vũ Anh
language: en
keywords:
  - activiti
  - bpmn-engine
  - java
  - activiti-cloud
  - alfresco
  - prior-art
upstream:
  project: Activiti
  homepage: https://www.activiti.org/
  repository: https://github.com/Activiti/Activiti
  license: Apache-2.0
  version_reviewed: "Activiti 7.x / Activiti Cloud (2026)"
  access_date: 2026-05-20
---

# Activiti — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-ACTIVITI-001                                            |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [`Activiti/Activiti`](https://github.com/Activiti/Activiti)   |
| License           | Apache-2.0                                                    |
| Version Reviewed  | Activiti 7.x / Activiti Cloud (2026)                         |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`activiti.comparision.md`](./activiti.comparision.md), [`bpmn/README.md`](../diagrams/bpmn/README.md), [`flowable.md`](./flowable.md), [`camunda.md`](./camunda.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Activiti's design choices and its role as the common ancestor of today's open BPMN engines. No code or behaviour in this repository depends on Activiti. Activiti is a **process-execution engine**, a different category from kymo (a static diagram DSL).

## 1. Overview

**Activiti** is a lightweight, Java-centric **BPMN 2.0** process engine, launched in **2010** (originating at Alfresco). It is best known historically: Activiti is the **codebase from which both Camunda and Flowable were forked**, which makes it the root of the modern open-source BPMN-engine family. Today it continues under the **Activiti Cloud** banner, providing cloud-native, distributed components.

- Homepage: <https://www.activiti.org/>
- Repository: <https://github.com/Activiti/Activiti>

## 2. Lineage and the fork tree

Activiti's significance is largely genealogical:

- **2003** — jBPM appears (the first OSS BPM; see [`jbpm.md`](./jbpm.md)).
- **2010** — Activiti launches as a lighter Java engine, led by Tom Baeyens, Joram Barrez, and Tijs Rademakers.
- **2013** — **Camunda** forks Activiti, evolving into a separate platform.
- **2017** — **Flowable** forks Activiti (by Barrez & Rademakers), continuing from Activiti 5.21.

So Activiti, Camunda, and Flowable share DNA; differences are in governance, feature pace, and the cloud-native direction each took.

## 3. Editions and licensing

- **Apache-2.0**, fully open source.
- **Activiti Cloud** — a set of cloud-native building blocks (containers/services) for running processes on distributed infrastructure.

## 4. Architecture / tech stack

- **Java**, designed to be small and embeddable; integrates with Spring.
- Relational-database-backed engine; REST and Java APIs.
- Activiti Cloud reframes the engine as deployable services rather than a single embedded library.

## 5. BPMN support and conformance

- Executes the **Common Executable** subset of BPMN 2.0 with standard token semantics.
- Consumes standard **BPMN 2.0 XML**, the shared interchange that makes the fork lineage interoperable at the model level.

## 6. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of Activiti against kymo, and open questions for kymo — lives in [`activiti.comparision.md`](activiti.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream Activiti has not moved).

## 7. References

All accessed 2026-05-20.

- Activiti homepage — <https://www.activiti.org/>
- Repository — <https://github.com/Activiti/Activiti>
- Open-source BPM comparison — <https://medium.com/capital-one-tech/2022-open-source-bpm-comparison-33b7b53e9c98>
- Fork history — <https://ecmarchitect.com/archives/2016/10/15/4192>
