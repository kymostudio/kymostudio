---
title: "Canvas Studio CR-003 — Requirements (Introduction & SRS delta)"
document_id: FEAT-STUDIO-003
version: "0.2"
issue_date: 2026-05-29
status: Closed
classification: Internal
owner: diagrams/ project
audience: canvas-studio maintainers / reviewers; engineers implementing or reviewing CR-003
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - DESIGN-STUDIO-003
  - TEST-STUDIO-003
  - PLAN-STUDIO-003
  - FEAT-STUDIO-002
  - DESIGN-STUDIO-001
  - FEAT-STUDIO-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - requirements
  - srs
  - iso-29148
  - editor-chrome
  - code-pane
  - layout
  - canvas-first
  - canvas-studio
---

# Canvas Studio CR-003 — Requirements (Introduction & SRS delta)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-STUDIO-003` |
| Version           | 0.2 |
| Status            | **Closed** — implemented, verified, re-baselined |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low** — UX-polish / layout-only change (no integrity defect) |
| Type              | **Enhancement** (deliberate baseline change — *not* corrective) |
| Related Documents | `DESIGN-STUDIO-003` (design), `TEST-STUDIO-003` (V&V), `PLAN-STUDIO-003` (close-out plan); parent baseline `FEAT-STUDIO-001` |

> **What this folder is.** `CR-003/` is a **self-contained mini engineering-spec** for one change to
> the baselined `canvas-studio` spec (`STUDIO-001`). It mirrors the parent folder's layout — `01-REQUIREMENTS`
> → `02-DESIGN` → `03-TEST` → `04-PLAN` — scoped to this change. This `01-REQUIREMENTS` doubles as
> the **change record** (status + decision log) and the **delta SRS**. Per the parent change-control rule
> (`FEAT-STUDIO-001 §C change management`), any change to baselined clauses is raised here and
> re-baselined on close.

---

## Part A — Introduction & Change Record

### A.1 Purpose & motivation

The web playground's editor (`website/app/`) docks the `.kymo` source pane on the **left** ~38% of the
workspace, pushing the canvas off-centre to the right. Diagramming tools conventionally keep the
**canvas primary** and dock secondary editors to the **right**; the source text is an assist, not the
landing surface. This CR moves the source pane to the **right** of the canvas so the canvas leads.

**Scope note — split from CR-002.** This change was originally bundled as `FR-CR2-03` inside
`CR-STUDIO-002` (editor-chrome simplification). It is **carved out into CR-003** so the pure
layout-side change is tracked and approved independently of CR-002's two other concerns (drop the
`Preview` tab; default the code pane hidden). CR-002 retains those two; CR-003 owns **only** the
left→right move. The two CRs are non-overlapping and may land in either order.

**As-built reality (verified):**

| Concern | Current behaviour | Evidence |
|---|---|---|
| Code-pane side | Code pane **left**; canvas (rail + board) right | `index.html:194` grid `minmax(280px, 38%) 1fr`; `.pane.editor` first DOM child (`App.tsx:239`), `.pane.view` second (`App.tsx:258`); `.pane.editor { border-right }` (`index.html:198`) |
| Hidden-state collapse | `main.code-hidden { grid-template-columns: 1fr }` (canvas full-width when code hidden) | `index.html:196`; `<main className={showCode ? undefined : "code-hidden"}>` (`App.tsx:237`) |

**Intended outcome.** When the source pane is shown, it docks on the **right**; the canvas occupies the
left/primary column. The `showCode` default, the `Code`/`Preview` tabs, and all other chrome are
**unchanged** by this CR (they remain as-built, or as CR-002 may amend them). Client-only; the render
core (`renderSVG`/`svgBackground`) is untouched (golden-safe).

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-STUDIO-003` | This doc — motivation, map, supersession summary, **change record** + **delta SRS** (`FR-CR3-*`). |
| `02-DESIGN.md` | `DESIGN-STUDIO-003` | How — `App.tsx` / `index.html` edits; golden-safety; risks. |
| `03-TEST.md` | `TEST-STUDIO-003` | V&V — `TC-CR3-01` (in `e2e/chrome.spec.ts`), regression gates, traceability matrix. |
| `04-PLAN.md` | `PLAN-STUDIO-003` | Close-out plan — phases, risk register, files, verification gate, worklog. |

### A.3 Relationship to the canvas-studio baseline

CR-003 is a change-request against the baselined `canvas-studio` spec (`FEAT-STUDIO-001`). It **supersedes**
these clauses (named here; the parent docs are edited only at close-out, under `PLAN-STUDIO-003`):

| Clause | Doc | Change |
|--------|-----|--------|
| §1 (layout ASCII) | `DESIGN-STUDIO-001` | Code pane **left** of canvas → **right** of canvas |
| §8 (`code \| canvas \| reserved` column order) | `DESIGN-STUDIO-001` | Column order → `canvas \| code` (canvas leads; code docks right) |

This mini-spec's own item IDs are **CR-local** (`FR-CR3-`/`NFR-CR3-`/`TC-CR3-`/`RK-CR3-`) and map to the
parent `DESIGN-STUDIO-001` clauses they amend (see §B.5). No parent `FR-CS`/`TC-CS`
functional clause changes — the move is layout-only.

### A.4 Reading guide

- **Approver:** read §A.1 + §A.3 here, then §B.2/§B.5.
- **Implementer (on approval):** `02-DESIGN` → `04-PLAN`, verify against `03-TEST`.
- **Reviewer:** `03-TEST` §5 traceability + the §A.5 change record below.

### A.5 Status & change record

**Status: Closed** · Severity **Low** · Type **Enhancement**. Implemented in `website/app/` per
`DESIGN-STUDIO-003 §2`, verified (`TC-CR3-01` + goldens), and the parent `DESIGN-STUDIO-001 §1/§8`
re-baselined to v0.6. The `CHANGE-REQUESTS/README.md` register row is **Closed**.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-29 | Vũ Anh | **Raised.** Carved the code-pane-on-the-right concern out of `CR-STUDIO-002` (`FR-CR2-03`) into this standalone CR-003. Mini-spec authored (`02`–`05`). Awaiting assessment / approval. |
| 2026-05-29 | Vũ Anh | **Approved & implemented.** `App.tsx` renders `.pane.view` before `.pane.editor`; `index.html` grid `1fr minmax(280px, 38%)`, `.pane.editor { border-left }` (+ responsive `border-top`). `TC-CR3-01` added (22/22 e2e green); `js`/`python` goldens byte-identical; bundle rebuilt. Parent `DESIGN-STUDIO-001 §1/§8` re-baselined (v0.6). **Closed.** |

---

## Part B — Requirements (SRS delta)

> **Delta SRS.** This states the requirement *for the CR-003 change only*. `FR-CR3-01` maps to the
> baselined `DESIGN-STUDIO-001` clauses it supersedes (§B.5). It does **not** re-state the whole feature.

### B.1 Stakeholder needs

The CR-003 change serves this existing `canvas-studio` stakeholder need (`FEAT-STUDIO-001` Part A):

- `SN-CS` (canvas-first hi-fi editor) — the canvas, not the source text, should hold the primary column;
  secondary editors dock to the side, by convention the **right**.

### B.2 Functional requirements (`FR-CR3`)

| ID | Requirement | Source need | Supersedes |
|----|-------------|-------------|------------|
| **`FR-CR3-01`** | When the `.kymo` source pane is shown, it SHALL render to the **right** of the canvas (the canvas occupies the left/primary column; code docks right). The pane's visibility trigger (`showCode` / the `Code` control) and all other chrome are unchanged by this requirement. | canvas-first layout | `DESIGN-STUDIO-001 §1` (layout — code pane left of canvas), `§8` (`code \| canvas \| reserved` column order) |

### B.3 Non-functional requirements (`NFR-CR3`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| **`NFR-CR3-01`** | **Client-only & golden-safe.** All change is confined to `website/app/*` chrome (React + CSS); `renderSVG`/`svgBackground` are untouched, so the Python/JS render goldens stay **byte-identical**. | `NFR-CS-03` |
| **`NFR-CR3-02`** | The render-guard E2E SHALL stay green; no new runtime dependency is introduced. | `NFR-CS-02` |

### B.4 Scope

**In scope:** the code-pane side change (left → right) in `App.tsx` (DOM order) and `index.html` (grid
column order + pane border side + responsive divider), and the covering `e2e/chrome.spec.ts` assertion.

**Out of scope (non-goals — `FEAT-STUDIO-001` §C.4 stands):** the `Code`/`Preview` tab simplification and
the default-hidden behaviour (those are `CR-STUDIO-002`); any inspector / right-panel, timeline,
create-tools, comments/versions, persistence backend, or change to the render core. CR-003 is a
layout-side move only.

### B.5 Acceptance criteria

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
| 0.1     | 2026-05-29 | Vũ Anh | Raised. Authored CR-STUDIO-003 as a self-contained `CR-003/` mini-spec (`01-INTRO`/`02-REQUIREMENT`/`03-DESIGN`/`04-TEST`/`05-PLAN`, `STUDIO-003` series); this `01-INTRO` carries the change record. Scope: move the `.kymo` source pane to the **right** of the canvas (layout-only). Split out from `CR-STUDIO-002 FR-CR2-03`; names superseded parent clauses (`DESIGN-STUDIO-001 §1`/`§8`); cites verified as-built `file:line` evidence. No code / no parent edits yet. Delta SRS (`FR-CR3-01`, `NFR-CR3-01/-02`) in `02-REQUIREMENT.md`. |
| 0.2     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged `01-INTRO.md` (FEAT-STUDIO-003) and `02-REQUIREMENT.md` (FEAT-STUDIO-003) into this single `01-REQUIREMENTS.md` under document_id `FEAT-STUDIO-003`. Part A carries the introduction & change record (from FEAT-STUDIO-003); Part B carries the delta SRS (from FEAT-STUDIO-003). Files `01-INTRO.md` and `02-REQUIREMENT.md` removed; `03-DESIGN.md`→`02-DESIGN.md`, `04-TEST.md`→`03-TEST.md`, `05-PLAN.md`→`04-PLAN.md`. Close status carried forward from FEAT-STUDIO-003 v0.2. |
