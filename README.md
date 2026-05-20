# kymo

Diagram-as-code DSL — declarative architecture diagrams to **animated SVG / WebP**.

![NVIDIA AIQ replica — animated](samples/nvidia-aiq-animated.webp)

## Install

```bash
pip install kymostudio        # Python  (CLI: `kymo`)
npm  install kymostudio       # JavaScript
```

## Usage

```bash
kymo path/to/diagram.diagram             # → path/to/diagram.svg
kymo path/to/diagram.diagram --animate   # → path/to/diagram-animated.svg
kymo path/to/diagram.diagram --figma     # → path/to/diagram.figma.js
kymo path/to/diagram.diagram --excalidraw # → path/to/diagram.excalidraw
kymo path/to/process.bpmn                 # → path/to/process.svg (BPMN 2.0 import)
```

kymo also imports standard **BPMN 2.0 XML** (`.bpmn` from bpmn.io / Camunda
Modeler / Signavio) and renders it to SVG using the file's own geometry —
see [`docs/BPMN.md`](./docs/BPMN.md) and the
[`samples/order.bpmn`](./samples/order.bpmn) /
[`samples/collaboration.bpmn`](./samples/collaboration.bpmn) examples.

See [`samples/`](./samples/) for complete example `.diagram` files, and the
per-package READMEs ([Python](./packages/python/README.md),
[JavaScript](./packages/js/README.md)) for API details.

### Python API

```python
from kymo import parse, layout, resolve_alignments, render

diagram, layout_spec, external = parse(open("diagram.diagram").read())
if layout_spec:
    layout(diagram, layout_spec, external)
resolve_alignments(diagram)
svg = render(diagram, animate=True)
```

### JavaScript / npm

A browser/Node port of the shared **data model + icon library** (the DSL
parser, layout engine and SVG renderer remain Python-only):

```js
import { makeComponent, makeEdge, anchor, ICONS, getIcon } from "kymostudio";
```

## Develop

```bash
# Python
cd packages/python && uv run --group dev python -m pytest -q

# JavaScript
cd packages/js && npm test && npm run build-manifest

# Local showcase + playground (renders via the Python package)
uv run --project packages/python playground/server.py
```

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
