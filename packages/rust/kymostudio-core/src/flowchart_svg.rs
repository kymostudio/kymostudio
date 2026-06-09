//! Pure-Rust flowchart **SVG renderer**: a resolved [`Diagram`] → an SVG string.
//!
//! The Rust counterpart of the Python `to_svg` flowchart path (`render_flowchart_node`
//! + point-less edge routing) and the only non-BPMN SVG renderer in the core. It
//! draws icon-less flowchart nodes (the shape outline with the label inside),
//! anchor-routed orthogonal edges, and subgraph cluster regions. Unlike BPMN
//! (whose edges carry explicit `points`), flowchart edges are point-less, so this
//! resolves anchors from node geometry at render time (mirrors `model.resolve_anchors`
//! / `Component.anchor`). Output is its own renderer — not byte-identical to the
//! Python/JS flowchart SVG (independent impls), but the same visual language.

use crate::model::{Anchor, Component, Diagram, Edge, Region, Shape};
use std::collections::HashMap;

const STYLE: &str = "\
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

const DEFS: &str = "\
<marker id=\"arrow\" viewBox=\"0 0 12 10\" refX=\"11\" refY=\"5\" markerWidth=\"11\" markerHeight=\"11\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\">\
<path d=\"M2,1 L11,5 L2,9\" fill=\"none\" stroke=\"#64748b\" stroke-width=\"1.6\" \
stroke-linecap=\"round\" stroke-linejoin=\"round\"/></marker>\
<pattern id=\"dot-grid\" width=\"24\" height=\"24\" patternUnits=\"userSpaceOnUse\">\
<circle cx=\"1.5\" cy=\"1.5\" r=\"1.2\" fill=\"#0f172a\" fill-opacity=\"0.05\"/></pattern>";

/// Render a resolved flowchart diagram to a self-contained SVG document.
pub fn render(d: &Diagram) -> String {
    let by_id: HashMap<&str, &Component> = d.components.iter().map(|c| (c.id.as_str(), c)).collect();

    let regions: String = d.regions.iter().map(region_rect).collect();
    let edges: String = d.edges.iter().map(|e| edge_svg(e, &by_id)).collect();
    let nodes: String = d.components.iter().map(node_svg).collect();
    let region_labels: String = d.regions.iter().map(region_label).collect();

    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {w} {h}\" width=\"{w}\" height=\"{h}\" \
         style=\"max-width:100%;height:auto\" \
         font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif\">\n\
         <style>{STYLE}</style>\n<defs>{DEFS}</defs>\n\
         <rect width=\"{w}\" height=\"{h}\" fill=\"#fafafa\"/>\n\
         <rect width=\"{w}\" height=\"{h}\" class=\"bg-grid\"/>\n\
         {regions}{edges}{nodes}{region_labels}</svg>\n",
        w = d.width,
        h = d.height,
    )
}

// ── nodes ────────────────────────────────────────────────────────────────────

fn half(c: &Component) -> (i32, i32) {
    let (w, h) = c.size.unwrap_or((60, 46));
    (w / 2, h / 2)
}

fn node_svg(c: &Component) -> String {
    let (cx, cy) = c.pos;
    let (hw, hh) = half(c);
    let glyph = match c.shape {
        Shape::Circle => format!("<ellipse class=\"fc-shape\" cx=\"{cx}\" cy=\"{cy}\" rx=\"{hw}\" ry=\"{hh}\"/>"),
        Shape::Diamond => {
            let pts = format!("{cx},{} {},{cy} {cx},{} {},{cy}", cy - hh, cx + hw, cy + hh, cx - hw);
            format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
        }
        Shape::Hex => {
            let s = hh.min(hw / 2);
            let pts = format!(
                "{},{cy} {},{} {},{} {},{cy} {},{} {},{}",
                cx - hw, cx - hw + s, cy - hh, cx + hw - s, cy - hh,
                cx + hw, cx + hw - s, cy + hh, cx - hw + s, cy + hh,
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
                cx - hw, cx + hw, cx - hw, cx - hw, cx + hw,
            )
        }
        Shape::Badge => format!(
            "<rect class=\"fc-shape\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{hh}\"/>",
            cx - hw, cy - hh, 2 * hw, 2 * hh,
        ),
        _ => format!(
            "<rect class=\"fc-shape\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"6\"/>",
            cx - hw, cy - hh, 2 * hw, 2 * hh,
        ),
    };
    let label = if c.name.is_empty() {
        String::new()
    } else {
        format!("<text class=\"fc-label\" x=\"{cx}\" y=\"{cy}\">{}</text>", esc(&c.name))
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
        if dy >= 0 { (Anchor::Bottom, Anchor::Top) } else { (Anchor::Top, Anchor::Bottom) }
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

fn edge_svg(e: &Edge, by_id: &HashMap<&str, &Component>) -> String {
    let (Some(s), Some(t)) = (by_id.get(e.src.as_str()), by_id.get(e.dst.as_str())) else {
        return String::new();
    };
    let (sa, da) = resolve_anchors(s, t);
    let sp = anchor_pos(s, sa);
    let dp = anchor_pos(t, da);
    let path = edge_path(sp, dp, sa);
    let dash = if e.dashed { " style=\"stroke-dasharray:6 4\"" } else { "" };
    let marker = if e.no_arrow { "" } else { " marker-end=\"url(#arrow)\"" };
    let mut out = format!("<path class=\"edge-path\"{dash} d=\"{path}\"{marker}/>\n");
    if !e.label.is_empty() {
        let (lx, ly) = ((sp.0 + dp.0) / 2, (sp.1 + dp.1) / 2);
        out.push_str(&format!("<text class=\"edge-label\" x=\"{lx}\" y=\"{ly}\">{}</text>\n", esc(&e.label)));
    }
    out
}

// ── regions (clusters) ───────────────────────────────────────────────────────

fn region_rect(r: &Region) -> String {
    if !r.visible {
        return String::new();
    }
    let (x, y, w, h) = r.bounds;
    format!("<rect class=\"region-rect\" x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"12\"/>\n")
}

fn region_label(r: &Region) -> String {
    if !r.visible || r.label.is_empty() {
        return String::new();
    }
    let (x, y, _w, _h) = r.bounds;
    format!("<text class=\"region-label\" text-anchor=\"start\" x=\"{}\" y=\"{}\">{}</text>\n",
        x + 12, y + 16, esc(&r.label))
}

/// Escape `& < >` for XML text content.
fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;")
}

#[cfg(test)]
mod tests {
    use super::render;
    use crate::model::{Component, Diagram, Edge, Region, Shape};

    fn diamond_diagram() -> Diagram {
        let mut d = Diagram { width: 200, height: 200, ..Default::default() };
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
        let mut d = Diagram { width: 100, height: 100, ..Default::default() };
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
