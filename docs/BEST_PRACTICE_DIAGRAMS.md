---
title: Architecture Diagram — Best Practices
document_id: BPD-DGM-001
version: "1.7"
issue_date: 2026-05-18
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers producing architecture diagrams for docs and slides
review_cycle: On major rendering-stack change, or annually (whichever first)
supersedes: null
related_documents:
  - README.md
authors:
  - Vũ Anh
language: en
keywords:
  - architecture-diagram
  - svg
  - layout-algorithm
  - edge-routing
  - iconography
  - nvidia-nim
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 26515:2018
  - ISO 8601:2019
# Revision history is maintained in Annex A (per ISO/IEC/IEEE 15289:2019
# clause 5.10 — change information SHALL be a numbered annex, not metadata).
---

# Architecture Diagram — Best Practices

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPD-DGM-001                                                    |
| Version           | 1.7                                                            |
| Issue Date        | 2026-05-18                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers producing architecture diagrams for docs and slides  |
| Review Cycle      | On major rendering-stack change, or annually (whichever first) |
| Supersedes        | —                                                              |
| Related Documents | [`README.md`](./README.md) (run/build instructions)            |

Structured per ISO/IEC/IEEE 15289:2019 (information item content) and
ISO/IEC/IEEE 26515:2018 (agile documentation): metadata header, numbered
clauses (Scope / Normative References / Terms / Abbreviations / body /
Annexes), revision history.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Abbreviations](#4-abbreviations)
5. [Tool Selection](#5-tool-selection)
6. [Layout Principles](#6-layout-principles)
   - [6.0 Local Alignment (Parent/Child + Auto-bounded Regions + Auto-layout)](#60-local-alignment-parent--child--auto-bounded-regions)
   - [6.6 Grid System and Snap](#66-grid-system-and-snap)
   - [6.7 Visual Hierarchy and Reading Flow](#67-visual-hierarchy-and-reading-flow)
7. [Edge Routing](#7-edge-routing)
8. [Iconography](#8-iconography)
9. [Background and Ambience](#9-background-and-ambience)
10. [Anti-Patterns](#10-anti-patterns)
11. [Iteration Process](#11-iteration-process)
12. [References](#12-references)
13. [Annex A — Revision History](#annex-a--revision-history)
14. [Annex B — Document Control](#annex-b--document-control)

---

## 1. Scope

### 1.1 Purpose

This document captures the engineering decisions, layout algorithms,
rendering strategies, and known anti-patterns identified while producing
the container architecture diagram for Tutorial 01 (NIM inference endpoint).
It is intended as a reusable reference for future architecture diagrams
within the project.

### 1.2 Applicability

Applies to:

- Architecture diagrams embedded in tutorial/documentation pages.
- Diagrams generated as part of a build pipeline (Python `uv` project, SVG output).
- Diagrams styled for light backgrounds with NVIDIA brand accents
  (green `#76b900`, orange `#ea580c`).

Does **not** apply to:

- One-off whiteboard sketches or freehand drawings.
- Diagrams produced by external tooling outside the diagram codebase
  (Lucid, Miro, draw.io exports, etc.).

### 1.3 Reference Implementation

The patterns described herein are enforced by the project in this
directory:

```
diagrams/
├── src/
│   ├── model.py       Component, Region, Edge dataclasses
│   ├── icons.py       SVG icon library
│   ├── layout.py      Auto-layout + edge routing
│   ├── to_svg.py      Diagram → SVG renderer
│   └── cli.py         Entry point — `uv run src/cli.py`
├── samples/
│   ├── data.py                       Diagram instance + LAYOUT spec + edges
│   ├── aiq.kymo                   DSL form
│   └── *.svg / *.webp / *.png        Rendered outputs + reference images
├── docs/                             Spec docs (this file, DSL.md)
└── out/container-diagram.svg         Transient build artefact (~12 KB, 1080 × 658)
```

---

## 2. Normative References

The following documents informed the structural conventions of this
specification:

- ISO/IEC/IEEE 15289:2019, *Systems and software engineering — Content
  of life-cycle information items.*
- ISO/IEC/IEEE 26515:2018, *Developing user documentation in an agile
  environment.*
- ISO 8601:2019, *Date and time — Representations for information
  interchange.*

The following non-normative sources informed the technical content:

- SVG 1.1 Specification (W3C, 2nd Edition).
- NVIDIA AIQ Architecture Diagram (reference style, internal sample).
- Stripe Docs and Linear Blog (industry references for clean technical
  illustration).

---

## 3. Terms and Definitions

| 3.1 Term         | Definition                                                                                 |
|------------------|--------------------------------------------------------------------------------------------|
| **Component**    | An icon-and-label unit in the diagram (e.g., Jupyter Notebook, NIM Microservice).          |
| **Region**       | A dashed-boundary grouping of components (e.g., `code-server`, `NVIDIA Brev`).             |
| **Edge**         | An arrow between two Components.                                                           |
| **Anchor**       | An attachment point on a Component (`top` / `right` / `bottom` / `left`) for an Edge.      |
| **Route**        | The path strategy used by an Edge: `auto` / `over` / `under` / `curve` / `via=[…]`.        |
| **Cell**         | The bounding rectangle of a Component including icon + label area.                         |
| **Across-segment** | The horizontal middle segment of a 3-segment U-route (`over` / `under`).                 |
| **Glyph**        | The inner shape drawn on a Component's icon (e.g., neural-net lines inside the NIM cube).  |

---

## 4. Abbreviations

| 4.1 Acronym | Expansion                                                |
|-------------|----------------------------------------------------------|
| AIQ         | Agent Intelligence Quotient (NVIDIA reference diagram)   |
| C4          | Context-Container-Component-Code (Brown's diagram model) |
| dp          | display points / device pixels                           |
| HTTP / HTTPS| HyperText Transfer Protocol (Secure)                     |
| LH          | Label Height (asymmetric label extent below an icon)     |
| NIM         | NVIDIA Inference Microservice                            |
| SVG         | Scalable Vector Graphics                                 |
| TOC         | Table of Contents                                        |

---

## 5. Tool Selection

### 5.1 Decision Tree

```
Need a diagram?
├─ One-off, ≤ 6 nodes, no styling needs        → Mermaid in Markdown
├─ Embedded in a website, styling matters,     → hand-roll SVG
│  layout matters                                (inline in HTML)
└─ Iterative, will be regenerated,             → uv project
   version-controlled                            (Python dataclasses → renderer → SVG)
```

### 5.2 Mermaid C4 — Known Limitations

Attempted first; replaced after the following defects were confirmed:

| 5.2.x | Defect                                                                                        |
|-------|-----------------------------------------------------------------------------------------------|
| 5.2.1 | C4 plugin uses a hardcoded palette; `themeVariables` are partially ignored.                   |
| 5.2.2 | Technology tags (e.g., `[HTTPS]`) float to canvas top when `UpdateRelStyle` uses non-trivial offsets. |
| 5.2.3 | `<br/>` in node descriptions breaks the width-wrap calculation; text overflows the bounding box. |
| 5.2.4 | Label position is anchored to edge midpoints with no API for "across-segment of U-route".     |
| 5.2.5 | Console floods with `<tspan> dy: NaN` warnings (cosmetic; renders).                           |
| 5.2.6 | Per-element overrides via `UpdateElementStyle(...)` become verbose and order-dependent.       |

**Verdict.** Mermaid C4 is acceptable for low-fidelity sketches in
internal READMEs. Public-facing or iterated diagrams should use the
hand-rolled or programmatic path.

### 5.3 Hand-rolled Inline SVG

Acceptable for the first revision. Becomes unmaintainable past 2 iterations
because all coordinates are absolute literals; adding a Component requires
re-tracing every Edge.

### 5.4 Programmatic Generation (Recommended)

A `uv` project with the following module separation:

| 5.4.x | Module               | Responsibility                                       |
|-------|----------------------|------------------------------------------------------|
| 5.4.1 | `src/model.py`       | Dataclasses; no rendering.                           |
| 5.4.2 | `src/icons.py`       | SVG icon library; no layout knowledge.               |
| 5.4.3 | `samples/data.py`    | The diagram instance + LAYOUT spec + edges.          |
| 5.4.4 | `src/layout.py`      | Position computation; edge route waypoints.          |
| 5.4.5 | `src/to_svg.py`      | Diagram → SVG string; no positioning logic.          |
| 5.4.6 | `src/cli.py`         | Entry script. `uv run src/cli.py`. ~30 ms/cycle.     |

To relocate a Component: edit `LAYOUT` in `samples/data.py` and regenerate.
To add a connection: append an `Edge` to the `EDGES` list and regenerate.

### 5.5 Diagram DSL (D2-style)

A textual surface for the same `Diagram` dataclasses §5.4 produces.
Defined in `dsl.py`; parses `.kymo` files into `Diagram` objects.
Use this when authoring or reviewing a diagram by hand — the brace
syntax + arrows read as a flat declaration without Python boilerplate.

**Equivalence.** The parser is **lossless** with respect to the dataclass
form: every field on `Component`, `Region`, and `Edge` can be expressed
in DSL, and the round-trip produces byte-identical SVG.

#### 5.5.1 Grammar (synopsis — full spec in [`DSL.md`](./DSL.md) clause 6)

The DSL has **no `component`, `region`, or `layout` keywords**. Each
line's shape determines its kind:

| Line shape                                | Production         |
|-------------------------------------------|--------------------|
| `}` alone                                 | container close    |
| `row id1 id2 …` (region body only)        | grid row           |
| `… {` (ends with `{`)                     | container open     |
| `id arrow id …`                           | edge (file scope)  |
| second token contains `/`                 | leaf component     |
| whitespace-separated ids (body only)      | bare-id reference  |

```
file        := file_line*
file_line   := directive | container | leaf | edge | comment | blank
directive   := canvas | title | subtitle | external

leaf        := id  shape "/" icon "/" accent
                  '"' name '"'  '"' subtitle '"'
                  ( "@" placement )?
placement   := "(" INT "," INT ")"                              ; absolute pos
            |  id  side  INT?                                   ; parent/child align
side        := "top" | "right" | "bottom" | "left"

container   := region_open body "}"  |  layout_open body "}"
region_open := id ("outer"|"inner") '"' label '"' region_opt* "{"
layout_open := id ("horizontal"|"vertical")
                  "pos" "(" INT "," INT ")" "gap" INT
                  ( "align" ("start"|"center"|"end") )? "{"
region_opt  := "padding"        "(" INT "," INT ")"   ; symmetric (h, v) inner padding
            |  "padding-bottom" INT                   ; override bottom only
            |  "dash"           "(" INT "," INT ")"   ; stroke-dasharray override; (0,0) = solid
            |  "stroke"         HEXCOLOUR             ; stroke colour override
            |  "label-position" ("above"|"inside")
            |  "label-anchor"   ("start"|"middle"|"end")
            |  "icon"           identifier_with_hyphens

body        := region_body | layout_body
region_body := ( container | leaf | bare_ids | row | comment | blank )*
layout_body := ( bare_ids | comment | blank )*
bare_ids    := id+
row         := "row" id*

edge        := id  arrow  id  ( ":" '"' label '"' )?  ( "{" opts "}" )?
arrow       := "-->"          ; gray (default)
            |  "==>"          ; orange (external/highlight)

opts        := opt ( "," opt )*
opt         :=  "src"="anchor"
            |   "dst"="anchor"
            |   "via"="(" INT "," INT ")" ( ";" "(" INT "," INT ")" )*
            |   "label_offset"="(" INT "," INT ")"
            |   "label_pos"="(" INT "," INT ")"
            |   "label_at"=("src"|"dst"|"mid")
            |   "route"=("auto"|"over"|"under"|"curve")
            |   "small"  |  "dashed"                              ; flags
            |   "curve" | "over" | "under"                        ; route shorthand
anchor      := ("top"|"right"|"bottom"|"left"|"center") ( "(" INT "," INT ")" )?
                  ; optional (dx, dy) offset
```

Region containers nest. When an inner region is nested inside an outer
region, the inner region's leaf ids flatten into the outer region's
`contains` so its auto-bounds envelop the nested leaves (DSL.md §7.3.1).
Layout containers do NOT propagate — they're positioning rules, not
ownership.

Comments: `#` to end-of-line (outside double-quoted strings). A `#`
immediately followed by a hex digit is treated as a colour literal, not
a comment — so `stroke #94a3b8` works inline. Whitespace within lines is
insignificant; line breaks separate statements. Blocks (`{ … }`) MUST
span multiple lines.

##### 5.5.1.1 Region Border Defaults and Overrides

The `outer` / `inner` style enum picks defaults; the `dash` / `stroke`
options override individual rects without inventing new enum values.

| Source                               | `stroke-dasharray` | `stroke`     |
|--------------------------------------|--------------------|--------------|
| `outer` default (CSS class)          | `6 5`              | `#cbd5e1`    |
| `inner` default (CSS class)          | `4 4`              | `#94a3b8`    |
| Override:  `dash (0, 0)`             | `none` (solid)     | (unchanged)  |
| Override:  `dash (X, Y)`             | `X Y`              | (unchanged)  |
| Override:  `stroke #76b900`          | (unchanged)        | `#76b900`    |

Examples:

```text
# Default inner — dashed slate-400, 4 4
svfs inner "Shared Virtual File System" {
  fs   box/folder/orange    "FS"   ""
  todo box/checklist/orange "Todo" ""
}

# Solid green border on an inner region (highlight)
critical inner "Critical Path" dash (0, 0) stroke #76b900 { alpha beta gamma }

# Custom looser dash with brand orange
staging outer "Staging Env" dash (8, 4) stroke #ea580c { ... }
```

The override is emitted as an inline `style="…"` attribute on the
`<rect>`, which beats the CSS class. To revert, remove the option.

##### 5.5.1.2 Asymmetric Padding (`padding-bottom`)

The region label is rendered ABOVE the rect (at `y = rect.y - 10`),
which adds roughly 25 px of visual weight to the top edge that the
bottom does not have. With symmetric `padding (h, v)`, regions feel
visually top-heavy — top reads as more spacious than bottom.

To balance, set `padding-bottom` larger than the vertical padding. A
practical rule:

  > `padding-bottom = padding[1] + 8–12`

…matching the extra visual weight of the label. Example:

```text
rag outer "RAG Knowledge Layer" padding (24, 24) padding-bottom 32 dash (0, 0) {
  extract embed vecdb rerank gen
}
```

Internally only `padding[1]` (the vertical padding) governs the TOP
extent; `padding-bottom` (when set) replaces it for the BOTTOM extent
only. When unset, bottom falls back to `padding[1]` (symmetric).

#### 5.5.2 Example (full diagram, condensed)

```text
title:    "Hello"
subtitle: "Quick tour of the syntax"

# Region with leaves defined inline AND a nested inner region.
adr outer "Autonomous Deep Researcher" padding (40, 32) {
  orch       hex/hex-agent/green   "Orchestrator" ""
  researcher hex/hex-agent/green   "Researcher"   "Sub-Agents" @ orch right 60
  planner    hex/hex-agent/green   "Planning"     "Sub-Agents" @ orch bottom 76

  svfs inner "Shared Virtual File System" {
    fs   box/folder/orange    "File System" "Workspace" @ researcher right 100
    todo box/checklist/orange "ToDo List"   ""          @ fs right 50
  }
}

# Layout — positioning rule, references leaves by bare id.
routing_chain horizontal pos (32, 162) gap 60 {
  user chat router shallow escalate hitl orch
}

# Free-floating leaves (not owned by any region).
user    circle/user/blue   "Agent / User"   "Bootcamp participant"
chat    box/zap/orange     "Chat"           ""
router  hex/hex-agent/green "Intent Router" ""
entdata box/files/orange   "Enterprise Data" "" @ (70, 700)

user --> chat : "Query"   { src=right(0,-10), dst=left(0,-10), label_offset=(0,-8), small }
chat --> router
orch --> planner          { src=bottom, dst=top }
researcher --> user : "Deep Research Report"  { src=top, dst=top, via=(990,45);(70,45), label_pos=(530,38), small }
```

#### 5.5.3 Wiring into the build

`.kymo` files are loaded directly by `src/cli.py`:

```bash
uv run src/cli.py samples/aiq.kymo           # → samples/aiq.svg
uv run src/cli.py samples/aiq.kymo --animate # → samples/aiq-animated.svg
```

`cli.py` calls `parse_dsl(...)` → `layout(...)` → `resolve_alignments(...)` → `render(...)`.

#### 5.5.4 When NOT to use the DSL

| Scenario                                            | Prefer                                              |
|-----------------------------------------------------|-----------------------------------------------------|
| Diagram with computed positions (e.g., grid layout) | Python (`samples/data.py` with `LAYOUT` dict)       |
| One-off diagrams shared inline in a Python notebook | Python literals                                     |
| Tool-generated diagrams (CI scripts, autodoc)       | Python — easier to programmatically construct       |
| Hand-authored, hand-reviewed architecture diagrams  | **DSL** — flat, readable, diff-friendly             |
| Diagrams non-engineers will edit                    | **DSL** — no Python knowledge required              |

---

## 6. Layout Principles

### 6.0 Local Alignment (Parent / Child + Auto-bounded Regions)

#### 6.0.1 Parent / Child Component Alignment

Components may declare a `parent` reference + `align` side instead of an
absolute `pos`. The renderer resolves these relationships before
rendering, so moving a parent moves every descendant by the same delta.

**Rationale.** Hand-positioning dozens of components yields fragile
coordinates — adjusting one cell requires retracing every neighbour.
Parent/child alignment expresses *intent* ("Planning sits below
Orchestrator") rather than *position*, so structural edits stay local.

**Fields on `Component` (model.py):**

| Field           | Type               | Meaning                                             |
|-----------------|--------------------|-----------------------------------------------------|
| `parent`        | `str \| None`      | id of the parent component                          |
| `align`         | `top/right/bottom/left` | which side of parent this child sits against        |
| `align_gap`     | `int` (default 24) | pixel gap between parent's outer edge and child's outer edge |
| `align_offset`  | `tuple[int, int]`  | optional fine-tune (dx, dy) on top of computed pos  |

**Edge-to-edge gap (not centre-to-centre).** `align_gap=50` with
`align="right"` means 50 px between parent's right border and child's
left border, regardless of either component's width. This is intuitive
("padding") and stable under shape changes.

**Label-aware `bottom` alignment.** `align="bottom"` accounts for the
parent's `LABEL_HEIGHT` — child is placed below the *label area*, not
below the icon, so child icons never collide with parent's subtitle text.

**Resolution.** `alignment.resolve_alignments(diagram)` walks the
components depth-first. Each child is positioned only after its parent.
Cycles raise `ValueError`. Called once per build, after auto-layout (or
after manual placement of anchors) and before render.

**Pattern: chain-of-siblings.**

```python
# All children of the orchestrator at the same horizontal level
Component("orch",       pos=(860, 200))                              # anchor
Component("router",     parent="orch", align="right", align_gap=50)
Component("shallow",    parent="router", align="right", align_gap=50) # chain
Component("escalate",   parent="shallow", align="right", align_gap=50)
```

Moving `orch` by `+30` moves the entire chain `+30`. Inserting a new
component between two siblings requires only re-pointing one `parent`
reference.

**When to use absolute pos vs. alignment.**

| Use absolute `pos`           | Use `parent` + `align`              |
|------------------------------|-------------------------------------|
| The component is an anchor for a cluster | The component is part of a cluster led by another |
| Position is dictated by canvas geometry  | Position is dictated by relationship to another component |
| Independent regions          | Members of a region or chain        |

For AIQ (18 components), 5 absolute anchors + 13 children gives a layout
that is fully editable by adjusting ~5 numbers.

#### 6.0.2 Auto-bounded Regions (`contains`)

A `Region` may declare `contains: list[str]` (component ids) instead of
explicit `bounds`. The renderer computes the bounding box automatically
as the envelope of every listed component INCLUDING its label area.

**Fields on `Region` (model.py):**

| Field      | Type                          | Meaning                                  |
|------------|-------------------------------|------------------------------------------|
| `bounds`   | `(x, y, w, h)` tuple          | Explicit bounds (used if `contains` is empty) |
| `contains` | `list[str]`                   | Component ids to wrap                    |
| `padding`  | `(int, int)` (default 24, 24) | (horizontal, vertical) breathing room    |

**Compliant:**

```python
Region("adr", "Autonomous Deep Researcher",
       contains=["orch", "researcher", "planner"])
```

The bounds adapt as `orch`/`researcher`/`planner` move (e.g., when their
parent anchor is shifted, or when a new sibling is added). No hand-tuning.

**Why label area matters:** A naive bounding-box of icon centres + half-widths
will cut through subtitle text below the bottom-most icon. The resolver
adds `LABEL_HEIGHT[shape]` to the bottom extent, so the region's bottom
border always sits below the bottom-most subtitle.

**When to use explicit `bounds` vs. `contains`.**

| Use explicit `bounds`                     | Use `contains`                          |
|-------------------------------------------|-----------------------------------------|
| Region groups visually but has no components inside (rare) | Standard case — region groups N components |
| Bounds must be precisely placed by the designer | Bounds should hug the contents as they move |
| The region exists for layout-spacing reasons | The region exists for semantic grouping |

#### 6.0.3 Auto-layout Regions (Figma-style)

A region may declare a `layout` direction + `pos` anchor; the resolver
then positions every component listed in `contains` along that axis.
Equivalent to Figma's *auto-layout frame*: declare intent (direction +
gap + alignment), not coordinates.

**Fields on `Region` (model.py):**

| Field     | Type                              | Meaning                                                        |
|-----------|-----------------------------------|----------------------------------------------------------------|
| `layout`  | `"horizontal" \| "vertical" \| None` | Stacking direction; `None` disables auto-layout              |
| `pos`     | `(x, y) \| None`                  | Top-left anchor of the layout group (required when `layout` is set) |
| `gap`     | `int` (default 24)                | Pixel gap between adjacent children                            |
| `align`   | `"start" \| "center" \| "end"`    | Cross-axis alignment of children (default `center`)            |
| `visible` | `bool` (default `True`)           | When `False`, suppresses border + label rendering              |

**Cross-axis behaviour.** For `layout="horizontal"`, the resolver finds
the tallest child's `half_h` and positions every child so its centre Y
sits on that line (`align="center"`). `align="start"` top-aligns, `end`
bottom-aligns. Vertical layout uses the widest child analogously.

**Compliant: invisible layout group.** Use a `visible=False` region as a
pure positioning primitive — no border drawn, but children are stacked
automatically.

```python
Region("rag_layout", label="",
       pos=(250, 620), layout="horizontal", gap=50,
       padding=(0, 0), visible=False,
       contains=["extract", "embed", "vecdb", "rerank", "gen"])
```

Five RAG components positioned with **one** declaration. To shift the
entire row 30 px right, change `pos` to `(280, 620)`.

**Compliant: visible region with auto-layout** (region border + label
drawn around an auto-stacked row).

```python
Region("pipeline", "Inference Pipeline",
       pos=(60, 400), layout="horizontal", gap=40,
       padding=(20, 24),
       contains=["ingest", "model", "postproc"])
```

**When to use which mode (Table A):**

| Mode                              | Use when                                                      |
|-----------------------------------|---------------------------------------------------------------|
| Auto-layout (`layout=...`)        | Linear chain of N components with uniform spacing             |
| Parent/child (`parent`+`align`)   | Branching tree (one parent, children on different sides)      |
| Absolute `pos`                    | Canvas-edge anchors, irregular hand-tuned positions           |
| Explicit `bounds`                 | Region with no contained components                           |
| Auto-bounded (`contains` only)    | Semantic grouping of pre-positioned components                |

**Combinability.** A component placed by an auto-layout region can be
referenced as `parent` by another component (the auto-layout resolver
runs first, so the parent's position is final by the time the child is
resolved). Example: in `aiq.py`, `orch` is positioned by `routing_chain`
auto-layout, and `researcher` then uses `parent="orch", align="right"`.

**Resolution order (alignment.resolve_alignments):**

1. **`_resolve_auto_layouts`** — every region with `layout` set positions
   its `contains` children along the axis.
2. **`_resolve_component_alignments`** — depth-first walk of components
   with `parent`/`align`; positions computed from parent's final pos.
3. **`_resolve_region_bounds`** — every region with `contains` (but no
   `layout`) has its bounding box computed to envelope its children.

This ordering means auto-layout outputs feed into both parent/child
alignment and auto-bounded region computation; cycles between the three
modes are not possible.

**Non-compliant: layout without anchor.**

```python
Region("chain", layout="horizontal", contains=[...])   # ✗ ValueError
```

`layout` requires `pos`. Without an anchor, the resolver has no origin
for the stack.

### 6.1 Whitespace Minimisation Without Crowding

The shipped layout in `layout.py` uses the following spacing constants
(Table 1). These have been empirically tuned and reduce the canvas from
1228 × 728 to 1062 × 658 (−13 % area).

**Table 1 — Layout spacing constants**

| Parameter            | Value | Rationale                                             |
|----------------------|-------|-------------------------------------------------------|
| `region_gap`         | 36    | Regions distinguishable without appearing isolated.   |
| `row_gap`            | 28    | Clear separation between rows.                        |
| `cell_gap`           | 18    | Side-by-side cells touch but do not merge.            |
| `region_padding_x`   | 18    | Cells hug the region border but are not crammed.      |
| `region_padding_y`   | 22    | Region label fits above the cells.                    |
| `canvas_margin`      | 18    | The diagram does not touch the SVG edge.              |
| cell `h_pad`         | 8     | Cells fit the longest label with minimal slack.       |
| cell `v_pad`         | 10    | Subtitle has room for descenders.                     |

Going tighter than the above causes label collisions.

### 6.2 Per-Row Height Alignment Across Regions

For same-row cross-region Edges to render as straight horizontals,
row heights are computed as the maximum across **all** regions:

```python
row_heights[i] = max(component.h for component in row i, across all regions)
```

This ensures Row 0 of every Region sits at the same Y-coordinate.

### 6.3 Per-Region Width Follows Content

Each Region's width is `max(row width within that region)`. Regions are
**not** forced to a common width. Naturally wider Regions (e.g.,
code-server with a 2-cell row) remain wider than single-column Regions.

### 6.4 Anchor Computation Must Account for Label Area

Labels are rendered **below** the icon. A `bottom` anchor that returns
`(cx, cy + icon_half)` places the edge endpoint **inside** the label text.

**Non-compliant:**

```python
def anchor(side):
    if side == "bottom": return (cx, cy + icon_half)
```

**Compliant:**

```python
LABEL_HEIGHT = {"cube": 42, "cube-big": 48, "box": 38, ...}

def anchor(side):
    if side == "bottom":
        return (cx, cy + icon_half + LABEL_HEIGHT[shape])
```

This correction was the single highest-impact visual fix during
iteration: edge labels (e.g., "Mount weights") ceased to overlap
component subtitles (e.g., "NIM Microservice").

### 6.5 Asymmetric Label Extent in Route Computation

Symmetric half-heights (`row_heights[i] / 2`) miscalculate the true
content footprint. Use actual extents:

```
icon_top      = row_y − icon_half
icon_bottom   = row_y + icon_half
label_bottom  = row_y + icon_half + LABEL_HEIGHT[shape]
```

For `over` and `under` routes, compute the across-segment Y from real
extents:

```python
row_bottom = max(c.pos[1] + c.half[1] + LABEL_HEIGHT[c.shape] for c in row_cells)
next_top   = min(c.pos[1] − c.half[1]                          for c in next_cells)
across_y   = (row_bottom + next_top) // 2
```

### 6.6 Grid System and Snap

#### 6.6.1 Base Unit

All component centres, region edges, and waypoints SHOULD snap to an
**8-pixel grid** (coarse anchors snap to 16 or 24). The dot-grid background
(§9.1) is drawn at 24 px — a 3 × multiple — so visually-aligned components
also land on visible reference dots.

**Why 8.** It is the lowest common multiple of typical icon sizes (64, 72,
80), label heights (40, 48), and accent spacing constants (16, 24, 32, 48).
Snapping to 8 keeps every relationship in the diagram expressible as a
small integer.

#### 6.6.2 Snap Rule

For any component placed by absolute `pos=(x, y)`:

```python
assert x % 8 == 0 and y % 8 == 0, f"{c.id} not on 8-px grid: {c.pos}"
```

For components placed by `parent`+`align`, the snap is inherited from the
anchor parent — so a single misaligned anchor breaks the whole chain.

#### 6.6.3 Audit of Existing Constants (Table 1)

The constants in §6.1 predate this clause and were tuned empirically.
Status against the 8-grid:

| Constant            | Value | On 8-grid? | Note                                |
|---------------------|-------|------------|-------------------------------------|
| `region_gap`        | 36    | ✗          | Round to 40 in new diagrams.        |
| `row_gap`           | 28    | ✗          | Round to 32.                        |
| `cell_gap`          | 18    | ✗          | Round to 16 or 24.                  |
| `region_padding_x`  | 18    | ✗          | Round to 24.                        |
| `region_padding_y`  | 22    | ✗          | Round to 24.                        |
| `canvas_margin`     | 18    | ✗          | Round to 24.                        |
| cell `h_pad`        | 8     | ✓          |                                     |
| cell `v_pad`        | 10    | ✗          | Round to 8 or 16.                   |

**Migration policy.** Do NOT retroactively re-tune `container` or `aiq` —
their layouts are already approved. New diagrams (e.g., `aws`) MUST use
8-grid-aligned constants from the outset.

#### 6.6.4 Canvas Dimensions

Canvas `width` and `height` MUST be multiples of 8 (preferably 16). Common
sizes: 1024×640, 1280×720, 1280×800, 1440×900. These align with display
aspect ratios and make embedded thumbnails crisp at 50% / 25% scale.

### 6.7 Visual Hierarchy and Reading Flow

#### 6.7.1 Reading Direction

Every diagram has ONE primary reading axis:

| Axis      | Use For                                        | Example         |
|-----------|------------------------------------------------|-----------------|
| Left → right  | Data / control flow over time              | request → handler → store |
| Top → bottom  | Layered architecture                       | UI / API / data |

Diagrams MUST NOT zigzag (L → R then R → L on the next row). A zigzag
forces the eye to backtrack, which a reader interprets as "I missed
something." If a diagram has multiple flows, separate them spatially into
distinct rails (each rail itself reads in one direction).

#### 6.7.2 Visual Weight = Importance

The HERO of a diagram — the orchestrator, the API surface, the thing the
diagram is "about" — MUST be visually heavier than its neighbours. Three
mechanisms:

1. **Size.** Hero shape is 20–30 % larger than peers (e.g., `cube-big`
   vs `cube`, or `aws-tile-hero` vs `aws-tile`).
2. **Halo / glow.** A faint coloured circle behind the icon (already used
   for the NIM Microservice; see `icons._halo`).
3. **Position.** Hero sits at the visual centre of mass — typically the
   row that the most edges converge on.

Anti-pattern: every component the same size with the same shadow. The
reader cannot tell where to start.

#### 6.7.3 Numbered Step Badges

When a diagram describes a SEQUENCE (e.g., "user request flows through 1
→ 2 → 3"), annotate the relevant edges or components with circled
numerals: ①, ②, ③. Implement as small `shape="badge"` components
positioned on or beside the edge.

Use sparingly — never more than ~5 badges, and only when the sequence is
non-obvious from arrows alone. Excessive numbering competes with the
arrows themselves.

#### 6.7.4 Grouping: Container vs Region

Two distinct grouping primitives, used for different semantics:

| Primitive             | Style                          | Means                                       |
|-----------------------|--------------------------------|---------------------------------------------|
| **Region** (`style="outer"`)  | Gray dashed, rounded corner    | Administrative boundary (account, VPC, cluster) |
| **Container** (`style="inner"`) | Coloured solid, rounded corner | Logical subgroup (subnet, namespace, app)   |

Containers MAY nest inside Regions (e.g., `your-company.com` container
inside the `us-east-1` Region). The reverse — Region inside Container —
is forbidden, because administrative boundaries always dominate logical
ones.

**Top-left badge (`Region.icon`).** A Region SHOULD declare an `icon` key
identifying the administrative domain it represents. The renderer draws
the icon at the top-left of the rect with the region label inline beside
it (a single visual unit):

| Domain                       | Icon       | Example region label   |
|------------------------------|------------|------------------------|
| AWS account / region         | `aws-logo` | `us-east-1`            |
| Web property / app domain    | `site-globe` | `<your-company>.com` |
| GCP project, Azure sub, k8s ns | _add as needed_ | —              |

Reader benefit: the icon is recognised before the text is read — a
glanceable cue that "this box is an AWS region" vs "this box is an app
domain." Without the icon, two nested rectangles look the same and the
reader must parse two text labels to distinguish them.

The badge MUST sit OUTSIDE the rect (above the top-left corner), not
inside, so it does not steal content space from the components within.

#### 6.7.5 Label Discipline

- **Name** — 1–3 words, the canonical product/component name.
- **Subtitle** — 1 line, ≤ 24 characters. If the subtitle wraps, the
  diagram is overcrowded; either shorten the text or widen the cell gap.
- **Edge label** — verb or noun phrase, ≤ 16 characters (`Mount weights`,
  `fine-tunable`). Longer text on edges is unreadable at thumbnail scale.

#### 6.7.6 Region-to-Region Label Clearance

A region's label is rendered ABOVE its rectangle at `y = rect.y - 10`
(see `to_svg.py::render_region`). This means the label's visible glyphs
occupy a vertical band roughly `[rect.y - 22, rect.y - 4]` — and this
band is OUTSIDE the rect, in the "between regions" whitespace.

**Consequence.** When two regions stack vertically, the lower region's
label can be overlapped by the upper region's bottom border (or even
its content's label area) if the vertical gap is too small.

**Rule.** Maintain a minimum **25 px clear vertical gap** between an
upper region's bottom edge and the lower region's rect.top, so the
lower region's label has clean space to render in. With default
font-size 13 px + 10 px baseline offset, 25 px is the minimum
non-overlapping clearance; 30 px+ is comfortable.

**Compliant (AIQ).**

```python
# Tools region bottom = 591 (auto-bounded, padding_y=24)
# RAG region rect.top = 636  → label rendered at y=626
# Clearance = 636 − 591 = 45 px  ✓ comfortable
Region("rag_layout", layout="horizontal",
       pos=(250, 660),  # ← y chosen to leave room for the LABEL above
       ...)
```

**Non-compliant.**

```python
# Tools bottom = 591, RAG rect.top = 596 → label at y=586 (BEHIND Tools border!)
Region("rag_layout", pos=(250, 620), ...)   # ✗ 5 px overlap
```

**Diagnosis check.** When eyeballing a fresh layout: hold a ruler at
each region's `rect.y` and verify there is no other region's rect or
label glyph occupying the band `[rect.y - 25, rect.y]`. The clearance
problem is invisible at first glance — the label simply looks like part
of the upper region until you zoom in.

**Why no auto-fix?** Adding cross-region collision avoidance would
introduce ordering ambiguity (which region "wins" when bounds conflict?)
and break the independence of `_resolve_region_bounds`. The cost of
manual y-spacing is a one-line constant; the cost of auto-correction is
unbounded layout instability.

---

## 7. Edge Routing

### 7.1 Routing Strategies

**Table 2 — Edge route options**

| Route       | Shape                          | Use For                                          |
|-------------|--------------------------------|--------------------------------------------------|
| `auto`      | Straight or single L-elbow     | Same row or same column.                         |
| `curve`     | Cubic Bézier (S-curve)         | Branching from a single source (Y-fan).          |
| `over`      | 3-segment up-across-down       | Cross-region requiring obstacle skip.            |
| `under`     | 3-segment down-across-up       | Cross-region where row below has free space.     |
| `via=[…]`   | Manual waypoints               | One-off paths the auto-router cannot derive.     |

#### 7.1.1 Edge Endpoints (Components vs Regions)

`Edge.src` and `Edge.dst` may target **either a component or a region**.
The resolver looks up by id in `diagram.components` first, then
`diagram.regions` (component ids win on collision).

**Compliant: component → region.** Arrow lands on the region's outer
border at the requested anchor side. Use when the SEMANTIC target is a
group of services rather than a specific service inside it.

```python
Edge("entdata", "rag", "File Upload")
# Arrow ends at left edge of `rag` region's bounding rectangle.
```

**Compliant: region → region.** Useful for high-level system maps
("VPC → Internet Gateway", "GitHub → AWS Account").

```python
Edge("vpc_app", "vpc_data", "VPC peering",
     src_anchor="right", dst_anchor="left")
```

**When to target a region vs a component (Table 3):**

| Target a **region**                                       | Target a **component**                                  |
|-----------------------------------------------------------|---------------------------------------------------------|
| The interaction is with the whole grouping                | The interaction has a specific entry point              |
| Hiding internal structure improves clarity (high-level)   | Internal structure matters (detailed view)              |
| Multiple components inside would all be valid targets     | One specific component owns the interaction             |
| Symmetric: drawing N arrows to N components is noise      | The component is the genuine receiver                   |

**Region anchor geometry.** Region anchors are computed from the
*resolved* `bounds`, so this works equally well with auto-bounded
regions (§6.0.2) and Figma-style auto-layout regions (§6.0.3):

| Side     | Point on rectangle `(x, y, w, h)` |
|----------|-----------------------------------|
| `top`    | `(x + w/2, y)`                    |
| `right`  | `(x + w,   y + h/2)`              |
| `bottom` | `(x + w/2, y + h)`                |
| `left`   | `(x,       y + h/2)`              |
| `center` | `(x + w/2, y + h/2)` *(rare)*     |

Resolution ordering matters: `alignment.resolve_alignments` finalises
every region's `bounds` BEFORE `render_edge` runs, so edge anchors on
auto-bounded regions are always against final geometry.

**Caveat.** Anchoring at `center` of a region routes the arrow into the
region's interior (likely crossing components inside) — avoid unless
deliberately rendering a "drop-in" arrow with `via` waypoints that exit
cleanly. Edge style of `region.layout="vertical"` cross-axis arrows
should usually use `top`/`bottom`, not `left`/`right`.

### 7.2 Rounded Corner Rendering

Sharp 90° elbows render rigidly. At each interior vertex, insert a
quadratic Bézier with radius ≈ 10 px:

```
L 100,50 V 200    →    L 100,40 Q 100,50 110,50 ... V 200
```

Clamp the radius to `min(r, segment_length / 2)` to avoid overshoot on
short segments.

### 7.3 Arrowhead Style

Open V chevrons (stroke only) are preferred over filled triangles:

```xml
<marker id="arrow" viewBox="0 0 12 10" refX="11" refY="5"
        markerWidth="11" markerHeight="11" orient="auto"
        markerUnits="userSpaceOnUse">
  <path d="M2,1 L11,5 L2,9" fill="none" stroke="..." stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</marker>
```

**Mandatory:** `markerUnits="userSpaceOnUse"`. Without it, the marker's
stroke scales with the parent path's `stroke-width`, producing
inconsistent arrowhead sizes.

### 7.4 Structural Coherence (Disruptive Arrows)

An Edge whose length is more than **3× the median edge length** is a
candidate for replacement, as it visually dominates the composition.

**Worked example.** The cross-region inference Edge from `HTTP Client` to
`API Catalog` spans all three regions. It was removed from the rendered
diagram. The semantic connection is expressed through component
subtitles:

- `HTTP Client` subtitle: `requests → API Catalog`
- `API Catalog` subtitle: `integrate.api.nvidia.com ← HTTP`

Both endpoints share the external-orange box styling. Information is
preserved; visual rhythm is unbroken.

### 7.5 Cubic Bézier for Divergent Branches

When two Edges share a source and split to distinct destinations,
L-shapes overlap at the source. Use S-curves with diverging offsets:

```python
Edge("jupyter", "http_client", "Cloud cell",
     route="curve", src_offset=(−22, 0), ...)   # 22 px left of bottom-centre
Edge("jupyter", "chat_nvidia", "Local cell",
     route="curve", src_offset=(+22, 0), ...)   # 22 px right
```

Control-point distance of `chord_length / 3` gives a balanced swoop.

### 7.6 Orthogonality Rule (No Diagonal Segments)

**Hard rule.** Every edge segment in a routed path MUST be either purely
horizontal (Δy = 0) or purely vertical (Δx = 0). Diagonal segments
(non-zero Δx AND Δy) are NOT permitted, with the single exception of
`route="curve"` cubic Béziers where the diagonal is intentional and
smooth.

**Why.** Orthogonal flows read as structured systems; diagonal segments
suggest randomness or sloppy routing. They also conflict with rounded-
corner rendering (§7.2), which assumes axis-aligned segments meeting at
90°.

#### 7.6.1 Common Diagonal-Creating Bugs

| Pattern                                                                                              | Why diagonal                                                                                       | Fix                                                                                                    |
|------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| First `via` waypoint with x slightly offset from src.cx (e.g., src at x=333, first via at x=340)     | Segment src→via1 has both Δx (7) and Δy (43) → diagonal                                            | Set first via.x = src.cx exactly. The vertical-first segment now has Δx=0.                             |
| Last `via` waypoint with x slightly offset from dst.cx                                               | Segment via_last→dst has both Δx and Δy                                                            | Set last via.x = dst.cx (or apply matching dst_offset).                                                |
| `via` skipping the corner between two axis-changes                                                   | Implicit diagonal between two non-aligned points                                                   | Add a corner waypoint that shares one axis with each neighbour.                                        |
| Auto-route with `src_anchor=top`/`bottom` but dst at non-axis-aligned point and no `via`             | The 1-elbow `[sp, (sp.x, dp.y), dp]` is orthogonal — this case is safe                             | n/a                                                                                                    |
| Auto-route producing 2 axis-aligned points (sp.x == dp.x or sp.y == dp.y) — direct line, fine        | n/a                                                                                                | n/a                                                                                                    |

#### 7.6.2 Compliant Pattern (loop-back rail)

```text
# src: shallow.top = (333, 168)        # via.x MUST equal src.cx (333)
# rail at y = 125 → drop to user.top + (-15, 0) = (55, 162)
shallow --> user : "Short Answer" {
  src=top, dst=top(-15,0),
  via=(333,125);(55,125)              # ← 333 not 340; vertical-first segment
}
```

Path produced: `(333,168) → (333,125) → (55,125) → (55,162)`. All three
segments perpendicular. Final ASCII:

```
      ┌─────────────────┐  rail y=125  (label "Short Answer")
      │                 │
      ▼                 │
   user.top         shallow.top
```

#### 7.6.3 Detection Heuristic

When reviewing a path produced by `route_edge`, walk every adjacent pair
`(p_i, p_{i+1})`. If both `p_i.x != p_{i+1}.x` AND `p_i.y != p_{i+1}.y`,
that segment is diagonal — fail the review.

A grep-friendly check: scan the rendered SVG for `<path … d="…">` where
the path contains an `L` command with neither x nor y matching the
previous coordinate. Such patterns indicate a diagonal segment slipped
through.

---

## 8. Iconography

### 8.1 Isometric Cubes with Matrix-Transformed Glyphs

Cubes have a slanted front face (parallelogram). Glyphs drawn in flat
coordinates appear "stuck on". Wrap the inner content in a 2D affine
matrix mapping `[0, 1]² → front face`:

```
x' = 0.44·s · u + 0.06·s
y' = 0.21·s · u + 0.44·s · v + 0.28·s
```

```xml
<g transform="matrix(35.2, 16.8, 0, 35.2, 4.8, 22.4)">
  <rect x="0.10" y="0.30" width="0.34" height="0.18"/>   <!-- skewed parallelogram -->
</g>
```

A flat `<rect>` becomes an isometric-correct parallelogram. The same
glyph source serves any cube size; the matrix scales.

### 8.2 Stroke Width Handling

**Do not** use `vector-effect="non-scaling-stroke"` with matrix
transforms — browser support is inconsistent (observed: 1.6 declaration
rendering at ~70 px on Chrome). Author stroke widths in unit space:

```xml
<line stroke-width="0.045"/>   <!-- 0.045 × 35.2 ≈ 1.6 px on screen -->
```

### 8.3 Subtle Gradient Treatment

Flat fills appear dated. Apply per-face linear gradients with a slight
top→bottom darken:

```xml
<linearGradient id="g-face-front" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#82c70a"/>
  <stop offset="100%" stop-color="#6ba600"/>
</linearGradient>
```

A single `<linearGradient>` definition reused N times has negligible
file-size cost.

### 8.4 Shadow Application

Apply `feDropShadow` to icon groups **only**. Do not apply to text
(muddies legibility) or to arrows (visual noise):

```xml
<filter id="shadow">
  <feDropShadow dx="0" dy="1.5" stdDeviation="2"
                flood-color="#0f172a" flood-opacity="0.18"/>
</filter>

.icon-shadow { filter: url(#shadow); }
```

---

## 9. Background and Ambience

### 9.1 Engineering-Paper Dot Grid

A single SVG `<pattern>` containing a small low-opacity dot:

```xml
<pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="0.8" fill="#0f172a" fill-opacity="0.045"/>
</pattern>

<rect width="100%" height="100%" fill="url(#dot-grid)"/>
```

The 0.045 opacity is the threshold above which the pattern competes
with content and below which it is imperceptible.

### 9.2 Region Boundary Styling

Regions use:

- Fill: `rgba(15, 23, 42, 0.02)` (near-invisible tint).
- Stroke: 1.5 px, `stroke-dasharray: 6 5`.
- Label: positioned **above** the rectangle, UPPERCASE, letter-spaced.

This groups Cells without dominating them.

---

## 10. Anti-Patterns

**Table 3 — Common smells and their fixes**

| 10.x   | Smell                                            | Fix                                                              |
|--------|--------------------------------------------------|------------------------------------------------------------------|
| 10.1   | One arrow much longer than the others            | Remove the arrow, encode the link in subtitles (`→`, `←`).       |
| 10.2   | Filled-triangle arrowheads at default size       | Open V chevron with `markerUnits="userSpaceOnUse"`.              |
| 10.3   | Sharp 90° elbows                                 | `Q` rounded corners, radius ≥ 10.                                |
| 10.4   | Cube inner glyph drawn flat                      | Matrix transform from `[0, 1]²` onto the front face.             |
| 10.5   | `vector-effect="non-scaling-stroke"` with matrix | Author stroke widths in unit space.                              |
| 10.6   | Edge label at "centroid of waypoints"            | For `over`/`under`, use across-segment midpoint.                 |
| 10.7   | Bottom anchor at icon edge                       | Push past `LABEL_HEIGHT[shape]` so line clears the label.        |
| 10.8   | Long decimals (`22.400000000000002`)             | Format with `_r()` helper (2 dp, drop trailing zeros).           |
| 10.9   | Technology tags floating in Mermaid              | Replace Mermaid C4 with hand-rolled / programmatic generation.   |
| 10.10  | All rows centred regardless of cell count        | Permit per-region width variance based on actual row content.    |

---

## 11. Iteration Process

A single generate-render-review cycle takes approximately 30 ms
(`uv run src/cli.py`) plus the browser-reload time. This permits 20+
revisions per session at acceptable cost.

The five revisions that produced the greatest visual quality gain were:

1. Migration from inline-SVG to **code-driven layout**.
2. Correction of the **bottom anchor** to account for label area.
3. Adoption of **open V arrowheads** and **rounded corners**.
4. Replacement of rigid L-shapes with **smooth S-curves** on branching edges.
5. **Removal of the giant cross-region arrow** that broke visual rhythm.

---

## 12. References

- `src/model.py` — `Component`, `Region`, `Edge`, `Diagram` definitions.
- `src/layout.py` — `_route_over`, `_route_under`, `cell_size`, layout entry point.
- `src/to_svg.py` — `points_to_rounded_path`, `smooth_curve`, `edge_label_pos`.
- `src/icons.py` — `_cube`, `_box`, glyph library, isometric matrix.
- `samples/data.py` — current diagram instance.
- `out/container-diagram.svg` — current build artefact.
- `samples/AIQ-arch-light.png` — external reference (NVIDIA AIQ).

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author      | Changes                                            |
|---------|------------|-------------|----------------------------------------------------|
| 0.1     | 2026-05-18 | Vũ Anh      | Initial draft; informal Markdown.                  |
| 1.0     | 2026-05-18 | Vũ Anh      | Restructured per ISO/IEC/IEEE 15289:2019 format.   |
| 1.1     | 2026-05-18 | Vũ Anh      | §6.0.3 Auto-layout regions (Figma-style); RegionStyle inner=`stroke-dasharray 4 4`. |
| 1.2     | 2026-05-18 | Vũ Anh      | §7.1.1 Edge endpoints — `Edge.src`/`dst` may target Components OR Regions.         |
| 1.3     | 2026-05-18 | Vũ Anh      | §6.7.6 Region-to-region label clearance — 25 px minimum gap above lower region.    |
| 1.4     | 2026-05-18 | Vũ Anh      | §5.5 Diagram DSL (Mermaid-like) — grammar + `dsl.py` parser + `.kymo` format.   |
| 1.5     | 2026-05-18 | Vũ Anh      | §5.5.1.1 Region border overrides — `dash (X, Y)` + `stroke #hex` per-region.       |
| 1.6     | 2026-05-18 | Vũ Anh      | §5.5.1.2 Asymmetric padding — `padding-bottom N` balances label's top visual weight.|
| 1.7     | 2026-05-18 | Vũ Anh      | §7.6 Orthogonality rule — every routed edge segment must be H or V (no diagonals).  |

---

## Annex B — Document Control

### B.1 Storage and Retrieval

This document is version-controlled within the project repository at
`diagrams/docs/BEST_PRACTICE_DIAGRAMS.md`. Authoritative source is the
working tree of the main branch; archived versions are accessible via
the repository history (`git log`).

### B.2 Distribution

Distribution is implicit — the document is checked in alongside the
implementation it describes. Any engineer with read access to the
repository has access to the current revision.

### B.3 Change Control

Substantive changes (clauses 5–11) require a regeneration of
`out/container-diagram.svg` and visual confirmation that the rendered
output remains compliant. Editorial changes (typography, clarification)
do not.

A new revision MUST:

1. Update the **Version** field in the header table.
2. Update the **Issue Date** field.
3. Append a row to **Annex A — Revision History**.
4. Bump the major version on breaking changes to interfaces in
   `src/model.py` / `src/layout.py` / `src/to_svg.py`.

### B.4 Review

The document is reviewed:

- **Continuously** by anyone editing `diagrams/` (changes to behaviour
  must be reflected here).
- **At least annually** by the project owner.
- **Upon** any major architecture-rendering stack change (e.g., switching
  from raw SVG to a templating library).
