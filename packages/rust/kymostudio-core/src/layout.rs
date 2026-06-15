//! Layered (Sugiyama) layout for Mermaid flowcharts → a resolved [`Diagram`].
//!
//! A port of the node-positioning half of `packages/python/src/kymo/bpmn_layout.py`
//! (ranking → dummy nodes → barycenter ordering → coordinate assignment). Unlike
//! the Python module we do NOT emit `Edge.points`: kymo's SVG back-end routes a
//! point-less edge from its anchors at render time, which also honours `dashed`
//! / `no_arrow` (a `points`-carrying edge takes the BPMN-flow path instead — see
//! `to_svg.render_edge`). So we only need positions here.
//!
//! The algorithm runs in an abstract `(main, cross)` space — `main` along the
//! flow direction, `cross` perpendicular — then maps to screen `(x, y)` per
//! [`Direction`], keeping node boxes upright. Determinism (NFR-1) is preserved:
//! every sort carries the declaration index as a stable secondary key and
//! coordinates are integerised only at emit via [`py_round`].

use std::collections::{HashMap, HashSet};

use crate::flowchart::{Direction, FlowEdge, Flowchart};
use crate::model::{py_round, Component, Diagram, Edge, Region, Shape};
use crate::style::FlowStyle;

const H_GAP: f64 = 48.0; // gap between layer columns (main axis)
const V_GAP: f64 = 40.0; // gap between boxes within a layer (cross axis)
const MARGIN: f64 = 24.0;
const ORDER_SWEEPS: usize = 6; // fixed, even → deterministic
const ALIGN_SWEEPS: usize = 8;

const PRIO_TRUNK: i64 = 2_000_000;
const PRIO_DUMMY: i64 = 1_000_000;
const PRIO_CHAIN: i64 = 10_000;

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
pub(crate) fn text_w_mermaid(s: &str) -> f64 {
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
pub(crate) fn node_size_for(label: &str, shape: Shape, style: FlowStyle) -> (i32, i32) {
    node_size(label, shape, style)
}

/// Float-precision mermaid node sizing (no rounding) for the dagre path, so the
/// diagram extent and node centres match mermaid.js to sub-pixel: mermaid sizes a
/// box to `measured_text_width + padding` exactly (e.g. "Middle" 47.14 + 60 =
/// 107.14), and the integer [`node_size`] rounds that 0.14 away — enough to push
/// the total width across an integer boundary and misalign the whole canvas.
/// Greedy word-wrap at mermaid's flowchart wrapping width (~200px of text).
pub(crate) fn wrap_mermaid(label: &str) -> Vec<String> {
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
pub(crate) fn node_lines_mermaid(label: &str, _shape: Shape) -> Vec<String> {
    // Hard `<br>` breaks (now `\n`) split first, then every shape soft-wraps each
    // segment at mermaid's ~200px width — merman sizes all shapes (hexagon,
    // diamond, …) for the wrapped text, so the render must wrap to match.
    label.split('\n').flat_map(wrap_mermaid).collect()
}

pub(crate) fn node_size_mermaid_f(label: &str, shape: Shape) -> (f64, f64) {
    let lines = node_lines_mermaid(label, shape);
    let tw = lines
        .iter()
        .map(|l| text_w_mermaid(l))
        .fold(0.0_f64, f64::max);
    // mermaid wrapped-label height: lines * 24 + 30 (1 line = 54, 2 = 78, ...).
    let wrapped_h = lines.len() as f64 * 24.0 + 30.0;
    match shape {
        Shape::Circle => {
            let d = (tw + 16.0).max(50.0);
            (d, d)
        }
        Shape::Diamond => {
            let d = (tw + 54.0).max(70.0);
            (d, d)
        }
        Shape::Hex => ((tw + 35.0).max(60.0), 39.0),
        Shape::Parallelogram | Shape::ParallelogramAlt | Shape::Trapezoid | Shape::TrapezoidAlt => {
            ((tw + 55.0).max(70.0), 39.0)
        }
        Shape::Cylinder | Shape::Badge | Shape::Box => ((tw + 30.0).max(56.0), wrapped_h),
        _ => (tw + 60.0, wrapped_h),
    }
}

fn node_size(label: &str, shape: Shape, style: FlowStyle) -> (i32, i32) {
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

fn median(vals: &[f64]) -> f64 {
    let mut s = vals.to_vec();
    s.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let n = s.len();
    let m = n / 2;
    if n % 2 == 1 {
        s[m]
    } else {
        (s[m - 1] + s[m]) / 2.0
    }
}

/// Lay out a parsed flowchart into a fully positioned diagram (kymo sizing).
pub fn layout_flowchart(fc: &Flowchart) -> Diagram {
    layout_flowchart_styled(fc, FlowStyle::Kymo)
}

/// Lay out a parsed flowchart, sizing nodes per the given [`FlowStyle`].
pub fn layout_flowchart_styled(fc: &Flowchart, style: FlowStyle) -> Diagram {
    let mut diagram = Diagram::default();
    if fc.nodes.is_empty() {
        diagram.width = py_round(2.0 * MARGIN);
        diagram.height = py_round(2.0 * MARGIN);
        return diagram;
    }

    let horizontal = matches!(fc.direction, Direction::Lr | Direction::Rl);

    let ids: Vec<String> = fc.nodes.iter().map(|n| n.id.clone()).collect();
    let decl: HashMap<&str, usize> = ids
        .iter()
        .enumerate()
        .map(|(i, s)| (s.as_str(), i))
        .collect();

    // Real box sizes, and the abstract main/cross extents per direction.
    let mut real: HashMap<&str, (i32, i32)> = HashMap::new();
    let mut sw: HashMap<String, f64> = HashMap::new(); // main extent
    let mut sh: HashMap<String, f64> = HashMap::new(); // cross extent
    for n in &fc.nodes {
        let (w, h) = node_size(&n.label, n.shape, style);
        real.insert(n.id.as_str(), (w, h));
        let (main, cross) = if horizontal { (w, h) } else { (h, w) };
        sw.insert(n.id.clone(), main as f64);
        sh.insert(n.id.clone(), cross as f64);
    }

    // ── 1. Rank (longest-path Kahn; back-edges reversed) ─────────────────
    let back = back_edges(&ids, &fc.edges, &decl);
    let mut succ: HashMap<String, Vec<String>> = HashMap::new();
    let mut pred: HashMap<String, Vec<String>> = HashMap::new();
    let mut indeg: HashMap<String, i32> = ids.iter().map(|i| (i.clone(), 0)).collect();
    let mut valid: Vec<usize> = Vec::new();
    for (k, f) in fc.edges.iter().enumerate() {
        if !decl.contains_key(f.src.as_str()) || !decl.contains_key(f.dst.as_str()) {
            continue;
        }
        valid.push(k);
        let (s, d) = if back.contains(&k) {
            (f.dst.clone(), f.src.clone())
        } else {
            (f.src.clone(), f.dst.clone())
        };
        succ.entry(s.clone()).or_default().push(d.clone());
        pred.entry(d.clone()).or_default().push(s);
        *indeg.get_mut(&d).unwrap() += 1;
    }

    let mut rank: HashMap<String, i32> = ids.iter().map(|i| (i.clone(), 0)).collect();
    let mut deg = indeg.clone();
    let mut queue: Vec<String> = ids.iter().filter(|i| deg[*i] == 0).cloned().collect();
    queue.sort_by_key(|x| decl[x.as_str()]);
    while !queue.is_empty() {
        let u = queue.remove(0);
        if let Some(vs) = succ.get(&u) {
            for v in vs.clone() {
                if rank[&u] + 1 > rank[&v] {
                    *rank.get_mut(&v).unwrap() = rank[&u] + 1;
                }
                *deg.get_mut(&v).unwrap() -= 1;
                if deg[&v] == 0 {
                    queue.push(v);
                    queue.sort_by_key(|x| decl[x.as_str()]);
                }
            }
        }
    }

    // trunk = one longest source→sink path, pinned straight.
    let mut trunk: HashSet<String> = HashSet::new();
    let mut cur = ids
        .iter()
        .max_by_key(|n| (rank[n.as_str()], -(decl[n.as_str()] as i64)))
        .cloned();
    while let Some(c) = cur {
        if !trunk.insert(c.clone()) {
            break; // predecessor cycle (e.g. a self-loop) — stop walking
        }
        cur = pred
            .get(&c)
            .and_then(|ps| {
                ps.iter()
                    .max_by_key(|p| (rank[p.as_str()], -(decl[p.as_str()] as i64)))
            })
            .cloned();
    }

    // ── 2. Dummy nodes for edges spanning >1 layer ───────────────────────
    let mut vsucc: HashMap<String, Vec<String>> = HashMap::new();
    let mut vpred: HashMap<String, Vec<String>> = HashMap::new();
    let mut vrank: HashMap<String, i32> = rank.clone();
    let mut vw: HashMap<String, f64> = sw.clone();
    let mut vh: HashMap<String, f64> = sh.clone();
    let mut vdecl: HashMap<String, i64> = decl
        .iter()
        .map(|(k, v)| (k.to_string(), *v as i64))
        .collect();
    let mut is_dummy: HashMap<String, bool> = HashMap::new();
    let mut dn = 0i64;
    for &k in &valid {
        let f = &fc.edges[k];
        let (s, d) = if back.contains(&k) {
            (f.dst.clone(), f.src.clone())
        } else {
            (f.src.clone(), f.dst.clone())
        };
        let (r0, r1) = (rank[&s], rank[&d]);
        if (r1 - r0).abs() <= 1 {
            if r0 != r1 {
                vsucc.entry(s.clone()).or_default().push(d.clone());
                vpred.entry(d.clone()).or_default().push(s.clone());
            }
        } else {
            let step = if r1 > r0 { 1 } else { -1 };
            let mut prev = s.clone();
            let mut r = r0 + step;
            while r != r1 {
                let dv = format!("__d{dn}");
                dn += 1;
                vrank.insert(dv.clone(), r);
                is_dummy.insert(dv.clone(), true);
                vw.insert(dv.clone(), 0.0);
                vh.insert(dv.clone(), 0.0);
                vdecl.insert(dv.clone(), decl[s.as_str()] as i64 * 100000 + dn);
                vsucc.entry(prev.clone()).or_default().push(dv.clone());
                vpred.entry(dv.clone()).or_default().push(prev.clone());
                prev = dv;
                r += step;
            }
            vsucc.entry(prev.clone()).or_default().push(d.clone());
            vpred.entry(d.clone()).or_default().push(prev);
        }
    }

    let max_rank = *vrank.values().max().unwrap_or(&0);
    let mut all_v: Vec<String> = vrank.keys().cloned().collect();
    all_v.sort_by_key(|x| vdecl[x]);
    let mut layers: Vec<Vec<String>> = vec![Vec::new(); (max_rank + 1) as usize];
    for n in &all_v {
        layers[vrank[n] as usize].push(n.clone());
    }

    let side = assign_sides(&trunk, &vrank, &vsucc, &vpred, &vdecl);

    // ── 3. Ordering (barycenter sweeps) ──────────────────────────────────
    let mut order: Vec<Vec<String>> = layers.clone();
    for it in 0..ORDER_SWEEPS {
        let down = it % 2 == 0;
        let seq: Vec<i32> = if down {
            (1..=max_rank).collect()
        } else {
            (0..=max_rank - 1).rev().collect()
        };
        for l in seq {
            let adj = if down { l - 1 } else { l + 1 };
            let nbr = if down { &vpred } else { &vsucc };
            let pos: HashMap<&str, usize> = if adj >= 0 && adj <= max_rank {
                order[adj as usize]
                    .iter()
                    .enumerate()
                    .map(|(i, n)| (n.as_str(), i))
                    .collect()
            } else {
                HashMap::new()
            };
            let cur_idx: HashMap<&str, usize> = order[l as usize]
                .iter()
                .enumerate()
                .map(|(i, n)| (n.as_str(), i))
                .collect();
            let mut col = order[l as usize].clone();
            col.sort_by(|a, b| {
                let ba = bary(a, nbr, &pos, &cur_idx);
                let bb = bary(b, nbr, &pos, &cur_idx);
                ba.partial_cmp(&bb).unwrap().then(vdecl[a].cmp(&vdecl[b]))
            });
            order[l as usize] = col;
        }
    }

    // Group each layer `above | trunk | below` so branches balance.
    for col in order.iter_mut() {
        let side_of = |n: &str| *side.get(n).unwrap_or(&0);
        let above = col.iter().filter(|n| side_of(n) < 0).cloned();
        let mid = col.iter().filter(|n| side_of(n) == 0).cloned();
        let below = col.iter().filter(|n| side_of(n) > 0).cloned();
        *col = above.chain(mid).chain(below).collect();
    }

    // ── 4. Coordinates (abstract main = ax, cross = ay) ──────────────────
    let mut ax: HashMap<String, f64> = HashMap::new();
    let mut right = 0.0f64;
    for col in &layers {
        let col_w = col.iter().map(|n| vw[n]).fold(0.0f64, f64::max);
        let center = right + H_GAP + col_w / 2.0;
        for n in col {
            ax.insert(n.clone(), center);
        }
        right = center + col_w / 2.0;
    }

    let mut ay: HashMap<String, f64> = HashMap::new();
    for col in &order {
        let total: f64 =
            col.iter().map(|n| vh[n]).sum::<f64>() + V_GAP * (col.len().saturating_sub(1)) as f64;
        let mut run = -total / 2.0;
        for n in col {
            ay.insert(n.clone(), run + vh[n] / 2.0);
            run += vh[n] + V_GAP;
        }
    }

    let prio = |n: &str| -> i64 {
        if trunk.contains(n) {
            PRIO_TRUNK
        } else if *is_dummy.get(n).unwrap_or(&false) {
            PRIO_DUMMY
        } else {
            let np = vpred.get(n).map(|v| v.len()).unwrap_or(0);
            let ns = vsucc.get(n).map(|v| v.len()).unwrap_or(0);
            if np <= 1 && ns <= 1 {
                PRIO_CHAIN
            } else {
                (np + ns) as i64
            }
        }
    };

    for it in 0..ALIGN_SWEEPS {
        let down = it % 2 == 0;
        let seq: Vec<i32> = if down {
            (1..=max_rank).collect()
        } else {
            (0..=max_rank - 1).rev().collect()
        };
        let nbr = if down { &vpred } else { &vsucc };
        for l in seq {
            let col = order[l as usize].clone();
            let desired: Vec<f64> = col
                .iter()
                .map(|n| {
                    if trunk.contains(n) {
                        0.0
                    } else {
                        match nbr.get(n) {
                            Some(ns) if !ns.is_empty() => {
                                median(&ns.iter().map(|m| ay[m]).collect::<Vec<_>>())
                            }
                            _ => ay[n],
                        }
                    }
                })
                .collect();
            let prios: Vec<i64> = col.iter().map(|n| prio(n)).collect();
            place_layer(&col, &prios, &desired, &mut ay, &vh, &vdecl);
        }
    }

    // ── 5. Map abstract → screen, keeping boxes upright ──────────────────
    // Build screen centers and collect extents for normalization.
    let mut fx: HashMap<&str, f64> = HashMap::new();
    let mut fy: HashMap<&str, f64> = HashMap::new();
    for n in &fc.nodes {
        let (m, c) = (ax[&n.id], ay[&n.id]);
        let (x, y) = match fc.direction {
            Direction::Lr => (m, c),
            Direction::Rl => (-m, c),
            Direction::Tb => (c, m),
            Direction::Bt => (c, -m),
        };
        fx.insert(n.id.as_str(), x);
        fy.insert(n.id.as_str(), y);
    }

    // Normalize so the top-left content corner sits at (MARGIN, MARGIN).
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    for n in &fc.nodes {
        let (w, h) = real[n.id.as_str()];
        min_x = min_x.min(fx[n.id.as_str()] - w as f64 / 2.0);
        min_y = min_y.min(fy[n.id.as_str()] - h as f64 / 2.0);
    }
    let (shift_x, shift_y) = (MARGIN - min_x, MARGIN - min_y);

    // ── emit components ──────────────────────────────────────────────────
    let mut max_x = 0.0f64;
    let mut max_y = 0.0f64;
    for n in &fc.nodes {
        let (w, h) = real[n.id.as_str()];
        let cx = fx[n.id.as_str()] + shift_x;
        let cy = fy[n.id.as_str()] + shift_y;
        max_x = max_x.max(cx + w as f64 / 2.0);
        max_y = max_y.max(cy + h as f64 / 2.0);
        let mut comp = Component::flowchart(&n.id, &n.label, n.shape);
        comp.pos = (py_round(cx), py_round(cy));
        comp.size = Some((w, h));
        diagram.components.push(comp);
    }

    // ── emit edges (point-less; kymo routes from anchors) ────────────────
    for f in &fc.edges {
        let mut e = Edge::routed(&f.src, &f.dst, &f.label);
        e.dashed = f.dashed;
        e.no_arrow = f.no_arrow;
        diagram.edges.push(e);
    }

    // ── emit subgraph regions (bounding box of their members) ────────────
    let pos_of: HashMap<&str, (f64, f64, i32, i32)> = fc
        .nodes
        .iter()
        .map(|n| {
            let (w, h) = real[n.id.as_str()];
            (
                n.id.as_str(),
                (
                    fx[n.id.as_str()] + shift_x,
                    fy[n.id.as_str()] + shift_y,
                    w,
                    h,
                ),
            )
        })
        .collect();
    // Effective members include descendant subgraphs' members, so a nesting
    // wrapper with no direct nodes still gets a bounding box.
    let n_sg = fc.subgraphs.len();
    let mut eff: Vec<Vec<String>> = fc.subgraphs.iter().map(|s| s.members.clone()).collect();
    let mut descendants = vec![0usize; n_sg];
    for i in 0..n_sg {
        let own = fc.subgraphs[i].members.clone();
        let mut p = fc.subgraphs[i].parent;
        while let Some(pi) = p {
            descendants[pi] += 1;
            for m in &own {
                if !eff[pi].contains(m) {
                    eff[pi].push(m.clone());
                }
            }
            p = fc.subgraphs[pi].parent;
        }
    }
    for (si, sg) in fc.subgraphs.iter().enumerate() {
        let members: Vec<&(f64, f64, i32, i32)> = eff[si]
            .iter()
            .filter_map(|m| pos_of.get(m.as_str()))
            .collect();
        if members.is_empty() {
            continue;
        }
        // Outer (ancestor) regions get extra padding so they enclose their
        // nested children and the labels don't collide.
        let pad = 16.0 + descendants[si] as f64 * 14.0;
        let label_pad = if sg.title.is_empty() { 0.0 } else { 20.0 };
        let mut x0 = f64::INFINITY;
        let mut y0 = f64::INFINITY;
        let mut x1 = f64::NEG_INFINITY;
        let mut y1 = f64::NEG_INFINITY;
        for (cx, cy, w, h) in members.iter().copied() {
            x0 = x0.min(cx - *w as f64 / 2.0);
            y0 = y0.min(cy - *h as f64 / 2.0);
            x1 = x1.max(cx + *w as f64 / 2.0);
            y1 = y1.max(cy + *h as f64 / 2.0);
        }
        let (bx, by) = (x0 - pad, y0 - pad - label_pad);
        let (bw, bh) = (x1 + pad - bx, y1 + pad - by);
        max_x = max_x.max(bx + bw);
        max_y = max_y.max(by + bh);
        let mut region = Region::cluster(&sg.id, &sg.title, sg.members.clone());
        region.bounds = (py_round(bx), py_round(by), py_round(bw), py_round(bh));
        diagram.regions.push(region);
    }

    diagram.width = py_round(max_x + MARGIN);
    diagram.height = py_round(max_y + MARGIN);
    diagram
}

fn bary(
    n: &str,
    nbr: &HashMap<String, Vec<String>>,
    pos: &HashMap<&str, usize>,
    cur: &HashMap<&str, usize>,
) -> f64 {
    let ms: Vec<usize> = nbr
        .get(n)
        .map(|v| {
            v.iter()
                .filter_map(|m| pos.get(m.as_str()).copied())
                .collect()
        })
        .unwrap_or_default();
    if ms.is_empty() {
        cur[n] as f64
    } else {
        ms.iter().sum::<usize>() as f64 / ms.len() as f64
    }
}

/// Flow indices that close a cycle (DFS in declaration order).
fn back_edges(ids: &[String], flows: &[FlowEdge], decl: &HashMap<&str, usize>) -> HashSet<usize> {
    let mut out: HashMap<&str, Vec<(usize, &str, usize)>> = HashMap::new();
    for (k, f) in flows.iter().enumerate() {
        if decl.contains_key(f.src.as_str()) && decl.contains_key(f.dst.as_str()) {
            out.entry(f.src.as_str())
                .or_default()
                .push((decl[f.dst.as_str()], f.dst.as_str(), k));
        }
    }
    for v in out.values_mut() {
        v.sort();
    }
    let mut color: HashMap<&str, u8> = ids.iter().map(|i| (i.as_str(), 0u8)).collect();
    let mut back = HashSet::new();
    let mut roots: Vec<&str> = ids.iter().map(|s| s.as_str()).collect();
    roots.sort_by_key(|x| decl[x]);
    for root in roots {
        if color[root] != 0 {
            continue;
        }
        color.insert(root, 1);
        let empty = Vec::new();
        let mut stack: Vec<(&str, usize)> = vec![(root, 0)];
        while let Some(&(u, ki)) = stack.last() {
            let outs = out.get(u).unwrap_or(&empty);
            if ki < outs.len() {
                stack.last_mut().unwrap().1 = ki + 1;
                let (_, v, fk) = outs[ki];
                match color[v] {
                    1 => {
                        back.insert(fk);
                    }
                    0 => {
                        color.insert(v, 1);
                        stack.push((v, 0));
                    }
                    _ => {}
                }
            } else {
                color.insert(u, 2);
                stack.pop();
            }
        }
    }
    back
}

/// Assign each non-trunk node a side (-1 above / +1 below), one per branch.
fn assign_sides(
    trunk: &HashSet<String>,
    vrank: &HashMap<String, i32>,
    vsucc: &HashMap<String, Vec<String>>,
    vpred: &HashMap<String, Vec<String>>,
    vdecl: &HashMap<String, i64>,
) -> HashMap<String, i32> {
    let mut adj: HashMap<String, HashSet<String>> = HashMap::new();
    for u in vrank.keys() {
        if trunk.contains(u) {
            continue;
        }
        if let Some(vs) = vsucc.get(u) {
            for v in vs {
                if !trunk.contains(v) {
                    adj.entry(u.clone()).or_default().insert(v.clone());
                    adj.entry(v.clone()).or_default().insert(u.clone());
                }
            }
        }
    }
    let mut seen: HashSet<String> = HashSet::new();
    let mut comps: Vec<Vec<String>> = Vec::new();
    let mut starts: Vec<String> = vrank
        .keys()
        .filter(|x| !trunk.contains(*x))
        .cloned()
        .collect();
    starts.sort_by_key(|x| vdecl[x]);
    let empty = HashSet::new();
    for n in starts {
        if seen.contains(&n) {
            continue;
        }
        seen.insert(n.clone());
        let mut stack = vec![n.clone()];
        let mut comp = Vec::new();
        while let Some(u) = stack.pop() {
            comp.push(u.clone());
            for w in adj.get(&u).unwrap_or(&empty) {
                if !seen.contains(w) {
                    seen.insert(w.clone());
                    stack.push(w.clone());
                }
            }
        }
        comps.push(comp);
    }

    let anchor = |comp: &[String]| -> i32 {
        let mut rs: Vec<i32> = Vec::new();
        for u in comp {
            for v in vsucc
                .get(u)
                .into_iter()
                .flatten()
                .chain(vpred.get(u).into_iter().flatten())
            {
                if trunk.contains(v) {
                    rs.push(vrank[v]);
                }
            }
        }
        if let Some(m) = rs.iter().min() {
            *m
        } else {
            comp.iter().map(|u| vrank[u]).min().unwrap()
        }
    };
    comps.sort_by(|a, b| {
        let (aa, ba) = (anchor(a), anchor(b));
        let (ad, bd) = (
            a.iter().map(|u| vdecl[u]).min().unwrap(),
            b.iter().map(|u| vdecl[u]).min().unwrap(),
        );
        aa.cmp(&ba).then(ad.cmp(&bd))
    });
    let mut side = HashMap::new();
    for (i, comp) in comps.iter().enumerate() {
        let s = if i % 2 == 0 { -1 } else { 1 };
        for u in comp {
            side.insert(u.clone(), s);
        }
    }
    side
}

/// Place a layer's nodes near their desired cross-coord, honouring min-gap and
/// priority: higher-priority nodes hold their spot, lower ones yield.
fn place_layer(
    col: &[String],
    prios: &[i64],
    desired: &[f64],
    ay: &mut HashMap<String, f64>,
    vh: &HashMap<String, f64>,
    vdecl: &HashMap<String, i64>,
) {
    let n = col.len();
    if n == 0 {
        return;
    }
    let gap = |k: usize| -> f64 { vh[&col[k - 1]] / 2.0 + V_GAP + vh[&col[k]] / 2.0 };
    let mut y: Vec<f64> = col.iter().map(|c| ay[c]).collect();
    let mut placed = vec![false; n];
    let mut idxs: Vec<usize> = (0..n).collect();
    idxs.sort_by(|&a, &b| {
        prios[b]
            .cmp(&prios[a])
            .then(vdecl[&col[a]].cmp(&vdecl[&col[b]]))
    });
    for i in idxs {
        let mut lo = f64::NEG_INFINITY;
        let mut hi = f64::INFINITY;
        let mut cum = 0.0;
        for j in (0..i).rev() {
            cum += gap(j + 1);
            if placed[j] {
                lo = y[j] + cum;
                break;
            }
        }
        cum = 0.0;
        for j in (i + 1)..n {
            cum += gap(j);
            if placed[j] {
                hi = y[j] - cum;
                break;
            }
        }
        let mut want = desired[i];
        if want > hi {
            want = hi;
        }
        if want < lo {
            want = lo;
        }
        y[i] = want;
        placed[i] = true;
    }
    for (i, c) in col.iter().enumerate() {
        ay.insert(c.clone(), y[i]);
    }
}
