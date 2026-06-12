---
title: Kymo DSL Normative-Reference Set — Plan
document_id: PLAN-KYMO-NREF-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo DSL documentation restructure
review_cycle: On phase completion, or on documentation-structure change
supersedes: null
related_documents:
  - FEAT-KYMO-NREF-001       # Requirements
  - DESIGN-KYMO-NREF-001     # Design
  - TEST-KYMO-NREF-001       # Test documentation
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - plan
  - phases
  - documentation
  - normative-reference
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL Normative-Reference Set — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-KYMO-NREF-001                                |
| Version      | 1.1                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-KYMO-NREF-001, DESIGN-KYMO-NREF-001, TEST-KYMO-NREF-001 |

Concept: FEAT-KYMO-NREF-001. Requirements (FR/NFR referenced below):
FEAT-KYMO-NREF-001. Design: DESIGN-KYMO-NREF-001. Verification: TEST-KYMO-NREF-001.

## 1. Context

The kymo DSL specification lived in one monolithic file
(`docs/KYMO_DSL.md`, v2.5). The repository already organises the `.bpmn` interchange
spec as a **clause-per-file normative-reference set** (`docs/formats/bpmn/`). This plan brings the kymo DSL — the repo's own normative language —
to the same organisation so each clause is independently citable and versioned,
without changing the language or breaking any cross-reference.

## 2. Decision

Adopt **"keep the id, rewrite the links"**: the new index `README.md` retains
`document_id: KYMO-DSL-001` (so the ≈50 existing citations resolve unchanged); the
ten clauses become `KYMO-DSL-<X>-001` files; the monolith is deleted and every
`../KYMO_DSL.md` path/anchor link is repointed. Content is lifted **verbatim** —
this is a restructure, not a language change (DESIGN-KYMO-NREF-001 §1).

## 3. Architecture (overview)

```
before                                    after
docs/KYMO_DSL.md  (KYMO-DSL-001 v2.5)      docs/formats/kymo-dsl/
  §1 Scope … §10 Examples                    README.md          KYMO-DSL-001     (index, v2.6)
  + Annex A/B                                01-scope.md        KYMO-DSL-SCOPE-001
                                             …                  …
                                             10-examples.md     KYMO-DSL-EXAMPLES-001
                                           (each clause file: verbatim body + per-file Annex A/B)
```

Engineering record of the move: this set (`*-KYMO-NREF-001`).

## 4. Phased plan

| Phase | Goal |
|-------|------|
| P1 | Build the clause-per-file normative-reference set. |
| P2 | Repoint every link to the monolith, then delete it. |
| P3 | Author this engineering spec set (REQ/DSN/TST/PLAN). |
| P4 | Verify integrity + run the docs-only build sanity gate. |

## 5. Project plan

**Table 5.1 — Phases (≤ 10 SP per phase)**

| Phase | Exit criteria (milestone) | Entry criteria | Effort | SP | Depends on |
|-------|---------------------------|----------------|--------|----|------------|
| **P1** | `docs/formats/kymo-dsl/` has README + `01`…`10`; bodies verbatim; anchors preserved; per-file Annex A/B (`TC-1`, `TC-3`, `TC-4`, `TC-7`) | — | M | 5 | — |
| **P2** | Monolith deleted; no link/path to it remains; `KYMO-DSL-001` resolves to exactly one file (`TC-2`, `TC-5`) | P1 | M | 5 | P1 |
| **P3** | Five `*-KYMO-NREF-001` docs Released; traceability matrix complete | P1 | S | 3 | P1 |
| **P4** | Integrity greps clean; `pytest -q` + `npm test` green (`TC-6`) | P1–P3 | S | 2 | P1–P3 |

## 5.1 Complexity & sizing (story points)

Fibonacci SP; calibration: **3 ≈ the descriptive 5-doc `kymo-dsl` set**
(PLAN-KYMO-DSL-001 P6) — same docs-only class (no code path), so SP measure breadth
+ fidelity care, not algorithmic complexity.

**Table 5.2 — Work items**

| Work item | Phase | SP | Complexity driver |
|-----------|-------|----|-------------------|
| README index (frontmatter carrying ≈25 related docs + 10 sub-ids; Contents table; full Annex A 1.0→2.6) | P1 | 2 | breadth of the related-document graph; provenance fidelity |
| 10 clause files (verbatim lift + H1/doc-control/Annex wrappers; **heading texts preserved**) | P1 | 2 | anchor fidelity (`RK-KND-01`); per-file annex boilerplate |
| Relative-path depth fix (`../`→`../../../`) | P1 | 1 | locate the few real markdown links amid inline-code paths |
| `docs/tools/*.md` (~26) repoint — frontmatter + doc-control row + footer | P2 | 2 | breadth (26 files); uniform but error-prone |
| `docs/guide/` deep anchors → clause files (most-specific-first) | P2 | 2 | each fragment routes to the right clause file (`RK-KND-01`) |
| Tail repoint + delete (`diagrams/bpmn`, `BEST_PRACTICE`, `CONTRIBUTING`, PR-template, `CHANGELOG`, issue-template URL; `git rm`) | P2 | 1 | depth-two link; historical-entry care |
| Engineering spec set (this `*-KYMO-NREF-001` quartet + plan) | P3 | 3 | five ISO-structured docs with traceability |
| Verification (integrity greps + `pytest`/`npm test`) | P4 | 2 | grep design; confirm zero build delta |
| **Total (this feature)** | | **≈ 15** | **Complexity: Low–Medium (docs-only; breadth, not depth)** |

## 6. Risk register

**Table 6.1 — Risks**

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| **RK-KND-01** | **Anchor drift** — a heading text edited during the lift breaks the teaching guide's deep links (`#64-leaf-components`, `#74-auto-canvas`, …) | Med | Med | Lift headings **verbatim** (FR-3); enumerate the protected anchors in DESIGN §4 Table 4.1; gate with `TC-4`. | Closed |
| **RK-KND-02** | **Missed link** — a `../KYMO_DSL.md` reference left behind dangles after the delete | Med | Med | Repo-wide grep gate over `](.*KYMO_DSL` / `/KYMO_DSL.md` and the `.yml` issue template; `TC-5`. | Closed |
| **RK-KND-03** | **Duplicate id** — `KYMO-DSL-001` ends up defined in two files → ambiguous citation target | Low | High | Uniqueness grep `^document_id: KYMO-DSL-001$` → exactly one; `TC-2`. | Closed |
| **RK-KND-04** | **Accidental content change** during the verbatim lift (a dropped line, a reflowed EBNF block) | Low | High | Diff each clause body against `git show HEAD~:docs/KYMO_DSL.md`; `TC-3`. | Open |
| **RK-KND-05** | The **old filename string reappears** — these relocation docs naturally name `docs/KYMO_DSL.md` as the source being moved | Low | Low | Keep such mentions as **non-link prose** in this nref module's docs; the link-integrity gate (`TC-5`) checks link/path forms only, not prose. | Accepted |

## 7. Files to create / modify

- **Create** — `docs/formats/kymo-dsl/README.md` + `01-scope.md` … `10-examples.md`
  (11); the `*-KYMO-NREF-001` spec quartet `{01-REQUIREMENTS,02-DESIGN,03-TEST,04-PLAN}.md`
  (this is `04-PLAN.md`; authored at `docs/specs/kymo-dsl-nref/`, since 2026-06-12 living at
  `docs/specs/kymo-syntax/modules/nref/`).
- **Modify** — `docs/tools/*.md` (~26); `docs/guide/{dsl-guide,faq,README}.md`;
  `docs/diagrams/bpmn/README.md`; `docs/BEST_PRACTICE_DIAGRAMS.md`;
  `CONTRIBUTING.md`; `.github/PULL_REQUEST_TEMPLATE.md`; `CHANGELOG.md`;
  `.github/ISSUE_TEMPLATE/config.yml`.
- **Delete** — `docs/KYMO_DSL.md`.
- **Follow-up** — `MEMORY.md` note `format-docs-under-docs-formats` (record the new
  `kymo-dsl/` set + this spec set).

## 8. Verification

Per TEST-KYMO-NREF-001 (TC-1…7) and the matrix in its §5. In brief: structure parity
(`TC-1`), one `KYMO-DSL-001` (`TC-2`), verbatim content (`TC-3`), anchors resolve
(`TC-4`), zero dangling links (`TC-5`), `pytest`/`npm test` green (`TC-6`), version
2.6 + full provenance (`TC-7`).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-25 | Vũ Anh | Initial issue — plan (phases P1–P4, ≈15 SP, risk register) for the kymo DSL normative-reference restructure. |
| 1.1     | 2026-06-12 | Vũ Anh | **Relocated** into `docs/specs/kymo-syntax/modules/nref/` (module of the kymo-syntax umbrella); §7 and `RK-KND-05` location wording updated; worklog row added. No plan content changed. |

## Annex B — Open questions / pending decisions

| # | Question | Disposition |
|---|----------|-------------|
| 1 | Convert `docs/tools/*.md` path-based `related_documents` to cite-by-`document_id` (the `CLAUDE.md` convention)? | Deferred — separate cleanup; this feature only repoints existing paths (FEAT §4). |
| 2 | Add a top-level `docs/formats/README.md` index registering both `bpmn/` and `kymo-dsl/`? | Deferred — each set is self-contained (mirrors the BPMN set, which has no parent index). |

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-phase work as it happens — distinct from
Annex A, which records edits to *this document*. Newest at the bottom; dates ISO 8601.

| Date       | Phase / area | Work | Status | Ref |
|------------|--------------|------|--------|-----|
| 2026-05-25 | P1 — Build set | Created `docs/formats/kymo-dsl/`: `README.md` (v2.6 index with Contents table + full Annex A 1.0→2.6) + `01-scope.md`…`10-examples.md` (`KYMO-DSL-<X>-001`), §1–§10 lifted verbatim, headings preserved, per-file Annex A/B, `../`→`../../../` path fix. Verified 11 files, unique ids, anchors present. | ✅ | `TC-1`,`TC-3`,`TC-4`,`TC-7` |
| 2026-05-25 | P2 — Repoint + delete | Repointed all `../KYMO_DSL.md` path/anchor links: ~26 `docs/tools/*`, `docs/guide/*` deep anchors → `06-grammar.md`/`07-semantics.md`, `docs/diagrams/bpmn/README.md` (depth-two), `BEST_PRACTICE_DIAGRAMS.md`, `CONTRIBUTING.md`, PR template, `CHANGELOG.md`, `.github/ISSUE_TEMPLATE/config.yml`. Deleted `docs/KYMO_DSL.md`. Verified zero `KYMO_DSL` tokens repo-wide; `KYMO-DSL-001` defined once. | ✅ | `TC-2`,`TC-5` |
| 2026-05-25 | P3 — Spec set | Authored this engineering set (`INTRO`/`FEATURE`/`DESIGN`/`TEST`/`PLAN-KYMO-NREF-001`) at the detailed `canvas-studio` format — stakeholder needs, FR/NFR tables, anchor/link-rewrite design, TC + traceability, phased plan + sizing + risk register. | ✅ | `FEAT-KYMO-NREF-001` |
| 2026-05-25 | P4 — Verify | Integrity greps + `pytest -q` + `npm test`. | ⏳ | `TC-6` |
| 2026-06-12 | Folder merge | Folded `docs/specs/kymo-dsl-nref/` into the kymo-syntax umbrella as `docs/specs/kymo-syntax/modules/nref/` (`git mv`, self-paths + parent cross-links updated; all `*-KYMO-NREF-001` ids unchanged). | ✅ | `FEAT-KYMO-SYNTAX-001` |
