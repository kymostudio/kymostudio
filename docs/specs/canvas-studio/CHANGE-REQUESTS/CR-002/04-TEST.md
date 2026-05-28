---
title: "Canvas Studio CR-002 — Verification & Validation"
document_id: TEST-STUDIO-002
version: "0.1"
issue_date: 2026-05-27
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer verifying the CR-002 chrome change; reviewers
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-STUDIO-002
  - FEAT-STUDIO-002
  - DESIGN-STUDIO-002
  - PLAN-STUDIO-002
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

# Canvas Studio CR-002 — Verification & Validation

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-STUDIO-002` |
| Version           | 0.1 |
| Status            | **Open** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-STUDIO-002` (requirements), `DESIGN-STUDIO-002` (design), `TEST-STUDIO-001` (the baselined V&V this amends — `TC-CS-02`/`TC-CS-07`) |

---

## 1. Strategy

Verify the three CR-002 requirements with **E2E** cases (Playwright, trusted events) that land in the
existing `website/app/e2e/chrome.spec.ts` — revising the `TC-CS-07` case (4) that referenced
`tab-preview` and adding default-hidden + code-on-right assertions. Prove **`NFR-CR2-01`** by re-running
the render goldens (Python + JS) and confirming byte-identical output, and **`NFR-CR2-02`** via the
render-guard. The other three `TC-CS-07` cases (no floating toolbar · single Export · 3-mode background)
and the `selection`/`render-guard` specs are regression gates that must stay green.

## 2. Feature test cases (`TC-CR2`)

| ID | Covers | Case (in `e2e/chrome.spec.ts`) |
|----|--------|--------------------------------|
| **`TC-CR2-01`** | `FR-CR2-01` | **No `tab-preview` in the DOM.** A single `tab-code` control toggles the `.kymo` pane both ways; `tab-code.active` ⇔ pane visible. |
| **`TC-CR2-02`** | `FR-CR2-02` | **First load is canvas-first:** `<main>` carries `code-hidden`, the `.pane.editor` is absent, the canvas spans full width — *before* any interaction. |
| **`TC-CR2-03`** | `FR-CR2-03` | **Code docks right:** after activating `Code`, the `.pane.editor` follows `.pane.view` in DOM order (or the computed grid column for `.pane.editor` is the right-hand track). |

## 3. Regression gates (must stay green)

- `renderSVG` / `svgBackground` goldens **byte-identical** — `cd packages/js && npm test`;
  `cd packages/python && uv run --group dev python -m pytest -q` (`NFR-CR2-01`).
- Render-guard E2E green (`NFR-CR2-02`).
- `e2e/chrome.spec.ts` remaining `TC-CS-07` cases (no floating `.toolbar` · single Export · sample +
  3-mode background) still pass; `e2e/selection.spec.ts` + `e2e/render-guard.spec.ts` unaffected.
- Full suite: `npm run test:e2e` all green before ship.

## 4. Non-functional verification

| NFR | Method |
|-----|--------|
| `NFR-CR2-01` (golden-safe) | Run the JS + Python golden suites; assert no diff. Diff `kymo.bundle.js` to confirm change is chrome-only. |
| `NFR-CR2-02` (render-guard / zero-dep) | Render-guard spec green; `package.json` runtime deps unchanged. |

## 5. Traceability matrix

| Requirement (`FEAT-STUDIO-002`) | Covering test | Supersedes (parent `TEST-STUDIO-001`) |
|---------------------------------|---------------|----------------------------------------|
| `FR-CR2-01` | `TC-CR2-01` | `TC-CS-02` (Code-tab assertion), `TC-CS-07` case (4) |
| `FR-CR2-02` | `TC-CR2-02` | — (new assertion) |
| `FR-CR2-03` | `TC-CR2-03` | — (new assertion) |
| `NFR-CR2-01` | §3 goldens | `NFR-CS-03` method |
| `NFR-CR2-02` | §4 render-guard | `NFR-CS-02` method |

> At close-out (`PLAN-STUDIO-002 §3`) the parent `TC-CS-02`/`TC-CS-07` rows are updated to match (no
> `tab-preview`; default-hidden; code-right), keeping the parent traceability matrix free of dangling
> links — every `FR` retains a covering test (the `INTRO-STUDIO-001 §5` invariant).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial V&V for CR-002: `TC-CR2-01..03` (single `Code` toggle / no `tab-preview`; first-load code-hidden; code pane right) in `e2e/chrome.spec.ts`; regression gates (goldens byte-identical, render-guard, remaining `TC-CS-07` cases); NFR methods; traceability matrix mapping `FR-CR2-*`→`TC-CR2-*` and noting the parent `TC-CS-02`/`TC-CS-07` updates at close-out. |
