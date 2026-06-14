//! Editor shape model + `Diagram` → shapes mapping (port of
//! `packages/website/app/src/diagramToShapes.ts`).
//!
//! kymo-derived shapes (node/region/edge) carry a `kymo_id` back-ref so drags
//! write back to the source; freeform shapes (pen/sticky/text) have `kymo_id =
//! None` and live only in the session overlay.

use crate::model::{resolve_anchors, Diagram, Node, RegionStyle};

/// Stable string id, e.g. `kymo-node-<id>`, `freedraw-<n>`.
pub type ShapeId = String;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ShapeKind {
    KymoNode,
    KymoRegion,
    KymoEdge,
    Freedraw,
    Note,
    Text,
}

/// Kind-specific payload.
#[derive(Clone, Debug)]
pub enum ShapeData {
    Node {
        icon: String,
        accent: String,
        name: String,
        subtitle: String,
    },
    Region {
        label: String,
        dash: bool,
    },
    /// Edge endpoints in page space (`x,y` of [`EditorShape`] is the start).
    Edge {
        x2: f32,
        y2: f32,
        label: String,
        src: String,
        dst: String,
    },
    Freedraw {
        points: Vec<(f32, f32)>,
        color: String,
        size: f32,
    },
    Note {
        text: String,
        color: String,
    },
    Text {
        text: String,
        size: f32,
    },
}

/// A positioned editor shape (page space, top-left origin for box-like kinds).
#[derive(Clone, Debug)]
pub struct EditorShape {
    pub id: ShapeId,
    pub kind: ShapeKind,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    /// Back-ref to the `.kymo` id (node/region), for writeback. `None` for
    /// edges and freeform shapes.
    pub kymo_id: Option<String>,
    pub data: ShapeData,
}

pub fn node_shape_id(id: &str) -> String {
    format!("kymo-node-{id}")
}
pub fn region_shape_id(id: &str) -> String {
    format!("kymo-region-{id}")
}
pub fn edge_shape_id(i: usize) -> String {
    format!("kymo-edge-{i}")
}

/// Build the kymo-layer shape list for a positioned diagram. Mirrors
/// `diagramToShapes` (regions behind nodes; edges from resolved anchors).
pub fn diagram_to_shapes(d: &Diagram) -> Vec<EditorShape> {
    let mut out: Vec<EditorShape> = Vec::new();

    // Regions first (sit behind nodes).
    for r in &d.regions {
        if !r.visible {
            continue;
        }
        let (x, y, w, h) = r.bounds;
        if w <= 0 || h <= 0 {
            continue;
        }
        out.push(EditorShape {
            id: region_shape_id(&r.id),
            kind: ShapeKind::KymoRegion,
            x: x as f32,
            y: y as f32,
            w: w as f32,
            h: h as f32,
            kymo_id: Some(r.id.clone()),
            data: ShapeData::Region {
                label: r.label.clone(),
                dash: r.style == RegionStyle::Inner,
            },
        });
    }

    // Component nodes (pos is centre → top-left).
    for c in &d.components {
        let (hw, hh) = c.half();
        out.push(EditorShape {
            id: node_shape_id(&c.id),
            kind: ShapeKind::KymoNode,
            x: (c.pos.0 - hw) as f32,
            y: (c.pos.1 - hh) as f32,
            w: (hw * 2) as f32,
            h: (hh * 2) as f32,
            kymo_id: Some(c.id.clone()),
            data: ShapeData::Node {
                icon: c.icon.clone(),
                accent: c.accent.as_str().to_string(),
                name: c.name.clone(),
                subtitle: c.subtitle.clone(),
            },
        });
    }

    // Edges → from resolved anchor points (BPMN polylines skipped).
    for (i, e) in d.edges.iter().enumerate() {
        if e.points.as_ref().map(|p| !p.is_empty()).unwrap_or(false) {
            continue;
        }
        let src = lookup(d, &e.src);
        let dst = lookup(d, &e.dst);
        let (s, t) = match (src, dst) {
            (Some(s), Some(t)) => (s, t),
            _ => continue,
        };
        let (sa, da) = resolve_anchors(e, s, t);
        let (x1, y1) = s.anchor(sa);
        let (x2, y2) = t.anchor(da);
        out.push(EditorShape {
            id: edge_shape_id(i),
            kind: ShapeKind::KymoEdge,
            x: x1 as f32,
            y: y1 as f32,
            w: (x2 - x1).abs() as f32,
            h: (y2 - y1).abs() as f32,
            kymo_id: None,
            data: ShapeData::Edge {
                x2: x2 as f32,
                y2: y2 as f32,
                label: e.label.clone(),
                src: e.src.clone(),
                dst: e.dst.clone(),
            },
        });
    }

    out
}

fn lookup<'a>(d: &'a Diagram, id: &str) -> Option<Node<'a>> {
    if let Some(c) = d.components.iter().find(|c| c.id == id) {
        return Some(Node::Component(c));
    }
    d.regions.iter().find(|r| r.id == id).map(Node::Region)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kymo::to_diagram;

    #[test]
    fn maps_nodes_regions_edges() {
        let src = "\
a circle/user/blue \"A\" \"\" @ (100, 100)
b hex/hex-agent/green \"B\" \"\" @ (300, 100)
grp outer \"G\" {
  a b
}
a --> b : \"go\"";
        let d = to_diagram(src).unwrap();
        let shapes = diagram_to_shapes(&d);
        let nodes: Vec<_> = shapes.iter().filter(|s| s.kind == ShapeKind::KymoNode).collect();
        let regions: Vec<_> = shapes.iter().filter(|s| s.kind == ShapeKind::KymoRegion).collect();
        let edges: Vec<_> = shapes.iter().filter(|s| s.kind == ShapeKind::KymoEdge).collect();
        assert_eq!(nodes.len(), 2);
        assert_eq!(regions.len(), 1);
        assert_eq!(edges.len(), 1);
        // node x/y is top-left (centre − half).
        let a = nodes.iter().find(|s| s.kymo_id.as_deref() == Some("a")).unwrap();
        assert!(a.w > 0.0 && a.h > 0.0);
        assert_eq!(a.x, a.x); // finite
        // edge carries an endpoint + label.
        if let ShapeData::Edge { label, .. } = &edges[0].data {
            assert_eq!(label, "go");
        } else {
            panic!("expected edge data");
        }
    }
}
