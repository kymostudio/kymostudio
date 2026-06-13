export const GOOGLE_CLIENT_ID = "745071116390-6idggmrtohc6heg6gvuubaamkt8dr68u.apps.googleusercontent.com";
export const MCP_WS = "wss://mcp.kymo.studio/ws";
export const DIAGRAMS_API = "https://mcp.kymo.studio/api/diagrams";
export const WORKSPACES_API = "https://mcp.kymo.studio/api/workspaces";
// Kroki-compatible render API (packages/render-api): kymo/mermaid/d2/graphviz/
// bpmn render in the worker itself, every other kind is proxied to kroki.io —
// all edge-cached by content hash, so repeat loads of a share link skip the
// render entirely (and mermaid skips kroki's ~2.5s puppeteer even on a miss).
export const RENDER_API = "https://render.kymo.studio";
// Docs site (VitePress). Per-kind syntax help deep-links off this root.
export const DOCS_URL = "https://docs.kymo.studio";
export const SAMPLE = `flowchart TD {
  A[Receive order] --> B{In stock?}
  B -->|Yes| C[Take payment]
  B -->|No| D[Notify customer]
  C --> E[Pack items]
  E --> F((Ship order))
  D --> G[Cancel order]
}`;
