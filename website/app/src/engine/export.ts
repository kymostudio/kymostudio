/**
 * canvas-jam Phase 3 (FR-J-03, DESIGN-JAM-001 §4) — board export.
 *
 * Walks the page shapes in `index` order, asks each util for an SVG-string
 * fragment via `toSvg`, wraps it at the shape's position (`<g translate>`), and
 * frames the lot in one `<svg>` sized to the union of the shapes' bounds. Node
 * glyphs are fetched async, so the exporter pre-warms `glyphCache` before the
 * (sync) `toSvg` reads it. SVG-only MVP (PNG via canvas follows).
 */
import type { Editor, Shape } from "../../../../packages/js-canvas/dist/index.js";
import { getIcon } from "../../../../packages/js/dist/index.js";

/** Shared icon-glyph cache: `useGlyph` (shapes.tsx) populates/reads it during
 *  render; `boardToSvg` pre-warms it before the (sync) per-util `toSvg` reads it.
 *  Lives here (no local `.ts` import) so `export.ts` stays headlessly testable. */
export const glyphCache = new Map<string, string>();

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

interface ExportUtil {
  type: string;
  toSvg?(shape: Shape): unknown;
  getGeometry?(shape: Shape): { bounds: { x: number; y: number; w: number; h: number } };
}

/** Render the current board to a standalone SVG string (`""` when empty). */
export async function boardToSvg(editor: Editor, utils: ExportUtil[]): Promise<string> {
  const byType = new Map(utils.map((u) => [u.type, u]));
  const shapes = editor.getCurrentPageShapes(); // already index-ordered

  // Pre-warm node glyphs so the sync `toSvg` can read `glyphCache`.
  const icons = new Set<string>();
  for (const s of shapes) {
    if (s.type === "kymo-node") {
      const ic = String(s.props.icon ?? "");
      if (ic && !glyphCache.has(ic)) icons.add(ic);
    }
  }
  await Promise.all(
    [...icons].map(async (ic) => {
      try {
        glyphCache.set(ic, await getIcon(ic));
      } catch {
        /* unknown icon → omit its glyph rather than fail the export */
      }
    }),
  );

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const parts: string[] = [];
  for (const s of shapes) {
    const u = byType.get(s.type);
    if (!u?.toSvg) continue;
    const b = u.getGeometry ? u.getGeometry(s).bounds : { x: 0, y: 0, w: num(s.props.w), h: num(s.props.h) };
    minX = Math.min(minX, s.x + b.x);
    minY = Math.min(minY, s.y + b.y);
    maxX = Math.max(maxX, s.x + b.x + b.w);
    maxY = Math.max(maxY, s.y + b.y + b.h);
    const frag = (u.toSvg(s) ?? "") as string;
    if (frag) parts.push(`<g transform="translate(${s.x},${s.y})">${frag}</g>`);
  }
  if (!parts.length) return "";

  const pad = 16;
  const x = minX - pad;
  const y = minY - pad;
  const w = maxX - minX + 2 * pad;
  const h = maxY - minY + 2 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${parts.join("")}</svg>`;
}

/** Trigger a browser download of an SVG string. */
export function downloadSvg(svg: string, name = "diagram.svg"): void {
  if (!svg) return;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
