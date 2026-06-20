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
        let mut fc = mermaid::parse_with_config(src)?.0;
        // Collect `$$…$$` glyph boxes BEFORE labels are cleaned to Unicode, so the
        // dagre layout sizes math nodes/edges by their KaTeX box and draws glyphs.
        let (node_math, edge_math) = collect_math(&fc);
        crate::render_flowchart_math(&mut fc); // Unicode fallback for any math
        let style = FlowStyle::Mermaid;
        let (node_styles, default_style) = mermaid::extract_node_styles(src);
        let mut geom = kymo_layout::dagre_geom_with_math(&fc, style, &node_math, &edge_math);
        // Apply a `%%{init: {theme: …}}%%` palette (dark/forest/neutral).
        if geom.theme.is_none() {
            geom.theme = theme_colors(src);
        }
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

/// `$$…$$` glyph boxes per node id / edge endpoints, for the dagre math sizing.
/// With `math` (default) kymo-tex renders the glyphs; without it the maps are
/// empty and math labels fall back to their Unicode form.
type MathMaps = (
    std::collections::HashMap<String, kymo_layout::dagre::MathBox>,
    std::collections::HashMap<(String, String), kymo_layout::dagre::MathBox>,
);
#[cfg(feature = "math")]
fn collect_math(fc: &Flowchart) -> MathMaps {
    crate::math_glyph::collect(fc)
}
#[cfg(not(feature = "math"))]
fn collect_math(_fc: &Flowchart) -> MathMaps {
    Default::default()
}

/// Map a `%%{init: {"theme": "dark"|"forest"|"neutral"}}%%` directive to kymo's
/// `ThemeColors` (mermaid's built-in palettes). `None` for default/base/unknown
/// (kymo's default palette already matches mermaid's default theme).
fn theme_colors(src: &str) -> Option<kymo_graph::dagre_svg::ThemeColors> {
    use kymo_graph::dagre_svg::ThemeColors;
    let low = src.to_ascii_lowercase();
    if !low.contains("\"theme\"") && !low.contains("'theme'") && !low.contains("theme:") {
        return None;
    }
    let i = low.find("theme")?;
    let val: String = low[i + 5..]
        .trim_start_matches(|c: char| c == ':' || c == '"' || c == '\'' || c == ' ')
        .chars()
        .take_while(|c| c.is_ascii_alphabetic())
        .collect();
    let c = |s: &str| Some(s.to_string());
    let (nf, ns, tx, ln, cf, cs) = match val.as_str() {
        "dark" => ("#1f2020", "#ccc", "#ccc", "lightgrey", "hsl(180,1.6%,28.4%)", "rgba(255,255,255,0.25)"),
        "forest" => ("#cde498", "#13540c", "#333333", "#000000", "#cdffb2", "#6eaa49"),
        "neutral" => ("#eeeeee", "#999999", "#333333", "#666666", "#ffffff", "#aaaaaa"),
        _ => return None,
    };
    Some(ThemeColors {
        node_fill: c(nf),
        node_stroke: c(ns),
        text: c(tx),
        line: c(ln),
        cluster_fill: c(cf),
        cluster_stroke: c(cs),
        background: None, // mermaid keeps the svg background white even in dark theme
        gradient: None,
        drop_shadow: false,
    })
}
