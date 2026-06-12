---
layout: page
title: Radar
---

<DiagramQuickstart set="radar">

# Radar Chart

A radar (spider) chart compares one or more entities across several axes at
once — skill matrices, product scorecards, grades. kymo's editor reads the
[Mermaid](https://mermaid.js.org/syntax/radar.html) `radar-beta` syntax.

This page works like a quickstart: as you scroll, the pane on the right shows
the source and the preview for the section you're reading. **Copy** grabs the
source; **▶ Open in editor** loads it into
[editor.kymo.studio](https://editor.kymo.studio) (pick **mermaid** in the
diagram-type dropdown when starting from scratch).

<DqSection id="radar-intro">

`axis` lines declare the spokes (`alias["label"]`, comma-separated, across
as many lines as you like); each `curve alias["label"]{v1, v2, …}` plots an
entity, with values in axis order. `max` and `min` pin the scale ends —
without them the scale fits the data.

The `-beta` suffix on the header is required — the syntax is still
stabilising upstream.

</DqSection>

> **Status.** Radar previews on this page and in the editor use the Mermaid
> renderer; importing radar charts into kymo's own pipeline (native
> SVG/PNG/PDF rendering) is on the roadmap.

## See also

- [Quadrant Chart](./quadrant) — for two dimensions instead of many.
- [XY Chart](./xychart) — for series over an axis.

</DiagramQuickstart>
