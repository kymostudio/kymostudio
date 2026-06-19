# Vendored from merman / manatee

`kymo-manatee` is a vendored copy of the **manatee** crate from
[merman](https://github.com/Latias94/merman) (rev 89641493), licensed
**MIT OR Apache-2.0**. It implements the COSE / cose-bilkent compound-graph
layout (the same algorithm Cytoscape + mermaid use for mindmaps).

Vendored so kymo's mindmap layout is pure-Rust with no merman git dependency.
Only the package/lib name changed (manatee → kymo-manatee / kymo_manatee);
the algorithm source is unmodified.
