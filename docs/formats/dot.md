---
title: Graphviz DOT — Element Mapping (import + export)
document_id: DOT-MAP-001
version: "0.1"
issue_date: 2026-06-09
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers using or maintaining the kymo DOT importer/emitter
review_cycle: On DOT-mapping change
supersedes: null
related_documents:
  - FEAT-FLOWCHART-001        # Flowchart conversion hub (umbrella)
  - FEAT-FLOWCHART-DOT-001      # DOT spoke — module requirements
  - D2-MAP-001                # sibling flowchart format (D2)
  - MERMAID-MAP-001           # sibling flowchart format (Mermaid)
  - KYMOJSON-MAP-001          # .kymo.json — serialization the importer produces
authors:
  - Vũ Anh
language: en
keywords:
  - dot
  - graphviz
  - flowchart
  - mapping
  - import
  - export
---

# Graphviz DOT — Element Mapping (import + export)

This is the **bidirectional** mapping between the [Graphviz DOT language](https://graphviz.org/doc/info/lang.html)
and the kymo flowchart IR (`crate::flowchart`). kymo **imports** the DOT flowchart subset
(`crate::dot::parse` → IR → `layout_flowchart` → `.kymo.json` / SVG) and **emits** DOT from
the IR (`flowchart::emit::to_dot`). Cite this document by `document_id` (`DOT-MAP-001`).

> **Upstream source.** The source of record is the Graphviz DOT language grammar —
> <https://graphviz.org/doc/info/lang.html>. This is the kymo **subset mapping**, not a
> grammar mirror. DOT is general node-edge with rich attributes, HTML labels, ports and
> records; kymo reads/writes only the **flowchart subset** (`digraph`/`graph`, `rankdir`,
> node `shape`/`style`/`label`, edges with `label`/`style`/`dir`, `subgraph cluster_*`).
> Unrecognised statements are skipped, so a richer `.dot` still imports its graph skeleton.

## 1. Graph header & direction

`[strict] digraph|graph [name] { … }` opens the graph. `rankdir` → `Direction`:

| DOT `rankdir` | kymo `Direction` |
|---|---|
| `TB` (default) | `Tb` |
| `LR` | `Lr` |
| `BT` | `Bt` |
| `RL` | `Rl` |

`node […]` / `edge […]` / `graph […]` default-attribute statements are ignored on import.

## 2. Node shapes

`id [label="…", shape=X, style=Y]`. Quoted ids/labels have surrounding quotes stripped.

| DOT `shape` (+`style`) | kymo `Shape` | export back as |
|---|---|---|
| `box` / `rect` / `rectangle` / `square` | `box` | `shape=box` |
| `box` **+ `style` contains `rounded`** | `badge` (stadium) | `shape=box, style=rounded` |
| `circle` / `doublecircle` / `ellipse` / `oval` | `circle` | `shape=circle` |
| `diamond` / `Mdiamond` | `diamond` | `shape=diamond` |
| `hexagon` | `hex` | `shape=hexagon` |
| `cylinder` | `cylinder` | `shape=cylinder` |
| other | `box` (fallback) | — |

## 3. Edges

`a -> b` (digraph) / `a -- b` (graph), with an optional `[ … ]` attribute block.

| DOT | kymo `Edge` |
|---|---|
| `a -> b` | arrow (default) |
| `a -- b` | `no_arrow` |
| `[label="…"]` | `Edge.label` |
| `[style=dashed]` | `dashed` |
| `[dir=none]` | `no_arrow` |

Chains `a -> b -> c` expand to one edge per segment (attributes apply to the chain; the
label is placed on the last segment). On **export**: `dashed` → `style=dashed`, `no_arrow`
→ `dir=none`.

## 4. Clusters ↔ subgraphs

`subgraph cluster_<id> { label="…"; <members> }` ↔ a kymo `Subgraph`. Membership is
**positional** (a node statement inside the cluster places it there) — DOT does not qualify
edge endpoints with the cluster, so edges use plain ids both ways. The `cluster_` prefix is
stripped on import (`cluster_Prod` → id `Prod`) and re-added on export.

## 5. Gaps

- **Not read (skipped):** HTML/record labels, ports (`a:f0 -> b`), subgraph rank
  constraints, `rankdir` inside a subgraph, edge/node default-attr inheritance beyond the
  shape/style/label/dir keys above, multi-statement-per-line where statements are not
  newline- or `;`-separated.
- DOT is otherwise a clean node-edge fit (no qualified-ref bookkeeping like D2).

## Annex A — Revision History

| Version | Date       | Author | Changes                                   |
|---------|------------|--------|-------------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — DOT import/export mapping. |

## Annex B — Document Control

Version-controlled at `docs/formats/dot.md`; authoritative source is the main-branch
working tree. Update when the DOT importer/emitter changes an element mapping; increment
`version` and append to Annex A. References: Graphviz DOT grammar
(<https://graphviz.org/doc/info/lang.html>); `DOT-MAP-001`, `KYMOJSON-MAP-001`,
`FEAT-FLOWCHART-DOT-001`.
