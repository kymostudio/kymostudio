---
title: drawio → SVG — Plan
document_id: PLAN-DRAWIO-SVG-001
version: "1.2"
issue_date: 2026-06-03
status: Under revision
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
  - zero-dependency
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
| Version      | 1.2                                                |
| Status       | Under revision                                     |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-SVG-001, FEAT-DRAWIO-SVG-001, DESIGN-DRAWIO-SVG-001, TEST-DRAWIO-SVG-001 |

Concept: INTRO-DRAWIO-SVG-001. Requirements (FR/NFR): FEAT-DRAWIO-SVG-001. Design:
DESIGN-DRAWIO-SVG-001. Verification: TEST-DRAWIO-SVG-001.

## 1. Scope and approach

Deliver a **pure-Node, zero-dependency `.drawio → SVG`** converter — own decoder (Node built-ins) +
**own SVG emitter** — no draw.io desktop app, no headless browser, and **no third-party npm dependency**
(`mxgraph`/`jsdom`/`pako`). The headline disciplines are **zero dependency** (`SN-DRW-02`) and
**best-effort fidelity** (the deliberate cost; desktop CLI is the escape hatch). The shipped code at
`packages/js/src/drawio2svg/` is the **as-is gap** (engine-based); this plan records scope, the
redesign sequencing, risks, and the worklog.

> **Direction note (v1.2).** Goal changed to zero npm dependency. The as-built `-001` (mxGraph/jsdom/
> pako) is **superseded** as the target and retained as a reference; the redesign is `CR-DRAWIO-SVG-003`.

## 2. Design

The **as-is** pipeline (decode → mxGraph-on-jsdom render → serialise) and its four engine gotchas are
in **DESIGN-DRAWIO-SVG-001** (now flagged as documenting the gap). The **target** design — own
`node:zlib` decode + own SVG emitter — is authored in **`CR-DRAWIO-SVG-003`**. This plan covers scope,
sequencing, and risks.

## 3. Delivery increments (change-requests)

The baseline (`-001`) is the as-built tool. Later changes are raised as change-requests under `CR/`
(logged in `CR/README.md`); CR folders start at `CR-002`.

| CR | Increment | Realises | Status |
|----|-----------|----------|--------|
| — (`-001`) | **As-is** (engine-based, non-conformant to v1.2): wrapper decode (`pako`) + mxGraph-on-jsdom SVG export + library/CLI + stencil loader | (was FR-DS-1..5) | **Superseded** — reference only |
| `CR-DRAWIO-SVG-003` (`CR-003/`) | **Zero-dependency rewrite** — `node:zlib` decode + **own SVG emitter**; remove `mxgraph`/`jsdom`/`pako` | FR-DS-1, FR-DS-2, FR-DS-4, FR-DS-5; NFR-DS-1..5 | **Proposed** (the redesign) |
| `CR-DRAWIO-SVG-002` (`CR-002/`) | **Bundled BPMN/AWS stencils** — custom-shape fidelity, re-scoped onto the own emitter (after CR-003) | FR-DS-4 | Proposed |

## 4. Risks and mitigations

- **Own-emitter fidelity (the central trade-off)** — re-deriving draw.io shape/edge/text rendering
  without mxGraph will not match the desktop renderer. Mitigation: scope to **best-effort** (FR-DS-4,
  NFR-DS-4); cover common built-in shapes first; document limits; desktop CLI for full fidelity.
- **Emitter effort/scope (CR-003)** — the own SVG emitter is the heavy lift. Mitigation: stage it
  (decode swap to `node:zlib` first — cheap; then rects/edges/labels; then richer styles); ship
  incrementally behind the same API.
- **Zero-dep leakage (NFR-DS-1)** — now includes **dev** deps. Mitigation: import only Node built-ins;
  `tsconfig` `exclude` + eslint `ignores` + `files: ["dist/"]`; gate with TC-DS-6 (asserts absence from
  both `dependencies` and `devDependencies`).
- **As-is gap until CR-003 lands** — current code violates `SN-DS-02`/TC-DS-6. Mitigation: tracked
  openly; module is **non-conformant**, not "delivered", until the rewrite ships.
- **Output validity (NFR-DS-5)** — duplicate `xmlns` once broke librsvg. Mitigation: emit a single
  `xmlns` on the root; gate with TC-DS-5.

## 5. Verification

Approach, levels, cases (TC-DS-1..TC-DS-9), and the requirements-traceability matrix are specified in
TEST-DRAWIO-SVG-001. Each CR maps its CR-local cases back to these.

## 6. Estimate (indicative)

Relative complexity in **story points** (Fibonacci); the baseline is delivered.

| Increment | Points (indicative) |
|-----------|---------------------|
| `-001` — as-is engine-based converter | 8 *(done; superseded)* |
| `CR-003` — zero-dependency rewrite (`node:zlib` decode + **own SVG emitter**) | 13 *(emitter is the heavy lift)* |
| CR-002 — bundled BPMN/AWS stencils (on the own emitter) | 3 |
| **Total (remaining)** | **~16** |

## 7. Change requests

Later changes to the spec (`docs/specs/drawio/modules/drawio-svg/`) are raised, assessed, and logged in
`CR/` (raise → assess → approve → implement → re-baseline). `CR-DRAWIO-SVG-003` (zero-dependency
rewrite — the redesign) and `CR-DRAWIO-SVG-002` (bundled stencils) are registered as **Proposed**.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built plan: scope/approach, baseline + CR-002, risks, indicative estimate, change-request register. |
| 1.1     | 2026-06-03 | Vũ Anh | Recorded the dep-host move (nested `package.json` → `packages/js` devDependencies) in §4 risk + Annex C worklog. |
| 1.2     | 2026-06-03 | Vũ Anh | **Direction change to zero npm dependency** (`SN-DRW-02`). Reframed §1/§2; marked `-001` superseded; added `CR-DRAWIO-SVG-003` (the rewrite); reworked risks around the own-emitter trade-off; bumped estimate (own SVG emitter). Status → *Under revision*. |

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
| 2026-06-03 | doc set (v1.2) | **Direction change to zero npm dependency** (family `SN-DRW-02` reversed). Revised the spec set to the target (own `node:zlib` decode + own SVG emitter; no `mxgraph`/`jsdom`/`pako`, runtime *or* dev); reversed `SN-DS-02`; flagged the shipped engine-based code as the **as-is gap**; registered `CR-DRAWIO-SVG-003` (the rewrite). **No code change** in this revision. | Spec retargeted; module reclassified *Under revision*; code rewrite pending CR-003. |
