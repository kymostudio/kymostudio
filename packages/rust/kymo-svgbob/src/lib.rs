//! svgbob wasm binding for the render-api worker: ASCII-art diagram source in,
//! SVG string out. Mirrors what kroki runs server-side (svgbob is Rust there
//! too) — same engine, zero network.

use wasm_bindgen::prelude::*;

/// Convert an ASCII diagram to SVG (svgbob settings = upstream defaults).
#[wasm_bindgen(js_name = svgbobToSvg)]
pub fn svgbob_to_svg(src: &str) -> String {
    svgbob::to_svg_string_pretty(src)
}
