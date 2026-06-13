---
title: UML Class — Requirements (module, reserved)
document_id: FEAT-UML-CLASS-001
version: "0.1"
issue_date: 2026-06-13
status: Reserved
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Future implementers of UML class-diagram support
review_cycle: On scheduling this module
supersedes: null
related_documents:
  - FEAT-UML-001
  - FEAT-MERMAID-CLASS-001    # the Mermaid classDiagram front-end (reserved)
  - REF-PLANTUML-001          # prior art: PlantUML class syntax
authors:
  - Vũ Anh
language: en
keywords:
  - uml
  - class
  - reserved
---

# UML Class — Requirements (module, reserved)

**Status: reserved (not implemented).** `classDiagram` is recognised by the Mermaid dispatch and
rejected with `MermaidError::Unsupported`; today the `class-*.svg` samples are drawn by **external
Mermaid.js**, not kymo.

A class diagram is **not** a plain node-edge graph: each class box has **member compartments**
(attributes, operations, with visibility) whose text drives box sizing, and relationships carry
cardinalities and typed arrowheads (inheritance, association, composition, aggregation,
realization, dependency). Implementation will add a `crate::umlclass` IR (compartment-sized
boxes + typed relations) with its own sizing + layout, a parser arm
(`crate::mermaid::parse_class`), an SVG renderer, and — where the metamodel allows — XMI / StarUML
`.mdj` / Gaphor emitters (a class diagram maps to `uml:Class` / `uml:Association` etc.). PlantUML
(`REF-PLANTUML-001`) is the natural second source syntax. Element mappings added when scheduled.
