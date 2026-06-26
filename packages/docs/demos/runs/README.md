# demos/runs

Isolated **uv** project that *drives* the static demos under
[`../src`](../src) with Playwright (Python). These are automation tools to
operate / showcase the demos — not a test suite.

## Setup (once)

```bash
cd packages/docs/demos/runs
uv sync                      # create the venv from uv.lock
uv run playwright install chromium
```

## Drivers

| Script | Drives | What it does |
| --- | --- | --- |
| `drive_req1.py` | `../src/editor/guest/index-2-req1.html` | Pastes a spread of formats (PlantUML, DBML, GraphViz, Kymo, plain text) and captures the auto-detect → render flow. |

```bash
uv run python drive_req1.py             # headed walkthrough
uv run python drive_req1.py --headless  # no window (capture only)
pbpaste | uv run python drive_req1.py --paste -   # paste your own source
```

Screenshots land in `./req1-shots/` (gitignored).
