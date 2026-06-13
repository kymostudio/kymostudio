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

**Phase 2 — rendering parity (implemented, Python + JS):** `diamond` glyph +
icon-less flowchart-node draw path (outline + interior label) in `to_svg.py` /
`render.ts`; `.mmd` CLI dispatch + `import_mermaid`/`parseMermaid` binding wiring;
native `flowchart [DIR] { … }` DSL block (grammar §6.11). Tests:
`test_mermaid.py`, `mermaid.test.js`. Golden SVGs + a `flowchart` conformance
sample are deferred until the core that ships the Mermaid binding is released
(two-release rollout).

**Follow-ups (tracked in PLAN-MERMAID-001):**

- Grammar reach: inline `-- text --` edge labels; `&` multi-node statements;
  `class`/`style` directives (ignored today); link/edge id syntax;
  parallelogram/trapezoid shapes; frontmatter.
- Layout: optional subgraph-aware clustering if bounding-box regions look loose.
