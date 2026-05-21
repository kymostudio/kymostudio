/**
 * A single live preview panel bound to one source document.
 *
 * The webview is a dumb SVG viewer (zoom / pan / export); all rendering happens
 * here in the extension host via {@link renderSource}, and the resulting SVG
 * string is posted to the webview. The panel re-renders on edits (debounced)
 * and saves, and survives a window reload via a registered serializer (it
 * persists the source URI in the webview state).
 */
import * as vscode from "vscode";
import { renderSource } from "./render";
import { getAutoRefresh, getBackground, makeNonce, saveSvg } from "./util";

const VIEW_TYPE = "kymostudio.preview";

interface InboundMessage {
  type: "ready" | "export";
}

export class DiagramPreview {
  /** One preview per source document, keyed by URI string. */
  private static readonly previews = new Map<string, DiagramPreview>();

  /** Reveal an existing preview for `doc`, or create one in `column`. */
  static reveal(
    context: vscode.ExtensionContext,
    doc: vscode.TextDocument,
    column: vscode.ViewColumn,
  ): DiagramPreview {
    const existing = DiagramPreview.previews.get(doc.uri.toString());
    if (existing) {
      existing.panel.reveal(column, true);
      void existing.update();
      return existing;
    }
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      DiagramPreview.titleFor(doc.uri),
      { viewColumn: column, preserveFocus: true },
      DiagramPreview.options(context),
    );
    return new DiagramPreview(context, panel, doc.uri);
  }

  /** Re-attach to a panel restored by VS Code on startup. */
  static restore(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    sourceUri: vscode.Uri,
  ): DiagramPreview {
    panel.webview.options = DiagramPreview.options(context);
    return new DiagramPreview(context, panel, sourceUri);
  }

  private static options(
    context: vscode.ExtensionContext,
  ): vscode.WebviewOptions & vscode.WebviewPanelOptions {
    return {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
    };
  }

  private static titleFor(uri: vscode.Uri): string {
    return `Preview: ${uri.path.split("/").pop() ?? "diagram"}`;
  }

  private lastSvg: string | null = null;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly panel: vscode.WebviewPanel,
    private readonly sourceUri: vscode.Uri,
  ) {
    DiagramPreview.previews.set(this.sourceUri.toString(), this);
    this.panel.webview.html = this.html();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg: InboundMessage) => this.onMessage(msg),
      null,
      this.disposables,
    );

    let timer: ReturnType<typeof setTimeout> | undefined;
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() !== this.sourceUri.toString()) return;
        if (!getAutoRefresh()) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void this.update(), 250);
      }),
      vscode.workspace.onDidSaveTextDocument((d) => {
        if (d.uri.toString() === this.sourceUri.toString()) void this.update();
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("kymostudio.preview")) void this.update();
      }),
    );
    // First render is driven by the webview's "ready" handshake.
  }

  /** Render the current source text and push it to the webview. */
  async update(): Promise<void> {
    let doc: vscode.TextDocument;
    try {
      doc = await vscode.workspace.openTextDocument(this.sourceUri);
    } catch {
      this.post({
        type: "error",
        title: "Source file is no longer available",
        detail: this.sourceUri.fsPath,
      });
      return;
    }
    this.panel.title = DiagramPreview.titleFor(this.sourceUri);

    const background = getBackground();
    const result = await renderSource(doc, background);
    if (result.ok) {
      this.lastSvg = result.svg;
      this.post({ type: "render", svg: result.svg, background });
    } else {
      this.lastSvg = null;
      this.post({ type: "error", title: result.title, detail: result.detail });
    }
  }

  private async onMessage(msg: InboundMessage): Promise<void> {
    switch (msg?.type) {
      case "ready":
        await this.update();
        break;
      case "export":
        if (this.lastSvg) await saveSvg(this.sourceUri, this.lastSvg);
        else void vscode.window.showWarningMessage("kymostudio: nothing to export yet.");
        break;
    }
  }

  private post(message: Record<string, unknown>): void {
    void this.panel.webview.postMessage({ ...message, sourceUri: this.sourceUri.toString() });
  }

  private html(): string {
    const webview = this.panel.webview;
    const nonce = makeNonce();
    const asset = (file: string): vscode.Uri =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", file));
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`,
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${asset("preview.css")}" rel="stylesheet">
  <title>kymostudio preview</title>
</head>
<body>
  <div id="toolbar">
    <button data-cmd="zoom-out" title="Zoom out">&#8722;</button>
    <button data-cmd="zoom-reset" title="Reset zoom" id="zoom-label">100%</button>
    <button data-cmd="zoom-in" title="Zoom in">+</button>
    <button data-cmd="fit" title="Fit to window">Fit</button>
    <span class="spacer"></span>
    <button data-cmd="export" title="Export the rendered SVG">Export SVG</button>
  </div>
  <div id="stage"><div id="canvas"></div></div>
  <div id="message" hidden>
    <div class="msg-title"></div>
    <pre class="msg-detail"></pre>
  </div>
  <script nonce="${nonce}" src="${asset("preview.js")}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    DiagramPreview.previews.delete(this.sourceUri.toString());
    this.panel.dispose();
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
