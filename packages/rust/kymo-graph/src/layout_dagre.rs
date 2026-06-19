//! Dagre-based flowchart layout — a mermaid-faithful alternative to the native
//! Sugiyama layout in [`crate::layout`]. Builds a dagre graph from the
//! [`Flowchart`] IR, runs the dagre.js port (`dagre` crate), and maps node
//! positions, edge waypoints, and compound cluster bounds into float geometry
//! ([`FGeom`]). The float renderer ([`crate::dagre_svg`]) draws it; with the
//! mermaid [`FlowStyle`] the output aims to match mermaid.js 11. A rounded
//! [`Diagram`] is also available for the kymojson interchange path.

use crate::dagre_svg::{FEdge, FGeom, FNode, FRegion};
use crate::flowchart::{Direction, Flowchart};
use crate::layout::{node_size_for, node_size_mermaid_f};
use crate::style::FlowStyle;
use dagre::graph::{Graph, GraphOptions};
use dagre::layout::layout;
use dagre::layout::types::{EdgeLabel, LayoutOptions, NodeLabel, RankDir};

const MX: f64 = 8.0;
const MY: f64 = 8.0;

/// Lay out a flowchart with dagre, sizing nodes per `style`, keeping every
/// coordinate in `f64` (no rounding) so the renderer can match mermaid sub-pixel.
/// Bounding box (x1,y1,x2,y2) of subgraph `i` = the union of its node members'
/// boxes and the boxes of its child subgraphs (nesting via `Subgraph::parent`),
/// padded by 8px plus a top band for the cluster label. Memoised by index.
fn region_bounds(
    i: usize,
    subs: &[crate::flowchart::Subgraph],
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

pub fn dagre_geom(fc: &Flowchart, style: FlowStyle) -> FGeom {
    let mut geom = FGeom::default();
    if fc.nodes.is_empty() {
        geom.w = 40.0;
        geom.h = 40.0;
        return geom;
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
        let (w, h) = if matches!(style, FlowStyle::Mermaid) {
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
        let (lw, lh) = if e.label.is_empty() {
            (0.0, 0.0)
        } else {
            // mermaid sizes the edge label to its measured text, height 24.
            (crate::layout::text_w_mermaid(&e.label).max(10.0), 24.0)
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
                math: None,
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
                // Lean path renders edge math as Unicode in the label text.
                math: None,
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
