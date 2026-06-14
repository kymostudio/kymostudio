//! Dagre-based flowchart layout — a mermaid-faithful alternative to the native
//! Sugiyama layout in [`crate::layout`]. Builds a dagre graph from the
//! [`Flowchart`] IR, runs the dagre.js port (`dagre` crate), and maps node
//! positions, edge waypoints, and compound cluster bounds into a kymo
//! [`Diagram`]. The renderer ([`crate::flowchart_svg`]) draws it; with the
//! mermaid [`FlowStyle`] the output aims to match mermaid.js 11.

use crate::flowchart::{Direction, Flowchart};
use crate::layout::node_size_for;
use crate::model::{Component, Diagram, Edge, Region};
use crate::style::FlowStyle;
use dagre::graph::{Graph, GraphOptions};
use dagre::layout::layout;
use dagre::layout::types::{EdgeLabel, GraphLabel, NodeLabel, RankDir};

/// Lay out a flowchart with dagre, sizing nodes per `style`.
pub fn layout_flowchart_dagre(fc: &Flowchart, style: FlowStyle) -> Diagram {
    let mut d = Diagram::default();
    if fc.nodes.is_empty() {
        d.width = 40;
        d.height = 40;
        return d;
    }

    let mut g: Graph<NodeLabel, EdgeLabel> = Graph::with_options(GraphOptions {
        compound: !fc.subgraphs.is_empty(),
        ..Default::default()
    });
    let gl = GraphLabel {
        rankdir: match fc.direction {
            Direction::Tb => RankDir::TB,
            Direction::Bt => RankDir::BT,
            Direction::Lr => RankDir::LR,
            Direction::Rl => RankDir::RL,
        },
        nodesep: 50.0,
        edgesep: 10.0,
        ranksep: 50.0,
        marginx: 8.0,
        marginy: 8.0,
        compound: !fc.subgraphs.is_empty(),
        ..Default::default()
    };
    g.set_graph_label(gl);

    for n in &fc.nodes {
        let (w, h) = node_size_for(&n.label, n.shape, style);
        g.set_node(
            n.id.clone(),
            Some(NodeLabel {
                width: w as f64,
                height: h as f64,
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
            ((e.label.chars().count() as f64 * 8.5).max(10.0), 16.0)
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

    layout(&mut g, None);
    const MX: i32 = 8;
    const MY: i32 = 8;

    for n in &fc.nodes {
        if let Some(nd) = g.node(&n.id) {
            let mut c = Component::flowchart(n.id.clone(), n.label.clone(), n.shape);
            c.pos = (
                nd.x.unwrap_or(0.0).round() as i32 + MX,
                nd.y.unwrap_or(0.0).round() as i32 + MY,
            );
            c.size = Some((nd.width.round() as i32, nd.height.round() as i32));
            d.components.push(c);
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
            let mut r = Region::cluster(sg.id.clone(), sg.title.clone(), sg.members.clone());
            r.bounds = (
                (x - w / 2.0).round() as i32 + MX,
                (y - h / 2.0).round() as i32 + MY,
                w.round() as i32,
                h.round() as i32,
            );
            r.visible = true;
            d.regions.push(r);
        }
    }
    for e in &fc.edges {
        if let Some(ed) = g.edge(&e.src, &e.dst, None) {
            let mut edge = Edge::routed(e.src.clone(), e.dst.clone(), e.label.clone());
            edge.dashed = e.dashed;
            edge.no_arrow = e.no_arrow;
            let pts: Vec<(i32, i32)> = ed
                .points
                .iter()
                .map(|p| (p.x.round() as i32 + MX, p.y.round() as i32 + MY))
                .collect();
            if pts.len() >= 2 {
                edge.points = Some(pts);
            }
            if let (Some(lx), Some(ly)) = (ed.x, ed.y) {
                edge.label_pos = Some((lx.round() as i32, ly.round() as i32));
            }
            d.edges.push(edge);
        }
    }

    if let Some(out) = g.graph_label::<GraphLabel>() {
        d.width = out.width.round() as i32;
        d.height = out.height.round() as i32;
    }
    if d.width <= 0 || d.height <= 0 {
        let maxx = d
            .components
            .iter()
            .map(|c| c.pos.0 + c.size.unwrap_or((0, 0)).0 / 2)
            .max()
            .unwrap_or(40);
        let maxy = d
            .components
            .iter()
            .map(|c| c.pos.1 + c.size.unwrap_or((0, 0)).1 / 2)
            .max()
            .unwrap_or(40);
        d.width = maxx + 8;
        d.height = maxy + 8;
    }
    d
}
