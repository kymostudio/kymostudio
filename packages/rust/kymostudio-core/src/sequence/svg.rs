//! Pure-Rust sequence-diagram **SVG renderer** — the sequence counterpart to
//! [`crate::flowchart_svg`]. Consumes the shared [`super::layout`] (lifeline
//! centres, message rows, fragment boxes) and draws everything as SVG
//! `<rect>`/`<line>`/`<text>` — real text, so PNG/PDF keep their labels.
//!
//! Notes and activations are not drawn (the shared layout does not place them
//! yet); the diagram covers participants, messages (per [`MessageSort`]),
//! self-messages and combined fragments (`loop`/`alt`/`opt`/`par`).

use super::layout::{self, PFrag, PMsg, HEAD_H, HEAD_TOP, HEAD_W, LINE_TOP};
use super::{FragmentOp, MessageSort, Sequence};

const MARGIN: i64 = 12;
const FOOT_GAP: i64 = 12;
const FONT: &str =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const DEFS: &str = "<marker id=\"seq-arrow\" markerWidth=\"12\" markerHeight=\"10\" refX=\"9\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M1,1 L10,5 L1,9 Z\" fill=\"#475569\"/></marker>\
<marker id=\"seq-open\" markerWidth=\"12\" markerHeight=\"10\" refX=\"9\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M1,1 L10,5 L1,9\" fill=\"none\" stroke=\"#475569\" \
stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></marker>\
<marker id=\"seq-arrow-start\" markerWidth=\"12\" markerHeight=\"10\" refX=\"1\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M10,1 L1,5 L10,9 Z\" fill=\"#475569\"/></marker>\
<marker id=\"seq-open-start\" markerWidth=\"12\" markerHeight=\"10\" refX=\"1\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M10,1 L1,5 L10,9\" fill=\"none\" stroke=\"#475569\" \
stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></marker>";

/// Render a parsed [`Sequence`] to a self-contained SVG document.
pub fn render(seq: &Sequence) -> String {
    let lay = layout::layout(seq);

    let foot_top = lay.bottom + FOOT_GAP;
    let mut right = lay.centers.iter().copied().max().unwrap_or(HEAD_W) + HEAD_W / 2;
    for f in &lay.frags {
        right = right.max(f.left + f.width);
    }
    let width = right + MARGIN;
    let height = foot_top + HEAD_H + MARGIN;

    let mut body = String::new();

    // Lifelines: dashed verticals from below the head box to the foot box.
    for &cx in &lay.centers {
        body += &format!(
            "<line x1=\"{cx}\" y1=\"{LINE_TOP}\" x2=\"{cx}\" y2=\"{foot_top}\" \
             stroke=\"#94a3b8\" stroke-width=\"1\" stroke-dasharray=\"4 4\"/>"
        );
    }

    // Fragment boxes sit behind the messages.
    for f in &lay.frags {
        body += &frag_svg(f);
    }
    for m in &lay.msgs {
        body += &msg_svg(m, &lay.centers);
    }

    // Head + foot boxes for every participant.
    for (i, p) in seq.participants.iter().enumerate() {
        let cx = lay.centers.get(i).copied().unwrap_or(0);
        body += &head_box(cx, HEAD_TOP, &p.label);
        body += &head_box(cx, foot_top, &p.label);
    }

    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {width} {height}\" \
         width=\"{width}\" height=\"{height}\" style=\"max-width:100%;height:auto\" \
         font-family=\"{FONT}\" font-size=\"14\">\n<defs>{DEFS}</defs>\n\
         <rect width=\"{width}\" height=\"{height}\" fill=\"#fafafa\"/>\n{body}</svg>\n"
    )
}

fn head_box(cx: i64, top: i64, label: &str) -> String {
    let x = cx - HEAD_W / 2;
    let ty = top + HEAD_H / 2;
    format!(
        "<rect x=\"{x}\" y=\"{top}\" width=\"{HEAD_W}\" height=\"{HEAD_H}\" rx=\"6\" \
         fill=\"#eef2ff\" stroke=\"#6366f1\" stroke-width=\"1.5\"/>\
         <text x=\"{cx}\" y=\"{ty}\" text-anchor=\"middle\" dominant-baseline=\"central\" \
         fill=\"#1e293b\" font-weight=\"600\">{}</text>",
        esc(label)
    )
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
            "<path d=\"M{x1},{y} H{r} V{y2} H{x1}\" fill=\"none\" stroke=\"#475569\" \
             stroke-width=\"1.4\"{dash}{start_marker} marker-end=\"url(#{head})\"/>"
        );
        let label = if m.text.is_empty() {
            String::new()
        } else {
            format!(
                "<text x=\"{}\" y=\"{}\" fill=\"#334155\">{}</text>",
                r + 6,
                y + 14,
                esc(&m.text)
            )
        };
        return path + &label;
    }

    let line = format!(
        "<line x1=\"{x1}\" y1=\"{y}\" x2=\"{x2}\" y2=\"{y}\" stroke=\"#475569\" \
         stroke-width=\"1.4\"{dash}{start_marker} marker-end=\"url(#{head})\"/>"
    );
    let label = if m.text.is_empty() {
        String::new()
    } else {
        let mid = (x1 + x2) / 2;
        format!(
            "<text x=\"{mid}\" y=\"{}\" text-anchor=\"middle\" fill=\"#334155\">{}</text>",
            y - 6,
            esc(&m.text)
        )
    };
    line + &label
}

fn frag_svg(f: &PFrag) -> String {
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
         <text x=\"{tx}\" y=\"{ty}\" fill=\"#334155\" font-weight=\"700\" font-size=\"12\">{op}</text>",
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
                "<text x=\"{gx}\" y=\"{gy}\" fill=\"#475569\" font-size=\"12\">[{}]</text>",
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
    }
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
