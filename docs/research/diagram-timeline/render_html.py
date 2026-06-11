#!/usr/bin/env python3
"""Generate index.html — an interactive visualization of the 30-year
diagram-timeline rankings — from docs/data/database.sqlite.

Self-contained output: data is embedded as JSON, rendering is vanilla
JS/SVG, no external dependencies. Re-run after editing the database:
    python3 render_html.py
"""
import json
import sqlite3
from pathlib import Path

HERE = Path(__file__).parent
DB = HERE.parent.parent / "data" / "database.sqlite"
OUT = HERE / "index.html"


def load():
    con = sqlite3.connect(DB)
    data = {"years": list(range(1995, 2026)), "tool": {}, "type": {}, "series": {}}
    for cat, ranking, entity in (("tool", "tool_rankings", "tools"),
                                 ("type", "diagram_rankings", "diagrams")):
        names = dict(con.execute(f"SELECT key, name FROM {entity}"))
        for year, rank, key, label, score in con.execute(
                f"SELECT year, rank, key, label, score FROM {ranking} ORDER BY year, rank"):
            e = data[cat].setdefault(key, {"name": names[key], "points": []})
            e["points"].append([year, rank, score, label])
    # Measured series for the signals section
    def hist(table, key, metric):
        return con.execute(
            f"SELECT year, value FROM {table} WHERE key=? AND metric=? ORDER BY year",
            (key, metric)).fetchall()
    data["series"] = {
        "npm": {k: hist("tool_metric_history", k, "npm_downloads")
                for k in ("mermaid", "excalidraw", "tldraw", "bpmnjs")},
        "stars": {k: hist("tool_metric_history", k, "github_stars_gained")
                  for k in ("mermaid", "excalidraw", "tldraw", "d2", "drawio", "plantuml")},
        "ngram": {k: hist("diagram_metric_history", k, "books_ngram_freq")
                  for k in ("uml", "flowchart", "mind", "gantt", "seq")},
        "so": {k: hist("diagram_metric_history", k, "stackoverflow_questions")
               for k in ("uml", "bp", "flowchart", "state", "erd")},
    }
    data["names"] = {**{k: v["name"] for k, v in data["tool"].items()},
                     **{k: v["name"] for k, v in data["type"].items()},
                     "bpmnjs": "bpmn-js", "d2": "D2", "drawio": "draw.io",
                     "uml": "UML", "bp": "BPMN", "seq": "Sequence diagram",
                     "mind": "Mind map", "gantt": "Gantt", "erd": "ERD",
                     "state": "State machine", "flowchart": "Flowchart"}
    con.close()
    return data


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>30 Years of Diagrams — Rankings Visualized (1995–2025)</title>
<style>
  :root { --ink:#1f2430; --muted:#6b7280; --line:#e5e7eb; --bg:#ffffff;
          --eraA:#f3f7fb; --eraB:#f4fbf4; --eraC:#fdf6f1; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; }
  .wrap { max-width:1240px; margin:0 auto; padding:28px 24px 64px; }
  h1 { font-size:26px; margin:0 0 4px; }
  h2 { font-size:19px; margin:40px 0 4px; }
  p.sub { color:var(--muted); margin:0 0 18px; }
  .toggle { display:inline-flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; margin:8px 0 4px; }
  .toggle button { border:0; background:#fff; padding:7px 18px; font:inherit; cursor:pointer; color:var(--muted); }
  .toggle button.on { background:var(--ink); color:#fff; }
  .hint { color:var(--muted); font-size:13px; margin-left:12px; }
  svg text { font:12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .era-label { fill:#9aa3af; font-size:11px; letter-spacing:.06em; }
  .axis text { fill:var(--muted); }
  .axis line { stroke:var(--line); }
  .bump path.ln { fill:none; stroke-width:2.4; opacity:.85; transition:opacity .15s; }
  .bump circle.pt { stroke:#fff; stroke-width:1.2; transition:opacity .15s; }
  .bump text.lbl { font-size:11.5px; cursor:default; transition:opacity .15s; }
  .bump text.lbl.mid { opacity:0; }
  .bump .hot text.lbl.mid { opacity:1; }
  .bump.sel path.ln, .bump.sel circle.pt, .bump.sel text.lbl { opacity:.12; }
  .bump.sel .hot path.ln, .bump.sel .hot circle.pt, .bump.sel .hot text.lbl { opacity:1; }
  .bump.sel .hot path.ln { stroke-width:3.4; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(420px,1fr)); gap:26px; margin-top:14px; }
  .card { border:1px solid var(--line); border-radius:10px; padding:14px 16px 8px; }
  .card h3 { margin:0 0 2px; font-size:14.5px; }
  .card p { margin:0 0 6px; color:var(--muted); font-size:12.5px; }
  .mini path { fill:none; stroke-width:2; }
  .mini text { fill:var(--muted); font-size:10.5px; }
  .mini line { stroke:var(--line); }
  .legend { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:12px; color:var(--muted); margin:4px 0 2px; }
  .legend span::before { content:""; display:inline-block; width:10px; height:10px; border-radius:3px;
                         margin-right:5px; background:var(--c); vertical-align:-1px; }
  footer { color:var(--muted); font-size:12.5px; margin-top:48px; border-top:1px solid var(--line); padding-top:14px; }
  a { color:#2563eb; text-decoration:none; } a:hover { text-decoration:underline; }
</style>
</head>
<body>
<div class="wrap">
  <h1>30 Years of Diagrams — Rankings Visualized</h1>
  <p class="sub">Top-10 tools and diagram types per year, 1995–2025 (<a href="README.md">RES-DIAGRAM-TIMELINE-001</a>) ·
     weighted-composite method per <a href="METHOD.md">RES-DIAGRAM-TIMELINE-002</a> ·
     data: <code>docs/data/database.sqlite</code></p>

  <div class="toggle" id="toggle">
    <button data-cat="tool" class="on">Tools</button>
    <button data-cat="type">Diagram types</button>
  </div>
  <span class="hint">hover to trace a line · click to pin · click background to clear</span>
  <div id="bump-host"></div>

  <h2>Measured signals</h2>
  <p class="sub">Verifiable series from the database (see METHOD §4) — read each chart for its shape; absolute scales differ per source.</p>
  <div class="grid" id="cards"></div>

  <footer>Generated from <code>docs/data/database.sqlite</code> by <code>render_html.py</code>.
  Rankings are evidence-based estimates; the measured series are independently verifiable
  (sources in the database). Eras: A — Desktop &amp; standardization · B — Web &amp; SaaS · C — Collaborative &amp; AI-native.</footer>
</div>
<script>
const DATA = __DATA__;
const NS = "http://www.w3.org/2000/svg";
const hue = i => `hsl(${(i*137.508)%360} 62% ${44 + (i%3)*4}%)`;
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k,v] of Object.entries(attrs||{})) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

/* ---------- bump chart ---------- */
const ERAS = [[1995,2004,"var(--eraA)","ERA A — DESKTOP & STANDARDIZATION"],
              [2005,2014,"var(--eraB)","ERA B — WEB & SAAS"],
              [2015,2025,"var(--eraC)","ERA C — COLLABORATIVE & AI-NATIVE"]];
function bump(cat) {
  const entities = DATA[cat], years = DATA.years;
  const W=1192, M={t:42,r:170,b:28,l:36}, rowH=40, H=M.t+M.b+rowH*10;
  const x = y => M.l + (y-1995)/(2025-1995)*(W-M.l-M.r);
  const ry = r => M.t + (r-0.5)*rowH;
  const host = document.getElementById("bump-host");
  host.innerHTML = "";
  const svg = el("svg", {viewBox:`0 0 ${W} ${H}`, width:"100%", class:"bump"}, null);
  host.appendChild(svg);
  for (const [a,b,fill,name] of ERAS) {
    el("rect", {x:x(a)-12, y:M.t-26, width:x(b)-x(a)+24, height:rowH*10+30, fill, rx:8}, svg);
    const t = el("text", {x:(x(a)+x(b))/2, y:M.t-12, "text-anchor":"middle", class:"era-label"}, svg);
    t.textContent = name;
  }
  const ax = el("g", {class:"axis"}, svg);
  for (const y of years) {
    if (y % 5 && y !== 2025) continue;
    const t = el("text", {x:x(y), y:H-8, "text-anchor":"middle"}, ax); t.textContent = y;
  }
  for (let r=1; r<=10; r++) {
    const t = el("text", {x:M.l-14, y:ry(r)+4, "text-anchor":"middle"}, ax); t.textContent = r;
    el("line", {x1:M.l-6, y1:ry(r), x2:W-M.r+10, y2:ry(r), "stroke-dasharray":"2 5"}, ax);
  }
  const keys = Object.keys(entities);
  keys.forEach((key, i) => {
    const e = entities[key], color = hue(i);
    const g = el("g", {class:"ent", "data-key":key}, svg);
    let seg = [];
    const flush = () => {
      if (seg.length > 1)
        el("path", {class:"ln", stroke:color,
          d:"M" + seg.map(p=>`${x(p[0])},${ry(p[1])}`).join(" L")}, g);
      seg = [];
    };
    const by = new Map(e.points.map(p=>[p[0], p]));
    for (const y of years) { if (by.has(y)) seg.push(by.get(y)); else flush(); }
    flush();
    for (const [y, r, score, label] of e.points) {
      const c = el("circle", {class:"pt", cx:x(y), cy:ry(r), r:4.2, fill:color}, g);
      const tt = el("title", {}, c);
      tt.textContent = `${label} — ${y}\\nrank ${r} · score ${score}`;
    }
    const last = e.points[e.points.length-1];
    const ended = last[0] !== 2025;   // dropped out: label only on hover/pin
    const t = el("text", {class: ended ? "lbl mid" : "lbl", fill:color,
      x: ended ? x(last[0])+8 : W-M.r+16,
      y: ry(last[1]) + (ended ? -8 : 4)}, g);
    t.textContent = e.name.length > 24 ? e.name.slice(0, 23) + "…" : e.name;
    el("title", {}, t).textContent = e.name;
  });
  let pinned = null;
  const setHot = key => {
    svg.classList.toggle("sel", !!key);
    for (const g of svg.querySelectorAll("g.ent"))
      g.classList.toggle("hot", g.dataset.key === key);
  };
  for (const g of svg.querySelectorAll("g.ent")) {
    g.addEventListener("mouseenter", () => !pinned && setHot(g.dataset.key));
    g.addEventListener("mouseleave", () => !pinned && setHot(null));
    g.addEventListener("click", ev => { ev.stopPropagation();
      pinned = pinned === g.dataset.key ? null : g.dataset.key; setHot(pinned); });
  }
  svg.addEventListener("click", () => { pinned = null; setHot(null); });
}

/* ---------- measured-signal mini charts ---------- */
function mini(card, series, opts) {
  const W=560, H=190, M={t:10,r:8,b:22,l:46};
  const pts = Object.values(series).flat();
  const xs = pts.map(p=>p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const vmax = Math.max(...pts.map(p=>p[1]));
  const yv = opts.log ? v => Math.log10(Math.max(v,1)) : v => v;
  const ymax = yv(vmax);
  const x = v => M.l + (v-x0)/(x1-x0)*(W-M.l-M.r);
  const y = v => H-M.b - yv(v)/ymax*(H-M.t-M.b);
  const svg = el("svg", {viewBox:`0 0 ${W} ${H}`, width:"100%", class:"mini"}, null);
  card.appendChild(svg);
  for (const gy of opts.ticks) {
    el("line", {x1:M.l, y1:y(gy), x2:W-M.r, y2:y(gy)}, svg);
    const t = el("text", {x:M.l-4, y:y(gy)+3, "text-anchor":"end"}, svg);
    t.textContent = opts.fmt(gy);
  }
  for (let v=x0; v<=x1; v++) {
    if (v % 5) continue;
    const t = el("text", {x:x(v), y:H-6, "text-anchor":"middle"}, svg); t.textContent = v;
  }
  const legend = document.createElement("div"); legend.className = "legend";
  Object.entries(series).forEach(([key, rows], i) => {
    const color = hue(i+2);
    el("path", {stroke:color, d:"M"+rows.map(p=>`${x(p[0])},${y(p[1])}`).join(" L")}, svg);
    const s = document.createElement("span");
    s.style.setProperty("--c", color); s.textContent = DATA.names[key] || key;
    legend.appendChild(s);
  });
  card.appendChild(legend);
}
const fmtSI = v => v >= 1e6 ? (v/1e6)+"M" : v >= 1e3 ? (v/1e3)+"k" : v;
const CARDS = [
  ["npm downloads / year (log)", "npm registry range API, 2015–2025 — Mermaid's measured adoption curve",
   DATA.series.npm, {log:true, ticks:[1e4,1e6,1e8], fmt:fmtSI}],
  ["GitHub stars gained / year", "GH Archive WatchEvents — launch spikes and the 2022 Mermaid inflection",
   DATA.series.stars, {log:false, ticks:[10000,20000], fmt:fmtSI}],
  ["Google Books term frequency (per 10⁹ words)", "corpus en-2019, 1995–2019 — the rise and fall of the UML/CASE era",
   DATA.series.ngram, {log:false, ticks:[1500,3000], fmt:fmtSI}],
  ["Stack Overflow questions / year", "Stack Exchange API, 2009–2025 — developer attention per notation",
   DATA.series.so, {log:false, ticks:[500,1000], fmt:fmtSI}],
];
for (const [title, sub, series, opts] of CARDS) {
  const card = document.createElement("div"); card.className = "card";
  card.innerHTML = `<h3>${title}</h3><p>${sub}</p>`;
  document.getElementById("cards").appendChild(card);
  mini(card, series, opts);
}

/* ---------- toggle ---------- */
document.getElementById("toggle").addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b) return;
  for (const x of ev.currentTarget.querySelectorAll("button")) x.classList.toggle("on", x===b);
  bump(b.dataset.cat);
});
bump("tool");
</script>
</body>
</html>
"""


def main():
    data = load()
    OUT.write_text(TEMPLATE.replace("__DATA__", json.dumps(data, separators=(",", ":"))))
    print(f"wrote {OUT.name} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
