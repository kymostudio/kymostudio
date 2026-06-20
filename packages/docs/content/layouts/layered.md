# Layered layout — Sugiyama

Alongside Dagre, kymo ships its **own** pure-Rust layered (Sugiyama-style) layout.
It's a self-contained implementation of the classic four-stage method and powers
the paths that don't go through the mermaid front-end:

- the native **`.kymo` flowchart IR**,
- the generic **`d2` → SVG** and **`dot` → SVG** converters,
- the `kymojson` geometry export.

It produces the same *kind* of result as [Dagre](./dagre) — ranked layers with
crossing-minimised ordering — but is tuned for kymo's own sizing and emits a
resolved `Diagram` the SVG/PDF back-ends consume directly.

## The four stages

1. **Ranking** — longest-path layering, then pull nodes down to tighten edges.
2. **Dummy nodes** — long edges are broken across intermediate layers so routing
   stays clean.
3. **Ordering** — barycenter sweeps (a fixed, even number, for determinism) reduce
   crossings; ties break on declaration order.
4. **Coordinate assignment** — priority-based alignment packs each layer, then maps
   the abstract `(main, cross)` space to screen `(x, y)` for the chosen direction,
   keeping boxes upright.

Coordinates are integerised only at emit (half-to-even rounding), so the output is
deterministic and golden-test stable.

## When you get it

You don't pick it explicitly — kymo routes to it for the kymo-native and
`d2`/`dot` paths, and to [Dagre](./dagre) for mermaid grammars. Both honour the
diagram direction (top-down vs left-right).

## Trade-offs

- **Best for** layered/hierarchical graphs where kymo controls the sizing
  end-to-end.
- **Deterministic** by construction (fixed sweeps + stable secondary keys).
- For mermaid flowcharts specifically, [Dagre](./dagre) is used instead because it
  reproduces mermaid.js geometry exactly.

→ Related: [The .kymo Language](../guide/dsl-guide), [Flowchart](../diagrams/flowchart).
