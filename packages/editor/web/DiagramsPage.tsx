import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, GoogleButton } from "./auth";
import { DIAGRAMS_API } from "./const";

type Item = { id: string; title: string; updatedAt: number };

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
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

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
  }, [idToken]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const vis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("focus", load);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("focus", load); };
  }, [load]);

  function newDiagram() {
    const id = (self.crypto && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
    location.href = "/?d=" + id;
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

  const filtered = q.trim()
    ? items.filter((i) => (i.title || "Untitled").toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  return (
    <main className="scroll" style={{ height: "100%" }}>
      <div className="page">
        <div className="page-head">
          <h1>Diagrams</h1>
          <div className="head-actions">
            <Link className="pill" to="/">Editor</Link>
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
            <div className="search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              <input placeholder="Search diagrams…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {error && <div className="empty">{error}</div>}
            <div className="rows">
              {filtered.map((dd) => (
                <a key={dd.id} className="rrow" href={"/?d=" + encodeURIComponent(dd.id)}>
                  <span className="rtitle">{dd.title || "Untitled"}</span>
                  <button className="rdel" title="Delete diagram"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(dd); }}>Delete</button>
                  <span className="rtime">{timeAgo(dd.updatedAt)}</span>
                </a>
              ))}
              {!filtered.length && !error && (
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
