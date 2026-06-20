//! Shared diagram substrate for kymostudio.
//!
//! The `Flowchart` IR, layout, the raster-safe SVG renderer, and the generic
//! format engines (d2/dot/drawio/kymojson). Both `kymostudio-core` and
//! `kymo-mermaid` depend on this crate — it carries no mermaid front-end, no
//! resvg rasteriser, and no BPMN importer (only `bpmn`-gated model fields).
//!
//! The module graph is closed: every `crate::…` reference here resolves within
//! this crate. Downstream crates re-export these modules (core does so under the
//! same names for API stability).

pub mod model;
pub mod kymojson;
pub mod math;
pub mod style;
pub mod flowchart;
pub mod metrics;
pub mod flowchart_svg;
pub mod dagre_svg;
pub mod drawio;
pub mod d2;
pub mod dot;
