//! Shared sequence-diagram layout — positions lifelines (evenly-spaced
//! columns), messages (descending rows) and combined-fragment boxes, in a
//! simple top-down pass with no external geometry.
//!
//! Both the StarUML `.mdj` ([`super::mdj`]) and Gaphor `.gaphor`
//! ([`super::gaphor`]) emitters consume this; keeping one layout means the two
//! exports place elements identically. Coordinates are integer pixels.

use std::collections::HashMap;

use super::{Fragment, FragmentOp, Item, MessageSort, Note, NotePlacement, Sequence};

// ── Layout constants (pixels) ───────────────────────────────────────────────
pub(crate) const FRAME_LEFT: i64 = 8;
pub(crate) const FRAME_TOP: i64 = 8;
pub(crate) const HEAD_TOP: i64 = 40;
pub(crate) const HEAD_W: i64 = 100;
pub(crate) const HEAD_H: i64 = 40;
pub(crate) const LINE_TOP: i64 = HEAD_TOP + HEAD_H; // dashed lifeline starts here
pub(crate) const SELF_EXTRA: i64 = 24; // extra drop for a self-message loop
pub(crate) const FRAG_HEADER: i64 = 28; // operator band at the top of a fragment
const FIRST_HEAD_LEFT: i64 = 24;
const LL_GAP: i64 = 150; // centre-to-centre spacing
const FIRST_MSG_Y: i64 = LINE_TOP + 32;
const ROW: i64 = 40; // vertical step per message
const OPERAND_DIV: i64 = 22; // divider + guard band before else/and
const FRAG_PAD: i64 = 12; // padding below the last operand row
const FRAG_GAP: i64 = 12; // gap after a fragment box
const FRAG_MARGIN: i64 = 30; // horizontal overhang past spanned lifelines
const NOTE_LINE: i64 = 16; // text line height inside a note box
const NOTE_PAD: i64 = 8; // inner padding of a note box
const NOTE_GAP: i64 = 14; // vertical gap a note occupies past its box
const NOTE_CHAR_W: i64 = 7; // approx glyph advance at 14px

/// A placed message (one diagram row).
pub(crate) struct PMsg {
    pub(crate) from: usize,
    pub(crate) to: usize,
    pub(crate) text: String,
    pub(crate) sort: MessageSort,
    pub(crate) y: i64,
    pub(crate) self_loop: bool,
    pub(crate) bidirectional: bool,
}

/// A placed combined fragment box (with operand sub-bands).
pub(crate) struct PFrag {
    pub(crate) operator: FragmentOp,
    pub(crate) left: i64,
    pub(crate) width: i64,
    pub(crate) top: i64,
    pub(crate) height: i64,
    /// (guard, top, height) per operand.
    pub(crate) operands: Vec<(String, i64, i64)>,
}

/// A placed note box (one or more text lines).
pub(crate) struct PNote {
    pub(crate) left: i64,
    pub(crate) top: i64,
    pub(crate) width: i64,
    pub(crate) height: i64,
    pub(crate) lines: Vec<String>,
}

/// A placed activation bar on one lifeline.
pub(crate) struct PActiv {
    pub(crate) col: usize,
    pub(crate) top: i64,
    pub(crate) bottom: i64,
}

/// The result of laying out a [`Sequence`].
pub(crate) struct Layout {
    /// Lifeline centre x by participant index.
    pub(crate) centers: Vec<i64>,
    /// All messages (including those inside fragments), in document order.
    pub(crate) msgs: Vec<PMsg>,
    /// Combined-fragment boxes.
    pub(crate) frags: Vec<PFrag>,
    /// Note boxes.
    pub(crate) notes: Vec<PNote>,
    /// Activation bars.
    pub(crate) acts: Vec<PActiv>,
    /// The y just past the last placed element.
    pub(crate) bottom: i64,
    index: HashMap<String, usize>,
    y: i64,
    auto_on: bool,
    auto_n: i64,
    auto_step: i64,
    open_acts: HashMap<usize, Vec<i64>>,
}

/// Lay out a sequence diagram.
pub(crate) fn layout(seq: &Sequence) -> Layout {
    let mut lay = Layout::new(seq);
    lay.walk(&seq.items);
    lay.close_all_acts();
    lay
}

impl Layout {
    fn new(seq: &Sequence) -> Self {
        let mut centers = Vec::with_capacity(seq.participants.len());
        let mut index = HashMap::new();
        for (i, p) in seq.participants.iter().enumerate() {
            centers.push(FIRST_HEAD_LEFT + HEAD_W / 2 + i as i64 * LL_GAP);
            index.insert(p.id.clone(), i);
        }
        Layout {
            centers,
            index,
            msgs: Vec::new(),
            frags: Vec::new(),
            notes: Vec::new(),
            acts: Vec::new(),
            y: FIRST_MSG_Y,
            bottom: FIRST_MSG_Y,
            auto_on: false,
            auto_n: 0,
            auto_step: 1,
            open_acts: HashMap::new(),
        }
    }

    fn idx(&self, id: &str) -> usize {
        *self.index.get(id).unwrap_or(&0)
    }

    fn walk(&mut self, items: &[Item]) {
        for item in items {
            match item {
                Item::Message(m) => {
                    let from = self.idx(&m.from);
                    let to = self.idx(&m.to);
                    let self_loop = from == to;
                    let text = if self.auto_on {
                        let n = self.auto_n;
                        self.auto_n += self.auto_step;
                        if m.text.is_empty() {
                            n.to_string()
                        } else {
                            format!("{} {}", n, m.text)
                        }
                    } else {
                        m.text.clone()
                    };
                    if m.activate_target {
                        self.open_acts.entry(to).or_default().push(self.y);
                    }
                    self.msgs.push(PMsg {
                        from,
                        to,
                        text,
                        sort: m.sort,
                        y: self.y,
                        self_loop,
                        bidirectional: m.bidirectional,
                    });
                    if m.deactivate_source {
                        self.close_act(from, self.y);
                    }
                    self.y += if self_loop { ROW + SELF_EXTRA } else { ROW };
                }
                Item::Note(n) => {
                    let note = self.place_note(n);
                    self.y = note.top + note.height + NOTE_GAP;
                    self.notes.push(note);
                }
                Item::Autonumber(spec) => match spec {
                    Some((start, step)) => {
                        self.auto_on = true;
                        self.auto_n = *start;
                        self.auto_step = *step;
                    }
                    None => self.auto_on = false,
                },
                Item::Activate(x) => {
                    let c = self.idx(x);
                    self.open_acts.entry(c).or_default().push(self.y);
                }
                Item::Deactivate(x) => {
                    let c = self.idx(x);
                    self.close_act(c, self.y);
                }
                Item::Fragment(f) => {
                    let top = self.y;
                    self.y += FRAG_HEADER;
                    let mut operands = Vec::with_capacity(f.operands.len());
                    for (i, operand) in f.operands.iter().enumerate() {
                        if i > 0 {
                            self.y += OPERAND_DIV;
                        }
                        let op_top = self.y;
                        self.walk(&operand.items);
                        if self.y == op_top {
                            self.y += ROW; // keep an empty operand visible
                        }
                        operands.push((operand.guard.clone(), op_top, self.y - op_top));
                    }
                    self.y += FRAG_PAD;
                    let bottom = self.y;
                    let (left, right) = self.span(f);
                    self.frags.push(PFrag {
                        operator: f.operator,
                        left,
                        width: right - left,
                        top,
                        height: bottom - top,
                        operands,
                    });
                    self.y += FRAG_GAP;
                }
            }
            self.bottom = self.bottom.max(self.y);
        }
    }

    /// Position a note box at the current y (placement relative to its targets).
    fn place_note(&self, n: &Note) -> PNote {
        let lines: Vec<String> = n
            .text
            .split("<br>")
            .flat_map(|s| s.split("<br/>"))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        let lines = if lines.is_empty() {
            vec![String::new()]
        } else {
            lines
        };
        let text_w = lines
            .iter()
            .map(|l| l.chars().count() as i64)
            .max()
            .unwrap_or(0)
            * NOTE_CHAR_W
            + NOTE_PAD * 2;
        let height = lines.len() as i64 * NOTE_LINE + NOTE_PAD * 2;
        let center = |i: usize| self.centers.get(i).copied().unwrap_or(0);
        let (left, width) = match n.placement {
            NotePlacement::Over => {
                let idxs: Vec<usize> = n.targets.iter().map(|t| self.idx(t)).collect();
                if idxs.len() >= 2 {
                    let a = center(idxs[0]);
                    let b = center(*idxs.last().unwrap());
                    let (lo, hi) = (a.min(b), a.max(b));
                    let w = (hi - lo + HEAD_W).max(text_w);
                    (lo + (hi - lo) / 2 - w / 2, w)
                } else {
                    let c = idxs.first().map(|&i| center(i)).unwrap_or(0);
                    let w = text_w.max(HEAD_W);
                    (c - w / 2, w)
                }
            }
            NotePlacement::LeftOf => {
                let c = self.idx(n.targets.first().map(String::as_str).unwrap_or(""));
                let w = text_w.max(60);
                (center(c) - HEAD_W / 2 - w, w)
            }
            NotePlacement::RightOf => {
                let c = self.idx(n.targets.first().map(String::as_str).unwrap_or(""));
                let w = text_w.max(60);
                (center(c) + HEAD_W / 2, w)
            }
        };
        PNote {
            left: left.max(FRAME_LEFT),
            top: self.y,
            width,
            height,
            lines,
        }
    }

    /// Close the innermost open activation on `col`, recording its bar.
    fn close_act(&mut self, col: usize, y: i64) {
        if let Some(stack) = self.open_acts.get_mut(&col) {
            if let Some(top) = stack.pop() {
                self.acts.push(PActiv {
                    col,
                    top,
                    bottom: y.max(top + 12),
                });
            }
        }
    }

    /// Close any activations still open at the end of the diagram.
    fn close_all_acts(&mut self) {
        let cols: Vec<usize> = self.open_acts.keys().copied().collect();
        let b = self.bottom;
        for c in cols {
            while let Some(top) = self.open_acts.get_mut(&c).and_then(|s| s.pop()) {
                self.acts.push(PActiv {
                    col: c,
                    top,
                    bottom: b,
                });
            }
        }
    }

    /// Horizontal extent (left, right) a fragment must enclose.
    fn span(&self, frag: &Fragment) -> (i64, i64) {
        let mut touched = Vec::new();
        for op in &frag.operands {
            for it in &op.items {
                collect(it, &self.index, &mut touched);
            }
        }
        if touched.is_empty() {
            // Degenerate: span the whole diagram.
            let last = self.centers.len().saturating_sub(1);
            return (
                self.centers.first().copied().unwrap_or(0) - FRAG_MARGIN,
                self.centers.get(last).copied().unwrap_or(0) + FRAG_MARGIN,
            );
        }
        let min = touched.iter().map(|&i| self.centers[i]).min().unwrap();
        let max = touched.iter().map(|&i| self.centers[i]).max().unwrap();
        (min - FRAG_MARGIN, max + FRAG_MARGIN)
    }
}

/// Collect participant indices touched (transitively) by one item.
fn collect(item: &Item, index: &HashMap<String, usize>, out: &mut Vec<usize>) {
    let mut add = |id: &str| {
        if let Some(&i) = index.get(id) {
            if !out.contains(&i) {
                out.push(i);
            }
        }
    };
    match item {
        Item::Message(m) => {
            add(&m.from);
            add(&m.to);
        }
        Item::Activate(x) | Item::Deactivate(x) => add(x),
        Item::Autonumber(_) => {}
        Item::Note(n) => n.targets.iter().for_each(|t| add(t)),
        Item::Fragment(f) => {
            for op in &f.operands {
                for it in &op.items {
                    collect(it, index, out);
                }
            }
        }
    }
}
