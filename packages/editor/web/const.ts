export const GOOGLE_CLIENT_ID = "745071116390-6idggmrtohc6heg6gvuubaamkt8dr68u.apps.googleusercontent.com";
export const MCP_WS = "wss://mcp.kymo.studio/ws";
export const DIAGRAMS_API = "https://mcp.kymo.studio/api/diagrams";
export const WORKSPACES_API = "https://mcp.kymo.studio/api/workspaces";
export const SAMPLE = `flowchart TD {
  A[Receive order] --> B{In stock?}
  B -->|Yes| C[Take payment]
  B -->|No| D[Notify customer]
  C --> E[Pack items]
  E --> F((Ship order))
  D --> G[Cancel order]
}`;
