---
title: "Canvas Studio CR-002 — Editor-Chrome Simplification: Overview & Change Record"
document_id: INTRO-STUDIO-002
version: "0.1"
issue_date: 2026-05-27
status: Open
classification: Internal
owner: diagrams/ project
audience: canvas-studio maintainers / reviewers; the approver of the baseline; the engineer closing CR-002
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-STUDIO-002
  - DESIGN-STUDIO-002
  - TEST-STUDIO-002
  - PLAN-STUDIO-002
  - INTRO-STUDIO-001
  - FEAT-STUDIO-001
  - DESIGN-STUDIO-001
  - TEST-STUDIO-001
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
  - preview-tab
  - canvas-first
  - canvas-studio
---

# Canvas Studio CR-002 — Editor-Chrome Simplification: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-STUDIO-002` |
| Version           | 0.1 |
| Status            | **Open** — raised, awaiting assessment / approval |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low–Medium** — UX-polish / deliberate design change (no integrity defect) |
| Type              | **Enhancement** (deliberate baseline change — *not* corrective, unlike `CR-STUDIO-001`) |
| Related Documents | `FEAT-STUDIO-002` (requirements), `DESIGN-STUDIO-002` (design), `TEST-STUDIO-002` (V&V), `PLAN-STUDIO-002` (close-out plan); parent baseline `INTRO-/FEAT-/DESIGN-/TEST-/PLAN-STUDIO-001` |

> **What this folder is.** `CR-002/` is a **self-contained mini engineering-spec** for one change to
> the baselined `canvas-studio` spec (`STUDIO-001`). It mirrors the parent folder's layout — `01-INTRO`
> → `02-REQUIREMENT` → `03-DESIGN` → `04-TEST` → `05-PLAN` — scoped to this change. This `01-INTRO`
> doubles as the **change record** (status + decision log). Per the parent change-control rule
> (`INTRO-STUDIO-001 §5`), any change to baselined clauses is raised here and re-baselined on close.

---

## 1. Purpose & motivation

The web playground's editor (`website/app/`) opens **code-first**: on first load the `.kymo` source
pane is shown, occupying the **left** ~38% of the workspace, and the top bar carries two center tabs —
`Code` and `Preview`. For a **canvas-first** studio (the product framing in `PROD-STUDIO-001`) this is
the wrong default and one control too many:

- The **canvas should be the landing surface**, not the source text — code is an on-demand affordance.
- The **`Preview` tab is redundant.** It is a no-op when the code pane is already hidden; its only
  effect is to *hide* code when shown — which the `Code` toggle already does. With code hidden by
  default and a single `Code` show/hide toggle, `Preview` carries no state of its own.
- A code pane pinned to the **left** pushes the canvas off-centre; diagramming tools conventionally
  keep the canvas primary and dock secondary editors to the **right**.

**As-built reality (verified):**

| Concern | Current behaviour | Evidence |
|---|---|---|
| Default pane state | Code pane **shown** on first load | `App.tsx:36` — `const [showCode, setShowCode] = useState(true);` |
| Code-pane side | Code pane **left**; canvas (rail + board) right | `index.html:194` grid `minmax(280px, 38%) 1fr`; `.pane.editor` first DOM child (`App.tsx:239`), `.pane.view` second (`App.tsx:258`); `.pane.editor { border-right }` (`index.html:198`) |
| Center tabs | Two tabs `tab-code` + `tab-preview` | `ui/TopBar.tsx:86–105` — `Preview` is a no-op when code already hidden |

**Intended outcome.** Canvas-first on load, a single `Code` show/hide toggle (no `Preview` tab), and
the code pane docked on the **right**. Client-only; the render core (`renderSVG`/`svgBackground`) is
untouched (golden-safe).

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-STUDIO-002` | This doc — motivation, map, supersession summary, **change record**. |
| `02-REQUIREMENT.md` | `FEAT-STUDIO-002` | The change as requirements (`FR-CR2-01..03`, `NFR-CR2-*`), scope, acceptance, supersession table. |
| `03-DESIGN.md` | `DESIGN-STUDIO-002` | How — `TopBar.tsx` / `App.tsx` / `index.html` edits per requirement; golden-safety; risks. |
| `04-TEST.md` | `TEST-STUDIO-002` | V&V — `TC-CR2-01..03` (in `e2e/chrome.spec.ts`), regression gates, traceability matrix. |
| `05-PLAN.md` | `PLAN-STUDIO-002` | Close-out plan — phases, risk register, files, verification gate, worklog. |

## 3. Relationship to the canvas-studio baseline

CR-002 is a change-request against the baselined `canvas-studio` spec (`STUDIO-001`). It **supersedes**
these clauses (named here; the parent docs are edited only at close-out, under `PLAN-STUDIO-002`):

| Clause | Doc | Change |
|--------|-----|--------|
| `FR-CS-02`, `FR-CS-07`, §5 #6 | `FEAT-STUDIO-001` | Center `Code`/`Preview` tabs → single `Code` toggle |
| §1, §3, §8, §11 | `DESIGN-STUDIO-001` | Code pane **left** → **right**; `showCode` defaults hidden; tabs → toggle |
| `TC-CS-02`, `TC-CS-07` | `TEST-STUDIO-001` | Tab assertions updated (no `tab-preview`) + default-hidden + code-right |
| §4 P2/P7 | `PLAN-STUDIO-001` | Phase goals referencing the tabs (re-baseline note) |

This mini-spec's own item IDs are **CR-local** (`FR-CR2-`/`NFR-CR2-`/`TC-CR2-`/`RK-CR2-`) and map to the
parent `FR-CS`/`TC-CS` clauses they amend (see `FEAT-STUDIO-002 §5`).

## 4. Reading guide

- **Approver:** read §1 + §3 here, then `FEAT-STUDIO-002 §2/§5`.
- **Implementer (on approval):** `DESIGN-STUDIO-002` → `PLAN-STUDIO-002`, verify against
  `TEST-STUDIO-002`.
- **Reviewer:** `TEST-STUDIO-002 §5` traceability + the §5 change record below.

## 5. Status & change record

**Status: Open** · Severity **Low–Medium** · Type **Enhancement**. Doc-only at this stage: no
`website/app/` code, no bundle rebuild, parent `STUDIO-001` baseline intact. On approval, the code +
parent re-baseline land under `PLAN-STUDIO-002`, after which this status flips **Open → Closed** and the
`07-CR/README.md` register row follows.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-27 | Vũ Anh | **Raised.** Awaiting assessment / approval. Mini-spec authored (`02`–`05`). |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Raised. Restructured CR-STUDIO-002 into a self-contained `CR-002/` mini-spec (`01-INTRO`/`02-REQUIREMENT`/`03-DESIGN`/`04-TEST`/`05-PLAN`, `STUDIO-002` series); this `01-INTRO` carries the change record. Proposes: single `Code` toggle (drop `Preview`), default code-hidden (canvas-first), code pane on the right. Names superseded parent clauses (`FR-CS-02`/`FR-CS-07`/§5 #6; `DESIGN §1/§3/§8/§11`; `TC-CS-02`/`TC-CS-07`; `PLAN §4 P2/P7`); cites verified as-built `file:line` evidence. No code / no parent edits yet. |
