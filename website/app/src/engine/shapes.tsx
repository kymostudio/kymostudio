/**
 * canvas-engine render layer — engine shape utils. They extend the headless
 * `ShapeUtil` (packages/js-canvas) and render under the engine's own
 * `<HTMLContainer>`.
 *
 * Four shape types: `kymo-node`, `kymo-diagram` (BPMN embed), `kymo-region`
 * (region rect) and `kymo-edge` (edge). Their props come from `diagramToShapes`
 * (plain-text labels). Each util also implements `toSvg(shape)` — an SVG-string
 * fragment in shape-local coords — consumed by the board exporter (FR-J-03).
 */
import { useEffect, useState } from "react";
import { ShapeUtil, Rectangle2d, type Shape } from "../../../../packages/js-canvas/dist/index.js";
import { getIcon } from "../../../../packages/js/dist/index.js";
import { HTMLContainer } from "./react";
import { glyphCache } from "./export";

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Escape text for safe inclusion in exported SVG `<text>` content. */
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── kymo-node ──────────────────────────────────────────────────────────────

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
  override toSvg(shape: Shape): string {
    const w = num(shape.props.w, 76);
    const h = num(shape.props.h, 76);
    const glyph = glyphCache.get(String(shape.props.icon ?? "")) ?? ""; // pre-warmed by the exporter
    const name = String(shape.props.name ?? "");
    const label = name
      ? `<text x="${w / 2}" y="${h + 14}" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui" font-weight="600" font-size="13" fill="#1e293b">${esc(name)}</text>`
      : "";
    return `<g transform="translate(${w / 2},${h / 2})">${glyph}</g>${label}`;
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
  override toSvg(shape: Shape): string {
    const w = num(shape.props.w, 320);
    const h = num(shape.props.h, 200);
    const svg = String(shape.props.svg ?? "");
    return svg ? `<image href="${svgDataUrl(svg)}" width="${w}" height="${h}"/>` : "";
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
  override toSvg(shape: Shape): string {
    const w = num(shape.props.w, 1);
    const h = num(shape.props.h, 1);
    const dashed = shape.props.dash === "dashed";
    const label = String(shape.props.label ?? "");
    const rect = `<rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="none" stroke="#9ca3af" stroke-width="1.5"${dashed ? ' stroke-dasharray="4 4"' : ""}/>`;
    const text = label
      ? `<text x="6" y="16" font-family="Inter, ui-sans-serif, system-ui" font-size="12" fill="#64748b">${esc(label)}</text>`
      : "";
    return rect + text;
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
  override toSvg(shape: Shape): string {
    const s = pt(shape.props.start);
    const e = pt(shape.props.end);
    const label = String(shape.props.label ?? "");
    const showArrow = shape.props.arrowhead !== "none";
    const markerId = `kymo-arrow-${String(shape.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const defs = showArrow
      ? `<defs><marker id="${markerId}" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#9ca3af"/></marker></defs>`
      : "";
    const line = `<line x1="${s.x}" y1="${s.y}" x2="${e.x}" y2="${e.y}" stroke="#9ca3af" stroke-width="1.5"${showArrow ? ` marker-end="url(#${markerId})"` : ""}/>`;
    const text = label
      ? `<text x="${(s.x + e.x) / 2}" y="${(s.y + e.y) / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, ui-sans-serif, system-ui" font-size="11" fill="#64748b">${esc(label)}</text>`
      : "";
    return defs + line + text;
  }
}

// ── freedraw (freehand pen stroke; canvas-jam FR-J-05) ───────────────────────
// Freeform layer: NO `meta.kymo`, so it persists only via `engine/persist` and
// NEVER serialises into `.kymo` (`NFR-CE-07`). `points` are page-space, stored
// relative to the shape origin; geometry/bounds come from the point extent.

/** The pen tool's default stroke (no colour/size picker in the P5 MVP). */
export const DRAW_COLOR = "#1e293b";
export const DRAW_SIZE = 3;

const strokePath = (pts: Pt[]): string =>
  pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

export class FreedrawEngineUtil extends ShapeUtil {
  static override type = "freedraw";
  override getDefaultProps() {
    return { points: [] as Pt[], color: DRAW_COLOR, size: DRAW_SIZE };
  }
  override getGeometry(shape: Shape) {
    const pts = ((shape.props.points ?? []) as unknown[]).map(pt);
    if (!pts.length) return new Rectangle2d({ width: 1, height: 1 });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    return new Rectangle2d({ x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) });
  }
  override component(shape: Shape) {
    const pts = ((shape.props.points ?? []) as unknown[]).map(pt);
    const color = String(shape.props.color ?? DRAW_COLOR);
    const size = num(shape.props.size, DRAW_SIZE);
    return (
      <HTMLContainer style={{ width: 0, height: 0, overflow: "visible", pointerEvents: "none" }}>
        <svg width="1" height="1" style={{ position: "absolute", overflow: "visible" }}>
          {pts.length === 1 ? (
            <circle cx={pts[0].x} cy={pts[0].y} r={size / 2} fill={color} />
          ) : (
            <path d={strokePath(pts)} fill="none" stroke={color} strokeWidth={size} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </HTMLContainer>
    );
  }
  override toSvg(shape: Shape): string {
    const pts = ((shape.props.points ?? []) as unknown[]).map(pt);
    if (!pts.length) return "";
    const color = String(shape.props.color ?? DRAW_COLOR);
    const size = num(shape.props.size, DRAW_SIZE);
    if (pts.length === 1) return `<circle cx="${pts[0].x}" cy="${pts[0].y}" r="${size / 2}" fill="${color}"/>`;
    return `<path d="${strokePath(pts)}" fill="none" stroke="${color}" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

// ── note (sticky note; canvas-jam FR-J-06) ───────────────────────────────────
// Freeform layer (no `meta.kymo`). Click-to-place, double-click to edit its
// plain-text label (the editor overlay lives in `react.tsx`; this util renders
// the static sticky). Fixed default size in the P5/P6 MVP — interactive
// resize/move is deferred to a later freeform-transform pass (`RK-EN-03`).

export const NOTE_W = 180;
export const NOTE_H = 120;
export const NOTE_COLOR = "#fde68a"; // amber-200 sticky

const NOTE_FONT = "13px/1.4 Inter, ui-sans-serif, system-ui";

export class KymoNoteEngineUtil extends ShapeUtil {
  static override type = "note";
  override getDefaultProps() {
    return { w: NOTE_W, h: NOTE_H, color: NOTE_COLOR, text: "" };
  }
  override getGeometry(shape: Shape) {
    return new Rectangle2d({ width: num(shape.props.w, NOTE_W), height: num(shape.props.h, NOTE_H), isFilled: true });
  }
  override component(shape: Shape) {
    const w = num(shape.props.w, NOTE_W);
    const h = num(shape.props.h, NOTE_H);
    const color = String(shape.props.color ?? NOTE_COLOR);
    const text = String(shape.props.text ?? "");
    return (
      <HTMLContainer style={{ width: w, height: h }}>
        <div
          style={{
            // pointerEvents:auto re-enables hit-testing under the (none) wrapper
            // so a double-click reaches the note → enters edit mode.
            width: "100%", height: "100%", boxSizing: "border-box",
            background: color, borderRadius: 6, boxShadow: "0 2px 6px rgba(15,23,42,.18)",
            padding: 10, font: NOTE_FONT, color: "#1e293b",
            whiteSpace: "pre-wrap", overflow: "hidden", wordBreak: "break-word",
            pointerEvents: "auto", cursor: "text", userSelect: "none",
          }}
        >
          {text}
        </div>
      </HTMLContainer>
    );
  }
  override toSvg(shape: Shape): string {
    const w = num(shape.props.w, NOTE_W);
    const h = num(shape.props.h, NOTE_H);
    const color = String(shape.props.color ?? NOTE_COLOR);
    const text = String(shape.props.text ?? "");
    const rect = `<rect width="${w}" height="${h}" rx="6" fill="${color}"/>`;
    if (!text) return rect;
    const tspans = text.split("\n").map((ln, i) => `<tspan x="10" dy="${i ? 18 : 0}">${esc(ln)}</tspan>`).join("");
    return rect + `<text x="10" y="24" font-family="Inter, ui-sans-serif, system-ui" font-size="13" fill="#1e293b">${tspans}</text>`;
  }
}

// ── text (freeform plain-text label; canvas-jam FR-J-07) ─────────────────────
// Freeform layer (no `meta.kymo`). Click-to-place → type to edit (the inline
// editor overlay in `react.tsx` is shared with `note`). Auto-sizes to content,
// so geometry is approximated from the text extent. Plain text only (`RK-EN-06`).

export const TEXT_COLOR = "#1e293b";
export const TEXT_SIZE = 18;

export class KymoTextEngineUtil extends ShapeUtil {
  static override type = "text";
  override getDefaultProps() {
    return { text: "", color: TEXT_COLOR, size: TEXT_SIZE };
  }
  override getGeometry(shape: Shape) {
    const text = String(shape.props.text ?? "");
    const size = num(shape.props.size, TEXT_SIZE);
    const lines = text.split("\n");
    const cols = Math.max(1, ...lines.map((l) => l.length));
    return new Rectangle2d({ width: Math.max(cols * size * 0.6, 8), height: Math.max(lines.length * size * 1.3, size), isFilled: true });
  }
  override component(shape: Shape) {
    const text = String(shape.props.text ?? "");
    const color = String(shape.props.color ?? TEXT_COLOR);
    const size = num(shape.props.size, TEXT_SIZE);
    return (
      <HTMLContainer style={{ pointerEvents: "auto", cursor: "text" }}>
        <div style={{ font: `${size}px/1.3 Inter, ui-sans-serif, system-ui`, color, whiteSpace: "pre", padding: 2, userSelect: "none" }}>{text}</div>
      </HTMLContainer>
    );
  }
  override toSvg(shape: Shape): string {
    const text = String(shape.props.text ?? "");
    if (!text) return "";
    const color = String(shape.props.color ?? TEXT_COLOR);
    const size = num(shape.props.size, TEXT_SIZE);
    const tspans = text.split("\n").map((ln, i) => `<tspan x="2" dy="${i ? size * 1.3 : 0}">${esc(ln)}</tspan>`).join("");
    return `<text x="2" y="${size}" font-family="Inter, ui-sans-serif, system-ui" font-size="${size}" fill="${color}">${tspans}</text>`;
  }
}
