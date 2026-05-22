---
title: Diagram DSL — Language Specification
document_id: DSL-LANG-001
version: "2.0"
issue_date: 2026-05-18
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers authoring or parsing `.kymo` files
review_cycle: On grammar change, or annually (whichever first)
supersedes: "1.0"
related_documents:
  - BEST_PRACTICE_DIAGRAMS.md
  - dsl.py
  - model.py
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - diagram
  - grammar
  - ebnf
  - svg
iso_compliance:
  - ISO/IEC/IEEE 15289:2019      # information item content (metadata + structure)
  - ISO/IEC 14977:1996           # EBNF notation
  - ISO/IEC/IEEE 26515:2018      # agile documentation
  - ISO 8601:2019                # date format
# Revision history is maintained in Annex A (per ISO/IEC/IEEE 15289:2019
# clause 5.10 — change information SHALL be a numbered annex, not metadata).
---

# Diagram DSL — Language Specification

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | DSL-LANG-001                                                   |
| Version           | 2.0                                                            |
| Issue Date        | 2026-05-18                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers authoring or parsing `.kymo` files                |
| Review Cycle      | On grammar change, or annually (whichever first)               |
| Supersedes        | v1.0                                                           |
| Related Documents | [`BEST_PRACTICE_DIAGRAMS.md`](./BEST_PRACTICE_DIAGRAMS.md), [`dsl.py`](../src/dsl.py), [`model.py`](../src/model.py) |

Structured per ISO/IEC/IEEE 15289:2019 (information item content). Grammar productions follow ISO/IEC 14977:1996 (Extended Backus–Naur Form).

---

## Table of Contents

1. [Scope](#1-scope)
2. [Normative References](#2-normative-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Abbreviations](#4-abbreviations)
5. [Lexical Conventions](#5-lexical-conventions)
6. [Grammar](#6-grammar)
7. [Semantics](#7-semantics)
8. [Authoring Conventions](#8-authoring-conventions)
9. [Conformance](#9-conformance)
10. [Examples](#10-examples)
11. [Annex A — Revision History](#annex-a--revision-history)
12. [Annex B — Document Control](#annex-b--document-control)

---

## 1. Scope

### 1.1 Purpose

This document specifies the **Diagram DSL** — a textual surface language for declaring architecture diagrams. A conforming source file (`.kymo`) declares the leaves, containers (region and layout), and edges of a single diagram. A conforming parser produces an in-memory `model.Diagram` value semantically equivalent to the source.

### 1.2 Applicability

This specification applies to:

- Source files with extension `.kymo` in this repository
- The reference parser implementation [`dsl.py`](../src/dsl.py)
- Any future tooling (linters, formatters, IDE plug-ins) operating on `.kymo` files

It does **not** specify:

- The SVG renderer (see [`to_svg.py`](../src/to_svg.py) and BEST_PRACTICE_DIAGRAMS.md)
- The build/dispatch system (see [`cli.py`](../src/cli.py))
- The graphical conventions for diagram aesthetics (see BEST_PRACTICE_DIAGRAMS.md)

### 1.3 Reference Implementation

[`dsl.py`](../src/dsl.py) is the normative reference implementation. Where this document and the reference implementation disagree, the implementation is authoritative for behaviour; this document SHALL be updated to match.

---

## 2. Normative References

The following documents are indispensable for the application of this specification:

| Reference                       | Subject                                            |
|---------------------------------|----------------------------------------------------|
| ISO/IEC 14977:1996              | Extended Backus–Naur Form (EBNF) notation         |
| ISO/IEC/IEEE 15289:2019         | Information item content                          |
| ISO 8601:2019                   | Date and time format (YYYY-MM-DD)                 |
| BEST_PRACTICE_DIAGRAMS.md §5.5  | Diagram DSL design rationale and worked examples  |
| `model.py`                      | Concrete data model produced by parsing           |

---

## 3. Terms and Definitions

For the purposes of this specification, the following terms apply:

- **3.1 Diagram** — the top-level entity declared by a single `.kymo` file; corresponds to one instance of `model.Diagram`.
- **3.2 Leaf** — a single rendered element (icon + name + subtitle); the surface form for a `model.Component`. Declared as `id shape/icon/accent "Name" "Sub" [@ placement]`.
- **3.3 Container** — a brace-delimited block (`id kind … { … }`). Two flavours, distinguished by the kind keyword on the opening line:
  - **Region container** — kind ∈ `outer | inner`. Visible rectangle with a label; bounds auto-fit to its members.
  - **Layout container** — kind ∈ `horizontal | vertical`. Invisible Figma-style auto-layout frame; positions its members along the named axis.
- **3.4 Body** — the lines between a container's `{` and its matching `}`. May contain nested containers, inline leaf definitions (region body only), bare-id membership references, and grid rows (region body only).
- **3.5 Bare-id reference** — one or more whitespace-separated identifiers on a body line; declares membership without (re-)defining a leaf. The leaf must be defined elsewhere in the file.
- **3.6 Edge** — a directed arrow connecting two nodes (leaves, regions, or a mix). Always declared at file scope.
- **3.7 Anchor** — a named attachment point on a node's bounding box (`top` / `right` / `bottom` / `left` / `center`).
- **3.8 Via** — an explicit waypoint coordinate forcing an edge through a specific point.
- **3.9 Directive** — a metadata declaration (`canvas:`, `title:`, `subtitle:`) or the `external …` placement statement; file scope only.
- **3.10 Resolver** — the post-parse pass (`alignment.resolve_alignments`) that computes positions from parent/align relationships and layout containers.
- **3.11 Auto-canvas** — render-time computation of canvas dimensions when `canvas:` is omitted.
- **3.12 Contains flattening** — when a region container is nested inside another region container, the inner region's leaf members are also appended to the outer region's `contains` list so its auto-bounds envelop nested leaves. Layout containers do NOT propagate.

---

## 4. Abbreviations

| Abbreviation | Expansion                                |
|--------------|------------------------------------------|
| DSL          | Domain-Specific Language                 |
| EBNF         | Extended Backus–Naur Form (ISO 14977)    |
| SVG          | Scalable Vector Graphics                 |
| AST          | Abstract Syntax Tree                     |
| ID           | Identifier (component/region name)       |

---

## 5. Lexical Conventions

### 5.1 Encoding

Source files SHALL be UTF-8 encoded. The Byte-Order Mark (BOM) SHALL NOT appear.

### 5.2 Line Termination

A logical line is terminated by `\n`, `\r\n`, or `\r`. The parser SHALL accept any of these.

### 5.3 Whitespace

Within a line, horizontal whitespace (spaces, tabs) between tokens is insignificant except inside double-quoted strings, where it is preserved verbatim.

### 5.4 Comments

A `#` character begins a comment that extends to end of line. Exceptions:

- A `#` inside a double-quoted string is data, not a comment delimiter.
- A `#` immediately followed by a hexadecimal digit (`[0-9a-fA-F]`) is a colour literal (e.g. `#76b900`), not a comment.

### 5.5 String Literals

A string literal is delimited by ASCII double quotes (`"`). Escape sequences are NOT processed; a literal `"` may not appear inside.

### 5.6 Identifiers

```
identifier   = ( letter | "_" ) , { letter | digit | "_" } ;
letter       = "A" | … | "Z" | "a" | … | "z" ;
digit        = "0" | … | "9" ;
```

Identifiers SHALL be unique within their kind (leaf IDs unique among leaves, container IDs unique among containers). The parser MAY accept a leaf and a container sharing an ID, but edge resolution treats leaves as winning in lookups.

### 5.7 Numeric Literals

Integer literals match `-?\d+`. Floating-point literals are NOT supported.

### 5.8 Hexadecimal Colour Literals

```
hexcolour    = "#" , hexdigit , hexdigit , hexdigit , [ hexdigit , [ hexdigit , [ hexdigit , [ hexdigit , hexdigit ] ] ] ] ;
hexdigit     = digit | "a" | … | "f" | "A" | … | "F" ;
```

3-, 6-, or 8-digit hex codes are valid. The colour value is opaque to the parser; the renderer interprets it.

---

## 6. Grammar

### 6.1 Notation

EBNF per ISO/IEC 14977:1996. Italicised terms in examples are non-terminals; literal tokens are quoted. The grammar is **line-oriented**: each production matches a single logical line unless it opens a brace-delimited body.

### 6.2 Top-Level Production

```
file             = { file_line } ;
file_line        = directive | container | leaf | edge | comment | blank ;
directive        = canvas | title | subtitle | external ;
```

There is no `component` or `region` or `layout` keyword. Containers and leaves are distinguished by line shape (see clauses 6.4–6.5).

### 6.3 Metadata Directives

```
canvas           = "canvas" , [ ":" ] , INT , "x" , INT ;
title            = "title"    , ":" , STRING ;
subtitle         = "subtitle" , ":" , STRING ;
external         = "external" , id , "above" , id , [ "gap" , INT ] ;
```

`canvas:` is OPTIONAL. When absent, dimensions are auto-computed (see clause 7.4). `title:` and `subtitle:` are OPTIONAL; each MAY appear at most once per file. `external` reserves vertical space above a target leaf (see `src/layout.py`).

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
                 | "icon"           , identifier_with_hyphens ;
```

Region option order is insignificant. Each option SHALL appear at most once per region.

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
3. Line ending with `{` — container opener; kind selects region vs layout.
4. Match against the arrow forms `-->` or `==>` — edge (file scope only).
5. Second token contains `/` — leaf component.
6. All tokens match the `id` production — bare-id reference list (container body only).
7. Otherwise — syntax error.

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
                 | "curve" | "over" | "under"      (* route shorthand *)
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
label_offset  label_pos  label_at  small  dashed
auto      over        under       curve
```

These tokens SHALL NOT be used as user-defined leaf, container, or icon identifiers. Removed in v2.0: `component`, `region`, `layout` (no longer keywords — the parser distinguishes by line shape).

---

## 7. Semantics

### 7.1 Parse-time vs Resolve-time

The parser is **declarative**: it collects all leaves, containers, edges, and directives into a `model.Diagram` value WITHOUT validating cross-references or computing positions. The following are deferred to `alignment.resolve_alignments`:

1. **Auto-layouts** — leaves referenced by a layout container receive computed positions.
2. **Parent/child alignment** — leaves with `@ parent side gap` placements are positioned relative to their resolved parents.
3. **Region bounds** — region containers with non-empty `contains` lists (including IDs flattened from nested regions; see clause 3.12) compute their bounding rectangles from the positions of their members.
4. **Canvas auto-sizing** — when `canvas:` is omitted, dimensions derive from the resolved geometry plus a margin.

### 7.2 ID Resolution

Each `id` referenced (in a container body's bare-id list, edge `src`/`dst`, leaf `@ parent`) SHALL be defined elsewhere in the file. The parser does not enforce this; `alignment.resolve_alignments` raises `KeyError` on unresolved references.

### 7.3 Forward References

References MAY appear before the referenced entity is defined. The parser is order-independent for resolution purposes.

### 7.3.1 Contains Flattening

When a region container `R_inner` is nested inside another region container `R_outer`, every id in `R_inner.contains` is appended to `R_outer.contains` after the inner body closes. This is depth-first and transitive: an inner-inner region's leaves propagate up through every enclosing region. Layout containers do NOT propagate — their `contains` exists purely for positioning, not bounds.

The flattened `contains` list is consumed by `_resolve_region_bounds` (`src/alignment.py`) to compute the outer rectangle's envelope. Without flattening, the outer rect would only hug its directly-declared leaves and clip the nested region's contents.

### 7.4 Auto-Canvas

If `canvas:` is omitted (or any of its dimensions is 0), the resolver computes:

```
width  = max( component.right, region.right, edge_via.x, edge_label_pos.x ) + 30
height = max( component.bottom, region.bottom, edge_via.y, edge_label_pos.y ) + 30
```

…over all elements after resolution. The 30-px margin SHALL be applied.

### 7.5 Title Block

When `title:` and/or `subtitle:` are set, the renderer emits a fixed-height block at the top of the canvas and translates all content downward by:

```
title_block_h = top_margin + (title_cap if title) + (gap + sub_cap if subtitle) + bottom_gap
              = 24 + (18 if title) + (8 + 11 if subtitle) + 28
```

DSL coordinates therefore remain in the **content coordinate space**; the title block lives in an absolute coordinate space above it.

### 7.6 Render-Time Concerns Outside DSL

The following SHALL NOT appear in `.kymo` files:

- Output file path (controlled by `cli.py` → `TARGETS`)
- Stylesheet or icon definitions (controlled by `to_svg.py` → `STYLE`, `DEFS`)
- Target dispatch logic

The DSL describes **what** to draw; the renderer decides **how** and **where**.

---

## 8. Authoring Conventions

### 8.1 Recommended Statement Order

```
1. Metadata           title, subtitle, canvas (optional)
2. Region containers  outer/inner groupings, with leaves defined inline
                      where they semantically belong
3. Layout containers  positioning rules; reference leaves by bare id
4. Loose leaves       leaves not owned by any region (free-floating actors,
                      badges, annotations)
5. external           if a leaf sits above a grid cell
6. Edges              connections
```

This order matches the conceptual reading flow (where → how-positioned → what → how-connected). The parser is order-independent, so this is purely a stylistic recommendation.

### 8.2 Where to Define a Leaf

A leaf may be declared either at file scope or inside a region body. The guideline:

- **Inside the region** when the leaf belongs to exactly one semantic group (most common case). Vertical alignment of `id shape/icon/accent "Name" "Sub"` columns stays tight because the surrounding indentation is constant.
- **At file scope** when the leaf is a free-floating actor (e.g., end user, badge, annotation), or when it participates in multiple containers via bare-id references.

A leaf is defined **once**. To express membership in multiple containers, define the leaf in one place and reference it by bare id elsewhere. The auto-bounds resolver handles the rest.

### 8.3 Whitespace and Alignment

Authors SHOULD vertically align fields within a section for readability. The parser ignores extra whitespace.

```text
user      circle/user/blue       "Agent/User"     "Bootcamp participant"
router    hex/hex-agent/green    "Intent Router"  "Shallow / Deep"
```

### 8.4 Block Form

Containers always use the multi-line `{ … }` form. Inline `{ id1 id2 … }` on a single line is NOT supported (see clause 9.2).

### 8.5 Comment Density

Inline comments SHOULD explain **why** a non-obvious offset or via point exists, NOT what the line does. Self-evident assignments need no comments.

---

## 9. Conformance

### 9.1 Conforming Source File

A `.kymo` file is conforming if and only if:

1. It is UTF-8 encoded (clause 5.1)
2. Every non-comment, non-blank line matches one of the productions in clause 6
3. Every referenced `id` (clause 7.2) is defined within the file
4. Reserved keywords (clause 6.8) are not used as user-defined identifiers

### 9.2 Conforming Parser

A conforming parser SHALL:

1. Accept every conforming source file and produce a `model.Diagram` semantically equivalent to the reference parser
2. Reject non-conforming files with a diagnostic that includes the line number
3. Preserve string literal content verbatim
4. Not require a particular order of statements
5. Implement the `canvas:` colon-optional backward compatibility rule

A conforming parser MAY:

- Accept inline blocks (`{ id1 id2 }` on a single line) as an extension
- Emit warnings for stylistic violations (e.g., unaligned columns)

### 9.3 Conforming Renderer

Renderer conformance is outside the scope of this specification. See `to_svg.py` and BEST_PRACTICE_DIAGRAMS.md.

---

## 10. Examples

### 10.1 Minimal Diagram

```text
title: "Hello"

world outer "Hello, World" {
  greeter box/files/orange "Greeter" "" @ (100, 100)
}
```

### 10.2 Leaf With Parent Alignment

```text
orch  hex/hex-agent/green "Orchestrator" "" @ (200, 200)
child hex/hex-agent/green "Child"        "" @ orch right 60
```

### 10.3 Layout-Positioned Row

```text
row_layout horizontal pos (50, 100) gap 40 {
  one two three
}
one   box/files/orange "One"   ""
two   box/files/orange "Two"   ""
three box/files/orange "Three" ""
```

### 10.4 Nested Regions (auto-bounds enclose nested leaves)

```text
adr outer "Autonomous Deep Researcher" padding (40, 32) {
  orch       hex/hex-agent/green "Orchestrator" ""
  researcher hex/hex-agent/green "Researcher"   "Sub-Agents" @ orch right 60

  svfs inner "Shared Virtual File System" {
    fs   box/folder/orange    "File System" "Workspace" @ researcher right 100
    todo box/checklist/orange "ToDo List"   ""          @ fs right 50
  }
}
```

After parsing: `svfs.contains = ["fs", "todo"]` and `adr.contains = ["orch", "researcher", "fs", "todo"]` — the outer rect's auto-bounds envelop the inner region's leaves (clause 7.3.1).

### 10.5 Edge With Anchors and Waypoints

```text
src --> dst : "label" {
  src=bottom(0,12), dst=top(-7,0),
  via=(120,300);(220,300),
  label_offset=(0,-8), small
}
```

### 10.6 Region With Style Overrides

```text
critical inner "Critical Path"
  padding (20, 16) padding-bottom 24
  dash (0, 0) stroke #76b900
  label-position inside label-anchor middle
{
  alpha beta gamma
}
```

For full real-world examples, see [`aiq.kymo`](../samples/aiq.kymo), [`aws_1.kymo`](../samples/aws_1.kymo), and [`data.kymo`](../samples/data.kymo).

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author      | Changes              |
|---------|------------|-------------|----------------------|
| 1.0     | 2026-05-18 | Vũ Anh      | Initial specification. |
| 2.0     | 2026-05-18 | Vũ Anh      | **Breaking grammar change.** Removed `component`, `region`, `layout` keywords — the parser now disambiguates by line shape (clause 6.6). Containers nest; a region body may hold inline leaves, bare-id references, and nested containers; an outer region's `contains` is flattened from nested regions (clause 7.3.1). Added `icon` region option (was implementation-only). Reserved tokens updated (clause 6.8). |

---

## Annex B — Document Control

### B.1 Storage and Retrieval

This document is version-controlled within the project repository at `diagrams/docs/DSL.md`. The authoritative source is the working tree of the main branch; archived versions are accessible via repository history (`git log`).

### B.2 Distribution

Distribution is implicit — the document is checked in alongside the parser it specifies. Any engineer with read access to the repository has access to the current revision.

### B.3 Change Control

Changes to this specification require:

1. Update of the relevant clauses in clauses 5–9.
2. Update of the reference parser (`dsl.py`) to match.
3. Increment of `version` in the frontmatter (semantic: MAJOR for breaking grammar changes, MINOR for additions, PATCH for clarifications).
4. Append a row to **Annex A — Revision History**.
5. If a grammar production is added or modified, update the EBNF in clause 6.

### B.4 Backwards Compatibility

Grammar changes SHOULD preserve the ability to parse all conforming files of the previous MINOR version. Where a breaking change is unavoidable, the MAJOR version SHALL increment and a migration note SHALL appear in the revision history.
