import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, GoogleButton } from "./auth";
import { DIAGRAMS_API } from "./const";

type Item = { id: string; title: string; updatedAt: number };

export default function DiagramsPage() {
  const { idToken, claims, signOut } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    if (!idToken) return;
    setStatus("Loading…");
    try {
      const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (!r.ok) { setStatus(r.status === 401 ? "Session expired — sign in again." : "Error " + r.status); return; }
      const j = await r.json();
      const list: Item[] = (j.diagrams || []).slice().sort((a: Item, b: Item) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setItems(list);
      setStatus(list.length ? `${list.length} diagram${list.length > 1 ? "s" : ""}` : "No diagrams yet — create one.");
    } catch (e: any) { setStatus("Error: " + e.message); }
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

  return (
    <div className="layout">
      <header>
        <strong>My diagrams</strong>
        <div className="spacer" />
        {claims && <span className="muted">{claims.email}</span>}
        {claims && <button onClick={load}>Refresh</button>}
        {claims && <button onClick={newDiagram}>+ New</button>}
        <Link className="btn" to="/">Editor</Link>
        {claims && <button onClick={signOut}>Sign out</button>}
      </header>
      <main className="scroll">
        <div className="wrap">
          {!claims ? (
            <div className="signin"><p className="muted">Sign in with Google to see your diagrams.</p><GoogleButton /></div>
          ) : (
            <>
              <div className="status-line muted">{status}</div>
              <div className="list">
                {items.map((dd) => (
                  <a key={dd.id} className="row" href={"/?d=" + encodeURIComponent(dd.id)}>
                    <span className="title">{dd.title || "Untitled"}</span>
                    <span className="meta">{dd.id} · {new Date(dd.updatedAt).toLocaleString()}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
