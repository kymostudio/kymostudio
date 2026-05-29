---
title: "Canvas Studio CR-003 — Implementation Plan (close-out)"
document_id: PLAN-STUDIO-003
version: "0.1"
issue_date: 2026-05-29
status: Closed
classification: Internal
owner: diagrams/ project
audience: Engineer closing CR-003 (canvas-studio code-pane-on-the-right)
review_cycle: Until CR-003 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-STUDIO-003
  - FEAT-STUDIO-003
  - DESIGN-STUDIO-003
  - TEST-STUDIO-003
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

# Canvas Studio CR-003 — Implementation Plan (close-out)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-STUDIO-003` |
| Version           | 0.1 |
| Status            | **Closed** — P1–P3 done; implemented + re-baselined |
| Owner             | `diagrams/` project |
| Entry gate        | **CR-003 approved** (`INTRO-STUDIO-003 §5`). No code begins before approval. |
| Related Documents | `FEAT-STUDIO-003` (requirements), `DESIGN-STUDIO-003` (design), `TEST-STUDIO-003` (V&V), `PLAN-STUDIO-001` (the baselined plan re-baselined at close-out) |

---

## 1. Context

The delivery layer for CR-003: implement the single layout change (code pane on the right), prove it
(E2E + goldens), then re-baseline the parent `DESIGN-STUDIO-001 §1/§8` layout so the spec matches the
shipped chrome. **Client-only**, golden-safe, zero new deps — same constraints as `PLAN-STUDIO-001`.
Honour the "run Playwright before shipping web-app changes" lesson: `npm run test:e2e` green locally
before ship. If `CR-STUDIO-002` is in flight, rebase the shared `App.tsx`/`index.html` hunks against
whichever lands first (`DESIGN-STUDIO-003 §5 RK-CR3-Q1`).

## 2. Decision

Build the change in `website/app/` exactly per `DESIGN-STUDIO-003 §2`, then re-baseline. Small,
contained, golden-safe — no architectural choice to make.

## 3. Phased plan

Sequencing `1 → 2 → 3`. Story points (~2–3 SP total).

| Phase | Goal | SP |
|-------|------|----|
| **P1 — Implement** (`DESIGN §2`) | Code pane docks right: DOM reorder + grid swap + border/responsive flip. | 1 |
| **P2 — V&V** (`TEST-STUDIO-003`) | `TC-CR3-01` green; goldens byte-identical; render-guard green. | 1 |
| **P3 — Re-baseline + close** | Reconcile `DESIGN-STUDIO-001 §1/§8`; close CR-003. | 0.5–1 |

- **P1:** `App.tsx:237–274` reorder panes (`view` before `editor`, keep `{showCode && …}` guard);
  `index.html:194` grid `1fr minmax(280px, 38%)`; `index.html:198` `.pane.editor` `border-right` →
  `border-left`; flip the `max-width:760px` responsive rule (`~:353`). Rebuild & commit
  `website/app/kymo.bundle.js`.
- **P2:** add `TC-CR3-01` in `e2e/chrome.spec.ts`; `npm run test:e2e` all green; JS + Python goldens
  byte-identical; chrome-anhv spot-check (light + dark): canvas leads, code docks right, code-hidden
  still full-width, 0 console errors.
- **P3:** edit the parent baseline — `DESIGN-STUDIO-001` (§1 layout ASCII + §8 column order), bumping
  version + Annex A; flip `INTRO-STUDIO-003` status **Open → Closed** and fill its §5 decision log;
  update the `CHANGE-REQUESTS/README.md` register row to **Closed**.

## 4. Risk register

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| `RK-CR3-01` | Rebuilt bundle / CSS churns committed `kymo.bundle.js` beyond intent | Med | Low | Diff the bundle; change confined to chrome React + CSS; `renderSVG` untouched. |
| `RK-CR3-02` | Reordering panes breaks existing E2E selectors | Med | Med | Update `chrome.spec.ts` in lockstep; run `test:e2e` before ship. |
| `RK-CR3-03` | Responsive (narrow) divider on wrong edge after border flip | Low | Low | Verify the `max-width:760px` stacked layout visually in P2. |
| `RK-CR3-04` | Merge collision with CR-002 (same `App.tsx`/`index.html` hunks) | Med | Low | Independent semantics; rebase the shared hunk against whichever CR lands first (`RK-CR3-Q1`). |
| `RK-CR3-05` | Scope creep — "while we're here" adds tab/default changes (CR-002 territory) | Low | Med | Hard non-goals stand (`FEAT-STUDIO-003 §4`); CR-003 is the side-move only. |

## 5. Files to create / modify

| File | Change |
|------|--------|
| `website/app/src/App.tsx` | Reorder `.pane.view` before `.pane.editor` (`:237–274`); keep `showCode` default + guard as-built. |
| `website/app/index.html` | Grid `1fr minmax(280px, 38%)` (`:194`); `.pane.editor` `border-left` (`:198`) + responsive flip (`~:353`). |
| `website/app/e2e/chrome.spec.ts` | Add `TC-CR3-01` (code docks right; no `main.code-hidden` regression). |
| `website/app/kymo.bundle.js` | Rebuild (committed-bundle deploy). |
| parent `STUDIO-001` docs + `CHANGE-REQUESTS/README.md` | P3 re-baseline (`DESIGN-STUDIO-001 §1/§8`) + register close. |

## 6. Verification (close-out gate)

Closes when `TEST-STUDIO-003 §2/§3` pass: code pane right when shown; code-hidden still full-width;
`chrome.spec.ts` green; goldens byte-identical; render-guard green; parent `DESIGN-STUDIO-001 §1/§8`
re-baselined; `INTRO-STUDIO-003` status = Closed; register row = Closed.

## 7. Change-control / close-out

CR-003 is a change against the baselined `STUDIO-001` (`INTRO-STUDIO-001 §5`). At close-out the parent
clauses named in `INTRO-STUDIO-003 §3` are reconciled, the `DESIGN-STUDIO-001` version + Annex A
updated, and the `CHANGE-REQUESTS/README.md` register row flipped to **Closed** with the close date.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-29 | Vũ Anh | Initial close-out plan for CR-003: P1 implement (App.tsx reorder + index.html grid/border + bundle) → P2 V&V (`chrome.spec.ts` + goldens + render-guard) → P3 re-baseline `DESIGN-STUDIO-001 §1/§8` + close, ≈2–3 SP; risk register `RK-CR3-01..05` (incl. CR-002 merge-collision); files-to-modify; close-out gate. Contingent on CR-003 approval. |

## Annex B — Worklog

Append-only (newest at the bottom). `Status`: ✅ done · 🚧 in progress · ⏳ pending.

| Date | Phase | Work | Status |
|------|-------|------|--------|
| 2026-05-29 | — | CR-003 mini-spec authored (`01-INTRO`/`02-REQUIREMENT`/`03-DESIGN`/`04-TEST`/`05-PLAN`, `STUDIO-003` series); carved out of `CR-STUDIO-002 FR-CR2-03`; Open, awaiting approval. | ✅ |
| 2026-05-29 | P1 | `App.tsx` reorder (`.pane.view` before `.pane.editor`); `index.html` grid `1fr minmax(280px, 38%)` + `.pane.editor border-left` + responsive `border-top`; bundle rebuilt (413.5 kb). | ✅ |
| 2026-05-29 | P2 | `TC-CR3-01` added to `e2e/chrome.spec.ts`; `npm run test:e2e` 22/22 green; `js` (368/0) + `python` (649) goldens byte-identical; chrome spot-check: code docks right, code-hidden full-width, 0 console errors. | ✅ |
| 2026-05-29 | P3 | Re-baselined `DESIGN-STUDIO-001 §1/§8` (v0.6); `INTRO-STUDIO-003` Open → Closed; register row Closed. | ✅ |
