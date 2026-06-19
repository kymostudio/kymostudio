import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "./workspace";
import { useConfirm } from "./confirm";
import { registerProjectsModalOpener, registerDeleteProjectSimulator } from "./mcpstatus";
import { Boxes, Pencil, Trash2, Plus, Check, Search } from "lucide-react";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Project management as a MODAL (was the /projects route). List / filter / open /
// rename / delete projects without leaving the editor. Always mounted so the
// addressbar ("Manage projects…") and MCP can open it; the MCP `delete_project`
// `simulate:true` path drives it: open → type the name into the filter → click the
// row's delete → confirm — i.e. it "performs" the real deletion UI.
export function ProjectsModal() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { projects, currentProject, setCurrentProject, createProject, renameProject, deleteProject, refresh } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);

  // The addressbar / MCP open the modal through this registered opener.
  useEffect(() => {
    registerProjectsModalOpener(() => { setOpen(true); setFilter(""); refresh(); });
    return () => registerProjectsModalOpener(null);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k);
    setTimeout(() => filterRef.current?.focus(), 0);
    return () => document.removeEventListener("keydown", k);
  }, [open]);

  function openProject(id: string) { setCurrentProject(id); setOpen(false); navigate("/?p=" + encodeURIComponent(id)); }
  async function onRename(id: string, cur: string) {
    const name = (window.prompt("Rename project", cur) || "").trim();
    if (!name || name === cur) return;
    await renameProject(id, name);
  }
  async function onNew() {
    const name = (window.prompt("Project name") || "").trim();
    if (!name) return;
    const p = await createProject(name);
    if (p) openProject(p.id);
  }
  async function onDelete(id: string, name: string) {
    if (projects.length <= 1) return;
    if (!(await confirm({
      title: `Delete project “${name}”?`,
      detail: "Its folders and diagrams move to the trash. You can restore the project from there.",
    }))) return;
    await deleteProject(id);
  }

  // MCP-driven simulation of the delete flow (open → filter → click delete → confirm).
  const simulate = async (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p || projects.length <= 1) return;
    setOpen(true);
    await sleep(420);
    for (let i = 1; i <= p.name.length; i++) { setFilter(p.name.slice(0, i)); await sleep(34); }
    await sleep(360);
    (document.querySelector(`[data-pm-del="${id}"]`) as HTMLButtonElement | null)?.click(); // opens the confirm dialog
    await sleep(520);
    (document.querySelector(".confirm-overlay .confirm-foot .btn-danger") as HTMLButtonElement | null)?.click(); // accept
    await sleep(420);
    setFilter("");
  };
  const simRef = useRef(simulate); simRef.current = simulate;
  useEffect(() => { registerDeleteProjectSimulator((id) => simRef.current(id)); return () => registerDeleteProjectSimulator(null); }, []);

  if (!open) return null;
  const shown = projects.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()));
  return (
    <div className="pm-overlay" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Projects">
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-head">
          <h2><Boxes size={17} strokeWidth={2} /> Projects</h2>
          <div className="pm-head-actions">
            <button className="pm-new" onClick={onNew}><Plus size={15} strokeWidth={2.2} /> New project</button>
            <button className="pm-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="pm-search">
          <Search size={15} strokeWidth={2} className="pm-search-ic" />
          <input ref={filterRef} className="pm-search-input" value={filter} placeholder="Filter projects…" spellCheck={false}
            onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="pm-list">
          {shown.map((p) => (
            <div className="pm-row" key={p.id}>
              <span className="pm-thumb"><Boxes size={16} strokeWidth={1.9} /></span>
              <span className="pm-name" role="button" tabIndex={0} title="Open project"
                onClick={() => openProject(p.id)} onKeyDown={(e) => { if (e.key === "Enter") openProject(p.id); }}>{p.name}</span>
              {p.id === currentProject && <span className="pm-current"><Check size={13} strokeWidth={2.4} /> Current</span>}
              <button className="pm-open" onClick={() => openProject(p.id)}>Open</button>
              <button className="pm-icon" onClick={() => onRename(p.id, p.name)} title="Rename"><Pencil size={14} strokeWidth={2} /></button>
              <button className="pm-icon pm-del" data-pm-del={p.id} onClick={() => onDelete(p.id, p.name)}
                title={projects.length <= 1 ? "Can't delete your only project" : "Delete project"} disabled={projects.length <= 1}><Trash2 size={14} strokeWidth={2} /></button>
            </div>
          ))}
          {!shown.length && <p className="pm-empty">{projects.length ? `No project matches “${filter.trim()}”.` : "No projects yet."}</p>}
        </div>
      </div>
    </div>
  );
}
