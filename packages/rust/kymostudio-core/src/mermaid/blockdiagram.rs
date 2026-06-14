//! Parse a Mermaid `block` / `block-beta` diagram into the flowchart IR, so it
//! reuses `layout_flowchart` + `flowchart_svg`. Blocks become nodes (with their
//! labels), arrows become edges. The explicit column grid is not reproduced
//! (kymo lays the blocks out as a graph), but every block and edge label renders
//! as real `<text>`.

use super::parser::{parse_statement, Item};
use super::MermaidError;
use crate::flowchart::{Direction, FlowEdge, FlowNode, Flowchart};
use crate::model::Shape;

/// Parse block-diagram source into a [`Flowchart`].
pub fn parse(src: &str) -> Result<Flowchart, MermaidError> {
    let lines: Vec<&str> = src.lines().map(|l| strip_comment(l).trim()).collect();
    let header = lines
        .iter()
        .find(|l| !l.is_empty())
        .ok_or(MermaidError::Empty)?;
    if !header.to_ascii_lowercase().starts_with("block") {
        return Err(MermaidError::Unsupported(header.to_string()));
    }

    let mut fc = Flowchart {
        direction: Direction::Tb,
        nodes: Vec::new(),
        edges: Vec::new(),
        subgraphs: Vec::new(),
    };
    let mut index: Vec<String> = Vec::new();
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
        if low.starts_with("columns")
            || low == "end"
            || low == "space"
            || low.starts_with("space:")
            || low.starts_with("style ")
            || low.starts_with("classdef ")
            || low.starts_with("class ")
            || low.starts_with("click ")
        {
            continue;
        }
        // `block:id["label"]` — a container; keep it as a labelled node.
        if let Some(rest) = low.strip_prefix("block:").map(|_| &line["block:".len()..]) {
            for (id, label) in tokenize(rest) {
                touch(&mut fc, &mut index, &id, &label);
            }
            continue;
        }

        if is_arrow_line(line) {
            if let Ok(items) = parse_statement(line) {
                add_items(&mut fc, &mut index, &items);
                continue;
            }
        }
        for (id, label) in tokenize(line) {
            touch(&mut fc, &mut index, &id, &label);
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

fn touch(fc: &mut Flowchart, index: &mut Vec<String>, id: &str, label: &str) {
    if id.is_empty() {
        return;
    }
    if let Some(i) = index.iter().position(|x| x == id) {
        if !label.is_empty() {
            fc.nodes[i].label = label.to_string();
        }
        return;
    }
    index.push(id.to_string());
    fc.nodes.push(FlowNode {
        id: id.to_string(),
        label: if label.is_empty() {
            id.to_string()
        } else {
            label.to_string()
        },
        shape: Shape::Box,
    });
}

/// Build nodes + edges from a parsed flowchart statement (arrow line).
fn add_items(fc: &mut Flowchart, index: &mut Vec<String>, items: &[Item]) {
    let mut prev: Option<Vec<String>> = None;
    let mut pending: Option<&super::lexer::EdgeTok> = None;
    for item in items {
        match item {
            Item::Nodes(group) => {
                for n in group {
                    touch(fc, index, &n.id, n.label.as_deref().unwrap_or(""));
                }
                if let (Some(srcs), Some(op)) = (prev.take(), pending.take()) {
                    for s in &srcs {
                        for n in group {
                            fc.edges.push(FlowEdge {
                                src: s.clone(),
                                dst: n.id.clone(),
                                label: op.label.clone(),
                                dashed: op.dashed,
                                no_arrow: op.no_arrow,
                            });
                        }
                    }
                }
                prev = Some(group.iter().map(|n| n.id.clone()).collect());
            }
            Item::Edge(op) => pending = Some(op),
        }
    }
}

/// Does the line (with bracket/quote content masked) contain an edge operator?
fn is_arrow_line(line: &str) -> bool {
    let masked = mask(line);
    let chars: Vec<char> = masked.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if matches!(chars[i], '-' | '=' | '.' | '<' | '>') {
            let mut j = i;
            while j < chars.len() && matches!(chars[j], '-' | '=' | '.' | '<' | '>') {
                j += 1;
            }
            let run: String = chars[i..j].iter().collect();
            if run.len() >= 2 && (run.contains('-') || run.contains('=') || run.contains('.')) {
                return true;
            }
            i = j;
        } else {
            i += 1;
        }
    }
    false
}

/// Replace bracketed / quoted content with spaces (so an inner `-` is not read
/// as an arrow).
fn mask(line: &str) -> String {
    let mut out = String::with_capacity(line.len());
    let mut depth = 0i32;
    let mut q = false;
    for c in line.chars() {
        match c {
            '"' => {
                q = !q;
                out.push(' ');
            }
            _ if q => out.push(' '),
            '[' | '(' | '{' => {
                depth += 1;
                out.push(' ');
            }
            ']' | ')' | '}' => {
                depth = (depth - 1).max(0);
                out.push(' ');
            }
            _ if depth > 0 => out.push(' '),
            _ => out.push(c),
        }
    }
    out
}

/// Split a block-definition line into `(id, label)` tokens. A token is an id
/// optionally followed by a `[..]`/`(..)`/`{..}` label wrapper and a `:span`.
fn tokenize(line: &str) -> Vec<(String, String)> {
    let chars: Vec<char> = line.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c.is_whitespace() {
            i += 1;
            continue;
        }
        // read id
        let id_start = i;
        while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_' || chars[i] == '-')
        {
            i += 1;
        }
        let id: String = chars[id_start..i].iter().collect();
        // optional label wrapper
        let mut label = String::new();
        if i < chars.len() && matches!(chars[i], '[' | '(' | '{') {
            let mut depth = 0i32;
            let start = i;
            while i < chars.len() {
                match chars[i] {
                    '[' | '(' | '{' => depth += 1,
                    ']' | ')' | '}' => {
                        depth -= 1;
                        if depth == 0 {
                            i += 1;
                            break;
                        }
                    }
                    _ => {}
                }
                i += 1;
            }
            let inner: String = chars[start..i].iter().collect();
            label = inner
                .trim_matches(|c| matches!(c, '[' | ']' | '(' | ')' | '{' | '}'))
                .trim()
                .trim_matches('"')
                .to_string();
        }
        // optional `<["label"]>` arrow-block wrapper (+ trailing `(direction)`).
        if i < chars.len() && chars[i] == '<' {
            let start = i;
            while i < chars.len() && chars[i] != '>' {
                i += 1;
            }
            if i < chars.len() {
                i += 1;
            }
            let inner: String = chars[start..i].iter().collect();
            if let Some(a) = inner.find('"') {
                if let Some(b) = inner[a + 1..].find('"') {
                    label = inner[a + 1..a + 1 + b].to_string();
                }
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
        // optional :span
        if i < chars.len() && chars[i] == ':' {
            i += 1;
            while i < chars.len() && chars[i].is_ascii_digit() {
                i += 1;
            }
        }
        if !id.is_empty() {
            out.push((id, label));
        } else {
            i += 1; // avoid stalling on a stray char
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn blocks_labels_and_arrows() {
        let fc = parse("block\ncolumns 2\na b c\ningress[\"Wide\"] -- \"edge label\" --> dispatch")
            .unwrap();
        // bare blocks a/b/c + labelled ingress + dispatch
        assert!(["a", "b", "c", "ingress", "dispatch"]
            .iter()
            .all(|id| fc.nodes.iter().any(|n| n.id == *id)));
        assert!(fc
            .nodes
            .iter()
            .any(|n| n.id == "ingress" && n.label == "Wide"));
        // the arrow with its label
        let e = fc
            .edges
            .iter()
            .find(|e| e.src == "ingress" && e.dst == "dispatch")
            .unwrap();
        assert_eq!(e.label, "edge label");
    }
}
