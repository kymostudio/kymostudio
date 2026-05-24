---
title: "Kymo DSL — Clause 5: Lexical Conventions"
document_id: KYMO-DSL-LEX-001
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
  - KYMO-DSL-CONF-001        # Clause 9 — Conformance
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - lexical
  - tokens
  - encoding
  - comments
  - string-literals
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC 14977:1996
  - ISO 8601:2019
---

# Kymo DSL — Clause 5: Lexical Conventions

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-LEX-001                                  |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-001`, `KYMO-DSL-GRAMMAR-001`, `KYMO-DSL-CONF-001` |

## 5. Lexical Conventions

### 5.1 Encoding

Source files SHALL be UTF-8 encoded. The Byte-Order Mark (BOM) SHALL NOT appear.

### 5.2 Line Termination

A logical line is terminated by `\n`, `\r\n`, or `\r`. The parser SHALL accept any of these.

### 5.3 Whitespace

Within a line, horizontal whitespace (spaces, tabs) between tokens is insignificant except inside double-quoted strings, where it is preserved verbatim.

### 5.4 Comments

A `#` character begins a comment that extends to end of line. Exceptions:

- A `#` inside a double-quoted string is data, not a comment delimiter.
- A `#` immediately followed by a hexadecimal digit (`[0-9a-fA-F]`) is a colour literal (e.g. `#76b900`), not a comment.

### 5.5 String Literals

A string literal is delimited by ASCII double quotes (`"`). Escape sequences are NOT processed; a literal `"` may not appear inside.

### 5.6 Identifiers

```
identifier   = ( letter | "_" ) , { letter | digit | "_" } ;
letter       = "A" | … | "Z" | "a" | … | "z" ;
digit        = "0" | … | "9" ;
```

Identifiers SHALL be unique within their kind (leaf IDs unique among leaves, container IDs unique among containers). The parser MAY accept a leaf and a container sharing an ID, but edge resolution treats leaves as winning in lookups.

### 5.7 Numeric Literals

Integer literals match `-?\d+`. Floating-point literals are NOT supported.

### 5.8 Hexadecimal Colour Literals

```
hexcolour    = "#" , hexdigit , hexdigit , hexdigit , [ hexdigit , [ hexdigit , [ hexdigit , [ hexdigit , hexdigit ] ] ] ] ;
hexdigit     = digit | "a" | … | "f" | "A" | … | "F" ;
```

3-, 6-, or 8-digit hex codes are valid. The colour value is opaque to the parser; the renderer interprets it.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 5 (Lexical Conventions) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/05-lexical-conventions.md`;
authoritative source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
On any lexical-rule change, update this clause, keep it in lockstep with `dsl.py`,
increment `version`, and append a row to Annex A.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set) and `dsl.py`; reconcile any
deviation there before release.
