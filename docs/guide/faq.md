# FAQ & Troubleshooting

Fixes for the things you're most likely to hit early on. If something here doesn't match what
you see, the DSL Language Specification is the authoritative source.

## Getting set up

### Which Python / Node versions do I need?

The Python package requires **Python ≥ 3.13** (it's developed with [uv](https://docs.astral.sh/uv/)).
The JavaScript package is a dependency-free ESM module and runs on any current Node.js. The two
packages are independent but feature-equivalent — pick whichever suits your stack.

### `kymo: command not found`

The CLI ships with the package. After `pip install kymostudio` make sure your Python scripts
directory is on `PATH`, or install it as an isolated tool with `uv tool install kymostudio`
(which puts `kymo` on your `PATH` directly). Confirm with `kymo --help`.

## Rendering problems

### My SVG is empty / nothing shows up

Work through these in order:

1. **Did the file parse?** Run `kymo file.kymo` in a terminal and read any error it prints.
2. **Are your components referenced or placed?** A component with no `@` placement and not
   listed in any layout/region defaults to `(0, 0)` and may sit under another node. Give it an
   `@ (x, y)`, or list its id inside a region or `layout { … }`.
3. **Do edge endpoints exist?** `a --> b` requires both `a` and `b` to be defined component
   ids. A typo'd id produces a dangling edge.

### The diagram is clipped, or there's huge empty space

If you set `canvas: W x H` by hand and your content runs past it, the overflow is cropped.
Easiest fix: **delete the `canvas:` line** and let kymo auto-size to your content (it adds a
30-px margin). Add an explicit `canvas:` back only when you need a fixed frame.

→ See [§7.4 Auto-Canvas](../formats/kymo-dsl/07-semantics.md#74-auto-canvas).

### The render fails with `unknown icon: '…'`

The `icon` slot takes a **key**, not a path, and an unknown key **stops the render with an
error** (it doesn't silently blank). kymo looks up built-in glyphs first, then file-backed
icons under the top-level [`icons/`](../../icons) directory. For file-backed icons the key is
**`<provider>-<name>`** — the provider folder plus the filename, with the middle category folder
dropped. So `icons/aws/compute/lambda.svg` is the key `aws-lambda` (not `aws/lambda` or
`lambda.svg`), and `icons/k8s/compute/pod.svg` is `k8s-pod`. Check the key against the
`icons/` tree and fix the spelling.

### My edges overlap or leave from the wrong side

The default router is orthogonal and usually fine, but you can steer it:

- Pick exit/entry sides: `a --> b { src=right, dst=left }`.
- Nudge an anchor a few pixels to separate parallel rails: `src=right(0,-12)`.
- Force the path through waypoints: `via=(120,300);(220,300)`.
- Change the routing style: add `curve`, `straight`, or `elbow` (the default).

→ See [§6.7 Edges](../formats/kymo-dsl/06-grammar.md#67-edges).

### `--animate` output looks static

The animation is **CSS-based dash motion**, so it only plays in something that runs CSS:
open the `*-animated.svg` in a web browser (not every image viewer animates SVG CSS).
Also check you're opening the `-animated.svg` file, not the plain `.svg`.

## BPMN

### My imported `.bpmn` looks different from my modeller

It shouldn't — on import, kymo uses the geometry stored in the file's Diagram-Interchange (DI)
section and renders it as laid out, skipping its own layout pass. If positions look off, the
file's DI data is likely the cause. For the element-to-shape mapping, see the
[BPMN element mapping](../formats/bpmn/kymo-mapping.md) (`BPMN-MAP-001`).

### Should I author BPMN in the DSL or import a `.bpmn`?

Both work. Use the [`bpmn { … }` block](./dsl-guide.md#bpmn-processes) when you'd rather write
the flow and let kymo lay it out automatically; import a `.bpmn` file when you've already
modelled it elsewhere and want to keep that layout.

## Using kymo in your own tools

### Can I render diagrams from my own app instead of the CLI?

Yes — the JavaScript package exposes the engine directly. Parse and render in two calls:

```js
import { parseDiagram, renderSVG } from "kymostudio";

const svg = renderSVG(parseDiagram(`canvas: 800 x 400
api  box/files/blue   "API"  "" @ (200, 150)
user circle/user/green "User" "" @ (450, 150)
user --> api`));
```

It's dependency-free and ships TypeScript types. The Python package offers an equivalent API
(`parse`, `layout`, `resolve_alignments`, `render`).

### Is there a live preview while I edit?

Install the **kymo VS Code extension** for side-by-side preview of `.kymo` and `.bpmn` files
that re-renders as you type:
[Marketplace listing](https://marketplace.visualstudio.com/items?itemName=kymostudio.kymostudio-vscode).
Or use the [browser playground](https://kymo.studio/app/) — no install needed.

## Still stuck?

- Compare against a working file in [`samples/`](../../samples).
- Re-read the relevant section of [The `.kymo` Language](./dsl-guide.md).
- Consult the normative DSL Language Specification for exact grammar and edge cases.
