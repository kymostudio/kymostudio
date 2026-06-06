---
title: drawio → SVG — Requirements
document_id: FEAT-DRAWIO-SVG-001
version: "1.3"
issue_date: 2026-06-06
status: Under revision
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying the drawio2svg utility
review_cycle: On CR completion, or on engine/dependency change
supersedes: null
related_documents:
  - DESIGN-DRAWIO-SVG-001   # Design
  - TEST-DRAWIO-SVG-001     # Test documentation
  - PLAN-DRAWIO-SVG-001     # Plan (now 04-PLAN.md)
  - REF-DRAWIO-001          # draw.io / mxGraph reference (format + engine)
  - REF-DRAWIO-CMP-001      # draw.io ↔ kymo comparison
  - BPMN-MAP-001            # BPMN element mapping (the sample corpus is BPMN)
  - FEAT-DRAWIO-001         # Umbrella requirements
  - DESIGN-DRAWIO-001       # Umbrella design
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
  - product-description
  - conops
  - stakeholder-requirements
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# drawio → SVG — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-DRAWIO-SVG-001                                |
| Version      | 1.3                                                |
| Status       | Under revision                                     |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-DRAWIO-SVG-001, TEST-DRAWIO-SVG-001, PLAN-DRAWIO-SVG-001, REF-DRAWIO-001, FEAT-DRAWIO-001 |

## Part A — Product context (ConOps & Stakeholder Requirements)

> This part owns the `SN-DS-NN` stakeholder needs; Part C (the SRS) derives `FR-DS`/`NFR-DS` from them.

> **Direction note (v1.2).** The product goal is now **converting `.drawio` → SVG with zero npm
> dependencies** — own decoder (Node built-ins) + own SVG emitter — per the family target
> (`SN-DRW-02`). `SN-DS-02` is **reversed** accordingly. The shipped code
> (`packages/js/src/drawio2svg/`) still uses **mxGraph + jsdom + pako**; that is now the **as-is gap**,
> retained as a reference until the zero-dependency rewrite (`CR-DRAWIO-SVG-003`). Earlier revisions
> (v1.0/1.1) described the mxGraph-on-jsdom build as the *goal*; it is now the *gap*.

### A.1 Problem & motivation

draw.io (`.drawio`, mxGraph XML — `REF-DRAWIO-001`) is a ubiquitous diagram source, but turning one
into an SVG programmatically normally requires **either** the draw.io **desktop binary**
(`drawio -x -f svg`, an Electron app) **or** a **headless browser** (Puppeteer/Playwright loading the
mxGraph viewer). Both are heavyweight for a scripted/CI conversion: a GUI app or a full Chromium just
to render static vectors.

The underlying reason is that draw.io's render engine — **mxGraph** — manipulates a live SVG DOM and
reads browser text metrics (`getBBox`/`getComputedTextLength`); the public `jgraph/mxgraph` package
was archived in 2020, and the engine now lives **vendored inside the draw.io source**
(`src/main/webapp/mxgraph/`, ~133 client JS files). There is **no pure-Node renderer** on npm or PyPI: every converter
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

### A.2 Users & context of operations (ConOps)

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

### A.3 Goals & non-goals

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

### A.4 Stakeholder needs (`SN-DS`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-DS-01` | A `.drawio` file must be convertible to **SVG from Node**, **without** the draw.io desktop app or a headless browser. | Scripted/CI conversion should not require a GUI app or a full Chromium just to render static vectors. |
| `SN-DS-02` | The conversion must be **self-contained and dependency-free** — its own `.drawio` decoder and own SVG emitter, built on **Node built-ins only**; it must **not** depend on `mxgraph`/`jsdom`/`pako` or any third-party package. | The published `kymostudio` package is intentionally dependency-free and the converter must uphold the same zero-dependency, supply-chain-minimal standard; the accepted cost is best-effort fidelity (the desktop CLI is the full-fidelity escape hatch). *(Reverses the earlier "use the real mxGraph engine" need.)* |
| `SN-DS-03` | **Multi-page** files and the common **compressed** page encoding (deflate + base64) must be handled, emitting **one SVG per page**. | Real `.drawio` files from the desktop app are usually compressed and often multi-page; a converter that only reads plain single-page XML is not useful. |
| `SN-DS-04` | The capability must add **no npm dependency at all** — neither a **runtime** dependency of the published `kymostudio` (`packages/js`) package (which stays empty) nor a third-party **dev** dependency such as `mxgraph`/`jsdom`/`pako`. | `packages/js` is intentionally dependency-free; per `SN-DS-02` the converter must not reintroduce a dependency by any path, including dev-only. |
| `SN-DS-05` | It must be usable as **both a CLI and a library**, with known **limitations documented** (text metrics, custom stencils). | Different callers (scripts vs. pipelines) need both entry points; honest limits prevent silent low-fidelity surprises. |

### A.5 Scope

**In scope (product level):** a pure-Node, **zero-dependency** `.drawio → SVG` converter — wrapper
decode (plain + compressed, multi-page) via Node built-ins, an own SVG emitter, a library API and CLI,
best-effort shape/text coverage, and the build/lint/publish isolation that keeps `packages/js`
zero-dependency. **Out of scope:** any third-party dependency (`mxgraph`/`jsdom`/`pako`), pixel-perfect
desktop parity, `.drawio` editing/writing, PNG rasterisation, and a Python mirror. See
`FEAT-DRAWIO-SVG-001` §C.4.

---

## Part B — Introduction

> **Direction note (v1.2).** The goal is now **converting `.drawio` → SVG with zero npm dependencies**
> (own decoder via Node built-ins + own SVG emitter), per the family target (`SN-DRW-02`). The shipped
> `drawio2svg` code (`packages/js/src/drawio2svg/`) still uses **mxGraph + jsdom + pako** — that is the
> **as-is gap**, retained as a reference pending the zero-dependency rewrite (`CR-DRAWIO-SVG-003`). The
> mxGraph-on-jsdom material below describes the *current code* (the gap), not the target.

The original feature is **already implemented** (the `drawio2svg` tool, `packages/js/src/drawio2svg/`);
the v1.0/1.1 set was its **as-built baseline**, now superseded as the target by the zero-dependency
redesign. Changes are raised as change-requests (`CR/`) — see §B.6 and PLAN-DRAWIO-SVG-001 §7.

### B.1 Purpose and scope

This document is the entry point to the **drawio → SVG** feature's doc set. It
states the problem, the concept, and the terminology, and maps the reader to the requirements (Part C),
the design (`DESIGN-DRAWIO-SVG-001`), the test documentation (`TEST-DRAWIO-SVG-001`), and the plan
(`PLAN-DRAWIO-SVG-001`). The set conforms to ISO/IEC/IEEE 12207:2017 and ISO/IEC/IEEE 15289:2019.

### B.2 Background

draw.io's render engine is **mxGraph**, which manipulates a live SVG DOM and reads browser text
metrics. The public `jgraph/mxgraph` npm/repo was **archived in 2020**; the engine is now **vendored
inside the draw.io source** (`src/main/webapp/mxgraph/`, ~133 client JS files), and the community
successor **maxGraph** is a separate TypeScript project draw.io does **not** use. Existing
`.drawio → image` paths either run the **draw.io desktop binary** or drive a **headless browser**
(Puppeteer/Playwright), and the obvious Node shortcut — which the **current code** takes — is to run
the npm `mxgraph` factory build on **jsdom**. The target, however, is to skip the engine entirely:
read and emit `.drawio` with **Node built-ins only**, taking **no third-party dependency**.

### B.3 Feature concept

Convert a `.drawio` to SVG **in pure Node, with zero npm dependencies**:

- **Decode the wrapper** — parse `<mxfile>`, enumerate `<diagram>` pages; each page body is either
  plain `<mxGraphModel>` XML or **base64 + raw-deflate + URI-encoding**, decoded with **Node built-ins**
  (`Buffer.from(b64,'base64')` + **`node:zlib` `inflateRawSync`** + `decodeURIComponent`) — **no
  `pako`**.
- **Emit SVG ourselves** — walk the `<mxCell>` geometry/style and write SVG (shapes, edges, labels)
  directly, serialised per page — **no mxGraph, no jsdom**. Fidelity is best-effort.
- **Library + CLI** — `drawioToSvg` / `drawioToSvgPages` / `parseDrawioPages` as a library;
  `node index.mjs <input.drawio> [prefix]` writes one `<prefix>-<page>.svg` per page.

The tool lives under `packages/js/src/drawio2svg/`; the target takes **no npm dependency** (Node
built-ins only) and stays **isolated** so the published `kymostudio` package stays
**zero-runtime-dependency** (the `tsc` build and eslint both exclude it; only `dist/` ships). Target
behaviour: Part C below.

> **As-is gap.** The shipped code decodes with `pako` and renders by booting the npm `mxgraph` factory
> on **jsdom** (`mxCodec` → `mxImageExport`/`mxSvgCanvas2D`); those deps are `packages/js`
> `devDependencies`. The four engine-on-jsdom gotchas it solves are recorded in DESIGN-DRAWIO-SVG-001
> §3 **for the current code** — the redesign (`CR-DRAWIO-SVG-003`) removes all three deps.

### B.4 Audience

Engineers implementing or reviewing the `drawio2svg` utility, the kymo JS package
(`packages/js`) and its dependency-free guarantee, and anyone comparing draw.io/mxGraph rendering to
kymo's own renderers (`REF-DRAWIO-CMP-001`).

### B.5 Terms and abbreviations

- **`.drawio` / mxGraph XML** — draw.io's native format: an `<mxfile>` of one or more `<diagram>`
  pages, each an `<mxGraphModel>` of `<mxCell>`s (`REF-DRAWIO-001`).
- **mxGraph** — the client-side diagramming engine draw.io is built on. The **target** does **not** use
  it; it appears only as the format's origin and as what the **as-is code** still runs (the gap).
- **jsdom** — a Node DOM implementation used by the **as-is code** to host mxGraph. The target removes
  it.
- **Page** — one `<diagram>` in the `<mxfile>`; emitted as one SVG.
- **Compressed body** — a `<diagram>` whose content is base64 + raw-deflate + URI-encoded (decoded with
  **`node:zlib`** in the target; the as-is code uses **pako**); the default for desktop-saved files.
- **Own SVG emitter** — the target's renderer: walks `<mxCell>` geometry/style and writes SVG directly,
  Node-built-in only. Best-effort: complex/custom shapes degrade gracefully (built-in approximation or
  empty glyph) without crashing.
- **Library API / CLI** — `drawioToSvg(xml,{pageIndex})`, `drawioToSvgPages(xml)`,
  `parseDrawioPages(xml)`, `modelXmlToSvg(xml,opts)`; `node index.mjs <input> [prefix]`.

### B.6 Document map

This feature's docs use the two-layer model in this folder — a **baselined spec** (`01-REQUIREMENTS`–
`03-TEST`) and a **living plan** (`04-PLAN.md` + `CR/`).

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` (this) | FEAT-DRAWIO-SVG-001 | *what product problem & whose needs (`SN-DS`)? where do I start? what must it do? (requirements, `FR-DS`/`NFR-DS`)* |
| 02 | `02-DESIGN.md` | DESIGN-DRAWIO-SVG-001 | *how is it built? (engine-on-jsdom, the gotchas)* |
| 03 | `03-TEST.md` | TEST-DRAWIO-SVG-001 | *how do we know it's right?* |
| — | `04-PLAN.md` | PLAN-DRAWIO-SVG-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Reading order: **`01-REQUIREMENTS`** (this) → **`02-DESIGN`** → **`03-TEST`**;
delivery status in PLAN-DRAWIO-SVG-001 + `CR/`. Cross-references use **`document_id`**
(never file paths).

- **Change management:** the baseline reserves the `-001` suffix; each later increment is a
  change-request under `CR/` (folders `CR-002`+), re-baselining the parent (bump version + Annex A
  row) on close.

---

## Part C — Requirements (SRS)

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. Each
requirement carries a stable ID for traceability from TEST-DRAWIO-SVG-001. Concept:
Part B above; realisation: DESIGN-DRAWIO-SVG-001.

### C.1 Scope and stakeholder needs

Stakeholder needs (`SN-DS-01..05`, ISO 29148 §6.4.2 ConOps) are owned by **Part A** of this document;
each requirement traces back via the **Source need** annotation.

**Scope (this SRS):** specify how a `.drawio` file is **decoded** (multi-page, compressed) and
**rendered to SVG with an own emitter in pure Node**, the **library API + CLI**, **best-effort**
shape/text coverage, and the **zero-dependency** rule that keeps both the converter and the published
`kymostudio` package free of any npm dependency. Later deltas live in change-requests (§C.5).

> **Direction note (v1.2).** These requirements state the **zero-dependency target** (`SN-DRW-02`).
> The shipped code still uses `mxGraph`/`jsdom`/`pako`; clauses below mark, per requirement, what the
> **as-is code** does vs. the **target**. The redesign is `CR-DRAWIO-SVG-003`.

### C.2 Functional requirements

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
  Fidelity is **best-effort** (see §C.4). *(Target. As-is code renders via the npm `mxgraph` factory on
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

### C.3 Non-functional requirements

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

### C.4 Constraints, assumptions, out-of-scope

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

### C.5 Change-request roadmap (delivery increments)

The baseline (`-001`) is the **as-built** tool. Future increments are self-contained mini-specs under
`CR/` with CR-local IDs (`FR-CRn-`/`NFR-CRn-`).

| CR | Increment | Realises (baseline FR) | Status |
|----|-----------|------------------------|--------|
| — (`-001`) | **As-is code** (non-conformant to the v1.2 target): wrapper decode (`pako`) + mxGraph-on-jsdom SVG export + library/CLI + stencil loader | (was FR-DS-1..5) | **Superseded** by the zero-dep target; retained as reference |
| `CR-DRAWIO-SVG-003` (`CR-003/`) | **Zero-dependency rewrite** — replace `pako` decode with `node:zlib`, replace mxGraph/jsdom rendering with an **own SVG emitter**; remove all three deps | FR-DS-1, FR-DS-2, FR-DS-4, FR-DS-5; NFR-DS-1..5 | **Proposed** (the redesign) |
| `CR-DRAWIO-SVG-002` (`CR-002/`) | **Bundled BPMN/AWS stencils** — raise custom-shape fidelity (now within the own emitter, not mxGraph) | FR-DS-4 | Proposed (re-scope onto the own emitter, after CR-003) |

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial baseline. Documents the **as-built** `drawio2svg` tool (`packages/js/src/drawio2svg/`): pure-Node mxGraph-on-jsdom `.drawio → SVG`. Owns `SN-DS-01..05`. *(from FEAT-DRAWIO-SVG-001 v1.0)* |
| 1.1     | 2026-06-03 | Vũ Anh | §2 substrate: deps are now **dev-only deps of `packages/js`** (nested `package.json` removed); no `SN-DS` change. *(from FEAT-DRAWIO-SVG-001 v1.1)* |
| 1.2     | 2026-06-03 | Vũ Anh | **Direction change to zero npm dependency** (family `SN-DRW-02`). **Reversed `SN-DS-02`** (real mxGraph engine → self-contained, dependency-free, Node built-ins only); widened `SN-DS-04` to dev deps; reframed §1/§3/§5 goals to own-decoder + own-emitter. The shipped mxGraph/jsdom/pako code is now the **as-is gap** (`CR-DRAWIO-SVG-003`). Status → *Under revision*. *(from FEAT-DRAWIO-SVG-001 v1.2)* |
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built baseline. Introduced the pure-Node mxGraph-on-jsdom `.drawio → SVG` converter; cited the archived-mxGraph / vendored-engine background. *(from FEAT-DRAWIO-SVG-001 v1.0)* |
| 1.1     | 2026-06-03 | Vũ Anh | §3: deps moved to `packages/js` **devDependencies** (no nested `package.json`). *(from FEAT-DRAWIO-SVG-001 v1.1)* |
| 1.2     | 2026-06-03 | Vũ Anh | **Direction change to zero npm dependency.** Reframed §2/§3/§5 to own decoder (`node:zlib`) + own SVG emitter; mxGraph/jsdom/pako demoted to the documented **as-is gap** (`CR-DRAWIO-SVG-003`). Status → *Under revision*. *(from FEAT-DRAWIO-SVG-001 v1.2)* |
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built SRS (`FR-DS-1..5`, `NFR-DS-1..5`); constraints; CR roadmap (CR-002 bundled stencils, Proposed). *(from FEAT-DRAWIO-SVG-001 v1.0)* |
| 1.1     | 2026-06-03 | Vũ Anh | `FR-DS-5` reworded: deps moved from a nested `package.json` to **`devDependencies` of `packages/js`** (resolved via `require.resolve`); runtime `dependencies` stays empty. *(from FEAT-DRAWIO-SVG-001 v1.1)* |
| 1.2     | 2026-06-03 | Vũ Anh | **Zero-dependency target** (`SN-DRW-02`). `FR-DS-1` decode → `node:zlib` (not pako); `FR-DS-2` render → **own SVG emitter** (not mxGraph/jsdom); `FR-DS-4` → own-emitter shape coverage; `FR-DS-5`/`NFR-DS-1` → **no third-party dep, runtime or dev**; `NFR-DS-2`/`NFR-DS-4` reworded off jsdom. As-is `-001` marked superseded; added `CR-DRAWIO-SVG-003` (the rewrite). Status → *Under revision*. *(from FEAT-DRAWIO-SVG-001 v1.2)* |
| 1.3     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged FEAT-DRAWIO-SVG-001 (product context, ConOps, `SN-DS`) into Part A; merged FEAT-DRAWIO-SVG-001 (background, feature concept, terms, document map) into Part B; merged FEAT-DRAWIO-SVG-001 (SRS: `FR-DS`, `NFR-DS`, constraints, CR roadmap) into Part C. Updated document map to 4-file layout (`01-REQUIREMENTS`/`02-DESIGN`/`03-TEST`/`04-PLAN`). No content changes; removed FEAT-DRAWIO-SVG-001 and FEAT-DRAWIO-SVG-001 from related_documents. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/modules/drawio-svg/01-REQUIREMENTS.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs); update
TEST-DRAWIO-SVG-001's traceability matrix; increment `version`; append a row to Annex A. A delivery
increment is raised as a change-request under `CR/`.

### B.4 Backwards Compatibility
Requirement IDs (`SN-DS`, `FR-DS`, `NFR-DS`) are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid.
