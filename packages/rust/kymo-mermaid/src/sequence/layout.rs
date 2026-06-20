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
pub(crate) const HEAD_TOP: i64 = 0; // actor box top (mermaid origin; viewBox adds top margin)
pub(crate) const HEAD_W: i64 = 150; // mermaid sequence actor box width
pub(crate) const HEAD_H: i64 = 65; // mermaid sequence actor box height (conf.height)
pub(crate) const LINE_TOP: i64 = HEAD_TOP + HEAD_H; // dashed lifeline starts here
pub(crate) const SELF_EXTRA: i64 = 24; // extra drop for a self-message loop
pub(crate) const FRAG_HEADER: i64 = 28; // operator band at the top of a fragment
const FIRST_HEAD_LEFT: i64 = 0; // first actor edge at x=0 (viewBox adds the left margin)
const ACTOR_MARGIN: i64 = 50; // mermaid: min edge-to-edge gap between actors
const MSG_CHAR_W: i64 = 8; // approx glyph advance at messageFontSize 16
const FIRST_MSG_Y: i64 = LINE_TOP + 44; // mermaid: first arrow ~one messageMargin below box
const ROW: i64 = 44; // vertical step per message (mermaid messageMargin rhythm)
const OPERAND_DIV: i64 = 22; // divider + guard band before else/and
const FRAG_PAD: i64 = 12; // padding below the last operand row
const FRAG_GAP: i64 = 12; // gap after a fragment box
const FRAG_MARGIN: i64 = 30; // horizontal overhang past spanned lifelines
const NOTE_LINE: i64 = 16; // text line height inside a note box
const NOTE_PAD: i64 = 8; // inner padding of a note box
const NOTE_GAP: i64 = 32; // gap past a note box — clears the next message's
                          // label (drawn ~21px above its arrow), avoiding overlap
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
    /// `autonumber` sequence index, drawn as a badge on the source lifeline.
    pub(crate) number: Option<i64>,
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
    auto_enabled: bool,
    auto_display: bool,
    auto_n: i64,
    auto_step: i64,
    open_acts: HashMap<usize, Vec<i64>>,
}

/// Lay out a sequence diagram.
/// Collect (from_idx, to_idx, label_width) for every message, recursing into
/// combined fragments — feeds mermaid's dynamic actor-spacing.
fn collect_msg_widths(
    items: &[Item],
    index: &HashMap<String, usize>,
    out: &mut Vec<(usize, usize, i64)>,
) {
    for item in items {
        match item {
            Item::Message(m) => {
                if let (Some(&a), Some(&b)) = (index.get(&m.from), index.get(&m.to)) {
                    let w = m.text.chars().count() as i64 * MSG_CHAR_W + 20;
                    out.push((a, b, w));
                }
            }
            Item::Fragment(f) => {
                for op in &f.operands {
                    collect_msg_widths(&op.items, index, out);
                }
            }
            _ => {}
        }
    }
}

pub(crate) fn layout(seq: &Sequence) -> Layout {
    let mut lay = Layout::new(seq);
    lay.walk(&seq.items);
    lay.close_all_acts();
    lay.shift_into_frame();
    lay
}

impl Layout {
    fn new(seq: &Sequence) -> Self {
        let n = seq.participants.len();
        let mut index = HashMap::new();
        for (i, p) in seq.participants.iter().enumerate() {
            index.insert(p.id.clone(), i);
        }
        // mermaid spaces actors dynamically: the gap between two adjacent actors
        // grows so the widest message label between them fits (centre-to-centre ≥
        // label width). Collect message widths, then expand the base actorMargin.
        let mut gap = vec![ACTOR_MARGIN; n.saturating_sub(1)];
        let mut msgw: Vec<(usize, usize, i64)> = Vec::new();
        collect_msg_widths(&seq.items, &index, &mut msgw);
        for (a, b, w) in msgw {
            if a == b {
                continue;
            }
            let (lo, hi) = (a.min(b), a.max(b));
            let inner = (hi - lo - 1) as i64 * HEAD_W; // actors strictly between
            let cur: i64 = gap[lo..hi].iter().sum();
            let span = HEAD_W + inner + cur; // HEAD_W/2 + HEAD_W/2 = HEAD_W
            if span < w {
                let ng = (hi - lo) as i64;
                let add = (w - span + ng - 1) / ng; // ceil-distribute the deficit
                for g in gap.iter_mut().take(hi).skip(lo) {
                    *g += add;
                }
            }
        }
        let mut centers = Vec::with_capacity(n);
        let mut x = FIRST_HEAD_LEFT + HEAD_W / 2;
        for i in 0..n {
            if i > 0 {
                x += HEAD_W + gap[i - 1];
            }
            centers.push(x);
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
            auto_enabled: false,
            auto_display: false,
            auto_n: 1,
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
                    // mermaid draws the autonumber as a badge on the lifeline (not
                    // a text prefix); record the index and keep the label clean.
                    let number = if self.auto_enabled {
                        let n = self.auto_n;
                        let show = self.auto_display;
                        self.auto_n += self.auto_step; // advances even when hidden
                        show.then_some(n)
                    } else {
                        None
                    };
                    if m.activate_target {
                        self.open_acts.entry(to).or_default().push(self.y);
                    }
                    self.msgs.push(PMsg {
                        from,
                        to,
                        text: m.text.clone(),
                        sort: m.sort,
                        y: self.y,
                        self_loop,
                        bidirectional: m.bidirectional,
                        number,
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
                Item::Autonumber(cmd) => match cmd {
                    super::AutoNumber::Set(start, step) => {
                        self.auto_enabled = true;
                        self.auto_display = true;
                        self.auto_n = *start;
                        self.auto_step = *step;
                    }
                    super::AutoNumber::On => {
                        self.auto_enabled = true;
                        self.auto_display = true;
                    }
                    super::AutoNumber::Off => self.auto_display = false,
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
        let mut lines: Vec<String> = n
            .text
            .split('\n')
            .flat_map(|s| s.split("<br/>"))
            .flat_map(|s| s.split("<br>"))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        // `:wrap:` — word-wrap each line so a long note doesn't overflow the
        // lifelines (mermaid wraps to ~the actor width).
        if n.wrap {
            const MAX_CH: usize = 28;
            lines = lines.iter().flat_map(|l| wrap_words(l, MAX_CH)).collect();
        }
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
            // May be negative for a `left of` the first actor; a post-pass shifts
            // the whole diagram right so the leftmost note lands at FRAME_LEFT.
            left,
            top: self.y,
            width,
            height,
            lines,
        }
    }

    /// Shift the whole diagram right when a `left of` note (or anything) pokes
    /// past the left frame edge, so the leftmost element lands at FRAME_LEFT.
    fn shift_into_frame(&mut self) {
        let min_left = self
            .notes
            .iter()
            .map(|n| n.left)
            .chain(self.frags.iter().map(|f| f.left))
            .chain(self.centers.iter().map(|&c| c - HEAD_W / 2))
            .min()
            .unwrap_or(FRAME_LEFT);
        if min_left >= FRAME_LEFT {
            return;
        }
        let dx = FRAME_LEFT - min_left;
        for c in &mut self.centers {
            *c += dx;
        }
        for n in &mut self.notes {
            n.left += dx;
        }
        for f in &mut self.frags {
            f.left += dx;
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

/// Greedy word-wrap to at most `max_ch` characters per line.
fn wrap_words(line: &str, max_ch: usize) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    for w in line.split_whitespace() {
        if cur.is_empty() {
            cur = w.to_string();
        } else if cur.chars().count() + 1 + w.chars().count() <= max_ch {
            cur.push(' ');
            cur.push_str(w);
        } else {
            out.push(std::mem::take(&mut cur));
            cur = w.to_string();
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
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
