---
title: Flowchart Conversion Hub — Design
document_id: DESIGN-FLOWCHART-001
version: "0.1"
issue_date: 2026-06-09
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining the flowchart IR, importers, emitters, renderer
review_cycle: On architecture change
supersedes: null
related_documents:
  - FEAT-FLOWCHART-001
  - TEST-FLOWCHART-001
  - PLAN-FLOWCHART-001
  - D2-MAP-001
  - DOT-MAP-001
  - DRAWIO-MAP-001
  - KYMOJSON-MAP-001
  - RES-PIPELINE-001
authors:
  - Vũ Anh
language: en
keywords:
  - flowchart
  - ir
  - architecture
---

# Flowchart Conversion Hub — Design

## 1. The intermediate representation

`crate::flowchart` is a hub of plain, **positionless** data:

```rust
pub enum Direction { Tb, Bt, Lr, Rl }
pub struct FlowNode { pub id: String, pub label: String, pub shape: Shape }
pub struct FlowEdge { pub src: String, pub dst: String, pub label: String,
                      pub dashed: bool, pub no_arrow: bool }
pub struct Subgraph { pub id: String, pub title: String, pub members: Vec<String> }
pub struct Flowchart { pub direction: Direction, pub nodes: Vec<FlowNode>,
                       pub edges: Vec<FlowEdge>, pub subgraphs: Vec<Subgraph> }
```

`Shape` is the shared `crate::model::Shape` enum (box / badge / circle / diamond /
hex / cylinder / …). The IR carries **no coordinates** — that is the single design
decision everything else follows from: text emitters never invent geometry, and the
target language (or `layout_flowchart`) decides positions.

## 2. Spoke topology

```
 source text ──parse──▶ Flowchart ──┬── emit ─────────▶ target text (mmd / d2 / dot)
                          (IR)      └── layout_flowchart ▶ Diagram ──┬─ kymojson ─▶ .kymo.json
                                                                     ├─ flowchart_svg ▶ SVG
                                                                     └─ drawio ▶ mxGraph XML
```

- **Importers** (`mermaid::parse`, `d2::parse`, `dot::parse`) are pure `&str → Flowchart`.
  Each owns its language's quirks (D2 qualified refs `g.a` → leaf; DOT positional cluster
  membership; Mermaid `subgraph`/edge operators) and degrades gracefully on unknown syntax.
- **Text emitters** (`flowchart::emit`) are pure `&Flowchart → String`, the inverse of the
  importers — the round-trip fixpoint (`FR-FC-3`).
- **Layout** (`layout::layout_flowchart`) is the one **filter** stage: a Sugiyama-style
  layered assignment (ported from `bpmn_layout`) producing a resolved `Diagram` with
  positions and **point-less** edges.
- **Model/image encoders** consume the `Diagram`: `kymojson::export`, `flowchart_svg::render`,
  and the generic `drawio::to_drawio` (`FEAT-PIPECLI-DRAWIO-001`, `DRAWIO-MAP-001`).

## 3. Key decisions

- **Text targets bypass layout; image/model targets require it.** D2/DOT/Mermaid are
  laid out by *their* engines, so emitting the positionless IR is correct and minimal.
  SVG/draw.io/kymojson need geometry, so they run `layout_flowchart` first. (draw.io
  especially: mxGraph will not auto-place an un-positioned graph.)
- **Point-less edges in the renderer.** Unlike BPMN (explicit `points`), `layout_flowchart`
  emits edges without waypoints; `flowchart_svg` resolves anchors from node geometry
  (`resolve_anchors`, horizontal-biased) and routes orthogonal Z-paths at render time.
- **One Rust core, three surfaces.** Every converter is a `kymostudio-core` function
  surfaced via PyO3 + wasm; the Python/JS CLIs delegate over the `.kymo.json` wire, so
  cross-impl output is identical (`NFR-FC-3` notwithstanding the independent *pixel*
  renderers).
- **Mermaid stays its own feature.** `FEAT-MERMAID-001` owns the Mermaid front-end and the
  future diagram-type roadmap; this hub depends on it as one source spoke.

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — IR + spoke topology + decisions. |
