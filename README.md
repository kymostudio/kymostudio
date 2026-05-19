# kymo

Diagram-as-code DSL — declarative architecture diagrams to **animated SVG / WebP**.

![NVIDIA AIQ replica — animated](samples/nvidia-aiq-animated.webp)

## Install

```bash
pip install kymostudio
# or
uv tool install kymostudio
```

## Usage

```bash
kymo path/to/diagram.diagram             # → path/to/diagram.svg
kymo path/to/diagram.diagram --animate   # → path/to/diagram-animated.svg
kymo path/to/diagram.diagram --figma     # → path/to/diagram.figma.js
kymo path/to/diagram.diagram --excalidraw # → path/to/diagram.excalidraw
```

See [`samples/`](./samples/) for complete example `.diagram` files.

### Python API

```python
from kymo import parse, layout, resolve_alignments, render

diagram, layout_spec, external = parse(open("diagram.diagram").read())
if layout_spec:
    layout(diagram, layout_spec, external)
resolve_alignments(diagram)
svg = render(diagram, animate=True)
```

## JavaScript / npm

A browser/Node port of the shared **data model + icon library** (the DSL
parser, layout engine and SVG renderer remain Python-only):

```bash
npm install kymostudio
```

```js
import { makeComponent, makeEdge, anchor, ICONS, getIcon } from "kymostudio";
```

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
