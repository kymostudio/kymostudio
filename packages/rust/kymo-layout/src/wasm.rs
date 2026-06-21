//! Browser bindings: run kymo's pure-Rust layouts in the browser via wasm.
//!
//! JS passes a graph as JSON; kymo returns positioned geometry as JSON. The
//! same dagre/grid/cose engines the native renderers use — no JS layout lib.

use kymo_graph::flowchart::{Direction, FlowEdge, FlowNode, Flowchart};
use kymo_graph::model::Shape;
use kymo_graph::style::FlowStyle;
use serde_json::{json, Value};
use wasm_bindgen::prelude::*;

fn parse_dir(s: &str) -> Direction {
    match s.to_ascii_uppercase().as_str() {
        "LR" => Direction::Lr,
        "RL" => Direction::Rl,
        "BT" => Direction::Bt,
        _ => Direction::Tb,
    }
}

/// Lay a graph out with **dagre** (the flowchart/state/ER engine).
///
/// Input JSON: `{ "direction": "TB"|"LR"|"BT"|"RL",
///   "nodes": [{ "id": string, "label"?: string }],
///   "edges": [{ "source": string, "target": string, "label"?: string }] }`
///
/// Output JSON: `{ "width", "height",
///   "nodes": [{ "id", "label", "x", "y", "width", "height" }],   // x/y = top-left
///   "edges": [{ "source", "target", "points": [[x, y], …] }] }`
#[wasm_bindgen(js_name = dagreLayout)]
pub fn dagre_layout(input: &str) -> Result<String, JsError> {
    let v: Value = serde_json::from_str(input).map_err(|e| JsError::new(&e.to_string()))?;
    let direction = parse_dir(v["direction"].as_str().unwrap_or("TB"));

    let nodes: Vec<FlowNode> = v["nodes"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|n| {
                    let id = n["id"].as_str()?.to_string();
                    let label = n["label"].as_str().unwrap_or(&id).to_string();
                    Some(FlowNode {
                        id,
                        label,
                        shape: Shape::Box,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let edges: Vec<FlowEdge> = v["edges"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|e| {
                    // accept source/target or src/dst
                    let src = e["source"]
                        .as_str()
                        .or_else(|| e["src"].as_str())?
                        .to_string();
                    let dst = e["target"]
                        .as_str()
                        .or_else(|| e["dst"].as_str())?
                        .to_string();
                    Some(FlowEdge {
                        src,
                        dst,
                        label: e["label"].as_str().unwrap_or("").to_string(),
                        dashed: false,
                        no_arrow: false,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let fc = Flowchart {
        direction,
        nodes,
        edges,
        subgraphs: Vec::new(),
    };
    let g = crate::dagre_geom(&fc, FlowStyle::Mermaid);

    let out = json!({
        "width": g.w,
        "height": g.h,
        "nodes": g.nodes.iter().map(|n| json!({
            "id": n.id,
            "label": n.name,
            "x": n.cx - n.w / 2.0,
            "y": n.cy - n.h / 2.0,
            "width": n.w,
            "height": n.h,
        })).collect::<Vec<_>>(),
        "edges": g.edges.iter().map(|e| json!({
            "label": e.label,
            "points": e.points.iter().map(|(x, y)| json!([x, y])).collect::<Vec<_>>(),
        })).collect::<Vec<_>>(),
    });
    Ok(out.to_string())
}
