---
title: kymo Icons v2 — Plan
document_id: PLAN-ICONS-001
version: "0.3"
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

Each phase is tracked as an **implementation change-request** under [`CR/`](CR/) — a work-order that
schedules, designs-in-detail, and verifies the baseline requirements it realises (it mints no new
requirement; on completion its row here flips to Done and Annex C records the work). The CLI phase
(P6) is the one **requirements-adding** CR (it introduces FR-12..15). Phase number ≠ CR number;
execution order is the **Depends on** column.

| ID | Phase | CR | Deliverables | Exit criteria | Reqs | Depends on | Status |
|----|-------|----|--------------|---------------|------|------------|--------|
| **P1** | Namespace `prefix:name` + aliases | [`CR-ICONS-002`](CR/CR-ICONS-002/01-REQUIREMENTS.md) | Replace flat `<provider>-<name>` key with collision-proof `prefix:name`; add aliases for synonyms/variants; legacy-key compatibility map | No source icon unreachable (TC-1); legacy diagrams render unchanged (TC-10); suites green | FR-1, FR-4, FR-11 | — | ✅ Done |
| **P2** | One generator / single source of truth | [`CR-ICONS-003`](CR/CR-ICONS-003/01-REQUIREMENTS.md) | Promote `build-manifest.mjs` to a generator emitting per-set artifacts; both Python & JS consume it; retire the second scanner | Both impls read one artifact (TC-7); conformance record-parity gated (NFR-1); no new runtime dep (TC-12) | FR-8, FR-10, NFR-1, NFR-3 | P1 | ✅ Done |
| **P3** | IconifyJSON manifest + on-demand loading | [`CR-ICONS-004`](CR/CR-ICONS-004/01-REQUIREMENTS.md) | Per-set IconifyJSON with dims/aliases/`info`/tags; batched fetch + cache + `missing` set | Metadata queryable (TC-4); page fetches only referenced icons, caches (TC-8); whole catalogue not pulled up front | FR-2, FR-3, FR-5, FR-9, NFR-4 | P2 | ✅ Done |
| **P4** | PNG → SVG body (vectorization) | [`CR-ICONS-005`](CR/CR-ICONS-005/01-REQUIREMENTS.md) | Source vector originals; run normalize pipeline (`cleanupSVG → parseColors(currentColor) → SVGO → validate → dedup → minify`); `id`/`defs`-safe inlining; retire `<image>`/`_svg_as_inline()` | Records render + recolour + scale crisply (TC-5); no `id` collisions (TC-6); goldens stable for unaffected diagrams (TC-11) | FR-3, FR-6, FR-7, NFR-2 | P3 + sourced vectors | 🟡 Pipeline done; per-set vectorization ongoing |
| **P5** | Docs & gates | [`CR-ICONS-006`](CR/CR-ICONS-006/01-REQUIREMENTS.md) | Normative catalogue-format doc; reconcile this spec set; conformance/golden gates wired | Doc set Released; citations resolve; gates green | all | P1–P4, P6 | ✅ Done |
| **P6** | Icon CLI (`kymo icons`) | [`CR-ICONS-001`](CR/CR-ICONS-001/01-REQUIREMENTS.md) | `list`/`search`/`describe`/`download` in both packages; hand-rolled JS arg parser + new `bin` | TC-13..16 passing; converter unaffected; parity | FR-12..15 (**added**) | P3 (+P2/P4 for `download`) | ✅ Done |

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

| Phase | CR | Points |
|-------|----|--------|
| P1 — Namespace `prefix:name` + aliases | CR-ICONS-002 | 5 |
| P2 — One generator / single source of truth | CR-ICONS-003 | 5 |
| P3 — IconifyJSON manifest + on-demand loading | CR-ICONS-004 | 8 |
| P4 — PNG → SVG body (vectorization) | CR-ICONS-005 | 13 |
| P5 — Docs & gates | CR-ICONS-006 | 3 |
| P6 — Icon CLI (`kymo icons`) | CR-ICONS-001 | 8 |
| **Total** | | **42** |

**Progress:** 42 / 42 pts — P1–P3, P5, P6 fully implemented + tested; P4 pipeline/renderer implemented, full catalogue vectorization proceeds per set as vector originals are sourced. (P1–P5 baseline = 34 pts; P6 CLI = +8, added by
CR-ICONS-001.)

## 7. Change requests

Work against this plan is tracked as a folder per CR under [`CR/`](CR/) (raise → assess → implement →
close / re-baseline). Two kinds: **implementation CRs** realise existing baseline requirements (P1–P5)
and close by flipping their phase row to Done; the **requirements-adding CR** (P6) introduces new
FR/NFR re-based into the baseline on close.

| CR | Phase | Kind | Realises / adds | Depends on | Status |
|----|-------|------|-----------------|------------|--------|
| [`CR-ICONS-002`](CR/CR-ICONS-002/01-REQUIREMENTS.md) | P1 | implementation | FR-1, FR-4, FR-11 | — | Open |
| [`CR-ICONS-003`](CR/CR-ICONS-003/01-REQUIREMENTS.md) | P2 | implementation | FR-8, FR-10, NFR-1, NFR-3 | P1 | Open |
| [`CR-ICONS-004`](CR/CR-ICONS-004/01-REQUIREMENTS.md) | P3 | implementation | FR-2, FR-3, FR-5, FR-9, NFR-4 | P2 | Open |
| [`CR-ICONS-005`](CR/CR-ICONS-005/01-REQUIREMENTS.md) | P4 | implementation | FR-3, FR-6, FR-7, NFR-2 | P3 + sourced vectors | Open |
| [`CR-ICONS-006`](CR/CR-ICONS-006/01-REQUIREMENTS.md) | P5 | implementation | all (docs & gates) | P1–P4, P6 | Open |
| [`CR-ICONS-001`](CR/CR-ICONS-001/01-REQUIREMENTS.md) | P6 | requirements-adding | **adds** FR-12..15 (`kymo icons` CLI) | P3 (+P2/P4) | Open |
| [`CR-ICONS-007`](CR/CR-ICONS-007/01-REQUIREMENTS.md) | post-baseline | extension | vendored **inline** sets + the `ai` brand-logo group (no new FR; exercises FR-2/3/6/7/13/15) | P3, P4 | Implemented |
| [`CR-ICONS-008`](CR/CR-ICONS-008/01-REQUIREMENTS.md) | post-baseline | refactor | catalogue (art + generator + index) extracted into the shared `packages/icons` package — single source of truth; relocates the FR-8/NFR-1 artifact, byte-stable (NFR-2), zero-dep (NFR-3) | P2 | Implemented |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-04 | Vũ Anh | Initial issue — proposes kymo Icons v2 (P1–P5) sequenced per RES-ICONS-001 §7; no phase started. |
| 0.2     | 2026-06-05 | Vũ Anh | Mapped every phase onto a CR folder: P1→CR-ICONS-002, P2→CR-ICONS-003, P3→CR-ICONS-004, P4→CR-ICONS-005, P5→CR-ICONS-006 (implementation CRs realising existing FR/NFR), P6→CR-ICONS-001 (requirements-adding, the CLI). §3 phase table gains CR + Depends-on columns and a P6 row; §6 estimate adds P6 (total 34→42); §7 lists all six CRs. No requirement changed. |

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
| 2026-06-05 | P1 | prefix:name + aliases + legacy map (icons.py, icons-loader.ts, build-manifest.mjs) | 462653c — 2460 addresses (was 2300 keys); TC-1/3/10 |
| 2026-06-05 | P2 | retire Python scanner; both impls read the generated manifest | 01982b3 — TC-7/9/12; generator deterministic |
| 2026-06-05 | P3 | per-set IconifyJSON + collections + on-demand JS loader | be65fdb — 17 sets; TC-2/4/8 |
| 2026-06-05 | P6 | kymo icons list/search/describe/download (py cli.py + js bin) | 250eb47 — TC-13..16 + Python↔JS parity |
| 2026-06-05 | P4 | normalize pipeline + render_record + id/defs-safe inlining | 75e8ae3 — TC-2/5/6/11; download --from iconify normalizes |
| 2026-06-05 | P5 | catalogue-format doc (ICONS-MAP-001), doc-lint, CI freshness, re-base FR-12..15/TC-13..16 | this change |
| 2026-06-06 | post | vendored inline sets + `ai` group (CR-ICONS-007) | #129 — `ai:openai/anthropic/gemini`; CR007-1..7 |
| 2026-06-06 | post | extract catalogue → `packages/icons` SSOT (CR-ICONS-008) | #129 — pure move (renames); both impls repointed; CI/website/CLI |
