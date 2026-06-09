# @kymostudio/editor

A web playground **and an MCP server** that render the **kymo flowchart DSL**
(`flowchart { }` block) to SVG/PNG. Type a `.kymo` flowchart on the left, see
the SVG on the right — or let an LLM host (Claude Desktop, Cursor) generate and
render flowcharts via the [MCP server](#mcp-server).

## The syntax

It renders kymo's flowchart-as-code — the `flowchart [DIR] { }` block:

```
flowchart TD {
  A[Nhận đơn hàng] --> B{Còn hàng?}
  B -->|Có| C[Thanh toán]
  B -->|Không| D[Thông báo khách]
  C --> E[Đóng gói]
  E --> F((Giao hàng))
  D --> G[Hủy đơn]
}
```

Node shapes (`[ ]` box, `{ }` diamond, `( )` round, `(( ))` circle) + `-->`
edges with optional `|label|`. A direction (`TD` / `LR` / `RL` / `BT`) after
`flowchart` sets the layout flow; the engine positions everything — no manual
coordinates.

> kymo also has a sibling `bpmn { }` block (BPMN-style: `start`/`task`/`xor`/
> `and`/`end` nodes + `->` flows). This app defaults to `flowchart { }`; both
> are accepted by the same renderer.

## How it works

Rendering is delegated to the Python reference renderer (`render_kymo.py`):
the source is piped on stdin, parsed (`kymo.dsl.parse`), laid out (the
`kymostudio-core` engine resolves the `bpmn { }` block), and rendered to SVG
(`kymo.to_svg.render`) on stdout. The Node server (`server.js`, built-in
`http` only) just bridges the browser to that script.

> The Rust `kymo` CLI does **not** render the `.kymo` DSL — it renders
> Mermaid/D2/DOT. The `.kymo` path is the Python/JS engine, used here.

## Run

```bash
# one-time: a venv with the layout core
python3 -m venv .venv
.venv/bin/pip install "kymostudio-core>=0.4,<0.5"

npm start                      # -> http://0.0.0.0:4173
```

Environment:

- `PORT` (default `4173`), `HOST` (default `0.0.0.0`)
- `KYMO_PYTHON` — python interpreter (default: `./.venv/bin/python`, else `python3`)
- `KYMO_PYTHONPATH` — path to the `kymo` package (default: `../python/src`)

## API

`POST /api/render` with `{ "source": "bpmn { ... }" }`
→ `{ "svg": "<svg…>" }`, or `{ "error": "…" }` (HTTP 422) with the renderer's
message on a parse/render failure.

`GET /api/health` → `{ ok, python, pythonpath }`.

## MCP server

`mcp-server.js` exposes the same renderer over the **Model Context Protocol**
(stdio), so an LLM host can author a kymo flowchart and get back a rendered
diagram — like the Mermaid / Draw.io MCP servers.

**Tool** — `render_flowchart`:

| Arg | | Description |
|-----|--|-------------|
| `source` | required | the kymo flowchart DSL (`flowchart [DIR] { … }` or `bpmn { … }`) |
| `format` | optional | `"png"` (default — returned as an inline image) or `"svg"` (vector text) |
| `output_path` | optional | absolute path to also save to (`.png` rasterizes via the Rust CLI, else SVG) |

The tool description ships a compact syntax primer, so the model writes valid
kymo DSL with little hallucination.

Run it: `npm run mcp` (or `node mcp-server.js`). Add to a host config, e.g.
Claude Desktop's `claude_desktop_config.json` / Cursor's `mcp.json`:

```json
{
  "mcpServers": {
    "kymostudio": {
      "command": "node",
      "args": ["/abs/path/to/packages/editor/mcp-server.js"]
    }
  }
}
```

Extra env (besides `KYMO_PYTHON` / `KYMO_PYTHONPATH`):

- `KYMO_BIN` — path to the `kymo` Rust CLI used for PNG rasterization (default:
  the in-repo `../rust/kymostudio/target/release/kymo`, else `kymo` on `PATH`).
  If absent, `format: "png"` falls back to returning the SVG text.
