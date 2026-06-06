# kymostudio (Rust CLI)

`kymo` — a pure-Rust **SVG → PNG** rasterizer command-line tool, built on
[`resvg`](https://github.com/linebender/resvg) via
[`kymostudio-core`](https://crates.io/crates/kymostudio-core). No browser, no
headless Chrome, no C/Cairo/Skia system dependencies.

This crate is a thin CLI front-end; the rasterization engine lives in
`kymostudio-core` (the same `resvg` core the Python wheel and the JS/wasm build
share, so SVG→PNG output stays consistent across implementations).

## Install

```bash
cargo install kymostudio        # provides the `kymo` binary
```

## Usage

```bash
kymo in.svg out.png             # rasterize at intrinsic size
kymo diagram.svg                # output defaults to diagram.png
kymo diagram.svg -s 2 hi.png    # 2× resolution
```

| Flag | Meaning |
|------|---------|
| `-i, --input <FILE>`  | Input SVG (or pass it positionally) |
| `-o, --output <FILE>` | Output PNG (or pass it positionally) |
| `-s, --scale <N>`     | Scale factor, `1.0` = intrinsic size (default `1`) |
| `-h, --help` / `-V, --version` | Help / version |

The version is kept in **lockstep** with the rest of the monorepo
(`Cargo.toml` → `version`).
