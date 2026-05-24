---
title: "Kymo DSL — Clause 7: Semantics"
document_id: KYMO-DSL-SEMANTICS-001
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
  - KYMO-DSL-TERMS-001       # Clause 3 — Terms and Definitions
  - DESIGN-KYMO-DSL-001      # Front-end design (resolution pipeline)
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - semantics
  - resolution
  - auto-canvas
  - forward-references
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL — Clause 7: Semantics

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-SEMANTICS-001                            |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-001`, `KYMO-DSL-GRAMMAR-001`, `KYMO-DSL-TERMS-001`, `DESIGN-KYMO-DSL-001` |

## 7. Semantics

### 7.1 Parse-time vs Resolve-time

The parser is **declarative**: it collects all leaves, containers, edges, and directives into a `model.Diagram` value WITHOUT validating cross-references or computing positions. The following are deferred to `alignment.resolve_alignments`:

1. **Auto-layouts** — leaves referenced by a layout container receive computed positions.
2. **Parent/child alignment** — leaves with `@ parent side gap` placements are positioned relative to their resolved parents.
3. **Region bounds** — region containers with non-empty `contains` lists (including IDs flattened from nested regions; see clause 3.12) compute their bounding rectangles from the positions of their members.
4. **Canvas auto-sizing** — when `canvas:` is omitted, dimensions derive from the resolved geometry plus a margin.

### 7.2 ID Resolution

Each `id` referenced (in a container body's bare-id list, edge `src`/`dst`, leaf `@ parent`) SHALL be defined elsewhere in the file. The parser does not enforce this; `alignment.resolve_alignments` raises `KeyError` on unresolved references.

### 7.3 Forward References

References MAY appear before the referenced entity is defined. The parser is order-independent for resolution purposes.

### 7.3.1 Contains Flattening

When a region container `R_inner` is nested inside another region container `R_outer`, every id in `R_inner.contains` is appended to `R_outer.contains` after the inner body closes. This is depth-first and transitive: an inner-inner region's leaves propagate up through every enclosing region. Layout containers do NOT propagate — their `contains` exists purely for positioning, not bounds.

The flattened `contains` list is consumed by `_resolve_region_bounds` (`src/alignment.py`) to compute the outer rectangle's envelope. Without flattening, the outer rect would only hug its directly-declared leaves and clip the nested region's contents.

### 7.4 Auto-Canvas

If `canvas:` is omitted (or any of its dimensions is 0), the resolver computes:

```
width  = max( component.right, region.right, edge_via.x, edge_label_pos.x ) + 30
height = max( component.bottom, region.bottom, edge_via.y, edge_label_pos.y ) + 30
```

…over all elements after resolution. The 30-px margin SHALL be applied.

### 7.5 Title Block

When `title:` and/or `subtitle:` are set, the renderer emits a fixed-height block at the top of the canvas and translates all content downward by:

```
title_block_h = top_margin + (title_cap if title) + (gap + sub_cap if subtitle) + bottom_gap
              = 24 + (18 if title) + (8 + 11 if subtitle) + 28
```

DSL coordinates therefore remain in the **content coordinate space**; the title block lives in an absolute coordinate space above it.

### 7.6 Render-Time Concerns Outside DSL

The following SHALL NOT appear in `.kymo` files:

- Output file path (controlled by `cli.py` → `TARGETS`)
- Stylesheet or icon definitions (controlled by `to_svg.py` → `STYLE`, `DEFS`)
- Target dispatch logic

The DSL describes **what** to draw; the renderer decides **how** and **where**.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 7 (Semantics) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/07-semantics.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
On any change to resolution semantics, update this clause, keep it in lockstep with
`alignment.py` / `layout.py`, increment `version`, and append a row to Annex A.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set) and the reference implementation;
reconcile any deviation there before release.
