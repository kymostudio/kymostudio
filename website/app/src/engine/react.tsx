/**
 * canvas-engine Phase 5 — React bindings + the DOM render loop
 * (DESIGN-ENGINE-001 §8.2, §9.4; FR-EN-04/FR-EN-08). Lives in the app (not the
 * headless `packages/js-canvas`) because it is React/DOM-coupled. Read-only:
 * it draws the engine's shapes under a camera transform; interaction is Phase 6.
 */
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Editor, Shape } from "../../../../packages/js-canvas/dist/index.js";

/** The slice of a shape util the render loop needs. */
export interface RenderUtil {
  type: string;
  component(shape: Shape): ReactNode;
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

interface EngineCanvasProps {
  editor: Editor;
  shapeUtils: RenderUtil[];
  children?: ReactNode;
}

/**
 * The viewport: a full-size clip box holding a camera-transformed container
 * (`screen = (page + cam) * z`, §8.1) with one positioned wrapper per shape.
 * Shapes whose type has no registered util are skipped.
 */
export function EngineCanvas({ editor, shapeUtils, children }: EngineCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fittedFor = useRef<Editor | null>(null);
  const [, force] = useReducer((n: number) => n + 1, 0);

  // Re-render on store changes (read-only Phase 5: fires once at build).
  useEffect(() => editor.store.listen(() => force()), [editor]);

  // Measure the viewport, fit once per editor (before paint → no flash),
  // and re-fit on resize.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const fit = () => {
      editor.setViewportSize({ w: el.clientWidth, h: el.clientHeight });
      editor.zoomToFit();
      force();
    };
    if (fittedFor.current !== editor) {
      fittedFor.current = editor;
      fit();
    }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [editor]);

  const utils = new Map(shapeUtils.map((u) => [u.type, u]));
  const cam = editor.getCamera();

  return (
    <EditorContext.Provider value={editor}>
      <div ref={viewportRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
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
            return (
              <div key={shape.id} style={{ position: "absolute", transform: `translate(${shape.x}px, ${shape.y}px)` }}>
                {util.component(shape)}
              </div>
            );
          })}
        </div>
        {children}
      </div>
    </EditorContext.Provider>
  );
}
