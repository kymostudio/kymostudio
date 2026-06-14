---
title: Editor Home — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KHOME-001
version: "0.2"
issue_date: 2026-06-15
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining kymo-editor's landing / Welcome surface (`packages/editor/web/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - DESIGN-KHOME-001
  - TEST-KHOME-001
  - PLAN-KHOME-001
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - FEAT-KSHARE-001
  - FEAT-KEMCP-001
authors:
  - Vũ Anh
language: en
keywords:
  - conops
  - stakeholder-requirements
  - requirements
  - srs
  - user-stories
  - kymo-editor
  - editor-home
  - welcome
  - landing
  - draft-first
  - open-file
  - templates
---

# Editor Home — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KHOME-001` |
| Version           | 0.2 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `DESIGN-KHOME-001` (the *how*), `TEST-KHOME-001` (V&V), `PLAN-KHOME-001` (delivery + risks), `FEAT-KEDITOR-001` (umbrella), `FEAT-KLIBRARY-001` (Recent list + template gallery it invokes), `FEAT-KRENDER-001` (authoring it hands off to), `FEAT-KLIVE-001` (`FR-LV-02` guest boundary, `FR-LV-08` draft model), `FEAT-KSHARE-001` (sibling — `?s=` links bypass the Welcome), `FEAT-KEMCP-001` (sibling) |

> **Module of the `kymo-editor` umbrella** (`FEAT-KEDITOR-001`). This module owns the
> **landing / home surface**: the VS Code-style **Welcome** shown at `/` for an untouched
> starter draft (Start · Recent · Templates · Learn), the guest sign-in invitation, and
> "Open file" into a draft. It owns the `SN-HM`, `FR-HM`, and `US-HM` IDs. Previously this
> surface had **no requirement of its own** (umbrella `FR-KE-21` even specified a
> contradictory redirect-to-most-recent); this module documents it **as-built** and
> supersedes that clause. Because it is a UI/UX-heavy surface, Part C carries a **user-story
> layer (`US-HM`) alongside the normative FRs** (team convention). **Full doc-set:** the *how*
> is in `DESIGN-KHOME-001`, the *V&V* in `TEST-KHOME-001`, and delivery + risks in `PLAN-KHOME-001`.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

A blank editor is a cold start, and a bare redirect gives a returning user no orientation.
kymo-editor grew a **Welcome home** (VS Code-style): opening `/` on an untouched starter
shows Start / Recent / Templates / Learn instead of the sample editor — a fast, oriented
on-ramp into the draft-first authoring loop. A guest is invited to sign in **there**, in
the Recent column, rather than being silently anonymous. This module owns that surface; the
capabilities it launches are owned by siblings (templates + Recent → `FEAT-KLIBRARY-001`;
authoring → `FEAT-KRENDER-001`; draft + account boundary → `FEAT-KLIVE-001`).

### A.2 Users & context of operations (ConOps)

- **Who:** every visitor (guest or signed-in) landing on `/` without a `?d`/`?s`.
- **Mechanics:** `showWelcome = isDraft && source === SAMPLE && !welcomeDismissed`
  (`EditorPage`); `WelcomeView` (`web/welcome.tsx`) renders the four blocks; any start
  action or a `?d`/`?s` navigation dismisses it.
- **Constraint:** thin presentation layer — owns no data, render, or account logic.

### A.3 Goals & non-goals

- **Goals:** an oriented, fast start; one place that offers New / recent / templates / help;
  a clear guest sign-in invitation; "Open file" to bring local source in.
- **Non-goals:** the template gallery itself (`FR-LB-02`), Recent data + thumbnails
  (`FR-LB-01/07`), the draft model (`FR-LV-08`), the account boundary (`FR-LV-02`), the
  signed-in VS Code shell around the editor (`FR-LB-06`).

### A.4 Stakeholder needs (`SN-HM`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-HM-01` | A user opening the editor wants an **oriented home** — create new, see recent work, pick a template, find docs — and a **guest must be invited to sign in** there, not left silently anonymous. | elaborates `SN-KE-16` (oriented-start half); guest invite relates `SN-KE-10` / `SN-LV-02` |

### A.5 Scope

**In scope:** `web/welcome.tsx` (WelcomeView), the `showWelcome` gate + `welcomeDismissed`
flag in `EditorPage`, the `openLocalFile` handler. **Out of scope:** everything in §A.3
non-goals.

---

## Part B — Introduction

### B.1 Purpose & motivation

Part of the decomposition of the shipped `kymo-editor` (see `FEAT-KEDITOR-001` §B.7). This
is the **landing surface** — the first thing a visitor sees. It is a **new as-built module**
(v0.1) closing a documentation gap, rather than an as-built carve-out of existing `FR-KE`
IDs.

### B.2 Document map

Full doc-set: this `01-REQUIREMENTS.md` + `DESIGN-KHOME-001` (the *how* — `welcome.tsx`, the
`showWelcome`/dismiss logic), `TEST-KHOME-001` (V&V — `TC-HM-01..06`; the umbrella `TC-KE-33` is
the integration-suite rollup), and `PLAN-KHOME-001` (delivery + risks). `editor-home` is the
**first module to grow its own `02`/`03`/`04`** (the others remain stubs on the shared
`DESIGN-/TEST-/PLAN-KEDITOR-001`). Cross-document references use **`document_id`** (never file paths).

### B.3 Relationship to the kymo-editor umbrella & sibling modules

See the module tree in `FEAT-KEDITOR-001` §B.7. Dependency direction: **editor-home builds
on `editor-library` (Recent + gallery), `editor-render` (authoring), and `editor-live`
(`FR-LV-02` guest boundary, `FR-LV-08` draft)** — it is a presentation layer over them and
owns none of their capabilities.

### B.4 Status & ownership

- **Status:** Implemented — shipped as part of the v0.4 product growth pass (the VS Code
  Welcome home); specified here retroactively to close the audit gap.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability:** `FR-HM-*` / `US-HM-*` covered by `TEST-KHOME-001` (`TC-HM-01..06`; umbrella rollup `TC-KE-33`).
- **Change management:** CRs under `docs/specs/kymo-editor/CR/` (umbrella) or module-local
  `CR/` once this doc-set grows; re-baselined here (bump version + Annex A).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords. Because this is a UI/UX-heavy surface, §C.2 adds a
**user-story layer** alongside the normative FRs of §C.1 (team convention): the FRs are the
contract, the stories carry intent and are the acceptance basis.

### C.1 Functional requirements — Welcome home (`FR-HM-01..02`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-HM-01** | The editor SHALL present a **Welcome home** at `/` whenever the buffer is an **untouched starter draft** (no `?d`/`?s`, the unedited sample) — replacing the source/preview panes until the user starts a diagram (`web/welcome.tsx`). It SHALL offer **Start** (New diagram → the template gallery of `FR-LB-02`; Open file → `FR-HM-02`), **Recent** (signed-in: the ≤ 8 most-recently-updated diagrams, opening `?d=`; **signed-out: a "Sign in to see your diagrams" prompt with a Google sign-in CTA** — the account boundary of `FR-LV-02`), **Templates** (a quick set of common types), and **Learn** (a docs link). Any start action (New / pick template / Open file) or a navigation to a `?d`/`?s` link SHALL dismiss the Welcome and reveal the editor; the header SHALL read **Welcome** while it shows. | SN-HM-01 |
| **FR-HM-02** | "Open file…" SHALL load a local `.kymo`/`.bpmn`/`.mmd`/`.mermaid`/`.txt`/`.md` into a **draft**, detecting the kind via `sniffKind` (`FR-RD-10`; fallback by extension), resetting the URL to `/` and entering the editor (`openLocalFile`). | SN-HM-01 |

### C.2 User stories (`US-HM`) — the UI/UX layer

- **US-HM-01 — Oriented landing (guest).** As a **signed-out visitor**, I want the editor
  to open on a **Welcome** (Start · Recent · Templates · Learn) with a **sign-in invite**,
  so that I'm oriented instead of being dropped into a blank sample.
  - *Given* a fresh `/` signed-out, *Then* the Welcome shows Start / Templates / Learn and a
    "Sign in to see your diagrams" + Google CTA in Recent (no panes; header reads "Welcome").
  - *Given* the Welcome, *When* I pick New / a template / Open file, *Then* it dismisses and
    the editor opens. *(realises `FR-HM-01`)*
- **US-HM-02 — Resume recent (signed-in).** As a **signed-in author**, I want my **recent
  diagrams on the landing**, so that I can jump back into work in one click.
  - *Given* a fresh `/` signed-in, *Then* Recent lists my ≤ 8 most-recently-updated diagrams;
    *When* I click one, *Then* it opens at `?d=`. *(realises `FR-HM-01`)*
- **US-HM-03 — Open a local file.** As an **author**, I want to **open a local diagram file**
  from the Welcome, so that I can continue existing work.
  - *Given* "Open file…", *When* I pick a `.kymo`/`.bpmn`/`.mmd`/`.txt`/`.md`, *Then* it
    loads as a draft with the kind auto-detected and the editor opens at `/`. *(realises `FR-HM-02`)*
- **US-HM-04 — Share link bypasses the Welcome.** As a **`?s=` recipient**, I want the
  diagram to open directly, so that I never see an irrelevant Welcome.
  - *Given* `/?s=…`, *Then* the shared diagram loads in the editor; the Welcome does not show. *(`FR-HM-01`)*

### C.3 Non-functional requirements

No module-owned NFRs. Inherited and binding: the umbrella's `NFR-KE-03` (static client
bundle) and `FR-LV-02`'s signed-out-usable boundary.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-15 | Vũ Anh | Initial as-built spec for the **Welcome home** landing surface, closing the audit gap (the surface had no owning requirement; umbrella `FR-KE-21` specified a contradictory redirect-to-most-recent, now superseded). Module-native `SN-HM-01`, `FR-HM-01` (Welcome home), `FR-HM-02` (Open file → draft), plus the added user-story layer `US-HM-01..04` (UI/UX convention). Stub doc-set (01 only); design/V&V referenced from `DESIGN-KEDITOR-001` / `TEST-KEDITOR-001`. |
| 0.2     | 2026-06-15 | Vũ Anh | **Grew the full doc-set** — `editor-home` is now the first module with its own `02-DESIGN` (`DESIGN-KHOME-001`), `03-TEST` (`TEST-KHOME-001`, `TC-HM-01..06`), and `04-PLAN` (`PLAN-KHOME-001`, risk register). Re-pointed the blockquote / §B.2 / §B.4 references from the shared `DESIGN-/TEST-KEDITOR-001` to the module-local docs; added them to `related_documents` and the control table. No requirement content changed. |
