---
title: Canvas Items — Specification: Overview & Document Map
document_id: INTRO-ITEMS-001
version: "0.1"
issue_date: 2026-05-28
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-items module; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - PROD-ITEMS-001
  - FEAT-ITEMS-001
  - DESIGN-ITEMS-001
  - TEST-ITEMS-001
  - PLAN-ITEMS-001
  - INTRO-TOOLBAR-001
  - INTRO-EXPORT-001
  - INTRO-STUDIO-001
  - INTRO-JAM-001
  - INTRO-ENGINE-001
authors:
  - Vũ Anh
language: en
keywords:
  - specification
  - introduction
  - index
  - reading-guide
  - canvas-items
  - item-styling
  - selection-affordances
  - document-map
---

# Canvas Items — Specification: Overview & Document Map

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | INTRO-ITEMS-001                                                  |
| Version           | 0.1                                                              |
| Issue Date        | 2026-05-28                                                       |
| Status            | Draft — **skeleton** (only `00-PRODUCT` + `01-INTRO` authored)   |
| Classification    | Internal                                                         |
| Owner             | `diagrams/` project                                              |
| Related Documents | `PROD-ITEMS-001`, `FEAT-ITEMS-001`, `DESIGN-ITEMS-001`, `TEST-ITEMS-001`, `PLAN-ITEMS-001`, `INTRO-STUDIO-001` (the umbrella), `INTRO-TOOLBAR-001` / `INTRO-EXPORT-001` (siblings), `INTRO-JAM-001` / `INTRO-ENGINE-001` (the render core, complete) |

> Start here. This folder (`docs/specs/canvas-studio/modules/canvas-items/`) specifies the **on-canvas
> item styling + selection affordances** of the live playground (`website/app/`, `FEAT-CANVAS-001`):
> the kymo visual language on `kymo-node` / `kymo-region` / `kymo-edge` (matched to `renderSVG`), and
> the selection rectangle + corner handles + `W × H` size badge. It is a **module carved out of
> `canvas-studio` (`INTRO-STUDIO-001`)** — the shipped hi-fi editor chrome — alongside its siblings
> `canvas-toolbar` (`INTRO-TOOLBAR-001`) and `canvas-export` (`INTRO-EXPORT-001`). The behaviour
> already **shipped** under canvas-studio (P4 item styling + P5 selection), so this doc-set is
> **AS-BUILT**.

> **Skeleton notice.** Only `00-PRODUCT` (ConOps/StRS) and this `01-INTRO` exist today. The remaining
> baselined-spec items (`02-FEATURE` SRS, `03-DESIGN`, `04-TEST`) and the living plan (`PLAN.md`) are
> **not yet authored** — they are listed in §2 as the planned map so the re-homed `FR-CS-04`/`FR-CS-05`
> have a real home. This stub resolves what were previously dangling references to `INTRO-ITEMS-001`.

---

## 1. Purpose & motivation

`canvas-studio` shipped the whole hi-fi editor chrome as one feature (P1–P7). To keep each module under
the maintainer's **≤ 50-SP-per-feature** cap and give each concern one home, `canvas-studio` becomes an
**umbrella** and its IDs are **re-homed** into three sibling modules (the same containment move that
split `canvas-engine`→`canvas-jam`):

- **`canvas-toolbar`** (`INTRO-TOOLBAR-001`) — the chrome frame: top bar, tool rail, status bar.
- **`canvas-export`** (`INTRO-EXPORT-001`) — the editor's output: board→SVG export + URL share.
- **`canvas-items`** (this module) — on-canvas **item styling + selection affordances**.

**This module** owns how on-canvas items *look* and how a *selected* shape is *adorned* — it does not
own the engine's interaction model (that is `canvas-engine` / `canvas-jam`) nor the chrome around the
board (`canvas-toolbar`). As an as-built carve-out it re-homes the relevant `canvas-studio` IDs (see §3)
and inherits its golden-safe / client-only contract verbatim.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture per
**42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS module, as the sibling doc-sets.

## 2. Document map

This module's docs use the two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–`04-TEST`)
and a **living plan** (`PLAN.md` + `CHANGE-REQUESTS/`). The documents for canvas-items:

| # | Document | document_id | Status | Answers |
|---|----------|-------------|--------|---------|
| 00 | `00-PRODUCT.md` | `PROD-ITEMS-001` | authored | *what product problem & whose needs (`SN-IT`)?* |
| 01 | `01-INTRO.md` | `INTRO-ITEMS-001` | authored | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-ITEMS-001` | **pending** | *what must it do? (SRS, `FR-IT`/`NFR-IT`)* |
| 03 | `03-DESIGN.md` | `DESIGN-ITEMS-001` | **pending** | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-ITEMS-001` | **pending** | *how do we know it's right? (`TC-IT`)* |
| — | `PLAN.md` | `PLAN-ITEMS-001` | **pending** | *why, in what order, at what risk, what's done?* |
| — | `CHANGE-REQUESTS/` | — | as needed | *change-requests against the baseline.* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

## 3. Relationship to the canvas-studio umbrella & siblings

`canvas-items` is a **module of the `canvas-studio` umbrella** (`INTRO-STUDIO-001`), a **sibling of
`canvas-toolbar` and `canvas-export`**, built on the same stack:

```
canvas-studio (INTRO-STUDIO-001)   →  umbrella: the hi-fi editor chrome (shipped P1–P7)
        ├── canvas-toolbar (INTRO-TOOLBAR-001) →  top bar · tool rail · status bar
        ├── canvas-export  (INTRO-EXPORT-001)  →  the editor's OUTPUT: board→SVG + URL share
        └── canvas-items   (this spec)         →  on-canvas item styling + selection affordances
```

### Re-homing summary (from `canvas-studio`)

The relevant `canvas-studio` IDs are **re-homed** into this module with new `ITEMS` IDs; the umbrella's
studio IDs are the historical source (to be cited via the **⊇ former** columns once `FEAT-ITEMS-001` is
authored):

| Former (canvas-studio) | Re-homed here | What |
|------------------------|---------------|------|
| `FR-CS-04` | `FR-IT-01` | on-canvas item styling matched to `renderSVG` (node glyph; region outer-slate / inner-purple-dashed; edge flow-dash) |
| `FR-CS-05` | `FR-IT-02` | selection rectangle + 4 corner handles + `W × H` size badge in the canvas layer |
| `SN-CS-03` | `SN-IT-01`/`SN-IT-02` | item visual language; clear selection affordances |

- **Built on, unchanged:** the engine's per-record reactivity (`DESIGN-ENGINE-001`) and shape layer
  (`engine/shapes.tsx`, `engine/react.tsx`).
- **Golden-safe boundary:** the DSL renderer `renderSVG` (`packages/js`) is **out of scope and
  untouched** — item styling is matched *to* it, but does not modify it.

## 4. Reading guide

Spec: **`00-PRODUCT`** (the product context + `SN-IT` needs) → **`01-INTRO`** (this doc) →
**`02-FEATURE`** (the `FR-IT`/`NFR-IT` requirements — *pending*) → **`03-DESIGN`** → **`04-TEST`**.
For delivery status & history, read **`PLAN-ITEMS-001`** (*pending*).

## 5. Status & ownership

- **Status:** Draft — **skeleton / AS-BUILT.** The behaviour shipped under `canvas-studio` (P4 item
  styling + P5 selection); only `00-PRODUCT` + `01-INTRO` are authored here. Authoring the remaining
  baselined-spec items is tracked against the umbrella plan.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** to hold once `FEAT-ITEMS-001`/`TEST-ITEMS-001` are authored — every
  `FR-IT-*` will have ≥ 1 covering `TC-IT-*`.
- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/canvas-studio/modules/canvas-items/CHANGE-REQUESTS/` and re-baselined (bump version +
  record in Annex A).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-28 | Vũ Anh | Initial **skeleton** introduction + document map for canvas-items — on-canvas item styling + selection affordances, carved from `canvas-studio` (`INTRO-STUDIO-001`) as the third sibling module under `modules/`. Resolves the previously dangling `INTRO-ITEMS-001` references in `canvas-toolbar`/`canvas-export`. AS-BUILT (shipped under canvas-studio P4/P5); re-homes `FR-CS-04`/`FR-CS-05` → `FR-IT-01`/`FR-IT-02`. `02-FEATURE`/`03-DESIGN`/`04-TEST`/`PLAN` pending. |
