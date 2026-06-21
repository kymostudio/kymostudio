# 03 — Edge & Connector Routing: dodging nodes and each other

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-004                                             |
| Version     | 0.1                                                            |
| Issue Date  | 2026-06-21                                                     |
| Status      | Draft                                                         |
| Category    | High-opportunity for kymo                                    |
| Related     | [Index](README.md) · prev [02 Aesthetic trade-offs](02-aesthetic-tradeoffs.md) · next [04 Compound & constraints](04-compound-and-constraints.md) |

## The problem

Placing the nodes is only half the job. The edges still have to be **routed**: drawn as paths that
(1) don't cut through unrelated nodes, (2) don't overlap or run on top of other edges, (3) attach at
sensible **ports**, and (4) stay orthogonal / low-bend / low-crossing. This is a separate problem
from node placement and is, on its own, as hard as the placement.

This is exactly the visible difference between tools: it is the long-standing complaint about
**Lucidchart** connectors overlapping, and the thing **FigJam** advertises fixing (bent connectors
that wrap around objects).

## Why it's hard

- Avoiding obstacles while staying short and orthogonal is a **shortest-path-with-bends** problem on
  a visibility/grid graph — and the obstacles include the other edges, which are being routed at the
  same time (a mutual-dependency / ordering problem).
- **Ports**: many edges entering one node must be distributed around its perimeter without piling up
  (fan-in / fan-out), and parallel edges sharing a corridor must be separated into lanes.
- Bundling vs. separation, crossing minimisation *among routes*, and label-on-edge clearance all
  interact.

## State of the art

- **libavoid / Adaptagrams** (Wybrow, Marriott, Stuckey) — the reference open-source library for
  **orthogonal connector routing with obstacle avoidance**; powers Dunnart and Inkscape connectors.
  Visibility graph + incremental rerouting + nudging to separate parallel segments.
- **ELK** has a dedicated orthogonal edge-router with port constraints.
- Spline routing (Graphviz) for curved, less rigid looks.

## Where kymo stands

kymo does part of this today in `packages/python/src/kymo/alignment.py`:
`_stagger_fanin_edges` distributes many-into-one arrowheads, and `_stagger_trunk_lanes` gives
parallel Z-edges their own lane (Sugiyama-style channel routing). The orthogonality rule is codified
in `BPD-DGM-001` §7.6 with a detection heuristic. **What's missing is true obstacle avoidance** —
routing an edge *around* an intervening node. The metric already measures the gap: `edge_node_overlap`
(edges passing under non-incident nodes) and `orthogonality`.

**Opportunity:** this is the single most promising place for kymo to lead. A libavoid-style
obstacle-avoiding orthogonal router would raise exactly the two metric terms the hill-climb loop
optimises, and would beat the tools (mermaid/Lucidchart) that route naively. See `RES-LOOP-002`.

## References

- M. Wybrow, K. Marriott, P. Stuckey — *Orthogonal Connector Routing* (2009) and the **Adaptagrams / libavoid** library.
- F. Brandes — orthogonal edge routing in ELK.
- `BPD-DGM-001` §7 (Edge Routing), `alignment.py` (`_stagger_fanin_edges`, `_stagger_trunk_lanes`).
