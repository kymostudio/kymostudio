// The single seam between the playground app and the canvas substrate.
// Phase 1 (canvas-engine, PLAN-ENGINE-001): re-exports tldraw verbatim — zero
// behaviour change. Later phases swap the implementation underneath; the app
// imports canvas primitives ONLY from here (NFR-EN-04, DESIGN-ENGINE-001 §13).
import "tldraw/tldraw.css";

export {
  Tldraw,
  createShapeId,
  toRichText,
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  useEditor,
  useValue,
} from "tldraw";

export type {
  Editor,
  TLShape,
  TLBaseShape,
  TLShapeId,
  TLShapePartial,
} from "tldraw";
