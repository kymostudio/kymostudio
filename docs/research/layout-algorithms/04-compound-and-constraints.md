# 04 — Compound Graphs & Constraints: clusters, swimlanes, ports, anchors

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-005                                             |
| Version     | 0.1                                                            |
| Issue Date  | 2026-06-21                                                     |
| Status      | Draft                                                         |
| Category    | Structural                                                   |
| Related     | [Index](README.md) · prev [03 Edge routing](03-edge-and-connector-routing.md) · next [05 Label placement](05-label-placement.md) |

## The problem

Real diagrams aren't flat graphs. Nodes are grouped into **clusters / containers / subgraphs**
(swimlanes, regions, BPMN pools, architecture boundaries), and users impose **constraints**:
"these nodes align", "this one is fixed here", "A is left of B", "keep this rank order", "this edge
leaves the top port". The layout must satisfy structure *and* constraints *and* aesthetics together.

## Why it's hard

- **Containment**: a cluster's children must stay inside it, clusters must not overlap, and edges
  crossing cluster boundaries must be routed sanely. Standard Sugiyama assumes a flat graph; making
  it cluster-aware (compound layout) is substantially harder.
- **Constraints + overlap removal**: honouring alignment/separation constraints while removing node
  overlaps is a constrained optimisation. The IPSEP-CoLa work solves it with gradient projection;
  it's delicate and can be slow.
- Constraints can **conflict** (two "must align" rules that can't both hold) — needs detection and
  graceful relaxation.

## State of the art

- **cola.js / WebCoLa & IPSEP-CoLa** (Dwyer, Marriott) — constraint-based layout with separation and
  alignment constraints, the standard for "force-directed but with rules".
- **ELK** — first-class hierarchical/compound layout with port constraints and layered cluster
  support; the strongest open engine here.
- **Figma / FigJam auto-layout** — a *different* take: nested **flexbox** containers (HUG/FILL/FIXED
  sizing, primary/cross axis). Not graph layout, but the canonical model for *container nesting*.

## Where kymo stands

kymo has two relevant pieces. (1) The DSL grid: `layout.py:apply_layout_tree` is explicitly a
**Figma-style auto-layout** (nested frames hug content, fixed gap, cross-axis centred), and
`alignment.py` resolves parent/child anchoring (`align=…`) and auto-bounded regions (`contains`).
(2) BPMN pools/lanes via the deterministic Sugiyama in `bpmn_layout.rs`. **Gaps:** kymo's auto-layout
lacks Figma's per-child **HUG/FILL/FIXED** sizing (noted in `docs/tools/a.figma.comparision.md` as
"a real lesson, not just a gap"), and there is no general constraint solver (cola-style). These are
Phase-2 directions for the layout effort (`RES-LOOP-002`).

## References

- T. Dwyer, K. Marriott, M. Wybrow — *Topology-Preserving Constrained Graph Layout* / **IPSEP-CoLa** and the **cola.js** library.
- ELK compound/hierarchical layout documentation.
- `docs/tools/a.figma.comparision.md` (Figma auto-layout vs kymo), `layout.py:apply_layout_tree`, `bpmn_layout.rs`.
