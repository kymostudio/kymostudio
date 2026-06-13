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
pub mod d2;
pub mod dot;
pub mod drawio;
pub mod flowchart;
pub mod flowchart_svg;
pub mod kymojson;
pub mod layout;
pub mod math;
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

/// Render a Mermaid `sequenceDiagram` to SVG (kymo own renderer: real
/// `<text>`, so PNG/PDF keep their labels). Notes/activations not yet drawn.
pub fn mermaid_to_sequence_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    let mut seq = mermaid::parse_sequence(src)?;
    for item in &mut seq.items {
        render_sequence_item_math(item);
    }
    Ok(sequence::svg::render(&seq))
}

/// Render `$…$` TeX math in a sequence item's text (recursing into fragments).
fn render_sequence_item_math(item: &mut sequence::Item) {
    match item {
        sequence::Item::Message(m) => m.text = math::render(&m.text),
        sequence::Item::Note(n) => n.text = math::render(&n.text),
        sequence::Item::Fragment(f) => {
            for op in &mut f.operands {
                op.guard = math::render(&op.guard);
                for it in &mut op.items {
                    render_sequence_item_math(it);
                }
            }
        }
        sequence::Item::Activate(_)
        | sequence::Item::Deactivate(_)
        | sequence::Item::Autonumber(_) => {}
    }
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

/// Convert Mermaid flowchart source → draw.io (mxGraph XML).
///
/// Unlike the D2/DOT/Mermaid spokes (which emit the positionless IR), draw.io
/// needs geometry, so this lays the graph out first: parse → `layout_flowchart`
/// → the [`drawio`] encoder. The encoder itself is source-agnostic — any
/// resolved [`model::Diagram`] can be encoded.
pub fn mermaid_to_drawio(src: &str) -> Result<String, mermaid::MermaidError> {
    let fc = mermaid::parse(src)?;
    Ok(drawio::to_drawio(&layout::layout_flowchart(&fc)))
}

/// Render Mermaid flowchart source → SVG (parse → layout → the pure-Rust
/// [`flowchart_svg`] renderer). The Rust core's own flowchart SVG (its own look,
/// not byte-identical to the Python/JS renderers).
pub fn mermaid_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    let mut fc = mermaid::parse(src)?;
    render_flowchart_math(&mut fc);
    Ok(flowchart_svg::render(&layout::layout_flowchart(&fc)))
}

/// Render Mermaid `$…$` TeX math in every flowchart label (nodes, edges,
/// subgraph titles) to Unicode, so PNG/PDF show symbols, not raw LaTeX.
fn render_flowchart_math(fc: &mut flowchart::Flowchart) {
    for n in &mut fc.nodes {
        n.label = math::render(&n.label);
    }
    for e in &mut fc.edges {
        e.label = math::render(&e.label);
    }
    for g in &mut fc.subgraphs {
        g.title = math::render(&g.title);
    }
}

/// Render a Mermaid state diagram → SVG via the flowchart layout + renderer.
pub fn mermaid_state_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    let mut fc = mermaid::parse_state(src)?;
    render_flowchart_math(&mut fc);
    Ok(flowchart_svg::render(&layout::layout_flowchart(&fc)))
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
