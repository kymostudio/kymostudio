# drawio2svg

Convert a `.drawio` file to **SVG in pure Node**, using the actual **mxGraph**
engine (the same library draw.io is built on) running on a **jsdom** DOM — no
headless browser, no draw.io desktop CLI.

It lives under `packages/js/src/drawio2svg/`. Its deps (`mxgraph`, `jsdom`,
`pako`) are declared as **`devDependencies` of `packages/js`** — it has no
`package.json` of its own. `packages/js` still stays **zero-runtime-dependency**:
those are dev-only deps, its runtime `dependencies` is empty, the `tsc` build and
eslint both exclude `src/drawio2svg/`, and only `dist/` is published — so nothing
here leaks into the published `kymostudio` package.

## Install & run

```bash
cd packages/js
npm install                       # installs mxgraph + jsdom + pako (devDeps)

# CLI: writes one "<prefix>-<page>.svg" per page (prefix defaults to input path)
node src/drawio2svg/index.mjs <input.drawio> [out-prefix]

# example (the committed sample at repo-root out/, 2 pages):
node src/drawio2svg/index.mjs ../../out/bpmn-2-example.drawio ../../out/mxgraph-bpmn
#  -> out/mxgraph-bpmn-Process-order.svg
#  -> out/mxgraph-bpmn-Purchase-stock.svg
```

## As a library

```js
import { drawioToSvg, drawioToSvgPages, parseDrawioPages } from './index.mjs';

const svg  = drawioToSvg(drawioXml, { pageIndex: 0 });   // one page -> SVG string
const all  = drawioToSvgPages(drawioXml);                // [{ name, svg }, …]
const pages = parseDrawioPages(drawioXml);               // [{ name, modelXml }, …]
```

## How it works

1. **jsdom DOM + globals.** mxGraph's client expects a browser. We boot jsdom and
   bind `window`, `document`, `location`, `navigator` (Node's built-in
   `navigator` lacks `appVersion`, which mxClient reads — so we override it).
2. **Expose classes on `window`.** `mxCodec.decode` resolves classes by name via
   `window[node.nodeName]` (e.g. `window['mxGraphModel']`). The mxgraph factory
   only populates its own namespace, so we copy it onto `window` — otherwise
   every node is silently cloned and the graph comes out empty.
3. **Decompress the wrapper.** Each `<diagram>` body is either plain
   `<mxGraphModel>` XML or **base64 + raw-deflate + URI-encoding** (`pako`).
4. **Decode → render.** `mxCodec` builds the model; `mxImageExport` +
   `mxSvgCanvas2D` walk the cell states into an `<svg>`, serialized with
   `XMLSerializer`.

## Caveats

- **Text metrics are approximate.** jsdom has no layout engine
  (`getBBox`/`getComputedTextLength` return 0, and we stub them to zero). Vector
  geometry (shapes, edges, fills, label text) renders correctly, but text-driven
  auto-sizing / wrapping can be slightly off.
- **Custom stencils are best-effort.** Bare mxGraph only knows its built-in
  shapes. draw.io shape libraries (e.g. the BPMN event/marker glyphs) render as
  empty boxes unless their stencil XML is registered. Drop stencil-set `*.xml`
  files into `./stencils/` (either a `<shapes>` set or a single `<shape>`) and
  they are auto-loaded. Source stencils live in the draw.io repo under
  `src/main/webapp/stencils/`.
- For **full-fidelity, no-caveat** conversion, use the draw.io desktop CLI
  instead (`drawio -x -f svg <file>`); that bundles every stencil and a real
  rendering engine. This tool exists specifically to do it *with mxGraph in pure
  Node*.
