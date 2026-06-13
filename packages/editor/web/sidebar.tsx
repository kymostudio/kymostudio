import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, colorFor } from "./auth";
import { useWorkspace, assignDiagram, deleteDiagram, renameDiagram, childFoldersOf, descendantFolderIds, type Folder } from "./workspace";
import { useConfirm } from "./confirm";
import { useToast } from "./toast";
import { DIAGRAMS_API, TRASH_API } from "./const";
import { kindLabel, docHref } from "./kroki";
import { TEMPLATES, type Template } from "./templates";
import {
  ChevronRight, ChevronDown, Folder as FolderIcon, FolderPlus, FilePlus2, FileText, Pencil, Trash2,
  Files, Search, Shapes, Settings, BookOpen, LayoutGrid, LogOut,
  Workflow, Waypoints, Network, Boxes, Box, Database, Share2,
} from "lucide-react";

type Item = { id: string; title: string; kind?: string; ws?: string };
export type Panel = "explorer" | "search" | "templates";

// A distinct icon per diagram type so files aren't an undifferentiated "📄 Untitled" pile.
const KIND_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  kymo: Workflow, mermaid: Waypoints, bpmn: Network,
  c4plantuml: Boxes, structurizr: Boxes, plantuml: Box,
  d2: Database, dbml: Database, erd: Database, graphviz: Share2,
};
function KindIcon({ kind }: { kind?: string }) {
  const I = (kind && KIND_ICON[kind]) || FileText;
  return <I size={15} strokeWidth={1.8} className="sb-icon" />;
}

// Restore a soft-deleted item (used by the Undo toast after a delete).
function restoreItem(idToken: string | null, kind: "diagram" | "folder", id: string) {
  if (!idToken) return;
  fetch(TRASH_API + "?id_token=" + encodeURIComponent(idToken), {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id }),
  }).catch(() => {});
}

// Shared diagram-list fetch for the Explorer + Search panels (only one panel is
// mounted at a time, so this never double-fetches).
function useDiagrams() {
  const { idToken } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const reload = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (r.ok) setItems(((await r.json()).diagrams) || []);
    } catch {}
  }, [idToken]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const f = () => { if (!document.hidden) reload(); };
    window.addEventListener("focus", reload); document.addEventListener("visibilitychange", f);
    return () => { window.removeEventListener("focus", reload); document.removeEventListener("visibilitychange", f); };
  }, [reload]);
  return { items, reload };
}

// ============================ Explorer (file tree) ============================
export function ExplorerPanel({ currentId, currentTitle, onNewDiagram, onClose }: {
  currentId: string | null; currentTitle: string; onNewDiagram: () => void; onClose: () => void;
}) {
  const { idToken } = useAuth();
  const { folders, currentFolder, setCurrentFolder, createFolder, renameFolder, deleteFolder, moveFolder } = useWorkspace();
  const { items, reload } = useDiagrams();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("kymo_expanded") || "[]")); } catch { return new Set(); }
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  useEffect(() => { reload(); }, [currentId]); // a save/new file shows up // eslint-disable-line

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
  async function onRenameFile(it: Item) {
    const name = (window.prompt("Rename diagram", it.title || "Untitled") || "").trim();
    if (name && name !== it.title) { renameDiagram(idToken, it.id, name); setTimeout(reload, 200); }
  }
  async function onDeleteFolder(f: Folder) {
    const sub = descendantFolderIds(folders, f.id);
    const hasContents = sub.size > 1 || items.some((i) => sub.has(effFolder(i)));
    if (!(await confirm({
      title: hasContents ? `Delete folder “${f.name}” and its contents?` : `Delete folder “${f.name}”?`,
      detail: hasContents ? "All diagrams and subfolders inside will be deleted too." : undefined,
    }))) return;
    if (currentId && items.some((i) => i.id === currentId && sub.has(effFolder(i)))) navigate("/"); // the open file was inside
    await deleteFolder(f.id); reload();
    toast({ message: `Deleted folder “${f.name}”`, actionLabel: "Undo", onAction: () => { restoreItem(idToken, "folder", f.id); setTimeout(reload, 250); } });
  }
  async function onDeleteFile(it: Item) {
    if (!(await confirm({ title: `Delete “${it.title || "Untitled"}”?` }))) return;
    if (await deleteDiagram(idToken, it.id)) {
      if (it.id === currentId) navigate("/"); reload();
      toast({ message: `Deleted “${it.title || "Untitled"}”`, actionLabel: "Undo", onAction: () => { restoreItem(idToken, "diagram", it.id); setTimeout(reload, 250); } });
    }
  }
  function openFile(id: string) { navigate("/?d=" + encodeURIComponent(id)); onClose(); }

  function dragStart(e: React.DragEvent, kind: "diagram" | "folder", id: string) {
    e.dataTransfer.setData("text/plain", kind + ":" + id); e.dataTransfer.effectAllowed = "move";
  }
  function allowDrop(e: React.DragEvent, target: string) {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOver !== target) setDragOver(target);
  }
  async function dropOn(e: React.DragEvent, targetFolderId: string) {
    e.preventDefault(); e.stopPropagation(); setDragOver(null);
    const [kind, id] = (e.dataTransfer.getData("text/plain") || "").split(":");
    if (kind === "diagram" && id) { assignDiagram(idToken, id, targetFolderId); setTimeout(reload, 150); }
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
      if (open) {
        const kids = renderLevel(f.id, depth + 1);
        out.push(...kids);
        if (!kids.length) out.push(<div key={"e" + f.id} className="sb-empty-row" style={{ paddingLeft: 6 + (depth + 1) * 14 + 16 }}>empty</div>);
      }
    }
    for (const it of filesIn(parentId)) {
      const active = it.id === currentId;
      const label = (active && currentTitle && currentTitle !== "Untitled" ? currentTitle : it.title) || "Untitled";
      out.push(
        <div key={"d" + it.id} className={"sb-file" + (active ? " active" : "")} style={{ paddingLeft: 6 + depth * 14 + 16 }}
          draggable onDragStart={(e) => { e.stopPropagation(); dragStart(e, "diagram", it.id); }}
          onClick={() => openFile(it.id)} title={`${label}${it.kind ? " · " + kindLabel(it.kind) : ""}`}>
          <KindIcon kind={it.kind} />
          <span className="sb-name">{label}</span>
          <span className="sb-actions" onClick={(e) => e.stopPropagation()}>
            <button title="Rename" onClick={() => onRenameFile(it)}><Pencil size={13} strokeWidth={2} /></button>
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

// ================================ Search panel ================================
export function SearchPanel({ currentId, onClose }: { currentId: string | null; onClose: () => void }) {
  const { idToken } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  // Server-side search across title + content + kind (titles are often "Untitled").
  useEffect(() => {
    const needle = q.trim();
    if (!needle) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${DIAGRAMS_API}?q=${encodeURIComponent(needle)}&id_token=${encodeURIComponent(idToken || "")}`, { cache: "no-store" });
        if (r.ok) setResults((await r.json()).diagrams || []);
      } catch {} finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, idToken]);
  function openFile(id: string) { navigate("/?d=" + encodeURIComponent(id)); onClose(); }
  const needle = q.trim();
  return (
    <aside className="sidebar">
      <div className="sb-head"><span className="sb-title">Search</span></div>
      <div className="sb-search"><Search size={14} strokeWidth={2} />
        <input autoFocus placeholder="Search title or content…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="sb-tree">
        {results.map((it) => (
          <div key={it.id} className={"sb-file" + (it.id === currentId ? " active" : "")} style={{ paddingLeft: 10 }}
            onClick={() => openFile(it.id)} title={it.title || "Untitled"}>
            <KindIcon kind={it.kind} />
            <span className="sb-name">{it.title || "Untitled"}</span>
            {it.kind && <span className="sb-kind">{kindLabel(it.kind)}</span>}
          </div>
        ))}
        {needle && !loading && !results.length && <div className="sb-empty">No diagrams match “{needle}”.</div>}
        {needle && loading && !results.length && <div className="sb-empty">Searching…</div>}
        {!needle && <div className="sb-empty">Type to search by title or content.</div>}
      </div>
    </aside>
  );
}

// ============================== Templates panel ==============================
export function TemplatesPanel({ onPick, onClose }: { onPick: (t: Template) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? TEMPLATES.filter((t) => `${t.name} ${t.via} ${t.kind}`.toLowerCase().includes(needle)) : TEMPLATES;
  return (
    <aside className="sidebar">
      <div className="sb-head"><span className="sb-title">Templates</span></div>
      <div className="sb-search"><Search size={14} strokeWidth={2} />
        <input placeholder="Filter types…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="sb-tree">
        {shown.map((t) => (
          <div key={t.name} className="sb-tpl" onClick={() => { onPick(t); onClose(); }} title={`New ${t.name} (${t.via})`}>
            <span className="sb-tpl-glyph">{t.glyph}</span>
            <span className="sb-name">{t.name}</span>
            <span className="sb-kind">{t.via}</span>
          </div>
        ))}
        {!shown.length && <div className="sb-empty">No type matches “{q.trim()}”.</div>}
      </div>
    </aside>
  );
}

// =============================== Activity bar ================================
export function ActivityBar({ active, onSelect }: { active: Panel | null; onSelect: (p: Panel) => void }) {
  const { claims, signOut } = useAuth();
  const [menu, setMenu] = useState<"account" | "settings" | null>(null);
  useEffect(() => {
    if (!menu) return;
    const h = () => setMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [menu]);
  const initial = ((claims?.email || claims?.name || "?").trim()[0] || "?").toUpperCase();
  const Btn = ({ id, label, children }: { id: Panel; label: string; children: React.ReactNode }) => (
    <button className={"act-btn" + (active === id ? " active" : "")} title={label} aria-label={label}
      aria-pressed={active === id} onClick={() => onSelect(id)}>{children}</button>
  );
  return (
    <nav className="activitybar" onClick={(e) => e.stopPropagation()}>
      <div className="act-group">
        <Btn id="explorer" label="Explorer"><Files size={22} strokeWidth={1.7} /></Btn>
        <Btn id="search" label="Search"><Search size={22} strokeWidth={1.9} /></Btn>
        <Btn id="templates" label="Templates"><Shapes size={22} strokeWidth={1.8} /></Btn>
      </div>
      <div className="act-group">
        <div className="act-pop-wrap">
          <button className="act-btn act-account" title="Account" aria-label="Account" aria-haspopup="menu"
            onClick={() => setMenu((m) => (m === "account" ? null : "account"))}>
            <span className="avatar" style={{ background: colorFor((claims?.email || "x").toLowerCase()) }}>{initial}</span>
          </button>
          {menu === "account" && (
            <div className="acct-menu act-popover">
              <div className="acct-head">Signed in as<b>{claims?.email}</b></div>
              <button className="acct-item" onClick={() => { setMenu(null); signOut(); }}><LogOut size={15} strokeWidth={2} />Sign out</button>
            </div>
          )}
        </div>
        <div className="act-pop-wrap">
          <button className="act-btn" title="Settings" aria-label="Settings" aria-haspopup="menu"
            onClick={() => setMenu((m) => (m === "settings" ? null : "settings"))}><Settings size={21} strokeWidth={1.8} /></button>
          {menu === "settings" && (
            <div className="acct-menu act-popover">
              <Link className="acct-item exp-item" to="/diagrams" onClick={() => setMenu(null)}><LayoutGrid size={16} strokeWidth={1.9} />All diagrams</Link>
              <Link className="acct-item exp-item" to="/trash" onClick={() => setMenu(null)}><Trash2 size={16} strokeWidth={1.9} />Trash</Link>
              <a className="acct-item exp-item" href={docHref("kymo")} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)}><BookOpen size={16} strokeWidth={1.9} />Docs</a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
