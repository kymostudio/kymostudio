---
title: Mermaid ER — Requirements (module, reserved)
document_id: FEAT-MERMAID-ER-001
version: "0.1"
issue_date: 2026-06-07
status: Reserved
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Future implementers of Mermaid ER-diagram import
review_cycle: On scheduling this module
supersedes: null
related_documents:
  - FEAT-MERMAID-001
  - DESIGN-MERMAID-FLOWCHART-001
  - MERMAID-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - er
  - entity-relationship
  - reserved
---

# Mermaid ER — Requirements (module, reserved)

**Status: reserved (not implemented).** `erDiagram` is recognised by the dispatch
and rejected with `MermaidError::Unsupported`.

Entity-relationship diagrams are node-edge in topology (entities = nodes,
relationships = edges) and can reuse `layout.rs`, but entities carry attribute rows
(name/type/key) that drive box sizing, and relationships carry **cardinality**
notation (`||--o{` etc.). Work will add `mermaid/er.rs` (entity attribute parsing,
cardinality → edge decoration) + element mapping in MERMAID-MAP-001 when scheduled.
