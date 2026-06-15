//! D2-style `.kymo` DSL parser — a Rust port of `packages/python/src/kymo/dsl.py`
//! (cross-checked against `packages/js/src/dsl.ts`).
//!
//! Line-based, brace-delimited surface for [`Diagram`]. There is no `component`
//! or `region` keyword — the parser disambiguates by line shape:
//!
//!   • line ending in `{` and 2nd token ∈ outer|inner|cluster → region container
//!   • line ending in `{` and 2nd token ∈ horizontal|vertical  → layout container
//!   • `id arrow id …`                              → edge
//!   • `id shape/icon/accent "Name" "Sub" [@ …]`    → leaf component
//!   • bare ids (only inside a container body)       → membership refs
//!   • `row id1 id2 …` (only inside a region body)   → grid row
//!
//! Parsing is purely declarative: it collects elements, validates nothing
//! beyond syntax, and computes no positions (that is `layout` + `alignment`).

use std::collections::HashMap;

use regex::Regex;

use crate::model::{
    AutoLayout, Component, Diagram, Edge, EdgeLabelAnchor, EdgeStyle, Region, RegionAlign,
    RegionLabelAnchor, Route,
};

/// A parse / syntax error, carrying the 1-based source line like Python's
/// `SyntaxError(f"line {n}: …")`.
#[derive(Debug, Clone)]
pub struct KymoError {
    pub line: usize,
    pub msg: String,
}

impl std::fmt::Display for KymoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.line == 0 {
            write!(f, "{}", self.msg)
        } else {
            write!(f, "line {}: {}", self.line, self.msg)
        }
    }
}

impl std::error::Error for KymoError {}

fn err(line: usize, msg: impl Into<String>) -> KymoError {
    KymoError {
        line,
        msg: msg.into(),
    }
}

/// `external <id> above <parent> [gap N]` directive payload.
#[derive(Debug, Clone)]
pub struct External {
    pub above: String,
    pub gap: i32,
}

/// A `layout { … }` tree node (Figma-style auto-layout). Mirrors the Python
/// tuples `("id", id)` / `("group", dir, [children])` / `(…, padding)`.
#[derive(Debug, Clone)]
pub enum LayoutTree {
    Id(String),
    Group {
        dir: AutoLayout,
        children: Vec<LayoutTree>,
        /// `(px, py)` — set when a region with padding was inlined (4-tuple
        /// variant in Python `_inline_region_leaves`).
        padding: Option<(i32, i32)>,
    },
}

/// Result of [`parse`]: the collected (positionless) diagram plus the grid
/// layout map, external directives, and anonymous layout trees. These flow into
/// `layout` + `alignment` to bake in positions.
#[derive(Debug, Clone)]
pub struct ParseResult {
    pub diagram: Diagram,
    /// `[(region_id, [[cell_id, …], …]), …]` for regions using grid `row …`
    /// syntax. Kept as an ordered Vec (not a map) because `layout` consumes it
    /// in source order to compute cumulative region-X — Python relies on dict
    /// insertion order here.
    pub layout: Option<Vec<(String, Vec<Vec<String>>)>>,
    /// `{component_id: External}` for any `external …` directive.
    pub external: Option<HashMap<String, External>>,
    /// Anonymous `layout { … }` trees, applied to component positions by the
    /// orchestrator (`kymo_to_diagram`) after parse.
    pub layout_trees: Vec<LayoutTree>,
}

// ── Compiled regex set (built once per `parse`) ───────────────────────────
struct Re {
    canvas: Regex,
    title: Regex,
    subtitle: Regex,
    external: Regex,
    region: Regex,
    layout: Regex,
    close: Regex,
    layout_tree: Regex,
    leaf: Regex,
    pos_literal: Regex,
    parent_ref: Regex,
    edge: Regex,
    anchor_spec: Regex,
    tuple: Regex,
    via_pt: Regex,
    row: Regex,
    bare_ids: Regex,
    padding_opt: Regex,
    padding_bot: Regex,
    dash_opt: Regex,
    stroke_opt: Regex,
    label_anchor: Regex,
    label_pos: Regex,
    icon_opt: Regex,
    direction_opt: Regex,
    bpmn_open: Regex,
    flowchart_open: Regex,
}

impl Re {
    fn new() -> Self {
        Re {
            canvas: Regex::new(r"^canvas\s*:?\s+(\d+)\s*x\s*(\d+)\s*$").unwrap(),
            title: Regex::new(r#"^title\s*:\s*"([^"]*)"\s*$"#).unwrap(),
            subtitle: Regex::new(r#"^subtitle\s*:\s*"([^"]*)"\s*$"#).unwrap(),
            external: Regex::new(r"^external\s+(\w+)\s+above\s+(\w+)(?:\s+gap\s+(\d+))?\s*$")
                .unwrap(),
            region: Regex::new(
                r#"^(\w+)\s+(outer|inner|cluster)\s+"([^"]*)"(?:\s+(.+?))?\s*\{\s*$"#,
            )
            .unwrap(),
            layout: Regex::new(
                r"^(\w+)\s+(horizontal|vertical)\s+pos\s+\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s+gap\s+(\d+)(?:\s+align\s+(start|center|end))?\s*\{\s*$",
            )
            .unwrap(),
            close: Regex::new(r"^\s*\}\s*$").unwrap(),
            layout_tree: Regex::new(r"^layout\s*\{(.+)\}\s*$").unwrap(),
            leaf: Regex::new(
                r#"^(\w+)\s+([\w-]+)/([\w-]+)/(\w+)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?(?:\s+@\s+(.+?))?\s*$"#,
            )
            .unwrap(),
            pos_literal: Regex::new(r"^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$").unwrap(),
            parent_ref: Regex::new(r"^(\w+)\s+(top|right|bottom|left)(?:\s+(-?\d+))?$").unwrap(),
            edge: Regex::new(
                r#"^(\w+)\s+(-->|==>|---)\s+(\w+)(?:\s+:\s+"([^"]*)")?(?:\s+\{(.*)\})?\s*$"#,
            )
            .unwrap(),
            anchor_spec: Regex::new(
                r"^(top|right|bottom|left|center)(?:\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\))?$",
            )
            .unwrap(),
            tuple: Regex::new(r"^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$").unwrap(),
            via_pt: Regex::new(r"\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)").unwrap(),
            row: Regex::new(r"^row(?:\s+(.+))?$").unwrap(),
            bare_ids: Regex::new(r"^[A-Za-z_]\w*(?:\s+[A-Za-z_]\w*)*\s*$").unwrap(),
            padding_opt: Regex::new(r"\bpadding\s+\(\s*(\d+)\s*,\s*(\d+)\s*\)").unwrap(),
            padding_bot: Regex::new(r"\bpadding-bottom\s+(\d+)").unwrap(),
            dash_opt: Regex::new(r"\bdash\s+\(\s*(\d+)\s*,\s*(\d+)\s*\)").unwrap(),
            stroke_opt: Regex::new(r"\bstroke\s+(#[0-9a-fA-F]{3,8})").unwrap(),
            label_anchor: Regex::new(r"\blabel-anchor\s+(start|middle|end)").unwrap(),
            label_pos: Regex::new(r"\blabel-position\s+(above|inside)").unwrap(),
            icon_opt: Regex::new(r"\bicon\s+([\w-]+)").unwrap(),
            direction_opt: Regex::new(r"\b(horizontal|vertical)\b").unwrap(),
            bpmn_open: Regex::new(r"^bpmn\s*\{\s*$").unwrap(),
            flowchart_open: Regex::new(r"^flowchart(?:\s+([A-Za-z]{2}))?\s*\{\s*$").unwrap(),
        }
    }
}

// ── Parser state ──────────────────────────────────────────────────────────
struct State {
    components: Vec<Component>,
    regions: Vec<Region>,
    edges: Vec<Edge>,
    layout_dict: Vec<(String, Vec<Vec<String>>)>,
    external_dict: HashMap<String, External>,
    layout_trees: Vec<LayoutTree>,
    canvas: (i32, i32),
    title: String,
    subtitle: String,
}

impl State {
    fn new() -> Self {
        State {
            components: Vec::new(),
            regions: Vec::new(),
            edges: Vec::new(),
            layout_dict: Vec::new(),
            external_dict: HashMap::new(),
            layout_trees: Vec::new(),
            canvas: (0, 0),
            title: String::new(),
            subtitle: String::new(),
        }
    }
}

/// Parse a D2-style `.kymo` diagram DSL. See [`ParseResult`].
pub fn parse(dsl: &str) -> Result<ParseResult, KymoError> {
    let re = Re::new();
    let lines: Vec<&str> = dsl.split('\n').map(|l| l.trim_end_matches('\r')).collect();
    let mut state = State::new();
    let consumed = parse_block(&mut state, &re, &lines, 0, None)?;
    if consumed != lines.len() {
        return Err(err(consumed + 1, "unexpected `}` at file scope"));
    }
    let diagram = Diagram {
        width: state.canvas.0,
        height: state.canvas.1,
        title: state.title,
        subtitle: state.subtitle,
        components: state.components,
        regions: state.regions,
        edges: state.edges,
        layout_trees: Vec::new(),
    };
    Ok(ParseResult {
        diagram,
        layout: if state.layout_dict.is_empty() {
            None
        } else {
            Some(state.layout_dict)
        },
        external: if state.external_dict.is_empty() {
            None
        } else {
            Some(state.external_dict)
        },
        layout_trees: state.layout_trees,
    })
}

// ── Block parser (recursive: file scope + each container body) ──────────────
/// Parse lines from `start`. With `parent` set (a region index into
/// `state.regions`), stop at the matching `}` and return the index AFTER it;
/// with `parent = None`, parse to EOF. Returns the first line NOT consumed.
fn parse_block(
    state: &mut State,
    re: &Re,
    lines: &[&str],
    start: usize,
    parent: Option<usize>,
) -> Result<usize, KymoError> {
    let mut grid_rows: Option<Vec<Vec<String>>> = None;
    let mut i = start;
    while i < lines.len() {
        let line = strip_comment(lines[i]);
        let line = line.trim();
        if line.is_empty() {
            i += 1;
            continue;
        }

        // Closing brace ends a container body.
        if re.close.is_match(line) {
            let pi = match parent {
                None => return Ok(i), // caller reports the unexpected `}`
                Some(pi) => pi,
            };
            if let Some(rows) = grid_rows.take() {
                let id = state.regions[pi].id.clone();
                state.layout_dict.push((id, rows));
                // Grid mode: layout owns bounds — leave contains empty.
                state.regions[pi].contains.clear();
            }
            return Ok(i + 1);
        }

        // File-scope-only directives.
        if parent.is_none() {
            if let Some(m) = re.canvas.captures(line) {
                state.canvas = (int(&m, 1), int(&m, 2));
                i += 1;
                continue;
            }
            if let Some(m) = re.title.captures(line) {
                state.title = m[1].to_string();
                i += 1;
                continue;
            }
            if let Some(m) = re.subtitle.captures(line) {
                state.subtitle = m[1].to_string();
                i += 1;
                continue;
            }
            if let Some(m) = re.external.captures(line) {
                let eid = m[1].to_string();
                let above = m[2].to_string();
                let gap = m.get(3).map(|g| g.as_str().parse().unwrap()).unwrap_or(60);
                state.external_dict.insert(eid, External { above, gap });
                i += 1;
                continue;
            }
            if let Some(m) = re.layout_tree.captures(line) {
                let tree = parse_layout_tree(&m[1], i + 1)?;
                state.layout_trees.push(tree);
                i += 1;
                continue;
            }
            if re.bpmn_open.is_match(line) {
                return Err(err(
                    i + 1,
                    "`bpmn { … }` blocks are not yet supported in the Rust `.kymo` build",
                ));
            }
            if re.flowchart_open.is_match(line) {
                return Err(err(
                    i + 1,
                    "`flowchart { … }` blocks are not yet supported in the Rust `.kymo` build",
                ));
            }
        }

        // Edges (file scope only).
        if let Some(m) = re.edge.captures(line) {
            if let Some(pi) = parent {
                let pid = state.regions[pi].id.clone();
                return Err(err(
                    i + 1,
                    format!("edges must live at file scope, not inside container {pid:?}"),
                ));
            }
            let edge = make_edge(re, &m, i + 1)?;
            state.edges.push(edge);
            i += 1;
            continue;
        }

        // Grid row — region body only, not layout body.
        if let Some(m) = re.row.captures(line) {
            let pi = match parent {
                None => return Err(err(i + 1, "`row` only valid inside a region body")),
                Some(pi) => pi,
            };
            if state.regions[pi].layout.is_some() {
                let lay = state.regions[pi].layout.unwrap().as_str();
                let pid = state.regions[pi].id.clone();
                return Err(err(
                    i + 1,
                    format!("`row` not allowed in layout body ({pid:?} is a {lay} layout)"),
                ));
            }
            let cells: Vec<String> = m
                .get(1)
                .map(|g| g.as_str().split_whitespace().map(String::from).collect())
                .unwrap_or_default();
            grid_rows.get_or_insert_with(Vec::new).push(cells);
            i += 1;
            continue;
        }

        // Container (region or layout).
        if line.ends_with('{') {
            i = consume_container(state, re, lines, i, parent, grid_rows.is_some())?;
            continue;
        }

        // Leaf component definition (file scope OR container body).
        if let Some(m) = re.leaf.captures(line) {
            let comp = make_component(re, &m, i + 1)?;
            let cid = comp.id.clone();
            state.components.push(comp);
            if let Some(pi) = parent {
                if state.regions[pi].layout.is_some() {
                    return Err(err(
                        i + 1,
                        format!(
                            "inline leaf definitions not allowed in layout body — define {cid:?} at file scope or in a region body, then reference by bare id"
                        ),
                    ));
                }
                state.regions[pi].contains.push(cid);
            }
            i += 1;
            continue;
        }

        // Bare-id reference list — only inside a container body.
        if let Some(pi) = parent {
            if re.bare_ids.is_match(line) {
                if grid_rows.is_some() {
                    let pid = state.regions[pi].id.clone();
                    return Err(err(
                        i + 1,
                        format!("region {pid:?} mixes `row` and bare ids — pick one"),
                    ));
                }
                state.regions[pi]
                    .contains
                    .extend(line.split_whitespace().map(String::from));
                i += 1;
                continue;
            }
        }

        return Err(err(i + 1, format!("unrecognised — {line:?}")));
    }

    if parent.is_some() {
        return Err(err(start, "unclosed block (no matching `}`)"));
    }
    Ok(i)
}

/// Parse a region/layout opening line at `lines[i]`, recurse into its body,
/// then thread the new container's leaf IDs back into the parent's `contains`.
/// Returns the index after the closing `}`.
fn consume_container(
    state: &mut State,
    re: &Re,
    lines: &[&str],
    i: usize,
    parent: Option<usize>,
    parent_grid: bool,
) -> Result<usize, KymoError> {
    let line = strip_comment(lines[i]);
    let line = line.trim();

    let region = if let Some(m) = re.region.captures(line) {
        make_region(re, &m)
    } else if let Some(m) = re.layout.captures(line) {
        make_layout(&m)
    } else {
        return Err(err(i + 1, format!("bad container header — {line:?}")));
    };

    let ri = state.regions.len();
    let region_is_layout = region.layout.is_some();
    state.regions.push(region);
    let next_i = parse_block(state, re, lines, i + 1, Some(ri))?;

    // Propagate this container's leaves up so the outer region's bounds envelop
    // nested leaves. Layouts don't propagate (not part of outer visual bounds).
    if let Some(pi) = parent {
        if !region_is_layout {
            if parent_grid {
                let pid = state.regions[pi].id.clone();
                return Err(err(
                    i + 1,
                    format!("region {pid:?} mixes `row` and nested containers — pick one"),
                ));
            }
            let child_contains = state.regions[ri].contains.clone();
            state.regions[pi].contains.extend(child_contains);
        }
    }
    Ok(next_i)
}

// ── Per-kind builders ───────────────────────────────────────────────────────
fn make_region(re: &Re, m: &regex::Captures) -> Region {
    let rid = m[1].to_string();
    let style = crate::model::RegionStyle::from_str(&m[2]).unwrap();
    let label = m[3].to_string();
    let mut region = Region::cluster(rid, label, Vec::new());
    region.style = style;
    region.padding = (24, 24);
    region.label_anchor = RegionLabelAnchor::Middle;

    if let Some(opts) = m.get(4).map(|g| g.as_str()) {
        if let Some(pm) = re.padding_opt.captures(opts) {
            region.padding = (int(&pm, 1), int(&pm, 2));
        }
        if let Some(pbm) = re.padding_bot.captures(opts) {
            region.padding_bottom = Some(int(&pbm, 1));
        }
        if let Some(dm) = re.dash_opt.captures(opts) {
            region.border_dash = Some((int(&dm, 1), int(&dm, 2)));
        }
        if let Some(sm) = re.stroke_opt.captures(opts) {
            region.border_stroke = Some(sm[1].to_string());
        }
        if let Some(lam) = re.label_anchor.captures(opts) {
            region.label_anchor = RegionLabelAnchor::from_str(&lam[1]).unwrap();
        }
        if let Some(lpm) = re.label_pos.captures(opts) {
            region.label_position = crate::model::LabelPosition::from_str(&lpm[1]);
        }
        if let Some(im) = re.icon_opt.captures(opts) {
            region.icon = Some(im[1].to_string());
        }
        if let Some(dirm) = re.direction_opt.captures(opts) {
            region.layout = AutoLayout::from_str(&dirm[1]);
        }
    }
    region
}

fn make_layout(m: &regex::Captures) -> Region {
    let lid = m[1].to_string();
    let direction = AutoLayout::from_str(&m[2]).unwrap();
    let x: i32 = m[3].parse().unwrap();
    let y: i32 = m[4].parse().unwrap();
    let gap: i32 = m[5].parse().unwrap();
    let align = m
        .get(6)
        .and_then(|g| RegionAlign::from_str(g.as_str()))
        .unwrap_or(RegionAlign::Center);

    let mut region = Region::cluster(lid, String::new(), Vec::new());
    region.style = crate::model::RegionStyle::Outer; // Python Region default
    region.pos = Some((x, y));
    region.layout = Some(direction);
    region.gap = gap;
    region.align = align;
    region.padding = (0, 0);
    region.visible = false;
    region
}

fn make_component(re: &Re, m: &regex::Captures, line_no: usize) -> Result<Component, KymoError> {
    let cid = m[1].to_string();
    let shape_s = &m[2];
    let icon = m[3].to_string();
    let accent_s = &m[4];
    let name = m.get(5).map(|g| g.as_str()).unwrap_or("");
    let subtitle = m.get(6).map(|g| g.as_str()).unwrap_or("");

    let shape = crate::model::Shape::from_str(shape_s)
        .ok_or_else(|| err(line_no, format!("unknown shape {shape_s:?}")))?;
    let accent = crate::model::Accent::from_str(accent_s)
        .ok_or_else(|| err(line_no, format!("unknown accent {accent_s:?}")))?;

    let mut comp = Component::flowchart(cid, name, shape);
    comp.subtitle = subtitle.to_string();
    comp.icon = icon;
    comp.accent = accent;

    if let Some(refg) = m.get(7) {
        let refs = refg.as_str().trim();
        if let Some(pm) = re.pos_literal.captures(refs) {
            comp.pos = (int(&pm, 1), int(&pm, 2));
        } else if let Some(pm) = re.parent_ref.captures(refs) {
            comp.parent = Some(pm[1].to_string());
            comp.align = crate::model::Anchor::from_str(&pm[2]);
            if let Some(g) = pm.get(3) {
                comp.align_gap = g.as_str().parse().unwrap();
            }
        } else {
            return Err(err(line_no, format!("bad @-ref {refs:?}")));
        }
    }
    Ok(comp)
}

fn make_edge(re: &Re, m: &regex::Captures, line_no: usize) -> Result<Edge, KymoError> {
    let src = m[1].to_string();
    let arrow = &m[2];
    let dst = m[3].to_string();
    let label = m.get(4).map(|g| g.as_str()).unwrap_or("").to_string();

    let mut edge = Edge::routed(src, dst, label);
    edge.style = if arrow == "==>" {
        EdgeStyle::Orange
    } else {
        EdgeStyle::Gray
    };
    edge.no_arrow = arrow == "---"; // `---` = undirected sibling link

    if let Some(opts) = m.get(5) {
        parse_edge_options(re, opts.as_str().trim(), &mut edge, line_no)?;
    }
    Ok(edge)
}

// ── Helpers ─────────────────────────────────────────────────────────────────
/// Strip `#` comments outside double-quoted strings. A `#` immediately followed
/// by a hex digit (`#76b900`) is a colour literal, not a comment.
fn strip_comment(line: &str) -> String {
    let mut out = String::new();
    let mut in_quote = false;
    let mut chars = line.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '"' {
            in_quote = !in_quote;
            out.push(ch);
        } else if ch == '#' && !in_quote {
            let nxt = chars.peek().copied().unwrap_or('\0');
            if nxt.is_ascii_hexdigit() {
                out.push(ch); // hex colour, not a comment
            } else {
                break; // actual comment — stop here
            }
        } else {
            out.push(ch);
        }
    }
    out
}

fn parse_edge_options(re: &Re, s: &str, edge: &mut Edge, line_no: usize) -> Result<(), KymoError> {
    for tok in split_outside_parens(s, ',') {
        let tok = tok.trim();
        if tok.is_empty() {
            continue;
        }
        if let Some((key, value)) = tok.split_once('=') {
            set_kv_option(re, edge, key.trim(), value.trim(), line_no)?;
        } else {
            set_flag(edge, tok, line_no)?;
        }
    }
    Ok(())
}

fn split_outside_parens(s: &str, sep: char) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    let mut depth = 0i32;
    for ch in s.chars() {
        if ch == '(' {
            depth += 1;
            cur.push(ch);
        } else if ch == ')' {
            depth -= 1;
            cur.push(ch);
        } else if ch == sep && depth == 0 {
            out.push(std::mem::take(&mut cur));
        } else {
            cur.push(ch);
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

fn set_kv_option(
    re: &Re,
    edge: &mut Edge,
    key: &str,
    value: &str,
    line_no: usize,
) -> Result<(), KymoError> {
    match key {
        "src" | "dst" => {
            let am = re
                .anchor_spec
                .captures(value)
                .ok_or_else(|| err(line_no, format!("bad {key} anchor {value:?}")))?;
            let anchor = crate::model::Anchor::from_str(&am[1]);
            let offset = if am.get(2).is_some() {
                (int(&am, 2), int(&am, 3))
            } else {
                (0, 0)
            };
            if key == "src" {
                edge.src_anchor = anchor;
                if am.get(2).is_some() {
                    edge.src_offset = offset;
                }
            } else {
                edge.dst_anchor = anchor;
                if am.get(2).is_some() {
                    edge.dst_offset = offset;
                }
            }
            Ok(())
        }
        "via" => {
            let pts: Vec<crate::model::Point> = re
                .via_pt
                .captures_iter(value)
                .map(|p| (p[1].parse().unwrap(), p[2].parse().unwrap()))
                .collect();
            if pts.is_empty() {
                return Err(err(line_no, format!("via needs ≥1 point — got {value:?}")));
            }
            edge.via = pts;
            Ok(())
        }
        "label_offset" | "label_pos" => {
            let tm = re
                .tuple
                .captures(value)
                .ok_or_else(|| err(line_no, format!("{key} expects (x, y) — got {value:?}")))?;
            let xy = (int(&tm, 1), int(&tm, 2));
            if key == "label_offset" {
                edge.label_offset = xy;
            } else {
                edge.label_pos = Some(xy);
            }
            Ok(())
        }
        "route" => {
            edge.route = match value {
                "auto" => Route::Auto,
                "over" => Route::Over,
                "under" => Route::Under,
                "curve" => Route::Curve,
                _ => return Err(err(line_no, format!("bad route {value:?}"))),
            };
            Ok(())
        }
        "label_at" => {
            edge.label_anchor = match value {
                "src" => EdgeLabelAnchor::Src,
                "dst" => EdgeLabelAnchor::Dst,
                "mid" => EdgeLabelAnchor::Mid,
                _ => {
                    return Err(err(
                        line_no,
                        format!("label_at expects src|dst|mid — got {value:?}"),
                    ))
                }
            };
            Ok(())
        }
        _ => Err(err(line_no, format!("unknown edge option {key:?}"))),
    }
}

fn set_flag(edge: &mut Edge, flag: &str, line_no: usize) -> Result<(), KymoError> {
    match flag {
        "small" => edge.label_small = true,
        "dashed" => edge.dashed = true,
        "shared" => edge.shared_port = true,
        "curve" => edge.route = Route::Curve,
        "over" => edge.route = Route::Over,
        "under" => edge.route = Route::Under,
        "straight" => edge.route = Route::Straight,
        "elbow" => edge.route = Route::Auto,
        _ => return Err(err(line_no, format!("unknown edge flag {flag:?}"))),
    }
    Ok(())
}

// ── Layout tree (Figma-style auto-layout) ───────────────────────────────────
fn parse_layout_tree(expr: &str, line_no: usize) -> Result<LayoutTree, KymoError> {
    let tokens = tokenize_layout(expr, line_no)?;
    let mut pos = 0usize;
    let node = parse_layout_node(&tokens, &mut pos, line_no)?;
    if pos < tokens.len() {
        return Err(err(
            line_no,
            format!("trailing token {:?} in layout", tokens[pos]),
        ));
    }
    Ok(node)
}

fn tokenize_layout(s: &str, line_no: usize) -> Result<Vec<String>, KymoError> {
    let mut out = Vec::new();
    let chars: Vec<char> = s.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if "{}|,".contains(ch) {
            out.push(ch.to_string());
            i += 1;
        } else if ch.is_whitespace() {
            i += 1;
        } else if ch.is_alphanumeric() || ch == '_' {
            let j0 = i;
            while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_') {
                i += 1;
            }
            out.push(chars[j0..i].iter().collect());
        } else {
            return Err(err(line_no, format!("bad char {ch:?} in layout expr")));
        }
    }
    Ok(out)
}

fn parse_layout_node(
    tokens: &[String],
    pos: &mut usize,
    line_no: usize,
) -> Result<LayoutTree, KymoError> {
    let mut items = vec![parse_layout_atom(tokens, pos, line_no)?];
    let mut sep: Option<&str> = None;
    while *pos < tokens.len() && (tokens[*pos] == "|" || tokens[*pos] == ",") {
        let cur = tokens[*pos].as_str();
        match sep {
            None => sep = Some(cur),
            Some(s) if s != cur => {
                return Err(err(
                    line_no,
                    "cannot mix `|` and `,` at same level — use {} to group",
                ))
            }
            _ => {}
        }
        *pos += 1;
        items.push(parse_layout_atom(tokens, pos, line_no)?);
    }
    match sep {
        None => Ok(items.into_iter().next().unwrap()),
        Some(s) => {
            let dir = if s == "|" {
                AutoLayout::Horizontal
            } else {
                AutoLayout::Vertical
            };
            Ok(LayoutTree::Group {
                dir,
                children: items,
                padding: None,
            })
        }
    }
}

fn parse_layout_atom(
    tokens: &[String],
    pos: &mut usize,
    line_no: usize,
) -> Result<LayoutTree, KymoError> {
    if *pos >= tokens.len() {
        return Err(err(line_no, "expected id or `{` in layout expr"));
    }
    let tok = tokens[*pos].as_str();
    if tok == "{" {
        *pos += 1;
        let node = parse_layout_node(tokens, pos, line_no)?;
        if *pos >= tokens.len() || tokens[*pos] != "}" {
            return Err(err(line_no, "missing `}` in layout expr"));
        }
        *pos += 1;
        return Ok(node);
    }
    if tok == "|" || tok == "," || tok == "}" {
        return Err(err(line_no, format!("unexpected {tok:?} in layout expr")));
    }
    *pos += 1;
    Ok(LayoutTree::Id(tok.to_string()))
}

/// Capture group `n` parsed as `i32` (group must exist and be a valid int).
fn int(m: &regex::Captures, n: usize) -> i32 {
    m[n].parse().unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_title_and_canvas() {
        let r = parse("canvas 800 x 600\ntitle: \"Hi\"\nsubtitle: \"Yo\"").unwrap();
        assert_eq!(r.diagram.width, 800);
        assert_eq!(r.diagram.height, 600);
        assert_eq!(r.diagram.title, "Hi");
        assert_eq!(r.diagram.subtitle, "Yo");
    }

    #[test]
    fn parses_leaf_with_pos_and_parent_ref() {
        let r = parse(
            "a circle/user/blue \"Agent\" \"Sub\" @ (10, 20)\nb hex/hex-agent/green @ a right 60",
        )
        .unwrap();
        assert_eq!(r.diagram.components.len(), 2);
        let a = &r.diagram.components[0];
        assert_eq!(a.id, "a");
        assert_eq!(a.name, "Agent");
        assert_eq!(a.subtitle, "Sub");
        assert_eq!(a.icon, "user");
        assert_eq!(a.pos, (10, 20));
        let b = &r.diagram.components[1];
        assert_eq!(b.parent.as_deref(), Some("a"));
        assert_eq!(b.align, Some(crate::model::Anchor::Right));
        assert_eq!(b.align_gap, 60);
    }

    #[test]
    fn parses_region_with_opts_and_nested() {
        let src = "\
adr outer \"Root\" padding (40, 32) padding-bottom 40 label-anchor start {
  x box/folder/orange \"X\" \"\"
  inner_r inner \"Inner\" {
    y box/checklist/orange \"Y\" \"\"
  }
}";
        let r = parse(src).unwrap();
        // root + inner = 2 regions, x + y = 2 components
        assert_eq!(r.diagram.regions.len(), 2);
        assert_eq!(r.diagram.components.len(), 2);
        let root = r.diagram.regions.iter().find(|r| r.id == "adr").unwrap();
        assert_eq!(root.padding, (40, 32));
        assert_eq!(root.padding_bottom, Some(40));
        assert_eq!(root.label_anchor, RegionLabelAnchor::Start);
        // nested leaf propagated up into root.contains
        assert!(root.contains.contains(&"x".to_string()));
        assert!(root.contains.contains(&"y".to_string()));
    }

    #[test]
    fn parses_layout_region_and_edges() {
        let src = "\
a circle/user/blue \"A\" \"\"
b hex/hex-agent/green \"B\" \"\"
chain horizontal pos (32, 162) gap 50 {
  a b
}
a --> b : \"go\" { src=right(0,-10), dst=left, small, dashed }
a ==> b
a --- b";
        let r = parse(src).unwrap();
        assert_eq!(r.diagram.edges.len(), 3);
        let e = &r.diagram.edges[0];
        assert_eq!(e.label, "go");
        assert_eq!(e.src_anchor, Some(crate::model::Anchor::Right));
        assert_eq!(e.src_offset, (0, -10));
        assert_eq!(e.dst_anchor, Some(crate::model::Anchor::Left));
        assert!(e.label_small);
        assert!(e.dashed);
        assert_eq!(r.diagram.edges[1].style, EdgeStyle::Orange);
        assert!(r.diagram.edges[2].no_arrow);
        let chain = r.diagram.regions.iter().find(|r| r.id == "chain").unwrap();
        assert_eq!(chain.layout, Some(AutoLayout::Horizontal));
        assert_eq!(chain.pos, Some((32, 162)));
        assert_eq!(chain.gap, 50);
    }

    #[test]
    fn parses_via_with_semicolons() {
        let r = parse("a box/x/blue\nb box/y/blue\na --> b { via=(842,45);(107,45) }").unwrap();
        assert_eq!(r.diagram.edges[0].via, vec![(842, 45), (107, 45)]);
    }

    #[test]
    fn strips_comments_keeps_hex() {
        let r =
            parse("x box/folder/orange \"X\" \"\" # a comment\ny inner \"Y\" stroke #94a3b8 {\n}")
                .unwrap();
        assert_eq!(r.diagram.components.len(), 1);
        let y = r.diagram.regions.iter().find(|r| r.id == "y").unwrap();
        assert_eq!(y.border_stroke.as_deref(), Some("#94a3b8"));
    }
}
