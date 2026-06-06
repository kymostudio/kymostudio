//! Canonical model JSON — the language-neutral form the conformance suite compares.
//!
//! Reproduces `kymo.to_kymojson.model_dict` (+ the `_norm` rules in
//! `tests/_conformance.py`): snake_case keys, points/bounds as arrays, every field
//! emitted explicitly (`null` for `None`), parse order preserved. Because the model
//! stores `i64` coordinates, the "integral float → int" collapse is automatic —
//! every number serializes as a JSON integer, matching the goldens.
//!
//! Object **key** order is irrelevant: the conformance test compares parsed
//! `serde_json::Value`s, and JSON object equality ignores key order. List order
//! (components/regions/edges) is part of the contract and is preserved.

use serde_json::{json, Map, Value};

use super::model::{Component, Diagram, Edge, LayoutNode, Region};

fn pair((a, b): (i64, i64)) -> Value {
    json!([a, b])
}

fn quad((a, b, c, d): (i64, i64, i64, i64)) -> Value {
    json!([a, b, c, d])
}

fn opt_pair(p: Option<(i64, i64)>) -> Value {
    p.map_or(Value::Null, pair)
}

fn opt_str(s: &Option<String>) -> Value {
    s.as_ref().map_or(Value::Null, |v| json!(v))
}

fn points(p: &Option<Vec<(i64, i64)>>) -> Value {
    match p {
        None => Value::Null,
        Some(pts) => Value::Array(pts.iter().map(|&xy| pair(xy)).collect()),
    }
}

fn component_json(c: &Component) -> Value {
    let mut m = Map::new();
    m.insert("id".into(), json!(c.id));
    m.insert("name".into(), json!(c.name));
    m.insert("subtitle".into(), json!(c.subtitle));
    m.insert("icon".into(), json!(c.icon));
    m.insert("shape".into(), json!(c.shape));
    m.insert("accent".into(), json!(c.accent));
    m.insert("pos".into(), pair(c.pos));
    m.insert("size".into(), opt_pair(c.size));
    m.insert("parent".into(), opt_str(&c.parent));
    m.insert("align".into(), opt_str(&c.align));
    m.insert("align_gap".into(), json!(c.align_gap));
    m.insert("align_offset".into(), pair(c.align_offset));
    m.insert("label_box".into(), c.label_box.map_or(Value::Null, quad));
    Value::Object(m)
}

fn region_json(r: &Region) -> Value {
    let mut m = Map::new();
    m.insert("id".into(), json!(r.id));
    m.insert("label".into(), json!(r.label));
    m.insert("bounds".into(), quad(r.bounds));
    m.insert("contains".into(), json!(r.contains));
    m.insert("padding".into(), pair(r.padding));
    m.insert(
        "padding_bottom".into(),
        r.padding_bottom.map_or(Value::Null, |v| json!(v)),
    );
    m.insert("style".into(), json!(r.style));
    m.insert("icon".into(), opt_str(&r.icon));
    m.insert("layout".into(), opt_str(&r.layout));
    m.insert("pos".into(), opt_pair(r.pos));
    m.insert("gap".into(), json!(r.gap));
    m.insert("align".into(), json!(r.align));
    m.insert("visible".into(), json!(r.visible));
    m.insert("border_dash".into(), opt_pair(r.border_dash));
    m.insert("border_stroke".into(), opt_str(&r.border_stroke));
    m.insert("label_anchor".into(), json!(r.label_anchor));
    m.insert("label_position".into(), opt_str(&r.label_position));
    Value::Object(m)
}

fn edge_json(e: &Edge) -> Value {
    let mut m = Map::new();
    m.insert("src".into(), json!(e.src));
    m.insert("dst".into(), json!(e.dst));
    m.insert("label".into(), json!(e.label));
    m.insert("style".into(), json!(e.style));
    m.insert("src_anchor".into(), opt_str(&e.src_anchor));
    m.insert("dst_anchor".into(), opt_str(&e.dst_anchor));
    m.insert("route".into(), json!(e.route));
    m.insert(
        "via".into(),
        Value::Array(e.via.iter().map(|&xy| pair(xy)).collect()),
    );
    m.insert("src_offset".into(), pair(e.src_offset));
    m.insert("dst_offset".into(), pair(e.dst_offset));
    m.insert("label_offset".into(), pair(e.label_offset));
    m.insert("label_anchor".into(), json!(e.label_anchor));
    m.insert("label_small".into(), json!(e.label_small));
    m.insert("label_pos".into(), opt_pair(e.label_pos));
    m.insert("dashed".into(), json!(e.dashed));
    m.insert("no_arrow".into(), json!(e.no_arrow));
    m.insert("trunk_offset".into(), json!(e.trunk_offset));
    m.insert("shared_port".into(), json!(e.shared_port));
    m.insert("points".into(), points(&e.points));
    m.insert("bpmn_flow".into(), opt_str(&e.bpmn_flow));
    Value::Object(m)
}

fn layout_node_json(n: &LayoutNode) -> Value {
    match n {
        LayoutNode::Id(id) => json!({ "t": "id", "id": id }),
        LayoutNode::Group { dir, children } => json!({
            "t": "group",
            "dir": dir,
            "children": children.iter().map(layout_node_json).collect::<Vec<_>>(),
        }),
    }
}

/// The resolved model as language-neutral JSON — the `.kymo.json` `diagram` body
/// (`model_dict`). Includes `layout_trees`; excludes the transient `bpmn_blocks`.
pub fn model_json(d: &Diagram) -> Value {
    json!({
        "width": d.width,
        "height": d.height,
        "title": d.title,
        "subtitle": d.subtitle,
        "components": d.components.iter().map(component_json).collect::<Vec<_>>(),
        "regions": d.regions.iter().map(region_json).collect::<Vec<_>>(),
        "edges": d.edges.iter().map(edge_json).collect::<Vec<_>>(),
        "layout_trees": d.layout_trees.iter().map(layout_node_json).collect::<Vec<_>>(),
    })
}
