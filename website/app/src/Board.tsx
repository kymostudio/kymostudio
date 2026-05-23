/**
 * The tldraw board (Phase 1). Hosts the freeform whiteboard (tldraw's own
 * tools: select, sticky note, draw, frames, …) plus a single `kymo-diagram`
 * shape that mirrors the live SVG. Editing is still text-only — the `svg`/`w`/
 * `h` props flow in and the diagram shape is updated in place.
 *
 * RK-02 (license): `LICENSE_KEY` is empty → tldraw runs in dev mode (watermark
 * + a console warning). Pick a Hobby (free, watermark) or Business (paid)
 * licence before the public deploy and set it here.
 */
import { useCallback, useEffect, useRef } from "react";
import { Tldraw, createShapeId, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { KymoDiagramShapeUtil, type KymoDiagramShape } from "./KymoDiagramShape";

const LICENSE_KEY = ""; // RK-02 — set before public deploy
const SHAPE_ID = createShapeId("kymo-diagram");
const shapeUtils = [KymoDiagramShapeUtil];

interface BoardProps {
  svg: string;
  w: number;
  h: number;
}

export function Board({ svg, w, h }: BoardProps) {
  const editorRef = useRef<Editor | null>(null);
  const dataRef = useRef({ svg, w, h }); // always the latest props (avoids stale closures)
  dataRef.current = { svg, w, h };
  const fittedRef = useRef(false);

  // Create-or-update the single diagram shape from the latest SVG, and zoom to
  // fit once — the first time real content arrives (tldraw mounts async, so the
  // initial render may still have an empty SVG).
  const sync = useCallback((editor: Editor) => {
    const d = dataRef.current;
    if (editor.getShape(SHAPE_ID)) {
      editor.updateShape<KymoDiagramShape>({ id: SHAPE_ID, type: "kymo-diagram", props: d });
    } else {
      editor.createShape<KymoDiagramShape>({ id: SHAPE_ID, type: "kymo-diagram", x: 0, y: 0, props: d });
    }
    if (!fittedRef.current && d.svg) {
      editor.zoomToFit();
      fittedRef.current = true;
    }
  }, []);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      sync(editor);
    },
    [sync],
  );

  useEffect(() => {
    if (editorRef.current) sync(editorRef.current);
  }, [svg, w, h, sync]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <Tldraw
        licenseKey={LICENSE_KEY || undefined}
        shapeUtils={shapeUtils}
        onMount={handleMount}
      />
    </div>
  );
}
