# tools/

Maintenance scripts for the monorepo. Stdlib-only Python, no install step —
run them straight from the repo root.

## `info.py`

Read or set the project's **shared version** and **tagline** from one place,
keeping the two publishable packages (and the VS Code extension's version) in
sync. **Source of truth: `packages/python/pyproject.toml`.**

```bash
python tools/info.py version                    # print the current version
python tools/info.py version 0.3.0              # set it everywhere
python tools/info.py tagline                    # print the current tagline
python tools/info.py tagline "New one-liner."   # set it everywhere
```

With no value, the current value is printed. With a value, every location is
rewritten in place — formatting is preserved, only the value string changes.

| Command   | Writes to                                                                                   |
| --------- | ------------------------------------------------------------------------------------------- |
| `version` | `pyproject.toml`, `__init__.py`, `js/package.json`, `vscode-extension/package.json`, and the `uv.lock` / `package-lock.json` self-entries. |
| `tagline` | the `description` in `pyproject.toml` + `js/package.json`, and the first paragraph of the `packages/python` & `packages/js` READMEs (written verbatim, so keep the tagline plain text). |

Left untouched on purpose: the VS Code extension `description` (a different
product) and the root `README.md` tagline (a hand-written marketing variant).

## `drawio-to-svg.py`

Convert `.drawio` → SVG with the **draw.io desktop** app (its headless
`--export`). Full fidelity for *any* `.drawio` — the SVG is exactly what draw.io
produces. Unlike `kymo`'s own pure-Rust renderer (`kymo flow.d2 flow.svg`), this
needs draw.io installed, so it lives here, not in the published packages.

```bash
python tools/drawio-to-svg.py diagram.drawio                # → diagram.svg
python tools/drawio-to-svg.py diagram.drawio -o out.svg
python tools/drawio-to-svg.py ./diagrams -o ./svgs          # batch a directory
python tools/drawio-to-svg.py d.drawio --background white    # ← readable everywhere
python tools/drawio-to-svg.py d.drawio --crop --scale 2 --all-pages
```

Install: `brew install --cask drawio` (or <https://drawio.com>); auto-found on
`PATH` or pass `--drawio-bin <path>`.

**Use `--background` (recommended).** draw.io exports a **transparent** canvas
whose colours are theme-reactive (`light-dark()` CSS) — washed-out or invisible
on dark/transparent viewers. `--background COLOR` (default `#ffffff` if given
with no value) adds a solid background **and** flattens the palette to its light
variant, so the SVG looks the same and is readable in any viewer — including
plain rasterizers (resvg / `rsvg-convert`) that otherwise render the shapes black.

**Caveat — labels are HTML (`<foreignObject>`).** That is draw.io's own format:
text renders in any **browser** (and in draw.io). Non-browser rasterizers fall
back to draw.io's embedded label images (mostly fine) but may show a stray
"Text is not SVG" line. For an SVG with real `<text>` end-to-end, use kymo's own
renderer instead (`kymo flow.{d2,dot,mmd} out.svg`).
