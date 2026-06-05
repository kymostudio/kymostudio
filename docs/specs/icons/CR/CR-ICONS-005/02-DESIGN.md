---
title: "Icons CR-005 — Design: normalize pipeline, vector renderer & id/defs-safe inlining"
document_id: DESIGN-ICONS-CR005
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers wiring the normalize pipeline in the generator and the vector renderer/inliner in to_svg.py / render.ts
review_cycle: Until CR-ICONS-005 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-005                # CR lead doc — scope (FR-3, FR-6, FR-7, NFR-2)
  - TEST-ICONS-CR005            # CR verification
  - PLAN-ICONS-CR005            # CR plan
  - DESIGN-ICONS-001            # Baseline design (§4 pipeline, §5 renderer/inliner) this builds on
  - DESIGN-ICONS-CR004          # P3 records this fills with vector bodies
  - RES-ICONS-001               # Prior-art research (Iconify §4 pipeline, §7.1 vectorization)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - svgo
  - currentColor
  - viewBox
  - defs-use
  - byte-stable
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-005 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-CR005                                 |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-005, TEST-ICONS-CR005, PLAN-ICONS-CR005, DESIGN-ICONS-001, DESIGN-ICONS-CR004, RES-ICONS-001 |

Realises **CR-ICONS-005** (FR-3, FR-6, FR-7, NFR-2). Implements DESIGN-ICONS-001 §4 (pipeline tail)
and §5 (renderer/inliner) — the *vectorization* slice, on the P2/P3 generator + manifest.

## 1. Scope

Sourcing vector originals, the normalize pipeline that lands them as records, the vector renderer
(`<svg viewBox>` + `currentColor`), the `id`/`defs`-safe inliner, and the byte-stability discipline.
Out of scope: the catalogue format (P3), the CLI (P6).

## 2. Normalize pipeline (FR-3)

On the P2/P3 generator, per source icon:

```
cleanupSVG()                       // strip scripts/styles/editor cruft, remote refs
parseColors({ default: currentColor })
runSVGO()                          // minify paths, drop metadata, round coords
validate(viewBox / dims)
deduplicate identical bodies → aliases
minifyIconSet()                    // hoist common dims to root (sparse, FR-3)
→ { body, width?, height? } per icon
```

The body is the **inner SVG only** (no `<svg>` wrapper). The pipeline is deterministic (NFR-1) so
records are diffable and parity-checkable.

## 3. Vector renderer (FR-6)

Both renderers (`to_svg.py` / `render.ts`) assemble from the resolved record:

```
<svg viewBox="{left} {top} {width} {height}" …>{body}</svg>
```

scaled to the requested size. `currentColor` in the body makes the icon adopt the theme colour;
the vector scales crisply. This retires the fixed-64 px `_png_as_image_tag()` / `_svg_as_inline()`
(Python) and `pngBytesToImageTag()` / `svgTextToInline()` (JS) for vectorized sets.

## 4. `id`/`defs`-safe inlining (FR-7)

Repeated icons in one document must not collide on element `id`s. Two options, chosen per
byte-stability:

- **(a) Namespacing** — suffix/namespace each icon use's internal `id`s per instance.
- **(b) `<defs>` + `<use>`** — emit each distinct icon once into `<defs>`, reference with `<use>`.

The choice is made so output stays **byte-stable** for unaffected diagrams; feature defs/CSS are
injected **only when an affected icon is present** (NFR-2; same discipline as `bpmn_shapes`).

## 5. Migration approach (incremental)

Because vectorization depends on **sourcing** vector originals (RES-ICONS-001 §7.1), P4 lands
**per set**: a set flips from PNG `<image>` to vector records when its originals are sourced and
pass the pipeline. Until then a set stays on the legacy path. The 34 hand-coded built-in glyphs are
re-expressed as records in a `kymo` built-in set (DESIGN-ICONS-001 §7) so no in-repo sample
regresses.

## 6. Byte-stability discipline (NFR-2)

- Defs/CSS for vector icons are emitted **only when used**.
- A diagram with no vectorized icon renders byte-identical (TC-11).
- A diagram whose icon **is** vectorized changes intentionally → reviewed golden regeneration
  (`KYMO_UPDATE_GOLDEN`), never silent.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — normalize pipeline, vector renderer, id/defs-safe inliner, incremental per-set migration, byte-stability for P4. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-005/02-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep FR-3/FR-6/FR-7/NFR-2 traces consistent with
CR-ICONS-005; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is FEAT-ICONS-001.
