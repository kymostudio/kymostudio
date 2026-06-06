---
title: "BPMN Export CR-001 — Emit Component.label_box as a per-node BPMNLabel"
document_id: CR-BPMN-EXPORT-001
version: "1.0"
issue_date: 2026-06-03
status: Closed
classification: Internal
owner: diagrams/ project
audience: bpmn export 001 maintainers / reviewers
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-BPMN-EXPORT-001
  - DESIGN-BPMN-EXPORT-001
  - TEST-BPMN-EXPORT-001
  - CR-BPMN-PARSER-001
  - BPMN-MAP-001
  - KYMOJSON-MAP-001
---

# CR-BPMN-EXPORT-001 — Emit `Component.label_box` as a per-node `BPMNLabel`

> Change-request against the baselined `bpmn-export` spec. Self-contained (motivation →
> change → amended clauses → acceptance → record), per the `CR/` one-file-per-CR convention.

## 1. Motivation

The exporter wrote a `<bpmndi:BPMNLabel>` only for **flows** (from `Edge.label_pos`). After
`CR-BPMN-PARSER-001` added `Component.label_box` (a node's authored external-label box), export
dropped it: a `.bpmn` with positioned node labels was **no longer a round-trip fixpoint** —
`import -> export -> import` lost every node `label_box`, breaking the NFR-1 guarantee.

## 2. Change

For each component carrying a `label_box`, emit a per-node `<bpmndi:BPMNShape>` child
`<bpmndi:BPMNLabel>` `<dc:Bounds>` (top-left = `label_box.centre − size/2`, width/height =
`label_box` size). Components without a `label_box` are unchanged. Implemented in both packages
(`to_bpmn` / `to-bpmn.ts`).

## 3. Baseline clauses amended (re-based in this change)

| Clause | Doc | Change |
|--------|-----|--------|
| FR-4 | `FEAT-BPMN-EXPORT-001` | + per-node `<BPMNLabel>` `<dc:Bounds>` from `Component.label_box` |
| §4 DI geometry | `DESIGN-BPMN-EXPORT-001` | + `label_box` -> node `<BPMNLabel>` (centre -> top-left) |
| TC-3 | `TEST-BPMN-EXPORT-001` | DI-geometry case now also covers node `label_box` emission |

NFR-1 round-trip fidelity is preserved for node labels within the documented ±1px
centre↔top-left rounding.

## 4. Acceptance

- A diagram with a node `label_box` exports a shape-level `<bpmndi:BPMNLabel>`; re-import
  recovers the box within ±1px (a round-trip fixpoint).
- Python `to_bpmn` and JS `toBpmn` emit equivalent XML; both suites + conformance green.
- Locked by the `node label_box round-trips as a shape BPMNLabel` regression test
  (`test_to_bpmn.py` + `to-bpmn.test.js`).

## 5. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-03 | Vũ Anh | **Closed.** Built + baseline re-based in one change; round-trip fixpoint restored (±1px); Python + JS green. Released in kymostudio 0.3.3. |

## Annex A — Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-03 | Vũ Anh | Closed. `Component.label_box` -> per-node `BPMNLabel` on export; round-trip fixpoint restored. |
