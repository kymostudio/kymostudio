---
title: Mermaid Support — Design (umbrella)
document_id: DESIGN-MERMAID-001
version: "0.1"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers implementing the Mermaid importer in the Rust core
review_cycle: On family-scope or engine-architecture change
supersedes: null
related_documents:
  - FEAT-MERMAID-001
  - TEST-MERMAID-001
  - PLAN-MERMAID-001
  - DESIGN-MERMAID-FLOWCHART-001
  - MERMAID-MAP-001
  - KYMOJSON-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - design
  - rust
  - engine
---

# Mermaid Support — Design (umbrella)

## 1. Architecture: the engine moves into Rust

The importer is the first piece of the kymo *engine* (model + parsing + layout) to
live in `packages/rust/kymostudio-core`. Today the crate only rasterizes SVG→PNG/PDF;
this feature adds, always-on (no feature gate, compiles bare and on wasm):

```
src/
  model.rs        Component / Region / Edge / Diagram + enums (incl. new Shape::Diamond)
                  + py_round (half-to-even, matches CPython round())
  kymojson.rs     hand-rolled serializer → .kymo.json (matches to_kymojson.model_dict)
  mermaid/
    mod.rs        MermaidError, Direction, Flow* types, parse() + diagram-type dispatch
    lexer.rs      Scanner: node ids, shape wrappers, edge operators, |labels|
    parser.rs     statement grammar: Node (Edge Node)*
  layout.rs       layered (Sugiyama) layout → positioned Diagram
```

Top-level entry `lib::mermaid_to_kymojson(&str) -> Result<String, MermaidError>`
chains parse → layout → export. Surfaced to Python (`python.rs`, PyO3
`mermaid_to_kymojson`), JS (`wasm.rs`, `mermaidToKymoJson`), and the `kymo` CLI.

## 2. Why kymojson as the output contract

`.kymo.json` (KYMOJSON-MAP-001) is the resolved-model interchange both back-ends
already load (`from_kymojson` / `parseKymoJson`) and render with no further layout
— exactly like a `.bpmn` import. Emitting it means the Rust engine did not need a
renderer at first, and Python/JS need only call the binding. (The parity phase since
shipped the Python/JS render path, and the core later gained its **own** pure-Rust
flowchart renderer, `crate::flowchart_svg` — so `mermaid_to_svg` / `d2_to_svg` /
`dot_to_svg` render without the front-ends at all.)

## 3. Hand-rolled JSON, not serde

The serializer reproduces CPython `json.dumps(payload, indent=2,
ensure_ascii=False) + "\n"` exactly: snake_case keys in the `to_kymojson` field
order, points as arrays, integral floats collapsed to ints, `-0`→`0`, control-char
escaping, non-ASCII left raw. Meeting these byte-conventions with serde_json would
require a custom serializer anyway; a ~150-line `JsonWriter` is simpler, auditable,
and adds nothing to the wasm bundle (NFR-2). All emitted coordinates are integers
(rounded at emit), so the writer only handles int/string/bool/null/array/object.

## 4. Layout: a port of bpmn_layout.py (positions only)

`layout.rs` ports the node-positioning half of
`packages/python/src/kymo/bpmn_layout.py` — longest-path Kahn ranking with
back-edge reversal, dummy nodes for long edges, barycenter ordering
(`ORDER_SWEEPS=6`), side assignment around a straight trunk, coordinate assignment
with priority-aware `place_layer` (`ALIGN_SWEEPS=8`), constants `H_GAP=80`,
`V_GAP=50`, `MARGIN=40`. It deliberately does **not** port edge routing: kymo's
`to_svg.render_edge` routes a point-less edge from anchors at render time, and only
that path honours `dashed`/`no_arrow` (see MERMAID-MAP-001 §4).

**Direction handling.** The algorithm runs in an abstract `(main, cross)` space
(main = along flow, cross = perpendicular), using each node's main/cross extent
(width/height swapped for vertical flows). Final screen coordinates map per
direction (`LR`: (m,c); `TB`: (c,m); `RL`/`BT` mirror the main axis), so node boxes
stay upright. Coordinates normalize so the content's top-left sits at `MARGIN`.

**Determinism (NFR-1).** Every sort carries the declaration index as a stable
secondary key; sweep counts are fixed and even; `py_round` is half-to-even to match
Python; map/insertion order never feeds an order-sensitive sort. A determinism test
asserts two runs are byte-equal.

## 5. Diagram-type dispatch & extensibility

`mermaid::parse` reads the header keyword and dispatches. Only `graph`/`flowchart`
is implemented; the other arms return `MermaidError::Unsupported(type)`. Adding a
type = a new `mermaid/<type>.rs` producing the same `Diagram` (reusing `layout.rs`
where the type is node-edge shaped, e.g. state) plus a dispatch arm.

## 6. New `diamond` shape

Mermaid decisions (`{}`) map to a new `Shape::Diamond` (kymo had no diamond). The
Rust model defines it and its layout footprint; the SVG glyph in Python `to_svg`
and JS `render` is part of the parity phase (PLAN-MERMAID-001).
