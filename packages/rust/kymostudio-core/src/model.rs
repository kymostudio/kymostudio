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
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub enum $name { $($variant),+ }
        impl $name {
            pub fn as_str(self) -> &'static str {
                match self { $(Self::$variant => $s),+ }
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
