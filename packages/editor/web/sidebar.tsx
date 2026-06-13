import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useWorkspace, assignDiagram, deleteDiagram, childFoldersOf, descendantFolderIds, type Folder } from "./workspace";
import { DIAGRAMS_API } from "./const";
import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderPlus, FilePlus2, FileText, Pencil, Trash2, PanelLeftClose } from "lucide-react";

type Item = { id: string; title: string; kind?: string; ws?: string };

// VSCode-style file explorer rendered inside the editor. Compact sibling of the
// full DiagramsPage tree — shares the folder model + helpers (workspace.tsx) but
// renders narrow rows (no thumb/kind/time/bulk). Click a file to open it.
export function EditorSidebar({ currentId, currentTitle, onNewDiagram, onClose, onCollapse }: {
  currentId: string | null;
  currentTitle: string;
  onNewDiagram: () => void;
  onClose: () => void;     // called after opening a file (closes the drawer on mobile)
  onCollapse: () => void;  // the collapse button (always hides the sidebar)
}) {
  const { idToken } = useAuth();
  const { folders, currentFolder, setCurrentFolder, createFolder, renameFolder, deleteFolder, moveFolder } = useWorkspace();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("kymo_expanded") || "[]")); } catch { return new Set(); }
  });
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.diagrams || []);
    } catch {}
  }, [idToken]);
  // reload on mount, when the open diagram changes (a new save shows up), and on focus
  useEffect(() => { load(); }, [load, currentId]);
  useEffect(() => {
    const f = () => { if (!document.hidden) load(); };
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", f);
    return () => { window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", f); };
  }, [load]);

  const persist = (s: Set<string>) => { try { localStorage.setItem("kymo_expanded", JSON.stringify([...s])); } catch {} };
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); persist(n); return n; });

  const folderIds = new Set(folders.map((f) => f.id));
  const effFolder = (i: Item) => (i.ws && folderIds.has(i.ws) ? i.ws : "");
  const filesIn = (fid: string) => items.filter((i) => effFolder(i) === fid).sort((a, b) => (a.title || "Untitled").localeCompare(b.title || "Untitled"));

  async function onNewFolder(parentId: string) {
    const name = (window.prompt("Folder name") || "").trim();
    if (!name) return;
    const f = await createFolder(name, parentId);
    if (f && parentId) setExpanded((s) => { const n = new Set(s); n.add(parentId); persist(n); return n; });
  }
  async function onRenameFolder(f: Folder) {
    const name = (window.prompt("Rename folder", f.name) || "").trim();
    if (name && name !== f.name) await renameFolder(f.id, name);
  }
  async function onDeleteFolder(f: Folder) {
    if (!window.confirm(`Delete folder "${f.name}"? Its diagrams and subfolders move up one level.`)) return;
    await deleteFolder(f.id);
    load();
  }
  async function onDeleteFile(it: Item) {
    if (!window.confirm(`Delete "${it.title || "Untitled"}"? This cannot be undone.`)) return;
    if (await deleteDiagram(idToken, it.id)) {
      if (it.id === currentId) navigate("/"); // closing the open file → fresh draft
      load();
    }
  }
  function openFile(id: string) { navigate("/?d=" + encodeURIComponent(id)); onClose(); }

  // ---- drag & drop (same protocol as DiagramsPage) ----
  function dragStart(e: React.DragEvent, kind: "diagram" | "folder", id: string) {
    e.dataTransfer.setData("text/plain", kind + ":" + id); e.dataTransfer.effectAllowed = "move";
  }
  function allowDrop(e: React.DragEvent, target: string) {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOver !== target) setDragOver(target);
  }
  async function dropOn(e: React.DragEvent, targetFolderId: string) {
    e.preventDefault(); e.stopPropagation(); setDragOver(null);
    const [kind, id] = (e.dataTransfer.getData("text/plain") || "").split(":");
    if (kind === "diagram" && id) { assignDiagram(idToken, id, targetFolderId); setTimeout(load, 150); }
    else if (kind === "folder" && id && id !== targetFolderId) { await moveFolder(id, targetFolderId); }
  }

  function renderLevel(parentId: string, depth: number): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    for (const f of childFoldersOf(folders, parentId).sort((a, b) => a.name.localeCompare(b.name))) {
      const open = expanded.has(f.id);
      out.push(
        <div key={"f" + f.id} className={"sb-folder" + (dragOver === f.id ? " dragover" : "") + (currentFolder === f.id ? " sel" : "")}
          style={{ paddingLeft: 6 + depth * 14 }} draggable
          onDragStart={(e) => { e.stopPropagation(); dragStart(e, "folder", f.id); }}
          onDragOver={(e) => allowDrop(e, f.id)} onDragLeave={() => setDragOver((d) => (d === f.id ? null : d))}
          onDrop={(e) => dropOn(e, f.id)}
          onClick={() => { toggle(f.id); setCurrentFolder(f.id); }} title={f.name}>
          <span className="sb-chev">{open ? <ChevronDown size={14} strokeWidth={2.2} /> : <ChevronRight size={14} strokeWidth={2.2} />}</span>
          <FolderIcon size={15} strokeWidth={1.9} className="sb-icon" />
          <span className="sb-name">{f.name}</span>
          <span className="sb-actions" onClick={(e) => e.stopPropagation()}>
            <button title="New subfolder" onClick={() => onNewFolder(f.id)}><FolderPlus size={13} strokeWidth={2} /></button>
            <button title="Rename" onClick={() => onRenameFolder(f)}><Pencil size={13} strokeWidth={2} /></button>
            <button title="Delete" onClick={() => onDeleteFolder(f)}><Trash2 size={13} strokeWidth={2} /></button>
          </span>
        </div>
      );
      if (open) out.push(...renderLevel(f.id, depth + 1));
    }
    for (const it of filesIn(parentId)) {
      const active = it.id === currentId;
      // For the open file, prefer its LIVE label (so a rename reflects instantly) —
      // but only when that label is meaningful, so a still-loading doc doesn't
      // flicker the row to "Untitled".
      const label = (active && currentTitle && currentTitle !== "Untitled" ? currentTitle : it.title) || "Untitled";
      out.push(
        <div key={"d" + it.id} className={"sb-file" + (active ? " active" : "")} style={{ paddingLeft: 6 + depth * 14 + 16 }}
          draggable onDragStart={(e) => { e.stopPropagation(); dragStart(e, "diagram", it.id); }}
          onClick={() => openFile(it.id)} title={label}>
          <FileText size={15} strokeWidth={1.8} className="sb-icon" />
          <span className="sb-name">{label}</span>
          <span className="sb-actions" onClick={(e) => e.stopPropagation()}>
            <button title="Delete" onClick={() => onDeleteFile(it)}><Trash2 size={13} strokeWidth={2} /></button>
          </span>
        </div>
      );
    }
    return out;
  }

  return (
    <aside className="sidebar">
      <div className="sb-head">
        <span className="sb-title">Explorer</span>
        <button title="New diagram" aria-label="New diagram" onClick={onNewDiagram}><FilePlus2 size={15} strokeWidth={2} /></button>
        <button title="New folder" aria-label="New folder" onClick={() => onNewFolder("")}><FolderPlus size={15} strokeWidth={2} /></button>
        <button title="Hide sidebar" aria-label="Hide sidebar" onClick={onCollapse}><PanelLeftClose size={15} strokeWidth={2} /></button>
      </div>
      <div className={"sb-tree" + (dragOver === "__root__" ? " dragover-root" : "")}
        onDragOver={(e) => allowDrop(e, "__root__")} onDragLeave={() => setDragOver((d) => (d === "__root__" ? null : d))}
        onDrop={(e) => dropOn(e, "")}>
        {renderLevel("", 0)}
        {!items.length && !folders.length && <div className="sb-empty">No diagrams yet.</div>}
      </div>
    </aside>
  );
}
