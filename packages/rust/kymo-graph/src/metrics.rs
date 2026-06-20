//! Mermaid text metrics + node sizing — the browser-calibrated character-width
//! table and the per-shape box sizing. Split out of the old `layout.rs` so the
//! renderer (this crate) and the layout algorithms (`kymo-layout`) share one
//! sizing source without a crate cycle.

use crate::model::Shape;
use crate::style::FlowStyle;

const CHAR_W: f64 = 8.0; // ~13px semibold label, with breathing room

/// Real (width, height) of a flowchart node's glyph box, sized to its label.
/// Boxes stay upright regardless of flow direction.
/// Per-character advance widths for mermaid's font at 16px (ASCII 32..126),
/// measured from Chrome. Lets `node_size` match mermaid's text metrics so dagre
/// packs nodes at mermaid's coordinates.
const CHAR_W_MERMAID: [f64; 95] = [
    4.45, 4.45, 5.68, 8.90, 8.90, 14.23, 10.67, 3.05, 5.33, 5.33, 6.23, 9.34, 4.45, 5.33, 4.45,
    4.45, 8.90, 8.90, 8.90, 8.90, 8.90, 8.90, 8.90, 8.90, 8.90, 8.90, 4.45, 4.45, 9.34, 9.34, 9.34,
    8.90, 16.24, 10.67, 10.67, 11.55, 11.55, 10.67, 9.77, 12.45, 11.55, 4.45, 8.00, 10.67, 8.90,
    13.33, 11.55, 12.45, 10.67, 12.45, 11.55, 10.67, 9.77, 11.55, 10.67, 15.10, 10.67, 10.67, 9.77,
    4.45, 4.45, 4.45, 7.51, 8.90, 5.33, 8.90, 8.90, 8.00, 8.90, 8.90, 4.45, 8.90, 8.90, 3.55, 3.55,
    8.00, 3.55, 13.33, 8.90, 8.90, 8.90, 8.90, 5.33, 8.00, 4.45, 8.90, 8.00, 10.67, 8.00, 8.00,
    8.00, 5.34, 4.16, 5.34, 9.34,
];

/// Width of a single-line label in mermaid's 16px font.
/// `pub` so `kymo-mermaid`'s `katex-layout` measurer can size nodes with kymo's
/// browser-calibrated metrics (see kymo-mermaid/src/merman_layout.rs).
pub fn text_w_mermaid(s: &str) -> f64 {
    s.chars()
        .map(|c| {
            let i = c as u32;
            if (32..127).contains(&i) {
                CHAR_W_MERMAID[(i - 32) as usize]
            } else {
                8.9
            }
        })
        .sum()
}

/// Public wrapper so the dagre adapter can size nodes identically.
pub fn node_size_for(label: &str, shape: Shape, style: FlowStyle) -> (i32, i32) {
    node_size(label, shape, style)
}

/// Float-precision mermaid node sizing (no rounding) for the dagre path, so the
/// diagram extent and node centres match mermaid.js to sub-pixel: mermaid sizes a
/// box to `measured_text_width + padding` exactly (e.g. "Middle" 47.14 + 60 =
/// 107.14), and the integer [`node_size`] rounds that 0.14 away — enough to push
/// the total width across an integer boundary and misalign the whole canvas.
/// Greedy word-wrap at mermaid's flowchart wrapping width (~200px of text).
pub fn wrap_mermaid(label: &str) -> Vec<String> {
    const MAX_W: f64 = 200.0;
    let mut lines: Vec<String> = Vec::new();
    let mut cur = String::new();
    for word in label.split_whitespace() {
        let trial = if cur.is_empty() {
            word.to_string()
        } else {
            format!("{cur} {word}")
        };
        if !cur.is_empty() && text_w_mermaid(&trial) > MAX_W {
            lines.push(std::mem::take(&mut cur));
            cur = word.to_string();
        } else {
            cur = trial;
        }
    }
    if !cur.is_empty() || lines.is_empty() {
        lines.push(cur);
    }
    lines
}

/// Wrapped label lines for sizing + rendering. Rectangle-ish shapes wrap at
/// mermaid's width; circle/diamond/hex/parallelogram stay single-line.
pub fn node_lines_mermaid(label: &str, _shape: Shape) -> Vec<String> {
    // Hard `<br>` breaks (now `\n`) split first, then every shape soft-wraps each
    // segment at mermaid's ~200px width — merman sizes all shapes (hexagon,
    // diamond, …) for the wrapped text, so the render must wrap to match.
    label.split('\n').flat_map(wrap_mermaid).collect()
}

pub fn node_size_mermaid_f(label: &str, shape: Shape) -> (f64, f64) {
    let lines = node_lines_mermaid(label, shape);
    let tw = lines
        .iter()
        .map(|l| text_w_mermaid(l))
        .fold(0.0_f64, f64::max);
    // mermaid wrapped-label height: lines * 24 + 30 (1 line = 54, 2 = 78, ...).
    let wrapped_h = lines.len() as f64 * 24.0 + 30.0;
    // Slanted shapes (hex / parallelogram / trapezoid) sit 15px tighter than a
    // rect — single line = 39 (= 1*24 + 15) — but must STILL grow with the line
    // count, else a multi-line `<br/>` label overflows the box (was pinned 39).
    let slanted_h = wrapped_h - 15.0;
    match shape {
        Shape::Circle => {
            let d = (tw + 16.0).max(50.0);
            (d, d)
        }
        Shape::Diamond => {
            let d = (tw + 54.0).max(70.0);
            (d, d)
        }
        Shape::Hex => ((tw + 35.0).max(60.0), slanted_h),
        Shape::Parallelogram | Shape::ParallelogramAlt | Shape::Trapezoid | Shape::TrapezoidAlt => {
            ((tw + 55.0).max(70.0), slanted_h)
        }
        Shape::Cylinder | Shape::Badge | Shape::Box => ((tw + 30.0).max(56.0), wrapped_h),
        Shape::StateFork => (70.0, 14.0), // fork/join bar, label hidden
        _ => (tw + 60.0, wrapped_h),
    }
}

pub fn node_size(label: &str, shape: Shape, style: FlowStyle) -> (i32, i32) {
    // Multi-line labels (class / er boxes) size by their widest line and row
    // count; single-line labels keep the original shape-based sizing.
    let lines: Vec<&str> = label.split('\n').collect();
    let max_chars = lines.iter().map(|l| l.chars().count()).max().unwrap_or(0);
    // Mermaid style uses a larger (~16px) font, so its boxes are wider.
    let char_w = match style {
        FlowStyle::Mermaid => 9.8,
        FlowStyle::Kymo => CHAR_W,
    };
    let text_w = (max_chars as f64 * char_w).ceil() as i32;
    if lines.len() > 1 {
        let w = (text_w + 24).max(80);
        let h = lines.len() as i32 * 18 + 16;
        return (w, h);
    }
    // Mermaid (16px trebuchet) node sizing, calibrated against mermaid.js 11:
    // rect ~6.82*chars + 64, height 54; other shapes per-shape padding.
    if matches!(style, FlowStyle::Mermaid) {
        let tw = text_w_mermaid(label).round() as i32;
        let (w, h) = match shape {
            Shape::Circle => {
                let d = (tw + 16).max(50);
                (d, d)
            }
            Shape::Diamond => {
                let d = (tw + 54).max(70);
                (d, d)
            }
            Shape::Hex => ((tw + 35).max(60), 39),
            Shape::Parallelogram
            | Shape::ParallelogramAlt
            | Shape::Trapezoid
            | Shape::TrapezoidAlt => ((tw + 55).max(70), 39),
            Shape::Cylinder => ((tw + 30).max(56), 54),
            Shape::Badge => ((tw + 30).max(56), 54),
            Shape::Box => ((tw + 30).max(56), 54), // rounded `(...)`
            _ => ((tw + 60).max(70), 54),          // sharp Rect `[...]` & default
        };
        return (w, h);
    }
    let (w, h) = match shape {
        Shape::Circle => {
            let d = (text_w + 28).max(56);
            (d, d)
        }
        Shape::Diamond => ((text_w + 52).max(70), 64),
        Shape::Cylinder => ((text_w + 32).max(64), 56),
        Shape::Hex => ((text_w + 40).max(72), 52),
        Shape::Badge => ((text_w + 40).max(64), 46),
        _ => ((text_w + 32).max(60), 46), // box & rounded
    };
    (w, h)
}
