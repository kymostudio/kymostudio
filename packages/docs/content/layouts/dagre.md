# Layered layout — Dagre

**Dagre** is kymo's mermaid-faithful hierarchical layout. It's the engine behind
**flowcharts, state diagrams, ER diagrams and class diagrams** — anything that
reads as a directed graph of boxes and arrows. kymo uses a pure-Rust port of the
same dagre algorithm mermaid.js runs, so positions match mermaid to sub-pixel.

## How it works

Dagre lays a directed graph out in four passes:

1. **Rank** — assign each node to a layer so every edge points "forward" (cycles
   are broken first).
2. **Order** — within each layer, order nodes to minimise edge crossings
   (barycenter sweeps).
3. **Position** — assign x/y so ranks are evenly spaced and nodes in a layer don't
   overlap; node boxes are sized from their label with browser-calibrated text
   metrics.
4. **Route** — draw each edge as a spline around the nodes, with a labelled
   mid-point.

Subgraphs become **clusters**: a `subgraph` lays out as a nested box that encloses
its members, and an edge to a subgraph id routes to the cluster.

## Steering it

The header's **direction** token is the main control:

| Token | Flow |
|-------|------|
| `TD` / `TB` | top → bottom (default) |
| `BT` | bottom → top |
| `LR` | left → right |
| `RL` | right → left |

```text
flowchart LR
  start([Start]) --> check{OK?}
  check -->|yes| done([Done])
  check -->|no| start
```

Nested subgraphs can each carry their **own** `direction`, so a left-to-right
diagram can hold a top-to-bottom cluster:

```text
flowchart LR
  subgraph pipeline
    direction TB
    a --> b --> c
  end
  in --> pipeline --> out
```

## Trade-offs

- **Best for** process flows, state machines, dependency graphs — DAG-shaped data.
- **Deterministic** — fixed sweep counts and stable tie-breaks, so the same source
  always lays out identically.
- **Not for** densely cyclic graphs (it ranks them by breaking cycles) or organic
  trees (use [force-directed](./force) for mindmaps).

→ Related: [Flowchart](../diagrams/flowchart), [State](../diagrams/state),
[Entity Relationship](../diagrams/er).
