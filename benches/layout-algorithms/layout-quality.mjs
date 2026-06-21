// layout-quality.mjs — score a flowchart corpus on the ABSOLUTE layout-quality
// metric (metric.mjs) for kymo and mermaid.js, and emit a head-to-head leaderboard.
//
// This is the reward signal the layout-hillclimb loop climbs: kymo's mean composite
// must rise above the competitor's to claim best-in-market. Higher = better.
//
// Run (from benches/layout, after `npm ci` + a kymo-mermaid wasm build):
//   node layout-quality.mjs --all          # whole flowchart corpus
//   node layout-quality.mjs flowchart_023  # one or more fixtures (calibration)
//   node layout-quality.mjs --n 12         # first N fixtures (quick pass)

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";
import { extractGeometry } from "./geometry.mjs";
import { scoreLayout, WEIGHTS } from "./metric.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
// Dataset: the bench's own datasets/<name> by default; override with
// LAYOUT_DATASET=<name|abs-path> (e.g. ../mermaid-format/datasets/mermaid-cypress/flowchart).
const DATASET = process.env.LAYOUT_DATASET || "layout-suite";
const FIXDIR = (DATASET.startsWith("/") ? DATASET : resolve(HERE, "datasets", DATASET)) + "/";
const DATASET_NAME = basename(DATASET.replace(/\/$/, ""));
const TMP = "/tmp/layout-quality/";
mkdirSync(TMP, { recursive: true });

// date-stamped asset dir (committed), suffixed by dataset so runs don't clobber each other.
const DATE = process.env.LAYOUT_BENCH_DATE || new Date().toISOString().slice(0, 10);
const ASSETS = resolve(HERE, "research/assets", `${DATE}-layout-quality-${DATASET_NAME}`);
mkdirSync(ASSETS, { recursive: true });
mkdirSync(resolve(HERE, "results"), { recursive: true });

const argv = process.argv.slice(2);
const nFlag = argv.indexOf("--n");
const positional = argv.filter((a) => !a.startsWith("--") && a !== argv[nFlag + 1]);
const allFiles = readdirSync(FIXDIR).filter((f) => f.endsWith(".mmd")).map((f) => f.replace(/\.mmd$/, "")).sort();
const FILES = nFlag >= 0 ? allFiles.slice(0, +argv[nFlag + 1] || 12)
  : positional.length ? positional
  : allFiles; // default: the whole dataset

// kymo renderer (wasm; the flowchart path routes through packages/rust/kymo-layout)
const m = await import(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid.js");
m.initSync({ module: readFileSync(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid_bg.wasm") });
const kymoRender = m.mermaidToSvgDagre || m.mermaidToSvgAuto; // Auto routes flowcharts through dagre/kymo-layout
if (!kymoRender) throw new Error("kymo-mermaid wasm exports no mermaidToSvg* — rebuild with --features wasm,math");

// mermaid.js reference via mmdc
writeFileSync(TMP + "conf.json", JSON.stringify({ securityLevel: "loose", flowchart: { useMaxWidth: false } }));
writeFileSync(TMP + "pptr.json", JSON.stringify({ args: ["--no-sandbox", "--disable-gpu"] }));
function mermaidSvg(file) {
  const out = TMP + "mm_" + file + ".svg";
  execFileSync("npx", ["mmdc", "-i", FIXDIR + file + ".mmd", "-o", out, "-c", TMP + "conf.json", "-p", TMP + "pptr.json"],
    { cwd: HERE, stdio: ["ignore", "ignore", "pipe"] });
  return readFileSync(out, "utf8");
}

const ENGINES = ["kymo", "mermaidjs"];
const rows = [];
console.log(`\nlayout-quality · ${FILES.length} fixtures · higher composite = better\n`);
console.log("file               kymo    mermaid  Δ(k−m)   cross n_ovl e_ovl ortho");
console.log("-".repeat(78));

for (const f of FILES) {
  const src = readFileSync(FIXDIR + f + ".mmd", "utf8");
  const out = { file: f };
  // kymo
  try { out.kymo = scoreLayout(extractGeometry(kymoRender(src), "kymo")); }
  catch (e) { out.kymo = { error: String(e?.message || e).slice(0, 60) }; }
  // mermaid.js
  try { out.mermaidjs = scoreLayout(extractGeometry(mermaidSvg(f), "mermaid")); }
  catch (e) { out.mermaidjs = { error: String(e?.message || e).slice(0, 60) }; }
  rows.push(out);

  const k = out.kymo.composite, mm = out.mermaidjs.composite;
  const t = out.kymo.terms || {};
  const d = (k != null && mm != null) ? (k - mm).toFixed(1) : "–";
  const tt = (x) => (x?.score ?? "–").toString().padStart(5);
  console.log(
    `${f.padEnd(18)} ${(k ?? "ERR").toString().padStart(6)} ${(mm ?? "ERR").toString().padStart(8)} ${d.padStart(7)}   ` +
    `${tt(t.crossings)} ${tt(t.node_overlap)} ${tt(t.edge_node_overlap)} ${tt(t.orthogonality)}`
  );
}

// ── leaderboard (mean composite per engine over fixtures both engines scored) ──
const mean = (xs) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : null;
const scored = rows.filter((r) => Number.isFinite(r.kymo?.composite) && Number.isFinite(r.mermaidjs?.composite));
const leaderboard = {
  date: DATE, dataset: DATASET_NAME, fixtures: scored.length, weights: WEIGHTS,
  mean: { kymo: mean(scored.map((r) => r.kymo.composite)), mermaidjs: mean(scored.map((r) => r.mermaidjs.composite)) },
  // d2: TODO — needs d2 renders of equivalent diagrams (the metric already scores any SVG).
};
leaderboard.kymo_leads = leaderboard.mean.kymo != null && leaderboard.mean.kymo >= leaderboard.mean.mermaidjs;

writeFileSync(resolve(ASSETS, "scores.json"), JSON.stringify(rows, null, 2));
writeFileSync(resolve(ASSETS, "leaderboard.json"), JSON.stringify(leaderboard, null, 2));

// ── REPORT.md (headline artifact) ─────────────────────────────────────────────
const worst = scored.slice().sort((a, b) => (a.kymo.composite - b.kymo.composite) - 0).slice(0, 10);
const report = [
  `# Layout-quality leaderboard — ${DATE} · dataset \`${DATASET_NAME}\``, "",
  `Absolute composite score (0–100, higher = better) over **${scored.length}** fixtures.`,
  `Metric: \`metric.mjs\` (BPD-DGM-001 §6/§7.6). The layout-hillclimb loop drives kymo's mean upward.`, "",
  `| Engine | Mean composite |`, `|---|---|`,
  `| **kymo** | **${leaderboard.mean.kymo}** |`, `| mermaid.js | ${leaderboard.mean.mermaidjs} |`, "",
  `**kymo leads: ${leaderboard.kymo_leads ? "✅ yes" : "❌ not yet"}** (Δ ${(leaderboard.mean.kymo - leaderboard.mean.mermaidjs).toFixed(2)})`, "",
  `## kymo's 10 worst fixtures (hill-climb targets)`, "",
  `| fixture | kymo | mermaid | crossings | node_overlap | orthogonality |`, `|---|---|---|---|---|---|`,
  ...worst.map((r) => `| ${r.file} | ${r.kymo.composite} | ${r.mermaidjs.composite} | ${r.kymo.terms.crossings.raw} | ${r.kymo.terms.node_overlap.raw} | ${r.kymo.terms.orthogonality.raw} |`),
].join("\n");
const reportPath = resolve(HERE, "results", `REPORT-${DATASET_NAME}.md`);
writeFileSync(reportPath, report + "\n");

console.log(`\ndataset '${DATASET_NAME}': kymo ${leaderboard.mean.kymo} vs mermaid.js ${leaderboard.mean.mermaidjs}  →  kymo leads: ${leaderboard.kymo_leads ? "YES" : "not yet"}`);
console.log(`wrote ${resolve(ASSETS, "scores.json")}`);
console.log(`wrote ${resolve(ASSETS, "leaderboard.json")}`);
console.log(`wrote ${reportPath}`);
