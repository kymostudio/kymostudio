//! mermaid-faithful flowchart **layout** via merman, driven by kymo's
//! **browser-calibrated** text metrics, then rendered raster-safe by kymo.
//!
//! merman's own `VendoredFontMetricsTextMeasurer` measures text from vendored
//! font tables, which sit ~1px off the browser — that's the ~2.8% merman floor.
//! kymo's [`text_w_mermaid`](kymo_graph::layout::text_w_mermaid) is calibrated to the
//! *actual browser* (the `w`-glyph fix etc.), so feeding it into merman's exact
//! dagre layout sizes nodes the way mermaid.js does. Positions then match
//! mermaid.js more tightly than merman itself. Shapes/labels/styles come from
//! kymo's own parse (mapped by node id); merman supplies positions.

use kymo_graph::dagre_svg::{FEdge, FGeom, FNode, FRegion};
use kymo_graph::flowchart::{Direction, FlowEdge, FlowNode, Flowchart, Subgraph};
use kymo_graph::layout::text_w_mermaid;
use kymo_graph::model::Shape;
use merman_core::diagrams::flowchart::{parse_flowchart, parse_flowchart_model_for_render};
use merman_core::{MermaidConfig, ParseMetadata};

/// Map a merman/mermaid `layoutShape` name to one of kymo's shapes — the same
/// vocabulary kymo's own `mermaid::lexer::map_shape` uses, so the two parsers agree.
fn map_merman_shape(name: Option<&str>) -> Shape {
    match name.unwrap_or("").trim().to_ascii_lowercase().as_str() {
        "circle" | "circ" | "dbl-circ" | "fr-circ" | "doublecircle" => Shape::Circle,
        "diam" | "diamond" | "decision" | "fork" | "join" => Shape::Diamond,
        "hex" | "hexagon" | "prepare" => Shape::Hex,
        "cyl" | "cylinder" | "db" | "das" | "database" | "disk" | "lin-cyl" => Shape::Cylinder,
        "stadium" | "pill" | "term" | "terminal" | "rounded" => Shape::Badge,
        _ => Shape::Box,
    }
}

/// merman's flowchart parser/grammar does NOT strip preprocessing — a leading
/// `%%{init}%%` directive or `%%` comment line makes it reject the source (it expects
/// `flowchart`/`graph` first). Drop `%%` lines so both the model parse and the layout
/// parse succeed (otherwise layout falls back to kymo's own dagre, diverging).
fn strip_directives(src: &str) -> String {
    src.lines()
        .filter(|l| !l.trim_start().starts_with("%%"))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Read a CSS property value from a `{…}` block, matching `prop:` exactly (so
/// `stroke` doesn't match `stroke-width`). Returns the value up to `;`/`}`.
fn css_prop(block: &str, prop: &str) -> Option<String> {
    let mut from = 0;
    while let Some(rel) = block[from..].find(prop) {
        let at = from + rel;
        let after = &block[at + prop.len()..];
        if after.starts_with(':') {
            let val: String = after[1..].chars().take_while(|c| *c != ';' && *c != '}').collect();
            let v = val.trim();
            if !v.is_empty() {
                return Some(v.to_string());
            }
        }
        from = at + prop.len();
    }
    None
}

/// Lift the computed theme palette from merman's themed render (merman already runs
/// mermaid's khroma-based theme engine, so its CSS carries the *exact* derived
/// colours — no need to port the color math). Maps merman's selectors to kymo's.
/// `%%{init: {"look":"neo"}}%%` — the neo node look (gradient stroke + drop-shadow).
#[cfg(feature = "full")]
fn is_neo_look(src: &str) -> bool {
    let low = src.to_ascii_lowercase();
    low.contains("%%{init") && low.contains("look") && low.contains("neo")
}

/// Lift merman's `<linearGradient>` def (theme-derived stops, byte-identical to
/// mermaid's), re-id'd to `fc-theme-gradient` for kymo's neo gradient stroke.
#[cfg(feature = "full")]
fn lift_gradient_def(svg: &str) -> Option<String> {
    let i = svg.find("<linearGradient")?;
    let end = svg[i..].find("</linearGradient>")? + i + "</linearGradient>".len();
    let def = &svg[i..end];
    // rename the first id="…" to a stable kymo id
    let s = def.find("id=\"")?;
    let vs = s + 4;
    let e = def[vs..].find('"')?;
    Some(format!("{}id=\"fc-theme-gradient\"{}", &def[..s], &def[vs + e + 1..]))
}

#[cfg(feature = "full")]
fn extract_theme_colors(svg: &str, neo: bool) -> kymo_graph::dagre_svg::ThemeColors {
    let block = |sel: &str| -> Option<&str> {
        let i = svg.find(sel)?;
        let open = svg[i..].find('{')? + i;
        let close = svg[open..].find('}')? + open;
        Some(&svg[open + 1..close])
    };
    let p = |sel: &str, prop: &str| block(sel).and_then(|b| css_prop(b, prop));
    kymo_graph::dagre_svg::ThemeColors {
        node_fill: p(".node rect", "fill"),
        node_stroke: p(".node rect", "stroke"),
        line: p(".flowchart-link", "stroke"),
        text: p(".label text", "fill").or_else(|| p("#merman", "fill")),
        cluster_fill: p(".cluster rect", "fill"),
        cluster_stroke: p(".cluster rect", "stroke"),
        background: None, // mermaid base keeps a light bg even in darkMode; kymo's ~matches
        // neo look: gradient node stroke (only when a theme-derived gradient exists) +
        // drop-shadow. merman defines the gradient but flat-fills — kymo applies it.
        gradient: if neo { lift_gradient_def(svg) } else { None },
        drop_shadow: neo,
    }
}

/// A subgraph id can be an edge endpoint (`A --> B` between two subgraphs). mermaid
/// draws a cluster-to-cluster edge; kymo has no cluster-edge, so resolve the subgraph
/// to a representative member node — keeping node + edge counts correct (no phantom
/// node). Returns `id` unchanged when it is already a real node.
fn resolve_subgraph_endpoint(id: &str, sub_members: &HashMap<&str, &Vec<String>>, depth: u8) -> String {
    if depth > 8 {
        return id.to_string();
    }
    match sub_members.get(id) {
        None => id.to_string(), // a real node, not a subgraph
        Some(members) => members
            .iter()
            .map(|m| resolve_subgraph_endpoint(m, sub_members, depth + 1))
            .find(|r| !sub_members.contains_key(r.as_str()))
            .unwrap_or_else(|| id.to_string()),
    }
}

/// Build kymo's `Flowchart` IR from **merman's** parser (a faithful LALRPOP port of
/// mermaid.js's grammar) instead of kymo's own hand-written parser, translating
/// merman's render model into kymo structs. Gives kymo merman's 100%-topology parse —
/// fixing kymo-parser divergences (multi-line `["…"]` labels, `.`-in-ids, subgraph
/// member counts). `None` on parse failure (caller falls back to kymo's parser).
pub fn flowchart_from_merman(src: &str) -> Option<Flowchart> {
    let meta = ParseMetadata {
        diagram_type: "flowchart-v2".to_string(),
        config: MermaidConfig::default(),
        effective_config: MermaidConfig::default(),
        title: None,
    };
    let model = parse_flowchart_model_for_render(&strip_directives(src), &meta).ok()?;
    let direction = match model
        .direction
        .as_deref()
        .unwrap_or("TB")
        .to_ascii_uppercase()
        .as_str()
    {
        "LR" => Direction::Lr,
        "RL" => Direction::Rl,
        "BT" => Direction::Bt,
        _ => Direction::Tb,
    };
    let sub_members: HashMap<&str, &Vec<String>> = model
        .subgraphs
        .iter()
        .map(|s| (s.id.as_str(), &s.nodes))
        .collect();
    // merman lists a subgraph id as a node too (it can be an edge endpoint); mermaid
    // draws those as clusters, not nodes — exclude them so node counts match.
    let nodes = model
        .nodes
        .iter()
        .filter(|n| !sub_members.contains_key(n.id.as_str()))
        .map(|n| FlowNode {
            id: n.id.clone(),
            label: n.label.clone().unwrap_or_else(|| n.id.clone()),
            shape: map_merman_shape(n.layout_shape.as_deref()),
        })
        .collect();
    let edges = model
        .edges
        .iter()
        .map(|e| FlowEdge {
            src: resolve_subgraph_endpoint(&e.from, &sub_members, 0),
            dst: resolve_subgraph_endpoint(&e.to, &sub_members, 0),
            label: e.label.clone().unwrap_or_default(),
            dashed: e.stroke.as_deref() == Some("dotted"),
            no_arrow: e.edge_type.as_deref() == Some("arrow_open"),
        })
        .collect();
    let sub_ids: Vec<&str> = model.subgraphs.iter().map(|s| s.id.as_str()).collect();
    let subgraphs = model
        .subgraphs
        .iter()
        .map(|s| Subgraph {
            id: s.id.clone(),
            title: s.title.clone(),
            members: s
                .nodes
                .iter()
                .filter(|m| !sub_ids.contains(&m.as_str()))
                .cloned()
                .collect(),
            parent: model
                .subgraphs
                .iter()
                .position(|p| p.id != s.id && p.nodes.iter().any(|m| m == &s.id)),
        })
        .collect();
    Some(Flowchart {
        direction,
        nodes,
        edges,
        subgraphs,
    })
}
use merman_render::flowchart::layout_flowchart_v2;
use merman_render::svg::{render_flowchart_v2_svg, SvgRenderOptions};
use merman_render::text::{TextMeasurer, TextMetrics, TextStyle, WrapMode};
use std::collections::HashMap;

const MARGIN: f64 = 8.0;

/// Text measurer backed by kymo's browser-calibrated `CHAR_W_MERMAID`.
struct KymoTextMeasurer;

impl KymoTextMeasurer {
    fn line_height(style: &TextStyle) -> f64 {
        // mermaid wrapped-label rows are ~24px at the 16px flowchart font.
        style.font_size * 1.5
    }
    fn is_bold(style: &TextStyle) -> bool {
        style.font_weight.as_deref().is_some_and(|w| {
            w.eq_ignore_ascii_case("bold") || w.parse::<u32>().is_ok_and(|n| n >= 600)
        })
    }
    fn scaled_width(line: &str, style: &TextStyle) -> f64 {
        // mermaid's trebuchet bold runs ~4.7% wider than regular.
        let bold = if Self::is_bold(style) { 1.047 } else { 1.0 };
        text_w_mermaid(line) * (style.font_size / 16.0) * bold
    }
}

fn wrap_at(text: &str, max_w_16px: f64) -> Vec<String> {
    let mut lines: Vec<String> = Vec::new();
    let mut cur = String::new();
    for word in text.split_whitespace() {
        let trial = if cur.is_empty() {
            word.to_string()
        } else {
            format!("{cur} {word}")
        };
        if !cur.is_empty() && text_w_mermaid(&trial) > max_w_16px {
            lines.push(std::mem::take(&mut cur));
            cur = word.to_string();
        } else {
            cur = trial;
        }
    }
    if !cur.is_empty() || lines.is_empty() {
        lines.push(cur);
    }
    lines
}

impl TextMeasurer for KymoTextMeasurer {
    fn measure(&self, text: &str, style: &TextStyle) -> TextMetrics {
        let lines: Vec<&str> = text.split('\n').collect();
        let width = lines
            .iter()
            .map(|l| Self::scaled_width(l, style))
            .fold(0.0_f64, f64::max);
        let line_count = lines.len().max(1);
        TextMetrics {
            width,
            height: line_count as f64 * Self::line_height(style),
            line_count,
        }
    }

    fn measure_wrapped(
        &self,
        text: &str,
        style: &TextStyle,
        max_width: Option<f64>,
        _wrap_mode: WrapMode,
    ) -> TextMetrics {
        let scale = (style.font_size / 16.0).max(0.001);
        let mut lines: Vec<String> = Vec::new();
        let mut soft_wrapped = false;
        for hard in text.split('\n') {
            match max_width {
                Some(mw) => {
                    let t = mw / scale / if Self::is_bold(style) { 1.047 } else { 1.0 };
                    let segs = wrap_at(hard, t);
                    if segs.len() > 1 {
                        soft_wrapped = true;
                    }
                    lines.extend(segs);
                }
                None => lines.push(hard.to_string()),
            }
        }
        if lines.is_empty() {
            lines.push(String::new());
        }
        let mut width = lines
            .iter()
            .map(|l| Self::scaled_width(l, style))
            .fold(0.0_f64, f64::max);
        // mermaid sizes a soft-wrapped node to the *wrapping width*, not its widest
        // actual line (the foreignObject is fixed to wrappingWidth and the text
        // reflows inside it). Match that so wrapped nodes aren't sized too narrow.
        if soft_wrapped {
            if let Some(mw) = max_width {
                width = width.max(mw);
            }
        }
        let line_count = lines.len();
        TextMetrics {
            width,
            height: line_count as f64 * Self::line_height(style),
            line_count,
        }
    }
}

/// mermaid renders a leading FontAwesome token (`fa:fa-cogs ...`, `fab:...`) as an
/// icon glyph, not text. merman sizes the node for icon+text, but kymo draws the
/// label as text — so strip the icon token to avoid a giant text overflow (the
/// glyph itself is dropped; the text is then placed at merman's correct position).
fn strip_node_icon(label: &str) -> String {
    let trimmed = label.trim_start();
    let first = trimmed.split_whitespace().next().unwrap_or("");
    let is_icon = matches!(
        first.split(':').next(),
        Some("fa" | "fab" | "fas" | "far" | "fal" | "fad")
    ) && first.contains(':');
    if is_icon {
        trimmed[first.len()..].trim_start().to_string()
    } else {
        label.to_string()
    }
}

/// Find the byte index just past the `</g>` matching the `<g` at `start`.
fn balanced_g_end(b: &[u8], start: usize) -> Option<usize> {
    let mut depth = 0i32;
    let mut i = start;
    while i < b.len() {
        if i + 2 <= b.len()
            && &b[i..i + 2] == b"<g"
            && (i + 2 == b.len() || matches!(b[i + 2], b' ' | b'>' | b'/' | b'\n' | b'\t'))
        {
            depth += 1;
            i += 2;
        } else if i + 4 <= b.len() && &b[i..i + 4] == b"</g>" {
            depth -= 1;
            i += 4;
            if depth == 0 {
                return Some(i);
            }
        } else {
            i += 1;
        }
    }
    None
}

/// Extract each `@{icon}` node's inner SVG from merman's render, keyed by node id.
/// The inner content has coordinates relative to the node centre, so the caller
/// re-wraps it in `<g transform="translate(cx,cy)">`.
fn extract_icon_inners(svg: &str) -> std::collections::HashMap<String, String> {
    let mut out = std::collections::HashMap::new();
    let b = svg.as_bytes();
    let needle = "class=\"icon-shape";
    let mut from = 0;
    while let Some(rel) = svg[from..].find(needle) {
        let cls = from + rel;
        let gstart = svg[..cls].rfind("<g").unwrap_or(cls);
        from = cls + needle.len();
        let Some(end) = balanced_g_end(b, gstart) else {
            continue;
        };
        let group = match std::str::from_utf8(&b[gstart..end]) {
            Ok(g) => g,
            Err(_) => continue,
        };
        // node id from id="merman-flowchart-{id}-{n}"
        let pre = "id=\"merman-flowchart-";
        let Some(ip) = group.find(pre) else { continue };
        let id_start = ip + pre.len();
        let Some(iq) = group[id_start..].find('"') else {
            continue;
        };
        let full = &group[id_start..id_start + iq];
        let id = full
            .rsplit_once('-')
            .map(|(a, _)| a)
            .unwrap_or(full)
            .to_string();
        // inner = group minus the outer <g ...> and trailing </g>
        let Some(open_end) = group.find('>') else {
            continue;
        };
        if group.len() < open_end + 1 + 4 {
            continue;
        }
        let inner = &group[open_end + 1..group.len() - 4];
        out.insert(id, inner.to_string());
        from = end;
    }
    out
}

/// Pixels-per-em for KaTeX math. kymo-tex now uses KaTeX's own font metrics, so
/// the per-glyph em-widths match KaTeX exactly; the only free parameter is the
/// render scale. mermaid renders the KaTeX label at **18px/em** (observed in the
/// mmdc SVG: `font-size:18px` on the `.katex` span — KaTeX's 1.21em default off
/// mermaid's ~14.9px math base), so size + draw math at 18.
const MATH_PX_PER_EM: f64 = 18.0;

/// kymo-tex layout of one `$$…$$` formula -> (width_em, height_em, baseline_em, inner SVG).
/// Uses KaTeX's own fonts so the raster pixel-matches mermaid's KaTeX.
fn ratex_dims_svg(formula: &str) -> Option<(f64, f64, f64, String)> {
    crate::katex::render(formula).map(|(inner, w, h, base)| (w, h, base, inner))
}

/// Render a `$$…$$` formula to an inline `<g>` of raster-safe glyph paths, scaled
/// em→px and centred (ink-box midpoint) at the node origin — mermaid centres the
/// KaTeX element's box, which empirically beats math-axis centring here. `None`
/// if kymo-tex can't parse it.
fn render_math_group(formula: &str) -> Option<String> {
    let (w_em, h_em, _base_em, inner) = ratex_dims_svg(formula)?;
    let (wpx, hpx) = (w_em * MATH_PX_PER_EM, h_em * MATH_PX_PER_EM);
    Some(format!(
        "<g transform=\"translate({:.2},{:.2}) scale({:.4})\">{}</g>",
        -wpx / 2.0,
        -hpx / 2.0,
        MATH_PX_PER_EM,
        inner
    ))
}

/// Math renderer that sizes a `$$…$$` node by RaTeX dimensions at mermaid's KaTeX
/// scale, so merman's layout box matches what kymo draws via `FNode.math`.
#[derive(Debug)]
struct KymoMathRenderer;

impl merman_render::math::MathRenderer for KymoMathRenderer {
    fn render_html_label(&self, text: &str, _config: &MermaidConfig) -> Option<String> {
        // Non-empty so merman engages its math sizing path; the HTML itself is
        // unused (kymo draws the glyphs from FNode.math).
        if math_only_formula(text).is_some() {
            Some(String::from("<span class=\"katex\"></span>"))
        } else {
            None
        }
    }

    fn measure_html_label(
        &self,
        text: &str,
        _config: &MermaidConfig,
        style: &TextStyle,
        _max_width_px: Option<f64>,
        _wrap_mode: WrapMode,
    ) -> Option<TextMetrics> {
        let formula = math_only_formula(text)?;
        // merman HTML-encodes label chars (e.g. `=` -> `&#61;`) and we protected
        // `\\` as MATH_BS — undo both so kymo-tex sees the real TeX, else parse
        // fails and the node falls back to OVERSIZED plain text.
        let restored = decode_html_entities(&formula.replace(MATH_BS, "\\\\"));
        let (w_em, h_em, _, _) = ratex_dims_svg(&restored)?;
        let s = style.font_size / 16.0 * MATH_PX_PER_EM;
        Some(TextMetrics {
            width: w_em * s,
            height: h_em * s,
            line_count: 1,
        })
    }
}

/// Decode the HTML entities merman emits in label text (`&#61;` for `=`,
/// `&amp;`/`&lt;`/`&gt;`/`&quot;`/`&#39;`, plus numeric `&#NN;` / `&#xHH;`) back
/// to their characters, so kymo-tex parses the real TeX. Without this, any math
/// label containing `=` (etc.) fails to parse and the node is mis-sized.
fn decode_html_entities(s: &str) -> String {
    if !s.contains('&') {
        return s.to_string();
    }
    let mut out = String::with_capacity(s.len());
    let b = s.as_bytes();
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'&' {
            if let Some(semi_rel) = s[i + 1..].find(';') {
                let body = &s[i + 1..i + 1 + semi_rel];
                let decoded = match body {
                    "amp" => Some('&'),
                    "lt" => Some('<'),
                    "gt" => Some('>'),
                    "quot" => Some('"'),
                    "apos" | "#39" => Some('\''),
                    "nbsp" => Some('\u{a0}'),
                    _ => body
                        .strip_prefix('#')
                        .map(|n| n.strip_prefix(['x', 'X']))
                        .and_then(|hex| match hex {
                            Some(h) => u32::from_str_radix(h, 16).ok(),
                            None => body[1..].parse::<u32>().ok(),
                        })
                        .and_then(char::from_u32),
                };
                if let Some(c) = decoded {
                    out.push(c);
                    i += 1 + semi_rel + 1;
                    continue;
                }
            }
        }
        let ch = s[i..].chars().next().unwrap();
        out.push(ch);
        i += ch.len_utf8();
    }
    out
}

/// Placeholder swapped in for `\\` inside `$$…$$` so merman's line-splitter
/// leaves the math intact; restored to `\\` in `measure_html_label`.
const MATH_BS: char = '\u{1}';

/// Replace `\\` with [`MATH_BS`] inside every `$$…$$` span of `src`, leaving
/// text outside math untouched (where `\\` may be a real mermaid line break).
fn protect_math_double_backslash(src: &str) -> String {
    let mut out = String::with_capacity(src.len());
    let b = src.as_bytes();
    let mut i = 0;
    let mut in_math = false;
    while i < b.len() {
        if b[i] == b'$' && i + 1 < b.len() && b[i + 1] == b'$' {
            out.push_str("$$");
            in_math = !in_math;
            i += 2;
        } else if in_math && b[i] == b'\\' && i + 1 < b.len() && b[i + 1] == b'\\' {
            out.push(MATH_BS);
            i += 2;
        } else {
            let ch = src[i..].chars().next().unwrap();
            out.push(ch);
            i += ch.len_utf8();
        }
    }
    out
}

/// The single `$$…$$` formula in a label, if the whole label is one math span.
fn math_only_formula(label: &str) -> Option<&str> {
    let t = label.trim().trim_matches(['"', '\'']).trim();
    let inner = t.strip_prefix("$$")?.strip_suffix("$$")?;
    if inner.is_empty() || inner.contains("$$") {
        None
    } else {
        Some(inner)
    }
}

/// Build kymo float geometry from merman's mermaid-faithful layout, sized with
/// kymo's browser-calibrated metrics. `None` on any parse/layout failure.
pub fn build_geom(src: &str, fc: &Flowchart) -> Option<FGeom> {
    let meta = ParseMetadata {
        diagram_type: "flowchart-v2".to_string(),
        config: MermaidConfig::default(),
        effective_config: MermaidConfig::default(),
        title: None,
    };
    // merman splits flowchart labels on `\\` as line breaks — even inside
    // `$$…$$`, where mermaid.js does NOT (there `\\` is a KaTeX row separator,
    // and `\\command` is an escape). That split unbalances the `$$` per line, so
    // merman can't math-measure the node and falls back to OVERSIZED plain
    // multi-line text — wrecking the layout of any node/edge whose math contains
    // `\\` (matrices, cases, `\\,` spacing, double-escaped commands). Protect
    // `\\` inside `$$…$$` with a placeholder; `measure_html_label` restores it
    // before kymo-tex measures, so nodes get their true KaTeX size.
    let protected = protect_math_double_backslash(&strip_directives(src));
    let semantic = parse_flowchart(&protected, &meta).ok()?;
    let config = MermaidConfig::default();
    let measurer = KymoTextMeasurer;
    let math = KymoMathRenderer;
    let layout = layout_flowchart_v2(&semantic, &config, &measurer, Some(&math)).ok()?;
    // Lift merman's raster-safe iconify glyphs for @{icon} nodes (best-effort).
    let icons = render_flowchart_v2_svg(
        &layout,
        &semantic,
        &serde_json::Value::Null,
        None,
        &measurer,
        &SvgRenderOptions::default(),
    )
    .ok()
    .map(|svg| extract_icon_inners(&svg))
    .unwrap_or_default();

    let (ox, oy) = match &layout.bounds {
        Some(b) => (MARGIN - b.min_x, MARGIN - b.min_y),
        None => (MARGIN, MARGIN),
    };

    // Raw labels (pre-clean) to detect `$$…$$` math spans before math::render
    // converts them to Unicode — for both node labels and edge labels.
    let raw_parse = crate::mermaid::parse(src).ok();
    let raw_math: HashMap<String, String> = raw_parse
        .as_ref()
        .map(|f| {
            f.nodes
                .iter()
                .filter_map(|n| math_only_formula(&n.label).map(|m| (n.id.clone(), m.to_string())))
                .collect()
        })
        .unwrap_or_default();
    let raw_edge_math: HashMap<(String, String), String> = raw_parse
        .as_ref()
        .map(|f| {
            f.edges
                .iter()
                .filter_map(|e| {
                    math_only_formula(&e.label)
                        .map(|m| ((e.src.clone(), e.dst.clone()), m.to_string()))
                })
                .collect()
        })
        .unwrap_or_default();

    let by_id: HashMap<&str, &kymo_graph::flowchart::FlowNode> =
        fc.nodes.iter().map(|n| (n.id.as_str(), n)).collect();
    let sg_title: HashMap<&str, &str> = fc
        .subgraphs
        .iter()
        .map(|s| (s.id.as_str(), s.title.as_str()))
        .collect();
    let edge_info: HashMap<(&str, &str), (&str, bool, bool)> = fc
        .edges
        .iter()
        .map(|e| {
            (
                (e.src.as_str(), e.dst.as_str()),
                (e.label.as_str(), e.dashed, e.no_arrow),
            )
        })
        .collect();

    let mut geom = FGeom::default();
    for ln in &layout.nodes {
        if ln.is_cluster {
            continue;
        }
        let Some(kn) = by_id.get(ln.id.as_str()) else {
            continue;
        };
        geom.nodes.push(FNode {
            id: ln.id.clone(),
            name: strip_node_icon(&kn.label),
            shape: kn.shape,
            cx: ln.x + ox,
            cy: ln.y + oy,
            w: ln.width,
            h: ln.height,
            icon: icons.get(ln.id.as_str()).cloned(),
            math: raw_math
                .get(ln.id.as_str())
                .and_then(|f| render_math_group(f)),
        });
    }
    if geom.nodes.is_empty() {
        return None;
    }
    for lc in &layout.clusters {
        let label = sg_title
            .get(lc.id.as_str())
            .copied()
            .unwrap_or("")
            .to_string();
        geom.regions.push(FRegion {
            id: lc.id.clone(),
            label,
            x: lc.x - lc.width / 2.0 + ox,
            y: lc.y - lc.height / 2.0 + oy,
            w: lc.width,
            h: lc.height,
            visible: true,
        });
    }
    for le in &layout.edges {
        let (label, dashed, no_arrow) = edge_info
            .get(&(le.from.as_str(), le.to.as_str()))
            .copied()
            .unwrap_or(("", false, false));
        let points: Vec<(f64, f64)> = le.points.iter().map(|p| (p.x + ox, p.y + oy)).collect();
        let label_pt = le.label.as_ref().map(|l| (l.x + ox, l.y + oy));
        // merman already sized the edge-label box for the KaTeX dims, so drawing
        // the glyphs (instead of the Unicode fallback text) fits that box.
        let math = raw_edge_math
            .get(&(le.from.clone(), le.to.clone()))
            .and_then(|f| render_math_group(f));
        geom.edges.push(FEdge {
            label: label.to_string(),
            dashed,
            no_arrow,
            points,
            label_pt,
            math,
        });
    }
    match &layout.bounds {
        Some(b) => {
            geom.w = b.max_x - b.min_x + 2.0 * MARGIN;
            geom.h = b.max_y - b.min_y + 2.0 * MARGIN;
        }
        None => {
            geom.w = geom
                .nodes
                .iter()
                .map(|n| n.cx + n.w / 2.0)
                .fold(40.0_f64, f64::max)
                + MARGIN;
            geom.h = geom
                .nodes
                .iter()
                .map(|n| n.cy + n.h / 2.0)
                .fold(40.0_f64, f64::max)
                + MARGIN;
        }
    }
    // Theme: when the source carries `themeVariables`, lift merman's computed palette
    // (exact mermaid colours) onto kymo's raster-safe shapes. Gated to `full` (needs
    // merman's binding render). Un-themed files: `geom.theme` stays None (no change).
    #[cfg(feature = "full")]
    {
        let neo = is_neo_look(src);
        if neo || src.to_ascii_lowercase().contains("themevariables") {
            if let Ok(bytes) = merman_bindings_core::render_svg(src.as_bytes(), b"{}") {
                if let Ok(svg) = std::str::from_utf8(&bytes) {
                    geom.theme = Some(extract_theme_colors(svg, neo));
                }
            }
        }
    }
    Some(geom)
}

/// Render a `mindmap` with merman's **cose-bilkent layout** (mermaid's own
/// algorithm → mermaid-exact node positions) drawn in kymo's raster-safe style.
/// `None` on parse/layout failure (caller falls back to the native tidy-tree).
pub fn mindmap_to_svg_merman(src: &str) -> Option<String> {
    use merman_core::diagrams::mindmap::parse_mindmap_model_for_render;
    use merman_render::mindmap::layout_mindmap_diagram_typed;

    let meta = ParseMetadata {
        diagram_type: "mindmap".to_string(),
        config: MermaidConfig::default(),
        effective_config: MermaidConfig::default(),
        title: None,
    };
    let model = parse_mindmap_model_for_render(&strip_directives(src), &meta).ok()?;
    if model.nodes.is_empty() {
        return None;
    }
    let cfg = meta.effective_config.as_value();
    let measurer = KymoTextMeasurer;
    let layout = layout_mindmap_diagram_typed(&model, &cfg, &measurer, true).ok()?;

    // id → (label, shape, branch). Root (level 0) is branch -1 (blue); others
    // take their section index for the per-branch colour.
    let info: HashMap<&str, (&str, &str, i32)> = model
        .nodes
        .iter()
        .map(|n| {
            let branch = if n.level == 0 { -1 } else { n.section.unwrap_or(0) };
            (n.id.as_str(), (n.label.as_str(), n.shape.as_str(), branch))
        })
        .collect();

    // mermaid sizes a node's BOX (incl. padding) for the cose-bilkent layout, but
    // DRAWS the shape at the tighter label size + padding. Use label_width/height
    // (the text box) for the drawn shape; keep the layout centre from ln.width/height.
    let pad: HashMap<&str, f64> = model.nodes.iter().map(|n| (n.id.as_str(), n.padding.max(0.0))).collect();
    let mut branch_of: HashMap<&str, i32> = HashMap::new();
    let mut pnodes = Vec::new();
    for ln in &layout.nodes {
        let (label, shape_s, branch) = info.get(ln.id.as_str()).copied().unwrap_or(("", "rect", 0));
        branch_of.insert(ln.id.as_str(), branch);
        // child shapes draw at label_size + padding (tighter than the full
        // cose-bilkent box); the root keeps its full box (mermaid draws the root
        // emphasised/larger than its bare label).
        let p = pad.get(ln.id.as_str()).copied().unwrap_or(0.0);
        let (w, h) = if branch < 0 {
            (ln.width, ln.height)
        } else {
            (
                ln.label_width.map(|lw| lw + p * 0.5).unwrap_or(ln.width),
                ln.label_height.map(|lh| lh + p * 0.5).unwrap_or(ln.height),
            )
        };
        pnodes.push(crate::mindmap_svg::PNode {
            label: label.replace("<br/>", " ").replace("<br>", " ").replace("<br />", " "),
            shape: map_mindmap_shape(shape_s),
            branch,
            cx: ln.x + ln.width / 2.0,
            cy: ln.y + ln.height / 2.0,
            w,
            h,
        });
    }
    let mut pedges = Vec::new();
    for le in &layout.edges {
        let branch = branch_of.get(le.to.as_str()).copied().unwrap_or(0);
        let pts: Vec<(f64, f64)> = le.points.iter().map(|p| (p.x, p.y)).collect();
        if pts.len() >= 2 {
            pedges.push(crate::mindmap_svg::PEdge { branch, pts });
        }
    }
    Some(crate::mindmap_svg::render_positioned(&pnodes, &pedges))
}

fn map_mindmap_shape(s: &str) -> kymo_graph::model::Shape {
    use kymo_graph::model::Shape;
    let s = s.to_ascii_lowercase();
    if s.contains("circle") || s.contains("bang") {
        Shape::Circle
    } else if s.contains("hex") {
        Shape::Hex
    } else {
        Shape::Box
    }
}

/// Render a `block` diagram via merman's block layout (mermaid-exact grid:
/// columns + nested + spans) drawn raster-safe by kymo. `None` on failure.
pub fn block_to_svg_merman(src: &str) -> Option<String> {
    use merman_core::diagrams::block::{parse_block_model_for_render, BlockNodeRenderModel};
    use merman_render::block::layout_block_diagram_typed;

    let meta = ParseMetadata {
        diagram_type: "block".to_string(),
        config: MermaidConfig::default(),
        effective_config: MermaidConfig::default(),
        title: None,
    };
    let model = parse_block_model_for_render(&strip_directives(src), &meta).ok()?;
    let cfg = meta.effective_config.as_value();
    let measurer = KymoTextMeasurer;
    let layout = layout_block_diagram_typed(&model, &cfg, &measurer).ok()?;
    if layout.nodes.is_empty() {
        return None;
    }
    fn collect(ns: &[BlockNodeRenderModel], m: &mut HashMap<String, String>) {
        for n in ns {
            m.insert(n.id.clone(), n.label.clone());
            collect(&n.children, m);
        }
    }
    let mut labels = HashMap::new();
    collect(&model.blocks_flat, &mut labels);

    const M: f64 = 8.0;
    let (ox, oy) = match &layout.bounds {
        Some(b) => (M - b.min_x, M - b.min_y),
        None => (M, M),
    };
    let mut body = String::new();
    // edges first (under cells)
    for e in &layout.edges {
        if e.points.len() >= 2 {
            let mut d = format!("M{:.1},{:.1}", e.points[0].x + ox, e.points[0].y + oy);
            for p in &e.points[1..] {
                d += &format!(" L{:.1},{:.1}", p.x + ox, p.y + oy);
            }
            body += &format!("<path d=\"{d}\" fill=\"none\" stroke=\"#333333\" stroke-width=\"1.4\"/>");
        }
    }
    for ln in &layout.nodes {
        let (x, y) = (ln.x + ox, ln.y + oy);
        let label = labels.get(&ln.id).map(String::as_str).unwrap_or("");
        if ln.is_cluster {
            body += &format!(
                "<rect x=\"{x:.1}\" y=\"{y:.1}\" width=\"{:.1}\" height=\"{:.1}\" rx=\"3\" \
                 fill=\"none\" stroke=\"#9370DB\" stroke-width=\"1\"/>",
                ln.width, ln.height
            );
        } else {
            body += &format!(
                "<rect x=\"{x:.1}\" y=\"{y:.1}\" width=\"{:.1}\" height=\"{:.1}\" rx=\"3\" \
                 fill=\"#ECECFF\" stroke=\"#9370DB\" stroke-width=\"1\"/>",
                ln.width, ln.height
            );
        }
        if !label.is_empty() {
            let ty = if ln.is_cluster { y + 14.0 } else { y + ln.height / 2.0 };
            let base = if ln.is_cluster { "" } else { " dominant-baseline=\"central\"" };
            body += &format!(
                "<text x=\"{:.1}\" y=\"{ty:.1}\" text-anchor=\"middle\"{base} fill=\"#131300\">{}</text>",
                x + ln.width / 2.0,
                esc_xml(label)
            );
        }
    }
    let (w, h) = match &layout.bounds {
        Some(b) => (b.max_x - b.min_x + 2.0 * M, b.max_y - b.min_y + 2.0 * M),
        None => (400.0, 300.0),
    };
    Some(format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {w:.0} {h:.0}\" width=\"{w:.0}\" height=\"{h:.0}\" \
         style=\"max-width:100%;height:auto\" font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif\" font-size=\"14\">\n\
         <rect width=\"{w:.0}\" height=\"{h:.0}\" fill=\"#ffffff\"/>\n{body}</svg>\n"
    ))
}

fn esc_xml(s: &str) -> String {
    let mut o = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => o.push_str("&amp;"),
            '<' => o.push_str("&lt;"),
            '>' => o.push_str("&gt;"),
            '"' => o.push_str("&quot;"),
            _ => o.push(c),
        }
    }
    o
}

/// Render an `erDiagram` via merman's ER layout (mermaid-exact entity positions)
/// + kymo's raster-safe 2-column entity tables. `None` on failure.
pub fn er_to_svg_merman(src: &str) -> Option<String> {
    use merman_core::diagrams::er::parse_er_model_for_render;
    use merman_render::er::layout_er_diagram_typed;

    let cd = crate::mermaid::parse_er(src).ok()?;
    let meta = ParseMetadata {
        diagram_type: "er".to_string(),
        config: MermaidConfig::default(),
        effective_config: MermaidConfig::default(),
        title: None,
    };
    let model = parse_er_model_for_render(&strip_directives(src), &meta).ok()?;
    let cfg = meta.effective_config.as_value();
    let measurer = KymoTextMeasurer;
    let layout = layout_er_diagram_typed(&model, &cfg, &measurer).ok()?;
    if layout.nodes.is_empty() {
        return None;
    }
    // merman entity id is `entity-{name}-{n}`; kymo's ClassBox id is the bare
    // name — map merman id → label so positions key by the name kymo uses.
    let id2name: HashMap<&str, &str> = model
        .entities
        .values()
        .map(|e| (e.id.as_str(), e.label.as_str()))
        .collect();
    let mut pos: HashMap<String, (i32, i32, i32, i32)> = HashMap::new();
    for ln in &layout.nodes {
        let name = id2name.get(ln.id.as_str()).copied().unwrap_or(ln.id.as_str());
        pos.insert(
            name.to_string(),
            (
                (ln.x + ln.width / 2.0).round() as i32,
                (ln.y + ln.height / 2.0).round() as i32,
                ln.width.round() as i32,
                ln.height.round() as i32,
            ),
        );
    }
    Some(crate::classdiagram::svg::render_er_positioned(&cd, &pos))
}
