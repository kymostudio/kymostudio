//! Low-level scanning for the Mermaid flowchart grammar.
//!
//! A [`Scanner`] is a char cursor over a single statement line. It knows how to
//! peel off a node's shape wrapper (`[..]`, `{..}`, `((..))`, …) and an edge
//! operator (`-->`, `-.->`, `==>`, `-->|label|`, …). The grammar lives in
//! `parser.rs`; this module only tokenizes.

use crate::model::Shape;

/// A parsed edge operator with the flags it implies on `model::Edge`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EdgeTok {
    pub dashed: bool,
    pub no_arrow: bool,
    pub label: String,
}

pub struct Scanner {
    chars: Vec<char>,
    i: usize,
}

impl Scanner {
    pub fn new(s: &str) -> Self {
        Scanner {
            chars: s.chars().collect(),
            i: 0,
        }
    }

    pub fn at_end(&self) -> bool {
        self.i >= self.chars.len()
    }

    fn peek(&self) -> Option<char> {
        self.chars.get(self.i).copied()
    }

    fn peek_at(&self, off: usize) -> Option<char> {
        self.chars.get(self.i + off).copied()
    }

    pub fn skip_ws(&mut self) {
        while matches!(self.peek(), Some(c) if c == ' ' || c == '\t') {
            self.i += 1;
        }
    }

    /// Consume one char if it matches `c` (used for the `&` node-group separator).
    pub fn eat(&mut self, c: char) -> bool {
        if self.peek() == Some(c) {
            self.i += 1;
            true
        } else {
            false
        }
    }

    fn starts_with(&self, pat: &str) -> bool {
        pat.chars()
            .enumerate()
            .all(|(k, c)| self.peek_at(k) == Some(c))
    }

    /// Read a node identifier: `[A-Za-z0-9_]+` (kept deliberately conservative).
    pub fn read_id(&mut self) -> Option<String> {
        let start = self.i;
        while matches!(self.peek(), Some(c) if c.is_ascii_alphanumeric() || c == '_') {
            self.i += 1;
        }
        if self.i == start {
            None
        } else {
            Some(self.chars[start..self.i].iter().collect())
        }
    }

    /// If a shape wrapper follows the cursor, consume it and return
    /// `(shape, label)`. Two-char delimiters are checked before one-char ones.
    pub fn read_shape(&mut self) -> Option<(Shape, String)> {
        // (open, close, shape) — longest openers first.
        const THREE: &[(&str, &str, Shape)] = &[
            ("(((", ")))", Shape::Circle), // double circle
        ];
        for (open, close, shape) in THREE {
            if self.starts_with(open) {
                self.i += 3;
                let label = self.read_until(close);
                return Some((*shape, label));
            }
        }
        const TWO: &[(&str, &str, Shape)] = &[
            ("[[", "]]", Shape::Box),      // subroutine
            ("[(", ")]", Shape::Cylinder), // database / cylinder
            ("([", "])", Shape::Badge),    // stadium
            ("((", "))", Shape::Circle),   // circle
            ("{{", "}}", Shape::Hex),      // hexagon
        ];
        for (open, close, shape) in TWO {
            if self.starts_with(open) {
                self.i += 2;
                let label = self.read_until(close);
                return Some((*shape, label));
            }
        }
        const ONE: &[(char, &str, Shape)] = &[
            ('[', "]", Shape::Box),     // rectangle
            ('(', ")", Shape::Box),     // rounded
            ('{', "}", Shape::Diamond), // decision rhombus
            ('>', "]", Shape::Box),     // asymmetric flag
        ];
        for (open, close, shape) in ONE {
            if self.peek() == Some(*open) {
                self.i += 1;
                let label = self.read_until(close);
                return Some((*shape, label));
            }
        }
        None
    }

    /// Mermaid 11 `@{ shape: X, label: "Y" }` node metadata. Best-effort: maps
    /// the shape name to one of our six shapes and pulls out the label.
    pub fn read_at_metadata(&mut self) -> Option<(Option<Shape>, Option<String>)> {
        if !self.starts_with("@{") {
            return None;
        }
        self.i += 2;
        let body = self.read_until("}");
        let shape = meta_field(&body, "shape").map(|s| map_shape(&s));
        let label = meta_field(&body, "label").or_else(|| meta_field(&body, "text"));
        Some((shape, label))
    }

    /// Consume an inline `:::className` class assignment (no graph effect).
    pub fn skip_class_suffix(&mut self) {
        if self.starts_with(":::") {
            self.i += 3;
            while let Some(c) = self.peek() {
                if c.is_ascii_alphanumeric() || c == '_' {
                    self.i += 1;
                } else if c == '-' && !matches!(self.peek_at(1), Some('-') | Some('>')) {
                    self.i += 1; // a hyphen inside the class name, not an arrow
                } else {
                    break;
                }
            }
        }
    }

    /// Consume a Mermaid 11 edge id prefix (`e1@` before an operator).
    pub fn skip_edge_id(&mut self) {
        let save = self.i;
        while matches!(self.peek(), Some(c) if c.is_ascii_alphanumeric() || c == '_') {
            self.i += 1;
        }
        if self.i > save
            && self.peek() == Some('@')
            && matches!(
                self.peek_at(1),
                Some('-') | Some('=') | Some('<') | Some('.')
            )
        {
            self.i += 1; // consume the `@`; the word before it was the edge id
            return;
        }
        self.i = save;
    }

    /// Read inner text until `close`, consuming it. A leading/trailing pair of
    /// double quotes is stripped (Mermaid quotes labels containing delimiters).
    fn read_until(&mut self, close: &str) -> String {
        let start = self.i;
        let mut in_quote = false;
        while !self.at_end() {
            let c = self.chars[self.i];
            if c == '"' {
                in_quote = !in_quote;
            } else if !in_quote && self.starts_with(close) {
                break;
            }
            self.i += 1;
        }
        let raw: String = self.chars[start..self.i].iter().collect();
        if self.starts_with(close) {
            self.i += close.chars().count();
        }
        let t = raw.trim();
        if t.len() >= 2 && t.starts_with('"') && t.ends_with('"') {
            t[1..t.len() - 1].to_string()
        } else {
            t.to_string()
        }
    }

    /// For the inline-label link form `-- text -->`, read the label text and the
    /// closing dash/equal/dot run. A "closing run" is two or more consecutive
    /// link chars (or one containing `>`); this lets single dashes inside a
    /// label (`yes-no`) pass through untouched. Returns `(label, closing_run)`
    /// and advances the cursor only on success.
    fn try_inline_edge_label(&mut self) -> Option<(String, String)> {
        let save = self.i;
        self.skip_ws();
        let text_start = self.i;
        // Scan for the start of a closing run before end-of-line / `|`.
        let mut j = self.i;
        let close_start = loop {
            match self.chars.get(j) {
                None => break None,
                Some('\n') | Some('|') => break None,
                Some('-' | '=' | '.') => {
                    let mut k = j;
                    while matches!(self.chars.get(k), Some(c) if matches!(c, '-' | '=' | '.' | '>' | '<'))
                    {
                        k += 1;
                    }
                    let len = k - j;
                    let run: String = self.chars[j..k].iter().collect();
                    if len >= 2 || run.contains('>') {
                        break Some(j);
                    }
                    j = k; // a lone `-` inside the label; keep scanning
                }
                Some(_) => j += 1,
            }
        }?;
        if close_start == text_start {
            // No label text between the runs (e.g. `A --- B`): not a labeled edge.
            self.i = save;
            return None;
        }
        let label: String = self.chars[text_start..close_start].iter().collect();
        self.i = close_start;
        let run_start = self.i;
        while matches!(self.peek(), Some(c) if matches!(c, '-' | '=' | '.' | '>' | '<')) {
            self.i += 1;
        }
        if matches!(self.peek(), Some('x') | Some('o')) && self.i > run_start {
            self.i += 1;
        }
        let run2: String = self.chars[run_start..self.i].iter().collect();
        let t = label.trim();
        let text = if t.len() >= 2 && t.starts_with('"') && t.ends_with('"') {
            t[1..t.len() - 1].to_string()
        } else {
            t.to_string()
        };
        Some((text, run2))
    }

    /// Try to read an edge operator at the cursor (after optional whitespace).
    /// Returns `None` (and does not advance past the whitespace meaningfully)
    /// when the cursor is not on an edge.
    pub fn read_operator(&mut self) -> Option<EdgeTok> {
        let save = self.i;
        self.skip_ws();
        match self.peek() {
            Some('-') | Some('=') | Some('<') | Some('.') | Some('~') => {}
            // Leading circle/cross arrowhead (`o--o`, `x--x`), only when a link
            // run follows so we don't mistake a node id starting with o/x.
            Some('o') | Some('x')
                if matches!(self.peek_at(1), Some('-') | Some('=') | Some('.')) => {}
            _ => {
                self.i = save;
                return None;
            }
        }
        let run_start = self.i;
        if matches!(self.peek(), Some('o') | Some('x')) {
            self.i += 1;
        }
        while matches!(self.peek(), Some(c) if matches!(c, '-' | '=' | '.' | '>' | '<' | '~')) {
            self.i += 1;
        }
        // Optional trailing arrowhead glyph (`x` open / `o` circle).
        if matches!(self.peek(), Some('x') | Some('o')) && self.i > run_start {
            self.i += 1;
        }
        let run: String = self.chars[run_start..self.i].iter().collect();
        let mut dashed = run.contains('.');
        let mut has_arrow = run.contains('>')
            || run.starts_with('<')
            || run.starts_with('o')
            || run.starts_with('x')
            || run.ends_with('x')
            || run.ends_with('o');

        // Inline label form `-- text -->` / `== text ==>` / `<-- text -->`:
        // applies when the opening run does not yet end with an arrowhead
        // (otherwise the text after `A-->` is the destination node, not a label).
        let opens = !(run.ends_with('>') || run.ends_with('x') || run.ends_with('o'));
        let mut label = String::new();
        if opens {
            if let Some((text, run2)) = self.try_inline_edge_label() {
                label = text;
                dashed = dashed || run2.contains('.');
                has_arrow =
                    has_arrow || run2.contains('>') || run2.ends_with('x') || run2.ends_with('o');
            }
        }

        // Optional `|label|` immediately after the operator.
        self.skip_ws();
        if self.peek() == Some('|') {
            self.i += 1;
            label = self.read_until("|");
        }
        Some(EdgeTok {
            dashed,
            no_arrow: !has_arrow,
            label,
        })
    }
}

/// Pull `key: value` out of a `@{...}` metadata body (commas separate fields,
/// quotes protect commas/colons in the value).
fn meta_field(body: &str, key: &str) -> Option<String> {
    for part in split_fields(body) {
        if let Some((k, v)) = part.split_once(':') {
            if k.trim() == key {
                return Some(unquote(v.trim()));
            }
        }
    }
    None
}

fn split_fields(body: &str) -> Vec<String> {
    let mut out = Vec::new();
    let (mut cur, mut q) = (String::new(), None::<char>);
    for c in body.chars() {
        match q {
            Some(qc) => {
                if c == qc {
                    q = None;
                }
                cur.push(c);
            }
            None => match c {
                '"' | '\'' => {
                    q = Some(c);
                    cur.push(c);
                }
                ',' => {
                    out.push(std::mem::take(&mut cur));
                }
                _ => cur.push(c),
            },
        }
    }
    if !cur.trim().is_empty() {
        out.push(cur);
    }
    out
}

fn unquote(s: &str) -> String {
    let t = s.trim();
    if t.len() >= 2
        && ((t.starts_with('"') && t.ends_with('"')) || (t.starts_with('\'') && t.ends_with('\'')))
    {
        t[1..t.len() - 1].to_string()
    } else {
        t.to_string()
    }
}

/// Map a Mermaid 11 shape name to one of our six shapes (best effort).
fn map_shape(name: &str) -> Shape {
    match name.trim().to_ascii_lowercase().as_str() {
        "circle" | "circ" | "dbl-circ" | "fr-circ" | "doublecircle" => Shape::Circle,
        "diam" | "diamond" | "decision" | "fork" | "join" => Shape::Diamond,
        "hex" | "hexagon" | "prepare" => Shape::Hex,
        "cyl" | "cylinder" | "db" | "das" | "database" | "disk" | "lin-cyl" => Shape::Cylinder,
        "stadium" | "pill" | "term" | "terminal" | "rounded" => Shape::Badge,
        _ => Shape::Box,
    }
}
