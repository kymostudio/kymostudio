//! Render a [`ClassDiagram`] to SVG. Classes become multi-compartment boxes
//! (name + attributes + methods), positioned by reusing
//! [`kymo_graph::layout::layout_flowchart`]; relationships draw the UML arrowhead for
//! their kind. Everything is real `<text>`, so PNG/PDF keep the labels.

use super::{ClassBox, ClassDiagram, Crow, RelKind, Relation};
use kymo_graph::flowchart::{FlowEdge, FlowNode, Flowchart, Subgraph};
use kymo_graph::layout;
use kymo_graph::model::{Component, Shape};
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
    for c in &cd.classes {
        if let Some(comp) = by_id.get(c.id.as_str()) {
            body += &if cd.er {
                er_box_svg(c, comp)
            } else {
                box_svg(c, comp)
            };
        }
    }
    for (i, n) in cd.notes.iter().enumerate() {
        if let Some(comp) = by_id.get(format!("__note{i}").as_str()) {
            body += &note_box(&n.text, comp);
        }
    }
    // Edges last: UML heads + multiplicity must sit on top of the boxes.
    for r in &cd.relations {
        if let (Some(a), Some(b)) = (by_id.get(r.from.as_str()), by_id.get(r.to.as_str())) {
            body += &edge_svg(r, a, b);
        }
    }

    let (w, h) = (dia.width.max(40), dia.height.max(40));
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {w} {h}\" width=\"{w}\" height=\"{h}\" \
         style=\"max-width:100%;height:auto\" font-family=\"{FONT}\" font-size=\"13\">\n\
         <defs>{DEFS}</defs>\n<rect width=\"{w}\" height=\"{h}\" fill=\"#ffffff\"/>\n{body}</svg>\n"
    )
}

/// Render an `erDiagram` at externally-supplied entity positions (from merman's
/// mermaid-exact ER layout) — reuses the 2-column table + relationship drawing,
/// so entity boxes land where mermaid.js puts them. `pos`: id → (cx, cy, w, h).
pub fn render_er_positioned(cd: &ClassDiagram, pos: &HashMap<String, (i32, i32, i32, i32)>) -> String {
    use kymo_graph::model::Accent;
    let mk = |id: &str| -> Option<Component> {
        pos.get(id).map(|&(cx, cy, w, h)| Component {
            id: id.to_string(),
            name: String::new(),
            subtitle: String::new(),
            icon: String::new(),
            shape: Shape::Box,
            accent: Accent::Blue,
            pos: (cx, cy),
            size: Some((w, h)),
            parent: None,
            align: None,
            align_gap: 0,
            align_offset: (0, 0),
            label_box: None,
        })
    };
    let comps: HashMap<&str, Component> = cd
        .classes
        .iter()
        .filter_map(|c| mk(&c.id).map(|cc| (c.id.as_str(), cc)))
        .collect();
    let mut body = String::new();
    for c in &cd.classes {
        if let Some(cc) = comps.get(c.id.as_str()) {
            body += &er_box_svg(c, cc);
        }
    }
    for r in &cd.relations {
        if let (Some(a), Some(b)) = (comps.get(r.from.as_str()), comps.get(r.to.as_str())) {
            body += &edge_svg(r, a, b);
        }
    }
    let (mut w, mut h) = (40, 40);
    for cc in comps.values() {
        let (cw, ch) = cc.size.unwrap_or((120, 60));
        w = w.max(cc.pos.0 + cw / 2 + 8);
        h = h.max(cc.pos.1 + ch / 2 + 8);
    }
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {w} {h}\" width=\"{w}\" height=\"{h}\" \
         style=\"max-width:100%;height:auto\" font-family=\"{FONT}\" font-size=\"13\">\n\
         <defs>{DEFS}</defs>\n<rect width=\"{w}\" height=\"{h}\" fill=\"#ffffff\"/>\n{body}</svg>\n"
    )
}

/// Render an `erDiagram` with kymo's own **dagre** layout (mermaid-faithful
/// entity placement, pure Rust — no merman): size each entity by its table
/// text, lay out with `layout_dagre`, then draw the 2-column tables in place.
pub fn render_er_dagre(cd: &ClassDiagram) -> String {
    use kymo_graph::style::FlowStyle;
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
            no_arrow: true,
        });
    }
    let geom = kymo_graph::layout_dagre::dagre_geom(&fc, FlowStyle::Mermaid);
    let pos: HashMap<String, (i32, i32, i32, i32)> = geom
        .nodes
        .iter()
        .map(|n| (n.id.clone(), (n.cx as i32, n.cy as i32, n.w as i32, n.h as i32)))
        .collect();
    render_er_positioned(cd, &pos)
}

/// The multi-line text used only to size the box (one line per rendered row).
fn box_label(c: &ClassBox) -> String {
    let mut lines = Vec::new();
    if !c.stereotype.is_empty() {
        lines.push(format!("<<{}>>", c.stereotype));
    }
    lines.push(c.name.clone());
    for a in &c.attributes {
        lines.push(generics(a));
    }
    for m in &c.methods {
        lines.push(method_label(m));
    }
    lines.join("\n")
}

/// Mermaid generics markup: `List~int~` → `List<int>` (toggle `~` to `<` / `>`).
fn generics(s: &str) -> String {
    if !s.contains('~') {
        return s.to_string();
    }
    let mut o = String::with_capacity(s.len());
    let mut open = true;
    for c in s.chars() {
        if c == '~' {
            o.push(if open { '<' } else { '>' });
            open = !open;
        } else {
            o.push(c);
        }
    }
    o
}

/// A method row as mermaid prints it: `name(params) : ReturnType` (insert the
/// ` : ` return separator), with generics resolved.
fn method_label(s: &str) -> String {
    let g = generics(s);
    if let Some(p) = g.find(')') {
        let (head, tail) = g.split_at(p + 1);
        let tail = tail.trim_start();
        if !tail.is_empty() && !tail.starts_with(':') {
            return format!("{head} : {tail}");
        }
    }
    g
}

fn box_svg(c: &ClassBox, comp: &Component) -> String {
    let (cx, cy) = comp.pos;
    let (w, h) = comp.size.unwrap_or((120, 60));
    let (x, y) = (cx - w / 2, cy - h / 2);
    let mut out = format!(
        "<rect x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"2\" fill=\"#ECECFF\" \
         stroke=\"#9370DB\" stroke-width=\"1.2\"/>"
    );
    let mut ty = y + 4;
    if !c.stereotype.is_empty() {
        ty += LINE_H - 4;
        out += &format!(
            "<text x=\"{cx}\" y=\"{ty}\" text-anchor=\"middle\" font-size=\"11\" fill=\"#333333\">{}</text>",
            esc(&format!("«{}»", c.stereotype))
        );
        ty += 4;
    }
    ty += LINE_H - 4;
    out += &format!(
        "<text x=\"{cx}\" y=\"{ty}\" text-anchor=\"middle\" font-weight=\"700\" fill=\"#131300\">{}</text>",
        esc(&c.name)
    );
    ty += 6;
    let row = |ty: i32, t: &str| {
        format!(
            "<text x=\"{}\" y=\"{ty}\" fill=\"#131300\">{}</text>",
            x + 6,
            esc(t)
        )
    };
    out += &divider(x, ty, w);
    for a in &c.attributes {
        ty += LINE_H;
        out += &row(ty, &generics(a));
    }
    out += &divider(x, ty + 6, w);
    for m in &c.methods {
        ty += LINE_H;
        out += &row(ty, &method_label(m));
    }
    out
}

/// Render an `erDiagram` entity: a purple title band over a 2-column attribute
/// table (type | name), with a row divider per attribute and a vertical column
/// divider — the mermaid ER look, not the single-column class box.
fn er_box_svg(c: &ClassBox, comp: &Component) -> String {
    let (cx, cy) = comp.pos;
    let (w, h) = comp.size.unwrap_or((120, 60));
    let (x, y) = (cx - w / 2, cy - h / 2);
    let header_h = 24;
    let mut out = format!(
        "<rect x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" fill=\"#ffffff\" \
         stroke=\"#9370DB\" stroke-width=\"1\"/>\
         <rect x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{header_h}\" fill=\"#ECECFF\" \
         stroke=\"#9370DB\" stroke-width=\"1\"/>\
         <text x=\"{cx}\" y=\"{}\" text-anchor=\"middle\" dominant-baseline=\"central\" \
         font-weight=\"700\" fill=\"#333333\">{}</text>",
        y + header_h / 2,
        esc(&c.name)
    );
    let n = c.attributes.len() as i32;
    if n == 0 {
        return out;
    }
    // Each attribute is "type name [keys] [comment]" → col1 = type, col2 = rest.
    let rows: Vec<(&str, &str)> = c
        .attributes
        .iter()
        .map(|a| match a.trim().split_once(char::is_whitespace) {
            Some((t, r)) => (t, r.trim()),
            None => (a.trim(), ""),
        })
        .collect();
    let typew = rows.iter().map(|(t, _)| t.chars().count()).max().unwrap_or(4) as i32;
    let col_x = (x + typew * 7 + 12).clamp(x + 30, x + w - 30);
    let avail = h - header_h;
    let row_h = (avail / n).max(1);
    for (i, (t, r)) in rows.iter().enumerate() {
        let ry = y + header_h + i as i32 * row_h;
        let mid = ry + row_h / 2;
        out += &format!(
            "<line x1=\"{x}\" y1=\"{ry}\" x2=\"{}\" y2=\"{ry}\" stroke=\"#9370DB\" stroke-width=\"1\"/>\
             <text x=\"{}\" y=\"{mid}\" dominant-baseline=\"central\" fill=\"#333333\">{}</text>\
             <text x=\"{}\" y=\"{mid}\" dominant-baseline=\"central\" fill=\"#333333\">{}</text>",
            x + w,
            x + 6,
            esc(t),
            col_x + 6,
            esc(r)
        );
    }
    out += &format!(
        "<line x1=\"{col_x}\" y1=\"{}\" x2=\"{col_x}\" y2=\"{}\" stroke=\"#9370DB\" stroke-width=\"1\"/>",
        y + header_h,
        y + h
    );
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
        "<line x1=\"{x}\" y1=\"{ty}\" x2=\"{}\" y2=\"{ty}\" stroke=\"#9370DB\" stroke-width=\"1\"/>",
        x + w
    )
}

fn edge_svg(r: &Relation, a: &Component, b: &Component) -> String {
    // Clip the centre-to-centre line to each box border so the UML head lands
    // on the edge (visible) instead of buried in the target box centre.
    let (acx, acy) = a.pos;
    let (bcx, bcy) = b.pos;
    let (aw, ah) = a.size.unwrap_or((120, 60));
    let (bw, bh) = b.size.unwrap_or((120, 60));
    let (sx, sy) = border_point(acx, acy, aw / 2, ah / 2, bcx, bcy);
    let (ex, ey) = border_point(bcx, bcy, bw / 2, bh / 2, acx, acy);
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
    if r.from_crow != Crow::None || r.to_crow != Crow::None {
        let len = (((ex - sx) as f64).powi(2) + ((ey - sy) as f64).powi(2))
            .sqrt()
            .max(1.0);
        let (ux, uy) = ((ex - sx) as f64 / len, (ey - sy) as f64 / len);
        out += &crow_end(sx, sy, ux, uy, r.from_crow);
        out += &crow_end(ex, ey, -ux, -uy, r.to_crow);
    }
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

/// Draw an ER crow's-foot glyph at entity border `(ex,ey)`; `(ux,uy)` is the
/// unit vector pointing away from the entity into the relationship gap.
fn crow_end(ex: i32, ey: i32, ux: f64, uy: f64, card: Crow) -> String {
    if card == Crow::None {
        return String::new();
    }
    let (px, py) = (-uy, ux); // perpendicular
    let pt = |d: f64, off: f64| {
        (
            (ex as f64 + ux * d + px * off).round() as i32,
            (ey as f64 + uy * d + py * off).round() as i32,
        )
    };
    let seg = |a: (i32, i32), b: (i32, i32)| {
        format!(
            "<line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" stroke=\"#334155\" stroke-width=\"1.2\"/>",
            a.0, a.1, b.0, b.1
        )
    };
    let bar = |d: f64| seg(pt(d, 7.0), pt(d, -7.0));
    let foot = || {
        let apex = pt(16.0, 0.0);
        seg(apex, pt(0.0, 7.0)) + &seg(apex, pt(0.0, 0.0)) + &seg(apex, pt(0.0, -7.0))
    };
    let circle = |d: f64| {
        let (cx, cy) = pt(d, 0.0);
        format!(
            "<circle cx=\"{cx}\" cy=\"{cy}\" r=\"5\" fill=\"#ffffff\" stroke=\"#334155\" stroke-width=\"1.2\"/>"
        )
    };
    match card {
        Crow::One => bar(7.0) + &bar(13.0),
        Crow::ZeroOne => bar(7.0) + &circle(16.0),
        Crow::OneMany => foot() + &bar(20.0),
        Crow::ZeroMany => foot() + &circle(23.0),
        Crow::None => String::new(),
    }
}

/// Border intersection of the ray from box centre `(cx,cy)` toward `(tx,ty)`.
fn border_point(cx: i32, cy: i32, hw: i32, hh: i32, tx: i32, ty: i32) -> (i32, i32) {
    let dx = (tx - cx) as f64;
    let dy = (ty - cy) as f64;
    if dx == 0.0 && dy == 0.0 {
        return (cx, cy);
    }
    let sx = if dx != 0.0 {
        hw as f64 / dx.abs()
    } else {
        f64::INFINITY
    };
    let sy = if dy != 0.0 {
        hh as f64 / dy.abs()
    } else {
        f64::INFINITY
    };
    let s = sx.min(sy);
    (cx + (dx * s).round() as i32, cy + (dy * s).round() as i32)
}

/// A multiplicity label just outside the `(px,py)` box border, toward `(qx,qy)`.
fn card(px: i32, py: i32, qx: i32, qy: i32, t: &str) -> String {
    let dx = (qx - px) as f64;
    let dy = (qy - py) as f64;
    let len = (dx * dx + dy * dy).sqrt().max(1.0);
    let (ux, uy) = (dx / len, dy / len);
    let nx = (px as f64 + ux * 12.0 - uy * 9.0).round() as i32;
    let ny = (py as f64 + uy * 12.0 + ux * 9.0).round() as i32;
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
