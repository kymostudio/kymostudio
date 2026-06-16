//! Class-diagram IR. A `classDiagram` parses to a set of class boxes (name,
//! stereotype, attribute and method compartments) plus typed relationships.
//! Rendered by [`svg`] as real `<text>` (raster-safe), positioned by reusing
//! [`kymo_graph::layout::layout_flowchart`].

use kymo_graph::flowchart::Direction;

pub mod svg;

/// A UML class relationship kind (determines the arrowhead / line style).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RelKind {
    /// `<|--` solid line, hollow triangle (inheritance / generalization).
    Inheritance,
    /// `*--` solid line, filled diamond (composition).
    Composition,
    /// `o--` solid line, hollow diamond (aggregation).
    Aggregation,
    /// `-->` solid line, open arrow (association).
    Association,
    /// `..>` dashed line, open arrow (dependency).
    Dependency,
    /// `..|>` dashed line, hollow triangle (realization).
    Realization,
    /// `--` / `..` plain link, no arrowhead.
    Link,
}

/// Crow's-foot multiplicity for one end of an ER relationship.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Crow {
    /// No crow's-foot glyph (non-ER relationship).
    #[default]
    None,
    /// `|o` / `o|` — zero or one (bar + circle).
    ZeroOne,
    /// `||` — exactly one (two bars).
    One,
    /// `}o` / `o{` — zero or many (crow's foot + circle).
    ZeroMany,
    /// `}|` / `|{` — one or many (crow's foot + bar).
    OneMany,
}

/// A directed class relationship.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Relation {
    pub from: String,
    pub to: String,
    pub kind: RelKind,
    /// Dashed line (dependency / realization / dotted link).
    pub dashed: bool,
    /// The decoration sits on the `from` end (the operator pointed left, e.g.
    /// `A <|-- B` means B inherits A: the triangle is at A).
    pub head_at_from: bool,
    pub label: String,
    pub from_card: String,
    pub to_card: String,
    /// Crow's-foot glyph at the `from` end (ER diagrams only).
    pub from_crow: Crow,
    /// Crow's-foot glyph at the `to` end (ER diagrams only).
    pub to_crow: Crow,
}

/// One class box with its three compartments.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ClassBox {
    pub id: String,
    /// Display name (without generics markup), defaults to the id.
    pub name: String,
    /// `<<interface>>` / `<<abstract>>` etc. (no guillemets).
    pub stereotype: String,
    pub attributes: Vec<String>,
    pub methods: Vec<String>,
}

/// A free or attached note.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClassNote {
    pub text: String,
    /// `note for X` attaches to class `X`.
    pub target: Option<String>,
}

/// A parsed class diagram.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClassDiagram {
    pub direction: Direction,
    pub classes: Vec<ClassBox>,
    pub relations: Vec<Relation>,
    pub notes: Vec<ClassNote>,
    /// `namespace X { … }` groupings: (name, member class ids).
    pub namespaces: Vec<(String, Vec<String>)>,
}
