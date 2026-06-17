//! `MermaidFlowchart` — a mermaid flowchart resolved to render-ready form.
//!
//! The terminal stages of the pipeline
//! `parse → Flowchart → MermaidFlowchart → render`:
//! - **parse** (`crate::mermaid`) produces the shared `Flowchart` IR;
//! - [`MermaidFlowchart::parse`] lays it out (positioned `FGeom`) and resolves
//!   `classDef`/`style` into per-node + default [`NodeStyle`]s;
//! - [`MermaidFlowchart::render`] emits raster-safe SVG (`<text>`/`<path>`).
//!
//! Geometry comes from kymo's own dagre adapter by default; the `katex-layout`
//! feature swaps in merman's mermaid-exact positions + kymo-tex KaTeX glyphs.

use std::collections::HashMap;

use kymo_graph::dagre_svg::{self, FGeom};
use kymo_graph::flowchart::Flowchart;
use kymo_graph::style::{FlowStyle, NodeStyle};

use crate::mermaid::{self, MermaidError};

/// A mermaid flowchart resolved to render-ready form: positioned geometry plus
/// the render style and the per-node / default `classDef` styles.
pub struct MermaidFlowchart {
    /// Positioned nodes / edges / regions (float coordinates, raster-safe).
    pub geom: FGeom,
    /// The flowchart look (mermaid palette by default).
    pub style: FlowStyle,
    /// `classDef`/`:::`/`style` resolved per node id.
    pub node_styles: HashMap<String, NodeStyle>,
    /// The `classDef default` style applied to every unstyled node.
    pub default_style: Option<NodeStyle>,
}

impl MermaidFlowchart {
    /// Parse mermaid flowchart source and resolve it to render-ready form
    /// (`parse → Flowchart → MermaidFlowchart`). Math (`$…$`) is rendered into
    /// the labels first; geometry uses the dagre adapter (or merman under
    /// `katex-layout`).
    pub fn parse(src: &str) -> Result<Self, MermaidError> {
        let (mut fc, _) = mermaid::parse_with_config(src)?;
        crate::render_flowchart_math(&mut fc);
        let style = FlowStyle::Mermaid;
        let (node_styles, default_style) = mermaid::extract_node_styles(src);
        let geom = layout(src, &fc, style);
        Ok(Self {
            geom,
            style,
            node_styles,
            default_style,
        })
    }

    /// Render to raster-safe SVG via the shared `kymo_graph` back-end.
    pub fn render(&self) -> String {
        dagre_svg::render(
            &self.geom,
            self.style,
            &self.node_styles,
            self.default_style.as_ref(),
        )
    }
}

/// Default geometry: kymo's OWN dagre adapter (lean, Unicode math, raster-safe).
#[cfg(not(feature = "katex-layout"))]
fn layout(_src: &str, fc: &Flowchart, style: FlowStyle) -> FGeom {
    kymo_graph::layout_dagre::dagre_geom(fc, style)
}

/// `katex-layout` geometry: merman's mermaid-exact positions sized by kymo's
/// browser-calibrated metrics, falling back to the dagre adapter if merman can't
/// lay the graph out.
#[cfg(feature = "katex-layout")]
fn layout(src: &str, fc: &Flowchart, style: FlowStyle) -> FGeom {
    crate::katex_layout::build_geom(src, fc)
        .unwrap_or_else(|| kymo_graph::layout_dagre::dagre_geom(fc, style))
}
