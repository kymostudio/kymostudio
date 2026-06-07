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

The importer produces `.kymo.json` (KYMOJSON-MAP-001) only. Rendering to SVG is
done by the Python (`from_kymojson` → `to_svg`) and JS (`parseKymoJson` →
`renderSVG`) back-ends. Those renderers require two additions before Mermaid
output renders end-to-end — drawing **icon-less labelled shapes** (flowchart nodes
carry no icon) and the new **`diamond`** glyph — tracked as the Python/JS parity
phase (FEAT-MERMAID-001 §roadmap). The kymojson itself is already byte-conformant
with the model both back-ends load.
