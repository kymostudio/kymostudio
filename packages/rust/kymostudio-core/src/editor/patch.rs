//! Surgical canvas→text patcher — Rust port of
//! `packages/website/app/src/patchDsl.ts`.
//!
//! Given the `.kymo` source and a map of component-id → new absolute centre,
//! rewrite only what's needed so a drag sticks, preserving comments / formatting
//! / untouched lines:
//!
//!   - `@ (x,y)`            → rewrite the two ints.
//!   - `@ parent side gap`  → replace with `@ (x,y)` (clears the parent ref).
//!   - no `@`              → append ` @ (x,y)`.
//!   - layout-frame member  → remove the bare id from the `horizontal|vertical`
//!                            body AND give the leaf an explicit `@ (x,y)`.
//!   - grid `row` member    → remove the id from its `row` line AND add `@ (x,y)`.
//!
//! Self-contained text scanner mirroring the minimal `dsl.rs` grammar.

use std::collections::{HashMap, HashSet};

use regex::Regex;

const HEX: &str = "0123456789abcdefABCDEF";

struct Re {
    leaf_triple: Regex,
    layout_open: Regex,
    region_open: Regex,
    close: Regex,
    lead_ws: Regex,
    trail_ws: Regex,
    at_split: Regex,
    ident: Regex,
}

impl Re {
    fn new() -> Self {
        Re {
            leaf_triple: Regex::new(r"^[\w-]+/[\w-]+/\w+$").unwrap(),
            layout_open: Regex::new(r"^\w+\s+(?:horizontal|vertical)\b.*\{\s*$").unwrap(),
            region_open: Regex::new(r"^\w+\s+(?:outer|inner|cluster)\b.*\{\s*$").unwrap(),
            close: Regex::new(r"^\}\s*$").unwrap(),
            lead_ws: Regex::new(r"^(\s*)").unwrap(),
            trail_ws: Regex::new(r"\s*$").unwrap(),
            at_split: Regex::new(r"\s+@\s+").unwrap(),
            ident: Regex::new(r"^[A-Za-z_]\w*$").unwrap(),
        }
    }
}

/// Split a line into `(code, comment)` using the DSL's `#` rule (`#` outside a
/// quoted string and not starting a hex colour begins a comment).
fn split_comment(line: &str) -> (String, String) {
    let chars: Vec<char> = line.chars().collect();
    let mut in_quote = false;
    for i in 0..chars.len() {
        let ch = chars[i];
        if ch == '"' {
            in_quote = !in_quote;
        } else if ch == '#' && !in_quote {
            let nxt = chars.get(i + 1).copied().unwrap_or('\0');
            if !HEX.contains(nxt) {
                let code: String = chars[..i].iter().collect();
                let comment: String = chars[i..].iter().collect();
                return (code, comment);
            }
        }
    }
    (line.to_string(), String::new())
}

fn reff(xy: (f32, f32)) -> String {
    format!("@ ({}, {})", xy.0.round() as i64, xy.1.round() as i64)
}

/// Trailing-whitespace suffix of `s` (possibly empty).
fn trailing_ws<'a>(re: &Re, s: &'a str) -> &'a str {
    let m = re.trail_ws.find(s).unwrap();
    &s[m.start()..]
}

/// Set/insert the `@ (x,y)` placement on a leaf line, keeping any trailing comment.
fn patch_leaf_line(re: &Re, raw: &str, xy: (f32, f32)) -> String {
    let (code, comment) = split_comment(raw);
    if let Some(m) = re.at_split.find(&code) {
        let before = &code[..m.start()];
        let tail = &code[m.start()..];
        let tw = trailing_ws(re, tail);
        format!("{before} {}{tw}{comment}", reff(xy))
    } else {
        let tw = trailing_ws(re, &code).to_string();
        let head = &code[..code.len() - tw.len()];
        format!("{head} {}{tw}{comment}", reff(xy))
    }
}

/// Remove the given bare ids from a whitespace-separated id line, preserving
/// indent. `None` → nothing removed; `Some("")` → emptied (blank line).
fn remove_ids(re: &Re, raw: &str, ids: &HashSet<String>, is_row: bool) -> Option<String> {
    let indent = re.lead_ws.captures(raw).unwrap().get(1).unwrap().as_str();
    let (code, _) = split_comment(raw);
    let tokens: Vec<&str> = code.split_whitespace().collect();
    let start = if is_row { 1 } else { 0 };
    let kept: Vec<&str> = tokens[start..].iter().copied().filter(|t| !ids.contains(*t)).collect();
    if kept.len() == tokens.len() - start {
        return None; // nothing removed
    }
    if kept.is_empty() {
        return Some(String::new()); // emptied → blank line
    }
    Some(format!("{indent}{}{}", if is_row { "row " } else { "" }, kept.join(" ")))
}

/// Apply position changes to `.kymo` text. `moves` maps a component id to its
/// new absolute centre. Returns the patched text (or the input unchanged).
pub fn patch_positions(text: &str, moves: &HashMap<String, (f32, f32)>) -> String {
    if moves.is_empty() {
        return text.to_string();
    }
    let re = Re::new();
    let nl = if text.contains("\r\n") { "\r\n" } else { "\n" };
    let mut lines: Vec<String> = text.split('\n').map(|l| l.trim_end_matches('\r').to_string()).collect();
    let ids: HashSet<String> = moves.keys().cloned().collect();
    let mut stack: Vec<&str> = Vec::new(); // "layout" | "region" | "other"

    for i in 0..lines.len() {
        let (code, _) = split_comment(&lines[i]);
        let trimmed = code.trim().to_string();
        if trimmed.is_empty() {
            continue;
        }
        if re.close.is_match(&trimmed) {
            stack.pop();
            continue;
        }
        if trimmed.ends_with('{') {
            stack.push(if re.layout_open.is_match(&trimmed) {
                "layout"
            } else if re.region_open.is_match(&trimmed) {
                "region"
            } else {
                "other"
            });
            continue;
        }

        let tokens: Vec<&str> = trimmed.split_whitespace().collect();
        let id0 = tokens[0];

        // Leaf definition line for a moved component → set its placement.
        if moves.contains_key(id0)
            && tokens.len() > 1
            && re.leaf_triple.is_match(tokens[1])
        {
            lines[i] = patch_leaf_line(&re, &lines[i], moves[id0]);
            continue;
        }

        // Lift a moved id out of a layout-frame body or a grid `row`.
        let is_row = id0 == "row";
        let in_layout = stack.last() == Some(&"layout");
        if is_row || (in_layout && tokens.iter().all(|t| re.ident.is_match(t))) {
            if let Some(replaced) = remove_ids(&re, &lines[i], &ids, is_row) {
                lines[i] = replaced;
            }
        }
    }

    lines.join(nl)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn moves(pairs: &[(&str, (f32, f32))]) -> HashMap<String, (f32, f32)> {
        pairs.iter().map(|(k, v)| (k.to_string(), *v)).collect()
    }

    #[test]
    fn rewrites_existing_pos() {
        let out = patch_positions(
            "a circle/user/blue \"A\" \"\" @ (10, 20)",
            &moves(&[("a", (33.4, 44.6))]),
        );
        assert_eq!(out, "a circle/user/blue \"A\" \"\" @ (33, 45)");
    }

    #[test]
    fn replaces_parent_ref_with_pos() {
        let out = patch_positions(
            "b hex/hex-agent/green @ a right 60",
            &moves(&[("b", (100.0, 200.0))]),
        );
        assert_eq!(out, "b hex/hex-agent/green @ (100, 200)");
    }

    #[test]
    fn appends_pos_when_absent() {
        let out = patch_positions(
            "c box/gear/orange \"C\" \"\"",
            &moves(&[("c", (5.0, 6.0))]),
        );
        assert_eq!(out, "c box/gear/orange \"C\" \"\" @ (5, 6)");
    }

    #[test]
    fn preserves_trailing_comment() {
        let out = patch_positions(
            "a circle/user/blue \"A\" \"\" @ (1, 2)  # note",
            &moves(&[("a", (7.0, 8.0))]),
        );
        assert_eq!(out, "a circle/user/blue \"A\" \"\" @ (7, 8)  # note");
    }

    #[test]
    fn lifts_from_layout_frame_and_sets_leaf_pos() {
        let src = "\
a circle/user/blue \"A\" \"\"
b hex/hex-agent/green \"B\" \"\"
chain horizontal pos (0, 0) gap 10 {
  a b
}";
        let out = patch_positions(src, &moves(&[("a", (50.0, 60.0))]));
        // 'a' lifted from the body, body keeps 'b'; leaf 'a' gets @(50,60).
        assert!(out.contains("a circle/user/blue \"A\" \"\" @ (50, 60)"));
        assert!(out.contains("  b"));
        assert!(!out.contains("  a b"));
    }

    #[test]
    fn removes_from_grid_row() {
        let src = "\
region outer \"R\" {
  row x y z
}";
        let out = patch_positions(src, &moves(&[("y", (1.0, 2.0))]));
        assert!(out.contains("row x z"));
    }

    #[test]
    fn no_moves_is_identity() {
        let src = "a circle/user/blue @ (1, 2)";
        assert_eq!(patch_positions(src, &HashMap::new()), src);
    }
}
