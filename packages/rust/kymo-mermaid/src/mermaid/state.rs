//! Mermaid state diagrams (`stateDiagram` / `stateDiagram-v2`) → the flowchart
//! IR, so they reuse [`kymo_graph::layout::layout_flowchart`] and the text-based
//! [`kymo_graph::flowchart_svg`] renderer. (merman renders state labels in a
//! `<foreignObject>`, which the rasterizer drops; this keeps PNG/PDF text.)
//!
//! Supported: `A --> B : label` transitions, `[*]` initial/final pseudo-states
//! (a small circle, scoped per composite), `state "desc" as id` aliases,
//! `state id <<choice|fork|join>>` specials, `state id { ... }` composites
//! (→ subgraphs), and `direction`. Notes, styling and accessibility blocks are
//! accepted and ignored.

use super::MermaidError;
use kymo_graph::flowchart::{Direction, FlowEdge, FlowNode, Flowchart, Subgraph};
use kymo_graph::model::Shape;

/// Parse already-split statements (header at index 0) into a [`Flowchart`].
pub(super) fn parse(stmts: &[(usize, String)]) -> Result<Flowchart, MermaidError> {
    let mut fc = Flowchart {
        direction: Direction::Tb,
        nodes: Vec::new(),
        edges: Vec::new(),
        subgraphs: Vec::new(),
    };
    let mut index: Vec<(String, usize)> = Vec::new();
    let mut sub_stack: Vec<usize> = Vec::new();
    let mut skip_note = false;
    let mut skip_acc = false;

    for (_lineno, raw) in stmts.iter().skip(1) {
        let stmt = raw.trim();
        if stmt.is_empty() {
            continue;
        }
        let low = stmt.to_ascii_lowercase();

        if skip_note {
            if low == "end note" {
                skip_note = false;
            }
            continue;
        }
        if skip_acc {
            if stmt.contains('}') {
                skip_acc = false;
            }
            continue;
        }
        if low.starts_with("note ") || low == "note" {
            if !stmt.contains(':') {
                skip_note = true; // a multi-line `note ... end note` block
            }
            continue;
        }
        if low.starts_with("accdescr") || low.starts_with("acctitle") {
            if stmt.contains('{') && !stmt.contains('}') {
                skip_acc = true;
            }
            continue;
        }
        if low.starts_with("classdef ")
            || low.starts_with("class ")
            || low.starts_with("style ")
            || low.starts_with("click ")
            || low.starts_with("scale ")
            || low == "{"
        {
            continue;
        }
        if low == "}" {
            sub_stack.pop();
            continue;
        }
        if low.starts_with("direction ") {
            fc.direction = super::parse_direction(stmt[10..].trim());
            continue;
        }
        // concurrency divider (`--`) inside a composite state
        if stmt.len() >= 2 && stmt.chars().all(|c| c == '-') {
            continue;
        }

        if low == "state" || low.starts_with("state ") {
            handle_decl(stmt[5..].trim(), &mut fc, &mut index, &mut sub_stack);
            continue;
        }

        // transition: `LHS --> RHS [: label]`
        if let Some(pos) = stmt.find("-->") {
            let lhs = stmt[..pos].trim();
            let rest = stmt[pos + 3..].trim();
            let (rhs, label) = match rest.split_once(':') {
                Some((r, l)) => (r.trim(), super::decode_entities(l.trim())),
                None => (rest, String::new()),
            };
            if lhs.is_empty() || rhs.is_empty() {
                continue;
            }
            let src = resolve(lhs, true, &mut fc, &mut index, &sub_stack);
            let dst = resolve(rhs, false, &mut fc, &mut index, &sub_stack);
            fc.edges.push(FlowEdge {
                src,
                dst,
                label,
                dashed: false,
                no_arrow: false,
            });
            continue;
        }

        // `ID : description` — set a state's display label
        if let Some((id, desc)) = stmt.split_once(':') {
            let id = id.trim();
            if !id.is_empty() && id != "[*]" {
                touch(id, None, None, &mut fc, &mut index, &sub_stack);
                set_label(&mut fc, &index, id, super::decode_entities(desc.trim()).trim());
            }
            continue;
        }

        // bare identifier → declare the state
        if stmt != "[*]" {
            touch(stmt, None, None, &mut fc, &mut index, &sub_stack);
        }
    }
    Ok(fc)
}

/// `[*]` → a small circle pseudo-state, distinct per role (initial vs final)
/// and per composite scope. Any other token is a normal state.
fn resolve(
    token: &str,
    is_source: bool,
    fc: &mut Flowchart,
    index: &mut Vec<(String, usize)>,
    sub_stack: &[usize],
) -> String {
    if token == "[*]" {
        let scope = sub_stack
            .last()
            .map(|i| fc.subgraphs[*i].id.clone())
            .unwrap_or_default();
        let (id, shape) = if is_source {
            (format!("[*]s@{scope}"), Shape::StateStart)
        } else {
            (format!("[*]e@{scope}"), Shape::StateEnd)
        };
        touch(&id, Some(String::new()), Some(shape), fc, index, sub_stack);
        id
    } else {
        touch(token, None, None, fc, index, sub_stack)
    }
}

/// Parse a `state ...` declaration: alias (`"desc" as id`), special
/// (`id <<choice|fork|join>>`), or composite (`id { ... }`).
fn handle_decl(
    rest: &str,
    fc: &mut Flowchart,
    index: &mut Vec<(String, usize)>,
    sub_stack: &mut Vec<usize>,
) {
    // Decode entities first so `&lt;&lt;fork&gt;&gt;` reads as `<<fork>>`.
    let decoded = super::decode_entities(rest.trim());
    let mut rest = decoded.as_str();
    let opens = rest.ends_with('{');
    if opens {
        rest = rest[..rest.len() - 1].trim_end();
    }

    let mut shape = None;
    if let Some(p) = rest.find("<<") {
        let kind = &rest[p..];
        shape = Some(if kind.contains("choice") {
            Shape::Diamond
        } else {
            Shape::StateFork // fork / join — a solid bar
        });
        rest = rest[..p].trim_end();
    }

    let (id, label) = if let Some(apos) = rest.find(" as ") {
        let desc = rest[..apos].trim().trim_matches('"').to_string();
        (rest[apos + 4..].trim().to_string(), Some(desc))
    } else {
        (rest.trim().trim_matches('"').to_string(), None)
    };
    if id.is_empty() {
        return;
    }

    if opens {
        let title = label.unwrap_or_else(|| id.clone());
        register_member(fc, sub_stack, &id);
        let sub_idx = fc.subgraphs.len();
        let parent = sub_stack.last().copied();
        fc.subgraphs.push(Subgraph {
            id: id.clone(),
            title,
            members: Vec::new(),
            parent,
            direction: None,
        });
        sub_stack.push(sub_idx);
    } else {
        touch(&id, label, shape, fc, index, sub_stack);
    }
}

/// Insert or update a state node, registering it in the current composite.
fn touch(
    id: &str,
    label: Option<String>,
    shape: Option<Shape>,
    fc: &mut Flowchart,
    index: &mut Vec<(String, usize)>,
    sub_stack: &[usize],
) -> String {
    if let Some((_, idx)) = index.iter().find(|(i, _)| i == id) {
        if let Some(l) = label {
            fc.nodes[*idx].label = l;
        }
        if let Some(s) = shape {
            fc.nodes[*idx].shape = s;
        }
    } else {
        let idx = fc.nodes.len();
        fc.nodes.push(FlowNode {
            id: id.to_string(),
            label: label.unwrap_or_else(|| id.to_string()),
            shape: shape.unwrap_or(Shape::Box),
        });
        index.push((id.to_string(), idx));
    }
    register_member(fc, sub_stack, id);
    id.to_string()
}

fn set_label(fc: &mut Flowchart, index: &[(String, usize)], id: &str, label: &str) {
    if let Some((_, idx)) = index.iter().find(|(i, _)| i == id) {
        fc.nodes[*idx].label = label.to_string();
    }
}

fn register_member(fc: &mut Flowchart, sub_stack: &[usize], id: &str) {
    if let Some(&sub_idx) = sub_stack.last() {
        let members = &mut fc.subgraphs[sub_idx].members;
        if !members.iter().any(|m| m == id) {
            members.push(id.to_string());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::parse_state;
    use kymo_graph::flowchart::Direction;

    #[test]
    fn transitions_and_pseudo_states() {
        let fc =
            parse_state("stateDiagram-v2\n[*] --> Idle\nIdle --> Active: start\nActive --> [*]")
                .unwrap();
        // Idle, Active, plus one start and one final pseudo-state.
        assert!(fc.nodes.iter().any(|n| n.id == "Idle"));
        assert!(fc.nodes.iter().any(|n| n.id == "Active"));
        assert_eq!(
            fc.nodes.iter().filter(|n| n.id.starts_with("[*]")).count(),
            2
        );
        // labelled transition kept.
        assert!(fc.edges.iter().any(|e| e.label == "start"));
    }

    #[test]
    fn alias_direction_and_composite() {
        let fc = parse_state(
            "stateDiagram-v2\ndirection LR\nstate \"Long name\" as s1\nstate Outer {\n[*] --> Inner\n}",
        )
        .unwrap();
        assert_eq!(fc.direction, Direction::Lr);
        assert!(fc
            .nodes
            .iter()
            .any(|n| n.id == "s1" && n.label == "Long name"));
        // composite became a subgraph holding its inner members.
        let outer = fc.subgraphs.iter().find(|s| s.id == "Outer").unwrap();
        assert!(outer.members.iter().any(|m| m == "Inner"));
    }
}
