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
kymo sample.kymo out.png      # → render, then rasterize to PNG (resvg)
kymo image.svg out.png        # → rasterize an existing SVG
kymo lint process.bpmn        # report BPMN structural + import-fidelity issues
```

## Development

Versioning, the `kymostudio-core` dependency convention, and the publish flow
(PyPI · npm · crates.io) are documented in [`docs/RELEASING.md`](docs/RELEASING.md).
Releases are cut with the `/kymo-bump` workflow.
