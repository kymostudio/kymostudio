---
title: "Kymo DSL — Clause 4: Abbreviations"
document_id: KYMO-DSL-ABBR-001
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
  - KYMO-DSL-TERMS-001       # Clause 3 — Terms and Definitions
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - abbreviations
  - acronyms
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL — Clause 4: Abbreviations

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-ABBR-001                                 |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-001`, `KYMO-DSL-TERMS-001`              |

## 4. Abbreviations

| Abbreviation | Expansion                                |
|--------------|------------------------------------------|
| DSL          | Domain-Specific Language                 |
| EBNF         | Extended Backus–Naur Form (ISO 14977)    |
| SVG          | Scalable Vector Graphics                 |
| AST          | Abstract Syntax Tree                     |
| ID           | Identifier (component/region name)       |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 4 (Abbreviations) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/04-abbreviations.md`; authoritative
source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
When an abbreviation is added or changed, update this clause; increment `version`;
append a row to Annex A.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set); reconcile any deviation there
before release.
