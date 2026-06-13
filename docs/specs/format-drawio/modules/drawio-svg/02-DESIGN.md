---
title: drawio → SVG — Design
document_id: DESIGN-DRAWIO-SVG-001
version: "1.2"
issue_date: 2026-06-03
status: Under revision (documents as-is; target pending CR-DRAWIO-SVG-003)
classification: Internal
owner: diagrams/ project
audience: Engineers implementing/maintaining the drawio2svg utility
review_cycle: On CR completion, or on engine/dependency change
supersedes: null
related_documents:
  - FEAT-DRAWIO-SVG-001    # Introduction
  - TEST-DRAWIO-SVG-001     # Test documentation
  - PLAN-DRAWIO-SVG-001     # Plan
  - REF-DRAWIO-001          # draw.io / mxGraph reference (format + engine)
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - zero-dependency
  - as-is
  - design
  - architecture
  - svg-export
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# drawio → SVG — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-DRAWIO-SVG-001                              |
| Version      | 1.2                                                |
| Status       | Under revision (as-is; target pending CR-003)     |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-DRAWIO-SVG-001, FEAT-DRAWIO-SVG-001, TEST-DRAWIO-SVG-001, PLAN-DRAWIO-SVG-001, REF-DRAWIO-001 |

Realises FEAT-DRAWIO-SVG-001 (FR/NFR cited per clause). Describes the **as-built** implementation in
`packages/js/src/drawio2svg/index.mjs`. Covers ISO/IEC/IEEE 12207 Architecture & Design Definition.

> **Direction note (v1.2) — this design documents the AS-IS GAP, not the target.** Since v1.2 the
> requirements target a **zero-dependency** converter (own decoder via `node:zlib` + **own SVG
> emitter**, no `mxgraph`/`jsdom`/`pako`). The pipeline and the "four engine-on-jsdom gotchas" below
> describe the **current code**, which is the gap to be removed. The **target design** (own SVG emitter
> over the dependency-free decoder) will be authored in **`CR-DRAWIO-SVG-003`**; until then this design
> is retained as the as-is reference. Decode reframes simply (`pako.inflateRaw` → `node:zlib`
> `inflateRawSync`); the render path (§2.3, §3) is fully replaced.

## 1. Scope

How a `.drawio` file becomes SVG **in pure Node**: boot a DOM → instantiate mxGraph → decode the
wrapper (plain/compressed, per page) → decode the model → export SVG → serialise, per page. Plus where
stencils attach and how the project stays isolated from the published package.

## 2. Pipeline

```
.drawio (mxfile) ──parseDrawioPages──► [{ name, modelXml }]      (per <diagram>; decompress if needed)
                                              │  per page
                                              ▼  modelXmlToSvg
   mxCodec.decode ─► mxGraph model ─► view.validate() ─► mxImageExport + mxSvgCanvas2D ─► <svg>
                                              │
                                              ▼
                                   XMLSerializer ─► SVG string  (one per page)

  stencils/*.xml ──registerStencils──► mxStencilRegistry        (best-effort, at engine boot)
```

1. **Engine boot** (`getEngine`, cached) — create a jsdom `window`; instantiate the npm `mxgraph`
   **factory** (`require('mxgraph')({ mxBasePath, … })`); register stencils; memoise. See §3 for the
   four DOM-compatibility gotchas this step solves.
2. **Wrapper decode** (`parseDrawioPages`) — `mxUtils.parseXml`; a bare `<mxGraphModel>` → one page;
   else iterate `<diagram>`. Body starting with `<` → plain XML; otherwise **decompress**
   (`inflateDiagram`: `Buffer.from(b64,'base64')` → `pako.inflateRaw(..,{to:'string'})` →
   `decodeURIComponent`). (FR-DS-1)
3. **Model decode + SVG export** (`modelXmlToSvg`) — `new mxGraph(container)`, `new mxCodec(doc)
   .decode(root, graph.getModel())`; **`graph.getView().validate()`** to build cell states;
   `graph.getGraphBounds()` (fallback 100×100 if empty); draw with `mxSvgCanvas2D` + `mxImageExport
   .drawState(view.getState(model.getRoot()), canvas)`; `XMLSerializer` → string. (FR-DS-2)
4. **Per-page output** (`drawioToSvgPages`, CLI `main`) — map pages → `{ name, svg }`; the CLI writes
   `<prefix>-<slug(name)>.svg` (or `<prefix>.svg` for a single page). (FR-DS-3)

## 3. Engine-on-jsdom: the four gotchas (NFR-DS-2, NFR-DS-5)

mxGraph assumes a browser; these are the as-built fixes that make it run under Node:

1. **`navigator` shim** — Node ≥21 ships a **read-only `navigator`** lacking `appVersion`, which
   mxClient reads at load (`navigator.appVersion.indexOf('Android')`). Override via
   `Object.defineProperty(globalThis,'navigator',{ value: shim, configurable:true, writable:true })`.
2. **Classes on `window`** — `mxCodec.decode` resolves classes by **`window[node.nodeName]`** (e.g.
   `window['mxGraphModel']`). The factory only populates the `mx` namespace, so the design **copies
   `mx.*` onto `dom.window`**; without this, every node is silently cloned and the graph comes out
   **empty** (the original failure observed during bring-up).
3. **`location` + SVG metric stubs** — bind `global.location = dom.window.location` (mxUrlConverter
   reads bare `location`); stub `SVGElement.prototype.getBBox`/`getComputedTextLength` to zero, since
   jsdom has no layout engine (NFR-DS-4 — geometry still renders from model math; text sizing is
   approximate).
4. **Single `xmlns`** — build the root with `createElementNS(NS_SVG,'svg')` and **do not** also
   `setAttribute('xmlns', …)` (that yields a duplicate `xmlns` librsvg rejects — NFR-DS-5).

## 4. Stencils (FR-DS-4)

`registerStencils` scans the project's `stencils/` dir at engine boot: each `*.xml` is parsed; a
`<shapes>` set registers every child `<shape name>` (lowercased) via
`mxStencilRegistry.addStencil(name, new mxStencil(node))`, and a single `<shape>` registers one.
Parse failures are warned and skipped. Unregistered custom shapes degrade to built-ins/empty (no
crash). draw.io's source stencils live under its `src/main/webapp/stencils/`.

## 5. Isolation (FR-DS-5, NFR-DS-1)

The tool (`packages/js/src/drawio2svg/`, an `.mjs` with no `package.json` of its own) declares its
deps as **`devDependencies` of `packages/js`** and resolves them from `packages/js/node_modules` via
`dirname(require.resolve('mxgraph/package.json'))` (install-location-independent). It stays out of the
published package four ways: those are **dev-only** deps (the package's runtime `dependencies` stays
empty); the `packages/js` **`tsconfig.json`** has `"exclude": ["src/drawio2svg"]` (the `.mjs` is never
compiled to `dist/`; `tsc` also default-excludes `node_modules`); **`eslint.config.mjs`** ignores
`src/drawio2svg/`; and **`package.json` `files`** ships only `dist/`. Thus `mxgraph`/`jsdom`/`pako`
never enter `kymostudio`'s **runtime** dependency tree.

## 6. Determinism & limits (NFR-DS-3, NFR-DS-4)

Decode and export are pure functions of the input; the engine is memoised and stateless per call
(fresh container per page, removed after serialisation), so output is byte-stable. The honest limits —
approximate text metrics (jsdom) and best-effort stencils — are documented in the tool's `README.md`,
which also points to the desktop CLI for full fidelity.

## 7. Prior art

draw.io's own server-side exporter (`jgraph/draw-image-export2`) runs mxGraph under **headless
Chrome/Puppeteer**; community npm converters (`@mattiash/drawio-export`, `draw.io-export`,
`@redfire/drawio-export`) use the **desktop binary** or **Puppeteer/Playwright**. This design's
distinction is running the **same mxGraph engine on jsdom — no browser, no desktop app**. The
engine/format background (archived `jgraph/mxgraph`, vendored engine, maxGraph successor) is in
REF-DRAWIO-001.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built design: pipeline, the four engine-on-jsdom gotchas, stencils, isolation, determinism/limits, prior art. |
| 1.1     | 2026-06-03 | Vũ Anh | §5 Isolation: deps moved to `packages/js` **devDependencies** (no nested `package.json`); base paths now resolved via `require.resolve('mxgraph')`. §1/§4 of `getEngine` unchanged. |
| 1.2     | 2026-06-03 | Vũ Anh | **Re-scoped to as-is.** Added a direction banner: this design now documents the **gap** (mxGraph-on-jsdom + pako), not the target. The zero-dependency target design (own `node:zlib` decode + own SVG emitter) moves to `CR-DRAWIO-SVG-003`. Status → *Under revision (as-is)*. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/format-drawio/modules/drawio-svg/03-DESIGN.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement IDs it traces (FR-DS-1…5,
NFR-DS-1…5) consistent with FEAT-DRAWIO-SVG-001; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the implementation; the normative surface is FEAT-DRAWIO-SVG-001. Reconcile any
deviation there before release.
