---
title: "BPMN 2.0.2 — Annex B: Diagram Interchange"
document_id: BPMN-NREF-ANNEXB-001
version: "1.3"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-NOTATION-001 # Clause 12 — BPMN DI (the BPMN specialisation)
  - BPMN-NREF-EXCHANGE-001 # Clause 15 — Exchange Formats
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - diagram-interchange
  - diagram-definition
  - dc
  - di
  - dg
  - layout
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
upstream:
  project: OMG Business Process Model and Notation (BPMN)
  specification: https://www.omg.org/spec/BPMN/2.0.2/PDF
  iso_equivalent: ISO/IEC 19510:2013
  version_reviewed: "2.0.2 (OMG, December 2013) / ISO/IEC 19510:2013"
  access_date: 2026-05-24
---

# BPMN 2.0.2 — Annex B: Diagram Interchange

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-ANNEXB-001                                       |
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **Annex B — Diagram Interchange** *(non-normative)* (pp.481–498) |
| Related Documents | `BPMN-NREF-NOTATION-001`, `BPMN-NREF-EXCHANGE-001` |

Mirrors **Annex B (Diagram Interchange)** — a **non-normative** annex — of the OMG BPMN 2.0.2
specification (§B.1–§B.4, pp.481–498). It documents the shared OMG **Diagram Definition (DD)**
framework that Clause 12's BPMN DI specialises. Part of the normative-reference set
`BPMN-NREF-001`. Where this note and the OMG specification disagree, the OMG specification is
authoritative.

> **Normative wording.** This file states the **normative wording** for Annex B of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 Annex B; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §B.1 Scope (p.481)
Documents a relevant subset of an **alpha version** of a **Diagram Definition (DD)**
specification referenced by BPMN DI (Clause 12, `BPMN-NREF-NOTATION-001`). The DD spec was
still in submission/approval; a future BPMN revision may replace this annex with a reference to
the adopted DD. DD provides a basis for modelling and interchanging graphical notations —
specifically **node-and-edge style diagrams** as in BPMN, UML and SysML — tied to abstract
language syntaxes defined with **MOF**. It addresses the Diagram Definition RFP (`ad/2007-09-02`).

## §B.2 Architecture (pp.481–483)
DD distinguishes two kinds of graphical information by whether language users **control** it:
- **Interchanged** — what users control (node positions, line routing points).
- **Not interchanged** — what they do not (shape/line styles, identical across all diagrams of
  a language).

Two models capture this — **Diagram Interchange (DI)** and **Diagram Graphics (DG)** — sharing
the **Diagram Common (DC)** model. **Fig B.1 (Diagram Definition Architecture)** lays them out
MVC-style across MOF levels (M3/M2/M1): *Abstract Syntax (AS)* + *AS DI* on the left
(*Model — interchanged*), the *CS Mapping Specification* in the middle (*Controller — executed*,
expressed in QVT by way of example, no mapping language mandated), and *DG* on the right
(*View — rendered*). DI elements specialise the abstract DI; the spec provides **normative CMOF
and XSD artifacts** for DI and DG. **In BPMN, only diagram interchange is realised** — so this
annex documents the **DI** package plus the relevant **DC** subset; **DG is not provided**.

## §B.3 Diagram Common (DC) (pp.483–486)
DC holds primitive and structured data types used by DI (some modelled on **CSS / SVG / ODF**
types); DC itself depends on no other package (§B.3.1 Overview). **§B.3.2 Abstract Syntax** —
the four primitive types (Fig B.2): **String**, **Boolean**, **Integer**, **Real**. **§B.3.3
Classifier Descriptions:**

| §B.3.3.x | Type | Definition |
|---|---|---|
| .1 | **Boolean** [PrimitiveType] | logical truth value (`true`/`false`). |
| .2 | **Bounds** [PrimitiveType] | an area in an (x, y) coordinate system: `x`, `y` (top-left), `width`, `height` — all `Real [1]` (Fig B.3). |
| .3 | **Font** [PrimitiveType] | `name: String [0..1]`, `size: Real [0..1]`, `isBold`/`isItalic`/`isUnderline`/`isStrikeThrough: Boolean [0..1]` (Fig B.4). |
| .4 | **Integer** [PrimitiveType] | the mathematical integers. |
| .5 | **Point** [DataType] | a location: `x`, `y: Real = 0`; origin (0,0) (Fig B.3). |
| .6 | **Real** [PrimitiveType] | the real numbers (integers are also Reals). |
| .7 | **String** [PrimitiveType] | a sequence of characters (ASCII or Unicode). |

## §B.4 Diagram Interchange (DI) (pp.487–497)
**§B.4.1 Overview** — DI types define diagram-interchange models; the package imports DC
(Fig B.5) and is **mostly abstract**, serving as a *framework* extended by concrete types in
domain-specific DI packages (BPMN DI being one). Design best practices: **minimise redundancy**
with the depicted model (diagram elements **reference** their model counterparts rather than
duplicate data — coupling diagram to domain model); avoid storing data derivable/non-user-
changeable; leave 1-n vs m-n relationships, interchangeable style properties, and pragmatic
redundancy to the domain packages.

**§B.4.2 Abstract Syntax** — Figs B.5 (DI ⟶ DC dependency), B.6 (DiagramElement), B.7 (Node),
B.8 (Edge), B.9 (Diagram), B.10 (Plane), B.11 (Labeled Edge), B.12 (Labeled Shape), B.13 (Shape).

**§B.4.3 Classifier Descriptions:**

| §B.4.3.x | Class | Specializes | Key members |
|---|---|---|---|
| .1 | **Diagram** | — | `name: String [0..1]`, `documentation: String [0..1]`, `resolution: Real [0..1]` (UPI printing); assoc. `/rootElement: DiagramElement [1]`, `/ownedStyle: Style [*]` (Fig B.9). |
| .2 | **DiagramElement** *(abstract)* | — | supertype of Node & Edge; may **depict** a `/modelElement: Element [0..1]` or be purely notational; `/owningDiagram [0..1]`, `/owningElement [0..1]`, `/ownedElement [*]`, `/style: Style [0..1]` (all `{readOnly, union}`). |
| .3 | **Edge** *(abstract)* | DiagramElement | a polyline between a source and target; `waypoint: Point [2..*] {ordered, nonunique}`; `/source [0..1]`, `/target [0..1]` (set only if not derivable) (Figs B.8, B.11). |
| .4 | **Label** | Node | a node owned by another element, depicting a (usually textual) aspect in its own `bounds: Bounds` (optional — default position if unset) (Figs B.11, B.12). |
| .5 | **LabeledEdge** | Edge | owns `/ownedLabel: Label [*] {subsets ownedNode}` (Fig B.11). |
| .6 | **LabeledShape** | Shape | owns `/ownedLabel: Label [*]` (Fig B.12). |
| .7 | **Node** *(abstract)* | DiagramElement | a vertex; no intrinsic layout (specialised by Label, Shape, Plane) (Figs B.7, B.10–B.13). |
| .8 | **Plane** | Node | a node with **infinite** bounds owning `/planeElement: DiagramElement [*]` **ordered = Z-order**; origin (0,0), x left→right, y top→bottom (Fig B.10). |
| .9 | **Shape** | Node | a node with `bounds: Bounds [1]` relative to the plane origin (Figs B.13, B.12). |
| .10 | **Style** *(abstract)* | — | a bag of formatting properties (font/fill/stroke) affecting *appearance not semantics*; shared by elements to cut footprint; concrete styles left to domain DI (Figs B.6, B.9). |

The BPMN specialisation of these DI/DC classes (`BPMNShape`, `BPMNEdge`, `BPMNPlane`,
`BPMNLabel`, `BPMNLabelStyle`, the participant-band/marker flags) is in Clause 12,
`BPMN-NREF-NOTATION-001`; the file-level serialisation is in Clause 15,
`BPMN-NREF-EXCHANGE-001`. The model/diagram split is discussed in `REF-BPMN-001 §16`.

## Annex A — Revision History

| Version | Date       | Author | Changes                       |
|---------|------------|--------|-------------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — BPMN Annex B. |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: rebuilt the annex to mirror the actual non-normative DD content — §B.1 Scope (alpha DD, DD RFP), §B.2 Architecture (DI/DG/DC, Fig B.1 MVC, BPMN realises only DI), §B.3 the seven DC primitive/structured types (Bounds/Point/Font incl. attributes, Figs B.2–B.4), and the ten §B.4.3 DI classifiers (Diagram, DiagramElement, Edge, Label, LabeledEdge/Shape, Node, Plane, Shape, Style) with members and Figs B.5–B.13; replaced the earlier thin BPMN-element table and the unverified `BPMNDI.xsd`/`DI.xsd`/`DC.xsd` §15.2 claim; added page/figure citations. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/annex-b-diagram-interchange.md`; authoritative
source is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 Annex B (and §12) on any edition change. Increment
`version`; append a row to the Revision History above.

### B.4 References
OMG BPMN 2.0.2 Annex B (pp.481–498), Figures B.1–B.13, §12; `REF-BPMN-001 §16`.
