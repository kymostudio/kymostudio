---
title: Mermaid Class — Requirements (module, reserved)
document_id: FEAT-MERMAID-CLASS-001
version: "0.1"
issue_date: 2026-06-07
status: Reserved
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Future implementers of Mermaid class-diagram import
review_cycle: On scheduling this module
supersedes: null
related_documents:
  - FEAT-MERMAID-001
  - MERMAID-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - class
  - reserved
---

# Mermaid Class — Requirements (module, reserved)

**Status: reserved (not implemented).** `classDiagram` is recognised by the
dispatch and rejected with `MermaidError::Unsupported`.

Class diagrams are node-edge in topology but each class box has **member
compartments** (attributes, methods) whose text drives box sizing, and relationship
edges carry cardinalities and arrow styles (inheritance, composition, aggregation).
This needs compartment-aware node sizing and likely its own layout pass rather than
the plain layered one. Work will add `mermaid/class.rs` + element mapping in
MERMAID-MAP-001 when scheduled.
