import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { erEdgeGeometry, erMarkerD, ER_DOT_OFFSET } from "kymostudio";
import { NEXT_OP } from "./dbml-edit";

// Which end is the "many" (crow's-foot) vs "one" (circle), per operator.
const ER_ENDS: Record<string, [string, string]> = {
  ">": ["many", "one"], "<": ["one", "many"], "-": ["one", "one"], "<>": ["many", "many"],
};

// Read a `translate(x y)` / `translate(x,y)` from an element's transform (0,0 default).
function getTranslate(el: Element): [number, number] {
  const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(el.getAttribute("transform") || "");
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0];
}
// Current absolute box of an ER table group = its baked data-* box + live transform.
function tableBox(el: SVGGraphicsElement): { x: number; y: number; w: number; h: number } {
  const [tx, ty] = getTranslate(el);
  const d = el.dataset;
  return { x: Number(d.x) + tx, y: Number(d.y) + ty, w: Number(d.w), h: Number(d.h) };
}

// Intrinsic size of the rendered SVG, read straight from the markup (no getBBox,
// so it works before/independent of layout). viewBox wins; fall back to width/height.
function svgSize(svg: string): { w: number; h: number } | null {
  const vb = svg.match(/viewBox=["']\s*[\d.eE+-]+\s+[\d.eE+-]+\s+([\d.eE+]+)\s+([\d.eE+]+)/i);
  if (vb) { const w = parseFloat(vb[1]), h = parseFloat(vb[2]); if (w > 0 && h > 0) return { w, h }; }
  const w = svg.match(/<svg[^>]*\bwidth=["']([\d.]+)/i);
  const h = svg.match(/<svg[^>]*\bheight=["']([\d.]+)/i);
  if (w && h) { const wv = parseFloat(w[1]), hv = parseFloat(h[1]); if (wv > 0 && hv > 0) return { w: wv, h: hv }; }
  return null;
}

const MIN_Z = 0.1, MAX_Z = 8, FIT_PAD = 0.94;
const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z));

type T = { z: number; x: number; y: number };

// Pan/zoom preview: the SVG sits in a transform layer so the diagram can be
// fitted, zoomed (wheel / pinch / buttons) and panned (drag) — replacing the
// old flex-centered #preview that could only shrink-to-fit and pinned big
// diagrams off-screen. `fitKey` changing (new room / kind) re-fits and drops
// any manual zoom the user had on the previous diagram.
// ER table box metrics — must match HEADER_H/ROW_H in packages/js/src/from-dbml.ts.
const ER_HEADER_H = 32, ER_ROW_H = 30;

export type ErTool = "select" | "hand" | "table" | "delete";

export function Preview({ svg, fitKey, tool = "select", onTableMove, onAddLink, onDeleteLink, onSetLinkOp, onAddTable, onDeleteTable, onAddField, onRenameTable, onRenameField }: {
  svg: string; fitKey: string;
  /** Active canvas tool (DBML ER editing). Defaults to select. */
  tool?: ErTool;
  /** ER table dragged to a new CENTRE (DBML); persisted by the parent. */
  onTableMove?: (id: string, cx: number, cy: number) => void;
  /** Relationship editing (DBML): create / delete / change-cardinality. The
   *  parent rewrites the `Ref` statements in the source. */
  onAddLink?: (sT: string, sC: string, dT: string, dC: string) => void;
  onDeleteLink?: (sT: string, sC: string, dT: string, dC: string) => void;
  onSetLinkOp?: (sT: string, sC: string, dT: string, dC: string, op: string) => void;
  /** Structural editing (DBML): the parent rewrites the table/field source. A
   *  new table is dropped at a SVG-space centre. */
  onAddTable?: (cx: number, cy: number) => void;
  onDeleteTable?: (tid: string) => void;
  onAddField?: (tid: string) => void;
  onRenameTable?: (tid: string, name: string) => void;
  onRenameField?: (tid: string, col: string, name: string) => void;
}) {
  const vpRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<T>({ z: 1, x: 0, y: 0 });
  const tRef = useRef(t); tRef.current = t;
  const toolRef = useRef(tool); toolRef.current = tool;
  // Inline rename overlay (HTML <input> positioned over a header / field row).
  const [editing, setEditing] = useState<{ tid: string; col?: string; x: number; y: number; w: number; h: number; value: string } | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const userAdjusted = useRef(false);
  const fitKeyRef = useRef(fitKey);

  const stageRef = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const vp = vpRef.current; if (!vp) return;
    const size = svgSize(svg); if (!size) return;
    const cw = vp.clientWidth, ch = vp.clientHeight; if (!cw || !ch) return;
    const z = clampZ(Math.min(cw / size.w, ch / size.h) * FIT_PAD);
    setT({ z, x: (cw - size.w * z) / 2, y: (ch - size.h * z) / 2 });
  }, [svg]);

  // Pin the injected SVG to its intrinsic viewBox pixel size. mermaid.js emits
  // `width="100%" style="max-width:…"` (useMaxWidth:true), so the SVG otherwise
  // shrinks to the container BEFORE our transform-scale fit — which assumes the
  // SVG is at its viewBox px size — runs, double-shrinking big diagrams to a
  // dot. Forcing explicit width/height (and clearing max-width) makes scale()
  // the only sizing step. No-op for the core/kroki paths (already fixed-size).
  useEffect(() => {
    const el = stageRef.current?.querySelector("svg"); if (!el) return;
    const size = svgSize(svg); if (!size) return;
    el.setAttribute("width", String(size.w));
    el.setAttribute("height", String(size.h));
    el.style.maxWidth = "none";
    // ER tables (DBML) are draggable beyond the viewBox — let the SVG spill so a
    // dragged table isn't clipped at the canvas edge (the #preview viewport still
    // clips, and you pan to follow). No-op for every other diagram.
    el.style.overflow = el.querySelector(".er-table") ? "visible" : "";
  }, [svg]);

  // Re-fit on a new diagram identity (clearing manual zoom), and keep the whole
  // diagram in view while the user is just editing — until they grab zoom/pan.
  useEffect(() => {
    if (fitKeyRef.current !== fitKey) { fitKeyRef.current = fitKey; userAdjusted.current = false; }
    if (!userAdjusted.current) fit();
  }, [svg, fitKey, fit]);

  useEffect(() => {
    const vp = vpRef.current; if (!vp || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { if (!userAdjusted.current) fit(); });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [fit]);

  // Zoom by `factor` keeping the content point under (cx,cy) — viewport-local — fixed.
  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    userAdjusted.current = true;
    setT((p) => {
      const z = clampZ(p.z * factor);
      const k = z / p.z;
      return { z, x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k };
    });
  }, []);

  // wheel must be a non-passive native listener (React's onWheel is passive → no preventDefault)
  useEffect(() => {
    const vp = vpRef.current; if (!vp) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    vp.addEventListener("wheel", h, { passive: false });
    return () => vp.removeEventListener("wheel", h);
  }, [zoomAt]);

  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinch = useRef<{ dist: number; cx: number; cy: number; z: number; x: number; y: number } | null>(null);
  // Active ER-table drag (DBML): which group, the pointer/transform start, and
  // the table's base centre — so the final centre is base + live transform.
  const tdrag = useRef<{ el: SVGGraphicsElement; tid: string; sx: number; sy: number; tx0: number; ty0: number; cx0: number; cy0: number; moved: boolean } | null>(null);

  // Re-route every FK edge touching table `tid` to its tables' current boxes.
  const rerouteEdges = useCallback((tid: string) => {
    const root = stageRef.current?.querySelector("svg"); if (!root) return;
    const byId = (id: string) => root.querySelector<SVGGraphicsElement>(`.er-table[data-tid="${(window.CSS?.escape ?? ((s: string) => s))(id)}"]`);
    root.querySelectorAll<SVGGElement>(".er-rel-g").forEach((g) => {
      const s = g.dataset.src || "", t = g.dataset.dst || "";
      if (s !== tid && t !== tid) return;
      const se = byId(s), te = byId(t); if (!se || !te) return;
      const sb = tableBox(se), tb = tableBox(te);
      const geo = erEdgeGeometry({ ...sb, oy: Number(g.dataset.soy) }, { ...tb, oy: Number(g.dataset.doy) });
      // move ONLY the connector (line + hit area), never the marker paths
      g.querySelector("path.er-rel-hit")?.setAttribute("d", geo.d);
      g.querySelector("path.er-rel")?.setAttribute("d", geo.d);
      const goRight = (tb.x + tb.w / 2) >= (sb.x + sb.w / 2);
      const moveEp = (el: Element | null, x: number, y: number, apex: number[], out: number) => {
        if (!el) return;
        if (el.tagName === "circle") { el.setAttribute("cx", String(x + out * ER_DOT_OFFSET)); el.setAttribute("cy", String(y)); }
        else el.setAttribute("d", erMarkerD(apex[0], apex[1], x, y));
      };
      moveEp(g.querySelector(".er-ep-src"), geo.x1, geo.y1, geo.srcApex, goRight ? 1 : -1);
      moveEp(g.querySelector(".er-ep-dst"), geo.x2, geo.y2, geo.dstApex, goRight ? -1 : 1);
    });
  }, []);

  // ── Relationship editing (DBML): create by dragging field→field, select an
  // edge to delete / change cardinality. UI chrome lives in an overlay <g>. ──
  const editEdges = !!(onAddLink || onDeleteLink);
  const link = useRef<{ sTid: string; sCol: string; sRow: number; side: string; sx: number; sy: number; target: { tid: string; col: string } | null } | null>(null);
  const hoverKey = useRef<string>("");
  const selEdge = useRef<SVGGElement | null>(null);
  const selTable = useRef<Element | null>(null);
  const SVGNS = "http://www.w3.org/2000/svg";

  const rootSvg = () => stageRef.current?.querySelector("svg") as SVGSVGElement | null;
  const tableById = (id: string): SVGGraphicsElement | null =>
    rootSvg()?.querySelector<SVGGraphicsElement>(`.er-table[data-tid="${(window.CSS?.escape ?? ((s: string) => s))(id)}"]`) ?? null;
  const rowOy = (row: number) => ER_HEADER_H + row * ER_ROW_H + ER_ROW_H / 2;
  const uiLayer = (): SVGGElement | null => {
    const root = rootSvg(); if (!root) return null;
    let g = root.querySelector<SVGGElement>("g.er-ui");
    if (!g) { g = document.createElementNS(SVGNS, "g"); g.setAttribute("class", "er-ui"); root.appendChild(g); }
    return g;
  };
  const clearUi = (cls: string) => uiLayer()?.querySelectorAll(`.${cls}`).forEach((n) => n.remove());

  // viewport-screen point → SVG user coordinates (undo pan/zoom + viewBox offset).
  const toSvg = (clientX: number, clientY: number): [number, number] | null => {
    const root = rootSvg(), vp = vpRef.current; if (!root || !vp) return null;
    const vb = root.viewBox.baseVal, r = vp.getBoundingClientRect(), tt = tRef.current;
    return [vb.x + (clientX - r.left - tt.x) / tt.z, vb.y + (clientY - r.top - tt.y) / tt.z];
  };
  // SVG-space point → viewport-relative px (inverse of toSvg) for the inline input.
  const toScreen = (sx: number, sy: number): [number, number] => {
    const vb = rootSvg()?.viewBox.baseVal, tt = tRef.current;
    return [(sx - (vb?.x || 0)) * tt.z + tt.x, (sy - (vb?.y || 0)) * tt.z + tt.y];
  };
  // Inline rename overlay — open over a table header or a field row.
  const beginEditTable = (el: SVGGraphicsElement) => {
    if (!onRenameTable) return;
    const z = tRef.current.z, b = tableBox(el), [x, y] = toScreen(b.x, b.y), tid = el.dataset.tid || "";
    setEditing({ tid, x, y, w: b.w * z, h: ER_HEADER_H * z, value: tid });
  };
  const beginEditField = (el: SVGGraphicsElement, row: number, col: string) => {
    if (!onRenameField) return;
    const z = tRef.current.z, b = tableBox(el), [x, y] = toScreen(b.x, b.y + ER_HEADER_H + row * ER_ROW_H);
    setEditing({ tid: el.dataset.tid || "", col, x, y, w: b.w * z, h: ER_ROW_H * z, value: col });
  };
  const commitEdit = (value: string) => {
    const ed = editing; setEditing(null);
    if (!ed) return;
    const v = value.trim(); if (!v) return;
    if (ed.col != null) { if (v !== ed.col) onRenameField?.(ed.tid, ed.col, v); }
    else if (v !== ed.tid) onRenameTable?.(ed.tid, v);
  };
  // Which table field is at this SVG point? (header / outside → null.)
  const fieldAt = (x: number, y: number): { tid: string; col: string; row: number; sideL: number; sideR: number; ry: number } | null => {
    const root = rootSvg(); if (!root) return null;
    for (const el of root.querySelectorAll<SVGGraphicsElement>(".er-table")) {
      const b = tableBox(el);
      if (x < b.x || x > b.x + b.w || y < b.y + ER_HEADER_H || y > b.y + b.h) continue;
      const row = Math.floor((y - b.y - ER_HEADER_H) / ER_ROW_H);
      let cols: string[] = []; try { cols = JSON.parse(el.dataset.cols || "[]"); } catch {}
      if (row < 0 || row >= cols.length) return null;
      return { tid: el.dataset.tid || "", col: cols[row], row, sideL: b.x, sideR: b.x + b.w, ry: b.y + ER_HEADER_H + row * ER_ROW_H + ER_ROW_H / 2 };
    }
    return null;
  };
  const mkEl = (tag: string, attrs: Record<string, string | number>, parent: SVGGElement) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    parent.appendChild(e); return e;
  };
  // Hover handles (small grab dots at both side edges of the hovered field row).
  const showHandles = (f: ReturnType<typeof fieldAt>) => {
    const key = f ? `${f.tid}:${f.row}` : "";
    if (key === hoverKey.current) return;
    hoverKey.current = key;
    clearUi("er-handle");
    if (!f) return;
    const g = uiLayer(); if (!g) return;
    for (const [cx, side] of [[f.sideR, "r"], [f.sideL, "l"]] as [number, string][]) {
      const h = mkEl("circle", { class: "er-handle", cx, cy: f.ry, r: 5 }, g);
      h.setAttribute("data-tid", f.tid); h.setAttribute("data-col", f.col);
      h.setAttribute("data-x", String(cx)); h.setAttribute("data-y", String(f.ry));
      h.setAttribute("data-side", side); h.setAttribute("data-row", String(f.row));
    }
  };
  const clearLinkUi = () => { clearUi("er-ghost"); clearUi("er-ghost-dot"); clearUi("er-rowhi"); clearUi("er-point"); };
  // The table under/near a point (expanded by `margin`) — so smart points appear
  // as you approach, like Miro. Skips a table id in `not`.
  const tableNear = (x: number, y: number, margin: number, not?: string): SVGGraphicsElement | null => {
    const root = rootSvg(); if (!root) return null;
    for (const el of root.querySelectorAll<SVGGraphicsElement>(".er-table")) {
      if (el.dataset.tid === not) continue;
      const b = tableBox(el);
      if (x >= b.x - margin && x <= b.x + b.w + margin && y >= b.y - margin && y <= b.y + b.h + margin) return el;
    }
    return null;
  };
  const rowCount = (el: SVGGraphicsElement): number => { try { return JSON.parse(el.dataset.cols || "[]").length; } catch { return 0; } };
  const colAt = (el: SVGGraphicsElement, row: number): string => { try { return JSON.parse(el.dataset.cols || "[]")[row] || ""; } catch { return ""; } };
  // Connection points: one dot per field row on the side of `el` facing `fromX`.
  const drawPoints = (el: SVGGraphicsElement, fromX: number): number => {
    const g = uiLayer(); if (!g) return 0;
    const b = tableBox(el);
    const left = (b.x + b.w / 2) >= fromX;          // which side faces the source
    const px = left ? b.x - ER_DOT_OFFSET : b.x + b.w + ER_DOT_OFFSET;  // sit just off the edge
    for (let i = 0; i < rowCount(el); i++) mkEl("circle", { class: "er-point", cx: px, cy: b.y + ER_HEADER_H + i * ER_ROW_H + ER_ROW_H / 2, r: 4 }, g);
    return px;
  };
  // Snapped: ghost == the exact final relationship path; highlight the target row
  // + a filled snap dot (the active smart connection point).
  const drawSnap = (d: string, x2: number, y2: number, dstEl: SVGGraphicsElement, row: number) => {
    const g = uiLayer(); if (!g) return;
    const b = tableBox(dstEl);
    mkEl("rect", { class: "er-rowhi", x: b.x, y: b.y + ER_HEADER_H + row * ER_ROW_H, width: b.w, height: ER_ROW_H }, g);
    mkEl("path", { class: "er-ghost", d }, g);
    mkEl("circle", { class: "er-ghost-dot", cx: x2, cy: y2, r: 5.5 }, g);
  };
  // Free: a clean curve leaving the source handle's side, trailing the pointer.
  const drawFree = (sx: number, sy: number, side: string, x2: number, y2: number) => {
    const g = uiLayer(); if (!g) return;
    const k = Math.max(36, Math.hypot(x2 - sx, y2 - sy) * 0.4);
    const c1x = side === "l" ? sx - k : sx + k;
    const c2x = x2 + (x2 >= sx ? -k * 0.5 : k * 0.5);
    mkEl("path", { class: "er-ghost", d: `M${sx},${sy} C${c1x},${sy} ${c2x},${y2} ${x2},${y2}` }, g);
    mkEl("circle", { class: "er-ghost-dot", cx: x2, cy: y2, r: 4 }, g);
  };
  const deselectEdge = () => {
    if (selEdge.current) selEdge.current.classList.remove("er-sel");
    selEdge.current = null;
    clearUi("er-edgeui");
  };
  // Table selection (click, dbdiagram-style): highlight the box + activate every
  // connected relationship (animated flow). Re-clicking the same table toggles off.
  const deselectTable = () => {
    selTable.current?.classList.remove("er-selected");
    rootSvg()?.querySelectorAll(".er-rel-g.er-edge-active").forEach((g) => g.classList.remove("er-edge-active"));
    clearUi("er-tableui");
    selTable.current = null;
  };
  const selectTable = (el: Element) => {
    if (selTable.current === el) { deselectTable(); return; }
    deselectTable(); deselectEdge();
    selTable.current = el;
    el.classList.add("er-selected");
    const tid = (el as SVGGraphicsElement).dataset.tid;
    rootSvg()?.querySelectorAll<SVGGElement>(".er-rel-g").forEach((g) => {
      if (g.dataset.src === tid || g.dataset.dst === tid) g.classList.add("er-edge-active");
    });
    // structural affordances: a delete "×" on the header + a "+ field" pill below.
    const g = uiLayer(); if (!g || !(onAddField || onDeleteTable)) return;
    const b = tableBox(el as SVGGraphicsElement);
    if (onDeleteTable) {
      const del = mkEl("g", { class: "er-tableui er-deltable", transform: `translate(${b.x + b.w - 13},${b.y + 16})` }, g);
      del.setAttribute("data-tid", tid || "");
      mkEl("circle", { class: "er-deltable-bg", cx: 0, cy: 0, r: 9 }, del as SVGGElement);
      (mkEl("text", { class: "er-deltable-tx", x: 0, y: 1 }, del as SVGGElement)).textContent = "×";
    }
    if (onAddField) {
      const add = mkEl("g", { class: "er-tableui er-addfield", transform: `translate(${b.x + b.w / 2},${b.y + b.h + 14})` }, g);
      add.setAttribute("data-tid", tid || "");
      mkEl("rect", { class: "er-addfield-bg", x: -42, y: -11, width: 84, height: 22, rx: 11 }, add as SVGGElement);
      (mkEl("text", { class: "er-addfield-tx", x: 0, y: 1 }, add as SVGGElement)).textContent = "+ field";
    }
  };
  // Select an edge: highlight + a small toolbar (delete ✕, cardinality badge) at its midpoint.
  const selectEdge = (gEl: SVGGElement) => {
    deselectEdge(); deselectTable();
    selEdge.current = gEl; gEl.classList.add("er-sel");
    // midpoint of the actual connector curve (robust to circle/crow's-foot ends)
    const path = gEl.querySelector<SVGPathElement>("path.er-rel");
    if (!path) return;
    const mid = path.getPointAtLength(path.getTotalLength() / 2);
    const mx = mid.x, my = mid.y;
    const g = uiLayer(); if (!g) return;
    const d = gEl.dataset;
    const set = (e: Element) => { e.setAttribute("data-src", d.src || ""); e.setAttribute("data-dst", d.dst || ""); e.setAttribute("data-sc", d.srcCol || ""); e.setAttribute("data-dc", d.dstCol || ""); e.setAttribute("data-op", d.op || ">"); };
    // cardinality badge (click to cycle) on the left, delete ✕ on the right
    const badge = mkEl("g", { class: "er-edgeui er-op", transform: `translate(${mx - 16},${my})` }, g); set(badge);
    mkEl("rect", { class: "er-op-bg", x: -12, y: -11, width: 24, height: 22, rx: 5 }, badge as SVGGElement);
    const opt = mkEl("text", { class: "er-op-tx", x: 0, y: 1 }, badge as SVGGElement); opt.textContent = d.op || ">";
    const del = mkEl("g", { class: "er-edgeui er-del", transform: `translate(${mx + 16},${my})` }, g); set(del);
    mkEl("circle", { class: "er-del-bg", cx: 0, cy: 0, r: 11 }, del as SVGGElement);
    const dt = mkEl("text", { class: "er-del-tx", x: 0, y: 1 }, del as SVGGElement); dt.textContent = "×";
  };

  // Clear any selection/handles when the diagram re-renders (svg replaced).
  useEffect(() => { selEdge.current = null; selTable.current = null; hoverKey.current = ""; setEditing(null); }, [svg]);
  const rel = (e: React.PointerEvent) => {
    const r = vpRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function onPointerDown(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
    // ER table drag (DBML) takes priority over canvas pan: grabbing a table box
    // moves just that table and live-reroutes its edges. Ignore extra pointers
    // mid-drag (no pinch-while-dragging).
    if (tdrag.current || link.current) return;
    const tgt = e.target as Element;
    const curTool = toolRef.current;
    // Structural affordances (any tool): the "+ field" pill / delete "×".
    const addBtn = tgt.closest?.(".er-addfield") as SVGGElement | null;
    if (addBtn) { onAddField?.(addBtn.dataset.tid || ""); e.stopPropagation(); return; }
    const delTbl = tgt.closest?.(".er-deltable") as SVGGElement | null;
    if (delTbl) { onDeleteTable?.(delTbl.dataset.tid || ""); e.stopPropagation(); return; }
    // Delete tool: click an edge / table to remove it.
    if (curTool === "delete") {
      const relG = tgt.closest?.(".er-rel-g") as SVGGElement | null;
      if (relG) { const d = relG.dataset; onDeleteLink?.(d.src || "", d.srcCol || "", d.dst || "", d.dstCol || ""); e.stopPropagation(); return; }
      const tEl = tgt.closest?.(".er-table") as SVGGraphicsElement | null;
      if (tEl) { onDeleteTable?.(tEl.dataset.tid || ""); e.stopPropagation(); return; }
    }
    // Add-table tool: click empty canvas to drop a new table.
    if (curTool === "table" && !tgt.closest?.(".er-table")) {
      const p = toSvg(e.clientX, e.clientY); if (p) { onAddTable?.(p[0], p[1]); e.stopPropagation(); return; }
    }
    if (editEdges && curTool === "select") {
      // edge toolbar: delete / cycle cardinality
      const del = tgt.closest?.(".er-del") as SVGGElement | null;
      if (del) { const d = del.dataset; onDeleteLink?.(d.src!, d.sc!, d.dst!, d.dc!); deselectEdge(); e.stopPropagation(); return; }
      const op = tgt.closest?.(".er-op") as SVGGElement | null;
      if (op) { const d = op.dataset; onSetLinkOp?.(d.src!, d.sc!, d.dst!, d.dc!, NEXT_OP[d.op || ">"] || "<"); e.stopPropagation(); return; }
      // start a new relationship by dragging from a field handle
      const handle = tgt.closest?.(".er-handle") as SVGElement | null;
      if (handle) {
        const d = handle.dataset;
        link.current = { sTid: d.tid!, sCol: d.col!, sRow: Number(d.row), side: d.side!, sx: Number(d.x), sy: Number(d.y), target: null };
        deselectEdge(); clearUi("er-handle"); hoverKey.current = "";
        e.stopPropagation(); return;
      }
      // select an existing relationship line
      const rel = tgt.closest?.(".er-rel-g") as SVGGElement | null;
      if (rel) { selectEdge(rel); e.stopPropagation(); return; }
      // click on empty canvas / table → drop any selection
      if (selEdge.current && !tgt.closest?.(".er-edgeui")) deselectEdge();
    }
    const tableEl = (onTableMove && curTool === "select") ? (e.target as Element)?.closest?.(".er-table") as SVGGraphicsElement | null : null;
    if (tableEl && ptrs.current.size === 0) {
      const [tx0, ty0] = getTranslate(tableEl);
      const d = tableEl.dataset;
      tdrag.current = {
        el: tableEl, tid: d.tid || "", sx: e.clientX, sy: e.clientY, tx0, ty0,
        cx0: Number(d.x) + Number(d.w) / 2, cy0: Number(d.y) + Number(d.h) / 2, moved: false,
      };
      tableEl.style.cursor = "grabbing";
      e.stopPropagation();
      return;
    }
    deselectTable();   // empty canvas (pan) → drop table selection
    const p = rel(e);
    ptrs.current.set(e.pointerId, p);
    userAdjusted.current = true;
    if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, z: tRef.current.z, x: tRef.current.x, y: tRef.current.y };
      pan.current = null;
    } else {
      pan.current = { x: p.x, y: p.y, tx: tRef.current.x, ty: tRef.current.y };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    // drawing a new relationship: snap to the target field row if hovering one,
    // else trail the pointer with a clean curve.
    if (link.current) {
      const ln = link.current;
      const p = toSvg(e.clientX, e.clientY); if (!p) return;
      clearLinkUi();
      const srcEl = tableById(ln.sTid);
      // approaching a table → reveal its connection points + snap to nearest row
      const dstEl = srcEl ? tableNear(p[0], p[1], 22, ln.sTid) : null;
      if (dstEl) {
        const b = tableBox(dstEl);
        drawPoints(dstEl, ln.sx);
        const row = Math.max(0, Math.min(rowCount(dstEl) - 1, Math.floor((p[1] - b.y - ER_HEADER_H) / ER_ROW_H)));
        const geo = erEdgeGeometry({ ...tableBox(srcEl!), oy: rowOy(ln.sRow) }, { ...b, oy: rowOy(row) });
        drawSnap(geo.d, geo.x2, geo.y2, dstEl, row);
        ln.target = { tid: dstEl.dataset.tid || "", col: colAt(dstEl, row) };
      } else {
        drawFree(ln.sx, ln.sy, ln.side, p[0], p[1]);
        ln.target = null;
      }
      return;
    }
    const td = tdrag.current;
    if (td) {
      const z = tRef.current.z || 1;
      const tx = td.tx0 + (e.clientX - td.sx) / z;
      const ty = td.ty0 + (e.clientY - td.sy) / z;
      td.el.setAttribute("transform", `translate(${tx} ${ty})`);
      td.moved = td.moved || Math.abs(tx - td.tx0) > 0.5 || Math.abs(ty - td.ty0) > 0.5;
      rerouteEdges(td.tid);
      return;
    }
    // idle hover: show grab handles on the field row under the pointer.
    if (editEdges && toolRef.current === "select" && ptrs.current.size === 0) {
      const p = toSvg(e.clientX, e.clientY);
      showHandles(p ? fieldAt(p[0], p[1]) : null);
      return;
    }
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, rel(e));
    if (ptrs.current.size >= 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()];
      const ps = pinch.current;
      const z = clampZ(ps.z * (Math.hypot(a.x - b.x, a.y - b.y) / ps.dist));
      const k = z / ps.z;
      setT({ z, x: ((a.x + b.x) / 2) - (ps.cx - ps.x) * k, y: ((a.y + b.y) / 2) - (ps.cy - ps.y) * k });
    } else if (pan.current) {
      const s = pan.current, p = ptrs.current.get(e.pointerId)!;
      setT((prev) => ({ ...prev, x: s.tx + (p.x - s.x), y: s.ty + (p.y - s.y) }));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    // finish creating a relationship: drop onto a target field → add the Ref.
    if (link.current) {
      const ln = link.current; link.current = null;
      clearLinkUi(); hoverKey.current = "";
      // prefer the snapped target (nearest row) resolved during the drag
      let tgt = ln.target;
      if (!tgt) { const p = toSvg(e.clientX, e.clientY); const f = p ? fieldAt(p[0], p[1]) : null; if (f) tgt = { tid: f.tid, col: f.col }; }
      if (tgt && tgt.col && !(tgt.tid === ln.sTid && tgt.col === ln.sCol)) onAddLink?.(ln.sTid, ln.sCol, tgt.tid, tgt.col);
      return;
    }
    const td = tdrag.current;
    if (td) {
      const [tx, ty] = getTranslate(td.el);
      td.el.style.cursor = "";
      tdrag.current = null;
      if (td.moved && onTableMove) onTableMove(td.tid, td.cx0 + tx, td.cy0 + ty);
      else selectTable(td.el);   // a click (no drag) selects the table
      return;
    }
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (ptrs.current.size === 1) {
      const [only] = [...ptrs.current.values()];
      pan.current = { x: only.x, y: only.y, tx: tRef.current.x, ty: tRef.current.y };
    } else if (ptrs.current.size === 0) pan.current = null;
  }
  // double-click a header → rename table, a field row → rename field; else toggle fit ↔ 100%
  function onDblClick(e: React.MouseEvent) {
    if ((onRenameTable || onRenameField) && toolRef.current === "select") {
      const el = (e.target as Element)?.closest?.(".er-table") as SVGGraphicsElement | null;
      const p = el ? toSvg(e.clientX, e.clientY) : null;
      if (el && p) {
        const b = tableBox(el);
        if (p[1] < b.y + ER_HEADER_H) { beginEditTable(el); return; }
        const f = fieldAt(p[0], p[1]);
        if (f) { beginEditField(el, f.row, f.col); return; }
      }
    }
    const vp = vpRef.current!;
    if (Math.abs(tRef.current.z - 1) < 0.01) { userAdjusted.current = false; fit(); }
    else zoomAt(1 / tRef.current.z, vp.clientWidth / 2, vp.clientHeight / 2);
  }
  const center = (factor: number) => { const vp = vpRef.current!; zoomAt(factor, vp.clientWidth / 2, vp.clientHeight / 2); };

  return (
    <div id="preview" ref={vpRef} data-ertool={tool}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onPointerLeave={() => { if (!link.current && !tdrag.current) showHandles(null); }}
      onDoubleClick={onDblClick}>
      <div className="pv-stage" ref={stageRef} style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.z})` }} dangerouslySetInnerHTML={{ __html: svg }} />
      {editing && (
        <input ref={editRef} className="er-inline-edit" autoFocus spellCheck={false}
          style={{ left: editing.x, top: editing.y, width: Math.max(60, editing.w), height: Math.max(20, editing.h) }}
          value={editing.value}
          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
          onBlur={(e) => commitEdit(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit(e.currentTarget.value); } else if (e.key === "Escape") { e.preventDefault(); setEditing(null); } }}
          onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} />
      )}
      <div className="pv-controls" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <button onClick={() => center(1 / 1.2)} title="Zoom out" aria-label="Zoom out"><Minus size={15} strokeWidth={2.2} /></button>
        <button className="pv-pct" onClick={() => center(1 / tRef.current.z)} title="Reset to 100%">{Math.round(t.z * 100)}%</button>
        <button onClick={() => center(1.2)} title="Zoom in" aria-label="Zoom in"><Plus size={15} strokeWidth={2.2} /></button>
        <button onClick={() => { userAdjusted.current = false; fit(); }} title="Fit to view" aria-label="Fit to view"><Maximize2 size={15} strokeWidth={2.1} /></button>
      </div>
    </div>
  );
}
