# 06 — Stability & Dynamics: determinism, the mental map, animation

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-007                                             |
| Version     | 0.1                                                            |
| Issue Date  | 2026-06-21                                                     |
| Status      | Draft                                                         |
| Category    | Highest-opportunity for kymo                                 |
| Related     | [Index](README.md) · prev [05 Label placement](05-label-placement.md) · next [07 Scalability](07-scalability.md) |

## The problem

A diagram is rarely drawn once. It is **re-laid-out** after every edit, and the same source may be
laid out on different machines. Three connected demands fall out of this:

1. **Determinism** — the same input must give the same output (for diffs, CI snapshots, reproducibility).
2. **Mental-map preservation** — after a small edit (add a node), the layout should change *as little
   as possible* so the user doesn't lose their orientation.
3. **Smooth transitions** — animating from layout A to layout B (morphing positions) when the graph
   or its state changes.

## Why it's hard

- **Force-directed layouts are non-deterministic**: random initial placement → a different drawing
  each run, and tiny input changes can cause a total re-arrangement ("jumping").
- **Incremental / online layout** — recomputing from scratch destroys the mental map; computing a
  *minimal-change* update that is still aesthetically good is an open, actively-researched problem
  (dynamic graph drawing).
- **Animation** — interpolating between two layouts without nodes crossing over each other, while
  keeping every intermediate frame readable, is its own constrained problem.

## State of the art

- Determinism via fixed seeds + stable sorts + integerised coordinates (what most CI-friendly engines do).
- Mental-map work: Misue et al. (1995) formalised the *mental map* and "preserving" criteria
  (orthogonal ordering, proximity, topology); dynamic/online layout research builds on it.
- Animated transitions: D3's general update pattern; research on morphing graph drawings.

## Where kymo stands

This is **kymo's strongest differentiator**. (1) Determinism is already a design rule: `bpmn_layout.rs`
is explicitly deterministic (fixed sweep counts, stable sorts, integer coordinates) so the BPMN
conformance snapshots are reproducible. (2) kymo's headline output is **animated SVG / WebP** — it
already *produces* state-to-state motion, which almost no graph-layout engine does. (3) The `to_webp`
/ animation pipeline is the natural home for layout-transition morphing.

**Opportunity (highest):** few competitors treat layout *stability + animation* as first-class. kymo
already owns the rendering pipeline for it. A "stable incremental relayout + animated morph between
states" capability would be a genuine market-leading feature, not a tie. See `RES-LOOP-002` §strategic.

## References

- K. Misue, P. Eades, W. Lai, K. Sugiyama — *Layout Adjustment and the Mental Map* (1995).
- S. North — *Incremental Layout in DynaDAG* (1996).
- `bpmn_layout.rs` (determinism), kymo `to_webp.py` / animated output pipeline.
