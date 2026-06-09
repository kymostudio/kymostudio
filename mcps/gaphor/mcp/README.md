# gaphor-mcp

An MCP server to **generate, inspect, render, validate and export Gaphor
(`.gaphor`) sequence diagrams** — driven from Mermaid `sequenceDiagram` source.

Unlike [`amolenaar/gaphor-mcp-server`](https://github.com/amolenaar/gaphor-mcp-server)
(a concept that embeds the `gaphor` Python library and so needs the full
GTK/PyGObject build), this server is a **thin bridge over two CLIs** and needs
**no GTK build**:

- **`kymo`** (kymostudio) — Mermaid `sequenceDiagram` → `.gaphor`, and SVG → PNG.
- **`gaphor export`** (Gaphor's own headless renderer) — `.gaphor` → SVG/PNG/PDF.

## Tools

Designed per MCP best practices — structured reads first, pixels on demand,
actionable errors, a high-level generate-from-DSL happy path:

| Tool | Kind | Purpose |
|------|------|---------|
| `generate_sequence_diagram(mermaid, name?)` | write | Mermaid → `.gaphor` file + structured summary |
| `validate_mermaid(mermaid)` | read | Parse-check source; actionable `{valid, error}` |
| `get_model_info(gaphor_path)` | read | **Structured** model (diagrams, lifelines, messages) — the cheap "snapshot" |
| `render_diagram(gaphor_path, diagram?)` | read | PNG **image** for visual confirmation (Gaphor's own renderer) |
| `export_diagram(gaphor_path, fmt, out_dir?)` | write | Export to `svg`/`png`/`pdf` files |

> Gaphor's metamodel has no combined fragments — `alt`/`loop`/`opt`/`par` are
> **flattened** (inner messages still render; the box/guards are dropped).

## Requirements

- Python ≥ 3.10 (only `mcp[cli]` — pure Python, no GTK).
- The `kymo` binary (build: `cargo build` in `packages/rust/kymostudio`, or
  `cargo install --path packages/rust/kymostudio`).
- Gaphor 7+ installed (the macOS app bundle ships the `gaphor export` CLI).

## Configure (Claude Code / Claude Desktop)

```jsonc
{
  "mcpServers": {
    "gaphor": {
      "command": "uvx",
      "args": ["--from", "/ABS/PATH/k2/mcps/gaphor-mcp", "gaphor-mcp"],
      "env": {
        "KYMO_BIN": "/ABS/PATH/k2/packages/rust/kymostudio/target/debug/kymo",
        "GAPHOR_BIN": "/Applications/Gaphor.app/Contents/MacOS/gaphor"
      }
    }
  }
}
```

Or with Claude Code: `claude mcp add gaphor -- uvx --from <abs-path> gaphor-mcp`.

### Environment variables (all optional)

- `KYMO_BIN` — path to `kymo` (else `PATH`, else the kymostudio debug build).
- `GAPHOR_BIN` — Gaphor CLI (default: the macOS app bundle).
- `GAPHOR_MCP_WORKDIR` — where generated `.gaphor` files go (default `~/.gaphor-mcp`).
