//! Mermaid → kymo importer (front-end).
//!
//! [`parse`] reads Mermaid source, dispatches on the diagram-type header, and
//! returns a positionless [`Flowchart`] for the flowchart family
//! (`graph` / `flowchart`). Other diagram types (sequence, state, class, er, …)
//! are recognised but return [`MermaidError::Unsupported`] in this phase — the
//! dispatch in [`detect_type`] is the seam where future modules plug in.
//!
//! Coordinates are NOT assigned here; `layout.rs` does that (Mermaid carries no
//! geometry, unlike a `.bpmn` import). See FEAT-MERMAID-001 / MERMAID-MAP-001.

mod lexer;
mod parser;

use crate::model::Shape;
use parser::{parse_statement, Item};

/// Flow direction from the header (`TD` is an alias for `TB`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
    /// Top-to-bottom (Mermaid default; `TD`/`TB`).
    Tb,
    /// Bottom-to-top.
    Bt,
    /// Left-to-right.
    Lr,
    /// Right-to-left.
    Rl,
}

/// A node in a parsed flowchart (no position yet).
#[derive(Debug, Clone)]
pub struct FlowNode {
    pub id: String,
    pub label: String,
    pub shape: Shape,
}

/// A directed connection (no geometry yet).
#[derive(Debug, Clone)]
pub struct FlowEdge {
    pub src: String,
    pub dst: String,
    pub label: String,
    pub dashed: bool,
    pub no_arrow: bool,
}

/// A `subgraph … end` block → becomes a cluster region after layout.
#[derive(Debug, Clone)]
pub struct Subgraph {
    pub id: String,
    pub title: String,
    pub members: Vec<String>,
}

/// A parsed flowchart, ready for `layout::layout_flowchart`.
#[derive(Debug, Clone)]
pub struct Flowchart {
    pub direction: Direction,
    pub nodes: Vec<FlowNode>,
    pub edges: Vec<FlowEdge>,
    pub subgraphs: Vec<Subgraph>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MermaidError {
    /// No usable (non-comment) content.
    Empty,
    /// A recognised but not-yet-implemented diagram type (e.g. `sequenceDiagram`).
    Unsupported(String),
    /// A malformed statement, with 1-based line number.
    Syntax { line: usize, msg: String },
}

impl std::fmt::Display for MermaidError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MermaidError::Empty => write!(f, "empty Mermaid source"),
            MermaidError::Unsupported(t) => write!(
                f,
                "unsupported Mermaid diagram type {t:?} (only flowchart `graph`/`flowchart` is supported)"
            ),
            MermaidError::Syntax { line, msg } => write!(f, "line {line}: {msg}"),
        }
    }
}

impl std::error::Error for MermaidError {}

/// Strip a `%% …` line comment (outside of quotes — kept simple: Mermaid
/// comments occupy whole lines or trailing text we don't otherwise parse).
fn strip_comment(line: &str) -> &str {
    match line.find("%%") {
        Some(idx) => &line[..idx],
        None => line,
    }
}

/// Parse Mermaid source into a [`Flowchart`], or fail with [`MermaidError`].
pub fn parse(src: &str) -> Result<Flowchart, MermaidError> {
    // Flatten to statements: split on newlines AND `;`, dropping `%%` comments
    // (and `%%{init}%%` directives). The first statement is the type header.
    let mut stmts: Vec<(usize, String)> = Vec::new();
    for (i, line) in src.lines().enumerate() {
        for seg in strip_comment(line).split(';') {
            let seg = seg.trim();
            if !seg.is_empty() {
                stmts.push((i + 1, seg.to_string()));
            }
        }
    }

    let header = stmts.first().ok_or(MermaidError::Empty)?;
    let (kind, direction) = detect_type(&header.1)?;
    if kind != "flowchart" {
        return Err(MermaidError::Unsupported(kind));
    }

    let mut fc = Flowchart {
        direction,
        nodes: Vec::new(),
        edges: Vec::new(),
        subgraphs: Vec::new(),
    };
    // Registry: id → index into fc.nodes (insertion order preserved).
    let mut index: Vec<(String, usize)> = Vec::new();
    // Stack of open subgraph indices (innermost last).
    let mut sub_stack: Vec<usize> = Vec::new();
    let mut sub_auto = 0usize;

    for (lineno, stmt) in stmts.iter().skip(1) {
        handle_statement(
            stmt,
            *lineno,
            &mut fc,
            &mut index,
            &mut sub_stack,
            &mut sub_auto,
        )?;
    }
    Ok(fc)
}

fn handle_statement(
    stmt: &str,
    lineno: usize,
    fc: &mut Flowchart,
    index: &mut Vec<(String, usize)>,
    sub_stack: &mut Vec<usize>,
    sub_auto: &mut usize,
) -> Result<(), MermaidError> {
    let lower = stmt.to_ascii_lowercase();

    // `direction XX` inside a subgraph — accepted and ignored (Phase 1).
    if lower.starts_with("direction ") {
        return Ok(());
    }

    // `subgraph [id ][title]` — open a block.
    if lower == "subgraph" || lower.starts_with("subgraph ") {
        let rest = stmt[8..].trim();
        let (id, title) = parse_subgraph_header(rest, sub_auto);
        let sub_idx = fc.subgraphs.len();
        fc.subgraphs.push(Subgraph {
            id,
            title,
            members: Vec::new(),
        });
        sub_stack.push(sub_idx);
        return Ok(());
    }

    // `end` — close the innermost block.
    if lower == "end" {
        sub_stack.pop();
        return Ok(());
    }

    let items = parse_statement(stmt).map_err(|msg| MermaidError::Syntax { line: lineno, msg })?;

    // Walk items: Node (Edge Node)*. Connect consecutive nodes with the edge.
    let mut prev: Option<String> = None;
    let mut pending_edge: Option<lexer::EdgeTok> = None;
    for item in &items {
        match item {
            Item::Node(n) => {
                touch_node(fc, index, n);
                register_member(fc, sub_stack, &n.id);
                if let (Some(src), Some(op)) = (prev.take(), pending_edge.take()) {
                    fc.edges.push(FlowEdge {
                        src,
                        dst: n.id.clone(),
                        label: op.label.clone(),
                        dashed: op.dashed,
                        no_arrow: op.no_arrow,
                    });
                }
                prev = Some(n.id.clone());
            }
            Item::Edge(op) => {
                pending_edge = Some(op.clone());
            }
        }
    }
    Ok(())
}

/// Insert or update a node in the registry. A `Some` label/shape overrides the
/// default (so an explicit `A[Hello]` upgrades an earlier bare `A`).
fn touch_node(fc: &mut Flowchart, index: &mut Vec<(String, usize)>, n: &parser::ParsedNode) {
    if let Some((_, idx)) = index.iter().find(|(id, _)| id == &n.id) {
        let node = &mut fc.nodes[*idx];
        if let Some(label) = &n.label {
            node.label = label.clone();
        }
        if let Some(shape) = n.shape {
            node.shape = shape;
        }
    } else {
        let idx = fc.nodes.len();
        fc.nodes.push(FlowNode {
            id: n.id.clone(),
            label: n.label.clone().unwrap_or_else(|| n.id.clone()),
            shape: n.shape.unwrap_or(Shape::Box),
        });
        index.push((n.id.clone(), idx));
    }
}

/// Record a node as a member of the innermost open subgraph (deduplicated).
fn register_member(fc: &mut Flowchart, sub_stack: &[usize], id: &str) {
    if let Some(&sub_idx) = sub_stack.last() {
        let members = &mut fc.subgraphs[sub_idx].members;
        if !members.iter().any(|m| m == id) {
            members.push(id.to_string());
        }
    }
}

/// `id[Title]` / `id [Title]` / `Title with spaces` / bare `id`.
fn parse_subgraph_header(rest: &str, auto: &mut usize) -> (String, String) {
    if rest.is_empty() {
        *auto += 1;
        return (format!("sub{auto}"), String::new());
    }
    if let Some(open) = rest.find('[') {
        if rest.ends_with(']') {
            let id = rest[..open].trim();
            let title = rest[open + 1..rest.len() - 1].trim().trim_matches('"');
            let id = if id.is_empty() {
                *auto += 1;
                format!("sub{auto}")
            } else {
                id.to_string()
            };
            return (id, title.to_string());
        }
    }
    // No bracket: the whole rest is both a title and (if a single token) the id.
    if rest.split_whitespace().count() == 1 {
        (rest.to_string(), rest.to_string())
    } else {
        *auto += 1;
        (format!("sub{auto}"), rest.trim_matches('"').to_string())
    }
}

/// Returns `(kind, direction)`. `kind` is `"flowchart"` for `graph`/`flowchart`,
/// otherwise the recognised diagram-type keyword (to report as unsupported).
fn detect_type(header: &str) -> Result<(String, Direction), MermaidError> {
    let mut words = header.split_whitespace();
    let first = words.next().ok_or(MermaidError::Empty)?;
    // The type keyword may be glued to the direction (`graph TD`) or stand
    // alone; the first whitespace token is the keyword.
    let kw = first.trim_end_matches(|c: char| !c.is_ascii_alphabetic());
    let lower = kw.to_ascii_lowercase();
    if lower == "graph" || lower == "flowchart" {
        // Direction is the next token (e.g. `TD`, `LR`); default TB.
        let dir = words.next().map(parse_direction).unwrap_or(Direction::Tb);
        Ok(("flowchart".to_string(), dir))
    } else {
        Ok((kw.to_string(), Direction::Tb))
    }
}

fn parse_direction(tok: &str) -> Direction {
    match tok.to_ascii_uppercase().as_str() {
        "LR" => Direction::Lr,
        "RL" => Direction::Rl,
        "BT" => Direction::Bt,
        _ => Direction::Tb, // TD / TB / anything else
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dispatch_unsupported() {
        assert_eq!(
            parse("sequenceDiagram\n A->>B: hi").unwrap_err(),
            MermaidError::Unsupported("sequenceDiagram".to_string())
        );
    }

    #[test]
    fn header_direction() {
        assert_eq!(
            parse("flowchart LR\nA-->B").unwrap().direction,
            Direction::Lr
        );
        assert_eq!(parse("graph TD\nA-->B").unwrap().direction, Direction::Tb);
        assert_eq!(parse("graph\nA-->B").unwrap().direction, Direction::Tb);
    }

    #[test]
    fn nodes_edges_and_dedup() {
        let fc = parse("graph TD\nA[Start]-->B\nB-->C\nA-->C").unwrap();
        assert_eq!(fc.nodes.len(), 3);
        assert_eq!(fc.edges.len(), 3);
        assert_eq!(fc.nodes[0].label, "Start");
        // Bare B then referenced — default label is its id.
        assert_eq!(fc.nodes[1].label, "B");
    }

    #[test]
    fn subgraph_membership() {
        let fc = parse("flowchart TB\nsubgraph G [Group]\nA-->B\nend\nB-->C").unwrap();
        assert_eq!(fc.subgraphs.len(), 1);
        assert_eq!(fc.subgraphs[0].title, "Group");
        assert_eq!(fc.subgraphs[0].members, ["A", "B"]);
    }

    #[test]
    fn semicolon_separated() {
        let fc = parse("graph LR; A-->B; B-->C").unwrap();
        assert_eq!(fc.nodes.len(), 3);
        assert_eq!(fc.edges.len(), 2);
    }

    #[test]
    fn comments_skipped() {
        let fc = parse("graph TD\n%% a comment\nA-->B %% trailing\n").unwrap();
        assert_eq!(fc.edges.len(), 1);
    }

    #[test]
    fn empty_is_error() {
        assert_eq!(
            parse("   \n %% only a comment\n").unwrap_err(),
            MermaidError::Empty
        );
    }
}
