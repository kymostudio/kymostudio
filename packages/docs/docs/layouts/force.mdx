# Force-directed layout

The **force-directed** layout positions nodes with a physics simulation — edges
pull connected nodes together, all nodes push apart — until the graph settles into
a balanced, organic shape. kymo uses it for **mindmaps**, where a central idea
branches out radially.

It's a pure-Rust **cose-bilkent** (Compound Spring Embedder) implementation,
vendored as the `kymo-manatee` crate — the same algorithm mermaid.js uses for
mindmaps, so the result reads the same.

## How it works

1. Each node gets a size (from its label); edges become springs.
2. The simulation iterates: spring forces shorten edges, repulsion spreads nodes,
   and compound (nested) nodes keep their children grouped.
3. When the energy settles, kymo shifts the result into positive coordinates and
   sizes the canvas to fit.

```text
mindmap
  root((kymo))
    Layouts
      Dagre
      Grid
      Force
    Diagrams
      Flowchart
      Mindmap
```

## Trade-offs

- **Best for** trees and loosely-connected graphs where an organic, radial shape
  reads better than strict ranks — mindmaps above all.
- **Not strictly deterministic across unrelated inputs** the way ranked layouts
  are, but the simulation is seeded so a given source is stable.
- **Not for** process flows or DAGs — those want the predictable ranks of
  [Dagre](./dagre).

→ Related: [Mindmap](../diagrams/mindmap).
