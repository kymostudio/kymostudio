//! Mermaid render + convert entry points (kymo's OWN engine).
//!
//! Relocated from kymostudio-core. parse (`crate::mermaid`) → shared IR /
//! layout / renderer (`kymo_graph`) → SVG/text. `kymostudio-core` re-exports
//! every `pub fn` here unchanged, so the wasm + Python surfaces are stable.

use crate::{classdiagram, mermaid, sequence};
use kymo_graph::{drawio, flowchart, flowchart_svg, kymojson, math, style};
use kymo_layout as layout;

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
        sequence::Item::Message(m) => m.text = clean_label(&m.text),
        sequence::Item::Note(n) => n.text = clean_label(&n.text),
        sequence::Item::Fragment(f) => {
            for op in &mut f.operands {
                op.guard = clean_label(&op.guard);
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
    mermaid_to_svg_styled(src, None)
}

/// Render a Mermaid flowchart with an explicit [`style::FlowStyle`], falling back
/// to a style hinted in the source, then to kymo (API param > source > kymo).
pub fn mermaid_to_svg_styled(
    src: &str,
    style: Option<style::FlowStyle>,
) -> Result<String, mermaid::MermaidError> {
    let (mut fc, src_style) = mermaid::parse_with_config(src)?;
    let resolved = style.or(src_style).unwrap_or_default();
    render_flowchart_math(&mut fc);
    let (styles, default_style) = mermaid::extract_node_styles(src);
    let gfill = default_style.as_ref().and_then(|d| d.fill.as_deref());
    Ok(flowchart_svg::render_styled_with(
        &layout::layout_flowchart_styled(&fc, resolved),
        resolved,
        &styles,
        gfill,
    ))
}

/// Render a Mermaid flowchart with **dagre** layout (mermaid-faithful positions)
/// + the mermaid render style, raster-safe. The full pipeline
/// `parse → Flowchart → MermaidFlowchart → render` — see [`crate::MermaidFlowchart`].
/// Geometry is kymo's own dagre by default; the `katex-layout` feature swaps in
/// merman's mermaid-exact positions + kymo-tex KaTeX math.
pub fn mermaid_to_svg_dagre(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(crate::MermaidFlowchart::parse(src)?.render())
}

/// The Mermaid diagram type, from the first non-blank, non-directive line's
/// leading keyword. Unknown / `flowchart` / `graph` → `"flowchart"`.
pub fn diagram_kind(src: &str) -> &'static str {
    for line in src.lines() {
        let l = line.trim();
        if l.is_empty() || l.starts_with("%%") {
            continue;
        }
        return match l.split_whitespace().next().unwrap_or("") {
            "sequenceDiagram" => "sequence",
            "classDiagram" | "classDiagram-v2" => "class",
            "stateDiagram" | "stateDiagram-v2" => "state",
            "erDiagram" => "er",
            "block" | "block-beta" => "block",
            "mindmap" => "mindmap",
            "kanban" => "kanban",
            "requirementDiagram" => "requirement",
            _ => "flowchart",
        };
    }
    "flowchart"
}

/// Render ANY kymo-supported Mermaid grammar to **raster-safe** SVG (real
/// `<text>`/`<path>`, so PNG/PDF keep their labels), dispatching by
/// [`diagram_kind`] to the matching native renderer. Flowchart / unknown types
/// fall back to [`mermaid_to_svg`]. This is the entry point CLIs use for
/// `*.mmd → *.svg`, so every supported type renders, not just flowchart.
pub fn mermaid_to_svg_auto(src: &str) -> Result<String, mermaid::MermaidError> {
    match diagram_kind(src) {
        "sequence" => mermaid_to_sequence_svg(src),
        "class" => mermaid_class_to_svg(src),
        "state" => mermaid_state_to_svg(src),
        "er" => mermaid_er_to_svg(src),
        "block" => mermaid_block_to_svg(src),
        "mindmap" => mermaid_mindmap_to_svg(src),
        "kanban" => mermaid_kanban_to_svg(src),
        "requirement" => mermaid_requirement_to_svg(src),
        // flowchart: kymo's dagre path (layout_dagre — robust since the cycle
        // guard) gives mermaid-faithful positions; raster-safe, pure kymo.
        _ => mermaid_to_svg_dagre(src),
    }
}

/// Normalise a Mermaid label for rendering: `$…$` TeX math is rendered to
/// Unicode, then `<br>` hard breaks become `\n` (the renderer splits into tspans).
fn clean_label(s: &str) -> String {
    // Render `$…$` math FIRST (so TeX commands like \\text / \\nabla are mapped to
    // Unicode), then collapse `<br>` and literal `\\n` / `\\t` breaks — otherwise
    // the break-stripper would eat the `\\t` in `\\text`, the `\\n` in `\\nabla`, etc.
    // Finally decode mermaid `#…;` char entities (`#quot;` -> `"`, `#35;` -> `#`).
    decode_mermaid_entities(&math::strip_br(&math::render(s)))
}

/// Decode mermaid's `#name;` / `#NNN;` label entities to their characters.
/// Mermaid uses `#` (not `&`) so the source survives its own parser: `#quot;`,
/// `#amp;`, `#lt;`, `#gt;`, and numeric `#9829;` / `#35;`.
fn decode_mermaid_entities(s: &str) -> String {
    if !s.contains('#') {
        return s.to_string();
    }
    let bytes = s.as_bytes();
    let mut out = String::with_capacity(s.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'#' {
            if let Some(semi) = s[i + 1..].find(';') {
                let body = &s[i + 1..i + 1 + semi];
                let decoded = match body {
                    "quot" => Some('"'),
                    "amp" => Some('&'),
                    "lt" => Some('<'),
                    "gt" => Some('>'),
                    "nbsp" => Some('\u{00a0}'),
                    _ => body
                        .strip_prefix(|c| c == 'x' || c == 'X')
                        .and_then(|h| u32::from_str_radix(h, 16).ok())
                        .or_else(|| body.parse::<u32>().ok())
                        .and_then(char::from_u32),
                };
                if let Some(c) = decoded {
                    out.push(c);
                    i += 1 + semi + 1;
                    continue;
                }
            }
        }
        // not an entity — copy this byte's char
        let ch = s[i..].chars().next().unwrap();
        out.push(ch);
        i += ch.len_utf8();
    }
    out
}

/// Apply [`clean_label`] to every flowchart label (nodes, edges, subgraph titles).
pub fn render_flowchart_math(fc: &mut flowchart::Flowchart) {
    for n in &mut fc.nodes {
        n.label = clean_label(&n.label);
    }
    for e in &mut fc.edges {
        e.label = clean_label(&e.label);
    }
    for g in &mut fc.subgraphs {
        g.title = clean_label(&g.title);
    }
}

/// Render a Mermaid state diagram → SVG via the flowchart layout + renderer.
pub fn mermaid_state_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    let mut fc = mermaid::parse_state(src)?;
    render_flowchart_math(&mut fc);
    // Use kymo's dagre geometry: it nests composite states (`state X { … }`)
    // as clusters and routes edges to them (`[*] --> X`), matching mermaid;
    // the Sugiyama path drew the composite id as a separate node.
    let (mut node_styles, default_style) = mermaid::extract_node_styles(src);
    // Paint state-note boxes (`__note*`) mermaid's pale yellow.
    for n in &fc.nodes {
        if n.id.starts_with("__note") {
            node_styles.insert(
                n.id.clone(),
                style::NodeStyle {
                    fill: Some("#fff5ad".into()),
                    stroke: Some("#aaaa33".into()),
                    ..Default::default()
                },
            );
        }
    }
    // State composites are light lavender (the dagre default `#ffffde` is the
    // flowchart subgraph yellow, wrong for state).
    for sg in &fc.subgraphs {
        node_styles
            .entry(sg.id.clone())
            .or_insert_with(|| style::NodeStyle {
                fill: Some("#ECECFF".into()),
                stroke: Some("#9370DB".into()),
                ..Default::default()
            });
    }
    let geom = kymo_layout::dagre_geom(&fc, style::FlowStyle::Mermaid);
    Ok(kymo_graph::dagre_svg::render(
        &geom,
        style::FlowStyle::Mermaid,
        &node_styles,
        default_style.as_ref(),
    ))
}

/// Render a Mermaid `classDiagram` → SVG (kymo own multi-compartment renderer).
pub fn mermaid_class_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(classdiagram::svg::render(&mermaid::parse_class(src)?))
}

/// Render a Mermaid `erDiagram` → SVG (reuses the class-box renderer).
pub fn mermaid_er_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    // kymo's own dagre layout (pure Rust, no merman) + 2-column entity tables.
    Ok(classdiagram::svg::render_er_dagre(&mermaid::parse_er(src)?))
}

/// Render a Mermaid `block` / `block-beta` diagram → SVG (reuses the flowchart
/// layout + renderer; the column grid is laid out as a graph).
pub fn mermaid_block_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    mermaid::parse_block(src)?; // validate (errors on non-block sources)
    Ok(crate::block_svg::render(src))
}

/// Render a Mermaid `mindmap` → SVG (tree via the flowchart renderer).
pub fn mermaid_mindmap_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    // kymo's own cose-bilkent layout (vendored kymo-manatee, pure Rust — no merman).
    let mut fc = mermaid::parse_mindmap(src)?;
    render_flowchart_math(&mut fc);
    Ok(crate::mindmap_svg::render_cose(&fc))
}

/// Render a Mermaid `kanban` board → SVG (columns via the flowchart renderer).
pub fn mermaid_kanban_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    let mut fc = mermaid::parse_kanban(src)?;
    render_flowchart_math(&mut fc);
    Ok(crate::kanban_svg::render(&fc))
}

/// Render a Mermaid `requirementDiagram` → SVG (reuses the class-box renderer).
pub fn mermaid_requirement_to_svg(src: &str) -> Result<String, mermaid::MermaidError> {
    Ok(classdiagram::svg::render(&mermaid::parse_requirement(src)?))
}

#[cfg(test)]
mod auto_tests {
    use super::{diagram_kind, mermaid_to_svg_auto};

    #[test]
    fn kind_detection_skips_directives() {
        assert_eq!(
            diagram_kind("%%{init:{}}%%\nsequenceDiagram\nA->>B: hi"),
            "sequence"
        );
        assert_eq!(diagram_kind("classDiagram\nclass A"), "class");
        assert_eq!(diagram_kind("stateDiagram-v2\n[*] --> A"), "state");
        assert_eq!(diagram_kind("erDiagram\nA ||--o{ B : has"), "er");
        assert_eq!(diagram_kind("mindmap\n  root"), "mindmap");
        assert_eq!(diagram_kind("requirementDiagram\n"), "requirement");
        assert_eq!(diagram_kind("flowchart TD\nA-->B"), "flowchart");
        assert_eq!(diagram_kind("graph LR\nA-->B"), "flowchart");
    }

    #[test]
    fn auto_dispatches_to_native_renderer() {
        // sequence → real <text>, not the flowchart fallback (which would error/garble)
        let svg = mermaid_to_svg_auto("sequenceDiagram\nAlice->>Bob: hi").unwrap();
        assert!(
            svg.contains("seq-arrow"),
            "sequence should use the sequence renderer"
        );
        // class → mermaid palette from the class-box renderer
        let svg = mermaid_to_svg_auto("classDiagram\nclass A {\n  +int x\n}").unwrap();
        assert!(
            svg.contains("ECECFF"),
            "class should use the class-box renderer"
        );
    }
}
