---
title: Figma — External Reference
document_id: REF-FIGMA-001
version: "1.1"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the `kymo` DSL, layout engine, or render pipeline
review_cycle: On upstream Plugin API or REST API breaking change, or annually (whichever first)
supersedes: null
related_documents:
  - figma.comparision.md
  - ../formats/kymo-dsl/README.md
  - ../BEST_PRACTICE_DIAGRAMS.md
  - d2.md
authors:
  - Vũ Anh
language: en
keywords:
  - figma
  - plugin-api
  - rest-api
  - auto-layout
  - dev-mode-mcp
  - code-connect
  - design-as-code
  - prior-art
upstream:
  project: figma/figma
  homepage: https://www.figma.com/
  developer_site: https://developers.figma.com/
  rest_api_base: https://api.figma.com
  plugin_typings: "@figma/plugin-typings"
  version_reviewed: "REST v1 · Plugin API as of access date"
  access_date: 2026-05-18
---

# Figma — External Reference

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-FIGMA-001                                                  |
| Version           | 1.1                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the `kymo` DSL, layout, or render pipeline   |
| Upstream          | [`figma.com`](https://www.figma.com/) · [developers.figma.com](https://developers.figma.com/) |
| License           | Proprietary (SaaS) — Plugin typings package `@figma/plugin-typings` is MIT |
| Version Reviewed  | REST v1 · Plugin API as of access date                         |
| Access Date       | 2026-05-18                                                     |
| Related Documents | [`figma.comparision.md`](./figma.comparision.md), [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`BEST_PRACTICE_DIAGRAMS.md`](../BEST_PRACTICE_DIAGRAMS.md), [`d2.md`](./d2.md) |

This is a **reference note on prior art**, not a specification of kymo. It captures Figma's programmatic surfaces so the team can consult them when evolving kymo's DSL, layout, and render pipeline. kymo already targets Figma as an output format via `packages/python/src/kymo/to_figma.py` (emitted by `kymo <src> --figma`, see `packages/python/src/kymo/cli.py:79`); this doc describes the surface that file writes against. No behavior in this repository depends on Figma — the generated JS is consumed externally.

## 1. Overview

**Figma** is a closed-source, browser- and desktop-native collaborative design tool. It is not a text-to-diagram language and has no DSL of its own — content is authored in a WYSIWYG canvas. Programmatic access is exposed through several distinct surfaces (§2), all of which are documented at <https://developers.figma.com/>.

Figma's product family covers four canvases that share the same underlying file format and collaboration substrate:

- **Figma Design** — the original UI/illustration canvas; this is what `--figma` output targets.
- **FigJam** — whiteboard / brainstorming canvas (stickies, stamps, connectors with magnet anchors).
- **Figma Slides** — presentation canvas built on the same node model.
- **Figma Make** — prompt-to-app code generation surface introduced in 2025.

Figma's pricing tiers gate API access: REST endpoints generally require a paid seat, Variables API requires Enterprise + Full seat, and Dev Mode MCP tool calls are rate-limited to 6/month on Starter (per Figma's MCP guide at <https://help.figma.com/hc/en-us/articles/32132100833559>).

kymo targets Figma for one reason: handoff. The animated SVG/WebP pipeline produces final artifacts, but designers often want the diagram landed inside an existing Figma file as editable frames they can re-style. The Plugin API path satisfies that.

## 2. Programmatic surfaces

| Surface | Where it runs | Typical caller | Used by `kymo`? |
|---------|---------------|----------------|----------------|
| **Plugin API** (JavaScript sandbox)  | Inside the Figma editor (browser/desktop), as a plugin or via the dev console | Plugin authors, MCP `use_figma` tool | **Yes** — `packages/python/src/kymo/to_figma.py` emits this |
| **REST API v1**                       | External HTTP against `https://api.figma.com`             | CI/CD, exporters, sync scripts | No |
| **Variables REST API**                | External HTTP (subset of REST API, scoped separately)     | Design-token pipelines | No |
| **Webhooks v2**                       | Figma → your callback URL                                 | Notify external systems on file events | No |
| **Dev Mode MCP server (remote)**      | Hosted by Figma, brokered by Anthropic / claude.ai        | AI coding assistants (Claude, Cursor, Copilot) | **Yes** — `use_figma` is invoked from `packages/python/src/kymo/to_figma.py` output |
| **Dev Mode MCP server (local)**       | Figma desktop app, `localhost:3845`                       | IDE plugins that want a local socket | No |
| **Code Connect**                      | Codebase-side TypeScript files + `figma connect publish`  | Component libraries linking design ↔ code | No |
| **OAuth 2.0 / PATs**                  | Token issuance for REST + Variables + Webhooks            | All non-plugin callers | Indirectly (via MCP server's OAuth) |

The Plugin API is sandboxed JavaScript with a synchronous mutation model; the REST API is external HTTP with eventual-consistency semantics. They are **not** the same API — node-creation methods exist only in the Plugin API; bulk file-read exists only in the REST API.

## 3. Plugin API at a glance

The Plugin API is the API kymo writes against. Documentation lives under <https://developers.figma.com/docs/plugins/api/api-reference/>; the canonical TypeScript declarations ship as the `@figma/plugin-typings` npm package.

### 3.1 The `figma` global

Every plugin script runs with a `figma` global that exposes node creation, font loading, selection, viewport, and persistence:

```js
const f = figma.createFrame()
f.resize(800, 600)
figma.currentPage.appendChild(f)
```

Per the Global Objects reference, the node-creation surface includes:

| Method                          | Returns                  |
|---------------------------------|--------------------------|
| `createRectangle()`             | `RectangleNode`          |
| `createLine()`                  | `LineNode`               |
| `createEllipse()`               | `EllipseNode`            |
| `createPolygon()`               | `PolygonNode`            |
| `createStar()`                  | `StarNode`               |
| `createVector()`                | `VectorNode`             |
| `createText()`                  | `TextNode`               |
| `createFrame()`                 | `FrameNode`              |
| `createAutoLayout()`            | `FrameNode` (auto-layout pre-applied) |
| `createComponent()`             | `ComponentNode`          |
| `createComponentFromNode(node)` | `ComponentNode`          |
| `createPage()`                  | `PageNode`               |
| `createImage(bytes)`            | `Image` (synchronous, ≤4096²) |
| `createImageAsync(url)`         | `Promise<Image>`         |
| `createVideoAsync(bytes)`       | `Promise<VideoNode>`     |
| `createNodeFromSvg(svgString)`  | `FrameNode` (parsed SVG) |

`createNodeFromSvg` is load-bearing for kymo's hybrid path: each leaf component is rendered to an SVG snippet by `component_svg_snippet()` (`packages/python/src/kymo/to_svg.py`) and re-parented into a Figma frame, preserving full glyph fidelity (hex outline + head + collar V for `hex-agent`, etc) rather than reducing to a coloured primitive. See `packages/python/src/kymo/to_figma.py:161` (`_tree_to_js`) and `:261` (`_component_flat_js`).

### 3.2 Fonts

Text creation is async — the font must be loaded before assigning `characters`:

```js
await figma.loadFontAsync({family: 'Inter', style: 'Medium'})
const t = figma.createText()
t.fontName = {family: 'Inter', style: 'Medium'}
t.characters = 'hello'
```

kymo loads Inter Regular/Medium/Bold up front in both render paths (`packages/python/src/kymo/to_figma.py:212`, `:286`). Forgetting `loadFontAsync` is the #1 source of "Cannot set property 'characters'" failures.

### 3.3 Parenting

The scene graph is mutated by `parent.appendChild(child)` / `insertChild(index, child)`. Nodes start parentless after creation; appending them to `figma.currentPage` or another frame is what makes them visible. kymo always parents new nodes to a single `root` frame that wraps the diagram (`packages/python/src/kymo/to_figma.py:217`).

### 3.4 Fills, strokes, paints

`fills` and `strokes` are arrays of `Paint` objects. The simplest is `SolidPaint`:

```js
node.fills = [{type: 'SOLID', color: {r: 0.918, g: 0.345, b: 0.047}}]
```

**RGB is 0..1, not 0..255.** kymo's palette in `packages/python/src/kymo/to_figma.py:39` is pre-normalised for this reason. Other paint types: `GRADIENT_LINEAR`, `GRADIENT_RADIAL`, `GRADIENT_ANGULAR`, `GRADIENT_DIAMOND`, `IMAGE`, `VIDEO`, `PATTERN`.

### 3.5 Vector networks

A vector network is the underlying geometry of `VectorNode` — vertices, segments, and optional regions (closed fills). Set asynchronously:

```js
await v.setVectorNetworkAsync({
  vertices: [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 60}],
  segments: [{start: 0, end: 1}, {start: 1, end: 2}],
  regions: []
})
```

kymo uses this for edges (`packages/python/src/kymo/to_figma.py:104`): every routed waypoint becomes a vertex, consecutive vertices become a segment, and the resulting polyline is stroked with `strokeCap = 'ARROW_LINES'`. The `regions: []` is required even when empty — omit it and the call rejects.

## 4. Auto-layout

Auto-layout is Figma's flex-equivalent — set `layoutMode` on a frame and its children stack along that axis with the declared spacing/padding/alignment.

| Property                  | Type / values                                        |
|---------------------------|------------------------------------------------------|
| `layoutMode`              | `'NONE' \| 'HORIZONTAL' \| 'VERTICAL' \| 'GRID'`     |
| `itemSpacing`             | `number`                                             |
| `paddingLeft/Right/Top/Bottom` | `number`                                        |
| `primaryAxisSizingMode`   | `'FIXED' \| 'AUTO'`                                  |
| `counterAxisSizingMode`   | `'FIXED' \| 'AUTO'`                                  |
| `primaryAxisAlignItems`   | `'MIN' \| 'MAX' \| 'CENTER' \| 'SPACE_BETWEEN'`      |
| `counterAxisAlignItems`   | `'MIN' \| 'MAX' \| 'CENTER' \| 'BASELINE'`           |
| `layoutWrap`              | `'NO_WRAP' \| 'WRAP'`                                |
| `counterAxisSpacing`      | `number \| null` (gap between wrapped lines)         |
| `counterAxisAlignContent` | `'AUTO' \| 'SPACE_BETWEEN'`                          |
| `layoutGrids`             | `ReadonlyArray<LayoutGrid>` (for `GRID` mode)        |

Per-child sizing is controlled by `layoutSizingHorizontal` / `layoutSizingVertical` (`'FIXED' \| 'HUG' \| 'FILL'`). Hug-content vs fill-container is Figma's most distinctive layout primitive — it expresses "this column grows with its children" vs "this column fills the remaining space" without resorting to absolute coordinates.

kymo's hybrid render path (`packages/python/src/kymo/to_figma.py:161`, `_tree_to_js`) maps a `.kymo` layout tree onto nested auto-layout frames: each `|` becomes `layoutMode: 'HORIZONTAL'`, each `,` becomes `layoutMode: 'VERTICAL'`, `itemSpacing` is uniformly `DEFAULT_GAP = 40`, and sizing is `AUTO/AUTO` so the frame hugs its children. Because Python's `apply_layout_tree` and Figma's auto-layout share the same spacing + alignment rules, component positions match — which lets kymo keep edges as top-level absolute vectors and still have them connect.

A subtle gotcha: `clipsContent` defaults to `true` on auto-layout frames in newer Figma versions; kymo explicitly disables it (`packages/python/src/kymo/to_figma.py:191`) so edges that extend past the frame bounds remain visible.

## 5. File model

A Figma file is a tree:

```
DocumentNode
└── PageNode             (one per "page" tab in the UI)
    └── FrameNode        (top-level artboards)
        ├── FrameNode    (nested frames, optionally auto-layout)
        ├── GroupNode    (loose grouping, no layout)
        ├── ComponentNode / InstanceNode
        ├── VectorNode / RectangleNode / EllipseNode / ...
        └── TextNode
```

Every node has a stable `id` in the form `<sessionId>:<localId>` (e.g. `123:456`). The fileKey is the alphanumeric segment in the URL: `figma.com/design/:fileKey/:fileName?node-id=:nodeId` — the Figma MCP server's URL parsing instructions explicitly require converting URL `-` to `:` in `nodeId` when calling its tools. Branch files use `figma.com/design/:fileKey/branch/:branchKey/...`.

## 6. Components, instances, variants

Figma's reuse primitive is the **main component** (`ComponentNode`) and its **instances** (`InstanceNode`). Edits to the main component propagate to instances; overrides on an instance survive re-syncs as long as the structure matches.

- **Component sets / variants** — a `ComponentSetNode` groups variant components sharing a property schema (e.g. `Size=sm/md/lg`, `State=default/hover/disabled`). The set publishes a single instance-swappable handle to consumers.
- **Component properties** — attached to a main component and exposed on every instance. Four types: `BOOLEAN`, `TEXT`, `INSTANCE_SWAP`, `VARIANT`.
- **Instance swap** — `instance.swapComponent(target)` replaces the underlying main while preserving properties whose names match.

kymo does not currently emit Figma components — every diagram is laid down as one-off frames. A future enhancement: emit `Component` for repeated icons (`hex-agent`, `cylinder`) so a single edit propagates, mirroring kymo's `samples/` reuse pattern.

## 7. Variables and styles

Figma has two overlapping token systems. **Styles** are the older approach: named colour/text/effect/grid presets, addressable as `node.fillStyleId = id`. **Variables** (introduced 2023) are the modern system and largely subsume styles.

A **variable** is a typed, named token with one value per **mode** (e.g. `light`, `dark`). Four variable types are documented in the REST API:

- `COLOR` — `RGBA` (0..1)
- `FLOAT` — `number`
- `STRING`
- `BOOLEAN`

Variables can alias other variables, forming chains (e.g. `surface.primary → palette.gray.50`). Mode switching at the frame level cascades to all referenced variables under that frame — this is how dark mode works in Figma.

REST endpoints (require `file_variables:read` / `file_variables:write` scopes, Enterprise + Full seat):

| Verb | Path                                  | Purpose                                                  |
|------|---------------------------------------|----------------------------------------------------------|
| GET  | `/v1/files/:file_key/variables/local`     | Read variables defined in this file                  |
| GET  | `/v1/files/:file_key/variables/published` | Read variables exposed to consumer files             |
| POST | `/v1/files/:file_key/variables`           | Bulk create/update/delete variables and collections  |

kymo's `ACCENTS` palette (`packages/python/src/kymo/to_figma.py:39`) is currently hardcoded as 0..1 RGB literals. A Figma-native rewrite would map each accent to a `COLOR` variable so designers can re-theme without editing kymo source.

## 8. REST API

Base URL: `https://api.figma.com` (or `https://api.figma-gov.com` for FedRAMP customers). All endpoints sit under `/v1/` (Webhooks under `/v2/`).

### 8.1 File and node endpoints

| Verb | Path                                | Purpose                                                  |
|------|-------------------------------------|----------------------------------------------------------|
| GET  | `/v1/files/:key`                    | Full file JSON (node tree, components, styles)           |
| GET  | `/v1/files/:key/nodes?ids=...`      | Subset of nodes — cheaper than full file fetch           |
| GET  | `/v1/files/:key/meta`               | File metadata (name, last_modified, version)             |
| GET  | `/v1/files/:key/versions`           | Named version history                                    |
| GET  | `/v1/images/:key?ids=...&format=svg` | Render selected nodes to SVG/PNG/PDF/JPG                |
| GET  | `/v1/files/:key/images`             | Download links for image fills in the file               |

The `targetAspectRatio` query parameter on `GET /v1/files/:key` was added in 2025 (per the [REST changelog](https://developers.figma.com/docs/rest-api/changelog/)) and lets consumers request a cropped representation. The classic `files:read` OAuth scope is being superseded by more specific scopes (`file_content:read`, `file_comments:read`, `file_variables:read`, etc); plan accordingly when issuing tokens.

### 8.2 Comments, components, projects, users

- `GET /v1/files/:key/comments`, `POST /v1/files/:key/comments`, `DELETE /v1/files/:key/comments/:comment_id` — collaborative comments.
- `GET /v1/teams/:team_id/components`, `GET /v1/files/:key/components` — published / file-local components.
- `GET /v1/teams/:team_id/projects`, `GET /v1/projects/:project_id/files` — project navigation.
- `GET /v1/me` — current user (used as auth smoke-test).

### 8.3 Webhooks v2

| Verb | Path                       | Purpose                                                 |
|------|----------------------------|---------------------------------------------------------|
| GET  | `/v2/webhooks`             | List webhooks attached to a context                     |
| POST | `/v2/webhooks`             | Create a webhook                                        |
| GET  | `/v2/webhooks/:id/requests`| Inspect the last 7 days of delivery attempts            |

Event types: `PING`, `FILE_UPDATE` (debounced ~30 min of editing inactivity), `FILE_DELETE`, `FILE_VERSION_UPDATE` (named version created), `LIBRARY_PUBLISH`, `FILE_COMMENT`, `DEV_MODE_STATUS_UPDATE`.

### 8.4 Rate limits

REST API rate limits are tiered by plan (Tier 1 / Tier 2 / Tier 3) and counted per-minute, per-token. The Dev Mode MCP server inherits the same tiering. Public docs do not enumerate exact RPM numbers; the official guidance is "exponential backoff on 429". kymo emits no REST calls today, so this is informational only.

## 9. Dev Mode MCP server

The MCP server brings Figma into AI coding tools (Claude Code, Cursor, Copilot, Windsurf) as a set of tools an agent can call. Two flavours:

- **Remote MCP server** (`https://mcp.figma.com/mcp` — brokered by `claude.ai` in this environment as the `claude_ai_Figma` namespace): the recommended path, no desktop app needed, OAuth-authenticated, exposes the full tool catalog.
- **Local MCP server** (Figma desktop app, `http://localhost:3845`): for enterprise scenarios where traffic must stay on-host; smaller tool surface.

Per <https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/>, the full tool catalog is:

| Tool                          | What it does                                                                 |
|-------------------------------|------------------------------------------------------------------------------|
| `get_design_context`          | Default tool — returns structured code (React + Tailwind by default) for a selection |
| `get_metadata`                | Sparse XML of IDs / names / types / positions — use when `get_design_context` is too large |
| `get_screenshot`              | PNG of the selection — pair with `get_design_context` for fidelity           |
| `get_variable_defs`           | Variables and styles in scope of the selection                               |
| `get_code_connect_map`        | Maps selected Figma instance IDs → code components                           |
| `get_code_connect_suggestions`| Suggests new Code Connect mappings                                           |
| `add_code_connect_map`        | Writes a new Figma node ID ↔ code component mapping                          |
| `send_code_connect_mappings`  | Confirms suggested mappings after review                                     |
| `get_context_for_code_connect`| Properties / variants / descendants of a component, for authoring Code Connect |
| `get_libraries`               | Lists libraries attached to the current file (incl. community kits)          |
| `search_design_system`        | Full-text search across connected libraries                                  |
| `get_figjam`                  | XML + screenshot of a FigJam board                                           |
| `use_figma`                   | Generic "create/edit/delete/inspect" tool — accepts a `code` string of Plugin API JS |
| `create_new_file`             | Creates a blank Design or FigJam file in the user's drafts                   |
| `generate_diagram`            | Mermaid or natural-language → FigJam diagram                                 |
| `upload_assets`               | Upload PNG/JPG/GIF/WebP as fills or new frames                               |
| `whoami`                      | Authenticated user identity + seat type                                      |

`use_figma` is what consumes kymo's `--figma` output: the JS string emitted by `packages/python/src/kymo/to_figma.py` is passed as the `code` argument. **The `/figma-use` skill is mandatory** before any `use_figma` call (declared in the MCP server's `instructions` block); skipping it has produced silent malformed-input errors in practice.

The recommended workflow from Figma's own docs is `get_design_context` → (if too big) `get_metadata` then re-call `get_design_context` on narrower IDs → `get_screenshot` → only then start writing code. For kymo specifically the direction is reversed — we generate Figma content from a `.kymo` source — so the relevant tools are `use_figma`, `create_new_file`, and `upload_assets`.

Rate-limit caveat: Starter plan + View/Collab seats are capped at **6 tool calls per month**; Dev/Full seats on paid plans share the Tier 1 REST rate limit. The cap bites quickly during iteration.

## 10. Code Connect

Code Connect is the bridge that lets Figma's Dev Mode show a real code snippet for a component instead of an autogenerated one. Mappings live in the codebase as TypeScript files; `figma connect publish` uploads them.

Two authoring styles:

- **Template files** (recommended, framework-agnostic):
  ```typescript
  import figma from 'figma'
  const instance = figma.selectedInstance
  export default {
    example: figma.code`<Button size={...} disabled={...}>${instance.getString('Text Content')}</Button>`,
    imports: ['import { Button } from "components/Button"'],
    id: 'button',
  }
  ```
- **Legacy per-framework adapters** for React/React Native, HTML (Web Components, Angular, Vue), SwiftUI, Jetpack Compose.

For kymo, the relevance is conceptual: Code Connect ties a *visual* Figma node to a *symbolic* code identifier. kymo's `packages/python/src/kymo/icons.py` symbols (`hex-agent`, `cube-orange`, `cylinder`) are the moral equivalent on the diagram side — a future direction would be exposing them as Figma components so a single Code Connect mapping covers every appearance in a generated diagram.

## 11. FigJam, Slides, Make

Brief, since none of these is what `--figma` currently targets:

- **FigJam** — whiteboard. Adds `STICKY`, `STAMP`, `SHAPE_WITH_TEXT` node types and **connectors with magnet anchors** that re-route automatically when endpoints move. `generate_diagram` (MCP) renders Mermaid or NL into a FigJam board — a possible alternative path if kymo wanted "drop into a brainstorming board" instead of "drop into a design file".
- **Figma Slides** — same node model as Design, with slide-level navigation. Not currently a useful target for kymo (no animation primitive that maps to flowing-dash edges).
- **Figma Make** — prompt-to-app code generation. Out of scope: it accepts intent, not Plugin API JS.

## 12. Authentication

- **Personal Access Token (PAT)** — issued per-user under *Settings → Security*. Sent as `X-Figma-Token: <pat>` header. For local scripts and one-off tooling; cannot be issued for the Variables API on most plans.
- **Plan Access Tokens** — issued by org/enterprise admins. Sent the same way as PATs but tied to a plan rather than a user; appropriate for CI/CD.
- **OAuth 2.0** — required for Activity Logs, Discovery, and Embed APIs, and for any third-party app acting on behalf of users. The Figma MCP server uses OAuth. Tokens are issued against a published list of scopes — the modern, narrow scopes (`file_content:read`, `file_comments:read`, `file_variables:read`, `file_variables:write`) are preferred over the legacy catch-all `files:read`.

kymo itself holds no Figma credentials — auth is delegated to whoever runs the generated JS (Plugin sandbox = no auth needed; `use_figma` over MCP = the MCP server's OAuth session).

## 13. Output formats and export

Figma can export selected nodes to:

- **PNG**, **JPG**, **PDF**, **SVG** via `GET /v1/images/:key?ids=...&format=...&scale=N` (REST).
- **PNG/JPG** via `exportAsync({format: 'PNG', constraint: {type: 'SCALE', value: 2}})` (Plugin API, per-node).

SVG export has two well-known quirks worth noting:

1. IDs are auto-prefixed with a session-scoped string to avoid collisions when multiple SVGs are inlined into one HTML page — round-tripping requires care.
2. Text falls back to outlines unless `svg_outline_text=false` is supplied; the fallback exists because not every consumer ships the Figma font set.

kymo never imports from Figma — only emits — so these matter only if a future kymo workflow ingests Figma-exported SVGs.

## 14. Comparison vs `kymo`

The opinionated prior-art comparison — at-a-glance matrix, headline tradeoffs, a per-category scoring of Figma against kymo, and open questions for kymo — lives in [`figma.comparision.md`](figma.comparision.md). It is kept separate so it can evolve at a different cadence than this factual reference (kymo changes alone are enough to invalidate it, even when upstream Figma has not moved).

## 15. References

All accessed 2026-05-18.

- Figma developer site — <https://developers.figma.com/>
- Plugin API reference — <https://developers.figma.com/docs/plugins/api/api-reference/>
- Plugin global objects — <https://developers.figma.com/docs/plugins/api/global-objects/>
- Plugin auto-layout properties — <https://developers.figma.com/docs/plugins/api/FrameNode/>
- Plugin typings package — <https://www.npmjs.com/package/@figma/plugin-typings>
- REST API introduction — <https://developers.figma.com/docs/rest-api/>
- REST file endpoints — <https://developers.figma.com/docs/rest-api/file-endpoints/>
- REST Variables — <https://developers.figma.com/docs/rest-api/variables/>
- REST Authentication — <https://developers.figma.com/docs/rest-api/authentication/>
- REST Webhooks events — <https://developers.figma.com/docs/rest-api/webhooks-events/>
- REST changelog — <https://developers.figma.com/docs/rest-api/changelog/>
- Figma MCP server overview — <https://developers.figma.com/docs/figma-mcp-server/>
- MCP tools and prompts — <https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/>
- MCP server help-center guide — <https://help.figma.com/hc/en-us/articles/32132100833559>
- Dev Mode MCP server launch post — <https://www.figma.com/blog/introducing-figma-mcp-server/>
- Code Connect overview — <https://developers.figma.com/docs/code-connect/>
- Compare the Figma APIs — <https://developers.figma.com/compare-apis/>

### Cross-references within this repo

- `docs/softwares/d2.md` — sibling reference doc on the D2 text-to-diagram language (same template).
- `packages/python/src/kymo/to_figma.py` — kymo's Figma Plugin API emitter; hybrid auto-layout path at `:161` (`_tree_to_js`), flat fallback at `:261` (`_component_flat_js`), edge vector-network emission at `:77` (`edge_to_js`).
- `packages/python/src/kymo/cli.py:79` — `--figma` flag handling.
