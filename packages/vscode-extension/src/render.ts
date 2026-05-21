/**
 * Source → SVG dispatch for the preview.
 *
 * Both formats render fully in-process via the bundled, dependency-free
 * `kymostudio` package — no Python, no network:
 *   - `.bpmn`    → `parseBpmn` + `renderSVG`
 *   - `.diagram` → `parseDiagram` (parse + layout + alignment) + `renderSVG`
 */
import * as vscode from "vscode";
import { parseBpmn, parseDiagram, renderSVG, type RenderOptions } from "kymostudio";

export type BackgroundMode = "light" | "dark" | "transparent";

export interface RenderSuccess {
  ok: true;
  svg: string;
}
export interface RenderFailure {
  ok: false;
  title: string;
  detail: string;
}
export type RenderResult = RenderSuccess | RenderFailure;

/** Canvas fill per background mode (`null` = transparent). */
const BACKGROUNDS: Record<BackgroundMode, string | null> = {
  light: "#f8fafc",
  dark: "#0f172a",
  transparent: null,
};

export async function renderSource(
  doc: vscode.TextDocument,
  background: BackgroundMode,
): Promise<RenderResult> {
  const ext = extname(doc.uri);
  const opts: RenderOptions = { background: BACKGROUNDS[background] };

  if (ext === ".bpmn") {
    try {
      const diagram = parseBpmn(doc.getText());
      const svg = await renderSVG(diagram, opts);
      return { ok: true, svg };
    } catch (err) {
      return {
        ok: false,
        title: "Could not render this BPMN file",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (ext === ".diagram") {
    try {
      const diagram = parseDiagram(doc.getText());
      const svg = await renderSVG(diagram, opts);
      return { ok: true, svg };
    } catch (err) {
      return {
        ok: false,
        title: "Could not render this .diagram file",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    ok: false,
    title: "Unsupported file type",
    detail: `kymostudio previews .bpmn and .diagram files. Got "${ext || doc.languageId}".`,
  };
}

/** Lowercased extension (incl. the dot) from a URI path, or "" if none. */
export function extname(uri: vscode.Uri): string {
  const name = uri.path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}
