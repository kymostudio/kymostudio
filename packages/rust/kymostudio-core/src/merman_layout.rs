//! mermaid-faithful flowchart **layout** via merman, driven by kymo's
//! **browser-calibrated** text metrics, then rendered raster-safe by kymo.
//!
//! merman's own `VendoredFontMetricsTextMeasurer` measures text from vendored
//! font tables, which sit ~1px off the browser — that's the ~2.8% merman floor.
//! kymo's [`text_w_mermaid`](crate::layout::text_w_mermaid) is calibrated to the
//! *actual browser* (the `w`-glyph fix etc.), so feeding it into merman's exact
//! dagre layout sizes nodes the way mermaid.js does. Positions then match
//! mermaid.js more tightly than merman itself. Shapes/labels/styles come from
//! kymo's own parse (mapped by node id); merman supplies positions.

use crate::dagre_svg::{FEdge, FGeom, FNode, FRegion};
use crate::flowchart::Flowchart;
use crate::layout::text_w_mermaid;
use merman_core::diagrams::flowchart::parse_flowchart;
use merman_core::{MermaidConfig, ParseMetadata};
use merman_render::flowchart::layout_flowchart_v2;
use merman_render::svg::{render_flowchart_v2_svg, SvgRenderOptions};
use merman_render::text::{TextMeasurer, TextMetrics, TextStyle, WrapMode};
use std::collections::HashMap;

const MARGIN: f64 = 8.0;

/// Text measurer backed by kymo's browser-calibrated `CHAR_W_MERMAID`.
struct KymoTextMeasurer;

impl KymoTextMeasurer {
    fn line_height(style: &TextStyle) -> f64 {
        // mermaid wrapped-label rows are ~24px at the 16px flowchart font.
        style.font_size * 1.5
    }
    fn is_bold(style: &TextStyle) -> bool {
        style.font_weight.as_deref().is_some_and(|w| {
            w.eq_ignore_ascii_case("bold") || w.parse::<u32>().is_ok_and(|n| n >= 600)
        })
    }
    fn scaled_width(line: &str, style: &TextStyle) -> f64 {
        // mermaid's trebuchet bold runs ~4.7% wider than regular.
        let bold = if Self::is_bold(style) { 1.047 } else { 1.0 };
        text_w_mermaid(line) * (style.font_size / 16.0) * bold
    }
}

fn wrap_at(text: &str, max_w_16px: f64) -> Vec<String> {
    let mut lines: Vec<String> = Vec::new();
    let mut cur = String::new();
    for word in text.split_whitespace() {
        let trial = if cur.is_empty() {
            word.to_string()
        } else {
            format!("{cur} {word}")
        };
        if !cur.is_empty() && text_w_mermaid(&trial) > max_w_16px {
            lines.push(std::mem::take(&mut cur));
            cur = word.to_string();
        } else {
            cur = trial;
        }
    }
    if !cur.is_empty() || lines.is_empty() {
        lines.push(cur);
    }
    lines
}

impl TextMeasurer for KymoTextMeasurer {
    fn measure(&self, text: &str, style: &TextStyle) -> TextMetrics {
        let lines: Vec<&str> = text.split('\n').collect();
        let width = lines
            .iter()
            .map(|l| Self::scaled_width(l, style))
            .fold(0.0_f64, f64::max);
        let line_count = lines.len().max(1);
        TextMetrics {
            width,
            height: line_count as f64 * Self::line_height(style),
            line_count,
        }
    }

    fn measure_wrapped(
        &self,
        text: &str,
        style: &TextStyle,
        max_width: Option<f64>,
        _wrap_mode: WrapMode,
    ) -> TextMetrics {
        let scale = (style.font_size / 16.0).max(0.001);
        let mut lines: Vec<String> = Vec::new();
        let mut soft_wrapped = false;
        for hard in text.split('\n') {
            match max_width {
                Some(mw) => {
                    let t = mw / scale / if Self::is_bold(style) { 1.047 } else { 1.0 };
                    let segs = wrap_at(hard, t);
                    if segs.len() > 1 {
                        soft_wrapped = true;
                    }
                    lines.extend(segs);
                }
                None => lines.push(hard.to_string()),
            }
        }
        if lines.is_empty() {
            lines.push(String::new());
        }
        let mut width = lines
            .iter()
            .map(|l| Self::scaled_width(l, style))
            .fold(0.0_f64, f64::max);
        // mermaid sizes a soft-wrapped node to the *wrapping width*, not its widest
        // actual line (the foreignObject is fixed to wrappingWidth and the text
        // reflows inside it). Match that so wrapped nodes aren't sized too narrow.
        if soft_wrapped {
            if let Some(mw) = max_width {
                width = width.max(mw);
            }
        }
        let line_count = lines.len();
        TextMetrics {
            width,
            height: line_count as f64 * Self::line_height(style),
            line_count,
        }
    }
}

/// mermaid renders a leading FontAwesome token (`fa:fa-cogs ...`, `fab:...`) as an
/// icon glyph, not text. merman sizes the node for icon+text, but kymo draws the
/// label as text — so strip the icon token to avoid a giant text overflow (the
/// glyph itself is dropped; the text is then placed at merman's correct position).
fn strip_node_icon(label: &str) -> String {
    let trimmed = label.trim_start();
    let first = trimmed.split_whitespace().next().unwrap_or("");
    let is_icon = matches!(
        first.split(':').next(),
        Some("fa" | "fab" | "fas" | "far" | "fal" | "fad")
    ) && first.contains(':');
    if is_icon {
        trimmed[first.len()..].trim_start().to_string()
    } else {
        label.to_string()
    }
}

/// Find the byte index just past the `</g>` matching the `<g` at `start`.
fn balanced_g_end(b: &[u8], start: usize) -> Option<usize> {
    let mut depth = 0i32;
    let mut i = start;
    while i < b.len() {
        if i + 2 <= b.len()
            && &b[i..i + 2] == b"<g"
            && (i + 2 == b.len() || matches!(b[i + 2], b' ' | b'>' | b'/' | b'\n' | b'\t'))
        {
            depth += 1;
            i += 2;
        } else if i + 4 <= b.len() && &b[i..i + 4] == b"</g>" {
            depth -= 1;
            i += 4;
            if depth == 0 {
                return Some(i);
            }
        } else {
            i += 1;
        }
    }
    None
}

/// Extract each `@{icon}` node's inner SVG from merman's render, keyed by node id.
/// The inner content has coordinates relative to the node centre, so the caller
/// re-wraps it in `<g transform="translate(cx,cy)">`.
fn extract_icon_inners(svg: &str) -> std::collections::HashMap<String, String> {
    let mut out = std::collections::HashMap::new();
    let b = svg.as_bytes();
    let needle = "class=\"icon-shape";
    let mut from = 0;
    while let Some(rel) = svg[from..].find(needle) {
        let cls = from + rel;
        let gstart = svg[..cls].rfind("<g").unwrap_or(cls);
        from = cls + needle.len();
        let Some(end) = balanced_g_end(b, gstart) else {
            continue;
        };
        let group = match std::str::from_utf8(&b[gstart..end]) {
            Ok(g) => g,
            Err(_) => continue,
        };
        // node id from id="merman-flowchart-{id}-{n}"
        let pre = "id=\"merman-flowchart-";
        let Some(ip) = group.find(pre) else { continue };
        let id_start = ip + pre.len();
        let Some(iq) = group[id_start..].find('"') else {
            continue;
        };
        let full = &group[id_start..id_start + iq];
        let id = full
            .rsplit_once('-')
            .map(|(a, _)| a)
            .unwrap_or(full)
            .to_string();
        // inner = group minus the outer <g ...> and trailing </g>
        let Some(open_end) = group.find('>') else {
            continue;
        };
        if group.len() < open_end + 1 + 4 {
            continue;
        }
        let inner = &group[open_end + 1..group.len() - 4];
        out.insert(id, inner.to_string());
        from = end;
    }
    out
}

/// Pixels-per-em for KaTeX math at the 16px flowchart font. mermaid's KaTeX
/// renders ~5% tighter than RaTeX's raw em (measured: 4-glyph 15.15, 24-glyph
/// 15.52 px/em), so 15.4 best-fits across formulas.
const MATH_PX_PER_EM: f64 = 16.0;

/// kymo-tex layout of one `$$…$$` formula -> (width_em, height_em, inner SVG).
/// Uses KaTeX's own fonts so the raster pixel-matches mermaid's KaTeX.
fn ratex_dims_svg(formula: &str) -> Option<(f64, f64, String)> {
    crate::katex::render(formula).map(|(inner, w, h)| (w, h, inner))
}

/// Render a `$$…$$` formula to an inline `<g>` of raster-safe glyph paths, centred
/// at the node origin and scaled em→px to match mermaid's KaTeX. `None` if RaTeX
/// can't parse it.
fn render_math_group(formula: &str) -> Option<String> {
    let (w_em, h_em, inner) = ratex_dims_svg(formula)?;
    let (wpx, hpx) = (w_em * MATH_PX_PER_EM, h_em * MATH_PX_PER_EM);
    Some(format!(
        "<g transform=\"translate({:.2},{:.2}) scale({:.4})\">{}</g>",
        -wpx / 2.0,
        -hpx / 2.0,
        MATH_PX_PER_EM,
        inner
    ))
}

/// Math renderer that sizes a `$$…$$` node by RaTeX dimensions at mermaid's KaTeX
/// scale, so merman's layout box matches what kymo draws via `FNode.math`.
#[derive(Debug)]
struct KymoMathRenderer;

impl merman_render::math::MathRenderer for KymoMathRenderer {
    fn render_html_label(&self, text: &str, _config: &MermaidConfig) -> Option<String> {
        // Non-empty so merman engages its math sizing path; the HTML itself is
        // unused (kymo draws the glyphs from FNode.math).
        if math_only_formula(text).is_some() {
            Some(String::from("<span class=\"katex\"></span>"))
        } else {
            None
        }
    }

    fn measure_html_label(
        &self,
        text: &str,
        _config: &MermaidConfig,
        style: &TextStyle,
        _max_width_px: Option<f64>,
        _wrap_mode: WrapMode,
    ) -> Option<TextMetrics> {
        let formula = math_only_formula(text)?;
        let (w_em, h_em, _) = ratex_dims_svg(formula)?;
        let s = style.font_size / 16.0 * MATH_PX_PER_EM;
        Some(TextMetrics {
            width: w_em * s,
            height: h_em * s,
            line_count: 1,
        })
    }
}

/// The single `$$…$$` formula in a label, if the whole label is one math span.
fn math_only_formula(label: &str) -> Option<&str> {
    let t = label.trim().trim_matches(['"', '\'']).trim();
    let inner = t.strip_prefix("$$")?.strip_suffix("$$")?;
    if inner.is_empty() || inner.contains("$$") {
        None
    } else {
        Some(inner)
    }
}

/// Build kymo float geometry from merman's mermaid-faithful layout, sized with
/// kymo's browser-calibrated metrics. `None` on any parse/layout failure.
pub fn geom_from_merman(src: &str, fc: &Flowchart) -> Option<FGeom> {
    let meta = ParseMetadata {
        diagram_type: "flowchart-v2".to_string(),
        config: MermaidConfig::default(),
        effective_config: MermaidConfig::default(),
        title: None,
    };
    let semantic = parse_flowchart(src, &meta).ok()?;
    let config = MermaidConfig::default();
    let measurer = KymoTextMeasurer;
    let math = KymoMathRenderer;
    let layout = layout_flowchart_v2(&semantic, &config, &measurer, Some(&math)).ok()?;
    // Lift merman's raster-safe iconify glyphs for @{icon} nodes (best-effort).
    let icons = render_flowchart_v2_svg(
        &layout,
        &semantic,
        &serde_json::Value::Null,
        None,
        &measurer,
        &SvgRenderOptions::default(),
    )
    .ok()
    .map(|svg| extract_icon_inners(&svg))
    .unwrap_or_default();

    let (ox, oy) = match &layout.bounds {
        Some(b) => (MARGIN - b.min_x, MARGIN - b.min_y),
        None => (MARGIN, MARGIN),
    };

    // Raw labels (pre-clean) to detect `$$…$$` math spans before math::render
    // converts them to Unicode.
    let raw_math: HashMap<String, String> = crate::mermaid::parse(src)
        .ok()
        .map(|f| {
            f.nodes
                .iter()
                .filter_map(|n| math_only_formula(&n.label).map(|m| (n.id.clone(), m.to_string())))
                .collect()
        })
        .unwrap_or_default();

    let by_id: HashMap<&str, &crate::flowchart::FlowNode> =
        fc.nodes.iter().map(|n| (n.id.as_str(), n)).collect();
    let sg_title: HashMap<&str, &str> = fc
        .subgraphs
        .iter()
        .map(|s| (s.id.as_str(), s.title.as_str()))
        .collect();
    let edge_info: HashMap<(&str, &str), (&str, bool, bool)> = fc
        .edges
        .iter()
        .map(|e| {
            (
                (e.src.as_str(), e.dst.as_str()),
                (e.label.as_str(), e.dashed, e.no_arrow),
            )
        })
        .collect();

    let mut geom = FGeom::default();
    for ln in &layout.nodes {
        if ln.is_cluster {
            continue;
        }
        let Some(kn) = by_id.get(ln.id.as_str()) else {
            continue;
        };
        geom.nodes.push(FNode {
            id: ln.id.clone(),
            name: strip_node_icon(&kn.label),
            shape: kn.shape,
            cx: ln.x + ox,
            cy: ln.y + oy,
            w: ln.width,
            h: ln.height,
            icon: icons.get(ln.id.as_str()).cloned(),
            math: raw_math.get(ln.id.as_str()).and_then(|f| render_math_group(f)),
        });
    }
    if geom.nodes.is_empty() {
        return None;
    }
    for lc in &layout.clusters {
        let label = sg_title
            .get(lc.id.as_str())
            .copied()
            .unwrap_or("")
            .to_string();
        geom.regions.push(FRegion {
            id: lc.id.clone(),
            label,
            x: lc.x - lc.width / 2.0 + ox,
            y: lc.y - lc.height / 2.0 + oy,
            w: lc.width,
            h: lc.height,
            visible: true,
        });
    }
    for le in &layout.edges {
        let (label, dashed, no_arrow) = edge_info
            .get(&(le.from.as_str(), le.to.as_str()))
            .copied()
            .unwrap_or(("", false, false));
        let points: Vec<(f64, f64)> = le.points.iter().map(|p| (p.x + ox, p.y + oy)).collect();
        let label_pt = le.label.as_ref().map(|l| (l.x + ox, l.y + oy));
        geom.edges.push(FEdge {
            label: label.to_string(),
            dashed,
            no_arrow,
            points,
            label_pt,
        });
    }
    match &layout.bounds {
        Some(b) => {
            geom.w = b.max_x - b.min_x + 2.0 * MARGIN;
            geom.h = b.max_y - b.min_y + 2.0 * MARGIN;
        }
        None => {
            geom.w = geom
                .nodes
                .iter()
                .map(|n| n.cx + n.w / 2.0)
                .fold(40.0_f64, f64::max)
                + MARGIN;
            geom.h = geom
                .nodes
                .iter()
                .map(|n| n.cy + n.h / 2.0)
                .fold(40.0_f64, f64::max)
                + MARGIN;
        }
    }
    Some(geom)
}
