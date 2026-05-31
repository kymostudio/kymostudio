---
title: "BPMN Editor CR-002 — Requirements (SRS delta): Set color"
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
  - INTRO-BPMN-EDITOR-CR-002
  - DESIGN-BPMN-EDITOR-CR-002
  - TEST-BPMN-EDITOR-CR-002
  - PLAN-BPMN-EDITOR-CR-002
  - FEAT-BPMN-EDITOR-001
  - FEAT-BPMN-EXPORT-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - change-request
  - bpmn-editor
  - color
  - di-color
  - acceptance-criteria
---

# BPMN Editor CR-002 — Requirements (SRS delta): Set color

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-BPMN-EDITOR-CR-002` |
| Version           | 0.1 |
| Status            | **Proposed** |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-EDITOR-CR-002` (change record), `DESIGN-BPMN-EDITOR-CR-002`, `TEST-BPMN-EDITOR-CR-002`, `FEAT-BPMN-EDITOR-001` (SRS amended), `FEAT-BPMN-EXPORT-001` (exporter dependency) |

> **Delta SRS.** Requirements for the CR-002 change only; each maps to the parent clause it extends (§5).

---

## 1. Stakeholder needs

- `SN-BE-02` (edit an element in place) — extended to **recoloring** an element.

## 2. Functional requirements (`FR-CR2`)

| ID | Requirement | Source need | Extends / supersedes |
|----|-------------|-------------|----------------------|
| `FR-CR2-01` | The context pad SHALL offer **Set color**: selecting an element and choosing a fill/stroke color recolors it on canvas immediately (one shape op). | `SN-BE-02` | extends `FR-BE-05` (context pad); `FEAT §6` (removes color from out-of-scope) |

## 3. Non-functional requirements (`NFR-CR2`)

| ID | Requirement | Inherits |
|----|-------------|----------|
| `NFR-CR2-01` | **Color round-trips.** Export → re-import preserves each element's color via a documented DI color extension (`bioc:`/`color:`), upholding the parser/exporter invariants. | `NFR-BE-03` |

## 4. Scope

**In scope:** the context-pad color control (`website/app/*`) **and** the DI-color emit/read in
`toBpmn`/`parseBpmn` + its documentation in `BPMN-MAP-001`. **Out of scope:** theme/palette presets,
gradient/opacity, and per-lane bulk recolor (a future follow-up). Color emission is **additive /
conditional** — diagrams without color export byte-identically to today.

## 5. Acceptance criteria

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
