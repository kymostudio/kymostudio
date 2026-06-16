//! [`Sequence`] → StarUML native **`.mdj`** (metadata-JSON) with a laid-out
//! sequence diagram, so opening the file in StarUML (File → Open) shows the
//! actual diagram — not just the model.
//!
//! Unlike XMI (model only), a `.mdj` carries BOTH the UML model AND the diagram
//! *views* with geometry (`left`/`top`/`width`/`height`). We compute a simple
//! layout (lifelines in evenly-spaced columns, messages as descending rows,
//! combined fragments as enclosing boxes) and emit the view tree StarUML draws.
//!
//! Schema (verified against real StarUML-saved files + `staruml-xmi`):
//! - `Project.ownedElements = [UMLModel, UMLCollaboration]`;
//! - the `UMLCollaboration` owns one `UMLInteraction` (+ a `UMLAttribute` per
//!   lifeline, referenced by `UMLLifeline.represent`);
//! - the `UMLInteraction` holds `participants` (lifelines), `messages`,
//!   `fragments` (combined fragments), and in `ownedElements` the
//!   `UMLSequenceDiagram`;
//! - the diagram's `ownedViews` hold a `UMLFrameView`, the
//!   `UMLSeqLifelineView`s (each with a `UMLNameCompartmentView` + a
//!   `UMLLinePartView`) and the `UMLSeqMessageView`s (whose `head`/`tail`
//!   reference the target/source **`UMLLinePartView`** ids), plus
//!   `UMLCombinedFragmentView`s.
//!
//! `messageSort` is omitted for `synchCall` (StarUML's default). Activations
//! and notes are not emitted in this first version (see the module TODO).

use super::layout::{
    self, Layout, PFrag, PMsg, FRAG_HEADER, FRAME_LEFT, FRAME_TOP, HEAD_H, HEAD_TOP, HEAD_W,
    LINE_TOP, SELF_EXTRA,
};
use super::{MessageSort, Sequence};

/// Serialize a [`Sequence`] to a StarUML `.mdj` document string.
pub fn to_mdj(seq: &Sequence) -> String {
    let lay = layout::layout(seq);
    Builder::new(seq, &lay).build()
}

// ── JSON value + writer (no serde dependency) ───────────────────────────────

enum J {
    S(String),
    I(i64),
    F(f64),
    B(bool),
    Arr(Vec<J>),
    Obj(Vec<(&'static str, J)>),
}

fn r(id: &str) -> J {
    J::Obj(vec![("$ref", J::S(id.to_string()))])
}

impl J {
    fn write(&self, out: &mut String, indent: usize) {
        match self {
            J::S(s) => {
                out.push('"');
                json_escape(s, out);
                out.push('"');
            }
            J::I(n) => out.push_str(&n.to_string()),
            J::F(x) => out.push_str(&format!("{x}")),
            J::B(b) => out.push_str(if *b { "true" } else { "false" }),
            J::Arr(items) => {
                if items.is_empty() {
                    out.push_str("[]");
                    return;
                }
                out.push_str("[\n");
                for (i, it) in items.iter().enumerate() {
                    pad(out, indent + 1);
                    it.write(out, indent + 1);
                    if i + 1 < items.len() {
                        out.push(',');
                    }
                    out.push('\n');
                }
                pad(out, indent);
                out.push(']');
            }
            J::Obj(fields) => {
                if fields.is_empty() {
                    out.push_str("{}");
                    return;
                }
                out.push_str("{\n");
                for (i, (k, v)) in fields.iter().enumerate() {
                    pad(out, indent + 1);
                    out.push('"');
                    out.push_str(k);
                    out.push_str("\": ");
                    v.write(out, indent + 1);
                    if i + 1 < fields.len() {
                        out.push(',');
                    }
                    out.push('\n');
                }
                pad(out, indent);
                out.push('}');
            }
        }
    }
}

fn pad(out: &mut String, indent: usize) {
    for _ in 0..indent {
        out.push_str("    ");
    }
}

fn json_escape(s: &str, out: &mut String) {
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
}

// ── Emit pass ───────────────────────────────────────────────────────────────

struct Builder<'a> {
    seq: &'a Sequence,
    lay: &'a Layout,
}

impl<'a> Builder<'a> {
    fn new(seq: &'a Sequence, lay: &'a Layout) -> Self {
        Builder { seq, lay }
    }

    fn build(&self) -> String {
        let model = J::Obj(vec![
            ("_type", J::S("UMLModel".into())),
            ("_id", J::S("model-1".into())),
            ("_parent", r("proj-1")),
            ("name", J::S("Model".into())),
            ("ownedElements", J::Arr(vec![])),
        ]);

        let collab = J::Obj(vec![
            ("_type", J::S("UMLCollaboration".into())),
            ("_id", J::S("collab-1".into())),
            ("_parent", r("proj-1")),
            ("name", J::S("Collaboration1".into())),
            ("ownedElements", J::Arr(vec![self.interaction()])),
            ("attributes", J::Arr(self.attributes())),
        ]);

        let project = J::Obj(vec![
            ("_type", J::S("Project".into())),
            ("_id", J::S("proj-1".into())),
            ("name", J::S("Untitled".into())),
            ("ownedElements", J::Arr(vec![model, collab])),
        ]);

        let mut out = String::with_capacity(4096);
        project.write(&mut out, 0);
        out.push('\n');
        out
    }

    /// One `UMLAttribute` per lifeline — the role each `UMLLifeline.represent`s.
    fn attributes(&self) -> Vec<J> {
        self.seq
            .participants
            .iter()
            .enumerate()
            .map(|(i, p)| {
                J::Obj(vec![
                    ("_type", J::S("UMLAttribute".into())),
                    ("_id", J::S(format!("attr-{i}"))),
                    ("_parent", r("collab-1")),
                    ("name", J::S(p.label.clone())),
                    ("type", J::S(String::new())),
                ])
            })
            .collect()
    }

    fn interaction(&self) -> J {
        J::Obj(vec![
            ("_type", J::S("UMLInteraction".into())),
            ("_id", J::S("int-1".into())),
            ("_parent", r("collab-1")),
            ("name", J::S("Interaction1".into())),
            ("ownedElements", J::Arr(vec![self.diagram()])),
            ("participants", J::Arr(self.lifelines())),
            ("messages", J::Arr(self.messages())),
            ("fragments", J::Arr(self.fragments())),
        ])
    }

    fn lifelines(&self) -> Vec<J> {
        self.seq
            .participants
            .iter()
            .enumerate()
            .map(|(i, p)| {
                J::Obj(vec![
                    ("_type", J::S("UMLLifeline".into())),
                    ("_id", J::S(format!("lifeline-{i}"))),
                    ("_parent", r("int-1")),
                    ("name", J::S(p.label.clone())),
                    ("represent", r(&format!("attr-{i}"))),
                    ("isMultiInstance", J::B(false)),
                ])
            })
            .collect()
    }

    fn messages(&self) -> Vec<J> {
        self.lay
            .msgs
            .iter()
            .enumerate()
            .map(|(k, m)| {
                let mut fields = vec![
                    ("_type", J::S("UMLMessage".into())),
                    ("_id", J::S(format!("message-{k}"))),
                    ("_parent", r("int-1")),
                    ("name", J::S(m.text.clone())),
                    ("source", r(&format!("lifeline-{}", m.from))),
                    ("target", r(&format!("lifeline-{}", m.to))),
                ];
                // Omit messageSort for the default synchCall.
                if let Some(sort) = sort_literal(m.sort) {
                    fields.push(("messageSort", J::S(sort.into())));
                }
                J::Obj(fields)
            })
            .collect()
    }

    fn fragments(&self) -> Vec<J> {
        self.lay
            .frags
            .iter()
            .enumerate()
            .map(|(f, pf)| {
                let operands = pf
                    .operands
                    .iter()
                    .enumerate()
                    .map(|(o, (guard, _, _))| {
                        let mut fields = vec![
                            ("_type", J::S("UMLInteractionOperand".into())),
                            ("_id", J::S(format!("operand-{f}-{o}"))),
                            ("_parent", r(&format!("frag-{f}"))),
                            ("name", J::S(format!("Operand{}", o + 1))),
                        ];
                        if !guard.is_empty() {
                            fields.push(("guard", J::S(guard.clone())));
                        }
                        J::Obj(fields)
                    })
                    .collect();
                J::Obj(vec![
                    ("_type", J::S("UMLCombinedFragment".into())),
                    ("_id", J::S(format!("frag-{f}"))),
                    ("_parent", r("int-1")),
                    ("name", J::S(String::new())),
                    ("interactionOperator", J::S(pf.operator.uml().into())),
                    ("operands", J::Arr(operands)),
                ])
            })
            .collect()
    }

    fn diagram(&self) -> J {
        let mut views = Vec::new();
        views.push(self.frame_view());
        for (i, _) in self.seq.participants.iter().enumerate() {
            views.push(self.lifeline_view(i));
        }
        for (f, pf) in self.lay.frags.iter().enumerate() {
            views.push(self.fragment_view(f, pf));
        }
        for (k, m) in self.lay.msgs.iter().enumerate() {
            views.push(self.message_view(k, m));
        }
        J::Obj(vec![
            ("_type", J::S("UMLSequenceDiagram".into())),
            ("_id", J::S("sd-1".into())),
            ("_parent", r("int-1")),
            ("name", J::S("SequenceDiagram1".into())),
            ("ownedViews", J::Arr(views)),
        ])
    }

    fn frame_view(&self) -> J {
        let w = self.diagram_width();
        let h = self.diagram_height();
        let name = label_view(
            "frame-name",
            "frame-1",
            "Arial;13;1",
            33,
            13,
            120,
            "SequenceDiagram1",
        );
        let typ = label_view("frame-type", "frame-1", "Arial;13;1", 13, 13, 15, "sd");
        J::Obj(vec![
            ("_type", J::S("UMLFrameView".into())),
            ("_id", J::S("frame-1".into())),
            ("_parent", r("sd-1")),
            ("model", r("sd-1")),
            ("subViews", J::Arr(vec![name, typ])),
            ("font", J::S("Arial;13;0".into())),
            ("left", J::I(FRAME_LEFT)),
            ("top", J::I(FRAME_TOP)),
            ("width", J::I(w)),
            ("height", J::I(h)),
            ("nameLabel", r("frame-name")),
            ("frameTypeLabel", r("frame-type")),
        ])
    }

    fn lifeline_view(&self, i: usize) -> J {
        let center = self.lay.centers[i];
        let head_left = center - HEAD_W / 2;
        let line_h = self.diagram_height() - LINE_TOP - 8;
        let llv = format!("llv-{i}");
        let nc = format!("nc-{i}");
        let lp = format!("lp-{i}");

        // Name compartment with the four standard label slots (3 hidden).
        let nm = label_view(
            &format!("{nc}-nm"),
            &nc,
            "Arial;13;1",
            head_left + 6,
            HEAD_TOP + 7,
            HEAD_W - 12,
            &self.seq.participants[i].label,
        );
        let st = hidden_label(&format!("{nc}-st"), &nc);
        let ns = hidden_label(&format!("{nc}-ns"), &nc);
        let pr = hidden_label(&format!("{nc}-pr"), &nc);
        let name_comp = J::Obj(vec![
            ("_type", J::S("UMLNameCompartmentView".into())),
            ("_id", J::S(nc.clone())),
            ("_parent", r(&llv)),
            ("model", r(&format!("lifeline-{i}"))),
            ("subViews", J::Arr(vec![st, nm, ns, pr])),
            ("font", J::S("Arial;13;0".into())),
            ("left", J::I(head_left)),
            ("top", J::I(HEAD_TOP)),
            ("width", J::I(HEAD_W)),
            ("height", J::I(HEAD_H)),
            ("stereotypeLabel", r(&format!("{nc}-st"))),
            ("nameLabel", r(&format!("{nc}-nm"))),
            ("namespaceLabel", r(&format!("{nc}-ns"))),
            ("propertyLabel", r(&format!("{nc}-pr"))),
        ]);

        let line_part = J::Obj(vec![
            ("_type", J::S("UMLLinePartView".into())),
            ("_id", J::S(lp.clone())),
            ("_parent", r(&llv)),
            ("model", r(&format!("lifeline-{i}"))),
            ("font", J::S("Arial;13;0".into())),
            ("left", J::I(center)),
            ("top", J::I(LINE_TOP)),
            ("width", J::I(1)),
            ("height", J::I(line_h)),
        ]);

        J::Obj(vec![
            ("_type", J::S("UMLSeqLifelineView".into())),
            ("_id", J::S(llv.clone())),
            ("_parent", r("sd-1")),
            ("model", r(&format!("lifeline-{i}"))),
            ("subViews", J::Arr(vec![name_comp, line_part])),
            ("font", J::S("Arial;13;0".into())),
            ("left", J::I(head_left)),
            ("top", J::I(HEAD_TOP)),
            ("width", J::I(HEAD_W)),
            ("height", J::I(LINE_TOP + line_h - HEAD_TOP)),
            ("nameCompartment", r(&nc)),
            ("linePart", r(&lp)),
        ])
    }

    fn message_view(&self, k: usize, m: &PMsg) -> J {
        let src = self.lay.centers[m.from];
        let dst = self.lay.centers[m.to];
        let mv = format!("message-view-{k}");
        let points = if m.self_loop {
            format!(
                "{x}:{y};{x2}:{y};{x2}:{y2};{x}:{y2}",
                x = src,
                x2 = src + 40,
                y = m.y,
                y2 = m.y + SELF_EXTRA
            )
        } else {
            format!("{src}:{y};{dst}:{y}", y = m.y)
        };
        let lx = src.min(dst) + (src - dst).abs() / 2 - 30;
        let name = J::Obj(vec![
            ("_type", J::S("EdgeLabelView".into())),
            ("_id", J::S(format!("{mv}-nm"))),
            ("_parent", r(&mv)),
            ("model", r(&format!("message-{k}"))),
            ("font", J::S("Arial;13;0".into())),
            ("left", J::I(lx)),
            ("top", J::I(m.y - 16)),
            ("width", J::I(60)),
            ("height", J::I(13)),
            ("alpha", J::F(std::f64::consts::FRAC_PI_2)),
            ("distance", J::I(15)),
            ("hostEdge", r(&mv)),
            ("edgePosition", J::I(1)),
            ("text", J::S(m.text.clone())),
        ]);
        // Hidden stereotype / property edge labels (StarUML carries these slots).
        let stereo = hidden_edge_label(&format!("{mv}-st"), &mv, &format!("message-{k}"));
        let prop = hidden_edge_label(&format!("{mv}-pr"), &mv, &format!("message-{k}"));
        // head = TARGET line part, tail = SOURCE line part.
        J::Obj(vec![
            ("_type", J::S("UMLSeqMessageView".into())),
            ("_id", J::S(mv.clone())),
            ("_parent", r("sd-1")),
            ("model", r(&format!("message-{k}"))),
            ("subViews", J::Arr(vec![name, stereo, prop])),
            ("font", J::S("Arial;13;0".into())),
            ("head", r(&format!("lp-{}", m.to))),
            ("tail", r(&format!("lp-{}", m.from))),
            ("points", J::S(points)),
            ("nameLabel", r(&format!("{mv}-nm"))),
            ("stereotypeLabel", r(&format!("{mv}-st"))),
            ("propertyLabel", r(&format!("{mv}-pr"))),
        ])
    }

    fn fragment_view(&self, f: usize, pf: &PFrag) -> J {
        let cfv = format!("frag-view-{f}");
        let oc = format!("frag-oc-{f}");
        let name = label_view(
            &format!("{cfv}-nm"),
            &cfv,
            "Arial;13;1",
            pf.left + 24,
            pf.top + 4,
            120,
            "",
        );
        let typ = label_view(
            &format!("{cfv}-ty"),
            &cfv,
            "Arial;13;1",
            pf.left + 4,
            pf.top + 4,
            32,
            pf.operator.uml(),
        );

        // Operand compartment holds the operand views.
        let operand_views: Vec<J> = pf
            .operands
            .iter()
            .enumerate()
            .map(|(o, (guard, top, h))| {
                let opv = format!("operand-view-{f}-{o}");
                let guard_label = label_view(
                    &format!("{opv}-g"),
                    &opv,
                    "Arial;13;0",
                    pf.left + 8,
                    *top + 2,
                    80,
                    &guard_text(guard),
                );
                J::Obj(vec![
                    ("_type", J::S("UMLInteractionOperandView".into())),
                    ("_id", J::S(opv.clone())),
                    ("_parent", r(&oc)),
                    ("model", r(&format!("operand-{f}-{o}"))),
                    ("subViews", J::Arr(vec![guard_label])),
                    ("font", J::S("Arial;13;0".into())),
                    ("left", J::I(pf.left)),
                    ("top", J::I(*top)),
                    ("width", J::I(pf.width)),
                    ("height", J::I(*h)),
                    ("guardLabel", r(&format!("{opv}-g"))),
                ])
            })
            .collect();

        let body_top = pf.top + FRAG_HEADER;
        let operand_compartment = J::Obj(vec![
            ("_type", J::S("UMLInteractionOperandCompartmentView".into())),
            ("_id", J::S(oc.clone())),
            ("_parent", r(&cfv)),
            ("model", r(&format!("frag-{f}"))),
            ("subViews", J::Arr(operand_views)),
            ("font", J::S("Arial;13;0".into())),
            ("left", J::I(pf.left)),
            ("top", J::I(body_top)),
            ("width", J::I(pf.width)),
            ("height", J::I(pf.top + pf.height - body_top)),
        ]);

        J::Obj(vec![
            ("_type", J::S("UMLCombinedFragmentView".into())),
            ("_id", J::S(cfv.clone())),
            ("_parent", r("sd-1")),
            ("model", r(&format!("frag-{f}"))),
            ("subViews", J::Arr(vec![name, typ, operand_compartment])),
            ("font", J::S("Arial;13;0".into())),
            ("left", J::I(pf.left)),
            ("top", J::I(pf.top)),
            ("width", J::I(pf.width)),
            ("height", J::I(pf.height)),
            ("nameLabel", r(&format!("{cfv}-nm"))),
            ("frameTypeLabel", r(&format!("{cfv}-ty"))),
            ("operandCompartment", r(&oc)),
        ])
    }

    fn diagram_width(&self) -> i64 {
        let last = self.lay.centers.last().copied().unwrap_or(0);
        (last + HEAD_W / 2 + 24 - FRAME_LEFT).max(200)
    }

    fn diagram_height(&self) -> i64 {
        (self.lay.bottom + 40 - FRAME_TOP).max(200)
    }
}

/// `[guard]` bracket notation StarUML shows on an operand, or empty.
fn guard_text(guard: &str) -> String {
    if guard.is_empty() {
        String::new()
    } else {
        format!("[{guard}]")
    }
}

/// A visible `LabelView` with text.
fn label_view(
    id: &str,
    parent: &str,
    font: &str,
    left: i64,
    top: i64,
    width: i64,
    text: &str,
) -> J {
    J::Obj(vec![
        ("_type", J::S("LabelView".into())),
        ("_id", J::S(id.to_string())),
        ("_parent", r(parent)),
        ("font", J::S(font.to_string())),
        ("left", J::I(left)),
        ("top", J::I(top)),
        ("width", J::I(width)),
        ("height", J::I(13)),
        ("text", J::S(text.to_string())),
    ])
}

/// A hidden (`visible:false`) `LabelView` slot.
fn hidden_label(id: &str, parent: &str) -> J {
    J::Obj(vec![
        ("_type", J::S("LabelView".into())),
        ("_id", J::S(id.to_string())),
        ("_parent", r(parent)),
        ("visible", J::B(false)),
        ("font", J::S("Arial;13;0".into())),
        ("height", J::I(13)),
    ])
}

/// A hidden (`visible:false`) `EdgeLabelView` slot on a message view.
fn hidden_edge_label(id: &str, parent: &str, model: &str) -> J {
    J::Obj(vec![
        ("_type", J::S("EdgeLabelView".into())),
        ("_id", J::S(id.to_string())),
        ("_parent", r(parent)),
        ("model", r(model)),
        ("visible", J::B(false)),
        ("font", J::S("Arial;13;0".into())),
        ("height", J::I(13)),
        ("alpha", J::F(std::f64::consts::FRAC_PI_2)),
        ("distance", J::I(15)),
        ("hostEdge", r(parent)),
        ("edgePosition", J::I(1)),
    ])
}

/// StarUML `messageSort` literal, or `None` for the default `synchCall`.
fn sort_literal(sort: MessageSort) -> Option<&'static str> {
    match sort {
        MessageSort::SynchCall => None,
        MessageSort::AsynchCall => Some("asynchCall"),
        MessageSort::AsynchSignal => Some("asynchSignal"),
        MessageSort::Reply => Some("reply"),
        MessageSort::CreateMessage => Some("createMessage"),
        MessageSort::DeleteMessage => Some("deleteMessage"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mermaid::parse_sequence;

    fn mdj(src: &str) -> String {
        to_mdj(&parse_sequence(src).unwrap())
    }

    #[test]
    fn root_is_project_with_collaboration() {
        let out = mdj("sequenceDiagram\nAlice->>Bob: hi");
        assert!(out.contains("\"_type\": \"Project\""));
        assert!(out.contains("\"_type\": \"UMLCollaboration\""));
        assert!(out.contains("\"_type\": \"UMLInteraction\""));
        assert!(out.contains("\"_type\": \"UMLSequenceDiagram\""));
    }

    #[test]
    fn message_head_tail_reference_line_parts() {
        // Alice=lifeline-0 (lp-0), Bob=lifeline-1 (lp-1); head=target, tail=source.
        let out = mdj("sequenceDiagram\nAlice->>Bob: hi");
        assert!(
            out.contains("\"head\": {\n            \"$ref\": \"lp-1\"")
                || out.contains("\"$ref\": \"lp-1\"")
        );
        assert!(out.contains("\"tail\""));
        assert!(out.contains("\"_type\": \"UMLSeqMessageView\""));
        assert!(out.contains("\"_type\": \"UMLLinePartView\""));
    }

    #[test]
    fn synch_call_omits_message_sort() {
        let out = mdj("sequenceDiagram\nA->>B: hi");
        assert!(!out.contains("\"messageSort\""));
    }

    #[test]
    fn reply_and_async_emit_sort() {
        let out = mdj("sequenceDiagram\nA-->>B: r\nA-)B: a");
        assert!(out.contains("\"messageSort\": \"reply\""));
        assert!(out.contains("\"messageSort\": \"asynchCall\""));
    }

    #[test]
    fn fragment_emits_combined_fragment_and_view() {
        let out = mdj("sequenceDiagram\nalt ok\nA->>B: y\nelse no\nA->>B: n\nend");
        assert!(out.contains("\"_type\": \"UMLCombinedFragment\""));
        assert!(out.contains("\"interactionOperator\": \"alt\""));
        assert!(out.contains("\"_type\": \"UMLCombinedFragmentView\""));
        assert!(out.contains("\"_type\": \"UMLInteractionOperand\""));
    }

    #[test]
    fn deterministic() {
        let src = "sequenceDiagram\nA->>+B: go\nB-->>-A: done";
        assert_eq!(mdj(src), mdj(src));
    }
}
