---
title: "BPMN 2.0.2 — Annex A: Changes from v1.2"
document_id: BPMN-NREF-ANNEXA-001
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
  - BPMN-NREF-ADDINFO-001  # Clause 6 — Additional Information
  - REF-BPMN-001           # BPMN 2.0 research reference (history §5)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - changes
  - bpmn-1.2
  - history
  - metamodel
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

# BPMN 2.0.2 — Annex A: Changes from v1.2

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-ANNEXA-001                                       |
| Version           | 1.2                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **Annex A — Changes from v1.2** |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-ADDINFO-001`, `REF-BPMN-001`      |

Mirrors **Annex A (Changes from v1.2)** of the OMG BPMN 2.0.2 specification. Part of the
normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification disagree,
the OMG specification is authoritative.

> **Authoritative text.** This file is a **non-verbatim summary** of OMG BPMN 2.0.2 Annex A;
> it does not reproduce the specification. For the normative wording, read Annex A in the
> official PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## Annex A — Changes from v1.2

Annex A records what changed when **BPMN 2.0** superseded **BPMN 1.2** — the major revision
of January 2011. The headline changes:

- A formal **MOF-based metamodel** (§8) — BPMN 1.x was a notation only; 2.0 adds an
  underlying abstract model.
- Precise **execution semantics** via token flow (§13), enabling executable models.
- A native, serialisable **XML interchange format** with an XSD schema (§15) and **Diagram
  Interchange (DI)** for layout (§12) — 1.x had no standard interchange (XPDL was used).
- Three **new diagram types** beyond the Process diagram: **Collaboration**,
  **Choreography**, and **Conversation** (§9, §11).
- A **mapping to WS-BPEL** (§14).
- The acronym re-expanded from "Business Process *Modeling* Notation" (1.x) to "Business
  Process *Model and* Notation" (2.0).

The standardisation timeline (1.0 → 1.2 → 2.0 → ISO/IEC 19510 → 2.0.2) is summarised in
`REF-BPMN-001 §5`.

## Annex A — Revision History

| Version | Date       | Author | Changes                       |
|---------|------------|--------|-------------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — BPMN Annex A. |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/annex-a-changes-from-v1.2.md`; authoritative source
is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 Annex A on any edition change. Increment `version`; append a
row to the Revision History above.

### B.4 References
OMG BPMN 2.0.2 Annex A; `REF-BPMN-001 §5`.
