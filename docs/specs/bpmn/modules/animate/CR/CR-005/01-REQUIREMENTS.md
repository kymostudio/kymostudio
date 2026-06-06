---
title: "BPMN Animation CR-005 — WebP / playback export: Requirements"
document_id: FEAT-BPMN-ANIMATE-005
version: "0.2"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers who will implement the WebP/playback export; reviewers
review_cycle: Until promoted to Open or rejected
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-001
  - FEAT-BPMN-ANIMATE-002
  - DESIGN-BPMN-ANIMATE-001
  - KYMOANIM-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - requirements
  - scaffold
  - webp
  - frame-synthesis
  - playback
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-005 — WebP / playback export: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-ANIMATE-005` |
| Version           | 0.2 |
| Status            | **Proposed** — registered & scaffolded; awaiting promotion to Open |
| Owner             | `diagrams/` project |
| Type              | **Enhancement** (increment of the bpmn-animate feature) |
| Related Documents | `FEAT-BPMN-ANIMATE-005` (requirement scaffold); the format `KYMOANIM-MAP-001`; parent baseline `FEAT-/DESIGN-BPMN-ANIMATE-001`; consumes the descriptor from `FEAT-BPMN-ANIMATE-002` |

---

## Part A — Introduction

> **Scaffold CR.** Registered now (`01-REQUIREMENTS` only) to fix scope and IDs;
> `02-DESIGN`/`03-TEST`/`04-PLAN` are authored when the CR is **promoted to Open** and picked up.

### A.1 Purpose & motivation

The animated SVG (`CR-BPMN-ANIMATE-002/003`) and the interactive viewer (`CR-BPMN-ANIMATE-004`) both
need a live browser. Many destinations don't have one — **slide decks, README embeds, chat previews,
PDFs**. CR-005 adds a **frame-synthesised animated WebP** of a token run, **driven by the same
`kymo.anim` descriptor**: a self-contained video-like asset that plays anywhere an image displays.

kymo already synthesises raster frames via `to_webp.py` (using `resvg_py.svg_to_bytes`, **not**
cairosvg — see the repo's rasterization gotcha). CR-005 samples the descriptor **`timeline`** at
frame times, renders each frame's SVG, rasterises, and encodes an animated WebP.

**Intended outcome.** A `kymo`/library path that emits an animated WebP of a `kymo.anim` token run
for static-host destinations, sharing the descriptor with the SVG and viewer forms. Realises the
WebP/playback part of parent **`FR-5`**.

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-ANIMATE-005` | This doc — motivation, change record (Part A) + requirement scaffold (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-ANIMATE-005` | *(authored on promotion to Open)* |
| `03-TEST.md` | `TEST-BPMN-ANIMATE-005` | *(authored on promotion to Open)* |
| `04-PLAN.md` | `PLAN-BPMN-ANIMATE-005` | *(authored on promotion to Open)* |

### A.3 Relationship to the baseline & dependencies

CR-005 **realises** the WebP/playback part of parent `FR-5`. It **consumes** the `kymo.anim`
descriptor from `CR-BPMN-ANIMATE-002` and reuses the existing `to_webp.py` frame synthesiser, so it
follows CR-002 and can proceed in parallel with `CR-BPMN-ANIMATE-004` (`PLAN-BPMN-ANIMATE-001 §3`).
For the moving token in raster frames it uses the **SMIL `<animateMotion>` fallback**
(`DESIGN-BPMN-ANIMATE-002 §5`) where CSS Motion Path is unavailable to the rasteriser.

### A.4 Status & change record

**Status: Proposed.** Scaffolded only; no design/test/plan or code yet.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Registered.** (v0.1) frame-synthesised animated WebP of a token run via `to_webp.py`. |
| 2026-05-31 | Vũ Anh | **Re-framed** (v0.2) to sample the `kymo.anim` descriptor `timeline`. Still Proposed. |

---

## Part B — Requirements

> **Scaffold delta SRS.** Provisional requirements to fix scope and IDs. Refined (with acceptance
> criteria + full traceability) when CR-005 is **promoted to Open**.

### B.1 Stakeholder needs

Serves `SN-BPMN-ANIMATE-04` (the offline/static-host output form) — slides, README embeds, chat
previews, PDFs — over the explicit descriptor (`SN-BPMN-ANIMATE-02`).

### B.2 Functional requirements (`FR-CR5`, provisional)

| ID | Requirement | Realises |
|----|-------------|----------|
| **`FR-CR5-01`** | The feature SHALL emit an **animated WebP** of a token run by sampling the **`kymo.anim` descriptor `timeline`** at frame times, rendering each frame's SVG, and encoding the frames. | `FR-5` |
| **`FR-CR5-02`** | Frame rasterisation SHALL reuse the existing `to_webp.py` pipeline (`resvg_py.svg_to_bytes`), **not** cairosvg (per the repo's rasterization gotcha); the moving token SHALL use the SMIL `<animateMotion>` fallback where the rasteriser lacks CSS Motion Path. | `FR-5` |
| **`FR-CR5-03`** | The export SHALL be reachable from the CLI / library alongside the existing WebP target, producing a deterministic asset for a given `kymo.anim` file. | `FR-5`; `NFR-3` |

### B.3 Scope

**In scope:** frame sampling from the `kymo.anim` timeline; per-frame SVG render → resvg raster →
animated-WebP encode; CLI/library surface. **Out of scope:** the no-JS SVG
(`CR-BPMN-ANIMATE-002`); the interactive viewer (`CR-BPMN-ANIMATE-004`); other video codecs (WebP only
for v1); changes to the `kymo.anim` format; any execution semantics.

### B.4 Traceability (provisional)

| `FR-CR5` | Realises (parent `FEAT-BPMN-ANIMATE-001`) |
|----------|-------------------------------------------|
| `FR-CR5-01..03` | `FR-5` (WebP/playback form); `FR-CR5-03` also `NFR-3` |

*(Test cases `TC-CR5-*` — frame-count/emission checks — and acceptance criteria authored on promotion
to Open.)*

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Provisional scaffold SRS: frame-synthesised animated WebP via `to_webp.py`/resvg; CLI/library; deterministic. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-framed** around the descriptor: WebP samples the `kymo.anim` `timeline`; notes the SMIL token fallback for the rasteriser; realises the WebP part of parent `FR-5`. |
| 0.2     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-ANIMATE-005) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-ANIMATE-005) into Part B; deleted source files. |
