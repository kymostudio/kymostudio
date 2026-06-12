# kymo-mermaid — mermaid flowchart → SVG (browser slice)

A **flowchart-only** slice of [merman](https://github.com/Latias94/merman)
(Mingzhen Zhuang, MIT OR Apache-2.0) — the headless Rust port of mermaid.js —
pinned by rev and trimmed at link time for the kymo editor.

## Why a slice

mermaid.js costs ~760 KB brotli for all 23 grammars; flowchart is the dominant
one (LLM output especially). This crate calls merman's flowchart pipeline
**directly** (\`parse_flowchart → layout_flowchart_v2 → render_flowchart_v2_svg\`)
instead of its Engine: the Engine's detector/registry tables reference every
grammar's parser and anchor all of them, while a direct call leaves the other
22 unreachable — LTO drops them. \`default-features = false\` also drops
front-matter config (YAML/json5) and lol_html sanitization: the editor
sanitizes all SVG client-side with DOMPurify.

Measured 2026-06-12: **1.5 MB raw / ~473 KB brotli** (engine dispatch: 4.0 MB /
1.36 MB; merman-wasm full: 9.8 MB). wasm-opt stays off — it shrinks raw size
but worsens the brotli wire size (same result as kymostudio-core).

## Surface

- Rust: \`flowchart_to_svg(&str) -> Result<String, String>\`
- wasm (\`--features wasm\`): \`mermaidFlowchartToSvg(src)\` — throws on any
  parse/layout error; the editor catches and falls back to mermaid.js, so an
  unsupported syntax degrades to the slower chunk, never to a broken diagram.

## Build

\`\`\`bash
cargo test                                     # native smoke tests
wasm-pack build --target web --out-dir pkg --out-name kymo_mermaid -- --no-default-features --features wasm
\`\`\`

Output is mermaid-look (same DOM/CSS contract mermaid.js emits — merman aligns
against 3,500+ upstream SVG baselines). Text is measured with vendored font
metrics; no fonts are embedded — the browser renders the text, as it should.
