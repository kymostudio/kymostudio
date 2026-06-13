---
title: UML State Machine — Requirements (module, reserved)
document_id: FEAT-UML-STATE-001
version: "0.1"
issue_date: 2026-06-13
status: Reserved
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Future implementers of UML state-machine support
review_cycle: On scheduling this module
supersedes: null
related_documents:
  - FEAT-UML-001
  - FEAT-MERMAID-STATE-001    # the Mermaid stateDiagram front-end (reserved)
  - FEAT-FLOWCHART-001        # the layered layout this may reuse
  - REF-PLANTUML-001          # prior art: PlantUML state syntax
authors:
  - Vũ Anh
language: en
keywords:
  - uml
  - state
  - statemachine
  - reserved
---

# UML State Machine — Requirements (module, reserved)

**Status: reserved (not implemented).** `stateDiagram` / `stateDiagram-v2` is recognised by the
Mermaid dispatch and rejected with `MermaidError::Unsupported`; today the `state-*.svg` samples are
drawn by **external Mermaid.js**, not kymo.

State diagrams **are** node-edge shaped (states = nodes, transitions = edges), so this is the
cleanest UML type to add after sequence: the parser arm (`crate::mermaid::parse_state`) can produce
a graph that **reuses the flowchart hub's layered layout** (`layout_flowchart`) and the pure-Rust
SVG renderer, with state-specific glyphs (initial/final pseudostates, composite states → regions,
choice/fork/join). XMI maps to `uml:StateMachine` / `uml:State` / `uml:Transition`. PlantUML
(`REF-PLANTUML-001`) is the natural second source syntax. Element mappings added when scheduled.
