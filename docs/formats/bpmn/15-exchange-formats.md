---
title: "BPMN 2.0.2 — Clause 15: Exchange Formats"
document_id: BPMN-NREF-EXCHANGE-001
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
  - BPMN-NREF-NOTATION-001 # Clause 12 — BPMN DI
  - BPMN-NREF-CORE-001     # Clause 8 — Core (Definitions)
  - REF-BPMN-001           # BPMN 2.0 research reference (interchange §16)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - exchange-formats
  - xsd
  - xmi
  - xml-serialization
  - interchange
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

# BPMN 2.0.2 — Clause 15: Exchange Formats

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-EXCHANGE-001                                    |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§15 Exchange Formats** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-NOTATION-001`, `BPMN-NREF-CORE-001`, `REF-BPMN-001` |

Mirrors **Clause 15 (Exchange Formats)** of the OMG BPMN 2.0.2 specification (§15.1–§15.5) —
the XML serialisation of a `.bpmn` file. Part of the normative-reference set `BPMN-NREF-001`.
Where this note and the OMG specification disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §15;
> it does not reproduce the specification. For the normative wording, read §15 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

> **2.0.2 note.** The maintenance release 2.0.2 (OMG `formal/2013-12-09`) records a **minor
> change to Clause 15** relative to 2.0.1 — the only substantive delta of the 2.0.2 release.

## §15.1 Interchanging Incomplete Models

§15.1 allows a model to be exchanged even when incomplete (e.g. missing detail a tool will
fill in), so long as it is schema-valid.

## §15.2 Machine Readable Files

§15.2 enumerates the normative machine-consumable files published with the spec:
`BPMN20.xsd` (umbrella), `Semantic.xsd` (the semantic model), `BPMNDI.xsd` (BPMN DI), and the
shared `DI.xsd` / `DC.xsd` (OMG Diagram Interchange / Diagram Common), plus the `.cmof`
metamodels.

## §15.3 XSD

- **§15.3.1 Document Structure** — a file is a root `<definitions>` (§8.2) holding root
  elements `<process>` / `<collaboration>` and the DI `<bpmndi:BPMNDiagram>`; when pools
  exist, processes are referenced from a `<collaboration>`.
- **§15.3.2 References within the BPMN XSD** — elements are linked by `id` / IDREF
  (`sourceRef`, `targetRef`, `processRef`, `bpmnElement`, …).

## §15.4 XMI · §15.5 XSLT

§15.4 defines the XMI form of a model; §15.5 the XSLT transformation between the XSD and XMI
representations. The model/diagram interchange is discussed in `REF-BPMN-001 §16`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §15.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/15-exchange-formats.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §15 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §15, §12; `REF-BPMN-001 §16`.
