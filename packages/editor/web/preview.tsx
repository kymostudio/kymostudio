import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";

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
export function Preview({ svg, fitKey }: { svg: string; fitKey: string }) {
  const vpRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<T>({ z: 1, x: 0, y: 0 });
  const tRef = useRef(t); tRef.current = t;
  const userAdjusted = useRef(false);
  const fitKeyRef = useRef(fitKey);

  const fit = useCallback(() => {
    const vp = vpRef.current; if (!vp) return;
    const size = svgSize(svg); if (!size) return;
    const cw = vp.clientWidth, ch = vp.clientHeight; if (!cw || !ch) return;
    const z = clampZ(Math.min(cw / size.w, ch / size.h) * FIT_PAD);
    setT({ z, x: (cw - size.w * z) / 2, y: (ch - size.h * z) / 2 });
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
  const rel = (e: React.PointerEvent) => {
    const r = vpRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function onPointerDown(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
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
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (ptrs.current.size === 1) {
      const [only] = [...ptrs.current.values()];
      pan.current = { x: only.x, y: only.y, tx: tRef.current.x, ty: tRef.current.y };
    } else if (ptrs.current.size === 0) pan.current = null;
  }
  // double-click toggles fit ↔ 100%
  function onDblClick() {
    const vp = vpRef.current!;
    if (Math.abs(tRef.current.z - 1) < 0.01) { userAdjusted.current = false; fit(); }
    else zoomAt(1 / tRef.current.z, vp.clientWidth / 2, vp.clientHeight / 2);
  }
  const center = (factor: number) => { const vp = vpRef.current!; zoomAt(factor, vp.clientWidth / 2, vp.clientHeight / 2); };

  return (
    <div id="preview" ref={vpRef}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onDoubleClick={onDblClick}>
      <div className="pv-stage" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.z})` }} dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="pv-controls" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <button onClick={() => center(1 / 1.2)} title="Zoom out" aria-label="Zoom out"><Minus size={15} strokeWidth={2.2} /></button>
        <button className="pv-pct" onClick={() => center(1 / tRef.current.z)} title="Reset to 100%">{Math.round(t.z * 100)}%</button>
        <button onClick={() => center(1.2)} title="Zoom in" aria-label="Zoom in"><Plus size={15} strokeWidth={2.2} /></button>
        <button onClick={() => { userAdjusted.current = false; fit(); }} title="Fit to view" aria-label="Fit to view"><Maximize2 size={15} strokeWidth={2.1} /></button>
      </div>
    </div>
  );
}
