---
title: "BPMN 2.0.2 — Clause 6: Additional Information"
document_id: BPMN-NREF-ADDINFO-001
version: "1.2"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001         # Normative-reference set (index)
  - BPMN-NREF-ANNEXA-001  # Annex A — Changes from v1.2
  - REF-BPMN-001          # BPMN 2.0 research reference (history §5)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - conventions
  - document-structure
  - acknowledgments
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

# BPMN 2.0.2 — Clause 6: Additional Information

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-ADDINFO-001                                      |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§6 Additional Information** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-ANNEXA-001`, `REF-BPMN-001`       |

Mirrors **Clause 6 (Additional Information)** of the OMG BPMN 2.0.2 specification
(§6.1–§6.3). Part of the normative-reference set `BPMN-NREF-001`. Where this note and the
OMG specification disagree, the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §6;
> it does not reproduce the specification. For the normative wording, read §6 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §6.1 Conventions

- **§6.1.1 Typographical and Linguistic Conventions and Style** — the document's typographic
  rules and the use of RFC-2119-style keywords (*shall* / *should* / *may*) that mark
  normative requirements.
- **§6.1.2 Abbreviations** — the abbreviation list (BPMN, OMG, MOF, XMI, BPEL, XPDL, DI, …);
  see also `REF-BPMN-001 §4`.

## §6.2 Structure of this Document

§6.2 explains how the specification is organised: the front-matter clauses (§1–§6), the
**element clauses** (§7 Overview, §8 Core, §9 Collaboration, §10 Process, §11 Choreography),
the **notation/interchange clauses** (§12 Notation & Diagrams, §15 Exchange Formats), the
**semantics/mapping clauses** (§13 Execution Semantics, §14 WS-BPEL), and the annexes
(A Changes, B Diagram Interchange, C Glossary). This `docs/formats/bpmn/` set mirrors that
structure file-for-file (see `BPMN-NREF-001`).

## §6.3 Acknowledgments

§6.3 credits the companies and individuals who authored the specification (listed in the
document's front matter). The standardisation timeline — BPMN 1.0 (2004), OMG stewardship
(2005), BPMN 2.0 (2011), ISO/IEC 19510 (2013), 2.0.2 (2014) — is summarised in
`REF-BPMN-001 §5`; **Annex A** records the changes from v1.2 (`BPMN-NREF-ANNEXA-001`).

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §6.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/06-additional-information.md`; authoritative source
is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §6 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §6; `REF-BPMN-001 §4, §5`.
