//! D2 → kymo importer (front-end) — the inverse of [`crate::flowchart::emit::to_d2`].
//!
//! Parses the **flowchart subset** of [D2](https://d2lang.com) into the shared
//! [`Flowchart`] IR (direction, nodes with shapes, edges with labels/dash,
//! containers → subgraphs). It is not a full D2 implementation — it covers what
//! `to_d2` emits plus common hand-written D2 flowcharts. Anything unrecognised is
//! skipped, so a richer D2 file still imports its graph skeleton.
//!
//! Like the Mermaid importer, coordinates are NOT assigned here — `layout.rs` does
//! that. From the IR the usual back-ends apply (`layout_flowchart` → render / kymojson).

use crate::flowchart::{Direction, FlowEdge, FlowNode, Flowchart, Subgraph};
use crate::model::Shape;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum D2Error {
    /// No usable (non-comment) content.
    Empty,
}

impl std::fmt::Display for D2Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            D2Error::Empty => write!(f, "empty D2 source"),
        }
    }
}

impl std::error::Error for D2Error {}

/// Map a D2 `shape:` keyword to a kymo [`Shape`] (default rectangle → `Box`).
fn shape_of(kw: &str) -> Shape {
    match kw.trim() {
        "circle" => Shape::Circle,
        "diamond" => Shape::Diamond,
        "hexagon" => Shape::Hex,
        "cylinder" | "stored_data" | "page" => Shape::Cylinder,
        "oval" => Shape::Badge,
        _ => Shape::Box, // rectangle / square / unknown
    }
}

/// The leaf of a possibly container-qualified id (`g.a` → `a`).
fn leaf(id: &str) -> &str {
    id.rsplit('.').next().unwrap_or(id).trim()
}

/// Strip one surrounding pair of double quotes.
fn unquote(s: &str) -> &str {
    let t = s.trim();
    if t.len() >= 2 && t.starts_with('"') && t.ends_with('"') {
        &t[1..t.len() - 1]
    } else {
        t
    }
}

/// Strip a `# …` line comment (outside quotes — kept simple).
fn strip_comment(line: &str) -> &str {
    let mut in_q = false;
    for (i, c) in line.char_indices() {
        match c {
            '"' => in_q = !in_q,
            '#' if !in_q => return &line[..i],
            _ => {}
        }
    }
    line
}

const CONNECTORS: &[(&str, bool, bool)] = &[
    // (token, reversed, no_arrow) — longest first.
    ("<->", false, false),
    ("->", false, false),
    ("<-", true, false),
    ("--", false, true),
];

struct Builder {
    fc: Flowchart,
    index: Vec<(String, usize)>, // id → fc.nodes index
    stack: Vec<usize>,           // open subgraph indices
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
        if let Some(&sub) = self.stack.last() {
            let m = &mut self.fc.subgraphs[sub].members;
            if !m.iter().any(|x| x == id) {
                m.push(id.to_string());
            }
        }
    }
}

/// Parse D2 source into a [`Flowchart`], or fail with [`D2Error`].
pub fn parse(src: &str) -> Result<Flowchart, D2Error> {
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
    let mut auto = 0usize;

    for raw in src.lines() {
        let line = strip_comment(raw).trim();
        if line.is_empty() {
            continue;
        }
        saw = true;

        if line == "}" {
            b.stack.pop();
            continue;
        }

        // `direction: down|up|right|left` (top level only).
        if let Some(rest) = line.strip_prefix("direction:") {
            if b.stack.is_empty() {
                b.fc.direction = match rest.trim() {
                    "up" => Direction::Bt,
                    "right" => Direction::Lr,
                    "left" => Direction::Rl,
                    _ => Direction::Tb, // down
                };
            }
            continue;
        }

        // Edge? (has a connector token, surrounded by spaces).
        if let Some(()) = handle_edge(&mut b, line) {
            continue;
        }

        // Container open: `id[: "title"] {` with no closing brace on the line.
        if line.ends_with('{') && !line.contains('}') {
            let head = line[..line.len() - 1].trim();
            let (id, title) = split_key_label(head);
            let id = if id.is_empty() {
                auto += 1;
                format!("g{auto}")
            } else {
                leaf(id).to_string()
            };
            let title = title.unwrap_or_else(|| id.clone());
            let sub_idx = b.fc.subgraphs.len();
            b.fc.subgraphs.push(Subgraph {
                parent: None,
                id: id.clone(),
                title,
                members: Vec::new(),
            });
            b.stack.push(sub_idx);
            continue;
        }

        // Node declaration (optionally with an inline `{ … }` attribute block).
        handle_node(&mut b, line);
    }

    if !saw {
        return Err(D2Error::Empty);
    }
    Ok(b.fc)
}

/// Locate a connector token only when flanked by whitespace (so `a-b` ids are safe).
fn find_connector(s: &str, tok: &str) -> Option<usize> {
    let bytes = s.as_bytes();
    let mut i = 0;
    while let Some(rel) = s[i..].find(tok) {
        let at = i + rel;
        let before_ok = at == 0 || bytes[at - 1] == b' ';
        let after = at + tok.len();
        let after_ok = after >= s.len() || bytes[after] == b' ';
        if before_ok && after_ok {
            return Some(at);
        }
        i = at + 1;
    }
    None
}

/// Try to parse `line` as an edge (or chain `A -> B -> C`); on success pushes the
/// edge(s) and returns `Some(())`.
fn handle_edge(b: &mut Builder, line: &str) -> Option<()> {
    // Peel a trailing inline `{ … }` block (carries `style.stroke-dash`).
    let (body, dashed) = match line.rfind('{') {
        Some(i) if line.ends_with('}') => (line[..i].trim(), line[i..].contains("stroke-dash")),
        _ => (line, false),
    };
    // Tokenize into id segments separated by connectors.
    let mut segs: Vec<&str> = Vec::new();
    let mut ops: Vec<(bool, bool)> = Vec::new(); // (reversed, no_arrow)
    let mut cur = body;
    loop {
        let next = CONNECTORS
            .iter()
            .filter_map(|&(t, r, n)| find_connector(cur, t).map(|i| (i, t, r, n)))
            .min_by_key(|&(i, _, _, _)| i);
        match next {
            Some((i, t, r, n)) => {
                segs.push(cur[..i].trim());
                ops.push((r, n));
                cur = cur[i + t.len()..].trim_start();
            }
            None => {
                segs.push(cur.trim());
                break;
            }
        }
    }
    if ops.is_empty() {
        return None; // no connector → not an edge
    }
    // The last segment may carry a trailing `: label`.
    let last = segs.len() - 1;
    let mut label = String::new();
    if let Some(j) = segs[last].find(':') {
        label = unquote(segs[last][j + 1..].trim()).to_string();
        segs[last] = segs[last][..j].trim();
    }
    for k in 0..ops.len() {
        let (rev, no_arrow) = ops[k];
        let a = leaf(segs[k]).to_string();
        let c = leaf(segs[k + 1]).to_string();
        if a.is_empty() || c.is_empty() {
            continue;
        }
        b.touch(&a, None, None);
        b.touch(&c, None, None);
        let (src, dst) = if rev { (c, a) } else { (a, c) };
        let lbl = if k == ops.len() - 1 {
            label.clone()
        } else {
            String::new()
        };
        b.fc.edges.push(FlowEdge {
            src,
            dst,
            label: lbl,
            dashed,
            no_arrow,
        });
    }
    Some(())
}

/// `id` / `id: "label"` / `id: label` → `(id, Some(label)?)`.
fn split_key_label(s: &str) -> (&str, Option<String>) {
    match s.find(':') {
        Some(i) => (s[..i].trim(), Some(unquote(s[i + 1..].trim()).to_string())),
        None => (s.trim(), None),
    }
}

/// A node declaration: `id`, `id: "label"`, `id: "label" { shape: X }`, or the
/// attribute form `id.shape: X`.
fn handle_node(b: &mut Builder, line: &str) {
    // `id.shape: value` — set the shape of an existing/implicit node.
    if let Some(p) = line.find(".shape:") {
        let id = leaf(line[..p].trim()).to_string();
        b.touch(
            &id,
            None,
            Some(shape_of(line[p + ".shape:".len()..].trim())),
        );
        return;
    }
    // Optional inline `{ … }` attribute block (read `shape:`).
    let (head, shape) = match (line.find('{'), line.rfind('}')) {
        (Some(o), Some(c)) if c > o => {
            let inner = &line[o + 1..c];
            let sh = inner.find("shape:").map(|k| {
                shape_of(
                    inner[k + "shape:".len()..]
                        .split(';')
                        .next()
                        .unwrap_or("")
                        .trim(),
                )
            });
            (line[..o].trim(), sh)
        }
        _ => (line.trim(), None),
    };
    let (id, label) = split_key_label(head);
    if id.is_empty() {
        return;
    }
    let id = leaf(id).to_string();
    b.touch(&id, label.as_deref(), shape);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nodes_shapes_edges() {
        let fc = parse(
            "direction: right\n\
             A: \"Start\" { shape: circle }\n\
             B: \"ok?\" { shape: diamond }\n\
             A -> B: \"go\"\n\
             B -- A\n",
        )
        .unwrap();
        assert_eq!(fc.direction, Direction::Lr);
        assert_eq!(fc.nodes.len(), 2);
        assert_eq!(fc.nodes[0].label, "Start");
        assert_eq!(fc.nodes[0].shape, Shape::Circle);
        assert_eq!(fc.nodes[1].shape, Shape::Diamond);
        assert_eq!(fc.edges.len(), 2);
        assert_eq!(
            (
                fc.edges[0].src.as_str(),
                fc.edges[0].dst.as_str(),
                fc.edges[0].label.as_str()
            ),
            ("A", "B", "go")
        );
        assert!(fc.edges[1].no_arrow); // `--`
    }

    #[test]
    fn container_and_qualified_edge_and_dash() {
        let fc = parse(
            "G: \"Group\" {\n  A: \"a\"\n  B: \"b\"\n}\n\
             Start -> G.A\n\
             A -> B { style.stroke-dash: 3 }\n",
        )
        .unwrap();
        assert_eq!(fc.subgraphs.len(), 1);
        assert_eq!(fc.subgraphs[0].title, "Group");
        assert_eq!(fc.subgraphs[0].members, ["A", "B"]);
        // `Start -> G.A` resolves the qualified ref to leaf `A`.
        assert_eq!(
            (fc.edges[0].src.as_str(), fc.edges[0].dst.as_str()),
            ("Start", "A")
        );
        assert!(fc.edges[1].dashed);
    }

    #[test]
    fn bare_ids_and_default_shape() {
        let fc = parse("A\nA -> B\n").unwrap();
        assert_eq!(fc.nodes.len(), 2);
        assert_eq!(fc.nodes[0].shape, Shape::Box); // default
        assert_eq!(fc.nodes[1].label, "B"); // bare id → label is the id
    }

    #[test]
    fn empty_is_error() {
        assert_eq!(
            parse("  \n # only a comment\n").unwrap_err(),
            D2Error::Empty
        );
    }
}
