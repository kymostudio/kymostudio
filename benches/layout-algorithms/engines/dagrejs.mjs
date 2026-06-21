// dagre.js — the upstream dagre engine (@dagrejs/dagre). Lets us lab kymo-dagre
// against the reference JS implementation of the same algorithm family.
import pkg from "@dagrejs/dagre";
const { graphlib, layout: run } = pkg;

const NODE_W = 100, NODE_H = 44; // uniform size for a fair cross-engine comparison

export const name = "dagre.js";
export async function layout(graph) {
  const g = new graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: graph.direction || "TB" });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of graph.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  graph.edges.forEach((e, i) => g.setEdge(e.source, e.target, {}, "e" + i));
  run(g);
  const nodes = g.nodes().map((id) => {
    const n = g.node(id);
    return { id, x: n.x - n.width / 2, y: n.y - n.height / 2, width: n.width, height: n.height };
  });
  const edges = g.edges().map((ed) => ({ points: (g.edge(ed).points || []).map((p) => [p.x, p.y]) }));
  const gg = g.graph();
  return { width: gg.width, height: gg.height, nodes, edges };
}
