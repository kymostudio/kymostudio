//! kymo-tex bridge — renders `$$…$$` math to raster-safe SVG glyph paths via
//! kymo's own KaTeX-compatible engine (`packages/rust/kymo-tex`, a fork of
//! RaTeX). This replaces the earlier hand-rolled single-line symbol renderer:
//! full KaTeX coverage (fractions, radicals, scripts, matrices, …) drawn with
//! KaTeX's own font outlines, so the rasterised output tracks mermaid.js's KaTeX.
//!
//! Only compiled under the `merman-layout` feature (see lib.rs); the math `<g>`
//! is sized + centred by [`crate::merman_layout`].

use kymo_layout::{layout, to_display_list, LayoutOptions};
use kymo_parser::parser::parse;
use kymo_svg::{render_to_svg, SvgOptions};
use kymo_types::color::Color;

/// mermaid's default-theme node label colour (`nodeTextColor`). kymo-tex defaults
/// to pure black; mermaid draws labels (and KaTeX math) in `#333333`, so without
/// this every math glyph pixel is ~20% darker than the reference.
const MERMAID_TEXT_COLOR: &str = "#333333";

/// Render a math formula to `(inner SVG body, width_em, height_em, baseline_em)`.
/// The body has a top-left origin spanning `[0,width] × [0,height]` em with the
/// text baseline at `y = baseline_em` (= ascent); the caller scales em→px and
/// centres on the math axis. `None` if the formula doesn't parse.
pub fn render(formula: &str) -> Option<(String, f64, f64, f64)> {
    // Mermaid double-escapes commands (`\\alpha` is a real `\alpha`).
    let normalized = formula.replace("\\\\", "\\");
    let ast = parse(&normalized).ok()?;
    let layout_opts =
        LayoutOptions::default().with_color(Color::parse(MERMAID_TEXT_COLOR).unwrap_or(Color::BLACK));
    let lbox = layout(&ast, &layout_opts);
    let dl = to_display_list(&lbox);
    let (w_em, h_em, baseline_em) = (dl.width, dl.height + dl.depth, dl.height);
    if w_em <= 0.0 || dl.items.is_empty() {
        return None;
    }
    // font_size = 1 → user units ARE em; padding 0 → content spans the box.
    let opts = SvgOptions {
        font_size: 1.0,
        padding: 0.0,
        stroke_width: 0.04, // KaTeX default rule thickness, in em
        embed_glyphs: true,
        font_dir: String::new(),
    };
    let svg = render_to_svg(&dl, &opts);
    let inner = strip_svg_wrapper(&svg)?;
    Some((inner, w_em, h_em, baseline_em))
}

/// Strip the outer `<svg …>` / `</svg>` to leave just the drawable body.
fn strip_svg_wrapper(svg: &str) -> Option<String> {
    let body_start = svg.find('>')? + 1;
    let body_end = svg.rfind("</svg>")?;
    if body_end < body_start {
        return None;
    }
    Some(svg[body_start..body_end].to_string())
}
