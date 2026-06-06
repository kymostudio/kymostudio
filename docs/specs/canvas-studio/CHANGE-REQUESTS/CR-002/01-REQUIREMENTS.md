---
title: "Canvas Studio CR-002 — Requirements (Introduction & SRS delta)"
document_id: FEAT-STUDIO-002
version: "0.4"
issue_date: 2026-05-27
status: Closed
classification: Internal
owner: diagrams/ project
audience: canvas-studio maintainers / reviewers; engineers implementing or reviewing CR-002
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - DESIGN-STUDIO-002
  - TEST-STUDIO-002
  - PLAN-STUDIO-002
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
  - preview-tab
  - canvas-first
  - canvas-studio
---

# Canvas Studio CR-002 — Requirements (Introduction & SRS delta)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-STUDIO-002` |
| Version           | 0.4 |
| Status            | **Closed** — implemented + re-baselined (2026-05-31) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low–Medium** — UX-polish / deliberate design change (no integrity defect) |
| Type              | **Enhancement** (deliberate baseline change — *not* corrective, unlike `CR-STUDIO-001`) |
| Related Documents | `DESIGN-STUDIO-002` (design), `TEST-STUDIO-002` (V&V), `PLAN-STUDIO-002` (close-out plan); parent baseline `FEAT-STUDIO-001` |

> **What this folder is.** `CR-002/` is a **self-contained mini engineering-spec** for one change to
> the baselined `canvas-studio` spec (`STUDIO-001`). It mirrors the parent folder's layout — `01-REQUIREMENTS`
> → `02-DESIGN` → `03-TEST` → `04-PLAN` — scoped to this change. This `01-REQUIREMENTS` doubles as
> the **change record** (status + decision log) and the **delta SRS**. Per the parent change-control rule
> (`FEAT-STUDIO-001 §C change management`), any change to baselined clauses is raised here and
> re-baselined on close.

---

## Part A — Introduction & Change Record

### A.1 Purpose & motivation

The web playground's editor (`website/app/`) opens **code-first**: on first load the `.kymo` source
pane is shown, occupying the **left** ~38% of the workspace, and the top bar carries two center tabs —
`Code` and `Preview`. For a **canvas-first** studio (the product framing in `FEAT-STUDIO-001` Part A) this is
the wrong default and one control too many:

- The **canvas should be the landing surface**, not the source text — code is an on-demand affordance.
- The **`Preview` tab is redundant.** It is a no-op when the code pane is already hidden; its only
  effect is to *hide* code when shown — which the `Code` toggle already does. With code hidden by
  default and a single `Code` show/hide toggle, `Preview` carries no state of its own.

> **Scope note — split into CR-003.** The code-pane *side* (left → **right**) was originally bundled
> here as `FR-CR2-03`. It is now carved out into **`CR-STUDIO-003`** (`CR-003/`) so the pure
> layout-side move is tracked and approved independently. CR-002 retains only the two concerns below
> (drop the `Preview` tab; default the code pane hidden).

**As-built reality (verified):**

| Concern | Current behaviour | Evidence |
|---|---|---|
| Default pane state | Code pane **shown** on first load | `App.tsx:36` — `const [showCode, setShowCode] = useState(true);` |
| Center tabs | Two tabs `tab-code` + `tab-preview` | `ui/TopBar.tsx:86–105` — `Preview` is a no-op when code already hidden |

**Intended outcome.** Canvas-first on load and a single `Code` show/hide toggle (no `Preview` tab).
Client-only; the render core (`renderSVG`/`svgBackground`) is untouched (golden-safe). The code-pane
side stays as-built here — moving it to the right is `CR-STUDIO-003`.

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-STUDIO-002` | This doc — motivation, map, supersession summary, **change record** + **delta SRS** (`FR-CR2-*`). |
| `02-DESIGN.md` | `DESIGN-STUDIO-002` | How — `TopBar.tsx` / `App.tsx` edits per requirement; golden-safety; risks. |
| `03-TEST.md` | `TEST-STUDIO-002` | V&V — `TC-CR2-01..03` (in `e2e/chrome.spec.ts`), regression gates, traceability matrix. |
| `04-PLAN.md` | `PLAN-STUDIO-002` | Close-out plan — phases, risk register, files, verification gate, worklog. |

### A.3 Relationship to the canvas-studio baseline

CR-002 is a change-request against the baselined `canvas-studio` spec (`FEAT-STUDIO-001`). It **supersedes**
these clauses (named here; the parent docs are edited only at close-out, under `PLAN-STUDIO-002`):

| Clause | Doc | Change |
|--------|-----|--------|
| `FR-CS-02`, `FR-CS-07`, §C.5 #6 | `FEAT-STUDIO-001` | Center `Code`/`Preview` tabs → single `Code` toggle |
| §3, §8, §11 | `DESIGN-STUDIO-001` | `showCode` defaults hidden; center tabs → single toggle (the §1/§8 code-pane *side* is now `CR-STUDIO-003`) |
| `TC-CS-02`, `TC-CS-07` | `TEST-STUDIO-001` | Tab assertions updated (no `tab-preview`) + default-hidden |
| §4 P2/P7 | `PLAN-STUDIO-001` | Phase goals referencing the tabs (re-baseline note) |

This mini-spec's own item IDs are **CR-local** (`FR-CR2-`/`NFR-CR2-`/`TC-CR2-`/`RK-CR2-`) and map to the
parent `FR-CS`/`TC-CS` clauses they amend (see §B.5 supersession table).

### A.4 Reading guide

- **Approver:** read §A.1 + §A.3 here, then §B.2/§B.5.
- **Implementer (on approval):** `02-DESIGN` → `04-PLAN`, verify against `03-TEST`.
- **Reviewer:** `03-TEST` §5 traceability + the §A.5 change record below.

### A.5 Status & change record

**Status: Closed** · Severity **Low–Medium** · Type **Enhancement**. Implemented and re-baselined: the
single `Code` toggle (no `Preview` tab) + canvas-first default shipped in `website/app/`, the bundle was
rebuilt, the parent `STUDIO-001` clauses named in §A.3 were reconciled, and the `CHANGE-REQUESTS/README.md`
register row flipped to **Closed**.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-27 | Vũ Anh | **Raised.** Awaiting assessment / approval. Mini-spec authored (`02`–`05`). |
| 2026-05-29 | Vũ Anh | **Scope narrowed.** Code-pane-on-the-right (`FR-CR2-03`) carved out into `CR-STUDIO-003`. CR-002 now covers only the single `Code` toggle (drop `Preview`) + default code-hidden. Still **Open**, awaiting approval. |
| 2026-05-31 | Vũ Anh | **Closed — implemented + re-baselined.** P1 (`ui/TopBar.tsx` drops the `tab-preview` button + `Play` import; `App.tsx` `showCode` default `false`; bundle rebuilt 413.3 kb) → P2 (`TC-CR2-01`/`TC-CR2-02` in `e2e/chrome.spec.ts`; full suite **23/23**; `js` goldens byte-identical; three canvas-jam specs that read `textarea#editor` reveal the now-hidden pane first) → P3 (re-baselined `FEAT-STUDIO-001` 0.7, `DESIGN-STUDIO-001` 0.7, `TEST-STUDIO-001` 0.6, `PLAN-STUDIO-001` 0.7; register row Closed). |

---

## Part B — Requirements (SRS delta)

> **Delta SRS.** This states the requirements *for the CR-002 change only*. Each `FR-CR2` maps to the
> baselined `FEAT-STUDIO-001` clause it supersedes (§B.5). It does **not** re-state the whole feature.

### B.1 Stakeholder needs

The CR-002 change serves these existing `canvas-studio` stakeholder needs (`FEAT-STUDIO-001` Part A):

- `SN-CS` (canvas-first hi-fi editor) — the canvas, not the source text, should be the landing surface.
- `SN-CS` (minimal, unambiguous chrome) — **one owner per control**; no redundant tab. (This extends
  the `FR-CS-07` "one owner per control" intent to the center tabs.)

### B.2 Functional requirements (`FR-CR2`)

| ID | Requirement | Source need | Supersedes |
|----|-------------|-------------|------------|
| **`FR-CR2-01`** | The center chrome SHALL expose a **single `Code` toggle** that shows/hides the `.kymo` source pane; its `active` state SHALL reflect pane visibility. The separate **`Preview` tab SHALL be removed** (the canvas is always present behind the pane). | minimal chrome | `FR-CS-02` (center `Code`/`Preview` tabs), `FR-CS-07` (truthful `Code`/`Preview` tabs) |
| **`FR-CR2-02`** | On first load the editor SHALL default to **code-hidden** — the canvas spans the full workspace; the source pane appears only when the user activates the `Code` toggle. | canvas-first | the implicit "code-shown" default (`DESIGN §8` `showCode` flag) |

> The code-pane *side* (left → **right**) was formerly `FR-CR2-03`; it is now `FR-CR3-01` in
> **`CR-STUDIO-003`** and is out of scope here.

### B.3 Non-functional requirements (`NFR-CR2`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| **`NFR-CR2-01`** | **Client-only & golden-safe.** All change is confined to `website/app/*` chrome; `renderSVG`/`svgBackground` are untouched, so the Python/JS render goldens stay **byte-identical**. | `NFR-CS-03` |
| **`NFR-CR2-02`** | The render-guard E2E SHALL stay green; no new runtime dependency is introduced. | `NFR-CS-02` |

### B.4 Scope

**In scope:** the two chrome changes above, in `ui/TopBar.tsx` (drop `Preview`) and `App.tsx` (default
`showCode` false), and the covering `e2e/chrome.spec.ts`.

**Out of scope (non-goals — `FEAT-STUDIO-001` §C.4 stands):** the code-pane *side* (left → right) —
that is `CR-STUDIO-003`; any inspector / right-panel, timeline, create-tools, comments/versions,
persistence backend, or change to the render core. CR-002 is chrome-simplification only.

### B.5 Acceptance criteria

1. No `tab-preview` exists in the DOM; a **single** `Code` control toggles the source pane both ways,
   its `active` state tracking pane visibility (`FR-CR2-01`).
2. On first load the canvas is full-width and the source pane is hidden (`FR-CR2-02`).
3. `renderSVG`/`svgBackground` goldens are byte-identical; render-guard green (`NFR-CR2-01/-02`).

**Supersession / traceability** (CR-local → parent baseline; covering tests in `TEST-STUDIO-002 §5`):

| `FR-CR2` | Supersedes (parent `FEAT-STUDIO-001` / `DESIGN-STUDIO-001`) | Covered by |
|----------|------------------------------------------------------------|------------|
| `FR-CR2-01` | `FR-CS-02`, `FR-CS-07`, `FEAT §C.5 #6`; `DESIGN §3`, `§11` | `TC-CR2-01` |
| `FR-CR2-02` | implicit code-shown default; `DESIGN §8` (`showCode` flag) | `TC-CR2-02` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-27 | Vũ Anh | Raised. Restructured CR-STUDIO-002 into a self-contained `CR-002/` mini-spec (`01-INTRO`/`02-REQUIREMENT`/`03-DESIGN`/`04-TEST`/`05-PLAN`, `STUDIO-002` series); this `01-INTRO` carries the change record. Proposes: single `Code` toggle (drop `Preview`), default code-hidden (canvas-first), code pane on the right. Names superseded parent clauses (`FR-CS-02`/`FR-CS-07`/§5 #6; `DESIGN §1/§3/§8/§11`; `TC-CS-02`/`TC-CS-07`; `PLAN §4 P2/P7`); cites verified as-built `file:line` evidence. No code / no parent edits yet. |
| 0.2     | 2026-05-29 | Vũ Anh | **Scope narrowed:** code-pane-on-the-right (`FR-CR2-03`, `DESIGN §4`, `TC-CR2-03`) carved out into `CR-STUDIO-003`. Removed it from §1 motivation, §1 as-built table, intended outcome and the §3 supersession table (CR-002 no longer supersedes `DESIGN §1`; §8 here = `showCode` default only). CR-002 now scopes to: single `Code` toggle (drop `Preview`) + default code-hidden. Change-record row added. |
| 0.3     | 2026-05-31 | Vũ Anh | **Closed.** Control-table + frontmatter status **Open → Closed**; §5 status sentence rewritten to past-tense (implemented + re-baselined) and a 2026-05-31 decision-log row added. Mirrors the close-out recorded in `PLAN-STUDIO-002` Annex B and the parent re-baseline (`FEAT`/`DESIGN`/`TEST`/`PLAN-STUDIO-001`). |
| 0.4     | 2026-06-06 | Vũ Anh | **Consolidation.** Merged `01-INTRO.md` (FEAT-STUDIO-002) and `02-REQUIREMENT.md` (FEAT-STUDIO-002) into this single `01-REQUIREMENTS.md` under document_id `FEAT-STUDIO-002`. Part A carries the introduction & change record (from FEAT-STUDIO-002); Part B carries the delta SRS (from FEAT-STUDIO-002). Files `01-INTRO.md` and `02-REQUIREMENT.md` removed; `03-DESIGN.md`→`02-DESIGN.md`, `04-TEST.md`→`03-TEST.md`, `05-PLAN.md`→`04-PLAN.md`. |
