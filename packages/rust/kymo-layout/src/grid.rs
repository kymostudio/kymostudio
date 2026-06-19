//! Block-diagram **column grid** layout (mermaid's `block-beta` model): items
//! fill `columns` slots left-to-right, wrapping to rows; a nested grid is a
//! sub-grid occupying as many columns as its width needs; `:N` spans N columns;
//! `space` leaves empty slots. Pure geometry — the caller renders the result.

/// A leaf block cell.
pub struct Cell {
    pub id: String,
    pub label: String,
    pub span: usize,
    /// Shape keyword ("rect"/"diamond"/"hexagon"/"rounded"/"circle"/"stadium"/"rect-larrow"/"rect-rarrow"); empty = rect.
    pub shape: String,
}

/// One slot in a grid: a cell, an empty space (span columns), or a nested grid.
pub enum Item {
    Cell(Cell),
    Space(usize),
    Grid(Grid),
}

/// A grid container: `columns` slots wide, filled by `items` in order.
pub struct Grid {
    pub columns: usize,
    pub items: Vec<Item>,
    pub label: String, // non-empty for a `block:id["label"]` container
}

/// A laid-out box (absolute to the grid's own origin).
pub struct Placed {
    pub id: String,
    pub label: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub container: bool,
    pub shape: String,
}

const CELL_W: f64 = 92.0;
const CELL_H: f64 = 40.0;
const GAP: f64 = 8.0;
const PAD: f64 = 8.0;
const HEADER: f64 = 18.0; // container title band
const CHAR_W: f64 = 8.0;

fn cell_w(label: &str, span: usize) -> f64 {
    let tw = (label.chars().count() as f64 * CHAR_W + 2.0 * PAD).max(CELL_W);
    tw * span as f64 + GAP * (span as f64 - 1.0)
}

/// Lay a grid out at its own origin; returns (placed boxes, width, height).
pub fn layout(g: &Grid) -> (Vec<Placed>, f64, f64) {
    let cols = if g.columns > 0 { g.columns } else { g.items.len().max(1) };

    // Pre-size every item (nested grids recursively) so the column unit + spans
    // can account for their real width — this is what fixes nested-overlap.
    struct Sized<'a> {
        w: f64,
        h: f64,
        sub: Option<Vec<Placed>>,
        item: &'a Item,
    }
    let mut sized: Vec<Sized> = Vec::new();
    for it in &g.items {
        match it {
            Item::Cell(c) => sized.push(Sized { w: cell_w(&c.label, c.span), h: CELL_H, sub: None, item: it }),
            Item::Space(sp) => sized.push(Sized { w: CELL_W * *sp as f64 + GAP * (*sp as f64 - 1.0), h: CELL_H, sub: None, item: it }),
            Item::Grid(sub) => {
                let (p, w, h) = layout(sub);
                sized.push(Sized { w, h, sub: Some(p), item: it });
            }
        }
    }

    // Preliminary unit = widest single-column plain cell/space.
    let unit0 = sized
        .iter()
        .filter_map(|s| match s.item {
            Item::Cell(c) => Some(s.w / c.span.max(1) as f64),
            Item::Space(sp) => Some(s.w / (*sp).max(1) as f64),
            Item::Grid(_) => None,
        })
        .fold(CELL_W, f64::max);
    // Each item's column span. Like mermaid, a nested block occupies ONE column
    // (the column unit widens to fit it) rather than spanning several.
    let _ = unit0;
    let spans: Vec<usize> = sized
        .iter()
        .map(|s| {
            match s.item {
                Item::Cell(c) => c.span.max(1),
                Item::Space(sp) => (*sp).max(1),
                Item::Grid(_) => 1,
            }
            .clamp(1, cols)
        })
        .collect();
    // Final unit: a span-N item must fit in N units, so nested grids widen the
    // column unit (otherwise their content overflows the box).
    let unit = sized
        .iter()
        .zip(&spans)
        .map(|(s, &sp)| (s.w - (sp as f64 - 1.0) * GAP) / sp as f64)
        .fold(unit0, f64::max);

    // Place row-major; track each item's (row, col).
    let mut col = 0usize;
    let mut row = 0usize;
    let mut rows_h = vec![0f64];
    let mut placement: Vec<(usize, usize, usize)> = Vec::new(); // (row, col, span)
    for (s, &sp) in sized.iter().zip(&spans) {
        if col + sp > cols && col > 0 {
            row += 1;
            col = 0;
            rows_h.push(0.0);
        }
        placement.push((row, col, sp));
        rows_h[row] = rows_h[row].max(s.h);
        col += sp;
    }
    // Row Y offsets.
    let mut row_y = vec![0f64; rows_h.len()];
    let mut acc = PAD;
    for (r, h) in rows_h.iter().enumerate() {
        row_y[r] = acc;
        acc += h + GAP;
    }
    let total_h = acc - GAP + PAD;
    let total_w = cols as f64 * unit + (cols as f64 - 1.0) * GAP + 2.0 * PAD;

    let mut out = Vec::new();
    for (s, &(r, c, sp)) in sized.into_iter().zip(placement.iter()) {
        let x = PAD + c as f64 * (unit + GAP);
        let y = row_y[r];
        let cw = sp as f64 * unit + (sp as f64 - 1.0) * GAP;
        match s.item {
            Item::Cell(c2) => out.push(Placed {
                id: c2.id.clone(),
                label: c2.label.clone(),
                x,
                y,
                w: cw,
                h: CELL_H,
                container: false,
                shape: c2.shape.clone(),
            }),
            Item::Space(_) => {}
            Item::Grid(sub_g) => {
                out.push(Placed {
                    id: String::new(),
                    label: sub_g.label.clone(),
                    x,
                    y,
                    w: cw.max(s.w),
                    h: s.h,
                    container: true,
                    shape: String::new(),
                });
                // offset the nested grid's children (+header room if labelled).
                let dy = if sub_g.label.is_empty() { 0.0 } else { HEADER };
                if let Some(children) = s.sub {
                    for ch in children {
                        out.push(Placed {
                            id: ch.id,
                            label: ch.label,
                            x: x + ch.x,
                            y: y + dy + ch.y,
                            w: ch.w,
                            h: ch.h,
                            container: ch.container,
                            shape: ch.shape,
                        });
                    }
                }
            }
        }
    }
    (out, total_w, total_h)
}
