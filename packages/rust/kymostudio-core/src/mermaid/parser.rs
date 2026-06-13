//! Statement-level grammar for Mermaid flowcharts.
//!
//! A statement is one logical line such as `A[Start] --> B{ok?} -->|yes| C`.
//! [`parse_statement`] turns it into an alternating sequence of node refs and
//! edge operators; `mod.rs` stitches those into the node registry and edge list.

use super::lexer::{EdgeTok, Scanner};
use crate::model::Shape;

/// A node reference within a statement. `label`/`shape` are `Some` only when the
/// statement spelled out a wrapper (e.g. `A[Start]`), so a bare `A` later does
/// not clobber an earlier label.
#[derive(Debug, Clone)]
pub struct ParsedNode {
    pub id: String,
    pub label: Option<String>,
    pub shape: Option<Shape>,
}

#[derive(Debug, Clone)]
pub enum Item {
    /// One or more nodes joined by `&` (a fan endpoint), e.g. `A & B`.
    Nodes(Vec<ParsedNode>),
    Edge(EdgeTok),
}

/// Parse one statement into `Node (Edge Node)*`. Returns an error string on a
/// malformed statement (e.g. an edge not followed by a node).
pub fn parse_statement(s: &str) -> Result<Vec<Item>, String> {
    let mut sc = Scanner::new(s);
    let mut items: Vec<Item> = Vec::new();

    sc.skip_ws();
    let first = read_node_group(&mut sc).ok_or_else(|| format!("expected a node, got: {s:?}"))?;
    items.push(Item::Nodes(first));

    loop {
        sc.skip_ws();
        if sc.at_end() {
            break;
        }
        sc.skip_edge_id();
        let op = match sc.read_operator() {
            Some(op) => op,
            None => return Err(format!("expected an edge operator in: {s:?}")),
        };
        items.push(Item::Edge(op));
        sc.skip_ws();
        let group = read_node_group(&mut sc)
            .ok_or_else(|| format!("edge with no destination node in: {s:?}"))?;
        items.push(Item::Nodes(group));
    }
    Ok(items)
}

fn read_node(sc: &mut Scanner) -> Option<ParsedNode> {
    let id = sc.read_id()?;
    let (label, shape) = if let Some((shape, label)) = sc.read_shape() {
        (Some(label), Some(shape))
    } else if let Some((shape, label)) = sc.read_at_metadata() {
        (label, shape)
    } else {
        (None, None)
    };
    // `:::class` inline class assignment carries no graph structure.
    sc.skip_class_suffix();
    Some(ParsedNode { id, label, shape })
}

/// Read a fan endpoint: one node, then any `& node` continuations.
fn read_node_group(sc: &mut Scanner) -> Option<Vec<ParsedNode>> {
    let mut group = vec![read_node(sc)?];
    loop {
        sc.skip_ws();
        if !sc.eat('&') {
            break;
        }
        sc.skip_ws();
        match read_node(sc) {
            Some(n) => group.push(n),
            None => break,
        }
    }
    Some(group)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(items: &[Item]) -> Vec<&str> {
        items
            .iter()
            .filter_map(|it| match it {
                Item::Nodes(g) => Some(g[0].id.as_str()),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn simple_chain() {
        let items = parse_statement("A --> B --> C").unwrap();
        assert_eq!(ids(&items), ["A", "B", "C"]);
        assert_eq!(
            items.iter().filter(|i| matches!(i, Item::Edge(_))).count(),
            2
        );
    }

    #[test]
    fn shapes_and_labels() {
        let items = parse_statement("A[Start] --> B{ok?}").unwrap();
        match &items[0] {
            Item::Nodes(g) => {
                assert_eq!(g[0].label.as_deref(), Some("Start"));
                assert_eq!(g[0].shape, Some(Shape::Box));
            }
            _ => panic!(),
        }
        match &items[2] {
            Item::Nodes(g) => assert_eq!(g[0].shape, Some(Shape::Diamond)),
            _ => panic!(),
        }
    }

    #[test]
    fn edge_label_and_dashed() {
        let items = parse_statement("A -.->|maybe| B").unwrap();
        match &items[1] {
            Item::Edge(e) => {
                assert!(e.dashed);
                assert!(!e.no_arrow);
                assert_eq!(e.label, "maybe");
            }
            _ => panic!(),
        }
    }

    #[test]
    fn line_no_arrow() {
        let items = parse_statement("A --- B").unwrap();
        match &items[1] {
            Item::Edge(e) => {
                assert!(e.no_arrow);
                assert!(!e.dashed);
            }
            _ => panic!(),
        }
    }

    #[test]
    fn at_metadata_shape_and_label() {
        let items = parse_statement("A@{ shape: circle, label: \"Hi\" } --> B").unwrap();
        match &items[0] {
            Item::Nodes(g) => {
                assert_eq!(g[0].shape, Some(Shape::Circle));
                assert_eq!(g[0].label.as_deref(), Some("Hi"));
            }
            _ => panic!(),
        }
    }

    #[test]
    fn class_shorthand_and_edge_id() {
        let items = parse_statement("A:::hot e1@--> B").unwrap();
        assert_eq!(ids(&items), ["A", "B"]);
    }

    #[test]
    fn ampersand_fan() {
        let items = parse_statement("A & B --> C & D").unwrap();
        match (&items[0], &items[2]) {
            (Item::Nodes(l), Item::Nodes(r)) => {
                assert_eq!(
                    l.iter().map(|n| n.id.as_str()).collect::<Vec<_>>(),
                    ["A", "B"]
                );
                assert_eq!(
                    r.iter().map(|n| n.id.as_str()).collect::<Vec<_>>(),
                    ["C", "D"]
                );
            }
            _ => panic!(),
        }
    }

    #[test]
    fn shape_variants() {
        let cases = [
            ("A([x])", Shape::Badge),
            ("A[(x)]", Shape::Cylinder),
            ("A((x))", Shape::Circle),
            ("A{{x}}", Shape::Hex),
            ("A[[x]]", Shape::Box),
            ("A(x)", Shape::Box),
        ];
        for (src, want) in cases {
            let items = parse_statement(src).unwrap();
            match &items[0] {
                Item::Nodes(g) => assert_eq!(g[0].shape, Some(want), "{src}"),
                _ => panic!(),
            }
        }
    }
}
