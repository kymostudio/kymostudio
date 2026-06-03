---
title: draw.io Interoperability — Requirements (umbrella)
document_id: FEAT-DRAWIO-001
version: "0.1"
issue_date: 2026-06-03
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing and verifying any drawio-family module
review_cycle: On a module being added/delivered, or on family-scope change
supersedes: null
related_documents:
  - INTRO-DRAWIO-001        # Introduction (umbrella)
  - DESIGN-DRAWIO-001       # Design (umbrella)
  - TEST-DRAWIO-001         # Test documentation (umbrella)
  - PLAN-DRAWIO-001         # Plan (umbrella)
  - FEAT-DRAWIO-SVG-001     # module: drawio-svg requirements (realises the family substrate)
  - REF-DRAWIO-001          # draw.io / mxGraph reference
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - requirements
  - interoperability
  - umbrella
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# draw.io Interoperability — Requirements (umbrella)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-DRAWIO-001                                    |
| Version      | 0.1                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-001, DESIGN-DRAWIO-001, TEST-DRAWIO-001, PLAN-DRAWIO-001, FEAT-DRAWIO-SVG-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. These are
**family-level** requirements; each module's SRS (e.g. `FEAT-DRAWIO-SVG-001`) refines them with
module-local `FR`/`NFR`. (This umbrella has no separate `00-PRODUCT`; the stakeholder needs `SN-DRW`
are owned here, in §1.)

## 1. Scope and stakeholder needs (`SN-DRW`)

**Scope:** the `drawio` family gives kymo **pure-Node** interoperability with draw.io (`.drawio`,
mxGraph XML) — rendering today (`drawio-svg`), and, proposed, import and rasterisation — sharing one
substrate, without compromising the published `kymostudio` package's zero-runtime-dependency.

| ID | Need | Rationale |
|----|------|-----------|
| `SN-DRW-01` | kymo must interoperate with `.drawio` **from Node**, without the draw.io desktop app or a headless browser. | draw.io is a ubiquitous source/target; scripted/CI interop should not require a GUI app or a browser. |
| `SN-DRW-02` | Interop must use the **real mxGraph engine** where rendering/geometry is involved, not a hand-rolled `.drawio` interpreter. | Fidelity should track draw.io; re-implementing mxGraph would drift and be unmaintainable. |
| `SN-DRW-03` | The family must be **modular** — each capability (render, import, rasterise) is delivered independently with its own doc-set, sharing one substrate. | Capabilities mature at different rates; a shared decode/engine spine avoids duplication. |
| `SN-DRW-04` | No module may compromise the **zero-runtime-dependency** guarantee of the published `kymostudio` (`packages/js`) package. | `packages/js` is intentionally dependency-free; heavyweight engine deps must stay dev-only. |

## 2. Functional requirements (family)

- **FR-DRW-1** The family SHALL provide draw.io interoperability that runs in **pure Node** (no draw.io
  desktop binary, no headless browser). *(SN-DRW-01)*
- **FR-DRW-2** The family SHALL share **one substrate**: a **`.drawio` wrapper decoder** (`<mxfile>`/
  `<diagram>` enumeration; plain and base64/raw-deflate page bodies; multi-page) and, where
  rendering/geometry is needed, the **mxGraph engine on jsdom**. Modules SHALL reuse this substrate
  rather than re-implement it. It is realised by `drawio-svg` (`FEAT-DRAWIO-SVG-001` FR-DS-1, FR-DS-2).
  *(SN-DRW-02, SN-DRW-03)*
- **FR-DRW-3** Each capability SHALL be a **module** under `modules/` with a self-contained doc-set
  and CR log, delivered independently. The family baseline is **`drawio-svg`** (`.drawio` → SVG,
  delivered); **`drawio-import`** (`.drawio` → kymo `Diagram`/model) and **`drawio-raster`**
  (`.drawio` → PNG/WebP) are **proposed**. *(SN-DRW-03)*
- **FR-DRW-4** Every module SHALL keep the published `kymostudio` package **zero-runtime-dependency** —
  engine/interop deps (`mxgraph`/`jsdom`/`pako`, …) declared as **`devDependencies` of `packages/js`**,
  module sources excluded from the build and not published. *(SN-DRW-04)*

## 3. Non-functional requirements (family)

- **NFR-DRW-1** **Zero-dep preserved.** The published `kymostudio` runtime `dependencies` SHALL stay
  empty across all modules (FR-DRW-4).
- **NFR-DRW-2** **Pure-Node.** Family capabilities SHALL run headless on macOS/Linux/CI with Node only.
- **NFR-DRW-3** **Additive.** Adding any module SHALL NOT change existing kymo render/import paths;
  the golden-SVG and BPMN-corpus baselines SHALL be unchanged.
- **NFR-DRW-4** **Determinism.** For a given input and options, each module's output SHALL be
  deterministic.

## 4. Constraints, assumptions, out-of-scope

- **Best-effort fidelity, not desktop parity** — module renderers approximate draw.io (custom
  stencils, text wrapping); the desktop CLI remains the full-fidelity escape hatch (see
  `FEAT-DRAWIO-SVG-001` §4).
- **JS-only family.** These are utilities built on `mxgraph`/`jsdom`; the core kymo two-implementation
  (Python/JS) parity norm does **not** apply.
- **Out-of-scope (umbrella):** authoring `.drawio` in the DSL; an in-browser draw.io editor.

## 5. Module roadmap (which module realises what)

| Module | Realises (family FR) | Status |
|--------|----------------------|--------|
| `drawio-svg` (`FEAT-DRAWIO-SVG-001`) | FR-DRW-1, FR-DRW-2 (establishes the substrate), FR-DRW-3, FR-DRW-4 | **Delivered** |
| `drawio-import` | FR-DRW-1, FR-DRW-2 (reuse decode), FR-DRW-3 | Proposed |
| `drawio-raster` | FR-DRW-1, FR-DRW-3 (consumes `drawio-svg` output) | Proposed |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella SRS: `SN-DRW-01..04`, `FR-DRW-1..4`, `NFR-DRW-1..4`; module roadmap (drawio-svg delivered; import/raster proposed). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/02-REQUIREMENTS.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family; available to all repository readers.

### B.3 Change Control
Adding/changing a family requirement requires: edit the relevant FR/NFR (preserving IDs); update
TEST-DRAWIO-001's traceability and the affected module SRS; increment `version`; append a row to
Annex A. A new capability is raised as a module under `modules/`.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid.
