//! The headless editor session — document + shapes + selection + camera +
//! snapshot undo/redo + drag-writeback + hit-test. Ports the semantics of
//! `packages/js-canvas/src/{store,editor}.ts` and the website's
//! `EngineBoard`/`patchDsl` glue, with source text as the single source of
//! truth and a freeform overlay (pen/sticky/text) tracked in the session.

use std::collections::HashMap;

use crate::kymo::{self, KymoError};
use crate::model::Diagram;

use super::patch::patch_positions;
use super::shape::{diagram_to_shapes, EditorShape, ShapeData, ShapeId, ShapeKind};

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Camera {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tool {
    Select,
    Hand,
    Draw,
    Sticky,
    Text,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Theme {
    Light,
    Dark,
}

const MIN_ZOOM: f32 = 0.05;
const MAX_ZOOM: f32 = 8.0;
const DEFAULT_PADDING: f32 = 0.9;
const HISTORY_MAX: usize = 200;
/// Page-space pick tolerance for thin shapes (edges).
const EDGE_HIT_TOL: f32 = 6.0;

#[derive(Clone)]
struct Snapshot {
    source: String,
    freeform: Vec<EditorShape>,
    selection: Vec<ShapeId>,
}

struct DragState {
    pre: Snapshot,
    moved: bool,
}

/// The editor session. Construct with [`EditorSession::new`], feed source via
/// [`load_source`](Self::load_source), drive pointer events through
/// `hit_test`/`select`/`begin_drag`/`drag_by`/`end_drag`.
pub struct EditorSession {
    source: String,
    diagram: Diagram,
    kymo_shapes: Vec<EditorShape>,
    freeform: Vec<EditorShape>,
    selection: Vec<ShapeId>,
    camera: Camera,
    viewport: (f32, f32),
    tool: Tool,
    theme: Theme,
    background: Option<String>,
    past: Vec<Snapshot>,
    future: Vec<Snapshot>,
    drag: Option<DragState>,
    next_freeform: u64,
}

impl Default for EditorSession {
    fn default() -> Self {
        Self::new()
    }
}

impl EditorSession {
    pub fn new() -> Self {
        EditorSession {
            source: String::new(),
            diagram: Diagram::default(),
            kymo_shapes: Vec::new(),
            freeform: Vec::new(),
            selection: Vec::new(),
            camera: Camera {
                x: 0.0,
                y: 0.0,
                z: 1.0,
            },
            viewport: (1024.0, 768.0),
            tool: Tool::Select,
            theme: Theme::Light,
            background: None,
            past: Vec::new(),
            future: Vec::new(),
            drag: None,
            next_freeform: 0,
        }
    }

    // ── source ⇄ document ────────────────────────────────────────────────
    /// Parse + resolve `text` into the document, rebuilding kymo shapes and
    /// keeping the freeform overlay. On a parse error the prior state is left
    /// untouched and the error returned.
    pub fn load_source(&mut self, text: &str) -> Result<(), KymoError> {
        let diagram = kymo::to_diagram(text)?;
        self.diagram = diagram;
        self.kymo_shapes = diagram_to_shapes(&self.diagram);
        self.source = text.to_string();
        // Drop selection entries that no longer exist.
        let live: std::collections::HashSet<&str> = self
            .kymo_shapes
            .iter()
            .map(|s| s.id.as_str())
            .chain(self.freeform.iter().map(|s| s.id.as_str()))
            .collect();
        self.selection.retain(|id| live.contains(id.as_str()));
        Ok(())
    }

    pub fn source(&self) -> &str {
        &self.source
    }

    pub fn diagram(&self) -> &Diagram {
        &self.diagram
    }

    // ── rendering ──────────────────────────────────────────────────────────
    /// Render the current diagram to an SVG string. (Theme/background plumbing
    /// into the renderer is a follow-up; the renderer currently emits its
    /// default light background — see `render::render`.)
    pub fn render_svg(&self) -> String {
        kymo::render::render(&self.diagram, false)
    }

    /// Rasterize [`render_svg`](Self::render_svg) to PNG bytes at `scale`.
    pub fn render_png(&self, scale: f32) -> Result<Vec<u8>, crate::RenderError> {
        crate::svg_to_png(self.render_svg().as_bytes(), scale)
    }

    // ── shapes / hit-test ────────────────────────────────────────────────
    /// All shapes (kymo layer first, then freeform overlay).
    pub fn shapes(&self) -> Vec<EditorShape> {
        let mut v = self.kymo_shapes.clone();
        v.extend(self.freeform.iter().cloned());
        v
    }

    fn all_shapes_iter(&self) -> impl Iterator<Item = &EditorShape> {
        self.kymo_shapes.iter().chain(self.freeform.iter())
    }

    /// Visual z-priority for hit-testing (higher wins): freeform > node > edge
    /// > region — matches the render z-order.
    fn z_priority(kind: ShapeKind) -> u8 {
        match kind {
            ShapeKind::KymoRegion => 0,
            ShapeKind::KymoEdge => 1,
            ShapeKind::KymoNode => 2,
            ShapeKind::Freedraw | ShapeKind::Note | ShapeKind::Text => 3,
        }
    }

    fn hits(s: &EditorShape, px: f32, py: f32) -> bool {
        match (&s.kind, &s.data) {
            (ShapeKind::KymoEdge, ShapeData::Edge { x2, y2, .. }) => {
                point_seg_dist(px, py, s.x, s.y, *x2, *y2) <= EDGE_HIT_TOL
            }
            (ShapeKind::Freedraw, ShapeData::Freedraw { points, .. }) => {
                // near any stroke segment, or inside bbox as a fallback.
                points
                    .windows(2)
                    .any(|w| point_seg_dist(px, py, w[0].0, w[0].1, w[1].0, w[1].1) <= EDGE_HIT_TOL)
                    || in_box(px, py, s)
            }
            _ => in_box(px, py, s),
        }
    }

    /// Topmost shape id under the page point, if any.
    pub fn hit_test(&self, px: f32, py: f32) -> Option<ShapeId> {
        let mut best: Option<(u8, usize, &EditorShape)> = None;
        for (i, s) in self.all_shapes_iter().enumerate() {
            if Self::hits(s, px, py) {
                let pr = Self::z_priority(s.kind);
                match best {
                    Some((bp, bi, _)) if (pr, i) <= (bp, bi) => {}
                    _ => best = Some((pr, i, s)),
                }
            }
        }
        best.map(|(_, _, s)| s.id.clone())
    }

    /// Ids whose bounding box intersects the screen-marquee rect (page space).
    pub fn hit_test_rect(&self, x: f32, y: f32, w: f32, h: f32) -> Vec<ShapeId> {
        let (rx, ry, rw, rh) = (x.min(x + w), y.min(y + h), w.abs(), h.abs());
        self.all_shapes_iter()
            .filter(|s| s.x < rx + rw && s.x + s.w > rx && s.y < ry + rh && s.y + s.h > ry)
            .map(|s| s.id.clone())
            .collect()
    }

    // ── selection ────────────────────────────────────────────────────────
    pub fn select(&mut self, ids: Vec<ShapeId>) {
        self.selection = ids;
    }
    pub fn selection(&self) -> Vec<ShapeId> {
        self.selection.clone()
    }

    // ── drag (with writeback) ────────────────────────────────────────────
    pub fn begin_drag(&mut self) {
        self.drag = Some(DragState {
            pre: self.snapshot(),
            moved: false,
        });
    }

    /// Move the selected shapes by a page-space delta (live, no history entry).
    pub fn drag_by(&mut self, dx: f32, dy: f32) {
        if dx == 0.0 && dy == 0.0 {
            return;
        }
        if let Some(d) = self.drag.as_mut() {
            d.moved = true;
        }
        let sel: std::collections::HashSet<String> = self.selection.iter().cloned().collect();
        for s in self.kymo_shapes.iter_mut().chain(self.freeform.iter_mut()) {
            if sel.contains(&s.id) {
                move_shape(s, dx, dy);
            }
        }
    }

    /// Seal the drag: write moved kymo nodes back to the source (`patchDsl`),
    /// reparse, and push the pre-drag snapshot to the undo stack.
    pub fn end_drag(&mut self) -> Result<(), KymoError> {
        let drag = match self.drag.take() {
            Some(d) if d.moved => d,
            _ => return Ok(()), // nothing moved → no history churn
        };

        // Collect moved kymo-node centres → writeback map.
        let mut moves: HashMap<String, (f32, f32)> = HashMap::new();
        let sel: std::collections::HashSet<&str> =
            self.selection.iter().map(|s| s.as_str()).collect();
        for s in &self.kymo_shapes {
            if s.kind == ShapeKind::KymoNode && sel.contains(s.id.as_str()) {
                if let Some(kid) = &s.kymo_id {
                    moves.insert(kid.clone(), (s.x + s.w / 2.0, s.y + s.h / 2.0));
                }
            }
        }

        // Commit history (pre-drag state) and clear redo.
        self.past.push(drag.pre);
        if self.past.len() > HISTORY_MAX {
            self.past.remove(0);
        }
        self.future.clear();

        if !moves.is_empty() {
            let patched = patch_positions(&self.source, &moves);
            // Reparse the authoritative source (rebuilds kymo shapes; freeform
            // overlay is preserved across load_source).
            self.load_source(&patched)?;
        }
        Ok(())
    }

    // ── freeform tools ───────────────────────────────────────────────────
    pub fn add_freedraw(&mut self, points: Vec<(f32, f32)>, color: &str, size: f32) -> ShapeId {
        self.commit_history();
        let id = self.fresh_id("freedraw");
        let (minx, miny, maxx, maxy) = bbox(&points);
        self.freeform.push(EditorShape {
            id: id.clone(),
            kind: ShapeKind::Freedraw,
            x: minx,
            y: miny,
            w: (maxx - minx).max(1.0),
            h: (maxy - miny).max(1.0),
            kymo_id: None,
            data: ShapeData::Freedraw {
                points,
                color: color.to_string(),
                size,
            },
        });
        id
    }

    pub fn add_note(&mut self, x: f32, y: f32, text: &str, color: &str) -> ShapeId {
        self.commit_history();
        let id = self.fresh_id("note");
        self.freeform.push(EditorShape {
            id: id.clone(),
            kind: ShapeKind::Note,
            x,
            y,
            w: 160.0,
            h: 120.0,
            kymo_id: None,
            data: ShapeData::Note {
                text: text.to_string(),
                color: color.to_string(),
            },
        });
        id
    }

    pub fn add_text(&mut self, x: f32, y: f32, text: &str, size: f32) -> ShapeId {
        self.commit_history();
        let id = self.fresh_id("text");
        self.freeform.push(EditorShape {
            id: id.clone(),
            kind: ShapeKind::Text,
            x,
            y,
            w: (text.chars().count() as f32 * size * 0.6).max(20.0),
            h: size * 1.4,
            kymo_id: None,
            data: ShapeData::Text {
                text: text.to_string(),
                size,
            },
        });
        id
    }

    pub fn update_text(&mut self, id: &str, text: &str) {
        self.commit_history();
        if let Some(s) = self.freeform.iter_mut().find(|s| s.id == id) {
            match &mut s.data {
                ShapeData::Text { text: t, size } => {
                    *t = text.to_string();
                    s.w = (text.chars().count() as f32 * *size * 0.6).max(20.0);
                }
                ShapeData::Note { text: t, .. } => *t = text.to_string(),
                _ => {}
            }
        }
    }

    pub fn remove(&mut self, ids: &[ShapeId]) {
        let set: std::collections::HashSet<&str> = ids.iter().map(|s| s.as_str()).collect();
        if self.freeform.iter().any(|s| set.contains(s.id.as_str())) {
            self.commit_history();
            self.freeform.retain(|s| !set.contains(s.id.as_str()));
        }
        self.selection.retain(|id| !set.contains(id.as_str()));
    }

    // ── tool / camera ────────────────────────────────────────────────────
    pub fn set_tool(&mut self, tool: Tool) {
        self.tool = tool;
    }
    pub fn tool(&self) -> Tool {
        self.tool
    }
    pub fn set_viewport(&mut self, w: f32, h: f32) {
        self.viewport = (w, h);
    }
    pub fn camera(&self) -> Camera {
        self.camera
    }
    pub fn set_camera(&mut self, c: Camera) {
        self.camera = c;
    }

    /// Screen → page, inverting `screen = (page + cam) * z`.
    pub fn screen_to_page(&self, sx: f32, sy: f32) -> (f32, f32) {
        (
            sx / self.camera.z - self.camera.x,
            sy / self.camera.z - self.camera.y,
        )
    }

    pub fn pan_by(&mut self, dx_screen: f32, dy_screen: f32) {
        let z = self.camera.z;
        self.camera.x += dx_screen / z;
        self.camera.y += dy_screen / z;
    }

    pub fn zoom_to_point(&mut self, next_z: f32, sx: f32, sy: f32) {
        let z = next_z.clamp(MIN_ZOOM, MAX_ZOOM);
        let before = self.screen_to_page(sx, sy);
        self.camera = Camera {
            x: sx / z - before.0,
            y: sy / z - before.1,
            z,
        };
    }

    pub fn zoom_to_fit(&mut self) {
        let mut minx = f32::INFINITY;
        let mut miny = f32::INFINITY;
        let mut maxx = f32::NEG_INFINITY;
        let mut maxy = f32::NEG_INFINITY;
        let mut any = false;
        for s in self.all_shapes_iter() {
            any = true;
            minx = minx.min(s.x);
            miny = miny.min(s.y);
            maxx = maxx.max(s.x + s.w);
            maxy = maxy.max(s.y + s.h);
        }
        if !any {
            return;
        }
        let (cw, ch) = (maxx - minx, maxy - miny);
        let (vw, vh) = self.viewport;
        let z = if cw > 0.0 && ch > 0.0 {
            (vw / cw).min(vh / ch) * DEFAULT_PADDING
        } else {
            1.0
        };
        let z = z.clamp(MIN_ZOOM, MAX_ZOOM);
        let (cx, cy) = (minx + cw / 2.0, miny + ch / 2.0);
        self.camera = Camera {
            x: vw / 2.0 / z - cx,
            y: vh / 2.0 / z - cy,
            z,
        };
    }

    // ── undo / redo ──────────────────────────────────────────────────────
    pub fn undo(&mut self) {
        if let Some(prev) = self.past.pop() {
            let cur = self.snapshot();
            self.future.push(cur);
            self.restore(prev);
        }
    }
    pub fn redo(&mut self) {
        if let Some(next) = self.future.pop() {
            let cur = self.snapshot();
            self.past.push(cur);
            self.restore(next);
        }
    }
    pub fn can_undo(&self) -> bool {
        !self.past.is_empty()
    }
    pub fn can_redo(&self) -> bool {
        !self.future.is_empty()
    }

    // ── theme / background ───────────────────────────────────────────────
    pub fn set_theme(&mut self, theme: Theme) {
        self.theme = theme;
    }
    pub fn theme(&self) -> Theme {
        self.theme
    }
    pub fn set_background(&mut self, bg: Option<String>) {
        self.background = bg;
    }
    pub fn background(&self) -> Option<&str> {
        self.background.as_deref()
    }

    // ── internals ────────────────────────────────────────────────────────
    fn snapshot(&self) -> Snapshot {
        Snapshot {
            source: self.source.clone(),
            freeform: self.freeform.clone(),
            selection: self.selection.clone(),
        }
    }

    fn restore(&mut self, snap: Snapshot) {
        self.freeform = snap.freeform;
        self.selection = snap.selection;
        // Reparse source to rebuild diagram + kymo shapes (snapshots are of
        // valid states, but tolerate a parse failure by keeping the text).
        if let Ok(d) = kymo::to_diagram(&snap.source) {
            self.diagram = d;
            self.kymo_shapes = diagram_to_shapes(&self.diagram);
        }
        self.source = snap.source;
    }

    fn commit_history(&mut self) {
        self.past.push(self.snapshot());
        if self.past.len() > HISTORY_MAX {
            self.past.remove(0);
        }
        self.future.clear();
    }

    fn fresh_id(&mut self, prefix: &str) -> String {
        let id = format!("{prefix}-{}", self.next_freeform);
        self.next_freeform += 1;
        id
    }
}

// ── geometry helpers ─────────────────────────────────────────────────────────
fn in_box(px: f32, py: f32, s: &EditorShape) -> bool {
    px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h
}

fn move_shape(s: &mut EditorShape, dx: f32, dy: f32) {
    s.x += dx;
    s.y += dy;
    if let ShapeData::Edge { x2, y2, .. } = &mut s.data {
        *x2 += dx;
        *y2 += dy;
    }
    if let ShapeData::Freedraw { points, .. } = &mut s.data {
        for p in points {
            p.0 += dx;
            p.1 += dy;
        }
    }
}

fn bbox(points: &[(f32, f32)]) -> (f32, f32, f32, f32) {
    let mut minx = f32::INFINITY;
    let mut miny = f32::INFINITY;
    let mut maxx = f32::NEG_INFINITY;
    let mut maxy = f32::NEG_INFINITY;
    for &(x, y) in points {
        minx = minx.min(x);
        miny = miny.min(y);
        maxx = maxx.max(x);
        maxy = maxy.max(y);
    }
    if points.is_empty() {
        (0.0, 0.0, 0.0, 0.0)
    } else {
        (minx, miny, maxx, maxy)
    }
}

/// Distance from point `(px,py)` to segment `(ax,ay)-(bx,by)`.
fn point_seg_dist(px: f32, py: f32, ax: f32, ay: f32, bx: f32, by: f32) -> f32 {
    let (dx, dy) = (bx - ax, by - ay);
    let len2 = dx * dx + dy * dy;
    if len2 == 0.0 {
        return ((px - ax).powi(2) + (py - ay).powi(2)).sqrt();
    }
    let t = (((px - ax) * dx + (py - ay) * dy) / len2).clamp(0.0, 1.0);
    let (cx, cy) = (ax + t * dx, ay + t * dy);
    ((px - cx).powi(2) + (py - cy).powi(2)).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    const SRC: &str = "\
a circle/user/blue \"A\" \"\" @ (100, 100)
b hex/hex-agent/green \"B\" \"\" @ (300, 100)
a --> b";

    fn session() -> EditorSession {
        let mut s = EditorSession::new();
        s.load_source(SRC).unwrap();
        s
    }

    #[test]
    fn loads_and_lists_shapes() {
        let s = session();
        let shapes = s.shapes();
        assert!(shapes.iter().any(|s| s.kymo_id.as_deref() == Some("a")));
        assert!(shapes.iter().any(|s| s.kymo_id.as_deref() == Some("b")));
        assert!(shapes.iter().any(|s| s.kind == ShapeKind::KymoEdge));
    }

    #[test]
    fn hit_test_picks_node() {
        let s = session();
        // node 'a' centred at (100,100) post-snap (snap to grid keeps near).
        let a = s
            .shapes()
            .into_iter()
            .find(|s| s.kymo_id.as_deref() == Some("a"))
            .unwrap();
        let (cx, cy) = (a.x + a.w / 2.0, a.y + a.h / 2.0);
        assert_eq!(s.hit_test(cx, cy).as_deref(), Some(a.id.as_str()));
    }

    #[test]
    fn drag_writes_back_position() {
        let mut s = session();
        let a = s
            .shapes()
            .into_iter()
            .find(|s| s.kymo_id.as_deref() == Some("a"))
            .unwrap();
        let before_center = (a.x + a.w / 2.0, a.y + a.h / 2.0);
        s.select(vec![a.id.clone()]);
        s.begin_drag();
        s.drag_by(40.0, 0.0);
        s.end_drag().unwrap();
        // source rewritten with new x.
        let a2 = s
            .shapes()
            .into_iter()
            .find(|sh| sh.kymo_id.as_deref() == Some("a"))
            .unwrap();
        let after_center = (a2.x + a2.w / 2.0, a2.y + a2.h / 2.0);
        assert!(after_center.0 > before_center.0, "node moved right");
        assert!(s.source().contains("@ ("), "leaf got explicit position");
        assert!(s.can_undo());
    }

    #[test]
    fn undo_redo_restores_source() {
        let mut s = session();
        let orig = s.source().to_string();
        let a = s
            .shapes()
            .into_iter()
            .find(|sh| sh.kymo_id.as_deref() == Some("a"))
            .unwrap();
        s.select(vec![a.id]);
        s.begin_drag();
        s.drag_by(80.0, 24.0);
        s.end_drag().unwrap();
        let moved = s.source().to_string();
        assert_ne!(orig, moved);
        s.undo();
        assert_eq!(s.source(), orig);
        s.redo();
        assert_eq!(s.source(), moved);
    }

    #[test]
    fn freeform_add_remove_undo() {
        let mut s = session();
        let n = s.shapes().len();
        let id = s.add_note(10.0, 10.0, "hi", "yellow");
        assert_eq!(s.shapes().len(), n + 1);
        assert_eq!(s.hit_test(20.0, 20.0).as_deref(), Some(id.as_str()));
        s.remove(&[id]);
        assert_eq!(s.shapes().len(), n);
        s.undo(); // bring the note back
        assert_eq!(s.shapes().len(), n + 1);
    }

    #[test]
    fn camera_screen_page_roundtrip() {
        let mut s = session();
        s.set_viewport(800.0, 600.0);
        s.zoom_to_fit();
        let (px, py) = s.screen_to_page(400.0, 300.0);
        // round-trips back through the forward transform.
        let c = s.camera();
        let (sx, sy) = ((px + c.x) * c.z, (py + c.y) * c.z);
        assert!((sx - 400.0).abs() < 0.01 && (sy - 300.0).abs() < 0.01);
    }

    #[test]
    fn render_png_smoke() {
        let s = session();
        let png = s.render_png(1.0).unwrap();
        assert_eq!(&png[..8], b"\x89PNG\r\n\x1a\n");
    }
}
