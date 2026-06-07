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

    /// Read inner text until `close`, consuming it. A leading/trailing pair of
    /// double quotes is stripped (Mermaid quotes labels containing delimiters).
    fn read_until(&mut self, close: &str) -> String {
        let start = self.i;
        while !self.at_end() && !self.starts_with(close) {
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

    /// Try to read an edge operator at the cursor (after optional whitespace).
    /// Returns `None` (and does not advance past the whitespace meaningfully)
    /// when the cursor is not on an edge.
    pub fn read_operator(&mut self) -> Option<EdgeTok> {
        let save = self.i;
        self.skip_ws();
        match self.peek() {
            Some('-') | Some('=') | Some('<') => {}
            _ => {
                self.i = save;
                return None;
            }
        }
        let run_start = self.i;
        while matches!(self.peek(), Some(c) if matches!(c, '-' | '=' | '.' | '>' | '<')) {
            self.i += 1;
        }
        // Optional single arrowhead glyph (`x` open / `o` circle).
        if matches!(self.peek(), Some('x') | Some('o')) && self.i > run_start {
            self.i += 1;
        }
        let run: String = self.chars[run_start..self.i].iter().collect();
        let dashed = run.contains('.');
        let has_arrow =
            run.contains('>') || run.starts_with('<') || run.ends_with('x') || run.ends_with('o');

        // Optional `|label|` immediately after the operator.
        let mut label = String::new();
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
