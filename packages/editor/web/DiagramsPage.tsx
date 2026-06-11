import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, GoogleButton } from "./auth";
import { useWorkspace, assignDiagram } from "./workspace";
import { DIAGRAMS_API } from "./const";
import { newId } from "./util";
import { Search, Plus } from "lucide-react";

type Item = { id: string; title: string; updatedAt: number; ws?: string };

function timeAgo(ms: number): string {
  if (!ms) return "";
  const s = Math.max(1, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo > 1 ? "s" : ""} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y > 1 ? "s" : ""} ago`;
}

export default function DiagramsPage() {
  const { idToken, claims, signOut } = useAuth();
  const { workspaces, currentWs, currentName, setCurrentWs, createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { document.title = "Diagrams · Kymostudio"; return () => { document.title = "Kymostudio"; }; }, []);

  const load = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (!r.ok) { setError(r.status === 401 ? "Session expired — sign in again." : "Error " + r.status); return; }
      const j = await r.json();
      setError("");
      setItems((j.diagrams || []).slice().sort((a: Item, b: Item) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    } catch (e: any) { setError("Error: " + e.message); }
    setLoaded(true);
  }, [idToken]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const vis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", load);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", load); };
  }, [load]);

  function newDiagram() {
    const id = newId();
    assignDiagram(idToken, id, currentWs);
    navigate("/?d=" + id);
  }

  async function onNewWorkspace() {
    const name = (window.prompt("Workspace name") || "").trim();
    if (!name) return;
    const ws = await createWorkspace(name);
    if (ws) setCurrentWs(ws.id);
  }
  async function onRenameWorkspace() {
    const name = (window.prompt("Rename workspace", currentName) || "").trim();
    if (name && name !== currentName) await renameWorkspace(currentWs, name);
  }
  async function onDeleteWorkspace() {
    if (!window.confirm(`Delete workspace "${currentName}"? Its diagrams move back to Personal.`)) return;
    await deleteWorkspace(currentWs);
    load();
  }

  async function move(dd: Item, ws: string) {
    if (!idToken) return;
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: dd.id, ws }),
      });
      if (!r.ok) { setError(`Move failed (${r.status})`); return; }
      load();
    } catch (e: any) { setError("Move failed: " + e.message); }
  }

  async function remove(dd: Item) {
    if (!idToken) return;
    if (!window.confirm(`Delete "${dd.title || "Untitled"}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`${DIAGRAMS_API}?id=${encodeURIComponent(dd.id)}&id_token=${encodeURIComponent(idToken)}`, { method: "DELETE" });
      if (!r.ok) { setError(`Delete failed (${r.status})`); return; }
      load();
    } catch (e: any) { setError("Delete failed: " + e.message); }
  }

  const inWs = items.filter((i) => (i.ws || "") === currentWs);
  const filtered = q.trim()
    ? inWs.filter((i) => (i.title || "Untitled").toLowerCase().includes(q.trim().toLowerCase()))
    : inWs;

  return (
    <main className="scroll" style={{ height: "100%" }}>
      <div className="page">
        <div className="page-head">
          <h1>Diagrams</h1>
          <div className="head-actions">
            {claims && <button className="pill pill-dark" onClick={newDiagram}>New diagram</button>}
          </div>
        </div>

        {!claims ? (
          <div className="signin">
            <p className="muted">Sign in with Google to see your diagrams.</p>
            <GoogleButton />
          </div>
        ) : (
          <>
            <div className="ws-bar">
              <button className={"ws-pill" + (currentWs === "" ? " active" : "")} onClick={() => setCurrentWs("")}>Personal</button>
              {workspaces.map((w) => (
                <button key={w.id} className={"ws-pill" + (currentWs === w.id ? " active" : "")} onClick={() => setCurrentWs(w.id)}>{w.name}</button>
              ))}
              <button className="ws-pill ws-add" onClick={onNewWorkspace} title="New workspace"><Plus size={14} strokeWidth={2.2} /></button>
              {currentWs && (
                <span className="ws-actions">
                  <button className="linklike" onClick={onRenameWorkspace}>Rename</button>
                  <button className="linklike" onClick={onDeleteWorkspace}>Delete</button>
                </span>
              )}
            </div>
            <div className="search">
              <Search size={17} strokeWidth={2} />
              <input placeholder="Search diagrams…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {error && <div className="empty">{error}</div>}
            <div className="rows">
              {!loaded && !items.length && !error && [0, 1, 2].map((i) => (
                <div key={"skel" + i} className="rrow">
                  <span className="rtitle"><span className="skeleton" style={{ width: 180 }} /></span>
                  <span className="rtime"><span className="skeleton" style={{ width: 80 }} /></span>
                </div>
              ))}
              {filtered.map((dd) => (
                <a key={dd.id} className="rrow" href={"/?d=" + encodeURIComponent(dd.id)}>
                  <span className="rtitle">{dd.title || "Untitled"}</span>
                  <select className="rmove" value={dd.ws || ""} title="Move to workspace"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onChange={(e) => { e.stopPropagation(); move(dd, e.target.value); }}>
                    <option value="">Personal</option>
                    {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <button className="rdel" title="Delete diagram"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(dd); }}>Delete</button>
                  <span className="rtime">{timeAgo(dd.updatedAt)}</span>
                </a>
              ))}
              {loaded && !filtered.length && !error && (
                <div className="empty">{q ? "No diagrams match your search." : "No diagrams yet — create one."}</div>
              )}
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
