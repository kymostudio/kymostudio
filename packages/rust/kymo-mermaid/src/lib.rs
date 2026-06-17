//! kymo's Mermaid engine, plus optional merman-backed paths.
//!
//! **Default** (depends only on `kymo-graph`): kymo's OWN mermaid front-end —
//! the parser (`mermaid`), per-grammar renderers (`sequence`, `classdiagram`,
//! and the flowchart/state/block/… paths in `engine`), and the format converters
//! (`mermaid_to_{svg,svg_dagre,d2,dot,drawio,kymojson,xmi,mdj,gaphor}`).
//! `kymostudio-core` re-exports every `pub fn` here, so its wasm + Python
//! surfaces are unchanged.
//!
//! Optional features pull in merman (the headless Rust port of mermaid.js):
//! - **`merman`** — the foreignObject flowchart slice (`flowchart_to_svg`), the
//!   editor's lazy in-browser path.
//! - **`full`** — the all-grammar `render_any` (render-api worker).
//! - **`katex-layout`** — merman's mermaid-exact layout + kymo-tex KaTeX glyphs;
//!   selects `mermaid_to_svg_dagre`'s high-fidelity geometry (median ~0.7% vs
//!   mermaid.js) at the cost of ~1.9 MB wasm.

// ── kymo's OWN mermaid engine — always compiled, depends only on kymo-graph ───
pub mod classdiagram;
pub mod mermaid;
pub mod render;
pub mod sequence;
mod engine;
pub use engine::*;
pub use render::MermaidFlowchart;

// ── merman-backed flowchart slice (feature `merman`) ─────────────────────────
#[cfg(feature = "merman")]
pub use merman_slice::flowchart_to_svg;

#[cfg(feature = "merman")]
mod merman_slice {
    //! Mermaid flowchart → SVG via merman (mermaid.js port), sliced to one
    //! grammar. Calling the flowchart pipeline DIRECTLY (parse_flowchart →
    //! layout → render) instead of merman's Engine lets LTO strip the other 22
    //! grammars — ~473 KB brotli. Labels are foreignObject HTML (browser-only).
    use merman_core::diagrams::flowchart::parse_flowchart;
    use merman_core::{MermaidConfig, ParseMetadata};
    use merman_render::flowchart::layout_flowchart_v2;
    use merman_render::svg::{render_flowchart_v2_svg, SvgRenderOptions};
    use merman_render::text::VendoredFontMetricsTextMeasurer;

    /// Render mermaid flowchart source to an SVG string (mermaid-look output).
    /// Errors are plain strings: the caller (editor) treats any error as "not
    /// this slice's grammar" and falls back to mermaid.js.
    pub fn flowchart_to_svg(source: &str) -> Result<String, String> {
        let meta = ParseMetadata {
            diagram_type: "flowchart-v2".to_string(),
            config: MermaidConfig::default(),
            effective_config: MermaidConfig::default(),
            title: None,
        };
        let semantic = parse_flowchart(source, &meta).map_err(|e| format!("parse: {e}"))?;
        let config = MermaidConfig::default();
        let measurer = VendoredFontMetricsTextMeasurer::default();
        let layout = layout_flowchart_v2(&semantic, &config, &measurer, None)
            .map_err(|e| format!("layout: {e}"))?;
        let svg = render_flowchart_v2_svg(
            &layout,
            &semantic,
            &serde_json::Value::Null,
            None,
            &measurer,
            &SvgRenderOptions::default(),
        )
        .map_err(|e| format!("svg: {e}"))?;
        Ok(unescape_label_paragraph_wrapper(&svg))
    }

    /// merman parity gap (rev 8964149): for labels with <br/>, the measuring
    /// layer wraps the label in a <p> but the SVG emitter entity-escapes that
    /// wrapper — mermaid.js emits a real <p>. Un-escape exactly that wrapper,
    /// bounded to the span edges so arbitrary user text is never touched.
    fn unescape_label_paragraph_wrapper(svg: &str) -> String {
        svg.replace(
            r#"<span class="nodeLabel">&lt;p&gt;"#,
            r#"<span class="nodeLabel"><p>"#,
        )
        .replace(
            r#"<span class="edgeLabel">&lt;p&gt;"#,
            r#"<span class="edgeLabel"><p>"#,
        )
        .replace("&lt;/p&gt;</span>", "</p></span>")
    }

    #[cfg(test)]
    mod tests {
        use super::flowchart_to_svg;

        #[test]
        fn renders_the_editor_bench_diagram_syntax() {
            let cases = [
                "flowchart TD\n  A -- nhãn --> B",
                "flowchart TD\n  A --> B\n  classDef hot fill:#f96\n  class A hot",
                "flowchart TD\n  A:::hot --> B\n  classDef hot fill:#f96",
                "flowchart TD\n  A & B --> C",
                "flowchart TD\n  A --> B\n  style A fill:#bbf",
                "flowchart TD\n  A -. ghi chú .-> B",
                "flowchart TD\n  A == đậm ==> B",
                "flowchart TD\n  A(((lõi))) --> B",
            ];
            for src in cases {
                let svg = flowchart_to_svg(src).unwrap_or_else(|e| panic!("{src:?}: {e}"));
                assert!(svg.starts_with("<svg"), "{src:?}");
            }
        }

        #[test]
        fn vietnamese_labels_survive() {
            let svg = flowchart_to_svg(
                "flowchart TD\n  A([Bắt đầu]) --> B[Đăng ký<br/>tài khoản]\n  B --> C{Xác thực?}\n  C -->|Có| D((Hoàn tất))",
            )
            .unwrap();
            for label in ["Bắt đầu", "Đăng ký", "Xác thực?", "Hoàn tất", "Có"] {
                assert!(svg.contains(label), "missing {label}");
            }
        }

        #[test]
        fn br_labels_keep_a_real_paragraph_element() {
            let svg = flowchart_to_svg(
                "flowchart TD
  A[dòng một<br/>dòng hai] --> B",
            )
            .unwrap();
            assert!(
                svg.contains(r#"<span class="nodeLabel"><p>dòng một"#),
                "real <p> missing"
            );
            assert!(!svg.contains("&lt;p&gt;"), "escaped <p> still present");
        }

        #[test]
        fn non_flowchart_errors_cleanly() {
            assert!(flowchart_to_svg("sequenceDiagram\n  A->>B: hi").is_err());
        }
    }
}

#[cfg(all(feature = "wasm", feature = "merman"))]
mod wasm_slice {
    use wasm_bindgen::prelude::*;

    /// JS surface: mermaidFlowchartToSvg(src) -> SVG, throws on parse/layout
    /// error (the editor catches and falls back to mermaid.js).
    #[wasm_bindgen(js_name = mermaidFlowchartToSvg)]
    pub fn mermaid_flowchart_to_svg(source: &str) -> Result<String, JsError> {
        crate::flowchart_to_svg(source).map_err(|e| JsError::new(&e))
    }
}

// ── full engine: any grammar via merman's own dispatch (feature `full`) ───────
/// Render ANY mermaid grammar to SVG via merman's full engine (render-api
/// worker — 5.2 MB raw vs the slice's 1.5 MB).
#[cfg(feature = "full")]
pub fn render_any(source: &str) -> Result<String, String> {
    let out =
        merman_bindings_core::render_svg(source.as_bytes(), b"{}").map_err(|e| format!("{e:?}"))?;
    String::from_utf8(out).map_err(|e| e.to_string())
}

#[cfg(all(feature = "wasm", feature = "full"))]
mod wasm_full {
    use wasm_bindgen::prelude::*;

    /// Full-grammar mermaid → SVG (the render-api worker build: wasm,full).
    #[wasm_bindgen(js_name = mermaidRenderSvg)]
    pub fn mermaid_render_svg(source: &str) -> Result<String, JsError> {
        super::render_any(source).map_err(|e| JsError::new(&e))
    }
}

// ── katex-layout: mermaid-exact layout (merman) + raster-safe KaTeX math ──────
// Selects `engine::mermaid_to_svg_dagre`'s high-fidelity geometry branch.
// `katex_layout` borrows kymo-graph's flowchart model + float `<text>` renderer;
// `katex` draws `$$…$$` as KaTeX glyph outlines via the kymo-tex crates.
#[cfg(feature = "katex-layout")]
mod katex;
#[cfg(feature = "katex-layout")]
mod katex_layout;

#[cfg(all(feature = "wasm", feature = "katex-layout"))]
mod wasm_katex {
    use wasm_bindgen::prelude::*;

    /// JS surface: mermaidToSvgDagre(src) -> mermaid-faithful, raster-safe SVG
    /// with KaTeX math (the high-fidelity geometry path). Throws on parse error.
    #[wasm_bindgen(js_name = mermaidToSvgDagre)]
    pub fn mermaid_to_svg_dagre(source: &str) -> Result<String, JsError> {
        crate::mermaid_to_svg_dagre(source).map_err(|e| JsError::new(&e.to_string()))
    }
}
