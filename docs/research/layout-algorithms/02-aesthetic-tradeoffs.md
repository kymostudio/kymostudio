# 02 — Conflicting Aesthetics: the criteria pull against each other

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-003                                             |
| Version     | 0.1                                                            |
| Issue Date  | 2026-06-21                                                     |
| Status      | Draft                                                         |
| Category    | Foundational                                                 |
| Related     | [Index](README.md) · prev [01 Hardness](01-computational-hardness.md) · next [03 Edge routing](03-edge-and-connector-routing.md) |

## The problem

Even if each objective were cheap to compute, you still couldn't maximise them all: the recognised
aesthetic criteria **conflict**. Improving one usually worsens another, so a layout engine is forced
to pick a *weighting*, and that weighting *is* its definition of "beautiful".

## The conflicting criteria

| Criterion | Wants | Fights against |
|---|---|---|
| Few edge crossings | spread nodes to untangle | small area, short edges |
| Short total edge length | pull nodes together | crossings, node overlap |
| Small drawing area / compactness | pack tightly | crossings, label clearance |
| Symmetry | mirror substructures | compactness, crossing reduction |
| Angular resolution (angles at a node) | spread incident edges | orthogonality, compactness |
| Orthogonality (H/V segments only) | snap edges to axes | edge length, bend count |
| Uniform node spacing | even gaps | content-driven sizing |

Purchase's empirical studies (1997+) showed crossings hurt readability most, then bends, then
symmetry — but the ranking shifts by task and by reader, so there is no universal weight vector.

## Why it's hard

It is a genuine **multi-objective optimisation** on a Pareto front: there are many
"non-dominated" layouts, none strictly best. Choosing among them is a value judgement, not a
computation. Tools expose this as *layout options* (Graphviz `nodesep`/`ranksep`, ELK's dozens of
spacing/priority options, D2's swappable engines) precisely because no default pleases everyone.

## State of the art

- **Weighted energy functions** (force-directed / stress) bake the trade-off into a single scalar to
  minimise (Kamada–Kawai stress, Fruchterman–Reingold).
- **Configurable pipelines** (ELK) expose the knobs and let the caller choose.
- **Learned weights** — recent work tunes weights to match human preference data; still niche.

## Where kymo stands

This is **literally the `WEIGHTS` block** of `benches/layout-algorithms/metric.mjs`: kymo's composite is a
weighted sum of `crossings`, `node_overlap`, `edge_node_overlap`, `orthogonality`, `compactness`,
`aspect_balance`, `grid_snap`. Choosing those weights is choosing kymo's aesthetic. `BPD-DGM-001`
(§6–§7) is the prose version of the same value judgement (orthogonality rule, 8-px grid, visual
hierarchy). **For the loop:** calibrating the weights so the proxy tracks human judgement is the
single most important step — a mis-weighted proxy means the hill-climb optimises the wrong thing.

## References

- H. Purchase — *Which Aesthetic has the Greatest Effect on Human Understanding?* (1997).
- C. Ware et al. — *Cognitive Measurements of Graph Aesthetics* (2002).
- `BPD-DGM-001` — kymo's own layout-aesthetics decisions.
