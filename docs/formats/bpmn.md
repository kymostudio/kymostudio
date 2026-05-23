---
title: BPMN 2.0 Import & Export — Element Mapping
document_id: BPMN-MAP-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers using or maintaining the kymo BPMN importer and exporter
review_cycle: On BPMN-mapping change
supersedes: null
related_documents:
  - FEAT-BPMN-EXPORT-DSN-001    # BPMN export design (inverts this mapping)
  - FEAT-BPMN-DSL-DSN-001       # BPMN-in-DSL design (bpmn { } block)
  - DSL-LANG-001                # kymo DSL language specification
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
| Version           | 1.0                                                               |
| Issue Date        | 2026-05-24                                                        |
| Status            | Released                                                          |
| Classification    | Internal                                                         |
| Owner             | `diagrams/` project                                              |
| Audience          | Engineers using or maintaining the kymo BPMN importer/exporter   |
| Review Cycle      | On BPMN-mapping change                                            |
| Supersedes        | —                                                                |
| Related Documents | `FEAT-BPMN-EXPORT-DSN-001`, `FEAT-BPMN-DSL-DSN-001`, `DSL-LANG-001`, `REF-BPMNIO-001` |

kymo can **import** a standard **BPMN 2.0 XML** file (`.bpmn`) — the format
exported by [bpmn.io](https://bpmn.io), [Camunda Modeler](https://camunda.com/download/modeler/),
Signavio, and most BPM tools — and render it to SVG, and can **export** any kymo
diagram of BPMN glyphs back to BPMN 2.0 XML. The two are inverses, so a file
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

## How it works

A `.bpmn` file contains two parts: the **semantic model** (the process —
events, tasks, gateways, flows) and a **Diagram-Interchange (DI)** section
that records where every element is drawn. kymo reads geometry straight
from the DI section:

| DI element | Used for |
| --- | --- |
| `bpmndi:BPMNShape` → `dc:Bounds x y width height` | each node's box (centre + size) |
| `bpmndi:BPMNEdge` → `di:waypoint x y` (×n) | each flow's exact polyline |
| `bpmndi:BPMNLabel` → `dc:Bounds` | flow-label position |
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
`bpmn { }` DSL block (DSL-LANG-001) — exports back to BPMN 2.0 XML: a
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
`<di:waypoint>`s; a flow label becomes a `<bpmndi:BPMNLabel>`. The DI plane is
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

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository; available to all readers.

### B.3 Change Control
Update on any change to the BPMN element mapping (import or export), keeping the
import and export tables mutually inverse. The importer's classification maps
(`from_bpmn.py` / `from-bpmn.ts`) are the normative source the exporter inverts.
Increment `version` and append a row to Annex A.

### B.4 Backwards Compatibility
Informative reference. The normative mapping lives in code (the importer maps,
inverted by the exporter) and in `FEAT-BPMN-EXPORT-DSN-001`.
