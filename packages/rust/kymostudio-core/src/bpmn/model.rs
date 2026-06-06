//! Data model — plain structs mirroring `kymo.model` (`model.py`).
//!
//! The renderer is deliberately dumb: these structs hold the resolved diagram and
//! the back-ends just turn them into output. Field names, order and defaults match
//! the Python dataclasses exactly (the canonical-JSON contract depends on it — see
//! [`super::to_json`]). Coordinates are `i64`: both front-ends round to integer
//! pixels, so the model never carries fractions.
//!
//! Enumerated fields (`shape`, `accent`, `style`, …) are kept as `String`/`Option<String>`
//! rather than Rust enums so the canonical serializer is a trivial pass-through and
//! the value set stays in lockstep with Python without a mapping layer.

/// Half-size (w/2, h/2) of each shape's icon box — the anchor-point fallback when
/// a `Component` has no explicit `size`. Mirrors `model.SHAPE_HALF`.
pub fn shape_half(shape: &str) -> (i64, i64) {
    match shape {
        "circle" => (38, 38),
        "cube" => (40, 40),
        "cube-big" => (50, 50),
        "box" => (35, 35),
        "cylinder" => (35, 35),
        "hex" => (35, 32),
        "annotation" => (0, 0),
        "aws-tile" => (32, 32),
        "aws-tile-hero" => (40, 40),
        "badge" => (14, 14),
        "image" => (32, 32),
        "bpmn-start" => (18, 18),
        "bpmn-end" => (18, 18),
        "bpmn-intermediate" => (18, 18),
        "bpmn-boundary" => (18, 18),
        "bpmn-task" => (50, 40),
        "bpmn-subprocess" => (50, 40),
        "bpmn-gateway" => (25, 25),
        "bpmn-data-object" => (18, 25),
        "bpmn-data-store" => (25, 25),
        "bpmn-annotation" => (0, 0),
        _ => (0, 0),
    }
}

/// Vertical space the name+subtitle take below the icon — pushes top/bottom anchors
/// outside the label band. Mirrors `model.LABEL_HEIGHT` (BPMN glyphs are all 0).
pub fn label_height(shape: &str) -> i64 {
    match shape {
        "circle" => 38,
        "cube" => 42,
        "cube-big" => 48,
        "box" => 38,
        "cylinder" => 38,
        "hex" => 40,
        "aws-tile" => 48,
        "aws-tile-hero" => 48,
        "image" => 26,
        _ => 0, // annotation, badge, and every bpmn-* glyph
    }
}

/// A node glyph. `pos` is the **centre** (cx, cy); `size`, when set (always, for
/// BPMN imports), is the authored box (w, h) from Diagram-Interchange bounds.
#[derive(Debug, Clone, PartialEq)]
pub struct Component {
    pub id: String,
    pub name: String,
    pub subtitle: String,
    pub icon: String,
    pub shape: String,
    pub accent: String,
    pub pos: (i64, i64),
    pub size: Option<(i64, i64)>,
    pub parent: Option<String>,
    pub align: Option<String>,
    pub align_gap: i64,
    pub align_offset: (i64, i64),
    pub label_box: Option<(i64, i64, i64, i64)>,
}

impl Default for Component {
    fn default() -> Self {
        Component {
            id: String::new(),
            name: String::new(),
            subtitle: String::new(),
            icon: String::new(),
            shape: String::new(),
            accent: "blue".into(),
            pos: (0, 0),
            size: None,
            parent: None,
            align: None,
            align_gap: 24,
            align_offset: (0, 0),
            label_box: None,
        }
    }
}

impl Component {
    /// (w/2, h/2): from `size` when set (floor division, like Python `//`), else
    /// the per-shape fallback. Mirrors `Component.half`.
    pub fn half(&self) -> (i64, i64) {
        match self.size {
            Some((w, h)) => (w / 2, h / 2),
            None => shape_half(&self.shape),
        }
    }

    /// (x, y) where an edge enters/exits on `side`. Mirrors `Component.anchor`.
    pub fn anchor(&self, side: &str) -> (i64, i64) {
        let (cx, cy) = self.pos;
        let (hw, hh) = self.half();
        let lh = if !self.name.is_empty() || !self.subtitle.is_empty() {
            label_height(&self.shape)
        } else {
            0
        };
        match side {
            "top" => (cx, cy - hh),
            "right" => (cx + hw, cy),
            "bottom" => (cx, cy + hh + lh),
            "left" => (cx - hw, cy),
            _ => (cx, cy), // "center"
        }
    }
}

/// A container box (pool / lane / group / sub-process / cluster). `bounds` is
/// top-left (x, y, w, h). Mirrors `kymo.model.Region`.
#[derive(Debug, Clone, PartialEq)]
pub struct Region {
    pub id: String,
    pub label: String,
    pub bounds: (i64, i64, i64, i64),
    pub contains: Vec<String>,
    pub padding: (i64, i64),
    pub padding_bottom: Option<i64>,
    pub style: String,
    pub icon: Option<String>,
    pub layout: Option<String>,
    pub pos: Option<(i64, i64)>,
    pub gap: i64,
    pub align: String,
    pub visible: bool,
    pub border_dash: Option<(i64, i64)>,
    pub border_stroke: Option<String>,
    pub label_anchor: String,
    pub label_position: Option<String>,
}

impl Default for Region {
    fn default() -> Self {
        Region {
            id: String::new(),
            label: String::new(),
            bounds: (0, 0, 0, 0),
            contains: Vec::new(),
            padding: (24, 24),
            padding_bottom: None,
            style: "outer".into(),
            icon: None,
            layout: None,
            pos: None,
            gap: 24,
            align: "center".into(),
            visible: true,
            border_dash: None,
            border_stroke: None,
            label_anchor: "middle".into(),
            label_position: None,
        }
    }
}

impl Region {
    /// (x, y) where an edge attaches to the border on `side`. Mirrors `Region.anchor`.
    pub fn anchor(&self, side: &str) -> (i64, i64) {
        let (x, y, w, h) = self.bounds;
        match side {
            "top" => (x + w / 2, y),
            "right" => (x + w, y + h / 2),
            "bottom" => (x + w / 2, y + h),
            "left" => (x, y + h / 2),
            _ => (x + w / 2, y + h / 2), // "center"
        }
    }
}

/// A connector. For BPMN imports the absolute `points` polyline (DI waypoints) is
/// always set and `bpmn_flow` selects the arrowhead/dash convention. Mirrors `Edge`.
#[derive(Debug, Clone, PartialEq)]
pub struct Edge {
    pub src: String,
    pub dst: String,
    pub label: String,
    pub style: String,
    pub src_anchor: Option<String>,
    pub dst_anchor: Option<String>,
    pub route: String,
    pub via: Vec<(i64, i64)>,
    pub src_offset: (i64, i64),
    pub dst_offset: (i64, i64),
    pub label_offset: (i64, i64),
    pub label_anchor: String,
    pub label_small: bool,
    pub label_pos: Option<(i64, i64)>,
    pub dashed: bool,
    pub no_arrow: bool,
    pub trunk_offset: i64,
    pub shared_port: bool,
    pub points: Option<Vec<(i64, i64)>>,
    pub bpmn_flow: Option<String>,
}

impl Default for Edge {
    fn default() -> Self {
        Edge {
            src: String::new(),
            dst: String::new(),
            label: String::new(),
            style: "gray".into(),
            src_anchor: None,
            dst_anchor: None,
            route: "auto".into(),
            via: Vec::new(),
            src_offset: (0, 0),
            dst_offset: (0, 0),
            label_offset: (0, 0),
            label_anchor: "mid".into(),
            label_small: false,
            label_pos: None,
            dashed: false,
            no_arrow: false,
            trunk_offset: 0,
            shared_port: false,
            points: None,
            bpmn_flow: None,
        }
    }
}

/// A DSL `layout { … }` tree node. Empty for BPMN imports; kept so the canonical
/// model JSON can carry it. Mirrors `to_kymojson._layout_node`.
#[derive(Debug, Clone, PartialEq)]
pub enum LayoutNode {
    Id(String),
    Group {
        dir: String,
        children: Vec<LayoutNode>,
    },
}

/// The whole resolved diagram. Mirrors `kymo.model.Diagram` (minus the transient
/// `bpmn_blocks`, which the canonical model excludes and BPMN imports never carry).
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Diagram {
    pub width: i64,
    pub height: i64,
    pub title: String,
    pub subtitle: String,
    pub components: Vec<Component>,
    pub regions: Vec<Region>,
    pub edges: Vec<Edge>,
    pub layout_trees: Vec<LayoutNode>,
}

impl Diagram {
    /// Lookup a component by id (mirrors `Diagram.get`).
    pub fn get(&self, id: &str) -> Option<&Component> {
        self.components.iter().find(|c| c.id == id)
    }
}
