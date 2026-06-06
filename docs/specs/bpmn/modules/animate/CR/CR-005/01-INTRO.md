---
title: "BPMN Animation CR-005 — WebP / playback export: Overview & Change Record"
document_id: INTRO-BPMN-ANIMATE-005
version: "0.2"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: bpmn-animate maintainers / reviewers; the approver who promotes this CR to Open
review_cycle: Until promoted to Open (then build) or rejected
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-005
  - FEAT-BPMN-ANIMATE-001
  - DESIGN-BPMN-ANIMATE-001
  - INTRO-BPMN-ANIMATE-002
  - KYMOANIM-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - webp
  - frame-synthesis
  - playback
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-005 — WebP / playback export: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-ANIMATE-005` |
| Version           | 0.2 |
| Status            | **Proposed** — registered & scaffolded; awaiting promotion to Open |
| Owner             | `diagrams/` project |
| Type              | **Enhancement** (increment of the bpmn-animate feature) |
| Related Documents | `FEAT-BPMN-ANIMATE-005` (requirement scaffold); the format `KYMOANIM-MAP-001`; parent baseline `FEAT-/DESIGN-BPMN-ANIMATE-001`; consumes the descriptor from `INTRO-BPMN-ANIMATE-002` |

> **Scaffold CR.** Registered now (`01-INTRO` + `02-REQUIREMENT`) to fix scope and IDs;
> `03-DESIGN`/`04-TEST`/`05-PLAN` are authored when the CR is **promoted to Open** and picked up.

## 1. Purpose & motivation

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

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-ANIMATE-005` | This doc — motivation, map, change record. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-ANIMATE-005` | Requirement scaffold (`FR-CR5-*`), scope, traceability. |
| `03-DESIGN.md` | `DESIGN-BPMN-ANIMATE-005` | *(authored on promotion to Open)* |
| `04-TEST.md` | `TEST-BPMN-ANIMATE-005` | *(authored on promotion to Open)* |
| `05-PLAN.md` | `PLAN-BPMN-ANIMATE-005` | *(authored on promotion to Open)* |

## 3. Relationship to the baseline & dependencies

CR-005 **realises** the WebP/playback part of parent `FR-5`. It **consumes** the `kymo.anim`
descriptor from `CR-BPMN-ANIMATE-002` and reuses the existing `to_webp.py` frame synthesiser, so it
follows CR-002 and can proceed in parallel with `CR-BPMN-ANIMATE-004` (`PLAN-BPMN-ANIMATE-001 §3`).
For the moving token in raster frames it uses the **SMIL `<animateMotion>` fallback**
(`DESIGN-BPMN-ANIMATE-002 §5`) where CSS Motion Path is unavailable to the rasteriser.

## 4. Status & change record

**Status: Proposed.** Scaffolded only; no design/test/plan or code yet.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Registered.** (v0.1) frame-synthesised animated WebP of a token run via `to_webp.py`. |
| 2026-05-31 | Vũ Anh | **Re-framed** (v0.2) to sample the `kymo.anim` descriptor `timeline`. Still Proposed. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Registered scaffold: WebP / playback export; consumes the token schedule + `to_webp.py`. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-framed** around the explicit descriptor: WebP samples the `kymo.anim` `timeline`; notes the SMIL token fallback for the rasteriser; realises the WebP part of parent `FR-5`. |
