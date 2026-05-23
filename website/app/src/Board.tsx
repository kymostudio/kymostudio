/**
 * The tldraw board. Phase 2: one tldraw shape per kymo element (diff-synced from
 * the parsed Diagram). Phase 3: the canvas→text round-trip — dragging a
 * `kymo-node` writes its new position back into the `.kymo` text (surgical patch),
 * two-way and loop-guarded. BPMN diagrams use the Phase-1 single-embed fallback.
 * Freeform shapes (no `meta.kymo`) are never touched.
 *
 * Phase 4: the board persists across reloads via tldraw `persistenceKey`. Freeform
 * shapes (sticky/draw) come back verbatim; kymo shapes are re-derived from the
 * `.kymo` text and reconciled by deterministic id (stale ones dropped) — so the
 * diagram always matches the source while the whiteboard layer survives.
 *
 * RK-02: `LICENSE_KEY` empty → renders on localhost only; BLANK on a deployed
 * domain. A (free) key is required before deploy — see the note by `LICENSE_KEY`.
 */
import { useCallback, useEffect, useRef } from "react";
import { Tldraw, createShapeId, type Editor, type TLShape } from "tldraw";
import "tldraw/tldraw.css";
import type { Diagram } from "../../../packages/js/dist/index.js";
import { KymoNodeShapeUtil, type KymoNodeShape } from "./KymoNodeShape";
import { KymoDiagramShapeUtil, type KymoDiagramShape } from "./KymoDiagramShape";
import { diagramToShapes } from "./diagramToShapes";
import { patchPositions, type XY } from "./patchDsl";
import { Inspector } from "./Inspector";

// RK-02: tldraw REQUIRES a license key in production — with no key the canvas
// renders only on localhost and is BLANK on a deployed domain. Set a free
// Hobby/trial key (keeps the "Made with tldraw" watermark) or a Business key
// (removes it) here before deploying.
const LICENSE_KEY = "";
// Phase 4: persist the board (freeform layer + camera) to IndexedDB under this key.
const PERSISTENCE_KEY = "kymo-canvas";
const EMBED_ID = createShapeId("kymo-diagram");
const shapeUtils = [KymoNodeShapeUtil, KymoDiagramShapeUtil];

interface BoardProps {
  diagram: Diagram | null;
  svg: string;
  w: number;
  h: number;
  isBpmn: boolean;
  source: string;
  onPatch: (text: string) => void;
}

const kymoShapes = (editor: Editor): TLShape[] =>
  editor.getCurrentPageShapes().filter((s) => (s.meta as { kymo?: unknown })?.kymo != null);

function syncEmbed(editor: Editor, svg: string, w: number, h: number): void {
  const elems = kymoShapes(editor).map((s) => s.id);
  if (elems.length) editor.deleteShapes(elems);
  if (editor.getShape(EMBED_ID)) {
    editor.updateShape<KymoDiagramShape>({ id: EMBED_ID, type: "kymo-diagram", props: { w, h, svg } });
  } else if (svg) {
    editor.createShape<KymoDiagramShape>({ id: EMBED_ID, type: "kymo-diagram", x: 0, y: 0, props: { w, h, svg } });
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

export function Board({ diagram, svg, w, h, isBpmn, source, onPatch }: BoardProps) {
  const editorRef = useRef<Editor | null>(null);
  const dataRef = useRef({ diagram, svg, w, h, isBpmn, source, onPatch });
  dataRef.current = { diagram, svg, w, h, isBpmn, source, onPatch };
  const fittedRef = useRef(false);
  const applyingRef = useRef(false); // true while we write text→canvas (coarse echo guard)
  const writebackId = useRef<number | undefined>(undefined);

  // ── text → canvas (Phase 2 diff sync) ──────────────────────────────────
  const sync = useCallback((editor: Editor) => {
    const d = dataRef.current;
    applyingRef.current = true;
    editor.run(
      () => {
        if (d.isBpmn || !d.diagram) syncEmbed(editor, d.svg, d.w, d.h);
        else syncElements(editor, d.diagram);
      },
      { history: "ignore" },
    );
    queueMicrotask(() => { applyingRef.current = false; }); // stays true through the store flush
    if (!fittedRef.current && (d.svg || d.diagram)) {
      editor.zoomToFit();
      fittedRef.current = true;
    }
  }, []);

  // ── canvas → text (Phase 3 round-trip) ─────────────────────────────────
  // Genuine-delta filter: a moved node's canvas centre vs its model position.
  // Programmatic syncs land exactly on the model pos → zero delta → self-suppress.
  const writeback = useCallback((editor: Editor) => {
    const d = dataRef.current;
    if (!d.diagram || d.isBpmn) return;
    const byId = new Map(d.diagram.components.map((c) => [c.id, c]));
    const moves = new Map<string, XY>();
    for (const s of kymoShapes(editor)) {
      const meta = (s.meta as { kymo?: { id?: string; kind?: string } }).kymo;
      if (!meta || meta.kind !== "node" || !meta.id) continue;
      const comp = byId.get(meta.id);
      if (!comp) continue;
      const { w: sw, h: sh } = (s as KymoNodeShape).props;
      const cx = s.x + sw / 2, cy = s.y + sh / 2;
      if (Math.abs(cx - comp.pos[0]) > 1 || Math.abs(cy - comp.pos[1]) > 1) moves.set(meta.id, { x: cx, y: cy });
    }
    if (moves.size) d.onPatch(patchPositions(d.source, moves));
  }, []);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      // Persistence restored shapes/camera → honor that view, skip the auto-fit.
      if (editor.getCurrentPageShapes().length > 0) fittedRef.current = true;
      sync(editor);
      // Listen for user-driven document changes; debounce a writeback.
      editor.store.listen(
        () => {
          if (applyingRef.current) return;
          window.clearTimeout(writebackId.current);
          writebackId.current = window.setTimeout(() => writeback(editor), 200);
        },
        { scope: "document", source: "user" },
      );
    },
    [sync, writeback],
  );

  useEffect(() => {
    if (editorRef.current) sync(editorRef.current);
  }, [diagram, svg, w, h, isBpmn, sync]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <Tldraw licenseKey={LICENSE_KEY || undefined} persistenceKey={PERSISTENCE_KEY} shapeUtils={shapeUtils} onMount={handleMount}>
        <Inspector />
      </Tldraw>
    </div>
  );
}
