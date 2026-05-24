---
title: "BPMN 2.0.2 — Clause 12: BPMN Notation and Diagrams (BPMN DI)"
document_id: BPMN-NREF-NOTATION-001
version: "1.3"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001          # Normative-reference set (index)
  - BPMN-NREF-EXCHANGE-001 # Clause 15 — Exchange Formats
  - BPMN-NREF-ANNEXB-001   # Annex B — Diagram Interchange
  - BPMN-MAP-001           # kymo import/export mapping (consumes DI geometry)
  - REF-BPMN-001           # BPMN 2.0 research reference (interchange §16)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - bpmn-di
  - diagram-interchange
  - bpmnshape
  - bpmnedge
  - bpmnplane
  - notation
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

# BPMN 2.0.2 — Clause 12: BPMN Notation and Diagrams (BPMN DI)

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-NOTATION-001                                    |
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§12 BPMN Notation and Diagrams** (pp.367–424) |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-EXCHANGE-001`, `BPMN-NREF-ANNEXB-001`, `BPMN-MAP-001`, `REF-BPMN-001` |

Mirrors **Clause 12 (BPMN Notation and Diagrams)** of the OMG BPMN 2.0.2 specification
(§12.1–§12.4, pp.367–424) — the **BPMN Diagram Interchange (BPMN DI)** model. Part of the
normative-reference set `BPMN-NREF-001`. Where this note and the OMG specification disagree,
the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for §12 of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 §12; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §12.1 BPMN Diagram Interchange (BPMN DI) (pp.367–368)
BPMN DI records the **graphical layout** so a diagram renders the same after a tool round-trip,
separately from the semantic model. The simplest interchange approach was chosen — it does
**not** preserve "tool smarts", does **not** address colour (colour is non-normative), and
does **not** ascertain that the diagram is syntactically/semantically correct.

- **§12.1.2 Diagram Definition and Interchange** (p.367) — BPMN DI is a MOF-based meta-model,
  serialisable via XMI and an XML schema, **harmonised with OMG Diagram Definition (DD)**: the
  **Diagram Commons (DC)** (bounds, fonts) and the **Diagram Interchange (DI)** framework.
  **To render a diagram, BOTH the BPMN DI instance(s) AND the referenced BPMN model are
  REQUIRED** — DI carries only what is not derivable from the model. A BPMN diagram is a
  *snapshot* of a model; multiple diagrams may reference the same model.

## §12.2 BPMN DI Meta-model (pp.368–379)
A diagram is a collection of **shapes** (`BPMNShape`) and **edges** (`BPMNEdge`) on a
**plane** (`BPMNPlane`). BPMNPlane/BPMNShape/BPMNEdge MUST reference **exactly one** BPMN
element via `bpmnElement` (sole exception: a Data Association connected to a Sequence Flow,
resolved from DI attributes — Table 12.35). **Multiple depictions of one element are NOT
allowed**, except Participant Bands. There is **no containment**: a BPMNPlane is an *ordered*
collection whose order is the **Z-order** (elements "on top" appear later).

The six classifiers (§12.2.3, Classifier Descriptions, pp.370–378):

| Classifier | Specializes | Key attributes / associations |
|---|---|---|
| **`BPMNDiagram`** (12.2.3.1, p.370) | `di:Diagram` | `plane: BPMNPlane [1]`, `labelStyle: BPMNLabelStyle [*]` (Table 12.1) |
| **`BPMNPlane`** (12.2.3.2, p.371) | `di:Plane` | `bpmnElement: BaseElement [0..1]` — a Process, SubProcess, AdHocSubProcess, Transaction, Collaboration, Choreography, or SubChoreography. Origin (0,0) top-left; **positive coordinates only** (Table 12.2) |
| **`BPMNShape`** (12.2.3.3, p.372) | `di:LabeledShape` | `bpmnElement [0..1]` (a node), nested `BPMNLabel [0..1]`, **REQUIRED positive `dc:Bounds`** (x,y = upper-left). Options: `isHorizontal [0..1]` (Pools/Lanes), `isExpanded [0..1]` (SubProcess/AdHocSubProcess/Transaction/SubChoreography/CallActivity/CallChoreography), `isMarkerVisible [0..1]` (**Exclusive Gateway** X), `participantBandKind [0..1]`, `isMessageVisible [0..1]`, `choreographyActivityShape [0..1]` (last three: **Participant Bands**) (Table 12.3, p.374) |
| **`BPMNEdge`** (12.2.3.5, p.375) | `di:LabeledEdge` | `bpmnElement [0..1]`, nested `BPMNLabel [0..1]`, **REQUIRED positive waypoints**, `sourceElement`/`targetElement: DiagramElement [0..1]` (only if different from inferred — e.g. a Message Flow into a black-box Pool), `messageVisibleKind [0..1]` (**Message Flow** envelope) (Table 12.4, p.376) |
| **`BPMNLabel`** (12.2.3.7, p.376) | `di:Label` | nested in a BPMNShape/BPMNEdge; `labelStyle: BPMNLabelStyle [0..1]`; bounds relative to the plane. Label *visibility* = presence of the BPMNLabel; text = the `name` of the referenced element (a DataObjectReference concatenates name + dataState) (Table 12.5, p.377) |
| **`BPMNLabelStyle`** (12.2.3.8, p.377) | `di:Style` | `font: Font [1]`; owned by the BPMNDiagram, shared by labels (Table 12.6, p.378) |

Two enumerations:
- **`ParticipantBandKind`** (12.2.3.4, p.374) — `top_initiating`, `middle_initiating`,
  `bottom_initiating`, `top_non_initiating`, `middle_non_initiating`, `bottom_non_initiating`
  (*initiating* = unshaded; *non_initiating* = shaded).
- **`MessageVisibleKind`** (12.2.3.6, p.376) — `initiating` (unshaded) / `non_initiating`
  (shaded); applies to Participant Bands and Message Flows.

**§12.2.4 Complete BPMN DI XML Schema** (Table 12.7, p.378). Namespaces:
`bpmndi = http://www.omg.org/spec/BPMN/20100524/DI`,
`dc = http://www.omg.org/spec/DD/20100524/DC`,
`di = http://www.omg.org/spec/DD/20100524/DI`. `BPMNShape`/`BPMNEdge` substitute into
`di:DiagramElement`.

## §12.3 Notational Depiction Library and Abstract Element Resolutions (pp.380–412)
§12.3 pins how each `bpmnElement` + `BPMNShape`/`BPMNEdge` **resolves to a concrete
depiction** (the normative appearance behind §2.2.3). If no `bpmnElement` is referenced (or
it is invalid), the shape/edge is **not** depicted.

- **§12.3.1 Labels** (p.381) — position from the BPMNLabel bounds; text from the element's
  `name`; font from `labelStyle` (Fig 12.6 — a DataObjectReference label shows `name [State]`).
- **§12.3.2 BPMNShape** (p.381) — Activity markers sit **bottom-centre**; Loop / MI-Parallel /
  MI-Sequential are **mutually exclusive** (Table 12.8, p.382), Compensation may combine with
  a loop marker; on expandable shapes the markers sit **left of the +**, and the Ad-Hoc **~**
  sits **right of the +**. **Table 12.9 (Tasks, p.385)** fixes the eight type markers: Abstract
  (none), Service (gear), Send (filled envelope), Receive (unfilled envelope), User (human),
  Manual (hand), Business Rule (table), Script (script lines). Tables 12.10–12.34 resolve
  collapsed/expanded Sub-Processes (`isExpanded`), Event Sub-Processes, Transactions, Call
  Activities, Data, Events, Gateways, Artifacts, Lanes, Pools, Choreography Tasks,
  Sub-Choreographies, Call Choreographies, Choreography Participant Bands, and Conversations.
- **§12.3.3 BPMNEdge** (p.410) — **Table 12.35** resolves Connecting Objects (Sequence Flow,
  Message Flow, Association, Data Association).

## §12.4 Example(s) (pp.412–424)
Worked diagrams **with their DI instance XML**: depicting Sub-Process content (§12.4.1,
Fig 12.8), Multiple/Nested Lanes (§12.4.2, Fig 12.12), Vertical Collaboration (§12.4.3,
Fig 12.13), Conversation (§12.4.4, Fig 12.14), Choreography (§12.4.5, Fig 12.15) — Tables
12.36–12.43.

The model/diagram split is discussed in `REF-BPMN-001 §16`; the kymo importer/exporter's use
of this geometry is in `BPMN-MAP-001`; the XSDs are in §15 (`BPMN-NREF-EXCHANGE-001`) and
Annex B (`BPMN-NREF-ANNEXB-001`).

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §12.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: laid out all six DI classifiers with their attributes (incl. `participantBandKind`, `isMessageVisible`, `choreographyActivityShape`, `sourceElement`/`targetElement`, `messageVisibleKind`), the `ParticipantBandKind`/`MessageVisibleKind` enums, the DI/DC/bpmndi namespaces, the Z-order/positive-coordinate/single-depiction rules, and the §12.3 depiction-resolution tables + §12.4 example figures. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/12-bpmn-notation-and-diagrams.md`; authoritative
source is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §12 and Annex B on any edition change. Increment `version`;
append a row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §12 (pp.367–424), Tables 12.1–12.43, Figures 12.1–12.15, Annex B;
`REF-BPMN-001 §16`.
