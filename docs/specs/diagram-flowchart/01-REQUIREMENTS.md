---
title: Flowchart Conversion Hub — Requirements
document_id: FEAT-FLOWCHART-001
version: "0.1"
issue_date: 2026-06-09
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining kymo's flowchart import/export/render
review_cycle: On a spoke being added or a mapping change
supersedes: null
related_documents:
  - DESIGN-FLOWCHART-001        # Design
  - TEST-FLOWCHART-001          # Test documentation
  - PLAN-FLOWCHART-001          # Plan
  - FEAT-FLOWCHART-D2-001       # module: D2 spoke
  - FEAT-FLOWCHART-DOT-001      # module: Graphviz DOT spoke
  - FEAT-FLOWCHART-SVG-001      # module: pure-Rust flowchart SVG renderer
  - FEAT-MERMAID-001            # Mermaid importer (a source spoke into this hub)
  - FEAT-PIPECLI-001            # Pipeline & CLI — the registry this plugs into
  - FEAT-PIPECLI-DRAWIO-001     # the source-agnostic draw.io encoder (an output)
  - MERMAID-MAP-001             # Mermaid element mapping
  - D2-MAP-001                  # D2 element mapping
  - DOT-MAP-001                 # Graphviz DOT element mapping
  - DRAWIO-MAP-001              # draw.io encoder mapping
  - KYMOJSON-MAP-001            # .kymo.json — the interchange wire format
authors:
  - Vũ Anh
language: en
keywords:
  - flowchart
  - conversion
  - import
  - export
  - intermediate-representation
---

# Flowchart Conversion Hub — Requirements

## 0. The feature and its document set

The **flowchart conversion hub** is a small format-neutral core in
`kymostudio-core` that lets the engine read a flowchart in one diagram-as-code
language, and write it back out in another language, as a kymo model, or as a
rendered image — all through **one intermediate representation**. It is the
"hub-and-spoke" realisation of the pipeline's *single intermediate model + one
importer/encoder per format* principle (`FEAT-PIPECLI-001`, `RES-PIPELINE-001`),
specialised to the flowchart family.

```
   Mermaid ─┐                      ┌─ Mermaid  (emit)
       D2 ──┼─▶  flowchart IR  ──▶ ┼─ D2 / DOT (emit)
      DOT ──┘   (positionless)     ├─ .kymo.json / SVG (layout → render)
                                   └─ draw.io  (layout → encode)
```

The document set: this `FEAT` (requirements) · `DESIGN-FLOWCHART-001` (architecture
& data model) · `TEST-FLOWCHART-001` (V&V) · `PLAN-FLOWCHART-001` (phasing). Each
source/target spoke has a module under `modules/` and a normative element mapping
under `docs/formats/`.

| Spoke | Direction | Module | Mapping |
|---|---|---|---|
| Mermaid | import + emit | `FEAT-MERMAID-001` | `MERMAID-MAP-001` |
| D2 | import + emit | `FEAT-FLOWCHART-D2-001` | `D2-MAP-001` |
| Graphviz DOT | import + emit | `FEAT-FLOWCHART-DOT-001` | `DOT-MAP-001` |
| SVG | render | `FEAT-FLOWCHART-SVG-001` | — |
| draw.io | encode | `FEAT-PIPECLI-DRAWIO-001` (generic) | `DRAWIO-MAP-001` |
| `.kymo.json` | serialize | (the shared engine) | `KYMOJSON-MAP-001` |

## Part A — Stakeholder needs (`SN-FC`)

| id | Need |
|---|---|
| `SN-FC-01` | A user SHALL be able to **convert** a flowchart between supported languages (e.g. `kymo flow.mmd flow.d2`) without an external tool or a browser. |
| `SN-FC-02` | A user SHALL be able to **render** a flowchart source to SVG entirely in the engine (no Graphviz/D2/Mermaid binary). |
| `SN-FC-03` | A user SHALL be able to **import** a third-party flowchart (Mermaid/D2/DOT) into the kymo model (`.kymo.json`) for further processing. |
| `SN-FC-04` | Adding a new flowchart language SHALL be **one importer + one emitter** against the shared IR, not a new end-to-end path. |
| `SN-FC-05` | Conversions SHALL be **deterministic** and the same across the Python, JS, and Rust surfaces (one Rust core, exposed via PyO3/wasm). |

## Part B — Introduction & map

The hub is **`crate::flowchart`**: positionless `FlowNode` / `FlowEdge` / `Subgraph`
/ `Direction`. **Front-ends** (`crate::mermaid`, `crate::d2`, `crate::dot`) parse a
source into the IR; **text back-ends** (`flowchart::emit::{to_mermaid,to_d2,to_dot}`)
serialize the IR back to a language; **model/image back-ends** run `layout_flowchart`
to a resolved `Diagram`, then `kymojson::export` (`.kymo.json`), `flowchart_svg::render`
(SVG), or the generic `drawio` encoder (mxGraph XML). The IR is the *only* thing the
spokes share — a new spoke never touches another.

Mermaid is the first spoke and keeps its own feature folder (`FEAT-MERMAID-001`,
which also tracks the broader Mermaid diagram-type roadmap); this hub owns the IR,
the D2/DOT spokes, the emitters, and the SVG renderer.

## Part C — Requirements

### C.1 Functional (`FR-FC`)

| id | Requirement | Need |
|---|---|---|
| `FR-FC-1` | The IR SHALL be **positionless** (no coordinates) and format-neutral — layout is a separate stage (`layout_flowchart`), so text emitters never carry geometry. | `SN-FC-01` |
| `FR-FC-2` | **Importers** (`mermaid`/`d2`/`dot`) SHALL each parse their flowchart subset into the IR and SHALL NOT run layout; unrecognised constructs SHALL be skipped (graph skeleton still imports), per the per-format mapping. | `SN-FC-03`, `SN-FC-04` |
| `FR-FC-3` | **Text emitters** SHALL serialize the IR to Mermaid/D2/DOT such that re-importing the emitted text yields the same IR graph (round-trip fixpoint; declaration order may normalise). | `SN-FC-01` |
| `FR-FC-4` | A **pure-Rust SVG renderer** (`flowchart_svg`) SHALL render a resolved flowchart `Diagram` with no external binary (`FEAT-FLOWCHART-SVG-001`). | `SN-FC-02` |
| `FR-FC-5` | Converters SHALL be exposed uniformly: Rust `kymo` CLI (output-extension registry), PyO3, and wasm — `mermaid_to_{svg,d2,dot,drawio,kymojson}`, `d2_to_{svg,kymojson}`, `dot_to_{svg,kymojson}`. | `SN-FC-05` |

### C.2 Non-functional (`NFR-FC`)

| id | Requirement |
|---|---|
| `NFR-FC-1` | **No new heavy deps.** The hub, importers, emitters, and renderer compile under `--no-default-features` and into the wasm bundle. |
| `NFR-FC-2` | **Determinism.** Identical input → byte-identical output across runs/platforms. |
| `NFR-FC-3` | **Independent renderers.** The Rust SVG renderer is the core's own look; it is **not** byte-identical to the Python/JS flowchart renderers — `.kymo.json` (`KYMOJSON-MAP-001`) is the shared contract, not pixels. |

**Out of scope:** non-flowchart diagram families (sequence/class/state/ER — see the
Mermaid roadmap); a `.drawio` **importer** (reading mxGraph into the IR — only export
exists); faithful icon export to draw.io; layout-quality parity with Graphviz/D2 engines.

## Annex A — Revision History

| Version | Date       | Author | Changes                                                       |
|---------|------------|--------|---------------------------------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — promotes the shipped flowchart IR + D2/DOT spokes + emitters + SVG renderer (formerly `pipeline-and-cli` modules) into their own feature. |
