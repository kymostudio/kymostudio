---
title: kymostudio-mcp (local MCP render server) — Design
document_id: DESIGN-KMCP-001
version: "0.1"
issue_date: 2026-06-11
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers building `packages/mcp-server/` and the small `packages/js` exposure it needs
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KMCP-001
  - TEST-KMCP-001
  - PLAN-KMCP-001
  - DESIGN-KEDITOR-001
  - FEAT-FLOWCHART-001
  - FEAT-KYMOJSON-001
  - FEAT-ICONS-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - architecture
  - mcp
  - stdio
  - tool-schema
  - zod
  - format-detection
  - wasm
  - icons
  - adr
---

# kymostudio-mcp (local MCP render server) — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `DESIGN-KMCP-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KMCP-001` (requirements), `TEST-KMCP-001` (V&V), `PLAN-KMCP-001` (plan), `DESIGN-KEDITOR-001` (Worker/live-sync design), `FEAT-FLOWCHART-001` (hub), `FEAT-KYMOJSON-001` (IR), `FEAT-ICONS-001` (catalogue) |

---

## 1. Scope & placement — FR-KM-01

A new package **`packages/mcp-server/`**, published to npm as **`kymostudio-mcp`**, carrying the
monorepo lockstep version. It is a *stateless tool surface* over the engine — it owns no
rendering logic, no layout, no storage. Placement relative to the existing MCP code:

- `packages/editor/mcp-server.js` (Python-subprocess stdio server) is already **superseded**
  history per `FEAT-KEDITOR-001` §A.5; this package is its replacement as the local MCP story.
  It is **removed** when this package ships (its `set_diagram`/`get_diagram` live tools survive
  as the env-gated `push_to_editor`, FR-KM-09).
- `packages/mcp/` (the hosted `kymo-mcp` Worker, `DESIGN-KEDITOR-001` §5–7) is **unchanged**;
  it keeps identity + live canvas. Render parity there is a deferred phase (`PLAN-KMCP-001` §4).

## 2. Package & runtime — NFR-KM-01..03

```
packages/mcp-server/
  package.json        name kymostudio-mcp · bin { "kymostudio-mcp": "bin/server.mjs" }
  bin/server.mjs      entry: init engine, register tools, StdioServerTransport.connect
  src/dispatch.mjs    grammar detection + { grammar → parse fn } table
  src/icons.mjs       manifest load + offline icon source
  src/tools/*.mjs     render_diagram, convert_diagram, search_icons, push_to_editor
  test/*.test.mjs     node --test (TEST-KMCP-001)
```

Dependencies: `@modelcontextprotocol/sdk` (`McpServer` + `StdioServerTransport`, as the legacy
server used), `kymostudio` (engine), `kymostudio-core` (wasm, caret-to-MINOR per
`docs/RELEASING.md`), `zod`. Plain ESM, no build step (`.mjs` straight to npm), mirroring
`packages/js/bin/`.

Startup: read wasm bytes once — `readFileSync(require.resolve('kymostudio-core/kymostudio_core_bg.wasm'))`
→ `initSync(bytes)` (exactly the `bin/render-cli.mjs` pattern) — then load the icon manifest
(§6), register tools, connect stdio. Everything after startup is synchronous-fast except PNG
encoding.

## 3. Tool surface — FR-KM-01..04, 07..09

| Tool | Input schema (zod) | Returns |
|------|--------------------|---------|
| `render_diagram` | `{ source: string, source_format?: enum[kymo,mermaid,d2,dot,bpmn,kymo-json], format?: enum[svg,png] = png, output_path?: string, scale?: number = 2 }` | PNG: image content (base64) · SVG: text content. Always a text line naming the grammar used (FR-KM-03) and the saved path when `output_path` given. |
| `convert_diagram` | `{ source: string, source_format?: enum[...], to: enum[d2,dot,drawio,bpmn,kymo-json,mermaid] }` | Converted source as text. |
| `search_icons` | `{ query: string, limit?: number = 20 }` | Text list of `prefix:name — collection` lines. |
| `push_to_editor` *(only if `KYMO_EDITOR_URL` set)* | `{ source: string, title?: string }` | Confirmation from the room's `/set` response (`DESIGN-KEDITOR-001` §5 protocol). |

Tool descriptions are written **for the model**: they state which grammars are accepted, that
Mermaid/D2/DOT/BPMN need no kymo knowledge, and that `.kymo` unlocks icons + animation —
this is the in-band answer to the familiarity tax (`RES-MCP-001` §4) until the W2 skill exists.

## 4. Grammar detection & dispatch — FR-KM-02, 03; NFR-KM-05

One ordered sniff, applied only when `source_format` is omitted; first match wins:

1. Leading `{`/`[` and `JSON.parse` succeeds → **kymo-json**.
2. XML prolog or `<definitions`/`<bpmn:` with the BPMN 2.0 namespace → **bpmn**.
3. `^\s*(strict\s+)?(di)?graph\b` → **dot**.
4. `^\s*(flowchart|graph)\s+(TD|TB|BT|LR|RL)\b` → **mermaid**.
5. kymo block/metadata openers (`canvas `, `title:`, `flowchart … {`, `bpmn {`, region/edge syntax) → **kymo**.
6. Fallback → **d2** (D2 has the least distinctive header; last so it can't shadow the others).

The result always names the chosen grammar (FR-KM-03) so an agent can correct with
`source_format`. Dispatch is one table — the single place a grammar is added (NFR-KM-05):

| Grammar | Parse path (all existing engine API unless noted) |
|---------|----------------------------------------------------|
| kymo | `parseDiagram(source)` |
| kymo-json | `parseKymoJson(source)` |
| mermaid | `parseMermaid(source)` (wasm) |
| bpmn | `parseBpmn(source)` (wasm) |
| d2 | `parseD2(source)` — **new exposure**, §5 |
| dot | `parseDot(source)` — **new exposure**, §5 |

then `renderSVG(diagram)` → optionally `svgToPng(svg, scale)` (wasm). `convert_diagram` reuses
the same parse column, then `diagramToDrawio` / `toBpmn` / `toKymoJson`, or the source-level
transpilers `mermaidToD2` / `mermaidToDot` / `mermaidToDrawio` when `from` is mermaid.

## 5. Required engine exposure (`packages/js`) — FR-KM-05

The wasm core already exports `d2_to_kymojson` / `dot_to_kymojson` (and `*_to_svg`)
(`packages/rust/kymostudio-core/src/wasm.rs`), but `packages/js/src/core.ts` only wires the
mermaid converters. Add thin wrappers, exported from `src/index.ts`:

- `parseD2(source)` ≔ `parseKymoJson(coreD2ToKymoJson(source))`
- `parseDot(source)` ≔ `parseKymoJson(coreDotToKymoJson(source))`

Deliberately **via the `.kymo.json` IR** (`FEAT-KYMOJSON-001`), not `d2_to_svg`/`dot_to_svg`:
the IR path hands a real `Diagram` to `renderSVG`, so D2/DOT inputs get kymo styling, icons,
and edge animation like every other grammar (FR-KM-05, ADR-3). The bare `*_to_svg` exports
remain for the Rust CLI. This is the only engine change; CLI extension wiring for `.d2`/`.dot`
in `bin/render-cli.mjs` is an optional courtesy in the same phase.

## 6. Icon resolution — FR-KM-06; NFR-KM-01

The npm `kymostudio` package ships `icons-manifest.json` + `sets/` (per its `files` field). At
startup: `setManifest(JSON.parse(readFileSync(require.resolve('kymostudio/icons-manifest.json'))))`,
then install a **filesystem icon source** that resolves manifest paths relative to the
`kymostudio` package root (`dirname(require.resolve(...))`) — reading `sets/<prefix>/<name>.svg`
from disk instead of `fetch`. If `getIcon`'s loader cannot be pointed at a file reader through
the existing `setIconBaseURL` surface (it expects a URL), a `file://` base URL is the first
resort; failing that, a small `setIconLoader(fn)` hook in `packages/js` joins §5 as engine
exposure. `search_icons` queries the same in-memory manifest (addresses, names, collections).

## 7. Error shape — FR-KM-10

Every tool body is wrapped: zod rejects malformed input before the engine runs; engine throws
become MCP tool errors (`isError: true`) with `[<grammar>] <engine message>` — engine messages
already carry line/expectation where the parsers provide them, and improving them is workstream
W3 of `RES-STRATEGY-001`, not this package's job. The process never exits on a tool failure.

---

## Annex A — Key decisions & ADR

- **ADR-1 — New package, not a bin in `kymostudio`.** `npx kymostudio-mcp` must be the whole
  install story (NFR-KM-02); a bin inside `kymostudio` would need `npx -p kymostudio kymo-mcp`,
  is invisible in MCP registries, and would drag the MCP SDK + zod into the engine package's
  dependency set (breaking its zero-dep posture). Cost: one more lockstep-version spot
  (`PLAN-KMCP-001` §5 R-wiring).
- **ADR-2 — stdio-first.** Local hosts (Claude Code/Desktop, Cursor) speak stdio; the hosted
  Streamable-HTTP story already exists on the Worker. One transport keeps phase 1 small.
- **ADR-3 — D2/DOT through the `.kymo.json` IR.** The core's `*_to_svg` renders the bare
  flowchart look; routing through the IR + `renderSVG` makes output uniform across grammars —
  animation included, which is the product differentiator (`RES-STRATEGY-001` §5.5).
- **ADR-4 — PNG as default format.** Chat hosts display image content universally; SVG (the
  richer, animated artifact) is one parameter away and the better choice when saving to a repo.
  Matches the legacy server's default, so no behavior surprise.
- **ADR-5 — `push_to_editor` env-gated.** The hosted live canvas is owned by the Worker with
  OAuth; an always-on local tool pointing at a shared room would resurrect the
  `FEAT-KEDITOR-001` R1 collision risk. Opt-in by URL keeps the local server stateless by
  default.

## Annex B — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-11 | Vũ Anh | Initial design: `packages/mcp-server/` → npm `kymostudio-mcp`; four tools (`render_diagram`, `convert_diagram`, `search_icons`, env-gated `push_to_editor`); ordered grammar sniff + single dispatch table; D2/DOT via new `parseD2`/`parseDot` engine wrappers over the existing wasm `*_to_kymojson` exports; offline icon resolution from the installed `kymostudio` package; ADR-1..5. |
