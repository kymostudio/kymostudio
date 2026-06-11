import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { WORKSPACES_API, DIAGRAMS_API } from "./const";
import { newId } from "./util";
import { Check, ChevronDown, Plus } from "lucide-react";

export type Workspace = { id: string; name: string; createdAt: number };

type WsVal = {
  workspaces: Workspace[];
  currentWs: string; // "" = Personal
  currentName: string;
  setCurrentWs: (id: string) => void;
  refresh: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
};
const Ctx = createContext<WsVal>({
  workspaces: [], currentWs: "", currentName: "Personal",
  setCurrentWs: () => {}, refresh: async () => {},
  createWorkspace: async () => null, renameWorkspace: async () => {}, deleteWorkspace: async () => {},
});

// Fire-and-forget: put a (possibly not-yet-indexed) diagram into a workspace.
export function assignDiagram(idToken: string | null, id: string, ws: string) {
  if (!idToken) return;
  fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, ws }),
  }).catch(() => {});
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { idToken } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentWs, setCurrent] = useState<string>(() => localStorage.getItem("kymo_ws") || "");

  const setCurrentWs = useCallback((id: string) => {
    setCurrent(id);
    try { if (id) localStorage.setItem("kymo_ws", id); else localStorage.removeItem("kymo_ws"); } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(WORKSPACES_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setWorkspaces(j.workspaces || []);
      setLoaded(true);
    } catch {}
  }, [idToken]);
  useEffect(() => { refresh(); }, [refresh]);

  // A stored workspace that no longer exists (deleted elsewhere) falls back to Personal.
  useEffect(() => {
    if (loaded && currentWs && !workspaces.some((w) => w.id === currentWs)) setCurrentWs("");
  }, [loaded, workspaces, currentWs, setCurrentWs]);

  const api = useCallback(async (method: string, body?: any, query = "") => {
    if (!idToken) return null;
    const r = await fetch(WORKSPACES_API + "?id_token=" + encodeURIComponent(idToken) + query, {
      method, headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.ok ? r.json() : null;
  }, [idToken]);

  const createWorkspace = useCallback(async (name: string) => {
    const j = await api("POST", { name });
    await refresh();
    return j?.workspace ?? null;
  }, [api, refresh]);
  const renameWorkspace = useCallback(async (id: string, name: string) => { await api("PATCH", { id, name }); await refresh(); }, [api, refresh]);
  const deleteWorkspace = useCallback(async (id: string) => {
    await api("DELETE", undefined, "&id=" + encodeURIComponent(id));
    if (currentWs === id) setCurrentWs("");
    await refresh();
  }, [api, refresh, currentWs, setCurrentWs]);

  const currentName = workspaces.find((w) => w.id === currentWs)?.name || "Personal";
  return (
    <Ctx.Provider value={{ workspaces, currentWs, currentName, setCurrentWs, refresh, createWorkspace, renameWorkspace, deleteWorkspace }}>
      {children}
    </Ctx.Provider>
  );
}
export const useWorkspace = () => useContext(Ctx);

// Header dropdown next to the brand: switch workspace, create one, jump to Diagrams / a new diagram.
export function WorkspaceSwitcher() {
  const { idToken, claims } = useAuth();
  const { workspaces, currentWs, currentName, setCurrentWs, createWorkspace, refresh } = useWorkspace();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    refresh();
    const h = () => setOpen(false);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [open, refresh]);

  if (!claims) return null;

  async function onNewWorkspace() {
    const name = (window.prompt("Workspace name") || "").trim();
    if (!name) return;
    const ws = await createWorkspace(name);
    if (ws) { setCurrentWs(ws.id); setOpen(false); navigate("/diagrams"); }
  }
  function newDiagram() {
    const id = newId();
    assignDiagram(idToken, id, currentWs);
    setOpen(false);
    navigate("/?d=" + id);
  }

  return (
    <div className="account ws-switch" onClick={(e) => e.stopPropagation()}>
      <button className="ws-btn" onClick={() => setOpen((o) => !o)} title="Workspace">
        {currentName}
        <ChevronDown size={14} strokeWidth={2.2} className="chev" />
      </button>
      {open && (
        <div className="acct-menu ws-menu">
          <div className="ws-head">Workspaces</div>
          <button className="acct-item ws-item" onClick={() => { setCurrentWs(""); setOpen(false); }}>
            <span className="ws-check">{currentWs === "" && <Check size={15} strokeWidth={2.4} />}</span>
            Personal
          </button>
          {workspaces.map((w) => (
            <button key={w.id} className="acct-item ws-item" onClick={() => { setCurrentWs(w.id); setOpen(false); }}>
              <span className="ws-check">{currentWs === w.id && <Check size={15} strokeWidth={2.4} />}</span>
              {w.name}
            </button>
          ))}
          <button className="acct-item ws-item ws-new" onClick={onNewWorkspace}>
            <span className="ws-check"><Plus size={15} strokeWidth={2.2} /></span>
            New workspace
          </button>
          <div className="menu-sep" />
          <Link className="acct-item ws-item" to="/diagrams" onClick={() => setOpen(false)}>
            <span className="ws-check" />Diagrams
          </Link>
          <button className="acct-item ws-item" onClick={newDiagram}>
            <span className="ws-check" />New diagram
          </button>
        </div>
      )}
    </div>
  );
}
