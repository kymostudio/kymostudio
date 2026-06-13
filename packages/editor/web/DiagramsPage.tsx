import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useWorkspace, renameDiagram, childFoldersOf, flattenTree, descendantFolderIds, type Folder } from "./workspace";
import { useConfirm } from "./confirm";
import { useToast } from "./toast";
import { kindLabel } from "./kroki";
import { DIAGRAMS_API, TRASH_API } from "./const";
import { TemplateGallery, setPendingTemplate, type Template } from "./templates";
import { timeAgo } from "./util";
import { Search, Plus, Image as ImageIcon, ChevronRight, ChevronDown, Folder as FolderIcon, FolderPlus, Pencil, Trash2 } from "lucide-react";

type Item = { id: string; title: string; updatedAt: number; ws?: string; kind?: string; hasThumb?: boolean };

export default function DiagramsPage() {
  const { idToken, claims, signOut, expireSession } = useAuth();
  const { folders, createFolder, renameFolder, deleteFolder, moveFolder } = useWorkspace();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const restoreItem = useCallback((kind: "diagram" | "folder", id: string) => {
    if (!idToken) return;
    fetch(TRASH_API + "?id_token=" + encodeURIComponent(idToken), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id }),
    }).then(() => load()).catch(() => {});
  }, [idToken]); // eslint-disable-line
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());        // bulk-selected diagram ids
  const [expanded, setExpanded] = useState<Set<string>>(() => {  // open folders (persisted)
    try { return new Set(JSON.parse(localStorage.getItem("kymo_expanded") || "[]")); } catch { return new Set(); }
  });
  const [dragOver, setDragOver] = useState<string | null>(null); // folder id (or "__root__") under the cursor

  useEffect(() => { document.title = "Diagrams · Kymostudio"; return () => { document.title = "Kymostudio"; }; }, []);

  // Auth wall: no session (never signed in, or it just expired) → /login.
  useEffect(() => {
    if (!claims) navigate("/login?next=/diagrams", { replace: true });
  }, [claims, navigate]);

  const load = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (r.status === 401) { expireSession(); return; }
      if (!r.ok) { setError("Error " + r.status); return; }
      const j = await r.json();
      setError("");
      setItems((j.diagrams || []).slice().sort((a: Item, b: Item) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    } catch (e: any) { setError("Error: " + e.message); }
    setLoaded(true);
  }, [idToken, expireSession]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const vis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", load);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", load); };
  }, [load]);

  const persistExpanded = (s: Set<string>) => { try { localStorage.setItem("kymo_expanded", JSON.stringify([...s])); } catch {} };
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); persistExpanded(n); return n; });

  // A diagram whose `ws` points at a folder that no longer exists shows at the root.
  const folderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);
  const effFolder = useCallback((i: Item) => (i.ws && folderIds.has(i.ws) ? i.ws : ""), [folderIds]);
  const diagramsIn = useCallback(
    (fid: string) => items.filter((i) => effFolder(i) === fid).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [items, effFolder]
  );

  function pickTemplate(t: Template) {
    setGalleryOpen(false);
    setPendingTemplate({ source: t.source, kind: t.kind });
    navigate("/");
  }

  // ---- folder ops (prompt/confirm, like the old workspace bar) ----
  async function onNewFolder(parentId: string) {
    const name = (window.prompt("Folder name") || "").trim();
    if (!name) return;
    const f = await createFolder(name, parentId);
    if (f && parentId) setExpanded((s) => { const n = new Set(s); n.add(parentId); persistExpanded(n); return n; });
  }
  async function onRenameFolder(f: Folder) {
    const name = (window.prompt("Rename folder", f.name) || "").trim();
    if (name && name !== f.name) await renameFolder(f.id, name);
  }
  async function onRenameDiagram(dd: Item) {
    const name = (window.prompt("Rename diagram", dd.title || "Untitled") || "").trim();
    if (name && name !== dd.title) { renameDiagram(idToken, dd.id, name); setTimeout(load, 200); }
  }
  async function onDeleteFolder(f: Folder) {
    const sub = descendantFolderIds(folders, f.id);
    const hasContents = sub.size > 1 || items.some((i) => sub.has(effFolder(i)));
    if (!(await confirm({
      title: hasContents ? `Delete folder “${f.name}” and its contents?` : `Delete folder “${f.name}”?`,
      detail: hasContents ? "All diagrams and subfolders inside will be deleted too." : undefined,
    }))) return;
    await deleteFolder(f.id);
    load();
    toast({ message: `Deleted folder “${f.name}”`, actionLabel: "Undo", onAction: () => restoreItem("folder", f.id) });
  }

  // ---- move a diagram to a folder ("" = root) ----
  async function moveDiagram(id: string, folderId: string) {
    if (!idToken) return;
    const it = items.find((i) => i.id === id);
    if (it && effFolder(it) === folderId) return; // already there
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ws: folderId }),
      });
      if (!r.ok) { setError(`Move failed (${r.status})`); return; }
      load();
    } catch (e: any) { setError("Move failed: " + e.message); }
  }

  async function remove(dd: Item) {
    if (!idToken) return;
    if (!(await confirm({ title: `Delete “${dd.title || "Untitled"}”?` }))) return;
    try {
      const r = await fetch(`${DIAGRAMS_API}?id=${encodeURIComponent(dd.id)}&id_token=${encodeURIComponent(idToken)}`, { method: "DELETE" });
      if (!r.ok) { setError(`Delete failed (${r.status})`); return; }
      load();
      toast({ message: `Deleted “${dd.title || "Untitled"}”`, actionLabel: "Undo", onAction: () => restoreItem("diagram", dd.id) });
    } catch (e: any) { setError("Delete failed: " + e.message); }
  }

  // ---- bulk selection ----
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSel(new Set());
  useEffect(() => { setSel(new Set()); }, [q]);

  async function bulkDelete() {
    if (!idToken || !sel.size) return;
    const ids = [...sel];
    if (!(await confirm({ title: `Delete ${ids.length} diagram${ids.length > 1 ? "s" : ""}?` }))) return;
    try {
      const results = await Promise.all(ids.map((id) =>
        fetch(`${DIAGRAMS_API}?id=${encodeURIComponent(id)}&id_token=${encodeURIComponent(idToken)}`, { method: "DELETE" })
          .then((r) => r.ok).catch(() => false)));
      if (results.some((ok) => !ok)) setError("Some diagrams could not be deleted.");
      clearSel(); load();
      toast({ message: `Deleted ${ids.length} diagram${ids.length > 1 ? "s" : ""}`, actionLabel: "Undo",
        onAction: () => { if (idToken) Promise.all(ids.map((id) => fetch(TRASH_API + "?id_token=" + encodeURIComponent(idToken), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "diagram", id }) }).catch(() => {}))).then(() => load()); } });
    } catch (e: any) { setError("Delete failed: " + e.message); }
  }
  async function bulkMove(folderId: string) {
    if (!idToken || !sel.size) return;
    try {
      await Promise.all([...sel].map((id) =>
        fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, ws: folderId }),
        }).catch(() => {})));
      clearSel(); load();
    } catch (e: any) { setError("Move failed: " + e.message); }
  }

  // ---- drag & drop (HTML5) ----
  function dragStart(e: React.DragEvent, kind: "diagram" | "folder", id: string) {
    e.dataTransfer.setData("text/plain", kind + ":" + id);
    e.dataTransfer.effectAllowed = "move";
  }
  function allowDrop(e: React.DragEvent, target: string) {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (dragOver !== target) setDragOver(target);
  }
  async function dropOn(e: React.DragEvent, targetFolderId: string) {
    e.preventDefault(); e.stopPropagation(); setDragOver(null);
    const data = e.dataTransfer.getData("text/plain"); const [kind, id] = data.split(":");
    if (kind === "diagram" && id) await moveDiagram(id, targetFolderId);
    else if (kind === "folder" && id && id !== targetFolderId) {
      const ok = await moveFolder(id, targetFolderId);
      if (!ok) setError("Can't move a folder into itself.");
    }
  }

  // ---- move-to-folder <select> (no-drag fallback, e.g. mobile) ----
  const flat = useMemo(() => flattenTree(folders), [folders]);
  function MoveSelect({ value, onPick, forbid }: { value: string; onPick: (id: string) => void; forbid?: Set<string> }) {
    return (
      <select className="rmove" value={value} title="Move to folder"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onChange={(e) => { e.stopPropagation(); onPick(e.target.value); }}>
        <option value="">My Diagrams</option>
        {flat.map(({ folder, depth }) => (
          <option key={folder.id} value={folder.id} disabled={forbid?.has(folder.id)}>
            {" ".repeat(depth * 2) + folder.name}
          </option>
        ))}
      </select>
    );
  }

  function DiagramRow(dd: Item, depth: number) {
    return (
      <a key={dd.id} className={"rrow" + (sel.has(dd.id) ? " selected" : "")} href={"/?d=" + encodeURIComponent(dd.id)}
        style={{ paddingLeft: 10 + depth * 22 }}
        draggable onDragStart={(e) => dragStart(e, "diagram", dd.id)}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault(); navigate("/?d=" + encodeURIComponent(dd.id));
        }}>
        <input type="checkbox" className="rcheck" checked={sel.has(dd.id)} aria-label="Select diagram"
          onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); toggleSel(dd.id); }} />
        {/* always attempt the thumbnail — the backend renders it on demand from the stored source */}
        <span className="rthumb">
          <ImageIcon size={16} strokeWidth={1.8} className="rthumb-ph" />
          <img loading="lazy" alt="" src={`${DIAGRAMS_API}/thumb?id=${encodeURIComponent(dd.id)}&id_token=${encodeURIComponent(idToken || "")}`}
            onError={(e) => e.currentTarget.remove()} />
        </span>
        <span className="rtitle">{dd.title || "Untitled"}</span>
        {dd.kind && <span className="rkind">{kindLabel(dd.kind)}</span>}
        <button className="rmini" title="Rename" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenameDiagram(dd); }}><Pencil size={14} strokeWidth={2} /></button>
        <MoveSelect value={effFolder(dd)} onPick={(fid) => moveDiagram(dd.id, fid)} />
        <button className="rdel" title="Delete diagram" onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(dd); }}>Delete</button>
        <span className="rtime">{timeAgo(dd.updatedAt)}</span>
      </a>
    );
  }

  // Recursive level render: folders (each with its subtree when open) then diagrams.
  function renderLevel(parentId: string, depth: number): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    for (const f of childFoldersOf(folders, parentId).sort((a, b) => a.name.localeCompare(b.name))) {
      const open = expanded.has(f.id);
      const count = childFoldersOf(folders, f.id).length + diagramsIn(f.id).length;
      const forbid = descendantFolderIds(folders, f.id); // can't move this folder into its own subtree
      out.push(
        <div key={"f" + f.id} className={"frow" + (dragOver === f.id ? " dragover" : "")} style={{ paddingLeft: 8 + depth * 22 }}
          draggable onDragStart={(e) => { e.stopPropagation(); dragStart(e, "folder", f.id); }}
          onDragOver={(e) => allowDrop(e, f.id)} onDragLeave={() => setDragOver((d) => (d === f.id ? null : d))}
          onDrop={(e) => dropOn(e, f.id)} onClick={() => toggle(f.id)}>
          <span className="fchev">{open ? <ChevronDown size={16} strokeWidth={2.2} /> : <ChevronRight size={16} strokeWidth={2.2} />}</span>
          <FolderIcon size={17} strokeWidth={1.9} className="ficon" />
          <span className="fname">{f.name}</span>
          <span className="fcount">{count || ""}</span>
          <span className="factions" onClick={(e) => e.stopPropagation()}>
            <button title="New subfolder" onClick={() => onNewFolder(f.id)}><FolderPlus size={15} strokeWidth={2} /></button>
            <button title="Rename folder" onClick={() => onRenameFolder(f)}><Pencil size={15} strokeWidth={2} /></button>
            <button title="Delete folder" onClick={() => onDeleteFolder(f)}><Trash2 size={15} strokeWidth={2} /></button>
          </span>
        </div>
      );
      if (open) {
        const kids = renderLevel(f.id, depth + 1);
        out.push(...kids);
        if (!kids.length) out.push(<div key={"e" + f.id} className="frow-empty" style={{ paddingLeft: 8 + (depth + 1) * 22 + 25 }}>This folder is empty</div>);
      }
    }
    for (const dd of diagramsIn(parentId)) out.push(DiagramRow(dd, depth));
    return out;
  }

  const searching = q.trim().toLowerCase();
  const searchResults = searching
    ? items.filter((i) => (i.title || "Untitled").toLowerCase().includes(searching) || (i.kind && kindLabel(i.kind).toLowerCase().includes(searching)))
    : [];

  return (
    <main className="scroll" style={{ height: "100%" }}>
      {galleryOpen && <TemplateGallery onPick={pickTemplate} onClose={() => setGalleryOpen(false)} />}
      <div className="page">
        <div className="page-head">
          <h1>Diagrams</h1>
          <div className="head-actions">
            {claims && <button className="pill" onClick={() => onNewFolder("")}><FolderPlus size={15} strokeWidth={2} />New folder</button>}
            {claims && <button className="pill pill-dark" onClick={() => setGalleryOpen(true)} aria-haspopup="dialog">New diagram</button>}
          </div>
        </div>

        {!claims ? null : (
          <>
            <div className="search">
              <Search size={17} strokeWidth={2} />
              <input placeholder="Search diagrams…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {!!(searching ? searchResults.length : items.length) && (
              <div className={"bulk-bar" + (sel.size ? " active" : "")}>
                <label className="bulk-all">
                  <input type="checkbox"
                    checked={sel.size > 0 && sel.size === (searching ? searchResults.length : items.length)}
                    ref={(el) => { if (el) el.indeterminate = sel.size > 0 && sel.size < (searching ? searchResults.length : items.length); }}
                    onChange={(e) => setSel(e.target.checked ? new Set((searching ? searchResults : items).map((i) => i.id)) : new Set())} />
                  {sel.size ? `${sel.size} selected` : "Select"}
                </label>
                {!!sel.size && (
                  <span className="bulk-actions">
                    <button className="bulk-del" onClick={bulkDelete}>Delete</button>
                    <select className="bulk-move" defaultValue="__" title="Move selected to folder"
                      onChange={(e) => { if (e.target.value !== "__") bulkMove(e.target.value === "__root" ? "" : e.target.value); e.target.value = "__"; }}>
                      <option value="__">Move to…</option>
                      <option value="__root">My Diagrams</option>
                      {flat.map(({ folder, depth }) => <option key={folder.id} value={folder.id}>{" ".repeat(depth * 2) + folder.name}</option>)}
                    </select>
                    <button className="linklike" onClick={clearSel}>Clear</button>
                  </span>
                )}
              </div>
            )}
            {error && <div className="empty">{error}</div>}

            {/* tree (root is also a drop target → move to top level) */}
            <div className={"rows tree" + (dragOver === "__root__" ? " dragover-root" : "")}
              onDragOver={(e) => allowDrop(e, "__root__")} onDragLeave={() => setDragOver((d) => (d === "__root__" ? null : d))}
              onDrop={(e) => dropOn(e, "")}>
              {!loaded && !items.length && !error && [0, 1, 2].map((i) => (
                <div key={"skel" + i} className="rrow">
                  <span className="rtitle"><span className="skeleton" style={{ width: 180 }} /></span>
                  <span className="rtime"><span className="skeleton" style={{ width: 80 }} /></span>
                </div>
              ))}
              {searching ? searchResults.map((dd) => DiagramRow(dd, 0)) : renderLevel("", 0)}
              {loaded && (searching ? !searchResults.length : !items.length && !folders.length) && !error && (
                <div className="empty">{searching ? "No diagrams match your search." : "No diagrams yet — create one."}</div>
              )}
            </div>

            <div className="foot">
              <span>Signed in as {claims.email}</span>
              <Link className="linklike" to="/trash">Trash</Link>
              <button className="linklike" onClick={signOut}>Sign out</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
