---
title: "Icons CR-003 — Implementation Plan: P2 One generator / single source of truth"
document_id: PLAN-ICONS-CR003
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer implementing P2 (generator in packages/js/scripts + wiring icons.py / icons-loader.ts)
review_cycle: Until CR-ICONS-003 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-003                # CR lead doc — scope (FR-8, FR-10, NFR-1, NFR-3)
  - DESIGN-ICONS-CR003          # CR design
  - TEST-ICONS-CR003            # CR verification
  - PLAN-ICONS-001              # Baseline plan — owns phase P2
  - CR-ICONS-002                # P1 — dependency
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - plan
  - phase-p2
  - generator
  - estimate
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-003 — Implementation Plan (P2)

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-CR003                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-003, DESIGN-ICONS-CR003, TEST-ICONS-CR003, PLAN-ICONS-001, CR-ICONS-002 |

Realises **baseline phase P2** of `PLAN-ICONS-001` (5 pts). **Depends on P1 (CR-ICONS-002)**;
**unblocks P3 (CR-ICONS-004)**. **Status: proposed** — not started.

## 1. Scope and dependency

Promote the JS manifest script into a single generator, wire both packages to its output, retire
the second scanner. **Depends on:** P1 (the key rule + legacy map the generator owns).
**Unblocks:** P3, which enriches the generated artifact into per-set IconifyJSON.

## 2. Work breakdown (sub-steps of P2)

| Step | Work | Reqs | Verifies |
|------|------|------|----------|
| **P2.1** | Promote `build-manifest.mjs` → generator: deterministic enumeration + P1 key rule + legacy-map emission | FR-8 | TC-7 |
| **P2.2** | Scaffold the normalize pipeline hooks (`cleanupSVG → parseColors → SVGO → validate`) as build-time-only deps | NFR-3 | TC-12 |
| **P2.3** | Wire `icons.py` to load the artifact; **delete** `_scan_icons_dir()` self-scan | FR-8, FR-10 | TC-7, TC-9 |
| **P2.4** | Wire `icons-loader.ts` to the generated artifact; parity gate in conformance suite | NFR-1 | TC-7 |
| **P2.5** | CI freshness check: re-run generator, diff vs committed artifact | FR-8 | TC-7 |

## 3. Phase realised in the baseline plan

| ID | Phase | Deliverables | Depends on | Reqs | Points | Status |
|----|-------|--------------|------------|------|--------|--------|
| **P2** | One generator / single source of truth | Generator emitting one artifact; both packages consume it; second scanner retired; parity gated | P1 | FR-8, FR-10, NFR-1, NFR-3 | 5 | ⬜ Planned |

## 4. Risks and mitigations

- **Generator non-determinism** — unstable ordering breaks diffs/parity. *Mitigation:* sorted keys,
  normalized whitespace; CI freshness check (P2.5).
- **Runtime-dep creep** — pulling SVGO/tools into runtime violates NFR-3. *Mitigation:* generator
  deps are `devDependencies`; TC-12 gates.
- **Behaviour change on rewire** — switching `icons.py` off its self-scan could change resolution.
  *Mitigation:* the artifact reproduces the P1 rule exactly; conformance parity (TC-7) gates.

## 5. Verification

Cases TC-7, TC-9, TC-12 and the traceability slice are in **TEST-ICONS-CR003**.

## 6. Close-out

On completion: flip the **P2** row of `PLAN-ICONS-001` §3 to **Done**, append an Annex C worklog
row, set this CR (lead **CR-ICONS-003**) to **Closed**. No requirement re-base.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — plan for P2 (sub-steps P2.1..P2.5), 5 pts, depends on P1; unblocks P3. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-003/04-PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On phase progress: update the affected step/phase row; keep requirement/test IDs consistent with
CR-ICONS-003 / TEST-ICONS-CR003; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-ICONS-001 and DESIGN-ICONS-001.
