//! kymostudio core — pure-Rust SVG rasterization (PNG) and vector PDF, built on
//! [`resvg`] / [`svg2pdf`].
//!
//! No browser, no headless Chrome, no C dependencies. This mirrors what the
//! Python package does via `resvg-py` (`to_webp.py`) so SVG→PNG output stays
//! consistent across implementations — `resvg` is CSS-class-aware, which is why
//! the project avoids cairosvg. PDF goes through `svg2pdf` (same usvg lineage),
//! keeping vector output CSS-class-aware too.

use resvg::{tiny_skia, usvg};

// The shared diagram substrate (IR + layout + raster-safe renderer + the generic
// d2/dot/drawio/kymojson format engines) lives in the `kymo-graph` crate. Re-export
// it under the same module paths so every `crate::model` / `crate::flowchart` / …
// inside this crate (and external `kymostudio_core::model::…` users) keep resolving.
pub use kymo_graph::{
    d2, dagre_svg, dot, drawio, flowchart, flowchart_svg, kymojson, layout, layout_dagre, math,
    model, style,
};

// Mermaid front-end (parser + per-grammar renderers + the `mermaid_to_*` convert
// / render entry points) lives in the `kymo-mermaid` crate. Re-export its modules
// and every `pub fn` under the same paths so `crate::mermaid::…` and
// `crate::mermaid_to_svg(…)` keep resolving — the wasm + Python surfaces (which
// call these) are unchanged. kymo-mermaid's default build is lean (kymo's own
// engine, depends only on kymo-graph; no merman).
pub use kymo_mermaid::{classdiagram, mermaid, sequence};
pub use kymo_mermaid::{
    mermaid_to_d2, mermaid_to_drawio, mermaid_to_dot, mermaid_to_gaphor, mermaid_to_kymojson,
    mermaid_to_mdj, mermaid_to_mermaid, mermaid_to_svg, mermaid_to_svg_auto, mermaid_to_svg_dagre,
    mermaid_to_svg_styled,
    mermaid_to_xmi, mermaid_block_to_svg, mermaid_class_to_svg, mermaid_er_to_svg,
    mermaid_kanban_to_svg, mermaid_mindmap_to_svg, mermaid_requirement_to_svg,
    mermaid_to_sequence_svg, mermaid_state_to_svg, render_flowchart_math,
};

// The `.kymo` DSL front-end (parser + layout + alignment + rich SVG renderer) —
// the Rust port of packages/python/src/kymo. Native/mobile only; the wasm and
// Python artifacts keep their own `.kymo` implementations (dsl.ts / dsl.py).
#[cfg(feature = "kymo")]
pub mod kymo;

// Headless editor session (document / shapes / selection / undo / drag-writeback
// / hit-test / camera) — drives the native mobile UIs. Built on the `.kymo`
// engine, so it shares the `kymo` feature.
#[cfg(feature = "kymo")]
pub mod editor;

// uniffi FFI surface (Kotlin + Swift bindings) over the editor session — the
// native Android/iOS binding. Built only with the `mobile` feature.
// `setup_scaffolding!` must live at the crate root: the proc-macro derives in
// `ffi.rs` reference `crate::UniFfiTag`, which this macro defines here.
#[cfg(feature = "mobile")]
uniffi::setup_scaffolding!();
#[cfg(feature = "mobile")]
mod ffi;

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

/// Fonts registered at runtime for font-less builds. The wasm build has no
/// system fonts (`system-fonts` is off — no fs/mmap) and resvg does not honor
/// `@font-face`, so without this every `<text>` element silently disappears
/// from PNG/PDF output. Registered fonts are loaded into the fontdb on each
/// render; the first registered face also becomes the generic-family fallback
/// (sans-serif &c.) so the renderers' CSS stacks resolve.
static EXTRA_FONTS: std::sync::OnceLock<std::sync::Mutex<Vec<Vec<u8>>>> =
    std::sync::OnceLock::new();

/// Register a font (TTF/OTF bytes) for `<text>` rendering in [`svg_to_png`] /
/// [`svg_to_pdf`]. Cumulative; intended for wasm/Workers where no system
/// fonts exist. On native builds system fonts still load — registered fonts
/// take over only the generic families.
pub fn register_font(bytes: Vec<u8>) {
    EXTRA_FONTS
        .get_or_init(|| std::sync::Mutex::new(Vec::new()))
        .lock()
        .unwrap()
        .push(bytes);
}

// One macro, two fontdb crates: resvg 0.47's usvg and svg2pdf's usvg 0.45
// each re-export their own `fontdb`, so this can't be a typed fn. Faces are
// scanned past the pre-load count so the fallback family is a *registered*
// face, not whatever system font happens to sort first on native.
macro_rules! load_extra_fonts {
    ($db:expr) => {
        if let Some(fonts) = EXTRA_FONTS.get() {
            let fonts = fonts.lock().unwrap();
            if !fonts.is_empty() {
                let db = $db;
                let before = db.faces().count();
                for data in fonts.iter() {
                    db.load_font_data(data.clone());
                }
                let family = db
                    .faces()
                    .skip(before)
                    .find_map(|f| f.families.first().map(|(name, _)| name.clone()));
                if let Some(family) = family {
                    db.set_sans_serif_family(family.clone());
                    db.set_serif_family(family.clone());
                    db.set_cursive_family(family.clone());
                    db.set_fantasy_family(family.clone());
                    db.set_monospace_family(family);
                }
            }
        }
    };
}

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
/// off — call [`register_font`] first, or text is dropped.
pub fn svg_to_png(svg: &[u8], scale: f32) -> Result<Vec<u8>, RenderError> {
    let mut opt = usvg::Options::default();
    #[cfg(feature = "system-fonts")]
    opt.fontdb_mut().load_system_fonts();
    load_extra_fonts!(opt.fontdb_mut());

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
/// keeps this path (for the JS CLI / Workers) but, with no system fonts, needs
/// [`register_font`] to be called for text to appear.
#[cfg(feature = "pdf")]
pub fn svg_to_pdf(svg: &[u8]) -> Result<Vec<u8>, RenderError> {
    use svg2pdf::usvg as pdf_usvg;

    let mut opt = pdf_usvg::Options::default();
    #[cfg(feature = "system-fonts")]
    opt.fontdb_mut().load_system_fonts();
    load_extra_fonts!(opt.fontdb_mut());

    let tree = pdf_usvg::Tree::from_data(svg, &opt).map_err(|e| RenderError::Pdf(e.to_string()))?;

    svg2pdf::to_pdf(
        &tree,
        svg2pdf::ConversionOptions::default(),
        svg2pdf::PageOptions::default(),
    )
    .map_err(|e| RenderError::Pdf(e.to_string()))
}

/// Render D2 flowchart source → SVG, fully in Rust: parse D2 → flowchart IR →
/// `layout_flowchart` → the [`flowchart_svg`] renderer. No external `d2` binary.
pub fn d2_to_svg(src: &str) -> Result<String, d2::D2Error> {
    let fc = d2::parse(src)?;
    Ok(flowchart_svg::render(&layout::layout_flowchart(&fc)))
}

/// Import D2 flowchart source → the resolved `.kymo.json` model (D2 as a kymo
/// source format — the inverse of `mermaid_to_d2`).
pub fn d2_to_kymojson(src: &str) -> Result<String, d2::D2Error> {
    let fc = d2::parse(src)?;
    Ok(kymojson::export(&layout::layout_flowchart(&fc)))
}

/// Render Graphviz DOT flowchart source → SVG, fully in Rust: parse DOT →
/// flowchart IR → `layout_flowchart` → the [`flowchart_svg`] renderer. No external
/// `dot` binary.
pub fn dot_to_svg(src: &str) -> Result<String, dot::DotError> {
    let fc = dot::parse(src)?;
    Ok(flowchart_svg::render(&layout::layout_flowchart(&fc)))
}

/// Import Graphviz DOT flowchart source → the resolved `.kymo.json` model.
pub fn dot_to_kymojson(src: &str) -> Result<String, dot::DotError> {
    let fc = dot::parse(src)?;
    Ok(kymojson::export(&layout::layout_flowchart(&fc)))
}

/// Encode **any** resolved diagram (a `.kymo.json` model body or full envelope) to
/// draw.io — the source-agnostic encoder surface used by the Python/JS `--drawio`
/// flag. Needs the JSON reader, so it ships with the `bpmn` feature (which carries
/// `serde_json`), like the other model-JSON entries.
#[cfg(feature = "bpmn")]
pub fn drawio_from_kymojson(json: &str) -> Result<String, String> {
    drawio::to_drawio_kymojson(json)
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

    #[test]
    fn autonumber_off_keeps_counting() {
        // `off` hides but keeps advancing; bare `autonumber` resumes from the
        // running count (5,10, hidden 15, then 20) — matching mermaid.
        let svg = super::mermaid_to_sequence_svg(
            "sequenceDiagram\nautonumber 5 5\nA->>B: a\nA->>B: b\nautonumber off\nA->>B: c\nautonumber\nA->>B: d",
        )
        .unwrap();
        assert!(svg.contains(">5 a<") && svg.contains(">10 b<"));
        assert!(svg.contains(">c<") && !svg.contains(">15 c<")); // hidden but counted
        assert!(svg.contains(">20 d<")); // resumes at 20, not 1
    }

    #[test]
    fn multiline_node_data_and_continuation() {
        // Multi-line `@{ ... }` node-data block (YAML newline-separated fields).
        let svg = super::mermaid_to_svg(
            "flowchart TB\nA@{\n  shape: circle\n  label: \"Hi\"\n}\nA --> B",
        )
        .expect("node-data block");
        assert!(svg.starts_with("<?xml") && svg.contains(">Hi<"));

        // Line continuation: the edge on the second line attaches to `A`.
        let svg = super::mermaid_to_svg("flowchart TB\nA[One]\n--> B[Two]").expect("continuation");
        assert!(svg.contains(">One<") && svg.contains(">Two<"));

        // A dangling trailing edge (`g-->`) is tolerated, not an error.
        super::mermaid_to_svg("flowchart LR\na-->b\nb-->").expect("dangling edge");
    }

    #[test]
    fn nested_subgraph_titles_render() {
        // An outer subgraph that only contains another subgraph still shows its
        // title (it used to be dropped for having no direct node members).
        let svg = super::mermaid_to_svg(
            "flowchart TD\nsubgraph Wrapper\n subgraph Inner\n  A --> B\n end\nend",
        )
        .unwrap();
        assert!(svg.contains(">Wrapper<") && svg.contains(">Inner<"));
    }

    #[test]
    fn self_loops_and_cycles_terminate() {
        // Self-loops and predecessor cycles must not hang layout (they used to
        // spin the trunk walk forever). Each of these must render and return.
        for src in [
            "flowchart TD\nA --> A",
            "flowchart TD\na --> b\nb --> c\nc --> b\nb --> b",
            "flowchart\nA --> A\nsubgraph B\nB1 --> B1\nend",
        ] {
            let svg = super::mermaid_to_svg(src).expect("render");
            assert!(svg.starts_with("<?xml"), "{src:?}");
        }
    }

    #[test]
    fn mermaid_and_d2_to_svg() {
        // mmd → SVG and the equivalent D2 → SVG both render the diamond + label.
        let mmd = super::mermaid_to_svg("flowchart TD\nA[Go] --> B{ok?}").unwrap();
        assert!(mmd.starts_with("<?xml") && mmd.contains("fc-shape") && mmd.contains(">ok?<"));
        let d2src = "direction: down\nA: Go\nB: \"ok?\" { shape: diamond }\nA -> B";
        let d2 = super::d2_to_svg(d2src).unwrap();
        assert!(d2.contains("<polygon class=\"fc-shape\"") && d2.contains(">ok?<"));
        // D2 import → kymo.json carries the diamond shape.
        assert!(super::d2_to_kymojson(d2src)
            .unwrap()
            .contains("\"shape\": \"diamond\""));
        // Graphviz DOT → SVG (same graph) renders the diamond too.
        let dotsrc =
            "digraph G {\n A [label=\"Go\"];\n B [label=\"ok?\", shape=diamond];\n A -> B;\n}";
        let dot = super::dot_to_svg(dotsrc).unwrap();
        assert!(dot.contains("<polygon class=\"fc-shape\"") && dot.contains(">ok?<"));
    }
}
