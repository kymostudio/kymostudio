# Kymo DSL — Language Specification (Index)

This folder is the **normative reference for the Kymo DSL** — the textual surface
language for declaring architecture diagrams. A conforming source file (`.kymo`)
declares the leaves, containers (region and layout), and edges of a single diagram;
a conforming parser produces an in-memory `model.Diagram` semantically equivalent to
the source.

Its structure follows **ISO/IEC/IEEE 15289:2019**, organised **clause-by-clause** —
one file per clause — so a reader can go straight from a clause number to its file
(the same layout as the BPMN normative set). Grammar productions
follow **ISO/IEC 14977:1996** (Extended Backus–Naur Form); the full grammar is
clause 6.

> **Authoritative source.** The reference parser
> [`dsl.py`](../../../packages/python/src/kymo/dsl.py) is the normative reference
> implementation. Where this reference and the implementation disagree, the
> implementation is authoritative for behaviour and this reference SHALL be updated
> to match (clause 1.3). The grammar is **dual-sourced**: `dsl.py` and this set are
> kept in lockstep on any grammar change.

## Contents — the 10 clauses

| Clause | File | `document_id` |
|---|---|---|
| 1 — Scope | [`01-scope.md`](01-scope.md) | `KYMO-DSL-SCOPE-001` |
| 2 — Normative References | [`02-normative-references.md`](02-normative-references.md) | `KYMO-DSL-NORMREF-001` |
| 3 — Terms and Definitions | [`03-terms-and-definitions.md`](03-terms-and-definitions.md) | `KYMO-DSL-TERMS-001` |
| 4 — Abbreviations | [`04-abbreviations.md`](04-abbreviations.md) | `KYMO-DSL-ABBR-001` |
| 5 — Lexical Conventions | [`05-lexical-conventions.md`](05-lexical-conventions.md) | `KYMO-DSL-LEX-001` |
| 6 — Grammar | [`06-grammar.md`](06-grammar.md) | `KYMO-DSL-GRAMMAR-001` |
| 7 — Semantics | [`07-semantics.md`](07-semantics.md) | `KYMO-DSL-SEMANTICS-001` |
| 8 — Authoring Conventions | [`08-authoring-conventions.md`](08-authoring-conventions.md) | `KYMO-DSL-AUTHORING-001` |
| 9 — Conformance | [`09-conformance.md`](09-conformance.md) | `KYMO-DSL-CONF-001` |
| 10 — Examples | [`10-examples.md`](10-examples.md) | `KYMO-DSL-EXAMPLES-001` |

## Companion documents

| File / id | What |
|---|---|
| `KYMO-FMT-001` (`docs/formats/kymo.md`) | `.kymo` source format-catalog reference (identification, structure survey, tooling). |
| `KYMOJSON-MAP-001` (`docs/formats/kymo.json.md`) | `.kymo.json` — serialization of the resolved `model.Diagram` this DSL produces. |
| `BPD-DGM-001` (`docs/BEST_PRACTICE_DIAGRAMS.md`) | Architecture-diagram best practices — design rationale and worked examples. |
| `INTRO`/`FEAT`/`DESIGN`/`TEST`/`PLAN-KYMO-DSL-001` | The DSL front-end engineering set (the parse → layout → alignment pipeline this grammar specifies). |
| `INTRO`/`FEAT`/`DESIGN`/`TEST`/`PLAN-KYMO-NREF-001` (`docs/specs/kymo-syntax/modules/nref/`) | The engineering set for **this** normative-reference restructure. |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author      | Changes              |
|---------|------------|-------------|----------------------|
| 1.0     | 2026-05-18 | Vũ Anh      | Initial specification. |
| 2.0     | 2026-05-18 | Vũ Anh      | **Breaking grammar change.** Removed `component`, `region`, `layout` keywords — the parser now disambiguates by line shape (clause 6.6). Containers nest; a region body may hold inline leaves, bare-id references, and nested containers; an outer region's `contains` is flattened from nested regions (clause 7.3.1). Added `icon` region option (was implementation-only). Reserved tokens updated (clause 6.8). |
| 2.1     | 2026-05-23 | Vũ Anh      | Added the `bpmn { }` process-block grammar (clause 6.9) — node kinds, flow arrows (`->`/`~>`/`..>`), chains, `type=`, `@` pins — with automatic left-to-right (Sugiyama) layout. Design/algorithm: DESIGN-BPMN-DSL-001. |
| 2.2     | 2026-05-24 | Vũ Anh      | Documented existing parser features the spec had omitted: the anonymous `layout { … }` tree block (clause 6.10; `layout` re-listed as reserved, clause 6.8), the region `horizontal`/`vertical` auto-layout option (clause 6.5.3), and the edge `shared`/`straight`/`elbow` flags (clause 6.7). Noted that `shape`/`accent` are render-validated, not parser-enforced (clause 6.4). Corrected source paths to the `packages/python/src/kymo/` monorepo layout; cite `BPD-DGM-001` by document_id. |
| 2.3     | 2026-05-24 | Vũ Anh      | Added `KYMOJSON-MAP-001` (the `.kymo.json` serialization of the resolved model this DSL produces) to related documents. |
| 2.4     | 2026-05-24 | Vũ Anh      | Added the kymo DSL front-end engineering doc set (`INTRO`/`FEAT`/`DESIGN`/`TEST`/`PLAN-KYMO-DSL-001`) to related documents — the descriptive REQ/DSN/TST/PLAN set for the parse → layout → alignment pipeline this grammar specifies. |
| 2.5     | 2026-05-24 | Vũ Anh      | Added `KYMO-FMT-001` (the `.kymo` source format-catalog reference under `docs/formats/`) to related documents, completing the formats catalog alongside `KYMOJSON-MAP-001` and `BPMN-MAP-001`. |
| 2.6     | 2026-05-25 | Vũ Anh      | **Restructured into a clause-per-file normative-reference set** under `docs/formats/kymo-dsl/`, mirroring the BPMN set: this index (retaining `document_id: KYMO-DSL-001`) + ten clause files (`KYMO-DSL-<X>-001`), each carrying its own doc-control Annex A/B. The prior monolithic single-file specification is superseded; every link to it in the repository was repointed here. No grammar or semantic change (the §1–§10 content is lifted verbatim from v2.5). Engineering doc set: `*-KYMO-NREF-001`. |

## Annex B — Document Control

### B.1 Storage and Retrieval

This document is version-controlled within the project repository at
`docs/formats/kymo-dsl/README.md`. The authoritative source is the working tree of
the main branch; archived versions are accessible via repository history
(`git log`).

### B.2 Distribution

Distribution is implicit — the set is checked in alongside the parser it specifies.
Any engineer with read access to the repository has access to the current revision.

### B.3 Change Control

Changes to this specification require:

1. Update of the relevant clause file(s).
2. Update of the reference parser (`dsl.py`) to match.
3. Increment of `version` in the affected file(s) (semantic: MAJOR for breaking
   grammar changes, MINOR for additions, PATCH for clarifications).
4. Append a row to the **Annex A — Revision History** of each changed file (and of
   this index when the set's shape changes).
5. If a grammar production is added or modified, update the EBNF in clause 6
   (`06-grammar.md`).

### B.4 Backwards Compatibility

Grammar changes SHOULD preserve the ability to parse all conforming files of the
previous MINOR version. Where a breaking change is unavoidable, the MAJOR version
SHALL increment and a migration note SHALL appear in the revision history.
