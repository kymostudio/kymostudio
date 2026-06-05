---
title: "Icons CR-005 — P4 PNG → SVG body (vectorization): scope, rationale & schedule"
document_id: CR-ICONS-005
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: kymo Icons v2 maintainers / reviewers; engineers sourcing vector originals and wiring the normalize + inline pipeline
review_cycle: Until closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - DESIGN-ICONS-CR005          # CR design — CR-ICONS-005/02-DESIGN
  - TEST-ICONS-CR005            # CR verification (TC-2, TC-5, TC-6, TC-11) — CR-ICONS-005/03-TEST
  - PLAN-ICONS-CR005            # CR plan (phase P4) — CR-ICONS-005/04-PLAN
  - FEAT-ICONS-001              # Baseline requirements — realises FR-3, FR-6, FR-7, NFR-2 (no new FR)
  - DESIGN-ICONS-001            # Baseline design — §4 pipeline, §5 renderer/inliner
  - TEST-ICONS-001              # Baseline test — TC-2, TC-5, TC-6, TC-11
  - PLAN-ICONS-001              # Baseline plan — phase P4 (big lift)
  - RES-ICONS-001               # Prior-art research (Iconify §4 pipeline, §7.1 vectorization caveat)
  - CR-ICONS-004                # P3 — the IconifyJSON records this fills with vector bodies
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - vectorization
  - svgo
  - currentColor
  - inline-defs
  - byte-stable
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Icons CR-005 — P4 PNG → SVG body (vectorization)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | CR-ICONS-005                                       |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-CR005, TEST-ICONS-CR005, PLAN-ICONS-CR005, FEAT-ICONS-001, DESIGN-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, RES-ICONS-001, CR-ICONS-004 |

> **Implementation change-request** realising **baseline phase P4** (the *big lift*) of
> `PLAN-ICONS-001`. Adds **no requirement**: it schedules, designs, and verifies the existing
> **FR-3, FR-6, FR-7, NFR-2**. On completion the P4 row flips to **Done** (Annex C) — no requirement
> re-base. **Status: Open** — raised, not started; **depends on P3 (CR-ICONS-004)** and on the
> external prerequisite of **sourcing vector originals**. Sibling layers:
> [`02-DESIGN`](02-DESIGN.md) (`DESIGN-ICONS-CR005`) ·
> [`03-TEST`](03-TEST.md) (`TEST-ICONS-CR005`, TC-2/TC-5/TC-6/TC-11) ·
> [`04-PLAN`](04-PLAN.md) (`PLAN-ICONS-CR005`, phase P4).

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.

## 1. Motivation

The catalogue is **99.9% raster PNG** (RES-ICONS-001 §6): icons cannot be recoloured to a diagram
theme, do not scale crisply, and inline at ~10× the payload of an SVG body. P4 replaces the PNG
`<image>` path with normalized **vector records** so icons become **recolourable** (`currentColor`)
and **crisp at any scale** (FR-6), stored as the sparse `{ body, width, height }` of FR-3 and
inlined **`id`/`defs`-safe** (FR-7) — all while keeping unaffected diagrams **byte-identical**
(NFR-2). This is the **highest-effort phase (13 pts)** because it depends on an external input:
kymo's icons are raster, and auto-tracing ~2,400 PNGs is non-viable — the realistic path is
**sourcing vector originals** (RES-ICONS-001 §7.1).

## 2. Change (summary)

- **Source vector originals** — bring in upstream vector art (`mingrammer/diagrams` / cloud-vendor
  SVGs); auto-tracing the PNGs is explicitly **not** the path.
- **Normalize pipeline** (FR-3, on the P2/P3 generator) — `cleanupSVG → parseColors(currentColor) →
  SVGO → validate → deduplicate-to-aliases → minify-to-root`, landing each icon as a normalized
  record.
- **Renderer** (FR-6) — assemble `<svg viewBox="left top width height">{body}</svg>` at the
  requested size; `currentColor` makes icons themeable; vector scales crisply (retire the fixed
  64 px `<image>` / whole-document `_svg_as_inline()`).
- **`id`/`defs`-safe inlining** (FR-7) — repeated icons in one document SHALL NOT collide on element
  identifiers (namespacing/suffixing, or `<defs>` + `<use>`).
- **Byte-stability** (NFR-2) — feature defs/CSS injected only when used; diagrams with unaffected
  icons render byte-identical.

The pipeline wiring, renderer/inliner, and the per-set migration approach are in
**DESIGN-ICONS-CR005**.

## 3. Baseline requirements realised (no new requirement)

| Baseline req | Statement (unchanged) | Verified by |
|--------------|------------------------|-------------|
| **FR-3** | Normalized sparse `{ body, width, height }` record (inner body, no `<svg>` wrapper) | TC-2 |
| **FR-6** | Renderer assembles `<svg viewBox=…>{body}</svg>`; recolourable via `currentColor`; crisp at any scale | TC-5 |
| **FR-7** | `id`/`defs`-safe inlining — no identifier collisions for repeated icons | TC-6 |
| **NFR-2** | Byte-stable goldens for diagrams whose icons are unaffected (conditional defs/CSS) | TC-11 |

## 4. Constraints, assumptions, out-of-scope

- **Vectorization is sourced, not traced** (RES-ICONS-001 §7.1) — the hard dependency. P4 MAY land
  **incrementally per set** as vector originals become available; P1–P3 deliver value without it.
- **Depends on P3.** Records/dims come from the IconifyJSON manifest (CR-ICONS-004); the renderer
  reads effective dims after sparse/alias resolution.
- **No picker UI / no hosted API** — unchanged from baseline §7.
- **Goldens churn only intentionally** — any rendered-byte change to an affected icon is an
  intentional, reviewed golden regeneration (`KYMO_UPDATE_GOLDEN`), never silent.

## 5. Acceptance

- A record renders as `<svg viewBox=…>{body}</svg>` at the requested size; `currentColor` adopts the
  theme colour; output scales without raster blur — TC-5.
- The same icon used N times in one document produces **no** duplicate/colliding element `id`s — TC-6.
- Records are sparse `{ body, width, height }` (no `<svg>` wrapper) — TC-2.
- Golden SVG + BPMN-corpus baselines unchanged for diagrams whose icons are unaffected — TC-11.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-05 | Vũ Anh | **Raised (Open).** Maps baseline phase P4 (big lift) onto an implementation CR realising FR-3/FR-6/FR-7/NFR-2; depends on P3 (CR-ICONS-004) and on sourcing vector originals. Not started. |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial raise — P4 PNG → SVG body (vectorization), mapped from PLAN-ICONS-001 phase P4; may land incrementally per set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-005/01-REQUIREMENTS.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Implementation CR; no requirement IDs of its own. On completion, flip the P4 row of
`PLAN-ICONS-001` to Done + append Annex C. Until then, edits increment `version` and append to Annex A.

### B.4 Backwards Compatibility
FR-3/FR-6/FR-7/NFR-2 IDs are owned by `FEAT-ICONS-001` and unchanged here.
