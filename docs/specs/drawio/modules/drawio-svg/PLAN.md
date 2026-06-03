---
title: drawio → SVG — Plan
document_id: PLAN-DRAWIO-SVG-001
version: "1.1"
issue_date: 2026-06-03
status: Baselined
classification: Internal
owner: diagrams/ project
audience: Engineers implementing/maintaining the drawio2svg utility
review_cycle: On CR completion
supersedes: null
related_documents:
  - INTRO-DRAWIO-SVG-001    # Introduction
  - FEAT-DRAWIO-SVG-001     # Requirements
  - DESIGN-DRAWIO-SVG-001   # Design
  - TEST-DRAWIO-SVG-001     # Test documentation
  - REF-DRAWIO-001          # draw.io / mxGraph reference
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - mxgraph
  - svg
  - plan
  - change-requests
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# drawio → SVG — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-DRAWIO-SVG-001                                |
| Version      | 1.1                                                |
| Status       | Baselined                                          |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-SVG-001, FEAT-DRAWIO-SVG-001, DESIGN-DRAWIO-SVG-001, TEST-DRAWIO-SVG-001 |

Concept: INTRO-DRAWIO-SVG-001. Requirements (FR/NFR): FEAT-DRAWIO-SVG-001. Design:
DESIGN-DRAWIO-SVG-001. Verification: TEST-DRAWIO-SVG-001.

## 1. Scope and approach

Deliver a **pure-Node `.drawio → SVG`** converter running the **mxGraph engine on jsdom** — no draw.io
desktop app, no headless browser. The headline disciplines are **fidelity-via-the-real-engine** (use
mxGraph, not a re-implementation) and **isolation** (the published `kymostudio` package stays
zero-runtime-dependency). The baseline is **as-built** (already implemented at
`packages/js/src/drawio2svg/`); this plan records scope, sequencing, risks, and the worklog.

## 2. Design

The pipeline (decode → render → serialise, per page), the four engine-on-jsdom gotchas
(`navigator` shim, classes-on-`window`, `location`/metric stubs, single `xmlns`), the stencil loader,
and the isolation mechanism are specified in **DESIGN-DRAWIO-SVG-001**. This plan covers only scope,
sequencing, and risks.

## 3. Delivery increments (change-requests)

The baseline (`-001`) is the as-built tool. Later changes are raised as change-requests under `CR/`
(logged in `CR/README.md`); CR folders start at `CR-002`.

| CR | Increment | Realises | Status |
|----|-----------|----------|--------|
| — (`-001`) | **As-built**: wrapper decode (multi-page + compressed) + mxGraph-on-jsdom SVG export + library/CLI + stencil loader + isolation | FR-DS-1..FR-DS-5; NFR-DS-1..NFR-DS-5 | **Baselined** (implemented) |
| `CR-DRAWIO-SVG-002` (`CR-002/`) | **Bundled BPMN/AWS stencils** — vendor draw.io stencil XML into `stencils/` so event/marker glyphs render | FR-DS-4 | Proposed |

## 4. Risks and mitigations

- **Engine assumes a browser (NFR-DS-2)** — mxGraph reads `navigator`/`window`/`location` and SVG
  metrics. Mitigation: the four as-built shims in DESIGN §3; pin behaviour with TC-DS-9.
- **Zero-dep leakage (NFR-DS-1)** — the worst failure mode is `mxgraph`/`jsdom`/`pako` reaching the
  published package. Mitigation: `tsconfig` `exclude` + eslint `ignores` + `files: ["dist/"]`; gate
  with TC-DS-6.
- **Fidelity gaps** — jsdom approximates text metrics; unregistered custom stencils render empty.
  Mitigation: document both in the tool README and NFR-DS-4; point to the desktop CLI for
  full-fidelity output; CR-002 narrows the stencil gap.
- **Upstream `mxgraph` archived** — the npm package is unmaintained. Mitigation: it is pinned as a
  `packages/js` **devDependency** and kept out of the published runtime `dependencies`; risk is
  contained.
- **Output validity (NFR-DS-5)** — duplicate `xmlns` once broke librsvg. Mitigation: build the root
  via `createElementNS` only; gate with TC-DS-5.

## 5. Verification

Approach, levels, cases (TC-DS-1..TC-DS-9), and the requirements-traceability matrix are specified in
TEST-DRAWIO-SVG-001. Each CR maps its CR-local cases back to these.

## 6. Estimate (indicative)

Relative complexity in **story points** (Fibonacci); the baseline is delivered.

| Increment | Points (indicative) |
|-----------|---------------------|
| `-001` — as-built converter (decode + mxGraph-on-jsdom export + library/CLI + stencils + isolation) | 8 *(done)* |
| CR-002 — bundled BPMN/AWS stencils | 3 |
| **Total** | **~11** |

## 7. Change requests

Later changes to the baselined spec (`docs/specs/drawio/modules/drawio-svg/`) are raised, assessed, and logged in
`CR/` (raise → assess → approve → implement → re-baseline). `CR-DRAWIO-SVG-002` (bundled stencils) is
registered as **Proposed**.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built plan: scope/approach, baseline + CR-002, risks, indicative estimate, change-request register. |
| 1.1     | 2026-06-03 | Vũ Anh | Recorded the dep-host move (nested `package.json` → `packages/js` devDependencies) in §4 risk + Annex C worklog. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/modules/drawio-svg/PLAN.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On CR completion or scope change: update the affected clause + CR row; keep requirement IDs and the
TEST traceability matrix consistent; increment `version`; append a row to Annex A (document edits) and
Annex C (the increment's implementation worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-DRAWIO-SVG-001 and DESIGN-DRAWIO-SVG-001.
Reconcile any deviation there before release.

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-increment work as it happens — distinct from Annex A,
which records edits to *this document*. Newest entries at the bottom; dates ISO 8601.

| Date       | Increment | Work | Outcome / artifacts |
|------------|-----------|------|---------------------|
| 2026-06-03 | `-001` (as-built) | Built `drawio2svg` (`packages/js/src/drawio2svg/`): wrapper decode (multi-page + deflate/base64 via `pako`), mxGraph-on-jsdom SVG export (`mxCodec` → `mxImageExport`/`mxSvgCanvas2D`), library API + CLI, stencil loader. Solved the four engine-on-jsdom gotchas (navigator shim; classes-on-`window`; `location`/`getBBox` stubs; single `xmlns`). Isolated from the published package via `tsconfig` exclude + eslint ignore + `files: ["dist/"]`. Verified on `out/bpmn-2-example.drawio` (2 pages) — both rasterise under `rsvg-convert`. | **Delivered** — tool runs; SVG valid; `kymostudio` stays zero-dep. |
| 2026-06-03 | — (doc set) | Authored the as-built baseline doc set (`00-PRODUCT`..`04-TEST` + `PLAN` + `CR/`); token `DRAWIO-SVG`, item IDs `SN-DS`/`FR-DS`/`NFR-DS`/`TC-DS`. Registered `CR-DRAWIO-SVG-002` (bundled stencils) as Proposed. | **Baselined** — spec documents shipped code. |
| 2026-06-03 | `-001` (maint.) | Removed the nested `src/drawio2svg/package.json` + `package-lock.json` + `node_modules`; moved `mxgraph`/`jsdom`/`pako` to `packages/js` **devDependencies**; `index.mjs` now resolves the mxgraph base path via `require.resolve`. Re-baselined the doc set to v1.1 (PROD/INTRO/FEAT/DESIGN/TEST). Verified: tool still renders the 2-page sample; `kymostudio` runtime `dependencies` stays empty. | **Done** — published package still zero-runtime-dep. |
