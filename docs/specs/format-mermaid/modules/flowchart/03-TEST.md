---
title: Mermaid Flowchart — Test (module)
document_id: TEST-MERMAID-FLOWCHART-001
version: "0.1"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers verifying the flowchart importer
review_cycle: On grammar or mapping change
supersedes: null
related_documents:
  - FEAT-MERMAID-FLOWCHART-001
  - DESIGN-MERMAID-FLOWCHART-001
  - TEST-MERMAID-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - flowchart
  - test
---

# Mermaid Flowchart — Test (module)

## Unit (`cargo test`)

- **lexer/parser** (`mermaid::parser::tests`): chains, shape variants
  (`[]`/`()`/`([])`/`[(]`/`(())`/`{}`/`{{}}`), dashed + `|label|`, no-arrow lines.
- **dispatch** (`mermaid::tests`): unsupported type error, header direction,
  node dedup + default labels, subgraph membership, `;`-separated, comments,
  empty-source error.
- **model** (`model::tests`): `py_round` half-to-even.
- **serializer** (`kymojson::tests`): envelope, multi-line point arrays, edge
  defaults, string escaping.

## Golden (`tests/mermaid_golden.rs`)

Fixtures in `tests/fixtures/mermaid/`: `chain`, `decision`, `lr-fanout`, `shapes`,
`subgraph`, `cycle`. Each `.mmd` → byte-compared to `golden/<name>.kymo.json`.
`layout_is_deterministic` asserts two runs are byte-equal. Regenerate with
`KYMO_UPDATE_MERMAID_GOLDEN=1`.

## Contract

Every golden round-trips byte-identically through Python `from_kymojson` →
`to_kymojson` (TEST-MERMAID-001 §3), including the `subgraph` region fixture.

## Coverage map

| Requirement | Test |
|---|---|
| FR-FC-1 direction/dispatch | `header_direction`, `dispatch_unsupported` |
| FR-FC-2 shapes | `shape_variants`, `shapes` golden |
| FR-FC-3 edges | `edge_label_and_dashed`, `line_no_arrow` |
| FR-FC-4 chains/dedup/comments | `simple_chain`, `nodes_edges_and_dedup`, `semicolon_separated`, `comments_skipped` |
| FR-FC-5 subgraph | `subgraph_membership`, `subgraph` golden |
| FR-FC-6 layout/determinism | all goldens, `layout_is_deterministic` |
