# Grid layout

The **grid** layout packs nodes into rows and columns. It's the engine behind the
**block diagram** (`block` / `block-beta`), where the whole point is a tabular
arrangement rather than an edge-driven graph.

## How it works

You declare a column count and drop items into the grid; kymo flows them
left-to-right, wrapping to the next row, and sizes every column to the widest cell
it holds:

- **`columns N`** sets the row width.
- A bare id is one cell; **`id["label"]`** sets its text and shape.
- **`id:N`** makes a cell span `N` columns.
- **`space`** (optionally `space:N`) leaves a gap.
- **`block:id` … `end`** nests a sub-grid that occupies one column of its parent,
  with the column unit widened to fit it.
- Edges (`A --> B`, `A --o B`, `A --x B`) connect cells, clipped to their borders
  with the matching arrow / circle / cross end.

```text
block-beta
  columns 3
  a["Ingest"] b["Transform"] c["Load"]
  space:3
  db[("Warehouse")]:3
  a --> b --> c --> db
```

## Steering it

- Change **`columns`** to reflow the whole board.
- Use **spans** (`id:N`) and **`space`** to align cells across rows.
- Nest **`block:`…`end`** for grouped sub-grids.

## Trade-offs

- **Best for** dashboards, matrix/board layouts, anything inherently tabular.
- **Not for** free-form graphs — there's no crossing minimisation; placement
  follows the grid you declare. For edge-driven graphs use [Dagre](./dagre).

→ Related: [Block Diagram](../diagrams/block).
