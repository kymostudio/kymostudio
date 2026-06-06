//! kymostudio core — pure-Rust SVG rasterization built on [`resvg`].
//!
//! No browser, no headless Chrome, no C dependencies. This mirrors what the
//! Python package does via `resvg-py` (`to_webp.py`) so SVG→PNG output stays
//! consistent across implementations — `resvg` is CSS-class-aware, which is why
//! the project avoids cairosvg.

use resvg::{tiny_skia, usvg};

// Language-binding facades — each compiled only when its feature is on.
#[cfg(feature = "python")]
mod python;
#[cfg(feature = "wasm")]
mod wasm;

/// Something went wrong turning SVG bytes into PNG bytes.
#[derive(Debug)]
pub enum RenderError {
    /// The SVG could not be parsed.
    Parse(usvg::Error),
    /// The requested raster size was degenerate (zero / overflow).
    Size { width: u32, height: u32 },
    /// PNG encoding failed.
    Encode(String),
}

impl std::fmt::Display for RenderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RenderError::Parse(e) => write!(f, "invalid SVG: {e}"),
            RenderError::Size { width, height } => {
                write!(f, "invalid raster size {width}x{height}")
            }
            RenderError::Encode(e) => write!(f, "PNG encoding failed: {e}"),
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
