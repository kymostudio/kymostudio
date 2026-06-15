//! SVG renderer — Rust port of `packages/python/src/kymo/to_svg.py`.
//!
//! Takes a positioned [`Diagram`] and emits one self-contained SVG string.
//! Edges route orthogonally through `via` waypoints with rounded corners.
//! Output is whitespace-tidied ([`tidy`]) to match the Python renderer
//! byte-for-byte for diagrams that use only built-in icons.

use regex::Regex;

use crate::model::{
    resolve_anchors, Anchor, Component, Diagram, Edge, EdgeLabelAnchor, EdgeStyle, LabelPosition,
    Node, Point, Region, RegionStyle, Route, Shape,
};

use super::icons::get_icon;

#[inline]
fn fdiv(a: i32, b: i32) -> i32 {
    a.div_euclid(b)
}

/// Escape `& < >` for XML text content (not quotes). Mirrors Python
/// `html.escape(text, quote=False)`.
fn x(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Collapse whitespace runs (preserving trimmed text content). Port of `_tidy`.
fn tidy(svg: &str) -> String {
    let re_tag = Regex::new(r">([^<]*)<").unwrap();
    let mut out = String::with_capacity(svg.len());
    let mut last = 0usize;
    for caps in re_tag.captures_iter(svg) {
        let m0 = caps.get(0).unwrap();
        let g1 = caps.get(1).unwrap();
        out.push_str(&svg[last..m0.start() + 1]); // up through the closing `>`
        let t = g1.as_str().trim();
        if !t.is_empty() {
            out.push(' ');
            out.push_str(t);
            out.push(' ');
        }
        last = m0.end() - 1; // back up to the next `<`
    }
    out.push_str(&svg[last..]);
    let ws = Regex::new(r"[ \t]+").unwrap();
    let s = ws.replace_all(&out, " ");
    let nlws = Regex::new(r"\n[ \t]+").unwrap();
    nlws.replace_all(&s, "\n").into_owned()
}

// ── Static SVG fragments (verbatim from to_svg.py for byte parity) ──────────
const STYLE: &str = r##"
text { fill: #1f2937; }
.bg-grid { fill: url(#dot-grid); }
.region-rect {
  fill: rgba(15, 23, 42, 0.02);
  stroke: #232f3e;           /* AWS navy — admin boundary */
  stroke-width: 1.5;
  stroke-dasharray: 6 5;
}
.region-rect--inner {
  fill: rgba(124, 58, 237, 0.03);
  stroke: #7c3aed;           /* purple — logical subgroup */
  stroke-width: 1.4;
  stroke-dasharray: 4 4;
}
.region-rect--cluster {
  fill: #eaf3ff;             /* light-blue solid (mingrammer cluster look) */
  stroke: #b8d0ee;
  stroke-width: 1.2;
  stroke-dasharray: none;
}
.region-label {
  font-size: 13px; font-weight: 700; fill: #232f3e; letter-spacing: 0.06em;
  text-transform: uppercase;
  paint-order: stroke; stroke: #fafafa; stroke-width: 4; stroke-linejoin: round;
}
.region-label--inner   { fill: #6d28d9; }
.region-label--cluster {
  fill: #475569; font-size: 11px; letter-spacing: 0.02em;
  text-transform: none; font-weight: 500;
  paint-order: stroke; stroke: #eaf3ff; stroke-width: 3;
}
.component-name { font-size: 14px; font-weight: 700; text-anchor: middle; fill: #0f172a; }
.component-sub  { font-size: 11.5px; font-weight: 400; text-anchor: middle; fill: #64748b; }
.diagram-title    { font-size: 20px; font-weight: 800; text-anchor: middle; fill: #0f172a; letter-spacing: 0.01em; }
.diagram-subtitle { font-size: 13px; font-weight: 400; text-anchor: middle; fill: #64748b; }
.icon-shadow { filter: url(#shadow); }
.edge-path {
  fill: none;
  stroke: #64748b;
  stroke-width: 1.8;
  stroke-linejoin: round;
  stroke-linecap: round;
  /* `filter: drop-shadow(...)` removed — rsvg-convert mis-renders the
     first path under a drop-shadow filter (drops it entirely). The
     shadow was barely visible anyway. */
}
.edge-path--orange { stroke: #ea580c; }
.edge-shadow {
  fill: none;
  stroke: rgba(15, 23, 42, 0.06);
  stroke-width: 4.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.edge-label {
  font-size: 11.5px; font-weight: 500; fill: #334155; text-anchor: middle;
  paint-order: stroke; stroke: #fafafa; stroke-width: 4; stroke-linejoin: round;
}
.edge-label--ext   { fill: #c2410c; font-weight: 600; }
.edge-label--small { font-size: 10.5px; }
"##;

const FLOWCHART_CSS: &str = r##"
.fc-shape { fill: #eff6ff; stroke: #3b82f6; stroke-width: 1.6; }
.fc-shape-line { fill: none; stroke: #3b82f6; stroke-width: 1.6; stroke-linecap: round; }
.fc-label { font-size: 13px; font-weight: 600; fill: #1e3a8a; text-anchor: middle; dominant-baseline: central; }
"##;

/// The default ("flow") animation preset — appended when `animate=true`. Mirrors
/// `ANIM_STYLE` / `ANIM_PRESETS["flow"]`.
const ANIM_FLOW: &str = r##"
@keyframes edge-flow {
  from { stroke-dashoffset: 16; }
  to   { stroke-dashoffset:  0; }
}
.edge-path {
  stroke-dasharray: 8 4;
  animation: edge-flow 1.2s linear infinite;
}
.edge-path--orange { animation-duration: 0.8s; }

@keyframes component-breath {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.92; }   /* 8 % dip */
}
.icon-shadow {
  animation: component-breath 2.4s ease-in-out infinite;
}

/* `accent="red"` components (HITL etc.) — pulse hue toward red so the
   "needs human" semantic surfaces only in animated mode. */
@keyframes alert-flash {
  0%, 70%, 100% { filter: hue-rotate(0deg); }
  35%           { filter: hue-rotate(-130deg); }
}
.alert-pulse { animation: alert-flash 2.4s ease-in-out infinite; }
"##;

const DEFS: &str = r##"
<!-- Open-V arrowheads: stroke-only, thinner, more elegant than filled triangles.
     markerUnits=userSpaceOnUse keeps the stroke at the declared width
     regardless of the path's own stroke-width. -->
<marker id="arrow-gray" viewBox="0 0 12 10" refX="11" refY="5"
        markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M2,1 L11,5 L2,9" fill="none"
        stroke="#64748b" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="arrow-orange" viewBox="0 0 12 10" refX="11" refY="5"
        markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M2,1 L11,5 L2,9" fill="none"
        stroke="#ea580c" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</marker>

<!-- Soft drop shadow for icons -->
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.18"/>
</filter>

<!-- Engineering-paper dot grid (very subtle) -->
<pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="0.8" fill="#0f172a" fill-opacity="0.045"/>
</pattern>

<!-- Gradient highlight for cube faces (subtle, top→bottom darken) -->
<linearGradient id="g-face-front" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#82c70a"/>
  <stop offset="100%" stop-color="#6ba600"/>
</linearGradient>
<linearGradient id="g-face-top" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#b7e756"/>
  <stop offset="100%" stop-color="#a0d440"/>
</linearGradient>
<linearGradient id="g-face-side" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#588a00"/>
  <stop offset="100%" stop-color="#446a00"/>
</linearGradient>
<linearGradient id="g-box-orange" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#fbbf24"/>
  <stop offset="100%" stop-color="#f59e0b"/>
</linearGradient>
<linearGradient id="g-cyl-orange" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#fb923c"/>
  <stop offset="100%" stop-color="#ea7c1e"/>
</linearGradient>
<linearGradient id="g-user-blue" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stop-color="#3b82f6"/>
  <stop offset="100%" stop-color="#1d4ed8"/>
</linearGradient>
"##;

// ── Edge routing ────────────────────────────────────────────────────────────
fn points_to_rounded_path(pts: &[Point]) -> String {
    const R: i32 = 10;
    if pts.len() < 2 {
        return String::new();
    }
    if pts.len() == 2 {
        return format!("M {},{} L {},{}", pts[0].0, pts[0].1, pts[1].0, pts[1].1);
    }
    let mut out = vec![format!("M {},{}", pts[0].0, pts[0].1)];
    for i in 1..pts.len() - 1 {
        let prev = pts[i - 1];
        let curr = pts[i];
        let nxt = pts[i + 1];
        let (dx_in, dy_in) = (curr.0 - prev.0, curr.1 - prev.1);
        let (dx_out, dy_out) = (nxt.0 - curr.0, nxt.1 - curr.1);
        let rr = R
            .min(dx_in.abs() / 2)
            .min(dy_in.abs() / 2)
            .min(dx_out.abs() / 2)
            .min(dy_out.abs() / 2);
        if rr <= 0 {
            out.push(format!("L {},{}", curr.0, curr.1));
            continue;
        }
        let sgn = |v: i32| {
            if v > 0 {
                1
            } else if v < 0 {
                -1
            } else {
                0
            }
        };
        let (ux_in, uy_in) = (sgn(dx_in), sgn(dy_in));
        let (ux_out, uy_out) = (sgn(dx_out), sgn(dy_out));
        let ax = curr.0 - ux_in * rr;
        let ay = curr.1 - uy_in * rr;
        let bx = curr.0 + ux_out * rr;
        let by = curr.1 + uy_out * rr;
        out.push(format!("L {},{}", ax, ay));
        out.push(format!("Q {},{} {},{}", curr.0, curr.1, bx, by));
    }
    let last = pts[pts.len() - 1];
    out.push(format!("L {},{}", last.0, last.1));
    out.join(" ")
}

fn anchor_pos(node: Node, anchor: Anchor, offset: Point) -> Point {
    let sp = node.anchor(anchor);
    (sp.0 + offset.0, sp.1 + offset.1)
}

fn region_label_clearance(r: &Region, side: Anchor) -> i32 {
    if side != Anchor::Top {
        return 0;
    }
    let pos = r
        .label_position
        .unwrap_or(if r.style == RegionStyle::Inner {
            LabelPosition::Inside
        } else {
            LabelPosition::Above
        });
    if pos == LabelPosition::Above {
        10
    } else {
        35
    }
}

fn node_for<'a>(d: &'a Diagram, id: &str) -> Node<'a> {
    if let Some(c) = d.components.iter().find(|c| c.id == id) {
        return Node::Component(c);
    }
    Node::Region(
        d.regions
            .iter()
            .find(|r| r.id == id)
            .expect("edge endpoint not found"),
    )
}

fn route_edge(e: &Edge, d: &Diagram) -> Vec<Point> {
    let src = node_for(d, &e.src);
    let dst = node_for(d, &e.dst);
    let (sa, da) = resolve_anchors(e, src, dst);
    let sp = anchor_pos(src, sa, e.src_offset);
    let mut dp = anchor_pos(dst, da, e.dst_offset);

    if let Node::Region(r) = dst {
        if da == Anchor::Top && e.dst_offset.1 == 0 {
            dp = (dp.0, dp.1 + region_label_clearance(r, Anchor::Top));
        }
    }

    if !e.via.is_empty() {
        let mut v = vec![sp];
        v.extend(e.via.iter().copied());
        v.push(dp);
        return v;
    }
    if e.route == Route::Straight {
        return vec![sp, dp];
    }
    if sp.0 == dp.0 || sp.1 == dp.1 {
        return vec![sp, dp];
    }
    let lane = e.trunk_offset;
    if matches!(sa, Anchor::Left | Anchor::Right) {
        let mid_x = fdiv(sp.0 + dp.0, 2) + lane;
        vec![sp, (mid_x, sp.1), (mid_x, dp.1), dp]
    } else {
        let mid_y = fdiv(sp.1 + dp.1, 2) + lane;
        vec![sp, (sp.0, mid_y), (dp.0, mid_y), dp]
    }
}

fn smooth_curve(sp: Point, dp: Point, src_anchor: Anchor, dst_anchor: Anchor) -> String {
    let dist = 40.max(((dp.0 - sp.0).abs() + (dp.1 - sp.1).abs()) / 3);
    let cp = |point: Point, anchor: Anchor| -> Point {
        match anchor {
            Anchor::Top => (point.0, point.1 - dist),
            Anchor::Bottom => (point.0, point.1 + dist),
            Anchor::Left => (point.0 - dist, point.1),
            Anchor::Right => (point.0 + dist, point.1),
            Anchor::Center => point,
        }
    };
    let c1 = cp(sp, src_anchor);
    let c2 = cp(dp, dst_anchor);
    format!(
        "M {},{} C {},{} {},{} {},{}",
        sp.0, sp.1, c1.0, c1.1, c2.0, c2.1, dp.0, dp.1
    )
}

fn edge_label_pos(e: &Edge, pts: &[Point]) -> Point {
    if let Some(lp) = e.label_pos {
        return lp;
    }
    let (bx, by) = match e.label_anchor {
        EdgeLabelAnchor::Src => pts[0],
        EdgeLabelAnchor::Dst => *pts.last().unwrap(),
        EdgeLabelAnchor::Mid => {
            if matches!(e.route, Route::Over | Route::Under) && pts.len() >= 4 {
                let (v1, v2) = (pts[1], pts[2]);
                (fdiv(v1.0 + v2.0, 2), fdiv(v1.1 + v2.1, 2))
            } else {
                let sx: i32 = pts.iter().map(|p| p.0).sum();
                let sy: i32 = pts.iter().map(|p| p.1).sum();
                (fdiv(sx, pts.len() as i32), fdiv(sy, pts.len() as i32))
            }
        }
    };
    (bx + e.label_offset.0, by + e.label_offset.1)
}

// ── Element rendering ───────────────────────────────────────────────────────
fn render_region_rect(r: &Region) -> String {
    if !r.visible {
        return String::new();
    }
    let (x, y, w, h) = r.bounds;
    let mut rect_cls = String::from("region-rect");
    match r.style {
        RegionStyle::Inner => rect_cls.push_str(" region-rect--inner"),
        RegionStyle::Cluster => rect_cls.push_str(" region-rect--cluster"),
        _ => {}
    }
    let icon_g = match &r.icon {
        Some(icon) => format!(
            "<g transform=\"translate({}, {})\">{}</g>\n",
            x + 18,
            y,
            get_icon(icon).unwrap_or_default()
        ),
        None => String::new(),
    };
    let mut inline_parts: Vec<String> = Vec::new();
    if let Some(dash) = r.border_dash {
        inline_parts.push(if dash == (0, 0) {
            "stroke-dasharray:none".to_string()
        } else {
            format!("stroke-dasharray:{} {}", dash.0, dash.1)
        });
    }
    if let Some(stroke) = &r.border_stroke {
        inline_parts.push(format!("stroke:{stroke}"));
    }
    let style_attr = if inline_parts.is_empty() {
        String::new()
    } else {
        format!(" style=\"{}\"", inline_parts.join(";"))
    };
    format!(
        "<rect class=\"{rect_cls}\"{style_attr} x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"14\"/>{icon_g}"
    )
}

fn render_region_label(r: &Region) -> String {
    if !r.visible || r.label.is_empty() {
        return String::new();
    }
    let (x, y, w, _h) = r.bounds;
    let mut label_cls = String::from("region-label");
    match r.style {
        RegionStyle::Inner => label_cls.push_str(" region-label--inner"),
        RegionStyle::Cluster => label_cls.push_str(" region-label--cluster"),
        _ => {}
    }

    let (label_x, label_y, anchor): (i32, i32, &str);
    if r.icon.is_some() {
        label_x = x + 42;
        label_y = y + 6;
        anchor = "start";
    } else {
        let a = r.label_anchor.as_str(); // start|middle|end
                                         // Resolve label position (local "inside-tl" for cluster).
        let pos: &str = match r.label_position {
            Some(LabelPosition::Above) => "above",
            Some(LabelPosition::Inside) => "inside",
            None => match r.style {
                RegionStyle::Inner => "inside",
                RegionStyle::Cluster => "inside-tl",
                _ => "above",
            },
        };
        if pos == "inside-tl" {
            label_x = x + 12;
            label_y = y + 16;
            anchor = "start";
        } else {
            label_y = if pos == "inside" { y + 18 } else { y - 10 };
            anchor = a;
            label_x = match a {
                "start" => x + 18,
                "end" => x + w - 18,
                _ => x + fdiv(w, 2),
            };
        }
    }
    format!(
        "<text class=\"{label_cls}\" text-anchor=\"{anchor}\" x=\"{label_x}\" y=\"{label_y}\">{}</text>",
        x_label(&r.label)
    )
}

fn x_label(s: &str) -> String {
    x(s)
}

fn render_edge(e: &Edge, d: &Diagram) -> String {
    let src = node_for(d, &e.src);
    let dst = node_for(d, &e.dst);
    let (sa, da) = resolve_anchors(e, src, dst);
    let sp = anchor_pos(src, sa, e.src_offset);
    let mut dp = anchor_pos(dst, da, e.dst_offset);
    if let Node::Region(r) = dst {
        if da == Anchor::Top && e.dst_offset.1 == 0 {
            dp = (dp.0, dp.1 + region_label_clearance(r, Anchor::Top));
        }
    }

    let (path, pts) = if e.route == Route::Curve {
        (smooth_curve(sp, dp, sa, da), vec![sp, dp])
    } else {
        let pts = route_edge(e, d);
        (points_to_rounded_path(&pts), pts)
    };

    let cls = if e.style == EdgeStyle::Orange {
        "edge-path edge-path--orange"
    } else {
        "edge-path"
    };
    let marker = if e.style == EdgeStyle::Orange {
        "url(#arrow-orange)"
    } else {
        "url(#arrow-gray)"
    };
    let dash_attr = if e.dashed {
        " style=\"stroke-dasharray:6 4\""
    } else {
        ""
    };
    let marker_attr = if e.no_arrow {
        String::new()
    } else {
        format!(" marker-end=\"{marker}\"")
    };

    let (lx, ly) = edge_label_pos(e, &pts);
    let mut lcls = String::from("edge-label");
    if e.style == EdgeStyle::Orange {
        lcls.push_str(" edge-label--ext");
    }
    if e.label_small {
        lcls.push_str(" edge-label--small");
    }
    let label_svg = if e.label.is_empty() {
        String::new()
    } else {
        format!(
            "<text class=\"{lcls}\" x=\"{lx}\" y=\"{ly}\">{}</text>",
            x(&e.label)
        )
    };
    format!("<path class=\"{cls}\"{dash_attr} d=\"{path}\"{marker_attr}/>\n{label_svg}")
}

fn render_flowchart_node(c: &Component) -> String {
    let (cx, cy) = c.pos;
    let (hw, hh) = c.half();
    let glyph = match c.shape {
        Shape::Circle => {
            format!("<ellipse class=\"fc-shape\" cx=\"{cx}\" cy=\"{cy}\" rx=\"{hw}\" ry=\"{hh}\"/>")
        }
        Shape::Diamond => {
            let pts = format!(
                "{},{} {},{} {},{} {},{}",
                cx,
                cy - hh,
                cx + hw,
                cy,
                cx,
                cy + hh,
                cx - hw,
                cy
            );
            format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
        }
        Shape::Hex => {
            let s = hh.min(hw / 2);
            let pts = format!(
                "{},{} {},{} {},{} {},{} {},{} {},{}",
                cx - hw,
                cy,
                cx - hw + s,
                cy - hh,
                cx + hw - s,
                cy - hh,
                cx + hw,
                cy,
                cx + hw - s,
                cy + hh,
                cx - hw + s,
                cy + hh
            );
            format!("<polygon class=\"fc-shape\" points=\"{pts}\"/>")
        }
        Shape::Cylinder => {
            let ry = 4.max((hh as f64 * 0.22).round() as i32);
            let (top, bot) = (cy - hh + ry, cy + hh - ry);
            let body = format!(
                "<path class=\"fc-shape\" d=\"M{},{} V{} A{},{} 0 0 0 {},{} V{} A{},{} 0 0 1 {},{} Z\"/>",
                cx - hw, top, bot, hw, ry, cx + hw, bot, top, hw, ry, cx - hw, top
            );
            let cap = format!(
                "<path class=\"fc-shape-line\" d=\"M{},{} A{},{} 0 0 0 {},{}\"/>",
                cx - hw,
                top,
                hw,
                ry,
                cx + hw,
                top
            );
            format!("{body}{cap}")
        }
        Shape::Badge => format!(
            "<rect class=\"fc-shape\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"{}\"/>",
            cx - hw,
            cy - hh,
            2 * hw,
            2 * hh,
            hh
        ),
        _ => format!(
            "<rect class=\"fc-shape\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"6\"/>",
            cx - hw,
            cy - hh,
            2 * hw,
            2 * hh
        ),
    };
    let label = if c.name.is_empty() {
        String::new()
    } else {
        format!(
            "<text class=\"fc-label\" x=\"{cx}\" y=\"{cy}\">{}</text>",
            x(&c.name)
        )
    };
    format!("{glyph}{label}")
}

fn render_component(c: &Component) -> String {
    let (cx, cy) = c.pos;
    if c.icon.is_empty() {
        return render_flowchart_node(c);
    }
    let icon_svg = get_icon(&c.icon).unwrap_or_default();

    if c.shape == Shape::Annotation {
        return format!(
            "<g transform=\"translate({cx}, {cy})\">\n  <g transform=\"translate(-3, -22)\">{icon_svg}</g>\n  <text x=\"0\" y=\"2\"  style=\"font-size:13px;font-weight:700;text-anchor:middle;fill:#1f2937\">{}</text>\n  <text x=\"0\" y=\"20\" style=\"font-size:11.5px;text-anchor:middle;fill:#374151\">{}</text>\n</g>",
            x(&c.name),
            x(&c.subtitle)
        );
    }
    if c.shape == Shape::Badge {
        return format!("<g transform=\"translate({cx}, {cy})\">{icon_svg}</g>");
    }

    let (name_y, name_size) = match c.shape {
        Shape::CubeBig => (73, 15),
        Shape::Cube => (60, 14),
        Shape::AwsTileHero => (58, 14),
        Shape::AwsTile => (50, 14),
        _ => (55, 14),
    };
    let sub_y = name_y + 17;
    let group_class = if c.accent == crate::model::Accent::Red {
        " class=\"alert-pulse\""
    } else {
        ""
    };
    format!(
        "<g{group_class} transform=\"translate({cx}, {cy})\">\n  {icon_svg}\n  <text class=\"component-name\" y=\"{name_y}\" style=\"font-size:{name_size}px\">{}</text>\n  <text class=\"component-sub\"  y=\"{sub_y}\">{}</text>\n</g>",
        x(&c.name),
        x(&c.subtitle)
    )
}

// ── Top-level render ─────────────────────────────────────────────────────────
fn title_block(d: &Diagram) -> (String, i32) {
    if d.title.is_empty() && d.subtitle.is_empty() {
        return (String::new(), 0);
    }
    const TOP_MARGIN: i32 = 24;
    const TITLE_CAP: i32 = 18;
    const SUB_CAP: i32 = 11;
    const GAP_T_S: i32 = 8;
    const GAP_BLOCK: i32 = 28;

    let cx = fdiv(d.width, 2);
    let mut parts: Vec<String> = Vec::new();
    let mut y = TOP_MARGIN;
    if !d.title.is_empty() {
        y += TITLE_CAP;
        parts.push(format!(
            "<text class=\"diagram-title\" x=\"{cx}\" y=\"{y}\">{}</text>",
            x(&d.title)
        ));
    }
    if !d.subtitle.is_empty() {
        y += GAP_T_S + SUB_CAP;
        parts.push(format!(
            "<text class=\"diagram-subtitle\" x=\"{cx}\" y=\"{y}\">{}</text>",
            x(&d.subtitle)
        ));
    }
    let block_h = y + GAP_BLOCK;
    (parts.join("\n  "), block_h)
}

/// Render a positioned diagram to a single self-contained SVG string.
/// `animate=true` appends the "flow" CSS keyframe preset.
pub fn render(d: &Diagram, animate: bool) -> String {
    let region_rects = d
        .regions
        .iter()
        .map(render_region_rect)
        .collect::<Vec<_>>()
        .join("\n  ");
    let region_labels = d
        .regions
        .iter()
        .map(render_region_label)
        .collect::<Vec<_>>()
        .join("\n  ");
    let edges = d
        .edges
        .iter()
        .map(|e| render_edge(e, d))
        .collect::<Vec<_>>()
        .join("\n  ");
    let comps = d
        .components
        .iter()
        .map(render_component)
        .collect::<Vec<_>>()
        .join("\n  ");

    let mut style = String::from(STYLE);
    if animate {
        style.push_str(ANIM_FLOW);
    }
    if d.components.iter().any(|c| c.icon.is_empty()) {
        style.push_str(FLOWCHART_CSS);
    }

    let (title_block_str, title_block_h) = title_block(d);
    let total_height = d.height + title_block_h;
    let content_open = if title_block_h != 0 {
        format!("<g transform=\"translate(0, {title_block_h})\">")
    } else {
        String::new()
    };
    let content_close = if title_block_h != 0 { "</g>" } else { "" };

    let w = d.width;
    let svg = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {w} {total_height}\"\n\
     width=\"{w}\" height=\"{total_height}\"\n\
     style=\"max-width: 100%; height: auto\"\n\
     font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif\">\n\
  <style>{style}</style>\n\
  <defs>{DEFS}</defs>\n\
\n\
  <rect width=\"{w}\" height=\"{total_height}\" fill=\"#fafafa\"/>\n\
  <rect width=\"{w}\" height=\"{total_height}\" class=\"bg-grid\"/>\n\
\n\
  <!-- title block (top, fixed) -->\n\
  {title_block_str}\n\
\n\
  <!-- content (auto-translated down by title_block_h) -->\n\
  {content_open}\n\
  <!-- region rects -->\n\
  {region_rects}\n\
\n\
  <!-- edges -->\n\
  {edges}\n\
\n\
  <!-- components -->\n\
  {comps}\n\
\n\
  <!-- region labels (drawn last so they sit on top of crossing arrows) -->\n\
  {region_labels}\n\
  {content_close}\n\
</svg>\n"
    );
    tidy(&svg)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kymo::to_diagram;

    #[test]
    fn renders_minimal_diagram() {
        let d = to_diagram("a circle/user/blue \"A\" \"\" @ (100, 100)").unwrap();
        let svg = render(&d, false);
        assert!(svg.starts_with("<?xml"));
        assert!(svg.contains("<svg xmlns"));
        assert!(svg.contains("g-user-blue")); // user icon gradient present
        assert!(svg.trim_end().ends_with("</svg>"));
    }

    /// Byte-for-byte golden parity vs the Python renderer. The `.svg` fixtures
    /// in `tests/kymo_golden/` are produced by `uv run kymo samples/<name>.kymo`
    /// (the reference renderer) and committed alongside this crate — kept here
    /// rather than reusing `samples/*.svg` because some of those committed
    /// sample renders predate later Python layout tweaks. Regenerate the
    /// fixtures when the renderer intentionally changes (and re-verify both
    /// impls still agree).
    fn assert_golden(name: &str, kymo_src: &str, golden_svg: &str) {
        let svg = render(&to_diagram(kymo_src).unwrap(), false);
        assert_eq!(
            svg, golden_svg,
            "{name}.kymo render diverged from tests/kymo_golden/{name}.svg (Python golden)"
        );
    }

    macro_rules! golden {
        ($test:ident, $name:literal) => {
            #[test]
            fn $test() {
                assert_golden(
                    $name,
                    include_str!(concat!(
                        env!("CARGO_MANIFEST_DIR"),
                        "/../../../samples/",
                        $name,
                        ".kymo"
                    )),
                    include_str!(concat!(
                        env!("CARGO_MANIFEST_DIR"),
                        "/tests/kymo_golden/",
                        $name,
                        ".svg"
                    )),
                );
            }
        };
    }

    golden!(golden_aiq, "aiq");
    golden!(golden_data, "data");
    golden!(golden_aws_1, "aws_1");
}
