/**
 * kymostudio Diagram Preview — extension entry point.
 *
 * Registers the preview commands, the editor-title / explorer / palette menu
 * wiring (declared in package.json), and a webview serializer so previews
 * survive a window reload. All rendering is delegated to {@link DiagramPreview}
 * / {@link renderSource}.
 */
import * as vscode from "vscode";
import { DiagramPreview } from "./preview";
import { extname, renderSource } from "./render";
import { getBackground, saveSvg } from "./util";

export function activate(context: vscode.ExtensionContext): void {
  const openPreview = (column: vscode.ViewColumn) => (): void => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showInformationMessage(
        "kymostudio: open a .bpmn or .kymo file first.",
      );
      return;
    }
    DiagramPreview.reveal(context, editor.document, column);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kymostudio.showPreview",
      openPreview(vscode.ViewColumn.Active),
    ),
    vscode.commands.registerCommand(
      "kymostudio.showPreviewToSide",
      openPreview(vscode.ViewColumn.Beside),
    ),
    vscode.commands.registerCommand("kymostudio.exportSvg", () => exportActive()),
    vscode.window.registerWebviewPanelSerializer("kymostudio.preview", {
      async deserializeWebviewPanel(panel, state: unknown) {
        const raw = (state as { sourceUri?: string } | undefined)?.sourceUri;
        if (!raw) {
          panel.dispose();
          return;
        }
        DiagramPreview.restore(context, panel, vscode.Uri.parse(raw));
      },
    }),
  );
}

/** Render the active editor's document and write the SVG to a chosen file. */
async function exportActive(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showInformationMessage(
      "kymostudio: open a .bpmn or .kymo file first.",
    );
    return;
  }
  const ext = extname(editor.document.uri);
  if (ext !== ".bpmn" && ext !== ".kymo") {
    void vscode.window.showWarningMessage(
      "kymostudio: open a .bpmn or .kymo file to export.",
    );
    return;
  }
  const result = await renderSource(editor.document, getBackground());
  if (!result.ok) {
    void vscode.window.showErrorMessage(`kymostudio: ${result.title}`);
    return;
  }
  await saveSvg(editor.document.uri, result.svg);
}

export function deactivate(): void {
  // Webview panels are disposed via their own subscriptions.
}
