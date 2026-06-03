---
title: drawio → SVG — Introduction
document_id: INTRO-DRAWIO-SVG-001
version: "1.2"
issue_date: 2026-06-03
status: Under revision
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of the drawio2svg utility and the kymo JS package
review_cycle: On CR completion, or on engine/dependency change
supersedes: null
related_documents:
  - PROD-DRAWIO-SVG-001     # Product description (ConOps & stakeholder needs)
  - FEAT-DRAWIO-SVG-001     # Requirements
  - DESIGN-DRAWIO-SVG-001   # Design
  - TEST-DRAWIO-SVG-001     # Test documentation
  - PLAN-DRAWIO-SVG-001     # Plan
  - REF-DRAWIO-001          # draw.io / mxGraph reference (mxGraph XML format; engine)
  - REF-DRAWIO-CMP-001      # draw.io ↔ kymo comparison
  - BPMN-MAP-001            # BPMN element mapping (the sample corpus is BPMN)
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - zero-dependency
  - node-builtins
  - svg
  - pure-node
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# drawio → SVG — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-DRAWIO-SVG-001                                        |
| Version      | 1.2                                                         |
| Status       | Under revision                                             |
| Issue Date   | 2026-06-03                                                 |
| Owner        | `diagrams/` project                                         |
| Related      | PROD-DRAWIO-SVG-001, FEAT-DRAWIO-SVG-001, DESIGN-DRAWIO-SVG-001, TEST-DRAWIO-SVG-001, PLAN-DRAWIO-SVG-001, REF-DRAWIO-001 |

## 1. Purpose and scope

This document introduces the **drawio → SVG** feature and is the entry point to its document set. It
states the problem, the concept, and the terminology, and maps the reader to the product description
(PROD-DRAWIO-SVG-001), the requirements (FEAT-DRAWIO-SVG-001), the design (DESIGN-DRAWIO-SVG-001), the
test documentation (TEST-DRAWIO-SVG-001), and the plan (PLAN-DRAWIO-SVG-001). The set conforms to
ISO/IEC/IEEE 12207:2017 and ISO/IEC/IEEE 15289:2019.

> **Direction note (v1.2).** The goal is now **converting `.drawio` → SVG with zero npm dependencies**
> (own decoder via Node built-ins + own SVG emitter), per the family target (`SN-DRW-02`). The shipped
> `drawio2svg` code (`packages/js/src/drawio2svg/`) still uses **mxGraph + jsdom + pako** — that is the
> **as-is gap**, retained as a reference pending the zero-dependency rewrite (`CR-DRAWIO-SVG-003`). The
> mxGraph-on-jsdom material below describes the *current code* (the gap), not the target.

The original feature is **already implemented** (the `drawio2svg` tool, `packages/js/src/drawio2svg/`);
the v1.0/1.1 set was its **as-built baseline**, now superseded as the target by the zero-dependency
redesign. Changes are raised as change-requests (`CR/`) — see §6 and PLAN-DRAWIO-SVG-001 §7.

## 2. Background

draw.io's render engine is **mxGraph**, which manipulates a live SVG DOM and reads browser text
metrics. The public `jgraph/mxgraph` npm/repo was **archived in 2020**; the engine is now **vendored
inside the draw.io source** (`src/main/webapp/mxgraph/`, ~133 client JS files), and the community
successor **maxGraph** is a separate TypeScript project draw.io does **not** use. Existing
`.drawio → image` paths either run the **draw.io desktop binary** or drive a **headless browser**
(Puppeteer/Playwright), and the obvious Node shortcut — which the **current code** takes — is to run
the npm `mxgraph` factory build on **jsdom**. The target, however, is to skip the engine entirely:
read and emit `.drawio` with **Node built-ins only**, taking **no third-party dependency**.

## 3. Feature concept

Convert a `.drawio` to SVG **in pure Node, with zero npm dependencies**:

- **Decode the wrapper** — parse `<mxfile>`, enumerate `<diagram>` pages; each page body is either
  plain `<mxGraphModel>` XML or **base64 + raw-deflate + URI-encoding**, decoded with **Node built-ins**
  (`Buffer.from(b64,'base64')` + **`node:zlib` `inflateRawSync`** + `decodeURIComponent`) — **no
  `pako`**.
- **Emit SVG ourselves** — walk the `<mxCell>` geometry/style and write SVG (shapes, edges, labels)
  directly, serialised per page — **no mxGraph, no jsdom**. Fidelity is best-effort.
- **Library + CLI** — `drawioToSvg` / `drawioToSvgPages` / `parseDrawioPages` as a library;
  `node index.mjs <input.drawio> [prefix]` writes one `<prefix>-<page>.svg` per page.

The tool lives under `packages/js/src/drawio2svg/`; the target takes **no npm dependency** (Node
built-ins only) and stays **isolated** so the published `kymostudio` package stays
**zero-runtime-dependency** (the `tsc` build and eslint both exclude it; only `dist/` ships). Target
behaviour: FEAT-DRAWIO-SVG-001.

> **As-is gap.** The shipped code decodes with `pako` and renders by booting the npm `mxgraph` factory
> on **jsdom** (`mxCodec` → `mxImageExport`/`mxSvgCanvas2D`); those deps are `packages/js`
> `devDependencies`. The four engine-on-jsdom gotchas it solves are recorded in DESIGN-DRAWIO-SVG-001
> §3 **for the current code** — the redesign (`CR-DRAWIO-SVG-003`) removes all three deps.

## 4. Audience

Engineers implementing or reviewing the `drawio2svg` utility, the kymo JS package
(`packages/js`) and its dependency-free guarantee, and anyone comparing draw.io/mxGraph rendering to
kymo's own renderers (`REF-DRAWIO-CMP-001`).

## 5. Terms and abbreviations

- **`.drawio` / mxGraph XML** — draw.io's native format: an `<mxfile>` of one or more `<diagram>`
  pages, each an `<mxGraphModel>` of `<mxCell>`s (`REF-DRAWIO-001`).
- **mxGraph** — the client-side diagramming engine draw.io is built on. The **target** does **not** use
  it; it appears only as the format's origin and as what the **as-is code** still runs (the gap).
- **jsdom** — a Node DOM implementation used by the **as-is code** to host mxGraph. The target removes
  it.
- **Page** — one `<diagram>` in the `<mxfile>`; emitted as one SVG.
- **Compressed body** — a `<diagram>` whose content is base64 + raw-deflate + URI-encoded (decoded with
  **`node:zlib`** in the target; the as-is code uses **pako**); the default for desktop-saved files.
- **Own SVG emitter** — the target's renderer: walks `<mxCell>` geometry/style and writes SVG directly,
  Node-built-in only. Best-effort: complex/custom shapes degrade gracefully (built-in approximation or
  empty glyph) without crashing.
- **Library API / CLI** — `drawioToSvg(xml,{pageIndex})`, `drawioToSvgPages(xml)`,
  `parseDrawioPages(xml)`, `modelXmlToSvg(xml,opts)`; `node index.mjs <input> [prefix]`.

## 6. Document map

This feature's docs use the two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–
`04-TEST`) and a **living plan** (`PLAN.md` + `CR/`).

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | PROD-DRAWIO-SVG-001 | *what product problem & whose needs (`SN-DS`)?* |
| 01 | `01-INTRO.md` (this) | INTRO-DRAWIO-SVG-001 | *where do I start?* |
| 02 | `02-FEATURE.md` | FEAT-DRAWIO-SVG-001 | *what must it do? (requirements, `FR-DS`/`NFR-DS`)* |
| 03 | `03-DESIGN.md` | DESIGN-DRAWIO-SVG-001 | *how is it built? (engine-on-jsdom, the gotchas)* |
| 04 | `04-TEST.md` | TEST-DRAWIO-SVG-001 | *how do we know it's right?* |
| — | `PLAN.md` | PLAN-DRAWIO-SVG-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Reading order: **`01-INTRO`** (this) → **`00-PRODUCT`** → **`02-FEATURE`** → **`03-DESIGN`** →
**`04-TEST`**; delivery status in PLAN-DRAWIO-SVG-001 + `CR/`. Cross-references use **`document_id`**
(never file paths).

- **Change management:** the baseline reserves the `-001` suffix; each later increment is a
  change-request under `CR/` (folders `CR-002`+), re-baselining the parent (bump version + Annex A
  row) on close.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-03 | Vũ Anh | Initial as-built baseline. Introduced the pure-Node mxGraph-on-jsdom `.drawio → SVG` converter; cited the archived-mxGraph / vendored-engine background. |
| 1.1     | 2026-06-03 | Vũ Anh | §3: deps moved to `packages/js` **devDependencies** (no nested `package.json`). |
| 1.2     | 2026-06-03 | Vũ Anh | **Direction change to zero npm dependency.** Reframed §2/§3/§5 to own decoder (`node:zlib`) + own SVG emitter; mxGraph/jsdom/pako demoted to the documented **as-is gap** (`CR-DRAWIO-SVG-003`). Status → *Under revision*. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/drawio/modules/drawio-svg/01-INTRO.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone with repository read
access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (PRODUCT/FEATURE/DESIGN/TEST/PLAN)
consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any feature change, reconcile it with FEAT-DRAWIO-SVG-001 and
DESIGN-DRAWIO-SVG-001 before release.
