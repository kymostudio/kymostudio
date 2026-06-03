---
title: BPMN 2.0 Import & Export — Element Mapping
document_id: BPMN-MAP-001
version: "1.4"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers using or maintaining the kymo BPMN importer and exporter
review_cycle: On BPMN-mapping change
supersedes: null
related_documents:
  - DESIGN-BPMN-PARSER-001    # BPMN import design (realises this mapping)
  - DESIGN-BPMN-EXPORT-001    # BPMN export design (inverts this mapping)
  - DESIGN-BPMN-DSL-001       # BPMN-in-DSL design (bpmn { } block)
  - KYMOJSON-MAP-001            # .kymo.json — serialization of the model this import produces
  - REF-BPMNIO-001              # bpmn.io reference (round-trip benchmark)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - import
  - export
  - round-trip
  - interchange
  - element mapping
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Import & Export

| Field             | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| Document ID       | BPMN-MAP-001                                                      |
| Version           | 1.4                                                               |
| Issue Date        | 2026-05-24                                                        |
| Status            | Released                                                          |
| Classification    | Internal                                                         |
| Owner             | `diagrams/` project                                              |
| Audience          | Engineers using or maintaining the kymo BPMN importer/exporter   |
| Review Cycle      | On BPMN-mapping change                                            |
| Supersedes        | —                                                                |
| Related Documents | `DESIGN-BPMN-PARSER-001`, `DESIGN-BPMN-EXPORT-001`, `DESIGN-BPMN-DSL-001`, `KYMOJSON-MAP-001`, `REF-BPMNIO-001` |

kymo can **import** a standard **BPMN 2.0 XML** file (`.bpmn`) — the interchange
format defined by the OMG *Business Process Model and Notation* specification (see
[Normative reference](#normative-reference)) and exported by [bpmn.io](https://bpmn.io),
[Camunda Modeler](https://camunda.com/download/modeler/), Signavio, and most BPM
tools — and render it to SVG, and can **export** any kymo diagram of BPMN glyphs
back to BPMN 2.0 XML. The two are inverses, so a file
round-trips: `.bpmn` → kymo → `.bpmn` preserves the process and its geometry.

```bash
kymo path/to/process.bpmn            # import → path/to/process.svg
kymo path/to/process.bpmn --bpmn     # export → path/to/process.export.bpmn
```

```python
from kymo import parse_bpmn, to_bpmn, render

diagram = parse_bpmn(open("process.bpmn").read())   # .bpmn → Diagram
svg = render(diagram)                                # → SVG
bpmn_xml = to_bpmn(diagram)                          # Diagram → .bpmn (round-trip)
```

## Normative reference

The `.bpmn` format is **BPMN 2.0 XML** as defined by the Object Management Group
(OMG) *Business Process Model and Notation (BPMN)*, Version 2.0.2 — the normative
specification for the XML schema, element semantics, and the BPMN DI (Diagram
Interchange) geometry kymo reads and writes:

> Object Management Group. *Business Process Model and Notation (BPMN), Version
> 2.0.2.* OMG, January 2014. PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF>.
> Published as **ISO/IEC 19510:2013**.

This document maps that standard to and from kymo's model; **where the two
disagree, the OMG specification is authoritative**. The element-mapping and export
tables below are the kymo-side view, not a restatement of the standard.

This file is the kymo-mapping part of the **BPMN 2.0.2 normative-reference set**
 under `docs/formats/bpmn/`; that set mirrors the OMG specification
clause by clause — its **15 clauses** (`01-scope` … `15-exchange-formats`) and **3
annexes** (`annex-a` … `annex-c`). The notation's behavioural semantics (token flow,
conformance classes) are also covered descriptively by `REF-BPMN-001`.

## How it works

A `.bpmn` file contains two parts: the **semantic model** (the process —
events, tasks, gateways, flows) and a **Diagram-Interchange (DI)** section
that records where every element is drawn. kymo reads geometry straight
from the DI section:

| DI element | Used for |
| --- | --- |
| `bpmndi:BPMNShape` → `dc:Bounds x y width height` | each node's box (centre + size) |
| `bpmndi:BPMNEdge` → `di:waypoint x y` (×n) | each flow's exact polyline |
| `bpmndi:BPMNLabel` → `dc:Bounds` | label box (centre + size): a flow's label position, **and** an event / gateway / data node's external-label box (`Component.label_box`) — so node labels render at their authored position + width, not a default spot below the glyph |
| `isHorizontal`, `isExpanded` | pool orientation, sub-process expand state |

Because the coordinates are authored in the file, **no layout/auto-routing
pass runs** — what the modeler drew is what you get. Coordinates are
normalised so the diagram sits at a tidy top-left margin.

XML namespaces are ignored (matched by local tag name), so the prefix a
given tool uses (`bpmn:`, `bpmn2:`, default namespace, …) does not matter.

## Element mapping

The look is monochrome, matching the bpmn.io default.

| BPMN element | Rendered as |
| --- | --- |
| `startEvent` | thin circle |
| `endEvent` | thick circle |
| `intermediateCatchEvent` / `intermediateThrowEvent` / `boundaryEvent` | double ring |
| event definitions | glyph inside the circle: `message`, `timer`, `error`, `signal`, `terminate`, `escalation`, `conditional`, `link`, `compensate` |
| `task`, `userTask`, `serviceTask`, `scriptTask`, `sendTask`, `receiveTask`, `manualTask`, `businessRuleTask`, `callActivity` | rounded rectangle with a top-left type marker |
| `subProcess` (collapsed) | task box with a `+` expand marker |
| `subProcess` (expanded) | container region |
| `parallelGateway` / `inclusiveGateway` / `eventBasedGateway` / `complexGateway` | diamond with `+` / `O` / pentagon / `✳` marker |
| `exclusiveGateway` | diamond; the `X` marker is drawn only when the DI sets `isMarkerVisible="true"` (bpmn.io's default leaves it plain) |
| `sequenceFlow` | solid line, filled arrowhead |
| &nbsp;&nbsp;· default flow (`default="…"`) | + slash tick at the source |
| &nbsp;&nbsp;· conditional flow from an activity | + small diamond at the source |
| `messageFlow` | dashed line, hollow circle at source + open arrowhead |
| `association`, `data*Association` | dotted line |
| `dataObjectReference` | page with a folded corner |
| `dataStoreReference` | cylinder |
| `textAnnotation` | left bracket + text (from the `<text>` child) |
| `participant` (pool) | rectangle with a vertical label band |
| `lane` | lighter sub-rectangle with a vertical label band |
| `group` | dashed rounded rectangle |

Unrecognised element types are skipped rather than failing the import.

## Export

Any diagram made of BPMN glyphs — imported from a `.bpmn`, or authored with the
`bpmn { }` DSL block — exports back to BPMN 2.0 XML: a
`<bpmn:process>` (semantic model) plus a `<bpmndi:BPMNDiagram>` (DI geometry).
When the diagram has pools, the process is wrapped in a `<bpmn:collaboration>`.

```bash
kymo process.bpmn --bpmn      # → process.export.bpmn (won't clobber the input)
kymo diagram.kymo --bpmn      # → diagram.bpmn
```

```python
from kymo import to_bpmn
xml = to_bpmn(diagram)        # Diagram → BPMN 2.0 XML string
```

```js
import { toBpmn } from "kymostudio";
const xml = toBpmn(diagram);  // Diagram → BPMN 2.0 XML string
```

The mapping is the exact **inverse of the import table above** — derived
mechanically from the importer's classification maps (the single source of
truth), so the two never drift:

| kymo element | BPMN element emitted |
| --- | --- |
| `bpmn-start` / `bpmn-end` / `bpmn-intermediate` / `bpmn-boundary` | `startEvent` / `endEvent` / `intermediateCatchEvent` / `boundaryEvent`, plus a `*EventDefinition` child for the icon (`message`→`messageEventDefinition`, `terminate`→`terminateEventDefinition`, …) |
| `bpmn-task` + type marker | `task` / `userTask` / `serviceTask` / `scriptTask` / `sendTask` / `receiveTask` / `manualTask` / `businessRuleTask` |
| `bpmn-gateway` + marker | `exclusiveGateway` (DI `isMarkerVisible="true"` only when the `X` shows) / `parallelGateway` / `inclusiveGateway` / `eventBasedGateway` / `complexGateway` |
| `bpmn-subprocess` | `subProcess` (collapsed) |
| `bpmn-data-object` / `bpmn-data-store` | `dataObjectReference` / `dataStoreReference` |
| `bpmn-annotation` | `textAnnotation` (with a `<text>` child from the name) |
| sequence flow | `sequenceFlow`, filled arrowhead |
| &nbsp;&nbsp;· default flow | `sequenceFlow` + `default="<id>"` on the source node |
| &nbsp;&nbsp;· conditional flow | `sequenceFlow` + a `<conditionExpression>` child |
| message flow | `messageFlow` (placed in the `<collaboration>`) |
| association | `association` |
| pool region | `<participant>` in a `<collaboration>` (the first owns the `<process>`; further pools are black-box) |
| lane region | `<lane>` in a `<laneSet>` (members assigned by geometry — whichever lane box contains each node) |
| group region | `<group>` |
| expanded sub-process region | `<subProcess isExpanded="true">` |

**Geometry.** A component's centre (`pos`) + box (`size`) become a top-left
`<dc:Bounds>` (`x = pos.x − w/2`, `y = pos.y − h/2`); edge `points` become
`<di:waypoint>`s; a flow label — and a node's `label_box` external label — becomes a `<bpmndi:BPMNLabel>`. The DI plane is
referenced to the collaboration when pools exist, else to the process. Output is
deterministic (stable order, ids preserved verbatim).

**Round-trip.** `parse_bpmn` → `to_bpmn` → `parse_bpmn` is a fixpoint: structure
(nodes, flows, regions) and geometry are preserved — region bounds exactly, node
centres within ±1px on odd-width shapes (centre↔top-left rounding). Semantic
detail the importer never reads is **not** reconstructed: lane membership is
inferred from geometry (not the original `<flowNodeRef>`), pools beyond the first
are black-box, and nested `<childLaneSet>` hierarchy is flattened. The same
algorithm runs in both engines (Python `to_bpmn`, JS `toBpmn`).

## Scope & limitations

- Static SVG only — `--figma` / `--excalidraw` targets are not BPMN-aware,
  and `--animate` (which animates `.edge-path`) does not animate BPMN flows.
- A file **without** a DI section (semantic model only) is not laid out
  automatically; kymo relies on the authored coordinates.
- Vertical pools are rendered with a left label band like horizontal pools.
- **Export** reconstructs only what the importer reads back: flat lanes (no
  nesting), black-box pools beyond the first, and geometric lane membership —
  valid BPMN that re-imports identically, not a byte-for-byte copy of a
  third-party tool's XML.

See [`samples/order.bpmn`](../../samples/order.bpmn) (a single-process flow)
and [`samples/collaboration.bpmn`](../../samples/collaboration.bpmn) (two pools,
lanes, message flows, data objects, and an annotation) for worked examples.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — documents BPMN import **and** export; promoted to an ID-bearing reference (`BPMN-MAP-001`) and moved to `docs/formats/bpmn.md`. |
| 1.1     | 2026-05-24 | Vũ Anh | Added `DESIGN-BPMN-PARSER-001` (the BPMN importer feature design that realises this mapping) to related documents. |
| 1.2     | 2026-05-24 | Vũ Anh | Added `KYMOJSON-MAP-001` (the `.kymo.json` serialization of the resolved model this importer produces) to related documents. |
| 1.3     | 2026-05-24 | Vũ Anh | Added a **Normative reference** section citing the OMG *BPMN 2.0.2* specification (PDF: <https://www.omg.org/spec/BPMN/2.0.2/PDF>; ISO/IEC 19510:2013) as the authoritative source for the `.bpmn` format, and linked it from the intro. |
| 1.4     | 2026-05-24 | Vũ Anh | Split the BPMN format doc into the `docs/formats/bpmn/` normative-reference set (index `BPMN-NREF-001`), structured as a 1:1 mirror of the OMG spec (15 clauses + 3 annexes); this file is the kymo element-mapping part at `docs/formats/bpmn/kymo-mapping.md`. Added `BPMN-NREF-001` and `REF-BPMN-001` to related documents. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/kymo-mapping.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository; available to all readers.

### B.3 Change Control
Update on any change to the BPMN element mapping (import or export), keeping the
import and export tables mutually inverse. The importer's classification maps
(`from_bpmn.py` / `from-bpmn.ts`) are the normative source the exporter inverts.
Increment `version` and append a row to Annex A.

### B.4 Backwards Compatibility
Informative reference. The normative mapping lives in code (the importer maps,
inverted by the exporter) and in `DESIGN-BPMN-EXPORT-001`.
