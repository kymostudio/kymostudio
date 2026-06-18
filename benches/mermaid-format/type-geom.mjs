// type-geom.mjs — the 4 COORDINATE metrics (topology/position/size/edge) per
// Mermaid type, kymo vs mermaid.js (mmdc), to complement type-bench.mjs's pixel-Δ.
//
// Non-flowchart renderers carry no shared node ids, so nodes pair by
// nearest-neighbour after a centroid translation (like mmdr in engine-bench).
// Node shapes are extracted generically (rect/circle/ellipse/polygon/closed
// path, minus the background + tiny markers); edges are <line> + open <path>.
// The counts are therefore approximate — different renderers decompose a node
// into different numbers of primitives — but they give a real, reported number
// for every metric instead of N/A.
//
// Run:  node type-geom.mjs [type ...] [--limit N]   (from benches/mermaid-format)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const DSDIR = HERE + "/datasets/mermaid-cypress/";
const TMP = "/tmp/type-geom/";
mkdirSync(TMP, { recursive: true });
const KYMO_BIN = ROOT + "/packages/rust/kymo-mermaid/target/release/examples/render_native";
const ALL = ["sequence", "class", "state", "er", "block", "mindmap", "kanban", "requirement"];
const argv = process.argv.slice(2);
const li = argv.indexOf("--limit");
const LIMIT = li >= 0 ? +argv[li + 1] : Infinity;
const TYPES = argv.filter((a) => ALL.includes(a)).length ? argv.filter((a) => ALL.includes(a)) : ALL;

writeFileSync(TMP + "conf.json", JSON.stringify({ securityLevel: "loose", forceLegacyMathML: true, flowchart: { useMaxWidth: false } }));
writeFileSync(TMP + "pptr.json", JSON.stringify({ args: ["--no-sandbox", "--disable-gpu"] }));

const kymoSvg = (mmd) => execFileSync(KYMO_BIN, [mmd], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 }).toString();
function refSvg(mmd, tag) {
  const out = TMP + "ref_" + tag + ".svg";
  if (!existsSync(out)) execFileSync("npx", ["mmdc", "-i", mmd, "-o", out, "-c", TMP + "conf.json", "-p", TMP + "pptr.json"], { cwd: HERE, stdio: ["ignore", "ignore", "pipe"] });
  return readFileSync(out, "utf8");
}

// ── generic geometry extraction ──────────────────────────────────────────────
const num = (s) => parseFloat(s);
function elemBox(tag, el) {
  const a = (n) => { const x = el.match(new RegExp(`\\b${n}="([-\\d.]+)`)); return x ? num(x[1]) : NaN; };
  if (tag === "circle") { const r = a("r"); return { cx: a("cx"), cy: a("cy"), w: 2 * r, h: 2 * r }; }
  if (tag === "ellipse") return { cx: a("cx"), cy: a("cy"), w: 2 * a("rx"), h: 2 * a("ry") };
  if (tag === "rect") { const x = a("x"), y = a("y"), w = a("width"), h = a("height"); return { cx: x + w / 2, cy: y + h / 2, w, h }; }
  const src = tag === "polygon" ? (el.match(/points="([^"]*)"/)?.[1] || "") : (el.match(/\bd="([^"]*)"/)?.[1] || "");
  const ns = [...src.matchAll(/-?\d+\.?\d*/g)].map(Number); if (ns.length < 4) return null;
  const xs = ns.filter((_, i) => i % 2 === 0), ys = ns.filter((_, i) => i % 2 === 1);
  return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}
function canvas(svg) { const v = svg.match(/viewBox="[\d.\- ]*?\s([\d.]+)\s([\d.]+)"/); return v ? { W: +v[1], H: +v[2] } : { W: 1e9, H: 1e9 }; }
const norm = (s) => s.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/[^a-z0-9]/gi, "").toLowerCase();

// Transform-aware walk: resolve nested <g translate(..)> so every shape, label
// token and edge is in ABSOLUTE coords (mermaid nests node shape and its
// foreignObject label under different translated groups, so a naive scan can't
// pair them). Returns {shapes, toks, edges} all absolute.
function walk(svg) {
  const body = svg.replace(/<defs>[\s\S]*?<\/defs>/g, "");
  const { W, H } = canvas(svg);
  const stack = [];
  let ox = 0, oy = 0;
  const shapes = [], toks = [], eds = [];
  const big = (b) => b.w >= W * 0.92 && b.h >= H * 0.92;
  const tiny = (b) => b.w < 12 && b.h < 12;
  const attrN = (attrs, n) => { const x = attrs.match(new RegExp(`\\b${n}="([-\\d.]+)`)); return x ? +x[1] : NaN; };
  const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(body))) {
    const [, slash, name, attrs, self] = m;
    const close = slash === "/";
    if (name === "g") {
      if (close) { const p = stack.pop() || [0, 0]; ox = p[0]; oy = p[1]; }
      else if (self !== "/") {
        stack.push([ox, oy]);
        const tr = attrs.match(/translate\(\s*([-\d.]+)(?:[ ,]+([-\d.]+))?/);
        if (tr) { ox += +tr[1]; oy += tr[2] !== undefined ? +tr[2] : 0; }
      }
      continue;
    }
    if (close) continue;
    if (name === "rect" || name === "circle" || name === "ellipse" || name === "polygon") {
      const b = elemBox(name, "<" + name + attrs + ">");
      if (b && !isNaN(b.cx)) { b.cx += ox; b.cy += oy; if (!big(b) && !tiny(b)) shapes.push(b); }
    } else if (name === "path") {
      const filled = /\bfill="(?!none)/.test(attrs) || /fill:(?!none)/.test(attrs);
      const b = elemBox("path", "<path" + attrs + ">");
      if (filled) { if (b && !isNaN(b.cx)) { b.cx += ox; b.cy += oy; if (!big(b) && !tiny(b)) shapes.push(b); } }
      else { const d = attrs.match(/\bd="([^"]*)"/)?.[1]; if (d && /^\s*M/.test(d)) { const pts = flatten(d).map((p) => [p[0] + ox, p[1] + oy]); if (pts.length >= 2) eds.push(pts); } }
    } else if (name === "line") {
      const x1 = attrN(attrs, "x1") + ox, y1 = attrN(attrs, "y1") + oy, x2 = attrN(attrs, "x2") + ox, y2 = attrN(attrs, "y2") + oy;
      if (![x1, y1, x2, y2].some(isNaN) && Math.hypot(x2 - x1, y2 - y1) >= 6) eds.push([[x1, y1], [x2, y2]]);
    } else if (name === "text") {
      const end = body.indexOf("</text>", re.lastIndex);
      const s = norm(body.slice(re.lastIndex, end < 0 ? undefined : end));
      if (s) toks.push({ x: (attrN(attrs, "x") || 0) + ox, y: (attrN(attrs, "y") || 0) + oy, s });
    } else if (name === "foreignObject") {
      const end = body.indexOf("</foreignObject>", re.lastIndex);
      const s = norm(body.slice(re.lastIndex, end < 0 ? undefined : end));
      if (s) toks.push({ x: (attrN(attrs, "x") || 0) + (attrN(attrs, "width") || 0) / 2 + ox, y: (attrN(attrs, "y") || 0) + (attrN(attrs, "height") || 0) / 2 + oy, s });
    }
  }
  return { shapes, toks, eds };
}
// A node = the smallest shape enclosing a label token; its label = that token.
// kymo↔mmdc then pair by label (id-free but exact).
function nodesOf(w) {
  const inside = (t, b) => Math.abs(t.x - b.cx) <= b.w / 2 + 3 && Math.abs(t.y - b.cy) <= b.h / 2 + 3;
  const out = [];
  for (const t of w.toks) {
    let best = null, ba = Infinity;
    for (const b of w.shapes) { if (inside(t, b)) { const a = b.w * b.h; if (a < ba) { ba = a; best = b; } } }
    if (best) out.push({ ...best, label: t.s });
  }
  return out;
}
function flatten(d) { const t = d.match(/[MLCZ]|-?\d+\.?\d*/gi) || []; const p = []; let i = 0, cx = 0, cy = 0; const P = (x, y) => { cx = x; cy = y; p.push([x, y]); };
  while (i < t.length) { const c = t[i++]; if (c === "M" || c === "L") P(+t[i++], +t[i++]); else if (c === "C") { const x1 = +t[i++], y1 = +t[i++], x2 = +t[i++], y2 = +t[i++], x = +t[i++], y = +t[i++], sx = cx, sy = cy; for (let k = 1; k <= 6; k++) { const u = k / 6, v = 1 - u; P(v*v*v*sx+3*v*v*u*x1+3*v*u*u*x2+u*u*u*x, v*v*v*sy+3*v*v*u*y1+3*v*u*u*y2+u*u*u*y); } } else if (/^[-\d.]/.test(c)) P(+c, +t[i++]); } return p; }
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const centroid = (ps) => ps.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map((v) => v / Math.max(1, ps.length));
const med = (xs) => { xs = xs.filter((v) => v === v).sort((a, b) => a - b); return xs.length ? xs[xs.length >> 1] : NaN; };
function greedy(A, B) { const used = new Set(), pairs = []; for (const a of A) { let bi = -1, bd = Infinity; B.forEach((b, j) => { if (!used.has(j)) { const d = dist([a.cx, a.cy], [b.cx, b.cy]); if (d < bd) { bd = d; bi = j; } } }); if (bi >= 0) { used.add(bi); pairs.push([a, B[bi], bd]); } } return pairs; }
// Pair by exact label; ties (duplicate labels) resolved by nearest centre.
function matchByLabel(A, B) {
  const used = new Set(), pairs = [];
  for (const a of A) {
    let bi = -1, bd = Infinity;
    B.forEach((b, j) => { if (!used.has(j) && b.label === a.label) { const d = dist([a.cx, a.cy], [b.cx, b.cy]); if (d < bd) { bd = d; bi = j; } } });
    if (bi >= 0) { used.add(bi); pairs.push([a, B[bi], bd]); }
  }
  return pairs;
}
function sampleDist(p, q) { const near = (pt, poly) => Math.min(...poly.map((x) => dist(pt, x))); const ds = [...p.map((x) => near(x, q)), ...q.map((x) => near(x, p))]; return ds.reduce((a, b) => a + b, 0) / ds.length; }

function geom(kSvg, rSvg) {
  const kw = walk(kSvg), rw = walk(rSvg);
  const kn = nodesOf(kw), rn = nodesOf(rw), ke = kw.eds, re = rw.eds;
  const { W, H } = canvas(rSvg);
  const diag = Math.hypot(W, H) || 1;                      // normaliser (ref diagonal)
  const topo = kn.length === rn.length && ke.length === re.length;
  if (!kn.length || !rn.length) return { topo, diag, kn: kn.length, rn: rn.length, ke: ke.length, re: re.length, pos: NaN, size: NaN, edge: NaN };
  // Rough centroid align only to break same-label ties, then match by label.
  const ck = centroid(kn.map((n) => [n.cx, n.cy])), cr = centroid(rn.map((n) => [n.cx, n.cy]));
  const kshift = kn.map((n) => ({ ...n, cx: n.cx + (cr[0] - ck[0]), cy: n.cy + (cr[1] - ck[1]) }));
  const pairs = matchByLabel(kshift, rn);
  // Re-align by the MEDIAN matched-pair offset (Procrustes) — removes the global
  // frame shift that node-set differences otherwise inject into `pos`.
  const t = pairs.length
    ? [med(pairs.map((p) => p[1].cx - p[0].cx)), med(pairs.map((p) => p[1].cy - p[0].cy))]
    : [0, 0];
  const pos = med(pairs.map((p) => dist([p[0].cx + t[0], p[0].cy + t[1]], [p[1].cx, p[1].cy])));
  const size = med(pairs.map((p) => (Math.abs(p[0].w - p[1].w) + Math.abs(p[0].h - p[1].h)) / 2));
  let edge = NaN;
  if (ke.length && re.length) {
    // Same total alignment as nodes: rough centroid shift + pair residual.
    const t2 = [(cr[0] - ck[0]) + t[0], (cr[1] - ck[1]) + t[1]];
    const kes = ke.map((p) => p.map((q) => [q[0] + t2[0], q[1] + t2[1]]));
    const used = new Set(), ed = [];
    for (const e of kes) { let bi = -1, bd = Infinity; re.forEach((me, j) => { if (!used.has(j)) { const d = dist(centroid(e), centroid(me)); if (d < bd) { bd = d; bi = j; } } }); if (bi >= 0) { used.add(bi); ed.push(sampleDist(e, re[bi])); } }
    edge = med(ed);
  }
  return { topo, diag, kn: kn.length, rn: rn.length, ke: ke.length, re: re.length, pos, size, edge };
}

// ── run ───────────────────────────────────────────────────────────────────────
const rows = [];
for (const t of TYPES) {
  const dir = DSDIR + t + "/";
  const files = readdirSync(dir).filter((f) => f.endsWith(".mmd")).sort().slice(0, LIMIT);
  for (const f of files) {
    const mmd = dir + f, tag = t + "_" + f.replace(/\.mmd$/, "");
    let kSvg, rSvg;
    try { kSvg = kymoSvg(mmd); } catch { continue; }
    try { rSvg = refSvg(mmd, tag); } catch { continue; } // mmdc can't render → skip
    try { rows.push({ type: t, f, ...geom(kSvg, rSvg) }); } catch { }
  }
}
console.log("\n=== 4 coordinate metrics per type — as % of the reference diagonal ===");
console.log("type         n   topo✓   nodes k/m   pos%    size%   edge%");
for (const t of TYPES) {
  const rs = rows.filter((r) => r.type === t); if (!rs.length) continue;
  const topo = rs.filter((r) => r.topo).length;
  const knm = med(rs.map((r) => r.kn)), rnm = med(rs.map((r) => r.rn));
  const posp = med(rs.map((r) => (r.pos / r.diag) * 100));
  const sizp = med(rs.map((r) => (r.size / r.diag) * 100));
  const edgp = med(rs.map((r) => (r.edge / r.diag) * 100));
  const pc = (x) => isNaN(x) ? "   –" : (x.toFixed(1) + "%").padStart(6);
  console.log(`${t.padEnd(12)} ${String(rs.length).padStart(3)}  ${String(topo).padStart(3)}/${rs.length}   ${String(knm).padStart(3)}/${String(rnm).padEnd(3)}  ${pc(posp)} ${pc(sizp)} ${pc(edgp)}`);
}
writeFileSync(TMP + "type-geom.json", JSON.stringify(rows, null, 2));
console.log("\nwrote", TMP + "type-geom.json");
console.log("topo = #(node,edge) counts equal; pos/size/edge = median over files of (px / ref-diagonal).");
console.log("NN-matched (no shared ids); counts approximate — renderers decompose nodes differently.");
