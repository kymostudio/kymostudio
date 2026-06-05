---
title: "Icons CR-006 — P5 Docs & gates: scope, rationale & schedule"
document_id: CR-ICONS-006
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: kymo Icons v2 maintainers / reviewers; engineers finalising the catalogue-format doc and wiring conformance/golden gates
review_cycle: Until closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - DESIGN-ICONS-CR006          # CR design — CR-ICONS-006/02-DESIGN
  - TEST-ICONS-CR006            # CR verification (full suite green + citation integrity) — CR-ICONS-006/03-TEST
  - PLAN-ICONS-CR006            # CR plan (phase P5) — CR-ICONS-006/04-PLAN
  - FEAT-ICONS-001              # Baseline requirements — realises all FR/NFR (doc & gate finalisation)
  - DESIGN-ICONS-001            # Baseline design
  - TEST-ICONS-001              # Baseline test — full TC-1..TC-12
  - PLAN-ICONS-001              # Baseline plan — phase P5
  - CR-ICONS-002                # P1
  - CR-ICONS-003                # P2
  - CR-ICONS-004                # P3
  - CR-ICONS-005                # P4
  - CR-ICONS-001                # P6 CLI
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - documentation
  - conformance
  - gates
  - release
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Icons CR-006 — P5 Docs & gates

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | CR-ICONS-006                                       |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-CR006, TEST-ICONS-CR006, PLAN-ICONS-CR006, FEAT-ICONS-001, DESIGN-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, CR-ICONS-002, CR-ICONS-003, CR-ICONS-004, CR-ICONS-005, CR-ICONS-001 |

> **Implementation change-request** realising **baseline phase P5** (the finalisation phase) of
> `PLAN-ICONS-001`. Adds **no requirement**: it produces the **normative catalogue-format
> document**, reconciles the full spec set, and wires the **conformance/golden gates** that hold the
> whole feature — i.e. it closes out **all** FR/NFR by making the doc set *Released* and the gates
> *green*. **Status: Open** — raised, not started; **depends on P1–P4 (CR-002..005)** and on the
> CLI **P6 (CR-ICONS-001)** for the complete picture. Sibling layers:
> [`02-DESIGN`](02-DESIGN.md) (`DESIGN-ICONS-CR006`) ·
> [`03-TEST`](03-TEST.md) (`TEST-ICONS-CR006`) ·
> [`04-PLAN`](04-PLAN.md) (`PLAN-ICONS-CR006`, phase P5).

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions.

## 1. Motivation

Icons v2 is specified across requirements/design/test/plan plus six CR folders; once P1–P4 (and the
CLI P6) land, the feature needs a **normative catalogue-format document** (the single authoritative
description of the per-set IconifyJSON shape, the key rule, aliases, and the generated artifact),
the spec set **reconciled** (every cross-document `document_id` citation resolves; the phase rows in
`PLAN-ICONS-001` reflect reality), and the **conformance/golden gates** wired so the guarantees
(no unreachable icons, record parity, byte-stable goldens) are enforced by CI, not by trust. P5 is
that finalisation.

## 2. Change (summary)

- **Normative catalogue-format doc** — author the authoritative spec of the catalogue artifact
  (format, key rule, aliases, info/tags, generator contract) that downstream tooling cites.
- **Reconcile the spec set** — verify all `document_id` citations resolve; ensure each phase CR's
  close-out flipped its `PLAN-ICONS-001` row to Done; fold the CR-ICONS-001 (CLI) FR-12..15 into
  `FEAT-ICONS-001` on its close.
- **Wire the gates** — conformance (record parity, Python sole writer), golden SVG / BPMN-corpus
  byte-stability, and the generator-freshness check are green and CI-enforced.
- **Release** — move the doc set from Draft to Released.

The doc structure, the citation-integrity check, and the gate wiring are in **DESIGN-ICONS-CR006**.

## 3. Baseline requirements realised (no new requirement)

P5 does not realise a single FR slice; it **finalises all of them** by releasing the docs and
enforcing the gates. Verification is the **full** TC-1..TC-12 (and TC-13..16 once the CLI lands)
remaining green, plus citation integrity across the spec set.

## 4. Constraints, assumptions, out-of-scope

- **Depends on P1–P4 (and P6).** P5 cannot mark the doc set Released until the phases it documents
  have landed and their gates pass.
- **No new behaviour.** P5 is documentation + gate wiring only; it SHALL NOT change rendered output
  or the catalogue format (it *describes* the format fixed in P3/P4).
- **Citation integrity** — every `document_id` reference in the spec set SHALL resolve to an
  existing document.

## 5. Acceptance

- The normative catalogue-format doc exists and is cited by the implementation.
- Every `document_id` citation across `docs/specs/icons/` (baseline + all CRs) resolves.
- Conformance + golden + generator-freshness gates are green and CI-enforced.
- The doc set is **Released**; `PLAN-ICONS-001` phase rows reflect actual status.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-05 | Vũ Anh | **Raised (Open).** Maps baseline phase P5 onto an implementation CR finalising docs + gates; depends on P1–P4 (CR-002..005) and the CLI (CR-001). Not started. |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial raise — P5 docs & gates (normative catalogue-format doc, spec-set reconciliation, gate wiring, release), mapped from PLAN-ICONS-001 phase P5. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-006/01-REQUIREMENTS.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
Implementation CR; no requirement IDs of its own. On completion, flip the P5 row of
`PLAN-ICONS-001` to Done + append Annex C, and move the doc set to Released. Until then, edits
increment `version` and append to Annex A.

### B.4 Backwards Compatibility
Realises all FR/NFR via release + gates; mints/alters no ID.
