---
title: Pure-Rust flowchart SVG renderer — Requirements (module)
document_id: FEAT-PIPECLI-SVG-001
version: "0.1"
issue_date: 2026-06-09
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining the Rust flowchart SVG renderer
review_cycle: On renderer change
supersedes: null
related_documents:
  - FEAT-PIPECLI-001          # Pipeline & CLI (umbrella)
  - FEAT-PIPECLI-D2-001       # D2 spoke (feeds this)
  - FEAT-PIPECLI-DOT-001      # DOT spoke (feeds this)
  - MERMAID-MAP-001           # Mermaid spoke (feeds this)
  - KYMOJSON-MAP-001          # the resolved model it renders
authors:
  - Vũ Anh
language: en
keywords:
  - svg
  - renderer
  - flowchart
  - rust
---

# Pure-Rust flowchart SVG renderer — Requirements (module)

**Status: implemented.** The core's **first non-BPMN SVG renderer** — a resolved
`Diagram` → SVG, entirely in Rust (no external binary, no Python/JS round-trip). It is the
ENCODE stage for flowchart sources in the Rust CLI.

- **FR-SVG-1.** `crate::flowchart_svg::render(&Diagram) -> String` draws icon-less flowchart
  nodes (the shape **outline** — box / rounded / circle / diamond / hexagon / cylinder /
  stadium — with the label **inside**), anchor-routed **point-less** edges (resolves anchors
  from node geometry, mirroring `model.resolve_anchors` / `Component.anchor`), and subgraph
  cluster regions, in a self-contained `<svg>` (CSS + arrow marker + dot-grid).
- **FR-SVG-2 (APIs).** `mermaid_to_svg`, `d2_to_svg`, `dot_to_svg` (parse → `layout_flowchart`
  → render). CLI: `kymo flow.{mmd,d2,dot} → flow.svg` via the output registry. PyO3
  (`mermaid_to_svg` / `d2_to_svg`) + wasm (`mermaidToSvg` / `d2ToSvg`).
- **NFR-SVG-1.** No new crate deps; compiles `--no-default-features` and into wasm.
- **NFR-SVG-2.** Its own look — **not** byte-identical to the Python/JS flowchart SVG
  (independent impls); the `.kymo.json` model remains the shared contract.

Unlike BPMN (whose edges carry explicit `points`), flowchart edges are point-less, so this
resolves anchors + routes orthogonal Z-paths at render time.

**Verification:** `src/flowchart_svg.rs` unit tests + a lib integration test; output
validated by rasterizing through resvg (the `ci` flowchart renders correctly from `.mmd`,
`.d2`, and `.dot`).

## Annex A — Revision History

| Version | Date       | Author | Changes                                          |
|---------|------------|--------|--------------------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — pure-Rust flowchart SVG renderer. |
