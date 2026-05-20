# kymostudio (JavaScript / TypeScript)

A browser/Node port of the shared **data model + icon library** for
[kymo](../python) — the diagram-as-code DSL — plus a standalone **SVG
renderer**. Written in TypeScript and published with type declarations. The
DSL parser and layout engine remain Python-only (see [`../python`](../python)).

## Install

```bash
npm install kymostudio
```

## Render an SVG

`renderSVG(diagram)` turns a model (whose components carry positions) into a
complete SVG document — background, edges with arrowheads, icon glyphs and
labels. It's an original TypeScript renderer, not a port of the Python one.

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

The icon set itself lives at the repo root in [`../../icons/`](../../icons/),
shared with the Python package. `icons-manifest.json` is generated from it and
bundled into the published npm package alongside the compiled `dist/`.

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
