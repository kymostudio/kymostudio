//! [`Sequence`] → OMG **XMI 2.5.1** serializing a UML 2.5.1 `Interaction`.
//!
//! The mapping:
//! - each [`Participant`] → a `uml:Lifeline` (the actor flag and note placement
//!   carry no UML attribute and are dropped; `represents` is omitted — optional
//!   `[0..1]` — so we need no synthetic Collaboration/parts);
//! - each [`Message`] → a `uml:Message` plus two
//!   `MessageOccurrenceSpecification` fragments (send on the sender lifeline,
//!   receive on the receiver), with `messageSort` from [`MessageSort::uml`];
//! - activations (`+`/`-` shorthand and `activate`/`deactivate`) →
//!   `BehaviorExecutionSpecification` fragments. Shorthand anchors `start`/
//!   `finish` to the message occurrences; explicit forms synthesize
//!   `ExecutionOccurrenceSpecification`s;
//! - combined fragments → `uml:CombinedFragment` with one `InteractionOperand`
//!   per branch, the guard as an `InteractionConstraint` + `LiteralString`;
//! - notes → `ownedComment` (`uml:Comment`) annotating the target lifelines.
//!
//! IDs are deterministic (a single monotonic counter, prefixed by element
//! kind), so output is byte-stable for golden tests.

use std::collections::HashMap;

use super::{Item, Message, Sequence};

const HEADER: &str = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";

/// Serialize a [`Sequence`] to an XMI 2.5.1 document string.
pub fn to_xmi(seq: &Sequence) -> String {
    let mut e = Emit::new(seq);
    // Lifelines first (referenced by everything below).
    let mut lifelines = String::new();
    for p in &seq.participants {
        let id = &e.lifelines[&p.id];
        push_line(
            &mut lifelines,
            3,
            &format!(
                "<lifeline xmi:type=\"uml:Lifeline\" xmi:id=\"{id}\" name=\"{}\"/>",
                xml_attr(&p.label)
            ),
        );
    }
    // The ordered interaction body — fragments (occurrences, executions,
    // combined fragments). Messages and comments are collected as side streams.
    let body = e.emit_items(&seq.items, 3);

    let mut out = String::with_capacity(512 + body.len());
    out.push_str(HEADER);
    out.push_str(
        "<xmi:XMI xmi:version=\"2.5.1\" \
xmlns:xmi=\"http://www.omg.org/spec/XMI/20131001\" \
xmlns:uml=\"http://www.omg.org/spec/UML/20161101\">\n",
    );
    push_line(
        &mut out,
        1,
        "<uml:Model xmi:id=\"model-1\" name=\"SequenceModel\">",
    );
    push_line(
        &mut out,
        2,
        "<packagedElement xmi:type=\"uml:Interaction\" xmi:id=\"interaction-1\" name=\"Sequence\">",
    );
    out.push_str(&lifelines);
    out.push_str(&body);
    for m in &e.messages {
        push_line(&mut out, 3, m);
    }
    for c in &e.comments {
        push_line(&mut out, 3, c);
    }
    push_line(&mut out, 2, "</packagedElement>");
    push_line(&mut out, 1, "</uml:Model>");
    out.push_str("</xmi:XMI>\n");
    out
}

/// An execution opened by `activate` / `+`, awaiting its close.
struct OpenExec {
    exec_id: String,
    start: String,
}

/// Mutable emission state shared across the recursive body walk.
struct Emit {
    counter: usize,
    /// Participant declaration order (ids) — drives `covered` ordering.
    order: Vec<String>,
    /// Participant id → lifeline xmi:id.
    lifelines: HashMap<String, String>,
    /// `<message …/>` elements (interaction-level).
    messages: Vec<String>,
    /// `<ownedComment …/>` elements (interaction-level).
    comments: Vec<String>,
    /// Lifeline id → stack of open executions.
    exec_stack: HashMap<String, Vec<OpenExec>>,
}

impl Emit {
    fn new(seq: &Sequence) -> Self {
        let mut e = Emit {
            counter: 0,
            order: Vec::new(),
            lifelines: HashMap::new(),
            messages: Vec::new(),
            comments: Vec::new(),
            exec_stack: HashMap::new(),
        };
        for p in &seq.participants {
            let id = e.new_id("lifeline");
            e.lifelines.insert(p.id.clone(), id);
            e.order.push(p.id.clone());
        }
        e
    }

    fn new_id(&mut self, prefix: &str) -> String {
        self.counter += 1;
        format!("{prefix}-{}", self.counter)
    }

    /// Emit one body level (the interaction or one operand), returning its
    /// concatenated fragment elements at the given indent.
    fn emit_items(&mut self, items: &[Item], indent: usize) -> String {
        let mut buf = String::new();
        for item in items {
            match item {
                Item::Message(m) => self.emit_message(&mut buf, indent, m),
                Item::Autonumber(_) => {}
                Item::Activate(x) => self.emit_activate(&mut buf, indent, x),
                Item::Deactivate(x) => self.emit_deactivate(&mut buf, indent, x),
                Item::Note(n) => {
                    let c_id = self.new_id("comment");
                    let anno: Vec<String> = n
                        .targets
                        .iter()
                        .filter_map(|t| self.lifelines.get(t).cloned())
                        .collect();
                    self.comments.push(format!(
                        "<ownedComment xmi:type=\"uml:Comment\" xmi:id=\"{c_id}\" \
body=\"{}\" annotatedElement=\"{}\"/>",
                        xml_attr(&n.text),
                        anno.join(" ")
                    ));
                }
                Item::Fragment(f) => {
                    let cf_id = self.new_id("frag");
                    let covered = self.covered(f.operands.iter().flat_map(|o| o.items.iter()));
                    push_line(
                        &mut buf,
                        indent,
                        &format!(
                            "<fragment xmi:type=\"uml:CombinedFragment\" xmi:id=\"{cf_id}\" \
interactionOperator=\"{}\" covered=\"{covered}\">",
                            f.operator.uml()
                        ),
                    );
                    for operand in &f.operands {
                        let op_id = self.new_id("operand");
                        let op_covered = self.covered(operand.items.iter());
                        push_line(
                            &mut buf,
                            indent + 1,
                            &format!(
                                "<operand xmi:type=\"uml:InteractionOperand\" xmi:id=\"{op_id}\" \
covered=\"{op_covered}\">"
                            ),
                        );
                        if !operand.guard.is_empty() {
                            let g_id = self.new_id("guard");
                            let s_id = self.new_id("spec");
                            push_line(
                                &mut buf,
                                indent + 2,
                                &format!(
                                    "<guard xmi:type=\"uml:InteractionConstraint\" xmi:id=\"{g_id}\">"
                                ),
                            );
                            push_line(
                                &mut buf,
                                indent + 3,
                                &format!(
                                    "<specification xmi:type=\"uml:LiteralString\" \
xmi:id=\"{s_id}\" value=\"{}\"/>",
                                    xml_attr(&operand.guard)
                                ),
                            );
                            push_line(&mut buf, indent + 2, "</guard>");
                        }
                        buf.push_str(&self.emit_items(&operand.items, indent + 2));
                        push_line(&mut buf, indent + 1, "</operand>");
                    }
                    push_line(&mut buf, indent, "</fragment>");
                }
            }
        }
        buf
    }

    fn emit_message(&mut self, buf: &mut String, indent: usize, m: &Message) {
        let from_ll = self.lifelines[&m.from].clone();
        let to_ll = self.lifelines[&m.to].clone();
        let msg_id = self.new_id("message");
        let send = self.new_id("occ");
        let recv = self.new_id("occ");
        push_line(
            buf,
            indent,
            &format!(
                "<fragment xmi:type=\"uml:MessageOccurrenceSpecification\" xmi:id=\"{send}\" \
covered=\"{from_ll}\" message=\"{msg_id}\"/>"
            ),
        );
        push_line(
            buf,
            indent,
            &format!(
                "<fragment xmi:type=\"uml:MessageOccurrenceSpecification\" xmi:id=\"{recv}\" \
covered=\"{to_ll}\" message=\"{msg_id}\"/>"
            ),
        );
        self.messages.push(format!(
            "<message xmi:type=\"uml:Message\" xmi:id=\"{msg_id}\" name=\"{}\" \
messageSort=\"{}\" sendEvent=\"{send}\" receiveEvent=\"{recv}\"/>",
            xml_attr(&m.text),
            m.sort.uml()
        ));
        if m.activate_target {
            self.open_exec(&to_ll, recv);
        }
        if m.deactivate_source {
            self.close_exec(buf, indent, &from_ll, send);
        }
    }

    /// `activate X` — synthesize a start occurrence, then open an execution.
    fn emit_activate(&mut self, buf: &mut String, indent: usize, participant: &str) {
        let ll = self.lifelines[participant].clone();
        let exec_id = self.new_id("exec");
        let start = self.new_id("occ");
        push_line(
            buf,
            indent,
            &format!(
                "<fragment xmi:type=\"uml:ExecutionOccurrenceSpecification\" xmi:id=\"{start}\" \
covered=\"{ll}\" execution=\"{exec_id}\"/>"
            ),
        );
        self.exec_stack
            .entry(ll)
            .or_default()
            .push(OpenExec { exec_id, start });
    }

    /// `deactivate X` — synthesize a finish occurrence, then close the execution.
    fn emit_deactivate(&mut self, buf: &mut String, indent: usize, participant: &str) {
        let ll = self.lifelines[participant].clone();
        let Some(open) = self.exec_stack.get_mut(&ll).and_then(|s| s.pop()) else {
            return;
        };
        let finish = self.new_id("occ");
        push_line(
            buf,
            indent,
            &format!(
                "<fragment xmi:type=\"uml:ExecutionOccurrenceSpecification\" xmi:id=\"{finish}\" \
covered=\"{ll}\" execution=\"{}\"/>",
                open.exec_id
            ),
        );
        self.emit_exec(buf, indent, &ll, &open, &finish);
    }

    fn open_exec(&mut self, lifeline: &str, start: String) {
        let exec_id = self.new_id("exec");
        self.exec_stack
            .entry(lifeline.to_string())
            .or_default()
            .push(OpenExec { exec_id, start });
    }

    /// Close the innermost open execution on `lifeline`, anchoring `finish` to
    /// the given occurrence. No-op if the stack is empty (unbalanced input).
    fn close_exec(&mut self, buf: &mut String, indent: usize, lifeline: &str, finish: String) {
        let Some(open) = self.exec_stack.get_mut(lifeline).and_then(|s| s.pop()) else {
            return;
        };
        self.emit_exec(buf, indent, lifeline, &open, &finish);
    }

    fn emit_exec(
        &mut self,
        buf: &mut String,
        indent: usize,
        lifeline: &str,
        open: &OpenExec,
        finish: &str,
    ) {
        push_line(
            buf,
            indent,
            &format!(
                "<fragment xmi:type=\"uml:BehaviorExecutionSpecification\" xmi:id=\"{}\" \
covered=\"{lifeline}\" start=\"{}\" finish=\"{finish}\"/>",
                open.exec_id, open.start
            ),
        );
    }

    /// The space-separated lifeline ids touched by `items`, in declaration
    /// order — for a `covered` attribute.
    fn covered<'a>(&self, items: impl Iterator<Item = &'a Item>) -> String {
        let mut touched: Vec<String> = Vec::new();
        for it in items {
            collect_touched(it, &mut touched);
        }
        self.order
            .iter()
            .filter(|pid| touched.iter().any(|t| t == *pid))
            .filter_map(|pid| self.lifelines.get(pid).cloned())
            .collect::<Vec<_>>()
            .join(" ")
    }
}

/// Gather participant ids referenced (transitively) by one item.
fn collect_touched(item: &Item, out: &mut Vec<String>) {
    let mut add = |id: &str| {
        if !out.iter().any(|x| x == id) {
            out.push(id.to_string());
        }
    };
    match item {
        Item::Message(m) => {
            add(&m.from);
            add(&m.to);
        }
        Item::Autonumber(_) => {}
        Item::Activate(x) | Item::Deactivate(x) => add(x),
        Item::Note(n) => {
            for t in &n.targets {
                add(t);
            }
        }
        Item::Fragment(f) => {
            for op in &f.operands {
                for it in &op.items {
                    collect_touched(it, out);
                }
            }
        }
    }
}

/// XML-escape an attribute value (double-quoted context).
fn xml_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn push_line(buf: &mut String, indent: usize, s: &str) {
    for _ in 0..indent {
        buf.push_str("  ");
    }
    buf.push_str(s);
    buf.push('\n');
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mermaid::parse_sequence;

    fn xmi(src: &str) -> String {
        to_xmi(&parse_sequence(src).unwrap())
    }

    #[test]
    fn skeleton_and_messages() {
        let out = xmi("sequenceDiagram\nAlice->>John: Hello\nJohn-->>Alice: Hi");
        assert!(out.starts_with("<?xml"));
        assert!(out.contains("xmi:version=\"2.5.1\""));
        assert!(out.contains("<packagedElement xmi:type=\"uml:Interaction\""));
        assert!(out.contains("name=\"Alice\""));
        assert!(out.contains("messageSort=\"synchCall\""));
        assert!(out.contains("messageSort=\"reply\""));
        // Two messages → two Message elements, four occurrence fragments.
        assert_eq!(out.matches("uml:Message\"").count(), 2);
        assert_eq!(out.matches("uml:MessageOccurrenceSpecification").count(), 4);
    }

    #[test]
    fn activation_shorthand_emits_execution() {
        let out = xmi("sequenceDiagram\nAlice->>+John: Hi\nJohn-->>-Alice: Bye");
        assert!(out.contains("uml:BehaviorExecutionSpecification"));
    }

    #[test]
    fn combined_fragment_and_guard() {
        let out = xmi("sequenceDiagram\nalt is ok\nA->>B: yes\nelse not ok\nA->>B: no\nend");
        assert!(out.contains("interactionOperator=\"alt\""));
        assert!(out.contains("uml:InteractionOperand"));
        assert!(out.contains("uml:InteractionConstraint"));
        assert!(out.contains("value=\"is ok\""));
        assert!(out.contains("value=\"not ok\""));
    }

    #[test]
    fn note_becomes_comment() {
        let out = xmi("sequenceDiagram\nA->>B: hi\nNote over A,B: shared state");
        assert!(out.contains("<ownedComment xmi:type=\"uml:Comment\""));
        assert!(out.contains("body=\"shared state\""));
    }

    #[test]
    fn escapes_xml_special_chars() {
        let out = xmi("sequenceDiagram\nA->>B: a < b & \"c\"");
        assert!(out.contains("a &lt; b &amp; &quot;c&quot;"));
    }

    #[test]
    fn deterministic() {
        let src = "sequenceDiagram\nA->>+B: go\nB-->>-A: done";
        assert_eq!(xmi(src), xmi(src));
    }
}
