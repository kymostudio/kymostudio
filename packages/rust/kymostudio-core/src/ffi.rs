//! uniffi FFI surface — the native mobile binding over [`editor::EditorSession`].
//!
//! Exposes a thread-safe `Session` object (a `Mutex`-wrapped editor) plus plain
//! `Record`/`Enum` DTOs, so Android (Kotlin/Compose) and iOS (Swift/SwiftUI)
//! drive the shared Rust engine: push source, pull rendered SVG/PNG + shape
//! geometry, forward pointer events (hit-test → select → drag), undo/redo.
//!
//! Built only with the `mobile` feature. Bindings are generated from the
//! compiled library by the `uniffi-bindgen` bin (see `packages/mobile/`).

use std::sync::{Arc, Mutex};

use crate::editor::shape::{EditorShape, ShapeData, ShapeKind};
use crate::editor::{Camera, EditorSession, Theme, Tool};

// NOTE: `uniffi::setup_scaffolding!()` is invoked at the crate root (lib.rs) —
// the proc-macro derives reference `crate::UniFfiTag`, which that macro defines.

// ── Error ────────────────────────────────────────────────────────────────────
#[derive(Debug, uniffi::Error)]
pub enum EditorError {
    Parse { msg: String },
    Render { msg: String },
}

impl std::fmt::Display for EditorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EditorError::Parse { msg } => write!(f, "parse error: {msg}"),
            EditorError::Render { msg } => write!(f, "render error: {msg}"),
        }
    }
}
impl std::error::Error for EditorError {}

impl From<crate::kymo::KymoError> for EditorError {
    fn from(e: crate::kymo::KymoError) -> Self {
        EditorError::Parse { msg: e.to_string() }
    }
}
impl From<crate::RenderError> for EditorError {
    fn from(e: crate::RenderError) -> Self {
        EditorError::Render { msg: e.to_string() }
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
#[derive(uniffi::Record, Clone, Copy)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

#[derive(uniffi::Record, Clone, Copy)]
pub struct CameraDto {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(uniffi::Enum, Clone, Copy, PartialEq, Eq)]
pub enum FfiTool {
    Select,
    Hand,
    Draw,
    Sticky,
    Text,
}

#[derive(uniffi::Enum, Clone, Copy, PartialEq, Eq)]
pub enum FfiTheme {
    Light,
    Dark,
}

#[derive(uniffi::Enum, Clone, Copy, PartialEq, Eq)]
pub enum FfiShapeKind {
    Node,
    Region,
    Edge,
    Freedraw,
    Note,
    Text,
}

/// A flattened editor shape for the native side. Only the fields relevant to
/// `kind` are populated; the rest are empty/zero.
#[derive(uniffi::Record, Clone)]
pub struct FfiShape {
    pub id: String,
    pub kind: FfiShapeKind,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    pub kymo_id: Option<String>,
    /// node name / region label / edge label / text|note content.
    pub label: String,
    pub subtitle: String,
    pub icon: String,
    pub accent: String,
    pub color: String,
    pub dashed: bool,
    /// edge end point (page space); `x`,`y` is the start.
    pub x2: f32,
    pub y2: f32,
    /// freedraw stroke (page space).
    pub points: Vec<Point>,
    pub size: f32,
}

impl From<EditorShape> for FfiShape {
    fn from(s: EditorShape) -> Self {
        let mut out = FfiShape {
            id: s.id,
            kind: match s.kind {
                ShapeKind::KymoNode => FfiShapeKind::Node,
                ShapeKind::KymoRegion => FfiShapeKind::Region,
                ShapeKind::KymoEdge => FfiShapeKind::Edge,
                ShapeKind::Freedraw => FfiShapeKind::Freedraw,
                ShapeKind::Note => FfiShapeKind::Note,
                ShapeKind::Text => FfiShapeKind::Text,
            },
            x: s.x,
            y: s.y,
            w: s.w,
            h: s.h,
            kymo_id: s.kymo_id,
            label: String::new(),
            subtitle: String::new(),
            icon: String::new(),
            accent: String::new(),
            color: String::new(),
            dashed: false,
            x2: 0.0,
            y2: 0.0,
            points: Vec::new(),
            size: 0.0,
        };
        match s.data {
            ShapeData::Node { icon, accent, name, subtitle } => {
                out.icon = icon;
                out.accent = accent;
                out.label = name;
                out.subtitle = subtitle;
            }
            ShapeData::Region { label, dash } => {
                out.label = label;
                out.dashed = dash;
            }
            ShapeData::Edge { x2, y2, label, .. } => {
                out.x2 = x2;
                out.y2 = y2;
                out.label = label;
            }
            ShapeData::Freedraw { points, color, size } => {
                out.points = points.into_iter().map(|(x, y)| Point { x, y }).collect();
                out.color = color;
                out.size = size;
            }
            ShapeData::Note { text, color } => {
                out.label = text;
                out.color = color;
            }
            ShapeData::Text { text, size } => {
                out.label = text;
                out.size = size;
            }
        }
        out
    }
}

fn tool_in(t: FfiTool) -> Tool {
    match t {
        FfiTool::Select => Tool::Select,
        FfiTool::Hand => Tool::Hand,
        FfiTool::Draw => Tool::Draw,
        FfiTool::Sticky => Tool::Sticky,
        FfiTool::Text => Tool::Text,
    }
}
fn tool_out(t: Tool) -> FfiTool {
    match t {
        Tool::Select => FfiTool::Select,
        Tool::Hand => FfiTool::Hand,
        Tool::Draw => FfiTool::Draw,
        Tool::Sticky => FfiTool::Sticky,
        Tool::Text => FfiTool::Text,
    }
}

// ── Session object ─────────────────────────────────────────────────────────
/// The editor handle. Thread-safe (interior `Mutex`); all methods take `&self`.
#[derive(uniffi::Object)]
pub struct Session {
    inner: Mutex<EditorSession>,
}

#[uniffi::export]
impl Session {
    #[uniffi::constructor]
    pub fn new() -> Arc<Session> {
        Arc::new(Session {
            inner: Mutex::new(EditorSession::new()),
        })
    }

    pub fn load_source(&self, text: String) -> Result<(), EditorError> {
        self.inner.lock().unwrap().load_source(&text)?;
        Ok(())
    }
    pub fn source(&self) -> String {
        self.inner.lock().unwrap().source().to_string()
    }
    pub fn render_svg(&self) -> String {
        self.inner.lock().unwrap().render_svg()
    }
    pub fn render_png(&self, scale: f32) -> Result<Vec<u8>, EditorError> {
        Ok(self.inner.lock().unwrap().render_png(scale)?)
    }

    pub fn shapes(&self) -> Vec<FfiShape> {
        self.inner.lock().unwrap().shapes().into_iter().map(Into::into).collect()
    }
    pub fn hit_test(&self, x: f32, y: f32) -> Option<String> {
        self.inner.lock().unwrap().hit_test(x, y)
    }
    pub fn hit_test_rect(&self, x: f32, y: f32, w: f32, h: f32) -> Vec<String> {
        self.inner.lock().unwrap().hit_test_rect(x, y, w, h)
    }

    pub fn select(&self, ids: Vec<String>) {
        self.inner.lock().unwrap().select(ids);
    }
    pub fn selection(&self) -> Vec<String> {
        self.inner.lock().unwrap().selection()
    }

    pub fn begin_drag(&self) {
        self.inner.lock().unwrap().begin_drag();
    }
    pub fn drag_by(&self, dx: f32, dy: f32) {
        self.inner.lock().unwrap().drag_by(dx, dy);
    }
    pub fn end_drag(&self) -> Result<(), EditorError> {
        self.inner.lock().unwrap().end_drag()?;
        Ok(())
    }

    pub fn add_freedraw(&self, points: Vec<Point>, color: String, size: f32) -> String {
        let pts: Vec<(f32, f32)> = points.into_iter().map(|p| (p.x, p.y)).collect();
        self.inner.lock().unwrap().add_freedraw(pts, &color, size)
    }
    pub fn add_note(&self, x: f32, y: f32, text: String, color: String) -> String {
        self.inner.lock().unwrap().add_note(x, y, &text, &color)
    }
    pub fn add_text(&self, x: f32, y: f32, text: String, size: f32) -> String {
        self.inner.lock().unwrap().add_text(x, y, &text, size)
    }
    pub fn update_text(&self, id: String, text: String) {
        self.inner.lock().unwrap().update_text(&id, &text);
    }
    pub fn remove(&self, ids: Vec<String>) {
        self.inner.lock().unwrap().remove(&ids);
    }

    pub fn set_tool(&self, tool: FfiTool) {
        self.inner.lock().unwrap().set_tool(tool_in(tool));
    }
    pub fn tool(&self) -> FfiTool {
        tool_out(self.inner.lock().unwrap().tool())
    }
    pub fn set_viewport(&self, w: f32, h: f32) {
        self.inner.lock().unwrap().set_viewport(w, h);
    }
    pub fn pan_by(&self, dx: f32, dy: f32) {
        self.inner.lock().unwrap().pan_by(dx, dy);
    }
    pub fn zoom_to_point(&self, z: f32, sx: f32, sy: f32) {
        self.inner.lock().unwrap().zoom_to_point(z, sx, sy);
    }
    pub fn zoom_to_fit(&self) {
        self.inner.lock().unwrap().zoom_to_fit();
    }
    pub fn camera(&self) -> CameraDto {
        let c = self.inner.lock().unwrap().camera();
        CameraDto { x: c.x, y: c.y, z: c.z }
    }
    pub fn set_camera(&self, c: CameraDto) {
        self.inner.lock().unwrap().set_camera(Camera { x: c.x, y: c.y, z: c.z });
    }
    pub fn screen_to_page(&self, sx: f32, sy: f32) -> Point {
        let (x, y) = self.inner.lock().unwrap().screen_to_page(sx, sy);
        Point { x, y }
    }

    pub fn undo(&self) {
        self.inner.lock().unwrap().undo();
    }
    pub fn redo(&self) {
        self.inner.lock().unwrap().redo();
    }
    pub fn can_undo(&self) -> bool {
        self.inner.lock().unwrap().can_undo()
    }
    pub fn can_redo(&self) -> bool {
        self.inner.lock().unwrap().can_redo()
    }

    pub fn set_theme(&self, theme: FfiTheme) {
        let t = match theme {
            FfiTheme::Light => Theme::Light,
            FfiTheme::Dark => Theme::Dark,
        };
        self.inner.lock().unwrap().set_theme(t);
    }
    pub fn set_background(&self, bg: Option<String>) {
        self.inner.lock().unwrap().set_background(bg);
    }
}

// ── Free functions ───────────────────────────────────────────────────────────
/// Register a TTF/OTF font for `<text>` rendering (mobile has no system fonts —
/// call once at startup with a bundled font before the first render).
#[uniffi::export]
pub fn register_font(bytes: Vec<u8>) {
    crate::register_font(bytes);
}

/// Register a file-backed icon the host bundles: PNG (base64 `<image>`) when
/// `is_png`, else inline SVG. Built-in vector icons need no registration.
#[uniffi::export]
pub fn register_icon(key: String, bytes: Vec<u8>, is_png: bool) {
    crate::kymo::icons::register_icon(&key, &bytes, is_png);
}

#[uniffi::export]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
