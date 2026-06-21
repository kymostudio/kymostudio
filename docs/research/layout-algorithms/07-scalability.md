# 07 — Scalability: big graphs are slow, and turn into hairballs

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-008                                             |
| Version     | 0.1                                                            |
| Issue Date  | 2026-06-21                                                     |
| Status      | Draft                                                         |
| Category    | Scale                                                        |
| Related     | [Index](README.md) · prev [06 Stability & dynamics](06-stability-and-dynamics.md) · next [08 No ground truth](08-no-ground-truth.md) |

## The problem

Algorithms that are fine for 50 nodes fall over at 10,000+. Two failures compound: the layout is too
**slow** to compute interactively, and even if computed, the result is an unreadable **"hairball"**
where structure is invisible.

## Why it's hard

- **Force-directed is O(n²) per iteration** (every node repels every other), and it needs many
  iterations — naively quadratic-to-cubic overall.
- **Dense / complete graphs** and **high-degree hub nodes** have inherently many crossings; no
  placement makes them clean.
- Readability collapses before performance does: past a few hundred edges the eye can't follow them.

## State of the art

- **Approximation for forces**: Barnes–Hut quadtree (O(n log n)) and the **Fast Multipole Method**
  (FM³, Hachul & Jünger) for large force-directed layouts; multilevel coarsening (lay out a shrunken
  graph, then refine).
- **GPU** force simulation for interactive large graphs.
- **Readability tactics** beyond raw layout: edge bundling, filtering / level-of-detail, clustering
  into super-nodes, on-demand expansion.

## Where kymo stands

Scale is **not kymo's market**. kymo targets authored diagrams — flowcharts, architecture, BPMN,
mindmaps — typically tens of nodes, where the heuristic pipelines in `kymo-layout` are comfortably
fast and the output is meant to be *read*, not explored as a 10k-node network. The force-directed
path (`kymo-manatee` CoSE-Bilkent / FCoSE) covers mindmap-scale graphs.

**Strategic note:** competing with ELK/Graphviz on giant-graph performance is a low-value race for
kymo — those incumbents are strong and the use-case isn't kymo's. Effort is better spent on the
small-to-medium *quality* problems (routing, aesthetics, animation) where kymo can lead.

## References

- S. Hachul, M. Jünger — *Drawing Large Graphs with a Potential-Field-Based Multilevel Algorithm* (FM³) (2004).
- J. Barnes, P. Hut — *A Hierarchical O(N log N) Force-Calculation Algorithm* (1986).
- `packages/rust/kymo-manatee` (force-directed), `kymo-layout` heuristic pipelines.
