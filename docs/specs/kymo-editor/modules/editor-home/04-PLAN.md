---
title: Editor Home — Implementation Plan
document_id: PLAN-KHOME-001
version: "0.3"
issue_date: 2026-06-15
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers + reviewers tracking the kymo-editor landing / Welcome surface delivery and risks
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KHOME-001
  - DESIGN-KHOME-001
  - TEST-KHOME-001
  - FEAT-KEDITOR-001
  - PLAN-KEDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - delivery
  - risk-register
  - kymo-editor
  - editor-home
  - welcome
---

# Editor Home — Implementation Plan

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-KHOME-001` |
| Version           | 0.3 |
| Status            | Implemented (retrospective) |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KHOME-001` (the *what*), `DESIGN-KHOME-001` (the *how*), `TEST-KHOME-001` (V&V), `PLAN-KEDITOR-001` (the umbrella plan — the Welcome shipped within its second growth pass) |

> **Delivery record + risk register for `FEAT-KHOME-001`.** The Welcome home **already shipped** (within
> the umbrella's v0.4 growth pass) but was undocumented; this module + its doc-set were created
> retrospectively to close the audit gap. This plan is therefore a **retrospective**: what shipped, the
> decision to carve a dedicated module, and the open risks.

## 1. Context

The Welcome home was built as part of the editor's "fast start" growth pass (template gallery, draft-first,
auto-detect — `PLAN-KEDITOR-001` P14–P16). It became the **first thing every visitor sees**, yet no
requirement owned it, and the umbrella's `FR-KE-21` still specified a contradictory **redirect-to-most-recent**
for `/`. A guest-flow audit (2026-06-15) surfaced the gap; the response was to **reconcile docs to the
as-built** and give the surface a home.

## 2. Decision

- **A dedicated module `editor-home` (`FEAT-KHOME-001`)** rather than folding the requirement into
  `editor-library`. Chosen by the owner to isolate the landing/onboarding surface and **set a seam** for
  it to grow (first-run, tours, recent-activity feeds) — accepting a small (2-FR) module today. See the
  over-decomposition note in §5 (R-HM2).
- **Story-augmented requirements.** Because it is a UI/UX-heavy surface, the requirements carry a
  **user-story layer** (`US-HM-01..04`) *alongside* the FRs, per the team convention — not instead.
- **Full doc-set.** `editor-home` is the **first module to grow its own `02`/`03`/`04`** (the others remain
  stubs on the shared `DESIGN-/TEST-/PLAN-KEDITOR-001`).

## 3. Architecture (overview)

A thin presentation surface (`WelcomeView`) rendered by `EditorPage` *instead of* the editor panes when the
buffer is an untouched starter draft (`showWelcome`). It composes sibling capabilities (template gallery,
Recent index, Open-file → draft, docs link) and owns no data/render/account logic — full detail in
`DESIGN-KHOME-001`.

## 4. Phased plan (retrospective — ✓ Shipped)

| Phase | Scope | Status |
|-------|-------|--------|
| **P1** | `WelcomeView` (Start / Recent / Templates / Learn) + the `showWelcome` gate + reduced header chrome (`FR-HM-01`, `US-HM-01/02`). | ✓ Shipped (umbrella v0.4 growth pass) |
| **P2** | "Open file…" → draft with kind auto-detect (`openLocalFile`, `FR-HM-02`, `US-HM-03`). | ✓ Shipped |
| **P3** | Guest sign-in CTA in Recent + `?s=` bypass + Back-restores-Welcome (`welcomeDismissed` lifecycle, `US-HM-01/04`). | ✓ Shipped |
| **P4** | **Spec retrofit (this doc-set):** `FEAT-/DESIGN-/TEST-/PLAN-KHOME-001`; reconcile `FR-KE-21` / `FR-LB-02` redirect contradiction; register the sixth module across the umbrella + siblings. | ✓ Done (2026-06-15, docs-only) |
| **P5** | **Smoke E2E:** `data-testid`s in `welcome.tsx`; Playwright harness for `packages/editor` (`playwright.config.ts` + `e2e/welcome.spec.ts`); `TC-HM-01` (guest) + `TC-HM-04` (`?s=` bypass) automated. Reconcile the redesigned-Welcome drift (R-DRIFT) into the specs. | ✓ Done (2026-06-15, box-green; CI deferred) |
| **P6** | **Full E2E suite:** `e2e/welcome-full.spec.ts` + `e2e/_fixtures.ts` (GIS stub + mock `kymo_idtoken` + `/api/diagrams`/`/api/workspaces`/`/api/projects` route stubs); `TC-HM-02/03/05/06` automated → **all 6 `TC-HM` green**. Coverage record (§5 Status) all ⚙️. | ✓ Done (2026-06-15, box-green: 6 passed; CI job deferred) |

## 5. Risk register

| ID | Risk | Severity | Status / mitigation |
|----|------|----------|---------------------|
| **R-HM1** | `document.title` reads the sample-derived name (e.g. "Receive order") while the Welcome screen reads "Welcome" — minor inconsistency. | Low | **Open — code follow-up.** One-line fix in `EditorPage` (set `document.title = "Welcome · Kymostudio"` when `showWelcome`). Tracked in `DESIGN-KHOME-001` §4 / `TEST-KHOME-001` TC-HM-06. |
| **R-HM2** | Over-decomposition — a 2-FR module is small vs siblings (3–11 FR). | Low | **Accepted (deliberate seam).** Revisit after 1–2 quarters: if the home/onboarding surface has not grown, consider folding back into `editor-library`. |
| **R-HM3** | Welcome-vs-redirect — was the Welcome intended, or a regression of `FR-KE-21`? | — | **Resolved.** Owner confirmed the Welcome is the intended `/` landing; `FR-KE-21`'s redirect clause is superseded (ADR-HM-1). |
| **R-HM4** | The `showWelcome` gate couples to the `SAMPLE` sentinel + an in-memory `welcomeDismissed` **state flag** (not URL state) — a refactor of either could regress the gate. | Low | Accepted; covered by TC-HM-05 (dismiss + Back-restore). |
| **R-DRIFT** | The Welcome's text + DOM are volatile — the guest block was reworded ("Sign in to see your diagrams" → "No sign-in needed") and the header "Welcome" label removed within days of the first spec, by an unrelated merge. Class/text selectors would have broken. | Med | **Mitigated:** specs reconciled to as-built; E2E selectors use **`data-testid`** (`welcome`, `wel-new`, `wel-signin`, …) added to `welcome.tsx`, not CSS classes/text. Keep re-grounding the spec on `welcome.tsx` when it changes. |

## 6. Worklog / timeline

- **2026-06 (growth pass):** Welcome home shipped within the umbrella's P14–P16 (`welcome.tsx`, `showWelcome`,
  `openLocalFile`) — see `PLAN-KEDITOR-001` §6.
- **2026-06-15:** guest-flow audit surfaced the undocumented surface + the `FR-KE-21` contradiction; this
  module doc-set created and the umbrella/siblings reconciled (umbrella `FEAT-KEDITOR-001` v0.5).

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-15 | Vũ Anh | Initial retrospective plan for `editor-home`. Records the decision to carve a dedicated, story-augmented module with a full doc-set; the (already-shipped) phases P1–P3 and the P4 spec retrofit; and the risk register (R-HM1 `document.title` gap; R-HM2 over-decomposition; R-HM3 Welcome-vs-redirect resolved; R-HM4 gate coupling). |
| 0.2     | 2026-06-15 | Vũ Anh | Added **P5 — Playwright smoke harness** (`packages/editor/playwright.config.ts` + `e2e/welcome.spec.ts`; `TC-HM-01`/`TC-HM-04` automated + passing) and **R-DRIFT** (the Welcome's text/DOM drifted within days — mitigated via spec reconcile + `data-testid` selectors). Updated R-HM4 (`welcomeDismissed` is state, not a ref). |
| 0.3     | 2026-06-15 | Vũ Anh | Added **P6 — full E2E suite** (`welcome-full.spec.ts` + `_fixtures.ts`; auth-mock + REST stubs): `TC-HM-02/03/05/06` automated → all 6 `TC-HM` green on `k2`. Recorded the as-built `pickTemplate` `replaceState` behaviour (in-tab Back does not restore the Welcome; a reload does — `TC-HM-05` asserts the reload path). |
