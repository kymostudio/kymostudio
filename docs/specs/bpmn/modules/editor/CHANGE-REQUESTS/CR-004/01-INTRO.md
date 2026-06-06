---
title: "BPMN Editor CR-004 — Copy/paste, duplicate & keyboard modeling: Overview & Change Record"
document_id: INTRO-BPMN-EDITOR-CR-004
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: bpmn-editor maintainers / reviewers; the approver of the baseline; the engineer closing CR-004
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-004
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
  - bpmn-editor
  - copy-paste
  - keyboard
  - usability
---

# BPMN Editor CR-004 — Copy/paste, duplicate & keyboard modeling: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-EDITOR-CR-004` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low** — usability / efficiency enhancement |
| Type              | **Enhancement** (new capability beyond v1) |
| Related Documents | `FEAT-BPMN-EDITOR-CR-004`, `DESIGN-BPMN-EDITOR-CR-004`, `TEST-BPMN-EDITOR-CR-004`, `PLAN-BPMN-EDITOR-CR-004`; parent `FEAT-/DESIGN-BPMN-EDITOR-001`; `FEAT-ENGINE-001`, `FEAT-JAM-001` |

> **What this folder is.** `CR-004/` is a **self-contained mini engineering-spec** using its own mini-spec
> layout (`01-INTRO`→`05-PLAN`). This `01-INTRO` doubles as the **change record**.

---

## 1. Purpose & motivation

v1 covers place / morph / connect / move via pointer + context pad, but not **clipboard** or
**keyboard-driven** modeling. Modeling repetitive structures is slow without copy/paste/duplicate, and
pointer-only modeling is an accessibility gap. `bpmn-js` supports both (copy a selection; paste it;
append the next element with Tab/arrow). This CR brings the same, reusing the engine's selection +
history.

**Intended outcome.** Copy/paste/duplicate clone a selection (with internal flows) at an offset with
new ids, as one undo step; a selected element can append the next element + flow via the keyboard.

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-EDITOR-CR-004` | This doc — motivation, map, supersession, **change record**. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-EDITOR-CR-004` | `FR-CR4-01..02`; scope; acceptance; supersession. |
| `03-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-004` | Clipboard model (id remap), keyboard-append handler; golden-safety. |
| `04-TEST.md` | `TEST-BPMN-EDITOR-CR-004` | `TC-CR4-01..02`; traceability. |
| `05-PLAN.md` | `PLAN-BPMN-EDITOR-CR-004` | Close-out plan; risks; worklog. |

## 3. Relationship to the bpmn-editor baseline

| Clause | Doc | Change |
|--------|-----|--------|
| §4.2 / §7 | `FEAT-BPMN-EDITOR-001` | Add copy/paste/duplicate + keyboard modeling; drop them from out-of-scope |
| §6 / §9 | `DESIGN-BPMN-EDITOR-001` | Add the clipboard model + keyboard-append handler; extend the shortcut reference (`FR-BE-12`) |

Item IDs are **CR-local** (`FR-CR4-`/`NFR-CR4-`/`TC-CR4-`/`RK-CR4-`).

## 4. Reading guide

- **Approver:** §1 + §3 → `FEAT-BPMN-EDITOR-CR-004 §2/§5`.
- **Implementer:** `DESIGN-BPMN-EDITOR-CR-004` → `PLAN-BPMN-EDITOR-CR-004`, verify against `TEST-BPMN-EDITOR-CR-004`.

## 5. Status & change record

**Status: Proposed** · Severity **Low** · Type **Enhancement**. Pure editor-UI over existing engine
primitives (selection + history); no engine change.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored. Awaiting v1 baseline + approval. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Copy/paste/duplicate + keyboard modeling, reusing engine selection + history. |
