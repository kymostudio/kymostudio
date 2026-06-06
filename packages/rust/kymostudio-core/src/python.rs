//! Python binding (PyO3). Built by maturin under the `python` feature (which also
//! turns on `pdf` + `bpmn`).
//!
//! Exposes module `_kymostudio_core` with:
//!     svg_to_png(svg: bytes, scale: float = 1.0) -> bytes
//!     svg_to_pdf(svg: bytes) -> bytes
//!     bpmn_import(xml: str) -> str         # .bpmn → canonical model JSON
//!     bpmn_layout(blocks_json: str) -> str # `bpmn { }` block AST JSON → model JSON
//!     bpmn_to_svg(xml: str) -> str         # .bpmn → rendered SVG
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

/// Convert `svg` (bytes) to a vector PDF (one page, intrinsic size).
#[cfg(feature = "pdf")]
#[pyfunction]
fn svg_to_pdf<'py>(py: Python<'py>, svg: &[u8]) -> PyResult<Bound<'py, PyBytes>> {
    let pdf = crate::svg_to_pdf(svg).map_err(|e| PyValueError::new_err(e.to_string()))?;
    Ok(PyBytes::new(py, &pdf))
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
    }
    Ok(())
}
