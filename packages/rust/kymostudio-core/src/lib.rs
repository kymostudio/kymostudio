//! kymostudio core — pure-Rust SVG rasterization (PNG) and vector PDF, built on
//! [`resvg`] / [`svg2pdf`].
//!
//! No browser, no headless Chrome, no C dependencies. This mirrors what the
//! Python package does via `resvg-py` (`to_webp.py`) so SVG→PNG output stays
//! consistent across implementations — `resvg` is CSS-class-aware, which is why
//! the project avoids cairosvg. PDF goes through `svg2pdf` (same usvg lineage),
//! keeping vector output CSS-class-aware too.

use resvg::{tiny_skia, usvg};

// The shared diagram engine — pure Rust, no SVG deps. Mermaid import parses
// into [`model::Diagram`], lays it out, and serializes to the `.kymo.json`
// interchange format the Python/JS front-ends consume.
pub mod flowchart;
pub mod kymojson;
pub mod layout;
pub mod mermaid;
pub mod model;
pub mod sequence;

// Language-binding facades — each compiled only when its feature is on.
#[cfg(feature = "python")]
mod python;
#[cfg(feature = "wasm")]
mod wasm;

// BPMN stack (import / export / layout / shapes) — the cross-language single
// source of truth. Pure Rust; compiled under the `bpmn` feature. Mirrors the
// Python pipeline module-for-module (see each submodule's header).
#[cfg(feature = "bpmn")]
pub mod bpmn;

/// Something went wrong turning SVG bytes into PNG or PDF bytes.
#[derive(Debug)]
pub enum RenderError {
    /// The SVG could not be parsed.
    Parse(usvg::Error),
    /// The requested raster size was degenerate (zero / overflow).
    Size { width: u32, height: u32 },
    /// PNG encoding failed.
    Encode(String),
    /// SVG→PDF conversion failed (svg2pdf parse or encode).
    Pdf(String),
}

impl std::fmt::Display for RenderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RenderError::Parse(e) => write!(f, "invalid SVG: {e}"),
            RenderError::Size { width, height } => {
                write!(f, "invalid raster size {width}x{height}")
            }
            RenderError::Encode(e) => write!(f, "PNG encoding failed: {e}"),
            RenderError::Pdf(e) => write!(f, "SVG→PDF conversion failed: {e}"),
        }
    }
}

impl std::error::Error for RenderError {}

impl From<usvg::Error> for RenderError {
    fn from(e: usvg::Error) -> Self {
        RenderError::Parse(e)
    }
}

/// Render SVG bytes to PNG bytes at the given `scale` (1.0 = intrinsic size).
///
/// On native builds (`system-fonts` feature, the default) system fonts are
/// loaded so `<text>` elements rasterize correctly. On wasm that feature is
/// off — supply fonts in the SVG, or the caller resolves them.
pub fn svg_to_png(svg: &[u8], scale: f32) -> Result<Vec<u8>, RenderError> {
    #[allow(unused_mut)]
    let mut opt = usvg::Options::default();
    #[cfg(feature = "system-fonts")]
    opt.fontdb_mut().load_system_fonts();

    let tree = usvg::Tree::from_data(svg, &opt)?;
    let size = tree.size();

    let width = ((size.width() * scale).round() as i64).clamp(1, u32::MAX as i64) as u32;
    let height = ((size.height() * scale).round() as i64).clamp(1, u32::MAX as i64) as u32;

    let mut pixmap =
        tiny_skia::Pixmap::new(width, height).ok_or(RenderError::Size { width, height })?;

    let transform = tiny_skia::Transform::from_scale(scale, scale);
    resvg::render(&tree, transform, &mut pixmap.as_mut());

    pixmap
        .encode_png()
        .map_err(|e| RenderError::Encode(e.to_string()))
}

/// Convert SVG bytes to a vector PDF (one page, intrinsic SVG size, 72 dpi).
///
/// Vector — strokes and text stay crisp at any zoom. Parsing uses `svg2pdf`'s
/// own bundled usvg (0.45), independent of the `resvg` used by [`svg_to_png`],
/// so there is no `scale`: PDF is resolution-independent. On native builds
/// (`system-fonts`) system fonts are loaded so `<text>` renders; the wasm build
/// keeps this path (for the JS CLI) but, with no system fonts, needs fonts
/// embedded in the SVG for text to appear.
#[cfg(feature = "pdf")]
pub fn svg_to_pdf(svg: &[u8]) -> Result<Vec<u8>, RenderError> {
    use svg2pdf::usvg as pdf_usvg;

    #[allow(unused_mut)]
    let mut opt = pdf_usvg::Options::default();
    #[cfg(feature = "system-fonts")]
    opt.fontdb_mut().load_system_fonts();

    let tree = pdf_usvg::Tree::from_data(svg, &opt).map_err(|e| RenderError::Pdf(e.to_string()))?;

    svg2pdf::to_pdf(
        &tree,
        svg2pdf::ConversionOptions::default(),
        svg2pdf::PageOptions::default(),
    )
    .map_err(|e| RenderError::Pdf(e.to_string()))
}

/// Parse Mermaid source (flowchart) into the `.kymo.json` interchange string.
///
/// The shared engine entry point: parse → layered layout → serialize. Python
/// (PyO3) and JS (wasm) call this and feed the result to their `from_kymojson`
/// loaders. Errors describe the unsupported diagram type or the syntax problem.
pub fn mermaid_to_kymojson(src: &str) -> Result<String, mermaid::MermaidError> {
    let fc = mermaid::parse(src)?;
    let diagram = layout::layout_flowchart(&fc);
    Ok(kymojson::export(&diagram))
}

/// Convert Mermaid flowchart source to another text DSL via the flowchart IR.
///
/// `mmd → {mermaid, d2, dot}` is a parse-then-emit with no layout in between —
/// the target lays the graph out itself. `to_mermaid` round-trips/normalizes the
/// source. See [`flowchart::emit`].
pub fn mermaid_to_d2(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(flowchart::emit::to_d2(&mermaid::parse(src)?))
}

/// Convert Mermaid flowchart source to Graphviz DOT (via the flowchart IR).
pub fn mermaid_to_dot(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(flowchart::emit::to_dot(&mermaid::parse(src)?))
}

/// Round-trip / normalize Mermaid flowchart source through the IR.
pub fn mermaid_to_mermaid(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(flowchart::emit::to_mermaid(&mermaid::parse(src)?))
}

/// Convert a Mermaid `sequenceDiagram` to OMG XMI 2.5.1 (a UML 2.5.1
/// `Interaction` — lifelines, messages, activations, combined fragments, notes).
///
/// Parse-then-emit through the [`sequence`] IR; no layout (XMI carries no
/// geometry). Flowchart sources are rejected with [`mermaid::MermaidError`].
pub fn mermaid_to_xmi(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(sequence::emit::to_xmi(&mermaid::parse_sequence(src)?))
}

/// Convert a Mermaid `sequenceDiagram` to a StarUML native `.mdj` (metadata-
/// JSON) carrying a laid-out sequence diagram.
///
/// Unlike [`mermaid_to_xmi`] (model only), the `.mdj` includes the diagram
/// *views* with geometry, so opening it in StarUML (File → Open) draws the
/// diagram. See [`sequence::mdj`].
pub fn mermaid_to_mdj(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(sequence::mdj::to_mdj(&mermaid::parse_sequence(src)?))
}

/// Convert a Mermaid `sequenceDiagram` to a Gaphor native `.gaphor` file
/// (XML v3.0) carrying a laid-out sequence diagram.
///
/// Like [`mermaid_to_mdj`] but for Gaphor. Note Gaphor cannot represent
/// combined fragments (alt/loop/opt/par) — they are flattened to their inner
/// messages. See [`sequence::gaphor`].
pub fn mermaid_to_gaphor(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(sequence::gaphor::to_gaphor(&mermaid::parse_sequence(src)?))
}

#[cfg(test)]
mod tests {
    const SVG: &[u8] =
        br##"<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#09f"/></svg>"##;

    #[test]
    fn png_has_magic() {
        let png = super::svg_to_png(SVG, 1.0).expect("render png");
        assert_eq!(&png[..8], b"\x89PNG\r\n\x1a\n");
    }

    #[cfg(feature = "pdf")]
    #[test]
    fn pdf_has_magic() {
        let pdf = super::svg_to_pdf(SVG).expect("render pdf");
        assert_eq!(&pdf[..5], b"%PDF-");
    }
}
