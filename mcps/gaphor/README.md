# gaphor — MCP + plugin for Gaphor sequence diagrams

Two parts that work together:

```
mcps/gaphor/
├── mcp/      # the MCP server (gaphor_mcp) — talks to clients like Claude Code
└── plugin/   # the Gaphor in-app plugin (gaphor_remote) — live HTTP API in the app
```

## `mcp/` — the MCP server

Generate / inspect / render / export Gaphor `.gaphor` sequence diagrams. Has two
modes:

- **File mode** — bridges the `kymo` + `gaphor export` CLIs (no GTK build):
  `generate_sequence_diagram`, `validate_mermaid`, `get_model_info`,
  `render_diagram`, `export_diagram`.
- **Live mode** — drives the *running* Gaphor app through `plugin/`:
  `live_status`, `live_list_diagrams`, `live_open_diagram`,
  `live_render_diagram`, `live_find_elements`, plus layout-free edits
  `live_rename` and `live_delete`.

**Role split (by design).** Building a *whole* diagram → **file mode**
(`generate_sequence_diagram` — kymo lays it out well). The live app is for
**viewing/navigating** and **layout-free edits** (rename/delete). Adding fresh
lifelines/messages programmatically is intentionally *not* exposed: Gaphor has
no good auto-layout for new sequence items, so they'd pile up unplaced.

See [`mcp/README.md`](mcp/README.md). File mode works standalone; live mode needs
the plugin installed and Gaphor running.

## `plugin/` — the Gaphor plugin

A `gaphor.services` plugin that runs an HTTP/JSON server inside the live Gaphor
app (default `127.0.0.1:9899`), which the MCP server's `live_*` tools call. See
[`plugin/README.md`](plugin/README.md).

## Quick start

```bash
# 1. MCP server (file mode works immediately)
cd mcp && uv venv .venv && uv pip install --python .venv/bin/python -e .
claude mcp add gaphor -- /ABS/.../mcps/gaphor/mcp/.venv/bin/gaphor-mcp

# 2. (optional) live mode: install the plugin into Gaphor and restart it
cd ../plugin && pip install --no-deps --target "$HOME/.local/gaphor/plugins-2" .
```
