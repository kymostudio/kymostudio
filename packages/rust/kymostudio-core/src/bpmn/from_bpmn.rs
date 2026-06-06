//! BPMN 2.0 XML importer — port of `from_bpmn.py`.
//!
//! Turns a standard `.bpmn` file into a fully-resolved [`Diagram`] using the
//! file's Diagram-Interchange geometry (`<bpmndi:BPMNShape>` bounds and
//! `<bpmndi:BPMNEdge>` waypoints) — no layout pass needed. Namespaces are ignored
//! throughout (we match on the *local* tag name via roxmltree's
//! `tag_name().name()`), so the importer is agnostic to the `bpmn:` / `bpmn2:` /
//! default-namespace prefix a given tool emits.

use std::collections::HashMap;

use roxmltree::{Document, Node};

use super::model::{Component, Diagram, Edge, Region};
use super::round::py_round;

const MARGIN: f64 = 30.0;

// ── Element-type → kymo shape mappings (the forward tables; to_bpmn derives its
// inverse from these). ───────────────────────────────────────────────────────
fn event_shape(tag: &str) -> Option<&'static str> {
    match tag {
        "startEvent" => Some("bpmn-start"),
        "endEvent" => Some("bpmn-end"),
        "intermediateCatchEvent" => Some("bpmn-intermediate"),
        "intermediateThrowEvent" => Some("bpmn-intermediate"),
        "boundaryEvent" => Some("bpmn-boundary"),
        _ => None,
    }
}

/// event-definition child tag → marker key. `cancel` maps to `""` (tool draws the
/// X; no glyph here) but still counts as "found", matching Python's `_EVENT_DEF`.
fn event_def(tag: &str) -> Option<&'static str> {
    match tag {
        "messageEventDefinition" => Some("message"),
        "timerEventDefinition" => Some("timer"),
        "errorEventDefinition" => Some("error"),
        "signalEventDefinition" => Some("signal"),
        "terminateEventDefinition" => Some("terminate"),
        "escalationEventDefinition" => Some("escalation"),
        "conditionalEventDefinition" => Some("conditional"),
        "linkEventDefinition" => Some("link"),
        "compensateEventDefinition" => Some("compensation"),
        "cancelEventDefinition" => Some(""),
        _ => None,
    }
}

fn task_marker(tag: &str) -> Option<&'static str> {
    match tag {
        "task" => Some(""),
        "userTask" => Some("user"),
        "serviceTask" => Some("service"),
        "scriptTask" => Some("script"),
        "sendTask" => Some("send"),
        "receiveTask" => Some("receive"),
        "manualTask" => Some("manual"),
        "businessRuleTask" => Some("rule"),
        "callActivity" => Some(""),
        _ => None,
    }
}

fn gateway_marker(tag: &str) -> Option<&'static str> {
    match tag {
        "exclusiveGateway" => Some("exclusive"),
        "parallelGateway" => Some("parallel"),
        "inclusiveGateway" => Some("inclusive"),
        "eventBasedGateway" => Some("event"),
        "complexGateway" => Some("complex"),
        _ => None,
    }
}

fn is_subprocess_tag(tag: &str) -> bool {
    matches!(tag, "subProcess" | "transaction" | "adHocSubProcess")
}

// ── XML helpers ───────────────────────────────────────────────────────────────
fn local<'a>(n: &Node<'a, 'a>) -> &'a str {
    n.tag_name().name()
}

fn num(v: Option<&str>) -> f64 {
    match v {
        Some(s) if !s.is_empty() => s.trim().parse().unwrap_or(0.0),
        _ => 0.0,
    }
}

/// `<dc:Bounds x y width height>` of a shape, as floats.
fn bounds<'a>(shape: Node<'a, 'a>) -> Option<(f64, f64, f64, f64)> {
    for ch in shape.children().filter(Node::is_element) {
        if local(&ch) == "Bounds" {
            return Some((
                num(ch.attribute("x")),
                num(ch.attribute("y")),
                num(ch.attribute("width")),
                num(ch.attribute("height")),
            ));
        }
    }
    None
}

/// Centre of a child `<BPMNLabel>`'s bounds, or `None`.
fn label_center<'a>(n: Node<'a, 'a>) -> Option<(f64, f64)> {
    for ch in n.children().filter(Node::is_element) {
        if local(&ch) == "BPMNLabel" {
            if let Some((x, y, w, h)) = bounds(ch) {
                return Some((x + w / 2.0, y + h / 2.0));
            }
        }
    }
    None
}

/// `(cx, cy, w, h)` of a child `<BPMNLabel>`'s bounds, or `None`.
fn label_box<'a>(n: Node<'a, 'a>) -> Option<(f64, f64, f64, f64)> {
    for ch in n.children().filter(Node::is_element) {
        if local(&ch) == "BPMNLabel" {
            if let Some((x, y, w, h)) = bounds(ch) {
                return Some((x + w / 2.0, y + h / 2.0, w, h));
            }
        }
    }
    None
}

fn event_marker<'a>(elem: Node<'a, 'a>) -> &'static str {
    for ch in elem.children().filter(Node::is_element) {
        if let Some(m) = event_def(local(&ch)) {
            return m;
        }
    }
    ""
}

fn annotation_text<'a>(elem: Node<'a, 'a>) -> String {
    for ch in elem.children().filter(Node::is_element) {
        if local(&ch) == "text" {
            return ch.text().unwrap_or("").trim().to_string();
        }
    }
    String::new()
}

/// Map a semantic element to `(shape, marker)` for a Component, or `None` when it
/// should become a Region (pool / lane / expanded sub-process / group) — handled
/// by the caller. Mirrors `_classify_node`.
fn classify_node<'a>(
    tag: &str,
    elem: Node<'a, 'a>,
    di_shape: Node<'a, 'a>,
) -> Option<(&'static str, &'static str)> {
    if let Some(shape) = event_shape(tag) {
        return Some((shape, event_marker(elem)));
    }
    if let Some(m) = task_marker(tag) {
        return Some(("bpmn-task", m));
    }
    if let Some(m) = gateway_marker(tag) {
        // Exclusive gateways draw the X only when the DI opts in.
        let marker =
            if tag == "exclusiveGateway" && di_shape.attribute("isMarkerVisible") != Some("true") {
                ""
            } else {
                m
            };
        return Some(("bpmn-gateway", marker));
    }
    if matches!(tag, "dataObjectReference" | "dataInput" | "dataOutput") {
        return Some(("bpmn-data-object", ""));
    }
    if tag == "dataStoreReference" {
        return Some(("bpmn-data-store", ""));
    }
    if tag == "textAnnotation" {
        return Some(("bpmn-annotation", ""));
    }
    if is_subprocess_tag(tag) {
        let (_, _, w, h) = bounds(di_shape).unwrap_or((0.0, 0.0, 0.0, 0.0));
        let expanded = di_shape.attribute("isExpanded");
        let is_expanded = expanded == Some("true") || (expanded.is_none() && w > 130.0 && h > 90.0);
        if is_expanded {
            return None; // → Region
        }
        return Some(("bpmn-subprocess", ""));
    }
    None
}

fn flow_kind<'a>(
    tag: &str,
    elem: Option<Node<'a, 'a>>,
    by_id: &HashMap<&'a str, Node<'a, 'a>>,
) -> &'static str {
    if tag == "messageFlow" {
        return "message";
    }
    if matches!(
        tag,
        "association" | "dataInputAssociation" | "dataOutputAssociation"
    ) {
        return "association";
    }
    if tag == "sequenceFlow" {
        if let Some(elem) = elem {
            let src = elem
                .attribute("sourceRef")
                .and_then(|r| by_id.get(r).copied());
            // default flow → the source node names this flow in its `default`.
            if let Some(src) = src {
                if src.attribute("default") == elem.attribute("id") {
                    return "default";
                }
            }
            // conditional flow → has a <conditionExpression> child, but only
            // marked when the source is an activity (a gateway already encodes it).
            let src_is_gateway = src.is_some_and(|s| local(&s).ends_with("Gateway"));
            if !src_is_gateway {
                for ch in elem.children().filter(Node::is_element) {
                    if local(&ch) == "conditionExpression" {
                        return "conditional";
                    }
                }
            }
        }
    }
    "sequence"
}

/// Parse BPMN 2.0 XML into a resolved [`Diagram`]. Returns `Err` on malformed XML
/// (the conformance harness maps that to the `{"status":"error"}` marker, matching
/// Python's `import_model`).
pub fn parse(xml_text: &str) -> Result<Diagram, String> {
    let doc = Document::parse(xml_text).map_err(|e| e.to_string())?;

    // Index every element carrying an id (first occurrence wins).
    let mut by_id: HashMap<&str, Node> = HashMap::new();
    for el in doc.descendants().filter(Node::is_element) {
        if let Some(eid) = el.attribute("id") {
            by_id.entry(eid).or_insert(el);
        }
    }

    // Collect DI shapes & edges in document order.
    let mut di_shapes: Vec<Node> = Vec::new();
    let mut di_edges: Vec<Node> = Vec::new();
    for el in doc.descendants().filter(Node::is_element) {
        match local(&el) {
            "BPMNShape" => di_shapes.push(el),
            "BPMNEdge" => di_edges.push(el),
            _ => {}
        }
    }

    let mut components: Vec<Component> = Vec::new();
    let mut regions: Vec<Region> = Vec::new();
    let mut edges: Vec<Edge> = Vec::new();
    let mut xs: Vec<f64> = Vec::new();
    let mut ys: Vec<f64> = Vec::new();
    let track = |x: f64, y: f64, w: f64, h: f64, xs: &mut Vec<f64>, ys: &mut Vec<f64>| {
        xs.push(x);
        xs.push(x + w);
        ys.push(y);
        ys.push(y + h);
    };

    // ── Shapes → components / regions ────────────────────────────────────────
    for shape in &di_shapes {
        let shape = *shape;
        let elem = match shape
            .attribute("bpmnElement")
            .and_then(|r| by_id.get(r).copied())
        {
            Some(e) => e,
            None => continue,
        };
        let b = match bounds(shape) {
            Some(b) => b,
            None => continue,
        };
        let (x, y, w, h) = b;
        track(x, y, w, h, &mut xs, &mut ys);
        let tag = local(&elem);
        let name = elem.attribute("name").unwrap_or("").trim().to_string();
        let rid = shape.attribute("bpmnElement").unwrap_or("").to_string();

        let region_with = |style: &str, label_position: Option<&str>| Region {
            id: rid.clone(),
            label: name.clone(),
            bounds: (py_round(x), py_round(y), py_round(w), py_round(h)),
            style: style.to_string(),
            label_position: label_position.map(str::to_string),
            ..Default::default()
        };

        match tag {
            "participant" => {
                regions.push(region_with("pool", None));
                continue;
            }
            "lane" => {
                regions.push(region_with("lane", None));
                continue;
            }
            "group" => {
                regions.push(region_with("outer", None));
                continue;
            }
            _ => {}
        }

        let classified = classify_node(tag, elem, shape);
        if classified.is_none() && is_subprocess_tag(tag) {
            // expanded sub-process → container region
            regions.push(region_with("inner", Some("inside")));
            continue;
        }
        let (cshape, marker) = match classified {
            Some(c) => c,
            None => continue,
        };

        let cname = if tag == "textAnnotation" {
            annotation_text(elem)
        } else {
            name
        };
        let lb = label_box(shape)
            .map(|(lcx, lcy, lw, lh)| (py_round(lcx), py_round(lcy), py_round(lw), py_round(lh)));
        components.push(Component {
            id: rid,
            name: cname,
            subtitle: String::new(),
            icon: marker.to_string(),
            shape: cshape.to_string(),
            accent: "blue".to_string(),
            pos: (py_round(x + w / 2.0), py_round(y + h / 2.0)),
            size: Some((py_round(w), py_round(h))),
            label_box: lb,
            ..Default::default()
        });
    }

    // ── Edges → flows ────────────────────────────────────────────────────────
    for de in &di_edges {
        let de = *de;
        let elem = de
            .attribute("bpmnElement")
            .and_then(|r| by_id.get(r).copied());
        let wps: Vec<(i64, i64)> = de
            .children()
            .filter(Node::is_element)
            .filter(|wp| local(wp) == "waypoint")
            .map(|wp| {
                (
                    py_round(num(wp.attribute("x"))),
                    py_round(num(wp.attribute("y"))),
                )
            })
            .collect();
        if wps.len() < 2 {
            continue;
        }
        for &(px, py) in &wps {
            track(px as f64, py as f64, 0.0, 0.0, &mut xs, &mut ys);
        }

        let tag = elem.map_or("sequenceFlow", |e| local(&e));
        let flow = flow_kind(tag, elem, &by_id);
        let name = elem
            .and_then(|e| e.attribute("name"))
            .unwrap_or("")
            .trim()
            .to_string();
        let src = elem
            .and_then(|e| e.attribute("sourceRef"))
            .unwrap_or("")
            .to_string();
        let dst = elem
            .and_then(|e| e.attribute("targetRef"))
            .unwrap_or("")
            .to_string();
        let label_pos = label_center(de).map(|(lx, ly)| (py_round(lx), py_round(ly)));

        edges.push(Edge {
            src,
            dst,
            label: name,
            points: Some(wps),
            bpmn_flow: Some(flow.to_string()),
            label_pos,
            ..Default::default()
        });
    }

    // ── Normalise coordinates into a tidy top-left-anchored canvas ───────────
    if xs.is_empty() {
        xs.push(0.0);
        ys.push(0.0);
    }
    let min_x = xs.iter().copied().fold(f64::INFINITY, f64::min);
    let min_y = ys.iter().copied().fold(f64::INFINITY, f64::min);
    let max_x = xs.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let max_y = ys.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let dx = MARGIN - min_x;
    let dy = MARGIN - min_y;
    let width = py_round(max_x - min_x + 2.0 * MARGIN);
    let height = py_round(max_y - min_y + 2.0 * MARGIN);

    let idx = py_round(dx);
    let idy = py_round(dy);
    for c in &mut components {
        c.pos = (c.pos.0 + idx, c.pos.1 + idy);
        if let Some((lx, ly, lw, lh)) = c.label_box {
            c.label_box = Some((lx + idx, ly + idy, lw, lh));
        }
    }
    for r in &mut regions {
        let (bx, by, bw, bh) = r.bounds;
        r.bounds = (bx + idx, by + idy, bw, bh);
    }
    for e in &mut edges {
        if let Some(pts) = &mut e.points {
            for p in pts.iter_mut() {
                *p = (p.0 + idx, p.1 + idy);
            }
        }
        if let Some((lx, ly)) = e.label_pos {
            e.label_pos = Some((lx + idx, ly + idy));
        }
    }

    // Pools first (drawn underneath), then lanes, then everything else — stable
    // sort preserves declaration order within each band, matching Python.
    regions.sort_by_key(|r| match r.style.as_str() {
        "pool" => 0,
        "lane" => 1,
        _ => 2,
    });

    Ok(Diagram {
        width,
        height,
        components,
        regions,
        edges,
        ..Default::default()
    })
}
