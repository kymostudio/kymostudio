# kymostudio-core (Rust)

The pure-Rust core for **kymostudio**: an SVG → PNG/PDF rasterizer (built on
[`resvg`](https://github.com/linebender/resvg) / `svg2pdf`) **and** the shared
diagram engine. No browser, no headless Chrome, no C/Cairo/Skia system
dependencies.

The engine half parses diagram-as-code into kymo's model, lays it out, and
serializes to the `.kymo.json` interchange format the Python/JS front-ends
consume — written once in Rust instead of duplicated per language. First subsystem:
**Mermaid flowchart import** (`mermaid_to_kymojson`). See `docs/specs/mermaid-import/`.

One core crate, compiled to **three targets** from a single source via feature
flags — so the Rust CLI, the Python package, and the JS/browser playground all
share the exact same resvg engine (`resvg` is **CSS-class-aware**, the reason the
project avoids cairosvg):

| Target | Feature | Build tool | Consumer |
|--------|---------|-----------|----------|
| Native lib | `system-fonts` (default) | `cargo` | `kymostudio` CLI crate |
| Python extension (abi3) | `python` | `maturin` → wheel | `packages/python` |
| wasm (browser + Node) | `wasm` | `wasm-pack` → pkg | `packages/js`, website playground |

Core functions: `svg_to_png(svg: &[u8], scale: f32)` and `svg_to_pdf(svg: &[u8])`
(rasterizer), plus `mermaid_to_kymojson(src: &str)` (engine). Each binding
(`src/python.rs`, `src/wasm.rs`) is a thin façade.

## CLI — `kymo`

The `kymo` command-line tool lives in the sibling **[`kymostudio`](../kymostudio)**
crate (a thin front-end over this core). Install it with `cargo install kymostudio`.

## Build each target

```bash
# Native lib + tests
cargo test

# The `kymo` CLI (sibling crate)
cargo build --release --manifest-path ../kymostudio/Cargo.toml   # -> ../kymostudio/target/release/kymo

# Python wheel (abi3, one wheel for CPython ≥ 3.10)
maturin build --release --out dist        # -> dist/kymostudio_core-*-abi3-*.whl
#   import _kymostudio_core; _kymostudio_core.svg_to_png(svg_bytes, scale)

# wasm (browser + Node) — system-fonts OFF (no fs/mmap on wasm).
# Plain `wasm` is the LEAN module (no svgToPng/svgToPdf — 0.9 MB vs 6.1 MB raw);
# add `pdf` for the full surface the npm/vscode artifacts ship.
wasm-pack build --target web --out-dir pkg --out-name kymostudio_core \
  -- --no-default-features --features wasm,pdf
#   import { svgToPng } from './pkg/kymostudio_core.js'
```

CI builds and smoke-tests all of the above across Linux/macOS/Windows —
see `.github/workflows/rust.yml`.

## Library use (Rust)

```rust
let svg = std::fs::read("in.svg")?;
let png: Vec<u8> = kymostudio_core::svg_to_png(&svg, 1.0)?;
std::fs::write("out.png", png)?;
```

The version is kept in **lockstep** with the rest of the monorepo
(`Cargo.toml` → `version`).
