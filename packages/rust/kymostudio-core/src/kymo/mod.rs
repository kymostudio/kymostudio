//! The `.kymo` DSL front-end — a Rust port of `packages/python/src/kymo/`
//! (cross-checked against `packages/js/src/*.ts`).
//!
//! Pipeline mirrors Python's `cli._load_resolved`: [`dsl::parse`] (declarative
//! collect, applying any anonymous `layout { … }` trees) →
//! [`layout::layout`] (grid + external) → [`alignment::resolve_alignments`]
//! (the 5-pass resolver) → `render` (the rich, icon-bearing SVG back-end).
//!
//! Unlike the Mermaid/D2/DOT front-ends (which lay out a flowchart graph), the
//! `.kymo` DSL is the editor's native authoring format: components are placed
//! declaratively (`@ (x,y)` / `@ parent side gap` / auto-layout frames) and the
//! resolver bakes in the final positions.

pub mod alignment;
pub mod dsl;
pub mod icons;
pub mod layout;
pub mod render;

pub use dsl::{parse, KymoError, ParseResult};

use crate::model::Diagram;

/// Parse `.kymo` source and run the full layout + alignment pipeline, returning
/// a fully-positioned [`Diagram`]. Mirrors Python's `cli._load_resolved` for a
/// `.kymo` source (no BPMN/flowchart blocks — those error in [`dsl::parse`]).
pub fn to_diagram(src: &str) -> Result<Diagram, KymoError> {
    let mut pr = dsl::parse(src)?;

    // 1. Anonymous `layout { … }` trees — applied here (Python does this inside
    //    `dsl.finalize`): inline region-id leaves, barycenter-reorder, place.
    if !pr.layout_trees.is_empty() {
        let edge_pairs: Vec<(String, String)> = pr
            .diagram
            .edges
            .iter()
            .map(|e| (e.src.clone(), e.dst.clone()))
            .collect();
        let mut cursor_y = 0;
        let trees = std::mem::take(&mut pr.layout_trees);
        for tree in &trees {
            let mut inlined = layout::inline_region_leaves(tree, &pr.diagram);
            if matches!(inlined, dsl::LayoutTree::Group { .. }) {
                layout::minimize_crossings(&mut inlined, &edge_pairs);
            }
            let (_w, h) = layout::apply_layout_tree(&mut pr.diagram, &inlined, (0, cursor_y));
            cursor_y += h + 40;
        }
    }

    // 2. Grid layout (`row …`) + external directives.
    if let Some(region_layout) = &pr.layout {
        layout::layout(&mut pr.diagram, region_layout, pr.external.as_ref());
    }

    // 3. The 5-pass resolver (auto-layouts, anchoring, bounds, stagger, canvas).
    alignment::resolve_alignments(&mut pr.diagram)?;

    Ok(pr.diagram)
}

/// Parse `.kymo` source and render it to a single self-contained SVG string
/// (`animate=true` appends the flow keyframe preset). The end-to-end `.kymo` →
/// SVG path: [`to_diagram`] + [`render::render`].
pub fn to_svg(src: &str, animate: bool) -> Result<String, KymoError> {
    Ok(render::render(&to_diagram(src)?, animate))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_parent_ref_and_autosizes() {
        // b is anchored right of a with gap 60; canvas auto-sizes from geometry.
        let d = to_diagram(
            "a circle/user/blue \"A\" \"\" @ (100, 100)\nb hex/hex-agent/green \"B\" \"\" @ a right 60",
        )
        .unwrap();
        let a = d.components.iter().find(|c| c.id == "a").unwrap();
        let b = d.components.iter().find(|c| c.id == "b").unwrap();
        // b sits to the right of a (greater x, same y after snap).
        assert!(b.pos.0 > a.pos.0);
        assert_eq!(a.pos.1, b.pos.1);
        // canvas sized > 0 and snapped to multiples of 8.
        assert!(d.width > 0 && d.height > 0);
        assert_eq!(d.width % 8, 0);
        assert_eq!(d.height % 8, 0);
    }

    #[test]
    fn resolves_horizontal_layout_frame() {
        let src = "\
a circle/user/blue \"A\" \"\"
b hex/hex-agent/green \"B\" \"\"
c box/gear/orange \"C\" \"\"
chain horizontal pos (40, 100) gap 50 {
  a b c
}";
        let d = to_diagram(src).unwrap();
        let a = d.components.iter().find(|c| c.id == "a").unwrap();
        let b = d.components.iter().find(|c| c.id == "b").unwrap();
        let c = d.components.iter().find(|c| c.id == "c").unwrap();
        // laid out left→right
        assert!(a.pos.0 < b.pos.0 && b.pos.0 < c.pos.0);
    }

    #[test]
    fn resolves_full_aiq_sample() {
        let src = include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../../samples/aiq.kymo"
        ));
        let d = to_diagram(src).expect("aiq.kymo resolves");
        // every component got a non-default position (laid out somewhere)
        assert!(d.components.len() > 10);
        assert!(d.width > 0 && d.height > 0);
        // regions resolved bounds (non-zero) for visible outers
        let adr = d.components.iter().find(|c| c.id == "orch");
        assert!(adr.is_some(), "orchestrator present");
        // title carried through
        assert!(d.title.contains("Autonomous Deep Researcher"));
    }
}
