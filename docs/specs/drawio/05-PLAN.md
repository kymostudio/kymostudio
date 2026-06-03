---
title: draw.io Interoperability — Plan (umbrella)
document_id: PLAN-DRAWIO-001
version: "0.1"
issue_date: 2026-06-03
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers planning/maintaining the drawio family
review_cycle: On a module being added/delivered, or on family-scope change
supersedes: null
related_documents:
  - INTRO-DRAWIO-001        # Introduction (umbrella)
  - FEAT-DRAWIO-001         # Requirements (umbrella)
  - DESIGN-DRAWIO-001       # Design (umbrella)
  - TEST-DRAWIO-001         # Test documentation (umbrella)
  - PLAN-DRAWIO-SVG-001     # module: drawio-svg plan (delivered)
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - plan
  - roadmap
  - modules
  - umbrella
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# draw.io Interoperability — Plan (umbrella)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-DRAWIO-001                                    |
| Version      | 0.1                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-001, FEAT-DRAWIO-001, DESIGN-DRAWIO-001, TEST-DRAWIO-001, PLAN-DRAWIO-SVG-001 |

Concept: INTRO-DRAWIO-001. Requirements (family FR/NFR): FEAT-DRAWIO-001. Design:
DESIGN-DRAWIO-001. Verification: TEST-DRAWIO-001.

## 1. Scope and approach

Deliver kymo's **draw.io interoperability** as a **family of modules** over one shared substrate
(wrapper decode + mxGraph-on-jsdom), all **pure-Node** and all keeping the published `kymostudio`
package **zero-runtime-dependency**. Modules ship independently; the substrate is established once
(by `drawio-svg`) and reused. This plan covers family scope, sequencing, and risks; per-module
sequencing lives in each module's plan (e.g. `PLAN-DRAWIO-SVG-001`).

## 2. Design

The family architecture — shared substrate + module plug-in model + isolation — is in
**DESIGN-DRAWIO-001**; substrate detail (decode, the four engine-on-jsdom gotchas) is in
`DESIGN-DRAWIO-SVG-001`.

## 3. Module roadmap (delivery)

| Module | Capability | Realises | Status |
|--------|------------|----------|--------|
| **`drawio-svg`** | `.drawio` → SVG (mxGraph on jsdom) — **establishes the substrate** | FR-DRW-1..4 | **Delivered** (baselined; `PLAN-DRAWIO-SVG-001`) |
| `drawio-import` | `.drawio` → kymo `Diagram`/model (mxCell→`Component`/`Edge`, à la `from-bpmn`) | FR-DRW-1, FR-DRW-2, FR-DRW-3 | Proposed |
| `drawio-raster` | `.drawio` → PNG/WebP (rasterise the `drawio-svg` output via resvg/rsvg) | FR-DRW-1, FR-DRW-3 | Proposed |

Sequencing: `drawio-svg` is **done** and owns the substrate; `drawio-import` is the highest-value next
module (reuses the decoder, no SVG export needed) and can proceed independently; `drawio-raster`
depends on `drawio-svg`'s SVG output and is the lightest increment.

## 4. Risks and mitigations

- **Substrate stability** — modules depend on the shared decode/engine. Mitigation: the substrate is
  exercised and gated by `drawio-svg`'s suite; changes to it re-run all module suites.
- **Zero-dep leakage (NFR-DRW-1)** — the family-wide failure mode. Mitigation: dev-only deps +
  build/eslint exclude + `files: ["dist/"]`; gate with `TC-DRW-3`.
- **Upstream `mxgraph` archived** — unmaintained. Mitigation: pinned dev-only; contained to
  `packages/js`'s dev tree; a future module needing more could revisit `maxGraph` (the TS successor).
- **Fidelity expectations** — renderers are best-effort vs the desktop app; documented per module, with
  the desktop CLI as the full-fidelity escape hatch.

## 5. Verification

Family invariants (`TC-DRW-1..5`) and the roll-up traceability are in TEST-DRAWIO-001; each module maps
its own suite to them.

## 6. Estimate (indicative)

Relative complexity in **story points** (Fibonacci):

| Module | Points (indicative) |
|--------|---------------------|
| `drawio-svg` — substrate + SVG export | 8 *(done)* |
| `drawio-import` — decode reuse + mxCell→model mapping | 8 |
| `drawio-raster` — rasterise SVG | 3 |
| **Total (proposed remaining)** | **~11** |

## 7. Change requests

Family-scope changes and new modules are raised under the affected layer: a new capability becomes a
**module** under `modules/<name>/` (with its own `CR/`); umbrella-doc edits follow Annex B.3. The
`drawio-svg` module is delivered; `drawio-import` / `drawio-raster` are registered as **Proposed** in
the `INTRO-DRAWIO-001` §3 registry.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella plan: scope/approach, module roadmap (drawio-svg delivered; import/raster proposed), risks, indicative estimate. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/05-PLAN.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family; available to all repository readers.

### B.3 Change Control
On a module being delivered or family-scope change: update the affected clause + the §3 roadmap and the
`INTRO-DRAWIO-001` registry; keep family FR/NFR + the TEST traceability consistent; increment
`version`; append a row to Annex A (document edits) and Annex C (the family worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-DRAWIO-001, DESIGN-DRAWIO-001, and each module's
doc-set. Reconcile any deviation there before release.

## Annex C — Worklog

**Table C.1 — Family worklog.** Per-module milestones as they happen — distinct from Annex A.
Newest at the bottom; dates ISO 8601.

| Date       | Module | Work | Outcome |
|------------|--------|------|---------|
| 2026-06-03 | `drawio-svg` | Built and baselined the `.drawio` → SVG module (mxGraph-on-jsdom), establishing the family substrate (wrapper decode + engine boot). | **Delivered** (`PLAN-DRAWIO-SVG-001`). |
| 2026-06-03 | — (umbrella) | Authored the umbrella doc-set (`01-INTRO`..`05-PLAN`, token `DRAWIO`, IDs `SN-DRW`/`FR-DRW`/`NFR-DRW`/`TC-DRW`); registered `drawio-import` + `drawio-raster` as Proposed. | **Drafted** — family framed; one module delivered. |
