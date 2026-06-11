---
title: Kymo DSL Normative-Reference Set — Design
document_id: DESIGN-KYMO-NREF-001
version: "1.0"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo DSL documentation restructure
review_cycle: On documentation-structure change
supersedes: null
related_documents:
  - FEAT-KYMO-NREF-001       # Requirements (traced below)
  - TEST-KYMO-NREF-001       # Test documentation
  - PLAN-KYMO-NREF-001       # Plan
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - design
  - documentation
  - normative-reference
  - anchors
  - link-rewrite
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 42010:2011
  - ISO 8601:2019
---

# Kymo DSL Normative-Reference Set — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-KYMO-NREF-001                              |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-25                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-KYMO-NREF-001, TEST-KYMO-NREF-001, PLAN-KYMO-NREF-001 |

Realises the requirements in FEAT-KYMO-NREF-001 (FR/NFR ids cited per clause).
Covers ISO/IEC/IEEE 12207 Architecture & Design Definition. The specification being
organised is `KYMO-DSL-001`; the reference implementation `dsl.py` is unchanged.

## 1. Scope & relationship to `dsl.py`

The change is a **documentation restructure**: it moves and re-wraps text, it does
not touch behaviour. The kymo DSL is dual-sourced —
[`dsl.py`](../../../packages/python/src/kymo/dsl.py) is the reference implementation
and `KYMO-DSL-001` the normative grammar, kept in lockstep. This feature changes
only the **on-disk shape** of `KYMO-DSL-001`; `dsl.py`, the renderers, and the test
suites are out of scope and untouched (NFR-3).

The before/after:

```
before                                    after
docs/KYMO_DSL.md  (v2.5)     docs/formats/kymo-dsl/
  §1 … §10 + Annex A/B                       README.md            (v2.6 — index)
                                             01-scope.md          (KYMO-DSL-SCOPE-001)
                                             …                    …
                                             10-examples.md       (KYMO-DSL-EXAMPLES-001)
```

## 2. Target structure — clause → file → id map (FR-1, FR-2)

Mirrors `docs/formats/bpmn/`: a README index plus one file per
clause; the kymo DSL is the repo's own spec, so there is **no `upstream:`**
frontmatter block and **no content annexes** — only the doc-control Annex A/B each
file carries.

| Clause | File | `document_id` | Source (`KYMO-DSL-001` v2.5) |
|---|---|---|---|
| (index) | `README.md` | **`KYMO-DSL-001`** | intro + "Contents — clauses" table + full Annex A |
| 1 Scope | `01-scope.md` | `KYMO-DSL-SCOPE-001` | §1 |
| 2 Normative References | `02-normative-references.md` | `KYMO-DSL-NORMREF-001` | §2 |
| 3 Terms and Definitions | `03-terms-and-definitions.md` | `KYMO-DSL-TERMS-001` | §3 |
| 4 Abbreviations | `04-abbreviations.md` | `KYMO-DSL-ABBR-001` | §4 |
| 5 Lexical Conventions | `05-lexical-conventions.md` | `KYMO-DSL-LEX-001` | §5 |
| 6 Grammar | `06-grammar.md` | `KYMO-DSL-GRAMMAR-001` | §6 |
| 7 Semantics | `07-semantics.md` | `KYMO-DSL-SEMANTICS-001` | §7 |
| 8 Authoring Conventions | `08-authoring-conventions.md` | `KYMO-DSL-AUTHORING-001` | §8 |
| 9 Conformance | `09-conformance.md` | `KYMO-DSL-CONF-001` | §9 |
| 10 Examples | `10-examples.md` | `KYMO-DSL-EXAMPLES-001` | §10 |

## 3. ID-preservation scheme (FR-2)

The single highest-traffic identifier in the repository is `KYMO-DSL-001` (≈50
citations: engineering sets under `docs/specs/`,
`docs/formats/kymo*.md`, `docs/research/`, `BEST_PRACTICE_DIAGRAMS.md`). To avoid
churning all of them, the **index README inherits `KYMO-DSL-001`** — it *is* the
canonical spec, now expressed as an index over clause files. Every existing
`KYMO-DSL-001` citation therefore continues to resolve, unchanged (NFR-1).

The clause sub-ids stay inside the `KYMO-DSL-` family (`KYMO-DSL-<X>-001`) to signal
"part of the DSL spec". `document_id` uniqueness is the invariant: `KYMO-DSL-001`
SHALL appear in exactly one frontmatter (the README) — verified by TC-2.

## 4. Content fidelity & anchor preservation (FR-3)

Clause bodies are lifted **verbatim** (TC-3). Each clause file wraps its body with:
frontmatter → H1 `# Kymo DSL — Clause N: <Title>` → doc-control table → the original
`## N.`/`### N.M` headings and body **unchanged** → per-file Annex A/B.

**Anchor preservation is the load-bearing constraint.** GitHub derives heading
anchors from heading **text**, so keeping the original headings verbatim keeps every
incoming `#fragment` valid — only the *path* part of a link changes. The teaching
guide (`docs/guide/`) links these deep anchors, all in two clause files:

**Table 4.1 — Preserved anchors**

| Anchor | Source heading (kept verbatim) | Target file |
|---|---|---|
| `#63-metadata-directives` | `### 6.3 Metadata Directives` | `06-grammar.md` |
| `#64-leaf-components` | `### 6.4 Leaf Components` | `06-grammar.md` |
| `#65-containers` | `### 6.5 Containers` | `06-grammar.md` |
| `#67-edges` | `### 6.7 Edges` | `06-grammar.md` |
| `#69-bpmn-process-blocks` | `### 6.9 BPMN Process Blocks` | `06-grammar.md` |
| `#610-layout-tree` | `### 6.10 Layout Tree` | `06-grammar.md` |
| `#7-semantics` | `## 7. Semantics` | `07-semantics.md` |
| `#74-auto-canvas` | `### 7.4 Auto-Canvas` | `07-semantics.md` |

(The file H1 `# Kymo DSL — Clause 7: Semantics` is separate from the retained `## 7.
Semantics` heading; only the latter yields `#7-semantics`, so both are kept.)

**Relative-path depth fix.** `docs/formats/kymo-dsl/` is two levels deeper than
`docs/`, so links *inside* the lifted content gain two `../`:

**Table 4.2 — Path-depth fix (in moved content)**

| Old (in the monolith) | New (in clause file / README) | Where |
|---|---|---|
| `../packages/python/src/kymo/dsl.py` | `../../../packages/python/src/kymo/dsl.py` | §1, README |
| `../packages/python/src/kymo/{model,to_svg,cli}.py` | `../../../packages/python/src/kymo/{…}.py` | §1 |
| `../samples/{aiq,aws_1,data,order-flow}.kymo` | `../../../samples/{…}.kymo` | §10 |

Inter-clause references stay as **"clause N.M" prose** (the README maps clauses to
files) — avoiding fragile cross-file anchor maintenance.

## 5. Link-rewrite design (FR-4)

`KYMO-DSL-001` **id** citations are untouched (they resolve to the README). Only
**path/anchor** links to the deleted monolith change:

**Table 5.1 — Reference groups repointed**

| # | Reference group | Old form | New form |
|---|-----------------|----------|----------|
| 1 | `docs/tools/*.md` (~26) — frontmatter entry, doc-control "Related Documents" row, "factual basis" footer | `../KYMO_DSL.md` (+ display text `` `KYMO_DSL.md` ``) | `../formats/kymo-dsl/README.md` (display text `` `kymo-dsl/` ``) |
| 2 | `docs/guide/dsl-guide.md`, `faq.md` — **deep anchors** | `../KYMO_DSL.md#<frag>` | `../formats/kymo-dsl/06-grammar.md#<frag>` or `…/07-semantics.md#<frag>` (Table 4.1) |
| 3 | `docs/guide/*` — plain links | `../KYMO_DSL.md` | `../formats/kymo-dsl/README.md` |
| 4 | `docs/diagrams/bpmn/README.md` (depth-two) | `../../KYMO_DSL.md` | `../../formats/kymo-dsl/README.md` |
| 5 | `docs/BEST_PRACTICE_DIAGRAMS.md` | ASCII-tree / prose mention | new location (id citations stay `KYMO-DSL-001`) |
| 6 | `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md` | `docs/KYMO_DSL.md` | `docs/formats/kymo-dsl/` (`…/README.md`) |
| 7 | `CHANGELOG.md` (historical), `.github/ISSUE_TEMPLATE/config.yml` (contact URL) | `KYMO_DSL.md` path | `docs/formats/kymo-dsl/06-grammar.md` / `…/README.md` |

Then **delete `docs/KYMO_DSL.md`**. The deep anchors (group 2) are repointed
**before** the plain rewrite (group 3) so the more-specific match wins.

## 6. Versioning & provenance (FR-5)

The restructure is a MINOR change (no grammar change): the index bumps 2.5 → 2.6.
The index's Annex A carries the **full** revision history (1.0 → 2.5) plus a 2.6 row
describing the split, preserving provenance; each clause file's Annex A starts at a
single 2.6 row ("extracted clause N from `KYMO-DSL-001` v2.5"). Issue date
2026-05-25.

## 7. Non-impact on implementation (NFR-3)

No `.py`/`.ts` source references the monolith path (verified by grep), so the parser
pipeline, the renderers, and both test suites are unaffected; `dsl.py` remains the
authoritative reference implementation. The change is documentation-only — `pytest
-q` and `npm test` are expected to be unchanged and are run as a sanity gate (TC-6).
Per `CLAUDE.md`, any future grammar change is still reconciled into the clause files
(now `06-grammar.md` etc.) in lockstep with `dsl.py`.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-25 | Vũ Anh | Initial issue — design of the kymo DSL normative-reference restructure. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-dsl-nref/02-DESIGN.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement ids it traces
(FR-1…5, NFR-1…4) consistent with FEAT-KYMO-NREF-001; increment `version`; append a
row to Annex A.

### B.4 Backwards Compatibility
This describes the intended structure; the normative surfaces are FEAT-KYMO-NREF-001
and `KYMO-DSL-001`. Reconcile any deviation there before release.
