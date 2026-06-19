//! mermaid's `mindmap` force-directed layout (cose-bilkent), via the vendored
//! [`kymo_manatee`] crate — pure Rust, no merman. Takes node sizes + edges,
//! returns node centres in a positive coordinate space (matching mermaid).

use kymo_manatee::algo::cose_bilkent::{layout_indexed, IndexedEdge, IndexedNode};

/// Lay out a graph of `(width, height)` nodes connected by `(a, b)` index edges
/// with cose-bilkent. Returns node CENTRES, shifted so the min corner sits at
/// ~(15, 15) like mermaid's mindmap. Falls back to a row on layout failure.
pub fn layout(sizes: &[(f64, f64)], edges: &[(usize, usize)]) -> Vec<(f64, f64)> {
    if sizes.is_empty() {
        return Vec::new();
    }
    let nodes: Vec<IndexedNode> = sizes
        .iter()
        .map(|&(w, h)| IndexedNode { width: w.max(1.0), height: h.max(1.0), x: 0.0, y: 0.0 })
        .collect();
    let edges: Vec<IndexedEdge> = edges
        .iter()
        .filter(|(a, b)| a != b)
        .map(|&(a, b)| IndexedEdge { a, b })
        .collect();
    let pts = match layout_indexed(&nodes, &edges, &Default::default()) {
        Ok(p) => p,
        Err(_) => {
            return sizes.iter().enumerate().map(|(i, _)| (i as f64 * 120.0, 0.0)).collect()
        }
    };
    let mut out: Vec<(f64, f64)> = pts.iter().map(|p| (p.x, p.y)).collect();
    // shift to positive bounds: min corner → 15 (mermaid's layout-base transform).
    let (mut minx, mut miny) = (f64::MAX, f64::MAX);
    for (i, &(w, h)) in sizes.iter().enumerate() {
        if i < out.len() {
            minx = minx.min(out[i].0 - w / 2.0);
            miny = miny.min(out[i].1 - h / 2.0);
        }
    }
    let (dx, dy) = (15.0 - minx, 15.0 - miny);
    for o in out.iter_mut() {
        o.0 += dx;
        o.1 += dy;
    }
    out
}
