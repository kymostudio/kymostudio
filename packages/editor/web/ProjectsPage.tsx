import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useConfirm } from "./confirm";
import { useWorkspace } from "./workspace";
import { Boxes, Pencil, Trash2, ArrowLeft, Plus, Check } from "lucide-react";

// Project management: list / create / rename / delete / open. Folders + diagrams
// live inside a project; "open" makes it the active project and returns to the editor.
export default function ProjectsPage() {
  const { claims, signOut } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { projects, currentProject, setCurrentProject, createProject, renameProject, deleteProject, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Projects · Kymostudio"; return () => { document.title = "Kymostudio"; }; }, []);
  useEffect(() => { if (!claims) navigate("/login?next=/projects", { replace: true }); }, [claims, navigate]);
  useEffect(() => { refresh(); }, [refresh]);

  async function onNew() {
    const name = (window.prompt("Project name") || "").trim();
    if (!name) return;
    setBusy(true);
    const p = await createProject(name);
    setBusy(false);
    if (p) setCurrentProject(p.id);
  }
  async function onRename(id: string, cur: string) {
    const name = (window.prompt("Rename project", cur) || "").trim();
    if (!name || name === cur) return;
    await renameProject(id, name);
  }
  async function onDelete(id: string, name: string) {
    if (projects.length <= 1) return;
    if (!(await confirm({
      title: `Delete project “${name}”?`,
      detail: "Its folders and diagrams move to the trash. You can restore the project from there.",
    }))) return;
    await deleteProject(id);
  }
  function open(id: string) { setCurrentProject(id); navigate("/"); }

  return (
    <main className="scroll" style={{ height: "100%" }}>
      <div className="page">
        <div className="page-head">
          <h1>Projects</h1>
          <div className="head-actions">
            <Link className="pill" to="/"><ArrowLeft size={15} strokeWidth={2} />Back</Link>
            <button className="pill" onClick={onNew} disabled={busy}><Plus size={15} strokeWidth={2} />New project</button>
          </div>
        </div>
        {!claims ? null : (
          <>
            <p className="trash-note">A project groups its own folders and diagrams. Open one to make it active.</p>
            <div className="rows projects-rows">
              {projects.map((p) => (
                <div key={p.id} className="rrow">
                  <span className="rthumb empty"><Boxes size={17} strokeWidth={1.9} /></span>
                  <span className="rtitle" role="button" tabIndex={0} style={{ cursor: "pointer" }}
                    onClick={() => open(p.id)} onKeyDown={(e) => { if (e.key === "Enter") open(p.id); }} title="Open project">{p.name}</span>
                  {p.id === currentProject && <span className="rkind"><Check size={13} strokeWidth={2.4} /> Current</span>}
                  <button className="rrestore" onClick={() => open(p.id)} title="Open">Open</button>
                  <button className="rmove" onClick={() => onRename(p.id, p.name)} title="Rename"><Pencil size={14} strokeWidth={2} /></button>
                  <button className="rdel" onClick={() => onDelete(p.id, p.name)} title={projects.length <= 1 ? "Can't delete your only project" : "Delete project"} disabled={projects.length <= 1}><Trash2 size={14} strokeWidth={2} /></button>
                </div>
              ))}
              {!projects.length && <div className="empty">No projects yet.</div>}
            </div>
            <div className="foot">
              <span>Signed in as {claims.email}</span>
              <button className="linklike" onClick={signOut}>Sign out</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
