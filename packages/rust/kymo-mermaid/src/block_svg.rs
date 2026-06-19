//! Render a Mermaid `block` / `block-beta` diagram as its real column grid,
//! using kymo's own [`kymo_layout_graph::grid`] layout (pure Rust, no merman):
//! parse → grid tree → layout → raster-safe SVG.

use kymo_layout_graph::grid::{layout, Cell, Grid, Item, Placed};
use std::collections::HashMap;

/// Parse block source → a kymo-layout grid tree + edge list.
fn parse(src: &str) -> (Grid, Vec<(String, String, String)>) {
    let lines: Vec<String> = src.lines().map(|l| strip(l).trim().to_string()).collect();
    let mut edges = Vec::new();
    let mut stack: Vec<Grid> = vec![Grid { columns: 0, items: Vec::new(), label: String::new() }];
    let mut started = false;
    for line in &lines {
        if line.is_empty() {
            continue;
        }
        if !started {
            started = true;
            continue;
        }
        let low = line.to_ascii_lowercase();
        if let Some(rest) = low.strip_prefix("columns") {
            if let Ok(c) = rest.trim().parse::<usize>() {
                stack.last_mut().unwrap().columns = c;
            }
            continue;
        }
        if low == "end" {
            if stack.len() > 1 {
                let g = stack.pop().unwrap();
                stack.last_mut().unwrap().items.push(Item::Grid(g));
            }
            continue;
        }
        if low == "space" || low.starts_with("space:") {
            let sp = low.strip_prefix("space:").and_then(|s| s.trim().parse().ok()).unwrap_or(1);
            stack.last_mut().unwrap().items.push(Item::Space(sp));
            continue;
        }
        if low.starts_with("style ") || low.starts_with("classdef ") || low.starts_with("class ") || low.starts_with("click ") {
            continue;
        }
        if low == "block" || low.starts_with("block:") || low.starts_with("block ") {
            let colon = low.starts_with("block:");
            let rest = line
                .strip_prefix("block:")
                .or_else(|| line.strip_prefix("block "))
                .or_else(|| line.strip_prefix("BLOCK "))
                .unwrap_or("");
            // `block:id` → the id labels the group; `block id …` → id and any
            // trailing tokens are cells inside the new (anonymous) block.
            let label = if colon {
                tokenize(rest).into_iter().next().map(|(_, l, _, _)| l).unwrap_or_default()
            } else {
                String::new()
            };
            stack.push(Grid { columns: 0, items: Vec::new(), label });
            if !colon {
                for (id, l, span, shape) in tokenize(rest) {
                    push_token(stack.last_mut().unwrap(), id, l, span, shape);
                }
            }
            continue;
        }
        if is_arrow(line) {
            if let Some(e) = parse_edge(line) {
                edges.push(e);
            }
            continue;
        }
        for (id, label, span, shape) in tokenize(line) {
            push_token(stack.last_mut().unwrap(), id, label, span, shape);
        }
    }
    while stack.len() > 1 {
        let g = stack.pop().unwrap();
        stack.last_mut().unwrap().items.push(Item::Grid(g));
    }
    (stack.pop().unwrap(), edges)
}

pub fn render(src: &str) -> String {
    let (grid, edges) = parse(src);
    let (placed, w, h) = layout(&grid);
    let width = w.max(40.0);
    let height = h.max(40.0);
    // id → box (cx, cy, w, h) so edges can clip to the border.
    let mut pos: HashMap<String, (f64, f64, f64, f64)> = HashMap::new();
    let mut body = String::new();
    for p in placed.iter().filter(|p| p.container) {
        body += &rect(p, "#ffffff", "#9370DB", true);
    }
    for p in placed.iter().filter(|p| !p.container) {
        if !p.id.is_empty() {
            pos.insert(p.id.clone(), (p.x + p.w / 2.0, p.y + p.h / 2.0, p.w, p.h));
        }
        body += &rect(p, "#ECECFF", "#9370DB", false);
    }
    for (s, d, lbl) in &edges {
        if let (Some(&a), Some(&b)) = (pos.get(s), pos.get(d)) {
            // Clip both ends to the box borders so the arrow doesn't cut through.
            let (x1, y1) = border_pt(a, (b.0, b.1));
            let (x2, y2) = border_pt(b, (a.0, a.1));
            body += &format!(
                "<line x1=\"{x1:.1}\" y1=\"{y1:.1}\" x2=\"{x2:.1}\" y2=\"{y2:.1}\" stroke=\"#333333\" \
                 stroke-width=\"1.4\" marker-end=\"url(#blk-arrow)\"/>"
            );
            if !lbl.is_empty() {
                body += &format!("<text x=\"{:.1}\" y=\"{:.1}\" text-anchor=\"middle\" font-size=\"12\" fill=\"#333\">{}</text>", (x1 + x2) / 2.0, (y1 + y2) / 2.0 - 4.0, esc(lbl));
            }
        }
    }
    const DEFS: &str = "<marker id=\"blk-arrow\" markerWidth=\"12\" markerHeight=\"10\" refX=\"9\" refY=\"5\" \
orient=\"auto\" markerUnits=\"userSpaceOnUse\"><path d=\"M1,1 L10,5 L1,9 Z\" fill=\"#333333\"/></marker>";
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {width:.0} {height:.0}\" width=\"{width:.0}\" height=\"{height:.0}\" \
         style=\"max-width:100%;height:auto\" font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif\" font-size=\"14\">\n\
         <defs>{DEFS}</defs>\n<rect width=\"{width:.0}\" height=\"{height:.0}\" fill=\"#ffffff\"/>\n{body}</svg>\n"
    )
}

/// Intersection of the line from box centre `(cx,cy,w,h)` toward `(tx,ty)` with
/// the box border.
fn border_pt((cx, cy, w, h): (f64, f64, f64, f64), (tx, ty): (f64, f64)) -> (f64, f64) {
    let (dx, dy) = (tx - cx, ty - cy);
    if dx == 0.0 && dy == 0.0 {
        return (cx, cy);
    }
    let sx = if dx != 0.0 { (w / 2.0) / dx.abs() } else { f64::INFINITY };
    let sy = if dy != 0.0 { (h / 2.0) / dy.abs() } else { f64::INFINITY };
    let s = sx.min(sy);
    (cx + dx * s, cy + dy * s)
}

fn rect(p: &Placed, fill: &str, stroke: &str, container: bool) -> String {
    let (x, y, w, h) = (p.x, p.y, p.w, p.h);
    let (cx, cy) = (x + w / 2.0, y + h / 2.0);
    let pen = format!("fill=\"{fill}\" stroke=\"{stroke}\" stroke-width=\"1\"");
    let mut s = match p.shape.as_str() {
        "diamond" => format!(
            "<polygon points=\"{cx:.1},{:.1} {:.1},{cy:.1} {cx:.1},{:.1} {:.1},{cy:.1}\" {pen}/>",
            y, x + w, y + h, x
        ),
        "hexagon" => {
            let q = w * 0.18;
            format!(
                "<polygon points=\"{:.1},{y:.1} {:.1},{y:.1} {:.1},{cy:.1} {:.1},{:.1} {:.1},{:.1} {:.1},{cy:.1}\" {pen}/>",
                x + q, x + w - q, x + w, x + w - q, y + h, x + q, y + h, x
            )
        }
        "circle" => format!(
            "<ellipse cx=\"{cx:.1}\" cy=\"{cy:.1}\" rx=\"{:.1}\" ry=\"{:.1}\" {pen}/>",
            w / 2.0, h / 2.0
        ),
        "rounded" => format!(
            "<rect x=\"{x:.1}\" y=\"{y:.1}\" width=\"{w:.1}\" height=\"{h:.1}\" rx=\"{:.1}\" {pen}/>",
            h / 2.0
        ),
        // rectangle with a left inverted-arrow flag
        "rect-larrow" => {
            let n = (h / 2.0).min(10.0);
            format!(
                "<path d=\"M {:.1} {y:.1} H {:.1} V {:.1} H {:.1} L {x:.1} {cy:.1} Z\" {pen}/>",
                x + n, x + w, y + h, x + n
            )
        }
        _ => format!(
            "<rect x=\"{x:.1}\" y=\"{y:.1}\" width=\"{w:.1}\" height=\"{h:.1}\" rx=\"3\" {pen}/>"
        ),
    };
    if !p.label.is_empty() {
        let (ty, base) = if container {
            (p.y + 14.0, "")
        } else {
            (p.y + p.h / 2.0, " dominant-baseline=\"central\"")
        };
        s += &format!(
            "<text x=\"{:.1}\" y=\"{ty:.1}\" text-anchor=\"middle\"{base} fill=\"#131300\">{}</text>",
            p.x + p.w / 2.0,
            esc(&p.label)
        );
    }
    s
}

/// Push one tokenized item into a grid: `space` → a gap, else a cell (a bare id
/// shows its own id as the label).
fn push_token(g: &mut Grid, id: String, label: String, span: usize, shape: String) {
    if id == "space" {
        g.items.push(Item::Space(span));
        return;
    }
    let label = if label.is_empty() { id.clone() } else { label };
    g.items.push(Item::Cell(Cell { id, label, span, shape }));
}

fn strip(l: &str) -> &str {
    match l.find("%%") {
        Some(i) => &l[..i],
        None => l,
    }
}
fn is_arrow(line: &str) -> bool {
    let m = mask(line);
    let c: Vec<char> = m.chars().collect();
    let mut i = 0;
    while i < c.len() {
        if matches!(c[i], '-' | '=' | '.' | '<' | '>') {
            let mut j = i;
            while j < c.len() && matches!(c[j], '-' | '=' | '.' | '<' | '>') {
                j += 1;
            }
            let r: String = c[i..j].iter().collect();
            if r.len() >= 2 && (r.contains('-') || r.contains('=') || r.contains('.')) {
                return true;
            }
            i = j;
        } else {
            i += 1;
        }
    }
    false
}
fn mask(line: &str) -> String {
    let mut o = String::new();
    let mut d = 0i32;
    let mut q = false;
    for c in line.chars() {
        match c {
            '"' => {
                q = !q;
                o.push(' ');
            }
            _ if q => o.push(' '),
            '[' | '(' | '{' => {
                d += 1;
                o.push(' ');
            }
            ']' | ')' | '}' => {
                d = (d - 1).max(0);
                o.push(' ');
            }
            _ if d > 0 => o.push(' '),
            _ => o.push(c),
        }
    }
    o
}
fn parse_edge(line: &str) -> Option<(String, String, String)> {
    let masked = mask(line);
    let pos = masked.find(['-', '=', '.'])?;
    let c: Vec<char> = masked.chars().collect();
    let mut end = pos;
    while end < c.len() && matches!(c[end], '-' | '=' | '.' | '<' | '>') {
        end += 1;
    }
    let label = {
        let mut it = line.match_indices('"');
        match (it.next(), it.next()) {
            (Some((a, _)), Some((b, _))) => line[a + 1..b].to_string(),
            _ => String::new(),
        }
    };
    let src = tokenize(&line[..pos]).into_iter().last().map(|(id, _, _, _)| id)?;
    let dst = tokenize(&line[end..]).into_iter().next().map(|(id, _, _, _)| id)?;
    if src.is_empty() || dst.is_empty() {
        return None;
    }
    Some((src, dst, label))
}
fn tokenize(line: &str) -> Vec<(String, String, usize, String)> {
    let chars: Vec<char> = line.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        if chars[i].is_whitespace() {
            i += 1;
            continue;
        }
        let s = i;
        while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_' || chars[i] == '-' || chars[i] == '.') {
            i += 1;
        }
        let id: String = chars[s..i].iter().collect();
        let mut label = String::new();
        let mut shape = String::new();
        // `id>"label"]` — rectangle with a left inverted arrow (flag).
        if i < chars.len() && chars[i] == '>' {
            shape = "rect-larrow".to_string();
            i += 1;
            if i < chars.len() && chars[i] == '"' {
                let st = i + 1;
                i += 1;
                while i < chars.len() && chars[i] != '"' {
                    i += 1;
                }
                label = crate::mermaid::decode_entities(&chars[st..i].iter().collect::<String>());
                if i < chars.len() {
                    i += 1; // closing "
                }
                if i < chars.len() && chars[i] == ']' {
                    i += 1;
                }
            }
        }
        if i < chars.len() && matches!(chars[i], '[' | '(' | '{') {
            let open = chars[i];
            let dbl = chars.get(i + 1) == Some(&open);
            if shape.is_empty() {
                shape = match (open, dbl) {
                    ('{', true) => "hexagon",
                    ('{', false) => "diamond",
                    ('(', true) => "circle",
                    ('(', false) => "rounded",
                    _ => "rect",
                }
                .to_string();
            }
            let mut d = 0i32;
            let st = i;
            while i < chars.len() {
                match chars[i] {
                    '[' | '(' | '{' => d += 1,
                    ']' | ')' | '}' => {
                        d -= 1;
                        if d == 0 {
                            i += 1;
                            break;
                        }
                    }
                    _ => {}
                }
                i += 1;
            }
            let raw = chars[st..i]
                .iter()
                .collect::<String>()
                .trim_matches(|c| matches!(c, '[' | ']' | '(' | ')' | '{' | '}'))
                .trim()
                .trim_matches('"')
                .to_string();
            label = crate::mermaid::decode_entities(&raw);
        }
        if i < chars.len() && chars[i] == '<' {
            while i < chars.len() && chars[i] != '>' {
                i += 1;
            }
            if i < chars.len() {
                i += 1;
            }
        }
        if i < chars.len() && chars[i] == '(' {
            while i < chars.len() && chars[i] != ')' {
                i += 1;
            }
            if i < chars.len() {
                i += 1;
            }
        }
        let mut span = 1usize;
        if i < chars.len() && chars[i] == ':' {
            i += 1;
            let ds = i;
            while i < chars.len() && chars[i].is_ascii_digit() {
                i += 1;
            }
            span = chars[ds..i].iter().collect::<String>().parse().unwrap_or(1);
        }
        if !id.is_empty() {
            out.push((id, label, span, shape));
        } else {
            i += 1;
        }
    }
    out
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
