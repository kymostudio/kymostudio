//! Parse a Mermaid `erDiagram` into the [`crate::classdiagram`] IR so it reuses
//! the class-diagram renderer: entities become boxes (name + attribute rows),
//! relationships become labelled links with crow's-foot cardinality glyphs.
//! (legacy doc line)
//! drawn (no text), but every entity name, attribute and relationship label
//! renders as real `<text>`.

use super::MermaidError;
use crate::classdiagram::{ClassBox, ClassDiagram, Crow, RelKind, Relation};
use kymo_graph::flowchart::Direction;

/// Parse er-diagram source into a [`ClassDiagram`].
pub fn parse(src: &str) -> Result<ClassDiagram, MermaidError> {
    let lines: Vec<&str> = src.lines().map(|l| strip_comment(l).trim_end()).collect();
    let header = lines
        .iter()
        .find(|l| !l.trim().is_empty())
        .ok_or(MermaidError::Empty)?;
    if !header.trim().to_ascii_lowercase().starts_with("erdiagram") {
        return Err(MermaidError::Unsupported(header.trim().to_string()));
    }

    let mut cd = ClassDiagram {
        direction: Direction::Tb,
        classes: Vec::new(),
        relations: Vec::new(),
        notes: Vec::new(),
        namespaces: Vec::new(),
        er: true,
    };
    let mut cur: Option<usize> = None;
    let mut started = false;

    for raw in &lines {
        let stmt = raw.trim();
        if stmt.is_empty() {
            continue;
        }
        if !started {
            started = true;
            continue;
        }
        let low = stmt.to_ascii_lowercase();

        if let Some(ci) = cur {
            if stmt == "}" || stmt.ends_with('}') {
                let inner = stmt.trim_end_matches('}').trim();
                if !inner.is_empty() {
                    cd.classes[ci].attributes.push(attr_text(inner));
                }
                cur = None;
                continue;
            }
            cd.classes[ci].attributes.push(attr_text(stmt));
            continue;
        }

        if low.starts_with("direction ") {
            cd.direction = parse_dir(stmt[10..].trim());
            continue;
        }
        if low.starts_with("title")
            || low.starts_with("acctitle")
            || low.starts_with("accdescr")
            || low.starts_with("style ")
            || low.starts_with("classdef ")
        {
            continue;
        }

        // `ENTITY { … }` block.
        if let Some(pos) = stmt.find('{') {
            if !has_rel_op(&stmt[..pos]) {
                let head = stmt[..pos].trim();
                let ci = decl_entity(&mut cd.classes, head);
                let inner = stmt[pos + 1..].trim_end_matches('}').trim();
                if !inner.is_empty() {
                    cd.classes[ci].attributes.push(attr_text(inner));
                }
                if !stmt.trim_end().ends_with('}') {
                    cur = Some(ci);
                }
                continue;
            }
        }

        // Relationship: `A <crowsfoot> B : label`.
        if let Some(rel) = parse_relation(stmt) {
            decl_entity(&mut cd.classes, &rel.from);
            decl_entity(&mut cd.classes, &rel.to);
            cd.relations.push(rel);
            continue;
        }

        // A bare entity declaration (possibly `NAME["alias"]`).
        decl_entity(&mut cd.classes, stmt);
    }

    Ok(cd)
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

/// Find or create an entity. Accepts `NAME` and `NAME["alias"]`.
fn decl_entity(classes: &mut Vec<ClassBox>, head: &str) -> usize {
    // Strip an inline `:::styleClass` so it doesn't leak into the id/alias.
    let head = head.split(":::").next().unwrap_or(head).trim();
    let (id, alias) = match head.split_once('[') {
        Some((a, b)) => (a.trim(), b.trim_end_matches(']').trim().trim_matches('"')),
        None => (head.trim_matches('"'), ""),
    };
    if id.is_empty() {
        return 0;
    }
    if let Some(i) = classes.iter().position(|c| c.id == id) {
        return i;
    }
    let name = if alias.is_empty() {
        id.to_string()
    } else {
        alias.to_string()
    };
    classes.push(ClassBox {
        id: id.to_string(),
        name,
        ..Default::default()
    });
    classes.len() - 1
}

/// Crow's-foot operators use `| o { } - .`. A relationship line has a run with
/// a `-` or `.`.
fn has_rel_op(s: &str) -> bool {
    find_rel_op(s).is_some()
}

fn find_rel_op(s: &str) -> Option<(usize, usize)> {
    let bytes: Vec<(usize, char)> = s.char_indices().collect();
    let is_rel = |c: char| matches!(c, '|' | 'o' | '{' | '}' | '.' | '-');
    let mut i = 0;
    while i < bytes.len() {
        if is_rel(bytes[i].1) {
            let mut j = i;
            while j < bytes.len() && is_rel(bytes[j].1) {
                j += 1;
            }
            let run: String = bytes[i..j].iter().map(|(_, c)| *c).collect();
            if (run.contains('-') || run.contains('.')) && run.len() >= 2 {
                let bs = bytes[i].0;
                let be = if j < bytes.len() { bytes[j].0 } else { s.len() };
                return Some((bs, be));
            }
            i = j;
        } else {
            i += 1;
        }
    }
    None
}

fn parse_relation(stmt: &str) -> Option<Relation> {
    let (lhs, label) = match stmt.split_once(':') {
        Some((l, r)) => (l.trim(), r.trim().to_string()),
        None => (stmt.trim(), String::new()),
    };
    let (start, end) = find_rel_op(lhs)?;
    let conn = &lhs[start..end];
    let dashed = conn.contains('.'); // non-identifying
                                     // `<left><dashes><right>` — classify each end's crow's-foot glyph.
    let l_end = conn.find(['-', '.']).unwrap_or(conn.len());
    let r_start = conn.rfind(['-', '.']).map_or(conn.len(), |i| i + 1);
    let from_crow = crow_of(&conn[..l_end]);
    let to_crow = crow_of(&conn[r_start..]);
    let from = lhs[..start].trim().trim_matches('"').to_string();
    let to = lhs[end..].trim().trim_matches('"').to_string();
    if from.is_empty() || to.is_empty() {
        return None;
    }
    Some(Relation {
        from,
        to,
        kind: RelKind::Link,
        dashed,
        head_at_from: false,
        label,
        from_card: String::new(),
        to_card: String::new(),
        from_crow,
        to_crow,
    })
}

/// Map a crow's-foot cardinality token (`||`, `o{`, `}|`, …) to its glyph.
fn crow_of(tok: &str) -> Crow {
    let foot = tok.contains('{') || tok.contains('}');
    let zero = tok.contains('o');
    match (foot, zero) {
        (true, true) => Crow::ZeroMany,
        (true, false) => Crow::OneMany,
        (false, true) => Crow::ZeroOne,
        (false, false) => Crow::One,
    }
}


/// Decode entities + convert generics (`type~T~`→`type<T>`) in attribute text.
fn attr_text(s: &str) -> String {
    subst_generics(&super::decode_entities(s))
}

/// `~`-delimited generics → angle brackets: opening `~` (next char is a name
/// char) becomes `<`, a closing `~` becomes `>` (`List~List~int~~`→`List<List<int>>`).
fn subst_generics(s: &str) -> String {
    if !s.contains('~') {
        return s.to_string();
    }
    let chars: Vec<char> = s.chars().collect();
    let mut out = String::with_capacity(s.len());
    for (i, &c) in chars.iter().enumerate() {
        if c == '~' {
            let open = chars
                .get(i + 1)
                .map(|n| n.is_alphanumeric() || *n == '_')
                .unwrap_or(false);
            out.push(if open { '<' } else { '>' });
        } else {
            out.push(c);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn entities_attributes_relationships() {
        let cd = parse(
            "erDiagram\nCUSTOMER ||--o{ ORDER : places\nCUSTOMER {\nstring name\nstring email PK\n}",
        )
        .unwrap();
        let cust = cd.classes.iter().find(|c| c.id == "CUSTOMER").unwrap();
        assert_eq!(
            cust.attributes,
            vec!["string name".to_string(), "string email PK".to_string()]
        );
        assert!(cd.classes.iter().any(|c| c.id == "ORDER"));
        let rel = &cd.relations[0];
        assert_eq!(
            (rel.from.as_str(), rel.to.as_str(), rel.label.as_str()),
            ("CUSTOMER", "ORDER", "places")
        );
    }
}
