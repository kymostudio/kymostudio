//! Parse a Mermaid `classDiagram` into the [`crate::classdiagram`] IR.
//!
//! Supports: `class X { … }` blocks and `X : member` shorthand, visibility
//! prefixes, methods (parens) vs attributes, `<<stereotype>>`, generics
//! (`X~T~`), `direction`, and the relationship operators (`<|--`, `*--`, `o--`,
//! `-->`, `..>`, `..|>`, `--`, `..`) with optional `"card"` multiplicities and
//! `: label`. Styling / click / note lines are accepted and ignored.

use super::MermaidError;
use crate::classdiagram::{ClassBox, ClassDiagram, ClassNote, ClassStyle, Crow, RelKind, Relation};
use kymo_graph::flowchart::Direction;
use std::collections::HashMap;

/// Parse class-diagram source into a [`ClassDiagram`].
pub fn parse(src: &str) -> Result<ClassDiagram, MermaidError> {
    let mut lines: Vec<&str> = Vec::new();
    for raw in src.lines() {
        let l = strip_comment(raw).trim_end();
        lines.push(l);
    }
    let header = lines
        .iter()
        .find(|l| !l.trim().is_empty())
        .ok_or(MermaidError::Empty)?;
    if !header
        .trim()
        .to_ascii_lowercase()
        .starts_with("classdiagram")
    {
        return Err(MermaidError::Unsupported(header.trim().to_string()));
    }

    let mut cd = ClassDiagram {
        direction: Direction::Tb,
        classes: Vec::new(),
        relations: Vec::new(),
        notes: Vec::new(),
        namespaces: Vec::new(),
        er: false,
    };
    let mut cur: Option<usize> = None; // open `class X { … }` block
    let mut class_defs: HashMap<String, ClassStyle> = HashMap::new(); // classDef name → style
    let mut style_refs: HashMap<String, Vec<String>> = HashMap::new(); // class id → style names
    let mut ns_stack: Vec<usize> = Vec::new(); // open (nestable) namespaces
    let mut pending_note: Option<String> = None; // unterminated `note "…`
    let mut started = false;
    let mut skip_note = false;

    for raw in &lines {
        let stmt = raw.trim();
        if stmt.is_empty() {
            continue;
        }
        if !started {
            // consume the header line itself
            started = true;
            continue;
        }
        let low = stmt.to_ascii_lowercase();

        if skip_note {
            if low == "end note" {
                skip_note = false;
            }
            continue;
        }
        if let Some(buf) = pending_note.as_mut() {
            if let Some(q) = stmt.find('"') {
                buf.push(' ');
                buf.push_str(&stmt[..q]);
                cd.notes.push(ClassNote {
                    text: note_text(buf),
                    target: None,
                });
                pending_note = None;
            } else {
                buf.push(' ');
                buf.push_str(stmt);
            }
            continue;
        }

        // Inside a `class X { … }` block: lines are members until `}`.
        if let Some(ci) = cur {
            if stmt == "}" || stmt.ends_with('}') {
                let inner = stmt.trim_end_matches('}').trim();
                if !inner.is_empty() {
                    add_member(&mut cd.classes[ci], inner);
                }
                cur = None;
                continue;
            }
            add_member(&mut cd.classes[ci], stmt);
            continue;
        }

        if low.starts_with("direction ") {
            cd.direction = parse_dir(stmt[10..].trim());
            continue;
        }
        // `namespace X { … }` grouping — skip the wrapper; inner classes parse
        // normally, and the matching bare `}` is skipped below.
        if low == "namespace" || low.starts_with("namespace ") {
            let name = stmt[9..].trim().trim_end_matches('{').trim().to_string();
            cd.namespaces.push((name, Vec::new()));
            ns_stack.push(cd.namespaces.len() - 1);
            continue;
        }
        if stmt == "}" {
            ns_stack.pop(); // closes a namespace / stray brace
            continue;
        }
        // notes: `note "text"`, `note for X "text"`, or a `note … end note` block.
        if low == "note" || low.starts_with("note ") {
            let rest = stmt[4..].trim();
            if let Some(r) = rest.strip_prefix("for ") {
                let (tgt, text) = split_note_target(r);
                cd.notes.push(ClassNote {
                    text: note_text(&text),
                    target: Some(tgt),
                });
            } else if let Some(body) = rest.strip_prefix('"') {
                if let Some(q) = body.find('"') {
                    cd.notes.push(ClassNote {
                        text: note_text(&body[..q]),
                        target: None,
                    });
                } else {
                    pending_note = Some(body.to_string());
                }
            } else if rest.is_empty() {
                skip_note = true;
            }
            continue;
        }
        // `classDef name fill:#f9f,stroke:#333,...` — define a reusable style.
        if low.starts_with("classdef ") {
            let rest = stmt[9..].trim();
            if let Some((name, props)) = rest.split_once(char::is_whitespace) {
                class_defs.insert(name.trim().to_string(), parse_class_style(props));
            }
            continue;
        }
        // `cssClass "id1,id2" styleName` — apply a style to listed classes.
        if low.starts_with("cssclass ") {
            let rest = stmt[9..].trim();
            if let Some((ids, name)) = rest.rsplit_once(char::is_whitespace) {
                let name = name.trim().to_string();
                for id in ids.trim().trim_matches('"').split(',') {
                    style_refs.entry(id.trim().to_string()).or_default().push(name.clone());
                }
            }
            continue;
        }
        if low.starts_with("style ")
            || low.starts_with("click ")
            || low.starts_with("callback ")
            || low.starts_with("link ")
            || low.starts_with("acctitle")
            || low.starts_with("accdescr")
        {
            continue;
        }

        // `class X`, optionally with a `{` opening a block.
        if low == "class" || low.starts_with("class ") {
            let rest = stmt[5..].trim();
            let opens = rest.ends_with('{');
            let head = rest.trim_end_matches('{').trim();
            // `class X:::styleName` — record the inline style reference.
            if let Some((base, sty)) = head.split_once(":::") {
                let key = decl_class_key(base);
                style_refs.entry(key).or_default().push(sty.trim().to_string());
            }
            let ci = decl_class(&mut cd.classes, head);
            let id = cd.classes[ci].id.clone();
            for &n in &ns_stack {
                if !cd.namespaces[n].1.contains(&id) {
                    cd.namespaces[n].1.push(id.clone());
                }
            }
            if opens {
                cur = Some(ci);
            }
            continue;
        }

        // A relationship line has a relationship operator.
        if let Some(rel) = parse_relation(stmt) {
            decl_class(&mut cd.classes, &rel.from);
            decl_class(&mut cd.classes, &rel.to);
            cd.relations.push(rel);
            continue;
        }

        // `X : member` shorthand (member added to class X).
        if let Some((id, member)) = stmt.split_once(':') {
            let id = id.trim();
            if !id.is_empty() {
                let ci = decl_class(&mut cd.classes, id);
                add_member(&mut cd.classes[ci], member.trim());
            }
            continue;
        }

        // A bare token — declare the class.
        decl_class(&mut cd.classes, stmt);
    }

    // Resolve `classDef` styles onto each class (later refs win per property).
    for c in &mut cd.classes {
        if let Some(names) = style_refs.get(&c.id) {
            for n in names {
                if let Some(st) = class_defs.get(n) {
                    if st.fill.is_some() {
                        c.style.fill = st.fill.clone();
                    }
                    if st.stroke.is_some() {
                        c.style.stroke = st.stroke.clone();
                    }
                    if st.stroke_width.is_some() {
                        c.style.stroke_width = st.stroke_width.clone();
                    }
                    if st.color.is_some() {
                        c.style.color = st.color.clone();
                    }
                }
            }
        }
    }
    Ok(cd)
}

/// Parse `fill:#f9f,stroke:#333,stroke-width:6px,color:#fff` into a [`ClassStyle`].
fn parse_class_style(props: &str) -> ClassStyle {
    let mut s = ClassStyle::default();
    for kv in props.split(',') {
        if let Some((k, v)) = kv.split_once(':') {
            let v = v.trim().to_string();
            match k.trim().to_ascii_lowercase().as_str() {
                "fill" => s.fill = Some(v),
                "stroke" => s.stroke = Some(v),
                // SVG presentation attrs want a unitless length — drop the `px`.
                "stroke-width" => {
                    s.stroke_width = Some(v.trim_end_matches("px").trim().to_string())
                }
                "color" => s.color = Some(v),
                _ => {}
            }
        }
    }
    s
}

/// The canonical class id for a head (strips `:::`, `["…"]`, `~T~`, quotes).
fn decl_class_key(head: &str) -> String {
    let head = head.split(":::").next().unwrap_or(head).trim();
    let head = match head.find('[') {
        Some(b) if head.ends_with(']') => head[..b].trim(),
        _ => head,
    };
    let id_part = head.split_once('~').map(|(a, _)| a.trim()).unwrap_or(head);
    id_part.trim_matches('"').trim().to_string()
}

/// `note for X "text"` → (X, text).
fn split_note_target(s: &str) -> (String, String) {
    let s = s.trim();
    if let Some(q) = s.find('"') {
        let tgt = s[..q].trim().trim_matches('"').to_string();
        let text = s[q..].trim().trim_matches('"').to_string();
        (tgt, text)
    } else {
        (s.to_string(), String::new())
    }
}

/// Fold escaped/`<br>` line breaks in a note to spaces.
fn note_text(s: &str) -> String {
    s.replace("\\n", " ")
        .replace("<br>", " ")
        .replace("<br/>", " ")
        .trim()
        .to_string()
}

fn strip_comment(line: &str) -> &str {
    match line.find("%%") {
        Some(i) => &line[..i],
        None => line,
    }
}

fn parse_dir(tok: &str) -> Direction {
    match tok.to_ascii_uppercase().as_str() {
        "LR" => Direction::Lr,
        "RL" => Direction::Rl,
        "BT" => Direction::Bt,
        _ => Direction::Tb,
    }
}

/// Find or create a class by id. Accepts `Id`, `Id~T~` generics, `"label"`, and
/// an inline `:::class` is stripped. Returns its index.
fn decl_class(classes: &mut Vec<ClassBox>, head: &str) -> usize {
    let head = head.split(":::").next().unwrap_or(head).trim();
    // `Id["display label"]` — a bracketed text label overrides the shown name.
    let (head, label) = match head.find('[') {
        Some(b) if head.ends_with(']') => (
            head[..b].trim(),
            Some(decode_entities(head[b + 1..head.len() - 1].trim().trim_matches('"'))),
        ),
        _ => (head, None),
    };
    // generics: Box~T~  → id "Box", remember "T" is part of the name text.
    let (id_part, generic) = match head.split_once('~') {
        Some((a, b)) => (a.trim(), b.trim_end_matches('~').trim()),
        None => (head, ""),
    };
    let id = id_part.trim_matches('"').trim();
    if id.is_empty() {
        return 0;
    }
    let name = match &label {
        Some(l) => l.clone(),
        None if generic.is_empty() => id.to_string(),
        None => format!("{id}<{generic}>"),
    };
    if let Some(i) = classes.iter().position(|c| c.id == id) {
        if label.is_some() {
            classes[i].name = name; // a later `class Id["label"]` sets the display name
        }
        return i;
    }
    classes.push(ClassBox {
        id: id.to_string(),
        name,
        ..Default::default()
    });
    classes.len() - 1
}

/// Decode the HTML entities mermaid uses in labels/members (`&lt;`→`<`, …).
fn decode_entities(s: &str) -> String {
    s.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#35;", "#")
        .replace("&amp;", "&")
}

/// Add a member line to a class: `<<stereotype>>`, a method (`()`), or an
/// attribute. Leading visibility markers are kept verbatim.
fn add_member(c: &mut ClassBox, raw: &str) {
    let decoded = decode_entities(raw.trim());
    let m = decoded.trim();
    if m.is_empty() {
        return;
    }
    if let Some(s) = m.strip_prefix("<<").and_then(|x| x.strip_suffix(">>")) {
        c.stereotype = s.trim().to_string();
        return;
    }
    if m.contains('(') {
        c.methods.push(m.to_string());
    } else {
        c.attributes.push(m.to_string());
    }
}

/// Find the relationship operator in a class line and split it into a relation.
fn parse_relation(stmt: &str) -> Option<Relation> {
    let (lhs, label) = match stmt.split_once(':') {
        Some((l, r)) => (l.trim(), r.trim().to_string()),
        None => (stmt.trim(), String::new()),
    };
    let (start, end) = find_rel_op(lhs)?;
    let op = &lhs[start..end];
    let (kind, dashed, head_at_from) = classify(op);
    let (from, from_card) = side(lhs[..start].trim());
    let (to, to_card) = side(lhs[end..].trim());
    if from.is_empty() || to.is_empty() {
        return None;
    }
    Some(Relation {
        from,
        to,
        kind,
        dashed,
        head_at_from,
        label,
        from_card,
        to_card,
        from_crow: Crow::None,
        to_crow: Crow::None,
    })
}

/// Locate the relationship operator: the longest run of relationship chars
/// (`< > | * o . -`) that contains a `-` or `.` (so a stray `o` in a name is
/// not mistaken for one).
fn find_rel_op(s: &str) -> Option<(usize, usize)> {
    let bytes: Vec<(usize, char)> = s.char_indices().collect();
    let is_rel = |c: char| matches!(c, '<' | '>' | '|' | '*' | 'o' | '.' | '-' | '(' | ')');
    let mut i = 0;
    let mut best: Option<(usize, usize)> = None;
    while i < bytes.len() {
        if is_rel(bytes[i].1) {
            let mut j = i;
            while j < bytes.len() && is_rel(bytes[j].1) {
                j += 1;
            }
            let run: String = bytes[i..j].iter().map(|(_, c)| *c).collect();
            let has_conn = run.contains('-') || run.contains('.');
            if has_conn && run.len() >= 2 {
                let bs = bytes[i].0;
                let be = if j < bytes.len() { bytes[j].0 } else { s.len() };
                if best.map_or(true, |(_, e)| be - bs > e) {
                    best = Some((bs, be));
                }
            }
            i = j;
        } else {
            i += 1;
        }
    }
    best
}

/// Classify an operator → (kind, dashed, head-at-from).
fn classify(op: &str) -> (RelKind, bool, bool) {
    let dashed = op.contains('.');
    // Which end carries the decoration?
    let left =
        op.starts_with('<') || op.starts_with('|') || op.starts_with('*') || op.starts_with('o');
    let head_at_from = left;
    let deco = if left {
        op.chars().next().unwrap_or('-')
    } else {
        op.chars().last().unwrap_or('-')
    };
    if op.contains('(') || op.contains(')') {
        // lollipop interface notation — treat as a plain link.
        return (RelKind::Link, dashed, false);
    }
    let kind = match deco {
        '|' | '<' if op.contains('|') => {
            if dashed {
                RelKind::Realization
            } else {
                RelKind::Inheritance
            }
        }
        '*' => RelKind::Composition,
        'o' => RelKind::Aggregation,
        '>' | '<' => {
            if dashed {
                RelKind::Dependency
            } else {
                RelKind::Association
            }
        }
        _ => RelKind::Link,
    };
    (kind, dashed, head_at_from)
}

/// Split a relation side into `(id, multiplicity)` — `"1" Cart` / `Cart "*"`.
fn side(s: &str) -> (String, String) {
    let s = s.trim();
    if s.is_empty() {
        return (String::new(), String::new());
    }
    // multiplicity is a quoted token on either side of the id.
    if let Some(rest) = s.strip_prefix('"') {
        if let Some(q) = rest.find('"') {
            let card = rest[..q].to_string();
            let id = rest[q + 1..].trim().to_string();
            return (clean_id(&id), card);
        }
    }
    if let Some(start) = s.rfind('"') {
        if let Some(open) = s[..start].rfind('"') {
            let card = s[open + 1..start].to_string();
            let id = s[..open].trim().to_string();
            return (clean_id(&id), card);
        }
    }
    (clean_id(s), String::new())
}

fn clean_id(s: &str) -> String {
    s.split(":::")
        .next()
        .unwrap_or(s)
        .split('~')
        .next()
        .unwrap_or(s)
        .trim()
        .trim_matches('"')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::parse;
    use crate::classdiagram::RelKind;

    #[test]
    fn classes_members_relations() {
        let cd = parse(
            "classDiagram\nclass Animal {\n+String name\n+eat()\n}\nAnimal <|-- Dog\nDog \"1\" o-- \"*\" Toy : plays",
        )
        .unwrap();
        let animal = cd.classes.iter().find(|c| c.id == "Animal").unwrap();
        assert_eq!(animal.attributes, vec!["+String name".to_string()]);
        assert_eq!(animal.methods, vec!["+eat()".to_string()]);
        // inheritance: Animal <|-- Dog (head/triangle at Animal = from)
        let inh = cd
            .relations
            .iter()
            .find(|r| r.kind == RelKind::Inheritance)
            .unwrap();
        assert_eq!((inh.from.as_str(), inh.to.as_str()), ("Animal", "Dog"));
        assert!(inh.head_at_from);
        // aggregation with multiplicities + label
        let agg = cd
            .relations
            .iter()
            .find(|r| r.kind == RelKind::Aggregation)
            .unwrap();
        assert_eq!(agg.label, "plays");
        assert_eq!((agg.from_card.as_str(), agg.to_card.as_str()), ("1", "*"));
    }
}
