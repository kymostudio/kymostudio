import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { WORKSPACES_API, DIAGRAMS_API, PROJECTS_API, apiFetch } from "./const";
import { newId } from "./util";
import { Check, ChevronDown, FolderPlus, Folder as FolderIcon } from "lucide-react";

// A folder in the diagram tree. parentId "" = a root-level folder. (The backend
// stores these in the `workspaces` table; "folder" is the user-facing concept.)
export type Folder = { id: string; name: string; parentId: string; createdAt: number };

// A project: the layer ABOVE folders. A project owns many folders + diagrams.
// The user always has at least one (the backend auto-creates "Personal").
export type Project = { id: string; name: string; createdAt: number };

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
  // ---- projects (the layer above folders) ----
  projects: Project[];
  currentProject: string;       // active project id ("" until the list loads)
  currentProjectName: string;   // name of currentProject (for the breadcrumb)
  setCurrentProject: (id: string) => void;
  createProject: (name: string) => Promise<Project | null>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<boolean>; // false = rejected (e.g. last project)
};
const Ctx = createContext<WsVal>({
  folders: [], currentFolder: "", currentName: "My Diagrams",
  setCurrentFolder: () => {}, refresh: async () => {},
  createFolder: async () => null, renameFolder: async () => {}, deleteFolder: async () => {}, moveFolder: async () => false,
  projects: [], currentProject: "", currentProjectName: "Personal", setCurrentProject: () => {},
  createProject: async () => null, renameProject: async () => {}, deleteProject: async () => false,
});

// Fire-and-forget: put a (possibly not-yet-indexed) diagram into a folder ("" =
// root), optionally also stamping the project it belongs to (for new diagrams
// created while a non-default project is current).
export function assignDiagram(signedIn: boolean, id: string, folderId: string, projectId?: string) {
  if (!signedIn) return;
  apiFetch(DIAGRAMS_API, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify(projectId ? { id, ws: folderId, project: projectId } : { id, ws: folderId }),
  }).catch(() => {});
}

// Move a diagram to another project (clears its folder — folders are project-local).
// Resolves true on success so callers can refresh their lists.
export async function moveDiagramToProject(signedIn: boolean, id: string, projectId: string): Promise<boolean> {
  if (!signedIn) return false;
  try {
    const r = await apiFetch(DIAGRAMS_API, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, project: projectId }),
    });
    return r.ok;
  } catch { return false; }
}

// Rename a diagram (routes through the room so the DO/D1/live editors stay in sync).
export function renameDiagram(signedIn: boolean, id: string, title: string) {
  if (!signedIn) return;
  apiFetch(DIAGRAMS_API, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, title }),
  }).catch(() => {});
}

// Delete a diagram. Resolves true on success so callers can refresh their list.
export async function deleteDiagram(signedIn: boolean, id: string): Promise<boolean> {
  if (!signedIn) return false;
  try {
    const r = await apiFetch(`${DIAGRAMS_API}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    return r.ok;
  } catch { return false; }
}

// Compose an api.kymo.studio URL from a base + a query fragment whose params are
// written with leading "&" (e.g. "&project=…&id=…"); the first becomes "?".
export const withQuery = (base: string, q = "") => base + (q ? "?" + q.replace(/^&/, "") : "");

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { signedIn } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentFolder, setCurrent] = useState<string>(() => localStorage.getItem("kymo_folder") || "");
  const [currentProject, setProject] = useState<string>(() => localStorage.getItem("kymo_project") || "");

  const setCurrentFolder = useCallback((id: string) => {
    setCurrent(id);
    try { if (id) localStorage.setItem("kymo_folder", id); else localStorage.removeItem("kymo_folder"); } catch {}
  }, []);
  // Raw pin: set + persist the project, no side effects. Used by the auto-pin
  // effect so loading the page doesn't clobber the stored folder.
  const pinProject = useCallback((id: string) => {
    setProject(id);
    try { if (id) localStorage.setItem("kymo_project", id); else localStorage.removeItem("kymo_project"); } catch {}
  }, []);
  // User-facing switch: changing project also resets the folder (folders are
  // project-local, so the old folder id is meaningless in the new project).
  const setCurrentProject = useCallback((id: string) => {
    pinProject(id);
    setCurrentFolder("");
  }, [pinProject, setCurrentFolder]);

  // Scope every folder/diagram fetch to the active project (omitted until the
  // list loads → the backend's default project, which stays back-compatible).
  const projectQuery = currentProject ? "&project=" + encodeURIComponent(currentProject) : "";

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    try {
      const [pr, wr] = await Promise.all([
        apiFetch(PROJECTS_API, { cache: "no-store" }),
        apiFetch(withQuery(WORKSPACES_API, projectQuery), { cache: "no-store" }),
      ]);
      if (pr.ok) setProjects(((await pr.json()).projects) || []);
      if (wr.ok) setFolders(((await wr.json()).workspaces) || []);
      setLoaded(true);
    } catch {}
  }, [signedIn, projectQuery]);
  useEffect(() => { refresh(); }, [refresh]);

  // Once projects load, pin currentProject to a real id: keep the stored one if
  // it still exists, else fall back to the default (oldest) project.
  useEffect(() => {
    if (!projects.length) return;
    if (!currentProject || !projects.some((p) => p.id === currentProject)) pinProject(projects[0].id);
  }, [projects, currentProject, pinProject]);

  // A stored current folder that no longer exists (deleted elsewhere) falls back to root.
  useEffect(() => {
    if (loaded && currentFolder && !folders.some((f) => f.id === currentFolder)) setCurrentFolder("");
  }, [loaded, folders, currentFolder, setCurrentFolder]);

  const api = useCallback(async (method: string, body?: any, query = "") => {
    if (!signedIn) return null;
    const r = await apiFetch(withQuery(WORKSPACES_API, query), {
      method, headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.ok ? r.json() : null;
  }, [signedIn]);

  const createFolder = useCallback(async (name: string, parentId: string) => {
    const j = await api("POST", { name, parentId }, projectQuery); // new folder lands in the current project
    await refresh();
    return j?.workspace ?? null;
  }, [api, refresh, projectQuery]);
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

  // ---- project CRUD (PROJECTS_API) ----
  const projApi = useCallback(async (method: string, body?: any, query = "") => {
    if (!signedIn) return null;
    const r = await apiFetch(withQuery(PROJECTS_API, query), {
      method, headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.ok ? (await r.json().catch(() => ({}))) : null;
  }, [signedIn]);
  const createProject = useCallback(async (name: string) => {
    const j = await projApi("POST", { name });
    await refresh();
    return j?.project ?? null;
  }, [projApi, refresh]);
  const renameProject = useCallback(async (id: string, name: string) => { await projApi("PATCH", { id, name }); await refresh(); }, [projApi, refresh]);
  const deleteProject = useCallback(async (id: string) => {
    const r = await projApi("DELETE", undefined, "&id=" + encodeURIComponent(id));
    if (currentProject === id) setCurrentProject(""); // re-pins to default on next load
    await refresh();
    return r !== null;
  }, [projApi, refresh, currentProject, setCurrentProject]);

  const currentName = folders.find((f) => f.id === currentFolder)?.name || "My Diagrams";
  const currentProjectName = projects.find((p) => p.id === currentProject)?.name || "Personal";
  return (
    <Ctx.Provider value={{
      folders, currentFolder, currentName, setCurrentFolder, refresh, createFolder, renameFolder, deleteFolder, moveFolder,
      projects, currentProject, currentProjectName, setCurrentProject, createProject, renameProject, deleteProject,
    }}>
      {children}
    </Ctx.Provider>
  );
}
export const useWorkspace = () => useContext(Ctx);

// Header control next to the brand: shows the current folder (where new diagrams
// land) and a menu to switch folder, create one, or jump to the Diagrams tree.
export function WorkspaceSwitcher() {
  const { signedIn, claims } = useAuth();
  const { folders, currentFolder, currentName, setCurrentFolder, createFolder, refresh, currentProject } = useWorkspace();
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
    if (f) { setCurrentFolder(f.id); setOpen(false); }
  }
  function newDiagram() {
    const id = newId();
    assignDiagram(signedIn, id, currentFolder, currentProject || undefined);
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
          <button className="acct-item ws-item" onClick={newDiagram}>
            <span className="ws-check" />New diagram
          </button>
        </div>
      )}
    </div>
  );
}
