//! Render style for the flowchart family: kymo's native look vs a
//! mermaid.js-like look. Selected per render call (API param) or detected from
//! the source's frontmatter / `%%{init}%%` directive; the renderer
//! ([`crate::flowchart_svg`]) and sizing (`kymo_layout`) branch on it.

/// Visual language of a flowchart render.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum FlowStyle {
    /// kymo's own look: blue theme, dotted background, rounded boxes.
    #[default]
    Kymo,
    /// mermaid.js default theme: lavender nodes, purple borders, `#333` edges,
    /// transparent background, sharp `[...]` rectangles.
    Mermaid,
}

impl FlowStyle {
    /// Map a style name to a [`FlowStyle`]; `None` for unrecognized/absent
    /// (so callers can fall through to source-config or the default).
    pub fn from_str_opt(s: &str) -> Option<FlowStyle> {
        match s.trim().to_ascii_lowercase().as_str() {
            "mermaid" | "mermaidjs" | "mermaid.js" => Some(FlowStyle::Mermaid),
            "kymo" | "kymostudio" => Some(FlowStyle::Kymo),
            _ => None,
        }
    }
}

/// Per-node colour override (from `classDef` / `class` / `:::` / `style` /
/// `themeVariables`). Applied as an inline style so it beats the palette CSS.
#[derive(Debug, Clone, Default)]
pub struct NodeStyle {
    pub fill: Option<String>,
    pub stroke: Option<String>,
    pub color: Option<String>,
    pub stroke_width: Option<String>,
    pub font_weight: Option<String>,
}

impl NodeStyle {
    /// CSS for the shape element (`fill`/`stroke`/`stroke-width`).
    pub fn shape_css(&self) -> String {
        let mut o = String::new();
        if let Some(f) = &self.fill {
            o.push_str(&format!("fill:{f};"));
        }
        if let Some(k) = &self.stroke {
            o.push_str(&format!("stroke:{k};"));
        }
        if let Some(w) = &self.stroke_width {
            o.push_str(&format!("stroke-width:{w};"));
        }
        o
    }
}
