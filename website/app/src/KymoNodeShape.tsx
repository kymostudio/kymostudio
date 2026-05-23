/**
 * Phase 2 — one tldraw shape per kymo `Component`. Reuses the renderer's own
 * node visual: `getIcon(icon)` returns the 64px glyph (centred at the origin),
 * which we drop into an SVG sized to the component's box, plus a label below.
 * Selectable/inspectable; text stays the source of truth (drags are ephemeral
 * until Phase 3).
 */
import { useEffect, useState } from "react";
import { HTMLContainer, Rectangle2d, ShapeUtil, T, type TLBaseShape } from "tldraw";
import { getIcon } from "../../../packages/js/dist/index.js";

export type KymoNodeShape = TLBaseShape<
  "kymo-node",
  { w: number; h: number; icon: string; accent: string; name: string; subtitle: string }
>;

// Resolved glyphs are cached module-wide so re-renders are synchronous.
const glyphCache = new Map<string, string>();

function useGlyph(icon: string): string {
  const [glyph, setGlyph] = useState(() => glyphCache.get(icon) ?? "");
  useEffect(() => {
    const cached = glyphCache.get(icon);
    if (cached !== undefined) { setGlyph(cached); return; }
    let alive = true;
    getIcon(icon)
      .then((svg) => { glyphCache.set(icon, svg); if (alive) setGlyph(svg); })
      .catch(() => { if (alive) setGlyph(""); });
    return () => { alive = false; };
  }, [icon]);
  return glyph;
}

function KymoNode({ shape }: { shape: KymoNodeShape }) {
  const { w, h, icon, name } = shape.props;
  const glyph = useGlyph(icon);
  return (
    <HTMLContainer style={{ width: w, height: h, overflow: "visible", pointerEvents: "all" }}>
      <div
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        dangerouslySetInnerHTML={{
          __html: `<svg width="${w}" height="${h}" viewBox="${-w / 2} ${-h / 2} ${w} ${h}" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,.18))">${glyph}</svg>`,
        }}
      />
      {name && (
        <div
          style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            marginTop: 2, fontFamily: "Inter, ui-sans-serif, system-ui", fontWeight: 600,
            fontSize: 13, color: "#1e293b", whiteSpace: "nowrap", pointerEvents: "none",
          }}
        >
          {name}
        </div>
      )}
    </HTMLContainer>
  );
}

export class KymoNodeShapeUtil extends ShapeUtil<KymoNodeShape> {
  static override type = "kymo-node" as const;
  static override props = {
    w: T.number, h: T.number, icon: T.string, accent: T.string, name: T.string, subtitle: T.string,
  };

  override getDefaultProps(): KymoNodeShape["props"] {
    return { w: 76, h: 76, icon: "", accent: "green", name: "", subtitle: "" };
  }
  override canResize() { return false; }
  override hideRotateHandle() { return true; }

  override getGeometry(shape: KymoNodeShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  override component(shape: KymoNodeShape) { return <KymoNode shape={shape} />; }
  override getIndicatorPath(shape: KymoNodeShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "kymo-node": KymoNodeShape["props"];
  }
}
