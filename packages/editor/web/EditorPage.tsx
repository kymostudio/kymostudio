import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, GoogleButton, colorFor } from "./auth";
import { useRoom } from "./room";
import { DIAGRAMS_API, SAMPLE } from "./const";
import { newId, titleFrom } from "./util";

export default function EditorPage() {
  const { claims, idToken, signOut } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const d = params.get("d");
  const roomId = d;

  // No ?d: once signed in, jump to the most-recent diagram (or a fresh one).
  useEffect(() => {
    if (d || !idToken) return;
    let stop = false;
    (async () => {
      let id: string | null = null;
      try {
        const r = await fetch(DIAGRAMS_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const list = (j.diagrams || []).slice().sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
          if (list.length) id = list[0].id;
        }
      } catch {}
      if (stop) return;
      if (!id) id = newId();
      navigate("/?d=" + id, { replace: true });
    })();
    return () => { stop = true; };
  }, [d, idToken, navigate]);

  const [source, setSource] = useState(SAMPLE);
  const [svg, setSvg] = useState("");
  const [status, setStatus] = useState("Loading engine…");
  const [statusErr, setStatusErr] = useState(false);
  const [live, setLive] = useState(false);
  const [title, setTitle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const renderRef = useRef<((s: string) => Promise<string>) | null>(null);
  const applyingRemote = useRef(false);
  const synced = useRef(false);
  const lastSvg = useRef("");
  const fresh = useRef(false);      // room exists on the server but has no document yet
  const userEdited = useRef(false); // the user actually typed in this room
  const titleRef = useRef(title);
  titleRef.current = title;

  const doRender = useCallback(async (src: string) => {
    if (!renderRef.current) return;
    if (!src.trim()) { setSvg(""); setStatus("Enter flowchart source…"); setStatusErr(false); return; }
    const t0 = performance.now();
    try {
      const out = await renderRef.current(src);
      lastSvg.current = out; setSvg(out);
      setStatus(`OK · ${out.length} bytes · ${Math.round(performance.now() - t0)}ms`); setStatusErr(false);
    } catch (e: any) { setStatus(String(e?.message ?? e)); setStatusErr(true); }
  }, []);

  useEffect(() => {
    let stop = false;
    import("./engine").then((m) => { if (stop) return; renderRef.current = m.renderDiagram; doRender(source); });
    return () => { stop = true; };
  }, []); // eslint-disable-line

  // Hold a loading state from "room requested" to "first doc received" so the
  // header/title and source don't render a placeholder and then flip (5s failsafe).
  useEffect(() => {
    if (d && idToken) {
      setSyncing(true);
      const t = setTimeout(() => setSyncing(false), 5000);
      return () => clearTimeout(t);
    }
    setSyncing(false);
  }, [d, idToken]);

  // Rooms are switched client-side (+ New uses navigate()), so reset per-room state on ?d change.
  useEffect(() => {
    setSource(SAMPLE); setTitle(""); setEditingName(false);
    synced.current = false; fresh.current = false; userEdited.current = false;
  }, [d]);

  const room = useRoom(roomId, idToken, {
    onLive: setLive, // not cleared here: the OLD socket closing on room switch would kill the boot state
    onMeta: (t) => setTitle(t && t !== "Untitled" ? t : ""),
    onDoc: (src, t, fromSelf) => {
      setSyncing(false);
      if (t !== undefined) setTitle(t && t !== "Untitled" ? t : "");
      synced.current = true;
      if (fromSelf) return;
      if (!src.trim()) { fresh.current = true; return; } // brand-new room: keep the sample local until the user edits
      fresh.current = false;
      applyingRemote.current = true;
      setSource(src);
    },
  });

  useEffect(() => {
    const id = setTimeout(() => {
      doRender(source);
      if (applyingRemote.current) { applyingRemote.current = false; return; }
      if (!synced.current) return;
      if (fresh.current && !userEdited.current) return; // untouched sample: nothing worth persisting
      room.sendSource(source);
      if (fresh.current) {
        fresh.current = false;
        const t = titleFrom(source);
        if (!titleRef.current && t !== "Untitled") { setTitle(t); room.sendRename(t); }
      }
    }, 120);
    return () => clearTimeout(id);
  }, [source]); // eslint-disable-line

  useEffect(() => {
    const h = () => { setMenuOpen(false); setExportOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const diagramLabel = title || "Untitled";
  const booting = (!d && !!idToken) || syncing; // redirecting to the latest diagram, or waiting for the first doc
  const initial = ((claims?.email || claims?.name || "?").trim()[0] || "?").toUpperCase();

  function saveBlob(blob: Blob, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
  function download() {
    if (!lastSvg.current) return;
    saveBlob(new Blob([lastSvg.current], { type: "image/svg+xml" }), (diagramLabel || "flowchart") + ".svg");
  }
  async function exportPNG(scale = 2) {
    if (!lastSvg.current) return;
    const url = URL.createObjectURL(new Blob([lastSvg.current], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      let w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) {
        const m = lastSvg.current.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
        w = m ? Math.ceil(parseFloat(m[1])) : 800; h = m ? Math.ceil(parseFloat(m[2])) : 600;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w * scale; canvas.height = h * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => { if (b) saveBlob(b, (diagramLabel || "flowchart") + ".png"); }, "image/png");
    } finally { URL.revokeObjectURL(url); }
  }
  function exportSource() {
    if (!source.trim()) return;
    saveBlob(new Blob([source], { type: "text/plain;charset=utf-8" }), (diagramLabel || "flowchart") + ".kymo");
  }
  function newDiagram() {
    navigate("/?d=" + newId());
  }
  function commitRename(v: string) {
    const t = v.trim();
    if (t && t !== title) { room.sendRename(t); setTitle(t); }
    setEditingName(false);
  }

  return (
    <div className="layout">
      <header>
        <a className="brand" href="/"><img src="/favicon.svg" alt="" />kymo</a>
        <span className="sep">/</span>
        {booting ? <span className="skeleton name-skel" /> : claims ? (
          editingName ? (
            <input className="diagram-input" autoFocus maxLength={60} defaultValue={title} placeholder="Untitled"
              onKeyDown={(e) => { if (e.key === "Enter") commitRename((e.target as HTMLInputElement).value); else if (e.key === "Escape") setEditingName(false); }}
              onBlur={(e) => commitRename(e.target.value)} />
          ) : (
            <span className={"diagram-name editable" + (title ? "" : " untitled")} title="Đổi tên" onClick={() => setEditingName(true)}>{diagramLabel}</span>
          )
        ) : <span className="diagram-name" />}
        <div className="spacer" />
        {!claims && <span className="muted">Sign in to receive live updates</span>}
        {!claims && <GoogleButton />}
        {claims && (
          <div className="account" onClick={(e) => e.stopPropagation()}>
            <button className="acct-btn" onClick={() => setMenuOpen((o) => !o)} title="Account">
              <span className="avatar" style={{ background: colorFor((claims.email || "x").toLowerCase()) }}>{initial}</span>
              <span className="chev">▾</span>
            </button>
            {menuOpen && (
              <div className="acct-menu">
                <div className="acct-head">Signed in as<b>{claims.email}</b></div>
                <button className="acct-item" onClick={() => { setMenuOpen(false); signOut(); }}>Sign out</button>
              </div>
            )}
          </div>
        )}
        <Link className="btn" to="/diagrams">Diagrams</Link>
        <button className="btn-primary" onClick={newDiagram} title="New diagram">+ New</button>
        <div className="account" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setExportOpen((o) => !o)}>Export <span className="chev-inline">▾</span></button>
          {exportOpen && (
            <div className="acct-menu exp-menu">
              <button className="acct-item exp-item" onClick={() => { setExportOpen(false); download(); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                To SVG
              </button>
              <button className="acct-item exp-item" onClick={() => { setExportOpen(false); exportPNG(); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                To PNG
              </button>
              <div className="menu-sep" />
              <button className="acct-item exp-item" onClick={() => { setExportOpen(false); exportSource(); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></svg>
                Source (.kymo)
              </button>
            </div>
          )}
        </div>
      </header>
      <main>
        {booting ? (
          <div className="boot">
            <div className="kloader" role="img" aria-label="Loading">
              <div className="k1">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <line x1="33" y1="26.5" x2="33" y2="73.5" stroke="#fff" strokeWidth="11.5" strokeLinecap="round" />
                  <circle cx="33" cy="26.5" r="5.8" fill="#fff" /><circle cx="33" cy="26.5" r="2.44" fill="#e0095f" />
                  <circle cx="33" cy="73.5" r="5.8" fill="#fff" /><circle cx="33" cy="73.5" r="2.44" fill="#e0095f" />
                </svg>
              </div>
              <div className="k2">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <line x1="65.5" y1="27" x2="34" y2="58.5" stroke="#fff" strokeWidth="11.5" strokeLinecap="round" />
                  <circle cx="65.5" cy="27" r="5.8" fill="#fff" /><circle cx="65.5" cy="27" r="2.44" fill="#e0095f" />
                  <circle cx="34" cy="58.5" r="5.8" fill="#fff" /><circle cx="34" cy="58.5" r="2.44" fill="#e0095f" />
                </svg>
              </div>
              <div className="k3">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <line x1="48" y1="49.5" x2="67" y2="73" stroke="#fff" strokeWidth="11.5" strokeLinecap="round" />
                  <circle cx="48" cy="49.5" r="5.8" fill="#fff" /><circle cx="48" cy="49.5" r="2.44" fill="#e0095f" />
                  <circle cx="67" cy="73" r="5.8" fill="#fff" /><circle cx="67" cy="73" r="2.44" fill="#e0095f" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="pane"><textarea value={source} spellCheck={false} onChange={(e) => { userEdited.current = true; setSource(e.target.value); }} /></section>
            <section className="pane"><div id="preview" dangerouslySetInnerHTML={{ __html: svg }} /></section>
          </>
        )}
      </main>
      <div className={"status" + (statusErr ? " error" : "")}>{(live ? "⚡ " : "") + status}</div>
    </div>
  );
}
