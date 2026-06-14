---
title: Editor Home — Verification & Validation
document_id: TEST-KHOME-001
version: "0.2"
issue_date: 2026-06-15
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the kymo-editor landing / Welcome surface; reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KHOME-001
  - DESIGN-KHOME-001
  - PLAN-KHOME-001
  - TEST-KEDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - test
  - verification
  - validation
  - kymo-editor
  - editor-home
  - welcome
  - user-stories
  - acceptance
---

# Editor Home — Verification & Validation

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-KHOME-001` |
| Version           | 0.2 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KHOME-001` (the requirements verified here, incl. `FR-HM-01/02` and the `US-HM-01..04` stories), `DESIGN-KHOME-001` (the design), `PLAN-KHOME-001` (delivery + risks), `TEST-KEDITOR-001` (the umbrella V&V — `TC-KE-33` is the integration-suite rollup of these cases) |

> **V&V for `FEAT-KHOME-001`.** Because the Welcome home is a UI/UX surface, the test cases below are
> written **per user story** (`US-HM-01..04`) with Given/When/Then steps, and each also pins the FR it
> realises. The cases elaborate the umbrella's `TC-KE-33` (`TEST-KEDITOR-001`), which remains the
> integration-suite rollup.

## 1. Strategy

The Welcome is pure presentation (no diagram bytes), so verification is **Playwright E2E** (DOM +
navigation), not golden-SVG or unit tests. A **smoke harness** now exists for `packages/editor`
(`packages/editor/playwright.config.ts` + `e2e/welcome.spec.ts`, run by `npm run test:e2e` — it
`build`s `dist/` then serves it via `http-server`):

- **Automated (smoke):** `TC-HM-01` (guest landing) and `TC-HM-04` (`?s=` bypass) — they need **no** auth
  or API mocking. Google Identity Services is stubbed (`addInitScript`) so the inline Sign-in CTA is
  observable without driving the real third-party OAuth prompt.
- **Manual (full-suite candidates):** `TC-HM-02` (signed-in Recent), `TC-HM-03` (Open file), `TC-HM-05`
  (dismiss + Back), `TC-HM-06` (chrome hidden) — these need a mocked `kymo_idtoken` + a `/api/diagrams`
  route stub (and `/api/workspaces`,`/api/projects`); they stay manual until the full suite adds those
  fixtures. Selectors use **`data-testid`** (`welcome`, `wel-new`, `wel-open`, `wel-signin`,
  `wel-recent-item`, `wel-template`), not CSS classes/text — the guest block has already been reworded
  once (R-DRIFT). The Google CTA's real OAuth flow is **not** driven in CI.

## 2. Feature test cases (`TC-HM`)

| ID | Story | Procedure (Given / When / Then) | Realises |
|----|-------|----------------------------------|----------|
| **TC-HM-01** | US-HM-01 | *Given* a fresh `/` signed-out, *Then* the **Welcome** shows **Start** (New diagram / Open file), a **"No sign-in needed"** note with an inline **Sign in** link, the **Templates** quick set, and **Learn** (Documentation) — **no** source/preview panes; the brand logo links out to kymo.studio (no document-title chrome in the header). **[automated — `welcome.spec.ts`]** | FR-HM-01 |
| **TC-HM-02** | US-HM-02 | *Given* a fresh `/` signed-in, *Then* **Recent** lists the ≤ 8 most-recently-updated diagrams (kind icon + title); *When* I click one, *Then* it opens at `?d=<id>`; an account with no diagrams shows "No diagrams yet — pick a template to start." | FR-HM-01 |
| **TC-HM-03** | US-HM-03 | *Given* the Welcome, *When* I use **Open file…** and pick a local `.kymo` / `.bpmn` / `.mmd` / `.mermaid` / `.txt` / `.md`, *Then* it loads as a **draft** with the kind auto-detected (`sniffKind`, else by extension), the URL resets to `/`, and the editor opens (Welcome dismissed). | FR-HM-02 |
| **TC-HM-04** | US-HM-04 | *Given* a `/?s=…` (or `/?k=…&s=…`) link, *Then* the shared diagram loads **directly** in the editor and the Welcome **does not** show. **[automated — `welcome.spec.ts`]** | FR-HM-01 |
| **TC-HM-05** | US-HM-01/02 | *Given* the Welcome, *When* I pick **New** (the template gallery opens) or a **Templates** quick item, *Then* the Welcome dismisses and the editor opens on the seeded draft; *When* I navigate **Back** to a fresh `/`, *Then* the Welcome is restored (the `welcomeDismissed` reset on route change). | FR-HM-01 |
| **TC-HM-06** | US-HM-01 | *Given* the Welcome, *Then* the Export / Share controls and the pane-toggle group are **hidden**, and (signed-out) only the Google sign-in button shows. **Known gap (R-HM1):** the browser **tab title** reads the sample-derived name (e.g. "Receive order"), not "Welcome" — a tracked code follow-up, not a pass condition. | FR-HM-01 |

## 3. Regression gates

No code-level golden gate is owned here (the Welcome is presentation; it renders no diagram bytes). The
binding gates remain the umbrella's: the engine/golden render gates and the online E2E render-guard
(`TEST-KEDITOR-001` §3). A future Playwright case (§1) would add a Welcome-specific guard.

## 4. Non-functional verification

- **`NFR-KE-03` (static bundle):** the Welcome ships in the editor route chunk; it pulls no extra runtime
  dependency (it reuses `useAuth` / `useDiagrams` / `lucide-react` already in the bundle).
- **`FR-LV-02` (signed-out usable):** TC-HM-01/03/04 exercise the full guest path with no account.

## 5. Traceability matrix

| Requirement / story | Test case(s) |
|---------------------|--------------|
| `FR-HM-01` (Welcome home) | TC-HM-01, TC-HM-02, TC-HM-04, TC-HM-05, TC-HM-06 |
| `FR-HM-02` (Open file → draft) | TC-HM-03 |
| `US-HM-01` (oriented landing, guest) | TC-HM-01, TC-HM-05, TC-HM-06 |
| `US-HM-02` (resume recent, signed-in) | TC-HM-02, TC-HM-05 |
| `US-HM-03` (open local file) | TC-HM-03 |
| `US-HM-04` (share link bypass) | TC-HM-04 |
| Umbrella rollup | `TC-KE-33` (`TEST-KEDITOR-001`) |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-15 | Vũ Anh | Initial V&V for the Welcome home, carved out of `TEST-KEDITOR-001` (`TC-KE-33`) as `editor-home` grew its own doc-set. `TC-HM-01..06` written per user story (`US-HM-01..04`), each pinning its `FR-HM`; full story/FR → TC traceability. Records the `document.title` gap (R-HM1) as a non-blocking note and the Playwright automation candidate. |
| 0.2     | 2026-06-15 | Vũ Anh | **Smoke harness landed.** Stood up Playwright for `packages/editor` (`playwright.config.ts` + `e2e/welcome.spec.ts`, `npm run test:e2e`); `TC-HM-01` (guest) + `TC-HM-04` (`?s=` bypass) are now **automated** and passing (GIS stubbed; no auth/API mock). Rewrote §1 (automated vs manual split, `data-testid` selectors). Reconciled `TC-HM-01` text to the redesigned guest Welcome (no "Welcome" header). `TC-HM-02/03/05/06` stay manual pending the auth + `/api/diagrams` fixtures. |
