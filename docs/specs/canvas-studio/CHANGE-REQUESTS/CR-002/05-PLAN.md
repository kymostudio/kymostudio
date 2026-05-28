---
title: "Canvas Studio CR-002 — Implementation Plan (close-out)"
document_id: PLAN-STUDIO-002
version: "0.1"
issue_date: 2026-05-27
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer closing CR-002 (canvas-studio editor-chrome simplification)
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-STUDIO-002
  - FEAT-STUDIO-002
  - DESIGN-STUDIO-002
  - TEST-STUDIO-002
  - PLAN-STUDIO-001
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
  - canvas-studio
---

# Canvas Studio CR-002 — Implementation Plan (close-out)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-STUDIO-002` |
| Version           | 0.1 |
| Status            | **Open** — drafted; phases not started |
| Owner             | `diagrams/` project |
| Entry gate        | **CR-002 approved** (`INTRO-STUDIO-002 §5`). No code begins before approval. |
| Related Documents | `FEAT-STUDIO-002` (requirements), `DESIGN-STUDIO-002` (design), `TEST-STUDIO-002` (V&V), `PLAN-STUDIO-001` (the baselined plan re-baselined at close-out) |

---

## 1. Context

The delivery layer for CR-002: implement the three editor-chrome changes (single `Code` toggle; default
code-hidden; code pane on the right), prove them (E2E + goldens), then re-baseline the parent
`STUDIO-001` clauses so the spec matches the shipped chrome. **Client-only**, golden-safe, zero new
deps — same constraints as `PLAN-STUDIO-001`. Honour the "run Playwright before shipping web-app
changes" lesson: `npm run test:e2e` green locally before ship.

## 2. Decision

Build the change in `website/app/` exactly per `DESIGN-STUDIO-002 §2–§4`, then re-baseline. Small,
contained, golden-safe — no architectural choice to make; the only judgement calls are the open
questions in `DESIGN-STUDIO-002 §7` (`RK-CR2-Q1`: keep the `Code` label/icon).

## 3. Phased plan

Sequencing `1 → 2 → 3`. Story points (~4 SP total).

| Phase | Goal | SP |
|-------|------|----|
| **P1 — Implement** (`DESIGN §2–§4`) | Single `Code` toggle; default code-hidden; code pane right. | 2 |
| **P2 — V&V** (`TEST-STUDIO-002`) | `TC-CR2-01..03` green; goldens byte-identical; render-guard green. | 1 |
| **P3 — Re-baseline + close** | Reconcile parent clauses; close CR-002. | 1 |

- **P1:** `ui/TopBar.tsx` remove `tab-preview` + drop `Play` import; `App.tsx:36` `useState(false)` +
  reorder panes (`view` before `editor`); `index.html` grid `1fr minmax(280px, 38%)` + `.pane.editor`
  `border-left` (+ responsive flip). Rebuild & commit `website/app/kymo.bundle.js`.
- **P2:** add/revise `TC-CR2-01..03` in `e2e/chrome.spec.ts`; `npm run test:e2e` all green; JS + Python
  goldens byte-identical; chrome-anhv spot-check (light + dark): canvas-first on load, code docks right,
  single `Code` control, 0 console errors.
- **P3:** edit the parent baseline — `FEAT-STUDIO-001` (`FR-CS-02`/`FR-CS-07`/§5 #6),
  `DESIGN-STUDIO-001` (§1/§3/§8/§11), `TEST-STUDIO-001` (`TC-CS-02`/`TC-CS-07`), `PLAN-STUDIO-001`
  (§4 P2/P7 note), bumping each version + Annex A; flip `INTRO-STUDIO-002` status **Open → Closed** and
  fill its §5 decision log; update the `CHANGE-REQUESTS/README.md` register row to **Closed**.

## 4. Risk register

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| `RK-CR2-01` | Rebuilt bundle / CSS churns committed `kymo.bundle.js` beyond intent | Med | Low | Diff the bundle; change confined to chrome React + CSS; `renderSVG` untouched. |
| `RK-CR2-02` | Removing `tab-preview` / reordering panes breaks existing E2E selectors | Med | Med | Update `chrome.spec.ts` in lockstep; run `test:e2e` before ship. |
| `RK-CR2-03` | A layout/styling tweak leaks into `renderSVG` → golden churn | Low | High | All change in `website/app/*`; goldens run in P2 (`NFR-CR2-01`). |
| `RK-CR2-04` | Scope creep — "while we're here" adds inspector/timeline/persistence | Low | Med | Hard non-goals stand (`FEAT-STUDIO-002 §4`); CR-002 is chrome-simplification only. |

## 5. Files to create / modify

| File | Change |
|------|--------|
| `website/app/src/ui/TopBar.tsx` | Remove `tab-preview`; keep `tab-code` as sole toggle; drop `Play` import. |
| `website/app/src/App.tsx` | `showCode` default `false` (`:36`); reorder `.pane.view` before `.pane.editor` (`:237–274`). |
| `website/app/index.html` | Grid `1fr minmax(280px, 38%)` (`:194`); `.pane.editor` `border-left` (`:198`) + responsive flip (`~:353`). |
| `website/app/e2e/chrome.spec.ts` | Revise case (4) → `TC-CR2-01`; add `TC-CR2-02`/`TC-CR2-03`. |
| `website/app/kymo.bundle.js` | Rebuild (committed-bundle deploy). |
| parent `STUDIO-001` docs + `CHANGE-REQUESTS/README.md` | P3 re-baseline + register close. |

## 6. Verification (close-out gate)

Closes when `TEST-STUDIO-002 §2/§3` pass: no `tab-preview` in DOM; single `Code` toggle works both
ways; first load canvas-first (code hidden); code pane right when shown; `chrome.spec.ts` green;
goldens byte-identical; render-guard green; parent `STUDIO-001` re-baselined; `INTRO-STUDIO-002` status
= Closed; register row = Closed.

## 7. Change-control / close-out

CR-002 is a change against the baselined `STUDIO-001` (`INTRO-STUDIO-001 §5`). At close-out the parent
clauses named in `INTRO-STUDIO-002 §3` are reconciled, each parent doc's version + Annex A updated, and
the `CHANGE-REQUESTS/README.md` register row flipped to **Closed** with the close date.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial close-out plan for CR-002: P1 implement (TopBar/App/index.html + bundle) → P2 V&V (`chrome.spec.ts` + goldens + render-guard) → P3 re-baseline `STUDIO-001` + close, ≈4 SP; risk register `RK-CR2-01..04`; files-to-modify; close-out gate. Contingent on CR-002 approval. |

## Annex B — Worklog

Append-only (newest at the bottom). `Status`: ✅ done · 🚧 in progress · ⏳ pending.

| Date | Phase | Work | Status |
|------|-------|------|--------|
| 2026-05-27 | — | CR-002 mini-spec authored (`01-INTRO`/`02-REQUIREMENT`/`03-DESIGN`/`04-TEST`/`05-PLAN`, `STUDIO-002` series); Open, awaiting approval. | ✅ |
