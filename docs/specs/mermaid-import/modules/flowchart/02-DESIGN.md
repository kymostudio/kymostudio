---
title: Mermaid Flowchart — Design (module)
document_id: DESIGN-MERMAID-FLOWCHART-001
version: "0.1"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers implementing/maintaining the flowchart importer
review_cycle: On grammar or layout change
supersedes: null
related_documents:
  - FEAT-MERMAID-FLOWCHART-001
  - DESIGN-MERMAID-001
  - MERMAID-MAP-001
  - KYMOJSON-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - flowchart
  - design
  - layout
---

# Mermaid Flowchart — Design (module)

## Parse

`mermaid::parse` flattens source to statements (split on newline and `;`, drop
`%%` comments), takes the first as the type header (`detect_type` → direction), and
folds the rest through `handle_statement`:

- `subgraph`/`end` push/pop a subgraph stack; `direction X` inside is accepted and
  ignored.
- other statements go to `parser::parse_statement`, which returns
  `Node (Edge Node)*` using `lexer::Scanner` (`read_id`, `read_shape`,
  `read_operator`).

A node registry (insertion-ordered `Vec` + id→index) dedupes nodes; a `Some`
label/shape upgrades an earlier bare node. Consecutive nodes are linked by the
pending edge operator. Nodes touched inside a subgraph join its member list.

## Layout

`layout::layout_flowchart` ports `bpmn_layout.py` (positions only — see
DESIGN-MERMAID-001 §4). Node footprints come from `node_size(label, shape)` using
kymo's text metric (`CHAR_W = 7.6`, matching `layout._CHAR_W_NAME`); boxes are sized
per shape (circle square; diamond/hex/cylinder/badge given extra room). The layered
algorithm runs in abstract `(main, cross)` space and maps to screen `(x, y)` per
direction, keeping boxes upright; coordinates normalize to a `MARGIN` top-left and
integerise via `py_round` (half-to-even).

## Emit

- Components: `Component::flowchart` defaults (`accent=blue`, `icon=""`), `pos`,
  explicit `size`.
- Edges: `Edge::routed` with `dashed`/`no_arrow`/`label`, **no `points`**, so
  `to_svg` routes from anchors and honours the flags.
- Regions: one `cluster` per non-empty subgraph; `bounds` = members' bbox + padding
  (+ label clearance when titled).
- `kymojson::export` serializes the resolved `Diagram`.
