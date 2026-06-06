//! wasm binding (wasm-bindgen). Built by wasm-pack under the `wasm` feature.
//! Runs in the browser (website/playground) and in Node.
//!
//! JS surface:
//!     svgToPng(svg: Uint8Array, scale?: number): Uint8Array
//!     svgToPdf(svg: Uint8Array): Uint8Array

use wasm_bindgen::prelude::*;

/// Rasterize `svg` bytes to PNG bytes at `scale` (1.0 = intrinsic size).
#[wasm_bindgen(js_name = svgToPng)]
pub fn svg_to_png(svg: &[u8], scale: Option<f32>) -> Result<Vec<u8>, JsError> {
    crate::svg_to_png(svg, scale.unwrap_or(1.0)).map_err(|e| JsError::new(&e.to_string()))
}

/// Convert `svg` bytes to a vector PDF (one page, intrinsic size).
#[wasm_bindgen(js_name = svgToPdf)]
pub fn svg_to_pdf(svg: &[u8]) -> Result<Vec<u8>, JsError> {
    crate::svg_to_pdf(svg).map_err(|e| JsError::new(&e.to_string()))
}

/// The crate version, exposed to JS as `version()`.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
