---
title: draw.io Interoperability — Design (umbrella)
document_id: DESIGN-DRAWIO-001
version: "0.1"
issue_date: 2026-06-03
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing/maintaining any drawio-family module
review_cycle: On a module being added/delivered, or on substrate change
supersedes: null
related_documents:
  - INTRO-DRAWIO-001        # Introduction (umbrella)
  - FEAT-DRAWIO-001         # Requirements (umbrella, traced below)
  - TEST-DRAWIO-001         # Test documentation (umbrella)
  - PLAN-DRAWIO-001         # Plan (umbrella)
  - DESIGN-DRAWIO-SVG-001   # module: drawio-svg design (the substrate, in detail)
  - REF-DRAWIO-001          # draw.io / mxGraph reference
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - mxgraph
  - jsdom
  - design
  - architecture
  - umbrella
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# draw.io Interoperability — Design (umbrella)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-DRAWIO-001                                  |
| Version      | 0.1                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-001, FEAT-DRAWIO-001, TEST-DRAWIO-001, PLAN-DRAWIO-001, DESIGN-DRAWIO-SVG-001 |

Realises FEAT-DRAWIO-001 (family FR/NFR). **Umbrella architecture** — the shared substrate and the
module plug-in model; per-module detail (e.g. the engine-on-jsdom gotchas) lives in each module's
`03-DESIGN` (`DESIGN-DRAWIO-SVG-001`). Covers ISO/IEC/IEEE 12207 Architecture & Design Definition.

## 1. Scope

How the `drawio` family is structured: **one substrate** (wrapper decode + mxGraph-on-jsdom) consumed
by independent **modules** (render / import / rasterise), all kept isolated from the published package.

## 2. Family architecture

```
              .drawio (mxfile)
                    │
        ┌───────────▼───────────┐   shared substrate (established by drawio-svg)
        │  wrapper decode        │   <mxfile>/<diagram> · plain | base64+raw-deflate · per page
        │  + mxGraph-on-jsdom    │   engine boot (navigator/window/location shims) · mxCodec decode
        └───────────┬───────────┘
        ┌───────────┼───────────────────────────────┐
        ▼           ▼                                ▼
   drawio-svg   drawio-import (proposed)      drawio-raster (proposed)
   → SVG        → kymo Diagram/model          → PNG/WebP (rasterise SVG)
   [delivered]  (reuse decode; map mxCell→     (consume drawio-svg output via
                Component/Edge, à la from-bpmn) resvg/rsvg, à la to_webp.py)
```

## 3. The shared substrate (FR-DRW-2)

Two reusable pieces, specified in detail in **DESIGN-DRAWIO-SVG-001**:

1. **Wrapper decode** — parse `<mxfile>`, enumerate `<diagram>` pages; a page body is plain
   `<mxGraphModel>` XML or **base64 + raw-deflate (`pako`) + URI-decode**. Pure, dependency-light;
   every module that reads `.drawio` reuses it (`parseDrawioPages`).
2. **mxGraph-on-jsdom** — boot the npm `mxgraph` factory on a jsdom DOM; the four browser-compat
   gotchas (navigator shim; classes-on-`window`; `location`/`getBBox` stubs; single `xmlns`) are
   solved once in the module and documented in `DESIGN-DRAWIO-SVG-001` §3. Modules needing
   geometry/rendering (svg, raster) consume the engine; a pure-data module (import) may need only the
   decode + `mxCodec` model, not SVG export.

## 4. Module plug-in model (FR-DRW-3)

Each module is a self-contained doc-set under `modules/<name>/` (its own `01-INTRO`..`PLAN` + `CR/`)
and a code unit under `packages/js/src/`. A module **declares** which substrate pieces it reuses and
adds only its own transform (e.g. `drawio-svg` adds SVG export; `drawio-import` would add
mxCell→`Component`/`Edge` mapping, paralleling `from-bpmn`). Modules deliver independently; the
umbrella tracks them in the `INTRO-DRAWIO-001` §3 registry.

## 5. Isolation & zero-dep (FR-DRW-4, NFR-DRW-1)

Family-wide rule: interop deps (`mxgraph`/`jsdom`/`pako`, …) are **`devDependencies` of `packages/js`**;
module sources live under `packages/js/src/<module>` and are **excluded** from the `tsc` build and
eslint, and not published (`files: ["dist/"]`). Thus no module enters `kymostudio`'s **runtime**
dependency tree. (As implemented for `drawio-svg` — `DESIGN-DRAWIO-SVG-001` §5.)

## 6. Prior art

The substrate's distinction — running the **real mxGraph engine on jsdom, no browser/desktop** — and
the engine/format background (archived `jgraph/mxgraph`, vendored engine, maxGraph successor) are in
`REF-DRAWIO-001` and `DESIGN-DRAWIO-SVG-001` §7. The proposed `drawio-import` follows kymo's existing
foreign-XML importer pattern (`BPMN-MAP-001` / `from-bpmn`).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella design: family architecture, the shared substrate (decode + mxGraph-on-jsdom), module plug-in model, isolation. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/03-DESIGN.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family; available to all repository readers.

### B.3 Change Control
On a substrate/architecture change: update the affected clause; keep the family FR/NFR it traces
consistent with FEAT-DRAWIO-001 and the affected module design; increment `version`; append a row to
Annex A.

### B.4 Backwards Compatibility
This describes the family architecture; the normative module surface is each module's design (e.g.
DESIGN-DRAWIO-SVG-001). Reconcile any deviation there before release.
