---
title: Mermaid Flowchart — Plan (module)
document_id: PLAN-MERMAID-FLOWCHART-001
version: "0.1"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Maintainers of the flowchart module
review_cycle: On phase completion
supersedes: null
related_documents:
  - FEAT-MERMAID-FLOWCHART-001
  - DESIGN-MERMAID-FLOWCHART-001
  - TEST-MERMAID-FLOWCHART-001
  - PLAN-MERMAID-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - flowchart
  - plan
---

# Mermaid Flowchart — Plan (module)

**Status: implemented (Phase 1).** Delivered in `packages/rust/kymostudio-core`:
`model.rs`, `kymojson.rs`, `mermaid/{lexer,parser,mod}.rs`, `layout.rs`; entry
`mermaid_to_kymojson`; PyO3 + wasm bindings; `kymo` CLI `.mmd` → `.kymo.json`;
golden + unit + determinism tests; `samples/pipeline.mmd`, `samples/approval.mmd`
(+ their `.kymo.json`); CLI/wheel smoke in `rust.yml`.

**Follow-ups (tracked in PLAN-MERMAID-001):**

- Rendering parity: `diamond` glyph + icon-less labelled shapes in Python/JS
  renderers; binding wiring; golden SVGs.
- Grammar reach: inline `-- text --` edge labels; `&` multi-node statements;
  `class`/`style` directives (ignored today); link/edge id syntax.
- Layout: optional subgraph-aware clustering if bounding-box regions look loose.
