# Diagram MCP Servers — Landscape Survey (Research)

| Field             | Value                                                                                                            |
|-------------------|----------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-MCP-001                                                                                                     |
| Version           | 0.1                                                                                                            |
| Issue Date        | 2026-06-09                                                                                                     |
| Status            | Draft                                                                                                          |
| Classification    | Internal                                                                                                       |
| Owner             | `diagrams/` project                                                                                            |
| Audience          | Engineers evaluating whether (and how) to ship a `kymostudio-mcp` server                                       |
| Subjects          | Notable Model Context Protocol (MCP) servers that produce diagrams — Mermaid, draw.io, Excalidraw, Kroki-backed multi-format, and chart/data-viz servers |
| Licenses          | Each surveyed project under its own license (linked inline); no third-party code is used in this repository    |
| Access Date       | 2026-06-09 (star counts and "official" claims are point-in-time)                                               |
| Related Documents | `RES-SKILLS-001`, `RES-CLI-001`, `REF-DRAWIO-001`, `REF-D2-001`, `REF-PLANTUML-001`                            |

This is a **research note on prior art** — a survey of how the MCP ecosystem exposes diagram
generation to AI agents. It is **not a specification**: nothing in this repository depends on it,
and no `kymostudio-mcp` is committed work. It is the evidence base for that possible future, and a
map of the design patterns worth borrowing.

The framing thesis: **diagrams are an unusually good fit for MCP** because the input is text a model
already writes well (Mermaid/PlantUML/D2 source) and the output is a deterministic render. The
interesting design variation is not *what* gets generated but *how the result is delivered back* —
as an image file, via a shared render proxy, or as a live canvas the agent can see and re-edit.

## 1. What an MCP server is, and why diagrams fit

The **Model Context Protocol (MCP)** is an open standard that lets AI agents (Claude Desktop/Code,
Cursor, and others) call external tools through a uniform JSON-RPC interface. A *diagram MCP server*
exposes one or more tools such as `render_mermaid`, `create_diagram`, or `add_node` so the agent can
turn a natural-language request — "draw the auth sequence" — into a rendered artifact without the
user ever touching the diagramming tool's UI.

Two properties make diagrams a natural MCP use case:

1. **The grammar is text the LLM is already fluent in.** Mermaid in particular appears across so much
   training data that models emit valid source with little prompting (see `REF-D2-001` and the
   Mermaid-vs-D2 note for the familiarity gap between languages).
2. **Rendering is deterministic and side-effect-free.** A server can run text → SVG/PNG with no state,
   which keeps the tool surface small and safe to expose.

## 2. The landscape

Grouped by the diagram family they target. "Render path" is how source becomes a viewable artifact —
the axis that most distinguishes these projects.

### 2.1 Mermaid-focused

| Server | Author | Render path | Notable trait |
|---|---|---|---|
| [mermaid-mcp-server](https://github.com/peng-shawn/mermaid-mcp-server) | `peng-shawn` | Mermaid → PNG/SVG (headless render) | One of the most-installed; simple text-to-image. |
| [mcp-mermaid](https://github.com/hustcc/mcp-mermaid) | `hustcc` (AntV) | Mermaid → image, dynamic | From the AntV team; pairs with their chart server (§2.5). |
| [Mermaid Chart MCP](https://mermaid.ai/docs/ai/mcp-server) | Mermaid (official) | create / validate / render + account sync | Official; integrates a Mermaid Chart account for managed diagrams. |

### 2.2 draw.io

| Server | Author | Render path | Notable trait |
|---|---|---|---|
| [drawio-mcp](https://github.com/jgraph/drawio-mcp) | `jgraph` (official) | XML / CSV / Mermaid → diagram, opened in editor **or** rendered inline | Official draw.io server; supports the **MCP Apps** protocol to show interactive diagrams inline in the chat. See `REF-DRAWIO-001`. |

### 2.3 Excalidraw (free-form canvas)

| Server | Author | Render path | Notable trait |
|---|---|---|---|
| [mcp_excalidraw](https://mcpservers.org/servers/yctimlin/mcp_excalidraw) | `yctimlin` | Live canvas toolkit (build / inspect / refine) | Gives the agent a full canvas API and the ability to *see* what it drew, enabling iterative refinement. |
| [mermaid-to-excalidraw-mcp](https://lobehub.com/mcp/yannick-cw-mermaid-to-excalidraw-mcp) | `yannick-cw` | Mermaid → styled `.excalidraw` file | Bridges the Mermaid grammar to Excalidraw's hand-drawn aesthetic. |

### 2.4 Universal / multi-format (Kroki-backed)

| Server | Author | Render path | Notable trait |
|---|---|---|---|
| [uml-mcp](https://github.com/antoinebou12/uml-mcp) | `antoinebou12` | 30+ formats via [Kroki](https://kroki.io/) | UML (class/sequence/activity/state/…), Mermaid, D2, Graphviz, TikZ, ERD, BlockDiag, BPMN, C4. |
| [diagram-bridge-mcp](https://glama.ai/mcp/servers/@tohachan/diagram-bridge-mcp) | `tohachan` | format selection → instruction → Kroki render | Three-tool pipeline: it *picks* the best format for the request, then generates and renders it. Covers Mermaid, PlantUML, C4, D2, GraphViz, BPMN, Structurizr, Excalidraw, Vega-Lite. |

Both lean on **Kroki** (`REF` — see `docs/tools/b.kroki.md`), a render proxy that fronts dozens
of diagram engines behind one HTTP endpoint — the multi-format shortcut.

### 2.5 Chart / data-viz (adjacent, not strictly diagrams)

| Server | Author | Render path | Notable trait |
|---|---|---|---|
| [@antv/mcp-server-chart](https://github.com/antvis/mcp-server-chart) | AntV | Data → chart (AntV) | The most popular chart MCP (~4K★ class); 20+ chart types. |
| ECharts MCP | Apache ECharts community | Data → chart | Apache ECharts rendering. |
| VegaLite MCP | community | Data → Vega-Lite viz | Grammar-of-graphics, good for fetched datasets. |
| Mindmap MCP | community | Markdown → interactive mindmap | Narrow, single-purpose. |

## 3. Three recurring architecture patterns

Across the landscape, almost every server is one of three shapes:

1. **Render-to-image.** Take diagram source, run a headless engine, return a PNG/SVG (file or
   base64). Stateless and simple — the bulk of the Mermaid servers (§2.1). The agent gets a picture
   back but cannot further manipulate it as structure.
2. **Multi-format proxy.** Don't render anything in-process; forward source to **Kroki** (or similar)
   and relay the result. One server, dozens of formats, near-zero engine code (§2.4). Cost: a network
   dependency and Kroki's format set, not yours.
3. **Live canvas / inline app.** Expose a *structured* tool surface (add node, connect, restyle) over
   a real editor, and render the result **inline** in the chat via the MCP Apps protocol. draw.io
   (§2.2) and the Excalidraw canvas server (§2.3) are the examples. This is the richest UX — the agent
   sees and iteratively edits — and the most work to build.

## 4. Format familiarity matters more than format power

A consistent finding (and the thesis of `REF-D2-001` / the Mermaid-vs-D2 note): **LLMs write Mermaid
most reliably** because of its training-data ubiquity, even though D2 produces nicer default output
and has a more consistent grammar. This is why Mermaid dominates the MCP landscape and why the
multi-format servers still default to, or special-case, Mermaid. For any new diagram MCP, the
practical question is less "is my grammar good?" and more "will the model emit it correctly without a
giant system prompt?".

## 5. Lessons for a possible `kymostudio-mcp`

Kept deliberately short — a pointer, not a spec.

- **No existing MCP speaks the kymo format.** Every server above targets Mermaid/PlantUML/D2/draw.io
  or proxies through Kroki; none emit kymo DSL or the kymo render pipeline. That is the gap a
  `kymostudio-mcp` would fill, and the reason it can't simply be a Kroki passthrough.
- **Reuse the Rust core.** kymostudio-core already exposes BPMN import and the draw.io / PDF encoders;
  an MCP server is a thin tool wrapper over those existing entry points, not a new renderer.
- **Decide the render path up front (§3).** The cheapest first cut is render-to-image (kymo source →
  animated SVG/WebP, kymo's actual differentiator). The most compelling is the draw.io-style
  **inline MCP Apps** delivery — worth emulating if/when the canvas editor work lands.
- **Familiarity tax (§4).** kymo's grammar is unknown to models; an MCP would need either a tight
  schema-constrained tool surface or few-shot examples baked into the tool description, rather than
  asking the model to free-write kymo DSL.

## References

Accessed 2026-06-09.

- Mermaid: [mermaid-mcp-server](https://github.com/peng-shawn/mermaid-mcp-server) ·
  [mcp-mermaid](https://github.com/hustcc/mcp-mermaid) ·
  [Mermaid Chart MCP (official)](https://mermaid.ai/docs/ai/mcp-server)
- draw.io: [drawio-mcp (official)](https://github.com/jgraph/drawio-mcp)
- Excalidraw: [mcp_excalidraw](https://mcpservers.org/servers/yctimlin/mcp_excalidraw) ·
  [mermaid-to-excalidraw-mcp](https://lobehub.com/mcp/yannick-cw-mermaid-to-excalidraw-mcp)
- Universal: [uml-mcp](https://github.com/antoinebou12/uml-mcp) ·
  [diagram-bridge-mcp](https://glama.ai/mcp/servers/@tohachan/diagram-bridge-mcp) ·
  [Kroki](https://kroki.io/)
- Charts: [@antv/mcp-server-chart](https://github.com/antvis/mcp-server-chart)
- Curated lists: [wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers) ·
  [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) ·
  [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)

## Annex A — Revision history

| Version | Date       | Author        | Change                                  |
|---------|------------|---------------|-----------------------------------------|
| 0.1     | 2026-06-09 | `diagrams/`   | Initial landscape survey of diagram MCP servers. |
