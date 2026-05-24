/**
 * canvas-engine Phase 5/6 — React bindings, the DOM render loop, and pointer
 * interaction (DESIGN-ENGINE-001 §8.2, §9.4; FR-EN-04/05/08). Lives in the app
 * (React/DOM-coupled); the headless core stays in `packages/js-canvas`.
 *
 * Phase 6 adds interaction: drag a `kymo-node` (→ `source:"user"` store write →
 * the round-trip writeback), pan on empty-drag, wheel-zoom toward the cursor,
 * click-to-select with an indicator outline.
 */
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createShapeId, type Editor, type Shape, type ShapeId } from "../../../../packages/js-canvas/dist/index.js";

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/** The draw tool's default stroke (mirrors `shapes.tsx`; inlined to avoid a
 *  circular import — `shapes.tsx` imports `HTMLContainer` from this module). */
const DRAW_COLOR = "#1e293b";
const DRAW_SIZE = 3;

/** Which tool owns the pointer (canvas-jam `DESIGN-JAM-001` §7). `select` is the
 *  default; `draw` creates freeform `freedraw` strokes. */
export type Tool = "select" | "draw";

/** The slice of a shape util the render loop needs. */
export interface RenderUtil {
  type: string;
  component(shape: Shape): ReactNode;
  getGeometry?(shape: Shape): { bounds: { x: number; y: number; w: number; h: number } };
}

const EditorContext = createContext<Editor | null>(null);

export function useEditor(): Editor {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error("useEditor must be used inside <EngineCanvas>");
  return editor;
}

/** A positioned host `<div>` for a shape's component (tldraw's HTMLContainer). */
export function HTMLContainer({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>;
}

/** Only `kymo-node` is interactive (the only shape with a `.kymo` position). */
const isDraggable = (type: string): boolean => type === "kymo-node";

/** A shape's local bounds — from its util's geometry, else its `w`/`h` props. */
function boundsOf(util: RenderUtil | undefined, shape: Shape): { x: number; y: number; w: number; h: number } {
  if (util?.getGeometry) return util.getGeometry(shape).bounds;
  return { x: 0, y: 0, w: num(shape.props.w), h: num(shape.props.h) };
}

/**
 * One shape's positioned wrapper (`DESIGN-ENGINE-001` §5.4 per-record reactivity,
 * `RK-EN-04`). Subscribes to the store for **just its own id** — "subscribe to
 * all, filter to mine" — so a drag re-renders ONLY the moved shape, never the
 * whole list. The parent (`EngineCanvas`) re-renders only on structural changes
 * (add/remove) + selection, so it never re-renders during a drag.
 *
 * NB: do NOT wrap this in `memo` — selection state lives outside props
 * (`editor.getSelectedShapeIds()`), so a shallow-prop memo would block the
 * click-select re-render and break the selection-outline follow.
 */
function ShapeView({
  editor,
  util,
  shapeId,
  draggable,
}: {
  editor: Editor;
  util: RenderUtil;
  shapeId: Shape["id"];
  draggable: boolean;
}) {
  // Test seam (no-op unless a bench/E2E sets `window.__kymoBench`): counts each
  // shape render and tallies which ids rendered. The counter lives HERE, not in
  // EngineCanvas, because per-record reactivity means the parent no longer
  // re-renders on a drag — only the moved ShapeView does. The render-count guard
  // asserts pan/zoom → 0 shape renders, and a single-node drag → only that id.
  if (typeof window !== "undefined" && (window as { __kymoBench?: boolean }).__kymoBench) {
    const w = window as { __kymoRenders?: number; __kymoRenderedIds?: Set<string> };
    w.__kymoRenders = (w.__kymoRenders ?? 0) + 1;
    (w.__kymoRenderedIds ??= new Set<string>()).add(String(shapeId));
  }

  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(
    () =>
      editor.store.listen((e) => {
        if (
          e.updated.some((u) => u.to.id === shapeId) ||
          e.added.some((s) => s.id === shapeId) ||
          e.removed.some((s) => s.id === shapeId)
        )
          force();
      }),
    [editor, shapeId],
  );

  const shape = editor.getShape(shapeId);
  if (!shape) return null; // transient: our id is mid-removal (the parent drops us next render)
  const cam = editor.getCamera();
  const b = boundsOf(util, shape);
  const selected = draggable && editor.getSelectedShapeIds().includes(shapeId);
  return (
    <div
      data-shape-id={shape.id}
      data-shape-type={shape.type}
      style={{
        position: "absolute",
        transform: `translate(${shape.x}px, ${shape.y}px)`,
        ...(draggable
          ? { width: b.w, height: b.h, pointerEvents: "auto", cursor: "grab" }
          : { pointerEvents: "none" }),
      }}
    >
      {util.component(shape)}
      {selected && (
        // Selection outline rides inside the wrapper (already translated to
        // shape.x/y), so it follows the node frame-for-frame during a drag.
        <div
          style={{
            position: "absolute",
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h,
            border: `${1.5 / cam.z}px solid #3b82f6`,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

interface Gesture {
  downId: string | null;
  downType: string | null;
  startSx: number;
  startSy: number;
  ox: number;
  oy: number;
  camX: number;
  camY: number;
  z: number;
  moved: boolean;
  /** Set when the draw tool owns this gesture: the in-progress freedraw stroke
   *  (`ox/oy` = page-space origin; `pts` = points relative to it). */
  draw?: { id: ShapeId; ox: number; oy: number; pts: { x: number; y: number }[] };
}

interface EngineCanvasProps {
  editor: Editor;
  shapeUtils: RenderUtil[];
  /** Zoom-to-fit once on mount. False when a persisted camera was restored. */
  autoFit?: boolean;
  /** Called after a camera change (pan/zoom) so the host can persist it. */
  onChange?: () => void;
  /** Active tool (default `select`). `draw` makes a pointer-drag a freedraw stroke. */
  tool?: Tool;
  children?: ReactNode;
}

/**
 * The viewport: a clip box holding a camera-transformed container
 * (`screen = (page + cam) * z`, §8.1) with one positioned wrapper per shape.
 */
export function EngineCanvas({ editor, shapeUtils, autoFit = true, onChange, tool = "select", children }: EngineCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fittedFor = useRef<Editor | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const [, force] = useReducer((n: number) => n + 1, 0);

  // Write the camera transform straight to the DOM. Pan/zoom move the whole
  // shape layer (CSS children of this container) **without** a React re-render
  // of the shape list — so FPS stays flat regardless of shape count (RK-EN-04).
  const applyCamera = () => {
    const el = containerRef.current;
    if (!el) return;
    const c = editor.getCamera();
    el.style.transform = `scale(${c.z}) translate(${c.x}px, ${c.y}px)`;
  };

  // Structural reactivity only: re-render the LIST when shapes are added/removed
  // (membership changed → mount/unmount a ShapeView). Pure updates (a drag) are
  // handled per-record inside ShapeView, so the parent does NOT re-render on them
  // — that's the per-record win (RK-EN-04). Pan/zoom touch neither the store nor
  // `force()` (transform-only via applyCamera), so they stay at 0 re-renders.
  useEffect(
    () =>
      editor.store.listen((e) => {
        if (e.added.length || e.removed.length) force();
      }),
    [editor],
  );

  // Measure the viewport (always), and fit ONCE per editor — only when
  // `autoFit` (a restored camera is honored, matching Board.tsx's fittedRef).
  // Resize only re-measures; it never re-fits (tldraw fits once, then never).
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => editor.setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (autoFit && fittedFor.current !== editor) {
      fittedFor.current = editor;
      editor.zoomToFit();
    }
    force();
    const ro = new ResizeObserver(() => {
      measure();
      force();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [editor, autoFit]);

  // Wheel-zoom toward the cursor (non-passive so we can preventDefault).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      editor.zoomToPoint(editor.getCamera().z * factor, { x: e.clientX - r.left, y: e.clientY - r.top });
      applyCamera(); // transform-only — no shape re-render
      onChange?.();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [editor, onChange]);

  const screenOf = (e: ReactPointerEvent): { x: number; y: number } => {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const p = screenOf(e);
    if (tool === "draw") {
      // Start a freedraw stroke. Built live with `history:"ignore"` (preview only)
      // and sealed as ONE undo step on pointer-up (endGesture). No `meta.kymo` →
      // freeform layer (persists via the snapshot, never enters `.kymo`).
      const pg = editor.screenToPage(p);
      const id = createShapeId();
      editor.run(
        () => editor.createShape({ id, type: "freedraw", x: pg.x, y: pg.y, props: { points: [{ x: 0, y: 0 }], color: DRAW_COLOR, size: DRAW_SIZE }, meta: {} }),
        { source: "user", history: "ignore" },
      );
      gesture.current = { downId: null, downType: null, startSx: p.x, startSy: p.y, ox: 0, oy: 0, camX: 0, camY: 0, z: editor.getCamera().z, moved: false, draw: { id, ox: pg.x, oy: pg.y, pts: [{ x: 0, y: 0 }] } };
      try {
        viewportRef.current!.setPointerCapture(e.pointerId);
      } catch {
        // best-effort
      }
      return;
    }
    const el = (e.target as HTMLElement).closest("[data-shape-id]");
    const downId = el?.getAttribute("data-shape-id") ?? null;
    const downType = el?.getAttribute("data-shape-type") ?? null;
    const shape = downId ? editor.getShape(downId as Shape["id"]) : undefined;
    const cam = editor.getCamera();
    gesture.current = {
      downId,
      downType,
      startSx: p.x,
      startSy: p.y,
      ox: shape?.x ?? 0,
      oy: shape?.y ?? 0,
      camX: cam.x,
      camY: cam.y,
      z: cam.z,
      moved: false,
    };
    try {
      viewportRef.current!.setPointerCapture(e.pointerId);
    } catch {
      // Non-capturable (e.g. synthetic) pointer — capture is best-effort.
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const p = screenOf(e);
    if (g.draw) {
      const pg = editor.screenToPage(p);
      g.draw.pts.push({ x: pg.x - g.draw.ox, y: pg.y - g.draw.oy });
      const id = g.draw.id;
      const points = [...g.draw.pts];
      editor.run(() => editor.updateShape({ id, type: "freedraw", props: { points } }), { source: "user", history: "ignore" });
      g.moved = true;
      return;
    }
    const dx = p.x - g.startSx;
    const dy = p.y - g.startSy;
    if (!g.moved && Math.hypot(dx, dy) < 3) return; // click threshold
    g.moved = true;
    if (g.downId && g.downType && isDraggable(g.downType)) {
      // store write → store.listen() re-renders the moved shape
      editor.updateShape({ id: g.downId as Shape["id"], type: g.downType, x: g.ox + dx / g.z, y: g.oy + dy / g.z });
    } else {
      editor.setCamera({ x: g.camX + dx / g.z, y: g.camY + dy / g.z, z: g.z });
      applyCamera(); // transform-only — no shape re-render
      onChange?.(); // camera panned → persist (debounced)
    }
  };

  const endGesture = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    if (viewportRef.current?.hasPointerCapture(e.pointerId)) viewportRef.current.releasePointerCapture(e.pointerId);
    if (g.draw) {
      // The live stroke was built with `history:"ignore"`; re-stamp the final
      // shape as a single recorded add so one undo removes the whole stroke (and
      // redo restores it in full). The tool stays in `draw` for the next stroke.
      const drawId = g.draw.id;
      const final = editor.getShape(drawId);
      if (final) {
        editor.run(() => editor.deleteShape(drawId), { history: "ignore" });
        editor.run(() => editor.createShape(final), { source: "user", history: "record" });
        editor.mark();
      }
      return;
    }
    if (!g.moved) {
      // A click: select the shape under the pointer, or clear.
      editor.select(g.downId ? [g.downId as Shape["id"]] : []);
      force();
    } else if (g.downId && isDraggable(g.downType ?? "")) {
      // A node drag ended → seal it as a single undo step (FR-J-02); its many
      // per-move writes coalesced into one history entry.
      editor.mark();
    }
  };

  const utils = new Map(shapeUtils.map((u) => [u.type, u]));
  const cam = editor.getCamera();

  return (
    <EditorContext.Provider value={editor}>
      <div
        ref={viewportRef}
        data-testid="engine-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "none", cursor: tool === "draw" ? "crosshair" : undefined }}
      >
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transformOrigin: "0 0",
            transform: `scale(${cam.z}) translate(${cam.x}px, ${cam.y}px)`,
            willChange: "transform", // GPU layer → pan/zoom composite-only, not a repaint of all shapes
          }}
        >
          {editor.getCurrentPageShapes().map((shape) => {
            const util = utils.get(shape.type);
            if (!util) return null;
            // Each shape owns its render (per-record reactivity); the selection
            // outline rides inside ShapeView so it follows a dragged node.
            return (
              <ShapeView
                key={shape.id}
                editor={editor}
                util={util}
                shapeId={shape.id}
                draggable={isDraggable(shape.type)}
              />
            );
          })}
        </div>
        {children}
      </div>
    </EditorContext.Provider>
  );
}
