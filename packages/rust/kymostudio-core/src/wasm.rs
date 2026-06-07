//! wasm binding (wasm-bindgen). Built by wasm-pack under the `wasm` feature.
//! Runs in the browser (website/playground) and in Node.
//!
//! JS surface:
//!     svgToPng(svg: Uint8Array, scale?: number): Uint8Array
//!     svgToPdf(svg: Uint8Array): Uint8Array
//!     bpmnImport(xml): string   bpmnExport(json): string
//!     bpmnLayout(blocksJson): string   bpmnRender(json, animate?, background?): string
//!     mermaidToKymoJson(src: string): string

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

// ── BPMN single-source-of-truth surface (exchanges canonical model JSON) ─────────
/// Import BPMN 2.0 XML → canonical model JSON.
#[cfg(feature = "bpmn")]
#[wasm_bindgen(js_name = bpmnImport)]
pub fn bpmn_import(xml: &str) -> Result<String, JsError> {
    let d = crate::bpmn::import(xml).map_err(|e| JsError::new(&e))?;
    Ok(crate::bpmn::model_json(&d).to_string())
}

/// Lay out a positionless `bpmn { }` block AST (JSON) → resolved model JSON.
#[cfg(feature = "bpmn")]
#[wasm_bindgen(js_name = bpmnLayout)]
pub fn bpmn_layout(blocks_json: &str) -> Result<String, JsError> {
    let d = crate::bpmn::bpmn_layout::layout_json(blocks_json).map_err(|e| JsError::new(&e))?;
    Ok(crate::bpmn::model_json(&d).to_string())
}

/// Export a canonical model JSON → BPMN 2.0 XML.
#[cfg(feature = "bpmn")]
#[wasm_bindgen(js_name = bpmnExport)]
pub fn bpmn_export(model_json: &str) -> Result<String, JsError> {
    let d = crate::bpmn::from_json(model_json).map_err(|e| JsError::new(&e))?;
    Ok(crate::bpmn::export(&d))
}

/// Render a canonical model JSON → SVG (animate + background mirror to_svg options).
#[cfg(feature = "bpmn")]
#[wasm_bindgen(js_name = bpmnRender)]
pub fn bpmn_render(
    model_json: &str,
    animate: Option<bool>,
    background: Option<String>,
) -> Result<String, JsError> {
    let d = crate::bpmn::from_json(model_json).map_err(|e| JsError::new(&e))?;
    let opts = crate::bpmn::RenderOpts {
        animate: animate.unwrap_or(false),
        background,
    };
    Ok(crate::bpmn::render_opts(&d, &opts))
}

/// Parse Mermaid source (flowchart) into a `.kymo.json` interchange string.
#[wasm_bindgen(js_name = mermaidToKymoJson)]
pub fn mermaid_to_kymojson(src: &str) -> Result<String, JsError> {
    crate::mermaid_to_kymojson(src).map_err(|e| JsError::new(&e.to_string()))
}

/// The crate version, exposed to JS as `version()`.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
