---
title: Diagram DSL — Language Specification
document_id: DSL-LANG-001
version: "1.0"
issue_date: 2026-05-18
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers authoring or parsing `.diagram` files
review_cycle: On grammar change, or annually (whichever first)
supersedes: null
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
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-18                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers authoring or parsing `.diagram` files                |
| Review Cycle      | On grammar change, or annually (whichever first)               |
| Supersedes        | —                                                              |
| Related Documents | [`BEST_PRACTICE_DIAGRAMS.md`](./BEST_PRACTICE_DIAGRAMS.md), [`dsl.py`](./dsl.py), [`model.py`](./model.py) |

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

This document specifies the **Diagram DSL** — a textual surface language for declaring architecture diagrams. A conforming source file (`.diagram`) declares the components, regions, layouts, and edges of a single diagram. A conforming parser produces an in-memory `model.Diagram` value semantically equivalent to the source.

### 1.2 Applicability

This specification applies to:

- Source files with extension `.diagram` in this repository
- The reference parser implementation [`dsl.py`](./dsl.py)
- Any future tooling (linters, formatters, IDE plug-ins) operating on `.diagram` files

It does **not** specify:

- The SVG renderer (see [`render.py`](./render.py) and BEST_PRACTICE_DIAGRAMS.md)
- The build/dispatch system (see [`generate.py`](./generate.py))
- The graphical conventions for diagram aesthetics (see BEST_PRACTICE_DIAGRAMS.md)

### 1.3 Reference Implementation

[`dsl.py`](./dsl.py) is the normative reference implementation. Where this document and the reference implementation disagree, the implementation is authoritative for behaviour; this document SHALL be updated to match.

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

- **3.1 Diagram** — the top-level entity declared by a single `.diagram` file; corresponds to one instance of `model.Diagram`.
- **3.2 Component** — a single rendered element (icon + name + subtitle) within a diagram.
- **3.3 Region** — a labelled rectangular grouping that contains one or more components; renders as a dashed (or solid) bordered box.
- **3.4 Layout** — an invisible region whose `layout` direction (`horizontal` or `vertical`) determines the position of its children; equivalent to a Figma auto-layout frame.
- **3.5 Edge** — a directed arrow connecting two nodes (components, regions, or a mix).
- **3.6 Anchor** — a named attachment point on a node's bounding box (`top` / `right` / `bottom` / `left` / `center`).
- **3.7 Via** — an explicit waypoint coordinate forcing an edge through a specific point.
- **3.8 Directive** — a metadata declaration (`canvas:`, `title:`, `subtitle:`) at file scope.
- **3.9 Resolver** — the post-parse pass (`alignment.resolve_alignments`) that computes positions from parent/align relationships and layout regions.
- **3.10 Auto-canvas** — render-time computation of canvas dimensions when `canvas:` is omitted.

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

Identifiers SHALL be unique within their kind (component IDs unique among components, region IDs unique among regions). The parser MAY accept a component and a region sharing an ID, but edge resolution treats components as winning in lookups.

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

EBNF per ISO/IEC 14977:1996. Italicised terms in examples are non-terminals; literal tokens are quoted.

### 6.2 Top-Level Production

```
file         = { line } ;
line         = directive | block | statement | comment | blank ;
directive    = canvas | title | subtitle ;
block        = region_block | layout_block ;
statement    = component | edge ;
```

### 6.3 Metadata Directives

```
canvas       = "canvas" , [ ":" ] , INT , "x" , INT ;
title        = "title"    , ":" , STRING ;
subtitle     = "subtitle" , ":" , STRING ;
```

`canvas:` is OPTIONAL. When absent, dimensions are auto-computed (see clause 7.4). `title:` and `subtitle:` are OPTIONAL; each MAY appear at most once per file.

### 6.4 Components

```
component        = "component" , id , shape , "/" , icon , "/" , accent ,
                   STRING , STRING , [ "@" , placement ] ;
placement        = absolute_pos | parent_ref ;
absolute_pos     = "(" , INT , "," , INT , ")" ;
parent_ref       = id , side , [ INT ] ;
side             = "top" | "right" | "bottom" | "left" ;
shape            = "circle" | "cube" | "cube-big" | "box" | "cylinder" |
                   "hex" | "annotation" | "aws-tile" | "aws-tile-hero" | "badge" ;
icon             = identifier_with_hyphens ;
accent           = "green" | "orange" | "blue" ;
```

When `@` is omitted, `pos` defaults to `(0, 0)` and the component is expected to be positioned by a layout region containing its ID.

### 6.5 Regions

```
region_block     = "region" , id , region_style , STRING ,
                   { region_opt } , "{" , { id } , "}" ;
region_style     = "outer" | "inner" ;
region_opt       = "padding"        , "(" , INT , "," , INT , ")"
                 | "padding-bottom" , INT
                 | "dash"           , "(" , INT , "," , INT , ")"
                 | "stroke"         , hexcolour
                 | "label-position" , ( "above" | "inside" )
                 | "label-anchor"   , ( "start" | "middle" | "end" ) ;
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

### 6.6 Layouts

```
layout_block     = "layout" , id , direction , "pos" , "(" , INT , "," , INT , ")" ,
                   "gap" , INT , [ "align" , ( "start" | "middle" | "end" ) ] ,
                   "{" , { id } , "}" ;
direction        = "horizontal" | "vertical" ;
```

A layout block declares an INVISIBLE region (no border or label rendered) whose sole purpose is to position the components named in its body.

### 6.7 Edges

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
                 | "route"        , "=" , ( "auto" | "over" | "under" | "curve" )
                 | "small"
                 | "curve" | "over" | "under"      (* route shorthand *)
                 ;
anchor_spec      = side_or_centre , [ "(" , INT , "," , INT , ")" ] ;
side_or_centre   = side | "center" ;
point            = "(" , INT , "," , INT , ")" ;
```

### 6.8 Reserved Keywords

```
canvas    title       subtitle
component region      layout
outer     inner       horizontal  vertical
padding   padding-bottom  dash    stroke
label-position label-anchor
above     inside
top       right       bottom      left      center
start     middle      end
src       dst         via         route
label_offset  label_pos  small
auto      over        under       curve
```

These tokens SHALL NOT be used as component, region, layout, or icon identifiers.

---

## 7. Semantics

### 7.1 Parse-time vs Resolve-time

The parser is **declarative**: it collects all components, regions, edges, and directives into a `model.Diagram` value WITHOUT validating cross-references or computing positions. The following are deferred to `alignment.resolve_alignments`:

1. **Auto-layouts** — components named in `layout` regions receive computed positions.
2. **Parent/child alignment** — components with `@ parent side gap` placements are positioned relative to their resolved parents.
3. **Region bounds** — visible regions with non-empty `contains` lists compute their bounding rectangles from the positions of their members.
4. **Canvas auto-sizing** — when `canvas:` is omitted, dimensions derive from the resolved geometry plus a margin.

### 7.2 ID Resolution

Each `id` referenced (in region/layout `contains`, edge `src`/`dst`, component `@ parent`) SHALL be defined elsewhere in the file. The parser does not enforce this; `alignment.resolve_alignments` raises `KeyError` on unresolved references.

### 7.3 Forward References

References MAY appear before the referenced entity is defined. The parser is order-independent for resolution purposes.

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

The following SHALL NOT appear in `.diagram` files:

- Output file path (controlled by `generate.py` → `TARGETS`)
- Stylesheet or icon definitions (controlled by `render.py` → `STYLE`, `DEFS`)
- Target dispatch logic

The DSL describes **what** to draw; the renderer decides **how** and **where**.

---

## 8. Authoring Conventions

### 8.1 Recommended Statement Order

```
1. Metadata           title, subtitle, canvas (optional)
2. Regions            outer/inner groupings (scaffolding)
3. Layouts            auto-positioning rules
4. Components         members of the diagram
5. Edges              connections
```

This order matches the conceptual reading flow (where → how-positioned → what → how-connected). The parser is order-independent, so this is purely a stylistic recommendation.

### 8.2 Whitespace and Alignment

Authors SHOULD vertically align fields within a section for readability. The parser ignores extra whitespace.

```text
component user        circle/user/blue          "Agent/User"          "Bootcamp participant"
component router      hex/hex-agent/green       "Intent Router"       "Shallow / Deep"
```

### 8.3 Block vs Single-Line Form

`region` and `layout` blocks always use the multi-line `{ … }` form. Inline `{ id1 id2 … }` is NOT supported (see clause 9.2).

### 8.4 Comment Density

Inline comments SHOULD explain **why** a non-obvious offset or via point exists, NOT what the line does. Self-evident assignments need no comments.

---

## 9. Conformance

### 9.1 Conforming Source File

A `.diagram` file is conforming if and only if:

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

Renderer conformance is outside the scope of this specification. See `render.py` and BEST_PRACTICE_DIAGRAMS.md.

---

## 10. Examples

### 10.1 Minimal Diagram

```text
title: "Hello"

region world outer "Hello, World" { greeter }

component greeter box/files/orange "Greeter" "" @ (100, 100)
```

### 10.2 Component With Parent Alignment

```text
component orch      hex/hex-agent/green   "Orchestrator" "" @ (200, 200)
component child     hex/hex-agent/green   "Child"        "" @ orch right 60
```

### 10.3 Layout-Positioned Row

```text
layout row horizontal pos (50, 100) gap 40 {
  one two three
}
component one   box/files/orange  "One"   ""
component two   box/files/orange  "Two"   ""
component three box/files/orange  "Three" ""
```

### 10.4 Edge With Anchors and Waypoints

```text
src --> dst : "label" {
  src=bottom(0,12), dst=top(-7,0),
  via=(120,300);(220,300),
  label_offset=(0,-8), small
}
```

### 10.5 Region With Style Overrides

```text
region critical inner "Critical Path"
  padding (20, 16) padding-bottom 24
  dash (0, 0) stroke #76b900
  label-position inside label-anchor middle
{
  alpha beta gamma
}
```

For a full real-world example, see [`aiq.diagram`](./aiq.diagram).

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author      | Changes              |
|---------|------------|-------------|----------------------|
| 1.0     | 2026-05-18 | Vũ Anh      | Initial specification. |

---

## Annex B — Document Control

### B.1 Storage and Retrieval

This document is version-controlled within the project repository at `diagrams/DSL.md`. The authoritative source is the working tree of the main branch; archived versions are accessible via repository history (`git log`).

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
