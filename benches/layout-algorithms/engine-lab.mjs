// engine-lab.mjs — lab the LAYOUT ENGINES head-to-head.
//
// Feeds neutral graphs (datasets/graphs/*.json) to each layout engine and scores
// the resulting positions with the absolute metric (metric.mjs). No mermaid, no
// SVG, no Chrome — engines return geometry directly, which also sidesteps the SVG
// extractor entirely. This answers "which engine lays out best?", not "which
// renderer draws closest to mermaid".
//
// Run (from benches/layout-algorithms):
//   node engine-lab.mjs                 # all graphs × all engines
//   node engine-lab.mjs diamond hub     # specific graphs
//
// Caveat: kymo engines size nodes from their label; the others use a uniform
// 100×44 box. Labels are short, so the confound is small — noted, not hidden.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { scoreLayout, WEIGHTS } from "./metric.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GRAPHS = resolve(HERE, "datasets/graphs");
const DATE = process.env.LAYOUT_BENCH_DATE || new Date().toISOString().slice(0, 10);
const ASSETS = resolve(HERE, "research/assets", `${DATE}-engine-lab`);
mkdirSync(ASSETS, { recursive: true });
mkdirSync(resolve(HERE, "results"), { recursive: true });

// Engines (each: graph JSON → {width,height,nodes:[{id,x,y,width,height}],edges:[{points}]})
const ENGINES = [];
for (const f of ["kymo-dagre", "dagrejs", "elkjs", "graphviz"]) {
  try { ENGINES.push(await import(`./engines/${f}.mjs`)); }
  catch (e) { console.error(`engine ${f} unavailable: ${String(e?.message || e).slice(0, 80)}`); }
}

// engine geometry → metric input (positions, not SVG)
function toScore(out) {
  const nodes = out.nodes.map((n) => ({ cx: n.x + n.width / 2, cy: n.y + n.height / 2, w: n.width, h: n.height }));
  const polylines = (out.edges || []).map((e) => e.points).filter((p) => p && p.length > 1);
  const straights = [];
  for (const p of polylines) for (let i = 0; i + 1 < p.length; i++) straights.push([p[i], p[i + 1]]);
  let { width: W, height: H } = out;
  if (!(W > 0) || !(H > 0)) { // fallback: bbox of nodes
    const xs = nodes.flatMap((n) => [n.cx - n.w / 2, n.cx + n.w / 2]);
    const ys = nodes.flatMap((n) => [n.cy - n.h / 2, n.cy + n.h / 2]);
    W = Math.max(...xs) - Math.min(...xs); H = Math.max(...ys) - Math.min(...ys);
  }
  return { nodes, polylines, straights, dims: { W: W || 1, H: H || 1 } };
}

const argv = process.argv.slice(2);
const files = readdirSync(GRAPHS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
const FILES = argv.length ? argv : files;

const eNames = ENGINES.map((e) => e.name);
console.log(`\nengine-lab · ${FILES.length} graphs × ${ENGINES.length} engines · higher composite = better\n`);
console.log("graph".padEnd(12) + eNames.map((n) => n.padStart(11)).join(""));
console.log("-".repeat(12 + 11 * eNames.length));

const rows = [];
for (const name of FILES) {
  const graph = JSON.parse(readFileSync(resolve(GRAPHS, name + ".json"), "utf8"));
  const row = { graph: name, engines: {} };
  const cells = [];
  for (const eng of ENGINES) {
    try {
      const out = await eng.layout(graph);
      const s = scoreLayout(toScore(out));
      row.engines[eng.name] = s;
      cells.push((s.composite ?? "—").toString().padStart(11));
    } catch (e) {
      row.engines[eng.name] = { error: String(e?.message || e).slice(0, 60) };
      cells.push("ERR".padStart(11));
    }
  }
  rows.push(row);
  console.log(name.padEnd(12) + cells.join(""));
}

// leaderboard: mean composite per engine over graphs it scored
const mean = (xs) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : null;
const board = {};
for (const eng of ENGINES) {
  const vals = rows.map((r) => r.engines[eng.name]?.composite).filter(Number.isFinite);
  board[eng.name] = { mean: mean(vals), graphs: vals.length };
}
const ranked = Object.entries(board).filter(([, v]) => v.mean != null).sort((a, b) => b[1].mean - a[1].mean);

console.log("\nleaderboard (mean composite, higher = better):");
ranked.forEach(([n, v], i) => console.log(`  ${i + 1}. ${n.padEnd(12)} ${v.mean}  (${v.graphs} graphs)`));

writeFileSync(resolve(ASSETS, "scores.json"), JSON.stringify(rows, null, 2));
writeFileSync(resolve(ASSETS, "leaderboard.json"), JSON.stringify({ date: DATE, weights: WEIGHTS, board, ranking: ranked.map(([n]) => n) }, null, 2));
const report = [
  `# Layout-engine lab — ${DATE}`, "",
  `Absolute layout-quality composite (0–100, higher = better) over **${FILES.length}** neutral graphs,`,
  `one column per engine. Engines lay out the *same* graphs; positions scored by \`metric.mjs\`.`, "",
  `| rank | engine | mean composite |`, `|---|---|---|`,
  ...ranked.map(([n, v], i) => `| ${i + 1} | ${n} | ${v.mean} |`), "",
  `## Per-graph`, "",
  `| graph | ${eNames.join(" | ")} |`, `|---|${eNames.map(() => "---").join("|")}|`,
  ...rows.map((r) => `| ${r.graph} | ${eNames.map((n) => r.engines[n]?.composite ?? "ERR").join(" | ")} |`),
].join("\n");
writeFileSync(resolve(HERE, "results", "REPORT-engine-lab.md"), report + "\n");
console.log(`\nwrote ${resolve(ASSETS, "leaderboard.json")} + results/REPORT-engine-lab.md`);
