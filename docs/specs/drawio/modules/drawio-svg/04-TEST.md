---
title: drawio → SVG — Test Documentation
document_id: TEST-DRAWIO-SVG-001
version: "1.2"
issue_date: 2026-06-03
status: Under revision
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the drawio2svg utility
review_cycle: On CR completion, or on engine/dependency change
supersedes: null
related_documents:
  - INTRO-DRAWIO-SVG-001    # Introduction
  - FEAT-DRAWIO-SVG-001     # Requirements (traced below)
  - DESIGN-DRAWIO-SVG-001   # Design
  - PLAN-DRAWIO-SVG-001     # Plan
  - REF-DRAWIO-001          # draw.io / mxGraph reference
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - zero-dependency
  - svg
  - test
  - verification
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# drawio → SVG — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-DRAWIO-SVG-001                                |
| Version      | 1.2                                                |
| Status       | Under revision                                     |
| Issue Date   | 2026-06-03                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-DRAWIO-SVG-001, FEAT-DRAWIO-SVG-001, DESIGN-DRAWIO-SVG-001, PLAN-DRAWIO-SVG-001 |

Verifies FEAT-DRAWIO-SVG-001 (FR/NFR IDs). Covers 12207 Verification & Validation. Headline checks
(v1.2 target): **wrapper decode** (multi-page + compressed, via `node:zlib`), **own-emitter render**,
**valid SVG**, and **zero dependency** (no third-party npm dep, runtime *or* dev).

> **Direction note (v1.2).** These cases state the **zero-dependency target**. The as-is code still
> uses `mxGraph`/`jsdom`/`pako`, so today `TC-DS-2` (decode lib), `TC-DS-3` (render path) and `TC-DS-6`
> (zero-dep) describe what the **redesign** (`CR-DRAWIO-SVG-003`) must satisfy; the as-is code passes
> them only under the old engine-based wording, which is now retired.

## 1. Test approach and levels

- **Unit** — `parseDrawioPages` (multi-page enumeration, names); `inflateDiagram` (compressed body →
  `<mxGraphModel>`); plain-body passthrough (no decompress branch); `registerStencils` (a `<shapes>`
  set registers its shapes; a malformed file is skipped, not fatal).
- **Integration** — `modelXmlToSvg` over a decoded page (cells decode, `view.validate` builds states,
  bounds non-empty, geometry emitted); the CLI writes one `<prefix>-<page>.svg` per page.
- **Output validity** — the SVG parses in a strict reader (`rsvg-convert`), i.e. single SVG root, no
  duplicate `xmlns`.
- **Zero dependency (key)** — `packages/js` build/typecheck/lint **exclude** the tool; **no** third-party
  npm dependency is declared for it (runtime *or* dev) — `mxgraph`/`jsdom`/`pako` absent from both
  `dependencies` and `devDependencies`; only Node built-ins are imported.

## 2. Test items, environment, tooling

The tool at `packages/js/src/drawio2svg/` (deps resolved from `packages/js/node_modules`); Node ≥21; `rsvg-convert` (librsvg)
for the raster/validity check; the committed sample `out/bpmn-2-example.drawio` (2 pages, compressed),
plus a small inline **plain** `<mxGraphModel>` fixture and a minimal stencil XML.

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-DS-1** | Parse pages | FR-DS-1 | A multi-page `<mxfile>` enumerates the expected pages with their names; a bare `<mxGraphModel>` → exactly one page |
| **TC-DS-2** | Decompression (Node built-ins) | FR-DS-1 | A compressed `<diagram>` body inflates via `Buffer` + **`node:zlib` `inflateRawSync`** + URI-decode to a `<mxGraphModel>` with real cells; a plain body passes through unchanged; **no `pako`** import |
| **TC-DS-3** | Render via own emitter | FR-DS-2 | A decoded page renders to SVG with non-trivial geometry (rects/paths/text/ellipses) using the **own SVG emitter**, built **without** the desktop binary, a browser, or **mxGraph/jsdom** |
| **TC-DS-4** | CLI per-page output | FR-DS-3 | `node index.mjs <input> <prefix>` writes one `<prefix>-<page>.svg` per page; library `drawioToSvg`/`drawioToSvgPages`/`parseDrawioPages` return the documented shapes |
| **TC-DS-5** | Valid SVG | FR-DS-2, NFR-DS-5 | Output rasterises under `rsvg-convert` (no duplicate `xmlns`; single SVG root; sane `width`/`height`/`viewBox`) |
| **TC-DS-6** | Zero dependency (end-to-end) | FR-DS-5, NFR-DS-1 | `mxgraph`/`jsdom`/`pako` (and any third-party package) are **absent** from **both** `packages/js` `dependencies` **and** `devDependencies`; the tool imports **only Node built-ins**; runtime `dependencies` stays empty; `tsconfig` excludes `src/drawio2svg`; eslint ignores it; only `dist/` is published |
| **TC-DS-7** | Shape coverage best-effort | FR-DS-4, NFR-DS-4 | A common built-in shape renders correctly; an unmodelled custom shape still renders (approximation/empty fallback) and does **not** crash |
| **TC-DS-8** | Determinism | NFR-DS-3 | The same input + options yields byte-identical SVG across runs |
| **TC-DS-9** | Pure-Node, built-ins only | NFR-DS-2 | Conversion runs headless (no GUI/browser) importing only Node built-ins (`node:fs`/`node:path`/`node:zlib`/`Buffer`) |

## 4. Pass/fail criteria

The feature passes when TC-DS-1..TC-DS-9 pass. **Any** appearance of `mxgraph`/`jsdom`/`pako` (or any
third-party package) in `packages/js`'s dependency tree — **runtime or dev** — or any
duplicate-`xmlns`/parse failure of the emitted SVG, is a **failure**. Fidelity gaps that are
**documented** (approximate text metrics; unmodelled custom shapes → approximations/empty) are
**expected**, not failures (NFR-DS-4).

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-DS-1 | TC-DS-1, TC-DS-2 |
| FR-DS-2 | TC-DS-3, TC-DS-5 |
| FR-DS-3 | TC-DS-4 |
| FR-DS-4 | TC-DS-7 |
| FR-DS-5 | TC-DS-6 |
| NFR-DS-1 | TC-DS-6 |
| NFR-DS-2 | TC-DS-9 |
| NFR-DS-3 | TC-DS-8 |
| NFR-DS-4 | TC-DS-7 |
| NFR-DS-5 | TC-DS-5 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built test set (`TC-DS-1..9`) + traceability; isolation/valid-SVG headline. |
| 1.1     | 2026-06-03 | Vũ Anh | `TC-DS-6` updated: deps asserted in `packages/js` **devDependencies** (not runtime); no nested `package.json`. |
| 1.2     | 2026-06-03 | Vũ Anh | **Zero-dependency target.** `TC-DS-2` decode → `node:zlib` (no pako); `TC-DS-3` render → **own emitter** (no mxGraph/jsdom); `TC-DS-6` → **no third-party dep, runtime or dev**; `TC-DS-7`/`TC-DS-9` reworded off stencils/jsdom. These now gate `CR-DRAWIO-SVG-003`. Status → *Under revision*. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/modules/drawio-svg/04-TEST.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the traceability matrix in the same
revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used) so traceability links
remain valid.
