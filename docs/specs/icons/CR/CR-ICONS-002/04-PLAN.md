---
title: "Icons CR-002 — Implementation Plan: P1 Namespace `prefix:name` + aliases"
document_id: PLAN-ICONS-CR002
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer implementing P1 (packages/python icons.py + packages/js icons-loader.ts / build-manifest.mjs)
review_cycle: Until CR-ICONS-002 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-002                # CR lead doc — scope (FR-1, FR-4, FR-11)
  - DESIGN-ICONS-CR002          # CR design
  - TEST-ICONS-CR002            # CR verification
  - PLAN-ICONS-001              # Baseline plan — owns phase P1 (this CR realises it)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - plan
  - phase-p1
  - namespacing
  - estimate
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-002 — Implementation Plan (P1)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-CR002                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-002, DESIGN-ICONS-CR002, TEST-ICONS-CR002, PLAN-ICONS-001 |

Realises **baseline phase P1** of `PLAN-ICONS-001` (5 pts). P1 is the **lead phase** — no
dependency; it unblocks P2 (CR-ICONS-003). **Status: proposed** — not started.

## 1. Scope and dependency

Add `prefix:name` addressing + aliases + a legacy compatibility map to both packages.
**Depends on:** nothing. **Unblocks:** P2 (one generator), which folds the compatibility map and
key rule into the generator.

## 2. Work breakdown (sub-steps of P1)

| Step | Work | Reqs | Verifies |
|------|------|------|----------|
| **P1.1** | Path → `prefix:name` rule (retain category) in `_scan_icons_dir` + `build-manifest.mjs`; `prefix:name` validation | FR-1 | TC-1 |
| **P1.2** | Alias table + resolver (parent chain, transform compose, cycle guard) in both packages | FR-4 | TC-3 |
| **P1.3** | Legacy `<provider>-<name>` → address compatibility map (1:1 + collision targets preserved) | FR-11 | TC-10 |
| **P1.4** | Byte-stability guard: confirm unaffected diagrams render identical bytes; parity in conformance suite | NFR-1, NFR-2 | TC-11, TC-7 |

## 3. Phase realised in the baseline plan

| ID | Phase | Deliverables | Depends on | Reqs | Points | Status |
|----|-------|--------------|------------|------|--------|--------|
| **P1** | Namespace `prefix:name` + aliases | `prefix:name` key; alias resolver; legacy compatibility map; both packages at parity | — | FR-1, FR-4, FR-11 | 5 | ⬜ Planned |

## 4. Risks and mitigations

- **Collision-target ambiguity** — choosing which icon a legacy key maps to could change rendered
  output. *Mitigation:* legacy key resolves to the **same** target old last-write-wins returned
  (TC-10/TC-11); the others gain new addresses (TC-1).
- **Cross-language drift** — two resolvers could diverge on alias/transform composition.
  *Mitigation:* single shared algorithm + golden conformance with Python as sole writer (TC-7).
- **Name-join convention** — the path→name join (category retention) must be deterministic and
  documented so P2's generator reproduces it exactly. *Mitigation:* DESIGN-ICONS-CR002 §2 fixes the
  rule; P2 consumes it.

## 5. Verification

Cases TC-1, TC-3, TC-10 (+TC-11 guard) and the traceability slice are in **TEST-ICONS-CR002**.

## 6. Close-out

On completion: flip the **P1** row of `PLAN-ICONS-001` §3 to **Done**, append an Annex C worklog
row, and set this CR (lead **CR-ICONS-002**) to **Closed**. No requirement re-base (P1 adds none).

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — plan for P1 (sub-steps P1.1..P1.4), 5 pts, no dependency; unblocks P2. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-002/04-PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On phase progress: update the affected step/phase row; keep requirement/test IDs consistent with
CR-ICONS-002 / TEST-ICONS-CR002; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-ICONS-001 and DESIGN-ICONS-001.
