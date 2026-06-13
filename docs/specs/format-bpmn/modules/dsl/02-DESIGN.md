---
title: BPMN in the kymo DSL — Design
document_id: DESIGN-BPMN-DSL-001
version: "1.1"
issue_date: 2026-05-23
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo DSL parser, layout engine, and renderers
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - FEAT-BPMN-DSL-001    # Requirements (traced below)
  - TEST-BPMN-DSL-001    # Test documentation
  - PLAN-BPMN-DSL-001   # Plan
  - BPMN-MAP-001              # BPMN importer element mapping
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - dsl
  - design
  - architecture
  - sugiyama
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN in the kymo DSL — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-BPMN-DSL-001                             |
| Version      | 1.1                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-23                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-DSL-001, TEST-BPMN-DSL-001, PLAN-BPMN-DSL-001 |

Realises the requirements in FEAT-BPMN-DSL-001 (FR/NFR IDs cited per clause).
Covers ISO/IEC/IEEE 12207 Architecture & Design Definition.

## 1. Scope

The architecture and algorithm behind the `bpmn { }` block: how source text
becomes a resolved sub-diagram the existing renderer can draw. The normative
grammar is in KYMO-DSL-001; behaviour requirements in FEAT-BPMN-DSL-001.

## 2. Grammar → AST → model (FR-1…FR-7)

`dsl.py` `parseBlock` detects a file-scope `bpmn {` opener and parses the body
into a `BpmnBlock` AST (node declarations + connections):

- **Nodes** → `bpmn-*` `Component`s. The kind keyword (+ optional `type=`)
  selects `(shape, marker)` per FR-3/FR-4, reusing the `bpmn_shapes` marker keys
  (BPMN-MAP-001). Box size is set on `Component.size` from `model.SHAPE_HALF`
  (FR-5).
- **Connections** → `Edge`s. The arrow selects `bpmn_flow` (`->` sequence,
  `~>` message, `..>` association); chains and `;` expand to one `Edge` per
  segment (FR-6/FR-7).

No positions are computed here — the AST is positionless.

## 3. Layout engine — `bpmn_layout.py` (FR-8)

A left-to-right Sugiyama pipeline turns the positionless graph into geometry:

1. **Rank / layer** — longest-path from sources (layer = column / x). Back-edges
   (DFS) are reversed for ranking and restored for routing (basic loop tolerance).
2. **Dummy nodes** — edges spanning >1 layer are split into unit segments through
   dummy nodes (routing channels + crossing accounting). *(The P0 spike's order
   graph has no layer-skipping edge, so this step is unverified there; it is
   required for graphs whose flows bypass a stage.)*
3. **Ordering** — BFS initialisation, then median/barycenter sweeps (fixed
   iteration count) minimise crossings. A new layer-array variant; it reuses the
   *idea* of `layout.minimize_crossings`, not its tree-shaped implementation.
4. **Coordinates** — x per layer cumulative (`maxWidth(layer)` + h-gap); y by
   stacked slots with v-gap, then median alignment (Brandes–Köpf-lite), keeping
   single-in/single-out chains collinear so the main flow stays straight. The P0
   spike showed naïve symmetric per-layer centring *lifts* the trunk at an
   asymmetric fork (e.g. an `xor` whose two successors straddle the parent); the
   engine MUST instead pin the continuing single successor on the parent's `y`
   and offset only true branches (priority/median), not centre every layer block.
5. **Pin override (FR-9)** — a node carrying `@ (x,y)` has its centre replaced by
   the pinned value; un-pinned nodes are not re-ranked/re-ordered (v1).
6. **Orthogonal routing** — collinear endpoints → straight segment; otherwise an
   elbow through the inter-layer gap (dummy-node x as the bend channel). Edges
   incident to a pinned node route to the pinned centre. Emits `Edge.points`
   (sharp polyline), `bpmn_flow`, and a `label_pos` heuristic.

## 4. Integration and data flow

- **`bpmn_layout.layout(diagram)`** is a post-parse pipeline pass (like `layout()`
  / `resolve_alignments()`), invoked by `cli.py`. It consumes `diagram.bpmn_blocks`,
  appends the positioned components/edges, sets the canvas from the laid-out extent
  (as `from_bpmn` does), and clears the blocks. `parse()` itself stays position-free,
  so the parser is independently testable (P1). *(Earlier drafts placed this in
  `_State.finalize`; a pass keeps `parse()` pure and the renderer guard a backstop.)*
- `cli.py` **skips `resolve_alignments` for bpmn-block diagrams** (gated like
  `.bpmn`): the geometry is already absolute, and `resolve_alignments` would perturb
  `points`-bearing edges (`_stagger_*`) while `_auto_size_canvas` ignores
  `Edge.points` — so the layout owns canvas sizing.
- **JS parity (FR-11)**: `dsl.ts` gains the block branch; a new `bpmn-layout.ts`
  ports the algorithm. The JS renderer already routes `e.points` → `renderBpmnEdge`.

## 5. Renderer reuse (FR-10)

Because the block emits a fully-resolved sub-diagram (absolute `pos`/`size` +
edge `points`/`bpmn_flow`), the existing back-end draws it with **no change**:
`bpmn-*` glyphs via `bpmn_shapes`, flows via `render_bpmn_edge` / `renderBpmnEdge`
(dispatched on `e.points`), and BPMN defs/CSS injected only when bpmn shapes are
present.

## 6. Determinism (NFR-1)

Every ordering and tie-break uses stable sorts; iteration counts are fixed;
coordinates are integers. Re-running the layout on the same input yields
byte-identical SVG, so golden tests stay stable (TEST-BPMN-DSL-001 TC-7). The
P0 spike pre-validated this: re-rendering the order graph produced byte-identical
SVG across runs.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes                                |
|---------|------------|--------|----------------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue (extracted from the plan). |
| 0.2     | 2026-05-23 | Vũ Anh | Fold P0 spike findings: explicit primary-path/trunk pinning (§3.4), dummy-node caveat (§3.2), determinism pre-validated (§6). |
| 0.3     | 2026-05-23 | Vũ Anh | §4: integration is a cli `bpmn_layout.layout()` pass (not `finalize`); skip `resolve_alignments` for bpmn-block diagrams (realised in P2). |
| 1.0     | 2026-05-23 | Vũ Anh | Released — feature shipped (P0–P3 merged; normative grammar in KYMO-DSL-001 §6.9). |
| 1.1 | 2026-05-24 | Vũ Anh | Corrected the importer-mapping cross-reference to BPMN-MAP-001 (the importer doc gained an ID; moved to docs/formats/bpmn.md). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/format-bpmn/modules/dsl/02-DESIGN.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement IDs it
traces (FR-8…FR-10, NFR-1) consistent with FEAT-BPMN-DSL-001; increment
`version`; append a row to Annex A; reflect any grammar change in KYMO-DSL-001.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is
FEAT-BPMN-DSL-001 and KYMO-DSL-001. Reconcile any deviation there before
release.
