# Flowchart render style switch: kymo ⇄ mermaid

*2026-06-14. Hand-written. Feature note for the `FlowStyle` render switch added to
the flowchart pipeline; companion to `2026-06-14-pixel-overlay-diff.md`.*

## What shipped

kymo's flowchart renderer can now emit either its **native** look or a
**mermaid.js-like** look. The style is resolved with precedence
**API param > source config > kymo default**:

- Rust: `mermaid_to_svg_styled(src, Option<FlowStyle>)`; wasm
  `mermaidToSvgStyled(src, "mermaid"|"kymo")`; python `mermaid_to_svg_styled(src, style=None)`.
- Source config: a leading `---\nlook: mermaid\n---` frontmatter or a
  `%%{init: {"look": "mermaid"}}%%` directive (`look`/`theme`/`kymoStyle` naming
  `mermaid` or `kymo`). Stripping the frontmatter also fixes a latent parse crash
  on `---`.
- `mermaid_to_svg(src)` is unchanged in spirit: no API style, honours source
  config, else kymo.

The mermaid palette: lavender nodes `#ECECFF` / purple borders `#9370DB`, `#333`
edges with a **filled** triangle arrowhead, `'trebuchet ms'` font, yellow cluster
`#ffffde`/`#aaaa33`, transparent background (no dotted grid). Plus a real
structural change: `[...]` now parses to a **sharp** rectangle (`Shape::Rect`)
distinct from `(...)` rounded (`Shape::Box`); under the mermaid style `[...]`
renders with square corners, `(...)` slightly rounded. `Shape::Rect` serializes
to `"box"` in kymojson, so the cross-language contract and its goldens are
unchanged; the only golden touched is one emit `.mmd` where a `(...)` node now
round-trips as `(...)` instead of `[...]` (a fidelity fix).

## Visual proof (same source, three renders)

| kymo native | kymo **mermaid-style** | merman | mermaid.js 11.15 |
|---|---|---|---|
| ![](assets/2026-06-14-style/kymo-native.png) | ![](assets/2026-06-14-style/kymo-mermaid-style.png) | ![](assets/2026-06-14-style/merman.png) | ![](assets/2026-06-14-style/mermaidjs.png) |

The mermaid-style render matches mermaid.js's visual *language* closely: same node
fill/border, sharp rectangles, diamond/circle glyphs, yellow `Section` cluster,
`#333` filled arrows, edge-label backgrounds, no grid. What still differs is
**layout** — node positions (kymo mirrors Do-it/Skip), edge curvature (kymo routes
orthogonal Z-paths vs mermaid's splines), and cluster-label placement.

**merman** (third) is shown for contrast: as a Rust *port* of mermaid it reproduces
mermaid.js's exact layout *and* style — note Do-it/Skip on the same sides, the same
spline edges and cluster placement — which is why it overlays on mermaid.js at
~1.5% (table below) while kymo, in either style, sits at ~14% on layout alone.

## The pixel-overlay metric does NOT move — and why that's expected

Re-running the overlay bench (`pixel-diff.mjs`) on the 5-flowchart sample,
overlaying three renderers on mermaid.js: **merman** (`kymo-mermaid`, a Rust port
of mermaid), kymo **native**, and kymo **mermaid-style**:

| source | **merman** | kymo-native | kymo-**mermaid-style** |
|---|---|---|---|
| appli_001 | 0.8% | 2.5% | 2.4% |
| conf-and-directives_000 | 2.0% | 6.0% | 6.2% |
| conf-and-directives_001 | 1.6% | 5.8% | 6.1% |
| conf-and-directives_002 | 1.3% | 49.8% | 50.0% |
| conf-and-directives_003 | 1.7% | 6.5% | 6.8% |
| **mean** | **1.5%** | **14.1%** | **14.3%** |

This is the decisive evidence that the overlay metric is **layout-dominated**:

- **merman ≈ 1.5%** — near-perfect overlap. merman is a Rust *port* of mermaid, so
  it reproduces mermaid's **dagre layout, style, *and* `classDef` colours** — its
  output sits almost exactly on top of mermaid.js.
- **kymo ≈ 14%, in either style** — kymo uses its **own** Sugiyama layout, so nodes
  land at different positions. Switching to mermaid colours/shapes leaves the
  number **essentially unchanged** (a hair higher — the lavender fills add ink that,
  at kymo's *different* positions, doesn't overlap mermaid's).

`conf-and-directives_002` makes it loudest: merman **1.3%** (matches layout *and*
applies the source's `classDef` cyan/red fills → nearly identical to mermaid.js)
vs kymo **~50%** (own layout, no `classDef`). Two diagrams that look stylistically
identical but are laid out differently still don't overlap, so colour fidelity
alone can't lower the score. To move it you must match **layout** (dagre ranking +
spline edges) — the deferred v2 work, and exactly what merman already does. The
correct validation of the style switch is therefore **visual** (above), not the
overlay number.

## Status

v1 shipped: theme (colours/font/background/arrowheads/clusters), sharp-vs-rounded
rect fidelity, a light mermaid sizing bump, and the API + source-config plumbing.
92 tests pass; kymojson goldens byte-identical; one emit golden re-blessed (a
correctness fix). Deferred: dagre-like layout, spline edge routing, exact mermaid
text metrics, and a Trebuchet font for the resvg deploy path (today it falls back
to the registered sans-serif).
