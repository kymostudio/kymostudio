/**
 * canvas-engine Phase 5 — the read-only board behind `?engine=native`. Builds an
 * engine Store + Editor from the current diagram (reusing `diagramToShapes`),
 * registers the engine shape utils, and renders them via `<EngineCanvas>`.
 * Rebuilds on diagram change. No canvas→text round-trip (that's Phase 6); the
 * tldraw `<Board>` keeps its sync for the default path.
 */
import { useMemo } from "react";
import { Store, Editor, createShapeId, type ShapePartial } from "../../../../packages/js-canvas/dist/index.js";
import type { Diagram } from "../../../../packages/js/dist/index.js";
import { diagramToShapes } from "../diagramToShapes";
import { EngineCanvas } from "./react";
import { KymoNodeEngineUtil, KymoDiagramEngineUtil, GeoEngineUtil, ArrowEngineUtil } from "./shapes";

// Stateless utils — shared across boards.
const utils = [new KymoNodeEngineUtil(), new KymoDiagramEngineUtil(), new GeoEngineUtil(), new ArrowEngineUtil()];

interface EngineBoardProps {
  diagram: Diagram | null;
  svg: string;
  w: number;
  h: number;
  isBpmn: boolean;
}

export function EngineBoard({ diagram, svg, w, h, isBpmn }: EngineBoardProps) {
  const editor = useMemo(() => {
    const ed = new Editor(new Store(), { shapeUtils: utils });
    if (isBpmn || !diagram) {
      // BPMN / no DSL → a single embedded SVG image (the Phase-1 fallback).
      if (svg) {
        ed.createShape({ id: createShapeId("kymo-diagram"), type: "kymo-diagram", x: 0, y: 0, props: { w, h, svg } });
      }
    } else {
      // DSL → one shape per element (reuse the tldraw-path mapper verbatim).
      ed.createShapes(diagramToShapes(diagram) as unknown as ShapePartial[]);
    }
    return ed;
  }, [diagram, svg, w, h, isBpmn]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <EngineCanvas editor={editor} shapeUtils={utils} />
    </div>
  );
}
