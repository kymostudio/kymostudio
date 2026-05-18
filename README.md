# nim-diagram

Generate the **container architecture SVG** for Tutorial 01 — NIM inference endpoint.

> For the **why** behind every design choice (tool selection, layout
> algorithm, edge routing strategies, icon perspective fixes, common
> anti-patterns) see [`BEST_PRACTICE_DIAGRAMS.md`](./BEST_PRACTICE_DIAGRAMS.md).

## Run

```bash
uv run generate.py
```

Writes `out/container-diagram.svg`. Open it directly in a browser:

```bash
open out/container-diagram.svg
```

## Files

| file          | role                                                                             |
|---------------|----------------------------------------------------------------------------------|
| `model.py`    | Dataclasses — `Component`, `Region`, `Edge`, `Diagram` + anchor logic            |
| `icons.py`    | SVG icon library (isometric cubes · flat orange boxes · cylinder · circle · key) |
| `layout.py`   | Auto-layout — packs cells into region/row grid, computes positions tight         |
| `render.py`   | Renderer — turns the placed data into a self-contained SVG, auto-routes edges    |
| `data.py`     | The actual diagram — components, regions, `LAYOUT` spec, edges                   |
| `generate.py` | Entry: `uv run generate.py` → calls layout then render                           |

## Auto-layout

`layout.py` computes all positions from the `LAYOUT` spec in `data.py`. Whitespace
is minimised by:

1. **Per-row height** = `max(component height + label height)` across all
   regions — so cross-region edges in the same row are flat horizontals,
   and no row is taller than its tallest cell.
2. **Per-region width** = `max(row width)` — region only as wide as it needs.
3. **Per-cell width** = `max(icon width, longest label width) + padding` —
   each cell hugs its content.
4. **Region rect** hugs its rows top-to-bottom (regions with fewer rows are
   visibly shorter — code-server has 2 rows, brev/cloud have 3).
5. **Canvas** sized to fit content + uniform margin.

Vertical anchors (`bottom`/`top`) push past the label area so edge lines
never visually cross subtitle text.

## Edit cheat-sheet

| want to…                                  | edit                                              |
|-------------------------------------------|---------------------------------------------------|
| move a component to a different row/cell  | `LAYOUT` in `data.py`                              |
| rename a component or change its subtitle | the `Component(...)` in `data.py`                  |
| add a new component                       | append a `Component(...)`, then add to `LAYOUT`    |
| rewire an edge                            | change `src`/`dst` in the matching `Edge(...)`     |
| nudge a label                             | `label_offset=(dx, dy)` or absolute `label_pos`    |
| route an edge over the top of regions     | `route="over"` (e.g. cross-region `top→top` arcs)  |
| swap an icon                              | set `icon="..."` to any key in `icons.ICONS`       |
| tighten or loosen spacing                 | `row_gap`/`cell_gap`/`region_gap` in `layout.py`   |

You almost never need to touch `render.py` or `icons.py` to change the diagram.

## Edge routing

- `route="auto"` (default): straight if anchors align, otherwise one orthogonal
  elbow (direction inferred from `src_anchor`).
- `route="over"`: 3-segment up-across-down with clearance snapped to the row
  gap above. Used for long cross-region `top→top` arcs (e.g. cloud inference).
- `route="under"`: symmetric, snapped to the row gap below.
- `via=[(x,y), ...]`: manual override — wins over `route`.
