---
title: "Icons CR-006 — Design: catalogue-format doc, spec reconciliation & gate wiring"
document_id: DESIGN-ICONS-CR006
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers authoring the normative catalogue-format doc and wiring the conformance/golden/freshness gates
review_cycle: Until CR-ICONS-006 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-006                # CR lead doc — scope (all FR/NFR via release + gates)
  - TEST-ICONS-CR006            # CR verification
  - PLAN-ICONS-CR006            # CR plan
  - DESIGN-ICONS-001            # Baseline design — §8 parity
  - TEST-ICONS-001              # Baseline test — full suite
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - documentation
  - conformance
  - golden
  - ci-gates
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-006 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-CR006                                 |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-006, TEST-ICONS-CR006, PLAN-ICONS-CR006, DESIGN-ICONS-001, TEST-ICONS-001 |

Realises **CR-ICONS-006**. The finalisation slice: the normative doc, the reconciliation pass, and
the CI gate wiring.

## 1. Scope

The normative catalogue-format document, a citation-integrity check over `docs/specs/icons/`, and
the CI wiring of the conformance / golden / generator-freshness gates. Out of scope: any behaviour
or format change (P3/P4 own the format).

## 2. Normative catalogue-format doc

A single authoritative document (e.g. `docs/formats/icons.md` or a baseline §) describing:

- the per-set **IconifyJSON** shape (`prefix`, root defaults, `icons`, `aliases`, `info`/tags);
- the **`prefix:name`** key rule and the path→address mapping;
- the **alias** model (parent chain, transforms, cycle guard);
- the **generated artifact** contract (deterministic, what consumers may rely on);
- the **legacy compatibility** mapping.

Downstream tooling (renderer, loader, CLI) cites this doc rather than re-describing the format.

## 3. Spec-set reconciliation

- **Citation integrity** — a check that every `document_id` referenced in any
  `docs/specs/icons/**` front-matter / body resolves to an existing document (no dangling
  references). Run as a doc-lint in CI.
- **Phase-status truth** — each phase CR's close-out has flipped its `PLAN-ICONS-001` row to Done
  and appended Annex C; P5 verifies the plan reflects reality.
- **CLI re-base** — on CR-ICONS-001 (CLI) close, FR-12..15 are folded into `FEAT-ICONS-001` and
  TC-13..16 into `TEST-ICONS-001` (preserving IDs); P5 confirms the fold is complete.

## 4. Gate wiring (CI)

| Gate | What it enforces | Source |
|------|------------------|--------|
| Conformance | resolved-record parity Python↔JS (Python sole writer) | TC-7, NFR-1 |
| Golden SVG / BPMN-corpus | byte-stable output for unaffected diagrams | TC-11, NFR-2 |
| Generator freshness | committed artifact == re-generated artifact | FR-8 |
| No unreachable icons | source-icon count == addressable-key count | TC-1 |
| Doc-lint | every `document_id` citation resolves | this CR |

All gates green is the release precondition.

## 5. Release

Move the spec set's `status` from Draft to **Released** once the gates are green and citations
resolve. Record the release in each document's Annex A.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — normative-doc structure, citation-integrity check, CI gate wiring, release procedure for P5. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-006/02-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep traces consistent with CR-ICONS-006; increment
`version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes documentation + gates; the normative surface is FEAT-ICONS-001.
