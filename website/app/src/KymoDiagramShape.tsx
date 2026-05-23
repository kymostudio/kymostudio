/**
 * A single tldraw shape that embeds the rendered kymo SVG (Phase 1 — one-way:
 * the diagram is produced from the `.kymo` text and shown as one shape on the
 * board; per-node mapping comes in Phase 2). It's a box shape sized to the
 * SVG's intrinsic width/height, so the SVG fills it 1:1 and tldraw's zoom
 * scales the whole thing.
 */
import { HTMLContainer, Rectangle2d, ShapeUtil, T, type TLBaseShape } from "tldraw";

export type KymoDiagramShape = TLBaseShape<
  "kymo-diagram",
  { w: number; h: number; svg: string }
>;

export class KymoDiagramShapeUtil extends ShapeUtil<KymoDiagramShape> {
  static override type = "kymo-diagram" as const;
  static override props = { w: T.number, h: T.number, svg: T.string };

  override getDefaultProps(): KymoDiagramShape["props"] {
    return { w: 320, h: 200, svg: "" };
  }

  override getGeometry(shape: KymoDiagramShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  // The diagram is driven by the text, not by handles.
  override canResize() {
    return false;
  }
  override canEdit() {
    return false;
  }
  override hideRotateHandle() {
    return true;
  }

  override component(shape: KymoDiagramShape) {
    return (
      <HTMLContainer style={{ width: shape.props.w, height: shape.props.h }}>
        <div
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          // The kymo SVG carries its own width/height = shape.props.w/h.
          dangerouslySetInnerHTML={{ __html: shape.props.svg }}
        />
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: KymoDiagramShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}

// Register the custom shape in tldraw's shape registry (type → props) so
// `KymoDiagramShape` joins the `TLShape` union — v5 derives `TLShape` from the
// augmentable `TLGlobalShapePropsMap` interface.
declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "kymo-diagram": KymoDiagramShape["props"];
  }
}
