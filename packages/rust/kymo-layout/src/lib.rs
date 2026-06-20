//! kymo's own diagram-layout algorithms — pure Rust, no merman.
//!
//! The single home for every graph/diagram layout kymo's mermaid renderers use:
//! - [`dagre`] — the dagre adapter (flowchart / er / state): `Flowchart` → `FGeom`.
//! - [`sugiyama`] — the layered flowchart layout: `Flowchart` → `Diagram`.
//! - [`grid`] — the `block` diagram column grid (columns / nested / spans / space).
//! - [`cose`] — the `mindmap` force-directed (cose-bilkent) layout.
//!
//! IR, geometry types, text metrics and the SVG renderer live in `kymo-graph`;
//! this crate depends on it for those and supplies only the algorithms.

pub mod cose;
pub mod dagre;
pub mod grid;
pub mod sugiyama;

// Convenience re-exports so callers use `kymo_layout::dagre_geom` /
// `kymo_layout::layout_flowchart` directly.
pub use dagre::dagre_geom;
pub use sugiyama::{layout_flowchart, layout_flowchart_styled};
