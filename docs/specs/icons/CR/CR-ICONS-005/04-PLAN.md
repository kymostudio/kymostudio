---
title: "Icons CR-005 — Implementation Plan: P4 PNG → SVG body (vectorization)"
document_id: PLAN-ICONS-CR005
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer implementing P4 (normalize pipeline in the generator + vector renderer/inliner in to_svg.py / render.ts)
review_cycle: Until CR-ICONS-005 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-005                # CR lead doc — scope (FR-3, FR-6, FR-7, NFR-2)
  - DESIGN-ICONS-CR005          # CR design
  - TEST-ICONS-CR005            # CR verification
  - PLAN-ICONS-001              # Baseline plan — owns phase P4
  - CR-ICONS-004                # P3 — dependency
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - plan
  - phase-p4
  - vectorization
  - estimate
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-005 — Implementation Plan (P4)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-CR005                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-005, DESIGN-ICONS-CR005, TEST-ICONS-CR005, PLAN-ICONS-001, CR-ICONS-004 |

Realises **baseline phase P4** of `PLAN-ICONS-001` (**13 pts — big lift**). **Depends on P3
(CR-ICONS-004)** and on the external prerequisite of **sourcing vector originals**. May land
**incrementally per set**. **Status: proposed** — not started.

## 1. Scope and dependency

Source vector originals, run the normalize pipeline, render vectors with `currentColor`, inline
`id`/`defs`-safe, retire the PNG `<image>` path — per set. **Depends on:** P3 (records/dims) and
upstream vector art availability. **Unblocks:** the `download --from iconify` path of the CLI
(CR-ICONS-001) shares this pipeline.

## 2. Work breakdown (sub-steps of P4)

| Step | Work | Reqs | Verifies |
|------|------|------|----------|
| **P4.1** | Source vector originals (`mingrammer/diagrams` / cloud-vendor SVGs); inventory per set | — | (enables TC-5) |
| **P4.2** | Normalize pipeline tail: `parseColors(currentColor) → SVGO → validate → dedup → minify` → record | FR-3 | TC-2 |
| **P4.3** | Vector renderer: `<svg viewBox>{body}</svg>` + `currentColor`; retire `<image>` / `_svg_as_inline` per set | FR-6 | TC-5 |
| **P4.4** | `id`/`defs`-safe inliner (namespacing or `<defs>`+`<use>`); conditional defs/CSS injection | FR-7, NFR-2 | TC-6, TC-11 |
| **P4.5** | Per-set migration + golden regeneration (reviewed) for affected diagrams; built-in glyphs as records | NFR-2 | TC-11 |

## 3. Phase realised in the baseline plan

| ID | Phase | Deliverables | Depends on | Reqs | Points | Status |
|----|-------|--------------|------------|------|--------|--------|
| **P4** | PNG → SVG body (vectorization) | Sourced vector originals; normalize pipeline; `id`/`defs`-safe inlining; `<image>`/`_svg_as_inline()` retired | P3 + sourced vectors | FR-3, FR-6, FR-7, NFR-2 | 13 | ⬜ Planned (big lift) |

## 4. Risks and mitigations

- **Vectorization depends on source availability** (the design risk) — auto-tracing 2,400 PNGs is
  non-viable. *Mitigation:* source upstream vector originals; land **per set**, so partial coverage
  still ships and P1–P3 value is independent.
- **Golden / baseline churn** — any rendered-byte change fails goldens. *Mitigation:* conditional
  defs/CSS; unaffected diagrams byte-identical (TC-11); affected diagrams regenerated only
  intentionally (`KYMO_UPDATE_GOLDEN`).
- **`id` collisions** — repeated inlined icons could clash. *Mitigation:* namespacing or
  `<defs>`+`<use>`; TC-6 gates.
- **Cross-language render drift** — Python/JS could assemble `<svg>` differently. *Mitigation:*
  conformance compares rendered fragments; reconcile toward Python.

## 5. Verification

Cases TC-2, TC-5, TC-6, TC-11 and the traceability slice are in **TEST-ICONS-CR005**.

## 6. Close-out

On completion (or per-set milestones): flip the **P4** row of `PLAN-ICONS-001` §3 to **Done** (note
partial/per-set coverage in Annex C), append worklog rows, set this CR (lead **CR-ICONS-005**) to
**Closed**. No requirement re-base.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — plan for P4 (sub-steps P4.1..P4.5), 13 pts, depends on P3 + sourced vectors; incremental per set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-005/04-PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On phase progress: update the affected step/phase row; keep requirement/test IDs consistent with
CR-ICONS-005 / TEST-ICONS-CR005; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-ICONS-001 and DESIGN-ICONS-001.
