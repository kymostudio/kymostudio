import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { WORKSPACES_API, DIAGRAMS_API } from "./const";
import { newId } from "./util";
import { Check, ChevronDown, FolderPlus, Folder as FolderIcon } from "lucide-react";

// A folder in the diagram tree. parentId "" = a root-level folder. (The backend
// stores these in the `workspaces` table; "folder" is the user-facing concept.)
export type Folder = { id: string; name: string; parentId: string; createdAt: number };

// ---- pure tree helpers (operate on the flat folder list) ----
export function childFoldersOf(folders: Folder[], parentId: string): Folder[] {
  return folders.filter((f) => (f.parentId || "") === parentId);
}
/** Root → … → the folder itself. Empty for the root level ("" id). */
export function folderPath(folders: Folder[], id: string): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const out: Folder[] = [];
  const seen = new Set<string>();
  let cur = id;
  while (cur && byId.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    const f = byId.get(cur)!;
    out.unshift(f);
    cur = f.parentId || "";
  }
  return out;
}
/** The folder and every folder nested beneath it — used to forbid moving a folder into its own subtree. */
export function descendantFolderIds(folders: Folder[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) { out.add(f.id); grew = true; }
    }
  }
  return out;
}
/** Depth-first flatten (folders sorted by name per level) — for indented pickers. */
export function flattenTree(folders: Folder[], parentId = "", depth = 0): { folder: Folder; depth: number }[] {
  const out: { folder: Folder; depth: number }[] = [];
  for (const f of childFoldersOf(folders, parentId).sort((a, b) => a.name.localeCompare(b.name))) {
    out.push({ folder: f, depth });
    out.push(...flattenTree(folders, f.id, depth + 1));
  }
  return out;
}

type WsVal = {
  folders: Folder[];
  currentFolder: string; // "" = root level
  currentName: string;   // name of currentFolder ("My Diagrams" at root)
  setCurrentFolder: (id: string) => void;
  refresh: () => Promise<void>;
  createFolder: (name: string, parentId: string) => Promise<Folder | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveFolder: (id: string, parentId: string) => Promise<boolean>; // false = rejected (cycle)
};
const Ctx = createContext<WsVal>({
  folders: [], currentFolder: "", currentName: "My Diagrams",
  setCurrentFolder: () => {}, refresh: async () => {},
  createFolder: async () => null, renameFolder: async () => {}, deleteFolder: async () => {}, moveFolder: async () => false,
});

// Fire-and-forget: put a (possibly not-yet-indexed) diagram into a folder ("" = root).
export function assignDiagram(idToken: string | null, id: string, folderId: string) {
  if (!idToken) return;
  fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, ws: folderId }),
  }).catch(() => {});
}

// Rename a diagram (routes through the room so the DO/D1/live editors stay in sync).
export function renameDiagram(idToken: string | null, id: string, title: string) {
  if (!idToken) return;
  fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, title }),
  }).catch(() => {});
}

// Delete a diagram. Resolves true on success so callers can refresh their list.
export async function deleteDiagram(idToken: string | null, id: string): Promise<boolean> {
  if (!idToken) return false;
  try {
    const r = await fetch(`${DIAGRAMS_API}?id=${encodeURIComponent(id)}&id_token=${encodeURIComponent(idToken)}`, { method: "DELETE" });
    return r.ok;
  } catch { return false; }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { idToken } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentFolder, setCurrent] = useState<string>(() => localStorage.getItem("kymo_folder") || "");

  const setCurrentFolder = useCallback((id: string) => {
    setCurrent(id);
    try { if (id) localStorage.setItem("kymo_folder", id); else localStorage.removeItem("kymo_folder"); } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(WORKSPACES_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setFolders(j.workspaces || []);
      setLoaded(true);
    } catch {}
  }, [idToken]);
  useEffect(() => { refresh(); }, [refresh]);

  // A stored current folder that no longer exists (deleted elsewhere) falls back to root.
  useEffect(() => {
    if (loaded && currentFolder && !folders.some((f) => f.id === currentFolder)) setCurrentFolder("");
  }, [loaded, folders, currentFolder, setCurrentFolder]);

  const api = useCallback(async (method: string, body?: any, query = "") => {
    if (!idToken) return null;
    const r = await fetch(WORKSPACES_API + "?id_token=" + encodeURIComponent(idToken) + query, {
      method, headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.ok ? r.json() : null;
  }, [idToken]);

  const createFolder = useCallback(async (name: string, parentId: string) => {
    const j = await api("POST", { name, parentId });
    await refresh();
    return j?.workspace ?? null;
  }, [api, refresh]);
  const renameFolder = useCallback(async (id: string, name: string) => { await api("PATCH", { id, name }); await refresh(); }, [api, refresh]);
  const deleteFolder = useCallback(async (id: string) => {
    await api("DELETE", undefined, "&id=" + encodeURIComponent(id));
    if (currentFolder === id) setCurrentFolder("");
    await refresh();
  }, [api, refresh, currentFolder, setCurrentFolder]);
  const moveFolder = useCallback(async (id: string, parentId: string) => {
    // Client-side cycle guard (the backend re-checks): can't drop a folder into its own subtree.
    if (id === parentId || descendantFolderIds(folders, id).has(parentId)) return false;
    const r = await api("PATCH", { id, parentId });
    await refresh();
    return r !== null;
  }, [api, refresh, folders]);

  const currentName = folders.find((f) => f.id === currentFolder)?.name || "My Diagrams";
  return (
    <Ctx.Provider value={{ folders, currentFolder, currentName, setCurrentFolder, refresh, createFolder, renameFolder, deleteFolder, moveFolder }}>
      {children}
    </Ctx.Provider>
  );
}
export const useWorkspace = () => useContext(Ctx);

// Header control next to the brand: shows the current folder (where new diagrams
// land) and a menu to switch folder, create one, or jump to the Diagrams tree.
export function WorkspaceSwitcher() {
  const { idToken, claims } = useAuth();
  const { folders, currentFolder, currentName, setCurrentFolder, createFolder, refresh } = useWorkspace();
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

  async function onNewFolder() {
    const name = (window.prompt("Folder name") || "").trim();
    if (!name) return;
    const f = await createFolder(name, currentFolder);
    if (f) { setCurrentFolder(f.id); setOpen(false); navigate("/diagrams"); }
  }
  function newDiagram() {
    const id = newId();
    assignDiagram(idToken, id, currentFolder);
    setOpen(false);
    navigate("/?d=" + id);
  }

  const tree = flattenTree(folders);
  return (
    <div className="account ws-switch" onClick={(e) => e.stopPropagation()}>
      <button className="ws-btn" onClick={() => setOpen((o) => !o)} title="Current folder — where new diagrams are saved">
        <FolderIcon size={14} strokeWidth={2} />
        {currentName}
        <ChevronDown size={14} strokeWidth={2.2} className="chev" />
      </button>
      {open && (
        <div className="acct-menu ws-menu">
          <div className="ws-head">Save new diagrams in</div>
          <button className="acct-item ws-item" onClick={() => { setCurrentFolder(""); setOpen(false); }}>
            <span className="ws-check">{currentFolder === "" && <Check size={15} strokeWidth={2.4} />}</span>
            My Diagrams
          </button>
          {tree.map(({ folder, depth }) => (
            <button key={folder.id} className="acct-item ws-item" style={{ paddingLeft: 10 + depth * 16 }}
              onClick={() => { setCurrentFolder(folder.id); setOpen(false); }}>
              <span className="ws-check">{currentFolder === folder.id && <Check size={15} strokeWidth={2.4} />}</span>
              {folder.name}
            </button>
          ))}
          <button className="acct-item ws-item ws-new" onClick={onNewFolder}>
            <span className="ws-check"><FolderPlus size={15} strokeWidth={2.2} /></span>
            New folder
          </button>
          <div className="menu-sep" />
          <Link className="acct-item ws-item" to="/diagrams" onClick={() => setOpen(false)}>
            <span className="ws-check" />All diagrams
          </Link>
          <button className="acct-item ws-item" onClick={newDiagram}>
            <span className="ws-check" />New diagram
          </button>
        </div>
      )}
    </div>
  );
}
