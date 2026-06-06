---
title: draw.io Interoperability — Requirements (umbrella)
document_id: FEAT-DRAWIO-001
version: "0.3"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying any drawio-family module
review_cycle: On a module being added/delivered, or on family-scope change
supersedes: null
related_documents:
  - DESIGN-DRAWIO-001       # Design (umbrella)
  - TEST-DRAWIO-001         # Test documentation (umbrella)
  - PLAN-DRAWIO-001         # Plan (umbrella)
  - FEAT-DRAWIO-SVG-001     # module: drawio-svg requirements (realises the family substrate)
  - REF-DRAWIO-001          # draw.io / mxGraph reference
  - DESIGN-DRAWIO-SVG-001   # module: drawio-svg design
  - REF-DRAWIO-CMP-001      # draw.io ↔ kymo comparison
  - BPMN-MAP-001            # BPMN element mapping (a related importer precedent)
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - requirements
  - interoperability
  - umbrella
  - traceability
  - zero-dependency
  - pure-node
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# draw.io Interoperability — Requirements (umbrella)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-DRAWIO-001                                    |
| Version      | 0.3                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-06                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-DRAWIO-001, TEST-DRAWIO-001, PLAN-DRAWIO-001, FEAT-DRAWIO-SVG-001, REF-DRAWIO-001 |

## Part A — Introduction

### A.1 Purpose and scope

This document introduces **`drawio`** — the **umbrella** for kymo's **draw.io interoperability**
family — and is the entry point to its document set. draw.io (`.drawio`, mxGraph XML) is a ubiquitous
diagram source/target; this family gives kymo ways to **work with `.drawio` from Node** (render,
and — proposed — import and rasterise), all sharing one substrate. The defining goal is to do this
**with zero npm dependencies**: no draw.io desktop app, no headless browser, and **no third-party
engine** (`mxgraph`/`jsdom`/`pako`) — only Node built-ins. The umbrella owns the **family** scope,
requirements, architecture, V&V, and roadmap; each capability is a **module** with its own
self-contained doc-set under `modules/`. The set conforms to ISO/IEC/IEEE 12207:2017 and 15289:2019.

> **Direction note (v0.2).** The family target is **dependency-free** (`SN-DRW-02`). The first
> module's *current code* (`drawio-svg`, `packages/js/src/drawio2svg/`) still uses `mxgraph` + `jsdom`
> + `pako` (dev-only); that implementation **predates** this target and is retained as the **as-is
> reference**, a known gap pending the zero-dependency redesign (see PLAN-DRAWIO-001 §3 and the
> `drawio-svg` `CR/`). Earlier revisions of this set described the mxGraph-on-jsdom approach as the
> goal; it is now the gap, not the goal.

### A.2 Background

draw.io's render engine is **mxGraph**, which needs a browser DOM; the public `jgraph/mxgraph` was
archived in 2020 and the engine now lives vendored inside the draw.io source. Existing `.drawio`
tooling therefore relies on the **desktop binary** or a **headless browser**, and the obvious Node
shortcut is to run mxGraph on **jsdom** — which is what the first module's *current code* does. The
family, however, targets a lighter spine that takes on **no third-party dependency at all**: a
**dependency-free `.drawio` decoder** (own `<mxfile>`/`<diagram>` scan; `Buffer` base64; **`node:zlib`
raw-inflate** in place of `pako`) plus, for rendering modules, an **own SVG emitter** that walks
`<mxCell>` geometry/style — no mxGraph, no jsdom. That decode-only substrate is the reusable spine the
rest of the family builds on. The family also relates to kymo's existing importer precedent for a
foreign XML format (BPMN, `BPMN-MAP-001`).

### A.3 The family and its modules

`drawio` is the **system**; each capability is a **module** (system element) under `modules/`, with
its own doc-set. The umbrella delegates all implementation detail to the modules.

| Module | Capability | document_id (entry) | Status |
|--------|------------|---------------------|--------|
| **`drawio-svg`** | `.drawio` → **SVG** (dependency-free decoder + own SVG emitter) | `FEAT-DRAWIO-SVG-001` | **As-is (mxGraph/jsdom/pako); zero-dep redesign pending** |
| `drawio-import` | `.drawio` → **kymo `Diagram`/model** (foreign-format import, akin to `from-bpmn`) | — | Proposed |
| `drawio-raster` | `.drawio` → **PNG/WebP** (rasterise the module's SVG) | — | Proposed |

### A.4 Document map

The umbrella uses a four-document numbered layout (`01`–`04`); the modules each carry their own
doc-set under `modules/`.

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-REQUIREMENTS.md` (this) | FEAT-DRAWIO-001 | *where do I start? what is the family? what must it do? (needs `SN-DRW`, `FR-DRW`/`NFR-DRW`)* |
| 02 | `02-DESIGN.md` | DESIGN-DRAWIO-001 | *how is it built? (the shared substrate + module plug-in model)* |
| 03 | `03-TEST.md` | TEST-DRAWIO-001 | *how do we know it's right? (`TC-DRW` + traceability)* |
| 04 | `04-PLAN.md` | PLAN-DRAWIO-001 | *why, in what order, at what risk, what's done?* |
| — | `modules/` | — | *per-module doc-sets: `drawio-svg` (as-is mxGraph; zero-dep redesign pending); `drawio-import`, `drawio-raster` (proposed).* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only. Reading order: **`01-REQUIREMENTS`** (this) → **`02-DESIGN`** →
**`03-TEST`** → **`04-PLAN`**, then the module doc-sets (start at `FEAT-DRAWIO-SVG-001`).

### A.5 Audience

Engineers implementing or reviewing any `drawio` module, the kymo JS package (`packages/js`) and its
dependency-free guarantee, and anyone comparing draw.io/mxGraph to kymo's own renderers
(`REF-DRAWIO-CMP-001`).

### A.6 Terms and abbreviations

- **Umbrella / module** — `drawio` is the umbrella (system); `drawio-svg`/`drawio-import`/
  `drawio-raster` are modules (system elements) under `modules/`, each with its own doc-set.
- **`.drawio` / mxGraph XML** — draw.io's native format: an `<mxfile>` of `<diagram>` pages, each an
  `<mxGraphModel>` of `<mxCell>`s (`REF-DRAWIO-001`).
- **The substrate** — the shared spine: a **dependency-free wrapper decode** (plain + base64/raw-deflate,
  multi-page) using only Node built-ins (`Buffer`, `node:zlib`). Rendering modules add their own SVG
  emitter on top. Established (as the decode contract) by `drawio-svg`.
- **mxGraph** — the engine draw.io is built on. The family **does not** depend on it; it is named here
  only as the format's origin and as what the `drawio-svg` *as-is code* still uses (the gap to remove).

---

## Part B — Requirements

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. These are
**family-level** requirements; each module's SRS (e.g. `FEAT-DRAWIO-SVG-001`) refines them with
module-local `FR`/`NFR`. (This umbrella has no separate `00-PRODUCT`; the stakeholder needs `SN-DRW`
are owned here, in §B.1.)

### B.1 Scope and stakeholder needs (`SN-DRW`)

**Scope:** the `drawio` family gives kymo **pure-Node, dependency-free** interoperability with draw.io
(`.drawio`, mxGraph XML) — rendering today (`drawio-svg`), and, proposed, import and rasterisation —
sharing one substrate. The defining constraint is **zero npm dependency**: no draw.io desktop app, no
headless browser, and no third-party engine (`mxgraph`/`jsdom`/`pako`) — only Node built-ins — so the
published `kymostudio` package's dependency-free standard extends to the interop tooling itself.

> **Direction note (v0.2).** `SN-DRW-02` is **reversed** from earlier revisions. It previously
> required the **real mxGraph engine** (forbidding a hand-rolled interpreter); the family now requires
> the opposite — a **self-contained, dependency-free** implementation. The `drawio-svg` module's
> *current code* still uses mxGraph/jsdom/pako and is therefore a **known gap** against `SN-DRW-02`
> (see §B.5 and PLAN-DRAWIO-001 §3), not a conformant realisation.

| ID | Need | Rationale |
|----|------|-----------|
| `SN-DRW-01` | kymo must interoperate with `.drawio` **from Node**, without the draw.io desktop app or a headless browser. | draw.io is a ubiquitous source/target; scripted/CI interop should not require a GUI app or a browser. |
| `SN-DRW-02` | Interop must be **self-contained and dependency-free** — its own `.drawio` decoder and (for rendering) its own SVG emitter, built on **Node built-ins only**; it must **not** depend on third-party packages such as `mxgraph`/`jsdom`/`pako`. | The published package is intentionally dependency-free; the interop tooling must uphold the same zero-dependency, supply-chain-minimal standard. The accepted trade-off is **best-effort fidelity** (vs draw.io's own engine); the desktop CLI remains the full-fidelity escape hatch. |
| `SN-DRW-03` | The family must be **modular** — each capability (render, import, rasterise) is delivered independently with its own doc-set, sharing one substrate. | Capabilities mature at different rates; a shared decode spine avoids duplication. |
| `SN-DRW-04` | No module may compromise the **zero-runtime-dependency** guarantee of the published `kymostudio` (`packages/js`) package — nor, per `SN-DRW-02`, add a third-party **dev** dependency for `.drawio` interop. | `packages/js` is intentionally dependency-free end-to-end; the interop modules must not reintroduce a dependency by any path. |

### B.2 Functional requirements (family)

- **FR-DRW-1** The family SHALL provide draw.io interoperability that runs in **pure Node** (no draw.io
  desktop binary, no headless browser). *(SN-DRW-01)*
- **FR-DRW-2** The family SHALL share **one substrate**: a **dependency-free `.drawio` wrapper decoder**
  (`<mxfile>`/`<diagram>` enumeration; plain and base64/raw-deflate page bodies; multi-page) built on
  **Node built-ins only** (`Buffer` for base64, **`node:zlib` `inflateRawSync`** for raw-deflate, an
  own XML scan), with **no third-party dependency**. Modules SHALL reuse this decoder rather than
  re-implement it; rendering modules SHALL add their **own SVG emitter** over it (no mxGraph, no jsdom).
  *(SN-DRW-02, SN-DRW-03)*
- **FR-DRW-3** Each capability SHALL be a **module** under `modules/` with a self-contained doc-set
  and CR log, delivered independently. The family baseline is **`drawio-svg`** (`.drawio` → SVG);
  **`drawio-import`** (`.drawio` → kymo `Diagram`/model) and **`drawio-raster`** (`.drawio` → PNG/WebP)
  are **proposed**. *(SN-DRW-03)*
- **FR-DRW-4** No module SHALL add **any** dependency for `.drawio` interop — neither a **runtime**
  dependency of the published `kymostudio` package (which SHALL stay empty) nor a third-party **dev**
  dependency such as `mxgraph`/`jsdom`/`pako`. Interop SHALL be implemented with Node built-ins only;
  module sources remain excluded from the build and not published. *(SN-DRW-02, SN-DRW-04)*

### B.3 Non-functional requirements (family)

- **NFR-DRW-1** **Zero-dep, end-to-end.** The published `kymostudio` runtime `dependencies` SHALL stay
  empty across all modules **and** no `drawio` module SHALL introduce a third-party npm dependency
  (runtime *or* dev) for interop — Node built-ins only (FR-DRW-4).
- **NFR-DRW-2** **Pure-Node.** Family capabilities SHALL run headless on macOS/Linux/CI with Node only.
- **NFR-DRW-3** **Additive.** Adding any module SHALL NOT change existing kymo render/import paths;
  the golden-SVG and BPMN-corpus baselines SHALL be unchanged.
- **NFR-DRW-4** **Determinism.** For a given input and options, each module's output SHALL be
  deterministic.

### B.4 Constraints, assumptions, out-of-scope

- **Best-effort fidelity, not desktop parity** — an own SVG emitter approximates draw.io (custom
  stencils, text wrapping/metrics); this fidelity trade-off is the **deliberate cost** of the
  zero-dependency goal, and the desktop CLI remains the full-fidelity escape hatch (see
  `FEAT-DRAWIO-SVG-001` §4).
- **JS-only family.** These are Node-built-in-only utilities living under `packages/js`; the core kymo
  two-implementation (Python/JS) parity norm does **not** apply.
- **Out-of-scope (umbrella):** authoring `.drawio` in the DSL; an in-browser draw.io editor.

### B.5 Module roadmap (which module realises what)

| Module | Realises (family FR) | Status |
|--------|----------------------|--------|
| `drawio-svg` (`FEAT-DRAWIO-SVG-001`) | FR-DRW-1, FR-DRW-2 (defines the decode substrate), FR-DRW-3, FR-DRW-4 | **As-is code uses mxGraph/jsdom/pako — non-conformant to `SN-DRW-02`; zero-dep redesign pending** |
| `drawio-import` | FR-DRW-1, FR-DRW-2 (reuse decode), FR-DRW-3 | Proposed |
| `drawio-raster` | FR-DRW-1, FR-DRW-3 (consumes `drawio-svg` output) | Proposed |

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella introduction + document map + module registry (`drawio-svg` delivered; `drawio-import`/`drawio-raster` proposed). *(from FEAT-DRAWIO-001 v0.1)* |
| 0.2     | 2026-06-03 | Vũ Anh | **Direction change:** family goal is now **zero npm dependency** (own decoder via Node built-ins + own SVG emitter), not mxGraph-on-jsdom. Reframed §1/§2/§6; `drawio-svg` reclassified to *as-is (mxGraph) / zero-dep redesign pending*. Substrate is now decode-only. *(from FEAT-DRAWIO-001 v0.2)* |
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella SRS: `SN-DRW-01..04`, `FR-DRW-1..4`, `NFR-DRW-1..4`; module roadmap (drawio-svg delivered; import/raster proposed). *(from FEAT-DRAWIO-001 v0.1)* |
| 0.2     | 2026-06-03 | Vũ Anh | **Direction change to zero-dependency.** Reversed `SN-DRW-02` (was "use real mxGraph engine" → now "self-contained, dependency-free, Node built-ins only"); reworded `FR-DRW-2`/`FR-DRW-4`/`NFR-DRW-1` (decode via `Buffer`/`node:zlib`; own SVG emitter; no third-party dep, runtime *or* dev); `SN-DRW-04` widened to dev deps. `drawio-svg` reclassified to *non-conformant as-is (mxGraph); redesign pending*. *(from FEAT-DRAWIO-001 v0.2)* |
| 0.3     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged FEAT-DRAWIO-001 (introduction, background, module registry, document map, audience, terms) into Part A; merged FEAT-DRAWIO-001 (SN-DRW, FR-DRW, NFR-DRW, module roadmap) into Part B. Updated document map to 4-file layout (`01-REQUIREMENTS`/`02-DESIGN`/`03-TEST`/`04-PLAN`). No content changes; removed FEAT-DRAWIO-001 from related_documents. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/01-REQUIREMENTS.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family it introduces; available to all repository readers.

### B.3 Change Control
Adding a module or changing family scope requires: update the relevant clause + the Part A §A.3 module registry;
keep the umbrella set (DESIGN/TEST/PLAN) consistent; increment `version`; append a row to
Annex A.

### B.4 Backwards Compatibility
Requirement IDs (`SN-DRW`, `FR-DRW`, `NFR-DRW`) are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid.
