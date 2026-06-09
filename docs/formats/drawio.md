---
title: draw.io (mxGraph XML) — Encoder Mapping
document_id: DRAWIO-MAP-001
version: "0.1"
issue_date: 2026-06-09
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers using or maintaining the kymo draw.io encoder
review_cycle: On draw.io-encoder change
supersedes: null
related_documents:
  - FEAT-PIPECLI-001          # Pipeline & CLI — registered encoders (umbrella)
  - FEAT-PIPECLI-DRAWIO-001   # draw.io encoder — module requirements
  - FEAT-FLOWCHART-001        # the flowchart hub that reaches this encoder as an output
  - KYMOJSON-MAP-001          # .kymo.json — the resolved model the encoder consumes
  - REF-DRAWIO-001            # draw.io prior-art reference
  - FEAT-DRAWIO-001           # the complementary .drawio → SVG *import* feature (separate)
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - mxgraph
  - encoder
  - export
---

# draw.io (mxGraph XML) — Encoder Mapping

This is the mapping for the kymo **draw.io encoder** — a resolved [`model::Diagram`] →
a [draw.io](https://drawio.com) (mxGraph) XML document (`crate::drawio::to_drawio`). It is a
**source-agnostic encoder** (RES-PIPELINE-001 §3.4): it consumes only the positioned model,
so any diagram — Mermaid/D2/DOT flowchart, BPMN, or hand-authored `.kymo` — can be exported.
Cite by `document_id` (`DRAWIO-MAP-001`).

> **Direction.** This is **export only** (kymo → draw.io). Reading a `.drawio` *into* kymo is
> a separate, not-yet-built importer; the JS `drawio2svg` dev tool and the ad-hoc
> `tools/drawio-to-svg.py` (which wraps draw.io desktop) render `.drawio` → SVG but do not
> produce the kymo IR. Unlike the D2/DOT *text* emitters (which emit the positionless IR and
> let the target lay out), draw.io needs **explicit geometry**, so this consumes the
> **positioned** `Diagram` from `layout_flowchart`.

## 1. Document envelope

`<mxfile host="kymostudio"><diagram name="Flowchart"><mxGraphModel … pageWidth/pageHeight>
<root><mxCell id="0"/><mxCell id="1" parent="0"/> … </root></mxGraphModel></diagram></mxfile>`.
The two reserved root cells (`0`, `1`) carry the layer; every element parents to `1`. Emit
order is **clusters → nodes → edges** (mxGraph z-order = document order). Output is plain
(uncompressed) XML — app.diagrams.net reads it directly.

## 2. Node shape → mxStyle

All vertices get `fillColor=#eff6ff;strokeColor=#3b82f6;`. Geometry: `Component.pos` is the
centre, `Component.size` the box → `<mxGeometry x=cx-w/2 y=cy-h/2 width=w height=h/>`.

| kymo `Shape` | mxStyle |
|---|---|
| `box` | `rounded=0;whiteSpace=wrap;html=1;` |
| `badge` (stadium) | `rounded=1;whiteSpace=wrap;html=1;arcSize=40;` |
| `circle` | `ellipse;whiteSpace=wrap;html=1;` |
| `diamond` | `rhombus;whiteSpace=wrap;html=1;` |
| `hex` | `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;` |
| `cylinder` | `shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;` |
| **other** (icon / `bpmn-*` / `aws-*`) | **fallback** `rounded=0;whiteSpace=wrap;html=1;` — a labelled rectangle; **icons are not carried** (lossy) |

## 3. Edges

`<mxCell edge="1" source=src target=dst value=label style="edgeStyle=orthogonalEdgeStyle;
rounded=0;html=1;[dashed=1;][endArrow=none;]"/>`. Edges reference node ids by `source`/
`target`; draw.io auto-routes orthogonally (no waypoints emitted). `Edge.dashed` →
`dashed=1`; `Edge.no_arrow` → `endArrow=none`.

## 4. Regions (clusters)

A `Region` → a behind-the-nodes vertex from `Region.bounds`, style
`…fillColor=#f5f9ff;strokeColor=#b8d0ee;verticalAlign=top;align=left;…`. Cell id prefixed
`c_` (avoids the reserved `0`/`1`); edge cells are `e0,e1,…`. All `value` attributes are
XML-escaped (`& < > "`).

## 5. Reach & gaps

- **Entry points:** `mermaid_to_drawio` (mmd path) and `drawio_from_kymojson(json)` (any
  `.kymo.json` model). Reached from the `kymo` CLIs: Python `--drawio` flag, JS `.drawio`
  output, Rust `kymo … flow.drawio`. Because all paths go through the one Rust encoder via
  the kymojson wire, draw.io output is **byte-identical across Python and JS**.
- **Lossy:** icons, accent colours, edge routing/waypoints (draw.io re-routes), BPMN/AWS
  glyph fidelity (→ labelled rectangle), non-cluster region styles (pool/lane).
- **Out of scope:** the reverse (`.drawio` → kymo IR); compressed/deflated mxfile payloads.

## Annex A — Revision History

| Version | Date       | Author | Changes                                    |
|---------|------------|--------|--------------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — draw.io (mxGraph) encoder. |

## Annex B — Document Control

Version-controlled at `docs/formats/drawio.md`; authoritative source is the main-branch
working tree. Update when the draw.io encoder changes a shape/edge/region mapping; increment
`version` and append to Annex A. References: draw.io (<https://drawio.com>); `DRAWIO-MAP-001`,
`KYMOJSON-MAP-001`, `FEAT-PIPECLI-DRAWIO-001`.
