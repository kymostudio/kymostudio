//! Minimal TeX-math → Unicode for Mermaid `$…$` / `$$…$$` labels. This is **not**
//! a full KaTeX: it maps common commands (Greek letters, operators, relations,
//! arrows, set theory) to Unicode and flattens `\frac`/`\sqrt`/`\text`, so a
//! rasterised PNG/PDF shows readable math instead of raw LaTeX. Unknown commands
//! fall back to their bare name. Text with no matched `$` pair is unchanged.

/// Replace `<br>` / `<br/>` / `<br />` (any case) with a space — Mermaid treats
/// them as line breaks in labels.
pub fn strip_br(s: &str) -> String {
    let lower = s.to_ascii_lowercase();
    if !lower.contains("<br") {
        return s.to_string();
    }
    let chars: Vec<char> = s.chars().collect();
    let lc: Vec<char> = lower.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < chars.len() {
        if lc[i] == '<' && lc[i + 1..].starts_with(&['b', 'r']) {
            // consume up to and including the next '>'
            let mut j = i + 3;
            while j < chars.len() && chars[j] != '>' {
                j += 1;
            }
            if j < chars.len() {
                out.push(' ');
                i = j + 1;
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

/// Render every `$…$` / `$$…$$` math span in `s`; leave the rest verbatim.
pub fn render(s: &str) -> String {
    if !s.contains('$') {
        return s.to_string();
    }
    let chars: Vec<char> = s.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '$' {
            let dlen = if i + 1 < chars.len() && chars[i + 1] == '$' {
                2
            } else {
                1
            };
            let mut j = i + dlen;
            let mut close = None;
            while j < chars.len() {
                if chars[j] == '$' && (dlen == 1 || (j + 1 < chars.len() && chars[j + 1] == '$')) {
                    close = Some(j);
                    break;
                }
                j += 1;
            }
            if let Some(c) = close {
                let inner: String = chars[i + dlen..c].iter().collect();
                out.push_str(&render_tex(&inner));
                i = c + dlen;
                continue;
            }
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

fn render_tex(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < chars.len() {
        match chars[i] {
            '\\' => {
                let start = i + 1;
                let mut k = start;
                while k < chars.len() && chars[k].is_ascii_alphabetic() {
                    k += 1;
                }
                if k == start {
                    // `\<non-letter>`: spacing or an escaped literal.
                    if k < chars.len() {
                        match chars[k] {
                            ',' | '!' | ';' | ':' | ' ' => {}
                            '\\' => out.push(' '),
                            other => out.push(other),
                        }
                        i = k + 1;
                    } else {
                        i = k;
                    }
                    continue;
                }
                let cmd: String = chars[start..k].iter().collect();
                i = k;
                // A single space terminating a command name is absorbed (TeX rule).
                if i < chars.len() && chars[i] == ' ' {
                    i += 1;
                }
                match cmd.as_str() {
                    "frac" | "dfrac" | "tfrac" | "binom" => {
                        let a = read_group(&chars, &mut i);
                        let b = read_group(&chars, &mut i);
                        out.push_str(&render_tex(&a));
                        out.push('/');
                        out.push_str(&render_tex(&b));
                    }
                    "sqrt" => {
                        out.push('√');
                        let a = read_group(&chars, &mut i);
                        out.push_str(&render_tex(&a));
                    }
                    "text" | "textbf" | "textit" | "mathrm" | "mathbf" | "mathit" | "mathsf"
                    | "mathtt" | "mathcal" | "mathbb" | "operatorname" | "boldsymbol" => {
                        let a = read_group(&chars, &mut i);
                        out.push_str(&render_tex(&a));
                    }
                    // `\begin{env}` / `\end{env}` — drop the wrapper, keep the body.
                    "begin" | "end" => {
                        let _ = read_group(&chars, &mut i);
                    }
                    // Accents / over-under braces — render the inner content only.
                    "hat" | "widehat" | "bar" | "vec" | "tilde" | "widetilde" | "dot" | "ddot"
                    | "overline" | "underline" | "overbrace" | "underbrace" | "overrightarrow"
                    | "mathring" | "acute" | "grave" | "check" | "breve" => {
                        let a = read_group(&chars, &mut i);
                        out.push_str(&render_tex(&a));
                    }
                    "left" | "right" | "big" | "Big" | "bigg" | "Bigg" | "bigl" | "bigr"
                    | "biggl" | "biggr" | "Bigl" | "Bigr" | "relax" | "displaystyle"
                    | "textstyle" | "scriptstyle" | "limits" | "nolimits" | "quad" | "qquad" => {
                        if matches!(cmd.as_str(), "quad" | "qquad") {
                            out.push(' ');
                        }
                    }
                    // Function names render as their name plus a space (they take an
                    // argument: `\cos t` → `cos t`, not `cost`).
                    "sin" | "cos" | "tan" | "cot" | "sec" | "csc" | "sinh" | "cosh" | "tanh"
                    | "arcsin" | "arccos" | "arctan" | "log" | "ln" | "lg" | "exp" | "lim"
                    | "limsup" | "liminf" | "max" | "min" | "sup" | "inf" | "arg" | "deg"
                    | "det" | "dim" | "gcd" | "hom" | "ker" | "mod" | "bmod" => {
                        out.push_str(&cmd);
                        out.push(' ');
                    }
                    _ => match sym(&cmd) {
                        Some(u) => out.push_str(u),
                        None => out.push_str(&cmd),
                    },
                }
            }
            '{' | '}' | '$' => i += 1,
            '&' => {
                out.push(' '); // matrix/cases column separator
                i += 1;
            }
            '^' | '_' => {
                // Drop the marker; separate a braced operand (e.g. an overbrace
                // label ) with a space so its words stay distinct.
                i += 1;
                if i < chars.len() && chars[i] == '{' {
                    out.push(' ');
                }
            }
            '~' => {
                out.push(' ');
                i += 1;
            }
            c => {
                out.push(c);
                i += 1;
            }
        }
    }
    out
}

/// Read the next `{…}` group (or a single token) after a command.
fn read_group(chars: &[char], i: &mut usize) -> String {
    while *i < chars.len() && chars[*i] == ' ' {
        *i += 1;
    }
    if *i >= chars.len() {
        return String::new();
    }
    if chars[*i] == '{' {
        let mut depth = 0;
        let start = *i + 1;
        let mut k = *i;
        while k < chars.len() {
            match chars[k] {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        break;
                    }
                }
                _ => {}
            }
            k += 1;
        }
        let g: String = chars[start..k].iter().collect();
        *i = k + 1;
        g
    } else if chars[*i] == '\\' {
        let s = *i;
        let mut k = *i + 1;
        while k < chars.len() && chars[k].is_ascii_alphabetic() {
            k += 1;
        }
        let g: String = chars[s..k].iter().collect();
        *i = k;
        g
    } else {
        let g = chars[*i].to_string();
        *i += 1;
        g
    }
}

/// Map a TeX command name to a Unicode string (best effort, common subset).
fn sym(cmd: &str) -> Option<&'static str> {
    Some(match cmd {
        // lowercase Greek
        "alpha" => "α",
        "beta" => "β",
        "gamma" => "γ",
        "delta" => "δ",
        "epsilon" | "varepsilon" => "ε",
        "zeta" => "ζ",
        "eta" => "η",
        "theta" | "vartheta" => "θ",
        "iota" => "ι",
        "kappa" => "κ",
        "lambda" => "λ",
        "mu" => "μ",
        "nu" => "ν",
        "xi" => "ξ",
        "omicron" => "ο",
        "pi" | "varpi" => "π",
        "rho" | "varrho" => "ρ",
        "sigma" | "varsigma" => "σ",
        "tau" => "τ",
        "upsilon" => "υ",
        "phi" | "varphi" => "φ",
        "chi" => "χ",
        "psi" => "ψ",
        "omega" => "ω",
        // uppercase Greek
        "Gamma" => "Γ",
        "Delta" => "Δ",
        "Theta" => "Θ",
        "Lambda" => "Λ",
        "Xi" => "Ξ",
        "Pi" => "Π",
        "Sigma" => "Σ",
        "Upsilon" => "Υ",
        "Phi" => "Φ",
        "Psi" => "Ψ",
        "Omega" => "Ω",
        // operators
        "pm" => "±",
        "mp" => "∓",
        "times" => "×",
        "div" => "÷",
        "cdot" => "⋅",
        "ast" => "∗",
        "star" => "⋆",
        "circ" => "∘",
        "bullet" => "∙",
        "oplus" => "⊕",
        "ominus" => "⊖",
        "otimes" => "⊗",
        "odot" => "⊙",
        "setminus" => "∖",
        "wr" => "≀",
        // relations
        "leq" | "le" => "≤",
        "geq" | "ge" => "≥",
        "neq" | "ne" => "≠",
        "equiv" => "≡",
        "approx" => "≈",
        "cong" => "≅",
        "simeq" => "≃",
        "sim" => "∼",
        "propto" => "∝",
        "ll" => "≪",
        "gg" => "≫",
        "doteq" => "≐",
        "asymp" => "≍",
        "models" => "⊨",
        // set theory / logic
        "in" => "∈",
        "notin" => "∉",
        "ni" => "∋",
        "subset" => "⊂",
        "supset" => "⊃",
        "subseteq" => "⊆",
        "supseteq" => "⊇",
        "cap" => "∩",
        "cup" => "∪",
        "emptyset" | "varnothing" => "∅",
        "forall" => "∀",
        "exists" => "∃",
        "nexists" => "∄",
        "neg" | "lnot" => "¬",
        "wedge" | "land" => "∧",
        "vee" | "lor" => "∨",
        "oint" => "∮",
        "therefore" => "∴",
        "because" => "∵",
        // arrows
        "to" | "rightarrow" | "rarr" => "→",
        "leftarrow" | "larr" => "←",
        "leftrightarrow" => "↔",
        "Rightarrow" | "implies" => "⇒",
        "Leftarrow" => "⇐",
        "Leftrightarrow" | "iff" => "⇔",
        "mapsto" => "↦",
        "uparrow" => "↑",
        "downarrow" => "↓",
        "longrightarrow" => "⟶",
        "longleftarrow" => "⟵",
        "hookrightarrow" => "↪",
        // big operators
        "sum" => "∑",
        "prod" => "∏",
        "int" => "∫",
        "iint" => "∬",
        "bigcup" => "⋃",
        "bigcap" => "⋂",
        "coprod" => "∐",
        // misc symbols
        "infty" => "∞",
        "partial" => "∂",
        "nabla" => "∇",
        "angle" => "∠",
        "triangle" => "△",
        "square" => "□",
        "diamond" => "◇",
        "cdots" => "⋯",
        "ldots" | "dots" => "…",
        "vdots" => "⋮",
        "ddots" => "⋱",
        "prime" => "′",
        "surd" => "√",
        "top" => "⊤",
        "bot" => "⊥",
        "vdash" => "⊢",
        "perp" => "⊥",
        "parallel" => "∥",
        "mid" => "∣",
        "aleph" => "ℵ",
        "ell" => "ℓ",
        "hbar" => "ℏ",
        "Re" => "ℜ",
        "Im" => "ℑ",
        "wp" | "weierp" => "℘",
        "Z" => "ℤ",
        "R" => "ℝ",
        "N" => "ℕ",
        "Q" => "ℚ",
        "C" => "ℂ",
        "degree" => "°",
        "deg" => "deg",
        "pm0" => "±",
        "checkmark" => "✓",
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::render;

    #[test]
    fn maps_symbols_and_structure() {
        assert_eq!(render(r"a $\notin$ B"), "a ∉ B");
        assert_eq!(render(r"$\nabla f$"), "∇f");
        assert_eq!(render(r"$\alpha \to \beta$"), "α→β");
        assert_eq!(render(r"$\frac{a}{b}$"), "a/b");
        assert_eq!(render(r"$\sqrt{x}$"), "√x");
        assert_eq!(render(r"$\text{hello}$"), "hello");
        // unmatched `$` is left alone (e.g. a price)
        assert_eq!(render("costs $5 today"), "costs $5 today");
        // unknown command keeps its name
        assert_eq!(render(r"$\foobar$"), "foobar");
        // environments and accents flatten to their content
        assert_eq!(render(r"$\hat{x}$"), "x");
        let m = render(r"$\begin{cases} a & b \\ c \end{cases}$");
        assert!(m.contains('a') && m.contains('b') && m.contains('c') && !m.contains("begin"));
        // function names keep a space before their argument
        assert_eq!(render(r"$\cos t + \sin t$"), "cos t + sin t");
    }
}
