//! Float-precision SVG renderer for the dagre flowchart path.
//!
//! [`crate::flowchart_svg`] renders the integer [`Diagram`](crate::model::Diagram)
//! — fine for kymo's own diagrams, but the dagre path
//! ([`crate::layout_dagre`]) carries mermaid-faithful sub-pixel positions that
//! the `(i32, i32)` [`Point`](crate::model::Point) rounds away (a node centre
//! `172.65 → 173` shifts the whole glyph + its text ~0.35px). This module keeps
//! the dagre geometry in `f64` end-to-end and emits coordinates verbatim, so the
//! overlay vs mermaid.js is bounded by anti-aliasing, not rounding. It reuses the
//! style constants, fonts and arrowheads from [`crate::flowchart_svg`].

use crate::flowchart_svg::{
    esc, DEFS, DEFS_MERMAID, FONT_KYMO, FONT_MERMAID, STYLE, STYLE_MERMAID,
};
use crate::model::Shape;
use crate::style::{FlowStyle, NodeStyle};
use std::collections::HashMap;

/// A laid-out node in float coordinates (centre + full size).
#[derive(Debug, Clone)]
pub struct FNode {
    pub id: String,
    pub name: String,
    pub shape: Shape,
    pub cx: f64,
    pub cy: f64,
    pub w: f64,
    pub h: f64,
}

/// A routed edge in float coordinates.
#[derive(Debug, Clone)]
pub struct FEdge {
    pub label: String,
    pub dashed: bool,
    pub no_arrow: bool,
    pub points: Vec<(f64, f64)>,
    /// Label anchor (mermaid: destination-node centre x, dagre label y).
    pub label_pt: Option<(f64, f64)>,
}

/// A cluster region in float coordinates (top-left + size).
#[derive(Debug, Clone)]
pub struct FRegion {
    pub id: String,
    pub label: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub visible: bool,
}

/// The full float geometry of a dagre-laid-out flowchart.
#[derive(Debug, Clone, Default)]
pub struct FGeom {
    pub w: f64,
    pub h: f64,
    pub nodes: Vec<FNode>,
    pub edges: Vec<FEdge>,
    pub regions: Vec<FRegion>,
}

/// Format a coordinate with up to 2 decimals, trimming trailing zeros so whole
/// values stay clean (`65.00 → 65`, `65.50 → 65.5`).
fn nf(v: f64) -> String {
    let s = format!("{:.2}", v);
    let t = s.trim_end_matches('0').trim_end_matches('.');
    if t.is_empty() || t == "-" {
        "0".to_string()
    } else {
        t.to_string()
    }
}

/// Render float geometry to a self-contained SVG document.
pub fn render(
    geom: &FGeom,
    style: FlowStyle,
    styles: &HashMap<String, NodeStyle>,
    default_style: Option<&NodeStyle>,
) -> String {
    let regions: String = geom
        .regions
        .iter()
        .map(|r| region_rect(r, style, styles.get(&r.id)))
        .collect();
    let edges: String = geom.edges.iter().map(|e| edge_svg(e, style)).collect();
    let nodes: String = geom
        .nodes
        .iter()
        .map(|n| node_svg(n, style, styles.get(&n.id), default_style))
        .collect();
    let region_labels: String = geom
        .regions
        .iter()
        .map(|r| region_label(r, style, styles.get(&r.id)))
        .collect();

    let (css, defs, font) = match style {
        FlowStyle::Kymo => (STYLE, DEFS, FONT_KYMO),
        FlowStyle::Mermaid => (STYLE_MERMAID, DEFS_MERMAID, FONT_MERMAID),
    };
    // True float viewBox (matching mermaid's own fractional extent) so any host
    // that fits the SVG into an integer pixel box scales kymo and mermaid the
    // same way — an integer-ceil envelope would scale only one of them.
    let (w, h) = (nf(geom.w), nf(geom.h));
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

fn node_svg(
    n: &FNode,
    style: FlowStyle,
    ns: Option<&NodeStyle>,
    default_style: Option<&NodeStyle>,
) -> String {
    let (cx, cy) = (n.cx, n.cy);
    let (hw, hh) = (n.w / 2.0, n.h / 2.0);
    let mut ovr = ns.cloned().unwrap_or_default();
    if let Some(d) = default_style {
        if ovr.fill.is_none() {
            ovr.fill = d.fill.clone();
        }
        if ovr.stroke.is_none() {
            ovr.stroke = d.stroke.clone();
        }
        if ovr.color.is_none() {
            ovr.color = d.color.clone();
        }
        if ovr.stroke_width.is_none() {
            ovr.stroke_width = d.stroke_width.clone();
        }
        if ovr.font_weight.is_none() {
            ovr.font_weight = d.font_weight.clone();
        }
    }
    let shape_css = ovr.shape_css();
    let box_rx = match (style, n.shape) {
        (FlowStyle::Mermaid, Shape::Rect) => 0.0,
        (FlowStyle::Mermaid, _) => 5.0,
        _ => 6.0,
    };
    let glyph =
        match n.shape {
            Shape::Circle => format!(
                "<ellipse class=\"fc-shape\" cx=\"{}\" cy=\"{}\" rx=\"{}\" ry=\"{}\"/>",
                nf(cx),
                nf(cy),
                nf(hw),
                nf(hh)
            ),
            Shape::Diamond => {
                let pts = format!(
                    "{},{} {},{} {},{} {},{}",
                    nf(cx),
                    nf(cy - hh),
                    nf(cx + hw),
                    nf(cy),
                    nf(cx),
                    nf(cy + hh),
                    nf(cx - hw),
                    nf(cy)
                );
                format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
            }
            Shape::Hex => {
                let s = hh.min(hw / 2.0);
                let pts = format!(
                    "{},{} {},{} {},{} {},{} {},{} {},{}",
                    nf(cx - hw),
                    nf(cy),
                    nf(cx - hw + s),
                    nf(cy - hh),
                    nf(cx + hw - s),
                    nf(cy - hh),
                    nf(cx + hw),
                    nf(cy),
                    nf(cx + hw - s),
                    nf(cy + hh),
                    nf(cx - hw + s),
                    nf(cy + hh)
                );
                format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
            }
            Shape::Cylinder => {
                let ry = (4.0_f64).max((hh * 0.22 * 100.0).round() / 100.0);
                let (top, bot) = (cy - hh + ry, cy + hh - ry);
                format!(
                    "<path class=\"fc-shape\" d=\"M{},{} V{} A{},{} 0 0 0 {},{} V{} \
                 A{},{} 0 0 1 {},{} Z\"/>\
                 <path class=\"fc-shape-line\" d=\"M{},{} A{},{} 0 0 0 {},{}\"/>",
                    nf(cx - hw),
                    nf(top),
                    nf(bot),
                    nf(hw),
                    nf(ry),
                    nf(cx + hw),
                    nf(bot),
                    nf(top),
                    nf(hw),
                    nf(ry),
                    nf(cx - hw),
                    nf(top),
                    nf(cx - hw),
                    nf(top),
                    nf(hw),
                    nf(ry),
                    nf(cx + hw),
                    nf(top),
                )
            }
            Shape::Parallelogram | Shape::ParallelogramAlt => {
                let sk = hh.min(hw / 2.0);
                let (x0, x1, x2, x3) = if matches!(n.shape, Shape::Parallelogram) {
                    (cx - hw + sk, cx + hw, cx + hw - sk, cx - hw)
                } else {
                    (cx - hw, cx + hw - sk, cx + hw, cx - hw + sk)
                };
                let pts = format!(
                    "{},{} {},{} {},{} {},{}",
                    nf(x0),
                    nf(cy - hh),
                    nf(x1),
                    nf(cy - hh),
                    nf(x2),
                    nf(cy + hh),
                    nf(x3),
                    nf(cy + hh)
                );
                format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
            }
            Shape::Trapezoid | Shape::TrapezoidAlt => {
                let sk = hh.min(hw / 2.0);
                let (x0, x1, x2, x3) = if matches!(n.shape, Shape::Trapezoid) {
                    (cx - hw + sk, cx + hw - sk, cx + hw, cx - hw)
                } else {
                    (cx - hw, cx + hw, cx + hw - sk, cx - hw + sk)
                };
                let pts = format!(
                    "{},{} {},{} {},{} {},{}",
                    nf(x0),
                    nf(cy - hh),
                    nf(x1),
                    nf(cy - hh),
                    nf(x2),
                    nf(cy + hh),
                    nf(x3),
                    nf(cy + hh)
                );
                format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
            }
            Shape::Badge => {
                format!(
            "<rect class=\"fc-shape\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\"/>",
            nf(cx - hw), nf(cy - hh), nf(2.0 * hw), nf(2.0 * hh), nf(hh),
        )
            }
            Shape::StateStart => format!(
                "<circle cx=\"{}\" cy=\"{}\" r=\"8\" fill=\"#334155\"/>",
                nf(cx),
                nf(cy)
            ),
            Shape::StateEnd => format!(
                "<circle cx=\"{}\" cy=\"{}\" r=\"9\" fill=\"#ffffff\" stroke=\"#334155\" \
             stroke-width=\"1.5\"/><circle cx=\"{}\" cy=\"{}\" r=\"4.5\" fill=\"#334155\"/>",
                nf(cx),
                nf(cy),
                nf(cx),
                nf(cy)
            ),
            _ => {
                format!(
            "<rect class=\"fc-shape\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\"/>",
            nf(cx - hw), nf(cy - hh), nf(2.0 * hw), nf(2.0 * hh), nf(box_rx),
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
    let label = if n.name.is_empty() {
        String::new()
    } else {
        let mut lstyle = String::new();
        if let Some(c) = &ovr.color {
            lstyle.push_str(&format!("fill:{c};"));
        }
        if let Some(w) = &ovr.font_weight {
            lstyle.push_str(&format!("font-weight:{w};"));
        }
        let cstyle = if lstyle.is_empty() {
            String::new()
        } else {
            format!(" style=\"{lstyle}\"")
        };
        // Mermaid wraps rectangle labels at ~200px and uses an HTML alphabetic
        // baseline (y = centre + 0.30*16); reproduce both.
        let lines = if matches!(style, FlowStyle::Mermaid) {
            crate::layout::node_lines_mermaid(&n.name, n.shape)
        } else {
            vec![n.name.clone()]
        };
        if lines.len() <= 1 {
            let ly = if matches!(style, FlowStyle::Mermaid) {
                cy + 5.0
            } else {
                cy
            };
            format!(
                "<text class=\"fc-label\" x=\"{}\" y=\"{}\"{cstyle}>{}</text>",
                nf(cx),
                nf(ly),
                esc(&n.name)
            )
        } else {
            // Centre the block of 24px lines on cy; alphabetic baseline +5.
            let nl = lines.len() as f64;
            let first = cy - (nl - 1.0) * 12.0 + 5.0;
            let tspans: String = lines
                .iter()
                .enumerate()
                .map(|(i, l)| {
                    let dy = if i == 0 { 0.0 } else { 24.0 };
                    format!(
                        "<tspan x=\"{}\" dy=\"{}\">{}</tspan>",
                        nf(cx),
                        nf(dy),
                        esc(l)
                    )
                })
                .collect();
            format!(
                "<text class=\"fc-label\" x=\"{}\" y=\"{}\"{cstyle}>{}</text>",
                nf(cx),
                nf(first),
                tspans
            )
        }
    };
    format!("{glyph}{label}\n")
}

fn edge_svg(e: &FEdge, style: FlowStyle) -> String {
    if e.points.len() < 2 {
        return String::new();
    }
    let path = smooth_path_f(&e.points);
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
        if let Some((lx, ly)) = e.label_pt {
            let ly = if matches!(style, FlowStyle::Mermaid) {
                ly + 5.0
            } else {
                ly
            };
            out.push_str(&format!(
                "<text class=\"edge-label\" x=\"{}\" y=\"{}\">{}</text>\n",
                nf(lx),
                nf(ly),
                esc(&e.label)
            ));
        }
    }
    out
}

fn region_rect(r: &FRegion, style: FlowStyle, ns: Option<&NodeStyle>) -> String {
    if !r.visible {
        return String::new();
    }
    let rx = match style {
        FlowStyle::Mermaid => 0.0,
        FlowStyle::Kymo => 12.0,
    };
    let scss = ns.map(|n| n.shape_css()).unwrap_or_default();
    let sattr = if scss.is_empty() {
        String::new()
    } else {
        format!(" style=\"{scss}\"")
    };
    format!(
        "<rect class=\"region-rect\"{sattr} x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\"/>\n",
        nf(r.x),
        nf(r.y),
        nf(r.w),
        nf(r.h),
        nf(rx)
    )
}

fn region_label(r: &FRegion, style: FlowStyle, ns: Option<&NodeStyle>) -> String {
    if !r.visible || r.label.is_empty() {
        return String::new();
    }
    let cstyle = ns
        .and_then(|n| n.color.as_ref())
        .map(|c| format!(" style=\"fill:{c}\""))
        .unwrap_or_default();
    if matches!(style, FlowStyle::Mermaid) {
        format!(
            "<text class=\"region-label\" text-anchor=\"middle\" x=\"{}\" y=\"{}\"{cstyle}>{}</text>\n",
            nf(r.x + r.w / 2.0),
            nf(r.y + 16.0),
            esc(&r.label)
        )
    } else {
        format!(
            "<text class=\"region-label\" text-anchor=\"start\" x=\"{}\" y=\"{}\"{cstyle}>{}</text>\n",
            nf(r.x + 12.0),
            nf(r.y + 16.0),
            esc(&r.label)
        )
    }
}

/// Render dagre waypoints as a uniform cubic B-spline (d3 `curveBasis`), in float.
fn smooth_path_f(pts: &[(f64, f64)]) -> String {
    let n = pts.len();
    if n == 2 {
        return format!(
            "M{},{} L{},{}",
            nf(pts[0].0),
            nf(pts[0].1),
            nf(pts[1].0),
            nf(pts[1].1)
        );
    }
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
    for (i, &(x, y)) in pts.iter().enumerate() {
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
