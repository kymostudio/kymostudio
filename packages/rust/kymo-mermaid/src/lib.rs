//! Mermaid **flowchart** -> SVG, by way of merman (the headless Rust port of
//! mermaid.js) — sliced down to one grammar.
//!
//! The editor renders mermaid in-browser. mermaid.js costs ~760 KB brotli for
//! all 23 grammars; flowchart is the dominant one (LLM output especially), and
//! this slice serves it for ~473 KB brotli with mermaid-11 parity (merman
//! aligns against 3,500+ upstream SVG baselines). Other grammars stay on
//! mermaid.js — the editor falls back whenever this returns an error, so a
//! syntax this slice cannot parse degrades to the slow path, never to a broken
//! diagram.
//!
//! Calling the flowchart pipeline DIRECTLY (parse_flowchart -> layout ->
//! render) instead of merman's Engine is what keeps it small: the Engine's
//! detector/registry tables reference every grammar's parser, anchoring all of
//! them; bypassing the dispatch makes the other 22 unreachable and LTO drops
//! them at link time.

use merman_core::diagrams::flowchart::parse_flowchart;
use merman_core::{MermaidConfig, ParseMetadata};
use merman_render::flowchart::layout_flowchart_v2;
use merman_render::svg::{render_flowchart_v2_svg, SvgRenderOptions};
use merman_render::text::VendoredFontMetricsTextMeasurer;

/// Render mermaid flowchart source to an SVG string (mermaid-look output).
///
/// Errors are returned as plain strings: the caller (editor) treats any error
/// as "not this slice's grammar" and falls back to mermaid.js.
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

/// merman parity gap (rev 8964149): for labels with <br/>, the measuring layer
/// wraps the label in a <p> (mirroring mermaid's markdown pass) but the SVG
/// emitter then entity-escapes that very wrapper — mermaid.js emits a real
/// <p> element inside the nodeLabel/edgeLabel span. Un-escape exactly that
/// wrapper, bounded to the span edges so arbitrary user text is never touched.
/// (If a user literally types <p> in a label, mermaid.js renders it as an
/// element too — so this matches reference behaviour in that case as well.)
fn unescape_label_paragraph_wrapper(svg: &str) -> String {
    svg.replace(r#"<span class="nodeLabel">&lt;p&gt;"#, r#"<span class="nodeLabel"><p>"#)
        .replace(r#"<span class="edgeLabel">&lt;p&gt;"#, r#"<span class="edgeLabel"><p>"#)
        .replace("&lt;/p&gt;</span>", "</p></span>")
}

#[cfg(feature = "wasm")]
mod wasm {
    use wasm_bindgen::prelude::*;

    /// JS surface: mermaidFlowchartToSvg(src) -> SVG string, throws on any
    /// parse/layout error (the editor catches and falls back to mermaid.js).
    #[wasm_bindgen(js_name = mermaidFlowchartToSvg)]
    pub fn mermaid_flowchart_to_svg(source: &str) -> Result<String, JsError> {
        super::flowchart_to_svg(source).map_err(|e| JsError::new(&e))
    }
}

#[cfg(test)]
mod tests {
    use super::flowchart_to_svg;

    #[test]
    fn renders_the_editor_bench_diagram_syntax() {
        // The probe set the in-house parser failed on (2026-06-12) — the whole
        // reason this slice exists. Each must render, labels intact.
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
        // Regression for the merman parity gap: mermaid.js emits
        // <span class="nodeLabel"><p>…<br>…</p></span>; merman escapes the <p>
        // wrapper. Caught live on 2026-06-12 — the editor showed a literal
        // "<p>" before the label text.
        let svg = flowchart_to_svg("flowchart TD
  A[dòng một<br/>dòng hai] --> B").unwrap();
        assert!(svg.contains(r#"<span class="nodeLabel"><p>dòng một"#), "real <p> missing");
        assert!(!svg.contains("&lt;p&gt;"), "escaped <p> still present");
    }

    #[test]
    fn non_flowchart_errors_cleanly() {
        // The editor uses the error as its fall-back-to-mermaid.js signal.
        assert!(flowchart_to_svg("sequenceDiagram\n  A->>B: hi").is_err());
    }
}
