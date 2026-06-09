//! [`Sequence`] → Gaphor native **`.gaphor`** (XML, on-disk format v3.0) with a
//! laid-out sequence diagram, so opening it in Gaphor (File → Open) shows the
//! diagram — model + presentation in one file.
//!
//! Format (verified against `gaphor/examples/sequence-diagram.gaphor` and
//! `gaphor/storage/`): a flat list of elements under `<gaphor version="3.0">`,
//! each `<Type id="…">` with `<prop><val>…</val></prop>` (primitive),
//! `<prop><ref refid="…"/></prop>` (to-one) and `<prop><reflist>…</reflist>`
//! (to-many). References are **bidirectional** — both ends are written.
//!
//! Layers, both flat:
//! - **model**: `Lifeline` (name, coveredBy, presentation), `Message` (name,
//!   messageSort?, sendEvent/receiveEvent, presentation), two
//!   `MessageOccurrenceSpecification` per message (covered + send/receiveMessage);
//! - **presentation**: `LifelineItem` (matrix, width, height, lifetime-length,
//!   subject), `MessageItem` (matrix, points, subject, head/tail-connection),
//!   all listed in `Diagram.ownedPresentation`.
//!
//! **Hard limitation:** Gaphor's metamodel has NO `CombinedFragment` /
//! `InteractionOperand` / `interactionOperator` — alt/loop/opt/par CANNOT be
//! represented. Fragments are flattened: their messages still render (in order)
//! but the surrounding box and guards are dropped. Activations and notes are
//! likewise not emitted.

use super::layout::{self, HEAD_H, HEAD_TOP, HEAD_W};
use super::{MessageSort, Sequence};

// `gaphor-version` must be a parseable version string (the loader compares it
// numerically to decide migrations); 2.6.5 is the format-3.0 reference vintage.
const HEADER: &str = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n\
<gaphor xmlns=\"http://gaphor.sourceforge.net/model\" version=\"3.0\" gaphor-version=\"2.6.5\">\n";

/// Serialize a [`Sequence`] to a Gaphor `.gaphor` document string.
pub fn to_gaphor(seq: &Sequence) -> String {
    let lay = layout::layout(seq);
    let n_ll = seq.participants.len();
    let n_msg = lay.msgs.len();
    let bottom = lay.bottom + 24;
    let lifetime = bottom - (HEAD_TOP + HEAD_H);

    let mut out = String::with_capacity(2048);
    out.push_str(HEADER);

    // ── Package + Diagram ───────────────────────────────────────────────────
    out.push_str("<Package id=\"pkg\">\n");
    val(&mut out, "name", "New model");
    let diagram_ref = vec!["dgm".to_string()];
    reflist(&mut out, "ownedDiagram", &diagram_ref);
    out.push_str("</Package>\n");

    out.push_str("<Diagram id=\"dgm\">\n");
    rref(&mut out, "element", "pkg");
    val(&mut out, "name", "main");
    let mut pres: Vec<String> = (0..n_ll).map(|i| format!("lli-{i}")).collect();
    pres.extend((0..n_msg).map(|k| format!("mi-{k}")));
    reflist(&mut out, "ownedPresentation", &pres);
    out.push_str("</Diagram>\n");

    // ── Presentation: lifeline items ────────────────────────────────────────
    for (i, _p) in seq.participants.iter().enumerate() {
        let head_left = lay.centers[i] - HEAD_W / 2;
        out.push_str(&format!("<LifelineItem id=\"lli-{i}\">\n"));
        matrix(&mut out, head_left, HEAD_TOP);
        fval(&mut out, "width", HEAD_W);
        fval(&mut out, "height", HEAD_H);
        rref(&mut out, "diagram", "dgm");
        rref(&mut out, "subject", &format!("ll-{i}"));
        fval(&mut out, "lifetime-length", lifetime);
        out.push_str("</LifelineItem>\n");
    }

    // ── Presentation: message items ─────────────────────────────────────────
    for (k, m) in lay.msgs.iter().enumerate() {
        let sx = lay.centers[m.from];
        let dx = lay.centers[m.to];
        let pts = if m.self_loop {
            format!(
                "[({sx}.0, {y}.0), ({x2}.0, {y}.0), ({x2}.0, {y2}.0), ({sx}.0, {y2}.0)]",
                x2 = sx + 40,
                y = m.y,
                y2 = m.y + layout::SELF_EXTRA
            )
        } else {
            format!("[({sx}.0, {y}.0), ({dx}.0, {y}.0)]", y = m.y)
        };
        out.push_str(&format!("<MessageItem id=\"mi-{k}\">\n"));
        rref(&mut out, "diagram", "dgm");
        ival(&mut out, "horizontal", 0);
        ival(&mut out, "orthogonal", 0);
        rref(&mut out, "subject", &format!("msg-{k}"));
        matrix(&mut out, 0, 0);
        out.push_str("<points>\n<val>");
        out.push_str(&pts);
        out.push_str("</val>\n</points>\n");
        // head = sender end, tail = receiver end (arrow follows send→receive).
        rref(&mut out, "head-connection", &format!("lli-{}", m.from));
        rref(&mut out, "tail-connection", &format!("lli-{}", m.to));
        out.push_str("</MessageItem>\n");
    }

    // ── Model: lifelines ────────────────────────────────────────────────────
    // coveredBy: every MOS sitting on this lifeline.
    let mut covered: Vec<Vec<String>> = vec![Vec::new(); n_ll];
    for (k, m) in lay.msgs.iter().enumerate() {
        covered[m.from].push(format!("snd-{k}"));
        covered[m.to].push(format!("rcv-{k}"));
    }
    for (i, p) in seq.participants.iter().enumerate() {
        out.push_str(&format!("<Lifeline id=\"ll-{i}\">\n"));
        reflist(&mut out, "coveredBy", &covered[i]);
        val(&mut out, "name", &p.label);
        reflist(&mut out, "presentation", &[format!("lli-{i}")]);
        out.push_str("</Lifeline>\n");
    }

    // ── Model: messages + occurrence specifications ─────────────────────────
    for (k, m) in lay.msgs.iter().enumerate() {
        out.push_str(&format!("<Message id=\"msg-{k}\">\n"));
        if let Some(sort) = sort_literal(m.sort) {
            val(&mut out, "messageSort", sort);
        }
        val(&mut out, "name", &m.text);
        reflist(&mut out, "presentation", &[format!("mi-{k}")]);
        rref(&mut out, "receiveEvent", &format!("rcv-{k}"));
        rref(&mut out, "sendEvent", &format!("snd-{k}"));
        out.push_str("</Message>\n");

        out.push_str(&format!(
            "<MessageOccurrenceSpecification id=\"snd-{k}\">\n"
        ));
        rref(&mut out, "covered", &format!("ll-{}", m.from));
        rref(&mut out, "sendMessage", &format!("msg-{k}"));
        out.push_str("</MessageOccurrenceSpecification>\n");

        out.push_str(&format!(
            "<MessageOccurrenceSpecification id=\"rcv-{k}\">\n"
        ));
        rref(&mut out, "covered", &format!("ll-{}", m.to));
        rref(&mut out, "receiveMessage", &format!("msg-{k}"));
        out.push_str("</MessageOccurrenceSpecification>\n");
    }

    out.push_str("<StyleSheet id=\"css\"/>\n");
    out.push_str("</gaphor>\n");
    out
}

// ── XML helpers ─────────────────────────────────────────────────────────────

/// `<name><val>TEXT</val></name>` (XML-escaped).
fn val(out: &mut String, name: &str, text: &str) {
    out.push('<');
    out.push_str(name);
    out.push_str(">\n<val>");
    xml_escape(text, out);
    out.push_str("</val>\n</");
    out.push_str(name);
    out.push_str(">\n");
}

/// `<name><val>N</val></name>` for an integer.
fn ival(out: &mut String, name: &str, n: i64) {
    out.push_str(&format!("<{name}>\n<val>{n}</val>\n</{name}>\n"));
}

/// `<name><val>N.0</val></name>` for a float (Gaphor stores geometry as floats).
fn fval(out: &mut String, name: &str, n: i64) {
    out.push_str(&format!("<{name}>\n<val>{n}.0</val>\n</{name}>\n"));
}

/// `<name><ref refid="ID"/></name>`.
fn rref(out: &mut String, name: &str, id: &str) {
    out.push_str(&format!("<{name}>\n<ref refid=\"{id}\"/>\n</{name}>\n"));
}

/// `<name><reflist><ref refid="…"/>…</reflist></name>`.
fn reflist(out: &mut String, name: &str, ids: &[String]) {
    out.push_str(&format!("<{name}>\n<reflist>\n"));
    for id in ids {
        out.push_str(&format!("<ref refid=\"{id}\"/>\n"));
    }
    out.push_str(&format!("</reflist>\n</{name}>\n"));
}

/// `<matrix><val>(1.0, 0.0, 0.0, 1.0, e.0, f.0)</val></matrix>`.
fn matrix(out: &mut String, e: i64, f: i64) {
    out.push_str(&format!(
        "<matrix>\n<val>(1.0, 0.0, 0.0, 1.0, {e}.0, {f}.0)</val>\n</matrix>\n"
    ));
}

fn xml_escape(s: &str, out: &mut String) {
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            c => out.push(c),
        }
    }
}

/// Gaphor `messageSort` literal, or `None` for the default `synchCall`.
fn sort_literal(sort: MessageSort) -> Option<&'static str> {
    match sort {
        MessageSort::SynchCall => None,
        other => Some(other.uml()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mermaid::parse_sequence;

    fn gaphor(src: &str) -> String {
        to_gaphor(&parse_sequence(src).unwrap())
    }

    #[test]
    fn root_and_model_present() {
        let out = gaphor("sequenceDiagram\nAlice->>Bob: hi");
        assert!(
            out.contains("<gaphor xmlns=\"http://gaphor.sourceforge.net/model\" version=\"3.0\"")
        );
        assert!(out.contains("<Lifeline id=\"ll-0\">"));
        assert!(out.contains("<val>Alice</val>"));
        assert!(out.contains("<val>Bob</val>"));
        assert!(out.contains("<MessageItem"));
        assert!(out.contains("<MessageOccurrenceSpecification"));
        assert!(out.trim_end().ends_with("</gaphor>"));
    }

    #[test]
    fn synch_call_omits_sort_reply_keeps_it() {
        let out = gaphor("sequenceDiagram\nA->>B: c\nB-->>A: r");
        // First message is synchCall → no messageSort tag for it.
        assert!(out.contains("<messageSort>\n<val>reply</val>"));
        assert_eq!(out.matches("<messageSort>").count(), 1);
    }

    #[test]
    fn fragments_flattened_messages_kept() {
        // alt/loop are not representable; the inner messages must still appear.
        let out = gaphor("sequenceDiagram\nalt ok\nA->>B: yes\nelse no\nA->>B: never\nend");
        assert!(!out.contains("CombinedFragment"));
        assert!(out.contains("<val>yes</val>"));
        assert!(out.contains("<val>never</val>"));
    }

    #[test]
    fn deterministic() {
        let src = "sequenceDiagram\nA->>+B: go\nB-->>-A: done";
        assert_eq!(gaphor(src), gaphor(src));
    }
}
