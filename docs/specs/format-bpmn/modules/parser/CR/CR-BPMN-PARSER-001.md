---
title: "BPMN Import CR-001 — Read node BPMNLabel DI bounds into Component.label_box"
document_id: CR-BPMN-PARSER-001
version: "1.0"
issue_date: 2026-06-03
status: Closed
classification: Internal
owner: diagrams/ project
audience: bpmn parser 001 maintainers / reviewers
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-PARSER-001
  - DESIGN-BPMN-PARSER-001
  - TEST-BPMN-PARSER-001
  - CR-BPMN-EXPORT-001
  - BPMN-MAP-001
  - KYMOJSON-MAP-001
---

# CR-BPMN-PARSER-001 — Read node `BPMNLabel` DI bounds into `Component.label_box`

> Change-request against the baselined `bpmn-parser` spec. Self-contained (motivation →
> change → amended clauses → acceptance → record), per the `CR/` one-file-per-CR convention.

## 1. Motivation

The importer read a `<bpmndi:BPMNLabel>` only for **flows** (→ `Edge.label_pos`). Event /
gateway / data nodes ignored their own label DI bounds, so the renderer always centred their
external label **below the glyph** at a guessed width — diverging from bpmn.io, which honours
each label's authored box. Labels authored *above* or offset (e.g. "Nhận xác nhận thông luồng")
were mis-placed, overlapped neighbours, and longer ones were truncated with an ellipsis.

## 2. Change

Read each shape's `<bpmndi:BPMNLabel>` `<dc:Bounds>` (centre + size) into the new
`Component.label_box` field, shifted with the `MARGIN` normalisation like all other geometry.
The renderer (`bpmn_shapes` / `bpmn-shapes.ts`) places + wraps the external label at that box
(label-font metrics ~0.46em, no truncation), falling back to the previous below-glyph default
when a shape carries no label bounds. Implemented in both packages (Python + JS parity).

## 3. Baseline clauses amended (re-based in this change)

| Clause | Doc | Change |
|--------|-----|--------|
| FR-5 | `FEAT-BPMN-PARSER-001` | + a node's `<BPMNLabel>` bounds -> `Component.label_box` |
| §4 DI geometry | `DESIGN-BPMN-PARSER-001` | + node label-box -> `Component.label_box` mapping |
| TC-3 | `TEST-BPMN-PARSER-001` | DI-geometry case now also covers node `label_box` |

Format: `Component.label_box` `[cx,cy,w,h]|null` added to `KYMOJSON-MAP-001` (component field
list) and the `bpmndi:BPMNLabel` row of `BPMN-MAP-001`.

## 4. Acceptance

- Importing a `.bpmn` whose nodes carry `BPMNLabel` bounds yields `Component.label_box`
  (centre + size); nodes without bounds yield `null`.
- Python `parse` and JS `parseBpmn` produce identical `label_box` (conformance corpus green).
- Round-trips as a ±1px fixpoint with the export counterpart — see `CR-BPMN-EXPORT-001` and the
  `node label_box round-trips ...` regression in `test_to_bpmn` / `to-bpmn.test.js`.

## 5. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-03 | Vũ Anh | **Closed.** Built + baseline re-based in one change; Python + JS suites and conformance green. Released in kymostudio 0.3.3. |

## Annex A — Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-03 | Vũ Anh | Closed. Node `BPMNLabel` -> `Component.label_box` on import; renderer honours the authored box. |
