# MCP Server

kymo runs a hosted [Model Context Protocol](https://modelcontextprotocol.io)
server at **`mcp.kymo.studio`**. Connect it to Claude Code, Cursor, Copilot,
Codex — even ChatGPT or Claude in your browser — and your coding agent can
create and edit your diagrams, rendering **live** in
[editor.kymo.studio](https://editor.kymo.studio) while the agent types.

1. **Add the server** to your agent — one line of config (below).
2. **Ask for a diagram** — the agent writes the source and calls the tools.
3. **Watch it draw** at editor.kymo.studio — animated SVG, ready to export.

## Connect to the kymo MCP server

The server speaks two transports: **SSE** at `https://mcp.kymo.studio/sse`
(recommended where supported) and **HTTP** at `https://mcp.kymo.studio/mcp`.
Pick your client:

::: code-group

```bash [Claude Code]
claude mcp add --transport sse kymo https://mcp.kymo.studio/sse
```

```json [Cursor]
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "kymo": { "url": "https://mcp.kymo.studio/sse" }
  }
}
```

```bash [VS Code]
code --add-mcp '{"name":"kymo","type":"sse","url":"https://mcp.kymo.studio/sse"}'
```

```bash [Codex]
codex mcp add kymo --url https://mcp.kymo.studio/mcp
```

```bash [Gemini CLI]
gemini mcp add --transport sse kymo https://mcp.kymo.studio/sse
```

```json [Windsurf]
// ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "kymo": { "serverUrl": "https://mcp.kymo.studio/sse" }
  }
}
```

```text [Claude.ai]
Claude (web / desktop / mobile):
Settings → Connectors → Add custom connector
URL: https://mcp.kymo.studio/mcp
```

```text [ChatGPT]
ChatGPT (developer mode):
Settings → Apps → Create
Connector URL: https://mcp.kymo.studio/mcp
```

```json [Other]
// Generic MCP client — most read an mcp.json-style config.
// Use OAuth as the connection mechanism if your client asks.
{
  "mcpServers": {
    "kymo": { "url": "https://mcp.kymo.studio/mcp" }
  }
}
```

:::

## Authentication

The first time your client connects, the server starts an **OAuth flow with
Google sign-in** — no API keys to create or paste. Diagrams are owned by your
Google account: every tool call operates only on your own diagrams, and the
same account sees them in the editor.

To disconnect, remove the server from your client's MCP configuration; the
session is not used anywhere else.

## Tools

| Tool | What it does | Inputs |
|------|--------------|--------|
| `new_diagram` | Create a diagram and open it live; returns its id and editor URL. | `title?`, `source?` (initial DSL), `kind?` |
| `list_diagrams` | List your diagrams (id, title, kind, URL), most-recent first. | — |
| `get_diagram` | Fetch a diagram's source. | `id?` (defaults to most recent) |
| `edit_diagram` | Replace the source and/or rename; pushes the change live to any open editor tab. | `source?`, `title?`, `id?`, `kind?` |
| `delete_diagram` | Permanently delete a diagram. **Cannot be undone.** | `id` |

> `delete_diagram` is destructive — if your client supports per-tool
> confirmation, keep it on.

## Diagram kinds

`new_diagram` / `edit_diagram` accept a `kind`:

- **`kymo`** (default) — the native [`.kymo` language](./dsl-guide), rendered
  as animated SVG by kymo's own engine.
- **Kroki types** — `mermaid`, `plantuml`, `c4plantuml`, `graphviz`, `d2`,
  `bpmn`, `dbml`, `erd`, `excalidraw`, `nomnoml`, `pikchr`, `structurizr`,
  `svgbob`, `tikz`, `vega`, `vegalite`, `wavedrom`, `wireviz`, and more —
  previewed in the editor via [kroki.io](https://kroki.io).

For the Mermaid syntax kymo understands natively, see
[Flowchart](../diagrams/flowchart) and
[Sequence Diagram](../diagrams/sequence).

## Try it

With the server connected, ask your agent something like:

```text
Draw the request flow of this repo as a flowchart on kymo —
client → API → queue → worker → database, with a retry loop.
```

The agent calls `new_diagram`, replies with an `editor.kymo.studio` link, and
every follow-up (“make the queue a cylinder”, “add a cache”) lands as an
`edit_diagram` you watch happen live.

## See also

- [Getting Started](./getting-started) — install the CLI and render locally.
- [The .kymo Language](./dsl-guide) — the native DSL your agent writes.
- [Flowchart](../diagrams/flowchart) / [Sequence Diagram](../diagrams/sequence)
  — Mermaid syntax pages with live examples.
