// Graphviz (dot) — the classic layered engine (DOT). Emit DOT → `dot -Tplain`
// → parse positions. Coordinates are in inches, y-up; we scale ×72 and flip y.
import { execFileSync } from "node:child_process";

const W_IN = 100 / 72, H_IN = 44 / 72; // uniform node size, inches

export const name = "graphviz";
export async function layout(graph) {
  const dot = [
    "digraph G {",
    `  rankdir=${graph.direction || "TB"};`,
    `  node [shape=box, fixedsize=true, width=${W_IN.toFixed(3)}, height=${H_IN.toFixed(3)}];`,
    ...graph.nodes.map((n) => `  "${n.id}";`),
    ...graph.edges.map((e) => `  "${e.source}" -> "${e.target}";`),
    "}",
  ].join("\n");

  const out = execFileSync("dot", ["-Tplain"], { input: dot, encoding: "utf8" });
  let H = 0, W = 0;
  const nodes = [], edges = [];
  for (const line of out.trim().split("\n")) {
    const t = line.match(/"[^"]*"|\S+/g) || [];
    const unq = (s) => s.replace(/^"|"$/g, "");
    if (t[0] === "graph") { W = +t[2] * 72; H = +t[3] * 72; }
    else if (t[0] === "node") {
      const x = +t[2] * 72, y = +t[3] * 72, w = +t[4] * 72, h = +t[5] * 72, fy = H - y;
      nodes.push({ id: unq(t[1]), x: x - w / 2, y: fy - h / 2, width: w, height: h });
    } else if (t[0] === "edge") {
      const n = +t[3], pts = [];
      for (let i = 0; i < n; i++) pts.push([+t[4 + i * 2] * 72, H - +t[5 + i * 2] * 72]);
      edges.push({ points: pts });
    }
  }
  return { width: W, height: H, nodes, edges };
}
