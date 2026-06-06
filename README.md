<h1 align="center">kymo</h1>

<p align="center">
  <a href="https://kymostudio.github.io/kymostudio/app/">Live Editor</a>
  <span>|</span>
  <a href="https://kymostudio.github.io/kymostudio/">Website</a>
  <span>|</span>
  <a href="./docs/guide/getting-started.md">Documentation</a>
</p>

<p align="center">
  <a href="https://pypi.org/project/kymostudio/"><img alt="PyPI" src="https://img.shields.io/pypi/v/kymostudio?logo=pypi&logoColor=white&label=PyPI"></a>
  <a href="https://www.npmjs.com/package/kymostudio"><img alt="npm" src="https://img.shields.io/npm/v/kymostudio?logo=npm&label=npm"></a>
  <a href="https://crates.io/crates/kymostudio"><img alt="crates.io" src="https://img.shields.io/crates/v/kymostudio?logo=rust&logoColor=white&label=crates.io"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=kymostudio.kymostudio-vscode"><img alt="VS Code Extension" src="https://img.shields.io/badge/VS%20Code-Extension-FE7D37?logo=visualstudiocode&logoColor=white"></a>
  <a href="https://github.com/kymostudio/kymostudio/actions/workflows/test.yml"><img alt="Tests" src="https://github.com/kymostudio/kymostudio/actions/workflows/test.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue"></a>
</p>

> **Type it. See it appear. Watch it animate.**

Kymostudio is a collection of libraries and tools to turn diagram-as-code source into animated SVG and related formats such as PNG, WebP, Figma and Excalidraw.

![NVIDIA AIQ replica — animated](samples/nvidia-aiq-animated.webp)

## ✨ Features

- **Draws what you actually need** — software architecture, process flows and standard BPMN, all rendered faithfully.
- **Starts from any source** — author in the `.kymo` DSL, or feed it BPMN, JSON or Python.
- **Write once, export anywhere** — one source compiles to SVG, PNG, WebP, Figma and Excalidraw.
- **Diagrams as code** — describe your diagram in a clean, line-oriented `.kymo` syntax; no dragging boxes around.
- **Animated by default** — edges come alive with built-in flowing animation, straight to a self-contained SVG.
- **Smart auto-layout** — frames, anchoring, edge routing and canvas sizing are figured out for you.
- **A rich icon library** — 2,460 icons spanning AWS, Azure, GCP, Kubernetes, on-prem and more.

## Install

```bash
pip install kymostudio        # Python
npm install kymostudio        # JavaScript
cargo install kymostudio      # Rust
```

## Usage

```bash
kymo sample.kymo              # → sample.svg
kymo sample.kymo --animate    # → sample-animated.svg
kymo sample.kymo --figma      # → sample.figma.js
kymo sample.kymo --excalidraw # → sample.excalidraw
kymo process.bpmn             # → process.svg (BPMN 2.0 import)
kymo lint process.bpmn        # report BPMN structural + import-fidelity issues
```

## Convert SVG to PNG

Render any `.svg` to a PNG image — no headless browser required.

```bash
kymo diagram.svg out.png      # rasterize an existing SVG
```
