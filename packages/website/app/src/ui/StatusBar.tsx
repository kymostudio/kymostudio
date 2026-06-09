/**
 * ui/StatusBar.tsx — canvas-studio P6 (FR-CS-06).
 *
 * The status strip at the bottom of the canvas: node/edge counts, an autosave
 * indicator, and zoom −/%/+ + Fit controls. A **sibling** of <EngineBoard> under
 * .canvas-wrap, so its re-renders never touch the canvas shape layer. The live
 * zoom % is polled from the engine view API (200 ms, setState-on-change) — so
 * wheel-zoom updates the readout without re-rendering the canvas (NFR-CS-02).
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import type { ViewApi } from "../engine/react";
import { Layers, Minus, Plus, Frame } from "./icons";

export interface StatusBarProps {
  viewApi: RefObject<ViewApi | null>;
  nodes: number;
  edges: number;
  /** Changes when the document is edited → flips the autosave indicator. */
  savingKey: string;
}

export function StatusBar({ viewApi, nodes, edges, savingKey }: StatusBarProps) {
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);

  // Poll the live zoom — isolated to StatusBar (setState only on change), so a
  // wheel-zoom updates the readout without re-rendering EngineBoard/the shapes.
  useEffect(() => {
    const id = window.setInterval(() => {
      const z = viewApi.current?.getZoom();
      if (typeof z === "number") setZoom((prev) => (Math.abs(prev - z) > 1e-3 ? z : prev));
    }, 200);
    return () => window.clearInterval(id);
  }, [viewApi]);

  // Autosave: an edit → "Saving…", then 700 ms idle → "Saved". Honest — the app
  // debounce-persists source→URL and camera/freeform→IndexedDB. Skip the mount.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaving(true);
    const id = window.setTimeout(() => setSaving(false), 700);
    return () => window.clearTimeout(id);
  }, [savingKey]);

  const syncZoom = () => {
    const z = viewApi.current?.getZoom();
    if (typeof z === "number") setZoom(z);
  };
  const onZoomIn = () => { viewApi.current?.zoomIn(); syncZoom(); };
  const onZoomOut = () => { viewApi.current?.zoomOut(); syncZoom(); };
  const onFit = () => { viewApi.current?.fit(); syncZoom(); };

  return (
    <div className="k-statusbar">
      <div className="k-chip" data-testid="status-counts">
        <Layers size={13} />
        <span>{nodes} nodes · {edges} edges</span>
      </div>
      <div className="k-chip">
        <span className="dot" style={{ color: saving ? "var(--accent-2)" : "#4ade80" }}>●</span>
        {saving ? "Saving…" : "Saved"}
      </div>
      <div style={{ marginLeft: "auto" }} />
      <div className="k-chip k-chip--zoom">
        <button data-testid="status-zoom-out" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}>
          <Minus size={13} />
        </button>
        <span data-testid="status-zoom" className="pct">{Math.round(zoom * 100)}%</span>
        <button data-testid="status-zoom-in" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}>
          <Plus size={13} />
        </button>
        <span className="bar" />
        <button data-testid="status-zoom-fit" title="Zoom to fit" aria-label="Zoom to fit" onClick={onFit}>
          <Frame size={13} />
        </button>
      </div>
    </div>
  );
}
