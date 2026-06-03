---
title: draw.io Interoperability — Introduction (umbrella)
document_id: INTRO-DRAWIO-001
version: "0.2"
issue_date: 2026-06-03
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of kymo's draw.io interoperability family
review_cycle: On a module being added/delivered, or on family-scope change
supersedes: null
related_documents:
  - FEAT-DRAWIO-001         # Umbrella requirements
  - DESIGN-DRAWIO-001       # Umbrella design
  - TEST-DRAWIO-001         # Umbrella test documentation
  - PLAN-DRAWIO-001         # Umbrella plan
  - INTRO-DRAWIO-SVG-001    # module: drawio-svg (.drawio → SVG) — as-is (mxGraph); zero-dep redesign pending
  - FEAT-DRAWIO-SVG-001     # module: drawio-svg requirements
  - DESIGN-DRAWIO-SVG-001   # module: drawio-svg design
  - REF-DRAWIO-001          # draw.io / mxGraph reference (mxGraph XML format; engine)
  - REF-DRAWIO-CMP-001      # draw.io ↔ kymo comparison
  - BPMN-MAP-001            # BPMN element mapping (a related importer precedent)
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - zero-dependency
  - pure-node
  - interoperability
  - umbrella
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# draw.io Interoperability — Introduction (umbrella)

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-DRAWIO-001                                            |
| Version      | 0.2                                                         |
| Status       | Draft                                                       |
| Issue Date   | 2026-06-03                                                 |
| Owner        | `diagrams/` project                                         |
| Related      | FEAT-DRAWIO-001, DESIGN-DRAWIO-001, TEST-DRAWIO-001, PLAN-DRAWIO-001, INTRO-DRAWIO-SVG-001, REF-DRAWIO-001 |

## 1. Purpose and scope

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

## 2. Background

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

## 3. The family and its modules

`drawio` is the **system**; each capability is a **module** (system element) under `modules/`, with
its own doc-set. The umbrella delegates all implementation detail to the modules.

| Module | Capability | document_id (entry) | Status |
|--------|------------|---------------------|--------|
| **`drawio-svg`** | `.drawio` → **SVG** (dependency-free decoder + own SVG emitter) | `INTRO-DRAWIO-SVG-001` | **As-is (mxGraph/jsdom/pako); zero-dep redesign pending** |
| `drawio-import` | `.drawio` → **kymo `Diagram`/model** (foreign-format import, akin to `from-bpmn`) | — | Proposed |
| `drawio-raster` | `.drawio` → **PNG/WebP** (rasterise the module's SVG) | — | Proposed |

## 4. Document map

The umbrella uses a five-document numbered layout (`01`–`05`); the modules each carry their own
doc-set under `modules/`.

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 01 | `01-INTRO.md` (this) | INTRO-DRAWIO-001 | *where do I start? what is the family?* |
| 02 | `02-REQUIREMENTS.md` | FEAT-DRAWIO-001 | *what must the family do? (needs `SN-DRW`, `FR-DRW`/`NFR-DRW`)* |
| 03 | `03-DESIGN.md` | DESIGN-DRAWIO-001 | *how is it built? (the shared substrate + module plug-in model)* |
| 04 | `04-TEST.md` | TEST-DRAWIO-001 | *how do we know it's right? (`TC-DRW` + traceability)* |
| 05 | `05-PLAN.md` | PLAN-DRAWIO-001 | *why, in what order, at what risk, what's done?* |
| — | `modules/` | — | *per-module doc-sets: `drawio-svg` (as-is mxGraph; zero-dep redesign pending); `drawio-import`, `drawio-raster` (proposed).* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only. Reading order: **`01-INTRO`** (this) → **`02-REQUIREMENTS`** →
**`03-DESIGN`** → **`04-TEST`** → **`05-PLAN`**, then the module doc-sets (start at
`INTRO-DRAWIO-SVG-001`).

## 5. Audience

Engineers implementing or reviewing any `drawio` module, the kymo JS package (`packages/js`) and its
dependency-free guarantee, and anyone comparing draw.io/mxGraph to kymo's own renderers
(`REF-DRAWIO-CMP-001`).

## 6. Terms and abbreviations

- **Umbrella / module** — `drawio` is the umbrella (system); `drawio-svg`/`drawio-import`/
  `drawio-raster` are modules (system elements) under `modules/`, each with its own doc-set.
- **`.drawio` / mxGraph XML** — draw.io's native format: an `<mxfile>` of `<diagram>` pages, each an
  `<mxGraphModel>` of `<mxCell>`s (`REF-DRAWIO-001`).
- **The substrate** — the shared spine: a **dependency-free wrapper decode** (plain + base64/raw-deflate,
  multi-page) using only Node built-ins (`Buffer`, `node:zlib`). Rendering modules add their own SVG
  emitter on top. Established (as the decode contract) by `drawio-svg`.
- **mxGraph** — the engine draw.io is built on. The family **does not** depend on it; it is named here
  only as the format's origin and as what the `drawio-svg` *as-is code* still uses (the gap to remove).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella introduction + document map + module registry (`drawio-svg` delivered; `drawio-import`/`drawio-raster` proposed). |
| 0.2     | 2026-06-03 | Vũ Anh | **Direction change:** family goal is now **zero npm dependency** (own decoder via Node built-ins + own SVG emitter), not mxGraph-on-jsdom. Reframed §1/§2/§6; `drawio-svg` reclassified to *as-is (mxGraph) / zero-dep redesign pending*. Substrate is now decode-only. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/01-INTRO.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family it introduces; available to all repository readers.

### B.3 Change Control
Adding a module or changing family scope requires: update the relevant clause + the §3 module registry;
keep the umbrella set (REQUIREMENTS/DESIGN/TEST/PLAN) consistent; increment `version`; append a row to
Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any family change, reconcile it with FEAT-DRAWIO-001 and the
affected module doc-set before release.
