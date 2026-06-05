---
title: "Icons CR-006 — Implementation Plan: P5 Docs & gates"
document_id: PLAN-ICONS-CR006
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer finalising the catalogue-format doc, reconciling the spec set, and wiring CI gates
review_cycle: Until CR-ICONS-006 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-006                # CR lead doc — scope (all FR/NFR via release + gates)
  - DESIGN-ICONS-CR006          # CR design
  - TEST-ICONS-CR006            # CR verification
  - PLAN-ICONS-001              # Baseline plan — owns phase P5
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
  - plan
  - phase-p5
  - docs
  - gates
  - estimate
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-006 — Implementation Plan (P5)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-CR006                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-006, DESIGN-ICONS-CR006, TEST-ICONS-CR006, PLAN-ICONS-001, CR-ICONS-002, CR-ICONS-003, CR-ICONS-004, CR-ICONS-005, CR-ICONS-001 |

Realises **baseline phase P5** of `PLAN-ICONS-001` (3 pts). **Depends on P1–P4 (CR-002..005)** and
the CLI **P6 (CR-ICONS-001)**; it is the **last** phase. **Status: proposed** — not started.

## 1. Scope and dependency

Author the normative catalogue-format doc, reconcile the spec set (citation integrity + phase
status), wire and green the CI gates, move the doc set to Released. **Depends on:** all other
phases having landed (it documents and gates them). **Unblocks:** nothing (terminal phase).

## 2. Work breakdown (sub-steps of P5)

| Step | Work | Verifies |
|------|------|----------|
| **P5.1** | Author the normative catalogue-format doc (format, key rule, aliases, info/tags, artifact contract) | RELEASE |
| **P5.2** | Doc-lint: citation-integrity check over `docs/specs/icons/**`; fix dangling references | DOC-LINT |
| **P5.3** | Confirm each phase CR flipped its `PLAN-ICONS-001` row to Done; fold CLI FR-12..15 into FEAT-ICONS-001 | DOC-LINT |
| **P5.4** | Wire CI gates: conformance, golden SVG/BPMN, generator-freshness, no-unreachable | GATE-CI |
| **P5.5** | Move spec set `status` Draft → Released; record in Annex A | RELEASE |

## 3. Phase realised in the baseline plan

| ID | Phase | Deliverables | Depends on | Reqs | Points | Status |
|----|-------|--------------|------------|------|--------|--------|
| **P5** | Docs & gates | Normative catalogue-format doc; reconciled spec set; conformance/golden gates wired | P1–P4 (+P6) | all | 3 | ⬜ Planned |

## 4. Risks and mitigations

- **Premature release** — releasing before a gate is green hides regressions. *Mitigation:* RELEASE
  requires all gates green (TEST-ICONS-CR006).
- **Dangling citations** — the CR-heavy structure multiplies `document_id` references.
  *Mitigation:* doc-lint in CI (P5.2) gates every reference.
- **Stale plan rows** — phase status could lag actual work. *Mitigation:* P5.3 reconciles each CR's
  close-out against `PLAN-ICONS-001`.

## 5. Verification

The full suite green + DOC-LINT + GATE-CI + RELEASE checks are in **TEST-ICONS-CR006**.

## 6. Close-out

On completion: flip the **P5** row of `PLAN-ICONS-001` §3 to **Done**, append an Annex C worklog
row, move the doc set to **Released**, set this CR (lead **CR-ICONS-006**) to **Closed**.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — plan for P5 (sub-steps P5.1..P5.5), 3 pts, depends on P1–P4 and the CLI; terminal phase. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-006/04-PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On phase progress: update the affected step/phase row; keep checks consistent with CR-ICONS-006 /
TEST-ICONS-CR006; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-ICONS-001 and DESIGN-ICONS-001.
