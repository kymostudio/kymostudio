// Per-project open-tab state (VS Code-style): which diagrams are open in a
// project + which is active. Hybrid persistence — localStorage is the instant
// cache (read synchronously on load, written on every change), the backend
// (/api/tabs) is the cross-device source of truth (reconciled on project load,
// written debounced). On localhost the localdb.ts interceptor serves /api/tabs.
import { TABS_API, apiFetch } from "./const";

export type TabState = { tabs: string[]; active: string | null };

const localKey = (projectId: string) => "kymo_tabs:" + projectId;

export function readTabsLocal(projectId: string): TabState | null {
  try {
    const s = JSON.parse(localStorage.getItem(localKey(projectId)) || "");
    if (s && Array.isArray(s.tabs)) return { tabs: s.tabs.filter((x: any) => typeof x === "string"), active: typeof s.active === "string" ? s.active : null };
  } catch {}
  return null;
}

export function writeTabsLocal(projectId: string, state: TabState) {
  try { localStorage.setItem(localKey(projectId), JSON.stringify(state)); } catch {}
}

export async function fetchTabsRemote(projectId: string): Promise<TabState | null> {
  try {
    const r = await apiFetch(`${TABS_API}?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    if (j && Array.isArray(j.tabs)) return { tabs: j.tabs.filter((x: any) => typeof x === "string"), active: typeof j.active === "string" ? j.active : null };
  } catch {}
  return null;
}

// EditorPage registers its `openDiagram` here so the sibling UserChannel (MCP
// `ui_open_diagram`) can open a tab in the live editor without lifting tab state
// into a provider. Returns true if an editor was mounted to handle it.
let _opener: ((id: string) => void) | null = null;
export function registerOpener(fn: (id: string) => void): () => void {
  _opener = fn;
  return () => { if (_opener === fn) _opener = null; };
}
export function requestOpen(id: string): boolean {
  if (_opener) { _opener(id); return true; }
  return false;
}

// Sibling of the opener: lets the UserChannel (MCP `ui_close_file`) close a tab in
// the live editor. Returns true if an editor was mounted to handle it.
let _closer: ((id: string) => void) | null = null;
export function registerCloser(fn: (id: string) => void): () => void {
  _closer = fn;
  return () => { if (_closer === fn) _closer = null; };
}
export function requestClose(id: string): boolean {
  if (_closer) { _closer(id); return true; }
  return false;
}

export function putTabsRemote(projectId: string, state: TabState) {
  // fire-and-forget; a failure (offline / not-yet-deployed endpoint) just means
  // cross-device sync is skipped — localStorage already holds the truth.
  try {
    apiFetch(TABS_API, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ project: projectId, tabs: state.tabs, active: state.active }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
