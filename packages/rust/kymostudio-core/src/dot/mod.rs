//! Graphviz DOT → kymo importer — the inverse of [`crate::flowchart::emit::to_dot`].
//!
//! Parses the **flowchart subset** of the [DOT language](https://graphviz.org/doc/info/lang.html)
//! into the shared [`Flowchart`] IR: `digraph`/`graph` + `rankdir`, node statements
//! (`id [shape=…, style=…, label="…"]`), edges (`a -> b [label=…, style=dashed,
//! dir=none]`), and `subgraph cluster_* { … }` → subgraphs. Not a full DOT engine —
//! it covers what `to_dot` emits plus common hand-written DOT flowcharts; HTML
//! labels, ports, records and rich styling are ignored. Coordinates are assigned
//! later by `layout.rs`.

use crate::flowchart::{Direction, FlowEdge, FlowNode, Flowchart, Subgraph};
use crate::model::Shape;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DotError {
    /// No usable (non-comment) content.
    Empty,
}

impl std::fmt::Display for DotError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DotError::Empty => write!(f, "empty DOT source"),
        }
    }
}

impl std::error::Error for DotError {}

/// Map a DOT `shape`/`style` to a kymo [`Shape`] (default rectangle → `Box`;
/// `box` + a `rounded` style → stadium `Badge`).
fn shape_of(shape: &str, style: &str) -> Shape {
    match shape {
        "box" | "rect" | "rectangle" | "square" => {
            if style.contains("rounded") {
                Shape::Badge
            } else {
                Shape::Box
            }
        }
        "circle" | "doublecircle" | "ellipse" | "oval" => Shape::Circle,
        "diamond" | "Mdiamond" => Shape::Diamond,
        "hexagon" => Shape::Hex,
        "cylinder" => Shape::Cylinder,
        _ => Shape::Box,
    }
}

fn unquote(s: &str) -> &str {
    let t = s.trim();
    if t.len() >= 2 && t.starts_with('"') && t.ends_with('"') {
        &t[1..t.len() - 1]
    } else {
        t
    }
}

/// Strip a `//` or `#` line comment (outside quotes).
fn strip_comment(line: &str) -> &str {
    let b = line.as_bytes();
    let mut in_q = false;
    let mut i = 0;
    while i < b.len() {
        match b[i] {
            b'"' => in_q = !in_q,
            b'#' if !in_q => return &line[..i],
            b'/' if !in_q && i + 1 < b.len() && b[i + 1] == b'/' => return &line[..i],
            _ => {}
        }
        i += 1;
    }
    line
}

/// Parse a DOT attribute list body (`shape=box, label="x"`) into key/value pairs.
fn parse_attrs(s: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let (mut key, mut val) = (String::new(), String::new());
    let (mut in_val, mut in_q) = (false, false);
    for c in s.chars() {
        match c {
            '"' => in_q = !in_q,
            '=' if !in_q && !in_val => in_val = true,
            ',' | ';' if !in_q => {
                push_attr(&mut out, &mut key, &mut val);
                in_val = false;
            }
            _ if in_val => val.push(c),
            _ => key.push(c),
        }
    }
    push_attr(&mut out, &mut key, &mut val);
    out
}

fn push_attr(out: &mut Vec<(String, String)>, key: &mut String, val: &mut String) {
    let k = key.trim().to_string();
    if !k.is_empty() {
        out.push((k, unquote(val.trim()).to_string()));
    }
    key.clear();
    val.clear();
}

fn attr<'a>(attrs: &'a [(String, String)], key: &str) -> Option<&'a str> {
    attrs
        .iter()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.as_str())
}

struct Builder {
    fc: Flowchart,
    index: Vec<(String, usize)>,
    stack: Vec<Option<usize>>, // scope stack; Some = cluster subgraph index
}

impl Builder {
    fn touch(&mut self, id: &str, label: Option<&str>, shape: Option<Shape>) {
        if let Some((_, idx)) = self.index.iter().find(|(k, _)| k == id) {
            let n = &mut self.fc.nodes[*idx];
            if let Some(l) = label {
                n.label = l.to_string();
            }
            if let Some(s) = shape {
                n.shape = s;
            }
        } else {
            let idx = self.fc.nodes.len();
            self.fc.nodes.push(FlowNode {
                id: id.to_string(),
                label: label.unwrap_or(id).to_string(),
                shape: shape.unwrap_or(Shape::Box),
            });
            self.index.push((id.to_string(), idx));
        }
        if let Some(Some(sub)) = self.stack.last() {
            let m = &mut self.fc.subgraphs[*sub].members;
            if !m.iter().any(|x| x == id) {
                m.push(id.to_string());
            }
        }
    }
}

/// Parse DOT source into a [`Flowchart`], or fail with [`DotError`].
pub fn parse(src: &str) -> Result<Flowchart, DotError> {
    let mut b = Builder {
        fc: Flowchart {
            direction: Direction::Tb,
            nodes: Vec::new(),
            edges: Vec::new(),
            subgraphs: Vec::new(),
        },
        index: Vec::new(),
        stack: Vec::new(),
    };
    let mut saw = false;

    for raw in src.lines() {
        let mut line = strip_comment(raw).trim();
        if let Some(s) = line.strip_suffix(';') {
            line = s.trim();
        }
        if line.is_empty() {
            continue;
        }
        saw = true;

        if line == "}" {
            b.stack.pop();
            continue;
        }
        // `[strict] digraph|graph [name] {` — root scope.
        let lower = line.to_ascii_lowercase();
        if line.ends_with('{')
            && (lower.starts_with("digraph")
                || lower.starts_with("graph")
                || lower.starts_with("strict"))
        {
            b.stack.push(None);
            continue;
        }
        // `subgraph [cluster_]name {`
        if lower.starts_with("subgraph") && line.ends_with('{') {
            let name = line[8..line.len() - 1].trim();
            let id = name.strip_prefix("cluster_").unwrap_or(name).trim();
            let idx = b.fc.subgraphs.len();
            b.fc.subgraphs.push(Subgraph {
                parent: None,
                id: id.to_string(),
                title: id.to_string(),
                members: Vec::new(),
            });
            b.stack.push(Some(idx));
            continue;
        }
        // `rankdir=TB` / `rankdir = LR`
        if lower.starts_with("rankdir") {
            if let Some(v) = line.split('=').nth(1) {
                b.fc.direction = match unquote(v).trim().to_ascii_uppercase().as_str() {
                    "LR" => Direction::Lr,
                    "BT" => Direction::Bt,
                    "RL" => Direction::Rl,
                    _ => Direction::Tb,
                };
            }
            continue;
        }
        // Default attr blocks — ignored.
        if lower.starts_with("node ") || lower.starts_with("edge ") || lower.starts_with("graph ") {
            continue;
        }
        // `label="…"` inside a cluster → its title.
        if lower.starts_with("label") && line.contains('=') {
            if let Some(Some(idx)) = b.stack.last() {
                if let Some(v) = line.split_once('=').map(|x| x.1) {
                    b.fc.subgraphs[*idx].title = unquote(v).to_string();
                }
            }
            continue;
        }
        // Edge?  (digraph `->` / graph `--`).
        if line.contains("->") || line.contains("--") {
            handle_edge(&mut b, line);
            continue;
        }
        // Node statement.
        handle_node(&mut b, line);
    }

    if !saw {
        return Err(DotError::Empty);
    }
    Ok(b.fc)
}

fn split_attr_block(line: &str) -> (&str, &str) {
    match (line.find('['), line.rfind(']')) {
        (Some(o), Some(c)) if c > o => (line[..o].trim(), &line[o + 1..c]),
        _ => (line.trim(), ""),
    }
}

fn handle_edge(b: &mut Builder, line: &str) {
    let (body, attr_body) = split_attr_block(line);
    let attrs = parse_attrs(attr_body);
    let dashed = attr(&attrs, "style").is_some_and(|s| s.contains("dashed"));
    let dir_none = attr(&attrs, "dir").is_some_and(|d| d == "none");
    let label = attr(&attrs, "label").map(unquote).unwrap_or("").to_string();

    // `--` (graph) edges are arrowless; `->` (digraph) carry an arrow.
    let (sep, no_arrow_op) = if body.contains("->") {
        ("->", false)
    } else {
        ("--", true)
    };
    let segs: Vec<&str> = body
        .split(sep)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();
    for w in segs.windows(2) {
        let (a, c) = (unquote(w[0]).to_string(), unquote(w[1]).to_string());
        b.touch(&a, None, None);
        b.touch(&c, None, None);
        let lbl = if std::ptr::eq(w[1], *segs.last().unwrap()) {
            label.clone()
        } else {
            String::new()
        };
        b.fc.edges.push(FlowEdge {
            src: a,
            dst: c,
            label: lbl,
            dashed,
            no_arrow: no_arrow_op || dir_none,
        });
    }
}

fn handle_node(b: &mut Builder, line: &str) {
    let (id_part, attr_body) = split_attr_block(line);
    let id = unquote(id_part);
    if id.is_empty() || id.contains(char::is_whitespace) {
        return; // not a simple node id (keyword / unsupported statement)
    }
    let attrs = parse_attrs(attr_body);
    let label = attr(&attrs, "label").map(unquote);
    let shape = attr(&attrs, "shape").map(|sh| shape_of(sh, attr(&attrs, "style").unwrap_or("")));
    b.touch(id, label, shape);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nodes_edges_rankdir() {
        let fc = parse(
            "digraph G {\n  rankdir=LR;\n  node [fontsize=12];\n\
             A [label=\"Start\", shape=circle];\n\
             B [label=\"ok?\", shape=diamond];\n\
             A -> B [label=\"go\"];\n\
             A -> B [style=dashed];\n\
             B -> A [dir=none];\n}\n",
        )
        .unwrap();
        assert_eq!(fc.direction, Direction::Lr);
        assert_eq!(fc.nodes.len(), 2);
        assert_eq!(fc.nodes[0].label, "Start");
        assert_eq!(fc.nodes[0].shape, Shape::Circle);
        assert_eq!(fc.nodes[1].shape, Shape::Diamond);
        assert_eq!(fc.edges.len(), 3);
        assert_eq!(fc.edges[0].label, "go");
        assert!(fc.edges[1].dashed);
        assert!(fc.edges[2].no_arrow); // dir=none
    }

    #[test]
    fn cluster_and_rounded_box() {
        let fc = parse(
            "digraph G {\n  subgraph cluster_Prod {\n    label=\"Prod\";\n\
             Stage [label=\"Deploy\", shape=box, style=rounded];\n  }\n\
             Start -> Stage;\n}\n",
        )
        .unwrap();
        assert_eq!(fc.subgraphs.len(), 1);
        assert_eq!(fc.subgraphs[0].id, "Prod");
        assert_eq!(fc.subgraphs[0].title, "Prod");
        assert_eq!(fc.subgraphs[0].members, ["Stage"]);
        // `shape=box, style=rounded` → stadium Badge.
        let stage = fc.nodes.iter().find(|n| n.id == "Stage").unwrap();
        assert_eq!(stage.shape, Shape::Badge);
        assert_eq!(
            (fc.edges[0].src.as_str(), fc.edges[0].dst.as_str()),
            ("Start", "Stage")
        );
    }

    #[test]
    fn empty_is_error() {
        assert_eq!(parse("  \n // comment\n").unwrap_err(), DotError::Empty);
    }
}
