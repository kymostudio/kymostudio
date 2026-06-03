---
title: BPMN 2.0 Import — Design
document_id: DESIGN-BPMN-PARSER-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo BPMN importer and its JS port
review_cycle: On phase completion, or on BPMN-mapping change
supersedes: null
related_documents:
  - INTRO-BPMN-PARSER-001        # Introduction
  - FEAT-BPMN-PARSER-001         # Requirements (traced below)
  - TEST-BPMN-PARSER-001         # Test documentation
  - PLAN-BPMN-PARSER-001         # Plan
  - BPMN-MAP-001                 # BPMN element mapping (the normative import table)
  - DESIGN-BPMN-EXPORT-001       # BPMN export design (the inverse; shares the tables)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - import
  - design
  - architecture
  - diagram-interchange
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN 2.0 Import — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-BPMN-PARSER-001                             |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-BPMN-PARSER-001, FEAT-BPMN-PARSER-001, TEST-BPMN-PARSER-001, PLAN-BPMN-PARSER-001 |

Realises FEAT-BPMN-PARSER-001 (FR/NFR cited per clause). The classification is the
import direction of BPMN-MAP-001; DESIGN-BPMN-EXPORT-001 is the inverse and *derives*
its tables from this module. Covers ISO/IEC/IEEE 12207 Architecture & Design Definition.

## 1. Scope

The architecture of the importer: how a `.bpmn` document becomes a fully-resolved
`Diagram`. Two implementations — `packages/python/src/kymo/from_bpmn.py:parse` and
`packages/js/src/from-bpmn.ts:parseBpmn` — share one algorithm and one mapping; the
normative element table is BPMN-MAP-001, behaviour is FEAT-BPMN-PARSER-001.

## 2. Pipeline (FR-1)

`parse(xml) -> Diagram` builds the diagram in a single forward walk; **no** layout pass
(FR-1, NFR-4):

1. **Parse XML** — Python uses `xml.etree.ElementTree`; JS uses its own dependency-free
   XML parser (`xml.ts`). Walk the tree once to index every element `id` and collect the
   DI shapes (`<bpmndi:BPMNShape>`) and DI edges (`<bpmndi:BPMNEdge>`).
2. **Shapes → components / regions** — for each DI shape, resolve its `bpmnElement`,
   read `<dc:Bounds>`, and classify (§3): a flow node becomes a `Component`; a pool /
   lane / group / expanded sub-process becomes a `Region` (§5).
3. **Edges → flows** — for each DI edge, resolve its `bpmnElement`, read the
   `<di:waypoint>` polyline and any `<bpmndi:BPMNLabel>`, classify the flow kind (§3),
   and build an `Edge` with explicit `points`.
4. **Normalise** — shift all geometry into a tidy positive plane and size the canvas (§4).

`cli.py` dispatches `.bpmn` to this parser and **skips** `layout()` /
`resolve_alignments()`; the JS `parseDiagram` likewise skips alignment for BPMN input.

## 3. Element classification (FR-3, FR-4) — import direction of BPMN-MAP-001

The classification tables are the **single source of truth** for the BPMN ↔ kymo glyph
mapping (the human-readable form is BPMN-MAP-001):

- `_EVENT_SHAPE` (`startEvent`→`bpmn-start`, `endEvent`→`bpmn-end`,
  `intermediate{Catch,Throw}Event`→`bpmn-intermediate`, `boundaryEvent`→`bpmn-boundary`)
  and `_EVENT_DEF` (the `*EventDefinition` child → marker: `message`/`timer`/`terminate`/…).
- `_TASK_MARKER` (`task`→``, `userTask`→`user`, `serviceTask`→`service`, …) → `bpmn-task`.
- `_GATEWAY_MARKER` (`exclusiveGateway`→`exclusive`, `parallelGateway`→`parallel`, …) →
  `bpmn-gateway`; the exclusive `X` marker is kept only when the DI shape sets
  `isMarkerVisible="true"` (bpmn.io leaves it plain by default).
- `_SUBPROCESS_TAGS` = {`subProcess`, `transaction`, `adHocSubProcess`}; plus
  `dataObjectReference`→`bpmn-data-object`, `dataStoreReference`→`bpmn-data-store`,
  `textAnnotation`→`bpmn-annotation`.

These live in `from_bpmn.py` (Python, authoritative) and `from-bpmn.ts` — where they are
**exported** so `to-bpmn.ts` can derive its inverse maps from the same source (a
consistency test guards against drift; DESIGN-BPMN-EXPORT-001 §3). Flow kind (FR-4):
`messageFlow`→`message`, `association`/data-associations→`association`, `sequenceFlow`→
`default` when the source's `default` attribute names this flow, `conditional` when it
has a `<conditionExpression>` and its source is not a gateway, else `sequence`.

## 4. Diagram-Interchange geometry (FR-5, FR-6)

kymo stores a component's **centre** in `pos`; BPMN DI gives a **top-left**
`<dc:Bounds>`. Conversion: `pos = (x + w/2, y + h/2)`, `size = (w, h)`. Edge polylines
come verbatim from the ordered `<di:waypoint>`s; a flow's `<bpmndi:BPMNLabel>` `<dc:Bounds>`
centre becomes `Edge.label_pos`; a node's `<bpmndi:BPMNLabel>` `<dc:Bounds>` centre + size
becomes `Component.label_box`, so its external label renders at the authored position and
width rather than a default spot below the glyph. After collecting every coordinate, the importer computes
`dx, dy = MARGIN − min_x, MARGIN − min_y` and shifts all components, regions, and edge
points by `(dx, dy)` so the top-left extent sits at `(MARGIN, MARGIN)`; the canvas is the
shifted content extent plus `MARGIN` on each side.

**Rounding (critical for NFR-1).** Every coordinate is integerised with **half-to-even**
rounding — Python's built-in `round()` and the shared `pyRound` helper
(`packages/js/src/round.ts`) in JS. `Math.round` (round-half-up) differs at exact `.5`
boundaries and MUST NOT be used here: it was the single root cause behind every
cross-language divergence found across the MIWG corpus (see PLAN-BPMN-PARSER-001 Annex C).

## 5. Containers and collaboration (FR-7)

DI shapes whose element is a container become `Region`s, not components:
`<participant>` → `pool`, `<lane>` → `lane`, `<group>` → `outer`. A `<subProcess>` is
**expanded** (→ an `inner` region nesting its members) when DI says `isExpanded="true"`,
or — absent the hint — when its box is large (heuristic: width > 130 and height > 90);
otherwise it is a collapsed `bpmn-subprocess` **component**. Region bounds are the DI
`<dc:Bounds>` as-is (already top-left). Multi-pool node→process assignment and nested
`<childLaneSet>` hierarchies are flattened (FEAT-BPMN-PARSER-001 §4; mirrors the export
round-trip fixpoint in BPMN-MAP-001).

## 6. Namespace-agnostic parsing (FR-2)

All tag matching is on the **local** name (the part after any `:` prefix), so a file
using `bpmn:`, `bpmn2:`, or a default namespace is parsed identically. This is why the
importer accepts the full vendor corpus regardless of each tool's prefix convention.

## 7. Integration (FR-8)

- **Python** — `from_bpmn.parse(xml) -> Diagram`; `cli.load()` routes a `.bpmn` path to
  it and returns a fully-resolved diagram (no layout/external specs), so `cli.main`
  skips the layout and alignment passes.
- **JS** — `parseBpmn(xml): Diagram` (`from-bpmn.ts`), exported from `index.ts`;
  `parseDiagram` detects BPMN input and skips `resolveAlignments`. The renderer
  (`renderSVG`) draws the result directly.

## 8. Cross-language parity (NFR-1)

The Python and JS importers are **independent** implementations, not a port; parity is a
property to be *verified*, not assumed. It is locked by a bidirectional conformance suite
(`conformance/`): for every `.bpmn` in the corpus (samples + fixtures + the full MIWG
corpus) the Python and JS imports must produce the **same canonical model**
(`conformance/golden/bpmn_import.json`, Python-written; the JS suite asserts against it).
The shared half-to-even rounding (§4) is the design rule that makes the two land on
identical pixels. Residual, not-yet-reconciled files would be tracked in
`conformance/known_divergences.json` (currently empty). See TEST-BPMN-PARSER-001.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — design of the shipped BPMN importer; documents the half-to-even (`pyRound`) parity rule. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-parser/03-DESIGN.md`; authoritative source is
the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement IDs it traces
(FR-1…FR-8, NFR-1…NFR-4) consistent with FEAT-BPMN-PARSER-001; reflect any mapping
change against BPMN-MAP-001 (and the export inverse, DESIGN-BPMN-EXPORT-001); increment
`version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is
FEAT-BPMN-PARSER-001 and BPMN-MAP-001. Reconcile any deviation there before release.
