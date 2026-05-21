# kymostudio

Diagram-as-code: turn a declarative `.diagram` DSL — or a standard BPMN 2.0
`.bpmn` file — into **animated SVG / WebP**.

## Install

```bash
npm install kymostudio
```

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
