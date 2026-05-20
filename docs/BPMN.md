# BPMN 2.0 Import

kymo can render a standard **BPMN 2.0 XML** file (`.bpmn`) — the format
exported by [bpmn.io](https://bpmn.io), [Camunda Modeler](https://camunda.com/download/modeler/),
Signavio, and most BPM tools — directly to SVG.

```bash
kymo path/to/process.bpmn            # → path/to/process.svg
```

```python
from kymo import parse_bpmn, render

diagram = parse_bpmn(open("process.bpmn").read())
svg = render(diagram)
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

## Scope & limitations

- Static SVG only — `--figma` / `--excalidraw` targets are not BPMN-aware,
  and `--animate` (which animates `.edge-path`) does not animate BPMN flows.
- A file **without** a DI section (semantic model only) is not laid out
  automatically; kymo relies on the authored coordinates.
- Vertical pools are rendered with a left label band like horizontal pools.

See [`samples/order.bpmn`](../samples/order.bpmn) (a single-process flow)
and [`samples/collaboration.bpmn`](../samples/collaboration.bpmn) (two pools,
lanes, message flows, data objects, and an annotation) for worked examples.
