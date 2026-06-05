---
title: kymo Icons v2 — Plan
document_id: PLAN-ICONS-001
version: "0.1"
issue_date: 2026-06-04
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo icon catalogue, generator, renderer, and JS loader
review_cycle: On phase completion
supersedes: null
related_documents:
  - FEAT-ICONS-001              # Requirements (ConOps + SN + SRS)
  - DESIGN-ICONS-001            # Design
  - TEST-ICONS-001              # Test documentation
  - RES-ICONS-001               # Prior-art research (Iconify) — the evidence base
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - plan
  - phases
  - iconify
  - sequencing
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo Icons v2 — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-001                                     |
| Version      | 0.1                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-04                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-ICONS-001, DESIGN-ICONS-001, TEST-ICONS-001, RES-ICONS-001 |

Concept, needs & requirements: FEAT-ICONS-001. Design: DESIGN-ICONS-001.
Verification: TEST-ICONS-001. Evidence base: RES-ICONS-001.

## 1. Scope and approach

Redesign kymo's icon subsystem onto an IconifyJSON-style catalogue — `prefix:name`
namespacing, normalized vector records, aliases, metadata, one generator, on-demand
loading — mirrored in `packages/python` and `packages/js`. Sequenced per RES-ICONS-001's
recommendation: lead with the **cheapest, highest-leverage** change that stops data loss
(namespacing), then unify the generator, then enrich the manifest, and defer the **big
lift** (vectorization) — which depends on sourcing vector originals — to last. This is a
**proposed** feature; no phase is started.

## 2. Design

The catalogue format, generator pipeline, renderer/inliner, on-demand loader, backwards
compatibility, and parity gate are specified in **DESIGN-ICONS-001**. This plan covers
scope, phases, and risks.

## 3. Phases (work breakdown)

| ID | Phase | Deliverables | Exit criteria | Reqs | Status |
|----|-------|--------------|---------------|------|--------|
| **P1** | Namespace `prefix:name` + aliases | Replace flat `<provider>-<name>` key with collision-proof `prefix:name`; add aliases for synonyms/variants; legacy-key compatibility map | No source icon unreachable (TC-1); legacy diagrams render unchanged (TC-10); suites green | FR-1, FR-4, FR-11 | ⬜ Planned |
| **P2** | One generator / single source of truth | Promote `build-manifest.mjs` to a generator emitting per-set artifacts; both Python & JS consume it; retire the second scanner | Both impls read one artifact (TC-7); conformance record-parity gated (NFR-1); no new runtime dep (TC-12) | FR-8, FR-10, NFR-1, NFR-3 | ⬜ Planned |
| **P3** | IconifyJSON manifest + on-demand loading | Per-set IconifyJSON with dims/aliases/`info`/tags; batched fetch + cache + `missing` set | Metadata queryable (TC-4); page fetches only referenced icons, caches (TC-8); whole catalogue not pulled up front | FR-2, FR-3, FR-5, FR-9, NFR-4 | ⬜ Planned |
| **P4** | PNG → SVG body (vectorization) | Source vector originals; run normalize pipeline (`cleanupSVG → parseColors(currentColor) → SVGO → validate → dedup → minify`); `id`/`defs`-safe inlining; retire `<image>`/`_svg_as_inline()` | Records render + recolour + scale crisply (TC-5); no `id` collisions (TC-6); goldens stable for unaffected diagrams (TC-11) | FR-3, FR-6, FR-7, NFR-2 | ⬜ Planned (big lift) |
| **P5** | Docs & gates | Normative catalogue-format doc; reconcile this spec set; conformance/golden gates wired | Doc set Released; citations resolve; gates green | all | ⬜ Planned |

## 4. Risks and mitigations

- **Vectorization depends on source availability** (the design risk) — kymo's icons are
  raster; auto-tracing 2,400 PNGs is non-viable (RES-ICONS-001 §7.1 caveat). *Mitigation:*
  P4 sources upstream vector originals (`mingrammer/diagrams` / cloud-vendor SVGs); P1–P3
  deliver value **without** vectorization, so the big lift can land last or incrementally
  per set.
- **Golden / baseline churn** — any rendered-byte change fails the golden SVG and
  BPMN-corpus baselines. *Mitigation:* inject feature defs/CSS only when used; keep
  unaffected diagrams byte-identical (NFR-2, TC-11); regenerate only intentionally.
- **Cross-language drift** — two implementations could resolve records differently.
  *Mitigation:* one generator artifact (P2) + golden conformance with Python as sole golden
  writer (NFR-1, TC-7); reconcile toward Python.
- **Breaking authored diagrams** — renaming keys could break existing `.kymo`/BPMN.
  *Mitigation:* legacy `<provider>-<name>` compatibility map / aliases (FR-11, TC-10).

## 5. Verification

Approach, levels, cases (TC-1…TC-12), and the traceability matrix are in TEST-ICONS-001.
Headline: no unreachable icons, cross-language record parity, and byte-stable goldens for
unaffected diagrams.

## 6. Estimate (complexity)

| Phase | Points |
|-------|--------|
| P1 — Namespace `prefix:name` + aliases | 5 |
| P2 — One generator / single source of truth | 5 |
| P3 — IconifyJSON manifest + on-demand loading | 8 |
| P4 — PNG → SVG body (vectorization) | 13 |
| P5 — Docs & gates | 3 |
| **Total** | **34** |

**Progress:** 0 / 34 pts — proposed; not started.

## 7. Change requests

Changes to the baselined spec (`docs/specs/icons/`) are raised, assessed, and logged as a
folder per CR under [`CR/`](CR/) (raise → assess → approve → implement → re-baseline). Raised:
[`CR-ICONS-001`](CR/CR-ICONS-001/01-REQUIREMENTS.md) — the `kymo icons` command group (Open).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-04 | Vũ Anh | Initial issue — proposes kymo Icons v2 (P1–P5) sequenced per RES-ICONS-001 §7; no phase started. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/04-PLAN.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the spec; available to all repository readers.

### B.3 Change Control
On phase completion or scope change: update the affected clause + phase row; keep
requirement IDs and the TST traceability matrix consistent; increment `version`; append a
row to Annex A (document edits) and Annex C (implementation worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-ICONS-001 and DESIGN-ICONS-001.
Reconcile any deviation there before release.

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-phase work as it happens — distinct from Annex A
(edits to this document). Newest at the bottom; dates ISO 8601.

| Date | Phase | Work | Outcome / artifacts |
|------|-------|------|---------------------|
| _none yet_ | | | |
