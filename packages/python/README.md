# kymostudio

**Diagram superpowers** — prompt it, see it appear, watch it animate.

## Install

```bash
pip install kymostudio
# or
uv tool install kymostudio
```

## Convert (CLI)

```bash
kymo path/to/diagram.kymo              # → path/to/diagram.svg
kymo path/to/diagram.kymo --animate    # → path/to/diagram-animated.svg
kymo path/to/diagram.kymo --figma      # → path/to/diagram.figma.js
kymo path/to/diagram.kymo --excalidraw # → path/to/diagram.excalidraw
kymo path/to/process.bpmn                 # → path/to/process.svg (BPMN 2.0)
kymo path/to/diagram.kymo out.png         # render, then rasterize to PNG (resvg)
kymo path/to/diagram.kymo out.png -s 2    # 2× resolution
kymo path/to/image.svg out.png            # rasterize an existing SVG
kymo path/to/image.svg                    # → path/to/image.png
kymo lint path/to/process.bpmn            # report BPMN structural + import issues
```

PNG output rasterizes via [`kymostudio-core`](https://pypi.org/project/kymostudio-core/)
(the shared resvg engine), installed automatically as a dependency.

See [`samples/`](https://github.com/kymostudio/kymostudio/tree/main/samples) for complete example `.kymo` and
`.bpmn` files.

### BPMN 2.0 import

A standard `.bpmn` file (from bpmn.io / Camunda Modeler / Signavio …) renders
to SVG using the geometry in the file's Diagram-Interchange section — no
layout pass runs. See [`docs/formats/bpmn/`](https://github.com/kymostudio/kymostudio/blob/main/docs/formats/bpmn)
for the BPMN 2.0.2 normative reference and the element mapping (import + export).

```python
from kymo import parse_bpmn, render

diagram = parse_bpmn(open("process.bpmn").read())
svg = render(diagram)
```

## Python API

```python
from kymo import parse, layout, resolve_alignments, render

diagram, layout_spec, external = parse(open("diagram.kymo").read())
if layout_spec:
    layout(diagram, layout_spec, external)
resolve_alignments(diagram)
svg = render(diagram, animate=True)
```

## Develop

```bash
uv run --group dev python -m pytest -q       # run the test suite
```

## License

Apache License 2.0 — see [`LICENSE`](https://github.com/kymostudio/kymostudio/blob/main/packages/python/LICENSE).
