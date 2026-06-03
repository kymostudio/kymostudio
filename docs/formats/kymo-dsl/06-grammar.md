---
title: "Kymo DSL — Clause 6: Grammar"
document_id: KYMO-DSL-GRAMMAR-001
version: "2.6"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers authoring or parsing `.kymo` files
review_cycle: On grammar change, or annually (whichever first)
supersedes: null
related_documents:
  - KYMO-DSL-LEX-001         # Clause 5 — Lexical Conventions
  - KYMO-DSL-SEMANTICS-001   # Clause 7 — Semantics
  - KYMO-DSL-CONF-001        # Clause 9 — Conformance
  - DESIGN-BPMN-DSL-001      # bpmn { } block design + Sugiyama layout (§6.9)
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - grammar
  - ebnf
  - productions
  - bpmn
  - layout-tree
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC 14977:1996
  - ISO 8601:2019
---

# Kymo DSL — Clause 6: Grammar

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-GRAMMAR-001                              |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-LEX-001`, `KYMO-DSL-SEMANTICS-001`, `KYMO-DSL-CONF-001`, `DESIGN-BPMN-DSL-001` |

## 6. Grammar

### 6.1 Notation

EBNF per ISO/IEC 14977:1996. Italicised terms in examples are non-terminals; literal tokens are quoted. The grammar is **line-oriented**: each production matches a single logical line unless it opens a brace-delimited body.

### 6.2 Top-Level Production

```
file             = { file_line } ;
file_line        = directive | container | leaf | edge | layout_tree | comment | blank ;
directive        = canvas | title | subtitle | external ;
```

There is no `component` or `region` keyword. Containers and leaves are distinguished by line shape (see clauses 6.4–6.5). `layout` is a keyword only as the opener of an anonymous layout-tree block (`layout { … }`, clause 6.10), not as a container kind.

### 6.3 Metadata Directives

```
canvas           = "canvas" , [ ":" ] , INT , "x" , INT ;
title            = "title"    , ":" , STRING ;
subtitle         = "subtitle" , ":" , STRING ;
external         = "external" , id , "above" , id , [ "gap" , INT ] ;
```

`canvas:` is OPTIONAL. When absent, dimensions are auto-computed (see clause 7.4). `title:` and `subtitle:` are OPTIONAL; each MAY appear at most once per file. `external` reserves vertical space above a target leaf (see `packages/python/src/kymo/layout.py`).

### 6.4 Leaf Components

```
leaf             = id , shape , "/" , icon , "/" , accent ,
                   STRING , STRING , [ "@" , placement ] ;
placement        = absolute_pos | parent_ref ;
absolute_pos     = "(" , INT , "," , INT , ")" ;
parent_ref       = id , side , [ INT ] ;
side             = "top" | "right" | "bottom" | "left" ;
shape            = "circle" | "cube" | "cube-big" | "box" | "cylinder" |
                   "hex" | "annotation" | "aws-tile" | "aws-tile-hero" | "badge" ;
icon             = identifier_with_hyphens ;
accent           = "green" | "orange" | "blue" | "red" ;
```

A line is a leaf if its second whitespace-separated token contains a `/` (the `shape/icon/accent` triple). When `@` is omitted, `pos` defaults to `(0, 0)` and the leaf is expected to be positioned by a layout container that references its ID.

**Recognised vs enforced.** The `shape` and `accent` values listed above are the set the renderer recognises. The parser itself is permissive: it accepts any `shape` matching `[A-Za-z0-9_-]+` and any `accent` matching `[A-Za-z0-9_]+`, deferring validation to render time (an unknown value falls back to a default glyph / colour). Authors SHOULD use a recognised value.

Leaves MAY appear at file scope OR inside a region container body (see clause 6.5.1). They MUST NOT appear inside a layout container body — layout bodies accept bare-id references only.

### 6.5 Containers

A container is a line ending with `{`. The kind keyword (second token) selects the container flavour:

```
container        = region_open , body , "}"
                 | layout_open , body , "}" ;

region_open      = id , region_kind , STRING , { region_opt } , "{" ;
region_kind      = "outer" | "inner" ;

layout_open      = id , layout_kind ,
                   "pos" , "(" , INT , "," , INT , ")" ,
                   "gap" , INT ,
                   [ "align" , ( "start" | "center" | "end" ) ] , "{" ;
layout_kind      = "horizontal" | "vertical" ;
```

#### 6.5.1 Region Body

```
region_body      = { region_body_line } ;
region_body_line = container | leaf | bare_ids | row | comment | blank ;
bare_ids         = id , { id } ;
row              = "row" , [ id , { id } ] ;
```

Within a region body:

- **Inline leaf** — adds the leaf to the diagram AND appends its id to this region's `contains` list.
- **Bare-id reference** — appends each id to this region's `contains` list. The id MUST be defined elsewhere in the file (no forward-only references; the reference itself does not create a leaf).
- **Nested container** — when the nested container is itself a region, its `contains` list is flattened into this region's `contains` (depth-first), so the outer region's auto-bounds envelop nested leaves. Layout containers do NOT propagate.
- **Grid `row`** — switches the region to grid mode. All non-empty body lines MUST be `row` lines once any `row` appears. In grid mode, `_resolve_region_bounds` is skipped and `layout.layout()` computes both positions and bounds from the grid.

#### 6.5.2 Layout Body

```
layout_body      = { layout_body_line } ;
layout_body_line = bare_ids | comment | blank ;
```

A layout body accepts **only** bare-id references. Inline leaf definitions and nested containers are rejected with a diagnostic — a layout is a positioning rule, not an ownership scope.

#### 6.5.3 Region Options

```
region_opt       = "padding"        , "(" , INT , "," , INT , ")"
                 | "padding-bottom" , INT
                 | "dash"           , "(" , INT , "," , INT , ")"
                 | "stroke"         , hexcolour
                 | "label-position" , ( "above" | "inside" )
                 | "label-anchor"   , ( "start" | "middle" | "end" )
                 | "icon"           , identifier_with_hyphens
                 | ( "horizontal" | "vertical" ) ;
```

Region option order is insignificant. Each option SHALL appear at most once per region.

A `horizontal` / `vertical` option turns the region into a Figma-style **auto-layout frame** (sets `Region.layout`): its members are stacked along the named axis, exactly as a layout container (clause 6.5) does, while the region keeps its `outer` / `inner` border and label. Such a region's body is then governed by the layout-body rules (bare-id references only — `row` and inline leaves are rejected).

Default values:

| Option          | Default (outer)       | Default (inner)        |
|-----------------|-----------------------|------------------------|
| padding         | (24, 24)              | (24, 24)               |
| padding-bottom  | `padding[1]`          | `padding[1]`           |
| dash            | (6, 5) via CSS        | (4, 4) via CSS         |
| stroke          | `#cbd5e1` via CSS     | `#94a3b8` via CSS      |
| label-position  | `above`               | `inside`               |
| label-anchor    | `middle`              | `middle`               |
| icon            | none                  | none                   |

### 6.6 Line Discriminator

A conforming parser MUST discriminate body lines in this order (first match wins):

1. `}` alone (possibly with whitespace) — closes the current container.
2. `row` followed by zero or more ids — grid row (region body only; rejected in layout body or at file scope).
3. Exactly `bpmn {` (first token `bpmn`) — opens a BPMN process block (file scope only; see §6.9).
4. A line matching `layout { … }` (first token `layout`, opening and closing its braces on the one line) — anonymous layout tree (file scope only; see §6.10).
5. Line ending with `{` — container opener; kind selects region vs layout.
6. Match against the arrow forms `-->` or `==>` — edge (file scope only).
7. Second token contains `/` — leaf component.
8. All tokens match the `id` production — bare-id reference list (container body only).
9. Otherwise — syntax error.

### 6.7 Edges

Edges are file-scope only. Nesting an edge inside a container is rejected with a diagnostic.

```
edge             = id , arrow , id , [ ":" , STRING ] , [ "{" , edge_opts , "}" ] ;
arrow            = "-->"      (* gray, default *)
                 | "==>"      (* orange, highlight / external *)
                 ;
edge_opts        = edge_opt , { "," , edge_opt } ;
edge_opt         = "src"          , "=" , anchor_spec
                 | "dst"          , "=" , anchor_spec
                 | "via"          , "=" , point , { ";" , point }
                 | "label_offset" , "=" , point
                 | "label_pos"    , "=" , point
                 | "label_at"     , "=" , ( "src" | "dst" | "mid" )
                 | "route"        , "=" , ( "auto" | "over" | "under" | "curve" )
                 | "small"
                 | "dashed"
                 | "shared"                         (* keep src at the centre port; opt out of fan-out stagger *)
                 | "curve" | "over" | "under" | "straight" | "elbow"   (* route shorthand; "elbow" = orthogonal auto, the default *)
                 ;
anchor_spec      = side_or_centre , [ "(" , INT , "," , INT , ")" ] ;
side_or_centre   = side | "center" ;
point            = "(" , INT , "," , INT , ")" ;
```

### 6.8 Reserved Keywords

```
canvas    title       subtitle    external   above
outer     inner       horizontal  vertical
padding   padding-bottom  dash    stroke     icon
label-position label-anchor
above     inside
pos       gap         align
row
top       right       bottom      left       center
start     middle      end
src       dst         via         route
label_offset  label_pos  label_at  small  dashed  shared
auto      over        under       curve       straight  elbow
bpmn      layout
```

These tokens SHALL NOT be used as user-defined leaf, container, or icon identifiers. Removed in v2.0: `component`, `region` (no longer keywords — the parser distinguishes by line shape). `layout` remains reserved **only** as the opener of an anonymous layout-tree block (`layout { … }`, clause 6.10), not as a container kind. Within a `bpmn { }` body, the node-kind keywords (`start`, `end`, `end!`, `task`, `xor`, `and`, `or`, `event`, `subprocess`, `note`, `data`, `store`) and the flow arrows (`->`, `~>`, `..>`) are reserved (see §6.9).

### 6.9 BPMN Process Blocks

A `bpmn { … }` block authors a BPMN 2.0 process as typed nodes and flows in a
*positionless*, auto-laid-out form — the inverse of placing each `bpmn-*` leaf at
an explicit `@ (x,y)`. The block is **file scope only**; nesting it inside a
region or layout is a syntax error.

```
bpmn_block = "bpmn" , "{" , { bpmn_stmt } , "}" ;
bpmn_stmt  = bpmn_node | bpmn_conn ;
bpmn_node  = bpmn_kind , id , [ STRING ] , [ "type" , "=" , identifier ] , [ "@" , point ] ;
bpmn_kind  = "start" | "end" | "end!" | "task"
           | "xor" | "and" | "or"                       (* gateways *)
           | "event" | "subprocess" | "note" | "data" | "store" ;
bpmn_conn  = bpmn_chain , { ";" , bpmn_chain } ;
bpmn_chain = id , bpmn_arrow , id , { bpmn_arrow , id } , [ ":" , STRING ] ;
bpmn_arrow = "->"      (* sequence flow *)
           | "~>"      (* message flow  *)
           | "..>"     (* association   *)
           ;
```

A body line is a **node declaration** when its first token is a `bpmn_kind`,
otherwise a **connection**. Semantics:

- **Kinds → glyphs.** Each kind maps to a `bpmn-*` shape + marker: `start`→bpmn-start,
  `end`→bpmn-end, `end!`→bpmn-end + terminate, `task`→bpmn-task, `xor`/`and`/`or`→
  bpmn-gateway (exclusive / parallel / inclusive), `event`→bpmn-intermediate,
  `subprocess`→bpmn-subprocess, `note`→bpmn-annotation, `data`→data-object,
  `store`→data-store. An optional `type=<subtype>` refines the marker (e.g.
  `task … type=user`, `start … type=message`).
- **Flows.** `->` is a sequence flow, `~>` a message flow (dashed), `..>` an
  association (dotted, no arrowhead). A chain `A -> B -> C` expands to one flow per
  segment; `;` separates statements on a line; a trailing `: "label"` labels the
  (last) segment.
- **Auto-layout.** Un-pinned nodes are placed by a deterministic left-to-right
  layered (Sugiyama) layout — rank assignment, crossing-minimised ordering,
  coordinate assignment (the longest path is held on a straight baseline and branches
  are balanced above/below it), and orthogonal edge routing. The algorithm is
  specified in DESIGN-BPMN-DSL-001 §3.
- **Pins.** A node carrying `@ (x,y)` has its centre fixed to that coordinate and its
  incident edges re-route to it; un-pinned nodes are not re-ranked.
- **Resolution.** The block emits a fully-resolved sub-diagram (components with
  absolute position/size, edges carrying explicit `points` + flow kind), so the
  existing renderer draws it unchanged; identical input yields byte-identical output.
  The same grammar and layout exist in the Python and JS implementations
  (FEAT-BPMN-DSL-001 FR-11).

See §10.7 for an example and `samples/order-flow.kymo` for a complete process.

### 6.10 Layout Tree

An anonymous `layout { … }` block declares a Figma-style auto-layout **tree** on
a single line — a nestable horizontal / vertical grouping of leaf ids. It is the
positionless counterpart to a named layout container (clause 6.5), and is **file
scope only**.

```
layout_tree = "layout" , "{" , layout_expr , "}" ;
layout_expr = layout_atom , { ( "|" | "," ) , layout_atom } ;
layout_atom = id | "{" , layout_expr , "}" ;
```

- `|` groups its operands **horizontally** (left → right); `,` groups them
  **vertically** (top → bottom).
- The two separators MUST NOT be mixed at the same nesting level; a conforming
  parser rejects `a | b , c` with a diagnostic. Use braces to nest a column
  inside a row (or vice versa): `a | { b , c }`.
- The construct is a single logical line — it opens and closes its `{ … }` on
  that one line, unlike the multi-line containers of clause 6.5.

The referenced ids MUST be defined elsewhere in the file (as leaves or region
members). Positions — and crossing-minimised child ordering — are computed at
resolve time by `layout.apply_layout_tree`; the block draws no border or label.

```text
header box/files/orange "Header" ""
a      box/files/orange "A"      ""
b      box/files/orange "B"      ""

layout { header , { a | b } }   # Header on top; A and B side-by-side below it.
```

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 6 (Grammar) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/06-grammar.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
When a grammar production is added or modified, update the EBNF here, keep it in
lockstep with `dsl.py`, increment `version`, and append a row to Annex A. Reflect
any `bpmn { }` change with DESIGN-BPMN-DSL-001.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set) and `dsl.py`; reconcile any
deviation there before release. Grammar changes SHOULD preserve the previous MINOR
version's parseable files; an unavoidable break increments the MAJOR version.
