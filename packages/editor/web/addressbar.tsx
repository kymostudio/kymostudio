import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useWorkspace, folderPath } from "./workspace";
import { DIAGRAMS_API } from "./const";
import { KindIcon } from "./sidebar";
import { extFor } from "./kroki";
import { ChevronRight, ChevronDown, Search, FolderPlus, Check, FolderOpen, Boxes } from "lucide-react";

type Hit = { id: string; title: string; kind: string };

// The IDE/browser-shell address bar: a breadcrumb (Project ▸ folder ▸ file) that
// doubles as a jump palette. Click the project crumb to switch project; click a
// folder crumb to scope new diagrams there; focus the bar (or hit ⌘/Ctrl-K) to
// search across projects + diagrams and jump to one.
export function AddressBar({ titleNode }: { titleNode: React.ReactNode }) {
  const navigate = useNavigate();
  const { idToken } = useAuth();
  const {
    projects, currentProject, currentProjectName, setCurrentProject, createProject,
    folders, currentFolder, setCurrentFolder,
  } = useWorkspace();

  const [projOpen, setProjOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // ⌘/Ctrl-K opens the jump palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openSearch(); }
      if (e.key === "Escape" && searching) closeSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searching]);

  // Close the project menu / search on an outside click.
  useEffect(() => {
    if (!projOpen && !searching) return;
    const h = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) { setProjOpen(false); closeSearch(); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [projOpen, searching]);

  // Debounced content search (titles are often "Untitled", so the backend also matches source).
  useEffect(() => {
    if (!searching) return;
    const needle = q.trim();
    if (!needle) { setHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${DIAGRAMS_API}?q=${encodeURIComponent(needle)}&id_token=${encodeURIComponent(idToken || "")}`, { cache: "no-store" });
        if (r.ok) setHits(((await r.json()).diagrams) || []);
      } catch {}
    }, 160);
    return () => clearTimeout(t);
  }, [q, searching, idToken]);

  function openSearch() { setProjOpen(false); setSearching(true); setQ(""); setHits([]); setTimeout(() => inputRef.current?.focus(), 0); }
  function closeSearch() { setSearching(false); setQ(""); setHits([]); }

  const projHits = q.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : [];
  const crumbs = folderPath(folders, currentFolder);

  async function onNewProject() {
    const name = (window.prompt("Project name") || "").trim();
    if (!name) return;
    const p = await createProject(name);
    if (p) setCurrentProject(p.id);
    setProjOpen(false);
  }

  return (
    <div className="addrbar" ref={rootRef} onClick={(e) => e.stopPropagation()}>
      {searching ? (
        <div className="addr-search">
          <Search size={15} strokeWidth={2} className="addr-search-icon" />
          <input ref={inputRef} className="addr-input" value={q} placeholder="Jump to a project or diagram…"
            spellCheck={false} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") closeSearch(); }} />
          {(projHits.length > 0 || hits.length > 0) && (
            <div className="addr-results">
              {projHits.length > 0 && <div className="addr-group">Projects</div>}
              {projHits.map((p) => (
                <button key={p.id} className="addr-hit" onClick={() => { setCurrentProject(p.id); closeSearch(); }}>
                  <Boxes size={15} strokeWidth={2} className="addr-hit-icon" />
                  <span className="addr-hit-name">{p.name}</span>
                </button>
              ))}
              {hits.length > 0 && <div className="addr-group">Diagrams</div>}
              {hits.map((h) => (
                <button key={h.id} className="addr-hit" onClick={() => { closeSearch(); navigate("/?d=" + encodeURIComponent(h.id)); }}>
                  <KindIcon kind={h.kind} />
                  <span className="addr-hit-name">{h.title || "Untitled"}<span className="addr-hit-ext">.{extFor(h.kind)}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="addr-crumbs">
          {/* project crumb — a switcher dropdown */}
          <div className="addr-proj">
            <button className="crumb crumb-proj" onClick={() => setProjOpen((o) => !o)} title="Switch project"
              aria-haspopup="menu" aria-expanded={projOpen}>
              <Boxes size={14} strokeWidth={2} />
              <span className="crumb-text">{currentProjectName}</span>
              <ChevronDown size={13} strokeWidth={2.2} className="crumb-chev" />
            </button>
            {projOpen && (
              <div className="acct-menu addr-proj-menu">
                <div className="ws-head">Projects</div>
                {projects.map((p) => (
                  <button key={p.id} className="acct-item ws-item" onClick={() => { setCurrentProject(p.id); setProjOpen(false); }}>
                    <span className="ws-check">{p.id === currentProject && <Check size={15} strokeWidth={2.4} />}</span>
                    {p.name}
                  </button>
                ))}
                <button className="acct-item ws-item ws-new" onClick={onNewProject}>
                  <span className="ws-check"><FolderPlus size={15} strokeWidth={2.2} /></span>
                  New project
                </button>
                <div className="menu-sep" />
                <button className="acct-item ws-item" onClick={() => { setProjOpen(false); navigate("/projects"); }}>
                  <span className="ws-check"><FolderOpen size={15} strokeWidth={2} /></span>
                  Manage projects…
                </button>
              </div>
            )}
          </div>
          {/* folder path crumbs (where new diagrams save) */}
          {crumbs.map((f) => (
            <React.Fragment key={f.id}>
              <ChevronRight size={13} strokeWidth={2.2} className="crumb-sep" />
              <button className="crumb" onClick={() => setCurrentFolder(f.id)} title={`Folder: ${f.name}`}>
                <span className="crumb-text">{f.name}</span>
              </button>
            </React.Fragment>
          ))}
          {/* the open diagram's editable title (rename lives in EditorPage) */}
          <ChevronRight size={13} strokeWidth={2.2} className="crumb-sep" />
          <div className="crumb crumb-file">{titleNode}</div>
          {/* affordance to open the jump palette */}
          <button className="addr-jump" onClick={openSearch} title="Search projects + diagrams (⌘K)" aria-label="Search">
            <Search size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
