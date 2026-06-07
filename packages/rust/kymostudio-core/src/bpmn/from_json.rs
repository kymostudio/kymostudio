//! Canonical model JSON → [`Diagram`] — the exact inverse of [`super::to_json::model_json`].
//!
//! Lets Python/JS hand a resolved `.kymo.json` model back to the core (for export +
//! render delegation). Lenient: any absent key falls back to the struct `Default`, so
//! it round-trips everything `model_json` emits and tolerates partial input.

use serde_json::Value;

use super::model::{Component, Diagram, Edge, LayoutNode, Region};

fn as_i64(v: &Value) -> i64 {
    v.as_i64().unwrap_or(0)
}

fn s(v: &Value) -> String {
    v.as_str().unwrap_or("").to_string()
}

/// A string field with a default when the key is absent/null (e.g. `accent`→`blue`).
fn s_or(v: &Value, default: &str) -> String {
    v.as_str().unwrap_or(default).to_string()
}

fn opt_str(v: &Value) -> Option<String> {
    v.as_str().map(str::to_string)
}

fn pair(v: &Value) -> (i64, i64) {
    match v.as_array() {
        Some(a) if a.len() >= 2 => (as_i64(&a[0]), as_i64(&a[1])),
        _ => (0, 0),
    }
}

fn quad(v: &Value) -> (i64, i64, i64, i64) {
    match v.as_array() {
        Some(a) if a.len() >= 4 => (as_i64(&a[0]), as_i64(&a[1]), as_i64(&a[2]), as_i64(&a[3])),
        _ => (0, 0, 0, 0),
    }
}

fn opt_pair(v: &Value) -> Option<(i64, i64)> {
    if v.is_null() {
        None
    } else {
        Some(pair(v))
    }
}

fn opt_quad(v: &Value) -> Option<(i64, i64, i64, i64)> {
    if v.is_null() {
        None
    } else {
        Some(quad(v))
    }
}

fn vec_pairs(v: &Value) -> Vec<(i64, i64)> {
    v.as_array()
        .map(|a| a.iter().map(pair).collect())
        .unwrap_or_default()
}

fn opt_points(v: &Value) -> Option<Vec<(i64, i64)>> {
    if v.is_null() {
        None
    } else {
        Some(vec_pairs(v))
    }
}

fn component(v: &Value) -> Component {
    Component {
        id: s(&v["id"]),
        name: s(&v["name"]),
        subtitle: s(&v["subtitle"]),
        icon: s(&v["icon"]),
        shape: s(&v["shape"]),
        accent: s_or(&v["accent"], "blue"),
        pos: pair(&v["pos"]),
        size: opt_pair(&v["size"]),
        parent: opt_str(&v["parent"]),
        align: opt_str(&v["align"]),
        align_gap: v["align_gap"].as_i64().unwrap_or(24),
        align_offset: pair(&v["align_offset"]),
        label_box: opt_quad(&v["label_box"]),
    }
}

fn region(v: &Value) -> Region {
    Region {
        id: s(&v["id"]),
        label: s(&v["label"]),
        bounds: quad(&v["bounds"]),
        contains: v["contains"]
            .as_array()
            .map(|a| a.iter().map(s).collect())
            .unwrap_or_default(),
        padding: if v["padding"].is_array() {
            pair(&v["padding"])
        } else {
            (24, 24)
        },
        padding_bottom: if v["padding_bottom"].is_null() {
            None
        } else {
            Some(as_i64(&v["padding_bottom"]))
        },
        style: s_or(&v["style"], "outer"),
        icon: opt_str(&v["icon"]),
        layout: opt_str(&v["layout"]),
        pos: opt_pair(&v["pos"]),
        gap: v["gap"].as_i64().unwrap_or(24),
        align: s_or(&v["align"], "center"),
        visible: v["visible"].as_bool().unwrap_or(true),
        border_dash: opt_pair(&v["border_dash"]),
        border_stroke: opt_str(&v["border_stroke"]),
        label_anchor: s_or(&v["label_anchor"], "middle"),
        label_position: opt_str(&v["label_position"]),
    }
}

fn edge(v: &Value) -> Edge {
    Edge {
        src: s(&v["src"]),
        dst: s(&v["dst"]),
        label: s(&v["label"]),
        style: s_or(&v["style"], "gray"),
        src_anchor: opt_str(&v["src_anchor"]),
        dst_anchor: opt_str(&v["dst_anchor"]),
        route: s_or(&v["route"], "auto"),
        via: vec_pairs(&v["via"]),
        src_offset: pair(&v["src_offset"]),
        dst_offset: pair(&v["dst_offset"]),
        label_offset: pair(&v["label_offset"]),
        label_anchor: s_or(&v["label_anchor"], "mid"),
        label_small: v["label_small"].as_bool().unwrap_or(false),
        label_pos: opt_pair(&v["label_pos"]),
        dashed: v["dashed"].as_bool().unwrap_or(false),
        no_arrow: v["no_arrow"].as_bool().unwrap_or(false),
        trunk_offset: v["trunk_offset"].as_i64().unwrap_or(0),
        shared_port: v["shared_port"].as_bool().unwrap_or(false),
        points: opt_points(&v["points"]),
        bpmn_flow: opt_str(&v["bpmn_flow"]),
    }
}

fn layout_node(v: &Value) -> LayoutNode {
    if v["t"].as_str() == Some("group") {
        LayoutNode::Group {
            dir: s(&v["dir"]),
            children: v["children"]
                .as_array()
                .map(|a| a.iter().map(layout_node).collect())
                .unwrap_or_default(),
        }
    } else {
        LayoutNode::Id(s(&v["id"]))
    }
}

/// Parse a canonical `.kymo.json` model body into a [`Diagram`].
pub fn from_json(json: &str) -> Result<Diagram, String> {
    let v: Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    Ok(Diagram {
        width: as_i64(&v["width"]),
        height: as_i64(&v["height"]),
        title: s(&v["title"]),
        subtitle: s(&v["subtitle"]),
        components: v["components"]
            .as_array()
            .map(|a| a.iter().map(component).collect())
            .unwrap_or_default(),
        regions: v["regions"]
            .as_array()
            .map(|a| a.iter().map(region).collect())
            .unwrap_or_default(),
        edges: v["edges"]
            .as_array()
            .map(|a| a.iter().map(edge).collect())
            .unwrap_or_default(),
        layout_trees: v["layout_trees"]
            .as_array()
            .map(|a| a.iter().map(layout_node).collect())
            .unwrap_or_default(),
    })
}
