//! Render a Mermaid `mindmap`: the root in the centre with its subtrees spread
//! radially, each depth-1 branch a different saturated section colour (mermaid's
//! palette), nodes drawn in their shape (rounded / circle / hexagon / cloud /
//! bang). Real `<text>`, so PNG/PDF keep the labels.

use kymo_graph::flowchart::Flowchart;
use kymo_graph::model::Shape;
use std::collections::HashMap;

const CHAR_W: f64 = 8.6;
const LINE_H: f64 = 20.0;
const PAD_X: f64 = 14.0;
const PAD_Y: f64 = 10.0;
const WRAP_CHARS: usize = 27;
const RADIUS0: f64 = 170.0; // root → depth-1 distance
const RADIUS_STEP: f64 = 150.0; // deeper rings

struct Node {
    label: String,
    shape: Shape,
    children: Vec<usize>,
    depth: usize,
    branch: i32, // depth-1 ancestor branch index (-1 for root)
    w: f64,
    h: f64,
    x: f64,
    y: f64,
}

fn wrap(label: &str) -> Vec<String> {
    let mut lines = Vec::new();
    let mut cur = String::new();
    for w in label.split_whitespace() {
        if cur.is_empty() {
            cur = w.to_string();
        } else if cur.chars().count() + 1 + w.chars().count() <= WRAP_CHARS {
            cur.push(' ');
            cur.push_str(w);
        } else {
            lines.push(std::mem::take(&mut cur));
            cur = w.to_string();
        }
    }
    if !cur.is_empty() || lines.is_empty() {
        lines.push(cur);
    }
    lines
}

/// mermaid section colours by branch index. Returns (fill, stroke, text).
/// The root (`branch < 0`) is drawn with a solid dark blue fill (mermaid renders
/// the root darker than its section border); child sections are the light
/// `hsl(H,100%,76%)` tints with a slightly darker border.
fn section_color(branch: i32) -> (String, String, &'static str) {
    // (hue, lightness%) from mermaid's default theme section CSS.
    const SECTIONS: [(i32, f64); 11] = [
        (60, 73.5),  // section-0
        (80, 76.0),  // 1
        (270, 76.0), // 2
        (300, 76.0), // 3
        (330, 76.0), // 4
        (0, 76.0),   // 5
        (30, 76.0),  // 6
        (90, 76.0),  // 7
        (150, 76.0), // 8
        (180, 76.0), // 9
        (210, 76.0), // 10
    ];
    if branch < 0 {
        // root section--1: solid dark blue (#0000EC), no contrasting ring.
        return ("hsl(240, 100%, 46%)".into(), "hsl(240, 100%, 46%)".into(), "#ffffff");
    }
    let (h, l) = SECTIONS[(branch as usize) % SECTIONS.len()];
    let h = h as f64;
    // White text on blue/purple-ish darks, black on yellow/green/cyan lights.
    let text = if (h >= 240.0 && h <= 330.0) || h < 15.0 {
        "#ffffff"
    } else {
        "#000000"
    };
    (
        format!("hsl({h}, 100%, {l}%)"),
        format!("hsl({h}, 100%, 66%)"),
        text,
    )
}

fn node_size(label: &str, shape: Shape) -> (f64, f64) {
    let lines = wrap(label);
    let tw = lines
        .iter()
        .map(|l| l.chars().count() as f64 * CHAR_W)
        .fold(0.0_f64, f64::max);
    let th = lines.len() as f64 * LINE_H;
    match shape {
        // bang / circle: a compact ellipse sized to the text (not a giant circle).
        Shape::Circle => ((tw + 2.6 * PAD_X).max(50.0), (th + 2.2 * PAD_Y).max(40.0)),
        Shape::Hex => (tw + 4.0 * PAD_X, th + 2.0 * PAD_Y),
        _ => ((tw + 2.0 * PAD_X).max(40.0), (th + 2.0 * PAD_Y).max(34.0)),
    }
}

pub fn render(fc: &Flowchart) -> String {
    if fc.nodes.is_empty() {
        return empty_svg();
    }
    let idx: HashMap<&str, usize> = fc
        .nodes
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id.as_str(), i))
        .collect();
    let mut nodes: Vec<Node> = fc
        .nodes
        .iter()
        .map(|n| {
            let (w, h) = node_size(&n.label, n.shape);
            Node {
                label: n.label.clone(),
                shape: n.shape,
                children: Vec::new(),
                depth: 0,
                branch: -1,
                w,
                h,
                x: 0.0,
                y: 0.0,
            }
        })
        .collect();
    let mut has_parent = vec![false; nodes.len()];
    for e in &fc.edges {
        if let (Some(&p), Some(&c)) = (idx.get(e.src.as_str()), idx.get(e.dst.as_str())) {
            nodes[p].children.push(c);
            has_parent[c] = true;
        }
    }
    let root = (0..nodes.len()).find(|&i| !has_parent[i]).unwrap_or(0);

    // Depth + branch (depth-1 ancestor index) via DFS.
    assign(&mut nodes, root, 0, -1);
    // Horizontal tidy-tree: root centred, depth-1 branches split left/right,
    // each subtree stacked vertically — matches mermaid's wide spread.
    let kids = nodes[root].children.clone();
    let (mut right, mut left) = (Vec::new(), Vec::new());
    for (k, c) in kids.iter().enumerate() {
        // First child to the right; mermaid's force layout tends to keep the
        // largest/first branch on the right and alternate the rest.
        if k % 2 == 1 {
            right.push(*c);
        } else {
            left.push(*c);
        }
    }
    let rh: f64 = right.iter().map(|&c| subtree_h(&nodes, c)).sum();
    let lh: f64 = left.iter().map(|&c| subtree_h(&nodes, c)).sum();
    let total = rh.max(lh).max(nodes[root].h);
    nodes[root].x = 0.0;
    nodes[root].y = total / 2.0;
    let mut cy = (total - rh) / 2.0;
    for c in right {
        let h = subtree_h(&nodes, c);
        place_dir(&mut nodes, c, RADIUS0, cy, 1.0);
        cy += h;
    }
    let mut cy = (total - lh) / 2.0;
    for c in left {
        let h = subtree_h(&nodes, c);
        place_dir(&mut nodes, c, -RADIUS0, cy, -1.0);
        cy += h;
    }

    // Compute extent.
    let (mut minx, mut miny, mut maxx, mut maxy) = (f64::MAX, f64::MAX, f64::MIN, f64::MIN);
    for n in &nodes {
        minx = minx.min(n.x - n.w / 2.0);
        miny = miny.min(n.y - n.h / 2.0);
        maxx = maxx.max(n.x + n.w / 2.0);
        maxy = maxy.max(n.y + n.h / 2.0);
    }
    let (ox, oy) = (minx - 12.0, miny - 12.0);
    let width = (maxx - minx + 24.0).max(40.0);
    let height = (maxy - miny + 24.0).max(40.0);

    let mut body = String::new();
    // Edges first: cubic-bezier curves (mermaid mindmap draws curved branches,
    // not straight lines) — horizontal-tangent control points, coloured by branch.
    for n in nodes.iter() {
        for &c in &n.children {
            let (col, _, _) = section_color(nodes[c].branch);
            let (x1, y1) = (n.x - ox, n.y - oy);
            let (x2, y2) = (nodes[c].x - ox, nodes[c].y - oy);
            let mx = (x1 + x2) / 2.0;
            body += &format!(
                "<path d=\"M{x1:.1},{y1:.1} C{mx:.1},{y1:.1} {mx:.1},{y2:.1} {x2:.1},{y2:.1}\" \
                 fill=\"none\" stroke=\"{col}\" stroke-width=\"2\"/>"
            );
        }
    }
    for n in &nodes {
        body += &node_svg(n, ox, oy);
    }

    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {width:.0} {height:.0}\" \
         width=\"{width:.0}\" height=\"{height:.0}\" style=\"max-width:100%;height:auto\" \
         font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif\" \
         font-size=\"14\">\n<rect width=\"{width:.0}\" height=\"{height:.0}\" fill=\"#ffffff\"/>\n{body}</svg>\n"
    )
}

fn assign(nodes: &mut [Node], i: usize, depth: usize, branch: i32) {
    nodes[i].depth = depth;
    nodes[i].branch = branch;
    let children = nodes[i].children.clone();
    for (k, c) in children.iter().enumerate() {
        // depth-1 nodes each start a new branch; deeper inherit.
        let b = if depth == 0 { k as i32 } else { branch };
        assign(nodes, *c, depth + 1, b);
    }
}

/// Total vertical space a subtree occupies (leaf stacking).
fn subtree_h(nodes: &[Node], i: usize) -> f64 {
    let own = nodes[i].h + 18.0;
    let children = &nodes[i].children;
    if children.is_empty() {
        own
    } else {
        own.max(children.iter().map(|&c| subtree_h(nodes, c)).sum())
    }
}

/// Place subtree `i` at horizontal position `x`, its vertical band starting at
/// `top`, growing in direction `dir` (+1 right / −1 left). Children stack
/// vertically and sit one ring further out; the parent is centred on its band.
fn place_dir(nodes: &mut [Node], i: usize, x: f64, top: f64, dir: f64) {
    let h = subtree_h(nodes, i);
    nodes[i].x = x;
    nodes[i].y = top + h / 2.0;
    let children = nodes[i].children.clone();
    let mut cy = top;
    for c in children {
        let ch = subtree_h(nodes, c);
        place_dir(nodes, c, x + dir * RADIUS_STEP, cy, dir);
        cy += ch;
    }
}

fn node_svg(n: &Node, ox: f64, oy: f64) -> String {
    let cx = n.x - ox;
    let cy = n.y - oy;
    let (x, y) = (cx - n.w / 2.0, cy - n.h / 2.0);
    let (fill, stroke, text_col) = section_color(n.branch);
    let shape = match n.shape {
        Shape::Circle => format!(
            "<ellipse cx=\"{cx:.1}\" cy=\"{cy:.1}\" rx=\"{:.1}\" ry=\"{:.1}\" fill=\"{fill}\" stroke=\"{stroke}\"/>",
            n.w / 2.0,
            n.h / 2.0
        ),
        Shape::Hex => {
            let q = n.h / 2.0;
            format!(
                "<polygon points=\"{:.1},{cy:.1} {:.1},{:.1} {:.1},{:.1} {:.1},{cy:.1} {:.1},{:.1} {:.1},{:.1}\" fill=\"{fill}\" stroke=\"{stroke}\"/>",
                x, x + q, y, x + n.w - q, y, x + n.w, x + n.w - q, y + n.h, x + q, y + n.h
            )
        }
        _ => format!(
            "<rect x=\"{x:.1}\" y=\"{y:.1}\" width=\"{:.1}\" height=\"{:.1}\" rx=\"5\" fill=\"{fill}\" stroke=\"{stroke}\"/>",
            n.w, n.h
        ),
    };
    let lines = wrap(&n.label);
    let y0 = cy - (lines.len() as f64 - 1.0) * LINE_H / 2.0;
    let mut text = String::new();
    for (li, line) in lines.iter().enumerate() {
        text += &format!(
            "<text x=\"{cx:.1}\" y=\"{:.1}\" text-anchor=\"middle\" dominant-baseline=\"central\" fill=\"{text_col}\">{}</text>",
            y0 + li as f64 * LINE_H,
            esc(line)
        );
    }
    shape + &text
}

fn empty_svg() -> String {
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 40 40\" width=\"40\" height=\"40\"></svg>\n"
        .to_string()
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
