# 01 — Computational Hardness: the core objectives are NP-hard

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-002                                              |
| Version     | 0.1                                                             |
| Issue Date  | 2026-06-21                                                      |
| Status      | Draft                                                          |
| Category    | Foundational                                                  |
| Related     | [Index](README.md) · next [02 Aesthetic trade-offs](02-aesthetic-tradeoffs.md) |

## The problem

The quantities that *define* a good drawing — number of edge crossings, number of bends, drawing
area, number of non-overlapping labels — are the things we'd like to *minimise*. Almost every one of
those minimisation problems is **NP-hard**. There is no efficient algorithm that returns the optimum
for general graphs; there never will be unless P = NP.

## Why it's hard

- **Crossing number is NP-complete** (Garey & Johnson, 1983) — even the restricted *2-layer crossing
  minimisation* used inside Sugiyama's ordering step is NP-hard.
- **Bend minimisation** in orthogonal drawings is NP-hard in general (polynomial only once the
  combinatorial embedding is fixed — Tamassia's flow formulation).
- **Area minimisation** / optimal packing of arbitrary boxes is NP-hard (bin-packing family).
- **Map/label labelling** (placing labels without overlap) is NP-hard.

Because the exact optima are out of reach, *every* production engine is a stack of **heuristics**:

| Step | Heuristic actually used |
|---|---|
| Layer assignment (ranking) | longest-path / network-simplex |
| Crossing reduction | barycenter / median ordering, swept iteratively |
| Coordinate assignment | Brandes–Köpf alignment |
| Edge routing | greedy / shortest-path with obstacle penalties |

## State of the art

Sugiyama-style layered drawing (Sugiyama, Tagawa & Toda, 1981) plus Brandes–Köpf coordinate
assignment (2001) is the de-facto pipeline (Graphviz `dot`, dagre, ELK `layered`). These are *good
heuristics*, not optimal solvers. ILP/SAT-based exact crossing minimisation exists (OGDF) but only
scales to tiny graphs and is irrelevant in interactive tools.

## Where kymo stands

kymo follows the same heuristic pipeline: `packages/rust/kymo-layout/src/sugiyama.rs` does
longest-path ranking → dummy nodes → barycenter ordering → trunk-pinned coordinates → orthogonal
routing; `dagre.rs` wraps the `dagre` crate for the same family. `layout.py:minimize_crossings()`
is a barycenter reorder for the DSL grid. **Consequence for the loop:** because optimality is
unreachable, the layout-quality loop (`RES-LOOP-002`) is the *right* shape — incremental
hill-climbing on a proxy is how this whole field makes progress.

## References

- M. Garey, D. Johnson — *Crossing Number is NP-Complete*, SIAM J. Algebraic Discrete Methods (1983).
- K. Sugiyama, S. Tagawa, M. Toda — *Methods for Visual Understanding of Hierarchical System Structures* (1981).
- U. Brandes, B. Köpf — *Fast and Simple Horizontal Coordinate Assignment* (2001).
- R. Tamassia — *On Embedding a Graph in the Grid with the Minimum Number of Bends* (1987).
