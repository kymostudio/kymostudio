# 09 — Degenerate Inputs: the cases that break engines

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-010                                             |
| Version     | 0.1                                                            |
| Issue Date  | 2026-06-21                                                     |
| Status      | Draft                                                         |
| Category    | Robustness                                                   |
| Related     | [Index](README.md) · prev [08 No ground truth](08-no-ground-truth.md) |

## The problem

Most layout algorithms are designed for "nice" graphs — simple, connected, directed, modest degree.
Real input is messier, and the **degenerate cases** are where engines crash, hang, or produce
nonsense. Robustness on these is a quiet but real differentiator (and a frequent source of bug
reports).

## The usual offenders

| Input | What breaks |
|---|---|
| **Self-loops** (edge a→a) | layered rankers assume src≠dst; the loop has no rank span |
| **Multi-edges** (parallel a→b) | routes overlap exactly unless separated into lanes |
| **Cycles / back-edges** | Sugiyama ranking needs a DAG; cycles must be broken & restored |
| **Disconnected components** | force layouts fly apart; need per-component layout + packing |
| **High-degree hubs** | impossible to place incident edges without crossings/overlap |
| **Empty / single-node / huge-label** | sizing and canvas math divide by zero or overflow |
| **Compound + cycle across clusters** | containment + cycle-breaking interact badly |

## Why it's hard

These cases violate the assumptions the core algorithms are built on (DAG-ness, simplicity,
connectedness). Each needs explicit handling — cycle breaking + restoration, parallel-edge lane
assignment, component packing, self-loop glyphs — and the handling must compose with everything else.

## State of the art

Mature engines (Graphviz, ELK) handle all of these explicitly: greedy cycle removal then re-reversal,
self-loop routing, parallel-edge separation, connected-component packing. It's unglamorous
engineering breadth rather than a single algorithm.

## Where kymo stands

kymo's Sugiyama (`sugiyama.rs`, `bpmn_layout.rs`) already reverses back-edges for ranking and restores
them, and the alignment passes separate parallel/fan edges (`_stagger_fanin_edges`,
`_stagger_trunk_lanes`). The full-corpus benches surface degenerate fixtures: while building the
layout-quality bench, fixtures that rendered **0 nodes** produced `NaN` scores until guarded — a
concrete reminder that the metric and the engine both need degenerate-input hardening (see the
`scoreLayout` empty-nodes guard in `benches/layout-algorithms/metric.mjs`).

**Takeaway:** robustness here won't win headlines, but it prevents the embarrassing failures that
erode trust. Worth a dedicated test corpus of degenerate graphs.

## References

- E. Gansner et al. — *A Technique for Drawing Directed Graphs* (Graphviz, 1993) — cycle breaking, self-loops, parallel edges.
- `sugiyama.rs` / `bpmn_layout.rs` (back-edge reversal), `alignment.py` (edge staggering), `benches/layout-algorithms/metric.mjs` (degenerate guard).
