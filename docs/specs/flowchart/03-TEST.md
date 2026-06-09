---
title: Flowchart Conversion Hub — Test
document_id: TEST-FLOWCHART-001
version: "0.1"
issue_date: 2026-06-09
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers verifying the flowchart importers, emitters, renderer
review_cycle: On test-surface change
supersedes: null
related_documents:
  - FEAT-FLOWCHART-001
  - DESIGN-FLOWCHART-001
  - PLAN-FLOWCHART-001
  - D2-MAP-001
  - DOT-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - flowchart
  - test
  - verification
---

# Flowchart Conversion Hub — Test

## 1. Strategy

Each spoke is **pure** (`&str → IR`, `&IR → String`, `&Diagram → String`), so the layers
are unit-testable in isolation, and the conversions are checked at three levels.

| Level | What | Where |
|---|---|---|
| **Unit — parsers** | Each importer's shapes, edges, direction, containers, gaps on small inputs. | `src/{mermaid,d2,dot}/…` `#[cfg(test)]` |
| **Unit — emitters** | `to_mermaid`/`to_d2`/`to_dot` produce the documented syntax (labels, dash, clusters, escaping). | `flowchart::emit` tests |
| **Golden — convert** | Per fixture, byte-stable `convert_golden/<name>.{mmd,d2,dot}` (regen `KYMO_UPDATE_CONVERT_GOLDEN`). | `tests/mermaid_convert.rs` |
| **Round-trip fixpoint** | `source → IR → emit → re-parse → IR` is identity on the graph (ids, labels, shapes, edges, membership). | `tests/mermaid_convert.rs` |
| **Render** | `mermaid_to_svg` / `d2_to_svg` / `dot_to_svg` produce well-formed SVG; the shared fixtures rasterize correctly. | `src/flowchart_svg.rs` + lib integration test |
| **Cross-impl** | The Python/JS bindings return the same kymojson/SVG as Rust (skip-guarded on an older core). | `packages/python/tests/test_mermaid.py`, `packages/js/tests/mermaid.test.js` |

## 2. Acceptance

- `cargo test` (default + `bpmn`) green: parser units (mermaid/d2/dot), emitter units,
  convert goldens, round-trip, renderer units, lib integration.
- The `ci` flowchart (decision diamonds, circle / stadium / cylinder nodes, a subgraph
  cluster, dashed edge, yes/no labels) renders correctly from **`.mmd`, `.d2`, and `.dot`**
  — validated by rasterizing the SVG through **resvg**.
- `kymo flow.mmd flow.d2` then `kymo flow.d2 flow.svg` produces the same graph the original
  Mermaid described.

## 3. Not yet covered

- Golden **SVG** fixtures + a `flowchart` conformance sample are deferred until the core
  that ships the bindings is released and the Python/JS floors are raised (two-release
  rollout — see `PLAN-FLOWCHART-001`). Today the renderer is verified by structural
  assertions + resvg rasterization, not byte-goldens.

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — test strategy & acceptance. |
