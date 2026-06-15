//! kymo-tex — a focused, KaTeX-accurate math renderer.
//!
//! Unlike RaTeX (which embeds its *own* glyph outlines and so diverges from
//! mermaid's KaTeX at the pixel level), kymo-tex renders `$$…$$` using **KaTeX's
//! own font files** (via `ttf-parser`), KaTeX metrics, and KaTeX inter-atom
//! spacing — so the raster-safe `<path>` output pixel-matches mermaid.js's KaTeX.
//!
//! Scope (incremental): single-line sequences of symbol atoms (Greek, Latin,
//! operators, relations, set theory). No fractions/scripts/radicals yet.

use ttf_parser::{Face, OutlineBuilder};

// KaTeX font outlines (units_per_em = 1000). ~226 KB total.
static MAIN_REGULAR: &[u8] = include_bytes!("../assets/katex-fonts/KaTeX_Main-Regular.ttf");
static MATH_ITALIC: &[u8] = include_bytes!("../assets/katex-fonts/KaTeX_Math-Italic.ttf");
static AMS_REGULAR: &[u8] = include_bytes!("../assets/katex-fonts/KaTeX_AMS-Regular.ttf");
static MAIN_ITALIC: &[u8] = include_bytes!("../assets/katex-fonts/KaTeX_Main-Italic.ttf");
static CALIGRAPHIC: &[u8] = include_bytes!("../assets/katex-fonts/KaTeX_Caligraphic-Regular.ttf");
static FRAKTUR: &[u8] = include_bytes!("../assets/katex-fonts/KaTeX_Fraktur-Regular.ttf");

#[derive(Clone, Copy, PartialEq, Eq)]
enum FontId {
    Main,
    MathItalic,
    Ams,
    MainItalic,
    Caligraphic,
    Fraktur,
}

fn font_bytes(f: FontId) -> &'static [u8] {
    match f {
        FontId::Main => MAIN_REGULAR,
        FontId::MathItalic => MATH_ITALIC,
        FontId::Ams => AMS_REGULAR,
        FontId::MainItalic => MAIN_ITALIC,
        FontId::Caligraphic => CALIGRAPHIC,
        FontId::Fraktur => FRAKTUR,
    }
}

/// KaTeX atom classes that drive inter-atom spacing. Op/Bin/Rel/... are
/// scaffolding for the operator/relation symbols added next (katex_002).
#[allow(dead_code)]
#[derive(Clone, Copy, PartialEq, Eq)]
enum Class {
    Ord,
    Op,
    Bin,
    Rel,
    Open,
    Close,
    Punct,
}

#[derive(Clone, Copy)]
struct Atom {
    ch: char,
    font: FontId,
    class: Class,
}

/// Inter-atom spacing in em (KaTeX: thin=3mu, med=4mu, thick=5mu; 1mu = 1/18 em).
/// Returns the space to insert *before* `cur` given `prev`.
fn spacing_em(prev: Class, cur: Class) -> f64 {
    use Class::*;
    const THIN: f64 = 3.0 / 18.0;
    const MED: f64 = 4.0 / 18.0;
    const THICK: f64 = 5.0 / 18.0;
    match (prev, cur) {
        (Ord, Op) | (Op, Ord) | (Op, Op) => THIN,
        (Ord, Bin) | (Bin, Ord) | (Op, Bin) | (Bin, Op) | (Open, Bin) | (Bin, Open) => MED,
        (Ord, Rel) | (Rel, Ord) | (Op, Rel) | (Rel, Op) | (Close, Rel) | (Rel, Close) => THICK,
        (Close, Op) | (Op, Close) => THIN,
        (Rel, Open) | (Open, Rel) => THICK,
        (Punct, _) => THIN,
        _ => 0.0,
    }
}

/// Map a LaTeX command (without backslash) to an atom. Returns the atom and the
/// font/class. Covers Greek + the symbols used by the katex corpus.
fn command_atom(cmd: &str) -> Option<Atom> {
    use Class::*;
    use FontId::*;
    // (char, font, class)
    let (ch, font, class): (char, FontId, Class) = match cmd {
        // lowercase greek (math italic, ord)
        "alpha" => ('\u{03b1}', MathItalic, Ord),
        "beta" => ('\u{03b2}', MathItalic, Ord),
        "gamma" => ('\u{03b3}', MathItalic, Ord),
        "delta" => ('\u{03b4}', MathItalic, Ord),
        "epsilon" => ('\u{03f5}', MathItalic, Ord),
        "zeta" => ('\u{03b6}', MathItalic, Ord),
        "eta" => ('\u{03b7}', MathItalic, Ord),
        "theta" => ('\u{03b8}', MathItalic, Ord),
        "iota" => ('\u{03b9}', MathItalic, Ord),
        "kappa" => ('\u{03ba}', MathItalic, Ord),
        "lambda" => ('\u{03bb}', MathItalic, Ord),
        "mu" => ('\u{03bc}', MathItalic, Ord),
        "nu" => ('\u{03bd}', MathItalic, Ord),
        "xi" => ('\u{03be}', MathItalic, Ord),
        "omicron" => ('\u{03bf}', MathItalic, Ord),
        "pi" => ('\u{03c0}', MathItalic, Ord),
        "rho" => ('\u{03c1}', MathItalic, Ord),
        "sigma" => ('\u{03c3}', MathItalic, Ord),
        "tau" => ('\u{03c4}', MathItalic, Ord),
        "upsilon" => ('\u{03c5}', MathItalic, Ord),
        "phi" => ('\u{03d5}', MathItalic, Ord),
        "chi" => ('\u{03c7}', MathItalic, Ord),
        "psi" => ('\u{03c8}', MathItalic, Ord),
        "omega" => ('\u{03c9}', MathItalic, Ord),
        // uppercase greek — distinct glyphs (main regular, upright, ord)
        "Gamma" => ('\u{0393}', Main, Ord),
        "Delta" => ('\u{0394}', Main, Ord),
        "Theta" => ('\u{0398}', Main, Ord),
        "Lambda" => ('\u{039b}', Main, Ord),
        "Xi" => ('\u{039e}', Main, Ord),
        "Pi" => ('\u{03a0}', Main, Ord),
        "Sigma" => ('\u{03a3}', Main, Ord),
        "Upsilon" => ('\u{03a5}', Main, Ord),
        "Phi" => ('\u{03a6}', Main, Ord),
        "Psi" => ('\u{03a8}', Main, Ord),
        "Omega" => ('\u{03a9}', Main, Ord),
        // uppercase greek — Latin look-alikes (\mathrm upright, main, ord)
        "Alpha" => ('A', Main, Ord),
        "Beta" => ('B', Main, Ord),
        "Epsilon" => ('E', Main, Ord),
        "Zeta" => ('Z', Main, Ord),
        "Eta" => ('H', Main, Ord),
        "Iota" => ('I', Main, Ord),
        "Kappa" => ('K', Main, Ord),
        "Mu" => ('M', Main, Ord),
        "Nu" => ('N', Main, Ord),
        "Omicron" => ('O', Main, Ord),
        "Rho" => ('P', Main, Ord),
        "Tau" => ('T', Main, Ord),
        "Chi" => ('X', Main, Ord),
        _ => return None,
    };
    Some(Atom { ch, font, class })
}

/// Tokenize a formula into atoms. Backslash commands + bare characters.
fn parse_atoms(src: &str) -> Vec<Atom> {
    let mut atoms = Vec::new();
    let chars: Vec<char> = src.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c == '\\' {
            // read command name (letters)
            let mut j = i + 1;
            while j < chars.len() && chars[j].is_ascii_alphabetic() {
                j += 1;
            }
            let cmd: String = chars[i + 1..j].iter().collect();
            if let Some(a) = command_atom(&cmd) {
                atoms.push(a);
            }
            i = if j > i + 1 { j } else { i + 2 };
        } else if c.is_whitespace() {
            i += 1;
        } else {
            // bare char: Latin letters are math-italic ord; digits main ord
            let (font, class) = if c.is_ascii_alphabetic() {
                (FontId::MathItalic, Class::Ord)
            } else {
                (FontId::Main, Class::Ord)
            };
            atoms.push(Atom { ch: c, font, class });
            i += 1;
        }
    }
    atoms
}

struct Pen {
    d: String,
    ox: f64, // pen x origin in em
    upem: f64,
    ymin: f64,
    ymax: f64,
}

impl Pen {
    fn fx(&self, x: f32) -> f64 {
        self.ox + x as f64 / self.upem
    }
    fn fy(&self, y: f32) -> f64 {
        -(y as f64) / self.upem // flip to y-down, baseline 0
    }
}

impl OutlineBuilder for Pen {
    fn move_to(&mut self, x: f32, y: f32) {
        let (px, py) = (self.fx(x), self.fy(y));
        self.d.push_str(&format!("M{:.3} {:.3}", px, py));
    }
    fn line_to(&mut self, x: f32, y: f32) {
        let (px, py) = (self.fx(x), self.fy(y));
        self.d.push_str(&format!("L{:.3} {:.3}", px, py));
    }
    fn quad_to(&mut self, x1: f32, y1: f32, x: f32, y: f32) {
        let (p1, q1) = (self.fx(x1), self.fy(y1));
        let (px, py) = (self.fx(x), self.fy(y));
        self.d
            .push_str(&format!("Q{:.3} {:.3} {:.3} {:.3}", p1, q1, px, py));
    }
    fn curve_to(&mut self, x1: f32, y1: f32, x2: f32, y2: f32, x: f32, y: f32) {
        let (p1, q1) = (self.fx(x1), self.fy(y1));
        let (p2, q2) = (self.fx(x2), self.fy(y2));
        let (px, py) = (self.fx(x), self.fy(y));
        self.d.push_str(&format!(
            "C{:.3} {:.3} {:.3} {:.3} {:.3} {:.3}",
            p1, q1, p2, q2, px, py
        ));
    }
    fn close(&mut self) {
        self.d.push('Z');
    }
}

/// Render a math formula to (inner SVG paths in em coords, top-left box origin),
/// width_em, height_em. `None` if nothing rendered.
pub fn render(formula: &str) -> Option<(String, f64, f64)> {
    let normalized = formula.replace("\\\\", "\\");
    let atoms = parse_atoms(normalized.trim());
    if atoms.is_empty() {
        return None;
    }
    // Parse each needed font once.
    let faces: Vec<(FontId, Face)> = [
        FontId::Main,
        FontId::MathItalic,
        FontId::Ams,
        FontId::MainItalic,
        FontId::Caligraphic,
        FontId::Fraktur,
    ]
    .into_iter()
    .filter_map(|f| Face::parse(font_bytes(f), 0).ok().map(|face| (f, face)))
    .collect();
    let face_of = |id: FontId| faces.iter().find(|(f, _)| *f == id).map(|(_, fc)| fc);

    let mut pen = Pen {
        d: String::new(),
        ox: 0.0,
        upem: 1000.0,
        ymin: 0.0,
        ymax: 0.0,
    };
    let mut prev: Option<Class> = None;
    for a in &atoms {
        let Some(face) = face_of(a.font) else {
            continue;
        };
        pen.upem = face.units_per_em() as f64;
        if let Some(p) = prev {
            pen.ox += spacing_em(p, a.class);
        }
        let gid = match face.glyph_index(a.ch) {
            Some(g) => g,
            None => {
                prev = Some(a.class);
                continue;
            }
        };
        let adv = face.glyph_hor_advance(gid).unwrap_or(0) as f64 / pen.upem;
        if let Some(bbox) = face.outline_glyph(gid, &mut pen) {
            // true ink extent (font y-up) -> flipped y-down em
            let top = -(bbox.y_max as f64) / pen.upem;
            let bot = -(bbox.y_min as f64) / pen.upem;
            if top < pen.ymin {
                pen.ymin = top;
            }
            if bot > pen.ymax {
                pen.ymax = bot;
            }
        }
        pen.ox += adv;
        prev = Some(a.class);
    }
    let width = pen.ox;
    if width <= 0.0 || pen.d.is_empty() {
        return None;
    }
    // Normalise: shift y so the box top is 0 (paths currently baseline-relative).
    let height = pen.ymax - pen.ymin;
    let shift = -pen.ymin;
    let inner = format!(
        "<g transform=\"translate(0,{:.3})\"><path d=\"{}\" fill=\"#000\"/></g>",
        shift, pen.d
    );
    Some((inner, width, height))
}
