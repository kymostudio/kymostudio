# @kymostudio/desktop-app

An Electron desktop app that renders the **kymo flowchart DSL** to SVG — a live
editor with preview. The desktop sibling of `packages/web-app` (same syntax,
same Python renderer; IPC instead of HTTP).

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
`flowchart` sets the layout flow.

## How it works

- **Renderer** (`renderer/index.html`) — the editor/preview UI. On edit it calls
  `window.kymo.render(source)` (exposed by `preload.js`).
- **Main** (`main.js`) — handles the `kymo:render` IPC by piping the source
  through `render_kymo.py` (parse → `kymostudio-core` layout → `kymo.to_svg`)
  and returns the SVG.

> The Rust `kymo` CLI does not render the `.kymo` DSL; this uses the Python
> engine, like the web-app.

## Run

```bash
npm install                    # electron

# one-time: a venv with the layout core
python3 -m venv .venv
.venv/bin/pip install "kymostudio-core>=0.4,<0.5"

npm start                      # launches the app
```

On a headless box, run under a virtual display: `xvfb-run -a npm start`.

Environment:

- `KYMO_PYTHON` — python interpreter (default: `./.venv/bin/python`, else `python3`)
- `KYMO_PYTHONPATH` — path to the `kymo` package (default: `../python/src`)
- `KYMO_CAPTURE=<png>` — headless self-test: render the first frame to a PNG and
  quit (used to screenshot the window where there is no display).
