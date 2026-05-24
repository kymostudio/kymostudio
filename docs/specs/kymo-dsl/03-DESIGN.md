---
title: Kymo DSL Front-End — Design
document_id: DESIGN-KYMO-DSL-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo DSL parser, layout engine, alignment resolver, and renderers
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - INTRO-KYMO-DSL-001       # Introduction
  - FEAT-KYMO-DSL-001        # Requirements (traced below)
  - TEST-KYMO-DSL-001        # Test documentation
  - PLAN-KYMO-DSL-001        # Plan
  - KYMO-DSL-001             # kymo DSL language specification (normative grammar)
  - DESIGN-BPMN-DSL-001      # bpmn { } block design (delegated subset)
  - KYMOJSON-MAP-001         # .kymo.json — serialization of the resolved model
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - design
  - architecture
  - parser
  - alignment
  - pipeline
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL Front-End — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-KYMO-DSL-001                                |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-KYMO-DSL-001, FEAT-KYMO-DSL-001, TEST-KYMO-DSL-001, PLAN-KYMO-DSL-001 |

Realises the requirements in FEAT-KYMO-DSL-001 (FR/NFR IDs cited per clause).
Covers ISO/IEC/IEEE 12207 Architecture & Design Definition. The normative
grammar is KYMO-DSL-001; behaviour requirements are in FEAT-KYMO-DSL-001.

## 1. Scope

The architecture behind the `.kymo` front-end: how line-oriented source text
becomes a fully-resolved `Diagram` the *dumb* back-end can draw. Paths below are
relative to `packages/python/src/kymo/` (Python, reference) and
`packages/js/src/` (JavaScript). The design's guiding principle: the
**renderer is deliberately dumb** — `model.py` holds plain dataclasses and the
emitters only turn that data into output; to change a diagram you change the
data, never the renderer.

## 2. Pipeline and dispatch (FR-1, FR-11, FR-12)

`cli.py:load()` dispatches by file extension and returns
`(diagram, layout_spec, external_layout)`:

- `.kymo` → `dsl.py:parse()` (the front-end; this document).
- `.bpmn` → `from_bpmn.py:parse()` — DI geometry is already absolute.
- `.kymo.json` → `from_kymojson.py:parse()` — a serialized resolved model.
- `.py` → a module exposing `DIAGRAM` (+ optional `LAYOUT`, `EXTERNAL_LAYOUT`).

`cli.py:main()` then runs the resolution stages **conditionally**: if the diagram
carries `bpmn_blocks`, `bpmn_layout.layout()` runs first (DESIGN-BPMN-DSL-001); if
a `layout_spec` is present, `layout.py:layout()` runs; and
`alignment.py:resolve_alignments()` runs **unless** the source is already resolved
— `.bpmn`, `.kymo.json`, or a diagram that carried a `bpmn { }` block are skipped,
because their geometry is absolute and the alignment/auto-size passes (which
assume DSL-authored nodes) would perturb it. The hand-off to the renderer is
unconditional.

## 3. Parser — `dsl.py` (FR-1…FR-10)

`parse()` is a line-oriented recursive-descent reader. It is **purely
declarative**: it builds plain `model` dataclasses (`Component`, `Region`, `Edge`,
`Diagram`) and never validates a key or computes a coordinate.

- **Recursive descent** — `_parse_block(state, lines, start, parent)` walks lines
  and recurses into `{ … }` bodies. A **line discriminator** (KYMO-DSL-001 §6.6)
  classifies each line in a fixed order: close-brace, metadata directives, BPMN
  opener, layout tree, containers, edges, leaves, then bare-id references.
- **Regex table** — one compiled pattern per construct (e.g. `CANVAS_RE`,
  `TITLE_RE`, `EXTERNAL_RE`, `REGION_RE`, `LAYOUT_RE`, `LEAF_RE`, `EDGE_RE`,
  `ANCHOR_SPEC_RE`, `VIA_PT_RE`, `ROW_RE`, `BARE_IDS_RE`, `LAYOUT_TREE_RE`).
- **Builders** — `_make_component()`, `_make_region()`, `_make_layout()`,
  `_make_edge()` translate a matched line into a dataclass; edge options go
  through `_parse_edge_options()` → `_set_kv_option()` / `_set_flag()`.
- **Placement (FR-3)** — absolute `(x,y)` sets `pos`; relative `<parent> <side> [gap]`
  records `parent` / `align` / `align_gap` for later resolution by `alignment.py`.
- **Region body (FR-6)** — inline leaves append to the region's `contains`; a
  `row […]` switches the region to grid mode and is collected into `layout_dict`;
  the `external` directive is collected into `external_dict`.
- **Layout trees (FR-8)** — `_parse_layout_tree()` → `_tokenize_layout()` →
  recursive `_parse_layout_node()`; `|`/`,` separators with `{ }` nesting.
- **Comments (FR-10)** — `_strip_comment()` removes `#` outside quotes but keeps a
  `#`-then-hex-digit colour literal.
- **Finalisation** — `state.finalize()` returns `(diagram, layout_dict, external_dict)`.

The `bpmn { … }` block (FR-9) is recognised here and consumed into a positionless
`BpmnBlock`; its parsing and layout are owned by DESIGN-BPMN-DSL-001.

## 4. Layout engine — `layout.py:layout()` (FR-11)

When a `layout_spec` is present (named auto-layout frames and/or region `row`
grids, plus the `external_dict`), `layout()` packs members into rows/cells:
per-row height aligns across regions (so cross-region edges run flat), per-region
width is the max row width, and a component's cell width is `max(icon, longest
label)` + padding. Sizing constants derive from `model.SHAPE_HALF` so new shapes
do not drift between modules. Output is written in place: component centres,
region `bounds`, edge waypoints for non-`auto` routes, and the diagram extent.

## 5. Alignment resolver — `alignment.py:resolve_alignments()` (FR-11, NFR-1)

The five-pass resolver is where positions are actually computed; it mutates the
diagram in place and is safe to call once before rendering:

1. **`_resolve_auto_layouts`** — Figma-style: a region with a `layout` direction
   positions every child along that axis with `gap` spacing.
2. **`_resolve_component_alignments`** — pairwise parent/child anchoring
   (`align="right"` + `align_gap`) for components not placed by auto-layout;
   depth-first with cycle detection, so moving a parent moves all descendants.
3. **`_resolve_region_bounds`** — region bounding boxes computed from the enclosed
   components after their positions are final, widened to include label extent
   (`_label_half_width` / `_effective_half`, `LABEL_HEIGHT`).
4. **Edge staggering** — `_stagger_fanin_edges` spreads the attach points of
   several edges converging on one anchor; `_stagger_trunk_lanes` assigns
   Z-shaped edges sharing a corridor their own trunk-axis lane (Sugiyama-style
   channel routing).
5. **`_auto_size_canvas`** — when `width`/`height` are 0, derive them from the
   resolved geometry (component + region + via extents) plus a margin; an explicit
   `canvas` directive overrides.

## 6. Renderer hand-off — `to_svg.py:render()` (FR-12)

Because the pipeline emits a fully-resolved `Diagram`, the back-end is dumb:
`to_svg.py:render()` draws components, regions, and edges from resolved data;
sibling emitters `to_figma.py`, `to_excalidraw.py`, `to_webp.py` consume the same
model. Feature-specific CSS/defs (e.g. BPMN) are injected **only when the diagram
uses them**, so output for unaffected diagrams stays byte-identical (the golden
discipline — TEST-KYMO-DSL-001).

## 7. JavaScript parity (FR-13, NFR-2)

`packages/js` is an independent implementation at functional parity, **not a port**.
`dsl.ts` mirrors the parser (same regex set, same discriminator order),
`layout.ts` the layout engine, and `alignment.ts` the resolver; the public API is
`parse` / `parseDiagram`, rendered by `renderSVG`. It is **dependency-free** (ESM
+ `.d.ts`). To stay byte-equivalent with Python's integer rounding, JS rounds with
`pyRound` (`src/round.ts`, half-to-even) wherever Python uses `int(round(...))`.

## 8. Determinism and conformance (NFR-1, NFR-3, NFR-4)

Every ordering and tie-break uses stable sorts; iteration counts are fixed;
coordinates are integers — so re-running resolution on the same input yields
byte-identical SVG and golden tests stay stable (`test_diagrams` / `test_layout` /
`test_edges`). Python↔JS parity is enforced by a golden conformance suite (Python
is the sole golden writer; `KYMO_UPDATE_CONFORMANCE` regenerates). The grammar is
dual-sourced: a change to `dsl.py` is reconciled into KYMO-DSL-001 in lockstep
(NFR-4).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — design of the shipped `.kymo` front-end. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl/03-DESIGN.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement IDs it traces
(FR-1…FR-13, NFR-1…NFR-4) consistent with FEAT-KYMO-DSL-001; increment `version`;
append a row to Annex A; reflect any grammar change in KYMO-DSL-001.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is
FEAT-KYMO-DSL-001 and KYMO-DSL-001. Reconcile any deviation there before release.
