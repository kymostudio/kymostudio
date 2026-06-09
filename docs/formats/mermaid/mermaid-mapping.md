---
title: Mermaid Import — Element Mapping
document_id: MERMAID-MAP-001
version: "0.1"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers using or maintaining the kymo Mermaid importer
review_cycle: On Mermaid-mapping change
supersedes: null
related_documents:
  - FEAT-MERMAID-001          # Mermaid support — requirements (umbrella)
  - DESIGN-MERMAID-001        # Mermaid support — design (umbrella)
  - DESIGN-MERMAID-FLOWCHART-001  # flowchart module design (realises this mapping)
  - KYMOJSON-MAP-001          # .kymo.json — serialization of the model this import produces
  - BPMN-MAP-001              # sibling importer mapping (BPMN)
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - flowchart
  - mapping
  - import
---

# Mermaid Import — Element Mapping

This is the **normative** mapping from [Mermaid](https://mermaid.js.org) source to
the kymo model (`model.Component` / `Edge` / `Region`). The importer lives in the
Rust shared engine (`packages/rust/kymostudio-core`, module `mermaid`) and emits the
resolved model as `.kymo.json` (KYMOJSON-MAP-001), which the Python and JS
front-ends consume. Cite this document by `document_id` (`MERMAID-MAP-001`).

Phase 1 implements the **flowchart** family only (`graph` / `flowchart`). Other
diagram types are recognised and rejected with a clear error; their mappings are
reserved for future modules (see FEAT-MERMAID-001).

## 1. Diagram-type dispatch

The first non-comment statement's leading keyword selects the diagram type.

| Mermaid header | kymo handling |
|---|---|
| `graph`, `flowchart` | **flowchart** (implemented) |
| `sequenceDiagram` | `Unsupported` (reserved — module: sequence) |
| `stateDiagram`, `stateDiagram-v2` | `Unsupported` (reserved — module: state) |
| `classDiagram` | `Unsupported` (reserved — module: class) |
| `erDiagram` | `Unsupported` (reserved — module: er) |
| anything else | `Unsupported` |

`%%` line comments and `%%{init}%%` directives are stripped. Statements are
separated by newlines or `;`.

## 2. Direction

| Mermaid | kymo layout axis |
|---|---|
| `TD` / `TB` (default) | top→bottom |
| `BT` | bottom→top |
| `LR` | left→right |
| `RL` | right→left |

Node boxes stay upright in every direction; only their arrangement changes (see
DESIGN-MERMAID-FLOWCHART-001 for the abstract main/cross layout space).

## 3. Node shapes

The label is the text inside the wrapper (surrounding `"…"` quotes are stripped).
A node first seen without a wrapper defaults to a rectangle with the id as label;
a later explicit wrapper upgrades its label and shape.

| Mermaid syntax | shape name | kymo `Component.shape` |
|---|---|---|
| `id[text]` | rectangle | `box` |
| `id(text)` | rounded | `box` |
| `id([text])` | stadium | `badge` |
| `id[[text]]` | subroutine | `box` |
| `id[(text)]` | cylinder / database | `cylinder` |
| `id((text))` | circle | `circle` |
| `id{text}` | decision / rhombus | **`diamond`** |
| `id{{text}}` | hexagon | `hex` |
| `id>text]` | asymmetric flag | `box` |

`diamond` is a **new** kymo shape introduced for Mermaid decisions; the Python/JS
SVG renderers gain the glyph when they consume Mermaid kymojson (deferred — see
§7). All components are emitted with `accent: "blue"`, `icon: ""`, and an explicit
`size` computed from the label.

## 4. Edges

| Mermaid operator | `dashed` | `no_arrow` | note |
|---|---|---|---|
| `A --> B` | false | false | arrow |
| `A --- B` | false | true | line |
| `A -.-> B` | true | false | dashed arrow |
| `A -.- B` | true | true | dashed line |
| `A ==> B` | false | false | thick → rendered as a normal arrow (see gap) |
| `A === B` | false | true | thick line |
| `A -->|text| B` | — | — | `text` → `Edge.label` |
| `A <--> B` | false | false | bidirectional → arrow (head-at-source not modelled) |

Edges are emitted **without** `Edge.points`: kymo's SVG back-end routes a
point-less edge from its anchors at render time, which is what honours `dashed`
and `no_arrow` (an edge carrying `points` would take the BPMN-flow path instead).
`bpmn_flow` is left `null`.

## 5. Subgraphs

`subgraph <id> [Title] … end` (or `subgraph Title … end`) becomes a
`Region` with `style: "cluster"`, `label` = title, and `contains` = the ids of
nodes declared inside. Region `bounds` are the bounding box of those members plus
padding (and label clearance when a title is present). Nodes are assigned to the
innermost open subgraph.

## 6. Known gaps (Phase 1)

- **Edge thickness** (`==>`, `===`): the kymo `Edge` model has no thickness field;
  thick edges render as normal-weight. Documented, not lost.
- **Inline edge text** `A-- text -->B`: not parsed; use the pipe form
  `A -->|text| B`.
- **Subgraph clustering**: members are not force-grouped by the layout; the region
  is drawn as the bounding box of wherever the layered layout placed them. Members
  that are not rank-contiguous may produce a loose box.
- **Nested subgraphs**: a node is placed in its innermost subgraph only; nested
  region nesting is not modelled.
- **Edge head decorations** (`--o`, `--x`): treated as a plain arrow head.

## 7. Output & rendering

The importer produces `.kymo.json` (KYMOJSON-MAP-001). Rendering to SVG is done by
the Python (`from_kymojson` → `to_svg`) and JS (`parseKymoJson` → `renderSVG`)
back-ends, which **now render Mermaid output end-to-end** (Phase 2):

- Both renderers draw **icon-less labelled shapes** — a flowchart node (`icon == ""`)
  is drawn as the shape **outline** (box / rounded / circle / `diamond` / hex /
  cylinder / stadium) with the label **inside**, not the icon-card style. The CSS is
  injected only when such nodes are present, so non-flowchart goldens stay byte-identical.
- The new **`diamond`** glyph is in the `Shape` literal/union + sizing tables of both
  models.
- A `.mmd` file is a first-class CLI source in both packages (`kymo flow.mmd` → SVG),
  and a native **`flowchart [DIR] { … }`** DSL block embeds Mermaid syntax inside a
  `.kymo` file (KYMO-DSL grammar §6.11). Both call the same core importer, so the
  resolved model is identical across impls; the SVG bytes differ (independent renderers).

These paths require a `kymostudio-core` that ships the Mermaid binding
(`mermaid_to_kymojson` / `mermaidToKymoJson`); the kymojson itself is byte-conformant
with the model both back-ends load.

## 8. Transpilation (mmd → D2 / DOT / Mermaid)

`mermaid::parse` returns a format-neutral **flowchart IR** (`crate::flowchart`:
positionless `FlowNode` / `FlowEdge` / `Subgraph` / `Direction`). Besides the
layout→`Diagram`→render path, the IR feeds text **emitters** (`flowchart::emit`),
so converting between flowchart DSLs is a parse-then-emit with no geometry — the
target lays the graph out itself.

| Target | API / CLI | Shape mapping (from §3) |
|---|---|---|
| **Mermaid** | `mermaid_to_mermaid` · `kymo f.mmd norm.mmd` | inverse of §3 (round-trip / normalize) |
| **D2** | `mermaid_to_d2` · `kymo f.mmd f.d2` | circle→`circle`, diamond→`diamond`, hex→`hexagon`, cylinder→`cylinder`, stadium→`oval`, box→default; subgraph→container (members ref'd as `g.id`) |
| **Graphviz DOT** | `mermaid_to_dot` · `kymo f.mmd f.dot` | box/circle/diamond/hexagon/cylinder native; stadium→`box,style=rounded`; subgraph→`cluster_*` |
| **draw.io** (mxGraph) | `mermaid_to_drawio` · `kymo f.mmd f.drawio` · `kymo any.kymo --drawio` | box→`rounded=0`, circle→`ellipse`, diamond→`rhombus`, hex→`shape=hexagon`, cylinder→`shape=cylinder3`, stadium→`rounded=1`; subgraph→`cluster` vertex; edges by `source`/`target` |

> **Note:** D2 / DOT / Mermaid emit the *positionless* IR (the target lays out).
> **draw.io is different** — a generic WYSIWYG format that needs explicit geometry,
> so it is an *encoder* (RES-PIPELINE-001 §3.4) consuming the **positioned**
> `Diagram` from `layout_flowchart`. `drawio_from_kymojson` exposes the same
> encoder for any `.kymo.json` model (any source, not just Mermaid); icon / BPMN /
> AWS shapes degrade to a labelled rectangle.

Edge style carries over (dashed → D2 `style.stroke-dash` / DOT `style=dashed`;
no-arrow → D2 `--` / DOT `dir=none`). Output is deterministic (declaration order
preserved). Bindings: PyO3 (`mermaid_to_d2`/`_dot`/`_mermaid`) and wasm
(`mermaidToD2`/`mermaidToDot`/`mermaidToMermaid`). `mmd → mmd` is a structural
fixpoint (`tests/mermaid_convert.rs`).
