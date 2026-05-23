---
title: Interactive Canvas Editor — Features & Requirements
document_id: FEAT-CANVAS-001
version: "0.1"
issue_date: 2026-05-23
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing & verifying the canvas editor (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-CANVAS-001
  - PLAN-CANVAS-001
  - DESIGN-CANVAS-001
  - TEST-CANVAS-001
  - DSL-LANG-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - features
  - functional-requirements
  - non-functional-requirements
  - iso-25010
  - canvas-editor
  - acceptance-criteria
---

# Interactive Canvas Editor — Features & Requirements

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | FEAT-CANVAS-001                                                 |
| Version           | 0.1                                                              |
| Issue Date        | 2026-05-23                                                       |
| Status            | Draft                                                           |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Audience          | Engineers implementing & verifying the editor                   |
| Related Documents | `PLAN-CANVAS-001` (plan/risk), `DESIGN-CANVAS-001` (design), `TEST-CANVAS-001` (V&V), `DSL-LANG-001` |

> This is the **requirements specification** (ISO/IEC/IEEE 12207 §6.4.2/§6.4.3). Each requirement is
> atomic, verifiable, and stably identified so `TEST-CANVAS-001` can trace a test case to it.
> Non-functional requirements are framed by **ISO/IEC 25010** quality characteristics. The
> reading-order and the full ISO-12207 document map are in `INTRO-CANVAS-001`.

---

## 1. Scope

Requirements for evolving the playground (`website/app/`) into an interactive canvas editor: a kymo
diagram, editable both as `.kymo` text and directly on a tldraw canvas (two-way synced), coexisting
with a freeform whiteboard. Single-player, static. Rationale and phasing: `PLAN-CANVAS-001`.

## 2. Definitions

- **kymo-diagram layer** — canvas shapes derived from the parsed `Diagram`; bound to `.kymo` text.
- **Freeform layer** — tldraw-native content (sticky notes, draw, frames) with no `.kymo` representation.
- **Round-trip** — a canvas edit re-expressed as `.kymo` text, re-parseable to the same `Diagram`.
- **Source of truth** — `.kymo` text for the diagram layer (only).

## 3. Functional requirements

Each `FR-CE-NN` has an acceptance criterion (AC) and the `DESIGN-CANVAS-001` section that realises it.

| ID | Requirement | Acceptance criterion | Design § |
|----|-------------|----------------------|----------|
| FR-CE-01 | Render `.kymo`/BPMN text to the canvas live | Editing text updates the rendered diagram within one debounce interval; parse errors surface without losing the last good render | §3, §7 |
| FR-CE-02 | Sync canvas edits back to text | Dragging/renaming a kymo shape updates the `.kymo` text such that re-parsing reproduces the change | §7, §8 |
| FR-CE-03 | Two-layer model | kymo-layer shapes are tagged `meta.kymo`; freeform shapes are not; sync only ever touches tagged shapes | §3, §5 |
| FR-CE-04 | Freeform whiteboard tools | User can add sticky notes, freehand strokes, and frames on the same board as the diagram | §3 |
| FR-CE-05 | `Diagram → .kymo` serializer (Tier-1) | `shapesToDsl` emits a conformant `.kymo` (`DSL-LANG-001`) that `parseDiagram` accepts; node positions round-trip | §8.1 |
| FR-CE-06 | Surgical patch preserves source (Tier-2) | After moving one node, comments and all untouched lines in `.kymo` are byte-identical | §8.2, §9 |
| FR-CE-07 | `?script=` share compatibility | A link produced by the current playground still loads; new links round-trip the `.kymo` text | §3 (`share.ts`), §11 |
| FR-CE-08 | Sample loading | Built-in samples load into the editor and render | §3 (`samples.ts`) |
| FR-CE-09 | SVG export | User can export the current diagram to a standalone SVG (via `renderSVG`) | §3 |
| FR-CE-10 | BPMN import | A `.bpmn` file parses and renders as today (`parseBpmn`) | §3 |

## 4. Non-functional requirements (ISO/IEC 25010)

| ID | Quality characteristic | Requirement | Acceptance criterion | Design § |
|----|------------------------|-------------|----------------------|----------|
| NFR-CE-01 | Performance efficiency | Edits feel live | Debounce ≤ ~220 ms; text→canvas updates apply as an **incremental diff**, not a full wipe-and-recreate | §7, §12 |
| NFR-CE-02 | Compatibility / portability | Static, zero-backend | Deploys as the committed `kymo.bundle.js` via the existing Pages workflow; **no CI build step** | §10 |
| NFR-CE-03 | Reliability | No sync oscillation | A programmatic apply never re-triggers a canvas→text write (no A→B→A); stale async parses are dropped | §7 |
| NFR-CE-04 | Maintainability | Re-targetable serializer | The DSL-emitting logic is isolated to one module so a future v3 grammar is a localised change | §8, RK-04 |
| NFR-CE-05 | Usability | Offline icons | Built-in (vector) icons render with **zero network**; only file-backed icons fetch from the CDN | §6 |
| NFR-CE-06 | Performance / footprint | Bounded bundle | Committed bundle stays within budget (target ≤ ~3 MB); tldraw is lazy-loaded where feasible | §10, RK-03 |
| NFR-CE-07 | Functional correctness (invariant) | Source-of-truth integrity | Freeform-layer content is **never** serialized into `.kymo`; a sticky note never appears in the text | §3, §11 |

## 5. Constraints & assumptions

- Tooling: esbuild bundles `.tsx` (automatic JSX); deps are devDeps; `node_modules` git-ignored.
- The `packages/js` public API (`parseDiagram`, `renderSVG`, `getIcon`, model types) is reused as-is.
- tldraw licensing must be resolved before Phase 1 (`PLAN-CANVAS-001` RK-02).
- Serializer targets `DSL-LANG-001` v2.0 (not a future v3) for now.

## 6. Out of scope

- Multiplayer / real-time collaboration (needs a backend).
- Serializing the freeform layer into `.kymo`.
- A v3-grammar target.

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial requirements draft.      |
