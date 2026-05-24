/**
 * canvas-engine Phase 5/6 — the board behind `?engine=native`. A persistent
 * engine Store+Editor with the same two-way flow as the tldraw `Board.tsx`:
 *   - sync (text→canvas): diff-apply `diagramToShapes` inside
 *     `run(fn, { history:"ignore" })` → `source:"remote"` → no echo.
 *   - writeback (canvas→text): a user drag is `source:"user"` → the scoped
 *     listener fires → `patchPositions` → `onPatch`.
 * The store's source filter + the genuine-delta filter keep it from oscillating.
 */
import { useEffect, useRef } from "react";
import {
  Store,
  Editor,
  createShapeId,
  type Shape,
  type ShapePartial,
} from "../../../../packages/js-canvas/dist/index.js";
import type { Diagram } from "../../../../packages/js/dist/index.js";
import { diagramToShapes } from "../diagramToShapes";
import { patchPositions, type XY } from "../patchDsl";
import { EngineCanvas } from "./react";
import { KymoNodeEngineUtil, KymoDiagramEngineUtil, GeoEngineUtil, ArrowEngineUtil } from "./shapes";

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const utils = [new KymoNodeEngineUtil(), new KymoDiagramEngineUtil(), new GeoEngineUtil(), new ArrowEngineUtil()];
const EMBED_ID = createShapeId("kymo-diagram");

interface EngineBoardProps {
  diagram: Diagram | null;
  svg: string;
  w: number;
  h: number;
  isBpmn: boolean;
  source: string;
  onPatch: (text: string) => void;
}

const kymoShapes = (editor: Editor): Shape[] =>
  editor.getCurrentPageShapes().filter((s) => (s.meta as { kymo?: unknown })?.kymo != null);

function syncEmbed(editor: Editor, svg: string, w: number, h: number): void {
  const elems = kymoShapes(editor).map((s) => s.id);
  if (elems.length) editor.deleteShapes(elems);
  if (editor.getShape(EMBED_ID)) {
    editor.updateShape({ id: EMBED_ID, type: "kymo-diagram", props: { w, h, svg } });
  } else if (svg) {
    editor.createShape({ id: EMBED_ID, type: "kymo-diagram", x: 0, y: 0, props: { w, h, svg } });
  }
}

function syncElements(editor: Editor, diagram: Diagram): void {
  if (editor.getShape(EMBED_ID)) editor.deleteShape(EMBED_ID);
  const partials = diagramToShapes(diagram) as unknown as ShapePartial[];
  const desired = new Set(partials.map((p) => p.id));
  const existing = kymoShapes(editor);
  const existingIds = new Set(existing.map((s) => s.id));

  const toDelete = existing.filter((s) => !desired.has(s.id)).map((s) => s.id);
  if (toDelete.length) editor.deleteShapes(toDelete);
  const toCreate = partials.filter((p) => !existingIds.has(p.id));
  if (toCreate.length) editor.createShapes(toCreate);
  for (const p of partials) if (existingIds.has(p.id)) editor.updateShape(p);
}

export function EngineBoard({ diagram, svg, w, h, isBpmn, source, onPatch }: EngineBoardProps) {
  const editorRef = useRef<Editor | null>(null);
  if (!editorRef.current) editorRef.current = new Editor(new Store(), { shapeUtils: utils });
  const editor = editorRef.current;

  const dataRef = useRef({ diagram, svg, w, h, isBpmn, source, onPatch });
  dataRef.current = { diagram, svg, w, h, isBpmn, source, onPatch };
  const fittedRef = useRef(false);
  const applyingRef = useRef(false);
  const writebackId = useRef<number | undefined>(undefined);

  // text → canvas (diff sync), loop-guarded by `history:"ignore"` (source:remote).
  const sync = (ed: Editor) => {
    const d = dataRef.current;
    applyingRef.current = true;
    ed.run(
      () => {
        if (d.isBpmn || !d.diagram) syncEmbed(ed, d.svg, d.w, d.h);
        else syncElements(ed, d.diagram);
      },
      { history: "ignore" },
    );
    queueMicrotask(() => {
      applyingRef.current = false;
    });
    if (!fittedRef.current && (d.svg || d.diagram)) {
      ed.zoomToFit();
      fittedRef.current = true;
    }
  };

  // canvas → text (genuine-delta filter; mirrors Board.tsx).
  const writeback = (ed: Editor) => {
    const d = dataRef.current;
    if (!d.diagram || d.isBpmn) return;
    const byId = new Map(d.diagram.components.map((c) => [c.id, c]));
    const moves = new Map<string, XY>();
    for (const s of kymoShapes(ed)) {
      const meta = (s.meta as { kymo?: { id?: string; kind?: string } }).kymo;
      if (!meta || meta.kind !== "node" || !meta.id) continue;
      const comp = byId.get(meta.id);
      if (!comp) continue;
      const cx = s.x + num(s.props.w) / 2;
      const cy = s.y + num(s.props.h) / 2;
      if (Math.abs(cx - comp.pos[0]) > 1 || Math.abs(cy - comp.pos[1]) > 1) moves.set(meta.id, { x: cx, y: cy });
    }
    if (moves.size) d.onPatch(patchPositions(d.source, moves));
  };

  // Mount once: the user-driven writeback listener (debounced).
  useEffect(() => {
    const unsub = editor.store.listen(
      () => {
        if (applyingRef.current) return;
        window.clearTimeout(writebackId.current);
        writebackId.current = window.setTimeout(() => writeback(editor), 200);
      },
      { scope: "document", source: "user" },
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Re-sync whenever the diagram changes (incl. the initial mount).
  useEffect(() => {
    sync(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram, svg, w, h, isBpmn]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <EngineCanvas editor={editor} shapeUtils={utils} />
    </div>
  );
}
