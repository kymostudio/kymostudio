//! Text emitters for the flowchart IR: [`to_mermaid`], [`to_d2`], [`to_dot`].
//!
//! Each turns a positionless [`Flowchart`] back into a source DSL — the target
//! lays the graph out itself, so no geometry is involved. These are the "spokes"
//! that make `mmd → {mermaid, d2, dot}` a parse-then-emit with the IR as the hub:
//!
//! - [`to_mermaid`] is the inverse of the importer (round-trip / normalize).
//! - [`to_d2`] / [`to_dot`] target node-edge DSLs whose model matches the IR
//!   directly; shapes map nearly 1:1 (D2 `cylinder`/`hexagon`, DOT `cylinder`/
//!   `hexagon`), with stadium→`oval`/rounded-box where there is no exact glyph.
//!
//! Output is deterministic: declaration order is preserved (the IR's `Vec`s),
//! and HashMaps are used only for lookup, never iteration.

use super::{Direction, FlowEdge, FlowNode, Flowchart};
use crate::model::Shape;
use std::collections::{HashMap, HashSet};

// ── Mermaid (round-trip) ─────────────────────────────────────────────────────

/// Emit the IR as Mermaid `flowchart` source — the inverse of `mermaid::parse`.
pub fn to_mermaid(fc: &Flowchart) -> String {
    let dir = match fc.direction {
        Direction::Tb => "TD",
        Direction::Bt => "BT",
        Direction::Lr => "LR",
        Direction::Rl => "RL",
    };
    let mut out = format!("flowchart {dir}\n");
    // Declare every node (with its shape) in IR order, then mark subgraph
    // membership with bare-id refs inside `subgraph … end`. This preserves
    // declaration order, so `mmd → IR → mmd → IR` is a fixpoint (a node listed
    // inside a subgraph keeps the shape it was declared with — Mermaid semantics).
    for n in &fc.nodes {
        out.push_str(&format!("  {}\n", mmd_node(n)));
    }
    for sg in &fc.subgraphs {
        if sg.title.is_empty() {
            out.push_str(&format!("  subgraph {}\n", sg.id));
        } else {
            out.push_str(&format!(
                "  subgraph {} [{}]\n",
                sg.id,
                mmd_quote(&sg.title)
            ));
        }
        for m in &sg.members {
            out.push_str(&format!("    {m}\n"));
        }
        out.push_str("  end\n");
    }
    for e in &fc.edges {
        out.push_str(&format!("  {} {} {}\n", e.src, mmd_op(e), e.dst));
    }
    out
}

fn mmd_node(n: &FlowNode) -> String {
    let (open, close) = match n.shape {
        Shape::Circle => ("((", "))"),
        Shape::Diamond => ("{", "}"),
        Shape::Hex => ("{{", "}}"),
        Shape::Cylinder => ("[(", ")]"),
        Shape::Badge => ("([", "])"),
        Shape::Box => ("(", ")"), // rounded
        _ => ("[", "]"),          // sharp rect & anything without a flowchart glyph
    };
    format!("{}{}{}{}", n.id, open, mmd_quote(&n.label), close)
}

fn mmd_op(e: &FlowEdge) -> String {
    let op = match (e.dashed, e.no_arrow) {
        (true, true) => "-.-",
        (true, false) => "-.->",
        (false, true) => "---",
        (false, false) => "-->",
    };
    if e.label.is_empty() {
        op.to_string()
    } else {
        format!("{op}|{}|", e.label)
    }
}

/// Mermaid quotes a label (containing spaces/delimiters) with `"…"`; inner `"`
/// collapse to `'` (the importer strips one surrounding quote pair).
fn mmd_quote(s: &str) -> String {
    format!("\"{}\"", s.replace('"', "'"))
}

// ── D2 ───────────────────────────────────────────────────────────────────────

/// Emit the IR as [D2](https://d2lang.com) source. Subgraphs become containers
/// (`g: "title" { … }`) and members are referenced by their qualified `g.id`.
pub fn to_d2(fc: &Flowchart) -> String {
    let dir = match fc.direction {
        Direction::Lr => "right",
        Direction::Rl => "left",
        Direction::Tb => "down",
        Direction::Bt => "up",
    };
    let mut out = format!("direction: {dir}\n");

    // member id → qualified `sub.id` (D2 references container children by path).
    let mut qual: HashMap<&str, String> = HashMap::new();
    for sg in &fc.subgraphs {
        for m in &sg.members {
            qual.insert(m.as_str(), format!("{}.{}", sg.id, m));
        }
    }
    let q = |id: &str| qual.get(id).cloned().unwrap_or_else(|| id.to_string());
    let by_id: HashMap<&str, &FlowNode> = fc.nodes.iter().map(|n| (n.id.as_str(), n)).collect();
    let mut in_sub: HashSet<&str> = HashSet::new();

    for sg in &fc.subgraphs {
        out.push_str(&format!("{}: {} {{\n", sg.id, d2_quote(&sg.title)));
        for m in &sg.members {
            in_sub.insert(m.as_str());
            if let Some(n) = by_id.get(m.as_str()) {
                out.push_str(&format!("  {}\n", d2_node(&n.id, n)));
            }
        }
        out.push_str("}\n");
    }
    for n in &fc.nodes {
        if !in_sub.contains(n.id.as_str()) {
            out.push_str(&format!("{}\n", d2_node(&n.id, n)));
        }
    }
    for e in &fc.edges {
        let conn = if e.no_arrow { "--" } else { "->" };
        let mut line = format!("{} {} {}", q(&e.src), conn, q(&e.dst));
        if !e.label.is_empty() {
            line.push_str(&format!(": {}", d2_quote(&e.label)));
        }
        if e.dashed {
            line.push_str(" { style.stroke-dash: 3 }");
        }
        out.push_str(&line);
        out.push('\n');
    }
    out
}

fn d2_node(local: &str, n: &FlowNode) -> String {
    let label = d2_quote(&n.label);
    match d2_shape(n.shape) {
        Some(sh) => format!("{local}: {label} {{ shape: {sh} }}"),
        None => format!("{local}: {label}"), // box → default rectangle
    }
}

fn d2_shape(s: Shape) -> Option<&'static str> {
    match s {
        Shape::Circle => Some("circle"),
        Shape::Diamond => Some("diamond"),
        Shape::Hex => Some("hexagon"),
        Shape::Cylinder => Some("cylinder"),
        Shape::Badge => Some("oval"), // stadium ≈ oval (no exact D2 glyph)
        _ => None,
    }
}

fn d2_quote(s: &str) -> String {
    format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\""))
}

// ── Graphviz DOT ─────────────────────────────────────────────────────────────

/// Emit the IR as Graphviz [DOT](https://graphviz.org/doc/info/lang.html).
/// Subgraphs become `cluster_*` subgraphs; node membership is positional (a
/// node's statement inside a cluster places it there).
pub fn to_dot(fc: &Flowchart) -> String {
    let rankdir = match fc.direction {
        Direction::Lr => "LR",
        Direction::Rl => "RL",
        Direction::Tb => "TB",
        Direction::Bt => "BT",
    };
    let mut out = String::from("digraph G {\n");
    out.push_str(&format!("  rankdir={rankdir};\n"));
    out.push_str("  node [fontsize=12];\n");

    let by_id: HashMap<&str, &FlowNode> = fc.nodes.iter().map(|n| (n.id.as_str(), n)).collect();
    let mut in_sub: HashSet<&str> = HashSet::new();

    for sg in &fc.subgraphs {
        out.push_str(&format!("  subgraph cluster_{} {{\n", sg.id));
        if !sg.title.is_empty() {
            out.push_str(&format!("    label={};\n", dot_quote(&sg.title)));
        }
        for m in &sg.members {
            in_sub.insert(m.as_str());
            if let Some(n) = by_id.get(m.as_str()) {
                out.push_str(&format!("    {} [{}];\n", n.id, dot_attrs(n)));
            }
        }
        out.push_str("  }\n");
    }
    for n in &fc.nodes {
        if !in_sub.contains(n.id.as_str()) {
            out.push_str(&format!("  {} [{}];\n", n.id, dot_attrs(n)));
        }
    }
    for e in &fc.edges {
        let mut attrs: Vec<String> = Vec::new();
        if !e.label.is_empty() {
            attrs.push(format!("label={}", dot_quote(&e.label)));
        }
        if e.dashed {
            attrs.push("style=dashed".to_string());
        }
        if e.no_arrow {
            attrs.push("dir=none".to_string());
        }
        let tail = if attrs.is_empty() {
            String::new()
        } else {
            format!(" [{}]", attrs.join(", "))
        };
        out.push_str(&format!("  {} -> {}{};\n", e.src, e.dst, tail));
    }
    out.push_str("}\n");
    out
}

fn dot_attrs(n: &FlowNode) -> String {
    let (shape, extra) = match n.shape {
        Shape::Circle => ("circle", ""),
        Shape::Diamond => ("diamond", ""),
        Shape::Hex => ("hexagon", ""),
        Shape::Cylinder => ("cylinder", ""),
        Shape::Badge => ("box", ", style=rounded"), // stadium ≈ rounded box
        _ => ("box", ""),
    };
    format!("label={}, shape={}{}", dot_quote(&n.label), shape, extra)
}

fn dot_quote(s: &str) -> String {
    format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\""))
}

#[cfg(test)]
mod tests {
    use super::{to_d2, to_dot, to_mermaid};
    use crate::flowchart::{Direction, FlowEdge, FlowNode, Flowchart, Subgraph};
    use crate::model::Shape;

    fn n(id: &str, label: &str, shape: Shape) -> FlowNode {
        FlowNode {
            id: id.into(),
            label: label.into(),
            shape,
        }
    }
    fn e(src: &str, dst: &str, label: &str, dashed: bool, no_arrow: bool) -> FlowEdge {
        FlowEdge {
            src: src.into(),
            dst: dst.into(),
            label: label.into(),
            dashed,
            no_arrow,
        }
    }
    fn fc(
        dir: Direction,
        nodes: Vec<FlowNode>,
        edges: Vec<FlowEdge>,
        subgraphs: Vec<Subgraph>,
    ) -> Flowchart {
        Flowchart {
            direction: dir,
            nodes,
            edges,
            subgraphs,
        }
    }
    fn one(shape: Shape) -> Flowchart {
        fc(Direction::Tb, vec![n("A", "Lbl", shape)], vec![], vec![])
    }

    // ── Mermaid ──────────────────────────────────────────────────────────
    #[test]
    fn mermaid_shape_wrappers() {
        assert!(to_mermaid(&one(Shape::Rect)).contains("A[\"Lbl\"]")); // sharp
        assert!(to_mermaid(&one(Shape::Box)).contains("A(\"Lbl\")")); // rounded
        assert!(to_mermaid(&one(Shape::Circle)).contains("A((\"Lbl\"))"));
        assert!(to_mermaid(&one(Shape::Diamond)).contains("A{\"Lbl\"}"));
        assert!(to_mermaid(&one(Shape::Hex)).contains("A{{\"Lbl\"}}"));
        assert!(to_mermaid(&one(Shape::Cylinder)).contains("A[(\"Lbl\")]"));
        assert!(to_mermaid(&one(Shape::Badge)).contains("A([\"Lbl\"])"));
    }

    #[test]
    fn mermaid_edge_operators_and_label() {
        let g = fc(
            Direction::Tb,
            vec![n("A", "A", Shape::Box), n("B", "B", Shape::Box)],
            vec![
                e("A", "B", "", false, false), // -->
                e("A", "B", "", false, true),  // ---
                e("A", "B", "", true, false),  // -.->
                e("A", "B", "", true, true),   // -.-
                e("A", "B", "yes", false, false),
            ],
            vec![],
        );
        let out = to_mermaid(&g);
        assert!(out.contains("A --> B"));
        assert!(out.contains("A --- B"));
        assert!(out.contains("A -.-> B"));
        assert!(out.contains("A -.- B"));
        assert!(out.contains("A -->|yes| B"));
    }

    #[test]
    fn mermaid_direction_header_and_quote() {
        assert!(to_mermaid(&fc(Direction::Lr, vec![], vec![], vec![])).starts_with("flowchart LR"));
        assert!(to_mermaid(&fc(Direction::Bt, vec![], vec![], vec![])).starts_with("flowchart BT"));
        // Inner double-quotes collapse to single quotes.
        assert!(to_mermaid(&one_label("a\"b")).contains("A[\"a'b\"]"));
    }
    fn one_label(label: &str) -> Flowchart {
        fc(
            Direction::Tb,
            vec![n("A", label, Shape::Rect)],
            vec![],
            vec![],
        )
    }

    #[test]
    fn mermaid_subgraph_membership_order_preserved() {
        let g = fc(
            Direction::Tb,
            vec![n("S", "S", Shape::Rect), n("A", "A", Shape::Rect)],
            vec![],
            vec![Subgraph {
                parent: None,
                id: "G".into(),
                title: "Grp".into(),
                members: vec!["A".into()],
            }],
        );
        let out = to_mermaid(&g);
        // All nodes declared first (in IR order), then membership-only refs.
        assert!(out.find("S[\"S\"]").unwrap() < out.find("subgraph G [\"Grp\"]").unwrap());
        assert!(out.contains("subgraph G [\"Grp\"]\n    A\n  end"));
    }

    // ── D2 ───────────────────────────────────────────────────────────────
    #[test]
    fn d2_direction_and_shapes() {
        assert!(to_d2(&fc(Direction::Lr, vec![], vec![], vec![])).starts_with("direction: right"));
        assert!(to_d2(&fc(Direction::Rl, vec![], vec![], vec![])).starts_with("direction: left"));
        assert!(to_d2(&one(Shape::Diamond)).contains("A: \"Lbl\" { shape: diamond }"));
        assert!(to_d2(&one(Shape::Cylinder)).contains("shape: cylinder"));
        assert!(to_d2(&one(Shape::Badge)).contains("shape: oval"));
        // box → default rectangle, no shape block.
        let boxed = to_d2(&one(Shape::Box));
        assert!(boxed.contains("A: \"Lbl\"") && !boxed.contains("shape:"));
    }

    #[test]
    fn d2_edges_connector_dash_label() {
        let g = fc(
            Direction::Tb,
            vec![n("A", "A", Shape::Box), n("B", "B", Shape::Box)],
            vec![
                e("A", "B", "lbl", true, false),
                e("A", "B", "", false, true),
            ],
            vec![],
        );
        let out = to_d2(&g);
        assert!(out.contains("A -> B: \"lbl\" { style.stroke-dash: 3 }"));
        assert!(out.contains("A -- B")); // no-arrow connector
    }

    #[test]
    fn d2_container_qualifies_member_edge() {
        let g = fc(
            Direction::Tb,
            vec![n("A", "A", Shape::Box), n("B", "B", Shape::Box)],
            vec![e("A", "B", "", false, false)],
            vec![Subgraph {
                parent: None,
                id: "G".into(),
                title: "T".into(),
                members: vec!["B".into()],
            }],
        );
        let out = to_d2(&g);
        assert!(out.contains("G: \"T\" {"));
        assert!(out.contains("A -> G.B")); // member referenced by qualified path
    }

    // ── DOT ──────────────────────────────────────────────────────────────
    #[test]
    fn dot_rankdir_and_shapes() {
        assert!(to_dot(&fc(Direction::Lr, vec![], vec![], vec![])).contains("rankdir=LR;"));
        assert!(to_dot(&one(Shape::Diamond)).contains("shape=diamond"));
        assert!(to_dot(&one(Shape::Hex)).contains("shape=hexagon"));
        assert!(to_dot(&one(Shape::Badge)).contains("shape=box, style=rounded"));
    }

    #[test]
    fn dot_edge_attrs_and_escaping() {
        let g = fc(
            Direction::Tb,
            vec![n("A", "A", Shape::Box), n("B", "say \"hi\"", Shape::Box)],
            vec![e("A", "B", "go", true, false), e("A", "B", "", false, true)],
            vec![],
        );
        let out = to_dot(&g);
        assert!(out.contains("A -> B [label=\"go\", style=dashed];"));
        assert!(out.contains("A -> B [dir=none];"));
        assert!(out.contains("label=\"say \\\"hi\\\"\"")); // quotes escaped
    }

    #[test]
    fn dot_cluster_holds_members() {
        let g = fc(
            Direction::Tb,
            vec![n("A", "A", Shape::Box)],
            vec![],
            vec![Subgraph {
                parent: None,
                id: "G".into(),
                title: "T".into(),
                members: vec!["A".into()],
            }],
        );
        let out = to_dot(&g);
        assert!(out.contains("subgraph cluster_G {"));
        assert!(out.contains("label=\"T\";"));
    }

    #[test]
    fn empty_graph_is_well_formed() {
        let empty = fc(Direction::Tb, vec![], vec![], vec![]);
        assert_eq!(to_mermaid(&empty), "flowchart TD\n");
        assert_eq!(to_d2(&empty), "direction: down\n");
        assert!(to_dot(&empty).starts_with("digraph G {") && to_dot(&empty).ends_with("}\n"));
    }
}
