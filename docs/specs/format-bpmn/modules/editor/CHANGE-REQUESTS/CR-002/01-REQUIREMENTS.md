---
title: "BPMN Editor CR-002 — \"Set color\" action: Requirements"
document_id: FEAT-BPMN-EDITOR-CR-002
version: "0.1"
issue_date: 2026-05-31
status: Proposed
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the color action (`website/app/` + exporter); reviewers
review_cycle: Until CR-002 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
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
  - requirements
  - srs
  - iso-29148
  - bpmn-editor
  - color
  - di-color
  - round-trip
  - acceptance-criteria
---

# BPMN Editor CR-002 — "Set color" action: Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-002` |
| Version           | 0.1 |
| Status            | **Proposed** — not yet raised (v1 baseline `*-BPMN-EDITOR-001` pending) |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Severity          | **Low–Medium** — UX enhancement with an exporter dependency |
| Type              | **Enhancement** (deferred from v1) |
| Related Documents | `DESIGN-BPMN-EDITOR-CR-002` (design), `TEST-BPMN-EDITOR-CR-002` (V&V), `PLAN-BPMN-EDITOR-CR-002` (close-out plan); parent `FEAT-/DESIGN-BPMN-EDITOR-001`; cross-feature `FEAT-BPMN-EXPORT-001` |

---

## Part A — Introduction

> **What this folder is.** `CR-002/` is a **self-contained mini engineering-spec** for one change to
> the `bpmn-editor` spec (`BPMN-EDITOR-001`), using its own mini-spec layout (`01-REQUIREMENTS`→`04-PLAN`). This
> Part A doubles as the **change record**.

### A.1 Purpose & motivation

`demo.bpmn.io`'s context pad includes **Set color** — authors highlight elements (a critical path, a
lane's tasks) by fill/stroke color. `FEAT-BPMN-EDITOR-001 §7` **deferred** it from v1 because it cannot
round-trip today: `to-bpmn.ts` emits no color, so a recolor would be lost on export. This CR adds the
action **and** the exporter/importer support that makes color durable.

**Intended outcome.** Selecting an element and choosing a color recolors it on canvas, and the color
survives export → re-import (via a documented DI color extension).

### A.2 Document map

| File | document_id | Holds |
|------|-------------|-------|
| `01-REQUIREMENTS.md` | `FEAT-BPMN-EDITOR-CR-002` | This doc — motivation, change record (Part A) + requirements (Part B). |
| `02-DESIGN.md` | `DESIGN-BPMN-EDITOR-CR-002` | The color control + model→DI color path; exporter/importer change. |
| `03-TEST.md` | `TEST-BPMN-EDITOR-CR-002` | `TC-CR2-01..02`; traceability. |
| `04-PLAN.md` | `PLAN-BPMN-EDITOR-CR-002` | Close-out plan; risks; worklog. |

### A.3 Relationship to the bpmn-editor baseline

| Clause | Doc | Change |
|--------|-----|--------|
| §4.2 context pad / §7 | `FEAT-BPMN-EDITOR-001` | Add the Set-color action + color round-trip; drop color from out-of-scope |
| §5 context pad | `DESIGN-BPMN-EDITOR-001` | Specify the color control + the model→DI color path |
| (exporter/importer) | `FEAT-BPMN-EXPORT-001` / `FEAT-BPMN-PARSER-001` | Emit/read the DI color extension |
| (mapping) | `BPMN-MAP-001` | Document the DI color extension |

Item IDs are **CR-local** (`FR-CR2-`/`NFR-CR2-`/`TC-CR2-`/`RK-CR2-`).

### A.4 Reading guide

- **Approver:** §A.1 + §A.3 here → Part B §2/§5.
- **Implementer:** `DESIGN-BPMN-EDITOR-CR-002` → `PLAN-BPMN-EDITOR-CR-002`, verify against `TEST-BPMN-EDITOR-CR-002`.

### A.5 Status & change record

**Status: Proposed** · Severity **Low–Medium** · Type **Enhancement**. The UI is small; the real cost
is the DI-color exporter/importer support, so this is **not** a pure editor-UI change.

| Date | Actor | Decision |
|------|-------|----------|
| 2026-05-31 | Vũ Anh | **Proposed.** Mini-spec authored. Awaiting v1 baseline + approval. |

---

## Part B — Requirements

> **Delta SRS.** Requirements for the CR-002 change only; each maps to the parent clause it extends (§B.5).

### B.1 Stakeholder needs

- `SN-BE-02` (edit an element in place) — extended to **recoloring** an element.

### B.2 Functional requirements (`FR-CR2`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR2-01` | The context pad SHALL offer **Set color**: selecting an element and choosing a fill/stroke color recolors it on canvas immediately (one shape op). | `SN-BE-02` | extends `FR-BE-05` (context pad); `FEAT §6` (removes color from out-of-scope) |

### B.3 Non-functional requirements (`NFR-CR2`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR2-01` | **Color round-trips.** Export → re-import preserves each element's color via a documented DI color extension (`bioc:`/`color:`), upholding the parser/exporter invariants. | `NFR-BE-03` |

### B.4 Scope

**In scope:** the context-pad color control (`website/app/*`) **and** the DI-color emit/read in
`toBpmn`/`parseBpmn` + its documentation in `BPMN-MAP-001`. **Out of scope:** theme/palette presets,
gradient/opacity, and per-lane bulk recolor (a future follow-up). Color emission is **additive /
conditional** — diagrams without color export byte-identically to today.

### B.5 Acceptance criteria

1. Setting a color on a node/edge updates the canvas immediately (`FR-CR2-01`).
2. Export → re-import preserves the color (`NFR-CR2-01`); the DI extension namespace is documented in
   `BPMN-MAP-001`; `toBpmn`/`parseBpmn` have a color round-trip unit test.
3. Diagrams **without** color export byte-identically (goldens + corpus baseline unchanged).

**Supersession / traceability:**

| `FR/NFR-CR2` | Extends (parent) | Covered by |
|--------------|------------------|------------|
| `FR-CR2-01` | `FR-BE-05`; `§6` (color) | `TC-CR2-01` |
| `NFR-CR2-01` | `NFR-BE-03` | `TC-CR2-02` |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Proposed. `FR-CR2-01` Set color; `NFR-CR2-01` color round-trip (DI extension); additive/conditional emission keeps goldens stable. |
| 0.1     | 2026-06-06 | Vũ Anh | Consolidated `01-INTRO.md` (FEAT-BPMN-EDITOR-CR-002) into Part A and `02-REQUIREMENT.md` (FEAT-BPMN-EDITOR-CR-002) into Part B; deleted source files; renamed `03-DESIGN`→`02-DESIGN`, `04-TEST`→`03-TEST`, `05-PLAN`→`04-PLAN`. |
