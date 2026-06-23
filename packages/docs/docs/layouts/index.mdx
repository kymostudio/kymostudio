# Layouts

You never place mermaid nodes by hand. You write the nodes and the edges; kymo's
**`kymo-layout`** engine (pure Rust — no JavaScript, no merman) computes every
coordinate and the canvas size, then the renderer draws raster-safe SVG.

kymo picks the right layout automatically from the diagram type — the same way
[React Flow](https://reactflow.dev/examples/layout/dagre) hands a graph to dagre.
You can still steer it (direction, columns, gaps), but you never start from blank
coordinates.

## The four engines

| Layout | Used by | Shape of the result |
|--------|---------|---------------------|
| **[Layered (Dagre)](./dagre)** | flowchart, state, ER, class | Ranked top-down / left-right; edges routed around nodes. |
| **[Layered (Sugiyama)](./layered)** | the `.kymo` flowchart IR, `d2`/`dot` → SVG | kymo's own pure-Rust layered layout. |
| **[Grid](./grid)** | block diagram | Column grid: `columns N`, spans, nested blocks. |
| **[Force-directed](./force)** | mindmap | Organic spring-embedder (cose-bilkent). |

## Why a layout engine at all

A layout engine turns *relationships* into *positions*. You declare intent —
"A flows to B", "these three are a column", "this is the root of a tree" — and the
engine resolves it into pixels. Two payoffs:

- **Edits stay cheap.** Add a node or reroute an edge and the whole diagram
  re-balances; you never nudge coordinates.
- **The output is deterministic.** The same source always lays out the same way
  (every tie-break carries a stable secondary key), so diffs are clean and golden
  tests are byte-stable.

Each engine page below covers what it does, which diagrams use it, how to steer it,
and its trade-offs.
