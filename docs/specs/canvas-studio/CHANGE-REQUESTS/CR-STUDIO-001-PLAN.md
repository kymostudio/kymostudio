---
title: "CR-STUDIO-001 — Implementation Plan (close-out)"
document_id: CR-STUDIO-001-PLAN
version: "0.2"
issue_date: 2026-05-25
status: Closed
classification: Internal
owner: diagrams/ project
audience: Engineer closing CR-STUDIO-001 (canvas-studio P7 reconciliation)
review_cycle: Until the CR is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - CR-STUDIO-001
  - FEAT-STUDIO-001
  - DESIGN-STUDIO-001
  - TEST-STUDIO-001
  - PLAN-STUDIO-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - implementation-plan
  - close-out
  - chrome-de-dup
  - p7
  - canvas-studio
---

# CR-STUDIO-001 — Implementation Plan (close-out)

| Field            | Value |
|------------------|-------|
| Document ID      | `CR-STUDIO-001-PLAN` |
| Parent CR        | [`CR-STUDIO-001`](CR-STUDIO-001.md) (**Closed**) |
| Version          | 0.2 |
| Status           | **Closed** — all phases done |
| Owner            | `diagrams/` project |
| Entry gate       | **Path A approved** (CR §4.1). Phase 0 (§4.3 doc-honesty) may proceed under either path. |

> **Scope.** The delivery layer for closing `CR-STUDIO-001`. It executes the CR's **recommended
> Path A** — *implement* P7 (chrome de-dup) so the baseline's "P7 build" claims become true — plus the
> **path-independent** doc-honesty fixes (CR §4.3). If the approver picks **Path B** (de-baseline)
> instead, Phases 1–3 are dropped and this plan is superseded by the doc-only reconciliation in CR §4.2;
> Phase 0 still applies.

---

## 1. Objective

Move `CR-STUDIO-001` from **Raised → Closed** by eliminating the spec↔code gap: build the P7 chrome
de-dup, prove it (tests + goldens), then re-baseline the docs to match. **Client-only**, golden-safe,
zero new deps — same constraints as `PLAN-STUDIO-001`.

## 2. Phased plan

Phases are CR-local and sized in story points. **Sequencing:** `0 → 1 → 2 → 3` (Phase 0 may land first
on its own).

| Phase | Goal | SP |
|-------|------|----|
| **0 — Doc-honesty fixes** (path-independent, CR §4.3) | Stop the bleeding regardless of A/B. | 1 |
| **1 — Implement P7** (code, CR §4.1) | One owner per control; floating toolbar gone. | 3 |
| **2 — V&V** | `chrome.spec.ts` green; goldens byte-identical; render-guard green. | 1 |
| **3 — Re-baseline + close** | Flip claims to true; close the CR. | 1 |
| | **Total** | **≈ 6** |

### Phase 0 — Doc-honesty fixes *(do now; CR §4.3)*
- `PLAN-STUDIO-001` worklog (Annex C): reorder to the doc's stated **append-only, newest-at-bottom**
  convention; move the "Programme complete" summary **below** the phases it summarises; resolve the
  "**six** phases shipped" vs "P7 (7th) 🚧" contradiction (state: P1–P6 shipped, **P7 pending CR-001**).
- `PLAN-STUDIO-001` §5/§5.1: stop counting P7's SP in the *delivered* total until it ships (mark P7 SP
  as planned-not-delivered).
- `FEAT-STUDIO-001` `FR-CS-05`: state explicitly that the selection **resize handles are presentational
  (no resize)** — currently only implied in the worklog.
- `PLAN-STUDIO-001` Annex B #1: record the decision that the editable title is **cosmetic, local-only**
  (or drop it) — it shipped with the question still open.

### Phase 1 — Implement P7 *(code; CR §4.1, mirrors `PLAN-STUDIO-001` §7 "P7" file list)*
- `ui/TopBar.tsx`: add the **sample/starter picker** (`data-testid="topbar-sample"`, `.k-sample`) + a
  **3-mode background control** (`topbar-bg-light` / `-dark` / `-transparent`, `.k-seg`, soft
  `--accent-soft` active) reusing `selectBg`/`bgActive`; **subsume** the standalone theme toggle.
- `App.tsx`: **delete** the floating `.toolbar` (tool buttons already moved to the rail at P3); drop
  `#download`/`tbtn`; rewire `<TopBar>` props (sample + bg + single Export); make the `Code`/`Preview`
  tabs reflect true panel state (`Preview` active ⇔ code pane hidden).
- `index.html`: remove dead `.toolbar`/`.tbtn` CSS; add `.k-sample`/`.k-seg`. (The `Checker` icon
  already exists in `ui/icons.tsx`.)
- `e2e/{render-guard,selection}.spec.ts`: remove the two now-inert `.closest(".toolbar")` guards.
- Rebuild & commit `website/app/kymo.bundle.js` (committed-bundle deploy contract — no CI build).

### Phase 2 — V&V *(CR §5)*
- Add `website/app/e2e/chrome.spec.ts` — the **4 `TC-CS-07` cases**: (1) no `.toolbar` in the DOM;
  (2) exactly one Export (old floating `#download` gone); (3) `topbar-sample` + 3-mode bg present —
  `-light/-dark` flip `[data-theme]`, `-transparent` flips canvas bg **without** touching `[data-theme]`;
  (4) `tab-code` toggles the `.kymo` pane and `tab-preview.active` is its inverse.
- Run `npm run test:e2e` (all specs green); confirm `renderSVG`/`svgBackground` **byte-identical**
  (`cd packages/js && npm test`; `cd packages/python && uv run --group dev python -m pytest -q`) and the
  render-guard green (`NFR-CS-02`/`NFR-CS-03`).
- chrome-anhv spot-check (light + dark): single appearance control, no floating strip, 0 console errors.

### Phase 3 — Re-baseline + close
- Flip the as-if-built wording to **true**: `TEST 0.x` (`TC-CS-07` now backed by a real
  `chrome.spec.ts`), `DESIGN §11`/`0.x` ("toolbar retired" now factual), `FEAT` §5 #6 satisfied;
  reconcile the `FR-CS-02`/`FR-CS-03` parentheticals (no longer self-contradicting).
- `PLAN-STUDIO-001` worklog: P7 row **🚧 → ✅**; move P7 SP into the delivered total.
- `CR-STUDIO-001`: status **Raised → Implemented → Closed**; fill the §6 decision log.
- `CHANGE-REQUESTS/README.md`: update the register row status.

## 3. Risk register

| ID | Risk | L | I | Mitigation |
|----|------|---|---|------------|
| **RK-C1-01** | Rebuilt bundle / CSS churns committed `kymo.bundle.js` beyond intent | Med | Low | Diff the bundle; change is confined to chrome React + CSS; `renderSVG` untouched. |
| **RK-C1-02** | Moving controls breaks existing e2e selectors (render-guard/selection) | Med | Med | Use `data-testid`; update the two `.closest(".toolbar")` guards in lockstep; run `test:e2e` before ship (per the "run Playwright before shipping" lesson). |
| **RK-C1-03** | A styling tweak leaks into `renderSVG` → golden churn | Low | High | All change in `website/app/*`; goldens run in Phase 2 (`NFR-CS-03`). |
| **RK-C1-04** | Scope creep — "while we're here" adds inspector/timeline | Low | Med | Hard non-goals stand (`FEAT-STUDIO-001` §4); CR is de-dup only. |

## 4. Verification (close-out gate)

Closes when CR §5 is met: `chrome.spec.ts` passes (4 cases); no `.toolbar` in DOM; one Export; truthful
tabs; goldens byte-identical; render-guard green; PLAN worklog P7 = ✅ with honest SP totals; the
traceability matrix has no fictional links; CR status = Closed.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Draft. Close-out plan for `CR-STUDIO-001`: Phase 0 doc-honesty (path-independent) + Path A implementation (P7 code → V&V → re-baseline), ≈6 SP, with risk register and close-out gate. Contingent on Path A approval; superseded by CR §4.2 if Path B is chosen. |
| 0.2     | 2026-05-25 | Vũ Anh | **Closed.** Path A executed end-to-end — P7 built + `e2e/chrome.spec.ts`; 21/21 e2e, goldens byte-identical; baseline reconciled; `CR-STUDIO-001` Closed. Phases 0+3 doc work consolidated into one re-baseline pass. |

## Annex B — Worklog

Append-only (newest at the bottom). `Status`: ✅ done · 🚧 in progress · ⏳ pending.

| Date | Phase | Work | Status |
|------|-------|------|--------|
| 2026-05-25 | — | Plan authored alongside `CR-STUDIO-001`. | ✅ |
| 2026-05-25 | 1 | P7 implemented — `TopBar` sample picker + 3-mode bg control; floating `.toolbar`/`#download` deleted from `App.tsx`/`index.html`; truthful `Code`/`Preview` tabs; `.k-sample`/`.k-seg` CSS added; dead toolbar CSS removed; bundle rebuilt (416 KB). | ✅ |
| 2026-05-25 | 2 | V&V — new `e2e/chrome.spec.ts` (4 `TC-CS-07` cases); the two inert `.closest(".toolbar")` guards cleaned; `tsc` clean; **`test:e2e` 21/21**; `js` 368/0; `python` goldens byte-identical; chrome-anhv 0 console errors. | ✅ |
| 2026-05-25 | 0 + 3 | Doc-honesty + re-baseline (consolidated) — PLAN worklog reconciled (P7 ✅; stray summary relocated below the phases + corrected to P1–P7; P6 lead de-duped; Annex B open questions resolved); `FEAT` 0.5 · `DESIGN` 0.4 · `TEST` 0.4 · `PLAN` 0.5; `CR-STUDIO-001` Closed. (FR-CS-05 already stated handles presentational — no edit needed.) | ✅ |
