# 05 — Label Placement: text that fits without overlap

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-006                                             |
| Version     | 0.1                                                            |
| Issue Date  | 2026-06-21                                                     |
| Status      | Draft                                                         |
| Category    | Often-underrated                                             |
| Related     | [Index](README.md) · prev [04 Compound & constraints](04-compound-and-constraints.md) · next [06 Stability & dynamics](06-stability-and-dynamics.md) |

## The problem

Nodes and edges carry **text**. Node labels drive node *size* (a layout computed before measuring
text is wrong); edge labels need a position along the route that doesn't collide with nodes, other
labels, or the line itself. Getting text to fit legibly is a first-class layout problem, not a
finishing touch.

## Why it's hard

- **Map labelling is NP-hard** — placing the maximum number of non-overlapping labels is a classic
  NP-hard problem; edge-label placement inherits it.
- **Circular dependency**: label size depends on font metrics; node size depends on label size;
  layout depends on node size; edge-label position depends on the route, which depends on layout.
- **Measurement fidelity**: the layout engine must measure text the *same* way the renderer draws it,
  or labels overflow. Browsers use `getBBox`; server-side renderers use a font database — mismatches
  cause clipped or overlapping text.

## State of the art

- Node-sizing-from-text is standard (Graphviz, dagre, mermaid all size nodes to their label box).
- Edge-label placement uses candidate positions along the route scored for overlap (the map-labelling
  toolbox), or simple midpoint placement with nudging.
- **Raster-safety**: whether labels survive rasterisation depends on using real `<text>` vs HTML
  `<foreignObject>` (the latter is dropped by server-side SVG→PNG).

## Where kymo stands

kymo is unusually strong here by design. It sizes nodes from measured text and the alignment passes
are **label-aware**: `BPD-DGM-001` §6.4–§6.5 require anchors and routes to account for the label box,
and §6.7.6 enforces region-to-region **label clearance** (25 px min). kymo emits raster-safe `<text>`
(and KaTeX as glyph outlines via `kymo-tex`), which is why `benches/mermaid-format` reports ~100%
label recall where mermaid's `<foreignObject>` scores 0% under server-side rasterisation. **Caveat:**
the absolute quality metric does *not* yet score label overlap directly — a candidate new term.

## References

- M. Formann, F. Wagner — *A Packing Problem with Applications to Lettering of Maps* (1991), NP-hardness of labelling.
- `BPD-DGM-001` §6.4 (anchor accounts for label area), §6.7.6 (label clearance).
- `benches/mermaid-format` raster-safe label recall metric.
