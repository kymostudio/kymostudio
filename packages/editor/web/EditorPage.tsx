import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, GoogleButton, colorFor } from "./auth";
import { useRoom } from "./room";
import { DIAGRAMS_API, SAMPLE } from "./const";

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
      if (!id) id = (self.crypto && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
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
  const [editingName, setEditingName] = useState(false);

  const renderRef = useRef<((s: string) => Promise<string>) | null>(null);
  const applyingRemote = useRef(false);
  const synced = useRef(false);
  const lastSvg = useRef("");

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

  const room = useRoom(roomId, idToken, {
    onLive: setLive,
    onMeta: (t) => setTitle(t && t !== "Untitled" ? t : ""),
    onDoc: (src, t, fromSelf) => {
      if (t !== undefined) setTitle(t && t !== "Untitled" ? t : "");
      synced.current = true;
      if (fromSelf) return;
      if (!src.trim()) { room.sendSource(source); return; }
      applyingRemote.current = true;
      setSource(src);
    },
  });

  useEffect(() => {
    const id = setTimeout(() => {
      doRender(source);
      if (applyingRemote.current) { applyingRemote.current = false; return; }
      if (synced.current) room.sendSource(source);
    }, 120);
    return () => clearTimeout(id);
  }, [source]); // eslint-disable-line

  useEffect(() => {
    const h = () => setMenuOpen(false);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const diagramLabel = title || d || "";
  const initial = ((claims?.email || claims?.name || "?").trim()[0] || "?").toUpperCase();

  function download() {
    if (!lastSvg.current) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lastSvg.current], { type: "image/svg+xml" }));
    a.download = (diagramLabel || "flowchart") + ".svg"; a.click(); URL.revokeObjectURL(a.href);
  }
  function newDiagram() {
    const id = (self.crypto && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
    location.href = "/?d=" + id;
  }
  function commitRename(v: string) {
    const t = v.trim();
    if (t && t !== title) { room.sendRename(t); setTitle(t); }
    setEditingName(false);
  }

  return (
    <div className="layout">
      <header>
        <a className="brand" href="/"><span className="brand-dot" />kymo</a>
        <span className="sep">/</span>
        {claims ? (
          editingName ? (
            <input className="diagram-input" autoFocus maxLength={60} defaultValue={title || (d || "")}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename((e.target as HTMLInputElement).value); else if (e.key === "Escape") setEditingName(false); }}
              onBlur={(e) => commitRename(e.target.value)} />
          ) : (
            <span className="diagram-name editable" title="Đổi tên" onClick={() => setEditingName(true)}>{diagramLabel}</span>
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
        <button onClick={download}>Download SVG</button>
      </header>
      <main>
        <section className="pane"><textarea value={source} spellCheck={false} onChange={(e) => setSource(e.target.value)} /></section>
        <section className="pane"><div id="preview" dangerouslySetInnerHTML={{ __html: svg }} /></section>
      </main>
      <div className={"status" + (statusErr ? " error" : "")}>{(live ? "⚡ " : "") + status}</div>
    </div>
  );
}
