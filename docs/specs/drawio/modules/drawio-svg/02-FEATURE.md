---
title: drawio → SVG — Requirements
document_id: FEAT-DRAWIO-SVG-001
version: "1.1"
issue_date: 2026-06-03
status: Baselined
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the drawio2svg utility
review_cycle: On CR completion, or on engine/dependency change
supersedes: null
related_documents:
  - PROD-DRAWIO-SVG-001     # Product description (stakeholder needs)
  - INTRO-DRAWIO-SVG-001    # Introduction
  - DESIGN-DRAWIO-SVG-001   # Design
  - TEST-DRAWIO-SVG-001     # Test documentation
  - PLAN-DRAWIO-SVG-001     # Plan
  - REF-DRAWIO-001          # draw.io / mxGraph reference (format + engine)
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - mxgraph
  - svg
  - requirements
  - pure-node
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# drawio → SVG — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-DRAWIO-SVG-001                                |
| Version      | 1.1                                                |
| Status       | Baselined                                          |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | PROD-DRAWIO-SVG-001 (stakeholder needs), INTRO-DRAWIO-SVG-001, DESIGN-DRAWIO-SVG-001, TEST-DRAWIO-SVG-001, PLAN-DRAWIO-SVG-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. Each
requirement carries a stable ID for traceability from TEST-DRAWIO-SVG-001. Concept:
INTRO-DRAWIO-SVG-001; realisation: DESIGN-DRAWIO-SVG-001.

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-DS-01..05`, ISO 29148 §6.4.2 ConOps) are owned by **`PROD-DRAWIO-SVG-001`**;
each requirement traces back via the **Source need** annotation.

**Scope (this SRS):** specify how a `.drawio` file is **decoded** (multi-page, compressed), **rendered
to SVG using the mxGraph engine in pure Node** (on jsdom), the **library API + CLI**, **best-effort
stencil** coverage, and the **isolation** that keeps the published `kymostudio` package
zero-dependency. **As-built baseline SRS**; later deltas live in change-requests (§5).

## 2. Functional requirements

**Wrapper decode** *(Source need: `SN-DS-03`)*
- **FR-DS-1** The feature SHALL parse a `.drawio` (`<mxfile>`) input and **enumerate its pages**
  (`<diagram>`), exposing each page's name and its `<mxGraphModel>` XML. A **bare `<mxGraphModel>`**
  (no `<mxfile>` wrapper) SHALL be treated as a single page. For each page body the feature SHALL
  handle **both** encodings: **plain** `<mxGraphModel>` XML, and the **compressed** form
  (**base64 → raw-deflate (`pako.inflateRaw`) → `decodeURIComponent`**).

**Render via mxGraph** *(Source need: `SN-DS-01`, `SN-DS-02`)*
- **FR-DS-2** The feature SHALL render each page's model to **SVG using the mxGraph engine** — the npm
  `mxgraph` **factory build** running on a **jsdom** DOM — via `mxCodec` decode → `mxImageExport` +
  `mxSvgCanvas2D` → serialisation. It SHALL require **neither the draw.io desktop binary nor a
  headless browser**. Output SHALL be **well-formed SVG** (single SVG root, single `xmlns`, with
  `width`/`height`/`viewBox` from the graph bounds plus a border).

**Library API & CLI** *(Source need: `SN-DS-05`)*
- **FR-DS-3** The feature SHALL expose a **library API** — `drawioToSvg(xml, { pageIndex })` (one page
  → SVG string), `drawioToSvgPages(xml)` (`[{ name, svg }]`), `parseDrawioPages(xml)`
  (`[{ name, modelXml }]`), and `modelXmlToSvg(modelXml, { scale, border })` — **and** a **CLI**,
  `node index.mjs <input.drawio> [out-prefix]`, that writes **one `<prefix>-<page>.svg` per page**
  (prefix defaulting to the input path without extension; page names slugified).

**Stencils (best-effort)** *(Source need: `SN-DS-02`)*
- **FR-DS-4** The feature SHALL register **stencil-set XML** found in its `stencils/` directory into
  `mxStencilRegistry` (a `<shapes>` set or a single `<shape>`), widening custom-shape coverage. Where
  a shape's stencil is **not** registered it SHALL fall back to mxGraph's built-in rendering (or an
  empty glyph) **without error**.

**Isolation** *(Source need: `SN-DS-04`)*
- **FR-DS-5** The feature (`packages/js/src/drawio2svg/`) SHALL declare its deps (`mxgraph`, `jsdom`,
  `pako`) as **`devDependencies` of `packages/js`** (it has no `package.json` of its own), resolving
  them from `packages/js/node_modules` via `require.resolve`. It SHALL be **excluded** from the
  `packages/js` `tsc` build (`tsconfig` `exclude`) and from eslint (`eslint.config` `ignores`), and
  SHALL NOT be published (only `dist/` ships). It SHALL add **no runtime dependency** to the
  `kymostudio` (`packages/js`) `package.json` — its runtime `dependencies` stays empty.

## 3. Non-functional requirements

- **NFR-DS-1** **Zero-dep preserved.** The published `kymostudio` package SHALL remain
  zero-runtime-dependency; `mxgraph`/`jsdom`/`pako` SHALL NOT appear in `packages/js`'s published
  dependency tree (FR-DS-5).
- **NFR-DS-2** **Pure-Node runtime.** Conversion SHALL run headless on macOS/Linux/CI with Node only
  (no GUI, no browser). It SHALL accommodate Node ≥21's read-only `navigator` global by overriding it
  with a shim carrying `appVersion` (which mxClient reads).
- **NFR-DS-3** **Determinism.** For a given input file and options, the emitted SVG SHALL be
  deterministic (byte-stable across runs).
- **NFR-DS-4** **Graceful degradation.** jsdom has no layout engine, so text-metric-driven sizing is
  **approximate** (`getBBox`/`getComputedTextLength` are stubbed to zero) and missing custom stencils
  render as built-ins/empty; these limits SHALL be **documented** and SHALL NOT crash the conversion.
- **NFR-DS-5** **Valid output.** Emitted SVG SHALL parse in a strict SVG reader (e.g. `librsvg` /
  `rsvg-convert`) — in particular it SHALL NOT contain a duplicate `xmlns` attribute.

## 4. Constraints, assumptions, out-of-scope

- **Best-effort fidelity, not desktop parity.** Custom stencil icons and exact text wrapping are
  approximate; for pixel-perfect output use the draw.io desktop CLI (`drawio -x -f svg`). This tool
  exists specifically to render *with mxGraph in pure Node*.
- **One-way conversion.** The feature reads `.drawio` and writes SVG; it does **not** edit or write
  `.drawio`.
- **SVG only.** No PNG/raster output — rasterise the SVG separately (`rsvg-convert`/`resvg`).
- **No Python mirror.** This is a JS-only utility built on `mxgraph`+`jsdom`; the
  two-implementation parity norm (core kymo renderers) does **not** apply.

## 5. Change-request roadmap (delivery increments)

The baseline (`-001`) is the **as-built** tool. Future increments are self-contained mini-specs under
`CR/` with CR-local IDs (`FR-CRn-`/`NFR-CRn-`).

| CR | Increment | Realises (baseline FR) | Status |
|----|-----------|------------------------|--------|
| — (`-001`) | **As-built**: wrapper decode + mxGraph-on-jsdom SVG export + library/CLI + stencil loader + isolation | FR-DS-1..FR-DS-5; NFR-DS-1..NFR-DS-5 | **Baselined** (implemented) |
| `CR-DRAWIO-SVG-002` (`CR-002/`) | **Bundled BPMN/AWS stencils** — ship draw.io stencil XML so event/marker glyphs render (raise fidelity toward FR-DS-4) | FR-DS-4 | Proposed |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built SRS (`FR-DS-1..5`, `NFR-DS-1..5`); constraints; CR roadmap (CR-002 bundled stencils, Proposed). |
| 1.1     | 2026-06-03 | Vũ Anh | `FR-DS-5` reworded: deps moved from a nested `package.json` to **`devDependencies` of `packages/js`** (resolved via `require.resolve`); runtime `dependencies` stays empty. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/modules/drawio-svg/02-FEATURE.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs); update
TEST-DRAWIO-SVG-001's traceability matrix; increment `version`; append a row to Annex A. A delivery
increment is raised as a change-request under `CR/`.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid.
