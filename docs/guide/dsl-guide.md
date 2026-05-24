# The `.kymo` Language

A guided tour of the building blocks you'll use to draw diagrams. Every section has a
small snippet you can paste into a file and render with `kymo file.kymo`.

This is the *teaching* companion to the [DSL Language Specification](../formats/kymo-dsl/README.md) (`KYMO-DSL-001`).
Each section links to the spec clause that defines it formally; reach for the spec when you
need the exact grammar or an edge case.

A `.kymo` file is a list of plain-text lines. Comments start with `#`. Order is mostly free,
but a readable convention is: metadata first (`canvas`, `title`), then components and
regions, then edges last.

## Components — the boxes

A component (a "leaf") is one node. Write it as a **`shape/icon/accent` triple** followed by
a name and subtitle:

```text
api  box/send/blue  "API Gateway"  "REST · :443"  @ (200, 150)
```

- **`id`** (`api`) — a unique handle you use later in edges and containers.
- **`shape`** — the outline. Recognised shapes: `box`, `circle`, `cube`, `cube-big`,
  `cylinder`, `hex`, `badge`, `annotation`, `aws-tile`, `aws-tile-hero` (plus the `bpmn-*`
  shapes used for BPMN). Use a recognised value — an unknown shape stops the render with an error.
- **`icon`** — the glyph drawn inside, named by key (see [Icons](#icons) below). An unknown
  icon key also errors, so check the spelling if rendering fails.
- **`accent`** — the colour: `green`, `orange`, `blue`, or `red`.
- **`"Name" "Subtitle"`** — two quoted labels. Either may be empty (`""`). The first is the
  bold title; the second is a smaller line beneath it.
- **`@ …`** — where to put it (next section). Omit it and the component lands at `(0, 0)`
  unless a layout container positions it.

→ Spec: [§6.4 Leaf Components](../formats/kymo-dsl/06-grammar.md#64-leaf-components)

## Placing components

Two ways to position a component:

**Absolute** — an `(x, y)` pixel coordinate for the component's centre:

```text
orch  hex/hex-agent/green  "Orchestrator"  ""  @ (200, 200)
```

**Relative to another component** — `@ <other-id> <side> [gap]`, where `side` is `top`,
`right`, `bottom`, or `left`:

```text
child hex/hex-agent/green "Child" "" @ orch right 60
```

This places `child` 60 px to the right of `orch`. The gap is optional.

→ Spec: [§6.4](../formats/kymo-dsl/06-grammar.md#64-leaf-components), [§7 Semantics](../formats/kymo-dsl/07-semantics.md#7-semantics)

## Regions — labelled containers

A region groups components inside a bordered, labelled box. There are two kinds: `outer`
(a heavier administrative boundary) and `inner` (a lighter logical subgroup). A region is a
line ending in `{`:

```text
useast1 outer "us-east-1" padding (40, 40) icon aws-logo {
  app inner "my-app" {
    web box/send/orange        "Web"  "" @ (200, 150)
    db  cylinder/cylinder/blue "RDS"  "" @ (420, 150)
  }
}
```

Regions **auto-size to enclose their contents** — you don't set their width or height. Nest
an `inner` region inside an `outer` one and the outer box grows to wrap everything.

Useful region options (any order, each at most once):

| Option | Effect |
|--------|--------|
| `padding (X, Y)` | Inner padding (default `(24, 24)`). |
| `padding-bottom N` | Extra space at the bottom. |
| `dash (ON, OFF)` | Dashed border pattern; `dash (0, 0)` forces a solid line. |
| `stroke #RRGGBB` | Border colour. |
| `icon <key>` | A glyph beside the label. |
| `label-position above\|inside` | Where the label sits relative to the border. |
| `label-anchor start\|middle\|end` | Horizontal alignment of the label. |

Inside a region body you can also list **bare ids** (components defined elsewhere) to add them
to this region without redefining them:

```text
group inner "Workers" {
  worker1 worker2 worker3
}
```

→ Spec: [§6.5 Containers](../formats/kymo-dsl/06-grammar.md#65-containers)

## Arranging things automatically

You don't have to place everything by hand. kymo offers three auto-layout tools.

**Auto-layout frame** — turn a region into a Figma-style stack with `horizontal` or
`vertical`, and members flow along that axis:

```text
row_layout horizontal pos (50, 100) gap 40 {
  one two three
}
one   box/files/orange "One"   ""
two   box/files/orange "Two"   ""
three box/files/orange "Three" ""
```

**Anonymous layout tree** — a one-line grouping where `|` lays ids out left-to-right and
`,` lays them top-to-bottom. Nest with braces (don't mix `|` and `,` at the same level):

```text
layout { header , { a | b } }   # header on top; a and b side-by-side below it
```

**Grid rows** — inside a region, `row` lines snap members to shared rows. When several
regions sit side by side, equal row indices line up at the same height, so cross-region
edges on the same row run perfectly horizontal (this is the trick behind
[`samples/data.kymo`](../../samples/data.kymo)):

```text
left outer "Client" {
  row jupyter
  row http
}
right outer "Server" {
  row docker
  row nim
}
```

→ Spec: [§6.5](../formats/kymo-dsl/06-grammar.md#65-containers), [§6.10 Layout Tree](../formats/kymo-dsl/06-grammar.md#610-layout-tree)

## Edges — the arrows

An edge connects two component ids, with an optional `: "label"` and an optional `{ … }`
block of routing hints:

```text
web --> db : "SQL"
```

Three arrow styles:

| Arrow | Meaning |
|-------|---------|
| `-->` | Standard directed edge (grey). |
| `==>` | Highlighted / external edge (orange). |
| `---` | Undirected link (no arrowhead) — for siblings/peers. |

Inside `{ … }`, comma-separated options give you fine control:

- **`src=` / `dst=`** — which side the edge leaves from and arrives at: `top`, `right`,
  `bottom`, `left`, or `center`, with an optional pixel nudge: `src=right(0,-12)`.
- **`via=(x,y)`** — force the line through waypoints; chain several with `;`:
  `via=(120,300);(220,300)`.
- **routing** — `curve`, `straight`, `over`, `under`, or `elbow` (the default orthogonal
  router).
- **`dashed`** — a dashed line (handy for async / optional flows).
- **`small`** — smaller label text.
- **`label_offset=(x,y)`**, **`label_pos=(x,y)`**, **`label_at=src|dst|mid`** — fine label
  placement.

A fully-decorated edge:

```text
src --> dst : "label" {
  src=bottom(0,12), dst=top(-7,0),
  via=(120,300);(220,300),
  label_offset=(0,-8), small
}
```

Start simple — bare `a --> b` works great. Add hints only where the auto-router needs help.

→ Spec: [§6.7 Edges](../formats/kymo-dsl/06-grammar.md#67-edges)

## Canvas, title, and subtitle

Optional metadata at the top of the file:

```text
canvas:   1280 x 680
title:    "My Architecture"
subtitle: "v2 — production"
```

`canvas:` sets a fixed size. **Leave it out** and kymo computes the canvas from your content
plus a 30-px margin — usually what you want. `title:`/`subtitle:` render a heading block at
the top.

→ Spec: [§6.3 Metadata Directives](../formats/kymo-dsl/06-grammar.md#63-metadata-directives), [§7.4 Auto-Canvas](../formats/kymo-dsl/07-semantics.md#74-auto-canvas)

## Icons

The `icon` slot of a component (and a region's `icon` option) names a glyph by key. kymo
resolves a key in two steps:

1. **Built-in glyphs** — a hand-coded set (e.g. `customer-person`, `internet-cloud`,
   `step-1`, `key`, `notebook`).
2. **File-backed icons** — SVG/PNG files under the repo's top-level [`icons/`](../../icons)
   directory, organised by provider (`aws/`, `azure/`, `gcp/`, `k8s/`, `generic/`, `saas/`, …).

For file-backed icons the key is **`<provider>-<name>`** — the provider folder joined to the
file's name, with the middle category folder dropped. So `icons/aws/compute/lambda.svg`
becomes the key `aws-lambda`, and `icons/k8s/compute/pod.svg` becomes `k8s-pod`:

```text
fn  aws-tile/aws-lambda/orange  "Lambda"  "handler"  @ (300, 200)
pod cube/k8s-pod/blue           "Pod"     ""          @ (520, 200)
```

→ Reference implementation: [`packages/python/src/kymo/icons.py`](../../packages/python/src/kymo/icons.py)

## BPMN processes

To draw a business process, you don't have to place each node. A `bpmn { … }` block declares
typed nodes and flows, and kymo lays them out left-to-right automatically:

```text
bpmn {
  start S  "Order received"
  task  V  "Validate order"
  xor   GW "In stock?"
  task  P  "Process payment"
  end!  C  "Order cancelled"
  end   D  "Order delivered"

  S -> V -> GW
  GW -> P : "Yes"
  GW -> C : "No"
  P -> D
}
```

- **Node kinds**: `start`, `end`, `end!` (terminate), `task`, the gateways `xor` / `and` / `or`,
  plus `event`, `subprocess`, `note`, `data`, `store`. Refine a node with `type=…`
  (e.g. `task T "Review" type=user`).
- **Flows**: `->` sequence, `~>` message (dashed), `..>` association (dotted). Chain them
  (`A -> B -> C`), separate statements with `;`, and label the last segment with `: "…"`.

Already have a `.bpmn` file from bpmn.io, Camunda Modeler, or Signavio? Just render it
directly — `kymo process.bpmn` — and kymo uses the geometry stored in the file. See the
[BPMN element mapping](../formats/bpmn/kymo-mapping.md) (`BPMN-MAP-001`).

→ Spec: [§6.9 BPMN Process Blocks](../formats/kymo-dsl/06-grammar.md#69-bpmn-process-blocks)

## Next steps

- **[Cookbook](./cookbook.md)** — complete diagrams you can adapt.
- **[FAQ & Troubleshooting](./faq.md)** — fixes for common surprises.
- **[DSL Language Specification](../formats/kymo-dsl/README.md)** — the full normative grammar.
