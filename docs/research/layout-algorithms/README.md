# Layout Algorithms — The Big Open Problems (Research)

| Field             | Value                                                                                                          |
|-------------------|----------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-LAYOUT-ALGO-001                                                                                            |
| Version           | 0.1                                                                                                           |
| Issue Date        | 2026-06-21                                                                                                    |
| Status            | Draft                                                                                                        |
| Classification    | Internal                                                                                                    |
| Owner             | `kymostudio` project                                                                                        |
| Audience          | Engineers working on `kymo-layout` / `alignment.py` and the layout-quality loop who need the problem landscape |
| Subjects          | The hard, recurring problems every automatic graph/diagram layout engine faces — and where kymo can lead     |
| Related Documents | `RES-LOOP-002` (layout-quality loop), `BPD-DGM-001` (layout best-practices), `REF-D2-CMP-001` (D2 comparison)  |

Automatic layout is a deceptively deep field: "put the boxes and lines somewhere nice" hides a
stack of **NP-hard objectives, mutually contradictory aesthetics, and unsolved dynamic problems**.
This note catalogues those problems so the layout-quality effort (`RES-LOOP-002`) targets the ones
that actually move kymo toward best-in-market — and avoids the saturated races it can only tie.

This is a **research map, not a spec**: nothing depends on it. Each problem gets its own page with
*what it is → why it's hard → state of the art → where kymo stands → references*.

## The core truth

There is **no "correct" layout**. The headline objectives (minimum crossings, minimum bends,
minimum area, non-overlapping labels) are individually **NP-hard**, they **conflict** with each
other, and "looks good" has **no objective ground truth**. Every engine — Graphviz, dagre, ELK,
yFiles — is a particular bundle of heuristics and weight choices. Being #1 is therefore winning on a
*proxy* plus human perception, not proving optimality. kymo's `benches/layout-algorithms/metric.mjs` is exactly
such a proxy; this map explains what each of its terms is fighting.

## The problems

| # | Page | The problem in one line |
|---|---|---|
| 1 | [Computational hardness](01-computational-hardness.md) | The core objectives are NP-hard → everything is a heuristic |
| 2 | [Conflicting aesthetics](02-aesthetic-tradeoffs.md) | Crossings vs. bends vs. area vs. symmetry pull against each other |
| 3 | [Edge & connector routing](03-edge-and-connector-routing.md) | Routing lines to dodge nodes and each other is its own hard problem |
| 4 | [Compound graphs & constraints](04-compound-and-constraints.md) | Clusters, swimlanes, ports, alignment, fixed positions |
| 5 | [Label placement](05-label-placement.md) | Making text fit without overlap is NP-hard too |
| 6 | [Stability & dynamics](06-stability-and-dynamics.md) | Determinism, the "mental map", incremental edits, animation |
| 7 | [Scalability](07-scalability.md) | Big graphs are slow and turn into hairballs |
| 8 | [No ground truth](08-no-ground-truth.md) | "Beautiful" can't be fully formalised or agreed |
| 9 | [Degenerate inputs](09-degenerate-inputs.md) | Self-loops, multi-edges, hubs, disconnected components break engines |

## Strategic map — where the opportunity is for kymo

| Problem | Race already won by incumbents? | kymo opportunity |
|---|---|---|
| Crossing minimisation (Sugiyama) | Yes — dagre/ELK are excellent | Low: only need to *tie* |
| **Edge / connector routing** (§3) | No — many tools still weak (Lucidchart) | **High**: the metric measures it; the loop can climb it |
| **Stability + state-to-state animation** (§6) | No — few engines do it | **Highest**: kymo's animated SVG/WebP output is the differentiator |
| Compound + constraints (§4) | Partly — ELK/cola strong | Medium |
| Scalability to 10k+ nodes (§7) | Yes — ELK/Graphviz strong | Low: not kymo's market |
| "Structured-system" aesthetics (orthogonality, grid) (§2) | Subjective | **High**: kymo already has a metric + `BPD-DGM-001` |

**Thesis:** don't out-Sugiyama dagre/ELK. Lead on **(a) obstacle-avoiding connector routing**,
**(b) stability + animated transitions**, and **(c) "drawn-by-a-human" orthogonal/grid aesthetics** —
the three the absolute metric and the hill-climb loop were built to optimise.

## How kymo currently engages each problem

- Graph layout: `packages/rust/kymo-layout` (`dagre.rs`, `sugiyama.rs`, `grid.rs`, `cose.rs`) +
  vendored force-directed `kymo-manatee` (CoSE-Bilkent / FCoSE).
- BPMN: deterministic Sugiyama in `packages/rust/kymostudio-core/src/bpmn/bpmn_layout.rs`.
- DSL grid + edge routing: `packages/python/src/kymo/{layout.py,alignment.py}` (+ JS mirror) —
  Figma-style auto-layout, barycenter crossing reduction, fan-in/out + trunk-lane edge staggering.
- Quality signal: `benches/layout-algorithms/metric.mjs`; improvement loop: `.claude/workflows/layout-hillclimb.js`.
- Principles: `docs/diagrams/best-practices.md` (BPD-DGM-001 §6 Layout, §7 Edge Routing).

## References

- Di Battista, Eades, Tamassia, Tollis — *Graph Drawing: Algorithms for the Visualization of Graphs* (1999), the field's foundational text.
- Eades, Hong, et al. — *A Turing Test for Graph Drawing Algorithms* (2020).
- Per-page references are listed on each problem page.
