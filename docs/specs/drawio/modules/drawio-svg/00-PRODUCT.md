---
title: drawio → SVG — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-DRAWIO-SVG-001
version: "1.1"
issue_date: 2026-06-03
status: Baselined
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
  - mxgraph
  - svg
  - pure-node
---

# drawio → SVG — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-DRAWIO-SVG-001` |
| Version           | 1.1 |
| Status            | Baselined |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-DRAWIO-SVG-001`, `FEAT-DRAWIO-SVG-001` (the SRS derived from the needs below), `DESIGN-DRAWIO-SVG-001`, `REF-DRAWIO-001` (engine/format) |

> This doc owns the `SN-DS-NN` stakeholder needs; the SRS (`FEAT-DRAWIO-SVG-001`)
> derives `FR-DS`/`NFR-DS` from them.

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

The feature delivers a **pure-Node converter** that runs the **actual mxGraph engine** (the npm
`mxgraph` factory build — the same engine, accepting a DOM) on a **jsdom** document, decodes the
`.drawio` wrapper (including the common deflate+base64 page encoding), and exports **one SVG per
page** — **no desktop app, no headless browser**. It is a scriptable, dependency-isolated utility
that does *with mxGraph in Node* what otherwise needs a GUI or a browser.

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

- **Goals:** a **pure-Node** `.drawio → SVG` conversion using the **real mxGraph engine** (not a
  re-implementation); correct handling of **multi-page** files and the **compressed** page encoding;
  a small **library API + CLI**; **best-effort** custom-shape coverage via registerable stencils; and
  strict **isolation** so the published `kymostudio` (`packages/js`) stays **zero-runtime-dependency**.
- **Non-goals:** **pixel-perfect parity** with the draw.io desktop renderer (custom stencil icons and
  exact text wrapping are best-effort — for full fidelity use the desktop CLI); **editing or writing**
  `.drawio` (conversion is one-way); **PNG output** (rasterise the SVG separately); a **Python mirror**
  (this is a JS-only utility built on `mxgraph`+`jsdom`, not a core kymo renderer, so the
  two-implementation parity norm does not apply).

## 4. Stakeholder needs (`SN-DS`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-DS-01` | A `.drawio` file must be convertible to **SVG from Node**, **without** the draw.io desktop app or a headless browser. | Scripted/CI conversion should not require a GUI app or a full Chromium just to render static vectors. |
| `SN-DS-02` | The conversion must use the **real mxGraph engine** (draw.io's own engine), not a hand-rolled `.drawio` interpreter. | Output fidelity should track draw.io's rendering; re-implementing mxGraph layout/shape math would drift and be unmaintainable. |
| `SN-DS-03` | **Multi-page** files and the common **compressed** page encoding (deflate + base64) must be handled, emitting **one SVG per page**. | Real `.drawio` files from the desktop app are usually compressed and often multi-page; a converter that only reads plain single-page XML is not useful. |
| `SN-DS-04` | The capability must **not compromise** the **zero-runtime-dependency** guarantee of the published `kymostudio` (`packages/js`) package. | `packages/js` is intentionally dependency-free; pulling `mxgraph`/`jsdom`/`pako` into its published tree is unacceptable. |
| `SN-DS-05` | It must be usable as **both a CLI and a library**, with known **limitations documented** (text metrics, custom stencils). | Different callers (scripts vs. pipelines) need both entry points; honest limits prevent silent low-fidelity surprises. |

## 5. Scope

**In scope (product level):** a pure-Node `.drawio → SVG` converter using the mxGraph engine on jsdom
— wrapper decode (plain + compressed, multi-page), model decode + SVG export, a library API and CLI,
best-effort stencil registration, and the build/lint/publish isolation that keeps `packages/js`
zero-dependency. **Out of scope:** pixel-perfect desktop parity, `.drawio` editing/writing, PNG
rasterisation, and a Python mirror. See `FEAT-DRAWIO-SVG-001` §4.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial baseline. Documents the **as-built** `drawio2svg` tool (`packages/js/src/drawio2svg/`): pure-Node mxGraph-on-jsdom `.drawio → SVG`. Owns `SN-DS-01..05`. |
| 1.1     | 2026-06-03 | Vũ Anh | §2 substrate: deps are now **dev-only deps of `packages/js`** (nested `package.json` removed); no `SN-DS` change. |
