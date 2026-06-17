export const GOOGLE_CLIENT_ID = "745071116390-6idggmrtohc6heg6gvuubaamkt8dr68u.apps.googleusercontent.com";
// The editor's DATA + room endpoints live on api.kymo.studio (the app surface);
// mcp.kymo.studio is reserved for the MCP agent endpoints (/mcp, /sse). Both are
// the SAME kymo-mcp worker (two custom domains) — see packages/mcp/wrangler.jsonc.
// On localhost these are never hit: localdb.ts intercepts /api/* and the room.
const API_HTTP = "https://api.kymo.studio";
const API_WS = "wss://api.kymo.studio";
export const MCP_WS = `${API_WS}/ws`;
// Per-user control channel: every open tab connects so the MCP `ui_open_diagram`
// tool can live-switch which diagram this tab shows (see userchannel.tsx).
export const USER_WS = `${API_WS}/userws`;
// Browser session (CR-KEDITOR-002): POST a Google credential to establish the
// httpOnly session cookie, GET /api/me to resolve it back to {email,name}.
export const SESSION_API = `${API_HTTP}/api/session`;
export const ME_API = `${API_HTTP}/api/me`;
// Every authenticated call sends the session cookie. It is Domain=kymo.studio
// (api.kymo.studio + editor.kymo.studio are same-site), so `credentials:"include"`
// carries it cross-subdomain; the worker echoes the allow-listed Origin + allow-credentials.
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, credentials: "include" });
}
export const DIAGRAMS_API = `${API_HTTP}/api/diagrams`;
export const WORKSPACES_API = `${API_HTTP}/api/workspaces`;
export const PROJECTS_API = `${API_HTTP}/api/projects`;
export const TRASH_API = `${API_HTTP}/api/trash`;
// Per-project open-tab set (which diagrams are open + which is active) — VS
// Code-style window state, persisted server-side for cross-device restore.
export const TABS_API = `${API_HTTP}/api/tabs`;
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
