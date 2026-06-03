---
title: draw.io Interoperability — Requirements (umbrella)
document_id: FEAT-DRAWIO-001
version: "0.2"
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
| Version      | 0.2                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-001, DESIGN-DRAWIO-001, TEST-DRAWIO-001, PLAN-DRAWIO-001, FEAT-DRAWIO-SVG-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. These are
**family-level** requirements; each module's SRS (e.g. `FEAT-DRAWIO-SVG-001`) refines them with
module-local `FR`/`NFR`. (This umbrella has no separate `00-PRODUCT`; the stakeholder needs `SN-DRW`
are owned here, in §1.)

## 1. Scope and stakeholder needs (`SN-DRW`)

**Scope:** the `drawio` family gives kymo **pure-Node, dependency-free** interoperability with draw.io
(`.drawio`, mxGraph XML) — rendering today (`drawio-svg`), and, proposed, import and rasterisation —
sharing one substrate. The defining constraint is **zero npm dependency**: no draw.io desktop app, no
headless browser, and no third-party engine (`mxgraph`/`jsdom`/`pako`) — only Node built-ins — so the
published `kymostudio` package's dependency-free standard extends to the interop tooling itself.

> **Direction note (v0.2).** `SN-DRW-02` is **reversed** from earlier revisions. It previously
> required the **real mxGraph engine** (forbidding a hand-rolled interpreter); the family now requires
> the opposite — a **self-contained, dependency-free** implementation. The `drawio-svg` module's
> *current code* still uses mxGraph/jsdom/pako and is therefore a **known gap** against `SN-DRW-02`
> (see §5 and PLAN-DRAWIO-001 §3), not a conformant realisation.

| ID | Need | Rationale |
|----|------|-----------|
| `SN-DRW-01` | kymo must interoperate with `.drawio` **from Node**, without the draw.io desktop app or a headless browser. | draw.io is a ubiquitous source/target; scripted/CI interop should not require a GUI app or a browser. |
| `SN-DRW-02` | Interop must be **self-contained and dependency-free** — its own `.drawio` decoder and (for rendering) its own SVG emitter, built on **Node built-ins only**; it must **not** depend on third-party packages such as `mxgraph`/`jsdom`/`pako`. | The published package is intentionally dependency-free; the interop tooling must uphold the same zero-dependency, supply-chain-minimal standard. The accepted trade-off is **best-effort fidelity** (vs draw.io's own engine); the desktop CLI remains the full-fidelity escape hatch. |
| `SN-DRW-03` | The family must be **modular** — each capability (render, import, rasterise) is delivered independently with its own doc-set, sharing one substrate. | Capabilities mature at different rates; a shared decode spine avoids duplication. |
| `SN-DRW-04` | No module may compromise the **zero-runtime-dependency** guarantee of the published `kymostudio` (`packages/js`) package — nor, per `SN-DRW-02`, add a third-party **dev** dependency for `.drawio` interop. | `packages/js` is intentionally dependency-free end-to-end; the interop modules must not reintroduce a dependency by any path. |

## 2. Functional requirements (family)

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

## 3. Non-functional requirements (family)

- **NFR-DRW-1** **Zero-dep, end-to-end.** The published `kymostudio` runtime `dependencies` SHALL stay
  empty across all modules **and** no `drawio` module SHALL introduce a third-party npm dependency
  (runtime *or* dev) for interop — Node built-ins only (FR-DRW-4).
- **NFR-DRW-2** **Pure-Node.** Family capabilities SHALL run headless on macOS/Linux/CI with Node only.
- **NFR-DRW-3** **Additive.** Adding any module SHALL NOT change existing kymo render/import paths;
  the golden-SVG and BPMN-corpus baselines SHALL be unchanged.
- **NFR-DRW-4** **Determinism.** For a given input and options, each module's output SHALL be
  deterministic.

## 4. Constraints, assumptions, out-of-scope

- **Best-effort fidelity, not desktop parity** — an own SVG emitter approximates draw.io (custom
  stencils, text wrapping/metrics); this fidelity trade-off is the **deliberate cost** of the
  zero-dependency goal, and the desktop CLI remains the full-fidelity escape hatch (see
  `FEAT-DRAWIO-SVG-001` §4).
- **JS-only family.** These are Node-built-in-only utilities living under `packages/js`; the core kymo
  two-implementation (Python/JS) parity norm does **not** apply.
- **Out-of-scope (umbrella):** authoring `.drawio` in the DSL; an in-browser draw.io editor.

## 5. Module roadmap (which module realises what)

| Module | Realises (family FR) | Status |
|--------|----------------------|--------|
| `drawio-svg` (`FEAT-DRAWIO-SVG-001`) | FR-DRW-1, FR-DRW-2 (defines the decode substrate), FR-DRW-3, FR-DRW-4 | **As-is code uses mxGraph/jsdom/pako — non-conformant to `SN-DRW-02`; zero-dep redesign pending** |
| `drawio-import` | FR-DRW-1, FR-DRW-2 (reuse decode), FR-DRW-3 | Proposed |
| `drawio-raster` | FR-DRW-1, FR-DRW-3 (consumes `drawio-svg` output) | Proposed |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella SRS: `SN-DRW-01..04`, `FR-DRW-1..4`, `NFR-DRW-1..4`; module roadmap (drawio-svg delivered; import/raster proposed). |
| 0.2     | 2026-06-03 | Vũ Anh | **Direction change to zero-dependency.** Reversed `SN-DRW-02` (was "use real mxGraph engine" → now "self-contained, dependency-free, Node built-ins only"); reworded `FR-DRW-2`/`FR-DRW-4`/`NFR-DRW-1` (decode via `Buffer`/`node:zlib`; own SVG emitter; no third-party dep, runtime *or* dev); `SN-DRW-04` widened to dev deps. `drawio-svg` reclassified to *non-conformant as-is (mxGraph); redesign pending*. |

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
