---
title: "Kymo DSL — Clause 1: Scope"
document_id: KYMO-DSL-SCOPE-001
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
  - KYMO-DSL-NORMREF-001     # Clause 2 — Normative References
  - BPD-DGM-001              # Architecture-diagram best practices
  - dsl.py
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - scope
  - purpose
  - reference-implementation
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL — Clause 1: Scope

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-SCOPE-001                                |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-001`, `KYMO-DSL-NORMREF-001`, `BPD-DGM-001` |

## 1. Scope

### 1.1 Purpose

This document specifies the **Kymo DSL** — a textual surface language for declaring architecture diagrams. A conforming source file (`.kymo`) declares the leaves, containers (region and layout), and edges of a single diagram. A conforming parser produces an in-memory `model.Diagram` value semantically equivalent to the source.

### 1.2 Applicability

This specification applies to:

- Source files with extension `.kymo` in this repository
- The reference parser implementation [`dsl.py`](../../../packages/python/src/kymo/dsl.py)
- Any future tooling (linters, formatters, IDE plug-ins) operating on `.kymo` files

It does **not** specify:

- The SVG renderer (see [`to_svg.py`](../../../packages/python/src/kymo/to_svg.py) and `BPD-DGM-001`)
- The build/dispatch system (see [`cli.py`](../../../packages/python/src/kymo/cli.py))
- The graphical conventions for diagram aesthetics (see `BPD-DGM-001`)

### 1.3 Reference Implementation

[`dsl.py`](../../../packages/python/src/kymo/dsl.py) is the normative reference implementation. Where this document and the reference implementation disagree, the implementation is authoritative for behaviour; this document SHALL be updated to match.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 1 (Scope) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/01-scope.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
On any change to the DSL's scope or reference implementation, update this clause,
keep it in lockstep with `dsl.py`, increment `version`, and append a row to Annex A.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set) and `dsl.py` (the reference
implementation); reconcile any deviation there before release.
