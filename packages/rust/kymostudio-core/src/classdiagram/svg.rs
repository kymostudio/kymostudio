//! Render a [`ClassDiagram`] to SVG. Classes become multi-compartment boxes
//! (name + attributes + methods), positioned by reusing
//! [`crate::layout::layout_flowchart`]; relationships draw the UML arrowhead for
//! their kind. Everything is real `<text>`, so PNG/PDF keep the labels.

use super::{ClassBox, ClassDiagram, RelKind, Relation};
use crate::flowchart::{FlowEdge, FlowNode, Flowchart, Subgraph};
use crate::layout;
use crate::model::{Component, Shape};
use std::collections::HashMap;

const LINE_H: i32 = 18;
const FONT: &str =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const DEFS: &str = "<marker id=\"cd-tri\" markerWidth=\"18\" markerHeight=\"16\" refX=\"16\" refY=\"8\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M1,1 L16,8 L1,15 Z\" fill=\"#fff\" stroke=\"#334155\"/></marker>\
<marker id=\"cd-diamond\" markerWidth=\"20\" markerHeight=\"14\" refX=\"18\" refY=\"7\" orient=\"auto\" \
markerUnits=\"userSpaceOnUse\"><path d=\"M1,7 L10,1 L19,7 L10,13 Z\" fill=\"#334155\"/></marker>\
<marker id=\"cd-diamond-o\" markerWidth=\"20\" markerHeight=\"14\" refX=\"18\" refY=\"7\" orient=\"auto\" \
markerUnits=\"userSpaceOnUse\"><path d=\"M1,7 L10,1 L19,7 L10,13 Z\" fill=\"#fff\" stroke=\"#334155\"/></marker>\
<marker id=\"cd-arrow\" markerWidth=\"14\" markerHeight=\"12\" refX=\"11\" refY=\"6\" orient=\"auto\" \
markerUnits=\"userSpaceOnUse\"><path d=\"M1,1 L12,6 L1,11\" fill=\"none\" stroke=\"#334155\" stroke-width=\"1.4\"/></marker>";

/// Render the class diagram to a self-contained SVG document.
pub fn render(cd: &ClassDiagram) -> String {
    let mut fc = Flowchart {
        direction: cd.direction,
        nodes: Vec::new(),
        edges: Vec::new(),
        subgraphs: Vec::new(),
    };
    for c in &cd.classes {
        fc.nodes.push(FlowNode {
            id: c.id.clone(),
            label: box_label(c),
            shape: Shape::Box,
        });
    }
    for r in &cd.relations {
        fc.edges.push(FlowEdge {
            src: r.from.clone(),
            dst: r.to.clone(),
            label: r.label.clone(),
            dashed: r.dashed,
            no_arrow: true, // class edges draw their own UML heads
        });
    }
    for (name, members) in &cd.namespaces {
        fc.subgraphs.push(Subgraph {
            id: format!("__ns_{name}"),
            title: name.clone(),
            members: members.clone(),
            parent: None,
        });
    }
    // Notes become extra layout nodes (so they don't overlap) and draw as
    // yellow boxes; `note for X` links to its target.
    for (i, n) in cd.notes.iter().enumerate() {
        let id = format!("__note{i}");
        fc.nodes.push(FlowNode {
            id: id.clone(),
            label: n.text.clone(),
            shape: Shape::Box,
        });
        if let Some(t) = &n.target {
            fc.edges.push(FlowEdge {
                src: id,
                dst: t.clone(),
                label: String::new(),
                dashed: true,
                no_arrow: true,
            });
        }
    }
    let dia = layout::layout_flowchart(&fc);
    let by_id: HashMap<&str, &Component> =
        dia.components.iter().map(|c| (c.id.as_str(), c)).collect();

    let mut body = String::new();
    for region in &dia.regions {
        let (rx, ry, rw, rh) = region.bounds;
        body += &format!(
            "<rect x=\"{rx}\" y=\"{ry}\" width=\"{rw}\" height=\"{rh}\" rx=\"4\" fill=\"none\"              stroke=\"#94a3b8\" stroke-width=\"1\" stroke-dasharray=\"4 3\"/>             <text x=\"{}\" y=\"{}\" fill=\"#475569\" font-size=\"12\" font-weight=\"600\">{}</text>",
            rx + 6,
            ry + 15,
            esc(&region.label)
        );
    }
    for r in &cd.relations {
        if let (Some(a), Some(b)) = (by_id.get(r.from.as_str()), by_id.get(r.to.as_str())) {
            body += &edge_svg(r, a, b);
        }
    }
    for c in &cd.classes {
        if let Some(comp) = by_id.get(c.id.as_str()) {
            body += &box_svg(c, comp);
        }
    }
    for (i, n) in cd.notes.iter().enumerate() {
        if let Some(comp) = by_id.get(format!("__note{i}").as_str()) {
            body += &note_box(&n.text, comp);
        }
    }

    let (w, h) = (dia.width.max(40), dia.height.max(40));
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {w} {h}\" width=\"{w}\" height=\"{h}\" \
         style=\"max-width:100%;height:auto\" font-family=\"{FONT}\" font-size=\"13\">\n\
         <defs>{DEFS}</defs>\n<rect width=\"{w}\" height=\"{h}\" fill=\"#fafafa\"/>\n{body}</svg>\n"
    )
}

/// The multi-line text used only to size the box (one line per rendered row).
fn box_label(c: &ClassBox) -> String {
    let mut lines = Vec::new();
    if !c.stereotype.is_empty() {
        lines.push(format!("<<{}>>", c.stereotype));
    }
    lines.push(c.name.clone());
    for a in &c.attributes {
        lines.push(a.clone());
    }
    for m in &c.methods {
        lines.push(m.clone());
    }
    lines.join("\n")
}

fn box_svg(c: &ClassBox, comp: &Component) -> String {
    let (cx, cy) = comp.pos;
    let (w, h) = comp.size.unwrap_or((120, 60));
    let (x, y) = (cx - w / 2, cy - h / 2);
    let mut out = format!(
        "<rect x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"2\" fill=\"#ffffff\" \
         stroke=\"#334155\" stroke-width=\"1.2\"/>"
    );
    let mut ty = y + 4;
    if !c.stereotype.is_empty() {
        ty += LINE_H - 4;
        out += &format!(
            "<text x=\"{cx}\" y=\"{ty}\" text-anchor=\"middle\" font-size=\"11\" fill=\"#64748b\">{}</text>",
            esc(&format!("«{}»", c.stereotype))
        );
        ty += 4;
    }
    ty += LINE_H - 4;
    out += &format!(
        "<text x=\"{cx}\" y=\"{ty}\" text-anchor=\"middle\" font-weight=\"700\" fill=\"#1e293b\">{}</text>",
        esc(&c.name)
    );
    ty += 6;
    let row = |ty: i32, t: &str| {
        format!(
            "<text x=\"{}\" y=\"{ty}\" fill=\"#334155\">{}</text>",
            x + 6,
            esc(t)
        )
    };
    out += &divider(x, ty, w);
    for a in &c.attributes {
        ty += LINE_H;
        out += &row(ty, a);
    }
    out += &divider(x, ty + 6, w);
    for m in &c.methods {
        ty += LINE_H;
        out += &row(ty, m);
    }
    out
}

fn note_box(text: &str, comp: &Component) -> String {
    let (cx, cy) = comp.pos;
    let (w, h) = comp.size.unwrap_or((120, 36));
    let (x, y) = (cx - w / 2, cy - h / 2);
    let mut out = format!(
        "<rect x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"2\" fill=\"#fff7d6\"          stroke=\"#e3c34a\" stroke-width=\"1\"/>"
    );
    for (i, line) in text.split('\n').enumerate() {
        out += &format!(
            "<text x=\"{}\" y=\"{}\" fill=\"#5b4a17\" font-size=\"12\">{}</text>",
            x + 6,
            y + 16 + i as i32 * LINE_H,
            esc(line)
        );
    }
    out
}

fn divider(x: i32, ty: i32, w: i32) -> String {
    format!(
        "<line x1=\"{x}\" y1=\"{ty}\" x2=\"{}\" y2=\"{ty}\" stroke=\"#cbd5e1\" stroke-width=\"1\"/>",
        x + w
    )
}

fn edge_svg(r: &Relation, a: &Component, b: &Component) -> String {
    // The decorated end is `from` when head_at_from, else `to`.
    let (sx, sy) = a.pos;
    let (ex, ey) = b.pos;
    let dash = if r.dashed {
        " stroke-dasharray=\"5 4\""
    } else {
        ""
    };
    let marker = match r.kind {
        RelKind::Inheritance | RelKind::Realization => "cd-tri",
        RelKind::Composition => "cd-diamond",
        RelKind::Aggregation => "cd-diamond-o",
        RelKind::Association | RelKind::Dependency => "cd-arrow",
        RelKind::Link => "",
    };
    // Put the marker at the decorated end: swap line direction so marker-end lands there.
    let (x1, y1, x2, y2) = if r.head_at_from {
        (ex, ey, sx, sy)
    } else {
        (sx, sy, ex, ey)
    };
    let mk = if marker.is_empty() {
        String::new()
    } else {
        format!(" marker-end=\"url(#{marker})\"")
    };
    let mut out = format!(
        "<line x1=\"{x1}\" y1=\"{y1}\" x2=\"{x2}\" y2=\"{y2}\" stroke=\"#334155\" \
         stroke-width=\"1.2\"{dash}{mk}/>"
    );
    let (mx, my) = ((sx + ex) / 2, (sy + ey) / 2);
    if !r.label.is_empty() {
        out += &format!(
            "<text x=\"{mx}\" y=\"{}\" text-anchor=\"middle\" font-size=\"12\" fill=\"#475569\">{}</text>",
            my - 4,
            esc(&r.label)
        );
    }
    if !r.from_card.is_empty() {
        out += &card(sx, sy, ex, ey, &r.from_card);
    }
    if !r.to_card.is_empty() {
        out += &card(ex, ey, sx, sy, &r.to_card);
    }
    out
}

/// A multiplicity label placed just inside the `(px,py)` end, toward (qx,qy).
fn card(px: i32, py: i32, qx: i32, qy: i32, t: &str) -> String {
    let nx = px + (qx - px).signum() * 14;
    let ny = py + (qy - py).signum() * 14;
    format!(
        "<text x=\"{nx}\" y=\"{ny}\" text-anchor=\"middle\" font-size=\"11\" fill=\"#64748b\">{}</text>",
        esc(t)
    )
}

fn esc(s: &str) -> String {
    let mut o = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => o.push_str("&amp;"),
            '<' => o.push_str("&lt;"),
            '>' => o.push_str("&gt;"),
            '"' => o.push_str("&quot;"),
            _ => o.push(c),
        }
    }
    o
}
