//! Pure-Rust flowchart **SVG renderer**: a resolved [`Diagram`] → an SVG string.
//!
//! The Rust counterpart of the Python `to_svg` flowchart path (`render_flowchart_node` +
//! point-less edge routing) and the only non-BPMN SVG renderer in the core. It
//! draws icon-less flowchart nodes (the shape outline with the label inside),
//! anchor-routed orthogonal edges, and subgraph cluster regions. Unlike BPMN
//! (whose edges carry explicit `points`), flowchart edges are point-less, so this
//! resolves anchors from node geometry at render time (mirrors `model.resolve_anchors`
//! / `Component.anchor`). Output is its own renderer — not byte-identical to the
//! Python/JS flowchart SVG (independent impls), but the same visual language.

use crate::model::{Anchor, Component, Diagram, Edge, Region, Shape};
use crate::style::{FlowStyle, NodeStyle};
use std::collections::HashMap as StyleMap;
use std::collections::HashMap;

pub(crate) const STYLE: &str = "\
text{fill:#1f2937}\
.bg-grid{fill:url(#dot-grid)}\
.fc-shape{fill:#eff6ff;stroke:#3b82f6;stroke-width:1.6}\
.fc-shape-line{fill:none;stroke:#3b82f6;stroke-width:1.6;stroke-linecap:round}\
.fc-label{font-size:13px;font-weight:600;fill:#1e3a8a;text-anchor:middle;dominant-baseline:central}\
.edge-path{fill:none;stroke:#64748b;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}\
.edge-label{font-size:11.5px;font-weight:500;fill:#334155;text-anchor:middle;\
paint-order:stroke;stroke:#fafafa;stroke-width:4;stroke-linejoin:round}\
.region-rect{fill:#eaf3ff;stroke:#b8d0ee;stroke-width:1.2}\
.region-label{font-size:11px;font-weight:500;fill:#475569;\
paint-order:stroke;stroke:#eaf3ff;stroke-width:3}";

pub(crate) const DEFS: &str = "\
<marker id=\"arrow\" viewBox=\"0 0 12 10\" refX=\"11\" refY=\"5\" markerWidth=\"11\" markerHeight=\"11\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\">\
<path d=\"M2,1 L11,5 L2,9\" fill=\"none\" stroke=\"#64748b\" stroke-width=\"1.6\" \
stroke-linecap=\"round\" stroke-linejoin=\"round\"/></marker>\
<pattern id=\"dot-grid\" width=\"24\" height=\"24\" patternUnits=\"userSpaceOnUse\">\
<circle cx=\"1.5\" cy=\"1.5\" r=\"1.2\" fill=\"#0f172a\" fill-opacity=\"0.05\"/></pattern>";

pub(crate) const FONT_KYMO: &str =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
pub(crate) const FONT_MERMAID: &str = "'trebuchet ms', verdana, arial, sans-serif";

/// mermaid.js default theme: lavender nodes, purple borders, `#333` edges.
pub(crate) const STYLE_MERMAID: &str = "\
text{fill:#333333}\
.fc-shape{fill:#ECECFF;stroke:#9370DB;stroke-width:1}\
.fc-shape-line{fill:none;stroke:#9370DB;stroke-width:1}\
.fc-label{font-size:16px;fill:#333333;text-anchor:middle}\
.edge-path{fill:none;stroke:#333333;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}\
.edge-label{font-size:16px;fill:#333333;text-anchor:middle;\
paint-order:stroke;stroke:#e8e8e8;stroke-width:5;stroke-linejoin:round}\
.region-rect{fill:#ffffde;stroke:#aaaa33;stroke-width:1}\
.region-label{font-size:16px;fill:#333333;paint-order:stroke;stroke:#ffffde;stroke-width:3}";

/// mermaid arrowhead: a filled triangle (vs kymo's open chevron); no dot grid.
pub(crate) const DEFS_MERMAID: &str = "\
<marker id=\"arrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"8\" markerHeight=\"8\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\">\
<path d=\"M0,0 L10,5 L0,10 z\" fill=\"#333333\"/></marker>";

/// Render a resolved flowchart diagram to a self-contained SVG document
/// (kymo's native style).
pub fn render(d: &Diagram) -> String {
    render_styled(d, FlowStyle::Kymo)
}

/// Render with an explicit [`FlowStyle`] — kymo-native or mermaid-like.
pub fn render_styled(d: &Diagram, style: FlowStyle) -> String {
    render_styled_with(d, style, &StyleMap::new(), None)
}

/// Render with per-node colour overrides + an optional global node fill.
pub fn render_styled_with(
    d: &Diagram,
    style: FlowStyle,
    styles: &StyleMap<String, NodeStyle>,
    default_fill: Option<&str>,
) -> String {
    let by_id: HashMap<&str, &Component> =
        d.components.iter().map(|c| (c.id.as_str(), c)).collect();

    let regions: String = d.regions.iter().map(|r| region_rect(r, style)).collect();
    let edges: String = d.edges.iter().map(|e| edge_svg(e, &by_id, style)).collect();
    let nodes: String = d
        .components
        .iter()
        .map(|c| node_svg(c, style, styles.get(&c.id), default_fill))
        .collect();
    let region_labels: String = d.regions.iter().map(|r| region_label(r, style)).collect();

    let (css, defs, font) = match style {
        FlowStyle::Kymo => (STYLE, DEFS, FONT_KYMO),
        FlowStyle::Mermaid => (STYLE_MERMAID, DEFS_MERMAID, FONT_MERMAID),
    };
    let (w, h) = (d.width, d.height);
    let bg = match style {
        FlowStyle::Kymo => format!(
            "<rect width=\"{w}\" height=\"{h}\" fill=\"#fafafa\"/>\n<rect width=\"{w}\" height=\"{h}\" class=\"bg-grid\"/>\n"
        ),
        FlowStyle::Mermaid => String::new(),
    };
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {w} {h}\" width=\"{w}\" height=\"{h}\" \
         style=\"max-width:100%;height:auto\" font-family=\"{font}\">\n\
         <style>{css}</style>\n<defs>{defs}</defs>\n\
         {bg}{regions}{edges}{nodes}{region_labels}</svg>\n"
    )
}

// ── nodes ────────────────────────────────────────────────────────────────────

fn half(c: &Component) -> (i32, i32) {
    let (w, h) = c.size.unwrap_or((60, 46));
    (w / 2, h / 2)
}

fn node_svg(
    c: &Component,
    style: FlowStyle,
    ns: Option<&NodeStyle>,
    default_fill: Option<&str>,
) -> String {
    let (cx, cy) = c.pos;
    let (hw, hh) = half(c);
    // Effective per-node colour override (per-node fill wins over the global).
    let mut ovr = ns.cloned().unwrap_or_default();
    if ovr.fill.is_none() {
        if let Some(g) = default_fill {
            ovr.fill = Some(g.to_string());
        }
    }
    let shape_css = ovr.shape_css();
    // Sharp `[...]` rect vs rounded box only differ under the mermaid style.
    let box_rx = match (style, c.shape) {
        (FlowStyle::Mermaid, Shape::Rect) => 0,
        (FlowStyle::Mermaid, _) => 5,
        _ => 6,
    };
    let glyph = match c.shape {
        Shape::Circle => {
            format!("<ellipse class=\"fc-shape\" cx=\"{cx}\" cy=\"{cy}\" rx=\"{hw}\" ry=\"{hh}\"/>")
        }
        Shape::Diamond => {
            let pts = format!(
                "{cx},{} {},{cy} {cx},{} {},{cy}",
                cy - hh,
                cx + hw,
                cy + hh,
                cx - hw
            );
            format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
        }
        Shape::Hex => {
            let s = hh.min(hw / 2);
            let pts = format!(
                "{},{cy} {},{} {},{} {},{cy} {},{} {},{}",
                cx - hw,
                cx - hw + s,
                cy - hh,
                cx + hw - s,
                cy - hh,
                cx + hw,
                cx + hw - s,
                cy + hh,
                cx - hw + s,
                cy + hh,
            );
            format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
        }
        Shape::Cylinder => {
            let ry = (4).max(((hh as f64) * 0.22).round() as i32);
            let (top, bot) = (cy - hh + ry, cy + hh - ry);
            format!(
                "<path class=\"fc-shape\" d=\"M{},{top} V{bot} A{hw},{ry} 0 0 0 {},{bot} V{top} \
                 A{hw},{ry} 0 0 1 {},{top} Z\"/>\
                 <path class=\"fc-shape-line\" d=\"M{},{top} A{hw},{ry} 0 0 0 {},{top}\"/>",
                cx - hw,
                cx + hw,
                cx - hw,
                cx - hw,
                cx + hw,
            )
        }
        Shape::Parallelogram | Shape::ParallelogramAlt => {
            let sk = hh.min(hw / 2);
            let (x0, x1, x2, x3) = if matches!(c.shape, Shape::Parallelogram) {
                (cx - hw + sk, cx + hw, cx + hw - sk, cx - hw)
            } else {
                (cx - hw, cx + hw - sk, cx + hw, cx - hw + sk)
            };
            let pts = format!(
                "{x0},{} {x1},{} {x2},{} {x3},{}",
                cy - hh,
                cy - hh,
                cy + hh,
                cy + hh
            );
            format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
        }
        Shape::Trapezoid | Shape::TrapezoidAlt => {
            let sk = hh.min(hw / 2);
            let (x0, x1, x2, x3) = if matches!(c.shape, Shape::Trapezoid) {
                (cx - hw + sk, cx + hw - sk, cx + hw, cx - hw)
            } else {
                (cx - hw, cx + hw, cx + hw - sk, cx - hw + sk)
            };
            let pts = format!(
                "{x0},{} {x1},{} {x2},{} {x3},{}",
                cy - hh,
                cy - hh,
                cy + hh,
                cy + hh
            );
            format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
        }
        Shape::Badge => {
            format!(
            "<rect class=\"fc-shape\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{hh}\"/>",
            cx - hw, cy - hh, 2 * hw, 2 * hh,
        )
        }
        Shape::StateStart => {
            format!("<circle cx=\"{cx}\" cy=\"{cy}\" r=\"8\" fill=\"#334155\"/>")
        }
        Shape::StateEnd => format!(
                "<circle cx=\"{cx}\" cy=\"{cy}\" r=\"9\" fill=\"#ffffff\" stroke=\"#334155\" \
                 stroke-width=\"1.5\"/><circle cx=\"{cx}\" cy=\"{cy}\" r=\"4.5\" fill=\"#334155\"/>"
            ),
        _ => {
            format!(
            "<rect class=\"fc-shape\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{box_rx}\"/>",
            cx - hw, cy - hh, 2 * hw, 2 * hh,
        )
        }
    };
    let glyph = if shape_css.is_empty() {
        glyph
    } else {
        glyph.replace(
            "class=\"fc-shape\"",
            &format!("class=\"fc-shape\" style=\"{shape_css}\""),
        )
    };
    let label = if c.name.is_empty() {
        String::new()
    } else {
        let cstyle = ovr
            .color
            .as_ref()
            .map(|c| format!(" style=\"fill:{c}\""))
            .unwrap_or_default();
        // Mermaid uses an HTML alphabetic baseline; match it (y = centre + 0.30*16).
        let ly = if matches!(style, FlowStyle::Mermaid) {
            cy + 5
        } else {
            cy
        };
        format!(
            "<text class=\"fc-label\" x=\"{cx}\" y=\"{ly}\"{cstyle}>{}</text>",
            esc(&c.name)
        )
    };
    format!("{glyph}{label}\n")
}

// ── edges (point-less → resolve anchors from geometry) ───────────────────────

fn anchor_pos(c: &Component, side: Anchor) -> (i32, i32) {
    let (cx, cy) = c.pos;
    let (hw, hh) = half(c);
    match side {
        Anchor::Top => (cx, cy - hh),
        Anchor::Right => (cx + hw, cy),
        Anchor::Bottom => (cx, cy + hh),
        Anchor::Left => (cx - hw, cy),
        Anchor::Center => (cx, cy),
    }
}

/// Auto-pick (src, dst) sides from relative centres — horizontal-biased; vertical
/// only when `|dy| > 2·|dx|` (mirrors `model.resolve_anchors`).
fn resolve_anchors(s: &Component, t: &Component) -> (Anchor, Anchor) {
    let (sx, sy) = s.pos;
    let (tx, ty) = t.pos;
    let (dx, dy) = (tx - sx, ty - sy);
    if dy.abs() > 2 * dx.abs() {
        if dy >= 0 {
            (Anchor::Bottom, Anchor::Top)
        } else {
            (Anchor::Top, Anchor::Bottom)
        }
    } else if dx >= 0 {
        (Anchor::Right, Anchor::Left)
    } else {
        (Anchor::Left, Anchor::Right)
    }
}

/// Orthogonal Z-route between two anchor points, bending on the src-anchor axis.
fn edge_path(sp: (i32, i32), dp: (i32, i32), sa: Anchor) -> String {
    let ((sx, sy), (dx, dy)) = (sp, dp);
    match sa {
        Anchor::Top | Anchor::Bottom => {
            let my = (sy + dy) / 2;
            format!("M{sx},{sy} L{sx},{my} L{dx},{my} L{dx},{dy}")
        }
        Anchor::Left | Anchor::Right => {
            let mx = (sx + dx) / 2;
            format!("M{sx},{sy} L{mx},{sy} L{mx},{dy} L{dx},{dy}")
        }
        Anchor::Center => format!("M{sx},{sy} L{dx},{dy}"),
    }
}

fn edge_svg(e: &Edge, by_id: &HashMap<&str, &Component>, style: FlowStyle) -> String {
    let (Some(s), Some(t)) = (by_id.get(e.src.as_str()), by_id.get(e.dst.as_str())) else {
        return String::new();
    };
    let (sa, da) = resolve_anchors(s, t);
    let sp = anchor_pos(s, sa);
    let dp = anchor_pos(t, da);
    // Prefer dagre waypoints (mermaid-faithful routing) when present.
    let path = match &e.points {
        Some(pts) if pts.len() >= 2 => smooth_path(pts),
        _ => edge_path(sp, dp, sa),
    };
    let dash = if e.dashed {
        " style=\"stroke-dasharray:6 4\""
    } else {
        ""
    };
    let marker = if e.no_arrow {
        ""
    } else {
        " marker-end=\"url(#arrow)\""
    };
    let mut out = format!("<path class=\"edge-path\"{dash} d=\"{path}\"{marker}/>\n");
    if !e.label.is_empty() {
        // Mermaid places the edge label at the destination node x, dagre label y.
        let (lx, ly) = match e.label_pos {
            Some((_, ply)) => (dp.0, ply),
            None => ((sp.0 + dp.0) / 2, (sp.1 + dp.1) / 2),
        };
        let ly = if matches!(style, FlowStyle::Mermaid) {
            ly + 5
        } else {
            ly
        };
        out.push_str(&format!(
            "<text class=\"edge-label\" x=\"{lx}\" y=\"{ly}\">{}</text>\n",
            esc(&e.label)
        ));
    }
    out
}

// ── regions (clusters) ───────────────────────────────────────────────────────

fn region_rect(r: &Region, style: FlowStyle) -> String {
    if !r.visible {
        return String::new();
    }
    let (x, y, w, h) = r.bounds;
    let rx = match style {
        FlowStyle::Mermaid => 0,
        FlowStyle::Kymo => 12,
    };
    format!("<rect class=\"region-rect\" x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"{rx}\"/>\n")
}

fn region_label(r: &Region, style: FlowStyle) -> String {
    if !r.visible || r.label.is_empty() {
        return String::new();
    }
    let (x, y, w, _h) = r.bounds;
    // Mermaid centres the cluster title at the top; kymo left-aligns it.
    if matches!(style, FlowStyle::Mermaid) {
        format!(
            "<text class=\"region-label\" text-anchor=\"middle\" x=\"{}\" y=\"{}\">{}</text>\n",
            x + w / 2,
            y + 16,
            esc(&r.label)
        )
    } else {
        format!(
            "<text class=\"region-label\" text-anchor=\"start\" x=\"{}\" y=\"{}\">{}</text>\n",
            x + 12,
            y + 16,
            esc(&r.label)
        )
    }
}

/// Render a polyline (dagre waypoints) as a uniform cubic B-spline, matching
/// d3 `curveBasis` exactly (mermaid's edge curve).
fn smooth_path(pts: &[(i32, i32)]) -> String {
    let n = pts.len();
    if n == 2 {
        return format!("M{},{} L{},{}", pts[0].0, pts[0].1, pts[1].0, pts[1].1);
    }
    let p = |i: usize| (pts[i].0 as f64, pts[i].1 as f64);
    let bezier = |d: &mut String, x0: f64, y0: f64, x1: f64, y1: f64, x: f64, y: f64| {
        d.push_str(&format!(
            " C{:.2},{:.2} {:.2},{:.2} {:.2},{:.2}",
            (2.0 * x0 + x1) / 3.0,
            (2.0 * y0 + y1) / 3.0,
            (x0 + 2.0 * x1) / 3.0,
            (y0 + 2.0 * y1) / 3.0,
            (x0 + 4.0 * x1 + x) / 6.0,
            (y0 + 4.0 * y1 + y) / 6.0,
        ));
    };
    let (mut x0, mut y0) = (0.0_f64, 0.0_f64);
    let (mut x1, mut y1) = (0.0_f64, 0.0_f64);
    let mut d = String::new();
    for i in 0..n {
        let (x, y) = p(i);
        match i {
            0 => d.push_str(&format!("M{:.2},{:.2}", x, y)),
            1 => {}
            2 => {
                d.push_str(&format!(
                    " L{:.2},{:.2}",
                    (5.0 * x0 + x1) / 6.0,
                    (5.0 * y0 + y1) / 6.0
                ));
                bezier(&mut d, x0, y0, x1, y1, x, y);
            }
            _ => bezier(&mut d, x0, y0, x1, y1, x, y),
        }
        x0 = x1;
        x1 = x;
        y0 = y1;
        y1 = y;
    }
    bezier(&mut d, x0, y0, x1, y1, x1, y1);
    d.push_str(&format!(" L{:.2},{:.2}", x1, y1));
    d
}

/// Escape `& < >` for XML text content.
pub(crate) fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

#[cfg(test)]
mod tests {
    use super::render;
    use crate::model::{Component, Diagram, Edge, Region, Shape};

    fn diamond_diagram() -> Diagram {
        let mut d = Diagram {
            width: 200,
            height: 200,
            ..Default::default()
        };
        let mut a = Component::flowchart("A", "Start", Shape::Box);
        a.pos = (100, 40);
        a.size = Some((80, 46));
        let mut b = Component::flowchart("B", "ok?", Shape::Diamond);
        b.pos = (100, 140);
        b.size = Some((80, 60));
        d.components.push(a);
        d.components.push(b);
        let mut e = Edge::routed("A", "B", "go");
        e.dashed = true;
        d.edges.push(e);
        d
    }

    #[test]
    fn renders_shapes_edges_and_envelope() {
        let svg = render(&diamond_diagram());
        assert!(svg.starts_with("<?xml") && svg.trim_end().ends_with("</svg>"));
        assert!(svg.contains("viewBox=\"0 0 200 200\""));
        assert!(svg.contains("<polygon class=\"fc-shape\"")); // diamond
        assert!(svg.contains("<rect class=\"fc-shape\"")); // box
        assert!(svg.contains(">Start<") && svg.contains(">ok?<"));
        assert!(svg.contains("class=\"edge-path\"") && svg.contains("stroke-dasharray"));
        assert!(svg.contains(">go<") && svg.contains("marker-end"));
    }

    #[test]
    fn no_arrow_omits_marker_and_region_cluster() {
        let mut d = Diagram {
            width: 100,
            height: 100,
            ..Default::default()
        };
        let mut a = Component::flowchart("A", "", Shape::Circle);
        a.pos = (50, 30);
        a.size = Some((40, 40));
        d.components.push(a);
        let mut e = Edge::routed("A", "A", "");
        e.no_arrow = true;
        d.edges.push(e);
        let mut r = Region::cluster("G", "Grp", vec!["A".into()]);
        r.bounds = (5, 5, 90, 50);
        d.regions.push(r);
        let svg = render(&d);
        assert!(svg.contains("<ellipse class=\"fc-shape\""));
        assert!(!svg.contains("marker-end"));
        assert!(svg.contains("class=\"region-rect\"") && svg.contains(">Grp<"));
    }
}
