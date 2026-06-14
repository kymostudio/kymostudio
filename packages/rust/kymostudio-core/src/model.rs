//! The kymo diagram data model — a Rust mirror of `packages/python/src/kymo/model.py`.
//!
//! These plain structs are what every front-end produces and every back-end
//! consumes; the [`kymojson`](crate::kymojson) serializer turns a resolved
//! [`Diagram`] into the `.kymo.json` interchange format that the Python
//! (`from_kymojson`) and JS (`parseKymoJson`) loaders read back. To stay
//! byte-compatible with that contract the field set, ordering and DEFAULTS here
//! must match the Python dataclasses exactly — see `to_kymojson.py` for the
//! canonical field lists and `model.py` for the defaults reproduced below.

/// A 2-D integer point `(x, y)`. Serialized as a JSON array `[x, y]`.
pub type Point = (i32, i32);

/// Round half-to-even exactly like CPython's `round()` (ties to even), so a
/// faithful layout port produces the same integer coordinates Python would.
///
/// Mirrors CPython `float.__round__(None)`:
/// `z = round(x); if |x-z| == 0.5 { z = 2*round(x/2) }` where C `round` is
/// half-away-from-zero. The existing JS port calls this `pyRound`.
pub fn py_round(x: f64) -> i32 {
    let mut z = x.round(); // half away from zero (C round)
    if (x - z).abs() == 0.5 {
        z = 2.0 * (x / 2.0).round();
    }
    z as i32
}

macro_rules! str_enum {
    ($(#[$m:meta])* $name:ident { $($variant:ident => $s:literal),+ $(,)? }) => {
        $(#[$m])*
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
        pub enum $name { $($variant),+ }
        impl $name {
            pub fn as_str(self) -> &'static str {
                match self { $(Self::$variant => $s),+ }
            }
            /// Parse the DSL/JSON string token into the enum (`None` if unknown).
            pub fn from_str(s: &str) -> Option<Self> {
                match s { $($s => Some(Self::$variant),)+ _ => None }
            }
        }
    };
}

str_enum! {
    /// Component glyph. Mirrors `model.Shape`, plus the new `Diamond`
    /// (Mermaid decision node `{...}`) which has no Python equivalent yet —
    /// the Python/JS renderers gain the glyph when they consume kymojson.
    Shape {
        Circle => "circle", Cube => "cube", CubeBig => "cube-big", Box => "box",
        Cylinder => "cylinder", Hex => "hex", Diamond => "diamond",
        Annotation => "annotation", AwsTile => "aws-tile", AwsTileHero => "aws-tile-hero",
        Badge => "badge", Image => "image",
        BpmnStart => "bpmn-start", BpmnEnd => "bpmn-end",
        StateStart => "state-start", StateEnd => "state-end",
        BpmnIntermediate => "bpmn-intermediate", BpmnBoundary => "bpmn-boundary",
        BpmnTask => "bpmn-task", BpmnSubprocess => "bpmn-subprocess",
        BpmnGateway => "bpmn-gateway", BpmnDataObject => "bpmn-data-object",
        BpmnDataStore => "bpmn-data-store", BpmnAnnotation => "bpmn-annotation",
    }
}

str_enum! {
    Accent { Green => "green", Orange => "orange", Blue => "blue", Red => "red" }
}

str_enum! {
    Anchor { Top => "top", Right => "right", Bottom => "bottom", Left => "left", Center => "center" }
}

str_enum! {
    EdgeStyle { Gray => "gray", Orange => "orange" }
}

str_enum! {
    Route { Auto => "auto", Over => "over", Under => "under", Curve => "curve", Straight => "straight" }
}

str_enum! {
    /// Edge label anchor (`label_anchor`): which end the label tracks.
    EdgeLabelAnchor { Src => "src", Dst => "dst", Mid => "mid" }
}

str_enum! {
    RegionStyle { Outer => "outer", Inner => "inner", Cluster => "cluster", Pool => "pool", Lane => "lane" }
}

str_enum! {
    AutoLayout { Horizontal => "horizontal", Vertical => "vertical" }
}

str_enum! {
    RegionAlign { Start => "start", Center => "center", End => "end" }
}

str_enum! {
    RegionLabelAnchor { Start => "start", Middle => "middle", End => "end" }
}

str_enum! {
    LabelPosition { Above => "above", Inside => "inside" }
}

/// A node. Field order/defaults match `model.Component` (see `_COMPONENT_FIELDS`).
#[derive(Debug, Clone)]
pub struct Component {
    pub id: String,
    pub name: String,
    pub subtitle: String,
    pub icon: String,
    pub shape: Shape,
    pub accent: Accent,
    pub pos: Point,
    pub size: Option<Point>,
    pub parent: Option<String>,
    pub align: Option<Anchor>,
    pub align_gap: i32,
    pub align_offset: Point,
    pub label_box: Option<(i32, i32, i32, i32)>,
}

impl Shape {
    /// Half-size `(w/2, h/2)` of the icon bounding box, used for anchor-point
    /// computation. Mirrors `model.SHAPE_HALF` (Python). Real BPMN sizes arrive
    /// via [`Component::size`]; these are fallbacks.
    pub fn shape_half(self) -> (i32, i32) {
        use Shape::*;
        match self {
            Circle => (38, 38),
            Cube => (40, 40),
            CubeBig => (50, 50),
            Box => (35, 35),
            Cylinder => (35, 35),
            Hex => (35, 32),
            Diamond => (40, 28),
            Annotation => (0, 0),
            AwsTile => (32, 32),
            AwsTileHero => (40, 40),
            Badge => (14, 14),
            Image => (32, 32),
            BpmnStart | BpmnEnd | BpmnIntermediate | BpmnBoundary => (18, 18),
            BpmnTask | BpmnSubprocess => (50, 40),
            BpmnGateway | BpmnDataStore => (25, 25),
            BpmnDataObject => (18, 25),
            BpmnAnnotation => (0, 0),
        }
    }

    /// Space the name+subtitle take BELOW the icon — pushes top/bottom anchors
    /// outside the label area. Mirrors `model.LABEL_HEIGHT` (Python).
    pub fn label_height(self) -> i32 {
        use Shape::*;
        match self {
            Circle => 38,
            Cube => 42,
            CubeBig => 48,
            Box => 38,
            Cylinder => 38,
            Hex => 40,
            AwsTile | AwsTileHero => 48,
            Image => 26,
            // diamond, annotation, badge, and every BPMN glyph: 0
            _ => 0,
        }
    }
}

impl Component {
    /// `(w/2, h/2)` — explicit [`size`](Self::size) if set (integer halving,
    /// like Python `//`), else the per-shape [`Shape::shape_half`].
    pub fn half(&self) -> (i32, i32) {
        match self.size {
            Some((w, h)) => (w.div_euclid(2), h.div_euclid(2)),
            None => self.shape.shape_half(),
        }
    }

    /// The `(x, y)` where an edge enters/exits this component on `side`.
    /// `bottom` pushes past the label band — but only for icon-bearing nodes
    /// that actually carry a name/subtitle (mirrors `Component.anchor`).
    pub fn anchor(&self, side: Anchor) -> Point {
        let (cx, cy) = self.pos;
        let (hw, hh) = self.half();
        let labelled = (!self.name.is_empty() || !self.subtitle.is_empty()) && !self.icon.is_empty();
        let lh = if labelled { self.shape.label_height() } else { 0 };
        match side {
            Anchor::Top => (cx, cy - hh),
            Anchor::Right => (cx + hw, cy),
            Anchor::Bottom => (cx, cy + hh + lh),
            Anchor::Left => (cx - hw, cy),
            Anchor::Center => (cx, cy),
        }
    }
}

impl Region {
    /// The `(x, y)` where an edge attaches to this region's border on `side`.
    /// Same signature as [`Component::anchor`] so edges target either kind.
    /// Requires `bounds` to be resolved beforehand.
    pub fn anchor(&self, side: Anchor) -> Point {
        let (x, y, w, h) = self.bounds;
        match side {
            Anchor::Top => (x + w / 2, y),
            Anchor::Right => (x + w, y + h / 2),
            Anchor::Bottom => (x + w / 2, y + h),
            Anchor::Left => (x, y + h / 2),
            Anchor::Center => (x + w / 2, y + h / 2),
        }
    }
}

/// An edge endpoint — a [`Component`] or a [`Region`] (both expose `anchor`).
#[derive(Clone, Copy)]
pub enum Node<'a> {
    Component(&'a Component),
    Region(&'a Region),
}

impl Node<'_> {
    pub fn anchor(&self, side: Anchor) -> Point {
        match self {
            Node::Component(c) => c.anchor(side),
            Node::Region(r) => r.anchor(side),
        }
    }
}

/// Return the effective `(src_anchor, dst_anchor)` for an edge. A `None` slot is
/// auto-picked from geometry: whichever side faces the other node's centre,
/// strongly biased horizontal (vertical only wins when `|dy| > 2·|dx|`).
/// Mirrors `model.resolve_anchors` (Python).
pub fn resolve_anchors(e: &Edge, src: Node, dst: Node) -> (Anchor, Anchor) {
    if let (Some(sa), Some(da)) = (e.src_anchor, e.dst_anchor) {
        return (sa, da);
    }
    let sc = src.anchor(Anchor::Center);
    let dc = dst.anchor(Anchor::Center);
    let (dx, dy) = (dc.0 - sc.0, dc.1 - sc.1);
    let (auto_sa, auto_da) = if dy.abs() > 2 * dx.abs() {
        if dy >= 0 {
            (Anchor::Bottom, Anchor::Top)
        } else {
            (Anchor::Top, Anchor::Bottom)
        }
    } else if dx >= 0 {
        (Anchor::Right, Anchor::Left)
    } else {
        (Anchor::Left, Anchor::Right)
    };
    (e.src_anchor.unwrap_or(auto_sa), e.dst_anchor.unwrap_or(auto_da))
}

impl Component {
    /// A flowchart node with model defaults (`accent=blue`, no parent/align).
    pub fn flowchart(id: impl Into<String>, name: impl Into<String>, shape: Shape) -> Self {
        Component {
            id: id.into(),
            name: name.into(),
            subtitle: String::new(),
            icon: String::new(),
            shape,
            accent: Accent::Blue,
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

/// A boundary box. Field order/defaults match `model.Region` (`_REGION_FIELDS`).
#[derive(Debug, Clone)]
pub struct Region {
    pub id: String,
    pub label: String,
    pub bounds: (i32, i32, i32, i32),
    pub contains: Vec<String>,
    pub padding: Point,
    pub padding_bottom: Option<i32>,
    pub style: RegionStyle,
    pub icon: Option<String>,
    pub layout: Option<AutoLayout>,
    pub pos: Option<Point>,
    pub gap: i32,
    pub align: RegionAlign,
    pub visible: bool,
    pub border_dash: Option<Point>,
    pub border_stroke: Option<String>,
    pub label_anchor: RegionLabelAnchor,
    pub label_position: Option<LabelPosition>,
}

impl Region {
    /// A flowchart subgraph → cluster region with model defaults.
    pub fn cluster(id: impl Into<String>, label: impl Into<String>, contains: Vec<String>) -> Self {
        Region {
            id: id.into(),
            label: label.into(),
            bounds: (0, 0, 0, 0),
            contains,
            padding: (24, 24),
            padding_bottom: None,
            style: RegionStyle::Cluster,
            icon: None,
            layout: None,
            pos: None,
            gap: 24,
            align: RegionAlign::Center,
            visible: true,
            border_dash: None,
            border_stroke: None,
            label_anchor: RegionLabelAnchor::Middle,
            label_position: None,
        }
    }
}

/// A connection. Field order/defaults match `model.Edge` (`_EDGE_FIELDS`).
#[derive(Debug, Clone)]
pub struct Edge {
    pub src: String,
    pub dst: String,
    pub label: String,
    pub style: EdgeStyle,
    pub src_anchor: Option<Anchor>,
    pub dst_anchor: Option<Anchor>,
    pub route: Route,
    pub via: Vec<Point>,
    pub src_offset: Point,
    pub dst_offset: Point,
    pub label_offset: Point,
    pub label_anchor: EdgeLabelAnchor,
    pub label_small: bool,
    pub label_pos: Option<Point>,
    pub dashed: bool,
    pub no_arrow: bool,
    pub trunk_offset: i32,
    pub shared_port: bool,
    pub points: Option<Vec<Point>>,
    pub bpmn_flow: Option<String>,
}

impl Edge {
    /// An edge carrying explicit routed `points` with model defaults.
    pub fn routed(
        src: impl Into<String>,
        dst: impl Into<String>,
        label: impl Into<String>,
    ) -> Self {
        Edge {
            src: src.into(),
            dst: dst.into(),
            label: label.into(),
            style: EdgeStyle::Gray,
            src_anchor: None,
            dst_anchor: None,
            route: Route::Auto,
            via: Vec::new(),
            src_offset: (0, 0),
            dst_offset: (0, 0),
            label_offset: (0, 0),
            label_anchor: EdgeLabelAnchor::Mid,
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

/// A resolved diagram (positions baked in). Mirrors `model.Diagram`; the
/// transient `bpmn_blocks` field is never serialized so it is omitted here.
#[derive(Debug, Clone, Default)]
pub struct Diagram {
    pub width: i32,
    pub height: i32,
    pub title: String,
    pub subtitle: String,
    pub components: Vec<Component>,
    pub regions: Vec<Region>,
    pub edges: Vec<Edge>,
    /// `("id", cid)` leaves / `("group", dir, children)` groups — empty for
    /// flowchart import (only the Figma back-end consumes layout trees).
    pub layout_trees: Vec<LayoutNode>,
}

/// A DSL `layout { … }` tree node. Unused by the flowchart importer but part of
/// the serialized model (`layout_trees`).
#[derive(Debug, Clone)]
pub enum LayoutNode {
    Id(String),
    Group {
        dir: String,
        children: Vec<LayoutNode>,
    },
}

#[cfg(test)]
mod tests {
    use super::py_round;

    #[test]
    fn py_round_ties_to_even() {
        assert_eq!(py_round(0.5), 0);
        assert_eq!(py_round(1.5), 2);
        assert_eq!(py_round(2.5), 2);
        assert_eq!(py_round(3.5), 4);
        assert_eq!(py_round(-0.5), 0);
        assert_eq!(py_round(-1.5), -2);
        assert_eq!(py_round(-2.5), -2);
        assert_eq!(py_round(2.4), 2);
        assert_eq!(py_round(2.6), 3);
        assert_eq!(py_round(-2.6), -3);
    }
}
