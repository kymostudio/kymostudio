---
title: "BPMN 2.0.2 — Clause 2: Conformance"
document_id: BPMN-NREF-CONF-001
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
  - BPMN-NREF-NOTATION-001 # Clause 12 — Notation & Diagrams (visual interchange)
  - REF-BPMN-001           # BPMN 2.0 research reference (notation/semantics)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - conformance
  - process-modeling
  - visual-interchange
  - descriptive
  - analytical
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

# BPMN 2.0.2 — Clause 2: Conformance

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-CONF-001                                          |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§2 Conformance** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-NOTATION-001`, `REF-BPMN-001`     |

Mirrors **Clause 2 (Conformance)** of the OMG BPMN 2.0.2 specification (§2.1–§2.6). Part of
the normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification
disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §2;
> it does not reproduce the specification. For the normative wording, read §2 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §2.1 General

A tool declares conformance to one or more **conformance types**; it need not implement all
of BPMN. A conforming tool must support that type's elements, attributes, and semantics.

## §2.2 Process Modeling Conformance

Covers the Process/Collaboration elements and their attributes, by sub-section:
**§2.2.1 BPMN Process Types**, **§2.2.2 BPMN Process Elements**, **§2.2.3 Visual
Appearance**, **§2.2.4 Structural Conformance**, **§2.2.5 Process Semantics**, **§2.2.6
Attributes and Model Associations**, **§2.2.7 Extended and Optional Elements**, **§2.2.8
Visual Interchange**.

It is layered into three sub-classes of increasing expressive power:

| Sub-class | Intent |
|---|---|
| **Descriptive** | High-level documentation: the most common visible elements. |
| **Analytical** | Adds the full set of events and gateways for precise behaviour. |
| **Common Executable** | The subset needed to make a model executable (data, expressions). |

## §2.3–§2.5 Execution & Choreography conformance

- **§2.3 Process Execution Conformance** — import (§2.3.2) and interpretation of the
  **execution semantics** (§2.3.1 → §13).
- **§2.4 BPEL Process Execution Conformance** — a complete mapping to WS-BPEL (§14).
- **§2.5 Choreography Modeling Conformance** — the Choreography elements, appearance,
  semantics, and interchange (§11).

## §2.6 Summary of BPMN Conformance Types

§2.6 tabulates the above. **Visual Interchange** (§2.2.8) is the surface a *diagram*-exchanging
tool must meet — it requires reading/writing BPMN DI (§12). Conformance-class theory (the
Descriptive → Analytical → Common Executable ladder) is described in `REF-BPMN-001 §6`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §2.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/02-conformance.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §2 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §2; `REF-BPMN-001 §6`.
