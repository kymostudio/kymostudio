---
title: "BPMN Editor CR-001 — Implementation Plan (close-out): Pools & lanes"
document_id: PLAN-BPMN-EDITOR-CR-001
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineer closing CR-001 (pools & lanes)
review_cycle: Until CR-001 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-BPMN-EDITOR-CR-001
  - FEAT-BPMN-EDITOR-CR-001
  - DESIGN-BPMN-EDITOR-CR-001
  - TEST-BPMN-EDITOR-CR-001
  - PLAN-BPMN-EDITOR-001
  - FEAT-BPMN-EXPORT-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - close-out
  - change-request
  - risk-register
  - story-points
  - worklog
  - bpmn-editor
  - pools
  - lanes
---

# BPMN Editor CR-001 — Implementation Plan (close-out): Pools & lanes

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-BPMN-EDITOR-CR-001` |
| Version           | 0.1 |
| Status            | **Proposed** — awaiting v1 baseline + approval |
| Owner             | `diagrams/` project |
| Entry gate        | **CR-001 approved** (`INTRO-BPMN-EDITOR-CR-001 §5`) and the v1 spec baselined. No code begins before both. |
| Related Documents | `FEAT-BPMN-EDITOR-CR-001` (requirements), `DESIGN-BPMN-EDITOR-CR-001` (design), `TEST-BPMN-EDITOR-CR-001` (V&V), `PLAN-BPMN-EDITOR-001` (the baselined plan re-baselined at close-out) |

---

## 1. Context

The delivery layer for CR-001: implement the laning model (pools, lanes, membership, cross-pool message
flows), prove it (E2E + round-trip + regression), then re-baseline the parent `BPMN-EDITOR-001` clauses.
Client-only, renderer-safe, zero new deps. Run Playwright before shipping (`npm run test:e2e`).

## 2. Decision

Build per `DESIGN-BPMN-EDITOR-CR-001`. The largest deferred item — if it grows past a comfortable
size it stays its own mini-spec (it already is). The one cross-feature watch-point is the `toBpmn`
collaboration round-trip (`§3` exit).

## 3. Phased plan

Sequencing `1 → 2 → 3`. Story points (~13 SP).

| Phase | Goal | SP |
|-------|------|----|
| **P1 — Pools & lanes** | Pool/participant creator + lane add/resize/reorder; membership by drag. | 8 |
| **P2 — Message flows + round-trip** | Cross-pool `messageFlow` selection; verify `toBpmn`/`parseBpmn` round-trip. | 3 |
| **P3 — Re-baseline + close** | Fold `FR-CR1`/`NFR-CR1` into the parent; reconcile §3 clauses; close CR-001. | 2 |

## 4. Risk register

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| `RK-CR1-01` | Lane resize/reorder geometry desyncs pool bounds or member positions | Med | Med | Recompute pool bounds from lanes on every change; snapshot tests on geometry (`TC-CR1-02`). |
| `RK-CR1-02` | Lane membership / message flows do not round-trip through `toBpmn`/`parseBpmn` | Med | High | `TC-CR1-05` re-imports the export; if a gap surfaces, raise an exporter sub-task against `FEAT-BPMN-EXPORT-001`. |
| `RK-CR1-03` | Renderer churn from pool/lane styling | Low | High | All change in `website/app/*`; goldens + corpus baseline run in P2 (`NFR-CR1-01`). |
| `RK-CR1-04` | Scope creep into collapsed pools / choreography | Low | Med | Hard non-goals stand (`FEAT-BPMN-EDITOR-CR-001 §4`). |

## 5. Files to create / modify

| File | Change |
|------|--------|
| `website/app/src/ui/tools.ts` | Add pool/lane creators to the BPMN palette group. |
| `website/app/src/ui/ContextPad.tsx` | Add "add lane" + pool actions. |
| `website/app/src/engine/bpmn-tools.ts` | Pool/lane placement + lane geometry. |
| `website/app/src/engine/bpmn-ops.ts` | Lane membership; cross-pool message-flow selection. |
| `website/app/e2e/*` | `TC-CR1-01..06`. |
| parent `BPMN-EDITOR-001` docs + `CHANGE-REQUESTS/README.md` | P3 re-baseline + register close. |

## 6. Verification (close-out gate)

Closes when `TEST-BPMN-EDITOR-CR-001 §2/§4` pass: pools/lanes/membership/cross-pool flows work; export
→ re-import equivalent; goldens + corpus baseline byte-stable; render-guard green; parent re-baselined;
`INTRO-BPMN-EDITOR-CR-001` status = Closed; register row = Closed.

## 7. Change-control / close-out

CR-001 is a change against the baselined `BPMN-EDITOR-001` (`FEAT-BPMN-EDITOR-001` Annex B). At close-out
the parent clauses named in `INTRO-BPMN-EDITOR-CR-001 §3` are reconciled, each parent doc's version +
Annex A updated, and the `CHANGE-REQUESTS/README.md` register row flipped to **Closed**.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Close-out plan: P1 pools/lanes → P2 message flows + round-trip → P3 re-baseline, ~13 SP; risk register `RK-CR1-01..04`; files; close-out gate. Contingent on v1 baseline + CR-001 approval. |

## Annex B — Worklog

Append-only (newest at the bottom). `Status`: ✅ done · 🚧 in progress · ⏳ pending.

| Date | Phase | Work | Status |
|------|-------|------|--------|
| 2026-05-31 | — | CR-001 mini-spec authored (`01-INTRO`/`02-REQUIREMENT`/`03-DESIGN`/`04-TEST`/`05-PLAN`, `BPMN-EDITOR-CR-001` series); Proposed, awaiting v1 baseline + approval. | ✅ |
