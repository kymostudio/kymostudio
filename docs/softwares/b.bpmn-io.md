---
title: bpmn.io / bpmn-js — External Reference
document_id: REF-BPMNIO-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - b.bpmn-io.comparision.md
  - ../diagrams/bpmn/README.md
  - ../formats/kymo-dsl/README.md
  - ../diagrams/best-practices.md
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn-io
  - bpmn-js
  - diagram-js
  - bpmn-moddle
  - web-modeler
  - svg
  - prior-art
upstream:
  project: bpmn.io (bpmn-js)
  homepage: https://bpmn.io/
  repository: https://github.com/bpmn-io/bpmn-js
  license: bpmn.io license (core libraries MIT, with a "powered by bpmn.io" attribution)
  version_reviewed: "bpmn-js 18.16.1 (2026-05-05)"
  access_date: 2026-05-20
---

# bpmn.io / bpmn-js — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-BPMNIO-001                                                |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [`bpmn-io/bpmn-js`](https://github.com/bpmn-io/bpmn-js)        |
| License           | bpmn.io license (core libs MIT + attribution)                 |
| Version Reviewed  | bpmn-js 18.16.1 (2026-05-05)                                  |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`bpmn-io.comparision.md`](./b.bpmn-io.comparision.md), [`bpmn/README.md`](../diagrams/bpmn/README.md), [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures bpmn.io's design choices so the team can consult them when evolving kymo's render pipeline and any future web-embeddable output. No code or behaviour in this repository depends on bpmn.io. Of all the BPMN tools surveyed, bpmn-js is the **closest analogue to kymo's renderer**: a client-side, SVG-based engine that turns a notation model into an interactive diagram in the browser.

## 1. Overview

**bpmn.io** is an open-source project by **Camunda** that provides web-based tooling for BPMN 2.0 (and the sibling notations DMN and CMMN). Its flagship library, **`bpmn-js`**, is a **BPMN 2.0 rendering toolkit and web modeler**: it views *and* edits BPMN diagrams directly in the browser, with no server round-trip. It is the engine behind Camunda's Modeler and a large number of third-party process tools.

- Homepage / demo: <https://bpmn.io/> · <https://demo.bpmn.io/>
- Repository: <https://github.com/bpmn-io/bpmn-js>
- Distribution: npm `bpmn-js` (current line **18.x**, v18.16.1 as of access date)

## 2. The bpmn.io toolkit family

bpmn.io is not one library but a family that shares a common rendering core:

| Library      | Purpose                                                  |
|--------------|----------------------------------------------------------|
| `bpmn-js`    | BPMN 2.0 viewer + modeler                                |
| `dmn-js`     | DMN 1.3 decision tables / DRD viewer + editor            |
| `cmmn-js`    | CMMN 1.1 case modeler (less actively developed)          |
| `form-js`    | Form viewer/editor used alongside user tasks             |
| `diagram-js` | The shared, notation-agnostic diagramming engine         |
| `bpmn-moddle`| Read/write of BPMN 2.0 XML in the browser                |

## 3. Architecture

`bpmn-js` is composed, not monolithic. It builds on two lower layers:

- **`diagram-js`** — a notation-**agnostic** SVG diagram engine: a canvas, an event bus, a command stack (undo/redo), a module/dependency-injection system, and pluggable "features" (selection, snapping, palette, context-pad). It knows nothing about BPMN.
- **`bpmn-moddle`** — the BPMN 2.0 metamodel binding: it parses BPMN XML into a JavaScript object model and serialises it back, preserving the **BPMN DI** (Diagram Interchange) layout.

`bpmn-js` is the BPMN-specific layer that maps the moddle model onto diagram-js shapes and provides BPMN rules (e.g. "a sequence flow may not cross a pool boundary"). Everything is wired through diagram-js's DI container, which is what makes the toolkit so extensible.

## 4. BPMN support and interchange

- Round-trips **BPMN 2.0 XML** (`.bpmn`) losslessly, including **BPMN DI** — the model (elements, flows) and the diagram (shape bounds, edge waypoints) are kept distinct, exactly as the OMG specification prescribes (see [`bpmn/README.md` §16](../diagrams/bpmn/README.md)).
- Renders the full descriptive/analytical element set: events, activities, gateways, pools/lanes, data objects, artifacts.
- Validation and modelling rules are layered on as diagram-js modules rather than baked in.

## 5. Embedding and extensibility

- **Viewer vs Modeler** — `NavigatedViewer` (read-only, pan/zoom) and `Modeler` (full editing) are separate entry points, so read-only embeds stay lightweight.
- **Additive modules** — custom renderers, palettes, context-pads, keyboard bindings, and rules are added by registering modules; the core is rarely forked.
- **Headless use** — because rendering is just SVG-in-DOM, `bpmn-js` can run server-side (with a DOM shim) to produce static SVG/PNG, which is how many CI pipelines snapshot diagrams.

## 6. Licensing

The bpmn.io libraries are distributed under the **bpmn.io license**: the source is open and the core libraries are MIT-licensed, but use carries a **"powered by bpmn.io" attribution** requirement (a small logo/credit in the rendered UI), waivable under a Camunda commercial agreement. This is more permissive than copyleft but stricter than bare MIT.

## 7. Ecosystem and adopters

bpmn.io is the de-facto standard web BPMN renderer. It powers the Camunda Modeler, is embedded in countless commercial BPM products, and is the reference implementation most blog posts and tutorials use to explain BPMN symbols. Its longevity and Camunda backing make it low-risk to depend on.

## 8. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of bpmn-js against kymo, and open questions for kymo — lives in [`bpmn-io.comparision.md`](b.bpmn-io.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream bpmn-js has not moved).

## 9. References

All accessed 2026-05-20.

- bpmn.io homepage — <https://bpmn.io/>
- bpmn-js repository — <https://github.com/bpmn-io/bpmn-js>
- bpmn-js toolkit page — <https://bpmn.io/toolkit/bpmn-js/>
- diagram-js — <https://github.com/bpmn-io/diagram-js>
- bpmn-moddle — <https://github.com/bpmn-io/bpmn-moddle>
- bpmn-js on npm — <https://www.npmjs.com/package/bpmn-js>
- Live demo — <https://demo.bpmn.io/>
