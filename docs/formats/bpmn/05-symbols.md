---
title: "BPMN 2.0.2 — Clause 5: Symbols"
document_id: BPMN-NREF-SYMBOLS-001
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
  - BPMN-NREF-NOTATION-001 # Clause 12 — Notation & Diagrams (depiction library)
  - REF-BPMN-001           # BPMN 2.0 research reference (notation/semantics)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - symbols
  - notation
  - shapes
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

# BPMN 2.0.2 — Clause 5: Symbols

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-SYMBOLS-001                                       |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§5 Symbols** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-NOTATION-001`, `REF-BPMN-001`     |

Mirrors **Clause 5 (Symbols)** of the OMG BPMN 2.0.2 specification. Part of the
normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification disagree,
the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 §5;
> it does not reproduce the specification. For the normative wording, read §5 in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §5 Symbols

Clause 5 is brief: it notes the symbol/abbreviation conventions used in the document. The
**graphical** symbol vocabulary — the actual shapes drawn for each element — is not defined
here but throughout the element clauses (§8–§11) and, normatively for depiction, in the
**Notational Depiction Library** of §12.3 (see `BPMN-NREF-NOTATION-001`). The four basic
shape families:

| Shape | Element family |
|---|---|
| Circle | Event (§10.5) |
| Rounded rectangle | Activity (§10.3) |
| Diamond | Gateway (§10.6) |
| Rectangle with label band | Pool / Lane (§9.3) |

Connecting objects use line styles (solid / dashed / dotted) defined in §7.6 and §8.4.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §5.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/05-symbols.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §5 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §5, §12.3; `REF-BPMN-001 §7`.
