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

mod blockdiagram;
mod classdiagram;
mod erdiagram;
mod kanban;
mod lexer;
mod mindmap;
mod parser;
mod requirement;
mod sequence;
mod state;

use crate::flowchart::{Direction, FlowEdge, FlowNode, Flowchart, Subgraph};
use crate::model::Shape;
use crate::style::{FlowStyle, NodeStyle};
use parser::{parse_statement, Item};
use std::collections::HashMap;

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

/// Split a flowchart source into statements, separating on newlines and `;`
/// and dropping `%%` comments (incl. `%%{init}%%` directives) — but only
/// outside a `"..."` string, so a quoted label may span physical lines and
/// contain `;`/`%%`. Each statement carries the 1-based line where it began.
fn split_statements(src: &str) -> Vec<(usize, String)> {
    let mut out: Vec<(usize, String)> = Vec::new();
    let mut cur = String::new();
    let mut line = 1usize; // current physical line
    let mut start = 1usize; // line where `cur` began
    let mut in_str = false; // inside a double-quoted string
    let mut in_comment = false; // inside a `%%` line comment
    let mut data_depth = 0u32; // brace nesting inside an `@{ ... }` node-data block
    let mut chars = src.chars().peekable();
    let flush = |cur: &mut String, start: usize, out: &mut Vec<(usize, String)>| {
        let t = cur.trim();
        if !t.is_empty() {
            out.push((start, t.to_string()));
        }
        cur.clear();
    };
    while let Some(c) = chars.next() {
        // Inside a quoted string, everything is literal; fold newlines so a
        // label may span physical lines.
        if in_str {
            cur.push(if c == '\n' { ' ' } else { c });
            if c == '\n' {
                line += 1;
            } else if c == '"' {
                in_str = false;
            }
            continue;
        }
        // A `%%` comment runs to end of line; the line still ends the statement.
        if in_comment {
            if c == '\n' {
                in_comment = false;
                flush(&mut cur, start, &mut out);
                start = line + 1;
                line += 1;
            }
            continue;
        }
        // Inside `@{ ... }` node metadata, keep everything in one statement and
        // turn YAML line breaks into `,` field separators.
        if data_depth > 0 {
            match c {
                '"' => {
                    in_str = true;
                    cur.push(c);
                }
                '{' => {
                    data_depth += 1;
                    cur.push(c);
                }
                '}' => {
                    data_depth -= 1;
                    cur.push(c);
                }
                '\n' => {
                    cur.push(',');
                    line += 1;
                }
                _ => cur.push(c),
            }
            continue;
        }
        match c {
            '\n' => {
                flush(&mut cur, start, &mut out);
                start = line + 1;
                line += 1;
            }
            '"' => {
                in_str = true;
                cur.push(c);
            }
            '@' if chars.peek() == Some(&'{') => {
                chars.next();
                cur.push_str("@{");
                data_depth = 1;
            }
            '%' if chars.peek() == Some(&'%') => {
                chars.next();
                in_comment = true;
            }
            ';' => {
                flush(&mut cur, start, &mut out);
                start = line;
            }
            _ => cur.push(c),
        }
    }
    flush(&mut cur, start, &mut out);
    out
}

/// Parse Mermaid source into a [`Flowchart`], or fail with [`MermaidError`].
pub fn parse(src: &str) -> Result<Flowchart, MermaidError> {
    // Flatten to statements. The first statement is the type header.
    let stmts = split_statements(src);

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
    // The final node of the previous statement, for line continuation.
    let mut last_node: Option<Vec<String>> = None;

    // Skip the body of an `accDescr { ... }` / `accTitle { ... }` accessibility
    // block — those lines are prose, not graph statements.
    let mut skip_block = false;
    for (lineno, stmt) in stmts.iter().skip(1) {
        if skip_block {
            if stmt.contains('}') {
                skip_block = false;
            }
            continue;
        }
        let low = stmt.to_ascii_lowercase();
        if (low.starts_with("accdescr") || low.starts_with("acctitle"))
            && stmt.contains('{')
            && !stmt.contains('}')
        {
            skip_block = true;
            continue;
        }
        handle_statement(
            stmt,
            *lineno,
            &mut fc,
            &mut index,
            &mut sub_stack,
            &mut sub_auto,
            &mut last_node,
        )?;
    }
    Ok(fc)
}

/// Parse a Mermaid `sequenceDiagram` into a [`crate::sequence::Sequence`].
///
/// The sequence family does NOT use `;` as a statement separator (unlike
/// flowcharts), so the body is split on newlines only. The header line selects
/// the diagram type; anything other than `sequenceDiagram` is reported as
/// [`MermaidError::Unsupported`].
/// Parse a Mermaid state diagram (`stateDiagram` / `stateDiagram-v2`) into the
/// flowchart IR, so it can reuse the flowchart layout + SVG renderer.
/// Parse a Mermaid `classDiagram` into the class-diagram IR.
pub fn parse_class(src: &str) -> Result<crate::classdiagram::ClassDiagram, MermaidError> {
    classdiagram::parse(src)
}

/// Parse a Mermaid `erDiagram` into the class-diagram IR (reusing the renderer).
pub fn parse_er(src: &str) -> Result<crate::classdiagram::ClassDiagram, MermaidError> {
    erdiagram::parse(src)
}

/// Parse a Mermaid `block` / `block-beta` diagram into the flowchart IR.
pub fn parse_block(src: &str) -> Result<Flowchart, MermaidError> {
    blockdiagram::parse(src)
}

/// Parse a Mermaid `mindmap` into the flowchart IR.
pub fn parse_mindmap(src: &str) -> Result<Flowchart, MermaidError> {
    mindmap::parse(src)
}

/// Parse a Mermaid `kanban` board into the flowchart IR.
pub fn parse_kanban(src: &str) -> Result<Flowchart, MermaidError> {
    kanban::parse(src)
}

/// Parse a Mermaid `requirementDiagram` into the class-diagram IR.
pub fn parse_requirement(src: &str) -> Result<crate::classdiagram::ClassDiagram, MermaidError> {
    requirement::parse(src)
}

pub fn parse_state(src: &str) -> Result<Flowchart, MermaidError> {
    let stmts = split_statements(src);
    let header = stmts.first().ok_or(MermaidError::Empty)?;
    if !header.1.to_ascii_lowercase().starts_with("statediagram") {
        return Err(MermaidError::Unsupported(header.1.clone()));
    }
    state::parse(&stmts)
}

pub fn parse_sequence(src: &str) -> Result<crate::sequence::Sequence, MermaidError> {
    let stmts: Vec<(usize, String)> = src
        .lines()
        .enumerate()
        .map(|(i, line)| (i + 1, strip_comment(line).trim().to_string()))
        .filter(|(_, s)| !s.is_empty())
        .collect();

    let header = stmts.first().ok_or(MermaidError::Empty)?;
    let (kind, _dir) = detect_type(&header.1)?;
    if kind != "sequenceDiagram" {
        return Err(MermaidError::Unsupported(kind));
    }
    sequence::parse_sequence(&stmts[1..])
}

fn handle_statement(
    stmt: &str,
    lineno: usize,
    fc: &mut Flowchart,
    index: &mut Vec<(String, usize)>,
    sub_stack: &mut Vec<usize>,
    sub_auto: &mut usize,
    last_node: &mut Option<Vec<String>>,
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
        let parent = sub_stack.last().copied();
        fc.subgraphs.push(Subgraph {
            id,
            title,
            members: Vec::new(),
            parent,
        });
        sub_stack.push(sub_idx);
        return Ok(());
    }

    // `end` — close the innermost block.
    if lower == "end" {
        sub_stack.pop();
        return Ok(());
    }

    // Metadata statements (styling / interaction / accessibility) carry no graph
    // structure — kymo does not render them, so accept and skip rather than
    // failing the whole flowchart. Mermaid: `classDef`, `class`, `style`,
    // `linkStyle`, `click`, `accTitle:`, `accDescr`.
    if lower.starts_with("classdef ")
        || lower.starts_with("class ")
        || lower.starts_with("style ")
        || lower.starts_with("linkstyle ")
        || lower.starts_with("click ")
        || lower.starts_with("acctitle")
        || lower.starts_with("accdescr")
    {
        return Ok(());
    }

    let items = parse_statement(stmt).map_err(|msg| MermaidError::Syntax { line: lineno, msg })?;

    // Walk items: NodeGroup (Edge NodeGroup)*. A group is one or more `&`-joined
    // nodes; an edge between two groups fans out to every (src, dst) pair.
    let mut prev: Option<Vec<String>> = if matches!(items.first(), Some(Item::Edge(_))) {
        last_node.clone() // line continuation: source is the previous node
    } else {
        None
    };
    let mut pending_edge: Option<lexer::EdgeTok> = None;
    for item in &items {
        match item {
            Item::Nodes(group) => {
                for n in group {
                    touch_node(fc, index, n);
                    register_member(fc, sub_stack, &n.id);
                }
                if let (Some(srcs), Some(op)) = (prev.take(), pending_edge.take()) {
                    for src in &srcs {
                        for n in group {
                            fc.edges.push(FlowEdge {
                                src: src.clone(),
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
            Item::Edge(op) => {
                pending_edge = Some(op.clone());
            }
        }
    }
    if prev.is_some() {
        *last_node = prev;
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
            shape: n.shape.unwrap_or(Shape::Rect),
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

/// Like [`parse`], but first strips a leading `---…---` YAML frontmatter and
/// returns any [`FlowStyle`] hinted by the frontmatter or a `%%{init}%%`
/// directive (`look:`/`theme:`/`kymoStyle:` naming `mermaid` or `kymo`).
pub fn parse_with_config(src: &str) -> Result<(Flowchart, Option<FlowStyle>), MermaidError> {
    let (body, style) = extract_config(src);
    Ok((parse(&body)?, style))
}

/// Strip a leading frontmatter block and detect a style hint.
fn extract_config(src: &str) -> (String, Option<FlowStyle>) {
    let mut style: Option<FlowStyle> = None;
    // `%%{init: {...}}%%` directive (anywhere).
    for line in src.lines() {
        let t = line.trim();
        if t.starts_with("%%{") && t.to_ascii_lowercase().contains("init") {
            style = style.or_else(|| scan_kv(t));
        }
    }
    // Leading `---` … `---` YAML frontmatter.
    let lines: Vec<&str> = src.lines().collect();
    let mut i = 0;
    while i < lines.len() && lines[i].trim().is_empty() {
        i += 1;
    }
    if i < lines.len() && lines[i].trim() == "---" {
        let mut j = i + 1;
        while j < lines.len() && lines[j].trim() != "---" {
            j += 1;
        }
        if j < lines.len() {
            for line in &lines[i + 1..j] {
                style = style.or_else(|| scan_kv(line));
            }
            return (lines[j + 1..].join("\n"), style);
        }
    }
    (src.to_string(), style)
}

/// Pull a [`FlowStyle`] out of a `look:`/`theme:`/`kymoStyle:` fragment whose
/// value names `mermaid` or `kymo`.
fn scan_kv(line: &str) -> Option<FlowStyle> {
    let low = line.to_ascii_lowercase();
    if !(low.contains("look") || low.contains("theme") || low.contains("kymostyle")) {
        return None;
    }
    let val = low.rsplit(':').next().unwrap_or("");
    if val.contains("mermaid") {
        Some(FlowStyle::Mermaid)
    } else if val.contains("kymo") {
        Some(FlowStyle::Kymo)
    } else {
        None
    }
}

/// Scan flowchart source for per-node colours: `classDef`, `class`, inline
/// `:::class`, `style`, and a `%%{init themeVariables.primaryColor}%%` global
/// node fill. Returns `(id -> NodeStyle, global_fill)`. Render-time only — does
/// not touch the IR or kymojson.
pub fn extract_node_styles(src: &str) -> (HashMap<String, NodeStyle>, Option<NodeStyle>) {
    let mut classdefs: HashMap<String, NodeStyle> = HashMap::new();
    let mut node_class: HashMap<String, String> = HashMap::new();
    let mut direct: HashMap<String, NodeStyle> = HashMap::new();
    let mut global_fill: Option<String> = None;

    for raw in src.lines() {
        let line = raw.trim();
        let low = line.to_ascii_lowercase();
        if low.starts_with("classdef ") {
            if let Some((names, body)) = line[8..].trim().split_once(char::is_whitespace) {
                let st = parse_style(body);
                for name in names.split(',') {
                    classdefs.insert(name.trim().to_string(), st.clone());
                }
            }
        } else if low.starts_with("class ") {
            if let Some((ids, name)) = line[5..].trim().rsplit_once(char::is_whitespace) {
                for id in ids.split(',') {
                    node_class.insert(id.trim().to_string(), name.trim().to_string());
                }
            }
        } else if low.starts_with("style ") {
            if let Some((id, body)) = line[5..].trim().split_once(char::is_whitespace) {
                direct.insert(id.trim().to_string(), parse_style(body));
            }
        }
        if line.contains(":::") {
            for tok in line.split_whitespace() {
                if let Some((id, cls)) = tok.split_once(":::") {
                    let id = id.trim_matches(|c: char| !c.is_alphanumeric() && c != '_');
                    let cls = cls.trim_matches(|c: char| !c.is_alphanumeric() && c != '_');
                    if !id.is_empty() && !cls.is_empty() {
                        node_class.insert(id.to_string(), cls.to_string());
                    }
                }
            }
        }
        if low.contains("primarycolor") {
            global_fill = grab_hex(&low, "primarycolor").or(global_fill);
        }
    }

    let mut out: HashMap<String, NodeStyle> = HashMap::new();
    let ids: std::collections::HashSet<&String> = node_class.keys().chain(direct.keys()).collect();
    for id in ids {
        let mut ns = node_class
            .get(id)
            .and_then(|c| classdefs.get(c))
            .cloned()
            .unwrap_or_default();
        if let Some(d) = direct.get(id) {
            if d.fill.is_some() {
                ns.fill = d.fill.clone();
            }
            if d.stroke.is_some() {
                ns.stroke = d.stroke.clone();
            }
            if d.color.is_some() {
                ns.color = d.color.clone();
            }
            if d.stroke_width.is_some() {
                ns.stroke_width = d.stroke_width.clone();
            }
        }
        out.insert(id.clone(), ns);
    }
    // The special `default` classDef (and theme primaryColor) apply to every node
    // with no explicit class — fold them into a base style the renderer layers
    // under each node.
    let mut default_style = classdefs.get("default").cloned();
    if let Some(g) = global_fill {
        let d = default_style.get_or_insert_with(NodeStyle::default);
        if d.fill.is_none() {
            d.fill = Some(g);
        }
    }
    (out, default_style)
}

/// Parse a `fill:#f00,stroke:#00f,color:#fff,stroke-width:2px` style list.
fn parse_style(s: &str) -> NodeStyle {
    let mut ns = NodeStyle::default();
    for frag in s.split(',') {
        if let Some((k, v)) = frag.split_once(':') {
            let v = v.trim().to_string();
            match k.trim().to_ascii_lowercase().as_str() {
                "fill" => ns.fill = Some(v),
                "stroke" => ns.stroke = Some(v),
                "color" => ns.color = Some(v),
                "stroke-width" => ns.stroke_width = Some(v),
                "font-weight" => ns.font_weight = Some(v),
                _ => {}
            }
        }
    }
    ns
}

/// Grab the `#rrggbb` (or `#rgb`) following `key` in a (lowercased) line.
fn grab_hex(low: &str, key: &str) -> Option<String> {
    let after = &low[low.find(key)? + key.len()..];
    let h = after.find('#')?;
    let hex: String = after[h..]
        .chars()
        .take_while(|c| *c == '#' || c.is_ascii_hexdigit())
        .collect();
    if hex.len() >= 4 {
        Some(hex)
    } else {
        None
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
