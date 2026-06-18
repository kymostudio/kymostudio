//! Render a Mermaid `kanban` board: columns laid out left-to-right, each a
//! tinted section with a title and a vertical stack of white cards. The parsed
//! [`Flowchart`] encodes columns as nodes that are never an edge target, and
//! each card as an edge `column → card`. Everything is real `<text>`, so
//! PNG/PDF keep the labels.

use kymo_graph::flowchart::Flowchart;
use std::collections::HashSet;

const COL_W: i64 = 204;
const COL_GAP: i64 = 14;
const CARD_GAP: i64 = 8;
const HEADER_H: i64 = 34;
const PAD: i64 = 8;
const MARGIN: i64 = 8;
const LINE_H: i64 = 20;
const CHAR_W: i64 = 8; // ~16px label advance

/// Wrap a label to the card inner width (greedy word wrap).
fn wrap(label: &str, max_chars: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut cur = String::new();
    for w in label.split_whitespace() {
        if cur.is_empty() {
            cur = w.to_string();
        } else if cur.chars().count() + 1 + w.chars().count() <= max_chars {
            cur.push(' ');
            cur.push_str(w);
        } else {
            lines.push(std::mem::take(&mut cur));
            cur = w.to_string();
        }
    }
    if !cur.is_empty() || lines.is_empty() {
        lines.push(cur);
    }
    lines
}

/// Mermaid kanban section tint for column `i` (`hsl(H,100%,86%)`, near-white).
fn section_fill(i: usize) -> String {
    const HUES: [i32; 8] = [80, 240, 270, 300, 330, 0, 30, 90];
    format!("hsl({}, 100%, 86%)", HUES[i % HUES.len()])
}

pub fn render(fc: &Flowchart) -> String {
    let card_ids: HashSet<&str> = fc.edges.iter().map(|e| e.dst.as_str()).collect();
    let label_of = |id: &str| {
        fc.nodes
            .iter()
            .find(|n| n.id == id)
            .map(|n| n.label.as_str())
            .unwrap_or("")
    };
    // Columns = nodes that are never an edge target, in declaration order.
    let columns: Vec<&str> = fc
        .nodes
        .iter()
        .map(|n| n.id.as_str())
        .filter(|id| !card_ids.contains(id))
        .collect();

    let inner_w = COL_W - 2 * PAD;
    let max_chars = ((inner_w - 12) / CHAR_W).max(6) as usize;

    let mut body = String::new();
    let mut x = MARGIN;
    let mut max_h = HEADER_H + 2 * PAD;
    for (ci, col) in columns.iter().enumerate() {
        let cards: Vec<&str> = fc
            .edges
            .iter()
            .filter(|e| e.src == *col)
            .map(|e| label_of(&e.dst))
            .collect();
        // Pre-measure card heights to size the column.
        let wrapped: Vec<Vec<String>> = cards.iter().map(|c| wrap(c, max_chars)).collect();
        let card_h = |lines: &[String]| (lines.len() as i64 * LINE_H + 16).max(36);
        let col_h = HEADER_H
            + PAD
            + wrapped.iter().map(|w| card_h(w) + CARD_GAP).sum::<i64>()
            + PAD;
        max_h = max_h.max(col_h);

        // Column section background + title.
        let fill = section_fill(ci);
        body += &format!(
            "<rect x=\"{x}\" y=\"{MARGIN}\" width=\"{COL_W}\" height=\"{col_h}\" rx=\"5\" \
             fill=\"{fill}\" stroke=\"{fill}\"/>\
             <text x=\"{}\" y=\"{}\" text-anchor=\"middle\" font-weight=\"700\" \
             font-size=\"16\" fill=\"#000000\">{}</text>",
            x + COL_W / 2,
            MARGIN + HEADER_H / 2 + 4,
            esc(label_of(col))
        );

        // Cards stacked vertically.
        let mut cy = MARGIN + HEADER_H;
        for w in &wrapped {
            let ch = card_h(w);
            let cardx = x + PAD;
            body += &format!(
                "<rect x=\"{cardx}\" y=\"{cy}\" width=\"{inner_w}\" height=\"{ch}\" rx=\"4\" \
                 fill=\"#ffffff\" stroke=\"#9370DB\" stroke-width=\"1\"/>"
            );
            let n = w.len() as i64;
            let y0 = cy + ch / 2 - (n - 1) * LINE_H / 2;
            for (li, line) in w.iter().enumerate() {
                body += &format!(
                    "<text x=\"{}\" y=\"{}\" dominant-baseline=\"central\" fill=\"#333333\">{}</text>",
                    cardx + 8,
                    y0 + li as i64 * LINE_H,
                    esc(line)
                );
            }
            cy += ch + CARD_GAP;
        }
        x += COL_W + COL_GAP;
    }

    let width = x - COL_GAP + MARGIN;
    let height = max_h + MARGIN;
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {width} {height}\" \
         width=\"{width}\" height=\"{height}\" style=\"max-width:100%;height:auto\" \
         font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif\" \
         font-size=\"14\">\n<rect width=\"{width}\" height=\"{height}\" fill=\"#ffffff\"/>\n{body}</svg>\n"
    )
}

fn esc(s: &str) -> String {
    let mut o = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => o.push_str("&amp;"),
            '<' => o.push_str("&lt;"),
            '>' => o.push_str("&gt;"),
            '"' => o.push_str("&quot;"),
            _ => o.push(c),
        }
    }
    o
}
