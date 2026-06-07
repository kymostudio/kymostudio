---
title: Mermaid State — Requirements (module, reserved)
document_id: FEAT-MERMAID-STATE-001
version: "0.1"
issue_date: 2026-06-07
status: Reserved
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Future implementers of Mermaid state-diagram import
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
  - state
  - reserved
---

# Mermaid State — Requirements (module, reserved)

**Status: reserved (not implemented).** `stateDiagram` / `stateDiagram-v2` are
recognised by the dispatch and rejected with `MermaidError::Unsupported`.

State diagrams **are** node-edge shaped (states = nodes, transitions = edges), so
this module can **reuse `layout.rs`** directly. Work: a `mermaid/state.rs` parsing
states, transitions (with guards/labels), `[*]` start/end pseudo-states, and
composite states (→ `cluster` regions), then reuse the layered layout. The cleanest
second diagram type to add after flowchart.
