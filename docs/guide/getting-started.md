# Getting Started

Install kymo, write a six-line diagram, and render it to SVG — all in about five minutes.

> **Just want to try it?** Skip installation entirely and open the
> [browser playground](https://kymo.studio/app/): type `.kymo` on the
> left, watch the SVG appear on the right.

## Install

kymo ships as two independent, feature-equivalent packages — pick whichever fits your stack.
Both provide the same `kymo` command-line tool and the same `.kymo` language.

```bash
# Python (PyPI) — requires Python >= 3.13
pip install kymostudio
# …or, with uv:
uv tool install kymostudio

# JavaScript / TypeScript (npm)
npm install kymostudio
```

Prefer to edit with a live preview? Install the **kymo VS Code extension** for side-by-side
rendering of `.kymo` and `.bpmn` files as you type:
[Marketplace listing](https://marketplace.visualstudio.com/items?itemName=kymostudio.kymostudio-vscode).

Verify the CLI is on your `PATH`:

```bash
kymo --help
```

## Your first diagram in five minutes

**1. Create a file** named `hello.kymo`:

```text
title: "Hello"

world outer "Hello, World" {
  greeter box/files/orange "Greeter" "" @ (100, 100)
  visitor box/user/blue    "Visitor" "" @ (340, 100)
}

greeter --> visitor : "waves"
```

Three things are happening here:

- `title:` adds a heading at the top of the canvas.
- `world outer "…" { … }` is a **region** — a labelled container. Inside it sit two
  **components**, each written as `id shape/icon/accent "Name" "Subtitle"`, placed with
  `@ (x, y)`.
- `greeter --> visitor : "waves"` is an **edge** — an arrow with a label.

No `canvas:` line is needed: when you omit it, kymo auto-sizes the canvas to fit your
content (plus a 30-px margin).

**2. Render it:**

```bash
kymo hello.kymo          # → hello.svg
```

**3. Open `hello.svg`** in any browser or image viewer. That's a full diagram — labelled
container, two icon nodes, and a connecting arrow.

## Animate and export

The same source renders to several targets. The first matching flag wins; with no flag you
get a static SVG.

| Command | Output | What you get |
|---------|--------|--------------|
| `kymo hello.kymo` | `hello.svg` | Static SVG. |
| `kymo hello.kymo --animate` | `hello-animated.svg` | SVG with flowing-dash edge animation (pure CSS — open it in a browser). |
| `kymo hello.kymo --figma` | `hello.figma.js` | Figma Plugin API script — paste into Figma's plugin console to build the diagram as native objects. |
| `kymo hello.kymo --excalidraw` | `hello.excalidraw` | Excalidraw scene JSON — open in [excalidraw.com](https://excalidraw.com). |
| `kymo process.bpmn` | `process.svg` | Renders a standard **BPMN 2.0** file using the geometry stored in the file. |

kymo accepts three input kinds: `.kymo` (the DSL), `.bpmn` (BPMN 2.0 XML), and `.py`
(a Python module exposing a `DIAGRAM`).

## Next steps

- **[The `.kymo` Language](./dsl-guide.md)** — learn every building block.
- **[Cookbook](./cookbook.md)** — start from a complete, real-world diagram.
- **[FAQ & Troubleshooting](./faq.md)** — when something doesn't render the way you expect.
