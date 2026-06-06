---
title: "BPMN Editor CR-002 — \"Set color\" action: Overview & Change Record"
document_id: INTRO-BPMN-EDITOR-CR-002
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: bpmn-editor maintainers / reviewers; the approver of the baseline; the engineer closing CR-002
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EDITOR-CR-002
  - DESIGN-BPMN-EDITOR-CR-002
  - TEST-BPMN-EDITOR-CR-002
  - PLAN-BPMN-EDITOR-CR-002
  - FEAT-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
  - FEAT-BPMN-EXPORT-001
  - FEAT-BPMN-PARSER-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - introduction
  - change-record
  - bpmn-editor
  - color
  - di-color
  - round-trip
---

# BPMN Editor CR-002 — "Set color" action: Overview & Change Record

| Field             | Value |
|-------------------|-------|
| Document ID       | `INTRO-BPMN-EDITOR-CR-002` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low–Medium** — UX enhancement with an exporter dependency |
| Type              | **Enhancement** (deferred from v1) |
| Related Documents | `FEAT-BPMN-EDITOR-CR-002` (requirements), `DESIGN-BPMN-EDITOR-CR-002` (design), `TEST-BPMN-EDITOR-CR-002` (V&V), `PLAN-BPMN-EDITOR-CR-002` (close-out plan); parent `FEAT-/DESIGN-BPMN-EDITOR-001`; cross-feature `FEAT-BPMN-EXPORT-001` |

> **What this folder is.** `CR-002/` is a **self-contained mini engineering-spec** for one change to
> the `bpmn-editor` spec (`BPMN-EDITOR-001`), using its own mini-spec layout (`01-INTRO`→`05-PLAN`). This
> `01-INTRO` doubles as the **change record**.

---

## 1. Purpose & motivation

`demo.bpmn.io`'s context pad includes **Set color** — authors highlight elements (a critical path, a
lane's tasks) by fill/stroke color. `FEAT-BPMN-EDITOR-001 §7` **deferred** it from v1 because it cannot
round-trip today: `to-bpmn.ts` emits no color, so a recolor would be lost on export. This CR adds the
action **and** the exporter/importer support that makes color durable.

**Intended outcome.** Selecting an element and choosing a color recolors it on canvas, and the color
survives export → re-import (via a documented DI color extension).

## 2. Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-INTRO.md` | `INTRO-BPMN-EDITOR-CR-002` | This doc — motivation, map, supersession summary, **change record**. |
| `02-REQUIREMENT.md` | `FEAT-BPMN-EDITOR-CR-002` | `FR-CR2-01`, `NFR-CR2-01`; scope; acceptance; supersession. |
| `03-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-002` | The color control + model→DI color path; exporter/importer change. |
| `04-TEST.md` | `TEST-BPMN-EDITOR-CR-002` | `TC-CR2-01..02`; traceability. |
| `05-PLAN.md` | `PLAN-BPMN-EDITOR-CR-002` | Close-out plan; risks; worklog. |

## 3. Relationship to the bpmn-editor baseline

| Clause | Doc | Change |
|--------|-----|--------|
| §4.2 context pad / §7 | `FEAT-BPMN-EDITOR-001` | Add the Set-color action + color round-trip; drop color from out-of-scope |
| §5 context pad | `DESIGN-BPMN-EDITOR-001` | Specify the color control + the model→DI color path |
| (exporter/importer) | `FEAT-BPMN-EXPORT-001` / `FEAT-BPMN-PARSER-001` | Emit/read the DI color extension |
| (mapping) | `BPMN-MAP-001` | Document the DI color extension |

Item IDs are **CR-local** (`FR-CR2-`/`NFR-CR2-`/`TC-CR2-`/`RK-CR2-`).

## 4. Reading guide

- **Approver:** §1 + §3 here → `FEAT-BPMN-EDITOR-CR-002 §2/§5`.
- **Implementer:** `DESIGN-BPMN-EDITOR-CR-002` → `PLAN-BPMN-EDITOR-CR-002`, verify against `TEST-BPMN-EDITOR-CR-002`.

## 5. Status & change record

**Status: Proposed** · Severity **Low–Medium** · Type **Enhancement**. The UI is small; the real cost
is the DI-color exporter/importer support, so this is **not** a pure editor-UI change.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored. Awaiting v1 baseline + approval. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. Set-color action + DI-color round-trip (cross-feature with `FEAT-BPMN-EXPORT-001`/`FEAT-BPMN-PARSER-001`). |
