# kymostudio — Diagram Preview (VS Code)

Live SVG preview for [kymostudio](https://github.com/kymostudio/kymostudio)
diagrams, right inside VS Code. Both formats render **natively**, in-process,
by the bundled, dependency-free [`kymostudio`](../js) JS engine — no Python, no
network, no language server.

- **`.diagram` (the DSL)** — parsed and positioned (grid / auto-layout,
  parent/child alignment, auto-bounded regions, auto-canvas) via `parseDiagram`,
  then rendered with `renderSVG`.
- **BPMN 2.0 (`.bpmn`)** — imported via the file's Diagram-Interchange geometry
  (`parseBpmn`) and rendered with `renderSVG`.

## Features

- **Open Preview to the Side** button in the editor title bar for `.bpmn` /
  `.diagram` files (also in the Command Palette and the Explorer context menu).
- **Live re-render** as you type (debounced) — toggle with
  `kymostudio.preview.autoRefresh` (off = refresh on save only).
- **Zoom & pan**: scroll to zoom toward the cursor, drag to pan, plus
  toolbar buttons (`−` / `+` / `Fit` / reset).
- **Export SVG** from the preview toolbar, or via
  `kymostudio: Export Diagram as SVG…`.
- **Background**: `light` · `dark` · `transparent`
  (`kymostudio.preview.background`).

## Usage

1. Open a `.diagram` or `.bpmn` file.
2. Click the **Open Preview to the Side** icon (top-right of the editor), or run
   **kymostudio: Open Preview** from the Command Palette.
3. The diagram renders beside the source and updates as you edit.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `kymostudio.preview.background` | `light` | Canvas fill: `light`, `dark`, or `transparent`. |
| `kymostudio.preview.autoRefresh` | `true` | Re-render on every edit (debounced). When `false`, refresh on save only. |

## Build from source

The extension bundles the `kymostudio` JS engine, so build that package first:

```bash
# 1. build the JS engine (produces packages/js/dist)
cd packages/js && npm install && npm run build

# 2. build the extension bundle (dist/extension.js)
cd ../vscode-extension && npm install && npm run build
```

Then press <kbd>F5</kbd> in VS Code (with this folder open) to launch an
Extension Development Host, or package a VSIX:

```bash
npm run package   # → kymostudio-vscode-<version>.vsix  (npx @vscode/vsce)
```

`npm run watch` rebuilds on change; `npm run typecheck` runs `tsc --noEmit`.

## How it works

`src/render.ts` dispatches by file extension — `.diagram` through
`parseDiagram(text)`, `.bpmn` through `parseBpmn(text)` — then `renderSVG(diagram)`
from the `kymostudio` package, handing the SVG string to a webview that does
nothing but display, zoom, and pan it. Rendering runs entirely in the extension
host — the webview never parses diagrams — and esbuild inlines the engine into a
single CommonJS file, so the shipped extension carries no runtime dependencies.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
