---
title: "Canvas Studio CR-002 — Requirements (SRS delta)"
document_id: FEAT-STUDIO-002
version: "0.1"
issue_date: 2026-05-27
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the chrome change (`website/app/`); reviewers
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - INTRO-STUDIO-002
  - DESIGN-STUDIO-002
  - TEST-STUDIO-002
  - PLAN-STUDIO-002
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

# Canvas Studio CR-002 — Requirements (SRS delta)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-STUDIO-002` |
| Version           | 0.1 |
| Status            | **Open** |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-STUDIO-002` (change record), `DESIGN-STUDIO-002` (how), `TEST-STUDIO-002` (V&V), `FEAT-STUDIO-001` (the baselined SRS this amends), `PROD-STUDIO-001` (stakeholder needs) |

> **Delta SRS.** This states the requirements *for the CR-002 change only*. Each `FR-CR2` maps to the
> baselined `FEAT-STUDIO-001` clause it supersedes (§5). It does **not** re-state the whole feature.

---

## 1. Stakeholder needs

The CR-002 change serves these existing `canvas-studio` stakeholder needs (`PROD-STUDIO-001`):

- `SN-CS` (canvas-first hi-fi editor) — the canvas, not the source text, should be the landing surface.
- `SN-CS` (minimal, unambiguous chrome) — **one owner per control**; no redundant tab. (This extends
  the `FR-CS-07` "one owner per control" intent to the center tabs.)

## 2. Functional requirements (`FR-CR2`)

| ID | Requirement | Source need | Supersedes |
|----|-------------|-------------|------------|
| **`FR-CR2-01`** | The center chrome SHALL expose a **single `Code` toggle** that shows/hides the `.kymo` source pane; its `active` state SHALL reflect pane visibility. The separate **`Preview` tab SHALL be removed** (the canvas is always present behind the pane). | minimal chrome | `FR-CS-02` (center `Code`/`Preview` tabs), `FR-CS-07` (truthful `Code`/`Preview` tabs) |
| **`FR-CR2-02`** | On first load the editor SHALL default to **code-hidden** — the canvas spans the full workspace; the source pane appears only when the user activates the `Code` toggle. | canvas-first | the implicit "code-shown" default (`DESIGN §8` `showCode` flag) |
| **`FR-CR2-03`** | When shown, the source pane SHALL render to the **right** of the canvas (canvas leads, code docks right). | canvas-first layout | `DESIGN §1`/`§8` (code pane **left** of canvas) |

## 3. Non-functional requirements (`NFR-CR2`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| **`NFR-CR2-01`** | **Client-only & golden-safe.** All change is confined to `website/app/*` chrome; `renderSVG`/`svgBackground` are untouched, so the Python/JS render goldens stay **byte-identical**. | `NFR-CS-03` |
| **`NFR-CR2-02`** | The render-guard E2E SHALL stay green; no new runtime dependency is introduced. | `NFR-CS-02` |

## 4. Scope

**In scope:** the three chrome changes above, in `ui/TopBar.tsx`, `App.tsx`, `index.html`, and the
covering `e2e/chrome.spec.ts`.

**Out of scope (non-goals — `FEAT-STUDIO-001 §4` stands):** any inspector / right-panel, timeline,
create-tools, comments/versions, persistence backend, or change to the render core. CR-002 is
chrome-simplification only.

## 5. Acceptance criteria

1. No `tab-preview` exists in the DOM; a **single** `Code` control toggles the source pane both ways,
   its `active` state tracking pane visibility (`FR-CR2-01`).
2. On first load the canvas is full-width and the source pane is hidden (`FR-CR2-02`).
3. When shown, the source pane renders to the **right** of the canvas (`FR-CR2-03`).
4. `renderSVG`/`svgBackground` goldens are byte-identical; render-guard green (`NFR-CR2-01/-02`).

**Supersession / traceability** (CR-local → parent baseline; covering tests in `TEST-STUDIO-002 §5`):

| `FR-CR2` | Supersedes (parent `FEAT-STUDIO-001` / `DESIGN-STUDIO-001`) | Covered by |
|----------|------------------------------------------------------------|------------|
| `FR-CR2-01` | `FR-CS-02`, `FR-CS-07`, `FEAT §5 #6`; `DESIGN §3`, `§11` | `TC-CR2-01` |
| `FR-CR2-02` | implicit code-shown default; `DESIGN §8` | `TC-CR2-02` |
| `FR-CR2-03` | `DESIGN §1`, `§8` | `TC-CR2-03` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Initial delta SRS for CR-002: `FR-CR2-01` single `Code` toggle (drop `Preview`), `FR-CR2-02` default code-hidden, `FR-CR2-03` code pane on the right; `NFR-CR2-01/-02` (golden-safe / render-guard); scope + acceptance + supersession table mapping to parent `FR-CS-02`/`FR-CS-07` and `DESIGN §1/§3/§8/§11`. |
