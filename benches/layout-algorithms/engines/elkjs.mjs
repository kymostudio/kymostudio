// ELK (elkjs) — the Eclipse Layout Kernel's layered engine. The strongest
// open-source orthogonal layered layout; the bar kymo aims to beat.
import ELK from "elkjs/lib/elk.bundled.js";
const elk = new ELK();

const NODE_W = 100, NODE_H = 44;
const DIR = { TB: "DOWN", BT: "UP", LR: "RIGHT", RL: "LEFT" };

export const name = "elk";
export async function layout(graph) {
  const elkGraph = {
    id: "root",
    layoutOptions: { "elk.algorithm": "layered", "elk.direction": DIR[graph.direction || "TB"] },
    children: graph.nodes.map((n) => ({ id: n.id, width: NODE_W, height: NODE_H })),
    edges: graph.edges.map((e, i) => ({ id: "e" + i, sources: [e.source], targets: [e.target] })),
  };
  const r = await elk.layout(elkGraph);
  const nodes = (r.children || []).map((c) => ({ id: c.id, x: c.x, y: c.y, width: c.width, height: c.height }));
  const edges = (r.edges || []).map((ed) => {
    const pts = [];
    for (const s of ed.sections || []) {
      pts.push([s.startPoint.x, s.startPoint.y]);
      for (const b of s.bendPoints || []) pts.push([b.x, b.y]);
      pts.push([s.endPoint.x, s.endPoint.y]);
    }
    return { points: pts };
  });
  return { width: r.width, height: r.height, nodes, edges };
}
