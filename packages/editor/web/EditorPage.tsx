import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, GoogleButton, colorFor } from "./auth";
import { useRoom } from "./room";
import { WorkspaceSwitcher, useWorkspace, assignDiagram } from "./workspace";
import { KINDS, renderKroki } from "./kroki";
import { CodeEditor } from "./codeeditor";
import { SAMPLES } from "./samples";
import { DIAGRAMS_API, SAMPLE } from "./const";
import { newId, titleFrom } from "./util";
import { encodeShare, decodeShare, shareUrl } from "./share";
import { ChevronDown, Download, FileCode2, FileImage, Code2, Link2, Check } from "lucide-react";

export default function EditorPage() {
  const { claims, idToken, signOut } = useAuth();
  const { currentWs } = useWorkspace();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const d = params.get("d");
  const roomId = d;
  // ?s= carries the whole diagram in the URL (kroki-style share link, no room/account).
  const sharedSrc = params.get("s");
  const sharedKind = params.get("k");
  const shared = !!sharedSrc && !d;

  // No ?d: once signed in, jump to the most-recent diagram (or a fresh one).
  useEffect(() => {
    if (d || shared || !idToken) return;
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
  }, [d, shared, idToken, navigate]);

  const [source, setSource] = useState(SAMPLE);
  const [kind, setKind] = useState("kymo");
  const [svg, setSvg] = useState("");
  const [status, setStatus] = useState("Loading engine…");
  const [statusErr, setStatusErr] = useState(false);
  const [live, setLive] = useState(false);
  const [title, setTitle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  // split = width of the source pane in % (dbdiagram-style draggable divider)
  const [split, setSplit] = useState(() => {
    const v = parseFloat(localStorage.getItem("kymo_split") || "");
    return v >= 15 && v <= 85 ? v : 50;
  });
  const splitRef = useRef(split);
  splitRef.current = split;
  const mainRef = useRef<HTMLElement>(null);
  const draggingSplit = useRef(false);

  const renderRef = useRef<((s: string) => Promise<string>) | null>(null);
  const applyingRemote = useRef(false);
  const synced = useRef(false);
  const lastSvg = useRef("");
  const fresh = useRef(false);      // room exists on the server but has no document yet
  const userEdited = useRef(false); // the user actually typed in this room
  const titleRef = useRef(title);
  titleRef.current = title;
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const renderSeq = useRef(0); // kroki renders are async fetches — drop stale responses

  const doRender = useCallback(async (src: string, k: string) => {
    const seq = ++renderSeq.current;
    if (!src.trim()) { setSvg(""); setStatus("Enter diagram source…"); setStatusErr(false); return; }
    const t0 = performance.now();
    try {
      let out: string;
      if (k === "kymo") {
        if (!renderRef.current) return;
        out = await renderRef.current(src);
      } else {
        out = await renderKroki(k, src);
      }
      if (seq !== renderSeq.current) return;
      lastSvg.current = out; setSvg(out);
      setStatus(`OK · ${out.length} bytes · ${Math.round(performance.now() - t0)}ms`); setStatusErr(false);
    } catch (e: any) {
      if (seq !== renderSeq.current) return;
      setStatus(String(e?.message ?? e)); setStatusErr(true);
    }
  }, []);

  useEffect(() => {
    let stop = false;
    import("./engine").then((m) => { if (stop) return; renderRef.current = m.renderDiagram; if (kindRef.current === "kymo") doRender(source, "kymo"); });
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
    setSource(SAMPLE); setKind("kymo"); setTitle(""); setEditingName(false);
    synced.current = false; fresh.current = false; userEdited.current = false;
  }, [d]);

  // Shared link: inflate the ?s= payload into the editor.
  useEffect(() => {
    if (!shared || !sharedSrc) return;
    let stop = false;
    decodeShare(sharedSrc)
      .then((src) => {
        if (stop) return;
        if (sharedKind && KINDS.some((k) => k.value === sharedKind)) setKind(sharedKind);
        userEdited.current = true; // shared content is real content — keep the URL live as it's edited
        setSource(src);
      })
      .catch(() => { setStatus("Link share không hợp lệ"); setStatusErr(true); });
    return () => { stop = true; };
  }, []); // eslint-disable-line

  const room = useRoom(roomId, idToken, {
    onLive: setLive, // not cleared here: the OLD socket closing on room switch would kill the boot state
    onMeta: (t) => setTitle(t && t !== "Untitled" ? t : ""),
    onDoc: (src, t, fromSelf, k) => {
      setSyncing(false);
      if (t !== undefined) setTitle(t && t !== "Untitled" ? t : "");
      synced.current = true;
      if (fromSelf) return;
      if (k) setKind(k);
      if (!src.trim()) { fresh.current = true; return; } // brand-new room: keep the sample local until the user edits
      fresh.current = false;
      applyingRemote.current = true;
      setSource(src);
    },
  });

  useEffect(() => {
    const id = setTimeout(() => {
      doRender(source, kind);
      if (applyingRemote.current) { applyingRemote.current = false; return; }
      if (!synced.current) return;
      if (fresh.current && !userEdited.current) return; // untouched sample: nothing worth persisting
      room.sendSource(source, kind);
      if (fresh.current) {
        fresh.current = false;
        const t = kind === "kymo" ? titleFrom(source) : "Untitled";
        if (!titleRef.current && t !== "Untitled") { setTitle(t); room.sendRename(t); }
      }
    }, kind === "kymo" ? 120 : 450); // remote (kroki) renders get a longer debounce
    return () => clearTimeout(id);
  }, [source, kind]); // eslint-disable-line

  // Editing without a room (signed out / shared link): keep the kroki-style ?s=
  // URL in sync so the address bar is always a working share link.
  useEffect(() => {
    if (d || (!userEdited.current && !shared)) return;
    const t = setTimeout(async () => {
      window.history.replaceState(null, "", shareUrl(kind, await encodeShare(source)));
    }, 300);
    return () => clearTimeout(t);
  }, [source, kind, d]); // eslint-disable-line

  useEffect(() => {
    const h = () => { setMenuOpen(false); setExportOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const diagramLabel = title || "Untitled";
  const booting = (!d && !!idToken && !shared) || syncing; // redirecting to the latest diagram, or waiting for the first doc
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
  async function copyShareLink() {
    if (!source.trim()) return;
    const url = shareUrl(kind, await encodeShare(source));
    try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copy link:", url); return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function exportSource() {
    if (!source.trim()) return;
    const ext = kind === "kymo" ? ".kymo" : `.${kind}.txt`;
    saveBlob(new Blob([source], { type: "text/plain;charset=utf-8" }), (diagramLabel || "flowchart") + ext);
  }
  function newDiagram() {
    const id = newId();
    assignDiagram(idToken, id, currentWs); // lands in the workspace you're looking at
    navigate("/?d=" + id);
  }
  function commitRename(v: string) {
    const t = v.trim();
    if (t && t !== title) { room.sendRename(t); setTitle(t); }
    setEditingName(false);
  }

  function splitDown(e: React.PointerEvent) {
    e.preventDefault();
    draggingSplit.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.classList.add("splitting");
  }
  function splitMove(e: React.PointerEvent) {
    if (!draggingSplit.current || !mainRef.current) return;
    const r = mainRef.current.getBoundingClientRect();
    setSplit(Math.min(85, Math.max(15, ((e.clientX - r.left) / r.width) * 100)));
  }
  function splitUp() {
    if (!draggingSplit.current) return;
    draggingSplit.current = false;
    document.body.classList.remove("splitting");
    try { localStorage.setItem("kymo_split", splitRef.current.toFixed(1)); } catch {}
  }
  function splitReset() {
    setSplit(50);
    try { localStorage.setItem("kymo_split", "50"); } catch {}
  }

  return (
    <div className="layout">
      <header>
        <a className="brand" href="/"><img src="/favicon.svg" alt="" /></a>
        {claims && <WorkspaceSwitcher />}
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
        {!claims && <GoogleButton />}
        {claims && (
          <div className="account" onClick={(e) => e.stopPropagation()}>
            <button className="acct-btn" onClick={() => setMenuOpen((o) => !o)} title="Account">
              <span className="avatar" style={{ background: colorFor((claims.email || "x").toLowerCase()) }}>{initial}</span>
              <ChevronDown size={14} strokeWidth={2.2} className="chev" />
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
        <button onClick={copyShareLink} title="Copy link chia sẻ — toàn bộ diagram nằm trong URL, không cần đăng nhập để mở">
          {copied ? <Check size={16} strokeWidth={2.2} /> : <Link2 size={16} strokeWidth={2} />}
          {copied ? "Copied!" : "Share"}
        </button>
        <div className="account" onClick={(e) => e.stopPropagation()} onMouseEnter={() => setExportOpen(true)} onMouseLeave={() => setExportOpen(false)}>
          <button onClick={() => setExportOpen((o) => !o)}><Download size={16} strokeWidth={2} />Export <ChevronDown size={16} strokeWidth={2.2} className="chev-icon" /></button>
          {exportOpen && (
            <div className="acct-menu exp-menu">
              <button className="acct-item exp-item" onClick={() => { setExportOpen(false); download(); }}>
                <FileCode2 size={17} strokeWidth={1.9} />
                To SVG
              </button>
              <button className="acct-item exp-item" onClick={() => { setExportOpen(false); exportPNG(); }}>
                <FileImage size={17} strokeWidth={1.9} />
                To PNG
              </button>
              <div className="menu-sep" />
              <button className="acct-item exp-item" onClick={() => { setExportOpen(false); exportSource(); }}>
                <Code2 size={17} strokeWidth={1.9} />
                Source (.kymo)
              </button>
            </div>
          )}
        </div>
      </header>
      <main ref={mainRef}>
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
            <section className="pane" style={{ flex: `0 0 ${split}%` }}>
              <div className="pane-bar">
                <select className="kind-select" value={kind} title="Diagram type"
                  onChange={(e) => {
                    // kroki.io behaviour: switching type loads that type's example and renders it
                    const k = e.target.value;
                    userEdited.current = true;
                    setKind(k);
                    setSource(k === "kymo" ? SAMPLE : (SAMPLES[k] ?? ""));
                  }}>
                  {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
              <CodeEditor value={source} kind={kind} onChange={(v) => { userEdited.current = true; setSource(v); }} />
            </section>
            <div className="splitter" title="Kéo để chỉnh kích thước · double-click về 50/50"
              onPointerDown={splitDown} onPointerMove={splitMove} onPointerUp={splitUp} onDoubleClick={splitReset} />
            <section className="pane"><div id="preview" dangerouslySetInnerHTML={{ __html: svg }} /></section>
          </>
        )}
      </main>
      <div className={"status" + (statusErr ? " error" : "")}>{(live ? "⚡ " : "") + status}</div>
    </div>
  );
}
