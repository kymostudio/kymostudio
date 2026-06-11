---
title: Kroki — External Reference
document_id: REF-KROKI-001
version: "1.0"
issue_date: 2026-05-28
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the `kymo` DSL, layout engine, or render pipeline
review_cycle: On upstream major release, or annually (whichever first)
supersedes: null
related_documents:
  - REF-KROKI-CMP-001
  - REF-D2-001
  - REF-BPMNIO-001
  - BPD-DGM-001
authors:
  - Vũ Anh
language: en
keywords:
  - kroki
  - yuzutech
  - diagram-as-code
  - api-gateway
  - rendering-service
  - self-hosted
  - prior-art
upstream:
  project: yuzutech/kroki
  homepage: https://kroki.io/
  repository: https://github.com/yuzutech/kroki
  docs: https://docs.kroki.io/
  license: MIT
  version_reviewed: "0.30.1"
  access_date: 2026-05-28
---

# Kroki — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-KROKI-001                                                  |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-28                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the `kymo` DSL, layout, or render pipeline   |
| Upstream          | [`yuzutech/kroki`](https://github.com/yuzutech/kroki)          |
| License           | MIT                                                            |
| Version Reviewed  | 0.30.1                                                         |
| Access Date       | 2026-05-28                                                     |
| Related Documents | [REF-KROKI-CMP-001](./b.kroki.comparision.md), [REF-D2-001](b.d2.md), [REF-BPMNIO-001](b.bpmn-io.md), [BPD-DGM-001](../diagrams/best-practices.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Kroki's design choices so the team can consult them when evolving kymo's render and distribution story. No code or behavior in this repository depends on Kroki.

Read this first if you need ground truth on how Kroki actually behaves; the opinionated comparison against kymo — including the per-category scoring — lives in [REF-KROKI-CMP-001](b.kroki.comparision.md).

## 1. Overview

**Kroki** is an open-source **unified API gateway** that "creates diagrams from textual descriptions." Built by **Yuzu tech** and released under the **MIT license**, it exposes a single HTTP endpoint in front of ~28 different diagram engines (PlantUML, GraphViz, Mermaid, D2, BPMN, Excalidraw, the BlockDiag family, C4, Structurizr, Vega, and more). The value proposition is *learn one API, render any of them*: instead of installing and learning each tool's toolchain, a caller sends `(diagram_type, source, output_format)` and gets back an image.

Crucially, **Kroki has no diagram language of its own.** It is a passthrough/aggregation layer: every syntax it accepts belongs to a third-party engine. That places it in a different tool class from the DSLs surveyed elsewhere in `docs/tools/` — it is *infrastructure for rendering*, not a notation.

- Repository: <https://github.com/yuzutech/kroki>
- Homepage: <https://kroki.io/>
- Documentation: <https://docs.kroki.io/>
- Version reviewed: **0.30.1** (released 2026-03-02, as of access date 2026-05-28)
- GitHub stars at access date: **≈ 4.2k**
- A **free public instance** is hosted at <https://kroki.io>, sponsored by Exoscale (with hosting help from Terrastruct, Zulip, Utoolity). The project's promise is durability: *"Kroki is never going away; anyone can host this service with minimal resource requirements."*

## 2. Architecture

Kroki is a **gateway + companion-microservice** system, not a monolith.

- **Core gateway** — a **JVM service built on Eclipse Vert.x** (Maven build). It owns the HTTP API, request decoding, output negotiation, and routing. Most renderers are bundled directly into the main `yuzutech/kroki` Docker image, so a single container already serves the bulk of the catalog (PlantUML, GraphViz, the BlockDiag family, C4, Ditaa, Erd, Nomnoml, Svgbob, Vega/Vega-Lite, WaveDrom, Bytefield, D2, DBML, Pikchr, Structurizr, WireViz, Symbolator, UMlet, …).
- **Companion services** — the heavyweight engines (typically Node.js, several driving a headless browser) run as **separate containers** the gateway forwards to:
  - `yuzutech/kroki-mermaid` — Mermaid
  - `yuzutech/kroki-bpmn` — BPMN (via bpmn-js)
  - `yuzutech/kroki-excalidraw` — Excalidraw
  - `yuzutech/kroki-diagramsnet` — diagrams.net (**experimental**)
- **Service discovery** — the gateway finds its companions through environment variables (`KROKI_MERMAID_HOST`, `KROKI_BPMN_HOST`, `KROKI_EXCALIDRAW_HOST`, `KROKI_DIAGRAMSNET_HOST`, …), which is what the reference `docker-compose.yml` wires up.

The architectural lesson for kymo: a render engine that speaks a simple `text in → SVG out` contract can be packaged as exactly this kind of companion service (see §8 and the comparison).

## 3. The API

### 3.1 GET with an encoded diagram

For `GET`, the diagram source is compressed and embedded in the path:

```
GET /{diagram_type}/{output_format}/{encoded_diagram}
```

The encoding pipeline is:

1. **Deflate** the UTF-8 source with **zlib at compression level 9** (best compression).
2. **Base64**-encode the result.
3. Make it **URL-safe**: replace `+` → `-` and `/` → `_`.

Example (GraphViz → SVG on the public instance):

```
https://kroki.io/graphviz/svg/eNpLyUwvSizIUHBXqOZSAAKn0pK8nMxkhYLM4tQikEhBaW4xULxELYALwQQA9eQ-zg==
```

Because the source travels in the URL, the diagram is **fully self-describing and shareable** — anyone with the link re-renders the same image, and the encoding is reversible (you can decode a Kroki URL back to source). The cost is a **URL-length ceiling**: large diagrams overflow what servers/proxies accept, which is why POST exists.

### 3.2 POST (no encoding required)

Three POST forms are supported:

- **JSON body** — the most explicit:
  ```json
  { "diagram_source": "digraph G { Hello -> World }",
    "diagram_type": "graphviz",
    "output_format": "svg" }
  ```
  `POST /` with `Content-Type: application/json`.
- **Plain text + headers** — `POST /{diagram_type}` with `Content-Type: text/plain` and `Accept: image/svg+xml` (the `Accept` header chooses the format).
- **Plain text + URL format** — `POST /{diagram_type}/{output_format}` with the raw source as the body.

POST is the right choice for anything beyond toy size; GET-with-encoding is the right choice for embedding a diagram in a static document or chat as a single self-contained link.

## 4. Supported diagram types

Around **28** types, reachable from the same gateway. (The exact roster grows over releases; this is the catalogue as of 0.30.1.)

| Group | Types |
|-------|-------|
| BlockDiag family | BlockDiag, SeqDiag, ActDiag, NwDiag, PacketDiag, RackDiag |
| General DSLs | PlantUML, GraphViz, **D2**, Mermaid, Nomnoml, Pikchr, Svgbob, GoAT, Ditaa, Erd |
| Architecture / data | C4 (via PlantUML), Structurizr, DBML, Bytefield, WireViz, Symbolator |
| Typesetting / data-viz | TikZ, Vega, Vega-Lite, WaveDrom |
| Process / visual editors | **BPMN**, **Excalidraw**, UMlet, diagrams.net (**experimental**) |

Two entries matter for kymo specifically: **D2** (a documented kymo peer — see [REF-D2-001](b.d2.md)) and **BPMN** + **Excalidraw**, both of which kymo already touches (BPMN import; an Excalidraw exporter). Kroki therefore *bundles several of kymo's neighbours* under one roof — that overlap is the subject of the comparison.

## 5. Output formats

| Format | Notes |
|--------|-------|
| SVG    | Universally available; the default and lingua franca. |
| PNG    | Raster; widely supported. |
| PDF    | Vector document; supported by many but not all types. |
| JPEG   | Raster; narrower support. |
| Base64 | The image returned as a base64 data payload. |
| TXT    | Text output for ASCII-oriented engines. |

**Format support varies by diagram type** — SVG is the only one guaranteed across the board. Callers negotiate format either through the URL segment (`/plantuml/png/…`) or the `Accept` header on POST.

## 6. Deployment

- **Single Docker image** — `docker run -d -p 8000:8000 yuzutech/kroki` serves everything bundled in the gateway.
- **docker-compose** — the recommended self-host: the gateway plus the companion containers (Mermaid, BPMN, Excalidraw, optionally diagrams.net), wired by the `KROKI_*_HOST` env vars.
- **Free public instance** — <https://kroki.io>, no signup, sponsor-funded; suitable for prototyping and light embedding.
- **Self-managed** — documented at <https://docs.kroki.io/>; upstream notes installation "requires Linux experience."

The build is orchestrated with **Task** (`Taskfile.yml`): `task mavenBuild` (gateway), `task dockerBuildImages` (all images).

## 7. Tooling & ecosystem

- **kroki-cli** — an official command-line client written in **Go** (`go install github.com/yuzutech/kroki-cli/cmd/kroki@latest`, or download a release binary). It infers `diagram_type` from the file extension and defaults output to SVG; it handles the deflate+base64 encoding and the HTTP call for you.
- **kroki-go** — the Go client library underneath the CLI.
- **asciidoctor-kroki** — the flagship integration: an Asciidoctor extension that turns `[plantuml]`/`[mermaid]`/etc. blocks into Kroki-rendered images. Widely used with **Antora**.
- **Other integrations** — MkDocs plugin, a native **GitLab** integration (Markdown/AsciiDoc rendering via a configured Kroki instance), plus community SDKs and editor plugins.

The encoding spec is simple and stable enough that integrations exist in many languages; Kroki documents the encode step in Node.js, JavaScript, Java, Python, and Go.

## 8. Relevance to kymo

Kroki is **not a rival renderer or a DSL peer** — it is the rendering/distribution layer *around* renderers. Two threads make it worth studying:

1. **Landscape map.** Kroki bundles a kymo peer (**D2**, see [REF-D2-001](b.d2.md)) and two kymo interop targets (**BPMN**, **Excalidraw**, see [REF-BPMNIO-001](b.bpmn-io.md)). Its catalogue is a useful census of what "text → diagram" tools exist and how they are packaged.
2. **A distribution opportunity.** kymo already speaks the exact contract a Kroki backend needs — `.kymo` source in, SVG out (`packages/python/src/kymo/`, `cli.py`). A `kroki-kymo` companion service, or upstreaming `kymo` as a Kroki diagram type, would put kymo behind the same one-URL API and the same `asciidoctor-kroki`/MkDocs/GitLab integrations for free.

The opinionated version of both threads — with the at-a-glance matrix, headline tradeoffs, a per-category scoring against kymo, and open questions — lives in [REF-KROKI-CMP-001](b.kroki.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream Kroki has not moved).

## 9. References

All accessed 2026-05-28.

- Kroki repository — <https://github.com/yuzutech/kroki>
- Kroki homepage — <https://kroki.io/>
- Kroki documentation — <https://docs.kroki.io/>
- Diagram URL encoding — <https://docs.kroki.io/kroki/setup/encode-diagram/>
- kroki-cli — <https://github.com/yuzutech/kroki-cli>
- kroki-go — <https://github.com/yuzutech/kroki-go>
- asciidoctor-kroki — <https://github.com/asciidoctor/asciidoctor-kroki>
- License (MIT) — <https://github.com/yuzutech/kroki/blob/main/LICENSE>
