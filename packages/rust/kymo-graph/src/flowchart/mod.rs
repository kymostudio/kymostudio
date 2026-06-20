//! Format-neutral **flowchart IR** — a positionless node/edge/subgraph model.
//!
//! This is the hub of the flowchart family: front-ends parse a source DSL into a
//! [`Flowchart`] (today only `mermaid::parse`), and back-ends consume it — either
//! `kymo_layout::sugiyama::layout_flowchart` (→ a positioned [`crate::model::Diagram`]
//! for rendering) or the text emitters in [`emit`] (→ Mermaid / D2 / Graphviz
//! DOT). Keeping the IR here (not inside `mermaid`) is what lets one parse feed
//! many targets — `mmd → {mermaid, d2, dot}` is a parse plus an emit, with no
//! geometry in between (each target lays the graph out itself).

pub mod emit;

use crate::model::Shape;

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
    /// Index of the enclosing subgraph, if this one is nested.
    pub parent: Option<usize>,
    /// A `direction XX` override inside this subgraph (mermaid lays each subgraph
    /// out in its own direction). `None` = inherit the diagram direction.
    pub direction: Option<Direction>,
}

/// A parsed flowchart, ready for `kymo_layout::sugiyama::layout_flowchart` or [`emit`].
#[derive(Debug, Clone)]
pub struct Flowchart {
    pub direction: Direction,
    pub nodes: Vec<FlowNode>,
    pub edges: Vec<FlowEdge>,
    pub subgraphs: Vec<Subgraph>,
}
