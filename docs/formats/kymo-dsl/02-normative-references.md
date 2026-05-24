---
title: "Kymo DSL — Clause 2: Normative References"
document_id: KYMO-DSL-NORMREF-001
version: "2.6"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers authoring or parsing `.kymo` files
review_cycle: On grammar change, or annually (whichever first)
supersedes: null
related_documents:
  - KYMO-DSL-001             # Language specification (index)
  - KYMO-DSL-GRAMMAR-001     # Clause 6 — Grammar (EBNF per ISO 14977)
  - BPD-DGM-001              # Diagram DSL design rationale (§5.5)
  - model.py
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - normative-references
  - ebnf
  - iso-14977
  - iso-15289
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC 14977:1996
  - ISO 8601:2019
---

# Kymo DSL — Clause 2: Normative References

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-NORMREF-001                              |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-001`, `KYMO-DSL-GRAMMAR-001`, `BPD-DGM-001` |

## 2. Normative References

The following documents are indispensable for the application of this specification:

| Reference                       | Subject                                            |
|---------------------------------|----------------------------------------------------|
| ISO/IEC 14977:1996              | Extended Backus–Naur Form (EBNF) notation         |
| ISO/IEC/IEEE 15289:2019         | Information item content                          |
| ISO 8601:2019                   | Date and time format (YYYY-MM-DD)                 |
| BPD-DGM-001 §5.5                | Diagram DSL design rationale and worked examples  |
| `model.py`                      | Concrete data model produced by parsing           |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 2 (Normative References) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/02-normative-references.md`;
authoritative source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
When a referenced standard changes edition, update the relevant row; increment
`version`; append a row to Annex A.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set); reconcile any deviation there
before release.
