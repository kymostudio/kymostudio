---
title: draw.io / diagrams.net — External Reference
document_id: REF-DRAWIO-001
version: "1.0"
issue_date: 2026-05-20
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - REF-DRAWIO-CMP-001
  - BPD-DGM-001
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - diagrams-net
  - jgraph
  - diagramming
  - svg
  - open-source
  - prior-art
upstream:
  project: draw.io / diagrams.net
  homepage: https://www.drawio.com/
  repository: https://github.com/jgraph/drawio
  license: Apache-2.0 (icon/stencil/template sets carry extra Atlassian-related terms)
  version_reviewed: "drawio 30.0.2 (2026-05-16)"
  access_date: 2026-05-20
---

# draw.io / diagrams.net — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-DRAWIO-001                                                |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-20                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout engine, or render pipeline |
| Upstream          | [`jgraph/drawio`](https://github.com/jgraph/drawio)           |
| License           | Apache-2.0 (with stencil/template caveats)                    |
| Version Reviewed  | drawio 30.0.2 (2026-05-16)                                    |
| Access Date       | 2026-05-20                                                     |
| Related Documents | [`drawio.comparision.md`](./a.drawio.comparision.md), `bpmn/README.md`, `kymo-dsl/`, [`best-practices.md`](../diagrams/best-practices.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures draw.io's design choices so the team can consult them when evolving kymo's render and export pipeline. draw.io is a **general-purpose** diagram editor (BPMN is one of many shape libraries), included here because it is a common way teams draw BPMN and because, like bpmn.io, it is a client-side SVG engine.

> **Update — kymo now interops with draw.io.** kymo **exports** to draw.io (mxGraph XML) via the source-agnostic encoder `drawio_from_kymojson` (`crate::drawio`), reached from the `--drawio` flag / `.drawio` output in all three CLIs. The ad-hoc `tools/drawio-to-svg.py` also wraps the **draw.io desktop** app to render any `.drawio` → SVG. (A `.drawio` → kymo-IR *importer* is not yet built — see RES-PIPELINE-001.)

## 1. Overview

**draw.io** (the application is also branded **diagrams.net**) is a free, client-side diagramming editor written in JavaScript. It draws flowcharts, UML, network diagrams, mind maps, and — through a dedicated shape library — **BPMN 2.0**. Unlike bpmn.io it is not BPMN-specialised; it is a broad "draw anything" tool with BPMN as one template set.

- Application: <https://app.diagrams.net/> · Product site: <https://www.drawio.com/>
- Repository: <https://github.com/jgraph/drawio>
- Current release: **v30.0.2** (as of access date)

## 2. Ownership and licensing

- **Maintainers** — jointly owned and developed by **draw.io Ltd (formerly JGraph)** and **draw.io AG**. Development is done by the core team rather than by community pull requests.
- **Licence** — the application is **Apache License 2.0**; the source is public, self-hostable, and free of licensing fees. Note that bundled **icon sets, stencil libraries, and diagram templates** carry additional terms (chiefly around Atlassian Confluence/Jira products).

## 3. Architecture / tech stack

- Roughly **98.5 % JavaScript** — a client-side editor that runs entirely in the browser; no diagram data need leave the device.
- Storage is bring-your-own: local file, Google Drive, OneDrive, GitHub, Confluence/Jira, etc. draw.io itself is stateless.
- Native file format is an XML document (`.drawio` / `.xml`, mxGraph-derived); it also exports SVG, PNG, PDF, and HTML.

## 4. BPMN support

- BPMN is provided as a **shape library** (events, activities, gateways, pools/lanes, artifacts) that the user enables from the shape panel.
- draw.io draws BPMN **symbols** but does not enforce BPMN **semantics** — there is no token model, no execution, and no guarantee that a diagram is a valid BPMN process. It is a drawing tool, not a process engine, and it does not natively read/write standard **BPMN 2.0 XML** (its native format is mxGraph XML, not the OMG interchange schema).

## 5. Notable capabilities

- Large built-in shape catalogue across many domains; custom shape libraries.
- Real-time and asynchronous collaboration through the host storage (e.g. Confluence).
- First-class **self-hosting** and an offline desktop build (Electron) — attractive where data cannot leave the organisation.

## 6. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of draw.io against kymo, and open questions for kymo — lives in [`drawio.comparision.md`](a.drawio.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream draw.io has not moved).

## 7. References

All accessed 2026-05-20.

- Product site — <https://www.drawio.com/>
- Application — <https://app.diagrams.net/>
- Repository — <https://github.com/jgraph/drawio>
- License (Apache-2.0) — <https://github.com/jgraph/drawio/blob/dev/LICENSE>
- diagrams.net (Wikipedia) — <https://en.wikipedia.org/wiki/Diagrams.net>
