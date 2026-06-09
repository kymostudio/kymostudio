# gaphor-remote (Gaphor plugin)

A **Gaphor service plugin** that exposes a small **HTTP/JSON API into the running
Gaphor app** — so an external process (the `gaphor` MCP server in `../mcp`) can
control the *live* GUI: list diagrams, switch the displayed diagram, render the
current view, and find elements. Same pattern as StarUML's HTTP API (`:58321`)
and Blender's socket addon.

It registers via the `gaphor.services` entry point; Gaphor injects the live
`element_factory`, `event_manager` and `diagrams` services into it. A background
HTTP thread receives commands and marshals each onto the GTK main loop with
`GLib.idle_add` (model/GTK objects are main-thread-only).

## API (POST JSON `{ "method": ..., "params": {...} }` → `{ ok, result | error }`)

| method | params | result |
|--------|--------|--------|
| `status` | — | `{status:"ready"}` (GET `/` also works) |
| `list_diagrams` | — | `[{id, name}]` |
| `get_current_diagram` | — | `{id, name}` or `null` |
| `open_diagram` | `{id}` | switches the GUI tab |
| `render_diagram` | `{id?, format: png\|svg}` | `{mime, base64, ...}` |
| `find_elements` | `{name}` | `[{id, type, name}]` |
| `rename` | `{id, name}` | layout-free edit |
| `delete` | `{id}` | unlinks element + its presentations |

Layout-free edits only. **Building** diagrams (add lifeline/message) is *not*
exposed — Gaphor has no good programmatic layout for fresh sequence items, so
that job belongs to the file generator (`kymo`, in `../mcp`).

## Install

Gaphor must be ≥ 3.0. Install into Gaphor's plugin directory **without deps**
(`gaphor` is provided by the app), then **restart Gaphor**:

```bash
pip install --no-deps --target "$HOME/.local/gaphor/plugins-2" .
```

On start, Gaphor discovers the entry point and the server comes up on
`http://127.0.0.1:9899` (set `GAPHOR_REMOTE_PORT` to change). Verify:

```bash
curl -s http://127.0.0.1:9899/        # {"ok":true,"result":{"status":"ready"}}
```

> If `plugins-2` is wrong for your build, set `GAPHOR_PLUGIN_PATH` to a dir of
> your choice and install there instead.
