// AI "Simulate UI" for DBML diagram edits: instead of swapping the source, a
// ghost cursor glides across the canvas and replays the *real* editing gestures
// (pick the Add-Table tool → drop a table → click "+ field" → draw a
// relationship → delete with the Delete tool). Each gesture invokes the SAME
// structural callbacks the human toolbar uses (ctx.*), so this drives the actual
// editing surface — the diff old→new source is just the script.

import { parseDbmlModel } from "./engine";

// Must match HEADER_H / ROW_H in packages/js/src/from-dbml.ts (+ preview.tsx).
const ER_HEADER_H = 32, ER_ROW_H = 30;
const MOVE_MS = 380, CLICK_MS = 160, RENDER_MS = 600, TYPE_MS = 45, MAX_GESTURES = 24;

export type SimTool = "select" | "hand" | "table" | "delete";
export interface SimCtx {
  setTool: (t: SimTool) => void;
  addTable: (name: string, fields: { name: string; type: string; pk?: boolean }[], cx: number, cy: number) => void;
  addField: (tid: string, name: string, type: string) => void;
  addRel: (sT: string, sC: string, dT: string, dC: string) => void;
  deleteTable: (tid: string) => void;
  deleteRel: (sT: string, sC: string, dT: string, dC: string) => void;
  signal: { cancelled: boolean };
}

type Gesture =
  | { t: "add-table"; name: string; fields: { name: string; type: string; pk?: boolean }[]; cx: number; cy: number }
  | { t: "add-field"; tid: string; name: string; type: string }
  | { t: "delete-table"; tid: string }
  | { t: "add-rel"; sT: string; sC: string; dT: string; dC: string }
  | { t: "delete-rel"; sT: string; sC: string; dT: string; dC: string };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const cssEsc = (s: string) => (window.CSS?.escape ?? ((x: string) => x))(s);
const eKey = (e: any) => `${e.src}.${e.srcCol}>${e.dst}.${e.dstCol}`;

// ── diff old → new model into an ordered gesture script ─────────────────────
export function planGestures(oldSrc: string, newSrc: string, positions?: Record<string, [number, number]>): Gesture[] {
  let oldM: any, newM: any;
  try { oldM = parseDbmlModel(oldSrc, positions); newM = parseDbmlModel(newSrc, positions); }
  catch { return []; }
  const oldT = new Map<string, any>(oldM.components.map((c: any) => [c.name, c]));
  const newT = new Map<string, any>(newM.components.map((c: any) => [c.name, c]));
  const g: Gesture[] = [];

  // new tables (created complete, with their fields)
  for (const c of newM.components) if (!oldT.has(c.name)) {
    const fields = (c.rows || []).map((r: any) => ({ name: r.name, type: r.type || "integer", pk: !!r.pk }));
    g.push({ t: "add-table", name: c.name, fields, cx: c.pos?.[0] ?? 0, cy: c.pos?.[1] ?? 0 });
  }
  // new fields on existing tables
  for (const c of newM.components) {
    const o = oldT.get(c.name); if (!o) continue;
    const have = new Set((o.rows || []).map((r: any) => r.name));
    for (const r of (c.rows || [])) if (!have.has(r.name)) g.push({ t: "add-field", tid: c.name, name: r.name, type: r.type || "integer" });
  }
  // relationships
  const oldE = new Set(oldM.edges.map(eKey)), newE = new Set(newM.edges.map(eKey));
  for (const e of newM.edges) if (!oldE.has(eKey(e))) g.push({ t: "add-rel", sT: e.src, sC: e.srcCol, dT: e.dst, dC: e.dstCol });
  for (const e of oldM.edges) if (!newE.has(eKey(e)) && newT.has(e.src) && newT.has(e.dst))
    g.push({ t: "delete-rel", sT: e.src, sC: e.srcCol, dT: e.dst, dC: e.dstCol });
  // removed tables last (their refs go with them)
  for (const c of oldM.components) if (!newT.has(c.name)) g.push({ t: "delete-table", tid: c.name });
  return g;
}

// ── DOM geometry (page-space targets for the cursor) ────────────────────────
function vp() { return document.querySelector<HTMLElement>("#preview"); }
function svgEl() { return document.querySelector<SVGSVGElement>("#preview .pv-stage svg"); }
function tableEl(tid: string) { return document.querySelector<SVGGraphicsElement>(`#preview .er-table[data-tid="${cssEsc(tid)}"]`); }

function svgToPage(sx: number, sy: number): [number, number] | null {
  const root = vp(), stage = document.querySelector<HTMLElement>("#preview .pv-stage"), svg = svgEl();
  if (!root || !stage || !svg) return null;
  const r = root.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  const m = /translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(\s*([-\d.]+)/.exec(stage.style.transform || "");
  const tx = m ? +m[1] : 0, ty = m ? +m[2] : 0, z = m ? +m[3] : 1;
  return [r.left + (sx - vb.x) * z + tx, r.top + (sy - vb.y) * z + ty];
}
function toolRect(tool: SimTool): [number, number] | null {
  const b = document.querySelector(`.er-toolbar [data-ertool="${tool}"]`)?.getBoundingClientRect();
  return b ? [b.left + b.width / 2, b.top + b.height / 2] : null;
}
function tableRect(tid: string) { return tableEl(tid)?.getBoundingClientRect() || null; }
function fieldPoint(tid: string, col: string, side: "l" | "r"): [number, number] | null {
  const el = tableEl(tid); if (!el) return null;
  const r = el.getBoundingClientRect();
  let cols: string[] = []; try { cols = JSON.parse(el.dataset.cols || "[]"); } catch {}
  const row = cols.indexOf(col); if (row < 0) return null;
  const scale = r.height / (Number(el.dataset.h) || r.height || 1);
  return [side === "r" ? r.right : r.left, r.top + (ER_HEADER_H + row * ER_ROW_H + ER_ROW_H / 2) * scale];
}
function relMid(sT: string, sC: string, dT: string, dC: string): [number, number] | null {
  for (const g of document.querySelectorAll<SVGGElement>("#preview .er-rel-g")) {
    const d = g.dataset, a = new Set([`${d.src}.${d.srcCol}`, `${d.dst}.${d.dstCol}`]);
    if (a.has(`${sT}.${sC}`) && a.has(`${dT}.${dC}`)) {
      const r = (g.querySelector("path.er-rel") || g).getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    }
  }
  return null;
}

// ── ghost cursor + typing flourish ──────────────────────────────────────────
function makeCursor(): HTMLElement {
  const c = document.createElement("div");
  c.className = "er-ghost-cursor";
  c.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 2 L2 17 L6.5 12.5 L9.5 19 L12 18 L9 11.5 L15 11.5 Z"/></svg>`;
  const start = vp()?.getBoundingClientRect();
  c.style.transform = `translate(${(start?.left ?? 0) + (start?.width ?? 200) / 2}px, ${(start?.top ?? 0) + (start?.height ?? 200) / 2}px)`;
  document.body.appendChild(c);
  // force a frame so the first transition runs
  void c.offsetWidth;
  return c;
}
async function moveTo(c: HTMLElement, x: number, y: number) {
  c.style.transform = `translate(${x}px, ${y}px)`;
  await sleep(MOVE_MS);
}
async function clickPulse(c: HTMLElement) {
  c.classList.add("clicking");
  await sleep(CLICK_MS);
  c.classList.remove("clicking");
}
async function typeGhost(text: string, x: number, y: number, signal: { cancelled: boolean }) {
  const t = text.slice(0, 40);
  const el = document.createElement("div");
  el.className = "er-ghost-type";
  el.style.left = `${x + 14}px`; el.style.top = `${y - 10}px`;
  document.body.appendChild(el);
  for (let i = 0; i <= t.length; i++) { if (signal.cancelled) break; el.textContent = t.slice(0, i); await sleep(TYPE_MS); }
  await sleep(180);
  el.remove();
}

// ── run the script ──────────────────────────────────────────────────────────
export async function runSimulation(gestures: Gesture[], ctx: SimCtx): Promise<void> {
  const c = makeCursor();
  const move = (p: [number, number] | null) => (p ? moveTo(c, p[0], p[1]) : Promise.resolve());
  try {
    for (const g of gestures) {
      if (ctx.signal.cancelled) break;
      if (g.t === "add-table") {
        ctx.setTool("table");
        await move(toolRect("table")); await clickPulse(c);
        const pt = svgToPage(g.cx, g.cy);
        if (pt) { await move(pt); await typeGhost(g.name, pt[0], pt[1], ctx.signal); await clickPulse(c); }
        ctx.addTable(g.name, g.fields, g.cx, g.cy);
        await sleep(RENDER_MS);
        ctx.setTool("select");
      } else if (g.t === "add-field") {
        ctx.setTool("select");
        const tb = tableRect(g.tid);
        if (tb) { const px = tb.left + tb.width / 2, py = tb.bottom + 14; await move([px, py]); await typeGhost(`${g.name} ${g.type}`, px, py, ctx.signal); await clickPulse(c); }
        ctx.addField(g.tid, g.name, g.type);
        await sleep(RENDER_MS);
      } else if (g.t === "add-rel") {
        ctx.setTool("select");
        await move(fieldPoint(g.sT, g.sC, "r")); await clickPulse(c);
        await move(fieldPoint(g.dT, g.dC, "l")); await clickPulse(c);
        ctx.addRel(g.sT, g.sC, g.dT, g.dC);
        await sleep(RENDER_MS);
      } else if (g.t === "delete-rel") {
        ctx.setTool("delete");
        await move(relMid(g.sT, g.sC, g.dT, g.dC)); await clickPulse(c);
        ctx.deleteRel(g.sT, g.sC, g.dT, g.dC);
        await sleep(RENDER_MS); ctx.setTool("select");
      } else if (g.t === "delete-table") {
        ctx.setTool("delete");
        const tb = tableRect(g.tid);
        if (tb) await move([tb.left + tb.width / 2, tb.top + tb.height / 2]);
        await clickPulse(c);
        ctx.deleteTable(g.tid);
        await sleep(RENDER_MS); ctx.setTool("select");
      }
    }
  } finally {
    ctx.setTool("select");
    c.style.opacity = "0";
    setTimeout(() => c.remove(), 300);
  }
}

export { MAX_GESTURES };
