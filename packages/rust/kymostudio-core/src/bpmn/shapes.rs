//! BPMN 2.0 glyph renderer — port of `bpmn_shapes.py`.
//!
//! [`render_component`] returns a self-contained SVG fragment for a `bpmn-*`
//! component in absolute canvas coordinates (`pos` = glyph centre, `size` = box).
//! The sub-type marker (event-definition / task-type / gateway-type) rides in
//! `Component.icon`. Output is byte-identical to the Python module — every number
//! goes through [`f`] (2-dp, trailing zeros trimmed) and every f-string is mirrored
//! exactly — so the cross-impl SVG goldens match.

use super::model::Component;

// ── Palette ───────────────────────────────────────────────────────────────────
const INK: &str = "#4b5563";

/// Escape `& < >` for XML text content (mirrors `html.escape(..., quote=False)`).
pub fn esc(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Compact number formatting: 2 decimals, trailing zeros (and a bare dot) trimmed.
/// Mirrors Python `f"{v:.2f}".rstrip("0").rstrip(".")`.
pub fn f(v: f64) -> String {
    let mut s = format!("{v:.2}");
    if s.contains('.') {
        while s.ends_with('0') {
            s.pop();
        }
        if s.ends_with('.') {
            s.pop();
        }
    }
    s
}

fn cos_deg(deg: f64) -> f64 {
    deg.to_radians().cos()
}
fn sin_deg(deg: f64) -> f64 {
    deg.to_radians().sin()
}

// ── DEFS (flow markers) — appended to the document <defs> by to_svg::render ──────
pub const BPMN_DEFS: &str = r##"
<!-- BPMN sequence-flow head: filled solid triangle -->
<marker id="bpmn-seq-end" viewBox="0 0 12 12" refX="10.5" refY="6"
        markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M1,1.5 L11,6 L1,10.5 Z" fill="#374151"/>
</marker>
<!-- BPMN message-flow head: open (hollow) triangle -->
<marker id="bpmn-msg-end" viewBox="0 0 14 14" refX="12" refY="7"
        markerWidth="13" markerHeight="13" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M1.5,2 L12,7 L1.5,12 Z" fill="#ffffff" stroke="#374151" stroke-width="1.2"/>
</marker>
<!-- BPMN message-flow tail: small hollow circle -->
<marker id="bpmn-msg-start" viewBox="0 0 12 12" refX="6" refY="6"
        markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
  <circle cx="6" cy="6" r="3.6" fill="#ffffff" stroke="#374151" stroke-width="1.2"/>
</marker>
<!-- BPMN association head: thin open V -->
<marker id="bpmn-assoc-end" viewBox="0 0 12 10" refX="10" refY="5"
        markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
  <path d="M2,1 L11,5 L2,9" fill="none" stroke="#6b7280" stroke-width="1.3"
        stroke-linecap="round" stroke-linejoin="round"/>
</marker>
"##;

// ── CSS ─────────────────────────────────────────────────────────────────────
pub const BPMN_STYLE: &str = r#"
.bpmn-event       { fill: #ffffff; }
.bpmn-event--start{ stroke: #4b5563; stroke-width: 1.6; }
.bpmn-event--end  { stroke: #4b5563; stroke-width: 3.4; }
.bpmn-event--ring { stroke: #4b5563; stroke-width: 1.5; }
.bpmn-task        { fill: #ffffff; stroke: #4b5563; stroke-width: 1.6; }
.bpmn-gateway     { fill: #ffffff; stroke: #4b5563; stroke-width: 1.6; }
.bpmn-data        { fill: #ffffff; stroke: #6b7280; stroke-width: 1.4; }
.bpmn-marker      { fill: none; stroke: #374151; stroke-width: 1.7;
                    stroke-linecap: round; stroke-linejoin: round; }
.bpmn-marker--fill{ fill: #374151; stroke: none; }
.bpmn-label       { font-size: 12.5px; fill: #1f2937; text-anchor: middle; }
.bpmn-label--out  { font-size: 11.5px; fill: #374151; text-anchor: middle;
                    paint-order: stroke; stroke: #fafafa; stroke-width: 3;
                    stroke-linejoin: round; }
.bpmn-anno-text   { font-size: 12px; fill: #374151; }
.bpmn-flow        { fill: none; stroke: #374151; stroke-width: 1.6;
                    stroke-linejoin: round; stroke-linecap: round; }
.bpmn-flow--message { stroke-dasharray: 7 5; }
.bpmn-flow--assoc { stroke: #6b7280; stroke-width: 1.3; stroke-dasharray: 1.5 4; }
.bpmn-flow-label  { font-size: 11px; fill: #334155; text-anchor: middle;
                    paint-order: stroke; stroke: #fafafa; stroke-width: 3.5;
                    stroke-linejoin: round; }
.region-rect--pool{ fill: rgba(248,250,252,0.5); stroke: #94a3b8;
                    stroke-width: 1.4; stroke-dasharray: none; }
.region-rect--lane{ fill: none; stroke: #cbd5e1; stroke-width: 1.1;
                    stroke-dasharray: none; }
.bpmn-pool-band   { stroke: #94a3b8; stroke-width: 1.4; }
.bpmn-lane-band   { stroke: #cbd5e1; stroke-width: 1.1; }
.bpmn-pool-label  { font-size: 12.5px; font-weight: 600; fill: #475569;
                    letter-spacing: 0.02em; }
"#;

// ── Text wrapping (greedy, char-width estimate) ─────────────────────────────────
fn wrap(text: &str, width_px: f64, font_px: f64, max_lines: usize, factor: f64) -> Vec<String> {
    if text.is_empty() {
        return Vec::new();
    }
    let max_chars = (((width_px - 8.0) / (font_px * factor)) as i64).max(3) as usize;
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut lines: Vec<String> = Vec::new();
    let mut cur = String::new();
    for w in &words {
        let cand = if cur.is_empty() {
            (*w).to_string()
        } else {
            format!("{cur} {w}")
        };
        if cand.chars().count() <= max_chars || cur.is_empty() {
            cur = cand;
        } else {
            lines.push(cur);
            cur = (*w).to_string();
        }
        if lines.len() == max_lines {
            break;
        }
    }
    if !cur.is_empty() && lines.len() < max_lines {
        lines.push(cur.clone());
    }
    if lines.len() == max_lines {
        let joined_len = words.join(" ").chars().count();
        let sum_lens: usize = lines.iter().map(|l| l.chars().count()).sum();
        let last_eq = lines.last().map(|l| l == &cur).unwrap_or(false);
        if !last_eq || joined_len > sum_lens + lines.len() {
            let mut last = lines.last().unwrap().clone();
            if last.chars().count() > max_chars - 1 {
                last = last
                    .chars()
                    .take(max_chars - 1)
                    .collect::<String>()
                    .trim_end()
                    .to_string();
            }
            *lines.last_mut().unwrap() = last + "…";
        }
    }
    lines
}

fn centered_lines(lines: &[String], cx: f64, cy: f64, font_px: f64, cls: &str) -> String {
    if lines.is_empty() {
        return String::new();
    }
    let lh = font_px + 2.5;
    let top = cy - (lines.len() as f64 - 1.0) * lh / 2.0 + font_px * 0.35;
    let mut out = String::new();
    for (i, ln) in lines.iter().enumerate() {
        let y = top + i as f64 * lh;
        out.push_str(&format!(
            "<text class=\"{cls}\" x=\"{}\" y=\"{}\">{}</text>",
            f(cx),
            f(y),
            esc(ln)
        ));
    }
    out
}

/// External (below-glyph) label for events / gateways / data nodes.
fn outside_label(c: &Component, def_cx: f64, def_cy: f64, def_w: f64, max_lines: usize) -> String {
    if c.name.is_empty() {
        return String::new();
    }
    if let Some((lcx, lcy, lw, _lh)) = c.label_box {
        let lines = wrap(&c.name, lw as f64 + 16.0, 11.5, 6, 0.46);
        return centered_lines(&lines, lcx as f64, lcy as f64, 11.5, "bpmn-label--out");
    }
    let lines = wrap(&c.name, def_w, 11.5, max_lines, 0.55);
    centered_lines(&lines, def_cx, def_cy, 11.5, "bpmn-label--out")
}

// ── Event-definition marker glyphs (centred on (0,0)) ───────────────────────────
fn event_marker(kind: &str, s: f64, color: &str) -> String {
    let cls = format!("class=\"bpmn-marker\" stroke=\"{color}\"");
    let fillcls = format!("class=\"bpmn-marker--fill\" fill=\"{color}\"");
    match kind {
        "" | "none" => String::new(),
        "message" => {
            let (w, h) = (s * 1.5, s * 1.05);
            format!(
                "<g {cls}><rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"1\"/><path d=\"M{},{} L0,{} L{},{}\"/></g>",
                f(-w), f(-h), f(2.0 * w), f(2.0 * h),
                f(-w), f(-h), f(h * 0.15), f(w), f(-h)
            )
        }
        "timer" => {
            let r = s * 1.25;
            let mut ticks = String::new();
            let mut a = 0i64;
            while a < 360 {
                let ad = a as f64;
                ticks.push_str(&format!(
                    "<line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/>",
                    f(r * 0.78 * cos_deg(ad)),
                    f(r * 0.78 * sin_deg(ad)),
                    f(r * 0.98 * cos_deg(ad)),
                    f(r * 0.98 * sin_deg(ad))
                ));
                a += 30;
            }
            format!(
                "<g {cls}><circle cx=\"0\" cy=\"0\" r=\"{}\"/>{ticks}<path d=\"M0,{} L0,0 L{},{}\"/></g>",
                f(r), f(-r * 0.55), f(r * 0.45), f(r * 0.2)
            )
        }
        "error" => format!(
            "<g {cls}><path d=\"M{},{} L{},{} L{},{} L{},{}\"/></g>",
            f(-s),
            f(s),
            f(-s * 0.25),
            f(-s * 0.4),
            f(s * 0.3),
            f(s * 0.35),
            f(s),
            f(-s)
        ),
        "escalation" => format!(
            "<g {fillcls}><path d=\"M0,{} L{},{} L0,{} L{},{} Z\"/></g>",
            f(-s),
            f(s * 0.7),
            f(s * 0.6),
            f(s * 0.05),
            f(-s * 0.7),
            f(s * 0.6)
        ),
        "signal" => format!(
            "<g {cls}><path d=\"M0,{} L{},{} L{},{} Z\"/></g>",
            f(-s),
            f(s),
            f(s * 0.7),
            f(-s),
            f(s * 0.7)
        ),
        "terminate" => format!(
            "<g {fillcls}><circle cx=\"0\" cy=\"0\" r=\"{}\"/></g>",
            f(s * 1.15)
        ),
        "conditional" => {
            let (w, h) = (s * 1.1, s * 1.1);
            let mut rows = String::new();
            for y in [-h * 0.55, -h * 0.18, h * 0.18, h * 0.55] {
                rows.push_str(&format!(
                    "<line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/>",
                    f(-w * 0.7),
                    f(y),
                    f(w * 0.7),
                    f(y)
                ));
            }
            format!(
                "<g {cls}><rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"1\"/>{rows}</g>",
                f(-w),
                f(-h),
                f(2.0 * w),
                f(2.0 * h)
            )
        }
        "link" => format!(
            "<g {cls}><path d=\"M{},{} L{},{} L{},{} L{},0 L{},{} L{},{} L{},{} Z\"/></g>",
            f(-s),
            f(-s * 0.45),
            f(s * 0.3),
            f(-s * 0.45),
            f(s * 0.3),
            f(-s),
            f(s),
            f(s * 0.3),
            f(s),
            f(s * 0.3),
            f(s * 0.45),
            f(-s),
            f(s * 0.45)
        ),
        "compensation" => {
            format!(
            "<g {fillcls}><path d=\"M0,{} L{},0 L0,{} Z\"/><path d=\"M{},{} L0,0 L{},{} Z\"/></g>",
            f(-s), f(s), f(-s), f(s), f(-s), f(s), f(s)
        )
        }
        _ => String::new(),
    }
}

// ── Task-type marker glyphs (top-left corner, ~16px) ────────────────────────────
fn task_marker(kind: &str, x: f64, y: f64) -> String {
    if matches!(kind, "" | "none" | "task") {
        return String::new();
    }
    let g = format!(
        "<g class=\"bpmn-marker\" transform=\"translate({}, {})\">",
        f(x + 4.0),
        f(y + 4.0)
    );
    let e = "</g>";
    match kind {
        "user" => format!(
            "{g}<circle cx=\"7\" cy=\"4.5\" r=\"3\"/><path d=\"M1.5,14 C1.5,9.5 12.5,9.5 12.5,14\"/>{e}"
        ),
        "service" => format!(
            "{g}<path d=\"M7,1 L9,2 L11,1.5 L12,3.5 L13.5,5 L13,7 L13.5,9 L12,10.5 L11,12.5 L9,12 L7,13 L5,12 L3,12.5 L2,10.5 L0.5,9 L1,7 L0.5,5 L2,3.5 L3,1.5 L5,2 Z\" /><circle cx=\"7\" cy=\"7\" r=\"2.6\"/>{e}"
        ),
        "script" => format!(
            "{g}<path d=\"M3,1 C1,1 1,4 3,4 L11,4 C13,4 13,1 11,1 Z\"/><line x1=\"3.5\" y1=\"7\" x2=\"10\" y2=\"7\"/><line x1=\"3.5\" y1=\"10\" x2=\"10\" y2=\"10\"/><line x1=\"3.5\" y1=\"13\" x2=\"8\" y2=\"13\"/>{e}"
        ),
        "send" => format!(
            "{}<path d=\"M0,1 L14,1 L14,11 L0,11 Z\"/><path d=\"M0,1 L7,7 L14,1\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"1\"/>{e}",
            g.replace("class=\"bpmn-marker\"", "class=\"bpmn-marker--fill\"")
        ),
        "receive" => format!(
            "{g}<rect x=\"0.5\" y=\"1.5\" width=\"13\" height=\"10\" rx=\"0.5\"/><path d=\"M0.5,1.5 L7,7 L13.5,1.5\"/>{e}"
        ),
        "manual" => format!(
            "{g}<path d=\"M3,7 L3,4.2 M5.5,7 L5.5,3 M8,7 L8,3 M10.5,7 L10.5,4.2\"/><path d=\"M3,7 L3,10 C3,13.5 11,13.5 11,10 L11,6\"/><path d=\"M3,8 L1.3,9.6\"/>{e}"
        ),
        "rule" | "businessrule" => format!(
            "{g}<rect x=\"0.5\" y=\"1.5\" width=\"13\" height=\"11\" rx=\"0.5\"/><line x1=\"0.5\" y1=\"4.5\" x2=\"13.5\" y2=\"4.5\"/><line x1=\"4\" y1=\"1.5\" x2=\"4\" y2=\"12.5\"/>{e}"
        ),
        _ => String::new(),
    }
}

// ── Gateway-type marker glyphs (centred on (cx,cy)) ─────────────────────────────
fn gateway_marker(kind: &str, cx: f64, cy: f64, s: f64) -> String {
    let cls = "class=\"bpmn-marker\" stroke-width=\"2.4\"";
    match kind {
        "" | "none" => String::new(),
        "exclusive" => format!(
            "<g {cls}><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/></g>",
            f(cx - s), f(cy - s), f(cx + s), f(cy + s),
            f(cx + s), f(cy - s), f(cx - s), f(cy + s)
        ),
        "parallel" => format!(
            "<g {cls}><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/></g>",
            f(cx), f(cy - s), f(cx), f(cy + s),
            f(cx - s), f(cy), f(cx + s), f(cy)
        ),
        "inclusive" => format!(
            "<circle class=\"bpmn-marker\" stroke-width=\"2.4\" cx=\"{}\" cy=\"{}\" r=\"{}\"/>",
            f(cx), f(cy), f(s * 0.85)
        ),
        "complex" => {
            let d = s * 0.72;
            format!(
                "<g {cls}><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/></g>",
                f(cx), f(cy - s), f(cx), f(cy + s),
                f(cx - s), f(cy), f(cx + s), f(cy),
                f(cx - d), f(cy - d), f(cx + d), f(cy + d),
                f(cx + d), f(cy - d), f(cx - d), f(cy + d)
            )
        }
        "event" | "eventbased" => {
            let mut pent = String::new();
            for i in 0..5 {
                if i > 0 {
                    pent.push(' ');
                }
                let id = i as f64;
                pent.push_str(&format!(
                    "{},{}",
                    f(cx + s * 0.6 * sin_deg(72.0 * id)),
                    f(cy - s * 0.6 * cos_deg(72.0 * id))
                ));
            }
            format!(
                "<g class=\"bpmn-marker\"><circle cx=\"{}\" cy=\"{}\" r=\"{}\"/><circle cx=\"{}\" cy=\"{}\" r=\"{}\"/><polygon points=\"{pent}\"/></g>",
                f(cx), f(cy), f(s), f(cx), f(cy), f(s * 0.78)
            )
        }
        _ => String::new(),
    }
}

/// Render a `bpmn-*` component to an SVG fragment. Mirrors `render_component`.
pub fn render_component(c: &Component) -> String {
    let (cx, cy) = (c.pos.0 as f64, c.pos.1 as f64);
    let (hw, hh) = c.half();
    let (hw, hh) = (hw as f64, hh as f64);
    let shape = c.shape.as_str();
    let marker = c.icon.as_str();

    match shape {
        "bpmn-start" | "bpmn-end" | "bpmn-intermediate" | "bpmn-boundary" => {
            render_event(c, cx, cy, hw.min(hh), shape, marker)
        }
        "bpmn-task" | "bpmn-subprocess" => {
            render_task(c, cx, cy, hw, hh, marker, shape == "bpmn-subprocess")
        }
        "bpmn-gateway" => render_gateway(c, cx, cy, hw, hh, marker),
        "bpmn-data-object" => render_data_object(c, cx, cy, hw, hh),
        "bpmn-data-store" => render_data_store(c, cx, cy, hw, hh),
        "bpmn-annotation" => render_annotation(c, cx, cy, hw, hh),
        _ => String::new(),
    }
}

fn render_event(c: &Component, cx: f64, cy: f64, r: f64, shape: &str, marker: &str) -> String {
    let (rings, color) = if shape == "bpmn-start" {
        (
            format!(
                "<circle class=\"bpmn-event bpmn-event--start\" cx=\"{}\" cy=\"{}\" r=\"{}\"/>",
                f(cx),
                f(cy),
                f(r)
            ),
            INK,
        )
    } else if shape == "bpmn-end" {
        (
            format!(
                "<circle class=\"bpmn-event bpmn-event--end\" cx=\"{}\" cy=\"{}\" r=\"{}\"/>",
                f(cx),
                f(cy),
                f(r)
            ),
            INK,
        )
    } else {
        (
            format!(
                "<circle class=\"bpmn-event bpmn-event--ring\" cx=\"{}\" cy=\"{}\" r=\"{}\"/><circle class=\"bpmn-event bpmn-event--ring\" cx=\"{}\" cy=\"{}\" r=\"{}\"/>",
                f(cx), f(cy), f(r), f(cx), f(cy), f(r - 3.2)
            ),
            INK,
        )
    };
    let glyph = event_marker(marker, r * 0.42, color);
    let glyph_g = if glyph.is_empty() {
        String::new()
    } else {
        format!(
            "<g transform=\"translate({}, {})\">{glyph}</g>",
            f(cx),
            f(cy)
        )
    };
    let label = outside_label(c, cx, cy + r + 13.0, (70.0f64).max(2.0 * r + 40.0), 3);
    format!("{rings}{glyph_g}{label}")
}

fn render_task(
    c: &Component,
    cx: f64,
    cy: f64,
    hw: f64,
    hh: f64,
    marker: &str,
    collapsed: bool,
) -> String {
    let (x, y, w, h) = (cx - hw, cy - hh, 2.0 * hw, 2.0 * hh);
    let bx_box = format!(
        "<rect class=\"bpmn-task\" x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"9\"/>",
        f(x),
        f(y),
        f(w),
        f(h)
    );
    let mk = task_marker(marker, x, y);
    let lines = wrap(&c.name, w - 12.0, 12.5, 4, 0.55);
    let label = centered_lines(
        &lines,
        cx,
        cy + if mk.is_empty() { 0.0 } else { 4.0 },
        12.5,
        "bpmn-label",
    );
    let plus = if collapsed {
        let (bx, by) = (cx - 6.0, y + h - 14.0);
        format!(
            "<g class=\"bpmn-marker\"><rect x=\"{}\" y=\"{}\" width=\"12\" height=\"12\" rx=\"1\"/><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/><line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\"/></g>",
            f(bx), f(by),
            f(bx + 6.0), f(by + 2.5), f(bx + 6.0), f(by + 9.5),
            f(bx + 2.5), f(by + 6.0), f(bx + 9.5), f(by + 6.0)
        )
    } else {
        String::new()
    };
    format!("{bx_box}{mk}{label}{plus}")
}

fn render_gateway(c: &Component, cx: f64, cy: f64, hw: f64, hh: f64, marker: &str) -> String {
    let pts = format!(
        "{},{} {},{} {},{} {},{}",
        f(cx),
        f(cy - hh),
        f(cx + hw),
        f(cy),
        f(cx),
        f(cy + hh),
        f(cx - hw),
        f(cy)
    );
    let diamond = format!("<polygon class=\"bpmn-gateway\" points=\"{pts}\"/>");
    let mk = gateway_marker(marker, cx, cy, hw.min(hh) * 0.42);
    let label = outside_label(c, cx, cy + hh + 13.0, (90.0f64).max(2.0 * hw + 60.0), 3);
    format!("{diamond}{mk}{label}")
}

fn render_data_object(c: &Component, cx: f64, cy: f64, hw: f64, hh: f64) -> String {
    let (x, y, w, h) = (cx - hw, cy - hh, 2.0 * hw, 2.0 * hh);
    let fold = w.min(h) * 0.32;
    let page = format!(
        "<path class=\"bpmn-data\" d=\"M{},{} L{},{} L{},{} L{},{} L{},{} Z\"/><path class=\"bpmn-data\" d=\"M{},{} L{},{} L{},{}\"/>",
        f(x), f(y), f(x + w - fold), f(y), f(x + w), f(y + fold), f(x + w), f(y + h), f(x), f(y + h),
        f(x + w - fold), f(y), f(x + w - fold), f(y + fold), f(x + w), f(y + fold)
    );
    let label = outside_label(c, cx, cy + hh + 13.0, (90.0f64).max(w + 50.0), 3);
    format!("{page}{label}")
}

fn render_data_store(c: &Component, cx: f64, cy: f64, hw: f64, hh: f64) -> String {
    let (x, w) = (cx - hw, 2.0 * hw);
    let (top, bot) = (cy - hh, cy + hh);
    let ry = (hh * 0.45).min(hw * 0.4);
    let body = format!(
        "<path class=\"bpmn-data\" d=\"M{},{} A{},{} 0 0 0 {},{} L{},{} A{},{} 0 0 1 {},{} Z\"/><path class=\"bpmn-data\" fill=\"none\" d=\"M{},{} A{},{} 0 0 0 {},{}\"/>",
        f(x), f(top + ry), f(hw), f(ry), f(x + w), f(top + ry), f(x + w), f(bot - ry), f(hw), f(ry), f(x), f(bot - ry),
        f(x), f(top + ry), f(hw), f(ry), f(x + w), f(top + ry)
    );
    let label = outside_label(c, cx, cy + hh + 13.0, (90.0f64).max(w + 50.0), 3);
    format!("{body}{label}")
}

fn render_annotation(c: &Component, cx: f64, cy: f64, hw: f64, hh: f64) -> String {
    let (x, y, h) = (cx - hw, cy - hh, 2.0 * hh);
    let tick = (8.0f64).min(hw * 0.5);
    let bracket = format!(
        "<path class=\"bpmn-marker\" stroke=\"#6b7280\" d=\"M{},{} L{},{} L{},{} L{},{}\"/>",
        f(x + tick),
        f(y),
        f(x),
        f(y),
        f(x),
        f(y + h),
        f(x + tick),
        f(y + h)
    );
    let lines = wrap(&c.name, 2.0 * hw - tick - 6.0, 12.0, 4, 0.55);
    let lh = 14.5;
    let mut parts = String::new();
    for (i, ln) in lines.iter().enumerate() {
        parts.push_str(&format!(
            "<text class=\"bpmn-anno-text\" x=\"{}\" y=\"{}\">{}</text>",
            f(x + tick + 5.0),
            f(y + 12.0 + i as f64 * lh),
            esc(ln)
        ));
    }
    format!("{bracket}{parts}")
}
