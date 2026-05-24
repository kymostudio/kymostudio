/**
 * canvas-engine Phase 5/6 — the board behind `?engine=native`. A persistent
 * engine Store+Editor with the same two-way flow as the tldraw `Board.tsx`:
 *   - sync (text→canvas): diff-apply `diagramToShapes` inside
 *     `run(fn, { history:"ignore" })` → `source:"remote"` → no echo.
 *   - writeback (canvas→text): a user drag is `source:"user"` → the scoped
 *     listener fires → `patchPositions` → `onPatch`.
 * The store's source filter + the genuine-delta filter keep it from oscillating.
 */
import { useEffect, useRef, useState } from "react";
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
import { EngineCanvas, type Tool, type ViewApi } from "./react";
import { boardToSvg } from "./export";
import { loadSnapshot, saveSnapshot } from "./persist";
import { KymoNodeEngineUtil, KymoDiagramEngineUtil, KymoRegionEngineUtil, KymoEdgeEngineUtil, FreedrawEngineUtil, KymoNoteEngineUtil, KymoTextEngineUtil } from "./shapes";

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const utils = [new KymoNodeEngineUtil(), new KymoDiagramEngineUtil(), new KymoRegionEngineUtil(), new KymoEdgeEngineUtil(), new FreedrawEngineUtil(), new KymoNoteEngineUtil(), new KymoTextEngineUtil()];
const EMBED_ID = createShapeId("kymo-diagram");

interface EngineBoardProps {
  diagram: Diagram | null;
  svg: string;
  w: number;
  h: number;
  isBpmn: boolean;
  source: string;
  onPatch: (text: string) => void;
  /** Hands the host a board→SVG exporter once the editor is live (FR-J-03). */
  onReady?: (exportSvg: () => Promise<string>) => void;
  /** Hands the host the live `Editor` (canvas-studio `FR-CS-02`: top-bar undo/redo).
   *  The editor outlives the canvas mount. */
  onEditorReady?: (editor: Editor) => void;
  /** Hands the host the canvas zoom/fit API (canvas-studio `FR-CS-06`, status bar). */
  onViewReady?: (api: ViewApi) => void;
  /** Active canvas tool (canvas-jam `FR-J-05`+): `select` (default), `draw`, `sticky`. */
  tool?: Tool;
  /** Click-to-place tools call this to revert the host's tool to `select`. */
  onToolReset?: () => void;
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

export function EngineBoard({ diagram, svg, w, h, isBpmn, source, onPatch, onReady, onEditorReady, onViewReady, tool, onToolReset }: EngineBoardProps) {
  const editorRef = useRef<Editor | null>(null);
  if (!editorRef.current) editorRef.current = new Editor(new Store(), { shapeUtils: utils });
  const editor = editorRef.current;

  const dataRef = useRef({ diagram, svg, w, h, isBpmn, source, onPatch });
  dataRef.current = { diagram, svg, w, h, isBpmn, source, onPatch };
  const applyingRef = useRef(false);
  const writebackId = useRef<number | undefined>(undefined);
  // Persistence: gate the canvas on the (async) snapshot load; honor a restored
  // camera (→ no auto-fit). The fit itself now lives in <EngineCanvas>.
  const [loaded, setLoaded] = useState(false);
  const restoredRef = useRef(false);

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
  };

  // Persist the camera (+ future freeform shapes) — debounced inside saveSnapshot.
  const scheduleSave = () => {
    saveSnapshot({
      camera: editor.getCamera(),
      freeform: editor.getCurrentPageShapes().filter((s) => (s.meta as { kymo?: unknown })?.kymo == null),
    });
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

  // Mount once: restore the persisted snapshot (camera + freeform), then unblock
  // the canvas. A restored camera suppresses the auto-fit.
  useEffect(() => {
    let alive = true;
    void loadSnapshot().then((snap) => {
      if (!alive) return;
      if (snap?.camera) {
        editor.setCamera(snap.camera);
        restoredRef.current = true;
      }
      // Restore freeform shapes (draw/sticky/text — no `meta.kymo`). `history:"ignore"`
      // (source defaults to "remote") so they neither enter undo nor echo to the writeback.
      const freeform = (snap?.freeform ?? []) as ShapePartial[];
      if (freeform.length) editor.run(() => { for (const s of freeform) editor.createShape(s); }, { history: "ignore" });
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Mount once: the user-driven writeback listener (debounced).
  useEffect(() => {
    const unsub = editor.store.listen(
      () => {
        if (applyingRef.current) return;
        scheduleSave(); // persist freeform strokes (+ camera) on any user edit
        window.clearTimeout(writebackId.current);
        writebackId.current = window.setTimeout(() => writeback(editor), 200);
      },
      { scope: "document", source: "user" },
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Mount once: keyboard undo/redo (`FR-J-02`). Document-level so it works while
  // the canvas has focus; skipped when a text field is focused so the `.kymo`
  // <textarea> keeps its native Cmd+Z (the two undo domains stay separate). The
  // undo write is `source:"user"` → the writeback listener above round-trips the text.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = document.activeElement as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        editor.redo();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Mount once: hand the host a board→SVG exporter bound to this editor (FR-J-03)
  // and the live editor itself (canvas-studio top-bar undo/redo, FR-CS-02).
  useEffect(() => {
    onReady?.(() => boardToSvg(editor, utils));
    onEditorReady?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Re-sync whenever the diagram changes (incl. the initial mount).
  useEffect(() => {
    sync(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram, svg, w, h, isBpmn]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      {loaded && <EngineCanvas editor={editor} shapeUtils={utils} autoFit={!restoredRef.current} onChange={scheduleSave} tool={tool} onToolReset={onToolReset} onViewReady={onViewReady} />}
    </div>
  );
}
