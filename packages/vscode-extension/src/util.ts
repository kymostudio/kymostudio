/** Small helpers shared across the extension: settings, nonce, SVG export. */
import * as vscode from "vscode";
import type { BackgroundMode } from "./render";

export function getBackground(): BackgroundMode {
  const v = vscode.workspace
    .getConfiguration("kymostudio")
    .get<string>("preview.background", "light");
  return v === "dark" || v === "transparent" ? v : "light";
}

export function getAutoRefresh(): boolean {
  return vscode.workspace
    .getConfiguration("kymostudio")
    .get<boolean>("preview.autoRefresh", true);
}

/** A random nonce for the webview Content-Security-Policy `script-src`. */
export function makeNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 32; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

/** Prompt for a destination next to `sourceUri` and write `svg` there. */
export async function saveSvg(sourceUri: vscode.Uri, svg: string): Promise<void> {
  const stem = (sourceUri.path.split("/").pop() ?? "diagram").replace(/\.[^.]+$/, "");
  const dir = vscode.Uri.joinPath(sourceUri, "..");
  const target = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.joinPath(dir, `${stem || "diagram"}.svg`),
    filters: { "SVG image": ["svg"] },
    title: "Export diagram as SVG",
  });
  if (!target) return;
  await vscode.workspace.fs.writeFile(target, Buffer.from(svg, "utf8"));
  const name = target.path.split("/").pop();
  void vscode.window.showInformationMessage(`kymostudio: exported ${name}`);
}
