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
import type { Editor, Shape } from "../../../../packages/js-canvas/dist/index.js";

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

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

/** Re-compute on every store change (coarse reactivity — §5.4 MVP). */
export function useValue<T>(_name: string, compute: () => T, _deps: unknown[]): T {
  const editor = useEditor();
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => editor.store.listen(() => force()), [editor]);
  return compute();
}

/** A positioned host `<div>` for a shape's component (tldraw's HTMLContainer). */
export function HTMLContainer({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>;
}

/** Only `kymo-node` is interactive (the only shape with a `.kymo` position). */
const isDraggable = (type: string): boolean => type === "kymo-node";

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
}

interface EngineCanvasProps {
  editor: Editor;
  shapeUtils: RenderUtil[];
  /** Zoom-to-fit once on mount. False when a persisted camera was restored. */
  autoFit?: boolean;
  /** Called after a camera change (pan/zoom) so the host can persist it. */
  onChange?: () => void;
  children?: ReactNode;
}

/**
 * The viewport: a clip box holding a camera-transformed container
 * (`screen = (page + cam) * z`, §8.1) with one positioned wrapper per shape.
 */
export function EngineCanvas({ editor, shapeUtils, autoFit = true, onChange, children }: EngineCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fittedFor = useRef<Editor | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const [, force] = useReducer((n: number) => n + 1, 0);

  // Re-render on store changes (drags write the store; sync re-applies it).
  useEffect(() => editor.store.listen(() => force()), [editor]);

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
      force();
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
    const dx = p.x - g.startSx;
    const dy = p.y - g.startSy;
    if (!g.moved && Math.hypot(dx, dy) < 3) return; // click threshold
    g.moved = true;
    if (g.downId && g.downType && isDraggable(g.downType)) {
      editor.updateShape({ id: g.downId as Shape["id"], type: g.downType, x: g.ox + dx / g.z, y: g.oy + dy / g.z });
    } else {
      editor.setCamera({ x: g.camX + dx / g.z, y: g.camY + dy / g.z, z: g.z });
      onChange?.(); // camera panned → persist (debounced)
    }
    force();
  };

  const endGesture = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    if (viewportRef.current?.hasPointerCapture(e.pointerId)) viewportRef.current.releasePointerCapture(e.pointerId);
    if (!g.moved) {
      // A click: select the shape under the pointer, or clear.
      editor.select(g.downId ? [g.downId as Shape["id"]] : []);
      force();
    }
  };

  const utils = new Map(shapeUtils.map((u) => [u.type, u]));
  const cam = editor.getCamera();

  const boundsOf = (shape: Shape) => {
    const util = utils.get(shape.type);
    if (util?.getGeometry) return util.getGeometry(shape).bounds;
    return { x: 0, y: 0, w: num(shape.props.w), h: num(shape.props.h) };
  };

  return (
    <EditorContext.Provider value={editor}>
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "none" }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transformOrigin: "0 0",
            transform: `scale(${cam.z}) translate(${cam.x}px, ${cam.y}px)`,
          }}
        >
          {editor.getCurrentPageShapes().map((shape) => {
            const util = utils.get(shape.type);
            if (!util) return null;
            const draggable = isDraggable(shape.type);
            const b = draggable ? boundsOf(shape) : null;
            return (
              <div
                key={shape.id}
                data-shape-id={shape.id}
                data-shape-type={shape.type}
                style={{
                  position: "absolute",
                  transform: `translate(${shape.x}px, ${shape.y}px)`,
                  ...(draggable && b
                    ? { width: b.w, height: b.h, pointerEvents: "auto", cursor: "grab" }
                    : { pointerEvents: "none" }),
                }}
              >
                {util.component(shape)}
              </div>
            );
          })}

          {editor.getSelectedShapeIds().map((id) => {
            const s = editor.getShape(id);
            if (!s) return null;
            const b = boundsOf(s);
            return (
              <div
                key={`sel-${id}`}
                style={{
                  position: "absolute",
                  transform: `translate(${s.x + b.x}px, ${s.y + b.y}px)`,
                  width: b.w,
                  height: b.h,
                  border: `${1.5 / cam.z}px solid #3b82f6`,
                  boxSizing: "border-box",
                  pointerEvents: "none",
                }}
              />
            );
          })}
        </div>
        {children}
      </div>
    </EditorContext.Provider>
  );
}
