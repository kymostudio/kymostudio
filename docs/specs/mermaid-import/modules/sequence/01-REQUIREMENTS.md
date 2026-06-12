---
title: Mermaid Sequence — Requirements (module, reserved)
document_id: FEAT-MERMAID-SEQUENCE-001
version: "0.1"
issue_date: 2026-06-07
status: Reserved
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Future implementers of Mermaid sequence-diagram import
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
  - sequence
  - reserved
---

# Mermaid Sequence — Requirements (module, reserved)

**Status: reserved (not implemented).** `sequenceDiagram` is recognised by the
dispatch and rejected with `MermaidError::Unsupported`.

Sequence diagrams are **not** a node-edge graph: they have lifelines (participants)
and time-ordered messages, so they need their own **timeline/column layout**, not
the layered (`layout.rs`) one. Implementation will add a `mermaid/sequence.rs`
producing a resolved `Diagram` (participants as columns, messages as ordered
horizontal edges, activations as regions) plus a dispatch arm. Element mapping will
be added to MERMAID-MAP-001 when scheduled.
