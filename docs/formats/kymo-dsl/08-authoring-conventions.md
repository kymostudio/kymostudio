---
title: "Kymo DSL — Clause 8: Authoring Conventions"
document_id: KYMO-DSL-AUTHORING-001
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
  - BPD-DGM-001              # Architecture-diagram best practices
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - authoring
  - conventions
  - style
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL — Clause 8: Authoring Conventions

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-AUTHORING-001                            |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-001`, `KYMO-DSL-GRAMMAR-001`, `KYMO-DSL-CONF-001`, `BPD-DGM-001` |

## 8. Authoring Conventions

### 8.1 Recommended Statement Order

```
1. Metadata           title, subtitle, canvas (optional)
2. Region containers  outer/inner groupings, with leaves defined inline
                      where they semantically belong
3. Layout containers  positioning rules; reference leaves by bare id
4. Loose leaves       leaves not owned by any region (free-floating actors,
                      badges, annotations)
5. external           if a leaf sits above a grid cell
6. Edges              connections
```

This order matches the conceptual reading flow (where → how-positioned → what → how-connected). The parser is order-independent, so this is purely a stylistic recommendation.

### 8.2 Where to Define a Leaf

A leaf may be declared either at file scope or inside a region body. The guideline:

- **Inside the region** when the leaf belongs to exactly one semantic group (most common case). Vertical alignment of `id shape/icon/accent "Name" "Sub"` columns stays tight because the surrounding indentation is constant.
- **At file scope** when the leaf is a free-floating actor (e.g., end user, badge, annotation), or when it participates in multiple containers via bare-id references.

A leaf is defined **once**. To express membership in multiple containers, define the leaf in one place and reference it by bare id elsewhere. The auto-bounds resolver handles the rest.

### 8.3 Whitespace and Alignment

Authors SHOULD vertically align fields within a section for readability. The parser ignores extra whitespace.

```text
user      circle/user/blue       "Agent/User"     "Bootcamp participant"
router    hex/hex-agent/green    "Intent Router"  "Shallow / Deep"
```

### 8.4 Block Form

Containers always use the multi-line `{ … }` form. Inline `{ id1 id2 … }` on a single line is NOT supported (see clause 9.2).

### 8.5 Comment Density

Inline comments SHOULD explain **why** a non-obvious offset or via point exists, NOT what the line does. Self-evident assignments need no comments.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 8 (Authoring Conventions) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/08-authoring-conventions.md`;
authoritative source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
On any change to recommended authoring conventions, update this clause; increment
`version`; append a row to Annex A.

### B.4 Backwards Compatibility
These are non-normative recommendations; the normative surface is `KYMO-DSL-001`
(the set). Reconcile any conflict with clause 6/9 before release.
