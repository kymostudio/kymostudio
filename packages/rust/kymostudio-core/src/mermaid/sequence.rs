//! Mermaid `sequenceDiagram` front-end → [`crate::sequence::Sequence`].
//!
//! Line-oriented (Mermaid uses no `;` separator in sequence diagrams, so each
//! statement is one source line). The header is stripped by
//! [`crate::mermaid::parse_sequence`]; this module parses the body.
//!
//! Supported grammar (the common Mermaid subset):
//! - `participant X` / `participant X as Label` / `actor X` / `actor X as Label`
//!   (implicit participants are created in first-appearance order from messages);
//! - messages `A<arrow>B: text`, arrow → [`MessageSort`]:
//!   `->>`→synchCall, `-->>`→reply, `-)`/`--)`→asynchCall, `-x`/`--x`→asynchCall,
//!   `->`/`-->`→asynchSignal; with `+`/`-` activation shorthand after the arrow;
//! - `activate X` / `deactivate X`;
//! - `Note left of X: t` / `Note right of X: t` / `Note over X[,Y]: t`;
//! - combined fragments `loop` / `alt`…`else`…  / `opt` / `par`…`and`… `end`.
//!
//! Unknown styling directives (`autonumber`, `box`, `rect`, `title`, `link`,
//! `create`/`destroy`, …) are accepted and ignored rather than erroring.

use crate::mermaid::MermaidError;
use crate::sequence::{
    Fragment, FragmentOp, Item, Message, MessageSort, Note, NotePlacement, Operand, Participant,
    Sequence,
};

/// An open combined fragment while parsing — accumulates operands.
struct FragFrame {
    operator: FragmentOp,
    operands: Vec<Operand>,
    cur_guard: String,
    cur_items: Vec<Item>,
}

/// Mermaid arrow tokens → [`MessageSort`]. Order is irrelevant: the scanner
/// picks the match at the earliest index, longest at that index (so `-->>`
/// wins over `-->` / `->>`).
/// Mermaid-11 bidirectional arrows (a head at both ends), matched before the
/// one-directional table. Longest first so `<<-->>` wins over `<<->>`.
const BIDIR: &[(&str, MessageSort)] = &[
    ("<<-->>", MessageSort::Reply),    // dashed, both ends
    ("<<->>", MessageSort::SynchCall), // solid, both ends
];

const ARROWS: &[(&str, MessageSort)] = &[
    ("-->>", MessageSort::Reply),
    ("-->", MessageSort::AsynchSignal),
    ("--x", MessageSort::AsynchCall),
    ("--)", MessageSort::AsynchCall),
    ("->>", MessageSort::SynchCall),
    ("->", MessageSort::AsynchSignal),
    ("-x", MessageSort::AsynchCall),
    ("-)", MessageSort::AsynchCall),
];

/// Parse the body statements (header already stripped) into a [`Sequence`].
pub fn parse_sequence(stmts: &[(usize, String)]) -> Result<Sequence, MermaidError> {
    let mut seq = Sequence {
        participants: Vec::new(),
        items: Vec::new(),
        autonumber: false,
        auto_start: 1,
        auto_step: 1,
        title: String::new(),
        boxes: Vec::new(),
    };
    let mut stack: Vec<FragFrame> = Vec::new();
    let mut box_group: Option<(String, Vec<String>)> = None;

    for (lineno, raw) in stmts {
        let stmt = raw.trim();
        if stmt.is_empty() {
            continue;
        }
        let lower = stmt.to_ascii_lowercase();

        // Participant / actor declarations.
        if let Some(rest) = strip_kw(stmt, "participant") {
            let before = seq.participants.len();
            ensure_decl(&mut seq, rest, false);
            capture_box(&seq, before, &mut box_group);
            continue;
        }
        if let Some(rest) = strip_kw(stmt, "actor") {
            let before = seq.participants.len();
            ensure_decl(&mut seq, rest, true);
            capture_box(&seq, before, &mut box_group);
            continue;
        }
        // `create [participant|actor] X as Y` — declare the lifeline (mid-diagram
        // creation is not modelled visually; the alias still matters).
        if let Some(rest) = strip_kw(stmt, "create") {
            let actor = strip_kw(rest, "actor").is_some();
            let decl = strip_kw(rest, "participant")
                .or_else(|| strip_kw(rest, "actor"))
                .unwrap_or(rest);
            let before = seq.participants.len();
            ensure_decl(&mut seq, decl, actor);
            capture_box(&seq, before, &mut box_group);
            continue;
        }
        // `destroy X` — the lifeline ends; no effect on a static render.
        if strip_kw(stmt, "destroy").is_some() {
            continue;
        }
        // `title` line.
        if lower == "title" || lower.starts_with("title ") || lower.starts_with("title:") {
            seq.title = stmt[5..].trim_start_matches(':').trim().to_string();
            continue;
        }
        // `box [colour] label` opens a participant grouping.
        if let Some(rest) = strip_kw(stmt, "box") {
            box_group = Some((rest.trim().to_string(), Vec::new()));
            continue;
        }

        // `autonumber [start [step]]` / `autonumber off` — a timeline item so
        // mid-stream changes apply only to subsequent messages.
        if lower == "autonumber" || lower.starts_with("autonumber ") {
            let arg = stmt["autonumber".len()..].trim();
            use crate::sequence::AutoNumber;
            let cmd = if arg.eq_ignore_ascii_case("off") {
                AutoNumber::Off
            } else if arg.is_empty() {
                seq.autonumber = true;
                AutoNumber::On
            } else {
                let nums: Vec<i64> = arg
                    .split_whitespace()
                    .filter_map(|w| w.parse().ok())
                    .collect();
                let start = nums.first().copied().unwrap_or(1);
                let step = nums.get(1).copied().unwrap_or(1);
                seq.autonumber = true;
                seq.auto_start = start;
                seq.auto_step = step;
                AutoNumber::Set(start, step)
            };
            push_item(&mut seq, &mut stack, crate::sequence::Item::Autonumber(cmd));
            continue;
        }

        // Combined-fragment control.
        if let Some((op, guard)) = frag_open(&lower, stmt) {
            stack.push(FragFrame {
                operator: op,
                operands: Vec::new(),
                cur_guard: guard,
                cur_items: Vec::new(),
            });
            continue;
        }
        if lower == "else" || lower.starts_with("else ") {
            if !stack.is_empty() {
                new_operand(&mut stack, *lineno, stmt["else".len()..].trim().to_string())?;
            }
            continue;
        }
        if lower == "and" || lower.starts_with("and ") {
            if !stack.is_empty() {
                new_operand(&mut stack, *lineno, stmt["and".len()..].trim().to_string())?;
            }
            continue;
        }
        if lower == "option" || lower.starts_with("option ") {
            if !stack.is_empty() {
                new_operand(
                    &mut stack,
                    *lineno,
                    stmt["option".len()..].trim().to_string(),
                )?;
            }
            continue;
        }
        if lower == "end" {
            if !stack.is_empty() {
                close_fragment(&mut seq, &mut stack);
            } else if let Some((label, members)) = box_group.take() {
                seq.boxes.push(crate::sequence::BoxGroup { label, members });
            }
            continue;
        }

        // activate / deactivate.
        if let Some(rest) = strip_kw(stmt, "activate") {
            let id = rest.trim().to_string();
            ensure_participant(&mut seq, &id);
            push_item(&mut seq, &mut stack, Item::Activate(id));
            continue;
        }
        if let Some(rest) = strip_kw(stmt, "deactivate") {
            let id = rest.trim().to_string();
            ensure_participant(&mut seq, &id);
            push_item(&mut seq, &mut stack, Item::Deactivate(id));
            continue;
        }

        // Note.
        if let Some(note) = parse_note(stmt) {
            for t in &note.targets {
                ensure_participant(&mut seq, t);
            }
            push_item(&mut seq, &mut stack, Item::Note(note));
            continue;
        }

        // Message.
        if let Some(msg) = parse_message(stmt) {
            ensure_participant(&mut seq, &msg.from);
            ensure_participant(&mut seq, &msg.to);
            push_item(&mut seq, &mut stack, Item::Message(msg));
            continue;
        }

        // Unknown directive (box / rect / title / link / create / …) — ignore.
    }

    // Auto-close any unbalanced fragments (lenient).
    while !stack.is_empty() {
        close_fragment(&mut seq, &mut stack);
    }
    Ok(seq)
}

/// If a participant was just added inside an open `box`, record its id.
fn capture_box(
    seq: &crate::sequence::Sequence,
    before: usize,
    box_group: &mut Option<(String, Vec<String>)>,
) {
    if let Some((_, members)) = box_group.as_mut() {
        if seq.participants.len() > before {
            if let Some(p) = seq.participants.last() {
                members.push(p.id.clone());
            }
        }
    }
}

/// `loop`/`alt`/`opt`/`par`/`critical`/`break` opener → (operator, guard label).
fn frag_open(lower: &str, stmt: &str) -> Option<(FragmentOp, String)> {
    for (kw, op) in [
        ("loop", FragmentOp::Loop),
        ("alt", FragmentOp::Alt),
        ("opt", FragmentOp::Opt),
        ("par_over", FragmentOp::Par),
        ("par", FragmentOp::Par),
        ("critical", FragmentOp::Critical),
        ("break", FragmentOp::Break),
        ("rect", FragmentOp::Rect),
    ] {
        if lower == kw
            || lower
                .strip_prefix(kw)
                .is_some_and(|r| r.starts_with([' ', '\t', ';', '#']))
        {
            let guard = stmt[kw.len()..].trim_start_matches([';', '#']).trim();
            return Some((op, guard.to_string()));
        }
    }
    None
}

/// Push an item into the current container (innermost fragment, else root).
fn push_item(seq: &mut Sequence, stack: &mut [FragFrame], item: Item) {
    match stack.last_mut() {
        Some(frame) => frame.cur_items.push(item),
        None => seq.items.push(item),
    }
}

/// Start a new operand (`else` / `and`) in the innermost open fragment.
fn new_operand(stack: &mut [FragFrame], lineno: usize, guard: String) -> Result<(), MermaidError> {
    let frame = stack.last_mut().ok_or(MermaidError::Syntax {
        line: lineno,
        msg: "`else`/`and` outside a combined fragment".to_string(),
    })?;
    let items = std::mem::take(&mut frame.cur_items);
    let prev_guard = std::mem::take(&mut frame.cur_guard);
    frame.operands.push(Operand {
        guard: prev_guard,
        items,
    });
    frame.cur_guard = guard;
    Ok(())
}

/// Close the innermost fragment and append it to its parent container.
fn close_fragment(seq: &mut Sequence, stack: &mut Vec<FragFrame>) {
    let mut frame = stack.pop().expect("close_fragment called with empty stack");
    let items = std::mem::take(&mut frame.cur_items);
    frame.operands.push(Operand {
        guard: std::mem::take(&mut frame.cur_guard),
        items,
    });
    let fragment = Fragment {
        operator: frame.operator,
        operands: frame.operands,
    };
    push_item(seq, stack, Item::Fragment(fragment));
}

/// `participant`/`actor` declaration body → upsert a participant.
fn ensure_decl(seq: &mut Sequence, rest: &str, is_actor: bool) {
    let rest = rest.trim();
    if rest.is_empty() {
        return;
    }
    let (id, label) = match split_as(rest) {
        Some((l, r)) => (l.trim().to_string(), r.trim().to_string()),
        None => (rest.to_string(), rest.to_string()),
    };
    if let Some(p) = seq.participants.iter_mut().find(|p| p.id == id) {
        p.label = label;
        p.is_actor = p.is_actor || is_actor;
    } else {
        seq.participants.push(Participant {
            id,
            label,
            is_actor,
        });
    }
}

/// Create a participant on first reference if it was never declared.
fn ensure_participant(seq: &mut Sequence, id: &str) {
    if !seq.participants.iter().any(|p| p.id == id) {
        seq.participants.push(Participant {
            id: id.to_string(),
            label: id.to_string(),
            is_actor: false,
        });
    }
}

/// Split on a case-insensitive ` as ` separator.
fn split_as(s: &str) -> Option<(&str, &str)> {
    let lower = s.to_ascii_lowercase();
    lower.find(" as ").map(|i| (&s[..i], &s[i + 4..]))
}

/// Strip a leading keyword that is followed by whitespace (case-insensitive).
fn strip_kw<'a>(stmt: &'a str, kw: &str) -> Option<&'a str> {
    let bytes = stmt.as_bytes();
    if bytes.len() > kw.len()
        && bytes[..kw.len()].eq_ignore_ascii_case(kw.as_bytes())
        && bytes[kw.len()].is_ascii_whitespace()
    {
        Some(stmt[kw.len()..].trim_start())
    } else {
        None
    }
}

/// Strip a case-insensitive ASCII prefix.
fn strip_ci<'a>(s: &'a str, prefix: &str) -> Option<&'a str> {
    let bytes = s.as_bytes();
    if bytes.len() >= prefix.len() && bytes[..prefix.len()].eq_ignore_ascii_case(prefix.as_bytes())
    {
        Some(&s[prefix.len()..])
    } else {
        None
    }
}

/// Parse `Note left of X: t` / `Note right of X: t` / `Note over X[,Y]: t`.
fn parse_note(stmt: &str) -> Option<Note> {
    let rest = strip_kw(stmt, "note")?;
    let (placement, after) = if let Some(r) = strip_ci(rest, "left of ") {
        (NotePlacement::LeftOf, r)
    } else if let Some(r) = strip_ci(rest, "right of ") {
        (NotePlacement::RightOf, r)
    } else if let Some(r) = strip_ci(rest, "over ") {
        (NotePlacement::Over, r)
    } else {
        return None;
    };
    let (targets_part, text) = match after.split_once(':') {
        Some((t, x)) => (t.trim(), x.trim().to_string()),
        None => (after.trim(), String::new()),
    };
    let targets: Vec<String> = targets_part
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if targets.is_empty() {
        return None;
    }
    Some(Note {
        placement,
        targets,
        text,
    })
}

/// Parse a message `A<arrow>B: text` (with optional `+`/`-` activation).
fn parse_message(stmt: &str) -> Option<Message> {
    let (left, text) = match stmt.split_once(':') {
        Some((l, r)) => (l.trim(), r.trim().to_string()),
        None => (stmt.trim(), String::new()),
    };
    let (start, end, sort, bidirectional) = find_arrow(left)?;
    let from = left[..start].trim().to_string();
    let mut rhs = left[end..].trim();
    let mut activate_target = false;
    let mut deactivate_source = false;
    if let Some(r) = rhs.strip_prefix('+') {
        activate_target = true;
        rhs = r.trim_start();
    } else if let Some(r) = rhs.strip_prefix('-') {
        deactivate_source = true;
        rhs = r.trim_start();
    }
    let to = rhs.trim().to_string();
    if from.is_empty() || to.is_empty() {
        return None;
    }
    Some(Message {
        from,
        to,
        text,
        sort,
        activate_target,
        deactivate_source,
        bidirectional,
    })
}

/// Locate the message arrow: bidirectional arrows first, then the
/// one-directional table (earliest start index, longest match at that index).
/// Returns `(start, end, sort, bidirectional)`.
fn find_arrow(left: &str) -> Option<(usize, usize, MessageSort, bool)> {
    for (pat, sort) in BIDIR {
        if let Some(start) = left.find(pat) {
            return Some((start, start + pat.len(), *sort, true));
        }
    }
    let mut best: Option<(usize, usize, MessageSort)> = None;
    for (pat, sort) in ARROWS {
        if let Some(start) = left.find(pat) {
            let end = start + pat.len();
            best = match best {
                Some((bs, be, _)) if bs < start || (bs == start && be >= end) => best,
                _ => Some((start, end, *sort)),
            };
        }
    }
    best.map(|(s, e, sort)| (s, e, sort, false))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(src: &str) -> Sequence {
        let stmts: Vec<(usize, String)> = src
            .lines()
            .enumerate()
            .map(|(i, l)| (i + 1, l.trim().to_string()))
            .filter(|(_, s)| !s.is_empty())
            .collect();
        parse_sequence(&stmts).unwrap()
    }

    #[test]
    fn arrow_sorts() {
        assert_eq!(find_arrow("A->>B").unwrap().2, MessageSort::SynchCall);
        assert_eq!(find_arrow("A-->>B").unwrap().2, MessageSort::Reply);
        // bidirectional arrows are detected with the both-ends flag set
        let (_, _, sort, bidi) = find_arrow("A<<->>B").unwrap();
        assert!(bidi && sort == MessageSort::SynchCall);
        let (_, _, sort, bidi) = find_arrow("A<<-->>B").unwrap();
        assert!(bidi && sort == MessageSort::Reply);
        assert_eq!(find_arrow("A->B").unwrap().2, MessageSort::AsynchSignal);
        assert_eq!(find_arrow("A-->B").unwrap().2, MessageSort::AsynchSignal);
        assert_eq!(find_arrow("A-)B").unwrap().2, MessageSort::AsynchCall);
        assert_eq!(find_arrow("A--xB").unwrap().2, MessageSort::AsynchCall);
        assert!(find_arrow("A B").is_none());
    }

    #[test]
    fn implicit_participants_in_order() {
        let s = parse("Alice->>John: Hi\nJohn-->>Alice: Hello\nAlice->>Bob: Hey");
        let ids: Vec<_> = s.participants.iter().map(|p| p.id.as_str()).collect();
        assert_eq!(ids, ["Alice", "John", "Bob"]);
    }

    #[test]
    fn explicit_decl_with_alias_and_actor() {
        let s = parse("participant A as Alice\nactor B as Bob\nA->>B: Hi");
        assert_eq!(s.participants[0].id, "A");
        assert_eq!(s.participants[0].label, "Alice");
        assert!(!s.participants[0].is_actor);
        assert_eq!(s.participants[1].id, "B");
        assert_eq!(s.participants[1].label, "Bob");
        assert!(s.participants[1].is_actor);
    }

    #[test]
    fn activation_shorthand() {
        let s = parse("Alice->>+John: Hi\nJohn-->>-Alice: Bye");
        let Item::Message(m0) = &s.items[0] else {
            panic!()
        };
        assert!(m0.activate_target && !m0.deactivate_source);
        let Item::Message(m1) = &s.items[1] else {
            panic!()
        };
        assert!(m1.deactivate_source && !m1.activate_target);
    }

    #[test]
    fn nested_fragments_and_operands() {
        let s = parse(
            "alt is ok\nA->>B: yes\nelse not ok\nA->>B: no\nloop retry\nB->>A: again\nend\nend",
        );
        assert_eq!(s.items.len(), 1);
        let Item::Fragment(alt) = &s.items[0] else {
            panic!("expected fragment")
        };
        assert_eq!(alt.operator, FragmentOp::Alt);
        assert_eq!(alt.operands.len(), 2);
        assert_eq!(alt.operands[0].guard, "is ok");
        assert_eq!(alt.operands[1].guard, "not ok");
        // The nested loop lives inside the second operand, after its message.
        assert!(matches!(alt.operands[1].items[1], Item::Fragment(_)));
    }

    #[test]
    fn note_over_two() {
        let s = parse("A->>B: hi\nNote over A,B: shared\nNote left of A: solo");
        let Item::Note(n0) = &s.items[1] else {
            panic!()
        };
        assert_eq!(n0.placement, NotePlacement::Over);
        assert_eq!(n0.targets, ["A", "B"]);
        assert_eq!(n0.text, "shared");
        let Item::Note(n1) = &s.items[2] else {
            panic!()
        };
        assert_eq!(n1.placement, NotePlacement::LeftOf);
    }

    #[test]
    fn autonumber_title_box_and_note() {
        let s = parse(
            "sequenceDiagram\ntitle My Flow\nautonumber 10 5\nbox Aqua Group\nparticipant A\nparticipant B\nend\nA->>B: hi\nNote over A,B: shared",
        );
        assert_eq!(s.title, "My Flow");
        assert!(s.autonumber && s.auto_start == 10 && s.auto_step == 5);
        assert_eq!(s.boxes.len(), 1);
        assert_eq!(s.boxes[0].members, vec!["A".to_string(), "B".to_string()]);
        assert!(s
            .items
            .iter()
            .any(|i| matches!(i, crate::sequence::Item::Note(n) if n.text == "shared")));
    }

    #[test]
    fn autonumber_timeline_midstream() {
        use crate::sequence::Item;
        let s =
            parse("sequenceDiagram\nA->>B: a\nautonumber 10 5\nA->>B: b\nautonumber off\nA->>B: c");
        use crate::sequence::AutoNumber;
        let autos: Vec<_> = s
            .items
            .iter()
            .filter_map(|i| match i {
                Item::Autonumber(cmd) => Some(*cmd),
                _ => None,
            })
            .collect();
        assert_eq!(autos, vec![AutoNumber::Set(10, 5), AutoNumber::Off]);
    }

    #[test]
    fn create_destroy_and_aliases() {
        let s = parse(
            "sequenceDiagram\nA->>B: x\ncreate participant W as Worker\nA->>W: go\ndestroy W",
        );
        // the created participant keeps its alias label
        assert!(s
            .participants
            .iter()
            .any(|p| p.id == "W" && p.label == "Worker"));
    }

    #[test]
    fn lenient_stray_else_and_boundary_openers() {
        // A stray `else`/`and` with no open fragment must not error (mermaid is
        // lenient) — the messages still parse.
        let s = parse("sequenceDiagram\nAlice->Bob: hi\nelse oops\nBob-->Alice: ok");
        assert_eq!(s.items.len(), 2);
        // A fragment opener terminated by `;` (not a space) still opens.
        let s = parse("sequenceDiagram\nalt;A->>B: x\nelse\nB->>A: y\nend");
        assert!(s
            .items
            .iter()
            .any(|i| matches!(i, crate::sequence::Item::Fragment(_))));
    }

    #[test]
    fn rect_grouping_is_a_rect_fragment() {
        use crate::sequence::{FragmentOp, Item};
        let s = parse("sequenceDiagram\nrect rgb(0,0,255)\nA->>B: x\nend\nA->>B: y");
        let rect = s.items.iter().find_map(|i| match i {
            Item::Fragment(f) if f.operator == FragmentOp::Rect => Some(f),
            _ => None,
        });
        let rect = rect.expect("rect fragment");
        assert_eq!(rect.operands[0].guard, "rgb(0,0,255)");
    }
}
