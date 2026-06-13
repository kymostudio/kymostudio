import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useWorkspace } from "./workspace";
import { kindLabel } from "./kroki";
import { DIAGRAMS_API } from "./const";
import { TemplateGallery, setPendingTemplate, type Template } from "./templates";
import { Search, Plus, Image as ImageIcon } from "lucide-react";

type Item = { id: string; title: string; updatedAt: number; ws?: string; kind?: string; hasThumb?: boolean };

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
  const { idToken, claims, signOut, expireSession } = useAuth();
  const { workspaces, currentWs, currentName, setCurrentWs, createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => { document.title = "Diagrams · Kymostudio"; return () => { document.title = "Kymostudio"; }; }, []);

  // Auth wall: no session (never signed in, or it just expired) → /login.
  useEffect(() => {
    if (!claims) navigate("/login?next=/diagrams", { replace: true });
  }, [claims, navigate]);

  const load = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (r.status === 401) { expireSession(); return; } // server says expired → the auth wall redirects to /login
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

  // "New diagram" opens the same type-first template gallery as the editor's
  // "+ New". The pick seeds a DRAFT in the editor (via setPendingTemplate) —
  // no room is created until the user saves or makes a first successful edit.
  function pickTemplate(t: Template) {
    setGalleryOpen(false);
    setPendingTemplate({ source: t.source, kind: t.kind });
    navigate("/");
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
      {galleryOpen && <TemplateGallery onPick={pickTemplate} onClose={() => setGalleryOpen(false)} />}
      <div className="page">
        <div className="page-head">
          <h1>Diagrams</h1>
          <div className="head-actions">
            {claims && <button className="pill pill-dark" onClick={() => setGalleryOpen(true)} aria-haspopup="dialog">New diagram</button>}
          </div>
        </div>

        {!claims ? null /* the auth wall above is redirecting to /login */ : (
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
                <a key={dd.id} className="rrow" href={"/?d=" + encodeURIComponent(dd.id)}
                  onClick={(e) => {
                    // SPA navigation → the editor's boot loader shows instead of a blank full-page reload
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    navigate("/?d=" + encodeURIComponent(dd.id));
                  }}>
                  <span className="rthumb">
                    {dd.hasThumb
                      ? <img loading="lazy" alt="" src={`${DIAGRAMS_API}/thumb?id=${encodeURIComponent(dd.id)}&id_token=${encodeURIComponent(idToken || "")}`}
                          onError={(e) => { (e.currentTarget.parentElement as HTMLElement).classList.add("empty"); e.currentTarget.remove(); }} />
                      : <ImageIcon size={16} strokeWidth={1.8} />}
                  </span>
                  <span className="rtitle">{dd.title || "Untitled"}</span>
                  {dd.kind && <span className="rkind">{kindLabel(dd.kind)}</span>}
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
