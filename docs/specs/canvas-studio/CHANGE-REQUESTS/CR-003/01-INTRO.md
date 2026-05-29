---
title: "Canvas Studio CR-003 — Code Pane on the Right: Overview & Change Record"
document_id: INTRO-STUDIO-003
version: "0.2"
issue_date: 2026-05-29
status: Closed
classification: Internal
owner: diagrams/ project
audience: canvas-studio maintainers / reviewers; the approver of the baseline; the engineer closing CR-003
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-STUDIO-003
  - DESIGN-STUDIO-003
  - TEST-STUDIO-003
  - PLAN-STUDIO-003
  - INTRO-STUDIO-002
  - DESIGN-STUDIO-001
  - FEAT-STUDIO-001
  - PLAN-STUDIO-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - editor-chrome
  - code-pane
  - layout
  - canvas-first
  - canvas-studio
---

# Canvas Studio CR-003 — Code Pane on the Right: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-STUDIO-003` |
| Version           | 0.2 |
| Status            | **Closed** — implemented, verified, re-baselined |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low** — UX-polish / layout-only change (no integrity defect) |
| Type              | **Enhancement** (deliberate baseline change — *not* corrective) |
| Related Documents | `FEAT-STUDIO-003` (requirements), `DESIGN-STUDIO-003` (design), `TEST-STUDIO-003` (V&V), `PLAN-STUDIO-003` (close-out plan); parent baseline `INTRO-/FEAT-/DESIGN-/TEST-/PLAN-STUDIO-001` |

> **What this folder is.** `CR-003/` is a **self-contained mini engineering-spec** for one change to
> the baselined `canvas-studio` spec (`STUDIO-001`). It mirrors the parent folder's layout — `01-INTRO`
> → `02-REQUIREMENT` → `03-DESIGN` → `04-TEST` → `05-PLAN` — scoped to this change. This `01-INTRO`
> doubles as the **change record** (status + decision log). Per the parent change-control rule
> (`INTRO-STUDIO-001 §5`), any change to baselined clauses is raised here and re-baselined on close.

---

## 1. Purpose & motivation

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

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-STUDIO-003` | This doc — motivation, map, supersession summary, **change record**. |
| `02-REQUIREMENT.md` | `FEAT-STUDIO-003` | The change as requirements (`FR-CR3-01`, `NFR-CR3-*`), scope, acceptance, supersession table. |
| `03-DESIGN.md` | `DESIGN-STUDIO-003` | How — `App.tsx` / `index.html` edits; golden-safety; risks. |
| `04-TEST.md` | `TEST-STUDIO-003` | V&V — `TC-CR3-01` (in `e2e/chrome.spec.ts`), regression gates, traceability matrix. |
| `05-PLAN.md` | `PLAN-STUDIO-003` | Close-out plan — phases, risk register, files, verification gate, worklog. |

## 3. Relationship to the canvas-studio baseline

CR-003 is a change-request against the baselined `canvas-studio` spec (`STUDIO-001`). It **supersedes**
these clauses (named here; the parent docs are edited only at close-out, under `PLAN-STUDIO-003`):

| Clause | Doc | Change |
|--------|-----|--------|
| §1 (layout ASCII) | `DESIGN-STUDIO-001` | Code pane **left** of canvas → **right** of canvas |
| §8 (`code \| canvas \| reserved` column order) | `DESIGN-STUDIO-001` | Column order → `canvas \| code` (canvas leads; code docks right) |

This mini-spec's own item IDs are **CR-local** (`FR-CR3-`/`NFR-CR3-`/`TC-CR3-`/`RK-CR3-`) and map to the
parent `DESIGN-STUDIO-001` clauses they amend (see `FEAT-STUDIO-003 §5`). No parent `FR-CS`/`TC-CS`
functional clause changes — the move is layout-only.

## 4. Reading guide

- **Approver:** read §1 + §3 here, then `FEAT-STUDIO-003 §2/§5`.
- **Implementer (on approval):** `DESIGN-STUDIO-003` → `PLAN-STUDIO-003`, verify against
  `TEST-STUDIO-003`.
- **Reviewer:** `TEST-STUDIO-003 §5` traceability + the §5 change record below.

## 5. Status & change record

**Status: Closed** · Severity **Low** · Type **Enhancement**. Implemented in `website/app/` per
`DESIGN-STUDIO-003 §2`, verified (`TC-CR3-01` + goldens), and the parent `DESIGN-STUDIO-001 §1/§8`
re-baselined to v0.6. The `CHANGE-REQUESTS/README.md` register row is **Closed**.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-29 | Vũ Anh | **Raised.** Carved the code-pane-on-the-right concern out of `CR-STUDIO-002` (`FR-CR2-03`) into this standalone CR-003. Mini-spec authored (`02`–`05`). Awaiting assessment / approval. |
| 2026-05-29 | Vũ Anh | **Approved & implemented.** `App.tsx` renders `.pane.view` before `.pane.editor`; `index.html` grid `1fr minmax(280px, 38%)`, `.pane.editor { border-left }` (+ responsive `border-top`). `TC-CR3-01` added (22/22 e2e green); `js`/`python` goldens byte-identical; bundle rebuilt. Parent `DESIGN-STUDIO-001 §1/§8` re-baselined (v0.6). **Closed.** |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-29 | Vũ Anh | Raised. Authored CR-STUDIO-003 as a self-contained `CR-003/` mini-spec (`01-INTRO`/`02-REQUIREMENT`/`03-DESIGN`/`04-TEST`/`05-PLAN`, `STUDIO-003` series); this `01-INTRO` carries the change record. Scope: move the `.kymo` source pane to the **right** of the canvas (layout-only). Split out from `CR-STUDIO-002 FR-CR2-03`; names superseded parent clauses (`DESIGN-STUDIO-001 §1`/`§8`); cites verified as-built `file:line` evidence. No code / no parent edits yet. |
| 0.2     | 2026-05-29 | Vũ Anh | **Closed.** Implemented per `DESIGN-STUDIO-003 §2` (`App.tsx` pane reorder; `index.html` grid `1fr minmax(280px, 38%)` + `.pane.editor border-left` + responsive `border-top`); `TC-CR3-01` added (22/22 e2e); `js`/`python` goldens byte-identical; bundle rebuilt. Parent `DESIGN-STUDIO-001 §1/§8` re-baselined to v0.6. Status **Open → Closed**; register row Closed. |
