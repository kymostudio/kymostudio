//! Layered (Sugiyama) left-to-right layout for `bpmn { … }` blocks — port of
//! `bpmn_layout.py`.
//!
//! Consumes the positionless [`BpmnBlock`] AST (produced by the DSL parser, which
//! is *not* in Rust) and turns each block into positioned [`Component`]s and
//! orthogonally-routed [`Edge`]s (with `points`). Pipeline: rank (longest-path,
//! back-edges reversed) → dummy nodes → barycenter ordering → coordinates (trunk
//! pinned straight) → `@(x,y)` pins → orthogonal routing.
//!
//! Deterministic: every sort has a stable secondary key (declaration index), sweep
//! counts are fixed and even, and coordinates are integerised (half-to-even, see
//! [`super::round`]) only at emit. Validated by `tests/bpmn_conformance.rs` against
//! Python-generated fixtures in `conformance/golden/bpmn_layout.json`.

use std::collections::{HashMap, HashSet};

use super::model::{Component, Diagram, Edge};
use super::round::py_round;

// ── Input AST (mirrors dsl.py BpmnNode / BpmnFlow / BpmnBlock) ─────────────────
/// A positionless node declaration.
#[derive(Debug, Clone)]
pub struct BpmnNode {
    pub id: String,
    pub label: String,
    pub shape: String,
    pub marker: String,
    pub pin: Option<(i64, i64)>,
}

/// A connection between two declared node ids.
#[derive(Debug, Clone)]
pub struct BpmnFlow {
    pub src: String,
    pub dst: String,
    pub flow: String,
    pub label: String,
}

/// One `bpmn { … }` block: its declarations + connections.
#[derive(Debug, Clone)]
pub struct BpmnBlock {
    pub nodes: Vec<BpmnNode>,
    pub flows: Vec<BpmnFlow>,
}

/// Deserialize a `bpmn { }` block list from its JSON form (the shape written by
/// `conformance/gen_bpmn_layout.py`): `[{nodes:[{id,label,shape,marker,pin}], flows:[…]}]`.
pub fn blocks_from_value(v: &serde_json::Value) -> Result<Vec<BpmnBlock>, String> {
    let arr = v.as_array().ok_or("blocks: expected an array")?;
    let mut blocks = Vec::with_capacity(arr.len());
    for b in arr {
        let nodes = b["nodes"]
            .as_array()
            .ok_or("block.nodes: expected an array")?
            .iter()
            .map(|n| BpmnNode {
                id: n["id"].as_str().unwrap_or("").to_string(),
                label: n["label"].as_str().unwrap_or("").to_string(),
                shape: n["shape"].as_str().unwrap_or("").to_string(),
                marker: n["marker"].as_str().unwrap_or("").to_string(),
                pin: match &n["pin"] {
                    serde_json::Value::Array(a) if a.len() == 2 => {
                        Some((a[0].as_i64().unwrap_or(0), a[1].as_i64().unwrap_or(0)))
                    }
                    _ => None,
                },
            })
            .collect();
        let flows = b["flows"]
            .as_array()
            .ok_or("block.flows: expected an array")?
            .iter()
            .map(|f| BpmnFlow {
                src: f["src"].as_str().unwrap_or("").to_string(),
                dst: f["dst"].as_str().unwrap_or("").to_string(),
                flow: f["flow"].as_str().unwrap_or("").to_string(),
                label: f["label"].as_str().unwrap_or("").to_string(),
            })
            .collect();
        blocks.push(BpmnBlock { nodes, flows });
    }
    Ok(blocks)
}

/// Deserialize a block list from a JSON string and lay it out — the one-call entry
/// the PyO3/wasm bindings use.
pub fn layout_json(blocks_json: &str) -> Result<Diagram, String> {
    let v: serde_json::Value = serde_json::from_str(blocks_json).map_err(|e| e.to_string())?;
    Ok(layout(&blocks_from_value(&v)?))
}

/// Box size by resolved shape (mirrors `bpmn_layout.SIZE`).
fn size_of(shape: &str) -> (i64, i64) {
    match shape {
        "bpmn-start" | "bpmn-end" | "bpmn-intermediate" | "bpmn-boundary" => (36, 36),
        "bpmn-task" | "bpmn-subprocess" => (100, 80),
        "bpmn-gateway" => (50, 50),
        "bpmn-data-object" => (36, 50),
        "bpmn-data-store" => (50, 50),
        "bpmn-annotation" => (100, 40),
        _ => (100, 80),
    }
}

const H_GAP: f64 = 80.0;
const V_GAP: f64 = 50.0;
const MARGIN: f64 = 40.0;
const BLOCK_GAP: f64 = 80.0;
const ORDER_SWEEPS: usize = 6;
const ALIGN_SWEEPS: usize = 8;

const PRIO_TRUNK: i64 = 2_000_000;
const PRIO_DUMMY: i64 = 1_000_000;
const PRIO_CHAIN: i64 = 10_000;

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

/// Lay out every block, returning the resolved [`Diagram`] (mirrors `layout`).
pub fn layout(blocks: &[BpmnBlock]) -> Diagram {
    let mut diagram = Diagram::default();
    if blocks.is_empty() {
        return diagram;
    }
    let mut top_y = MARGIN;
    let mut max_right = MARGIN;
    let mut bottom = MARGIN;
    for block in blocks {
        let (comps, edges, right, bot) = layout_block(block, top_y);
        diagram.components.extend(comps);
        diagram.edges.extend(edges);
        max_right = max_right.max(right);
        bottom = bottom.max(bot);
        top_y = bot + BLOCK_GAP;
    }
    diagram.width = py_round(max_right + MARGIN);
    diagram.height = py_round(bottom + MARGIN);
    diagram
}

// Small helpers to mirror Python defaultdict(list) / dict access semantics.
fn push(map: &mut HashMap<String, Vec<String>>, k: &str, v: String) {
    map.entry(k.to_string()).or_default().push(v);
}
fn get<'a>(map: &'a HashMap<String, Vec<String>>, k: &str) -> &'a [String] {
    map.get(k).map(Vec::as_slice).unwrap_or(&[])
}

/// One out-edge for the cycle DFS: `(dst declaration index, dst id, flow index)`.
type OutEdge = (i64, String, usize);

/// Flow indices that close a cycle (DFS in declaration order). Mirrors `_back_edges`.
fn back_edges(ids: &[String], flows: &[BpmnFlow], decl: &HashMap<String, i64>) -> HashSet<usize> {
    let mut out: HashMap<String, Vec<OutEdge>> = HashMap::new();
    for (k, f) in flows.iter().enumerate() {
        if decl.contains_key(&f.src) && decl.contains_key(&f.dst) {
            out.entry(f.src.clone())
                .or_default()
                .push((decl[&f.dst], f.dst.clone(), k));
        }
    }
    let sorted_outs = |u: &str| -> Vec<OutEdge> {
        let mut v = out.get(u).cloned().unwrap_or_default();
        v.sort();
        v
    };
    let mut color: HashMap<String, u8> = ids.iter().map(|i| (i.clone(), 0u8)).collect();
    let mut back: HashSet<usize> = HashSet::new();
    let mut roots: Vec<String> = ids.to_vec();
    roots.sort_by_key(|x| decl[x]);
    for root in roots {
        if color[&root] != 0 {
            continue;
        }
        color.insert(root.clone(), 1);
        let mut stack: Vec<(String, usize, Vec<OutEdge>)> =
            vec![(root.clone(), 0, sorted_outs(&root))];
        while let Some((u, ki, outs)) = stack.last().cloned() {
            if ki < outs.len() {
                let last = stack.len() - 1;
                stack[last].1 = ki + 1;
                let (_, v, fk) = outs[ki].clone();
                match color[&v] {
                    1 => {
                        back.insert(fk);
                    }
                    0 => {
                        color.insert(v.clone(), 1);
                        let o = sorted_outs(&v);
                        stack.push((v, 0, o));
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

/// Give each non-trunk node a side (-1 above / +1 below the trunk), one per branch,
/// alternating by attachment rank. Mirrors `_assign_sides`.
fn assign_sides(
    trunk: &HashSet<String>,
    vrank: &HashMap<String, i64>,
    vsucc: &HashMap<String, Vec<String>>,
    vpred: &HashMap<String, Vec<String>>,
    vdecl: &HashMap<String, i64>,
) -> HashMap<String, i64> {
    let mut adj: HashMap<String, HashSet<String>> = HashMap::new();
    for u in vrank.keys() {
        if trunk.contains(u) {
            continue;
        }
        for v in get(vsucc, u) {
            if !trunk.contains(v) {
                adj.entry(u.clone()).or_default().insert(v.clone());
                adj.entry(v.clone()).or_default().insert(u.clone());
            }
        }
    }
    let mut nontrunk: Vec<String> = vrank
        .keys()
        .filter(|x| !trunk.contains(*x))
        .cloned()
        .collect();
    nontrunk.sort_by_key(|x| vdecl[x]);

    let mut seen: HashSet<String> = HashSet::new();
    let mut comps: Vec<Vec<String>> = Vec::new();
    for n in &nontrunk {
        if seen.contains(n) {
            continue;
        }
        seen.insert(n.clone());
        let mut stack = vec![n.clone()];
        let mut comp = Vec::new();
        while let Some(u) = stack.pop() {
            comp.push(u.clone());
            if let Some(ws) = adj.get(&u) {
                for w in ws {
                    if !seen.contains(w) {
                        seen.insert(w.clone());
                        stack.push(w.clone());
                    }
                }
            }
        }
        comps.push(comp);
    }

    let anchor = |comp: &[String]| -> i64 {
        let mut rs: Vec<i64> = Vec::new();
        for u in comp {
            for v in get(vsucc, u).iter().chain(get(vpred, u)) {
                if trunk.contains(v) {
                    rs.push(vrank[v]);
                }
            }
        }
        if let Some(&m) = rs.iter().min() {
            m
        } else {
            comp.iter().map(|u| vrank[u]).min().unwrap()
        }
    };

    comps.sort_by_key(|c| (anchor(c), c.iter().map(|u| vdecl[u]).min().unwrap()));
    let mut side: HashMap<String, i64> = HashMap::new();
    for (i, comp) in comps.iter().enumerate() {
        let s = if i % 2 == 0 { -1 } else { 1 };
        for u in comp {
            side.insert(u.clone(), s);
        }
    }
    side
}

fn layout_block(block: &BpmnBlock, top_y: f64) -> (Vec<Component>, Vec<Edge>, f64, f64) {
    let nodes = &block.nodes;
    let flows = &block.flows;
    let ids: Vec<String> = nodes.iter().map(|n| n.id.clone()).collect();
    let decl: HashMap<String, i64> = ids
        .iter()
        .enumerate()
        .map(|(i, id)| (id.clone(), i as i64))
        .collect();
    let sw: HashMap<String, i64> = nodes
        .iter()
        .map(|n| (n.id.clone(), size_of(&n.shape).0))
        .collect();
    let sh: HashMap<String, i64> = nodes
        .iter()
        .map(|n| (n.id.clone(), size_of(&n.shape).1))
        .collect();

    // ── 1. Rank (longest-path; back-edges reversed) ──────────────────────────
    let back = back_edges(&ids, flows, &decl);
    let mut succ: HashMap<String, Vec<String>> = HashMap::new();
    let mut pred: HashMap<String, Vec<String>> = HashMap::new();
    let mut indeg: HashMap<String, i64> = HashMap::new();
    let mut valid: Vec<usize> = Vec::new();
    for (k, f) in flows.iter().enumerate() {
        if !decl.contains_key(&f.src) || !decl.contains_key(&f.dst) {
            continue;
        }
        valid.push(k);
        let (s, d) = if back.contains(&k) {
            (f.dst.clone(), f.src.clone())
        } else {
            (f.src.clone(), f.dst.clone())
        };
        push(&mut succ, &s, d.clone());
        push(&mut pred, &d, s.clone());
        *indeg.entry(d).or_insert(0) += 1;
    }
    let mut rank: HashMap<String, i64> = ids.iter().map(|i| (i.clone(), 0i64)).collect();
    let mut deg: HashMap<String, i64> = ids
        .iter()
        .map(|i| (i.clone(), *indeg.get(i).unwrap_or(&0)))
        .collect();
    let mut queue: Vec<String> = ids.iter().filter(|i| deg[*i] == 0).cloned().collect();
    queue.sort_by_key(|x| decl[x]);
    while !queue.is_empty() {
        let u = queue.remove(0);
        for v in get(&succ, &u).to_vec() {
            if rank[&u] + 1 > rank[&v] {
                rank.insert(v.clone(), rank[&u] + 1);
            }
            let dv = deg.get_mut(&v).unwrap();
            *dv -= 1;
            if *dv == 0 {
                queue.push(v.clone());
                queue.sort_by_key(|x| decl[x]);
            }
        }
    }

    // trunk = one longest source→sink path, pinned straight
    let mut trunk: HashSet<String> = HashSet::new();
    if !ids.is_empty() {
        // max by (rank, -decl)
        let mut cur: Option<String> = ids.iter().max_by_key(|n| (rank[*n], -decl[*n])).cloned();
        while let Some(c) = cur {
            trunk.insert(c.clone());
            let ps = get(&pred, &c);
            cur = ps.iter().max_by_key(|p| (rank[*p], -decl[*p])).cloned();
        }
    }

    // ── 2. Dummy nodes for edges spanning >1 layer ───────────────────────────
    let mut vsucc: HashMap<String, Vec<String>> = HashMap::new();
    let mut vpred: HashMap<String, Vec<String>> = HashMap::new();
    let mut vrank: HashMap<String, i64> = rank.clone();
    let mut vw: HashMap<String, i64> = sw.clone();
    let mut vh: HashMap<String, i64> = sh.clone();
    let mut vdecl: HashMap<String, i64> = decl.clone();
    let mut is_dummy: HashMap<String, bool> = HashMap::new();
    let mut segments: HashMap<usize, Vec<String>> = HashMap::new();
    let mut dn: i64 = 0;
    for &k in &valid {
        let f = &flows[k];
        let (s, d) = if back.contains(&k) {
            (f.dst.clone(), f.src.clone())
        } else {
            (f.src.clone(), f.dst.clone())
        };
        let r0 = rank[&s];
        let r1 = rank[&d];
        let seg: Vec<String> = if (r1 - r0).abs() <= 1 {
            if r0 != r1 {
                push(&mut vsucc, &s, d.clone());
                push(&mut vpred, &d, s.clone());
            }
            vec![s.clone(), d.clone()]
        } else {
            let step: i64 = if r1 > r0 { 1 } else { -1 };
            let mut chain = vec![s.clone()];
            let mut prev = s.clone();
            let mut r = r0 + step;
            while r != r1 {
                let dv = format!("__d{dn}");
                dn += 1;
                vrank.insert(dv.clone(), r);
                is_dummy.insert(dv.clone(), true);
                vw.insert(dv.clone(), 0);
                vh.insert(dv.clone(), 0);
                vdecl.insert(dv.clone(), decl[&s] * 100000 + dn);
                push(&mut vsucc, &prev, dv.clone());
                push(&mut vpred, &dv, prev.clone());
                chain.push(dv.clone());
                prev = dv;
                r += step;
            }
            push(&mut vsucc, &prev, d.clone());
            push(&mut vpred, &d, prev.clone());
            chain.push(d.clone());
            chain
        };
        let stored = if back.contains(&k) {
            seg.iter().rev().cloned().collect()
        } else {
            seg
        };
        segments.insert(k, stored);
    }

    let max_rank = vrank.values().copied().max().unwrap_or(0);
    let mut layers: Vec<Vec<String>> = vec![Vec::new(); (max_rank + 1) as usize];
    let mut vnodes: Vec<String> = vrank.keys().cloned().collect();
    vnodes.sort_by_key(|x| vdecl[x]);
    for n in &vnodes {
        layers[vrank[n] as usize].push(n.clone());
    }

    let side = assign_sides(&trunk, &vrank, &vsucc, &vpred, &vdecl);

    // ── 3. Ordering (barycenter sweeps) ──────────────────────────────────────
    let mut order: Vec<Vec<String>> = layers.clone();
    for it in 0..ORDER_SWEEPS {
        let down = it % 2 == 0;
        let seq: Vec<i64> = if down {
            (1..=max_rank).collect()
        } else {
            (0..max_rank).rev().collect()
        };
        for l in seq {
            let adj_idx = if down { l - 1 } else { l + 1 };
            let adj_order: &[String] = if adj_idx >= 0 && (adj_idx as usize) < order.len() {
                &order[adj_idx as usize]
            } else {
                &[]
            };
            let pos: HashMap<&str, usize> = adj_order
                .iter()
                .enumerate()
                .map(|(i, n)| (n.as_str(), i))
                .collect();
            let cur_idx: HashMap<&str, usize> = order[l as usize]
                .iter()
                .enumerate()
                .map(|(i, n)| (n.as_str(), i))
                .collect();
            let nbr = if down { &vpred } else { &vsucc };
            let bary = |n: &str| -> f64 {
                let ms: Vec<f64> = get(nbr, n)
                    .iter()
                    .filter_map(|m| pos.get(m.as_str()).map(|&i| i as f64))
                    .collect();
                if ms.is_empty() {
                    cur_idx[n] as f64
                } else {
                    ms.iter().sum::<f64>() / ms.len() as f64
                }
            };
            let mut col = order[l as usize].clone();
            col.sort_by(|a, b| {
                bary(a)
                    .partial_cmp(&bary(b))
                    .unwrap()
                    .then(vdecl[a].cmp(&vdecl[b]))
            });
            order[l as usize] = col;
        }
    }

    // Group each layer above | trunk | below.
    let side_of = |n: &str| *side.get(n).unwrap_or(&0);
    for col in &mut order {
        let above: Vec<String> = col.iter().filter(|n| side_of(n) < 0).cloned().collect();
        let mid: Vec<String> = col.iter().filter(|n| side_of(n) == 0).cloned().collect();
        let below: Vec<String> = col.iter().filter(|n| side_of(n) > 0).cloned().collect();
        *col = above.into_iter().chain(mid).chain(below).collect();
    }

    // ── 4. Coordinates ───────────────────────────────────────────────────────
    let mut cx: HashMap<String, f64> = HashMap::new();
    let mut right = MARGIN;
    for l in 0..=max_rank {
        let col_w = layers[l as usize].iter().map(|n| vw[n]).max().unwrap_or(0) as f64;
        let center = right + H_GAP + col_w / 2.0;
        for n in &layers[l as usize] {
            cx.insert(n.clone(), center);
        }
        right = center + col_w / 2.0;
    }

    let mut cy: HashMap<String, f64> = HashMap::new();
    for col in &order {
        let total: f64 = col.iter().map(|n| vh[n] as f64).sum::<f64>()
            + V_GAP * (col.len().saturating_sub(1)) as f64;
        let mut run = -total / 2.0;
        for n in col {
            cy.insert(n.clone(), run + vh[n] as f64 / 2.0);
            run += vh[n] as f64 + V_GAP;
        }
    }

    let prio = |n: &str| -> i64 {
        if trunk.contains(n) {
            return PRIO_TRUNK;
        }
        if *is_dummy.get(n).unwrap_or(&false) {
            return PRIO_DUMMY;
        }
        if get(&vpred, n).len() <= 1 && get(&vsucc, n).len() <= 1 {
            return PRIO_CHAIN;
        }
        (get(&vpred, n).len() + get(&vsucc, n).len()) as i64
    };

    for it in 0..ALIGN_SWEEPS {
        let down = it % 2 == 0;
        let seq: Vec<i64> = if down {
            (1..=max_rank).collect()
        } else {
            (0..max_rank).rev().collect()
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
                        let ns: Vec<f64> = get(nbr, n).iter().map(|m| cy[m]).collect();
                        if ns.is_empty() {
                            cy[n]
                        } else {
                            median(&ns)
                        }
                    }
                })
                .collect();
            let prios: Vec<i64> = col.iter().map(|n| prio(n)).collect();
            place_layer(&col, &prios, &desired, &mut cy, &vh, &vdecl);
        }
    }

    if !cy.is_empty() {
        let min_top = ids
            .iter()
            .map(|n| cy[n] - vh[n] as f64 / 2.0)
            .fold(f64::INFINITY, f64::min);
        let dy = top_y - min_top;
        for v in cy.values_mut() {
            *v += dy;
        }
    }

    // ── 5. Pin override ───────────────────────────────────────────────────────
    for n in nodes {
        if let Some((px, py)) = n.pin {
            cx.insert(n.id.clone(), px as f64);
            cy.insert(n.id.clone(), py as f64);
        }
    }

    // ── emit components ────────────────────────────────────────────────────────
    let mut comps: Vec<Component> = Vec::new();
    for n in nodes {
        comps.push(Component {
            id: n.id.clone(),
            name: n.label.clone(),
            subtitle: String::new(),
            icon: n.marker.clone(),
            shape: n.shape.clone(),
            accent: "blue".to_string(),
            pos: (py_round(cx[&n.id]), py_round(cy[&n.id])),
            size: Some(size_of(&n.shape)),
            ..Default::default()
        });
    }

    // ── 6. Routing → Edge.points ───────────────────────────────────────────────
    let multi_out: HashMap<String, bool> = ids
        .iter()
        .map(|id| (id.clone(), get(&vsucc, id).len() > 1))
        .collect();
    let mut edges: Vec<Edge> = Vec::new();
    for &k in &valid {
        let f = &flows[k];
        let pts = route(
            &segments[&k],
            &cx,
            &cy,
            &vw,
            &vh,
            &multi_out,
            back.contains(&k),
        );
        let label_pos = if f.label.is_empty() {
            None
        } else {
            label_pos(&pts)
        };
        edges.push(Edge {
            src: f.src.clone(),
            dst: f.dst.clone(),
            label: f.label.clone(),
            points: Some(pts),
            bpmn_flow: Some(f.flow.clone()),
            label_pos,
            ..Default::default()
        });
    }

    let mut right_ext = nodes
        .iter()
        .map(|n| cx[&n.id] + sw[&n.id] as f64 / 2.0)
        .fold(MARGIN, f64::max);
    let mut bot_ext = nodes
        .iter()
        .map(|n| cy[&n.id] + sh[&n.id] as f64 / 2.0)
        .fold(MARGIN, f64::max);
    for e in &edges {
        if let Some(pts) = &e.points {
            for &(px, py) in pts {
                right_ext = right_ext.max(px as f64);
                bot_ext = bot_ext.max(py as f64);
            }
        }
    }
    (comps, edges, right_ext, bot_ext)
}

/// Place a layer's nodes near their desired y, honouring min-gap + priority.
/// Mirrors `_place_layer`.
fn place_layer(
    col: &[String],
    prios: &[i64],
    desired: &[f64],
    cy: &mut HashMap<String, f64>,
    vh: &HashMap<String, i64>,
    vdecl: &HashMap<String, i64>,
) {
    let n = col.len();
    if n == 0 {
        return;
    }
    let gap = |k: usize| -> f64 { vh[&col[k - 1]] as f64 / 2.0 + V_GAP + vh[&col[k]] as f64 / 2.0 };
    let mut y: Vec<f64> = col.iter().map(|c| cy[c]).collect();
    let mut placed = vec![false; n];
    let mut idxs: Vec<usize> = (0..n).collect();
    idxs.sort_by(|&a, &b| {
        (-prios[a])
            .cmp(&-prios[b])
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
        cy.insert(c.clone(), y[i]);
    }
}

/// Orthogonal polyline through the (real + dummy) chain, src→dst. Mirrors `_route`.
fn route(
    chain: &[String],
    cx: &HashMap<String, f64>,
    cy: &HashMap<String, f64>,
    vw: &HashMap<String, i64>,
    vh: &HashMap<String, i64>,
    multi_out: &HashMap<String, bool>,
    reverse: bool,
) -> Vec<(i64, i64)> {
    let mut ptsf: Vec<(f64, f64)> = Vec::new();
    for k in 0..chain.len().saturating_sub(1) {
        let a = &chain[k];
        let b = &chain[k + 1];
        let (ax, ay, bx, by) = (cx[a], cy[a], cx[b], cy[b]);
        let first = k == 0;
        let last = k == chain.len() - 2;
        let ahw = vw[a] as f64 / 2.0;
        let ahh = vh[a] as f64 / 2.0;
        let bhw = vw[b] as f64 / 2.0;
        let sx = if last { bx - bhw } else { bx };
        let sy = by;
        let seg: Vec<(f64, f64)> = if ay == by {
            let ex = if first { ax + ahw } else { ax };
            vec![(ex, ay), (sx, sy)]
        } else if first && *multi_out.get(a.as_str()).unwrap_or(&false) {
            let ey = if by < ay { ay - ahh } else { ay + ahh };
            vec![(ax, ey), (ax, sy), (sx, sy)]
        } else {
            let ex = if first { ax + ahw } else { ax };
            let mx = (ex + sx) / 2.0;
            vec![(ex, ay), (mx, ay), (mx, sy), (sx, sy)]
        };
        if ptsf.is_empty() {
            ptsf.extend(seg);
        } else {
            ptsf.extend(seg.into_iter().skip(1));
        }
    }
    let rounded: Vec<(i64, i64)> = ptsf
        .iter()
        .map(|&(x, y)| (py_round(x), py_round(y)))
        .collect();
    let mut pts = dedupe(&rounded);
    if reverse {
        pts.reverse();
    }
    pts
}

/// Drop duplicate + collinear interior points. Mirrors `_dedupe`.
fn dedupe(pts: &[(i64, i64)]) -> Vec<(i64, i64)> {
    if pts.len() <= 2 {
        return pts.to_vec();
    }
    let mut out = vec![pts[0]];
    for i in 1..pts.len() - 1 {
        let (x0, y0) = *out.last().unwrap();
        let (x1, y1) = pts[i];
        let (x2, y2) = pts[i + 1];
        if (x0 == x1 && x1 == x2) || (y0 == y1 && y1 == y2) {
            continue;
        }
        if (x1, y1) != (x0, y0) {
            out.push(pts[i]);
        }
    }
    if *pts.last().unwrap() != *out.last().unwrap() {
        out.push(*pts.last().unwrap());
    }
    out
}

/// Midpoint of the first edge segment, nudged up. Mirrors `_label_pos`.
fn label_pos(pts: &[(i64, i64)]) -> Option<(i64, i64)> {
    if pts.len() < 2 {
        return None;
    }
    let (x0, y0) = pts[0];
    let (x1, y1) = pts[1];
    Some((
        py_round((x0 + x1) as f64 / 2.0),
        py_round((y0 + y1) as f64 / 2.0) - 8,
    ))
}
