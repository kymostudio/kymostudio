---
title: "Kymo DSL — Clause 3: Terms and Definitions"
document_id: KYMO-DSL-TERMS-001
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
  - KYMO-DSL-SEMANTICS-001   # Clause 7 — Semantics
  - model.py
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - terms
  - definitions
  - glossary
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL — Clause 3: Terms and Definitions

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-TERMS-001                                |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-001`, `KYMO-DSL-GRAMMAR-001`, `KYMO-DSL-SEMANTICS-001` |

## 3. Terms and Definitions

For the purposes of this specification, the following terms apply:

- **3.1 Diagram** — the top-level entity declared by a single `.kymo` file; corresponds to one instance of `model.Diagram`.
- **3.2 Leaf** — a single rendered element (icon + name + subtitle); the surface form for a `model.Component`. Declared as `id shape/icon/accent "Name" "Sub" [@ placement]`.
- **3.3 Container** — a brace-delimited block (`id kind … { … }`). Two flavours, distinguished by the kind keyword on the opening line:
  - **Region container** — kind ∈ `outer | inner`. Visible rectangle with a label; bounds auto-fit to its members.
  - **Layout container** — kind ∈ `horizontal | vertical`. Invisible Figma-style auto-layout frame; positions its members along the named axis.
- **3.4 Body** — the lines between a container's `{` and its matching `}`. May contain nested containers, inline leaf definitions (region body only), bare-id membership references, and grid rows (region body only).
- **3.5 Bare-id reference** — one or more whitespace-separated identifiers on a body line; declares membership without (re-)defining a leaf. The leaf must be defined elsewhere in the file.
- **3.6 Edge** — a directed arrow connecting two nodes (leaves, regions, or a mix). Always declared at file scope.
- **3.7 Anchor** — a named attachment point on a node's bounding box (`top` / `right` / `bottom` / `left` / `center`).
- **3.8 Via** — an explicit waypoint coordinate forcing an edge through a specific point.
- **3.9 Directive** — a metadata declaration (`canvas:`, `title:`, `subtitle:`) or the `external …` placement statement; file scope only.
- **3.10 Resolver** — the post-parse pass (`alignment.resolve_alignments`) that computes positions from parent/align relationships and layout containers.
- **3.11 Auto-canvas** — render-time computation of canvas dimensions when `canvas:` is omitted.
- **3.12 Contains flattening** — when a region container is nested inside another region container, the inner region's leaf members are also appended to the outer region's `contains` list so its auto-bounds envelop nested leaves. Layout containers do NOT propagate.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 3 (Terms and Definitions) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/03-terms-and-definitions.md`;
authoritative source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
When a term is added, removed, or redefined, update this clause; increment
`version`; append a row to Annex A.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set); reconcile any deviation there
before release.
