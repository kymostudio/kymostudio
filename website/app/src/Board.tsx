/**
 * The tldraw board. Phase 2: one tldraw shape per kymo element (Component →
 * `kymo-node`, Region → `geo`, Edge → `arrow`), kept in sync from the parsed
 * `Diagram` via a diff (create/update/delete by deterministic id). BPMN diagrams
 * fall back to the Phase-1 single-embed `kymo-diagram` shape. Freeform shapes
 * (no `meta.kymo`) are never touched. Text is still the source of truth.
 *
 * RK-02: `LICENSE_KEY` empty → tldraw dev mode (watermark). Set before deploy.
 */
import { useCallback, useEffect, useRef } from "react";
import { Tldraw, createShapeId, type Editor, type TLShape } from "tldraw";
import "tldraw/tldraw.css";
import type { Diagram } from "../../../packages/js/dist/index.js";
import { KymoNodeShapeUtil } from "./KymoNodeShape";
import { KymoDiagramShapeUtil, type KymoDiagramShape } from "./KymoDiagramShape";
import { diagramToShapes } from "./diagramToShapes";
import { Inspector } from "./Inspector";

const LICENSE_KEY = ""; // RK-02 — set before public deploy
const EMBED_ID = createShapeId("kymo-diagram");
const shapeUtils = [KymoNodeShapeUtil, KymoDiagramShapeUtil];

interface BoardProps {
  diagram: Diagram | null;
  svg: string;
  w: number;
  h: number;
  isBpmn: boolean;
}

const kymoShapes = (editor: Editor): TLShape[] =>
  editor.getCurrentPageShapes().filter((s) => (s.meta as { kymo?: unknown })?.kymo != null);

/** BPMN (or no diagram): keep a single embedded SVG shape, drop per-element shapes. */
function syncEmbed(editor: Editor, svg: string, w: number, h: number): void {
  const elems = kymoShapes(editor).map((s) => s.id);
  if (elems.length) editor.deleteShapes(elems);
  if (editor.getShape(EMBED_ID)) {
    editor.updateShape<KymoDiagramShape>({ id: EMBED_ID, type: "kymo-diagram", props: { w, h, svg } });
  } else if (svg) {
    editor.createShape<KymoDiagramShape>({ id: EMBED_ID, type: "kymo-diagram", x: 0, y: 0, props: { w, h, svg } });
  }
}

/** DSL: one shape per element; diff against the current kymo-layer shapes. */
function syncElements(editor: Editor, diagram: Diagram): void {
  if (editor.getShape(EMBED_ID)) editor.deleteShape(EMBED_ID);
  const partials = diagramToShapes(diagram);
  const desired = new Set(partials.map((p) => p.id));
  const existing = kymoShapes(editor);
  const existingIds = new Set(existing.map((s) => s.id));

  const toDelete = existing.filter((s) => !desired.has(s.id)).map((s) => s.id);
  if (toDelete.length) editor.deleteShapes(toDelete);

  const toCreate = partials.filter((p) => !existingIds.has(p.id));
  if (toCreate.length) editor.createShapes(toCreate);

  for (const p of partials) if (existingIds.has(p.id)) editor.updateShape(p);
}

export function Board({ diagram, svg, w, h, isBpmn }: BoardProps) {
  const editorRef = useRef<Editor | null>(null);
  const dataRef = useRef({ diagram, svg, w, h, isBpmn });
  dataRef.current = { diagram, svg, w, h, isBpmn };
  const fittedRef = useRef(false);

  const sync = useCallback((editor: Editor) => {
    const d = dataRef.current;
    editor.run(
      () => {
        if (d.isBpmn || !d.diagram) syncEmbed(editor, d.svg, d.w, d.h);
        else syncElements(editor, d.diagram);
      },
      { history: "ignore" },
    );
    if (!fittedRef.current && (d.svg || d.diagram)) {
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
  }, [diagram, svg, w, h, isBpmn, sync]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <Tldraw licenseKey={LICENSE_KEY || undefined} shapeUtils={shapeUtils} onMount={handleMount}>
        <Inspector />
      </Tldraw>
    </div>
  );
}
