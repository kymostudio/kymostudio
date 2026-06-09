//! draw.io (mxGraph XML) **encoder**: a resolved [`Diagram`] → a `.drawio` document.
//!
//! Per RES-PIPELINE-001 this is an *encoder* — a pure, source-agnostic
//! `Diagram → bytes` pass (it is fed only the positioned model, never a source
//! format). draw.io is a generic WYSIWYG format that needs explicit geometry, so
//! unlike the [`crate::flowchart::emit`] text spokes (which emit the positionless
//! IR and let the target lay out) this consumes the **positioned** `Diagram` that
//! [`crate::layout::layout_flowchart`] produces. Output is plain (uncompressed)
//! mxfile XML — app.diagrams.net reads it directly.

use crate::model::Diagram;

const NODE_FILL: &str = "fillColor=#eff6ff;strokeColor=#3b82f6;";

/// Encode a resolved diagram as a draw.io (mxGraph) XML document.
pub fn to_drawio(d: &Diagram) -> String {
    let mut cells = String::new();
    // Clusters first (mxGraph z-order = document order → they sit behind nodes).
    for r in &d.regions {
        let (x, y, w, h) = r.bounds;
        cells.push_str(&region_cell(&r.id, &r.label, x, y, w, h));
    }
    for c in &d.components {
        let (w, h) = c.size.unwrap_or((60, 40));
        let (cx, cy) = c.pos;
        cells.push_str(&vertex_cell(
            &c.id,
            &c.name,
            node_style(c.shape.as_str()),
            cx - w / 2,
            cy - h / 2,
            w,
            h,
        ));
    }
    for (i, e) in d.edges.iter().enumerate() {
        cells.push_str(&edge_cell(i, &e.label, &e.src, &e.dst, e.dashed, e.no_arrow));
    }
    envelope(d.width, d.height, &cells)
}

/// `Diagram → draw.io` straight from a `.kymo.json` model — the **any-source**
/// encoder surface (Python/JS hand it the resolved model so any diagram, not
/// just a Mermaid import, can be exported). Reads the JSON `Value` directly so
/// it shares the model-neutral cell formatters below; accepts either the full
/// envelope (`{format,version,diagram}`) or a bare model body.
#[cfg(feature = "bpmn")]
pub fn to_drawio_kymojson(json: &str) -> Result<String, String> {
    use serde_json::Value;
    let root: Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    let d = if root.get("diagram").is_some() {
        &root["diagram"]
    } else {
        &root
    };
    let i = |v: &Value, k: &str| v.get(k).and_then(Value::as_i64).unwrap_or(0) as i32;
    let s = |v: &Value, k: &str| v.get(k).and_then(Value::as_str).unwrap_or("").to_string();
    let nth = |v: &Value, k: usize| v.as_array().and_then(|a| a.get(k)).and_then(Value::as_i64).unwrap_or(0) as i32;
    let pair = |v: &Value| -> Option<(i32, i32)> {
        v.as_array().filter(|a| a.len() >= 2).map(|_| (nth(v, 0), nth(v, 1)))
    };
    let empty = Vec::new();
    let mut cells = String::new();
    for r in d.get("regions").and_then(Value::as_array).unwrap_or(&empty) {
        let b = &r["bounds"];
        cells.push_str(&region_cell(
            &s(r, "id"),
            &s(r, "label"),
            nth(b, 0),
            nth(b, 1),
            nth(b, 2),
            nth(b, 3),
        ));
    }
    for c in d.get("components").and_then(Value::as_array).unwrap_or(&empty) {
        let (w, h) = pair(&c["size"]).unwrap_or((60, 40));
        let (cx, cy) = pair(&c["pos"]).unwrap_or((0, 0));
        cells.push_str(&vertex_cell(
            &s(c, "id"),
            &s(c, "name"),
            node_style(&s(c, "shape")),
            cx - w / 2,
            cy - h / 2,
            w,
            h,
        ));
    }
    for (k, e) in d.get("edges").and_then(Value::as_array).unwrap_or(&empty).iter().enumerate() {
        let b = |key: &str| e.get(key).and_then(Value::as_bool).unwrap_or(false);
        cells.push_str(&edge_cell(k, &s(e, "label"), &s(e, "src"), &s(e, "dst"), b("dashed"), b("no_arrow")));
    }
    Ok(envelope(i(d, "width"), i(d, "height"), &cells))
}

fn envelope(width: i32, height: i32, cells: &str) -> String {
    format!(
        "<mxfile host=\"kymostudio\">\n  \
         <diagram id=\"kymo\" name=\"Flowchart\">\n    \
         <mxGraphModel dx=\"{width}\" dy=\"{height}\" grid=\"1\" gridSize=\"10\" guides=\"1\" \
         tooltips=\"1\" connect=\"1\" arrows=\"1\" fold=\"1\" page=\"1\" pageScale=\"1\" \
         pageWidth=\"850\" pageHeight=\"1100\" math=\"0\" shadow=\"0\">\n      \
         <root>\n        \
         <mxCell id=\"0\"/>\n        \
         <mxCell id=\"1\" parent=\"0\"/>\n{cells}      \
         </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n",
    )
}

/// mxStyle for a node, by shape string. Flowchart glyphs map 1:1; anything else
/// (icons / BPMN / AWS) degrades to a labelled rectangle (icons are not carried).
fn node_style(shape: &str) -> &'static str {
    match shape {
        "badge" => "rounded=1;whiteSpace=wrap;html=1;arcSize=40;",
        "circle" => "ellipse;whiteSpace=wrap;html=1;",
        "diamond" => "rhombus;whiteSpace=wrap;html=1;",
        "hex" => "shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;",
        "cylinder" => "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;",
        _ => "rounded=0;whiteSpace=wrap;html=1;", // box + icon/bpmn/aws → rect (lossy)
    }
}

fn vertex_cell(id: &str, value: &str, style: &str, x: i32, y: i32, w: i32, h: i32) -> String {
    format!(
        "        <mxCell id=\"{id}\" value=\"{val}\" style=\"{style}{fill}\" vertex=\"1\" \
         parent=\"1\">\n          \
         <mxGeometry x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" as=\"geometry\"/>\n        \
         </mxCell>\n",
        id = xml_attr(id),
        val = xml_attr(value),
        fill = NODE_FILL,
    )
}

fn edge_cell(i: usize, label: &str, src: &str, dst: &str, dashed: bool, no_arrow: bool) -> String {
    let mut style = String::from("edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;");
    if dashed {
        style.push_str("dashed=1;");
    }
    if no_arrow {
        style.push_str("endArrow=none;");
    }
    format!(
        "        <mxCell id=\"e{i}\" value=\"{val}\" style=\"{style}\" edge=\"1\" parent=\"1\" \
         source=\"{src}\" target=\"{dst}\">\n          \
         <mxGeometry relative=\"1\" as=\"geometry\"/>\n        </mxCell>\n",
        val = xml_attr(label),
        src = xml_attr(src),
        dst = xml_attr(dst),
    )
}

fn region_cell(id: &str, label: &str, x: i32, y: i32, w: i32, h: i32) -> String {
    format!(
        "        <mxCell id=\"c_{id}\" value=\"{val}\" style=\"rounded=0;whiteSpace=wrap;html=1;\
         fillColor=#f5f9ff;strokeColor=#b8d0ee;verticalAlign=top;align=left;spacingLeft=8;\
         spacingTop=4;fontSize=11;fontColor=#475569;\" vertex=\"1\" parent=\"1\">\n          \
         <mxGeometry x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" as=\"geometry\"/>\n        \
         </mxCell>\n",
        id = xml_attr(id),
        val = xml_attr(label),
    )
}

/// Escape a string for use inside an XML attribute (`"`-quoted).
fn xml_attr(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            c => out.push(c),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::to_drawio;
    use crate::model::{Component, Diagram, Edge, Region, Shape};

    fn node(id: &str, name: &str, shape: Shape, pos: (i32, i32), size: (i32, i32)) -> Component {
        let mut c = Component::flowchart(id, name, shape);
        c.pos = pos;
        c.size = Some(size);
        c
    }

    #[test]
    fn shapes_map_to_mxstyles() {
        let cases = [
            (Shape::Box, "rounded=0;whiteSpace=wrap;html=1;"),
            (Shape::Circle, "ellipse;"),
            (Shape::Diamond, "rhombus;"),
            (Shape::Hex, "shape=hexagon;"),
            (Shape::Cylinder, "shape=cylinder3;"),
            (Shape::Badge, "arcSize=40;"),
        ];
        for (shape, needle) in cases {
            let mut d = Diagram::default();
            d.width = 100;
            d.height = 100;
            d.components.push(node("A", "L", shape, (50, 50), (60, 40)));
            assert!(to_drawio(&d).contains(needle), "{needle}");
        }
    }

    #[test]
    fn vertex_geometry_is_top_left_from_centre() {
        let mut d = Diagram::default();
        d.width = 200;
        d.height = 100;
        d.components.push(node("A", "L", Shape::Box, (100, 50), (60, 40)));
        // centre (100,50), size 60x40 → x=70 y=30.
        assert!(to_drawio(&d).contains("x=\"70\" y=\"30\" width=\"60\" height=\"40\""));
    }

    #[test]
    fn edge_flags_and_label() {
        let mut d = Diagram::default();
        d.width = 100;
        d.height = 100;
        let mut e = Edge::routed("A", "B", "go");
        e.dashed = true;
        d.edges.push(e);
        let mut e2 = Edge::routed("A", "B", "");
        e2.no_arrow = true;
        d.edges.push(e2);
        let out = to_drawio(&d);
        assert!(out.contains("source=\"A\" target=\"B\""));
        assert!(out.contains("value=\"go\"") && out.contains("dashed=1;"));
        assert!(out.contains("endArrow=none;"));
    }

    #[test]
    fn region_is_cluster_cell() {
        let mut d = Diagram::default();
        d.width = 100;
        d.height = 100;
        let mut r = Region::cluster("G", "Grp", vec!["A".into()]);
        r.bounds = (10, 20, 80, 60);
        d.regions.push(r);
        let out = to_drawio(&d);
        assert!(out.contains("id=\"c_G\"") && out.contains("value=\"Grp\""));
        assert!(out.contains("x=\"10\" y=\"20\" width=\"80\" height=\"60\""));
    }

    #[test]
    fn non_flowchart_shape_falls_back_and_escapes() {
        // A generic icon component (size None, BPMN shape, special chars) proves
        // the encoder is source-agnostic and XML-safe.
        let mut d = Diagram::default();
        d.width = 100;
        d.height = 100;
        let mut c = Component::flowchart("X", "a & b <c>", Shape::BpmnTask);
        c.pos = (40, 30);
        d.components.push(c);
        let out = to_drawio(&d);
        assert!(out.contains("rounded=0;whiteSpace=wrap;html=1;")); // fallback rect
        assert!(out.contains("value=\"a &amp; b &lt;c&gt;\"")); // escaped
        assert!(out.contains("width=\"60\" height=\"40\"")); // default size
    }

    #[cfg(feature = "bpmn")]
    #[test]
    fn any_source_path_matches_typed() {
        // to_drawio_kymojson(export(d)) == to_drawio(d) — the generic encoder
        // surface agrees with the typed one (proves source-agnostic round-trip).
        let mut d = Diagram::default();
        d.width = 200;
        d.height = 100;
        d.components.push(node("A", "Start", Shape::Diamond, (100, 50), (80, 60)));
        let mut e = Edge::routed("A", "A", "x");
        e.dashed = true;
        d.edges.push(e);
        let mut r = Region::cluster("G", "Grp", vec!["A".into()]);
        r.bounds = (1, 2, 3, 4);
        d.regions.push(r);
        let envelope = crate::kymojson::export(&d);
        assert_eq!(super::to_drawio_kymojson(&envelope).unwrap(), to_drawio(&d));
    }

    #[test]
    fn well_formed_envelope() {
        let mut d = Diagram::default();
        d.width = 100;
        d.height = 100;
        d.components.push(node("A", "L", Shape::Box, (50, 50), (60, 40)));
        let out = to_drawio(&d);
        assert!(out.starts_with("<mxfile"));
        assert!(out.contains("<mxCell id=\"0\"/>") && out.contains("<mxCell id=\"1\" parent=\"0\"/>"));
        assert!(out.trim_end().ends_with("</mxfile>"));
    }
}
