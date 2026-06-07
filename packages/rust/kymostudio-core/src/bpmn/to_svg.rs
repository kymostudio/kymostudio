//! SVG renderer for BPMN diagrams — port of the BPMN-relevant paths in `to_svg.py`.
//!
//! [`render`] turns a resolved [`Diagram`] (imported `.bpmn` or laid-out `bpmn { }`
//! block) into one self-contained SVG string, byte-identical to Python's
//! `to_svg.render(d)` for BPMN inputs: same `STYLE`/`DEFS`, same region/edge/glyph
//! fragments, same `_tidy` whitespace normalization. Non-BPMN component shapes
//! (architecture icons) are out of scope here — BPMN diagrams only carry `bpmn-*`
//! glyphs, pool/lane/sub-process regions, and waypoint edges.

use super::model::{Diagram, Edge, Region};
use super::shapes;

/// Escape `& < >` for XML text content (mirrors `_x`).
fn x(text: &str) -> String {
    shapes::esc(text)
}

// ── Static SVG fragments (verbatim from to_svg.py) ──────────────────────────────
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

// Animation preset appended to STYLE when `RenderOpts.animate` — mirrors Python
// `to_svg.ANIM_STYLE` (= `ANIM_PRESETS["flow"]`). Targets `.edge-path`; BPMN flows use
// `.bpmn-flow`, so this matches Python byte-for-byte without changing BPMN visuals.
const ANIM_STYLE: &str = r##"
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

/// Render options mirroring Python `to_svg.render(d, animate)` + the JS
/// `renderSVG(d, {background})` surface. Defaults (animate off, `#fafafa` background)
/// keep the committed SVG goldens byte-identical.
#[derive(Debug, Clone, Default)]
pub struct RenderOpts {
    /// Append the `flow` animation preset to the stylesheet.
    pub animate: bool,
    /// Background-rect fill; `None` → `#fafafa` (the Python default).
    pub background: Option<String>,
}

// ── Whitespace tidy (mirrors `_tidy`) ───────────────────────────────────────────
fn tidy(svg: &str) -> String {
    // Pass A: replace each `>...<` text run — blank → "", else " " + trimmed + " ".
    let bytes = svg.as_bytes();
    let mut out = String::with_capacity(svg.len());
    let mut last = 0usize;
    let mut i = 0usize;
    while i < bytes.len() {
        if bytes[i] == b'>' {
            if let Some(rel) = svg[i + 1..].find('<') {
                let lt = i + 1 + rel;
                out.push_str(&svg[last..=i]); // up through '>'
                let text = svg[i + 1..lt].trim();
                if !text.is_empty() {
                    out.push(' ');
                    out.push_str(text);
                    out.push(' ');
                }
                last = lt; // back up to '<'
                i = lt + 1;
                continue;
            } else {
                break;
            }
        }
        i += 1;
    }
    out.push_str(&svg[last..]);

    // Pass B: collapse runs of space/tab to a single space.
    let mut s1 = String::with_capacity(out.len());
    let mut prev_ws = false;
    for ch in out.chars() {
        if ch == ' ' || ch == '\t' {
            if !prev_ws {
                s1.push(' ');
                prev_ws = true;
            }
        } else {
            prev_ws = false;
            s1.push(ch);
        }
    }

    // Pass C: drop space/tab immediately following a newline (`\n[ \t]+` → `\n`).
    let mut s2 = String::with_capacity(s1.len());
    let mut at_line_start = false;
    for ch in s1.chars() {
        if at_line_start && (ch == ' ' || ch == '\t') {
            continue;
        }
        s2.push(ch);
        at_line_start = ch == '\n';
    }
    s2
}

// ── Edge rendering ──────────────────────────────────────────────────────────────
fn polyline_path(pts: &[(i64, i64)]) -> String {
    let segs: Vec<String> = pts.iter().map(|(x, y)| format!("{x},{y}")).collect();
    format!("M {}", segs.join(" L "))
}

fn unit(a: (i64, i64), b: (i64, i64)) -> (f64, f64) {
    let dx = (b.0 - a.0) as f64;
    let dy = (b.1 - a.1) as f64;
    let mut n = (dx * dx + dy * dy).sqrt();
    if n == 0.0 {
        n = 1.0;
    }
    (dx / n, dy / n)
}

/// Render a flow drawn through its explicit `points` (DI waypoints). Mirrors
/// `render_bpmn_edge`.
fn render_bpmn_edge(e: &Edge) -> String {
    let pts = e.points.as_deref().unwrap_or(&[]);
    if pts.len() < 2 {
        return String::new();
    }
    let path = polyline_path(pts);
    let flow = e.bpmn_flow.as_deref().unwrap_or("sequence");

    let (cls, markers) = match flow {
        "message" => (
            "bpmn-flow bpmn-flow--message",
            " marker-start=\"url(#bpmn-msg-start)\" marker-end=\"url(#bpmn-msg-end)\"",
        ),
        "association" => ("bpmn-flow bpmn-flow--assoc", ""),
        _ => ("bpmn-flow", " marker-end=\"url(#bpmn-seq-end)\""),
    };

    // Source decoration: default-flow slash tick, conditional-flow diamond.
    let (p0, p1) = (pts[0], pts[1]);
    let (ux, uy) = unit(p0, p1);
    let (px, py) = (-uy, ux);
    let (p0x, p0y) = (p0.0 as f64, p0.1 as f64);
    let deco = if flow == "default" {
        let (mx, my) = (p0x + ux * 14.0, p0y + uy * 14.0);
        format!(
            "<line class=\"bpmn-flow\" x1=\"{:.1}\" y1=\"{:.1}\" x2=\"{:.1}\" y2=\"{:.1}\"/>",
            mx - ux * 5.0 - px * 5.0,
            my - uy * 5.0 - py * 5.0,
            mx + ux * 5.0 + px * 5.0,
            my + uy * 5.0 + py * 5.0
        )
    } else if flow == "conditional" {
        let (cxp, cyp) = (p0x + ux * 11.0, p0y + uy * 11.0);
        let dpts = format!(
            "{:.1},{:.1} {:.1},{:.1} {:.1},{:.1} {:.1},{:.1}",
            cxp + ux * 8.0,
            cyp + uy * 8.0,
            cxp + px * 5.0,
            cyp + py * 5.0,
            cxp - ux * 8.0,
            cyp - uy * 8.0,
            cxp - px * 5.0,
            cyp - py * 5.0
        );
        format!(
            "<polygon points=\"{dpts}\" fill=\"#ffffff\" stroke=\"#374151\" stroke-width=\"1.4\"/>"
        )
    } else {
        String::new()
    };

    let label = match (&e.label, e.label_pos) {
        (l, Some((lx, ly))) if !l.is_empty() => format!(
            "<text class=\"bpmn-flow-label\" x=\"{lx}\" y=\"{ly}\">{}</text>",
            x(l)
        ),
        _ => String::new(),
    };

    format!("<path class=\"{cls}\" d=\"{path}\"{markers}/>\n{deco}{label}")
}

fn render_edge(e: &Edge) -> String {
    // BPMN diagrams always carry explicit waypoints; non-BPMN routing is not ported.
    if e.points.is_some() {
        render_bpmn_edge(e)
    } else {
        String::new()
    }
}

// ── Region rendering ────────────────────────────────────────────────────────────
fn render_region_rect(r: &Region) -> String {
    if !r.visible {
        return String::new();
    }
    let (xb, yb, w, h) = r.bounds;
    let rstyle = r.style.as_str();

    if rstyle == "pool" || rstyle == "lane" {
        let band = 30;
        let rect_cls = if rstyle == "pool" {
            "region-rect region-rect--pool"
        } else {
            "region-rect region-rect--lane"
        };
        let band_cls = if rstyle == "pool" {
            "bpmn-pool-band"
        } else {
            "bpmn-lane-band"
        };
        let sep = if !r.label.is_empty() {
            format!(
                "<line class=\"{band_cls}\" x1=\"{}\" y1=\"{yb}\" x2=\"{}\" y2=\"{}\"/>",
                xb + band,
                xb + band,
                yb + h
            )
        } else {
            String::new()
        };
        return format!(
            "<rect class=\"{rect_cls}\" x=\"{xb}\" y=\"{yb}\" width=\"{w}\" height=\"{h}\"/>{sep}"
        );
    }

    let mut rect_cls = String::from("region-rect");
    if rstyle == "inner" {
        rect_cls.push_str(" region-rect--inner");
    } else if rstyle == "cluster" {
        rect_cls.push_str(" region-rect--cluster");
    }

    // BPMN imports carry no region icon and no per-region border overrides.
    let icon_g = match &r.icon {
        Some(_key) => String::new(), // icons are not part of the BPMN renderer scope
        None => String::new(),
    };
    let mut inline_parts: Vec<String> = Vec::new();
    if let Some((dx, dy)) = r.border_dash {
        inline_parts.push(if (dx, dy) == (0, 0) {
            "stroke-dasharray:none".to_string()
        } else {
            format!("stroke-dasharray:{dx} {dy}")
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
        "<rect class=\"{rect_cls}\"{style_attr} x=\"{xb}\" y=\"{yb}\" width=\"{w}\" height=\"{h}\" rx=\"14\"/>{icon_g}"
    )
}

fn render_region_label(r: &Region) -> String {
    if !r.visible || r.label.is_empty() {
        return String::new();
    }
    let (xb, yb, w, h) = r.bounds;
    let rstyle = r.style.as_str();

    if rstyle == "pool" || rstyle == "lane" {
        let (tx, ty) = (xb + 15, yb + h / 2);
        return format!(
            "<text class=\"bpmn-pool-label\" x=\"{tx}\" y=\"{ty}\" text-anchor=\"middle\" transform=\"rotate(-90 {tx} {ty})\">{}</text>",
            x(&r.label)
        );
    }

    let mut label_cls = String::from("region-label");
    if rstyle == "inner" {
        label_cls.push_str(" region-label--inner");
    } else if rstyle == "cluster" {
        label_cls.push_str(" region-label--cluster");
    }

    let (label_x, label_y, anchor): (i64, i64, &str);
    if r.icon.is_some() {
        label_x = xb + 42;
        label_y = yb + 6;
        anchor = "start";
    } else {
        let a = r.label_anchor.as_str();
        let pos = r.label_position.clone().unwrap_or_else(|| {
            if rstyle == "inner" {
                "inside".to_string()
            } else if rstyle == "cluster" {
                "inside-tl".to_string()
            } else {
                "above".to_string()
            }
        });
        if pos == "inside-tl" {
            label_x = xb + 12;
            label_y = yb + 16;
            anchor = "start";
        } else {
            label_y = if pos == "inside" { yb + 18 } else { yb - 10 };
            anchor = a;
            label_x = match a {
                "start" => xb + 18,
                "end" => xb + w - 18,
                _ => xb + w / 2,
            };
        }
    }

    format!(
        "<text class=\"{label_cls}\" text-anchor=\"{anchor}\" x=\"{label_x}\" y=\"{label_y}\">{}</text>",
        x(&r.label)
    )
}

// ── Top-level render ─────────────────────────────────────────────────────────────
fn title_block(d: &Diagram) -> (String, i64) {
    if d.title.is_empty() && d.subtitle.is_empty() {
        return (String::new(), 0);
    }
    const TOP_MARGIN: i64 = 24;
    const TITLE_CAP: i64 = 18;
    const SUB_CAP: i64 = 11;
    const GAP_T_S: i64 = 8;
    const GAP_BLOCK: i64 = 28;

    let cx = d.width / 2;
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
    (parts.join("\n  "), y + GAP_BLOCK)
}

/// Render a diagram to SVG with default options (animate off, `#fafafa` background).
/// Convenience over [`render_opts`]; keeps the committed SVG goldens byte-identical.
pub fn render(d: &Diagram) -> String {
    render_opts(d, &RenderOpts::default())
}

/// Render a diagram to a single self-contained SVG string. BPMN-only (the
/// architecture-icon component path is intentionally not ported here).
pub fn render_opts(d: &Diagram, opts: &RenderOpts) -> String {
    let region_rects = join_nl2(d.regions.iter().map(render_region_rect));
    let region_labels = join_nl2(d.regions.iter().map(render_region_label));
    let edges = join_nl2(d.edges.iter().map(render_edge));
    let comps = join_nl2(d.components.iter().map(|c| {
        if c.shape.starts_with("bpmn-") {
            shapes::render_component(c)
        } else {
            String::new()
        }
    }));

    // BPMN styles/markers are injected whenever the diagram uses BPMN features.
    let has_bpmn = d.components.iter().any(|c| c.shape.starts_with("bpmn-"))
        || d.edges.iter().any(|e| e.points.is_some())
        || d.regions
            .iter()
            .any(|r| r.style == "pool" || r.style == "lane");
    let bpmn_style = if has_bpmn { shapes::BPMN_STYLE } else { "" };
    let bpmn_defs = if has_bpmn { shapes::BPMN_DEFS } else { "" };

    let anim = if opts.animate { ANIM_STYLE } else { "" };
    let style = format!("{STYLE}{bpmn_style}{anim}");
    let background = opts.background.as_deref().unwrap_or("#fafafa");

    let (title_block_str, title_block_h) = title_block(d);
    let total_height = d.height + title_block_h;
    let content_open = if title_block_h != 0 {
        format!("<g transform=\"translate(0, {title_block_h})\">")
    } else {
        String::new()
    };
    let content_close = if title_block_h != 0 { "</g>" } else { "" };

    let svg = format!(
        r##"<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {total_height}"
     width="{width}" height="{total_height}"
     style="max-width: 100%; height: auto"
     font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
  <style>{style}</style>
  <defs>{DEFS}{bpmn_defs}</defs>

  <rect width="{width}" height="{total_height}" fill="{background}"/>
  <rect width="{width}" height="{total_height}" class="bg-grid"/>

  <!-- title block (top, fixed) -->
  {title_block_str}

  <!-- content (auto-translated down by title_block_h) -->
  {content_open}
  <!-- region rects -->
  {region_rects}

  <!-- edges -->
  {edges}

  <!-- components -->
  {comps}

  <!-- region labels (drawn last so they sit on top of crossing arrows) -->
  {region_labels}
  {content_close}
</svg>
"##,
        width = d.width,
    );
    tidy(&svg)
}

fn join_nl2(items: impl Iterator<Item = String>) -> String {
    items.collect::<Vec<_>>().join("\n  ")
}
