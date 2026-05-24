---
title: "BPMN 2.0.2 — Annex A: Changes from v1.2"
document_id: BPMN-NREF-ANNEXA-001
version: "1.3"
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
  - BPMN-NREF-CHOREO-001   # Clause 11 — Choreography (new in 2.0)
  - BPMN-NREF-COLLAB-001   # Clause 9 — Collaboration / Conversation (new in 2.0)
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
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **Annex A — Changes from v1.2** *(informative)* (pp.479–480) |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-ADDINFO-001`, `BPMN-NREF-CHOREO-001`, `BPMN-NREF-COLLAB-001`, `REF-BPMN-001` |

Mirrors **Annex A (Changes from v1.2)** — an **informative** annex — of the OMG BPMN 2.0.2
specification (pp.479–480). Part of the normative-reference set `BPMN-NREF-001`. Where this
note and the OMG specification disagree, the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for Annex A of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 Annex A; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §A.1 Changes from BPMN, v1.2 (p.479)
Annex A records the notational and technical changes made when **BPMN 2.0** superseded **BPMN
1.2**. The annex itself lists exactly the following.

**Major notational changes:**
- The addition of a **Choreography** diagram.
- The addition of a **Conversation** diagram.
- **Non-interrupting Events** for a Process.
- **Event Sub-Processes** for a Process.

**Major technical changes:**
- A **formal metamodel**, expressed through the class-diagram figures.
- Interchange formats for **abstract-syntax model interchange** in both **XMI and XSD**.
- Interchange formats for **diagram interchange** in both **XMI and XSD**.
- **XSLT transformations** between the XMI and XSD formats.

**Other technical changes:**
- **Reference Tasks are removed.** They provided reusability *within a single diagram*, whereas
  **GlobalTasks** are reusable *across multiple diagrams*; GlobalTasks can be used instead of
  Reference Tasks, simplifying the language and implementations.

The two new diagram types are detailed in Clause 9 / Clause 11 (`BPMN-NREF-COLLAB-001`,
`BPMN-NREF-CHOREO-001`). The broader standardisation timeline (1.0 → 1.2 → 2.0 → ISO/IEC 19510
→ 2.0.2, and the acronym's re-expansion from "…*Modeling* Notation" to "…*Model and*
Notation") is summarised in `REF-BPMN-001 §5`.

## Annex A — Revision History

| Version | Date       | Author | Changes                       |
|---------|------------|--------|-------------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — BPMN Annex A. |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: replaced the earlier paraphrase with the actual Annex A change list (the four notational changes, four technical changes, and the Reference-Task removal), marked the annex *informative*, and moved the broader-timeline/name-change asides to the `REF-BPMN-001 §5` cross-reference; added page citation. |

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
OMG BPMN 2.0.2 Annex A (pp.479–480); `REF-BPMN-001 §5`.
