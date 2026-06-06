//! BPMN 2.0 XML emitter — port of `to_bpmn.py` (the inverse of [`super::from_bpmn`]).
//!
//! Turns a resolved [`Diagram`] of `bpmn-*` glyphs back into a well-formed BPMN 2.0
//! document: a `<bpmn:process>` (semantic model) plus a `<bpmndi:BPMNDiagram>`
//! (Diagram-Interchange geometry), wrapping in a `<collaboration>` of participants
//! when the diagram has pools. The element/flow mapping is the exact inverse of the
//! importer's classification, derived from the same forward tables so the two stay
//! in lockstep.
//!
//! `Component.pos` is a centre and `<dc:Bounds>` is a top-left; `Region.bounds` is
//! already top-left. A DI-bearing diagram round-trips its geometry (region bounds
//! exactly, node centres within ±1px on odd-width shapes).
//!
//! Output is faithful enough to re-import identically (the conformance digest is
//! computed after a round-trip), but is not byte-for-byte identical to Python's
//! ElementTree output — XML formatting is irrelevant to the digest.

use std::collections::{HashMap, HashSet};

use super::model::{Component, Diagram};
use super::round::py_round;

// ── Namespaces ────────────────────────────────────────────────────────────────
const BPMN: &str = "http://www.omg.org/spec/BPMN/20100524/MODEL";
const BPMNDI: &str = "http://www.omg.org/spec/BPMN/20100524/DI";
const DC: &str = "http://www.omg.org/spec/DD/20100524/DC";
const DI: &str = "http://www.omg.org/spec/DD/20100524/DI";

const DEFAULT_SIZE: (i64, i64) = (100, 80);

// ── Inverse maps — derived from from_bpmn's forward tables (single source). ─────
/// event shape → element tag. `intermediateCatchEvent` wins over `…Throw` (both
/// import to `bpmn-intermediate`).
fn event_tag(shape: &str) -> Option<&'static str> {
    match shape {
        "bpmn-start" => Some("startEvent"),
        "bpmn-end" => Some("endEvent"),
        "bpmn-intermediate" => Some("intermediateCatchEvent"),
        "bpmn-boundary" => Some("boundaryEvent"),
        _ => None,
    }
}

/// marker → eventDefinition child tag (the empty marker has no child).
fn eventdef_tag(marker: &str) -> Option<&'static str> {
    match marker {
        "message" => Some("messageEventDefinition"),
        "timer" => Some("timerEventDefinition"),
        "error" => Some("errorEventDefinition"),
        "signal" => Some("signalEventDefinition"),
        "terminate" => Some("terminateEventDefinition"),
        "escalation" => Some("escalationEventDefinition"),
        "conditional" => Some("conditionalEventDefinition"),
        "link" => Some("linkEventDefinition"),
        "compensation" => Some("compensateEventDefinition"),
        _ => None, // "" and "cancel"→"" have no child
    }
}

/// task marker → element tag (`""` → `task`, not `callActivity`).
fn task_tag(marker: &str) -> &'static str {
    match marker {
        "user" => "userTask",
        "service" => "serviceTask",
        "script" => "scriptTask",
        "send" => "sendTask",
        "receive" => "receiveTask",
        "manual" => "manualTask",
        "rule" => "businessRuleTask",
        _ => "task",
    }
}

/// gateway marker → element tag (`""` → `exclusiveGateway` with the X not drawn).
fn gateway_tag(marker: &str) -> &'static str {
    match marker {
        "exclusive" => "exclusiveGateway",
        "parallel" => "parallelGateway",
        "inclusive" => "inclusiveGateway",
        "event" => "eventBasedGateway",
        "complex" => "complexGateway",
        _ => "exclusiveGateway",
    }
}

fn flow_tag(flow: &str) -> &'static str {
    match flow {
        "message" => "messageFlow",
        "association" => "association",
        _ => "sequenceFlow", // sequence / default / conditional
    }
}

/// `(element_tag, kind)` for a component's `(shape, icon)`. Mirrors `_classify`.
fn classify(c: &Component) -> (&'static str, &'static str) {
    let s = c.shape.as_str();
    if let Some(tag) = event_tag(s) {
        return (tag, "event");
    }
    match s {
        "bpmn-task" => (task_tag(&c.icon), "task"),
        "bpmn-gateway" => (gateway_tag(&c.icon), "gateway"),
        "bpmn-subprocess" => ("subProcess", "subprocess"),
        "bpmn-data-object" => ("dataObjectReference", "data"),
        "bpmn-data-store" => ("dataStoreReference", "data"),
        "bpmn-annotation" => ("textAnnotation", "annotation"),
        _ => ("task", "task"),
    }
}

/// Is a component centre inside a region's (x, y, w, h) box? Mirrors `_within`.
fn within(pos: (i64, i64), b: (i64, i64, i64, i64)) -> bool {
    let (x, y, w, h) = b;
    let (cx, cy) = pos;
    x <= cx && cx <= x + w && y <= cy && cy <= y + h
}

// ── Minimal XML writer ──────────────────────────────────────────────────────
fn esc_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn esc_text(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// One element with attributes; appended to `out` at `depth` indentation. `children`
/// renders nested content (already indented at `depth+1`); `None` → self-closing.
struct Xml {
    out: String,
}

impl Xml {
    fn new() -> Self {
        Xml { out: String::new() }
    }

    fn open(&mut self, depth: usize, tag: &str, attrs: &[(&str, String)]) {
        self.indent(depth);
        self.out.push('<');
        self.out.push_str(tag);
        self.attrs(attrs);
        self.out.push_str(">\n");
    }

    fn empty(&mut self, depth: usize, tag: &str, attrs: &[(&str, String)]) {
        self.indent(depth);
        self.out.push('<');
        self.out.push_str(tag);
        self.attrs(attrs);
        self.out.push_str("/>\n");
    }

    fn text_el(&mut self, depth: usize, tag: &str, attrs: &[(&str, String)], text: &str) {
        self.indent(depth);
        self.out.push('<');
        self.out.push_str(tag);
        self.attrs(attrs);
        self.out.push('>');
        self.out.push_str(&esc_text(text));
        self.out.push_str("</");
        self.out.push_str(tag);
        self.out.push_str(">\n");
    }

    fn close(&mut self, depth: usize, tag: &str) {
        self.indent(depth);
        self.out.push_str("</");
        self.out.push_str(tag);
        self.out.push_str(">\n");
    }

    fn attrs(&mut self, attrs: &[(&str, String)]) {
        for (k, v) in attrs {
            self.out.push(' ');
            self.out.push_str(k);
            self.out.push_str("=\"");
            self.out.push_str(&esc_attr(v));
            self.out.push('"');
        }
    }

    fn indent(&mut self, depth: usize) {
        for _ in 0..depth {
            self.out.push_str("  ");
        }
    }
}

/// Render a [`Diagram`] to a BPMN 2.0 XML string.
pub fn export(diagram: &Diagram) -> String {
    let pools: Vec<_> = diagram
        .regions
        .iter()
        .filter(|r| r.style == "pool")
        .collect();
    let lanes: Vec<_> = diagram
        .regions
        .iter()
        .filter(|r| r.style == "lane")
        .collect();
    let groups: Vec<_> = diagram
        .regions
        .iter()
        .filter(|r| r.style == "outer")
        .collect();
    let subprocs: Vec<_> = diagram
        .regions
        .iter()
        .filter(|r| r.style == "inner")
        .collect();
    let use_collab = !pools.is_empty();

    // Node id set + precomputed `default`-flow attribute per source node, and the
    // flow ids (flow0, flow1, …) assigned in edge order.
    let node_ids: HashSet<&str> = diagram.components.iter().map(|c| c.id.as_str()).collect();
    let flow_ids: Vec<String> = (0..diagram.edges.len())
        .map(|i| format!("flow{i}"))
        .collect();
    let mut default_attr: HashMap<&str, &str> = HashMap::new();
    for (e, fid) in diagram.edges.iter().zip(&flow_ids) {
        if e.bpmn_flow.as_deref() == Some("default") && node_ids.contains(e.src.as_str()) {
            default_attr.insert(e.src.as_str(), fid.as_str());
        }
    }

    let mut x = Xml::new();
    x.out
        .push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");

    // Root <definitions> with all namespace declarations (so the importer — which
    // matches local names — can still parse the prefixed elements).
    x.open(
        0,
        "bpmn:definitions",
        &[
            ("xmlns:bpmn", BPMN.into()),
            ("xmlns:bpmndi", BPMNDI.into()),
            ("xmlns:dc", DC.into()),
            ("xmlns:di", DI.into()),
            ("id", "defs_kymo".into()),
        ],
    );

    // ── collaboration (pools + message flows) ──
    if use_collab {
        x.open(1, "bpmn:collaboration", &[("id", "Collab_kymo".into())]);
        for (i, r) in pools.iter().enumerate() {
            let mut attrs = vec![("id", r.id.clone())];
            if !r.label.is_empty() {
                attrs.push(("name", r.label.clone()));
            }
            if i == 0 {
                attrs.push(("processRef", "Process_kymo".into()));
            }
            x.empty(2, "bpmn:participant", &attrs);
        }
        for (e, fid) in diagram.edges.iter().zip(&flow_ids) {
            if e.bpmn_flow.as_deref() == Some("message") {
                let mut attrs = vec![
                    ("id", fid.clone()),
                    ("sourceRef", e.src.clone()),
                    ("targetRef", e.dst.clone()),
                ];
                if !e.label.is_empty() {
                    attrs.push(("name", e.label.clone()));
                }
                x.empty(2, "bpmn:messageFlow", &attrs);
            }
        }
        x.close(1, "bpmn:collaboration");
    }

    // ── process ──
    x.open(
        1,
        "bpmn:process",
        &[
            ("id", "Process_kymo".into()),
            ("isExecutable", "false".into()),
        ],
    );

    // lanes → laneSet with geometric flowNodeRef membership
    if !lanes.is_empty() {
        x.open(2, "bpmn:laneSet", &[("id", "LaneSet_kymo".into())]);
        for r in &lanes {
            let mut attrs = vec![("id", r.id.clone())];
            if !r.label.is_empty() {
                attrs.push(("name", r.label.clone()));
            }
            // does any component fall in this lane?
            let members: Vec<&Component> = diagram
                .components
                .iter()
                .filter(|c| {
                    // one lane per node: first lane (in `lanes` order) that contains it
                    lanes
                        .iter()
                        .find(|l| within(c.pos, l.bounds))
                        .is_some_and(|l| l.id == r.id)
                })
                .collect();
            if members.is_empty() {
                x.empty(3, "bpmn:lane", &attrs);
            } else {
                x.open(3, "bpmn:lane", &attrs);
                for c in members {
                    x.text_el(4, "bpmn:flowNodeRef", &[], &c.id);
                }
                x.close(3, "bpmn:lane");
            }
        }
        x.close(2, "bpmn:laneSet");
    }

    // semantic flow nodes
    for c in &diagram.components {
        let (tag, kind) = classify(c);
        let qtag = format!("bpmn:{tag}");
        let mut attrs = vec![("id", c.id.clone())];
        if kind == "annotation" {
            x.open(2, &qtag, &attrs);
            x.text_el(3, "bpmn:text", &[], &c.name);
            x.close(2, &qtag);
        } else {
            if !c.name.is_empty() {
                attrs.push(("name", c.name.clone()));
            }
            if let Some(fid) = default_attr.get(c.id.as_str()) {
                attrs.push(("default", (*fid).to_string()));
            }
            let evdef = if kind == "event" {
                eventdef_tag(&c.icon)
            } else {
                None
            };
            if let Some(def) = evdef {
                x.open(2, &qtag, &attrs);
                x.empty(3, &format!("bpmn:{def}"), &[]);
                x.close(2, &qtag);
            } else {
                x.empty(2, &qtag, &attrs);
            }
        }
    }

    // groups + expanded sub-processes → semantic placeholders
    for r in &groups {
        let mut attrs = vec![("id", r.id.clone())];
        if !r.label.is_empty() {
            attrs.push(("name", r.label.clone()));
        }
        x.empty(2, "bpmn:group", &attrs);
    }
    for r in &subprocs {
        let mut attrs = vec![("id", r.id.clone())];
        if !r.label.is_empty() {
            attrs.push(("name", r.label.clone()));
        }
        x.empty(2, "bpmn:subProcess", &attrs);
    }

    // semantic flows (message flows already emitted in the collaboration)
    for (e, fid) in diagram.edges.iter().zip(&flow_ids) {
        let flow = e.bpmn_flow.as_deref().unwrap_or("sequence");
        if use_collab && flow == "message" {
            continue;
        }
        let qtag = format!("bpmn:{}", flow_tag(flow));
        let mut attrs = vec![
            ("id", fid.clone()),
            ("sourceRef", e.src.clone()),
            ("targetRef", e.dst.clone()),
        ];
        if !e.label.is_empty() {
            attrs.push(("name", e.label.clone()));
        }
        if flow == "conditional" {
            x.open(2, &qtag, &attrs);
            let cond = if e.label.is_empty() { "true" } else { &e.label };
            x.text_el(3, "bpmn:conditionExpression", &[], cond);
            x.close(2, &qtag);
        } else {
            x.empty(2, &qtag, &attrs);
        }
    }
    x.close(1, "bpmn:process");

    // ── DI plane ──
    x.open(1, "bpmndi:BPMNDiagram", &[]);
    let plane_ref = if use_collab {
        "Collab_kymo"
    } else {
        "Process_kymo"
    };
    x.open(2, "bpmndi:BPMNPlane", &[("bpmnElement", plane_ref.into())]);

    // region shapes first (behind nodes)
    for r in &diagram.regions {
        let mut attrs = vec![("bpmnElement", r.id.clone())];
        match r.style.as_str() {
            "pool" | "lane" => attrs.push(("isHorizontal", "true".into())),
            "inner" => attrs.push(("isExpanded", "true".into())),
            _ => {}
        }
        let (rx, ry, rw, rh) = r.bounds;
        x.open(3, "bpmndi:BPMNShape", &attrs);
        x.empty(
            4,
            "dc:Bounds",
            &[
                ("x", rx.to_string()),
                ("y", ry.to_string()),
                ("width", rw.to_string()),
                ("height", rh.to_string()),
            ],
        );
        x.close(3, "bpmndi:BPMNShape");
    }

    // component shapes (centre → top-left)
    for c in &diagram.components {
        let (w, h) = c.size.unwrap_or(DEFAULT_SIZE);
        let mut attrs = vec![("bpmnElement", c.id.clone())];
        if c.shape == "bpmn-gateway" && c.icon == "exclusive" {
            attrs.push(("isMarkerVisible", "true".into()));
        }
        x.open(3, "bpmndi:BPMNShape", &attrs);
        x.empty(
            4,
            "dc:Bounds",
            &[
                ("x", py_round(c.pos.0 as f64 - w as f64 / 2.0).to_string()),
                ("y", py_round(c.pos.1 as f64 - h as f64 / 2.0).to_string()),
                ("width", w.to_string()),
                ("height", h.to_string()),
            ],
        );
        if let Some((lcx, lcy, lw, lh)) = c.label_box {
            x.open(4, "bpmndi:BPMNLabel", &[]);
            x.empty(
                5,
                "dc:Bounds",
                &[
                    ("x", py_round(lcx as f64 - lw as f64 / 2.0).to_string()),
                    ("y", py_round(lcy as f64 - lh as f64 / 2.0).to_string()),
                    ("width", lw.to_string()),
                    ("height", lh.to_string()),
                ],
            );
            x.close(4, "bpmndi:BPMNLabel");
        }
        x.close(3, "bpmndi:BPMNShape");
    }

    // edge polylines
    for (e, fid) in diagram.edges.iter().zip(&flow_ids) {
        x.open(3, "bpmndi:BPMNEdge", &[("bpmnElement", fid.clone())]);
        if let Some(pts) = &e.points {
            for &(px, py) in pts {
                x.empty(
                    4,
                    "di:waypoint",
                    &[("x", px.to_string()), ("y", py.to_string())],
                );
            }
        }
        if !e.label.is_empty() {
            if let Some((lx, ly)) = e.label_pos {
                let (lw, lh) = (40i64, 14i64);
                x.open(4, "bpmndi:BPMNLabel", &[]);
                x.empty(
                    5,
                    "dc:Bounds",
                    &[
                        ("x", py_round(lx as f64 - lw as f64 / 2.0).to_string()),
                        ("y", py_round(ly as f64 - lh as f64 / 2.0).to_string()),
                        ("width", lw.to_string()),
                        ("height", lh.to_string()),
                    ],
                );
                x.close(4, "bpmndi:BPMNLabel");
            }
        }
        x.close(3, "bpmndi:BPMNEdge");
    }

    x.close(2, "bpmndi:BPMNPlane");
    x.close(1, "bpmndi:BPMNDiagram");
    x.close(0, "bpmn:definitions");
    x.out
}
