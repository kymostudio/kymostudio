//! Pure-Rust sequence-diagram **SVG renderer** — the sequence counterpart to
//! [`kymo_graph::flowchart_svg`]. Consumes the shared [`super::layout`] (lifeline
//! centres, message rows, fragment boxes) and draws everything as SVG
//! `<rect>`/`<line>`/`<text>` — real text, so PNG/PDF keep their labels.
//!
//! Covers participants, messages (per [`MessageSort`]), self-messages,
//! combined fragments (`loop`/`alt`/`opt`/`par`), notes, activation bars and
//! `autonumber` — everything as real `<text>`, so PNG/PDF keep their labels.

use super::layout::{self, PActiv, PFrag, PMsg, PNote, HEAD_H, HEAD_TOP, HEAD_W, LINE_TOP};
use super::{FragmentOp, MessageSort, Sequence};

const ACT_W: i64 = 8; // activation-bar width
// The walk leaves a trailing ROW (44) below the last message; mermaid drops the
// foot only ~20px below it, so pull the foot box up to match its rhythm.
const FOOT_GAP: i64 = -24;
// mermaid's default sequence font — matching it keeps glyph shapes/widths in
// step for visual parity.
const FONT: &str = "\"trebuchet ms\", verdana, arial, sans-serif";

const DEFS: &str = "<marker id=\"seq-arrow\" markerWidth=\"12\" markerHeight=\"10\" refX=\"9\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M1,1 L10,5 L1,9 Z\" fill=\"#333333\"/></marker>\
<marker id=\"seq-open\" markerWidth=\"12\" markerHeight=\"10\" refX=\"9\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M1,1 L10,5 L1,9\" fill=\"none\" stroke=\"#333333\" \
stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></marker>\
<marker id=\"seq-arrow-start\" markerWidth=\"12\" markerHeight=\"10\" refX=\"1\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M10,1 L1,5 L10,9 Z\" fill=\"#333333\"/></marker>\
<marker id=\"seq-open-start\" markerWidth=\"12\" markerHeight=\"10\" refX=\"1\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M10,1 L1,5 L10,9\" fill=\"none\" stroke=\"#333333\" \
stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></marker>";

/// Render a parsed [`Sequence`] to a self-contained SVG document.
pub fn render(seq: &Sequence) -> String {
    let lay = layout::layout(seq);

    let foot_top = lay.bottom + FOOT_GAP;
    let mut right = lay.centers.iter().copied().max().unwrap_or(HEAD_W) + HEAD_W / 2;
    for f in &lay.frags {
        right = right.max(f.left + f.width);
    }
    for n in &lay.notes {
        right = right.max(n.left + n.width);
    }
    if !seq.title.is_empty() {
        right = right.max(seq.title.chars().count() as i64 * 8);
    }
    // Match mermaid's viewBox origin: a 50px left/right margin and a 10px top /
    // 30px bottom margin around the y=0-anchored actor boxes.
    const MX: i64 = 50;
    const MY_TOP: i64 = 10;
    const MY_BOT: i64 = 30;
    let vb_w = right + 2 * MX;
    let vb_h = foot_top + HEAD_H + MY_TOP + MY_BOT;
    let width = vb_w;
    let height = vb_h;

    let mut body = String::new();

    // Box groupings sit behind everything as a tinted backdrop.
    for b in &seq.boxes {
        let idxs: Vec<usize> = b
            .members
            .iter()
            .filter_map(|m| seq.participants.iter().position(|p| &p.id == m))
            .collect();
        if idxs.is_empty() {
            continue;
        }
        let lo = idxs.iter().map(|&i| lay.centers[i]).min().unwrap() - HEAD_W / 2 - 8;
        let hi = idxs.iter().map(|&i| lay.centers[i]).max().unwrap() + HEAD_W / 2 + 8;
        let top = HEAD_TOP - 8;
        let bot = foot_top + HEAD_H + 8;
        body += &format!(
            "<rect x=\"{lo}\" y=\"{top}\" width=\"{}\" height=\"{}\" rx=\"4\" \
             fill=\"#f1f5f9\" stroke=\"#cbd5e1\" stroke-width=\"1\"/>",
            hi - lo,
            bot - top,
        );
        if !b.label.is_empty() {
            body += &format!(
                "<text x=\"{}\" y=\"{}\" fill=\"#333333\" font-size=\"12\" font-weight=\"600\">{}</text>",
                lo + 6,
                top + 14,
                esc(&b.label),
            );
        }
    }

    // Lifelines: solid grey verticals from below the head box to the foot box
    // (mermaid's `.actor-line` is a solid grey line, not dashed).
    for &cx in &lay.centers {
        body += &format!(
            "<line x1=\"{cx}\" y1=\"{LINE_TOP}\" x2=\"{cx}\" y2=\"{foot_top}\" \
             stroke=\"#999999\" stroke-width=\"1\"/>"
        );
    }

    // Fragment boxes sit behind the messages.
    for f in &lay.frags {
        body += &frag_svg(f);
    }
    for a in &lay.acts {
        body += &activ_svg(a, &lay.centers);
    }
    for m in &lay.msgs {
        body += &msg_svg(m, &lay.centers);
    }
    for n in &lay.notes {
        body += &note_svg(n);
    }

    // Diagram title, centred above the participant heads.
    if !seq.title.is_empty() {
        body += &format!(
            "<text x=\"{}\" y=\"22\" text-anchor=\"middle\" fill=\"#1e293b\" \
             font-size=\"16\" font-weight=\"700\">{}</text>",
            width / 2,
            esc(&seq.title),
        );
    }

    // Head + foot boxes for every participant.
    for (i, p) in seq.participants.iter().enumerate() {
        let cx = lay.centers.get(i).copied().unwrap_or(0);
        body += &head_box(cx, HEAD_TOP, &p.label, &p.kind);
        body += &head_box(cx, foot_top, &p.label, &p.kind);
    }

    let (vx, vy) = (-MX, -MY_TOP);
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"{vx} {vy} {width} {height}\" \
         width=\"{width}\" height=\"{height}\" style=\"max-width:100%;height:auto\" \
         font-family=\"{FONT}\" font-size=\"14\">\n<defs>{DEFS}</defs>\n\
         <rect x=\"{vx}\" y=\"{vy}\" width=\"{width}\" height=\"{height}\" fill=\"#ffffff\"/>\n{body}</svg>\n"
    )
}

fn head_box(cx: i64, top: i64, label: &str, kind: &str) -> String {
    // A typed participant (`@{type:…}`) draws its UML glyph (mermaid 11 geometry).
    if !kind.is_empty() && kind != "participant" {
        if let Some(glyph) = actor_glyph(kind, cx, top, label) {
            return glyph;
        }
    }
    let x = cx - HEAD_W / 2;
    // `<br/>` hard-breaks split the actor name across lines (mermaid does the
    // same); render each as a centred tspan rather than the literal tag.
    let lines: Vec<&str> = split_br(label);
    let line_h = 16;
    let y0 = top + HEAD_H / 2 - (lines.len() as i64 - 1) * line_h / 2;
    let mut text = String::new();
    for (i, l) in lines.iter().enumerate() {
        text += &format!(
            "<text x=\"{cx}\" y=\"{}\" text-anchor=\"middle\" dominant-baseline=\"central\" \
             fill=\"#333333\" font-weight=\"600\">{}</text>",
            y0 + i as i64 * line_h,
            esc(l)
        );
    }
    format!(
        "<rect x=\"{x}\" y=\"{top}\" width=\"{HEAD_W}\" height=\"{HEAD_H}\" rx=\"3\" \
         fill=\"#ECECFF\" stroke=\"#9370DB\" stroke-width=\"1.5\"/>{text}"
    )
}

/// The centred actor name under/inside a typed glyph.
fn glyph_label(cx: i64, y: f64, label: &str) -> String {
    format!(
        "<text x=\"{cx}\" y=\"{y:.2}\" text-anchor=\"middle\" dominant-baseline=\"central\" \
         fill=\"#333333\" font-weight=\"400\" font-size=\"16\">{}</text>",
        esc(label)
    )
}

/// A UML actor glyph for a `@{type:…}` participant, ported from mermaid 11's
/// `svgDraw` geometry (actor box 150×65, `top` = box top, `cx` = lifeline x).
/// `None` for an unknown type (caller draws a plain box).
fn actor_glyph(kind: &str, cx: i64, top: i64, label: &str) -> Option<String> {
    const H: f64 = HEAD_H as f64; // 65
    const W: f64 = HEAD_W as f64; // 150
    let f = "#ECECFF";
    let s = "#9370DB";
    let pen = format!("fill=\"none\" stroke=\"{s}\" stroke-width=\"2\"");
    let fill = format!("fill=\"{f}\" stroke=\"{s}\" stroke-width=\"2\""); // .actor-man circle/line
    let thin = format!("fill=\"{f}\" stroke=\"{s}\" stroke-width=\"1\""); // .actor rect/path shapes
    let (t, c) = (top as f64, cx as f64);
    let g = match kind {
        // Stick figure: head circle r=15, torso, arms, two legs.
        "actor" => {
            let (cy, r) = (t + 10.0, 15.0);
            let (tt, tb) = (cy + r, cy + r + 20.0); // torso top/bottom
            let ay = tt + 8.0; // arms
            let ly = tb + 15.0; // leg foot
            format!(
                "<circle cx=\"{c}\" cy=\"{cy}\" r=\"15\" {fill}/>\
                 <line x1=\"{c}\" y1=\"{tt}\" x2=\"{c}\" y2=\"{tb}\" {pen}/>\
                 <line x1=\"{ax1}\" y1=\"{ay}\" x2=\"{ax2}\" y2=\"{ay}\" {pen}/>\
                 <line x1=\"{ax1}\" y1=\"{ly}\" x2=\"{c}\" y2=\"{tb}\" {pen}/>\
                 <line x1=\"{c}\" y1=\"{tb}\" x2=\"{lx2}\" y2=\"{ly}\" {pen}/>{lbl}",
                ax1 = c - 18.0, ax2 = c + 18.0, lx2 = c + 16.0,
                lbl = glyph_label(cx, t + H + 2.5, label),
            )
        }
        // Boundary: circle r=22, a stalk (vertical bar + connector) on its left.
        "boundary" => {
            let cy = t + 33.0; // 12 + translate 21
            format!(
                "<line x1=\"{x1}\" y1=\"{yt}\" x2=\"{x2}\" y2=\"{yt}\" {pen}/>\
                 <line x1=\"{x1}\" y1=\"{y0}\" x2=\"{x1}\" y2=\"{y20}\" {pen}/>\
                 <circle cx=\"{c}\" cy=\"{cy}\" r=\"22\" {fill}/>{lbl}",
                x1 = c - 55.0, x2 = c - 15.0,
                yt = t + 31.0, y0 = t + 21.0, y20 = t + 41.0,
                lbl = glyph_label(cx, t + 68.5, label),
            )
        }
        // Control: circle r=22 with a dark rotation arrowhead at its top-left
        // (mermaid's marker defaults to a black fill, pointing tangentially).
        "control" => {
            let cy = t + 32.0;
            let top = cy - 22.0; // circle top
            format!(
                "<circle cx=\"{c}\" cy=\"{cy}\" r=\"22\" {fill}/>\
                 <path d=\"M {x1:.1} {y1:.1} L {x2:.1} {y2:.1} L {x3:.1} {y3:.1} Z\" fill=\"#333333\"/>{lbl}",
                x1 = c - 10.0, y1 = top + 1.0,
                x2 = c + 1.0, y2 = top - 3.0,
                x3 = c + 1.0, y3 = top + 6.0,
                lbl = glyph_label(cx, t + 66.5, label),
            )
        }
        // Entity: circle r=22 with an underline (the "grounded" bar).
        "entity" => {
            let cy = t + 31.0; // 25 + translate 6
            format!(
                "<circle cx=\"{c}\" cy=\"{cy}\" r=\"22\" {fill}/>\
                 <line x1=\"{x1}\" y1=\"{y}\" x2=\"{x2}\" y2=\"{y}\" {pen}/>{lbl}",
                x1 = c - 22.0, x2 = c + 22.0, y = cy + 22.0,
                lbl = glyph_label(cx, t + 68.5, label),
            )
        }
        // Database: vertical cylinder, width = box/3, centred on cx.
        "database" => {
            let w = W / 3.0; // 50
            let (left, ttop) = (c - w / 2.0, t + 8.0);
            let (rx, ry, bh) = (w / 2.0, 7.0, 40.0);
            format!(
                "<path d=\"M {left:.1} {ttop:.1} a {rx} {ry} 0 0 0 {w} 0 a {rx} {ry} 0 0 0 {nw} 0 \
                 l 0 {bh} a {rx} {ry} 0 0 0 {w} 0 l 0 {nbh}\" {thin}/>{lbl}",
                nw = -w, nbh = -bh,
                lbl = glyph_label(cx, t + 35.0 + H / 2.0, label),
            )
        }
        // Queue: a horizontal cylinder (stadium with elliptical end-caps).
        "queue" => {
            let ry = H / 2.0; // 32.5
            let rx = ry / (2.5 + H / 50.0); // ≈ 8.55
            let body_w = W - 2.0 * rx;
            let (x0, xr) = (c - W / 2.0 + rx, c - W / 2.0 + W - rx);
            format!(
                "<path d=\"M {x0:.2} {t} a {rx:.2} {ry} 0 0 0 0 {H} h {body_w:.2} a {rx:.2} {ry} 0 0 0 0 {nh} Z\" {thin}/>\
                 <path d=\"M {xr:.2} {t} a {rx:.2} {ry} 0 0 0 0 {H}\" fill=\"none\" stroke=\"#9370DB\" stroke-width=\"1\"/>{lbl}",
                nh = -H,
                lbl = glyph_label(cx, t + H / 2.0, label),
            )
        }
        // Collections: two offset boxes (a stacked-card shadow).
        "collections" => {
            let (x, off) = (c - W / 2.0, 6.0);
            format!(
                "<rect x=\"{x:.1}\" y=\"{t}\" width=\"{W}\" height=\"{H}\" rx=\"3\" {thin}/>\
                 <rect x=\"{fx:.1}\" y=\"{fy:.1}\" width=\"{W}\" height=\"{H}\" rx=\"3\" {thin}/>{lbl}",
                fx = x - off, fy = t + off,
                lbl = glyph_label(cx - 6, t + off + H / 2.0, label),
            )
        }
        _ => return None,
    };
    Some(g)
}

/// Split a label on `<br>` / `<br/>` / `<br />` hard-breaks (mermaid's line break).
fn split_br(s: &str) -> Vec<&str> {
    let mut out = Vec::new();
    let mut rest = s;
    while let Some(p) = rest.find("<br") {
        out.push(&rest[..p]);
        match rest[p..].find('>') {
            Some(q) => rest = &rest[p + q + 1..],
            None => {
                rest = "";
                break;
            }
        }
    }
    out.push(rest);
    out
}

fn msg_svg(m: &PMsg, centers: &[i64]) -> String {
    let x1 = centers.get(m.from).copied().unwrap_or(0);
    let x2 = centers.get(m.to).copied().unwrap_or(0);
    let y = m.y;
    let dashed = matches!(m.sort, MessageSort::Reply);
    let dash = if dashed {
        " stroke-dasharray=\"5 4\""
    } else {
        ""
    };
    let head = match m.sort {
        MessageSort::SynchCall | MessageSort::Reply => "seq-arrow",
        _ => "seq-open",
    };
    // Bidirectional arrows get a reversed head at the source end too.
    let start_marker = if m.bidirectional {
        format!(" marker-start=\"url(#{head}-start)\"")
    } else {
        String::new()
    };

    if m.self_loop || x1 == x2 {
        // Self-message: a small rectangular loop to the right of the lifeline.
        let r = x1 + 60;
        let y2 = y + 24;
        let path = format!(
            "<path d=\"M{x1},{y} H{r} V{y2} H{x1}\" fill=\"none\" stroke=\"#333333\" \
             stroke-width=\"1.4\"{dash}{start_marker} marker-end=\"url(#{head})\"/>"
        );
        let label = if m.text.is_empty() {
            String::new()
        } else {
            format!(
                "<text x=\"{}\" y=\"{}\" fill=\"#333333\">{}</text>",
                r + 6,
                y + 14,
                esc(&m.text)
            )
        };
        return path + &label;
    }

    let line = format!(
        "<line x1=\"{x1}\" y1=\"{y}\" x2=\"{x2}\" y2=\"{y}\" stroke=\"#333333\" \
         stroke-width=\"1.4\"{dash}{start_marker} marker-end=\"url(#{head})\"/>"
    );
    let label = if m.text.is_empty() {
        String::new()
    } else {
        let mid = (x1 + x2) / 2;
        // mermaid sits the label ~29px above the arrow with `dominant-baseline:
        // middle; dy:1em` at messageFontSize 16 — replicate exactly for parity.
        format!(
            "<text x=\"{mid}\" y=\"{}\" text-anchor=\"middle\" dominant-baseline=\"middle\" \
             alignment-baseline=\"middle\" dy=\"1em\" fill=\"#333333\" font-size=\"16\">{}</text>",
            y - 29,
            esc(&m.text)
        )
    };
    line + &label
}

fn frag_svg(f: &PFrag) -> String {
    // `rect <color>` — a plain coloured background band, no operator tab/border.
    if matches!(f.operator, FragmentOp::Rect) {
        let color = f
            .operands
            .first()
            .map(|o| o.0.as_str())
            .filter(|c| !c.is_empty())
            .unwrap_or("#000");
        return format!(
            "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\" opacity=\"0.4\"/>",
            f.left, f.top, f.width, f.height, color
        );
    }
    let mut out = format!(
        "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"none\" \
         stroke=\"#94a3b8\" stroke-width=\"1.2\"/>",
        f.left, f.top, f.width, f.height
    );
    // Operator tab in the top-left corner.
    let op = op_label(f.operator);
    let tab_w = 12 + op.len() as i64 * 8;
    out += &format!(
        "<path d=\"M{l},{t} h{tw} v14 l-8,8 h-{tw2} z\" fill=\"#e2e8f0\" stroke=\"#94a3b8\" stroke-width=\"1\"/>\
         <text x=\"{tx}\" y=\"{ty}\" fill=\"#333333\" font-weight=\"700\" font-size=\"12\">{op}</text>",
        l = f.left,
        t = f.top,
        tw = tab_w,
        tw2 = tab_w - 8,
        tx = f.left + 6,
        ty = f.top + 15,
    );
    // Operand guards + dashed dividers (the first operand's guard sits by the tab).
    for (i, (guard, top, _h)) in f.operands.iter().enumerate() {
        if i > 0 {
            out += &format!(
                "<line x1=\"{}\" y1=\"{top}\" x2=\"{}\" y2=\"{top}\" stroke=\"#94a3b8\" \
                 stroke-width=\"1\" stroke-dasharray=\"4 4\"/>",
                f.left,
                f.left + f.width
            );
        }
        if !guard.is_empty() {
            let gy = if i == 0 { f.top + 13 } else { top + 14 };
            let gx = if i == 0 {
                f.left + tab_w + 6
            } else {
                f.left + 8
            };
            out += &format!(
                "<text x=\"{gx}\" y=\"{gy}\" fill=\"#333333\" font-size=\"12\">[{}]</text>",
                esc(guard)
            );
        }
    }
    out
}

fn op_label(op: FragmentOp) -> &'static str {
    match op {
        FragmentOp::Loop => "loop",
        FragmentOp::Alt => "alt",
        FragmentOp::Opt => "opt",
        FragmentOp::Par => "par",
        FragmentOp::Critical => "critical",
        FragmentOp::Break => "break",
        FragmentOp::Rect => "",
    }
}

fn note_svg(n: &PNote) -> String {
    let mut out = format!(
        "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" rx=\"3\" \
         fill=\"#fff7d6\" stroke=\"#e3c34a\" stroke-width=\"1\"/>",
        n.left, n.top, n.width, n.height
    );
    let cx = n.left + n.width / 2;
    for (i, line) in n.lines.iter().enumerate() {
        let ty = n.top + 20 + i as i64 * 16;
        out += &format!(
            "<text x=\"{cx}\" y=\"{ty}\" text-anchor=\"middle\" fill=\"#5b4a17\">{}</text>",
            esc(line)
        );
    }
    out
}

fn activ_svg(a: &PActiv, centers: &[i64]) -> String {
    let cx = centers.get(a.col).copied().unwrap_or(0);
    let h = (a.bottom - a.top).max(12);
    format!(
        "<rect x=\"{}\" y=\"{}\" width=\"{ACT_W}\" height=\"{h}\" \
         fill=\"#e2e8f0\" stroke=\"#94a3b8\" stroke-width=\"1\"/>",
        cx - ACT_W / 2,
        a.top
    )
}

fn esc(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            _ => out.push(c),
        }
    }
    out
}
