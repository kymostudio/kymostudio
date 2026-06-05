---
title: "Icons CR-004 — Implementation Plan: P3 IconifyJSON manifest + on-demand loading"
document_id: PLAN-ICONS-CR004
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer implementing P3 (IconifyJSON emit in the generator + batched loader in icons-loader.ts / icons.py)
review_cycle: Until CR-ICONS-004 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-004                # CR lead doc — scope (FR-2, FR-3, FR-5, FR-9, NFR-4)
  - DESIGN-ICONS-CR004          # CR design
  - TEST-ICONS-CR004            # CR verification
  - PLAN-ICONS-001              # Baseline plan — owns phase P3
  - CR-ICONS-003                # P2 — dependency
  - CR-ICONS-001                # P6 CLI — dependent (gated behind this phase)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - plan
  - phase-p3
  - iconify-json
  - estimate
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-004 — Implementation Plan (P3)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-CR004                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-004, DESIGN-ICONS-CR004, TEST-ICONS-CR004, PLAN-ICONS-001, CR-ICONS-003, CR-ICONS-001 |

Realises **baseline phase P3** of `PLAN-ICONS-001` (8 pts). **Depends on P2 (CR-ICONS-003)**;
**unblocks P4 (CR-ICONS-005) and the CLI P6 (CR-ICONS-001)**. **Status: proposed** — not started.

## 1. Scope and dependency

Emit per-set IconifyJSON with metadata; add the batched/cached on-demand loader. **Depends on:** P2
(the generator emits this). **Unblocks:** P4 (records carry dims for crisp render) and **P6**
(`kymo icons list/search/describe` read this metadata).

## 2. Work breakdown (sub-steps of P3)

| Step | Work | Reqs | Verifies |
|------|------|------|----------|
| **P3.1** | Generator emit-IconifyJSON: per-set `prefix`/root defaults/`icons`/`aliases`/`info` | FR-2 | TC-2 |
| **P3.2** | Sparse + minify-to-root pass (dims/transforms hoisted; per-icon only when differing) | FR-3 | TC-2 |
| **P3.3** | Attach searchable metadata: counts, author, license, categories, tags | FR-5 | TC-4 |
| **P3.4** | JS loader: collect → batch (one request/prefix) → cache `{icons, missing}` (memory + localStorage) | FR-9, NFR-4 | TC-8 |
| **P3.5** | Python loader: load per-set JSON for referenced prefixes, cached; parity in conformance | NFR-1 | TC-8, TC-2 |

## 3. Phase realised in the baseline plan

| ID | Phase | Deliverables | Depends on | Reqs | Points | Status |
|----|-------|--------------|------------|------|--------|--------|
| **P3** | IconifyJSON manifest + on-demand loading | Per-set IconifyJSON with dims/aliases/`info`/tags; batched fetch + cache + `missing` set | P2 | FR-2, FR-3, FR-5, FR-9, NFR-4 | 8 | ⬜ Planned |

## 4. Risks and mitigations

- **Sparse/minify divergence** — Python and JS could resolve effective dims differently.
  *Mitigation:* one minify rule in the generator; conformance compares resolved records (TC-2).
- **Metadata gaps** — some sets lack tags/license. *Mitigation:* present-but-empty fields stay
  queryable (TC-4); document the gap per set.
- **Loader over-fetch** — naive loading could pull the whole catalogue. *Mitigation:* batch per
  prefix, cache, `missing` set; TC-8 asserts only referenced icons are fetched.
- **Blocks the CLI** — P6 cannot ship its read-trio meaningfully until P3 lands. *Mitigation:*
  prioritise P3.1–P3.3 (the metadata) so CR-ICONS-001 can start against a real manifest.

## 5. Verification

Cases TC-2, TC-4, TC-8 and the traceability slice are in **TEST-ICONS-CR004**.

## 6. Close-out

On completion: flip the **P3** row of `PLAN-ICONS-001` §3 to **Done**, append an Annex C worklog
row, set this CR (lead **CR-ICONS-004**) to **Closed**, and notify CR-ICONS-001 (CLI) that its gate
is cleared. No requirement re-base.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — plan for P3 (sub-steps P3.1..P3.5), 8 pts, depends on P2; unblocks P4 and the CLI (P6). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-004/04-PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On phase progress: update the affected step/phase row; keep requirement/test IDs consistent with
CR-ICONS-004 / TEST-ICONS-CR004; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-ICONS-001 and DESIGN-ICONS-001.
