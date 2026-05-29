---
title: "Canvas Studio CR-003 — Verification & Validation"
document_id: TEST-STUDIO-003
version: "0.1"
issue_date: 2026-05-29
status: Closed
classification: Internal
owner: diagrams/ project
audience: Engineer verifying the CR-003 layout change; reviewers
review_cycle: Until CR-003 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-STUDIO-003
  - FEAT-STUDIO-003
  - DESIGN-STUDIO-003
  - PLAN-STUDIO-003
  - TEST-STUDIO-001
authors:
  - Vũ Anh
language: en
keywords:
  - verification
  - validation
  - iso-29119
  - test-cases
  - traceability
  - golden-safe
  - canvas-studio
---

# Canvas Studio CR-003 — Verification & Validation

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-STUDIO-003` |
| Version           | 0.1 |
| Status            | **Closed** (verified — `TC-CR3-01` green) |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-STUDIO-003` (requirements), `DESIGN-STUDIO-003` (design), `TEST-STUDIO-001` (the baselined V&V — selection/chrome specs this layout change must not regress) |

---

## 1. Strategy

Verify the single CR-003 requirement with an **E2E** case (Playwright, trusted events) that lands in the
existing `website/app/e2e/chrome.spec.ts`: assert the code pane docks to the **right** of the canvas
when shown. Prove **`NFR-CR3-01`** by re-running the render goldens (Python + JS) and confirming
byte-identical output, and **`NFR-CR3-02`** via the render-guard. The chrome `TC-CS-07` cases, the
`selection` spec and the `render-guard` spec are regression gates that must stay green.

## 2. Feature test cases (`TC-CR3`)

| ID | Covers | Case (in `e2e/chrome.spec.ts`) |
|----|--------|--------------------------------|
| **`TC-CR3-01`** | `FR-CR3-01` | **Code docks right:** with the source pane shown, the `.pane.editor` follows `.pane.view` in DOM order (or the computed grid column for `.pane.editor` is the right-hand track). The code-hidden state still collapses to a single full-width canvas column (no `main.code-hidden` regression). |

## 3. Regression gates (must stay green)

- `renderSVG` / `svgBackground` goldens **byte-identical** — `cd packages/js && npm test`;
  `cd packages/python && uv run --group dev python -m pytest -q` (`NFR-CR3-01`).
- Render-guard E2E green (`NFR-CR3-02`).
- `e2e/chrome.spec.ts` existing cases (tabs · no floating `.toolbar` · single Export · sample +
  3-mode background) still pass; `e2e/selection.spec.ts` + `e2e/render-guard.spec.ts` unaffected.
- Full suite: `npm run test:e2e` all green before ship.

## 4. Non-functional verification

| NFR | Method |
|-----|--------|
| `NFR-CR3-01` (golden-safe) | Run the JS + Python golden suites; assert no diff. Diff `kymo.bundle.js` to confirm change is chrome-only. |
| `NFR-CR3-02` (render-guard / zero-dep) | Render-guard spec green; `package.json` runtime deps unchanged. |

## 5. Traceability matrix

| Requirement (`FEAT-STUDIO-003`) | Covering test | Supersedes (parent) |
|---------------------------------|---------------|---------------------|
| `FR-CR3-01` | `TC-CR3-01` | — (new assertion; amends `DESIGN-STUDIO-001 §1/§8` layout) |
| `NFR-CR3-01` | §3 goldens | `NFR-CS-03` method |
| `NFR-CR3-02` | §4 render-guard | `NFR-CS-02` method |

> At close-out (`PLAN-STUDIO-003 §3`) the parent `DESIGN-STUDIO-001 §1/§8` layout description is updated
> to show the code pane on the right, keeping the baseline consistent with the shipped chrome.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-29 | Vũ Anh | Initial V&V for CR-003: `TC-CR3-01` (code pane docks right; no `main.code-hidden` regression) in `e2e/chrome.spec.ts`; regression gates (goldens byte-identical, render-guard, existing chrome/selection specs); NFR methods; traceability matrix mapping `FR-CR3-01`→`TC-CR3-01` and noting the parent `DESIGN-STUDIO-001 §1/§8` update at close-out. Carved out of `CR-STUDIO-002 TC-CR2-03`. |
