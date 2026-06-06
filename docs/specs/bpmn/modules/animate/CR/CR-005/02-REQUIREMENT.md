---
title: "BPMN Animation CR-005 — Requirements scaffold (WebP / playback export)"
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
  - INTRO-BPMN-ANIMATE-005
  - FEAT-BPMN-ANIMATE-001
  - FEAT-BPMN-ANIMATE-002
  - KYMOANIM-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - scaffold
  - change-request
  - webp
  - frame-synthesis
  - kymo.anim
  - bpmn-animate
---

# BPMN Animation CR-005 — Requirements scaffold (WebP / playback export)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-ANIMATE-005` |
| Version           | 0.2 |
| Status            | **Proposed** (scaffold) |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-ANIMATE-005` (change record), `FEAT-BPMN-ANIMATE-001` (parent SRS), `FEAT-BPMN-ANIMATE-002` (the descriptor consumed), `KYMOANIM-MAP-001` (format), `FEAT-BPMN-ANIMATE-001` (needs) |

> **Scaffold delta SRS.** Provisional requirements to fix scope and IDs. Refined (with acceptance
> criteria + full traceability) when CR-005 is **promoted to Open**.

## 1. Stakeholder needs

Serves `SN-BPMN-ANIMATE-04` (the offline/static-host output form) — slides, README embeds, chat
previews, PDFs — over the explicit descriptor (`SN-BPMN-ANIMATE-02`).

## 2. Functional requirements (`FR-CR5`, provisional)

| ID | Requirement | Realises |
|----|-------------|----------|
| **`FR-CR5-01`** | The feature SHALL emit an **animated WebP** of a token run by sampling the **`kymo.anim` descriptor `timeline`** at frame times, rendering each frame's SVG, and encoding the frames. | `FR-5` |
| **`FR-CR5-02`** | Frame rasterisation SHALL reuse the existing `to_webp.py` pipeline (`resvg_py.svg_to_bytes`), **not** cairosvg (per the repo's rasterization gotcha); the moving token SHALL use the SMIL `<animateMotion>` fallback where the rasteriser lacks CSS Motion Path. | `FR-5` |
| **`FR-CR5-03`** | The export SHALL be reachable from the CLI / library alongside the existing WebP target, producing a deterministic asset for a given `kymo.anim` file. | `FR-5`; `NFR-3` |

## 3. Scope

**In scope:** frame sampling from the `kymo.anim` timeline; per-frame SVG render → resvg raster →
animated-WebP encode; CLI/library surface. **Out of scope:** the no-JS SVG
(`CR-BPMN-ANIMATE-002`); the interactive viewer (`CR-BPMN-ANIMATE-004`); other video codecs (WebP only
for v1); changes to the `kymo.anim` format; any execution semantics.

## 4. Traceability (provisional)

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
