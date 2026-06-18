//! Parse a Mermaid `mindmap` into the flowchart IR (a tree: each node links to
//! its parent), so it reuses `layout_flowchart` + `flowchart_svg`. Node text is
//! real `<text>`.

use super::MermaidError;
use kymo_graph::flowchart::{Direction, FlowEdge, FlowNode, Flowchart};
use kymo_graph::model::Shape;

/// Parse mindmap source into a [`Flowchart`].
pub fn parse(src: &str) -> Result<Flowchart, MermaidError> {
    let mut fc = Flowchart {
        direction: Direction::Tb,
        nodes: Vec::new(),
        edges: Vec::new(),
        subgraphs: Vec::new(),
    };
    let mut lines = src.lines();
    let header = lines
        .by_ref()
        .find(|l| !l.trim().is_empty())
        .ok_or(MermaidError::Empty)?;
    if !header.trim().to_ascii_lowercase().starts_with("mindmap") {
        return Err(MermaidError::Unsupported(header.trim().to_string()));
    }

    // Merge multi-line bracket labels (`root[\n  text\n]`) into one logical line,
    // keeping the indent of the opening line so the tree depth is unchanged.
    let mut logical: Vec<String> = Vec::new();
    let mut buf = String::new();
    let mut bal = 0i32;
    for raw in lines {
        let line = strip_comment(raw);
        if bal == 0 {
            if line.trim().is_empty() {
                continue;
            }
            buf = line.to_string();
        } else {
            buf.push(' ');
            buf.push_str(line.trim());
        }
        bal = bracket_balance(&buf);
        if bal <= 0 {
            logical.push(std::mem::take(&mut buf));
            bal = 0;
        }
    }
    if !buf.trim().is_empty() {
        logical.push(buf);
    }

    let mut stack: Vec<(usize, String)> = Vec::new(); // (indent, node id)
    let mut counter = 0usize;
    for line in &logical {
        let line = line.as_str();
        if line.trim().is_empty() {
            continue;
        }
        let indent = line.len() - line.trim_start().len();
        let text = line.trim();
        if text.eq_ignore_ascii_case("mindmap") {
            continue;
        }
        // `::icon(...)` / `:::class` decorate the previous node — skip them.
        if text.starts_with("::") {
            continue;
        }
        let (label, shape) = node_label(text);
        if label.is_empty() {
            continue;
        }
        let id = format!("__mm{counter}");
        counter += 1;
        // pop to the parent (strictly-lesser indent)
        while stack.last().is_some_and(|(i, _)| *i >= indent) {
            stack.pop();
        }
        let parent = stack.last().map(|(_, id)| id.clone());
        fc.nodes.push(FlowNode {
            id: id.clone(),
            label,
            shape,
        });
        if let Some(p) = parent {
            fc.edges.push(FlowEdge {
                src: p,
                dst: id.clone(),
                label: String::new(),
                dashed: false,
                no_arrow: true,
            });
        }
        stack.push((indent, id));
    }

    Ok(fc)
}

fn strip_comment(line: &str) -> &str {
    match line.find("%%") {
        Some(i) => &line[..i],
        None => line,
    }
}

/// Net bracket balance (`[({` minus `])}`) — >0 means a label spans more lines.
fn bracket_balance(s: &str) -> i32 {
    let mut b = 0i32;
    for c in s.chars() {
        match c {
            '[' | '(' | '{' => b += 1,
            ']' | ')' | '}' => b -= 1,
            _ => {}
        }
    }
    b
}

/// Extract a mindmap node's label + shape. A bracketed label is taken whole
/// (so `:::` *inside* the text survives); only a trailing `@{…}` / `:::class`
/// outside the brackets is dropped.
fn node_label(text: &str) -> (String, Shape) {
    let text = text.trim();
    // shape wrappers: [..] (..) ((..)) {{..}} ))..(( )..(
    let shapes: &[(&str, &str, Shape)] = &[
        ("((", "))", Shape::Circle),
        ("))", "((", Shape::Circle),
        ("{{", "}}", Shape::Hex),
        (")", "(", Shape::Badge),
        ("[", "]", Shape::Box),
        ("(", ")", Shape::Badge),
        ("{", "}", Shape::Diamond),
    ];
    // a node may be `id<wrapper>` — take the wrapper content as the label.
    for (open, close, shape) in shapes {
        if let Some(o) = text.find(open) {
            if let Some(c) = text.rfind(close) {
                if c > o + open.len() - 1 {
                    let inner = text[o + open.len()..c].trim().trim_matches('"');
                    if !inner.is_empty() {
                        return (inner.to_string(), *shape);
                    }
                }
            }
        }
    }
    let plain = text.split("@{").next().unwrap_or(text);
    let plain = plain.split(":::").next().unwrap_or(plain);
    (plain.trim().trim_matches('"').to_string(), Shape::Box)
}

#[cfg(test)]
mod tests {
    use super::parse;
    #[test]
    fn tree_parent_links() {
        let fc = parse("mindmap\n  root((Root))\n    A\n      Leaf\n    B").unwrap();
        assert_eq!(fc.nodes.len(), 4);
        assert!(fc.nodes.iter().any(|n| n.label == "Root"));
        assert!(fc.nodes.iter().any(|n| n.label == "Leaf"));
        // 3 parent->child edges (root->A, A->Leaf, root->B)
        assert_eq!(fc.edges.len(), 3);
    }
}
