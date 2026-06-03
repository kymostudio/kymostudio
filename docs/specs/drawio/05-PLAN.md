---
title: draw.io Interoperability — Plan (umbrella)
document_id: PLAN-DRAWIO-001
version: "0.2"
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
  - PLAN-DRAWIO-SVG-001     # module: drawio-svg plan (as-is; zero-dep redesign pending)
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
| Version      | 0.2                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-001, FEAT-DRAWIO-001, DESIGN-DRAWIO-001, TEST-DRAWIO-001, PLAN-DRAWIO-SVG-001 |

Concept: INTRO-DRAWIO-001. Requirements (family FR/NFR): FEAT-DRAWIO-001. Design:
DESIGN-DRAWIO-001. Verification: TEST-DRAWIO-001.

## 1. Scope and approach

Deliver kymo's **draw.io interoperability** as a **family of modules** over one shared **dependency-free
decode substrate** (own XML scan; `Buffer` base64; `node:zlib` raw-inflate), all **pure-Node** and all
**zero-dependency** (no third-party npm dep, runtime *or* dev). Modules ship independently; rendering
modules add their own SVG emitter. This plan covers family scope, sequencing, and risks; per-module
sequencing lives in each module's plan (e.g. `PLAN-DRAWIO-SVG-001`).

> **Direction note (v0.2).** Goal changed to **zero npm dependency** (`SN-DRW-02` reversed). The
> `drawio-svg` *current code* (mxGraph/jsdom/pako) is the **as-is gap**; its redesign to Node built-ins
> is now the family's nearest-term work (§3).

## 2. Design

The family architecture — dependency-free decode substrate + module plug-in model + isolation — is in
**DESIGN-DRAWIO-001**; substrate detail (decode via Node built-ins) and the documented as-is gap are in
`DESIGN-DRAWIO-SVG-001`.

## 3. Module roadmap (delivery)

| Module | Capability | Realises | Status |
|--------|------------|----------|--------|
| **`drawio-svg`** | `.drawio` → SVG — **defines the decode substrate** | FR-DRW-1..4 | **As-is code (mxGraph/jsdom/pako); zero-dep redesign pending** (`PLAN-DRAWIO-SVG-001`) |
| `drawio-import` | `.drawio` → kymo `Diagram`/model (mxCell→`Component`/`Edge`, à la `from-bpmn`) | FR-DRW-1, FR-DRW-2, FR-DRW-3 | Proposed |
| `drawio-raster` | `.drawio` → PNG/WebP (rasterise the `drawio-svg` output via Node built-ins / `to_webp.py`) | FR-DRW-1, FR-DRW-3 | Proposed |

Sequencing: the nearest-term work is the **`drawio-svg` zero-dependency redesign** — replace
mxGraph/jsdom/pako with a Node-built-in decoder + an own SVG emitter, which also pins down the shared
decode substrate. `drawio-import` is the next highest-value module (reuses the dependency-free decoder,
no SVG emitter needed) and can then proceed independently; `drawio-raster` depends on `drawio-svg`'s
SVG output and is the lightest increment.

## 4. Risks and mitigations

- **Renderer fidelity vs zero-dep** — the central trade-off: an own SVG emitter (no mxGraph) will not
  match draw.io's renderer. Mitigation: scope `drawio-svg` to **best-effort** fidelity; document limits
  per module; keep the desktop CLI as the full-fidelity escape hatch. This is an accepted cost of
  `SN-DRW-02`, not a defect.
- **As-is gap until redesign** — the current `drawio-svg` code violates `SN-DRW-02`/`TC-DRW-3` (uses
  `mxgraph`/`jsdom`/`pako` dev deps). Mitigation: tracked openly as the gap; redesign raised under the
  `drawio-svg` `CR/`; until it lands the module is **non-conformant**, not "delivered".
- **Zero-dep leakage (NFR-DRW-1)** — the family-wide failure mode now includes **dev** deps.
  Mitigation: Node built-ins only + build/eslint exclude + `files: ["dist/"]`; gate with `TC-DRW-3`.
- **Decode-substrate stability** — modules depend on the shared decoder. Mitigation: it is small,
  dependency-free, and gated by `drawio-svg`'s suite; changes re-run all module suites.

## 5. Verification

Family invariants (`TC-DRW-1..5`) and the roll-up traceability are in TEST-DRAWIO-001; each module maps
its own suite to them.

## 6. Estimate (indicative)

Relative complexity in **story points** (Fibonacci):

| Module | Points (indicative) |
|--------|---------------------|
| `drawio-svg` — dependency-free decoder + **own SVG emitter** (replaces mxGraph/jsdom/pako) | 13 *(redesign; the emitter is the heavy lift)* |
| `drawio-import` — decode reuse + mxCell→model mapping | 8 |
| `drawio-raster` — rasterise SVG | 3 |
| **Total (proposed remaining)** | **~24** |

> Decode is cheap and genuinely dependency-free (Node built-ins). The cost is the **own SVG emitter**:
> re-deriving draw.io shape/edge/label rendering without mxGraph — hence the bump from the earlier
> mxGraph-based "8 (done)" to a best-effort redesign.

## 7. Change requests

Family-scope changes and new modules are raised under the affected layer: a new capability becomes a
**module** under `modules/<name>/` (with its own `CR/`); umbrella-doc edits follow Annex B.3. The
`drawio-svg` module's **zero-dependency redesign** is raised under its own `CR/`; `drawio-import` /
`drawio-raster` are registered as **Proposed** in the `INTRO-DRAWIO-001` §3 registry.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-03 | Vũ Anh | Initial umbrella plan: scope/approach, module roadmap (drawio-svg delivered; import/raster proposed), risks, indicative estimate. |
| 0.2     | 2026-06-03 | Vũ Anh | **Zero-dependency direction.** Reframed scope/approach to a dependency-free decode substrate + own emitters; reclassified `drawio-svg` from *delivered* to *as-is gap / redesign pending*; reworked risks around the fidelity-vs-zero-dep trade-off; bumped the `drawio-svg` estimate (own SVG emitter). |

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
| 2026-06-03 | family | **Direction change to zero npm dependency** (`SN-DRW-02` reversed): own decoder via Node built-ins + own SVG emitter; no `mxgraph`/`jsdom`/`pako`. | Umbrella docs revised to v0.2; `drawio-svg` reclassified to *as-is gap / redesign pending*. |
| 2026-06-03 | — (umbrella) | Authored the umbrella doc-set (`01-INTRO`..`05-PLAN`, token `DRAWIO`, IDs `SN-DRW`/`FR-DRW`/`NFR-DRW`/`TC-DRW`); registered `drawio-import` + `drawio-raster` as Proposed. | **Drafted** — family framed; one module delivered. |
