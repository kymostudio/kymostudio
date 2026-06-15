# KaTeX fonts (bundled)

These TrueType fonts are copied verbatim from [KaTeX](https://github.com/KaTeX/KaTeX)
(`katex/dist/fonts/`). kymo-tex (`src/katex.rs`) extracts their glyph outlines via
`ttf-parser` to render `$$…$$` math as raster-safe SVG paths that pixel-match
mermaid.js (which renders the same KaTeX fonts). See `LICENSE` (MIT, Khan Academy).

Only the subset needed for flowchart math is bundled (Main, Math-Italic, AMS,
Main-Italic, Caligraphic, Fraktur).
