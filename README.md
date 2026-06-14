<div align="center">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://github.com/kymostudio/kymostudio/raw/main/docs/brand/wordmark-dark.svg" />
		<img alt="kymostudio — Diagram superpowers" width="460" src="https://github.com/kymostudio/kymostudio/raw/main/docs/brand/wordmark.svg" />
	</picture>
</div>

<p align="center">
  <a href="https://pypi.org/project/kymostudio/"><img alt="PyPI" src="https://img.shields.io/pypi/v/kymostudio?logo=pypi&logoColor=white&label=PyPI&color=blue"></a>
  <a href="https://www.npmjs.com/package/kymostudio"><img alt="npm" src="https://img.shields.io/npm/v/kymostudio?logo=npm&label=npm&color=blue"></a>
  <a href="https://crates.io/crates/kymostudio"><img alt="crates.io" src="https://img.shields.io/crates/v/kymostudio?logo=rust&logoColor=white&label=crates.io&color=blue"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=kymostudio.kymostudio-vscode"><img alt="VS Code Extension" src="https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visualstudiocode&logoColor=white"></a>
  <a href="https://github.com/kymostudio/kymostudio/actions/workflows/test.yml"><img alt="Tests" src="https://github.com/kymostudio/kymostudio/actions/workflows/test.yml/badge.svg"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue"></a>
</p>

<h3 align="center">
  Prompt it. See it appear. Watch it animate.
</h3>

<p align="center">
  <a href="https://editor.kymo.studio">Live Editor</a> · <a href="https://kymo.studio/">Website</a> · <a href="./docs/guide/getting-started.md">Documentation</a>
</p>

**Kymostudio** turns diagram-as-code source — or prompts from coding agents over MCP — into self-contained, animated SVG, with PNG, WebP, Figma and Excalidraw export.

## ✨ Features

- **Built for coding agents**  
  A hosted MCP server (`mcp.kymo.studio`) lets Claude Code, Cursor or Copilot create and edit diagrams that render live in the editor.
- **Draws what you actually need**  
  Software architecture, process flows and standard BPMN, all rendered faithfully.
- **Starts from any source**  
  Author in the `.kymo` DSL, or feed it BPMN, JSON or Python.
- **Write once, export anywhere**  
  One source compiles to SVG, PNG, WebP, Figma and Excalidraw.
- **Diagrams as code**  
  Describe your diagram in a clean, line-oriented `.kymo` syntax — no dragging boxes around.
- **Animated by default**  
  Edges come alive with built-in flowing animation, straight to a self-contained SVG.
- **Smart auto-layout**  
  Frames, anchoring, edge routing and canvas sizing are figured out for you.
- **A rich icon library**  
  2,460 icons spanning AWS, Azure, GCP, Kubernetes, on-prem and more.

## Install

```bash
pip install kymostudio        # Python
npm install kymostudio        # JavaScript
cargo install kymostudio      # Rust
```

## Usage

### 1. Render a diagram

```bash
kymo sample.kymo              # → sample.svg
kymo sample.kymo --animate    # → sample-animated.svg
kymo sample.kymo --figma      # → sample.figma.js
kymo sample.kymo --excalidraw # → sample.excalidraw
```

### 2. Import BPMN

```bash
kymo process.bpmn             # → process.svg
kymo lint process.bpmn        # check for issues
```

### 3. Convert SVG to PNG or PDF

Turn any `.svg` into a PNG image or a vector PDF — no headless browser required.
The output format follows the output file's extension.

```bash
kymo diagram.svg out.png      # to PNG
kymo diagram.svg out.pdf      # to PDF
```

### 4. Browse the icon catalogue

Explore the bundled icons right from the CLI.

```bash
kymo icons list                         # list every icon set
kymo icons list aws                     # list icons in one provider
kymo icons search database              # find icons by keyword
kymo icons describe aws:compute-ec2     # show details for one icon
kymo icons download aws:compute-ec2     # save the icon to a file
```
