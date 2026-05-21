# kymostudio

Diagram-as-code: turn a declarative `.diagram` DSL — or a standard BPMN 2.0
`.bpmn` file — into **animated SVG / WebP** (also Figma / Excalidraw).

## Install

```bash
pip install kymostudio
# or
uv tool install kymostudio
```

## Convert (CLI)

```bash
kymo path/to/diagram.diagram              # → path/to/diagram.svg
kymo path/to/diagram.diagram --animate    # → path/to/diagram-animated.svg
kymo path/to/diagram.diagram --figma      # → path/to/diagram.figma.js
kymo path/to/diagram.diagram --excalidraw # → path/to/diagram.excalidraw
kymo path/to/process.bpmn                 # → path/to/process.svg (BPMN 2.0)
```

See [`../../samples/`](../../samples/) for complete example `.diagram` and
`.bpmn` files.

### BPMN 2.0 import

A standard `.bpmn` file (from bpmn.io / Camunda Modeler / Signavio …) renders
to SVG using the geometry in the file's Diagram-Interchange section — no
layout pass runs. See [`../../docs/BPMN.md`](../../docs/BPMN.md) for the
element mapping.

```python
from kymo import parse_bpmn, render

diagram = parse_bpmn(open("process.bpmn").read())
svg = render(diagram)
```

## Python API

```python
from kymo import parse, layout, resolve_alignments, render

diagram, layout_spec, external = parse(open("diagram.diagram").read())
if layout_spec:
    layout(diagram, layout_spec, external)
resolve_alignments(diagram)
svg = render(diagram, animate=True)
```

## Develop

```bash
uv run --group dev python -m pytest -q       # run the test suite
uv run ../../playground/server.py            # local showcase + playground
```

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
