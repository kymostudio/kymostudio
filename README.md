# axo

Diagram-as-code DSL — declarative architecture diagrams to **animated SVG / WebP**.

Write a `.diagram` file (Mermaid-like grammar), get a self-contained SVG with
auto-layout, orthogonal edge routing, and optional flowing-dash animation.
Rasterise to animated WebP without a headless browser.

![NVIDIA AIQ replica — animated](samples/nvidia-aiq-animated.webp)

> Grammar reference: [`docs/DSL.md`](./docs/DSL.md) · Design rationale
> (icons, layout, anti-patterns):
> [`docs/BEST_PRACTICE_DIAGRAMS.md`](./docs/BEST_PRACTICE_DIAGRAMS.md).

## Layout

```
src/        engine: parser, layout, renderer, CLI entry
samples/    diagram sources (.diagram + .py) and their rendered outputs
docs/       DSL grammar spec + diagram best-practices
out/        transient build artefacts (gitignored)
```

## Run

```bash
uv run axo samples/aws_1.diagram             # → samples/aws_1.svg
uv run axo samples/aws_1.diagram --animate   # → samples/aws_1-animated.svg
uv run src/to_webp.py samples/aws_1-animated.svg
```

`axo` takes a path to a `.diagram` (DSL) or `.py` (Python form) source and
writes the SVG **next to the input** (same directory, `.svg` extension).
`--animate` writes a sibling `<name>-animated.svg` with a CSS
`stroke-dashoffset` keyframe animation (no JS, runs in any browser).

## Authoring

Two equivalent authoring paths — both produce a `Diagram` for the renderer:

- **DSL** (preferred) — write a `.diagram` file; `axo` loads it via
  `dsl.parse(...)`. See [`samples/aiq.diagram`](./samples/aiq.diagram) and
  [`samples/aws_1.diagram`](./samples/aws_1.diagram) for complete examples.
- **Python** — build `Component`/`Region`/`Edge`/`Diagram` directly. See
  [`samples/data.py`](./samples/data.py).

## Files

| path                | role                                                                            |
|---------------------|---------------------------------------------------------------------------------|
| `src/model.py`      | Dataclasses — `Component`, `Region`, `Edge`, `Diagram` + anchor logic           |
| `src/dsl.py`        | Parser for the `.diagram` grammar (see `docs/DSL.md`)                           |
| `src/icons.py`      | SVG icon library (isometric cubes · flat orange boxes · cylinder · circle · …)  |
| `src/layout.py`     | Auto-layout — packs cells into region/row grid, computes tight positions        |
| `src/alignment.py`  | Resolves parent/child relative anchors (`@ parent right 60`)                    |
| `src/to_svg.py`     | Renders placed data to self-contained SVG; auto-routes edges; CSS animation     |
| `src/to_webp.py`    | Animated SVG → animated WebP via `resvg` + Pillow (no headless browser)         |
| `src/cli.py`        | Entry: `axo <path> [--animate]` (registered as `axo` script in `pyproject.toml`) |
| `samples/*.diagram` | Diagram sources (DSL form)                                                      |
| `samples/*.py`      | Diagram sources (Python form)                                                   |
| `samples/*.svg/webp/png` | Rendered outputs + external reference images                               |
| `docs/`             | Spec docs — DSL grammar + diagram best practices                                |

## Auto-layout

`src/layout.py` computes positions from the `LAYOUT` spec when present
(Python sources). Whitespace is minimised by:

1. **Per-row height** = `max(component height + label height)` — cross-region
   edges in the same row stay flat; no row taller than its tallest cell.
2. **Per-region width** = `max(row width)`.
3. **Per-cell width** = `max(icon width, longest label width) + padding`.
4. **Region rect** hugs its rows; regions with fewer rows are visibly shorter.
5. **Canvas** sized to fit content + uniform margin.

Vertical anchors (`bottom`/`top`) push past the label area so edge lines never
visually cross subtitle text.

In the DSL, `region` and `layout` blocks drive positioning instead of a
single `LAYOUT` table — see `samples/aiq.diagram` and `docs/DSL.md`.

## Edit cheat-sheet

| want to…                                  | edit                                                |
|-------------------------------------------|-----------------------------------------------------|
| move a component to a different row/cell  | `LAYOUT` in Python source / `layout` block in DSL   |
| rename a component or change its subtitle | the `Component(...)` / `component` line             |
| add a new component                       | add `Component(...)` + place it in a layout/region  |
| rewire an edge                            | change `src`/`dst` in the matching `Edge(...)`      |
| nudge a label                             | `label_offset=(dx, dy)` or absolute `label_pos`     |
| route an edge over the top of regions     | `route="over"` (cross-region `top→top` arcs)        |
| swap an icon                              | set `icon="..."` to any key in `src/icons.py:ICONS` |
| tighten or loosen spacing                 | `row_gap` / `cell_gap` / `region_gap` in `src/layout.py` |

You almost never need to touch `src/to_svg.py` or `src/icons.py` to change a diagram.

## Edge routing

- `route="auto"` (default): straight if anchors align, otherwise one
  orthogonal elbow (direction inferred from `src_anchor`).
- `route="over"`: 3-segment up-across-down with clearance snapped to the row
  gap above. Used for long cross-region `top→top` arcs.
- `route="under"`: symmetric, snapped to the row gap below.
- `via=[(x,y), ...]`: manual override — wins over `route`.

## WebP export

`src/to_webp.py` parses the animation parameters out of the SVG's inline CSS,
synthesises one static SVG per frame with `stroke-dashoffset` hard-coded,
rasterises each via `resvg`, and stitches the frames into an animated WebP
with Pillow. Defaults: 30 frames over a 1.2 s flow cycle, width matches the
SVG `viewBox`, quality 85. No headless browser required.
