//! kymo's own diagram-layout algorithms — pure Rust, no merman.
//!
//! Hosts the layout passes kymo's mermaid renderers used to borrow from merman:
//! - [`grid`] — the `block` diagram column grid (columns / nested / spans / space).
//! - (planned) `cose` — the `mindmap` force-directed layout.
//!
//! `kymo-graph` already carries the dagre adapter (flowchart / er / state) and
//! the sequence layout lives in `kymo-mermaid`; this crate fills the rest so the
//! default build needs no merman feature.

pub mod grid;
