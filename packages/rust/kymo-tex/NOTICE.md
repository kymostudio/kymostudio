# kymo-tex

kymo-tex is kymo's LaTeX-math → SVG renderer. It is a **fork** of
[RaTeX](https://github.com/erweixin/RaTeX) by erweixin, used under the MIT
License (see `LICENSE`).

## What was kept

The SVG-rendering core only:

| crate | role |
|---|---|
| `kymo-types` | display-list + box-model types |
| `kymo-lexer` | LaTeX tokenizer |
| `kymo-parser` | LaTeX → AST (KaTeX-compatible coverage) |
| `kymo-layout` | AST → display list (TeX box/glue layout) |
| `kymo-font` | font metrics + glyph outlines |
| `kymo-katex-fonts` | embedded KaTeX TTFs |
| `kymo-font-loader` | font resolution (system + embedded) |
| `kymo-unicode-font` | unicode text fallback |
| `kymo-svg` | display list → SVG `<path>` |

## What was dropped from upstream

The upstream platform crates `ratex-cairo`, `ratex-gtk4`, `ratex-ffi`,
`ratex-pdf`, `ratex-wasm`, `ratex-render`, plus `demo/`, `website/`,
`platforms/`, `docs/`, `test-output/` — kymo wraps the core from
`kymostudio-core`, which owns its own wasm/PDF/raster paths.

## What was renamed

Every kept crate was renamed `ratex-*` → `kymo-*` (package name, directory, and
all internal `ratex_*` references), so the package is fully kymo-branded.

## Why fork (not depend)

kymo needs to tune the renderer to **pixel-match mermaid.js's KaTeX** for the
flowchart-math corpus (`benches/mermaid-format`), which means modifying layout /
metrics / SVG emission directly.

Upstream font licenses are preserved in
`crates/kymo-katex-fonts/fonts/FONT_NOTICE.txt` (KaTeX fonts are MIT/OFL).
