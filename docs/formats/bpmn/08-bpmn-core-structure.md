---
title: "BPMN 2.0.2 — Clause 8: BPMN Core Structure"
document_id: BPMN-NREF-CORE-001
version: "1.2"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001          # Normative-reference set (index)
  - BPMN-NREF-PROCESS-001  # Clause 10 — Process (Events, Gateways, Activities)
  - REF-BPMN-001           # BPMN 2.0 research reference (notation/semantics)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - core
  - metamodel
  - definitions
  - foundation
  - common-elements
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
upstream:
  project: OMG Business Process Model and Notation (BPMN)
  specification: https://www.omg.org/spec/BPMN/2.0.2/PDF
  iso_equivalent: ISO/IEC 19510:2013
  version_reviewed: "2.0.2 (OMG, December 2013) / ISO/IEC 19510:2013"
  access_date: 2026-05-24
---

# BPMN 2.0.2 — Clause 8: BPMN Core Structure

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-CORE-001                                         |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§8 BPMN Core Structure** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-PROCESS-001`, `REF-BPMN-001`      |

Mirrors **Clause 8 (BPMN Core Structure)** of the OMG BPMN 2.0.2 specification (§8.1–§8.5).
Part of the normative-reference set `BPMN-NREF-001`. Where this note and the OMG
specification disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §8;
> it does not reproduce the specification. For the normative wording, read §8 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §8.1 General

Clause 8 defines BPMN as a layered, MOF-based **metamodel**. The packages below are the
foundation every other clause builds on; a serialised `.bpmn` file draws directly on them.

## §8.2 Infrastructure

- **§8.2.1 Definitions** — the root container. A file is a `<definitions>` element holding
  the root elements (processes, collaborations, …) with `targetNamespace`, `id`, and
  `exporter` metadata.
- **§8.2.2 Import** — `<import>` references external definitions.
- **§8.2.3** — the Infrastructure package XML schemas.

## §8.3 Foundation

The abstractions every element inherits:

- **§8.3.1 Base Element** — the common super-type, supplying `id` and `extensionElements`.
- **§8.3.2 Documentation** — human-readable `<documentation>`.
- **§8.3.3 Extensibility** — vendor extensions via `extensionElements` / `extensionDefinitions`.
- **§8.3.4 External Relationships** · **§8.3.5 Root Element** — elements that may appear
  directly under `<definitions>`.
- **§8.3.6** — the Foundation package XML schemas.

## §8.4 Common Elements

The building blocks reused by Process, Collaboration, and Choreography. Each is detailed in
the clause where it is primarily used:

| §8.4.x | Element | Detailed in |
|---|---|---|
| §8.4.1 | Artifacts (Association, Group, Text Annotation) | §10 (process) |
| §8.4.3 / §8.4.4 | Error / Escalation | §10.5 (events) |
| §8.4.5 | Events | §10.5 |
| §8.4.6 | Expressions | §10.4 |
| §8.4.7 / §8.4.8 | Flow Element / Flow Elements Container | this clause |
| §8.4.9 | Gateways | §10.6 |
| §8.4.10 | Item Definition | §10.4 |
| §8.4.11 | Message | §9 (collaboration) |
| §8.4.12 | Resources | §10.3 |
| §8.4.13 | Sequence Flow | §10 / §7.6 |

## §8.5 Services

`Interface` (§8.5.1), `EndPoint` (§8.5.2), `Operation` (§8.5.3) for executable models.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §8.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/08-bpmn-core-structure.md`; authoritative source is
the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §8 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §8; `REF-BPMN-001 §7`.
