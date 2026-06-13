---
title: draw.io Interoperability — Design (umbrella)
document_id: DESIGN-DRAWIO-001
version: "0.2"
issue_date: 2026-06-03
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing/maintaining any drawio-family module
review_cycle: On a module being added/delivered, or on substrate change
supersedes: null
related_documents:
  - FEAT-DRAWIO-001        # Introduction (umbrella)
  - TEST-DRAWIO-001         # Test documentation (umbrella)
  - PLAN-DRAWIO-001         # Plan (umbrella)
  - DESIGN-DRAWIO-SVG-001   # module: drawio-svg design (the substrate, in detail)
  - REF-DRAWIO-001          # draw.io / mxGraph reference
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - zero-dependency
  - node-builtins
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
| Version      | 0.2                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-DRAWIO-001, FEAT-DRAWIO-001, TEST-DRAWIO-001, PLAN-DRAWIO-001, DESIGN-DRAWIO-SVG-001 |

Realises FEAT-DRAWIO-001 (family FR/NFR). **Umbrella architecture** — the shared substrate and the
module plug-in model; per-module detail lives in each module's `03-DESIGN` (`DESIGN-DRAWIO-SVG-001`).
Covers ISO/IEC/IEEE 12207 Architecture & Design Definition.

> **Direction note (v0.2).** The target architecture is **dependency-free** (`SN-DRW-02`): a decode-only
> substrate built on Node built-ins + per-module own emitters. The mxGraph-on-jsdom architecture
> described in earlier revisions is now the `drawio-svg` **as-is gap**, documented (for the current
> code) in `DESIGN-DRAWIO-SVG-001`, not the target.

## 1. Scope

How the `drawio` family is structured: **one dependency-free decode substrate** (Node-built-in wrapper
decode) consumed by independent **modules** (render / import / rasterise) that add their own transform
(rendering modules bring their own SVG emitter), all using **Node built-ins only**.

## 2. Family architecture

```
              .drawio (mxfile)
                    │
        ┌───────────▼───────────┐   shared substrate — DEPENDENCY-FREE (Node built-ins only)
        │  wrapper decode        │   <mxfile>/<diagram> · plain | base64(Buffer)+raw-deflate(node:zlib)
        │  (own XML scan)        │   · per page → [{ name, modelXml }]
        └───────────┬───────────┘
        ┌───────────┼───────────────────────────────┐
        ▼           ▼                                ▼
   drawio-svg   drawio-import (proposed)      drawio-raster (proposed)
   → SVG        → kymo Diagram/model          → PNG/WebP (rasterise SVG)
   own SVG      (reuse decode; map mxCell→     (consume drawio-svg output via
   emitter      Component/Edge, à la from-bpmn) resvg/rsvg, à la to_webp.py)
```

## 3. The shared substrate (FR-DRW-2)

**One reusable piece — a dependency-free wrapper decoder** (the rendering transform is per-module, not
shared substrate):

1. **Wrapper decode** — parse `<mxfile>`, enumerate `<diagram>` pages; a page body is plain
   `<mxGraphModel>` XML or **base64 (`Buffer.from(b64,'base64')`) + raw-deflate (`node:zlib`
   `inflateRawSync`) + URI-decode** — **no `pako`**. Pure, **zero-dependency** (Node built-ins only);
   every module that reads `.drawio` reuses it (`parseDrawioPages`). A pure-data module (import) needs
   only this decode + an own mxCell walk; rendering modules add their own SVG emitter.

> The current `drawio-svg` code instead boots the npm `mxgraph` factory on a **jsdom** DOM and uses
> `pako` for decode — the as-is gap against `SN-DRW-02`; its four browser-compat gotchas are recorded
> in `DESIGN-DRAWIO-SVG-001` §3 for reference only.

## 4. Module plug-in model (FR-DRW-3)

Each module is a self-contained doc-set under `modules/<name>/` (its own `01-INTRO`..`PLAN` + `CR/`)
and a code unit under `packages/js/src/`. A module **declares** which substrate pieces it reuses and
adds only its own transform (e.g. `drawio-svg` adds SVG export; `drawio-import` would add
mxCell→`Component`/`Edge` mapping, paralleling `from-bpmn`). Modules deliver independently; the
umbrella tracks them in the `FEAT-DRAWIO-001` §3 registry.

## 5. Isolation & zero-dep (FR-DRW-4, NFR-DRW-1)

Family-wide rule (target): interop modules take **no third-party npm dependency at all** — runtime or
dev — for `.drawio` work; they use **Node built-ins only**. Module sources live under
`packages/js/src/<module>`, are **excluded** from the `tsc` build and eslint, and are not published
(`files: ["dist/"]`), so nothing enters `kymostudio`'s **runtime** tree either. **Gap:** the current
`drawio-svg` code still declares `mxgraph`/`jsdom`/`pako` as `packages/js` `devDependencies`
(`DESIGN-DRAWIO-SVG-001` §5) — to be removed in the zero-dependency redesign.

## 6. Prior art

draw.io's own paths run mxGraph under the **desktop app** or a **headless browser**; the obvious Node
shortcut (which the `drawio-svg` as-is code took) is mxGraph-on-jsdom. The family's target distinction
is to skip the engine entirely and read/emit `.drawio` with **Node built-ins only**. The engine/format
background (archived `jgraph/mxgraph`, vendored engine, maxGraph successor) is in `REF-DRAWIO-001` and
`DESIGN-DRAWIO-SVG-001` §7. The proposed `drawio-import` follows kymo's existing foreign-XML importer
pattern (`BPMN-MAP-001` / `from-bpmn`).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella design: family architecture, the shared substrate (decode + mxGraph-on-jsdom), module plug-in model, isolation. |
| 0.2     | 2026-06-03 | Vũ Anh | **Zero-dependency target.** Substrate is now decode-only and dependency-free (own XML scan; `Buffer` base64; `node:zlib` raw-inflate — no `pako`); rendering modules add an own SVG emitter (no mxGraph/jsdom). §5 isolation widened to forbid third-party dev deps; mxGraph-on-jsdom demoted to the documented as-is gap. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/format-drawio/03-DESIGN.md`; authoritative source is the main-branch working
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
