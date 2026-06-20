//! Pure-Rust `$$…$$` → raster-safe KaTeX glyph group via kymo-tex (no merman).
//!
//! `crate::katex::render` lays a formula out with KaTeX's own font metrics and
//! returns the glyph outlines; here we wrap them in a centred `<g>` scaled em→px
//! and report the pixel box so the dagre layout can size the node/edge for it.

/// Pixels-per-em for KaTeX math. mermaid renders the KaTeX label at 18px/em
/// (`font-size:18px` on the `.katex` span), so size + draw math at 18.
const MATH_PX_PER_EM: f64 = 18.0;

/// The single `$$…$$` formula in a label, if the whole label is one math span.
pub fn math_only_formula(label: &str) -> Option<&str> {
    let t = label.trim().trim_matches(['"', '\'']).trim();
    let inner = t.strip_prefix("$$")?.strip_suffix("$$")?;
    if inner.is_empty() || inner.contains("$$") {
        None
    } else {
        Some(inner)
    }
}

/// `(glyph_group_svg, width_px, height_px)` for a `$$…$$` formula. The group is a
/// `<g transform="translate(…) scale(…)">` of raster-safe glyph paths, centred at
/// the node/edge origin. `None` if kymo-tex can't parse the formula.
pub fn math_box(formula: &str) -> Option<(String, f64, f64)> {
    let (inner, w_em, h_em, _base_em) = crate::katex::render(formula)?;
    let (wpx, hpx) = (w_em * MATH_PX_PER_EM, h_em * MATH_PX_PER_EM);
    let glyph = format!(
        "<g transform=\"translate({:.2},{:.2}) scale({:.4})\">{}</g>",
        -wpx / 2.0,
        -hpx / 2.0,
        MATH_PX_PER_EM,
        inner
    );
    Some((glyph, wpx, hpx))
}

/// Collect node-id → math box and (src,dst) → math box maps from a flowchart's
/// raw labels, for the dagre layout's math sizing + glyph rendering.
pub fn collect(
    fc: &kymo_graph::flowchart::Flowchart,
) -> (
    std::collections::HashMap<String, kymo_layout::dagre::MathBox>,
    std::collections::HashMap<(String, String), kymo_layout::dagre::MathBox>,
) {
    let mut nodes = std::collections::HashMap::new();
    for n in &fc.nodes {
        if let Some(f) = math_only_formula(&n.label) {
            if let Some(mb) = math_box(f) {
                nodes.insert(n.id.clone(), mb);
            }
        }
    }
    let mut edges = std::collections::HashMap::new();
    for e in &fc.edges {
        if let Some(f) = math_only_formula(&e.label) {
            if let Some(mb) = math_box(f) {
                edges.insert((e.src.clone(), e.dst.clone()), mb);
            }
        }
    }
    (nodes, edges)
}
