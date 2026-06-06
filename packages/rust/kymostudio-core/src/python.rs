//! Python binding (PyO3). Built by maturin under the `python` feature.
//!
//! Exposes module `_kymostudio_core` with:
//!     svg_to_png(svg: bytes, scale: float = 1.0) -> bytes
//!     svg_to_pdf(svg: bytes) -> bytes

use pyo3::prelude::*;
use pyo3::types::PyBytes;

/// Rasterize `svg` (bytes) to PNG bytes at `scale` (1.0 = intrinsic size).
#[pyfunction]
#[pyo3(signature = (svg, scale = 1.0))]
fn svg_to_png<'py>(py: Python<'py>, svg: &[u8], scale: f32) -> PyResult<Bound<'py, PyBytes>> {
    let png = crate::svg_to_png(svg, scale)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    Ok(PyBytes::new(py, &png))
}

/// Convert `svg` (bytes) to a vector PDF (one page, intrinsic size).
#[cfg(feature = "pdf")]
#[pyfunction]
fn svg_to_pdf<'py>(py: Python<'py>, svg: &[u8]) -> PyResult<Bound<'py, PyBytes>> {
    let pdf = crate::svg_to_pdf(svg)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    Ok(PyBytes::new(py, &pdf))
}

#[pymodule]
fn _kymostudio_core(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add("__version__", env!("CARGO_PKG_VERSION"))?;
    m.add_function(wrap_pyfunction!(svg_to_png, m)?)?;
    #[cfg(feature = "pdf")]
    m.add_function(wrap_pyfunction!(svg_to_pdf, m)?)?;
    Ok(())
}
