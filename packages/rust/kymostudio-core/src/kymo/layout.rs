//! Auto-layout: pack components into a region/row grid, plus the Figma-style
//! anonymous `layout { … }` tree placement. Rust port of
//! `packages/python/src/kymo/layout.py`.
//!
//! All arithmetic mirrors Python: `//` is floor division ([`fdiv`]) and
//! `round()` is banker's rounding ([`crate::model::py_round`]), so positions
//! come out bit-identical to the Python layout.

use std::collections::{HashMap, HashSet};

use crate::model::{resolve_anchors, Component, Diagram, Node, Route, Shape};

use super::dsl::{External, LayoutTree};

// ── Sizing constants (empirically-tuned char widths) ──────────────────────
const CHAR_W_NAME: f64 = 7.6; // 14px component name
const CHAR_W_SUB: f64 = 6.4; // 11.5px subtitle
const LABEL_GAP: i32 = 6;
const LINE_HEIGHT: i32 = 18;

/// Python floor division `a // b` (rounds toward −∞). For `b > 0` this equals
/// `a.div_euclid(b)`.
#[inline]
fn fdiv(a: i32, b: i32) -> i32 {
    a.div_euclid(b)
}

/// `_ICON_DIMS[shape]` — `(2·hw, 2·hh)` from [`Shape::shape_half`], with the
/// `annotation` override `(40, 32)` (Python keeps a label budget box for it).
fn icon_dims(shape: Shape) -> (i32, i32) {
    if shape == Shape::Annotation {
        return (40, 32);
    }
    let (hw, hh) = shape.shape_half();
    (2 * hw, 2 * hh)
}

#[derive(Clone, Copy)]
pub struct Cell {
    pub w: i32,
    pub h: i32,
}

fn text_w(s: &str, char_w: f64) -> i32 {
    (s.chars().count() as f64 * char_w) as i32
}

/// `cell_size(c)` — Python `cell_size` with `h_pad=8, v_pad=10`.
pub fn cell_size(c: &Component) -> Cell {
    let (iw, ih) = icon_dims(c.shape);
    let name_w = text_w(&c.name, CHAR_W_NAME);
    let sub_w = text_w(&c.subtitle, CHAR_W_SUB);
    let label_w = name_w.max(sub_w);
    let label_h = LABEL_GAP + LINE_HEIGHT * 2;
    Cell {
        w: iw.max(label_w) + 8 * 2,
        h: ih + label_h + 10,
    }
}

// ── Grid layout ───────────────────────────────────────────────────────────
// Tunable params (Python defaults).
const REGION_GAP: i32 = 36;
const ROW_GAP: i32 = 28;
const CELL_GAP: i32 = 18;
const REGION_PADDING_X: i32 = 18;
const REGION_PADDING_Y: i32 = 22;
const CANVAS_MARGIN: i32 = 18;

/// Pack components into the region/row grid (`region_layout` in source order),
/// placing `external` components above their targets. Mutates `diagram`.
pub fn layout(
    diagram: &mut Diagram,
    region_layout: &[(String, Vec<Vec<String>>)],
    external: Option<&HashMap<String, External>>,
) {
    if region_layout.is_empty() {
        return;
    }
    let sizes: HashMap<String, Cell> =
        diagram.components.iter().map(|c| (c.id.clone(), cell_size(c))).collect();
    let idx: HashMap<String, usize> = diagram
        .components
        .iter()
        .enumerate()
        .map(|(i, c)| (c.id.clone(), i))
        .collect();

    // Per-row height (across all regions) → consistent Y for cross-region rows.
    let max_rows = region_layout.iter().map(|(_, rs)| rs.len()).max().unwrap_or(0);
    let mut row_heights: Vec<i32> = Vec::with_capacity(max_rows);
    for i in 0..max_rows {
        let mut h = 0;
        for (_rid, rows) in region_layout {
            if i < rows.len() {
                for cid in &rows[i] {
                    if let Some(s) = sizes.get(cid) {
                        h = h.max(s.h);
                    }
                }
            }
        }
        row_heights.push(if h != 0 { h } else { 100 });
    }

    // Per-region width = max(row width).
    let mut region_widths: HashMap<&str, i32> = HashMap::new();
    for (rid, rows) in region_layout {
        let mut w = 0;
        for row in rows {
            let row_w: i32 = row.iter().map(|cid| sizes[cid].w).sum::<i32>()
                + (row.len() as i32 - 1) * CELL_GAP;
            w = w.max(row_w);
        }
        region_widths.insert(rid.as_str(), w + REGION_PADDING_X * 2);
    }

    // External components reserve vertical space above the first row.
    let empty = HashMap::new();
    let external = external.unwrap_or(&empty);
    let mut ext_above_height = 0;
    for (eid, spec) in external {
        if let Some(s) = sizes.get(eid) {
            ext_above_height = ext_above_height.max(s.h + spec.gap);
        }
    }

    // Row centre-Y, cumulative.
    let mut row_ys: Vec<i32> = Vec::with_capacity(max_rows);
    let mut y = CANVAS_MARGIN + ext_above_height;
    for &h in &row_heights {
        y += fdiv(h, 2);
        row_ys.push(y);
        y += fdiv(h, 2) + ROW_GAP;
    }

    // Region centre-X, cumulative (source order).
    let mut region_xs: HashMap<&str, i32> = HashMap::new();
    let mut x = CANVAS_MARGIN;
    for (rid, _) in region_layout {
        let w = region_widths[rid.as_str()];
        x += fdiv(w, 2);
        region_xs.insert(rid.as_str(), x);
        x += fdiv(w, 2) + REGION_GAP;
    }
    let canvas_right = x - REGION_GAP + CANVAS_MARGIN;

    // Place each component at its grid cell.
    for (rid, rows) in region_layout {
        let rx = region_xs[rid.as_str()];
        for (i, row) in rows.iter().enumerate() {
            let ry = row_ys[i];
            let total_w: i32 = row.iter().map(|cid| sizes[cid].w).sum::<i32>()
                + (row.len() as i32 - 1) * CELL_GAP;
            let mut cursor = rx - fdiv(total_w, 2);
            for cid in row {
                let cw = sizes[cid].w;
                if let Some(&ci) = idx.get(cid) {
                    diagram.components[ci].pos = (cursor + fdiv(cw, 2), ry);
                }
                cursor += cw + CELL_GAP;
            }
        }
    }

    // Place external (above a target).
    for (eid, spec) in external {
        if let (Some(&ti), Some(&ei)) = (idx.get(&spec.above), idx.get(eid)) {
            let target_pos = diagram.components[ti].pos;
            let target_top = target_pos.1 - fdiv(sizes[&spec.above].h, 2);
            diagram.components[ei].pos =
                (target_pos.0, target_top - spec.gap - fdiv(sizes[eid].h, 2));
        }
    }

    // Region bounds — hug the cells with region_padding.
    for (rid, rows) in region_layout {
        let rx = region_xs[rid.as_str()];
        let rw = region_widths[rid.as_str()];
        let n = rows.len();
        let top = row_ys[0] - fdiv(row_heights[0], 2) - REGION_PADDING_Y;
        let bot = row_ys[n - 1] + fdiv(row_heights[n - 1], 2) + REGION_PADDING_Y;
        if let Some(r) = diagram.regions.iter_mut().find(|r| r.id == *rid) {
            r.bounds = (rx - fdiv(rw, 2), top, rw, bot - top);
        }
    }

    // Auto-route edges that asked for it.
    route_edges(diagram, &row_ys);

    // Final canvas — fit content + margin.
    diagram.width = canvas_right;
    diagram.height = diagram
        .components
        .iter()
        .map(|c| c.pos.1 + fdiv(sizes[&c.id].h, 2))
        .max()
        .unwrap_or(0)
        + CANVAS_MARGIN;
}

// ── Anonymous layout-tree (Figma-style auto-layout) ────────────────────────
const TREE_GAP: i32 = 40;

fn tree_cell(c: &Component) -> (i32, i32) {
    let (iw, ih) = icon_dims(c.shape);
    let lh = if !c.name.is_empty() || !c.subtitle.is_empty() {
        c.shape.label_height()
    } else {
        0
    };
    (iw, ih + lh)
}

fn tree_padding(node: &LayoutTree) -> (i32, i32) {
    match node {
        LayoutTree::Group { padding, .. } => padding.unwrap_or((0, 0)),
        LayoutTree::Id(_) => (0, 0),
    }
}

/// Per-group spacing scaling with the children's cross-axis extent
/// (`max(gap, cross//4)`). Mirrors `_effective_gap`.
fn effective_gap(dir_horizontal: bool, sizes: &[(i32, i32)]) -> i32 {
    let cross = if dir_horizontal {
        sizes.iter().map(|s| s.1).max().unwrap_or(0)
    } else {
        sizes.iter().map(|s| s.0).max().unwrap_or(0)
    };
    TREE_GAP.max(fdiv(cross, 4))
}

fn tree_measure(by_id: &HashMap<String, usize>, comps: &[Component], node: &LayoutTree) -> (i32, i32) {
    match node {
        LayoutTree::Id(id) => tree_cell(&comps[by_id[id]]),
        LayoutTree::Group { dir, children, .. } => {
            let (px, py) = tree_padding(node);
            let sizes: Vec<(i32, i32)> =
                children.iter().map(|ch| tree_measure(by_id, comps, ch)).collect();
            let horizontal = *dir == crate::model::AutoLayout::Horizontal;
            let eg = effective_gap(horizontal, &sizes);
            if horizontal {
                (
                    sizes.iter().map(|s| s.0).sum::<i32>() + (sizes.len() as i32 - 1) * eg + 2 * px,
                    sizes.iter().map(|s| s.1).max().unwrap_or(0) + 2 * py,
                )
            } else {
                (
                    sizes.iter().map(|s| s.0).max().unwrap_or(0) + 2 * px,
                    sizes.iter().map(|s| s.1).sum::<i32>() + (sizes.len() as i32 - 1) * eg + 2 * py,
                )
            }
        }
    }
}

fn tree_place(
    by_id: &HashMap<String, usize>,
    comps: &mut [Component],
    node: &LayoutTree,
    cx: i32,
    cy: i32,
) {
    match node {
        LayoutTree::Id(id) => {
            let c = &mut comps[by_id[id]];
            let lh = if !c.name.is_empty() || !c.subtitle.is_empty() {
                c.shape.label_height()
            } else {
                0
            };
            c.pos = (cx, cy - fdiv(lh, 2));
        }
        LayoutTree::Group { dir, children, .. } => {
            let horizontal = *dir == crate::model::AutoLayout::Horizontal;
            let sizes: Vec<(i32, i32)> = children
                .iter()
                .map(|ch| tree_measure(by_id, comps, ch))
                .collect();
            let eg = effective_gap(horizontal, &sizes);
            let (w, h) = tree_measure(by_id, comps, node);
            let (px, py) = tree_padding(node);
            let inner_w = w - 2 * px;
            let inner_h = h - 2 * py;
            if horizontal {
                let mut cursor = cx - fdiv(inner_w, 2);
                for (ch, (cw, _)) in children.iter().zip(&sizes) {
                    tree_place(by_id, comps, ch, cursor + fdiv(*cw, 2), cy);
                    cursor += cw + eg;
                }
            } else {
                let mut cursor = cy - fdiv(inner_h, 2);
                for (ch, (_, chh)) in children.iter().zip(&sizes) {
                    tree_place(by_id, comps, ch, cx, cursor + fdiv(*chh, 2));
                    cursor += chh + eg;
                }
            }
        }
    }
}

/// Position every component referenced in `tree` (Figma-style auto-layout).
/// Returns the `(width, height)` of the laid-out block; its top-left starts at
/// `origin`. Mirrors `apply_layout_tree`.
pub fn apply_layout_tree(
    diagram: &mut Diagram,
    tree: &LayoutTree,
    origin: (i32, i32),
) -> (i32, i32) {
    let by_id: HashMap<String, usize> = diagram
        .components
        .iter()
        .enumerate()
        .map(|(i, c)| (c.id.clone(), i))
        .collect();
    let (w, h) = tree_measure(&by_id, &diagram.components, tree);
    tree_place(
        &by_id,
        &mut diagram.components,
        tree,
        origin.0 + fdiv(w, 2),
        origin.1 + fdiv(h, 2),
    );
    (w, h)
}

/// Replace leaves whose id matches a region (with a layout direction and
/// members) by a sub-tree from the region's `contains`. Mirrors
/// `_inline_region_leaves`.
pub fn inline_region_leaves(tree: &LayoutTree, diagram: &Diagram) -> LayoutTree {
    match tree {
        LayoutTree::Id(cid) => {
            if let Some(r) = diagram.regions.iter().find(|r| r.id == *cid) {
                if let (Some(dir), false) = (r.layout, r.contains.is_empty()) {
                    let children = r
                        .contains
                        .iter()
                        .map(|ch| inline_region_leaves(&LayoutTree::Id(ch.clone()), diagram))
                        .collect();
                    return LayoutTree::Group {
                        dir,
                        children,
                        padding: Some(r.padding),
                    };
                }
            }
            tree.clone()
        }
        LayoutTree::Group { dir, children, padding } => {
            let new_children = children.iter().map(|c| inline_region_leaves(c, diagram)).collect();
            LayoutTree::Group {
                dir: *dir,
                children: new_children,
                padding: *padding,
            }
        }
    }
}

// ── Crossing minimisation (barycenter heuristic) ────────────────────────────
fn collect_leaves_ordered(node: &LayoutTree, out: &mut Vec<String>) {
    match node {
        LayoutTree::Id(id) => out.push(id.clone()),
        LayoutTree::Group { children, .. } => {
            for ch in children {
                collect_leaves_ordered(ch, out);
            }
        }
    }
}

/// Barycenter reorder of children inside every multi-child group. `edges` is a
/// list of `(src_id, dst_id)`; direction is ignored. Mirrors
/// `minimize_crossings`.
pub fn minimize_crossings(tree: &mut LayoutTree, edges: &[(String, String)]) {
    if !matches!(tree, LayoutTree::Group { .. }) {
        return;
    }
    let mut leaf_adj: HashMap<String, HashSet<String>> = HashMap::new();
    for (s, d) in edges {
        leaf_adj.entry(s.clone()).or_default().insert(d.clone());
        leaf_adj.entry(d.clone()).or_default().insert(s.clone());
    }
    for _ in 0..24 {
        if !sweep_node(tree, &leaf_adj) {
            break;
        }
    }
}

fn sweep_node(node: &mut LayoutTree, leaf_adj: &HashMap<String, HashSet<String>>) -> bool {
    let children = match node {
        LayoutTree::Group { children, .. } => children,
        LayoutTree::Id(_) => return false,
    };
    let mut changed = false;
    for ch in children.iter_mut() {
        if sweep_node(ch, leaf_adj) {
            changed = true;
        }
    }
    let n = children.len();
    if n < 2 {
        return changed;
    }
    for i in 0..n - 1 {
        if barycenter_reorder(children, i, i + 1, leaf_adj) {
            changed = true;
        }
    }
    for i in (1..n).rev() {
        if barycenter_reorder(children, i, i - 1, leaf_adj) {
            changed = true;
        }
    }
    changed
}

fn barycenter_reorder(
    sibs: &mut [LayoutTree],
    fixed_idx: usize,
    free_idx: usize,
    adj: &HashMap<String, HashSet<String>>,
) -> bool {
    // Only group nodes can be reordered.
    if !matches!(sibs[free_idx], LayoutTree::Group { .. }) {
        return false;
    }
    let mut fixed_leaves = Vec::new();
    collect_leaves_ordered(&sibs[fixed_idx], &mut fixed_leaves);
    let fixed_pos: HashMap<&str, usize> =
        fixed_leaves.iter().enumerate().map(|(i, l)| (l.as_str(), i)).collect();

    let free_children = match &sibs[free_idx] {
        LayoutTree::Group { children, .. } => children,
        _ => unreachable!(),
    };

    let mut keyed: Vec<(f64, usize)> = Vec::with_capacity(free_children.len());
    for (ch_idx, ch) in free_children.iter().enumerate() {
        let mut positions: Vec<usize> = Vec::new();
        let mut leaves = Vec::new();
        collect_leaves_ordered(ch, &mut leaves);
        for leaf in &leaves {
            if let Some(neigh) = adj.get(leaf) {
                for adj_leaf in neigh {
                    if let Some(&p) = fixed_pos.get(adj_leaf.as_str()) {
                        positions.push(p);
                    }
                }
            }
        }
        let bary = if positions.is_empty() {
            ch_idx as f64
        } else {
            positions.iter().sum::<usize>() as f64 / positions.len() as f64
        };
        keyed.push((bary, ch_idx));
    }

    // Stable sort on (barycenter, original index).
    let mut order: Vec<usize> = (0..keyed.len()).collect();
    order.sort_by(|&a, &b| {
        keyed[a]
            .0
            .partial_cmp(&keyed[b].0)
            .unwrap()
            .then(keyed[a].1.cmp(&keyed[b].1))
    });
    if order.iter().enumerate().all(|(i, &o)| i == o) {
        return false; // unchanged
    }
    if let LayoutTree::Group { children, .. } = &mut sibs[free_idx] {
        let reordered: Vec<LayoutTree> = order.iter().map(|&o| children[o].clone()).collect();
        *children = reordered;
    }
    true
}

// ── Edge routing helpers ────────────────────────────────────────────────────
fn route_edges(diagram: &mut Diagram, row_ys: &[i32]) {
    // Snapshot components for read-only anchor math while mutating edges.
    let comps = diagram.components.clone();
    let by_id: HashMap<&str, &Component> = comps.iter().map(|c| (c.id.as_str(), c)).collect();
    for e in &mut diagram.edges {
        if !e.via.is_empty() {
            continue;
        }
        match e.route {
            Route::Over => e.via = route_over(&comps, &by_id, e, row_ys),
            Route::Under => e.via = route_under(&comps, &by_id, e, row_ys),
            _ => {}
        }
    }
}

fn nearest_row(row_ys: &[i32], y: i32) -> usize {
    (0..row_ys.len())
        .min_by_key(|&i| (row_ys[i] - y).abs())
        .unwrap_or(0)
}

fn route_over(
    comps: &[Component],
    by_id: &HashMap<&str, &Component>,
    e: &crate::model::Edge,
    row_ys: &[i32],
) -> Vec<crate::model::Point> {
    let (src, dst) = match (by_id.get(e.src.as_str()), by_id.get(e.dst.as_str())) {
        (Some(s), Some(d)) => (*s, *d),
        _ => return Vec::new(),
    };
    let (sa, da) = resolve_anchors(e, Node::Component(src), Node::Component(dst));
    let sp = src.anchor(sa);
    let dp = dst.anchor(da);
    let src_row = nearest_row(row_ys, src.pos.1);

    if src_row == 0 {
        let top_of_content = comps
            .iter()
            .filter(|c| c.shape != Shape::Annotation)
            .map(|c| c.pos.1 - c.half().1)
            .min()
            .unwrap_or(0);
        let over_y = 14.max(top_of_content - 30);
        return vec![(sp.0, over_y), (dp.0, over_y)];
    }

    const TOL: i32 = 5;
    let prev_row_y = row_ys[src_row - 1];
    let curr_row_y = row_ys[src_row];
    let prev_bottom = comps
        .iter()
        .filter(|c| (c.pos.1 - prev_row_y).abs() < TOL)
        .map(|c| c.pos.1 + c.half().1 + c.shape.label_height())
        .max()
        .unwrap_or(prev_row_y);
    let curr_top = comps
        .iter()
        .filter(|c| (c.pos.1 - curr_row_y).abs() < TOL)
        .map(|c| c.pos.1 - c.half().1)
        .min()
        .unwrap_or(curr_row_y);
    let over_y = fdiv(prev_bottom + curr_top, 2);
    vec![(sp.0, over_y), (dp.0, over_y)]
}

fn route_under(
    comps: &[Component],
    by_id: &HashMap<&str, &Component>,
    e: &crate::model::Edge,
    row_ys: &[i32],
) -> Vec<crate::model::Point> {
    let (src, dst) = match (by_id.get(e.src.as_str()), by_id.get(e.dst.as_str())) {
        (Some(s), Some(d)) => (*s, *d),
        _ => return Vec::new(),
    };
    let (sa, da) = resolve_anchors(e, Node::Component(src), Node::Component(dst));
    let sp = src.anchor(sa);
    let dp = dst.anchor(da);
    let src_row = nearest_row(row_ys, src.pos.1);

    if src_row + 1 >= row_ys.len() {
        let yy = sp.1.max(dp.1) + 36;
        return vec![(sp.0, yy), (dp.0, yy)];
    }

    const TOL: i32 = 5;
    let src_row_y = row_ys[src_row];
    let next_row_y = row_ys[src_row + 1];
    let row_bottom = comps
        .iter()
        .filter(|c| (c.pos.1 - src_row_y).abs() < TOL)
        .map(|c| c.pos.1 + c.half().1 + c.shape.label_height())
        .max()
        .unwrap_or(src_row_y);
    let next_top = comps
        .iter()
        .filter(|c| (c.pos.1 - next_row_y).abs() < TOL)
        .map(|c| c.pos.1 - c.half().1)
        .min()
        .unwrap_or(next_row_y);
    let under_y = fdiv(row_bottom + next_top, 2);
    vec![(sp.0, under_y), (dp.0, under_y)]
}
