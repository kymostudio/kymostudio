# Flowchart — Research Reference

This is a **research reference on the flowchart**, the oldest and most widely used diagram for representing a process, algorithm, or workflow as a sequence of steps connected by directed flowlines. Its symbol vocabulary is standardised internationally as **ISO 5807:1985** and nationally as **ANSI X3.5** (and the related ISO 1028 / ECMA-4). It is **descriptive, not normative** — where this note and ISO 5807 disagree, ISO 5807 is authoritative. No code or behaviour in this repository depends on the flowchart standard; this document exists so the team can hold accurate vocabulary and structure when discussing process and algorithm diagrams, and when reasoning about the [Mermaid](https://mermaid.js.org) `flowchart` source the engine imports (the kymo mapping is `MERMAID-MAP-001`, **not** this note).

Structured per ISO/IEC/IEEE 15289:2019 (information item content). Dates per ISO 8601:2019.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Standard References](#2-standard-references)
3. [Terms and Definitions](#3-terms-and-definitions)
4. [Abbreviations](#4-abbreviations)
5. [History and Standardisation](#5-history-and-standardisation)
6. [Symbol Taxonomy — Overview](#6-symbol-taxonomy--overview)
7. [Flow Symbols](#7-flow-symbols)
8. [Connectors and Flowlines](#8-connectors-and-flowlines)
9. [Specialised Symbols](#9-specialised-symbols)
10. [Cross-Functional (Swimlane) Flowcharts](#10-cross-functional-swimlane-flowcharts)
11. [Control-Flow Constructs](#11-control-flow-constructs)
12. [Flowchart Variants and Related Notations](#12-flowchart-variants-and-related-notations)
13. [Tooling and Ecosystem](#13-tooling-and-ecosystem)
14. [References](#14-references)
- [Annex A — Revision History](#annex-a--revision-history)
- [Annex B — Document Control](#annex-b--document-control)

---

## 1. Scope

### 1.1 Purpose

This document records the structure and vocabulary of the **flowchart** as a research reference. It is intended for engineers who need to (a) read existing flowcharts, (b) reason about how flowchart notation differs from process notation (BPMN, see `REF-BPMN-001`) and from architecture-diagram notation (see `BPD-DGM-001`), and (c) hold accurate terminology when discussing algorithms, control flow, and step-by-step procedures.

### 1.2 What this document is — and is not

- **Is** — a descriptive summary of the flowchart's symbol taxonomy, connector conventions, control-flow constructs, and standardisation history, with citations to the authoritative sources.
- **Is not** — the ISO 5807 / ANSI X3.5 standard itself (see [§2](#2-standard-references)); a tutorial on *authoring* flowcharts in this repository's tooling. The kymo engine imports the **Mermaid** `flowchart`/`graph` family and maps it to the kymo model — that mapping (node-shape and edge correspondence, supported subset, known gaps) is `MERMAID-MAP-001`. Mapping the classic ISO symbol set onto the kymo DSL is out of scope here.

### 1.3 Sources and method

Facts in this note are drawn from ISO 5807:1985 and ANSI X3.5, cross-checked against widely used vendor references (Lucidchart, draw.io / diagrams.net, Microsoft Visio) and the Mermaid project documentation. Where a claim is contested or tool-specific, the ISO/ANSI source is treated as authoritative and the others as informative. See [§14](#14-references).

---

## 2. Standard References

The following documents are indispensable for understanding the subject of this note:

| Reference                    | Subject                                                                 |
|------------------------------|-------------------------------------------------------------------------|
| ISO 5807:1985                | Information processing — Documentation symbols and conventions for data, program and system flowcharts, program network charts and system resources charts. |
| ANSI X3.5 (1970)             | Flowchart Symbols and Their Usage in Information Processing (US national antecedent of ISO 5807). |
| ECMA-4 / ISO 1028            | Earlier flowchart-symbol conventions superseded by ISO 5807.            |
| ISO/IEC/IEEE 15289:2019      | Information item content (structure of this document).                  |
| ISO 8601:2019                | Date and time format (YYYY-MM-DD).                                      |

ISO 5807:1985 consolidates several earlier national and ECMA conventions into one international symbol set covering **data flowcharts, program flowcharts, system flowcharts, program network charts, and system-resources charts**. The everyday "flowchart" is the *program flowchart* subset; this note focuses there.

---

## 3. Terms and Definitions

For the purposes of this note, the following terms apply (after ISO 5807):

- **3.1 Flowchart** — a graphical representation of a process or algorithm in which steps are drawn as symbols and the order of execution is shown by flowlines connecting them.
- **3.2 Flowline (flow line)** — a line representing the flow of control or data from one symbol to the next; direction is shown by an arrowhead.
- **3.3 Terminal** — a symbol marking the start or end of a process (the entry and exit points); drawn as a rounded rectangle / stadium ("pill") or oval.
- **3.4 Process** — a symbol representing a defined operation or group of operations that change value, form, or location of data; drawn as a rectangle.
- **3.5 Decision** — a symbol representing a choice that selects one of several alternative flow paths based on a condition; drawn as a diamond (rhombus).
- **3.6 Input/Output (Data)** — a symbol representing the making of data available for processing, or the recording of processed information; drawn as a parallelogram.
- **3.7 Predefined process** — a symbol representing a named operation defined elsewhere (e.g. a subroutine); drawn as a rectangle with doubled vertical edges.
- **3.8 Connector** — a symbol joining two otherwise-broken flowlines on the same page (on-page connector) or across pages (off-page connector).
- **3.9 Annotation** — explanatory commentary attached to a symbol, adding description without affecting flow.
- **3.10 Swimlane (band)** — a partition of a flowchart grouping steps by the actor, role, or system that performs them (a *cross-functional* or *deployment* flowchart).
- **3.11 Branch** — a point at which flow diverges into two or more alternative paths (from a decision).
- **3.12 Loop** — a control structure in which a path returns to an earlier point so a sequence of steps repeats while (or until) a condition holds.

---

## 4. Abbreviations

| Abbreviation | Expansion                                              |
|--------------|--------------------------------------------------------|
| ISO          | International Organization for Standardization          |
| ANSI         | American National Standards Institute                   |
| ASME         | American Society of Mechanical Engineers                |
| ECMA         | European Computer Manufacturers Association             |
| DFD          | Data Flow Diagram                                       |
| NSD          | Nassi–Shneiderman Diagram (structured flowchart)        |
| UML          | Unified Modeling Language                                |
| BPMN         | Business Process Model and Notation                     |

---

## 5. History and Standardisation

- **1921** — Frank and Lillian **Gilbreth** present the "Process Charts: First Steps in Finding the One Best Way to do Work" to the ASME. Their flow-process-chart symbols are the direct ancestors of the flowchart and are absorbed into industrial-engineering practice.
- **1947** — Herman **Goldstine** and John **von Neumann** popularise the "flow diagram" for describing computer programs in *Planning and Coding of Problems for an Electronic Computing Instrument*; the decision diamond and box-and-arrow algorithm notation enter computing.
- **1940s–1950s** — ASME standardises the industrial process-chart symbols; flowcharting becomes the dominant tool for documenting computer programs.
- **1963** — ASA (later ANSI) issues an early flowchart-symbol standard; ECMA publishes **ECMA-4**.
- **1970** — **ANSI X3.5** "Flowchart Symbols and Their Usage in Information Processing" fixes the US symbol set (terminal, process, decision, I/O, predefined process, connectors, etc.).
- **1985** — **ISO 5807:1985** consolidates the national/ECMA conventions into a single international standard covering data, program, and system flowcharts; it remains the authoritative symbol reference.
- **1970s–1980s** — Structured-programming critique (Böhm–Jacopini; Dijkstra) discourages unrestricted `goto`-style flowcharts and motivates **Nassi–Shneiderman** structured flowcharts. Flowcharts decline in formal software design but persist for documentation and teaching.
- **2010s–present** — Text-to-diagram tools (notably **Mermaid**'s `flowchart`/`graph`) revive flowcharts as *diagram-as-code*, generating the classic symbols from a compact textual grammar — the form the kymo engine imports (`MERMAID-MAP-001`).

The flowchart endures because it is approachable: the symbol set is small, the reading order is explicit, and a decision diamond expresses branching that prose cannot make unambiguous.

---

## 6. Symbol Taxonomy — Overview

ISO 5807 organises flowchart symbols into a small set of categories. Almost every shape in a program flowchart belongs to one of these.

| Category              | Members                                                        | Role                                                        |
|-----------------------|----------------------------------------------------------------|-------------------------------------------------------------|
| **Flow symbols**      | Terminal, Process, Decision, Input/Output                      | The behavioural nodes — start/end, work, choice, data.      |
| **Connecting**        | Flowline, On-page connector, Off-page connector                | The links between nodes — order of execution, page joins.   |
| **Specialised**       | Predefined process, Document, Manual operation, Preparation, Data, Display, Delay | Refinements of "process" / "I/O" for specific operations.   |
| **Annotation / lanes**| Comment/annotation, Swimlane band                              | Documentation and actor-partitioning that do not change flow. |

The four **flow symbols** ([§7](#7-flow-symbols)) carry the algorithm; the connectors ([§8](#8-connectors-and-flowlines)) define its order; the specialised symbols ([§9](#9-specialised-symbols)) annotate *how* a step is performed.

---

## 7. Flow Symbols

The four core symbols are sufficient to express any program flowchart.

| Symbol            | Shape                              | Meaning                                                                          |
|-------------------|------------------------------------|----------------------------------------------------------------------------------|
| **Terminal**      | rounded rectangle / stadium (oval) | Start or end of the process — the single entry and the exit point(s).            |
| **Process**       | rectangle                          | A defined operation or step that changes a value, form, or location of data.     |
| **Decision**      | diamond (rhombus)                  | A condition with two or more labelled exits (e.g. *Yes* / *No*); selects one path.|
| **Input/Output**  | parallelogram                      | Data entering (input) or leaving (output) the process — read, write, display.     |

Conventions:

- A program flowchart has **exactly one** start terminal and at least one end terminal.
- A **decision** is the only symbol that legitimately has multiple outgoing flowlines; each exit is labelled with the condition value that selects it.
- Every other symbol has **one** incoming and **one** outgoing flowline (a process that needs to branch routes through a decision).

---

## 8. Connectors and Flowlines

| Connector              | Appearance                         | Connects / means                                                          |
|------------------------|------------------------------------|---------------------------------------------------------------------------|
| **Flowline**           | solid line with an arrowhead       | The order of execution from one symbol to the next.                       |
| **On-page connector**  | small circle with a label          | Joins two flowlines broken on the **same** page (avoids crossing lines).  |
| **Off-page connector** | pentagon / "home-plate" with a label | Continues a flowline onto **another** page (matching labels pair up).     |

Conventions:

- The default reading direction is **top-to-bottom** and **left-to-right**; an arrowhead is mandatory whenever flow runs against that default (e.g. a loop-back upward).
- Flowlines should not cross where a connector can avoid it; matching connector labels (`A`, `B`, …) reconnect the broken ends.
- A single flowline carries control between exactly two symbols; merging is shown by two flowlines arriving at one symbol.

---

## 9. Specialised Symbols

These refine the generic **process** and **input/output** symbols for particular kinds of operation. They are optional — a valid flowchart can be drawn with the four core symbols alone — but they add documentary precision.

| Symbol                | Shape                                         | Meaning                                                          |
|-----------------------|-----------------------------------------------|------------------------------------------------------------------|
| **Predefined process**| rectangle with doubled vertical edges         | A named subroutine / sub-process defined elsewhere.              |
| **Preparation**       | hexagon                                        | Set-up before a process group — initialise, set a switch/index. |
| **Document**          | rectangle with a wavy bottom edge             | Output rendered as a (printable) document.                      |
| **Multiple documents**| stacked wavy-bottom rectangles                | Several documents.                                              |
| **Manual operation**  | trapezoid (wider at top)                       | A step performed by a person, not the machine.                  |
| **Manual input**      | rectangle with a sloped top edge              | Data entered by hand at the time of processing (e.g. a keyboard).|
| **Data (I/O)**        | parallelogram                                 | Generic input/output (the core I/O symbol; see [§7](#7-flow-symbols)). |
| **Stored data**       | cylinder / drum                               | Data held in storage (a database or file).                     |
| **Display**           | rounded shape open on one side                | Output shown on a screen.                                       |
| **Delay**             | half-rounded ("D"-shaped) rectangle           | A waiting period in the process.                                |

Tool note: most modern tools (including Mermaid) implement a working subset of these — typically terminal, process, decision, I/O, subroutine, and database — and map the rest onto the nearest core shape. The kymo importer's exact shape correspondence is in `MERMAID-MAP-001` §3.

---

## 10. Cross-Functional (Swimlane) Flowcharts

A **cross-functional** (or *deployment*) flowchart partitions the chart into **swimlanes** — parallel bands, each labelled with the actor, role, department, or system responsible for the steps drawn inside it. The flow still runs through the symbols as usual; the lane a symbol sits in adds *who performs it*.

- **Horizontal bands** read the process top-to-bottom with responsibility shown by row; **vertical bands** (columns) read left-to-right.
- A flowline crossing a lane boundary signals a **hand-off** between actors — the cross-functional view's main analytical payoff.
- Swimlanes are an organisational overlay only; they do not change the execution order, just as flowchart annotations do not.

This convention is shared with, and generalised by, BPMN's **pools and lanes** (`REF-BPMN-001` §12). The difference: BPMN gives lanes precise execution and messaging semantics (sequence flow may not cross a pool; message flow must), whereas a flowchart swimlane is purely descriptive.

---

## 11. Control-Flow Constructs

Structured programming reduces all control flow to three constructs; each has a canonical flowchart shape. A flowchart built only from these (no arbitrary `goto`) is a **structured flowchart** and maps cleanly to code.

| Construct             | Flowchart shape                                                              | Code analogue              |
|-----------------------|------------------------------------------------------------------------------|----------------------------|
| **Sequence**          | symbols stacked, single flowline through each.                              | statement; statement       |
| **Selection**         | a **decision** diamond with two exits that rejoin at a merge point.         | `if / else`, `switch/case` |
| **Iteration**         | a **decision** whose *true* branch runs a body and loops a flowline back to before the test (pre-test) or after it (post-test). | `while`, `do…until`, `for` |

- **Pre-test loop** (`while`) — the decision is at the top; the body may run zero times.
- **Post-test loop** (`do…until`) — the body runs first, the decision is at the bottom; the body runs at least once.
- **Multi-way selection** (`case`) — a decision with more than two labelled exits, or a chain of decisions.

The Böhm–Jacopini theorem (1966) guarantees these three constructs suffice to express any computable control flow — the formal basis for discouraging unstructured `goto` flowcharts and for the Nassi–Shneiderman structured-flowchart variant ([§12](#12-flowchart-variants-and-related-notations)).

---

## 12. Flowchart Variants and Related Notations

| Notation                          | What it shows                                                                       | Use a flowchart instead when…                                              |
|-----------------------------------|-------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| **Data Flow Diagram (DFD)**       | How data *moves* between processes and stores — not the order of execution.          | You care about *sequence and decisions*, not data dependency.              |
| **Nassi–Shneiderman (NSD)**       | A structured flowchart drawn as nested boxes, with no flowlines (no `goto` possible).| You need free-form branching or a familiar symbol set, not enforced nesting.|
| **UML Activity Diagram**          | Object-oriented workflow with forks/joins, partitions, and object flow.             | The process is simple and procedural, without concurrency or OO semantics.  |
| **BPMN** (`REF-BPMN-001`)         | Business processes with events, gateways, pools/lanes, and executable token semantics.| The audience is technical and the process is an algorithm, not a multi-party business process. |
| **Sequence / state diagrams**     | Message order over time; state transitions.                                          | You are tracing one thread of *control* through steps and choices.          |

**Rule of thumb.** Reach for a flowchart for an **algorithm, decision logic, or a single-actor procedure** where the audience values a small, universally understood symbol set. Reach for BPMN when **multiple participants exchange messages** and execution semantics matter; reach for a DFD when **data movement**, not control order, is the question.

---

## 13. Tooling and Ecosystem

Flowcharts are supported by virtually every diagramming tool; the relevant ones for this project each have a per-tool reference note under [`docs/softwares/`](../../softwares/):

- **Diagram-as-code** — [Mermaid](../../softwares/a.mermaid.md) (`REF-MERMAID-001`): the `flowchart` / `graph` grammar renders the classic symbols from text. This is the flowchart source the kymo engine imports; the syntax-to-model mapping, supported node shapes and edge operators, and the Phase-1 gaps are documented in `MERMAID-MAP-001`.
- **Interactive editors** — [draw.io / diagrams.net](../../softwares/a.drawio.md) (`REF-DRAWIO-001`), [Lucidchart](../../softwares/a.lucidchart.md) (`REF-LUCIDCHART-001`), and Microsoft Visio: drag-and-drop canvases with full ISO 5807 stencils and swimlane support.

Because the symbol set is standardised, a flowchart authored in one tool is generally legible in any other; only the specialised symbols ([§9](#9-specialised-symbols)) and swimlane styling vary in practice.

**kymo's flowchart support.** The kymo engine treats the flowchart as a small conversion hub around a format-neutral IR (`crate::flowchart`). It **imports** Mermaid (`MERMAID-MAP-001`), D2 (`D2-MAP-001`), and Graphviz DOT (`DOT-MAP-001`); **emits** Mermaid / D2 / DOT text from the IR; **encodes** to draw.io mxGraph XML (`DRAWIO-MAP-001`); and renders to SVG with its own pure-Rust renderer — so `kymo flow.{mmd,d2,dot} flow.svg` and `kymo flow.mmd flow.{d2,dot,drawio}` work without any external binary. The hub is specified under `FEAT-FLOWCHART-001` (modules `FEAT-FLOWCHART-{D2,DOT,SVG}-001`); the source-agnostic draw.io encoder is `FEAT-PIPECLI-DRAWIO-001`. draw.io *import* (`.drawio` → SVG) is a separate path — `FEAT-DRAWIO-001` and the ad-hoc `tools/drawio-to-svg.py`.

---

## 14. References

**Normative**

1. ISO 5807:1985 — *Information processing — Documentation symbols and conventions for data, program and system flowcharts, program network charts and system resources charts.* <https://www.iso.org/standard/11955.html>
2. ANSI X3.5 (1970) — *Flowchart Symbols and Their Usage in Information Processing.*
3. ISO/IEC/IEEE 15289:2019 — *Content of life-cycle information items (documentation).*
4. ISO 8601:2019 — *Date and time — Representations for information interchange.*

**Informative**

5. Goldstine, H. H., & von Neumann, J. *Planning and Coding of Problems for an Electronic Computing Instrument.* Institute for Advanced Study, 1947.
6. Böhm, C., & Jacopini, G. "Flow Diagrams, Turing Machines and Languages with Only Two Formation Rules." *Communications of the ACM*, 1966.
7. Mermaid — *Flowcharts: Basic Syntax.* <https://mermaid.js.org/syntax/flowchart.html>
8. Lucidchart. *Flowchart Symbols and Notation.* <https://www.lucidchart.com/pages/flowchart-symbols-meaning-explained>

---

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes                              |
|---------|------------|--------|--------------------------------------|
| 1.0     | 2026-06-08 | Vũ Anh | Initial flowchart notation reference. |
| 1.1     | 2026-06-09 | Vũ Anh | §13: added "kymo's flowchart support" — import (Mermaid/D2/DOT), text emit, draw.io encode, pure-Rust SVG render; pointers to `FEAT-PIPECLI-001` modules + format mappings. |

---

## Annex B — Document Control

### B.1 Storage and Retrieval

This document is version-controlled within the project repository at `docs/diagrams/flowchart/README.md`. The authoritative source is the working tree of the main branch; archived versions are accessible via repository history (`git log`).

### B.2 Distribution

Distribution is implicit — the document is checked in alongside the repository's other reference notes. Any engineer with read access to the repository has access to the current revision.

### B.3 Change Control

Changes to this reference require:

1. Update of the relevant clauses in [§5](#5-history-and-standardisation)–[§13](#13-tooling-and-ecosystem) to reflect the cited sources.
2. Re-verification of any altered fact against the ISO 5807 / ANSI X3.5 source of record (see [§2](#2-standard-references)).
3. Increment of `version` in Annex A (semantic: MAJOR for a new symbol-standard edition, MINOR for added sections, PATCH for corrections).
4. Append a row to **Annex A — Revision History**.

### B.4 Review

This document is reviewed on a change to the flowchart symbol standard, or annually — whichever comes first. As a descriptive reference, it tracks the upstream standard; it introduces no requirements of its own.
