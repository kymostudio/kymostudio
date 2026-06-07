//! Python binding (PyO3). Built by maturin under the `python` feature (which also
//! turns on `pdf` + `bpmn`).
//!
//! Exposes module `_kymostudio_core` with:
//!     svg_to_png(svg: bytes, scale: float = 1.0) -> bytes
//!     svg_to_pdf(svg: bytes) -> bytes
//!     bpmn_import(xml: str) -> str         # .bpmn → canonical model JSON
//!     bpmn_layout(blocks_json: str) -> str # `bpmn { }` block AST JSON → model JSON
//!     bpmn_to_svg(xml: str) -> str         # .bpmn → rendered SVG
//!     bpmn_export(model_json: str) -> str  # model JSON → .bpmn XML
//!     bpmn_render(model_json, animate=False, background=None) -> str  # model JSON → SVG
//!     mermaid_to_kymojson(src: str) -> str # Mermaid flowchart → .kymo.json
//!     mermaid_to_d2(src: str) -> str       # Mermaid flowchart → D2
//!     mermaid_to_dot(src: str) -> str      # Mermaid flowchart → Graphviz DOT
//!     mermaid_to_mermaid(src: str) -> str  # Mermaid round-trip / normalize
//!
//! The BPMN functions exchange the canonical `.kymo.json` model on the JSON seam, so
//! Python can deserialize the result into its dataclasses and delegate to this one
//! source of truth (the delegation itself is a later step — these are the surface).

use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;
use pyo3::types::PyBytes;

/// Rasterize `svg` (bytes) to PNG bytes at `scale` (1.0 = intrinsic size).
#[pyfunction]
#[pyo3(signature = (svg, scale = 1.0))]
fn svg_to_png<'py>(py: Python<'py>, svg: &[u8], scale: f32) -> PyResult<Bound<'py, PyBytes>> {
    let png = crate::svg_to_png(svg, scale).map_err(|e| PyValueError::new_err(e.to_string()))?;
    Ok(PyBytes::new(py, &png))
}

/// Import BPMN 2.0 XML → canonical model JSON (compact). Inverse of how Python's
/// `from_kymojson` would rebuild the `Diagram`.
#[cfg(feature = "bpmn")]
#[pyfunction]
fn bpmn_import(xml: &str) -> PyResult<String> {
    let diagram = crate::bpmn::import(xml).map_err(PyValueError::new_err)?;
    Ok(crate::bpmn::model_json(&diagram).to_string())
}

/// Lay out a positionless `bpmn { }` block AST (JSON) → resolved model JSON.
#[cfg(feature = "bpmn")]
#[pyfunction]
fn bpmn_layout(blocks_json: &str) -> PyResult<String> {
    let diagram =
        crate::bpmn::bpmn_layout::layout_json(blocks_json).map_err(PyValueError::new_err)?;
    Ok(crate::bpmn::model_json(&diagram).to_string())
}

/// Import BPMN 2.0 XML and render it to an SVG string (import + render in one call).
#[cfg(feature = "bpmn")]
#[pyfunction]
fn bpmn_to_svg(xml: &str) -> PyResult<String> {
    let diagram = crate::bpmn::import(xml).map_err(PyValueError::new_err)?;
    Ok(crate::bpmn::render(&diagram))
}

/// Export a canonical model JSON → BPMN 2.0 XML (inverse of `bpmn_import`).
#[cfg(feature = "bpmn")]
#[pyfunction]
fn bpmn_export(model_json: &str) -> PyResult<String> {
    let diagram = crate::bpmn::from_json(model_json).map_err(PyValueError::new_err)?;
    Ok(crate::bpmn::export(&diagram))
}

/// Render a canonical model JSON → SVG (animate + background mirror to_svg options).
#[cfg(feature = "bpmn")]
#[pyfunction]
#[pyo3(signature = (model_json, animate = false, background = None))]
fn bpmn_render(model_json: &str, animate: bool, background: Option<String>) -> PyResult<String> {
    let diagram = crate::bpmn::from_json(model_json).map_err(PyValueError::new_err)?;
    let opts = crate::bpmn::RenderOpts {
        animate,
        background,
    };
    Ok(crate::bpmn::render_opts(&diagram, &opts))
}

/// Convert `svg` (bytes) to a vector PDF (one page, intrinsic size).
#[cfg(feature = "pdf")]
#[pyfunction]
fn svg_to_pdf<'py>(py: Python<'py>, svg: &[u8]) -> PyResult<Bound<'py, PyBytes>> {
    let pdf = crate::svg_to_pdf(svg).map_err(|e| PyValueError::new_err(e.to_string()))?;
    Ok(PyBytes::new(py, &pdf))
}

/// Parse Mermaid source (flowchart) into a `.kymo.json` interchange string.
#[pyfunction]
fn mermaid_to_kymojson(src: &str) -> PyResult<String> {
    crate::mermaid_to_kymojson(src).map_err(|e| PyValueError::new_err(e.to_string()))
}

/// Convert Mermaid flowchart source → D2 (via the flowchart IR).
#[pyfunction]
fn mermaid_to_d2(src: &str) -> PyResult<String> {
    crate::mermaid_to_d2(src).map_err(|e| PyValueError::new_err(e.to_string()))
}

/// Convert Mermaid flowchart source → Graphviz DOT (via the flowchart IR).
#[pyfunction]
fn mermaid_to_dot(src: &str) -> PyResult<String> {
    crate::mermaid_to_dot(src).map_err(|e| PyValueError::new_err(e.to_string()))
}

/// Round-trip / normalize Mermaid flowchart source through the IR.
#[pyfunction]
fn mermaid_to_mermaid(src: &str) -> PyResult<String> {
    crate::mermaid_to_mermaid(src).map_err(|e| PyValueError::new_err(e.to_string()))
}

#[pymodule]
fn _kymostudio_core(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add("__version__", env!("CARGO_PKG_VERSION"))?;
    m.add_function(wrap_pyfunction!(svg_to_png, m)?)?;
    #[cfg(feature = "pdf")]
    m.add_function(wrap_pyfunction!(svg_to_pdf, m)?)?;
    #[cfg(feature = "bpmn")]
    {
        m.add_function(wrap_pyfunction!(bpmn_import, m)?)?;
        m.add_function(wrap_pyfunction!(bpmn_layout, m)?)?;
        m.add_function(wrap_pyfunction!(bpmn_to_svg, m)?)?;
        m.add_function(wrap_pyfunction!(bpmn_export, m)?)?;
        m.add_function(wrap_pyfunction!(bpmn_render, m)?)?;
    }
    m.add_function(wrap_pyfunction!(mermaid_to_kymojson, m)?)?;
    m.add_function(wrap_pyfunction!(mermaid_to_d2, m)?)?;
    m.add_function(wrap_pyfunction!(mermaid_to_dot, m)?)?;
    m.add_function(wrap_pyfunction!(mermaid_to_mermaid, m)?)?;
    Ok(())
}
