<h1 align="center">kymo</h1>

<p align="center">
  <b>Type it. See it appear. Watch it animate.</b>
</p>

<p align="center">
  <a href="https://pypi.org/project/kymostudio/"><img alt="PyPI" src="https://img.shields.io/pypi/v/kymostudio?logo=pypi&logoColor=white&label=PyPI"></a>
  <a href="https://www.npmjs.com/package/kymostudio"><img alt="npm" src="https://img.shields.io/npm/v/kymostudio?logo=npm&label=npm"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=kymostudio.kymostudio-vscode"><img alt="VS Code Extension" src="https://img.shields.io/badge/VS%20Code-Extension-FE7D37?logo=visualstudiocode&logoColor=white"></a>
  <a href="https://github.com/kymostudio/kymostudio/actions/workflows/test.yml"><img alt="Tests" src="https://github.com/kymostudio/kymostudio/actions/workflows/test.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue"></a>
</p>

![NVIDIA AIQ replica — animated](samples/nvidia-aiq-animated.webp)

## Hot Repo — Week of 2026-05-24

kymostudio was the **diagram-as-code hot repo this week**. Here is what landed:

| Date | Release | Highlight |
|---|---|---|
| 2026-05-24 | **v0.3.0** | BPMN 2.0 export — full round-trip `.bpmn → kymo → .bpmn` |
| 2026-05-23 | **v0.2.8** | `bpmn { }` DSL block — author BPMN processes directly in `.kymo` |
| 2026-05-23 | **v0.2.7** | Extension renamed `.diagram → .kymo`; tagline refreshed |
| 2026-05-22 | **v0.2.6** | VS Code extension on Marketplace; website playground live |

New sample this week: [`samples/kymostudio.kymo`](samples/kymostudio.kymo) — the engine
described using its own DSL (diagram of kymostudio, in kymostudio).

## Install

```bash
pip install kymostudio        # Python
npm install kymostudio        # JavaScript
```

## Usage

```bash
kymo sample.kymo              # → sample.svg
kymo sample.kymo --animate    # → sample-animated.svg
kymo sample.kymo --figma      # → sample.figma.js
kymo sample.kymo --excalidraw # → sample.excalidraw
kymo process.bpmn             # → process.svg (BPMN 2.0 import)
```

kymo also imports standard **BPMN 2.0 XML** (`.bpmn` from bpmn.io / Camunda
Modeler / Signavio) and renders it to SVG using the file's own geometry —
see [`docs/formats/bpmn.md`](./docs/formats/bpmn.md) and the
[`samples/order.bpmn`](./samples/order.bpmn) /
[`samples/collaboration.bpmn`](./samples/collaboration.bpmn) examples.
