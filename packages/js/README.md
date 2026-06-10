# kymostudio

**Diagram superpowers** — type it, see it appear, watch it animate.

## Install

```bash
npm install kymostudio
```

## CLI — `kymo`

Render a source to SVG, or rasterize to PNG:

```bash
kymo arch.kymo                 # → arch.svg
kymo process.bpmn out.svg      # render BPMN to SVG
kymo arch.kymo out.png         # render, then rasterize to PNG
kymo image.svg out.png         # rasterize an existing SVG
kymo image.svg                 # → image.png
kymo arch.kymo out.png -s 2    # 2× resolution
```

PNG output rasterizes via [`kymostudio-core`](https://www.npmjs.com/package/kymostudio-core)
(the shared resvg engine, same output as the Python and Rust CLIs), installed as
a dependency.

## Render a `.kymo` DSL file

`parseDiagram(src)` runs the full front-end pipeline — parse the declarative
DSL, then position everything (grid / Figma-style auto-layout, parent/child
alignment, auto-bounded regions, auto-canvas sizing) — returning a positioned
Diagram.

```ts
import { parseDiagram, renderSVG } from "kymostudio";
import { readFileSync } from "node:fs";

const svg = await renderSVG(parseDiagram(readFileSync("arch.kymo", "utf8")));
```

For finer control the stages are exported individually — `parse(src)` returns
`{ diagram, layout, external }` (unresolved), then `layout(diagram, …)` and
`resolveAlignments(diagram)` mutate it into place.

## Convert a BPMN file

`parseBpmn(xml)` reads a standard `.bpmn` file (from bpmn.io / Camunda /
Signavio …) into a Diagram using the file's Diagram-Interchange geometry;
`renderSVG` turns it into an SVG document.

```ts
import { parseBpmn, renderSVG } from "kymostudio";
import { readFileSync } from "node:fs";

const svg = await renderSVG(parseBpmn(readFileSync("process.bpmn", "utf8")));
```

## Render an SVG from a model

`renderSVG(diagram)` turns a model (whose components carry positions) into a
complete SVG document — background, edges with arrowheads, icon glyphs and
labels (and BPMN glyphs / pools / flows for an imported `.bpmn`).

```ts
import { makeComponent, makeEdge, makeDiagram, renderSVG } from "kymostudio";

const orch = makeComponent({ id: "orch", name: "Orchestrator", icon: "hex-agent", shape: "hex", pos: [120, 210] });
const s3   = makeComponent({ id: "s3",   name: "S3",           icon: "aws-s3",    shape: "aws-tile", pos: [400, 210] });

const diagram = makeDiagram({
  title: "demo",
  components: [orch, s3],
  edges: [makeEdge({ src: "orch", dst: "s3", label: "read" })],
});

const svg = await renderSVG(diagram);   // → "<?xml …><svg …>…</svg>"
```

`renderSVG` is `async` because icon glyphs come from `getIcon`. Built-in
glyphs resolve offline; file-backed icons are fetched from the manifest —
call `setIconBaseURL(url)` first to point at a host serving them.

## Model + icons

```ts
import { makeComponent, makeEdge, anchor, resolveAnchors, ICONS, getIcon } from "kymostudio";
```

`getIcon(key)` resolves built-in glyphs synchronously; file-backed icons are
fetched lazily from the manifest.

## Develop

```bash
npm install
npm run build          # tsc → dist/ (JS + .d.ts), the published output
npm run typecheck      # tsc --noEmit
npm test               # build, then node --test
npm run build-manifest # scan ../../icons and (re)write icons-manifest.json
```

The icon set lives at the repo root in [`icons/`](https://github.com/kymostudio/kymostudio/tree/main/icons);
`icons-manifest.json` is generated from it and bundled into the published
package alongside the compiled `dist/`.

## License

Apache License 2.0 — see [`LICENSE`](https://github.com/kymostudio/kymostudio/blob/main/packages/js/LICENSE).
