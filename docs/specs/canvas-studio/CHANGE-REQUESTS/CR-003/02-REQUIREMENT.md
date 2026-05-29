---
title: "Canvas Studio CR-003 — Requirements (SRS delta)"
document_id: FEAT-STUDIO-003
version: "0.1"
issue_date: 2026-05-29
status: Closed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the layout change (`website/app/`); reviewers
review_cycle: Until CR-003 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-STUDIO-003
  - DESIGN-STUDIO-003
  - TEST-STUDIO-003
  - PLAN-STUDIO-003
  - DESIGN-STUDIO-001
  - FEAT-STUDIO-001
  - PROD-STUDIO-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - change-request
  - editor-chrome
  - code-pane
  - acceptance-criteria
  - canvas-studio
---

# Canvas Studio CR-003 — Requirements (SRS delta)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-STUDIO-003` |
| Version           | 0.1 |
| Status            | **Closed** (implemented) |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-STUDIO-003` (change record), `DESIGN-STUDIO-003` (how), `TEST-STUDIO-003` (V&V), `DESIGN-STUDIO-001` (the baselined design this amends — §1/§8), `PROD-STUDIO-001` (stakeholder needs) |

> **Delta SRS.** This states the requirement *for the CR-003 change only*. `FR-CR3-01` maps to the
> baselined `DESIGN-STUDIO-001` clauses it supersedes (§5). It does **not** re-state the whole feature.

---

## 1. Stakeholder needs

The CR-003 change serves this existing `canvas-studio` stakeholder need (`PROD-STUDIO-001`):

- `SN-CS` (canvas-first hi-fi editor) — the canvas, not the source text, should hold the primary column;
  secondary editors dock to the side, by convention the **right**.

## 2. Functional requirements (`FR-CR3`)

| ID | Requirement | Source need | Supersedes |
|----|-------------|-------------|------------|
| **`FR-CR3-01`** | When the `.kymo` source pane is shown, it SHALL render to the **right** of the canvas (the canvas occupies the left/primary column; code docks right). The pane's visibility trigger (`showCode` / the `Code` control) and all other chrome are unchanged by this requirement. | canvas-first layout | `DESIGN-STUDIO-001 §1` (layout — code pane left of canvas), `§8` (`code \| canvas \| reserved` column order) |

## 3. Non-functional requirements (`NFR-CR3`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| **`NFR-CR3-01`** | **Client-only & golden-safe.** All change is confined to `website/app/*` chrome (React + CSS); `renderSVG`/`svgBackground` are untouched, so the Python/JS render goldens stay **byte-identical**. | `NFR-CS-03` |
| **`NFR-CR3-02`** | The render-guard E2E SHALL stay green; no new runtime dependency is introduced. | `NFR-CS-02` |

## 4. Scope

**In scope:** the code-pane side change (left → right) in `App.tsx` (DOM order) and `index.html` (grid
column order + pane border side + responsive divider), and the covering `e2e/chrome.spec.ts` assertion.

**Out of scope (non-goals — `FEAT-STUDIO-001 §4` stands):** the `Code`/`Preview` tab simplification and
the default-hidden behaviour (those are `CR-STUDIO-002`); any inspector / right-panel, timeline,
create-tools, comments/versions, persistence backend, or change to the render core. CR-003 is a
layout-side move only.

## 5. Acceptance criteria

1. When the source pane is shown, it renders to the **right** of the canvas; the canvas occupies the
   primary (left) column (`FR-CR3-01`).
2. The code-hidden state still collapses the canvas to full-width (no regression in
   `main.code-hidden`).
3. `renderSVG`/`svgBackground` goldens are byte-identical; render-guard green (`NFR-CR3-01/-02`).

**Supersession / traceability** (CR-local → parent baseline; covering test in `TEST-STUDIO-003 §5`):

| `FR-CR3` | Supersedes (parent `DESIGN-STUDIO-001`) | Covered by |
|----------|------------------------------------------|------------|
| `FR-CR3-01` | `§1` (layout ASCII), `§8` (column order) | `TC-CR3-01` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-29 | Vũ Anh | Initial delta SRS for CR-003: `FR-CR3-01` source pane on the right (layout-only); `NFR-CR3-01/-02` (golden-safe / render-guard); scope + acceptance + supersession table mapping to parent `DESIGN-STUDIO-001 §1/§8`. Carved out of `CR-STUDIO-002 FR-CR2-03`. |
