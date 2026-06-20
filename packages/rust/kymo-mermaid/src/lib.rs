//! kymo's pure-Rust Mermaid engine — no merman.
//!
//! kymo's OWN mermaid front-end: the parser (`mermaid`), per-grammar renderers
//! (`sequence`, `classdiagram`, and the flowchart/state/block/… paths in
//! `engine`), and the format converters
//! (`mermaid_to_{svg,svg_dagre,d2,dot,drawio,kymojson,xmi,mdj,gaphor}`).
//! Layout comes from `kymo-layout` (dagre/grid/cose), geometry + renderer from
//! `kymo-graph`. `kymostudio-core` re-exports every `pub fn` here, so its wasm +
//! Python surfaces are unchanged.
//!
//! Features:
//! - **`math`** (default) — native KaTeX `$$…$$` glyphs via kymo-tex (`katex` +
//!   `math_glyph`); the flowchart layout sizes math nodes by their glyph box.
//!   Opt out (`default-features = false`) for the leanest build (Unicode math).
//! - **`wasm`** — the `mermaidToSvgAuto` JS surface (all grammars, raster-safe).

// ── kymo's OWN mermaid engine — always compiled, depends only on kymo-graph ───
pub mod block_svg;
pub mod classdiagram;
mod engine;
pub mod kanban_svg;
pub mod mermaid;
pub mod mindmap_svg;
pub mod render;
pub mod sequence;
pub use engine::*;
pub use render::MermaidFlowchart;

// ── native multi-grammar dispatch (raster-safe, no merman; feature `wasm`) ────
#[cfg(feature = "wasm")]
mod wasm_native {
    use wasm_bindgen::prelude::*;

    /// JS surface: mermaidToSvgAuto(src) -> raster-safe SVG for ANY kymo-supported
    /// grammar (flowchart/sequence/class/state/er/block/mindmap/kanban/requirement),
    /// dispatched by diagram type. Unlike `mermaidRenderSvg` (merman, foreignObject
    /// HTML labels that vanish under server-side rasterisers) this emits real
    /// `<text>`/`<path>`, so PNG/PDF/WebP export keeps the labels. Throws on parse error.
    #[wasm_bindgen(js_name = mermaidToSvgAuto)]
    pub fn mermaid_to_svg_auto(source: &str) -> Result<String, JsError> {
        crate::mermaid_to_svg_auto(source).map_err(|e| JsError::new(&e.to_string()))
    }
}

// ── native KaTeX math (`$$…$$`) via kymo-tex (feature `math`, default-on) ──────
// Pure Rust, no merman: `katex` lays a formula out with KaTeX's own fonts and
// `math_glyph` wraps the outlines + reports the pixel box so the dagre layout
// sizes math nodes/edges and draws raster-safe glyphs.
#[cfg(feature = "math")]
pub(crate) mod katex;
#[cfg(feature = "math")]
pub(crate) mod math_glyph;
