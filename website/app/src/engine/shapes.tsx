/**
 * canvas-engine render layer — engine shape utils. They extend the headless
 * `ShapeUtil` (packages/js-canvas) and render under the engine's own
 * `<HTMLContainer>`.
 *
 * Four shape types: `kymo-node`, `kymo-diagram` (BPMN embed), `kymo-region`
 * (region rect) and `kymo-edge` (edge). `kymo-region`/`kymo-edge` are the
 * canvas-jam Phase-1 consolidation (FR-J-01) that replaced the Phase-5
 * tldraw-style `geo`/`arrow` stopgaps; their props come from
 * `diagramToShapesEngine` (label is already plain text, not tldraw rich-text).
 */
import { useEffect, useState } from "react";
import { ShapeUtil, Rectangle2d, type Shape } from "../../../../packages/js-canvas/dist/index.js";
import { getIcon } from "../../../../packages/js/dist/index.js";
import { HTMLContainer } from "./react";

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ── kymo-node ──────────────────────────────────────────────────────────────

const glyphCache = new Map<string, string>();

function useGlyph(icon: string): string {
  const [glyph, setGlyph] = useState(() => glyphCache.get(icon) ?? "");
  useEffect(() => {
    const cached = glyphCache.get(icon);
    if (cached !== undefined) {
      setGlyph(cached);
      return;
    }
    let alive = true;
    getIcon(icon)
      .then((svg: string) => {
        glyphCache.set(icon, svg);
        if (alive) setGlyph(svg);
      })
      .catch(() => {
        if (alive) setGlyph("");
      });
    return () => {
      alive = false;
    };
  }, [icon]);
  return glyph;
}

function NodeView({ shape }: { shape: Shape }) {
  const w = num(shape.props.w, 76);
  const h = num(shape.props.h, 76);
  const icon = String(shape.props.icon ?? "");
  const name = String(shape.props.name ?? "");
  const glyph = useGlyph(icon);
  return (
    <HTMLContainer style={{ width: w, height: h, overflow: "visible", pointerEvents: "none" }}>
      <div
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        dangerouslySetInnerHTML={{
          __html: `<svg width="${w}" height="${h}" viewBox="${-w / 2} ${-h / 2} ${w} ${h}" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,.18))">${glyph}</svg>`,
        }}
      />
      {name && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 2,
            fontFamily: "Inter, ui-sans-serif, system-ui",
            fontWeight: 600,
            fontSize: 13,
            color: "#1e293b",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {name}
        </div>
      )}
    </HTMLContainer>
  );
}

export class KymoNodeEngineUtil extends ShapeUtil {
  static override type = "kymo-node";
  override getDefaultProps() {
    return { w: 76, h: 76, icon: "", accent: "green", name: "", subtitle: "" };
  }
  override getGeometry(shape: Shape) {
    return new Rectangle2d({ width: num(shape.props.w, 76), height: num(shape.props.h, 76), isFilled: true });
  }
  override component(shape: Shape) {
    return <NodeView shape={shape} />;
  }
}

// ── kymo-diagram (BPMN embed) ────────────────────────────────────────────────

export class KymoDiagramEngineUtil extends ShapeUtil {
  static override type = "kymo-diagram";
  override getDefaultProps() {
    return { w: 320, h: 200, svg: "" };
  }
  override getGeometry(shape: Shape) {
    return new Rectangle2d({ width: num(shape.props.w, 320), height: num(shape.props.h, 200), isFilled: true });
  }
  override component(shape: Shape) {
    const w = num(shape.props.w, 320);
    const h = num(shape.props.h, 200);
    const svg = String(shape.props.svg ?? "");
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
}

// ── kymo-region (region rectangle) ───────────────────────────────────────────

export class KymoRegionEngineUtil extends ShapeUtil {
  static override type = "kymo-region";
  override getDefaultProps() {
    return { w: 1, h: 1, color: "grey", dash: "solid", label: "" };
  }
  override getGeometry(shape: Shape) {
    return new Rectangle2d({ width: num(shape.props.w, 1), height: num(shape.props.h, 1) });
  }
  override component(shape: Shape) {
    const w = num(shape.props.w, 1);
    const h = num(shape.props.h, 1);
    const dashed = shape.props.dash === "dashed";
    const label = String(shape.props.label ?? "");
    return (
      <HTMLContainer style={{ width: w, height: h, pointerEvents: "none" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            border: `1.5px ${dashed ? "dashed" : "solid"} #9ca3af`,
            borderRadius: 4,
          }}
        />
        {label && (
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 6,
              fontSize: 12,
              fontFamily: "Inter, ui-sans-serif, system-ui",
              color: "#64748b",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        )}
      </HTMLContainer>
    );
  }
}

// ── kymo-edge (edge) ─────────────────────────────────────────────────────────

interface Pt {
  x: number;
  y: number;
}

const pt = (v: unknown): Pt => {
  const p = (v ?? {}) as { x?: unknown; y?: unknown };
  return { x: num(p.x), y: num(p.y) };
};

export class KymoEdgeEngineUtil extends ShapeUtil {
  static override type = "kymo-edge";
  override getDefaultProps() {
    return { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, color: "grey", arrowhead: "arrow", label: "" };
  }
  override getGeometry(shape: Shape) {
    const s = pt(shape.props.start);
    const e = pt(shape.props.end);
    return new Rectangle2d({
      x: Math.min(s.x, e.x),
      y: Math.min(s.y, e.y),
      width: Math.max(Math.abs(e.x - s.x), 1),
      height: Math.max(Math.abs(e.y - s.y), 1),
    });
  }
  override component(shape: Shape) {
    const s = pt(shape.props.start);
    const e = pt(shape.props.end);
    const label = String(shape.props.label ?? "");
    const showArrow = shape.props.arrowhead !== "none";
    const markerId = `kymo-arrow-${String(shape.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    return (
      <HTMLContainer style={{ width: 0, height: 0, overflow: "visible", pointerEvents: "none" }}>
        <svg width="1" height="1" style={{ position: "absolute", overflow: "visible" }}>
          <defs>
            <marker id={markerId} markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#9ca3af" />
            </marker>
          </defs>
          <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#9ca3af" strokeWidth="1.5" markerEnd={showArrow ? `url(#${markerId})` : undefined} />
        </svg>
        {label && (
          <div
            style={{
              position: "absolute",
              left: (s.x + e.x) / 2,
              top: (s.y + e.y) / 2,
              transform: "translate(-50%, -50%)",
              fontSize: 11,
              fontFamily: "Inter, ui-sans-serif, system-ui",
              color: "#64748b",
              background: "rgba(255,255,255,.85)",
              padding: "0 3px",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        )}
      </HTMLContainer>
    );
  }
}
