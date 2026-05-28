---
title: "CR-STUDIO-001 — Reconcile the P7 (chrome de-dup) baseline with implementation reality"
document_id: CR-STUDIO-001
version: "0.2"
issue_date: 2026-05-25
status: Closed
classification: Internal
owner: diagrams/ project
audience: canvas-studio maintainers / reviewers; the approver of the baseline
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-STUDIO-001
  - DESIGN-STUDIO-001
  - TEST-STUDIO-001
  - PLAN-STUDIO-001
  - INTRO-STUDIO-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - baseline-integrity
  - traceability
  - chrome-de-dup
  - canvas-studio
  - p7
---

# CR-STUDIO-001 — Reconcile the P7 (chrome de-dup) baseline with implementation reality

| Field             | Value |
|-------------------|-------|
| CR ID             | `CR-STUDIO-001` |
| Status            | **Closed** — implemented via Path A (P7 built + verified; baseline reconciled) |
| Raised            | 2026-05-25 · Vũ Anh |
| Target baseline   | `FEAT-STUDIO-001` (FR-CS-07 + the FR-CS-02/03 parentheticals + §5 #6), `DESIGN-STUDIO-001` (§11), `TEST-STUDIO-001` (TC-CS-07 + traceability), `PLAN-STUDIO-001` (§4/§5.1/§8/worklog) |
| Severity          | **High** — the baseline asserts unbuilt work as built (integrity defect) |
| Type              | Corrective (baseline ↔ implementation reconciliation) |

> **Why a CR.** P7 (chrome de-dup) was written into the baselined spec via version bumps
> (`FEAT`/`DESIGN`/`TEST` 0.2) **without** a change-request, and it supersedes clauses of two
> already-baselined requirements (`FR-CS-02`, `FR-CS-03`). `01-INTRO §5` requires exactly this to go
> through `07-CR/`. This CR retroactively brings P7 under change control and proposes how to close the
> spec↔code gap.

---

## 1. Problem statement

The baselined spec asserts **P7 as built/shipped**, but **no P7 implementation exists**. Git shows the
only P7 change is `docs(canvas-studio): P7 chrome de-dup spec` (#96) — there is **no
`feat(canvas-studio)` P7 commit**. The live playground (`website/app/`, verified in-browser) still
shows the floating toolbar P7 claims to have removed.

## 2. Evidence (spec claim ⇄ actual)

| Doc / clause | Baseline claims | Reality |
|---|---|---|
| `TEST-STUDIO-001` `TC-CS-07` + 0.2 Annex | "**P7 build:** added `TC-CS-07` → `e2e/chrome.spec.ts` (4 cases)"; traceability row `FR-CS-07 → TC-CS-07` | **`e2e/chrome.spec.ts` does not exist.** None of its asserted test-ids (`topbar-sample`, `topbar-bg-light/-dark/-transparent`, `tab-preview`, `tab-code`) exist in `website/app/src/`. **Fabricated traceability link.** |
| `DESIGN-STUDIO-001` §11 + 0.2 Annex | "**Floating toolbar retired.** The whole `.toolbar` markup + CSS is **deleted** from `App.tsx`/`index.html`." | `App.tsx` still contains `className="toolbar"`, `tbtn`, `#download` (5 matches); the strip is **visible on the live canvas** (sample picker · ☀/☾/transparent · ↓ SVG). |
| `FEAT-STUDIO-001` §5 acceptance #6 | "there is **no** floating toolbar; … `Code`/`Preview` tabs reflect the code-pane state." | The shipped build **fails** this accepted criterion. |
| `FEAT-STUDIO-001` `FR-CS-02`/`FR-CS-03` | bodies say "theme toggle" / "floating toolbar **keeps** sample/bg/export"; parentheticals say P7 **removes/replaces** them | **Self-contradicting** requirements — body (matches reality) vs parenthetical (matches unbuilt P7). Reader cannot tell which is normative. |
| `PLAN-STUDIO-001` worklog | P7 row marked **🚧**; "Programme complete — all **six** phases shipped" paragraph also present | Internally contradictory: 6 done vs a 7th pending. §5.1 books P7 into the "≈47 SP ✓ ≤50" total **as if delivered**. |

## 3. Impact

- **Integrity:** the canvas-studio baseline cannot be trusted as a description of the system — the
  core function of a baseline is void while this stands.
- **Traceability invariant breached** (`01-INTRO §5`: every `FR` has ≥1 covering test before "done"):
  `FR-CS-07`'s covering test is fictional, so the invariant is satisfied only on paper.
- **Process:** the `07-CR/` apparatus was bypassed for the one change that required it; this CR is also
  the corrective for that process gap.

## 4. Proposed resolution

Two paths; **recommendation = Path A**, with the doc-honesty fixes in §4.3 applied **immediately**
regardless of path. **Execution detail** (phases, SP, risk, close-out gate) for the recommended path
lives in the close-out plan [`CR-STUDIO-001-PLAN`](CR-STUDIO-001-PLAN.md).

### 4.1 Path A — Implement P7, then re-baseline as built (recommended)
P7 is ~5 SP, the duplication is a genuine UX wart (confirmed live), and the spec text is already
written. Build it so the baseline becomes *true*:
- `ui/TopBar.tsx`: add the sample/starter picker (`topbar-sample`) + 3-mode background control
  (`topbar-bg-light/-dark/-transparent`) reusing `selectBg`/`bgActive`; subsume the standalone theme
  toggle.
- `App.tsx` / `index.html`: delete the floating `.toolbar` (markup + CSS + `#download`); single
  top-bar Export; make `Code`/`Preview` tabs reflect true panel state.
- Add `website/app/e2e/chrome.spec.ts` (the 4 `TC-CS-07` cases); confirm `renderSVG`/`svgBackground`
  goldens **byte-identical** (`NFR-CS-03`) and the render-guard green (`NFR-CS-02`).
- **Only after the suite is green**, the `…0.2` "P7 build" Annex rows become accurate; flip the PLAN
  worklog P7 row 🚧→✅.

### 4.2 Path B — De-baseline P7 (if it will not be built soon)
Demote P7 to an honest "proposed, not implemented" state:
- Revert the `FR-CS-02`/`FR-CS-03` parentheticals (restore the as-built bodies as normative).
- Mark `FR-CS-07`, `DESIGN §11`, and `TC-CS-07` **"Proposed — not yet implemented"**; remove the
  `FR-CS-07 → TC-CS-07` traceability row and the `e2e/chrome.spec.ts` reference; fix `FEAT §5` #6.
- Restate the `…0.2` Annex rows from "build/retired/added test" to "specified (design-ahead)."

### 4.3 Immediate doc-honesty fixes (apply under either path)
These are wrong independent of A/B:
- PLAN worklog: reorder to its stated **append-only, newest-at-bottom** convention; move the
  "Programme complete" summary below the phases; resolve "6 complete" vs "7th pending."
- PLAN §5.1: stop counting P7 SP in the delivered total until it ships.
- Resolve PLAN **Annex B** open questions that already shipped (editable-title cosmetic; selection
  resize-handle as presentational-only must be stated in `FR-CS-05`, not left implied).

## 5. Verification (CR closed when)
- **If Path A:** `e2e/chrome.spec.ts` exists and passes (4 cases); no `.toolbar` in DOM; one Export;
  truthful tabs; goldens byte-identical; render-guard green; PLAN worklog P7 = ✅.
- **If Path B:** no baselined clause asserts P7 as built; no dangling test/file references; FR-CS-02/03
  internally consistent with the as-built UI.
- **Either:** PLAN worklog ordering + totals honest; traceability matrix contains no fictional links.

## 6. Decision log

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-25 | Vũ Anh | **Raised.** Awaiting assessment/approval of Path A vs B. §4.3 fixes proposed immediately. |
| 2026-05-25 | Vũ Anh | **Approved — Path A** (implement P7). Rationale: ~5 SP, the duplication is a real UX wart (confirmed live), the spec text was already written. |
| 2026-05-25 | Vũ Anh | **Closed — implemented.** P7 built (`TopBar` sample picker + 3-mode bg, floating `.toolbar` deleted, single Export, truthful tabs) + `e2e/chrome.spec.ts`; verified **21/21 e2e**, `js` 368/0, `python` goldens byte-identical, 0 console errors. Baseline reconciled (`FEAT` 0.5 · `DESIGN` 0.4 · `TEST` 0.4 · `PLAN` 0.5); §4.3 doc-honesty fixes applied. All §5 close conditions met. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Raised. Documents the P7 spec↔code integrity defect (unbuilt work baselined as built; fabricated `TC-CS-07`/`chrome.spec.ts` link; self-contradicting FR-CS-02/03; worklog contradictions) and proposes Path A (implement) / Path B (de-baseline) + immediate doc-honesty fixes. |
| 0.2     | 2026-05-25 | Vũ Anh | **Closed.** Path A executed — P7 implemented & verified (21/21 e2e; goldens byte-identical); baseline reconciled across `FEAT`/`DESIGN`/`TEST`/`PLAN`; §4.3 doc-honesty fixes applied. Status Raised → Closed. |
