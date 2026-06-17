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

    for n in &fc.nodes {
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
    for sg in &fc.subgraphs {
        g.set_node(sg.id.clone(), Some(NodeLabel::default()));
        for m in &sg.members {
            g.set_parent(m, Some(&sg.id));
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
    for sg in &fc.subgraphs {
        if let Some(cd) = g.node(&sg.id) {
            let (x, y, w, h) = (
                cd.x.unwrap_or(0.0),
                cd.y.unwrap_or(0.0),
                cd.width,
                cd.height,
            );
            geom.regions.push(FRegion {
                id: sg.id.clone(),
                label: sg.title.clone(),
                x: x - w / 2.0 + MX,
                y: y - h / 2.0 + MY,
                w,
                h,
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
