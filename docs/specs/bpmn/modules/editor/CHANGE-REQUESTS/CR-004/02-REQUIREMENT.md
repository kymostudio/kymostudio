---
title: "BPMN Editor CR-004 — Requirements (SRS delta): Copy/paste & keyboard modeling"
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
  - INTRO-BPMN-EDITOR-CR-004
  - DESIGN-BPMN-EDITOR-CR-004
  - TEST-BPMN-EDITOR-CR-004
  - PLAN-BPMN-EDITOR-CR-004
  - FEAT-BPMN-EDITOR-001
  - FEAT-ENGINE-001
  - FEAT-JAM-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - change-request
  - bpmn-editor
  - copy-paste
  - keyboard
  - acceptance-criteria
---

# BPMN Editor CR-004 — Requirements (SRS delta): Copy/paste & keyboard modeling

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-004` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-EDITOR-CR-004` (change record), `DESIGN-BPMN-EDITOR-CR-004`, `TEST-BPMN-EDITOR-CR-004`, `FEAT-BPMN-EDITOR-001` (SRS amended), `FEAT-ENGINE-001`, `FEAT-JAM-001` |

> **Delta SRS.** Requirements for the CR-004 change only; each maps to the parent clause it extends (§5).

---

## 1. Stakeholder needs

- `SN-BE-01`/`SN-BE-02` — extended with **faster** (clipboard) and **keyboard-accessible** modeling.

## 2. Functional requirements (`FR-CR4`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR4-01` | Ctrl/Cmd-C/V and a **duplicate** action SHALL clone the selected `bpmn-*` element(s) — including any internal flows — at an offset, with **new ids**, as a single undo step. | `SN-BE-01` | `FEAT §6` (copy-paste) |
| `FR-CR4-02` | A selected element SHALL be able to **append the next element + flow via the keyboard** (Tab/arrow), and selection/focus SHALL move by keyboard — mirroring the `demo.bpmn.io` shortcut model. | `SN-BE-02` | extends `FR-BE-12` (shortcut reference); `FEAT §6` (keyboard) |

## 3. Non-functional requirements (`NFR-CR4`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR4-01` | **No regression & golden-safe.** Pointer-based modeling is unchanged; all work is in `website/app/*`; no renderer/exporter change. | `NFR-BE-04` |

## 4. Scope

**In scope:** copy/paste/duplicate (id remap, internal-flow inclusion) and keyboard append/navigation,
in `website/app/*`, reusing `editor` selection + `run({history})` (`FEAT-ENGINE-001`) and undo/redo
(`FR-J-02`). **Out of scope:** cross-document paste, paste-as-link, and full custom keymap editing.

## 5. Acceptance criteria

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
