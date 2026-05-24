---
title: Canvas Studio — Specification: Overview & Document Map
document_id: INTRO-STUDIO-001
version: "0.1"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone new to the canvas-studio effort; engineers, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-STUDIO-001
  - DESIGN-STUDIO-001
  - TEST-STUDIO-001
  - PLAN-STUDIO-001
  - INTRO-JAM-001
  - INTRO-ENGINE-001
  - DESIGN-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - specification
  - introduction
  - index
  - reading-guide
  - canvas-studio
  - editor-shell
  - hi-fi-ui
  - document-map
---

# Canvas Studio — Specification: Overview & Document Map

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | INTRO-STUDIO-001                                                  |
| Version           | 0.1                                                               |
| Issue Date        | 2026-05-24                                                        |
| Status            | Draft                                                             |
| Classification    | Internal                                                          |
| Owner             | `diagrams/` project                                              |
| Related Documents | `FEAT-STUDIO-001`, `DESIGN-STUDIO-001`, `TEST-STUDIO-001`, `PLAN-STUDIO-001`, `INTRO-JAM-001` (sibling — the capability layer), `INTRO-ENGINE-001` (the render core) |

> Start here. This folder (`docs/specs/canvas-studio/`) specifies the **hi-fi editor UI shell**
> that wraps the finished canvas engine. The engine renders and round-trips a diagram today
> (`INTRO-ENGINE-001`), and the freeform-authoring tools are complete (`INTRO-JAM-001`); what the
> live playground (`website/app/`, `FEAT-CANVAS-001`) still lacks is a **product chrome** — the
> top bar, the tool rail, the on-canvas item styling, and the status bar that the hi-fi design
> prototype shows. This feature builds that chrome over the existing engine. The implementation
> plan that delivers it (phases, risks, worklog) lives in `docs/plans/canvas-studio/`
> (`PLAN-STUDIO-001`).

---

## 1. Purpose & motivation

A hi-fi design prototype of a "collaborative diagram studio" exists (React via Babel-standalone,
not wired to logic) showing an **Editor** screen — top bar, left tool rail + bottom toolbar, a
white canvas of richly-styled items, a right inspector, an animation timeline, and a status bar.
The functional substrate is already in the repo:

- **The engine** (`packages/js-canvas`, `INTRO-ENGINE-001`) — reactive store, editor facade,
  camera/zoom, per-record reactivity — **complete**.
- **The freeform-tool capability** (`INTRO-JAM-001`) — draw/sticky/text, tldraw removed, the
  engine the sole renderer — **complete**.
- **The playground host** (`website/app/`, `FEAT-CANVAS-001`) — a bare split-pane: a `.kymo`/BPMN
  `<textarea>`, a live `EngineBoard` preview, a small floating toolbar, `?script=` share links,
  IndexedDB persistence, static GitHub-Pages deploy.

**This feature (≈ 42 SP)** turns that bare playground into the prototype's hi-fi Editor *chrome*,
**client-only** — no backend, no new runtime deps, same static deploy. It is decomposed by the
**canvas's UI regions** (top bar, left sidebar, items, status bar), each a phase ≤ 10 SP, exactly
as `canvas-jam` is one feature phased by tool.

Documented to the spirit of **ISO/IEC/IEEE 12207**, with requirements per **29148**, architecture
per **42010**, quality attributes per **25010**, test structure per **29119** — tailored to a
single-maintainer OSS feature, as the sibling doc-sets.

## 2. Two document layers (ISO 15289 information-item classes)

| Layer | Folder | 15289 class | 12207 processes | Answers |
|-------|--------|-------------|-----------------|---------|
| **Specification** (this folder) | `docs/specs/canvas-studio/` | Specification / Description | §6.4 Technical Processes | *what must it be / how is it built / how is it verified?* |
| **Implementation plan** | `docs/plans/canvas-studio/` | Plan + Records — **living** | §6.3 Technical Management | *why, in what order, at what risk, what's done?* |

### 2.1 Specification layer — document map (this folder)

| # | Document | document_id | ISO/IEC/IEEE 12207 process | Answers |
|---|----------|-------------|----------------------------|---------|
| 01 | `01-INTRO.md` | `INTRO-STUDIO-001` | 6.3.6 Information Management | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-STUDIO-001` | 6.4.2 Stakeholder Needs + 6.4.3 Requirements (SRS, 29148) | *what must it do?* |
| 03 | `03-DESIGN.md` | `DESIGN-STUDIO-001` | 6.4.4 Architecture (42010) + 6.4.5 Design Definition | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-STUDIO-001` | 6.4.9 Verification + 6.4.11 Validation + 6.3.6 Traceability | *how do we know it's right?* |

### 2.2 Implementation-plan layer (separate folder)

| Document | document_id | ISO/IEC/IEEE 12207 process | Answers |
|----------|-------------|----------------------------|---------|
| `docs/plans/canvas-studio/PLAN.md` | `PLAN-STUDIO-001` | 6.4.1 Mission Analysis + 6.3.1 Project Planning + 6.3.4 Risk + 6.3.2 Worklog | *why, in what order, at what risk, what's done?* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

## 3. Relationship to the canvas-engine / canvas-jam / canvas-editor specs

`canvas-studio` is the **UI-shell layer** of one stack — it does not supersede any sibling:

```
canvas-engine (INTRO-ENGINE-001)  →  headless render/interaction core         [complete]
        ↓ builds on
canvas-jam    (INTRO-JAM-001)      →  freeform-tool capability; tldraw removed [complete]
        ↓ builds on
canvas-studio (this spec)          →  hi-fi editor CHROME over the engine      [new]
```

- **Built on, unchanged:** the engine's store/editor/camera/per-record reactivity
  (`DESIGN-ENGINE-001`), the freeform tools + `toSvg` export (`DESIGN-JAM-001`), and the
  playground's sync engine + `patchDsl` + persistence (`DESIGN-CANVAS-001`). This feature **adds
  React chrome and item styling**; it does not re-design the engine.
- **`canvas-jam` is NOT renamed.** Its `…-JAM-001` `document_id`s stay stable; `canvas-studio` is a
  new sibling, the same containment move that split `canvas-engine`→`canvas-jam` at the ≤ 50-SP cap.
- **Golden-safe boundary:** the DSL renderer `renderSVG` (`packages/js`) is **out of scope and
  untouched** — `canvas-studio` only restyles the *interactive board* and adds chrome.

## 4. Reading guide

Spec, in numeric order: **`01-INTRO`** (this doc) → **`02-FEATURE`** (the `FR-CS`/`NFR-CS`
requirements per region) → **`03-DESIGN`** (region→file mapping, tool-registry seam, item styling,
token migration) → **`04-TEST`** (V&V, `TC-CS-NN`, golden-safety, traceability). For delivery
status & history, read **`PLAN-STUDIO-001`**.

Quick paths: *implementer* → 02 → 03 → `PLAN`; *reviewer* → 02 → 04; *stakeholder* → `PLAN`.

## 5. Status & ownership

- **Status:** Draft — design-before-code. **Entry gate:** the engine + freeform-tool capability
  (`PLAN-JAM-001`) is complete (it is), so this feature can start immediately.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability invariant:** every requirement in `FEAT-STUDIO-001` will have ≥ 1 covering test in
  `TEST-STUDIO-001` before the feature is declared done.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial introduction + document map for canvas-studio (the hi-fi editor UI shell over the complete engine + freeform tools; decomposed by canvas region). |
