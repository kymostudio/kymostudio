---
title: drawio → SVG — Requirements
document_id: FEAT-DRAWIO-SVG-001
version: "1.2"
issue_date: 2026-06-03
status: Under revision
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
  - zero-dependency
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
| Version      | 1.2                                                |
| Status       | Under revision                                     |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | PROD-DRAWIO-SVG-001 (stakeholder needs), INTRO-DRAWIO-SVG-001, DESIGN-DRAWIO-SVG-001, TEST-DRAWIO-SVG-001, PLAN-DRAWIO-SVG-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. Each
requirement carries a stable ID for traceability from TEST-DRAWIO-SVG-001. Concept:
INTRO-DRAWIO-SVG-001; realisation: DESIGN-DRAWIO-SVG-001.

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-DS-01..05`, ISO 29148 §6.4.2 ConOps) are owned by **`PROD-DRAWIO-SVG-001`**;
each requirement traces back via the **Source need** annotation.

**Scope (this SRS):** specify how a `.drawio` file is **decoded** (multi-page, compressed) and
**rendered to SVG with an own emitter in pure Node**, the **library API + CLI**, **best-effort**
shape/text coverage, and the **zero-dependency** rule that keeps both the converter and the published
`kymostudio` package free of any npm dependency. Later deltas live in change-requests (§5).

> **Direction note (v1.2).** These requirements state the **zero-dependency target** (`SN-DRW-02`).
> The shipped code still uses `mxGraph`/`jsdom`/`pako`; clauses below mark, per requirement, what the
> **as-is code** does vs. the **target**. The redesign is `CR-DRAWIO-SVG-003`.

## 2. Functional requirements

**Wrapper decode** *(Source need: `SN-DS-03`)*
- **FR-DS-1** The feature SHALL parse a `.drawio` (`<mxfile>`) input and **enumerate its pages**
  (`<diagram>`), exposing each page's name and its `<mxGraphModel>` XML. A **bare `<mxGraphModel>`**
  (no `<mxfile>` wrapper) SHALL be treated as a single page. For each page body the feature SHALL
  handle **both** encodings: **plain** `<mxGraphModel>` XML, and the **compressed** form
  (**base64 → raw-deflate → `decodeURIComponent`**). The decode SHALL use **Node built-ins only** —
  `Buffer` for base64 and **`node:zlib` `inflateRawSync`** for raw-deflate. *(Target. As-is code uses
  `pako.inflateRaw`.)*

**Render with an own SVG emitter** *(Source need: `SN-DS-01`, `SN-DS-02`)*
- **FR-DS-2** The feature SHALL render each page's model to **SVG with its own emitter** — walking the
  `<mxCell>` geometry/style and writing SVG (shapes, edges, labels) directly, using **Node built-ins
  only**, with **no mxGraph, no jsdom, and no third-party dependency**. It SHALL require **neither the
  draw.io desktop binary nor a headless browser**. Output SHALL be **well-formed SVG** (single SVG
  root, single `xmlns`, with `width`/`height`/`viewBox` from the content bounds plus a border).
  Fidelity is **best-effort** (see §4). *(Target. As-is code renders via the npm `mxgraph` factory on
  jsdom — `mxCodec` → `mxImageExport`/`mxSvgCanvas2D` — the gap this FR replaces.)*

**Library API & CLI** *(Source need: `SN-DS-05`)*
- **FR-DS-3** The feature SHALL expose a **library API** — `drawioToSvg(xml, { pageIndex })` (one page
  → SVG string), `drawioToSvgPages(xml)` (`[{ name, svg }]`), `parseDrawioPages(xml)`
  (`[{ name, modelXml }]`), and `modelXmlToSvg(modelXml, { scale, border })` — **and** a **CLI**,
  `node index.mjs <input.drawio> [out-prefix]`, that writes **one `<prefix>-<page>.svg` per page**
  (prefix defaulting to the input path without extension; page names slugified).

**Shape/text coverage (best-effort)** *(Source need: `SN-DS-02`)*
- **FR-DS-4** The own emitter SHALL cover draw.io's **common built-in shapes** (rectangles, ellipses,
  rhombus, edges, labels) directly. For shapes it does **not** model — custom stencils, exotic styles —
  it SHALL **degrade gracefully** (a bounding-box/built-in approximation or an empty glyph) **without
  error**. *(Target. As-is code instead registers stencil XML into mxGraph's `mxStencilRegistry`.)*

**Isolation & zero dependency** *(Source need: `SN-DS-04`)*
- **FR-DS-5** The feature (`packages/js/src/drawio2svg/`) SHALL take **no third-party npm dependency**
  for `.drawio` conversion — neither runtime nor dev — using **Node built-ins only**. It SHALL be
  **excluded** from the `packages/js` `tsc` build (`tsconfig` `exclude`) and from eslint
  (`eslint.config` `ignores`), and SHALL NOT be published (only `dist/` ships). The `kymostudio`
  (`packages/js`) runtime `dependencies` SHALL stay empty **and** `mxgraph`/`jsdom`/`pako` SHALL be
  removed from its `devDependencies`. *(Target. As-is code declares those three as `packages/js`
  devDependencies — the gap this FR closes.)*

## 3. Non-functional requirements

- **NFR-DS-1** **Zero-dependency, end-to-end.** The converter SHALL add **no third-party npm
  dependency** (runtime *or* dev); `mxgraph`/`jsdom`/`pako` SHALL NOT appear anywhere in `packages/js`'s
  dependency tree, and the published runtime `dependencies` SHALL stay empty (FR-DS-5).
- **NFR-DS-2** **Pure-Node runtime.** Conversion SHALL run headless on macOS/Linux/CI with Node only
  (no GUI, no browser) using only Node built-ins (`node:fs`/`node:path`/`node:zlib`/`Buffer`). *(The
  as-is code additionally needs a Node ≥21 `navigator` shim for mxClient; the target drops that need.)*
- **NFR-DS-3** **Determinism.** For a given input file and options, the emitted SVG SHALL be
  deterministic (byte-stable across runs).
- **NFR-DS-4** **Graceful degradation.** Text-metric-driven sizing is **approximate** (no browser
  layout engine) and unmodelled custom shapes render as approximations/empty; these limits SHALL be
  **documented** and SHALL NOT crash the conversion.
- **NFR-DS-5** **Valid output.** Emitted SVG SHALL parse in a strict SVG reader (e.g. `librsvg` /
  `rsvg-convert`) — in particular it SHALL NOT contain a duplicate `xmlns` attribute.

## 4. Constraints, assumptions, out-of-scope

- **Best-effort fidelity, not desktop parity.** An own emitter (no mxGraph) approximates custom shapes
  and text wrapping; this is the **deliberate cost** of the zero-dependency goal. For pixel-perfect
  output use the draw.io desktop CLI (`drawio -x -f svg`). This tool exists specifically to convert
  *with Node built-ins only*.
- **One-way conversion.** The feature reads `.drawio` and writes SVG; it does **not** edit or write
  `.drawio`.
- **SVG only.** No PNG/raster output — rasterise the SVG separately (`rsvg-convert`/`resvg`).
- **No Python mirror.** This is a JS-only, Node-built-in-only utility; the two-implementation parity
  norm (core kymo renderers) does **not** apply.
- **No third-party dependency.** `mxgraph`/`jsdom`/`pako` (and any other npm package) are out of scope
  for the target; their presence in the as-is code is the gap being removed.

## 5. Change-request roadmap (delivery increments)

The baseline (`-001`) is the **as-built** tool. Future increments are self-contained mini-specs under
`CR/` with CR-local IDs (`FR-CRn-`/`NFR-CRn-`).

| CR | Increment | Realises (baseline FR) | Status |
|----|-----------|------------------------|--------|
| — (`-001`) | **As-is code** (non-conformant to the v1.2 target): wrapper decode (`pako`) + mxGraph-on-jsdom SVG export + library/CLI + stencil loader | (was FR-DS-1..5) | **Superseded** by the zero-dep target; retained as reference |
| `CR-DRAWIO-SVG-003` (`CR-003/`) | **Zero-dependency rewrite** — replace `pako` decode with `node:zlib`, replace mxGraph/jsdom rendering with an **own SVG emitter**; remove all three deps | FR-DS-1, FR-DS-2, FR-DS-4, FR-DS-5; NFR-DS-1..5 | **Proposed** (the redesign) |
| `CR-DRAWIO-SVG-002` (`CR-002/`) | **Bundled BPMN/AWS stencils** — raise custom-shape fidelity (now within the own emitter, not mxGraph) | FR-DS-4 | Proposed (re-scope onto the own emitter, after CR-003) |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built SRS (`FR-DS-1..5`, `NFR-DS-1..5`); constraints; CR roadmap (CR-002 bundled stencils, Proposed). |
| 1.1     | 2026-06-03 | Vũ Anh | `FR-DS-5` reworded: deps moved from a nested `package.json` to **`devDependencies` of `packages/js`** (resolved via `require.resolve`); runtime `dependencies` stays empty. |
| 1.2     | 2026-06-03 | Vũ Anh | **Zero-dependency target** (`SN-DRW-02`). `FR-DS-1` decode → `node:zlib` (not pako); `FR-DS-2` render → **own SVG emitter** (not mxGraph/jsdom); `FR-DS-4` → own-emitter shape coverage; `FR-DS-5`/`NFR-DS-1` → **no third-party dep, runtime or dev**; `NFR-DS-2`/`NFR-DS-4` reworded off jsdom. As-is `-001` marked superseded; added `CR-DRAWIO-SVG-003` (the rewrite). Status → *Under revision*. |

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
