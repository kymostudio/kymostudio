//! Dagre-based flowchart layout — a mermaid-faithful alternative to the native
//! Sugiyama layout in [`kymo_graph::sugiyama`]. Builds a dagre graph from the
//! [`Flowchart`] IR, runs the dagre.js port (`dagre` crate), and maps node
//! positions, edge waypoints, and compound cluster bounds into float geometry
//! ([`FGeom`]). The float renderer ([`kymo_graph::dagre_svg`]) draws it; with the
//! mermaid [`FlowStyle`] the output aims to match mermaid.js 11. A rounded
//! [`Diagram`] is also available for the kymojson interchange path.

use kymo_graph::dagre_svg::{FEdge, FGeom, FNode, FRegion};
use kymo_graph::flowchart::{Direction, Flowchart};
use kymo_graph::metrics::{node_size_for, node_size_mermaid_f};
use kymo_graph::style::FlowStyle;
use dagre::graph::{Graph, GraphOptions};
use dagre::layout::layout;
use dagre::layout::types::{EdgeLabel, LayoutOptions, NodeLabel, RankDir};
use std::collections::HashMap;

/// A pre-rendered `$$…$$` glyph group plus its pixel size, computed by the caller
/// (kymo-mermaid via kymo-tex) so this crate stays math-engine-free. Keyed by node
/// id (nodes) or `(src, dst)` (edges) in the maps passed to [`dagre_geom_with_math`].
pub type MathBox = (String, f64, f64);

/// Box size for a math node/edge: glyph content + box padding, floored to a
/// sensible minimum (mirrors the text path's `(tw + 30).max(56)` shaping).
fn math_box_size((_, w, h): &MathBox) -> (f64, f64) {
    ((w + 24.0).max(56.0), (h + 18.0).max(40.0))
}

const MX: f64 = 8.0;
const MY: f64 = 8.0;

/// Lay out a flowchart with dagre, sizing nodes per `style`, keeping every
/// coordinate in `f64` (no rounding) so the renderer can match mermaid sub-pixel.
/// Bounding box (x1,y1,x2,y2) of subgraph `i` = the union of its node members'
/// boxes and the boxes of its child subgraphs (nesting via `Subgraph::parent`),
/// padded by 8px plus a top band for the cluster label. Memoised by index.
fn region_bounds(
    i: usize,
    subs: &[kymo_graph::flowchart::Subgraph],
    children: &[Vec<usize>],
    node_box: &std::collections::HashMap<&str, (f64, f64, f64, f64)>,
    dagre_box: &[Option<(f64, f64, f64, f64)>],
    memo: &mut [Option<Option<(f64, f64, f64, f64)>>],
) -> Option<(f64, f64, f64, f64)> {
    if let Some(c) = memo[i] {
        return c;
    }
    // The dagre crate already sized this cluster from its leaf members — trust it
    // (keeps single-level subgraphs byte-identical). Only clusters it left
    // degenerate (those containing only other clusters) fall through to the union.
    if let Some(bx) = dagre_box[i] {
        memo[i] = Some(Some(bx));
        return Some(bx);
    }
    memo[i] = Some(None); // guard against parent cycles while recursing
    let mut b: Option<(f64, f64, f64, f64)> = None;
    let mut acc = |b: &mut Option<(f64, f64, f64, f64)>, m: Option<(f64, f64, f64, f64)>| {
        if let Some((x1, y1, x2, y2)) = m {
            *b = Some(match *b {
                None => (x1, y1, x2, y2),
                Some((a1, c1, a2, c2)) => (a1.min(x1), c1.min(y1), a2.max(x2), c2.max(y2)),
            });
        }
    };
    for mem in &subs[i].members {
        acc(&mut b, node_box.get(mem.as_str()).copied());
    }
    for &c in &children[i] {
        acc(&mut b, region_bounds(c, subs, children, node_box, dagre_box, memo));
    }
    let res = b.map(|(x1, y1, x2, y2)| (x1 - 8.0, y1 - 21.0, x2 + 8.0, y2 + 8.0));
    memo[i] = Some(res);
    res
}

fn dir_to_rankdir(d: Direction) -> RankDir {
    match d {
        Direction::Tb => RankDir::TB,
        Direction::Bt => RankDir::BT,
        Direction::Lr => RankDir::LR,
        Direction::Rl => RankDir::RL,
    }
}

/// A laid-out container (root or one subgraph): everything in coords relative to
/// the container box's top-left, with the box size.
#[derive(Default)]
struct CL {
    w: f64,
    h: f64,
    nodes: Vec<(String, f64, f64, f64, f64)>,      // id, cx, cy, w, h
    regions: Vec<(String, String, f64, f64, f64, f64)>, // id, label, x, y, w, h
    edges: Vec<(usize, Vec<(f64, f64)>)>,          // edge index, points
}

/// True when the flowchart needs the recursive (per-subgraph-direction /
/// nested-cluster) layout. Flat single-level subgraphs stay on the fast path.
fn needs_nested(fc: &Flowchart) -> bool {
    fc.subgraphs
        .iter()
        .any(|s| s.direction.is_some() || s.parent.is_some())
}

/// Recursive flowchart layout (mermaid-faithful for nested subgraphs + per-
/// subgraph `direction`): each subgraph is laid out in its own direction and
/// becomes a composite node in its parent; cluster edges connect composites.
fn dagre_geom_nested(fc: &Flowchart, style: FlowStyle) -> FGeom {
    use std::collections::HashMap;
    let n_sg = fc.subgraphs.len();
    let sg_ids: std::collections::HashSet<&str> =
        fc.subgraphs.iter().map(|s| s.id.as_str()).collect();

    let size_of = |label: &str, shape| -> (f64, f64) {
        if matches!(style, FlowStyle::Mermaid) {
            node_size_mermaid_f(label, shape)
        } else {
            let (a, b) = node_size_for(label, shape, style);
            (a as f64, b as f64)
        }
    };
    let mut node_size: HashMap<&str, (f64, f64)> = HashMap::new();
    let mut node_meta: HashMap<&str, (&str, kymo_graph::model::Shape)> = HashMap::new();
    for n in &fc.nodes {
        if sg_ids.contains(n.id.as_str()) {
            continue;
        }
        node_size.insert(n.id.as_str(), size_of(&n.label, n.shape));
        node_meta.insert(n.id.as_str(), (n.label.as_str(), n.shape));
    }

    // Direct membership.
    let mut node_container: HashMap<&str, usize> = HashMap::new();
    let mut child_nodes: Vec<Vec<&str>> = vec![Vec::new(); n_sg];
    for (i, sg) in fc.subgraphs.iter().enumerate() {
        for m in &sg.members {
            if node_size.contains_key(m.as_str()) && !node_container.contains_key(m.as_str()) {
                node_container.insert(m.as_str(), i);
                child_nodes[i].push(m.as_str());
            }
        }
    }
    let mut child_sgs: Vec<Vec<usize>> = vec![Vec::new(); n_sg];
    let mut root_sgs: Vec<usize> = Vec::new();
    for (i, sg) in fc.subgraphs.iter().enumerate() {
        match sg.parent {
            Some(p) if p < n_sg && p != i => child_sgs[p].push(i),
            _ => root_sgs.push(i),
        }
    }
    let mut root_nodes: Vec<&str> = Vec::new();
    for n in &fc.nodes {
        if !sg_ids.contains(n.id.as_str()) && !node_container.contains_key(n.id.as_str()) {
            root_nodes.push(n.id.as_str());
        }
    }

    // Container of any element id (node → its subgraph; subgraph → its parent).
    let container_of = |id: &str| -> Option<usize> {
        if let Some(&c) = node_container.get(id) {
            return Some(c);
        }
        fc.subgraphs.iter().position(|s| s.id == id).and_then(|i| fc.subgraphs[i].parent)
    };
    // Chain of (container, element-id) from the element up to the root.
    let chain = |id: &str| -> Vec<(Option<usize>, String)> {
        let mut out = Vec::new();
        let mut cur = id.to_string();
        let mut guard = 0;
        loop {
            let c = container_of(&cur);
            out.push((c, cur.clone()));
            guard += 1;
            match c {
                Some(ci) if guard < 64 => cur = fc.subgraphs[ci].id.clone(),
                _ => break,
            }
        }
        out
    };

    // Assign each edge to its lowest common container, with the representative
    // direct-child id of that container on each side.
    let mut edges_at: HashMap<Option<usize>, Vec<(String, String, usize)>> = HashMap::new();
    for (ei, e) in fc.edges.iter().enumerate() {
        let ca = chain(&e.src);
        let cb = chain(&e.dst);
        let b_conts: Vec<Option<usize>> = cb.iter().map(|(c, _)| *c).collect();
        let lca = ca
            .iter()
            .map(|(c, _)| *c)
            .find(|c| b_conts.contains(c))
            .unwrap_or(None);
        let ra = ca.iter().find(|(c, _)| *c == lca).map(|(_, id)| id.clone());
        let rb = cb.iter().find(|(c, _)| *c == lca).map(|(_, id)| id.clone());
        if let (Some(ra), Some(rb)) = (ra, rb) {
            if ra != rb {
                edges_at.entry(lca).or_default().push((ra, rb, ei));
            }
        }
    }

    // Lay out one container; child subgraphs must already be in `done`.
    let layout_one = |container: Option<usize>, done: &HashMap<usize, CL>| -> CL {
        let dir = match container {
            Some(i) => fc.subgraphs[i].direction.unwrap_or(fc.direction),
            None => fc.direction,
        };
        let nodes_here: &[&str] = match container {
            Some(i) => &child_nodes[i],
            None => &root_nodes,
        };
        let sgs_here: &[usize] = match container {
            Some(i) => &child_sgs[i],
            None => &root_sgs,
        };
        if nodes_here.is_empty() && sgs_here.is_empty() {
            return CL::default();
        }
        let mut g: Graph<NodeLabel, EdgeLabel> = Graph::with_options(GraphOptions::default());
        for &nid in nodes_here {
            let (w, h) = node_size[nid];
            g.set_node(nid.to_string(), Some(NodeLabel { width: w, height: h, ..Default::default() }));
        }
        for &si in sgs_here {
            let cl = &done[&si];
            g.set_node(
                fc.subgraphs[si].id.clone(),
                Some(NodeLabel { width: cl.w.max(1.0), height: cl.h.max(1.0), ..Default::default() }),
            );
        }
        if let Some(es) = edges_at.get(&container) {
            for (ra, rb, ei) in es {
                let lw = fc.edges[*ei].label.chars().count() as f64 * 7.0;
                let lh = if fc.edges[*ei].label.is_empty() { 0.0 } else { 16.0 };
                g.set_edge(
                    ra.clone(),
                    rb.clone(),
                    Some(EdgeLabel { width: lw, height: lh, ..Default::default() }),
                    None,
                );
            }
        }
        layout(&mut g, Some(LayoutOptions { rankdir: dir_to_rankdir(dir), ..Default::default() }));

        // bbox of placed elements
        let (mut minx, mut miny, mut maxx, mut maxy) = (f64::MAX, f64::MAX, f64::MIN, f64::MIN);
        let mut acc = |x: f64, y: f64, w: f64, h: f64| {
            minx = minx.min(x - w / 2.0);
            miny = miny.min(y - h / 2.0);
            maxx = maxx.max(x + w / 2.0);
            maxy = maxy.max(y + h / 2.0);
        };
        for &nid in nodes_here {
            if let Some(nd) = g.node(nid) {
                acc(nd.x.unwrap_or(0.0), nd.y.unwrap_or(0.0), nd.width, nd.height);
            }
        }
        for &si in sgs_here {
            if let Some(nd) = g.node(&fc.subgraphs[si].id) {
                acc(nd.x.unwrap_or(0.0), nd.y.unwrap_or(0.0), nd.width, nd.height);
            }
        }
        if minx > maxx {
            return CL::default();
        }
        let titled = container.map(|i| !fc.subgraphs[i].title.is_empty()).unwrap_or(false);
        let (padl, padr, padt, padb) = match container {
            Some(_) => (8.0, 8.0, if titled { 25.0 } else { 8.0 }, 8.0),
            None => (MX, MX, MY, MY),
        };
        let (sx, sy) = (-minx + padl, -miny + padt);
        let mut cl = CL {
            w: (maxx - minx) + padl + padr,
            h: (maxy - miny) + padt + padb,
            ..Default::default()
        };
        for &nid in nodes_here {
            if let Some(nd) = g.node(nid) {
                cl.nodes.push((nid.to_string(), nd.x.unwrap_or(0.0) + sx, nd.y.unwrap_or(0.0) + sy, nd.width, nd.height));
            }
        }
        for &si in sgs_here {
            let nd = match g.node(&fc.subgraphs[si].id) {
                Some(n) => n,
                None => continue,
            };
            let sub = &done[&si];
            let ox = nd.x.unwrap_or(0.0) - sub.w / 2.0 + sx;
            let oy = nd.y.unwrap_or(0.0) - sub.h / 2.0 + sy;
            cl.regions.push((fc.subgraphs[si].id.clone(), fc.subgraphs[si].title.clone(), ox, oy, sub.w, sub.h));
            for (id, cx, cy, w, h) in &sub.nodes {
                cl.nodes.push((id.clone(), ox + cx, oy + cy, *w, *h));
            }
            for (id, lbl, rx, ry, rw, rh) in &sub.regions {
                cl.regions.push((id.clone(), lbl.clone(), ox + rx, oy + ry, *rw, *rh));
            }
            for (ei, pts) in &sub.edges {
                cl.edges.push((*ei, pts.iter().map(|(px, py)| (ox + px, oy + py)).collect()));
            }
        }
        if let Some(es) = edges_at.get(&container) {
            for (ra, rb, ei) in es {
                if let Some(ed) = g.edge(ra, rb, None) {
                    cl.edges.push((*ei, ed.points.iter().map(|p| (p.x + sx, p.y + sy)).collect()));
                }
            }
        }
        cl
    };

    // Bottom-up: deepest subgraphs first (by chain depth).
    let depth = |mut i: usize| -> usize {
        let mut d = 0;
        let mut guard = 0;
        while let Some(p) = fc.subgraphs[i].parent {
            if p >= n_sg || p == i || guard > 64 {
                break;
            }
            i = p;
            d += 1;
            guard += 1;
        }
        d
    };
    let mut order: Vec<usize> = (0..n_sg).collect();
    order.sort_by(|&a, &b| depth(b).cmp(&depth(a)));
    let mut done: HashMap<usize, CL> = HashMap::new();
    for i in order {
        let cl = layout_one(Some(i), &done);
        done.insert(i, cl);
    }
    let root = layout_one(None, &done);

    // Assemble FGeom.
    let mut geom = FGeom::default();
    geom.w = root.w;
    geom.h = root.h;
    for (id, cx, cy, w, h) in &root.nodes {
        let (name, shape) = node_meta.get(id.as_str()).copied().unwrap_or((id.as_str(), kymo_graph::model::Shape::Box));
        geom.nodes.push(FNode {
            id: id.clone(),
            name: name.to_string(),
            shape,
            cx: *cx,
            cy: *cy,
            w: *w,
            h: *h,
            icon: None,
            math: None,
        });
    }
    for (id, label, x, y, w, h) in &root.regions {
        geom.regions.push(FRegion {
            id: id.clone(),
            label: label.clone(),
            x: *x,
            y: *y,
            w: *w,
            h: *h,
            visible: true,
        });
    }
    for (ei, pts) in &root.edges {
        let e = &fc.edges[*ei];
        let label_pt = if e.label.is_empty() || pts.is_empty() {
            None
        } else {
            Some(pts[pts.len() / 2])
        };
        geom.edges.push(FEdge {
            label: e.label.clone(),
            dashed: e.dashed,
            no_arrow: e.no_arrow,
            points: pts.clone(),
            label_pt,
            math: None,
        });
    }
    geom
}

pub fn dagre_geom(fc: &Flowchart, style: FlowStyle) -> FGeom {
    dagre_geom_with_math(fc, style, &HashMap::new(), &HashMap::new())
}

/// Like [`dagre_geom`] but sizes `$$…$$` nodes/edges by their pre-rendered glyph
/// box and carries the glyph through to `FNode.math` / `FEdge.math`. Math sizing
/// applies to the flat (non-nested) path; a math node inside a subgraph falls
/// back to its (Unicode) text size.
pub fn dagre_geom_with_math(
    fc: &Flowchart,
    style: FlowStyle,
    node_math: &HashMap<String, MathBox>,
    edge_math: &HashMap<(String, String), MathBox>,
) -> FGeom {
    let mut geom = FGeom::default();
    if fc.nodes.is_empty() {
        geom.w = 40.0;
        geom.h = 40.0;
        return geom;
    }
    if needs_nested(fc) {
        let g = dagre_geom_nested(fc, style);
        if !g.nodes.is_empty() {
            return g;
        }
    }

    let mut g: Graph<NodeLabel, EdgeLabel> = Graph::with_options(GraphOptions {
        compound: !fc.subgraphs.is_empty(),
        ..Default::default()
    });
    let rankdir = match fc.direction {
        Direction::Tb => RankDir::TB,
        Direction::Bt => RankDir::BT,
        Direction::Lr => RankDir::LR,
        Direction::Rl => RankDir::RL,
    };

    // A node id that is ALSO a subgraph id is a CLUSTER, not a node (mermaid draws
    // it as a cluster, and `A --> subgraphId` is a cluster edge) — exclude it from
    // the node set so kymo's node count matches mermaid's (it lands in `regions`).
    let sg_ids: std::collections::HashSet<&str> =
        fc.subgraphs.iter().map(|s| s.id.as_str()).collect();
    for n in &fc.nodes {
        if sg_ids.contains(n.id.as_str()) {
            continue;
        }
        let (w, h) = if let Some(mb) = node_math.get(n.id.as_str()) {
            math_box_size(mb)
        } else if matches!(style, FlowStyle::Mermaid) {
            node_size_mermaid_f(&n.label, n.shape)
        } else {
            let (wi, hi) = node_size_for(&n.label, n.shape, style);
            (wi as f64, hi as f64)
        };
        g.set_node(
            n.id.clone(),
            Some(NodeLabel {
                width: w,
                height: h,
                ..Default::default()
            }),
        );
    }
    // Compound clusters: a sizeless parent node; members re-parented to it.
    // Guard against cycles/self-parent/double-parent — the `dagre` crate panics
    // on "subcontainer as parent of subcontainer" (nested subgraphs whose member
    // lists would otherwise form a parent loop). First-parent wins.
    for sg in &fc.subgraphs {
        g.set_node(sg.id.clone(), Some(NodeLabel::default()));
    }
    let mut parent_of: std::collections::HashMap<&str, &str> = std::collections::HashMap::new();
    for sg in &fc.subgraphs {
        for m in &sg.members {
            if m == &sg.id || parent_of.contains_key(m.as_str()) {
                continue; // self-parent, or already parented
            }
            // would setting m's parent = sg create a cycle? (sg already under m)
            let mut cur = Some(sg.id.as_str());
            let mut cycle = false;
            while let Some(c) = cur {
                if c == m.as_str() {
                    cycle = true;
                    break;
                }
                cur = parent_of.get(c).copied();
            }
            if cycle {
                continue;
            }
            g.set_parent(m, Some(&sg.id));
            parent_of.insert(m.as_str(), sg.id.as_str());
        }
    }
    // Reverse insertion order so the dagre crate's order phase breaks ties
    // the same way dagre-d3-es (mermaid's lib) does.
    for e in fc.edges.iter().rev() {
        let (lw, lh) = if let Some((_, mw, mh)) = edge_math.get(&(e.src.clone(), e.dst.clone())) {
            (*mw, *mh)
        } else if e.label.is_empty() {
            (0.0, 0.0)
        } else {
            // mermaid sizes the edge label to its measured text, height 24.
            (kymo_graph::metrics::text_w_mermaid(&e.label).max(10.0), 24.0)
        };
        g.set_edge(
            e.src.clone(),
            e.dst.clone(),
            Some(EdgeLabel {
                width: lw,
                height: lh,
                ..Default::default()
            }),
            None,
        );
    }

    layout(
        &mut g,
        Some(LayoutOptions {
            rankdir,
            ..Default::default()
        }),
    );

    for n in &fc.nodes {
        if sg_ids.contains(n.id.as_str()) {
            continue; // cluster, emitted as a region below — not a node
        }
        if let Some(nd) = g.node(&n.id) {
            geom.nodes.push(FNode {
                id: n.id.clone(),
                name: n.label.clone(),
                shape: n.shape,
                cx: nd.x.unwrap_or(0.0) + MX,
                cy: nd.y.unwrap_or(0.0) + MY,
                w: nd.width,
                h: nd.height,
                icon: None,
                math: node_math.get(n.id.as_str()).map(|(g, _, _)| g.clone()),
            });
        }
    }
    // Cluster bounds: the dagre crate sizes a cluster from its *leaf* members, so
    // a subgraph that only contains other subgraphs comes back 0×0. Compute each
    // region as the union of its members' boxes (recursing into nested
    // subgraphs) so a parent encloses its child clusters.
    let node_box: std::collections::HashMap<&str, (f64, f64, f64, f64)> = geom
        .nodes
        .iter()
        .map(|n| (n.id.as_str(), (n.cx - n.w / 2.0, n.cy - n.h / 2.0, n.cx + n.w / 2.0, n.cy + n.h / 2.0)))
        .collect();
    let mut children: Vec<Vec<usize>> = vec![Vec::new(); fc.subgraphs.len()];
    for (ci, sg) in fc.subgraphs.iter().enumerate() {
        if let Some(p) = sg.parent {
            if p < children.len() {
                children[p].push(ci);
            }
        }
    }
    // The dagre crate's own cluster box (geom coords), kept when non-degenerate.
    let dagre_box: Vec<Option<(f64, f64, f64, f64)>> = fc
        .subgraphs
        .iter()
        .map(|sg| {
            g.node(&sg.id).and_then(|cd| {
                let (w, h) = (cd.width, cd.height);
                if w > 0.0 && h > 0.0 {
                    let (x, y) = (cd.x.unwrap_or(0.0), cd.y.unwrap_or(0.0));
                    Some((x - w / 2.0 + MX, y - h / 2.0 + MY, x + w / 2.0 + MX, y + h / 2.0 + MY))
                } else {
                    None
                }
            })
        })
        .collect();
    let mut memo: Vec<Option<Option<(f64, f64, f64, f64)>>> = vec![None; fc.subgraphs.len()];
    for (i, sg) in fc.subgraphs.iter().enumerate() {
        if let Some((x1, y1, x2, y2)) =
            region_bounds(i, &fc.subgraphs, &children, &node_box, &dagre_box, &mut memo)
        {
            geom.regions.push(FRegion {
                id: sg.id.clone(),
                label: sg.title.clone(),
                x: x1,
                y: y1,
                w: x2 - x1,
                h: y2 - y1,
                visible: true,
            });
        }
    }
    // node centre x by id, for the mermaid edge-label anchor.
    let cx_by_id: std::collections::HashMap<&str, f64> =
        geom.nodes.iter().map(|n| (n.id.as_str(), n.cx)).collect();
    for e in &fc.edges {
        if let Some(ed) = g.edge(&e.src, &e.dst, None) {
            let points: Vec<(f64, f64)> = ed.points.iter().map(|p| (p.x + MX, p.y + MY)).collect();
            let label_pt = match (ed.x, ed.y) {
                (Some(_), Some(ly)) => {
                    let lx = cx_by_id.get(e.dst.as_str()).copied().unwrap_or(0.0);
                    Some((lx, ly + MY))
                }
                _ => None,
            };
            geom.edges.push(FEdge {
                label: e.label.clone(),
                dashed: e.dashed,
                no_arrow: e.no_arrow,
                points,
                label_pt,
                math: edge_math
                    .get(&(e.src.clone(), e.dst.clone()))
                    .map(|(g, _, _)| g.clone()),
            });
        }
    }

    // The crate's graph_label.width clips the widest node, so size the diagram
    // from the actual node + cluster extents (+ the margin), matching mermaid.
    let maxx = geom
        .nodes
        .iter()
        .map(|n| n.cx + n.w / 2.0)
        .chain(geom.regions.iter().map(|r| r.x + r.w))
        .fold(40.0_f64, f64::max);
    let maxy = geom
        .nodes
        .iter()
        .map(|n| n.cy + n.h / 2.0)
        .chain(geom.regions.iter().map(|r| r.y + r.h))
        .fold(40.0_f64, f64::max);
    geom.w = maxx + MX;
    geom.h = maxy + MY;
    geom
}
