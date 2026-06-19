import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useWorkspace } from "./workspace";
import { DIAGRAMS_API, apiFetch } from "./const";
import { KindIcon } from "./sidebar";
import { extFor } from "./kroki";
import { ChevronDown, Search, FolderPlus, Check, FolderOpen, Boxes } from "lucide-react";
import { registerNewProjectSimulator, openProjectsModal } from "./mcpstatus";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Hit = { id: string; title: string; kind: string };

// The IDE/browser-shell address bar: a breadcrumb (Project ▸ folder ▸ file) that
// doubles as a jump palette. Click the project crumb to switch project; click a
// folder crumb to scope new diagrams there; focus the bar (or hit ⌘/Ctrl-K) to
// search across projects + diagrams and jump to one.
export function AddressBar({ titleNode, onOpenDiagram }: { titleNode: React.ReactNode; onOpenDiagram: (id: string) => void }) {
  const navigate = useNavigate();
  const { signedIn } = useAuth();
  const {
    projects, currentProject, currentProjectName, setCurrentProject, createProject,
  } = useWorkspace();

  const [projOpen, setProjOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [newMode, setNewMode] = useState(false);   // inline "new project" name input is showing
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
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
        const r = await apiFetch(`${DIAGRAMS_API}?q=${encodeURIComponent(needle)}`, { cache: "no-store" });
        if (r.ok) setHits(((await r.json()).diagrams) || []);
      } catch {}
    }, 160);
    return () => clearTimeout(t);
  }, [q, searching, signedIn]);

  function openSearch() { setProjOpen(false); setSearching(true); setQ(""); setHits([]); setTimeout(() => inputRef.current?.focus(), 0); }
  function closeSearch() { setSearching(false); setQ(""); setHits([]); }

  const projHits = q.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : [];

  // Show the inline name input (replaces window.prompt so it's fillable + visible).
  function onNewProject() { setNewMode(true); setNewName(""); setTimeout(() => newInputRef.current?.focus(), 0); }

  // Actually create — runs the REAL flow: createProject (refetches the list) then
  // switch via SPA navigation (NO page reload). Used by both the manual click and
  // the MCP-driven simulation.
  async function submitNewProject(name?: string) {
    const n = (name ?? newName).trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const p = await createProject(n);
      if (p) { setCurrentProject(p.id); navigate("/?p=" + encodeURIComponent(p.id)); }
    } finally {
      setBusy(false); setNewMode(false); setNewName(""); setProjOpen(false);
    }
  }

  // MCP-driven "simulation": play the real UI flow — open the switcher, reveal the
  // name input, type the name, submit — so it looks like a user did it (no reload).
  const simulateNewProject = async (name: string) => {
    const n = (name || "").trim();
    if (!n) return;
    setProjOpen(true);
    await sleep(380);
    setNewMode(true);
    await sleep(180);
    newInputRef.current?.focus();
    for (let i = 1; i <= n.length; i++) { setNewName(n.slice(0, i)); await sleep(34); }
    await sleep(320);
    await submitNewProject(n);
  };
  const simRef = useRef(simulateNewProject); simRef.current = simulateNewProject;
  useEffect(() => { registerNewProjectSimulator((name) => simRef.current(name)); return () => registerNewProjectSimulator(null); }, []);

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
                <button key={p.id} className="addr-hit" onClick={() => { setCurrentProject(p.id); closeSearch(); navigate("/?p=" + encodeURIComponent(p.id)); }}>
                  <Boxes size={15} strokeWidth={2} className="addr-hit-icon" />
                  <span className="addr-hit-name">{p.name}</span>
                </button>
              ))}
              {hits.length > 0 && <div className="addr-group">Diagrams</div>}
              {hits.map((h) => (
                <button key={h.id} className="addr-hit" onClick={() => { closeSearch(); onOpenDiagram(h.id); }}>
                  <KindIcon kind={h.kind} />
                  <span className="addr-hit-name">{h.title || "Untitled"}<span className="addr-hit-ext">.{extFor(h.kind)}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // VS Code "Command Center": a wide centred bar — the project switcher on
        // the left, a search affordance on the right; clicking the bar opens the
        // jump palette.
        <div className="addr-crumbs" role="button" tabIndex={0} onClick={openSearch}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSearch(); } }}
          title="Search projects + diagrams (⌘K)">
          {/* project crumb — a switcher dropdown (its own click, not the search) */}
          <div className="addr-proj">
            <button className="crumb crumb-proj" onClick={(e) => { e.stopPropagation(); setProjOpen((o) => !o); }} title="Switch project"
              aria-haspopup="menu" aria-expanded={projOpen}>
              <Boxes size={14} strokeWidth={2} />
              <span className="crumb-text">{currentProjectName}</span>
              <ChevronDown size={13} strokeWidth={2.2} className="crumb-chev" />
            </button>
            {projOpen && (
              // stop clicks here from bubbling to the crumb bar (whose onClick opens
              // the search palette) — picking a project should just switch, not search.
              <div className="acct-menu addr-proj-menu" onClick={(e) => e.stopPropagation()}>
                <div className="ws-head">Projects</div>
                {projects.map((p) => (
                  <button key={p.id} className="acct-item ws-item" onClick={() => {
                    if (p.id === currentProject) { setProjOpen(false); return; }
                    // Switch project = reload into it (fresh tabs/scope), not the SPA
                    // jump palette. setCurrentProject persists it before the reload.
                    setCurrentProject(p.id);
                    window.location.assign("/?p=" + encodeURIComponent(p.id));
                  }}>
                    <span className="ws-check">{p.id === currentProject && <Check size={15} strokeWidth={2.4} />}</span>
                    {p.name}
                  </button>
                ))}
                {newMode ? (
                  <form className="ws-new-form" onSubmit={(e) => { e.preventDefault(); submitNewProject(); }}>
                    <FolderPlus size={15} strokeWidth={2.2} className="ws-new-ic" />
                    <input ref={newInputRef} className="ws-new-input" value={newName} placeholder="Project name…" spellCheck={false}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") { setNewMode(false); setNewName(""); } }} />
                    <button className="ws-new-ok" type="submit" disabled={!newName.trim() || busy}>Create</button>
                  </form>
                ) : (
                  <button className="acct-item ws-item ws-new" onClick={onNewProject}>
                    <span className="ws-check"><FolderPlus size={15} strokeWidth={2.2} /></span>
                    New project
                  </button>
                )}
                <div className="menu-sep" />
                <button className="acct-item ws-item" onClick={() => { setProjOpen(false); openProjectsModal(); }}>
                  <span className="ws-check"><FolderOpen size={15} strokeWidth={2} /></span>
                  Manage projects…
                </button>
              </div>
            )}
          </div>
          {/* Only the project name is shown here (folder path + diagram title are
              dropped — the title is editable from the file-tab/preview instead). */}
          {/* affordance to open the jump palette */}
          <button className="addr-jump" onClick={openSearch} title="Search projects + diagrams (⌘K)" aria-label="Search">
            <Search size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
