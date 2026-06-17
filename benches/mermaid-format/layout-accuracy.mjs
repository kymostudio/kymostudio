// layout-accuracy.mjs — COORDINATE accuracy of kymo's layout vs mermaid.js.
//
// Not pixels: extracts the laid-out geometry (node centers, node sizes, edge
// polylines) from each engine's SVG and compares the NUMBERS, per stage:
//   • topology   — node/edge counts match (parse prerequisite)
//   • position   — node centers, after frame alignment (dagre/dugong fidelity)
//   • size       — node w,h (text-measurement fidelity: getBBox vs fontdb)
//   • edges      — routing polylines (symmetric mean/max nearest-point distance)
//
// kymo SVG carries no node ids, so nodes are paired by nearest-neighbour AFTER a
// centroid translation that removes the global frame offset (NOT a fidelity error).
// Reports px and % of diagram diagonal. mermaid ref = mmdc (output-mode irrelevant
// to geometry; math nodes' size still reflects the measurement path).
//
// Run:  node layout-accuracy.mjs [file1 file2 ...]   (from benches/mermaid-format)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const FIXDIR = HERE + "/datasets/mermaid-cypress/flowchart/";
const TMP = "/tmp/layout-acc/";
mkdirSync(TMP, { recursive: true });
const FILES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["flowchart_023", "flowchart_029", "flowchart_025", "flowchart_027", "flowchart-v2_079", "flowchart-v2_072", "flowchart-v2_080"];

const m = await import(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid.js");
m.initSync({ module: readFileSync(ROOT + "/packages/rust/kymo-mermaid/pkg/kymo_mermaid_bg.wasm") });

writeFileSync(TMP + "conf.json", JSON.stringify({ securityLevel: "loose", flowchart: { useMaxWidth: false } }));
writeFileSync(TMP + "pptr.json", JSON.stringify({ args: ["--no-sandbox", "--disable-gpu"] }));
function mermaidSvg(file) {
  const out = TMP + "mm_" + file + ".svg";
  execFileSync("npx", ["mmdc", "-i", FIXDIR + file + ".mmd", "-o", out, "-c", TMP + "conf.json", "-p", TMP + "pptr.json"],
    { cwd: HERE, stdio: ["ignore", "ignore", "pipe"] });
  return readFileSync(out, "utf8");
}

// ── geometry extraction ──────────────────────────────────────────────────────
const num = (s) => parseFloat(s);

// mermaid: node center = <g class="node" transform="translate(x,y)">; size from the
// first shape in that group's slice. id parsed from `flowchart-<ID>-<n>`.
function mermaidNodes(svg) {
  const nodesSec = svg.slice(svg.indexOf('class="nodes"'));
  const starts = [...nodesSec.matchAll(/<g class="[^"]*\bnode\b[^"]*"[^>]*id="([^"]*)"[^>]*transform="translate\(([-\d.]+),\s*([-\d.]+)\)"/g)];
  const nodes = [];
  for (let i = 0; i < starts.length; i++) {
    const mm = starts[i];
    const idRaw = mm[1];
    const idm = idRaw.match(/flowchart-(.+)-\d+$/);
    const id = idm ? idm[1] : idRaw;
    const cx = num(mm[2]), cy = num(mm[3]);
    const chunk = nodesSec.slice(mm.index, i + 1 < starts.length ? starts[i + 1].index : undefined);
    nodes.push({ id, cx, cy, ...shapeSize(chunk) });
  }
  return nodes;
}
// kymo: each fc-shape element is a node, absolute coords, source order.
function kymoNodes(svg) {
  const nodes = [];
  for (const mm of svg.matchAll(/<(ellipse|rect|polygon|path)\b[^>]*class="fc-shape[^"]*"[^>]*>/g)) {
    const el = mm[0];
    const g = elemBox(mm[1], el);
    if (g) nodes.push({ id: null, cx: g.cx, cy: g.cy, w: g.w, h: g.h });
  }
  return nodes;
}
// size of the first shape inside an SVG chunk (for mermaid node groups)
function shapeSize(chunk) {
  for (const tag of ["circle", "ellipse", "rect", "polygon", "path"]) {
    const e = chunk.match(new RegExp(`<${tag}\\b[^>]*>`));
    if (e) { const b = elemBox(tag, e[0]); if (b) return { w: b.w, h: b.h }; }
  }
  return { w: NaN, h: NaN };
}
function elemBox(tag, el) {
  const a = (n) => { const x = el.match(new RegExp(`\\b${n}="([-\\d.]+)`)); return x ? num(x[1]) : NaN; };
  if (tag === "circle") { const r = a("r"); return { cx: a("cx"), cy: a("cy"), w: 2 * r, h: 2 * r }; }
  if (tag === "ellipse") { const rx = a("rx"), ry = a("ry"); return { cx: a("cx"), cy: a("cy"), w: 2 * rx, h: 2 * ry }; }
  if (tag === "rect") { const x = a("x"), y = a("y"), w = a("width"), h = a("height"); return { cx: x + w / 2, cy: y + h / 2, w, h }; }
  // polygon / path: bbox from all coordinate numbers
  const src = tag === "polygon" ? (el.match(/points="([^"]*)"/)?.[1] || "") : (el.match(/\bd="([^"]*)"/)?.[1] || "");
  const ns = [...src.matchAll(/-?\d+\.?\d*/g)].map(Number);
  if (ns.length < 2) return null;
  const xs = ns.filter((_, i) => i % 2 === 0), ys = ns.filter((_, i) => i % 2 === 1);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

// edges: flatten each edge <path d> into a polyline (sample beziers)
function edges(svg, kymo) {
  const out = [];
  for (const mm of svg.matchAll(/<path\b[^>]*>/g)) { // order-independent (mermaid puts d before class)
    const tag = mm[0], cls = tag.match(/class="([^"]*)"/)?.[1] || "";
    const ok = kymo ? cls.includes("edge-path") : (/\bedge\b/.test(cls) || /\blink\b/.test(cls) || cls.includes("flowchart-link"));
    if (!ok) continue;
    const d = tag.match(/\bd="([^"]*)"/)?.[1];
    if (d && /^\s*M/.test(d)) out.push(flatten(d));
  }
  return out.filter((p) => p.length > 1);
}
function flatten(d) {
  const toks = d.match(/[MLCZ]|-?\d+\.?\d*/gi) || [];
  const pts = []; let i = 0, cx = 0, cy = 0;
  const P = (x, y) => { cx = x; cy = y; pts.push([x, y]); };
  while (i < toks.length) {
    const c = toks[i++];
    if (c === "M" || c === "L") { P(+toks[i++], +toks[i++]); }
    else if (c === "C") {
      const x1 = +toks[i++], y1 = +toks[i++], x2 = +toks[i++], y2 = +toks[i++], x = +toks[i++], y = +toks[i++];
      const sx = cx, sy = cy;
      for (let t = 1; t <= 8; t++) { const u = t / 8, v = 1 - u;
        P(v*v*v*sx + 3*v*v*u*x1 + 3*v*u*u*x2 + u*u*u*x, v*v*v*sy + 3*v*v*u*y1 + 3*v*u*u*y2 + u*u*u*y); }
    } else if (/^[-\d.]/.test(c)) { P(+c, +toks[i++]); }
  }
  return pts;
}

// ── compare ──────────────────────────────────────────────────────────────────
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const centroid = (ps) => ps.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map((v) => v / ps.length);
function greedyMatch(A, B) { // pair A[i]→B[j] by nearest, bijective
  const used = new Set(), pairs = [];
  for (const a of A) {
    let best = -1, bd = Infinity;
    B.forEach((b, j) => { if (!used.has(j)) { const d = dist([a.cx, a.cy], [b.cx, b.cy]); if (d < bd) { bd = d; best = j; } } });
    if (best >= 0) { used.add(best); pairs.push([a, B[best], bd]); }
  }
  return pairs;
}
function sampleDist(p, q) { // symmetric mean & max nearest-point between polylines
  const near = (pt, poly) => Math.min(...poly.map((x) => dist(pt, x)));
  const ds = [...p.map((x) => near(x, q)), ...q.map((x) => near(x, p))];
  return { mean: ds.reduce((a, b) => a + b, 0) / ds.length, max: Math.max(...ds) };
}
const stats = (xs) => xs.length ? {
  mean: xs.reduce((a, b) => a + b, 0) / xs.length,
  median: xs.slice().sort((a, b) => a - b)[xs.length >> 1],
  max: Math.max(...xs),
} : { mean: NaN, median: NaN, max: NaN };

console.log("\nfile               topo   pos(px) med/p90/max   size Δw/Δh med   edge px mean/max   (norm % of diag)");
console.log("-".repeat(104));
const all = [];
for (const f of FILES) {
  let mm, ky;
  try { mm = mermaidSvg(f); ky = m.mermaidToSvgDagre(readFileSync(FIXDIR + f + ".mmd", "utf8")); }
  catch (e) { console.log(`${f.padEnd(18)} ERR ${String(e.message || e).slice(0, 50)}`); continue; }
  const mN = mermaidNodes(mm), kN = kymoNodes(ky);
  const mE = edges(mm, false), kE = edges(ky, true);
  const topo = `${kN.length}/${mN.length}n ${kE.length}/${mE.length}e` + (kN.length === mN.length && kE.length === mE.length ? " ✓" : " ✗");

  // frame align (translation removes global offset)
  const cm = centroid(mN.map((n) => [n.cx, n.cy])), ck = centroid(kN.map((n) => [n.cx, n.cy]));
  const t = [cm[0] - ck[0], cm[1] - ck[1]];
  const kNa = kN.map((n) => ({ ...n, cx: n.cx + t[0], cy: n.cy + t[1] }));
  const diag = (() => { const vb = mm.match(/viewBox="[\d.\- ]*?\s([\d.]+)\s([\d.]+)"/); return vb ? Math.hypot(+vb[1], +vb[2]) : 1; })();

  const pairs = greedyMatch(kNa, mN);
  const posErr = pairs.map((p) => p[2]);
  const dW = pairs.map((p) => Math.abs(p[0].w - p[1].w)).filter((x) => !isNaN(x));
  const dH = pairs.map((p) => Math.abs(p[0].h - p[1].h)).filter((x) => !isNaN(x));

  // edges: align kymo edges by t, match by sampled centroid NN
  const kEa = kE.map((p) => p.map((q) => [q[0] + t[0], q[1] + t[1]]));
  const eUsed = new Set(), edgeErr = [];
  for (const ke of kEa) {
    let best = -1, bd = Infinity;
    mE.forEach((me, j) => { if (!eUsed.has(j)) { const d = dist(centroid(ke), centroid(me)); if (d < bd) { bd = d; best = j; } } });
    if (best >= 0) { eUsed.add(best); edgeErr.push(sampleDist(ke, mE[best])); }
  }
  const eMean = stats(edgeErr.map((e) => e.mean)), eMax = stats(edgeErr.map((e) => e.max));
  const ps = stats(posErr), p90 = posErr.slice().sort((a, b) => a - b)[Math.floor(posErr.length * 0.9)] ?? ps.max;
  const f2 = (x) => isNaN(x) ? "–" : x.toFixed(1);
  const pc = (x) => isNaN(x) ? "" : (100 * x / diag).toFixed(1) + "%";
  console.log(
    `${f.padEnd(18)} ${topo.padEnd(11)} ${f2(ps.median)}/${f2(p90)}/${f2(ps.max)}`.padEnd(52) +
    `  ${f2(stats(dW).median)}/${f2(stats(dH).median)}`.padEnd(16) +
    `  ${f2(eMean.mean)}/${f2(eMax.max)}   (pos ${pc(ps.median)}, edge ${pc(eMean.mean)})`
  );
  all.push({ f, pos: ps, p90, dW: stats(dW), dH: stats(dH), edgeMean: eMean, edgeMax: eMax, diag, topoOk: topo.includes("✓") });
}
writeFileSync(TMP + "layout-accuracy.json", JSON.stringify(all, null, 2));
console.log("\nnodes paired by nearest-neighbour after centroid-translation align (kymo has no ids).");
console.log("pos = node-center error (dagre/dugong fidelity) · size = w/h error (text-measure fidelity) · edge = routing polyline distance.");
console.log("wrote", TMP + "layout-accuracy.json");
