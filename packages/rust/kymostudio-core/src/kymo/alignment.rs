//! Local alignment — parent/child positioning + auto-bounded regions, the
//! post-parse resolver. Rust port of `packages/python/src/kymo/alignment.py`.
//!
//! Five passes (see [`resolve_alignments`]): auto-layouts → parent/child
//! anchoring → region auto-bounds → fan-in/out + trunk-lane edge staggering →
//! auto-canvas sizing + grid snap. All arithmetic mirrors Python (`//` floor
//! division, `round()` banker's rounding via [`py_round`]).

use std::collections::HashMap;

use crate::model::{py_round, resolve_anchors, Anchor, Component, Diagram, Node, Point, Shape};

use super::dsl::KymoError;

const NAME_CHAR_W: i32 = 7; // 14px bold sans ≈ 7 px/char
const SUB_CHAR_W: i32 = 6; // 11.5px regular sans ≈ 6 px/char

#[inline]
fn fdiv(a: i32, b: i32) -> i32 {
    a.div_euclid(b)
}

/// Approximate half-width of the longest text line under `c`'s icon. `0` for
/// label-less shapes (annotation, badge). Mirrors `_label_half_width`.
fn label_half_width(c: &Component) -> i32 {
    if matches!(c.shape, Shape::Annotation | Shape::Badge) {
        return 0;
    }
    let name_w = c.name.chars().count() as i32 * NAME_CHAR_W;
    let sub_w = c.subtitle.chars().count() as i32 * SUB_CHAR_W;
    fdiv(name_w.max(sub_w), 2)
}

/// `Component::half` widened to the bigger of icon/label width; height stays
/// icon-only. Mirrors `_effective_half`.
fn effective_half(c: &Component) -> (i32, i32) {
    let (hw, hh) = c.half();
    (hw.max(label_half_width(c)), hh)
}

/// Whether a component carries a rendered label band below its icon.
fn has_label(c: &Component) -> bool {
    !c.name.is_empty() || !c.subtitle.is_empty()
}

/// The five-pass resolver. Mutates `diagram` in place.
pub fn resolve_alignments(diagram: &mut Diagram) -> Result<(), KymoError> {
    resolve_auto_layouts(diagram);
    resolve_component_alignments(diagram)?;
    resolve_region_bounds(diagram);
    stagger_fanin_edges(diagram);
    stagger_trunk_lanes(diagram);
    auto_size_canvas(diagram);
    Ok(())
}

// ── id → index lookup helpers ───────────────────────────────────────────────
fn comp_index(diagram: &Diagram) -> HashMap<String, usize> {
    diagram
        .components
        .iter()
        .enumerate()
        .map(|(i, c)| (c.id.clone(), i))
        .collect()
}

/// Build a [`Node`] for an id (component wins over region on collision).
fn node_for<'a>(diagram: &'a Diagram, id: &str) -> Option<Node<'a>> {
    if let Some(c) = diagram.components.iter().find(|c| c.id == id) {
        return Some(Node::Component(c));
    }
    diagram
        .regions
        .iter()
        .find(|r| r.id == id)
        .map(Node::Region)
}

/// Centre point used for stagger sorting (component centre / region centre).
fn node_center(diagram: &Diagram, id: &str) -> Option<Point> {
    node_for(diagram, id).map(|n| n.anchor(Anchor::Center))
}

/// `node.half` for either kind.
fn node_half(diagram: &Diagram, id: &str) -> Option<(i32, i32)> {
    if let Some(c) = diagram.components.iter().find(|c| c.id == id) {
        return Some(c.half());
    }
    if let Some(r) = diagram.regions.iter().find(|r| r.id == id) {
        let (_, _, w, h) = r.bounds;
        return Some((fdiv(w, 2), fdiv(h, 2)));
    }
    None
}

// ── Pass 1: auto-layouts ────────────────────────────────────────────────────
fn resolve_auto_layouts(diagram: &mut Diagram) {
    let idx = comp_index(diagram);
    // Collect the work first (region index + child indices) to avoid aliasing.
    let mut jobs: Vec<(usize, Vec<usize>)> = Vec::new();
    for (ri, r) in diagram.regions.iter().enumerate() {
        if r.layout.is_none() || r.pos.is_none() || r.contains.is_empty() {
            continue;
        }
        let children: Vec<usize> = r
            .contains
            .iter()
            .filter_map(|cid| idx.get(cid).copied())
            .collect();
        if children.len() != r.contains.len() {
            // Python `diagram.get` would KeyError; here we simply place what we
            // can. (A missing member is a user error surfaced elsewhere.)
        }
        jobs.push((ri, children));
    }

    for (ri, children) in jobs {
        let r = &diagram.regions[ri];
        let horizontal = r.layout == Some(crate::model::AutoLayout::Horizontal);
        let (pad_x, pad_y) = r.padding;
        let (ox, oy) = r.pos.unwrap();
        let gap = r.gap;
        let align = r.align;

        let cursor_x = ox + pad_x;
        let cursor_y = oy + pad_y;
        let effs: Vec<(i32, i32)> = children
            .iter()
            .map(|&ci| effective_half(&diagram.components[ci]))
            .collect();

        if horizontal {
            let max_h = effs.iter().map(|e| e.1).max().unwrap_or(0);
            let mut cx_cursor = cursor_x;
            for (k, &ci) in children.iter().enumerate() {
                let (ew, _eh) = effs[k];
                let ch = diagram.components[ci].half().1;
                let cy = match align {
                    crate::model::RegionAlign::Start => cursor_y + ch,
                    crate::model::RegionAlign::End => cursor_y + 2 * max_h - ch,
                    crate::model::RegionAlign::Center => cursor_y + max_h,
                };
                diagram.components[ci].pos = (cx_cursor + ew, cy);
                cx_cursor += ew * 2 + gap;
            }
        } else {
            let max_w = effs.iter().map(|e| e.0).max().unwrap_or(0);
            let mut cy_cursor = cursor_y;
            for (k, &ci) in children.iter().enumerate() {
                let (_ew, eh) = effs[k];
                let cw = diagram.components[ci].half().0;
                let cx = match align {
                    crate::model::RegionAlign::Start => cursor_x + cw,
                    crate::model::RegionAlign::End => cursor_x + 2 * max_w - cw,
                    crate::model::RegionAlign::Center => cursor_x + max_w,
                };
                diagram.components[ci].pos = (cx, cy_cursor + eh);
                cy_cursor += eh * 2 + gap;
            }
        }
    }
}

// ── Pass 2: parent/child anchoring ──────────────────────────────────────────
fn resolve_component_alignments(diagram: &mut Diagram) -> Result<(), KymoError> {
    let idx = comp_index(diagram);
    let n = diagram.components.len();
    let mut resolved = vec![false; n];
    for start in 0..n {
        resolve_one(diagram, &idx, start, &mut resolved, &mut Vec::new())?;
    }
    Ok(())
}

fn resolve_one(
    diagram: &mut Diagram,
    idx: &HashMap<String, usize>,
    ci: usize,
    resolved: &mut [bool],
    path: &mut Vec<usize>,
) -> Result<(), KymoError> {
    if resolved[ci] {
        return Ok(());
    }
    if path.contains(&ci) {
        let chain: Vec<String> = path
            .iter()
            .chain(std::iter::once(&ci))
            .map(|&i| diagram.components[i].id.clone())
            .collect();
        return Err(KymoError {
            line: 0,
            msg: format!("alignment cycle: {}", chain.join(" → ")),
        });
    }

    let parent_id = diagram.components[ci].parent.clone();
    let parent_id = match parent_id {
        None => {
            resolved[ci] = true;
            return Ok(());
        }
        Some(p) => p,
    };
    let pi = match idx.get(&parent_id) {
        Some(&pi) => pi,
        None => {
            // Python `diagram.get(parent)` would KeyError; treat as a root.
            resolved[ci] = true;
            return Ok(());
        }
    };

    path.push(ci);
    resolve_one(diagram, idx, pi, resolved, path)?;
    path.pop();

    let align = diagram.components[ci].align.ok_or_else(|| KymoError {
        line: 0,
        msg: format!(
            "component {:?} has parent={:?} but no align side",
            diagram.components[ci].id, parent_id
        ),
    })?;
    let gap = diagram.components[ci].align_gap;
    let offset = diagram.components[ci].align_offset;
    let parent = diagram.components[pi].clone();
    let pos = align_to(&parent, &diagram.components[ci], align, gap, offset);
    diagram.components[ci].pos = pos;
    resolved[ci] = true;
    Ok(())
}

fn align_to(parent: &Component, child: &Component, side: Anchor, gap: i32, offset: Point) -> Point {
    let (px, py) = parent.pos;
    let (p_hw, p_hh) = parent.half();
    let p_label = parent.shape.label_height();
    let (c_hw, c_hh) = child.half();
    let (ox, oy) = offset;
    let (cx, cy) = match side {
        Anchor::Right => (px + p_hw + gap + c_hw, py),
        Anchor::Left => (px - p_hw - gap - c_hw, py),
        Anchor::Bottom => (px, py + p_hh + p_label + gap + c_hh),
        Anchor::Top => (px, py - p_hh - gap - c_hh),
        Anchor::Center => (px, py), // not produced by parse (top/right/bottom/left)
    };
    (cx + ox, cy + oy)
}

// ── Pass 3: region bounds ───────────────────────────────────────────────────
fn resolve_region_bounds(diagram: &mut Diagram) {
    let idx = comp_index(diagram);
    let comps = diagram.components.clone();
    for r in &mut diagram.regions {
        if r.contains.is_empty() {
            continue;
        }
        let cells: Vec<&Component> = r
            .contains
            .iter()
            .filter_map(|cid| idx.get(cid).map(|&i| &comps[i]))
            .collect();
        if cells.is_empty() {
            continue;
        }
        let (pad_x, pad_y) = r.padding;
        let pad_b = r.padding_bottom.unwrap_or(pad_y);
        r.bounds = region_envelope(&cells, pad_x, pad_y, pad_b);
    }
}

/// Bounding box of `cells` (icon + label band), padded. Shared by
/// [`resolve_region_bounds`] and the grid-snap re-derive.
fn region_envelope(
    cells: &[&Component],
    pad_x: i32,
    pad_y: i32,
    pad_b: i32,
) -> (i32, i32, i32, i32) {
    let mut min_left = i32::MAX;
    let mut max_right = i32::MIN;
    let mut min_top = i32::MAX;
    let mut max_bot = i32::MIN;
    for c in cells {
        let ew = c.half().0.max(label_half_width(c));
        let lh = if has_label(c) {
            c.shape.label_height()
        } else {
            0
        };
        min_left = min_left.min(c.pos.0 - ew);
        max_right = max_right.max(c.pos.0 + ew);
        min_top = min_top.min(c.pos.1 - c.half().1);
        max_bot = max_bot.max(c.pos.1 + c.half().1 + lh);
    }
    let x = min_left - pad_x;
    let y = min_top - pad_y;
    let w = max_right - x + pad_x;
    let h = max_bot - y + pad_b;
    (x, y, w, h)
}

// ── Pass 4a: fan-in / fan-out port distribution ─────────────────────────────
const STEP: i32 = 16;

/// Precomputed per-edge geometry (owned, so the stagger can mutate edge offsets
/// without aliasing `diagram`).
#[derive(Clone, Copy)]
struct EdgeGeom {
    idx: usize,
    sa: Anchor,
    da: Anchor,
    src_center: Point,
    dst_center: Point,
    src_half: (i32, i32),
    dst_half: (i32, i32),
}

fn stagger_fanin_edges(diagram: &mut Diagram) {
    let mut geom: Vec<EdgeGeom> = Vec::new();
    for (i, e) in diagram.edges.iter().enumerate() {
        let (src, dst) = match (node_for(diagram, &e.src), node_for(diagram, &e.dst)) {
            (Some(s), Some(d)) => (s, d),
            _ => continue,
        };
        let (sa, da) = resolve_anchors(e, src, dst);
        geom.push(EdgeGeom {
            idx: i,
            sa,
            da,
            src_center: node_center(diagram, &e.src).unwrap(),
            dst_center: node_center(diagram, &e.dst).unwrap(),
            src_half: node_half(diagram, &e.src).unwrap(),
            dst_half: node_half(diagram, &e.dst).unwrap(),
        });
    }

    // Group fan-in by (dst, da) and fan-out by (src, sa) — values are geom idxs.
    let mut fanin: HashMap<(String, Anchor), Vec<usize>> = HashMap::new();
    let mut fanout: HashMap<(String, Anchor), Vec<usize>> = HashMap::new();
    for (gi, info) in geom.iter().enumerate() {
        let dst_id = diagram.edges[info.idx].dst.clone();
        let src_id = diagram.edges[info.idx].src.clone();
        fanin.entry((dst_id, info.da)).or_default().push(gi);
        fanout.entry((src_id, info.sa)).or_default().push(gi);
    }

    for group in fanin.values() {
        spread(diagram, &geom, group, false, 2); // dst_offset, fan-in
    }
    for group in fanout.values() {
        spread(diagram, &geom, group, true, 3); // src_offset, fan-out
    }
}

/// Stagger `src_offset` (fan-out) or `dst_offset` (fan-in) on edges sharing an
/// anchor so ports don't pile up. Mirrors the nested `spread` in Python.
fn spread(
    diagram: &mut Diagram,
    geom: &[EdgeGeom],
    group: &[usize],
    is_fanout: bool,
    min_count: usize,
) {
    if group.len() < min_count {
        return;
    }
    // Fan-out drops `{ shared }`-port edges (still counted in min_count above).
    let mut ents: Vec<usize> = if is_fanout {
        group
            .iter()
            .copied()
            .filter(|&g| !diagram.edges[geom[g].idx].shared_port)
            .collect()
    } else {
        group.to_vec()
    };
    if is_fanout && ents.is_empty() {
        return;
    }
    let n = ents.len();
    let shared = geom[group[0]];
    let anchor = if is_fanout { shared.sa } else { shared.da };
    let horizontal = matches!(anchor, Anchor::Left | Anchor::Right);
    let shared_half = if is_fanout {
        shared.src_half
    } else {
        shared.dst_half
    };

    // Sort by the OTHER endpoint's position on the perpendicular axis.
    let other_coord = |g: usize| -> i32 {
        let oc = if is_fanout {
            geom[g].dst_center
        } else {
            geom[g].src_center
        };
        if horizontal {
            oc.1
        } else {
            oc.0
        }
    };
    ents.sort_by_key(|&g| other_coord(g));

    let cross_span = if horizontal {
        shared_half.1 * 2
    } else {
        shared_half.0 * 2
    };
    let spread_total = (cross_span - 16).min(STEP * (n as i32 - 1)) as f64;
    let mid = (n as f64 - 1.0) / 2.0;
    for (i, &g) in ents.iter().enumerate() {
        let d = py_round((i as f64 - mid) / mid.max(1.0) * (spread_total / 2.0));
        let ei = geom[g].idx;
        if is_fanout {
            let cur = diagram.edges[ei].src_offset;
            diagram.edges[ei].src_offset = if horizontal {
                (cur.0, cur.1 + d)
            } else {
                (cur.0 + d, cur.1)
            };
        } else {
            let cur = diagram.edges[ei].dst_offset;
            diagram.edges[ei].dst_offset = if horizontal {
                (cur.0, cur.1 + d)
            } else {
                (cur.0 + d, cur.1)
            };
        }
    }
}

// ── Pass 4b: trunk-lane channel routing ─────────────────────────────────────
fn stagger_trunk_lanes(diagram: &mut Diagram) {
    const MIN_STEP: i32 = 8;
    const MAX_STEP: i32 = 16;

    // entry: (edge_idx, src_pt, dst_pt)
    let mut horiz: HashMap<(i32, i32), Vec<(usize, Point, Point)>> = HashMap::new();
    let mut vert: HashMap<(i32, i32), Vec<(usize, Point, Point)>> = HashMap::new();

    for (i, e) in diagram.edges.iter().enumerate() {
        if !e.via.is_empty() {
            continue; // explicit routing wins
        }
        let (src, dst) = match (node_for(diagram, &e.src), node_for(diagram, &e.dst)) {
            (Some(s), Some(d)) => (s, d),
            _ => continue,
        };
        let (sa, da) = resolve_anchors(e, src, dst);
        let sp = src.anchor(sa);
        let dp = dst.anchor(da);
        if sp.0 == dp.0 || sp.1 == dp.1 {
            continue; // already axis-aligned
        }
        if matches!(sa, Anchor::Left | Anchor::Right) {
            let key = (
                py_round(sp.0 as f64 / 8.0) * 8,
                py_round(dp.0 as f64 / 8.0) * 8,
            );
            horiz.entry(key).or_default().push((i, sp, dp));
        } else {
            let key = (
                py_round(sp.1 as f64 / 8.0) * 8,
                py_round(dp.1 as f64 / 8.0) * 8,
            );
            vert.entry(key).or_default().push((i, sp, dp));
        }
    }

    let assign = |diagram: &mut Diagram,
                  entries: &mut Vec<(usize, Point, Point)>,
                  sort_idx: usize,
                  channel_width: i32| {
        let n = entries.len() as i32;
        if n <= 1 {
            return;
        }
        let coord = |p: &Point| if sort_idx == 0 { p.0 } else { p.1 };
        let overlaps = |t1: &(usize, Point, Point), t2: &(usize, Point, Point)| {
            let mut r1 = [coord(&t1.1), coord(&t1.2)];
            r1.sort_unstable();
            let mut r2 = [coord(&t2.1), coord(&t2.2)];
            r2.sort_unstable();
            r1[0].max(r2[0]) < r1[1].min(r2[1])
        };
        let any_overlap = (0..entries.len())
            .any(|i| ((i + 1)..entries.len()).any(|j| overlaps(&entries[i], &entries[j])));
        if !any_overlap {
            return;
        }
        let step = MIN_STEP.max(MAX_STEP.min(fdiv(channel_width, n + 1)));
        entries.sort_by(|a, b| (coord(&a.1), coord(&a.2)).cmp(&(coord(&b.1), coord(&b.2))));
        let mid = (n - 1) as f64 / 2.0;
        for (i, (ei, _sp, _dp)) in entries.iter().enumerate() {
            diagram.edges[*ei].trunk_offset = py_round((i as f64 - mid) * step as f64);
        }
    };

    let horiz_keys: Vec<(i32, i32)> = horiz.keys().copied().collect();
    for k in horiz_keys {
        let mut entries = horiz.remove(&k).unwrap();
        assign(diagram, &mut entries, 1, (k.1 - k.0).abs());
    }
    let vert_keys: Vec<(i32, i32)> = vert.keys().copied().collect();
    for k in vert_keys {
        let mut entries = vert.remove(&k).unwrap();
        assign(diagram, &mut entries, 0, (k.1 - k.0).abs());
    }
}

// ── Pass 5: auto-size canvas ────────────────────────────────────────────────
fn auto_size_canvas(diagram: &mut Diagram) {
    const MARGIN: i32 = 30;
    if diagram.width > 0 && diagram.height > 0 {
        return;
    }

    let mut min_x = i32::MAX;
    let mut min_y = i32::MAX;
    let mut max_x = i32::MIN;
    let mut max_y = i32::MIN;

    for c in &diagram.components {
        let eff_hw = c.half().0.max(label_half_width(c));
        let lh = if has_label(c) {
            c.shape.label_height()
        } else {
            0
        };
        min_x = min_x.min(c.pos.0 - eff_hw);
        max_x = max_x.max(c.pos.0 + eff_hw);
        min_y = min_y.min(c.pos.1 - c.half().1);
        max_y = max_y.max(c.pos.1 + c.half().1 + lh);
    }
    for r in &diagram.regions {
        if r.bounds == (0, 0, 0, 0) {
            continue;
        }
        let (x, y, w, h) = r.bounds;
        min_x = min_x.min(x);
        min_y = min_y.min(y);
        max_x = max_x.max(x + w);
        max_y = max_y.max(y + h);
    }
    for e in &diagram.edges {
        for &(vx, vy) in &e.via {
            min_x = min_x.min(vx);
            min_y = min_y.min(vy);
            max_x = max_x.max(vx);
            max_y = max_y.max(vy);
        }
        if let Some((lx, ly)) = e.label_pos {
            min_x = min_x.min(lx);
            min_y = min_y.min(ly);
            max_x = max_x.max(lx);
            max_y = max_y.max(ly);
        }
    }

    if min_x > max_x {
        return; // nothing to size against
    }

    let dx = if min_x < MARGIN { MARGIN - min_x } else { 0 };
    let dy = if min_y < MARGIN { MARGIN - min_y } else { 0 };
    if dx != 0 || dy != 0 {
        for c in &mut diagram.components {
            c.pos = (c.pos.0 + dx, c.pos.1 + dy);
        }
        for r in &mut diagram.regions {
            if r.bounds == (0, 0, 0, 0) {
                continue;
            }
            let (x, y, w, h) = r.bounds;
            r.bounds = (x + dx, y + dy, w, h);
        }
        for e in &mut diagram.edges {
            for v in &mut e.via {
                *v = (v.0 + dx, v.1 + dy);
            }
            if let Some(lp) = e.label_pos {
                e.label_pos = Some((lp.0 + dx, lp.1 + dy));
            }
        }
        max_x += dx;
        max_y += dy;
    }

    if diagram.width == 0 {
        diagram.width = max_x + MARGIN;
    }
    if diagram.height == 0 {
        diagram.height = max_y + MARGIN;
    }

    // Enforce min 4:3 (landscape): pad width, re-center horizontally.
    if diagram.width * 3 < diagram.height * 4 {
        let new_w = fdiv(diagram.height * 4, 3);
        let shift = fdiv(new_w - diagram.width, 2);
        for c in &mut diagram.components {
            c.pos = (c.pos.0 + shift, c.pos.1);
        }
        for r in &mut diagram.regions {
            if r.bounds == (0, 0, 0, 0) {
                continue;
            }
            let (x, y, w, h) = r.bounds;
            r.bounds = (x + shift, y, w, h);
        }
        for e in &mut diagram.edges {
            for v in &mut e.via {
                *v = (v.0 + shift, v.1);
            }
            if let Some(lp) = e.label_pos {
                e.label_pos = Some((lp.0 + shift, lp.1));
            }
        }
        diagram.width = new_w;
    }

    snap_to_grid(diagram);
}

fn snap_to_grid(diagram: &mut Diagram) {
    const GRID: i32 = 8;
    let s = |v: i32| py_round(v as f64 / GRID as f64) * GRID;
    let s_up = |v: i32| ((v + GRID - 1).div_euclid(GRID)) * GRID;

    for c in &mut diagram.components {
        c.pos = (s(c.pos.0), s(c.pos.1));
    }
    for e in &mut diagram.edges {
        for v in &mut e.via {
            *v = (s(v.0), s(v.1));
        }
        if let Some(lp) = e.label_pos {
            e.label_pos = Some((s(lp.0), s(lp.1)));
        }
    }

    let comps = diagram.components.clone();
    let idx: HashMap<&str, &Component> = comps.iter().map(|c| (c.id.as_str(), c)).collect();
    for r in &mut diagram.regions {
        if r.bounds == (0, 0, 0, 0) || r.contains.is_empty() {
            continue;
        }
        let cells: Vec<&Component> = r
            .contains
            .iter()
            .filter_map(|cid| idx.get(cid.as_str()).copied())
            .collect();
        if cells.is_empty() {
            continue;
        }
        let (pad_x, pad_y) = r.padding;
        let pad_b = r.padding_bottom.unwrap_or(pad_y);
        r.bounds = region_envelope(&cells, pad_x, pad_y, pad_b);
    }

    diagram.width = s_up(diagram.width);
    diagram.height = s_up(diagram.height);
}
