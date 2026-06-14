//! Parse a Mermaid `kanban` board into the flowchart IR: top-level items become
//! columns (subgraphs), indented items become cards (nodes) inside the current
//! column. Reuses `layout_flowchart` + `flowchart_svg`; card text is real
//! `<text>`.

use super::MermaidError;
use crate::flowchart::{Direction, FlowNode, Flowchart, Subgraph};
use crate::model::Shape;

/// Parse kanban source into a [`Flowchart`].
pub fn parse(src: &str) -> Result<Flowchart, MermaidError> {
    let mut fc = Flowchart {
        direction: Direction::Lr,
        nodes: Vec::new(),
        edges: Vec::new(),
        subgraphs: Vec::new(),
    };
    let lines: Vec<&str> = src.lines().map(strip_comment).collect();
    let header = lines
        .iter()
        .find(|l| !l.trim().is_empty())
        .ok_or(MermaidError::Empty)?;
    if !header.trim().to_ascii_lowercase().starts_with("kanban") {
        return Err(MermaidError::Unsupported(header.trim().to_string()));
    }

    // Column indent = the smallest indent among the body lines.
    let mut base: Option<usize> = None;
    let mut started = false;
    for line in &lines {
        if line.trim().is_empty() {
            continue;
        }
        if !started {
            started = true;
            continue;
        }
        let indent = line.len() - line.trim_start().len();
        base = Some(base.map_or(indent, |b| b.min(indent)));
    }
    let base = base.unwrap_or(0);

    let mut cur_col: Option<usize> = None;
    let mut counter = 0usize;
    let mut started = false;
    for line in &lines {
        if line.trim().is_empty() {
            continue;
        }
        if !started {
            started = true;
            continue;
        }
        let indent = line.len() - line.trim_start().len();
        let (label, _shape) = node_label(line.trim());
        if label.is_empty() {
            continue;
        }
        if indent <= base {
            // a column
            let idx = fc.subgraphs.len();
            fc.subgraphs.push(Subgraph {
                id: format!("__col{idx}"),
                title: label,
                members: Vec::new(),
                parent: None,
            });
            cur_col = Some(idx);
        } else {
            // a card in the current column
            let id = format!("__card{counter}");
            counter += 1;
            fc.nodes.push(FlowNode {
                id: id.clone(),
                label,
                shape: Shape::Box,
            });
            if let Some(ci) = cur_col {
                fc.subgraphs[ci].members.push(id);
            }
        }
    }

    Ok(fc)
}

fn strip_comment(line: &str) -> &str {
    match line.find("%%") {
        Some(i) => &line[..i],
        None => line,
    }
}

/// Card text: `id[Label]` → Label; metadata `@{…}` and `::class` stripped.
fn node_label(text: &str) -> (String, Shape) {
    // Pull values out of a `@{ assigned: "Alice", ticket: KNSV-1 }` metadata
    // block (mermaid renders them on the card).
    let meta = match (text.find("@{"), text.rfind('}')) {
        (Some(a), Some(b)) if b > a => meta_values(&text[a + 2..b]),
        _ => String::new(),
    };
    let text = text.split("@{").next().unwrap_or(text);
    let text = text.split("::").next().unwrap_or(text).trim();
    let suffix = if meta.is_empty() {
        String::new()
    } else {
        format!(" {meta}")
    };
    if let Some(o) = text.find('[') {
        if let Some(c) = text.rfind(']') {
            if c > o {
                return (
                    format!("{}{suffix}", text[o + 1..c].trim().trim_matches('"')),
                    Shape::Box,
                );
            }
        }
    }
    if let Some(o) = text.find('(') {
        if let Some(c) = text.rfind(')') {
            if c > o {
                return (
                    format!("{}{suffix}", text[o + 1..c].trim().trim_matches('"')),
                    Shape::Badge,
                );
            }
        }
    }
    (
        format!("{}{suffix}", text.trim().trim_matches('"')),
        Shape::Box,
    )
}

/// Join the values of a `key: value, key: value` metadata block.
fn meta_values(body: &str) -> String {
    body.split(',')
        .filter_map(|f| f.split_once(':').map(|(_, v)| v.trim().trim_matches('"')))
        .filter(|v| !v.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::parse;
    #[test]
    fn columns_cards_and_metadata() {
        let fc = parse(
            "kanban\n  Todo\n    t1[Write code]@{ assigned: \"Alice\" }\n  Doing\n    t2[Review]",
        )
        .unwrap();
        assert_eq!(fc.subgraphs.len(), 2);
        assert_eq!(fc.subgraphs[0].title, "Todo");
        // card label includes the assignee from @{}
        assert!(fc
            .nodes
            .iter()
            .any(|n| n.label.contains("Write code") && n.label.contains("Alice")));
    }
}
