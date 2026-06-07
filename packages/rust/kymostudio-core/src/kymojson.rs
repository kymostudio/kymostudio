//! `.kymo.json` serializer — a [`Diagram`] → the kymo.json interchange string.
//!
//! Byte-compatible with Python `to_kymojson.export` (KYMOJSON-MAP-001): same
//! versioned envelope, snake_case keys, field order, and pretty-printing as
//! `json.dumps(payload, indent=2, ensure_ascii=False) + "\n"`. The whole point
//! is that Python `from_kymojson.parse` / JS `parseKymoJson` read Rust output
//! back as an identical resolved model.
//!
//! A hand-rolled writer (not serde) keeps the byte-conventions in one auditable
//! place — every numeric coordinate the layout emits is already an integer, so
//! the writer only handles ints, strings, bools, null and arrays/objects, and
//! reproduces CPython's `json` pretty-printing precisely.

use crate::model::{Component, Diagram, Edge, LayoutNode, Region};

pub const FORMAT: &str = "kymo.json";
pub const VERSION: i64 = 1;

/// A minimal JSON value, ordered like the Python field lists.
enum J {
    Int(i64),
    Str(String),
    Bool(bool),
    Null,
    Arr(Vec<J>),
    Obj(Vec<(&'static str, J)>),
}

impl J {
    fn point((x, y): (i32, i32)) -> J {
        J::Arr(vec![J::Int(x as i64), J::Int(y as i64)])
    }
    fn point4((a, b, c, d): (i32, i32, i32, i32)) -> J {
        J::Arr(vec![
            J::Int(a as i64),
            J::Int(b as i64),
            J::Int(c as i64),
            J::Int(d as i64),
        ])
    }
    fn opt_point(p: Option<(i32, i32)>) -> J {
        p.map(J::point).unwrap_or(J::Null)
    }
    fn str(s: &str) -> J {
        J::Str(s.to_string())
    }
}

/// Serialize a resolved diagram to a `.kymo.json` string (versioned envelope).
pub fn export(d: &Diagram) -> String {
    let root = J::Obj(vec![
        ("format", J::str(FORMAT)),
        ("version", J::Int(VERSION)),
        ("diagram", model_dict(d)),
    ]);
    let mut out = String::new();
    write_value(&root, 0, &mut out);
    out.push('\n');
    out
}

/// The resolved model as the language-neutral `diagram` body.
fn model_dict(d: &Diagram) -> J {
    J::Obj(vec![
        ("width", J::Int(d.width as i64)),
        ("height", J::Int(d.height as i64)),
        ("title", J::str(&d.title)),
        ("subtitle", J::str(&d.subtitle)),
        (
            "components",
            J::Arr(d.components.iter().map(component).collect()),
        ),
        ("regions", J::Arr(d.regions.iter().map(region).collect())),
        ("edges", J::Arr(d.edges.iter().map(edge).collect())),
        (
            "layout_trees",
            J::Arr(d.layout_trees.iter().map(layout_node).collect()),
        ),
    ])
}

fn component(c: &Component) -> J {
    J::Obj(vec![
        ("id", J::str(&c.id)),
        ("name", J::str(&c.name)),
        ("subtitle", J::str(&c.subtitle)),
        ("icon", J::str(&c.icon)),
        ("shape", J::str(c.shape.as_str())),
        ("accent", J::str(c.accent.as_str())),
        ("pos", J::point(c.pos)),
        ("size", J::opt_point(c.size)),
        ("parent", c.parent.as_deref().map(J::str).unwrap_or(J::Null)),
        (
            "align",
            c.align.map(|a| J::str(a.as_str())).unwrap_or(J::Null),
        ),
        ("align_gap", J::Int(c.align_gap as i64)),
        ("align_offset", J::point(c.align_offset)),
        ("label_box", c.label_box.map(J::point4).unwrap_or(J::Null)),
    ])
}

fn region(r: &Region) -> J {
    J::Obj(vec![
        ("id", J::str(&r.id)),
        ("label", J::str(&r.label)),
        ("bounds", J::point4(r.bounds)),
        (
            "contains",
            J::Arr(r.contains.iter().map(|s| J::str(s)).collect()),
        ),
        ("padding", J::point(r.padding)),
        (
            "padding_bottom",
            r.padding_bottom
                .map(|v| J::Int(v as i64))
                .unwrap_or(J::Null),
        ),
        ("style", J::str(r.style.as_str())),
        ("icon", r.icon.as_deref().map(J::str).unwrap_or(J::Null)),
        (
            "layout",
            r.layout.map(|l| J::str(l.as_str())).unwrap_or(J::Null),
        ),
        ("pos", J::opt_point(r.pos)),
        ("gap", J::Int(r.gap as i64)),
        ("align", J::str(r.align.as_str())),
        ("visible", J::Bool(r.visible)),
        ("border_dash", J::opt_point(r.border_dash)),
        (
            "border_stroke",
            r.border_stroke.as_deref().map(J::str).unwrap_or(J::Null),
        ),
        ("label_anchor", J::str(r.label_anchor.as_str())),
        (
            "label_position",
            r.label_position
                .map(|l| J::str(l.as_str()))
                .unwrap_or(J::Null),
        ),
    ])
}

fn edge(e: &Edge) -> J {
    let points = match &e.points {
        Some(ps) => J::Arr(ps.iter().map(|p| J::point(*p)).collect()),
        None => J::Null,
    };
    J::Obj(vec![
        ("src", J::str(&e.src)),
        ("dst", J::str(&e.dst)),
        ("label", J::str(&e.label)),
        ("style", J::str(e.style.as_str())),
        (
            "src_anchor",
            e.src_anchor.map(|a| J::str(a.as_str())).unwrap_or(J::Null),
        ),
        (
            "dst_anchor",
            e.dst_anchor.map(|a| J::str(a.as_str())).unwrap_or(J::Null),
        ),
        ("route", J::str(e.route.as_str())),
        ("via", J::Arr(e.via.iter().map(|p| J::point(*p)).collect())),
        ("src_offset", J::point(e.src_offset)),
        ("dst_offset", J::point(e.dst_offset)),
        ("label_offset", J::point(e.label_offset)),
        ("label_anchor", J::str(e.label_anchor.as_str())),
        ("label_small", J::Bool(e.label_small)),
        ("label_pos", J::opt_point(e.label_pos)),
        ("dashed", J::Bool(e.dashed)),
        ("no_arrow", J::Bool(e.no_arrow)),
        ("trunk_offset", J::Int(e.trunk_offset as i64)),
        ("shared_port", J::Bool(e.shared_port)),
        ("points", points),
        (
            "bpmn_flow",
            e.bpmn_flow.as_deref().map(J::str).unwrap_or(J::Null),
        ),
    ])
}

fn layout_node(n: &LayoutNode) -> J {
    match n {
        LayoutNode::Id(cid) => J::Obj(vec![("t", J::str("id")), ("id", J::str(cid))]),
        LayoutNode::Group { dir, children } => J::Obj(vec![
            ("t", J::str("group")),
            ("dir", J::str(dir)),
            (
                "children",
                J::Arr(children.iter().map(layout_node).collect()),
            ),
        ]),
    }
}

// ── pretty-printer matching CPython json.dumps(indent=2, ensure_ascii=False) ──

fn pad(level: usize, out: &mut String) {
    for _ in 0..level {
        out.push_str("  ");
    }
}

fn write_value(v: &J, level: usize, out: &mut String) {
    match v {
        J::Int(n) => out.push_str(&n.to_string()),
        J::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        J::Null => out.push_str("null"),
        J::Str(s) => write_string(s, out),
        J::Arr(items) => {
            if items.is_empty() {
                out.push_str("[]");
                return;
            }
            out.push_str("[\n");
            for (i, item) in items.iter().enumerate() {
                pad(level + 1, out);
                write_value(item, level + 1, out);
                if i + 1 < items.len() {
                    out.push(',');
                }
                out.push('\n');
            }
            pad(level, out);
            out.push(']');
        }
        J::Obj(fields) => {
            if fields.is_empty() {
                out.push_str("{}");
                return;
            }
            out.push_str("{\n");
            for (i, (k, val)) in fields.iter().enumerate() {
                pad(level + 1, out);
                write_string(k, out);
                out.push_str(": ");
                write_value(val, level + 1, out);
                if i + 1 < fields.len() {
                    out.push(',');
                }
                out.push('\n');
            }
            pad(level, out);
            out.push('}');
        }
    }
}

/// JSON-escape a string exactly like CPython `json.dumps(ensure_ascii=False)`:
/// escape `"` and `\`, use short escapes for `\b\t\n\f\r`, `\u00xx` (lowercase)
/// for other control chars, and leave non-ASCII bytes raw.
fn write_string(s: &str, out: &mut String) {
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{08}' => out.push_str("\\b"),
            '\t' => out.push_str("\\t"),
            '\n' => out.push_str("\\n"),
            '\u{0c}' => out.push_str("\\f"),
            '\r' => out.push_str("\\r"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Component, Diagram, Edge, Shape};

    #[test]
    fn empty_diagram_envelope() {
        let d = Diagram {
            width: 100,
            height: 80,
            ..Default::default()
        };
        let s = export(&d);
        // Envelope + empty containers rendered as `[]` (CPython behaviour).
        assert!(s.starts_with("{\n  \"format\": \"kymo.json\",\n  \"version\": 1,\n"));
        assert!(s.contains("\"components\": [],"));
        assert!(s.contains("\"layout_trees\": []"));
        assert!(s.ends_with("}\n"));
    }

    #[test]
    fn component_and_point_arrays_multiline() {
        let mut d = Diagram {
            width: 10,
            height: 10,
            ..Default::default()
        };
        let mut c = Component::flowchart("A", "Start", Shape::Box);
        c.pos = (5, 6);
        c.size = Some((70, 50));
        d.components.push(c);
        let s = export(&d);
        // Point arrays are multi-line under indent=2, matching json.dumps.
        assert!(s.contains("\"pos\": [\n          5,\n          6\n        ]"));
        assert!(s.contains("\"shape\": \"box\""));
        assert!(s.contains("\"size\": [\n"));
        assert!(s.contains("\"label_box\": null"));
    }

    #[test]
    fn edge_defaults_and_points() {
        let mut d = Diagram {
            width: 10,
            height: 10,
            ..Default::default()
        };
        let mut e = Edge::routed("A", "B", "yes");
        e.points = Some(vec![(0, 0), (10, 0)]);
        e.bpmn_flow = Some("sequence".into());
        d.edges.push(e);
        let s = export(&d);
        assert!(s.contains("\"via\": []"));
        assert!(s.contains("\"dashed\": false"));
        assert!(s.contains("\"bpmn_flow\": \"sequence\""));
        assert!(s.contains("\"points\": [\n"));
    }

    #[test]
    fn string_escaping() {
        let mut out = String::new();
        write_string("a\"b\\c\n\t\u{1}", &mut out);
        assert_eq!(out, "\"a\\\"b\\\\c\\n\\t\\u0001\"");
    }
}
