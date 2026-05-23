/**
 * A single tldraw shape that embeds a rendered kymo SVG, sized to the SVG's
 * intrinsic width/height so it fills the box 1:1 and tldraw's zoom scales the
 * whole thing. Since Phase 2, DSL diagrams render as per-element shapes — this
 * single-embed is now the **BPMN fallback** (BPMN SVGs are self-contained
 * vector + embedded CSS, so they render faithfully as an image).
 *
 * RK-07: the diagram is shown as an `<img>` backed by an SVG **data-URL**, not
 * as inline SVG in the DOM. The browser caches the decoded image by `src`, so
 * when tldraw culls and remounts the shape during heavy interaction it
 * reappears instantly instead of re-parsing the inline markup (which flashed
 * blank). `toSvg` lets tldraw's image/PNG export include the diagram cleanly.
 */
import { HTMLContainer, Rectangle2d, ShapeUtil, T, type TLBaseShape } from "tldraw";

export type KymoDiagramShape = TLBaseShape<
  "kymo-diagram",
  { w: number; h: number; svg: string }
>;

/** Encode a self-contained SVG string as an `<img>`-ready data-URL (unicode-safe). */
function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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
    const { w, h, svg } = shape.props;
    return (
      <HTMLContainer style={{ width: w, height: h }}>
        {svg ? (
          <img
            src={svgDataUrl(svg)}
            width={w}
            height={h}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }}
          />
        ) : null}
      </HTMLContainer>
    );
  }

  // Export hook: emit an <image> referencing the same data-URL so tldraw's
  // SVG/PNG export captures the diagram (RK-07).
  override toSvg(shape: KymoDiagramShape) {
    const { w, h, svg } = shape.props;
    return <image href={svgDataUrl(svg)} width={w} height={h} />;
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
