---
title: drawio → SVG — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-DRAWIO-SVG-001
version: "1.2"
issue_date: 2026-06-03
status: Under revision
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for converting .drawio files to SVG; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-DRAWIO-SVG-001
  - FEAT-DRAWIO-SVG-001
  - DESIGN-DRAWIO-SVG-001
  - TEST-DRAWIO-SVG-001
  - PLAN-DRAWIO-SVG-001
  - REF-DRAWIO-001           # draw.io / mxGraph reference (format = mxGraph XML; engine)
  - REF-DRAWIO-CMP-001       # draw.io ↔ kymo comparison
  - BPMN-MAP-001             # BPMN element mapping (the sample corpus is BPMN)
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - drawio
  - zero-dependency
  - svg
  - pure-node
---

# drawio → SVG — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-DRAWIO-SVG-001` |
| Version           | 1.2 |
| Status            | Under revision |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-DRAWIO-SVG-001`, `FEAT-DRAWIO-SVG-001` (the SRS derived from the needs below), `DESIGN-DRAWIO-SVG-001`, `REF-DRAWIO-001` (engine/format) |

> This doc owns the `SN-DS-NN` stakeholder needs; the SRS (`FEAT-DRAWIO-SVG-001`)
> derives `FR-DS`/`NFR-DS` from them.

> **Direction note (v1.2).** The product goal is now **converting `.drawio` → SVG with zero npm
> dependencies** — own decoder (Node built-ins) + own SVG emitter — per the family target
> (`SN-DRW-02`). `SN-DS-02` is **reversed** accordingly. The shipped code
> (`packages/js/src/drawio2svg/`) still uses **mxGraph + jsdom + pako**; that is now the **as-is gap**,
> retained as a reference until the zero-dependency rewrite (`CR-DRAWIO-SVG-003`). Earlier revisions
> (v1.0/1.1) described the mxGraph-on-jsdom build as the *goal*; it is now the *gap*.

## 1. Problem & motivation

draw.io (`.drawio`, mxGraph XML — `REF-DRAWIO-001`) is a ubiquitous diagram source, but turning one
into an SVG programmatically normally requires **either** the draw.io **desktop binary**
(`drawio -x -f svg`, an Electron app) **or** a **headless browser** (Puppeteer/Playwright loading the
mxGraph viewer). Both are heavyweight for a scripted/CI conversion: a GUI app or a full Chromium just
to render static vectors.

The underlying reason is that draw.io's render engine — **mxGraph** — manipulates a live SVG DOM and
reads browser text metrics (`getBBox`/`getComputedTextLength`); the public `jgraph/mxgraph` package
was archived in 2020, and the engine now lives **vendored inside the draw.io source**
(`src/main/webapp/mxgraph/`). There is **no pure-Node renderer** on npm or PyPI: every converter
shells out to the desktop app or drives a browser.

The feature delivers a **pure-Node, zero-dependency converter**: it decodes the `.drawio` wrapper
(including the common deflate+base64 page encoding) with **Node built-ins only** (`Buffer`,
**`node:zlib`**), then emits **one SVG per page** with its **own SVG emitter** walking the `<mxCell>`
geometry/style — **no desktop app, no headless browser, and no third-party engine**
(`mxgraph`/`jsdom`/`pako`). The trade-off is **best-effort fidelity** vs draw.io's own renderer; the
desktop CLI remains the full-fidelity escape hatch.

> **As-is gap.** The current code instead runs the npm `mxgraph` factory on **jsdom** and decompresses
> with **pako**. That predates the zero-dependency goal and is non-conformant to `SN-DS-02`; it is the
> subject of the redesign (`CR-DRAWIO-SVG-003`).

## 2. Users & context of operations (ConOps)

- **Who:** engineers and pipelines that need `.drawio → .svg` from Node/CI without installing the
  draw.io desktop app or a browser; maintainers exploring how draw.io/mxGraph renders relative to
  kymo's own renderers (`REF-DRAWIO-CMP-001`).
- **Substrate it builds on:** the **mxGraph** engine (npm factory build) for decode + SVG export;
  **jsdom** for the DOM mxGraph requires; **pako** for page decompression. None of these touch the
  published `kymostudio` package — they are **dev-only** deps (declared as `devDependencies` of
  `packages/js`), with the tool at `packages/js/src/drawio2svg/` excluded from the build and not
  shipped.
- **Scenario:** `node index.mjs order.drawio out/order` reads a (possibly multi-page, possibly
  compressed) `.drawio`, and writes `out/order-<page>.svg` for each page — valid SVG that rasterises
  (e.g. `rsvg-convert`) and embeds in pages/docs. As a library:
  `import { drawioToSvg } from './index.mjs'` returns the SVG string for a page.

## 3. Goals & non-goals

- **Goals:** a **pure-Node, zero-dependency** `.drawio → SVG` conversion — own decoder (`Buffer` +
  `node:zlib`) + own SVG emitter, **Node built-ins only**; correct handling of **multi-page** files and
  the **compressed** page encoding; a small **library API + CLI**; **best-effort** shape/text coverage;
  and **zero npm dependency** (no `mxgraph`/`jsdom`/`pako`, runtime *or* dev) so the published
  `kymostudio` (`packages/js`) standard extends to this tool.
- **Non-goals:** depending on **mxGraph / jsdom / pako** or any third-party package (the explicit thing
  this redesign removes); **pixel-perfect parity** with the draw.io desktop renderer (custom shapes and
  exact text wrapping are best-effort — for full fidelity use the desktop CLI); **editing or writing**
  `.drawio` (conversion is one-way); **PNG output** (rasterise the SVG separately); a **Python mirror**
  (this is a JS-only utility, not a core kymo renderer, so the two-implementation parity norm does not
  apply).

## 4. Stakeholder needs (`SN-DS`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-DS-01` | A `.drawio` file must be convertible to **SVG from Node**, **without** the draw.io desktop app or a headless browser. | Scripted/CI conversion should not require a GUI app or a full Chromium just to render static vectors. |
| `SN-DS-02` | The conversion must be **self-contained and dependency-free** — its own `.drawio` decoder and own SVG emitter, built on **Node built-ins only**; it must **not** depend on `mxgraph`/`jsdom`/`pako` or any third-party package. | The published `kymostudio` package is intentionally dependency-free and the converter must uphold the same zero-dependency, supply-chain-minimal standard; the accepted cost is best-effort fidelity (the desktop CLI is the full-fidelity escape hatch). *(Reverses the earlier "use the real mxGraph engine" need.)* |
| `SN-DS-03` | **Multi-page** files and the common **compressed** page encoding (deflate + base64) must be handled, emitting **one SVG per page**. | Real `.drawio` files from the desktop app are usually compressed and often multi-page; a converter that only reads plain single-page XML is not useful. |
| `SN-DS-04` | The capability must add **no npm dependency at all** — neither a **runtime** dependency of the published `kymostudio` (`packages/js`) package (which stays empty) nor a third-party **dev** dependency such as `mxgraph`/`jsdom`/`pako`. | `packages/js` is intentionally dependency-free; per `SN-DS-02` the converter must not reintroduce a dependency by any path, including dev-only. |
| `SN-DS-05` | It must be usable as **both a CLI and a library**, with known **limitations documented** (text metrics, custom stencils). | Different callers (scripts vs. pipelines) need both entry points; honest limits prevent silent low-fidelity surprises. |

## 5. Scope

**In scope (product level):** a pure-Node, **zero-dependency** `.drawio → SVG` converter — wrapper
decode (plain + compressed, multi-page) via Node built-ins, an own SVG emitter, a library API and CLI,
best-effort shape/text coverage, and the build/lint/publish isolation that keeps `packages/js`
zero-dependency. **Out of scope:** any third-party dependency (`mxgraph`/`jsdom`/`pako`), pixel-perfect
desktop parity, `.drawio` editing/writing, PNG rasterisation, and a Python mirror. See
`FEAT-DRAWIO-SVG-001` §4.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial baseline. Documents the **as-built** `drawio2svg` tool (`packages/js/src/drawio2svg/`): pure-Node mxGraph-on-jsdom `.drawio → SVG`. Owns `SN-DS-01..05`. |
| 1.1     | 2026-06-03 | Vũ Anh | §2 substrate: deps are now **dev-only deps of `packages/js`** (nested `package.json` removed); no `SN-DS` change. |
| 1.2     | 2026-06-03 | Vũ Anh | **Direction change to zero npm dependency** (family `SN-DRW-02`). **Reversed `SN-DS-02`** (real mxGraph engine → self-contained, dependency-free, Node built-ins only); widened `SN-DS-04` to dev deps; reframed §1/§3/§5 goals to own-decoder + own-emitter. The shipped mxGraph/jsdom/pako code is now the **as-is gap** (`CR-DRAWIO-SVG-003`). Status → *Under revision*. |
