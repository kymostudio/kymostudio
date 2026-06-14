import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, colorFor } from "./auth";
import { useWorkspace, assignDiagram, deleteDiagram, renameDiagram, moveDiagramToProject, childFoldersOf, descendantFolderIds, type Folder } from "./workspace";
import { useConfirm } from "./confirm";
import { useToast } from "./toast";
import { useContextMenu, type MenuItem } from "./context-menu";
import { DIAGRAMS_API, TRASH_API } from "./const";
import { kindLabel, docHref, extFor } from "./kroki";
import { TEMPLATES, type Template } from "./templates";
import {
  ChevronRight, ChevronDown, FolderPlus, FilePlus2, FileText, Pencil, Trash2,
  Files, Search, Shapes, BookOpen, LogOut, Menu, ExternalLink,
  Workflow, Waypoints, Network, Boxes, Box, Database, Share2,
} from "lucide-react";

export type Item = { id: string; title: string; kind?: string; ws?: string; updatedAt?: number };
export type Panel = "explorer" | "search" | "templates";

// A distinct icon per diagram type so files aren't an undifferentiated "📄 Untitled" pile.
const KIND_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; color?: string }>> = {
  kymo: Workflow, mermaid: Waypoints, bpmn: Network,
  c4plantuml: Boxes, structurizr: Boxes, plantuml: Box,
  d2: Database, dbml: Database, erd: Database, graphviz: Share2,
};
// …and a distinct hue, the way a VS Code icon theme colours file types.
const KIND_COLOR: Record<string, string> = {
  kymo: "#db2777", mermaid: "#0d9488", bpmn: "#4f46e5",
  c4plantuml: "#7c3aed", structurizr: "#7c3aed", plantuml: "#7c3aed",
  d2: "#b45309", dbml: "#b45309", erd: "#b45309", graphviz: "#15803d",
};
export function KindIcon({ kind }: { kind?: string }) {
  const I = (kind && KIND_ICON[kind]) || FileText;
  return <I size={15} strokeWidth={1.8} className="sb-icon" color={(kind && KIND_COLOR[kind]) || "var(--dim)"} />;
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
export function useDiagrams() {
  const { idToken } = useAuth();
  const { currentProject } = useWorkspace();
  const [items, setItems] = useState<Item[]>([]);
  const projectQuery = currentProject ? "&project=" + encodeURIComponent(currentProject) : "";
  const reload = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken) + projectQuery, { cache: "no-store" });
      if (r.ok) setItems(((await r.json()).diagrams) || []);
    } catch {}
  }, [idToken, projectQuery]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const f = () => { if (!document.hidden) reload(); };
    window.addEventListener("focus", reload); document.addEventListener("visibilitychange", f);
    return () => { window.removeEventListener("focus", reload); document.removeEventListener("visibilitychange", f); };
  }, [reload]);
  return { items, reload };
}

// ============================ Explorer (file tree) ============================
// One flat row of the rendered tree. The same ordered list drives the DOM and the
// keyboard model, so the two can never drift out of sync.
type Row =
  | { kind: "folder"; id: string; depth: number; ancestors: string[]; name: string; open: boolean }
  | { kind: "file"; id: string; depth: number; ancestors: string[]; it: Item };

export function ExplorerPanel({ currentId, currentTitle, onNewDiagram, onClose }: {
  currentId: string | null; currentTitle: string; onNewDiagram: () => void; onClose: () => void;
}) {
  const { idToken } = useAuth();
  const { folders, currentFolder, setCurrentFolder, createFolder, renameFolder, deleteFolder, moveFolder, projects, currentProject } = useWorkspace();
  const { items, reload } = useDiagrams();
  const confirm = useConfirm();
  const toast = useToast();
  const openMenu = useContextMenu();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("kymo_expanded") || "[]")); } catch { return new Set(); }
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: "file" | "folder"; id: string } | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  useEffect(() => { reload(); }, [currentId]); // a save/new file shows up // eslint-disable-line

  const persist = (s: Set<string>) => { try { localStorage.setItem("kymo_expanded", JSON.stringify([...s])); } catch {} };
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); persist(n); return n; });
  const setOpen = (id: string, open: boolean) => setExpanded((s) => { const n = new Set(s); open ? n.add(id) : n.delete(id); persist(n); return n; });

  const folderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);
  const effFolder = useCallback((i: Item) => (i.ws && folderIds.has(i.ws) ? i.ws : ""), [folderIds]);
  // VS Code-style: always alphabetical (folders are sorted by name in the walk too).
  const filesIn = useCallback(
    (fid: string) => items.filter((i) => effFolder(i) === fid).sort((a, b) => (a.title || "Untitled").localeCompare(b.title || "Untitled")),
    [items, effFolder]
  );

  // Build the visible, ordered row list (folders first, then files, per level).
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const walk = (parentId: string, depth: number, ancestors: string[]) => {
      for (const f of childFoldersOf(folders, parentId).sort((a, b) => a.name.localeCompare(b.name))) {
        const open = expanded.has(f.id);
        out.push({ kind: "folder", id: f.id, depth, ancestors, name: f.name, open });
        if (open) walk(f.id, depth + 1, [...ancestors, f.id]); // expanded-but-empty shows nothing (VS Code-style)
      }
      for (const it of filesIn(parentId)) out.push({ kind: "file", id: it.id, depth, ancestors, it });
    };
    walk("", 0, []);
    return out;
  }, [folders, expanded, filesIn]);

  // Rows the keyboard can land on (every row is now a folder or file).
  const navRows = rows;
  const keyOf = (r: { kind: string; id: string }) => r.kind + ":" + r.id;

  async function onNewFolder(parentId: string) {
    const f = await createFolder("New folder", parentId);
    if (!f) return;
    if (parentId) setOpen(parentId, true);
    setEditing({ kind: "folder", id: f.id }); // inline-rename the fresh folder
  }
  function startRename(kind: "file" | "folder", id: string) { setEditing({ kind, id }); }
  function commitRename(kind: "file" | "folder", id: string, raw: string) {
    const name = raw.trim();
    setEditing(null);
    if (kind === "folder") {
      const f = folders.find((x) => x.id === id);
      if (f && name && name !== f.name) renameFolder(id, name);
    } else {
      const it = items.find((x) => x.id === id);
      if (it && name && name !== (it.title || "")) { renameDiagram(idToken, id, name); setTimeout(reload, 200); }
    }
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
  function newDiagramIn(folderId: string) { setCurrentFolder(folderId); onNewDiagram(); }

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

  // ---- context menus ----
  function folderMenu(e: React.MouseEvent, f: Folder) {
    const items: MenuItem[] = [
      { label: "New diagram", icon: <FilePlus2 size={14} />, onClick: () => newDiagramIn(f.id) },
      { label: "New folder", icon: <FolderPlus size={14} />, onClick: () => onNewFolder(f.id) },
      { sep: true },
      { label: "Rename", icon: <Pencil size={14} />, shortcut: "F2", onClick: () => startRename("folder", f.id) },
      { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => onDeleteFolder(f) },
    ];
    openMenu(e, items);
  }
  function fileMenu(e: React.MouseEvent, it: Item) {
    const at = { clientX: e.clientX, clientY: e.clientY };
    const others = projects.filter((p) => p.id !== currentProject);
    const items: MenuItem[] = [
      { label: "Open", icon: <ExternalLink size={14} />, onClick: () => openFile(it.id) },
      { sep: true },
      { label: "Rename", icon: <Pencil size={14} />, shortcut: "F2", onClick: () => startRename("file", it.id) },
      ...(others.length ? [{ label: "Move to project…", icon: <Boxes size={14} />, onClick: () => moveToProjectMenu(at, it) }] : []),
      { sep: true },
      { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => onDeleteFile(it) },
    ];
    openMenu(e, items);
  }
  // Second-level picker: choose the destination project for a diagram.
  function moveToProjectMenu(at: { clientX: number; clientY: number }, it: Item) {
    const items: MenuItem[] = projects
      .filter((p) => p.id !== currentProject)
      .map((p) => ({
        label: p.name, icon: <Boxes size={14} />,
        onClick: async () => { await moveDiagramToProject(idToken, it.id, p.id); reload(); toast({ message: `Moved “${it.title || "Untitled"}” to ${p.name}` }); },
      }));
    openMenu(at, items);
  }
  function rootMenu(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return; // only the empty tree background
    openMenu(e, [
      { label: "New diagram", icon: <FilePlus2 size={14} />, onClick: () => newDiagramIn("") },
      { label: "New folder", icon: <FolderPlus size={14} />, onClick: () => onNewFolder("") },
    ]);
  }

  // ---- keyboard navigation (VS Code-ish: arrows, Enter, F2, Delete) ----
  function onTreeKeyDown(e: React.KeyboardEvent) {
    if (editing) return; // the rename input owns the keyboard
    const idx = navRows.findIndex((r) => keyOf(r) === focusKey);
    const cur = idx >= 0 ? navRows[idx] : null;
    const move = (next: number) => {
      const r = navRows[Math.max(0, Math.min(navRows.length - 1, next))];
      if (r) { setFocusKey(keyOf(r)); if (r.kind === "folder") setCurrentFolder(r.id); }
    };
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); move(idx < 0 ? 0 : idx + 1); break;
      case "ArrowUp": e.preventDefault(); move(idx < 0 ? 0 : idx - 1); break;
      case "ArrowRight":
        e.preventDefault();
        if (cur?.kind === "folder") { if (!cur.open) setOpen(cur.id, true); else move(idx + 1); }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (cur?.kind === "folder" && cur.open) setOpen(cur.id, false);
        else if (cur) { const p = cur.ancestors[cur.ancestors.length - 1]; if (p) { setFocusKey("folder:" + p); setCurrentFolder(p); } }
        break;
      case "Enter":
        e.preventDefault();
        if (cur?.kind === "folder") toggle(cur.id);
        else if (cur?.kind === "file") openFile(cur.id);
        break;
      case "F2": if (cur) { e.preventDefault(); startRename(cur.kind, cur.id); } break;
      case "Delete":
      case "Backspace":
        if (cur?.kind === "folder") { const f = folders.find((x) => x.id === cur.id); if (f) { e.preventDefault(); onDeleteFolder(f); } }
        else if (cur?.kind === "file") { const it = items.find((x) => x.id === cur.id); if (it) { e.preventDefault(); onDeleteFile(it); } }
        break;
    }
  }
  // Keep the keyboard-focused row scrolled into view.
  useEffect(() => {
    if (!focusKey) return;
    treeRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [focusKey]);

  // Autofocus + select-all the inline rename input when it mounts.
  const editRef = useCallback((el: HTMLInputElement | null) => { if (el) { el.focus(); el.select(); } }, []);
  function renameInput(kind: "file" | "folder", id: string, initial: string) {
    return (
      <input className="sb-rename" ref={editRef} defaultValue={initial}
        onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commitRename(kind, id, (e.target as HTMLInputElement).value);
          else if (e.key === "Escape") setEditing(null);
        }}
        onBlur={(e) => commitRename(kind, id, e.target.value)} />
    );
  }

  function guides(ancestors: string[]) {
    return ancestors.map((aid, j) => <span key={j} className={"sb-guide" + (aid === currentFolder ? " on" : "")} />);
  }

  function renderRow(r: Row): React.ReactNode {
    const k = keyOf(r);
    const focused = focusKey === k;
    if (r.kind === "folder") {
      const f = folders.find((x) => x.id === r.id);
      const isEditing = editing?.kind === "folder" && editing.id === r.id;
      return (
        <div key={"f" + r.id} data-key={k}
          className={"sb-row sb-folder" + (dragOver === r.id ? " dragover" : "") + (currentFolder === r.id ? " sel" : "") + (focused ? " kbd" : "")}
          draggable={!isEditing}
          onDragStart={(e) => { e.stopPropagation(); dragStart(e, "folder", r.id); }}
          onDragOver={(e) => allowDrop(e, r.id)} onDragLeave={() => setDragOver((d) => (d === r.id ? null : d))}
          onDrop={(e) => dropOn(e, r.id)}
          onClick={() => { setFocusKey(k); toggle(r.id); setCurrentFolder(r.id); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setFocusKey(k); f && folderMenu(e, f); }}
          title={r.name}>
          {guides(r.ancestors)}
          <span className="sb-chev">{r.open ? <ChevronDown size={14} strokeWidth={2.2} /> : <ChevronRight size={14} strokeWidth={2.2} />}</span>
          {isEditing ? renameInput("folder", r.id, r.name) : <span className="sb-name">{r.name}</span>}
        </div>
      );
    }
    const it = r.it;
    const active = it.id === currentId;
    const label = (active && currentTitle && currentTitle !== "Untitled" ? currentTitle : it.title) || "Untitled";
    const isEditing = editing?.kind === "file" && editing.id === r.id;
    return (
      <div key={"d" + r.id} data-key={k} className={"sb-row sb-file" + (active ? " active" : "") + (focused ? " kbd" : "")}
        draggable={!isEditing} onDragStart={(e) => { e.stopPropagation(); dragStart(e, "diagram", r.id); }}
        onClick={() => { setFocusKey(k); openFile(r.id); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setFocusKey(k); fileMenu(e, it); }}
        title={`${label}.${extFor(it.kind)}${it.kind ? " · " + kindLabel(it.kind) : ""}`}>
        {guides(r.ancestors)}
        <KindIcon kind={it.kind} />
        {isEditing ? renameInput("file", r.id, label) : <span className="sb-name">{label}<span className="sb-ext">.{extFor(it.kind)}</span></span>}
      </div>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sb-head">
        <span className="sb-title">Explorer</span>
        <button title="New diagram" aria-label="New diagram" onClick={onNewDiagram}><FilePlus2 size={15} strokeWidth={2} /></button>
        <button title="New folder" aria-label="New folder" onClick={() => onNewFolder("")}><FolderPlus size={15} strokeWidth={2} /></button>
      </div>
      <div ref={treeRef} className={"sb-tree" + (dragOver === "__root__" ? " dragover-root" : "")} tabIndex={0}
        onKeyDown={onTreeKeyDown} onContextMenu={rootMenu}
        onDragOver={(e) => allowDrop(e, "__root__")} onDragLeave={() => setDragOver((d) => (d === "__root__" ? null : d))}
        onDrop={(e) => dropOn(e, "")}>
        {rows.map(renderRow)}
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
export function ActivityBar({ active, onSelect, onNewDiagram }: { active: Panel | null; onSelect: (p: Panel) => void; onNewDiagram: () => void }) {
  const { claims, signOut } = useAuth();
  const { createFolder } = useWorkspace();
  const [menu, setMenu] = useState<"main" | "account" | null>(null);
  useEffect(() => {
    if (!menu) return;
    const h = () => setMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [menu]);
  const initial = ((claims?.email || claims?.name || "?").trim()[0] || "?").toUpperCase();
  async function newFolder() {
    setMenu(null);
    const name = (window.prompt("Folder name") || "").trim();
    if (name) await createFolder(name, "");
  }
  const Btn = ({ id, label, children }: { id: Panel; label: string; children: React.ReactNode }) => (
    <button className={"act-btn" + (active === id ? " active" : "")} title={label} aria-label={label}
      aria-pressed={active === id} onClick={() => onSelect(id)}>{children}</button>
  );
  return (
    <nav className="activitybar" onClick={(e) => e.stopPropagation()}>
      <div className="act-group">
        <div className="act-pop-wrap">
          <button className="act-btn act-menu" title="Menu" aria-label="Menu" aria-haspopup="menu"
            onClick={() => setMenu((m) => (m === "main" ? null : "main"))}><Menu size={22} strokeWidth={2} /></button>
          {menu === "main" && (
            <div className="acct-menu act-popover act-popover-top">
              <button className="acct-item exp-item" onClick={() => { setMenu(null); onNewDiagram(); }}><FilePlus2 size={16} strokeWidth={1.9} />New diagram</button>
              <button className="acct-item exp-item" onClick={newFolder}><FolderPlus size={16} strokeWidth={1.9} />New folder</button>
              <div className="menu-sep" />
              <Link className="acct-item exp-item" to="/projects" onClick={() => setMenu(null)}><Boxes size={16} strokeWidth={1.9} />Projects</Link>
              <Link className="acct-item exp-item" to="/trash" onClick={() => setMenu(null)}><Trash2 size={16} strokeWidth={1.9} />Trash</Link>
              <a className="acct-item exp-item" href={docHref("kymo")} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)}><BookOpen size={16} strokeWidth={1.9} />Docs</a>
            </div>
          )}
        </div>
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
      </div>
    </nav>
  );
}
