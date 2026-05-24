---
title: "BPMN 2.0.2 — Clause 3: Normative References"
document_id: BPMN-NREF-NORMREF-001
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
  - BPMN-NREF-EXCHANGE-001 # Clause 15 — Exchange Formats
  - REF-BPMN-001           # BPMN 2.0 research reference (notation/semantics)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - normative-references
  - mof
  - xmi
  - xsd
  - bpel
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

# BPMN 2.0.2 — Clause 3: Normative References

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-NORMREF-001                                       |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§3 Normative References** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-EXCHANGE-001`, `REF-BPMN-001`     |

Mirrors **Clause 3 (Normative References)** of the OMG BPMN 2.0.2 specification (§3.1–§3.3).
Part of the normative-reference set `BPMN-NREF-001`. Where this note and the OMG
specification disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §3;
> it does not reproduce the specification. For the normative wording, read §3 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §3.1 General

Clause 3 lists the documents that are **indispensable** for applying BPMN 2.0: a conforming
implementation depends on them. They split into **normative** (§3.2) and **non-normative /
informative** (§3.3).

## §3.2 Normative

The standards BPMN builds on (as listed in §3.2) include, among others:

- **OMG MOF** (Meta-Object Facility) — the meta-modelling foundation BPMN's metamodel uses.
- **OMG XMI** (XML Metadata Interchange) — the XMI serialisation of MOF models (see §15.4).
- **W3C XML / XML Schema (XSD)** — the schema language for the BPMN interchange (§15.3).
- **W3C XPath** — the default expression language for conditions and data (§10.4.3).
- **OASIS WS-BPEL 2.0** — the execution language BPMN maps to (§14).
- **OMG Diagram Definition (DD)** — the DD/DI/DC packages BPMN DI binds to (§12).

## §3.3 Non-Normative

§3.3 lists informative references (background material that is not required for conformance).
The project's own normative references for this set (OMG BPMN 2.0.2 / ISO/IEC 19510:2013) are
recorded in the index `BPMN-NREF-001` and in `REF-BPMN-001 §2`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §3.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/03-normative-references.md`; authoritative source
is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §3 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §3; `REF-BPMN-001 §2`.
