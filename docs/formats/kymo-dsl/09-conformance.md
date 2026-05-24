---
title: "Kymo DSL — Clause 9: Conformance"
document_id: KYMO-DSL-CONF-001
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
  - KYMO-DSL-GRAMMAR-001     # Clause 6 — Grammar
  - KYMO-DSL-LEX-001         # Clause 5 — Lexical Conventions
  - KYMO-DSL-SEMANTICS-001   # Clause 7 — Semantics
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - conformance
  - parser
  - renderer
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL — Clause 9: Conformance

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-CONF-001                                 |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-001`, `KYMO-DSL-GRAMMAR-001`, `KYMO-DSL-LEX-001`, `KYMO-DSL-SEMANTICS-001` |

## 9. Conformance

### 9.1 Conforming Source File

A `.kymo` file is conforming if and only if:

1. It is UTF-8 encoded (clause 5.1)
2. Every non-comment, non-blank line matches one of the productions in clause 6
3. Every referenced `id` (clause 7.2) is defined within the file
4. Reserved keywords (clause 6.8) are not used as user-defined identifiers

### 9.2 Conforming Parser

A conforming parser SHALL:

1. Accept every conforming source file and produce a `model.Diagram` semantically equivalent to the reference parser
2. Reject non-conforming files with a diagnostic that includes the line number
3. Preserve string literal content verbatim
4. Not require a particular order of statements
5. Implement the `canvas:` colon-optional backward compatibility rule

A conforming parser MAY:

- Accept inline blocks (`{ id1 id2 }` on a single line) as an extension
- Emit warnings for stylistic violations (e.g., unaligned columns)

### 9.3 Conforming Renderer

Renderer conformance is outside the scope of this specification. See `to_svg.py` and `BPD-DGM-001`.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 9 (Conformance) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/09-conformance.md`; authoritative
source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
On any change to conformance criteria, update this clause, keep it in lockstep with
`dsl.py` and the conformance suite, increment `version`, and append a row to Annex A.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set) and `dsl.py`; reconcile any
deviation there before release.
