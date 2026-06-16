//! Parse a Mermaid `requirementDiagram` into the [`crate::classdiagram`] IR so
//! it reuses the class-box renderer: requirements and elements become boxes with
//! their fields as rows, and the relationships (`satisfies`, `derives`, …)
//! become labelled links. All real `<text>`.

use super::MermaidError;
use crate::classdiagram::{ClassBox, ClassDiagram, Crow, RelKind, Relation};
use kymo_graph::flowchart::Direction;

const KINDS: &[&str] = &[
    "requirement",
    "functionalrequirement",
    "performancerequirement",
    "interfacerequirement",
    "physicalrequirement",
    "designconstraint",
    "element",
];

/// Parse requirement-diagram source into a [`ClassDiagram`].
pub fn parse(src: &str) -> Result<ClassDiagram, MermaidError> {
    let lines: Vec<&str> = src.lines().map(|l| strip_comment(l).trim()).collect();
    let header = lines
        .iter()
        .find(|l| !l.is_empty())
        .ok_or(MermaidError::Empty)?;
    if !header.to_ascii_lowercase().starts_with("requirement") {
        return Err(MermaidError::Unsupported(header.to_string()));
    }

    let mut cd = ClassDiagram {
        direction: Direction::Tb,
        classes: Vec::new(),
        relations: Vec::new(),
        notes: Vec::new(),
        namespaces: Vec::new(),
    };
    let mut cur: Option<usize> = None;
    let mut started = false;

    for line in &lines {
        if line.is_empty() {
            continue;
        }
        if !started {
            started = true;
            continue;
        }
        let low = line.to_ascii_lowercase();

        if let Some(ci) = cur {
            if *line == "}" || line.ends_with('}') {
                let inner = line.trim_end_matches('}').trim();
                if !inner.is_empty() {
                    cd.classes[ci].attributes.push(field_label(inner));
                }
                cur = None;
                continue;
            }
            cd.classes[ci].attributes.push(field_label(line));
            continue;
        }
        if low.starts_with("direction ") {
            cd.direction = parse_dir(line[10..].trim());
            continue;
        }
        if low.starts_with("style ") || low.starts_with("class ") {
            continue;
        }

        // `<kind> Name {` — a requirement or element box.
        if let Some(pos) = line.find('{') {
            let head_low = low[..pos].trim_start();
            if let Some(kw) = KINDS.iter().find(|k| head_low.starts_with(**k)) {
                let name = line[kw.len()..pos].trim().to_string();
                let ci = decl(&mut cd.classes, &name, kw);
                let inner = line[pos + 1..].trim_end_matches('}').trim();
                if !inner.is_empty() {
                    cd.classes[ci].attributes.push(inner.to_string());
                }
                if !line.trim_end().ends_with('}') {
                    cur = Some(ci);
                }
                continue;
            }
        }

        // Relationship: `src - type -> dst` / `dst <- type - src`.
        if let Some(rel) = parse_relation(line) {
            decl(&mut cd.classes, &rel.from, "");
            decl(&mut cd.classes, &rel.to, "");
            cd.relations.push(rel);
            continue;
        }
    }

    Ok(cd)
}

/// Mermaid relabels requirement fields (e.g. `verifymethod` → `Verification`).
fn field_label(line: &str) -> String {
    if let Some((k, v)) = line.split_once(':') {
        let label = match k.trim().to_ascii_lowercase().as_str() {
            "id" => "Id",
            "text" => "Text",
            "risk" => "Risk",
            "verifymethod" => "Verification",
            "docref" => "Doc Ref",
            "type" => "Type",
            _ => return line.trim().to_string(),
        };
        format!("{label}: {}", v.trim())
    } else {
        line.trim().to_string()
    }
}

/// Format a requirement-type keyword into its displayed stereotype.
fn type_label(kw: &str) -> String {
    match kw {
        "functionalrequirement" => "Functional Requirement",
        "performancerequirement" => "Performance Requirement",
        "interfacerequirement" => "Interface Requirement",
        "physicalrequirement" => "Physical Requirement",
        "designconstraint" => "Design Constraint",
        "element" => "Element",
        _ => "Requirement",
    }
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

/// Find or create a box; `kw` (the keyword) becomes the stereotype.
fn decl(classes: &mut Vec<ClassBox>, name: &str, kw: &str) -> usize {
    let id = name.trim().trim_matches('"').trim();
    if id.is_empty() {
        return 0;
    }
    if let Some(i) = classes.iter().position(|c| c.id == id) {
        if !kw.is_empty() && classes[i].stereotype.is_empty() {
            classes[i].stereotype = type_label(kw);
        }
        return i;
    }
    classes.push(ClassBox {
        id: id.to_string(),
        name: id.to_string(),
        stereotype: type_label(kw),
        ..Default::default()
    });
    classes.len() - 1
}

/// `src - type -> dst` — the dashed type sits in the middle.
fn parse_relation(line: &str) -> Option<Relation> {
    let (a, dst, rev) = if let Some(p) = line.find("->") {
        (&line[..p], line[p + 2..].trim(), false)
    } else if let Some(p) = line.find("<-") {
        (&line[p + 2..], line[..p].trim(), true)
    } else {
        return None;
    };
    // a = "src - type" (or "type - src" reversed)
    let parts: Vec<&str> = a.splitn(2, '-').map(str::trim).collect();
    if parts.len() != 2 {
        return None;
    }
    let (src, ty) = (parts[0], parts[1].trim());
    let from = if rev { dst } else { src };
    let to = if rev { src } else { dst };
    if from.is_empty() || to.is_empty() {
        return None;
    }
    Some(Relation {
        from: from.trim().trim_matches('"').trim().to_string(),
        to: to.trim().trim_matches('"').trim().to_string(),
        kind: RelKind::Dependency,
        dashed: true,
        head_at_from: false,
        label: ty.to_string(),
        from_card: String::new(),
        to_card: String::new(),
        from_crow: Crow::None,
        to_crow: Crow::None,
    })
}

#[cfg(test)]
mod tests {
    use super::parse;
    #[test]
    fn requirements_fields_and_relations() {
        let cd = parse("requirementDiagram\nrequirement req1 {\nid: 1\nverifymethod: analysis\n}\nelement e1 {\ntype: simulation\n}\ne1 - satisfies -> req1").unwrap();
        let req = cd.classes.iter().find(|c| c.id == "req1").unwrap();
        // verifymethod relabelled to Verification
        assert!(req
            .attributes
            .iter()
            .any(|a| a.starts_with("Verification:")));
        assert_eq!(req.stereotype, "Requirement");
        let rel = &cd.relations[0];
        assert_eq!(
            (rel.from.as_str(), rel.to.as_str(), rel.label.as_str()),
            ("e1", "req1", "satisfies")
        );
    }
}
