---
title: "BPMN Editor CR-004 — Copy/paste, duplicate & keyboard modeling: Requirements"
document_id: FEAT-BPMN-EDITOR-CR-004
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing clipboard + keyboard modeling (`website/app/`); reviewers
review_cycle: Until CR-004 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - DESIGN-BPMN-EDITOR-CR-004
  - TEST-BPMN-EDITOR-CR-004
  - PLAN-BPMN-EDITOR-CR-004
  - FEAT-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
  - FEAT-ENGINE-001
  - FEAT-JAM-001
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
  - bpmn-editor
  - copy-paste
  - keyboard
  - usability
  - acceptance-criteria
---

# BPMN Editor CR-004 — Copy/paste, duplicate & keyboard modeling: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-004` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low** — usability / efficiency enhancement |
| Type              | **Enhancement** (new capability beyond v1) |
| Related Documents | `DESIGN-BPMN-EDITOR-CR-004`, `TEST-BPMN-EDITOR-CR-004`, `PLAN-BPMN-EDITOR-CR-004`; parent `FEAT-/DESIGN-BPMN-EDITOR-001`; `FEAT-ENGINE-001`, `FEAT-JAM-001` |

---

## Part A — Introduction

> **What this folder is.** `CR-004/` is a **self-contained mini engineering-spec** using its own mini-spec
> layout (`01-REQUIREMENTS`→`04-PLAN`). This Part A doubles as the **change record**.

### A.1 Purpose & motivation

v1 covers place / morph / connect / move via pointer + context pad, but not **clipboard** or
**keyboard-driven** modeling. Modeling repetitive structures is slow without copy/paste/duplicate, and
pointer-only modeling is an accessibility gap. `bpmn-js` supports both (copy a selection; paste it;
append the next element with Tab/arrow). This CR brings the same, reusing the engine's selection +
history.

**Intended outcome.** Copy/paste/duplicate clone a selection (with internal flows) at an offset with
new ids, as one undo step; a selected element can append the next element + flow via the keyboard.

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-EDITOR-CR-004` | This doc — motivation, change record (Part A) + requirements (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-004` | Clipboard model (id remap), keyboard-append handler; golden-safety. |
| `03-TEST.md` | `TEST-BPMN-EDITOR-CR-004` | `TC-CR4-01..02`; traceability. |
| `04-PLAN.md` | `PLAN-BPMN-EDITOR-CR-004` | Close-out plan; risks; worklog. |

### A.3 Relationship to the bpmn-editor baseline

| Clause | Doc | Change |
|--------|-----|--------|
| §4.2 / §7 | `FEAT-BPMN-EDITOR-001` | Add copy/paste/duplicate + keyboard modeling; drop them from out-of-scope |
| §6 / §9 | `DESIGN-BPMN-EDITOR-001` | Add the clipboard model + keyboard-append handler; extend the shortcut reference (`FR-BE-12`) |

Item IDs are **CR-local** (`FR-CR4-`/`NFR-CR4-`/`TC-CR4-`/`RK-CR4-`).

### A.4 Reading guide

- **Approver:** §A.1 + §A.3 → Part B §2/§5.
- **Implementer:** `DESIGN-BPMN-EDITOR-CR-004` → `PLAN-BPMN-EDITOR-CR-004`, verify against `TEST-BPMN-EDITOR-CR-004`.

### A.5 Status & change record

**Status: Proposed** · Severity **Low** · Type **Enhancement**. Pure editor-UI over existing engine
primitives (selection + history); no engine change.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored. Awaiting v1 baseline + approval. |

---

## Part B — Requirements

> **Delta SRS.** Requirements for the CR-004 change only; each maps to the parent clause it extends (§B.5).

### B.1 Stakeholder needs

- `SN-BE-01`/`SN-BE-02` — extended with **faster** (clipboard) and **keyboard-accessible** modeling.

### B.2 Functional requirements (`FR-CR4`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR4-01` | Ctrl/Cmd-C/V and a **duplicate** action SHALL clone the selected `bpmn-*` element(s) — including any internal flows — at an offset, with **new ids**, as a single undo step. | `SN-BE-01` | `FEAT §6` (copy-paste) |
| `FR-CR4-02` | A selected element SHALL be able to **append the next element + flow via the keyboard** (Tab/arrow), and selection/focus SHALL move by keyboard — mirroring the `demo.bpmn.io` shortcut model. | `SN-BE-02` | extends `FR-BE-12` (shortcut reference); `FEAT §6` (keyboard) |

### B.3 Non-functional requirements (`NFR-CR4`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR4-01` | **No regression & golden-safe.** Pointer-based modeling is unchanged; all work is in `website/app/*`; no renderer/exporter change. | `NFR-BE-04` |

### B.4 Scope

**In scope:** copy/paste/duplicate (id remap, internal-flow inclusion) and keyboard append/navigation,
in `website/app/*`, reusing `editor` selection + `run({history})` (`FEAT-ENGINE-001`) and undo/redo
(`FR-J-02`). **Out of scope:** cross-document paste, paste-as-link, and full custom keymap editing.

### B.5 Acceptance criteria

1. Copy + paste (and duplicate) clone a selection with fresh ids and any internal flows, as a single
   undo step (`FR-CR4-01`).
2. Keyboard append adds the next element + connecting flow and moves focus; the shortcut reference
   lists the new keys (`FR-CR4-02`).
3. Pointer modeling unchanged; no renderer/exporter change (`NFR-CR4-01`).

**Supersession / traceability:**

| `FR/NFR-CR4` | Extends (parent) | Covered by |
|--------------|------------------|------------|
| `FR-CR4-01` | `§6` (copy-paste) | `TC-CR4-01` |
| `FR-CR4-02` | `FR-BE-12`; `§6` (keyboard) | `TC-CR4-02` |
| `NFR-CR4-01` | `NFR-BE-04` | `TC-CR4-01`, `TC-CR4-02` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `FR-CR4-01` copy/paste/duplicate (id remap, internal flows, one undo step); `FR-CR4-02` keyboard append/navigation; `NFR-CR4-01` no-regression/golden-safe. |
| 0.1     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-EDITOR-CR-004) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-EDITOR-CR-004) into Part B; deleted source files; renamed `03-DESIGN`→`02-DESIGN`, `04-TEST`→`03-TEST`, `05-PLAN`→`04-PLAN`. |
