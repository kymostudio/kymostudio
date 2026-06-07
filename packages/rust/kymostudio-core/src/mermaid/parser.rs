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
    Node(ParsedNode),
    Edge(EdgeTok),
}

/// Parse one statement into `Node (Edge Node)*`. Returns an error string on a
/// malformed statement (e.g. an edge not followed by a node).
pub fn parse_statement(s: &str) -> Result<Vec<Item>, String> {
    let mut sc = Scanner::new(s);
    let mut items: Vec<Item> = Vec::new();

    sc.skip_ws();
    let first = read_node(&mut sc).ok_or_else(|| format!("expected a node, got: {s:?}"))?;
    items.push(Item::Node(first));

    loop {
        sc.skip_ws();
        if sc.at_end() {
            break;
        }
        let op = match sc.read_operator() {
            Some(op) => op,
            None => return Err(format!("expected an edge operator in: {s:?}")),
        };
        items.push(Item::Edge(op));
        sc.skip_ws();
        let node =
            read_node(&mut sc).ok_or_else(|| format!("edge with no destination node in: {s:?}"))?;
        items.push(Item::Node(node));
    }
    Ok(items)
}

fn read_node(sc: &mut Scanner) -> Option<ParsedNode> {
    let id = sc.read_id()?;
    let (label, shape) = match sc.read_shape() {
        Some((shape, label)) => (Some(label), Some(shape)),
        None => (None, None),
    };
    Some(ParsedNode { id, label, shape })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(items: &[Item]) -> Vec<&str> {
        items
            .iter()
            .filter_map(|it| match it {
                Item::Node(n) => Some(n.id.as_str()),
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
            Item::Node(n) => {
                assert_eq!(n.label.as_deref(), Some("Start"));
                assert_eq!(n.shape, Some(Shape::Box));
            }
            _ => panic!(),
        }
        match &items[2] {
            Item::Node(n) => assert_eq!(n.shape, Some(Shape::Diamond)),
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
                Item::Node(n) => assert_eq!(n.shape, Some(want), "{src}"),
                _ => panic!(),
            }
        }
    }
}
