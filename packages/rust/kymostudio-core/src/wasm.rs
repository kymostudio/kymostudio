//! wasm binding (wasm-bindgen). Built by wasm-pack under the `wasm` feature.
//! Runs in the browser (website/playground) and in Node.
//!
//! JS surface:
//!     svgToPng(svg: Uint8Array, scale?: number): Uint8Array
//!     svgToPdf(svg: Uint8Array): Uint8Array
//!     bpmnImport(xml): string   bpmnExport(json): string
//!     bpmnLayout(blocksJson): string   bpmnRender(json, animate?, background?): string
//!     mermaidToKymoJson(src: string): string
//!     mermaidToD2(src): string   mermaidToDot(src): string   mermaidToMermaid(src): string
//!     mermaidToDrawio(src): string   drawioFromKymoJson(json): string
//!     mermaidToSvg(src): string   d2ToSvg(src): string   d2ToKymoJson(src): string

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

/// Convert Mermaid flowchart source → D2 (via the flowchart IR).
#[wasm_bindgen(js_name = mermaidToD2)]
pub fn mermaid_to_d2(src: &str) -> Result<String, JsError> {
    crate::mermaid_to_d2(src).map_err(|e| JsError::new(&e.to_string()))
}

/// Convert Mermaid flowchart source → Graphviz DOT (via the flowchart IR).
#[wasm_bindgen(js_name = mermaidToDot)]
pub fn mermaid_to_dot(src: &str) -> Result<String, JsError> {
    crate::mermaid_to_dot(src).map_err(|e| JsError::new(&e.to_string()))
}

/// Round-trip / normalize Mermaid flowchart source through the IR.
#[wasm_bindgen(js_name = mermaidToMermaid)]
pub fn mermaid_to_mermaid(src: &str) -> Result<String, JsError> {
    crate::mermaid_to_mermaid(src).map_err(|e| JsError::new(&e.to_string()))
}

/// Convert Mermaid flowchart source → draw.io (mxGraph XML).
#[wasm_bindgen(js_name = mermaidToDrawio)]
pub fn mermaid_to_drawio(src: &str) -> Result<String, JsError> {
    crate::mermaid_to_drawio(src).map_err(|e| JsError::new(&e.to_string()))
}

/// Render Mermaid flowchart source → SVG (pure-Rust flowchart renderer).
#[wasm_bindgen(js_name = mermaidToSvg)]
pub fn mermaid_to_svg(src: &str) -> Result<String, JsError> {
    crate::mermaid_to_svg(src).map_err(|e| JsError::new(&e.to_string()))
}

/// Render D2 flowchart source → SVG (pure-Rust D2 importer + renderer).
#[wasm_bindgen(js_name = d2ToSvg)]
pub fn d2_to_svg(src: &str) -> Result<String, JsError> {
    crate::d2_to_svg(src).map_err(|e| JsError::new(&e.to_string()))
}

/// Import D2 flowchart source → the resolved `.kymo.json` model.
#[wasm_bindgen(js_name = d2ToKymoJson)]
pub fn d2_to_kymojson(src: &str) -> Result<String, JsError> {
    crate::d2_to_kymojson(src).map_err(|e| JsError::new(&e.to_string()))
}

/// Encode any resolved diagram (`.kymo.json` model) → draw.io (mxGraph XML).
#[cfg(feature = "bpmn")]
#[wasm_bindgen(js_name = drawioFromKymoJson)]
pub fn drawio_from_kymojson(json: &str) -> Result<String, JsError> {
    crate::drawio_from_kymojson(json).map_err(|e| JsError::new(&e))
}

/// The crate version, exposed to JS as `version()`.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
