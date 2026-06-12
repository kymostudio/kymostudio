# Flowchart

A flowchart shows a process as steps connected by arrows. kymo reads the
[Mermaid](https://mermaid.js.org/syntax/flowchart.html) `flowchart` / `graph`
syntax — a diagram you already have in Mermaid works unchanged.

The fastest way to try everything on this page is the
**[editor](https://editor.kymo.studio)**: pick **mermaid** in the diagram-type
dropdown, type on the left, and the preview updates live. Every example below
has a *Try it in the editor* link that opens it pre-loaded.

```mermaid
flowchart TD
    Start((Start)) --> Submit[Submit request]
    Submit --> Review{Approved?}
    Review -->|yes| Provision[Provision]
    Review -->|no| Reject[Reject]
    Provision --> Done((Done))
    Reject --> Done
```

[▶ Try it in the editor](https://editor.kymo.studio/?k=mermaid&s=eJxLy8kvT85ILCpRCHHhUgCC4BIgR0MDTGlqKujq2ikElyblZpZEQyiFotTC0tTikliIaogYSFVQallmanm1Y0FBUX5Zaop9LVgBRBSkoKYytbhGIQAomVmcmZ8XDWfFoivMy68BcrNSk0uiIRREBVwD2DqX_LxUDQ0QqakJNQCkFC7HBQCDlkXW)

![Approval flowchart rendered by kymo](/samples/approval.svg)

## Direction

The header names the diagram type (`flowchart` and `graph` are synonyms) and an
optional direction:

| Token | Flow |
|-------|------|
| `TD` / `TB` | top → bottom (default) |
| `BT` | bottom → top |
| `LR` | left → right |
| `RL` | right → left |

```mermaid
flowchart LR
    A[Source] --> B[Build]
```

## Node shapes

A node is an identifier plus an optional label wrapped in shape delimiters.
Without delimiters (`A --> B`), the node renders as a rectangle labelled with
its own id.

| Syntax | Mermaid name | kymo renders as |
|--------|--------------|-----------------|
| `A[text]` | rectangle | rectangle |
| `A(text)` | rounded | rectangle |
| `A([text])` | stadium / pill | badge (pill) |
| `A[[text]]` | subroutine | rectangle |
| `A[(text)]` | database | cylinder |
| `A((text))` | circle | circle |
| `A{text}` | decision | diamond |
| `A{{text}}` | hexagon | hexagon |
| `A>text]` | asymmetric flag | rectangle |

```mermaid
flowchart LR
    A[Rect] --> B(Rounded)
    B ==> C([Stadium])
    C -.-> D[(Database)]
    D --- E((Circle))
    E --> F{Decision}
    F -->|ok| G{{Hexagon}}
    G --> H[[Subroutine]]
```

[▶ Try it in the editor](https://editor.kymo.studio/?k=mermaid&s=eJwljL0OgyAUhXef4o440DfQpIo_QycdCQPCbUuqkiCkTbTvXopn_L5zzn22b_WUzsNtyCDmygdUXgClJVRksGHVqPOkKiiKEmrCRy-1CYs4cQ30EsuMEya9nOSGuUiCxRMKDSG1cWrG_Kw36brdGSqzGbt-E23_9LCvA7p97_EjH9GcqkuDnvMxTM4Gb1YUIvsBE9Yy6Q)

![Shape gallery rendered by kymo](/samples/flow-shapes.svg)

Labels may be double-quoted to include characters that would otherwise close
the shape: `A["a label with (parens)"]`.

> Mermaid's trapezoid (`[/ /]`, `[\ \]`) and double-circle (`((( )))`) shapes
> are not supported yet — the parser reports a syntax error.

## Links between nodes

A link is two nodes joined by an edge operator. kymo distinguishes **solid vs
dashed** and **arrow vs plain line**:

| Syntax | Meaning |
|--------|---------|
| `A --> B` | solid arrow |
| `A --- B` | solid line, no arrowhead |
| `A -.-> B` | dashed arrow |
| `A -.- B` | dashed line, no arrowhead |
| `A ==> B` | accepted; rendered as a regular solid arrow |
| `A --x B` | accepted; rendered as a solid arrow |

Label an edge either with pipes after the operator or with the inline `--`
form — both are supported:

```mermaid
flowchart TD
    A[Submit] --> B{Approved?}
    B -->|yes| C[Provision]
    B -- no --> D[Reject]
    C -.-> E[Audit log]
    D --- E
```

[▶ Try it in the editor](https://editor.kymo.studio/?k=mermaid&s=eJxLy8kvT85ILCpRCHHhUgACx-jg0qTczJJYBV1dOwWnaseCgqL8stQU-1qwtBNIuKYytbhGwTk6ACiTWZyZnxcLl1PIywdrdIkOSs1KTS6ByDgr6OoBBV2jHUtTMksUcvLTIeIuQLW6Cq5cAIRXJT4)

![Edge styles rendered by kymo](/samples/flow-links.svg)

Links chain on a single line; each operator connects the two nodes around it:

```mermaid
flowchart LR
    A --> B --> C --> D
```

> The `&` fan-out shorthand (`A & B --> C`) is not supported — write one link
> per line instead.

## Subgraphs

`subgraph … end` groups nodes into a labelled container. The id and the title
are both optional (`subgraph Title`, `subgraph id [Title]`, or a bare
`subgraph`), titles may be quoted, and subgraphs nest.

```mermaid
flowchart TB
    Start --> A
    subgraph G [Worker Pool]
        A[Fetch] --> B[Transform]
        B --> C[Write]
    end
    C --> End[Done]
```

[▶ Try it in the editor](https://editor.kymo.studio/?k=mermaid&s=eJxLy8kvT85ILCpRCHHiUgCC4BIQR1fXTsERzC8uTUovSizIUHBXiA7PL8pOLVIIyM_PiQVLgoBjtFtqSXJGLFiPU3RIUWJecVp-US5ChRNYyjk6vCizJBUinJqXAqadwVKueSnRLvl5QDkAYsQm9Q)

![Subgraph rendered by kymo](/samples/flow-subgraph.svg)

A `direction` statement inside a subgraph is accepted but ignored — the whole
diagram flows in the header direction.

## Comments

Lines starting with `%%` are comments:

```mermaid
flowchart LR
    %% this line is ignored
    A --> B
```

## Rendering from the command line

The same sources render locally with the `kymo` CLI — identical syntax, no
browser. Save as a `.mmd` (or `.mermaid`) file; the CLI ships in all three
distributions ([PyPI](https://pypi.org/project/kymostudio/),
[npm](https://www.npmjs.com/package/kymostudio),
[crates.io](https://crates.io/crates/kymostudio)):

```bash
kymo flow.mmd flow.svg        # static SVG
kymo flow.mmd flow.png        # PNG (add -s 2 for 2× resolution)
kymo flow.mmd flow.pdf        # vector PDF
```

The flowchart pipeline is format-neutral — kymo also imports
[D2](https://d2lang.com) and [Graphviz DOT](https://graphviz.org) sources
(`kymo flow.d2 flow.svg`, `kymo flow.dot flow.svg`), and exports to other
diagram-as-code formats:

```bash
kymo flow.mmd flow.d2         # D2
kymo flow.mmd flow.dot        # Graphviz DOT
kymo flow.mmd flow.drawio     # draw.io (mxGraph XML), opens in diagrams.net
kymo flow.mmd norm.mmd        # Mermaid round-trip (normalized)
kymo flow.mmd                 # .kymo.json (kymo interchange model)
```

The Python CLI additionally offers `--animate` (animated SVG), `--excalidraw`,
and `--figma` targets — see the [Getting Started guide](../guide/getting-started).

## Differences from Mermaid

kymo implements the structural core of the flowchart grammar. Styling and
interactivity directives are **not** supported and are reported as syntax
errors: `style`, `classDef`, `class`, `click`, and `linkStyle`. Keep sources to
nodes, links, subgraphs, and comments.

## See also

- [Sequence Diagram](./sequence) — the second Mermaid diagram type kymo imports.
- [Flowchart Notation (ISO 5807)](./flowchart-notation) — background reference
  on classic flowchart symbols and conventions.
- [Best Practices](./best-practices) — layout and readability guidance.
