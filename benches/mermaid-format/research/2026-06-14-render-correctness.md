# Render correctness vs mermaid.js — beyond label recall

*2026-06-14. Hand-written analysis. Companion to
`2026-06-14-mermaidjs-truth.md` (which measures *label recall*) — this one asks
whether the picture is **semantically correct**, not just whether the text
survives rasterisation.*

## Why a second metric

`mermaidjs-truth.md` scores **raster-safe label recall**: of the labels
mermaid.js shows, how many survive a serverless SVG→PNG. kymo's own engines hit
~100% there. But that metric only checks **text**. A diagram can keep every
label and still be **wrong**: an inheritance edge drawn as a plain line, ER
relationships with no cardinality, a state machine where you can't tell the
start from the end. Recall is blind to all of it.

So this pass renders a clean sample of each type two ways and **diffs them by
eye**:

- **kymo** — `mermaidXToSvg()` → `svgToPng()` (resvg), i.e. the real serverless
  raster path.
- **mermaid.js** — `mermaid.render()` in headless Chrome (foreignObject visible).

## What was wrong (and is now fixed — PR #429)

| Type | Labels recalled | But the render was wrong because… | Fix |
|---|---|---|---|
| **flowchart** | 100% | — correct: shapes, edge labels, connectivity all match | (none) |
| **class** | 100% | inheritance triangle, composition/aggregation diamond, **and `1`/`*` cardinality all missing** → generalisation, association and composition were indistinguishable | clip edges to box border + draw edges on top |
| **requirement** | 100% | `satisfies`/`derives` **arrowhead missing** | same fix (shares class renderer) |
| **er** | 100% | **no crow's-foot** — every relationship looked the same regardless of `\|\|--o{` | new `Crow` enum + glyph renderer |
| **state** | 88.9% | `[*]` **initial and final both drawn as identical plain circles** | `StateStart` (filled dot) + `StateEnd` (bullseye) |
| **mindmap** | 100% | all nodes present but flowchart-TD layout, not radial → readability low | open (layout) |

## Root cause — class/requirement (the subtle one)

The markers and cardinality text were **in the SVG the whole time**. Both resvg
*and* Chrome failed to show them, which ruled out "resvg drops markers" (a
minimal marker test rasterised fine). Two compounding bugs:

1. **Centre-to-centre edges.** Edge endpoints used `Component::pos` (the box
   *centre*), so `marker-end` landed deep inside the target box — not at its
   border.
2. **Paint order.** Edges were emitted *before* the boxes, so the opaque white
   box painted straight over the buried marker and any cardinality label near
   the border.

Fix: `border_point()` clips each end to the box rectangle (marker now sits on
the edge, like mermaid), render order becomes boxes → notes → **edges last**,
and multiplicity labels are placed just outside the border. All glyphs are real
`<line>`/`<circle>`/`<polygon>` — still 100% raster-safe.

## ER crow's-foot

er relationships were parsed to `RelKind::Link` and the cardinality token
thrown away. Now the connector (`||--o{`, `}|..|{`, …) is split into a left and
right end and each classified into `Crow::{One, ZeroOne, OneMany, ZeroMany}`,
drawn at the entity border as bar / circle / crow's-foot. Verified against
mermaid.js: `CUSTOMER ||--o{ ORDER` renders two bars at CUSTOMER and a
circle+foot at ORDER, matching exactly.

## Verification

- 92 unit/integration tests pass; `cargo fmt` + `clippy -D warnings` clean.
- Re-rendered samples confirm every glyph appears: class ▽◇ + `1`/`*`,
  requirement arrow, er `||`/`o{`/`|{`, state filled-dot vs bullseye.

## The 12 already-raster-safe types — verified correct, no engine needed

The recall table lists ~14 types at 100/100 in every tool (c4, gantt, info,
journey, packet, pie, quadrant, radar, sankey, timeline, treemap, xychart).
These have **no kymo own-engine** — they fall through `SELF_RENDERERS.mermaid`
to merman (`mermaidRenderSvg`). The natural worry after the class/er/state
findings: are they *correct*, or just raster-safe? Ran the same visual pass —
merman SVG → resvg PNG (the real deploy path) vs mermaid.js.

| type | merman render (kymo's deploy path) | `<foreignObject>` | verdict |
|---|---|---|---|
| pie / xychart / sankey | slices / line+axes / flow band — all labelled | 0 | ✓ |
| quadrant | title, both axes, 4 quadrant labels, points placed correctly | 0 | ✓ |
| c4 | boxes + person icon + «stereotype» + arrows + rel labels | 0 | ✓ |
| packet / treemap | bit-field ranges / value-sized nested boxes | 0 | ✓ |
| radar | multi-axis, filled curves, legend, grid | 0 | ✓ |
| gantt / timeline | task bars + sections + date axis / era cards | 0 | ✓ |
| journey / info | **matches mermaid.js** (the dataset sample is degenerate → title only) | 0 | ✓ |

Every label is native `<text>` (**0 foreignObject** in all of them), so they
survive resvg/svg2pdf. merman is a direct mermaid.js port, so for these
chart-style grammars it reproduces both the structure *and* the raster-safety.

**Nothing to build.** This is the opposite of the box types: there, merman
emitted `<foreignObject>` and kymo *had* to write a text engine; here merman is
already text-based and faithful. Re-implementing these in kymo would be pure
waste — confirmed now on the **correctness** axis, not just recall. The two
"empty-looking" cases (a minimal quadrant, a title-only journey) render
identically in mermaid.js — the sample, not the renderer, is sparse.

## Open (layout only — not a semantic error)

- **state**: two opposite transitions between the same pair (`Idle --> Active`,
  `Active --> Idle`) overlap on one straight line, so one edge label is hidden.
  mermaid curves them apart.
- **mindmap**: reuses the flowchart TD layout rather than a radial one. Every
  node and link is present and correct; it just reads less cleanly.

## Takeaway

Label recall and **glyph correctness are independent axes**. kymo was already
the only serverless-raster-safe renderer for these types (recall ~100%); it is
now also **semantically faithful** for class, requirement, er and state — the
relationship notation that carries the diagram's meaning is drawn, and still
survives rasterisation. Track both metrics: a future engine can pass recall and
still be drawing the wrong picture.
