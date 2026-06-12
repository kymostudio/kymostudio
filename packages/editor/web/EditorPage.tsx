import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, GoogleButton, colorFor } from "./auth";
import { useRoom } from "./room";
import { WorkspaceSwitcher, useWorkspace, assignDiagram } from "./workspace";
import { KINDS, renderKroki, sanitizeSvg } from "./kroki";
import { CodeEditor } from "./codeeditor";
import { SAMPLES } from "./samples";
import { DIAGRAMS_API, SAMPLE } from "./const";
import { newId, titleFrom } from "./util";
import { encodeShare, decodeShare, shareUrl } from "./share";
import { ChevronDown, Download, FileCode2, FileImage, Code2, Link2, Check, Save, Plus, Pencil, LayoutGrid, Copy, BookOpen } from "lucide-react";

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
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState(""); // deflate+base64url of the current source
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [renderReady, setRenderReady] = useState(false); // wasm engine loaded
  const [localSaved, setLocalSaved] = useState(false);   // no-room content is persisted in the URL
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
  const pendingImport = useRef<{ source: string; kind: string } | null>(null); // "Save a copy": carry shared content into the new room
  const titleRef = useRef(title);
  titleRef.current = title;
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const sourceRef = useRef(source);
  sourceRef.current = source;
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
        // Kroki SVG is third-party markup — and with ?s= links the source can be
        // anyone's. Strip scripts/handlers before it touches the DOM.
        out = sanitizeSvg(await renderKroki(k, src));
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
    // refs, not state: by the time the wasm lands, a share link may have replaced the sample
    import("./engine").then((m) => { if (stop) return; renderRef.current = m.renderDiagram; setRenderReady(true); if (kindRef.current === "kymo") doRender(sourceRef.current, "kymo"); });
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
    const imp = pendingImport.current; pendingImport.current = null;
    setSource(imp ? imp.source : SAMPLE); setKind(imp ? imp.kind : "kymo");
    setTitle(""); setEditingName(false); setShareError(null); setLocalSaved(false);
    synced.current = false; fresh.current = false; userEdited.current = !!imp;
  }, [d]);

  // Shared link: inflate the ?s= payload into the editor. Re-runs on history
  // navigation (Back from "+ New" must restore the shared content, not the sample).
  useEffect(() => {
    if (!shared || !sharedSrc) { setShareError(null); return; }
    let stop = false;
    decodeShare(sharedSrc)
      .then((src) => {
        if (stop) return;
        if (sharedKind && KINDS.some((k) => k.value === sharedKind)) setKind(sharedKind);
        userEdited.current = false; // pristine shared content — leave the URL alone until they type
        setShareError(null);
        setLocalSaved(true); // the content already lives in the URL
        setSource(src);
      })
      .catch(() => {
        if (stop) return;
        setSource(""); // don't show the sample as if it were the shared diagram
        setShareError("Invalid share link — couldn't read a diagram from the URL. The link may have been truncated in transit.");
      });
    return () => { stop = true; };
  }, [d, sharedSrc, sharedKind]); // eslint-disable-line

  const room = useRoom(roomId, idToken, {
    onLive: setLive, // not cleared here: the OLD socket closing on room switch would kill the boot state
    onMeta: (t) => setTitle(t && t !== "Untitled" ? t : ""),
    onDoc: (src, t, fromSelf, k) => {
      setSyncing(false);
      if (t !== undefined) setTitle(t && t !== "Untitled" ? t : "");
      synced.current = true;
      if (fromSelf) return;
      if (k) setKind(k);
      if (!src.trim()) {
        fresh.current = true;
        // "Save a copy" / typed-before-sync: content is already waiting in the editor.
        // Nothing will touch `source` again, so persist it now instead of on next keystroke.
        if (userEdited.current) {
          fresh.current = false;
          room.sendSource(source, kind);
          const t2 = kind === "kymo" ? titleFrom(source) : "Untitled";
          if (t2 !== "Untitled") { setTitle(t2); room.sendRename(t2); }
        }
        return;
      }
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
  // URL in sync so the address bar is always a working share link. Only after a
  // real local edit — never rewrite a pristine share URL (Back must keep it intact).
  useEffect(() => {
    if (d || !userEdited.current || !source.trim()) return;
    const t = setTimeout(async () => {
      window.history.replaceState(null, "", shareUrl(kind, await encodeShare(source)));
      setLocalSaved(true);
    }, 300);
    return () => clearTimeout(t);
  }, [source, kind, d]); // eslint-disable-line

  useEffect(() => {
    const h = () => { setMenuOpen(false); setExportOpen(false); setShareOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") h(); };
    document.addEventListener("click", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("click", h); document.removeEventListener("keydown", k); };
  }, []);

  // Without a room there's no stored title — derive one from the source so share
  // links and the guest editor aren't a blank "/" in the header (kymo kind only).
  const localTitle = !d && kind === "kymo" ? titleFrom(source) : "Untitled";
  const diagramLabel = title || (localTitle !== "Untitled" ? localTitle : "Untitled");
  const booting = (!d && !!idToken && !shared) || syncing; // redirecting to the latest diagram, or waiting for the first doc
  const initial = ((claims?.email || claims?.name || "?").trim()[0] || "?").toUpperCase();

  useEffect(() => {
    document.title = diagramLabel !== "Untitled" ? diagramLabel + " · Kymo" : "Kymostudio";
  }, [diagramLabel]);

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
  async function openShare() {
    if (shareOpen) { setShareOpen(false); return; }
    if (!source.trim()) return;
    setSharePayload(""); setCopiedKey(null); setShareOpen(true);
    const payload = await encodeShare(source);
    setSharePayload(payload);
    copyText("link", shareUrl(kind, payload), true); // default action: opening Share already puts the link in the clipboard
  }
  async function copyText(key: string, text: string, silent = false) {
    try { await navigator.clipboard.writeText(text); } catch { if (!silent) window.prompt("Copy:", text); return; }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
  }
  function exportSource() {
    if (!source.trim()) return;
    const ext = kind === "kymo" ? ".kymo" : `.${kind}.txt`;
    saveBlob(new Blob([source], { type: "text/plain;charset=utf-8" }), (diagramLabel || "flowchart") + ext);
  }
  function newDiagram() {
    // No room = the only copy of edited content is this tab/URL. Ask first.
    if (!d && userEdited.current && !window.confirm("Replace the current diagram with a fresh one?\nYour current version stays reachable via the Back button.")) return;
    if (!idToken) {
      // Guests have no rooms — a ?d= URL would be a dead room that silently loses
      // everything typed into it. Reset to a fresh local sample instead.
      setSource(SAMPLE); setKind("kymo"); setTitle(""); setShareError(null);
      setLocalSaved(false); // pristine sample isn't in the URL — don't claim it is
      userEdited.current = false;
      navigate("/");
      return;
    }
    const id = newId();
    assignDiagram(idToken, id, currentWs); // lands in the workspace you're looking at
    navigate("/?d=" + id);
  }
  // Signed-in user viewing a share link: import the shared content into a real room.
  function saveCopy() {
    const id = newId();
    pendingImport.current = { source, kind };
    assignDiagram(idToken, id, currentWs);
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
        {/* identity & document: logo → app home (guests: the product landing), workspace, editable title, sync state */}
        {claims
          ? <Link className="brand" to="/diagrams"><img src="/favicon.svg" alt="" /></Link>
          : <a className="brand" href="https://kymo.studio" title="Kymo Studio"><img src="/favicon.svg" alt="" /></a>}
        {claims && <WorkspaceSwitcher />}
        {claims && <span className="sep">/</span>}
        {booting ? <span className="skeleton name-skel" /> : claims ? (
          editingName ? (
            <input className="diagram-input" autoFocus maxLength={60} defaultValue={title} placeholder="Untitled"
              onKeyDown={(e) => { if (e.key === "Enter") commitRename((e.target as HTMLInputElement).value); else if (e.key === "Escape") setEditingName(false); }}
              onBlur={(e) => commitRename(e.target.value)} />
          ) : (
            <span className={"diagram-name editable" + (title ? "" : " untitled")} title="Rename" onClick={() => setEditingName(true)}>
              {diagramLabel}
              <Pencil size={12.5} strokeWidth={2.1} className="pencil" />
            </span>
          )
        ) : <span className={"diagram-name" + (diagramLabel === "Untitled" ? " untitled" : "")}>{diagramLabel}</span>}
        {claims && d && !booting && (
          <span className={"save-ind" + (live ? "" : " off")} title={live ? "All changes are saved in real time" : "Disconnected — changes are not being saved"}>
            {live ? "Saved" : "Offline"}
          </span>
        )}
        {!d && localSaved && !booting && (
          <span className="save-ind url" title="Your diagram lives entirely in this page's URL — bookmark or Share it to keep it. Nothing is stored on a server.">
            Saved to URL
          </span>
        )}
        <div className="spacer" />
        {/* actions: nav · create · output (Share is the CTA) · account last */}
        <nav className="nav-group">
          <a className="navlink" href="https://docs.kymo.studio" target="_blank" rel="noopener" title="Kymo documentation"><BookOpen size={15} strokeWidth={2} />Docs</a>
          {claims && <Link className="navlink" to="/diagrams"><LayoutGrid size={15} strokeWidth={2} />Diagrams</Link>}
          <span className="vsep" />
          <button onClick={newDiagram} title="New diagram"><Plus size={16} strokeWidth={2.2} />New</button>
          {shared && claims && (
            <button onClick={saveCopy} title="Save a copy to your Diagrams">
              <Save size={16} strokeWidth={2} />
              Save a copy
            </button>
          )}
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
          <div className="account" onClick={(e) => e.stopPropagation()}>
            <button className="btn-primary" onClick={openShare} title="Share this diagram — the entire content lives in the link">
              <Link2 size={16} strokeWidth={2} />
              Share
            </button>
            {shareOpen && (() => {
              const link = sharePayload ? shareUrl(kind, sharePayload) : "";
              const tooLong = link.length > 2000;
              return (
                <div className="acct-menu share-menu">
                  <div className="share-head">Share diagram</div>
                  <p className="share-desc">The entire diagram lives in the link — anyone with it can open and edit their own copy, no sign-in needed.</p>
                  <div className="share-row">
                    <input className="share-url" readOnly spellCheck={false} value={link || "Generating link…"}
                      onFocus={(e) => e.currentTarget.select()} onClick={(e) => (e.currentTarget as HTMLInputElement).select()} />
                    <button className="btn-primary share-copy" disabled={!link} onClick={() => copyText("link", link)}>
                      {copiedKey === "link" ? <Check size={15} strokeWidth={2.2} /> : <Copy size={15} strokeWidth={2} />}
                      {copiedKey === "link" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {tooLong && <div className="share-warn">This link is {link.length.toLocaleString()} characters — some chat apps may truncate it. Consider exporting SVG/PNG instead.</div>}
                  <div className="menu-sep" />
                  <button className="acct-item exp-item" disabled={!link} onClick={() => copyText("md", `[${diagramLabel}](${link})`)}>
                    {copiedKey === "md" ? <Check size={17} strokeWidth={2.2} /> : <Code2 size={17} strokeWidth={1.9} />}
                    {copiedKey === "md" ? "Copied!" : "Copy Markdown link"}
                  </button>
                  {kind !== "kymo" && (
                    <button className="acct-item exp-item" disabled={!link}
                      title="SVG image rendered by kroki.io — paste straight into a GitHub README"
                      onClick={() => copyText("img", `![${diagramLabel}](https://kroki.io/${encodeURIComponent(kind)}/svg/${sharePayload})`)}>
                      {copiedKey === "img" ? <Check size={17} strokeWidth={2.2} /> : <FileImage size={17} strokeWidth={1.9} />}
                      {copiedKey === "img" ? "Copied!" : "Copy Markdown image"}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </nav>
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
      </header>
      <main ref={mainRef}>
        {booting ? (
          <div className="boot"><KLoader /></div>
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
                {kind !== "kymo" && (
                  <span className="kroki-note" title="Non-Kymo diagram types are rendered by the public kroki.io service — your source is sent to it. Kymo diagrams render locally in your browser.">
                    renders via kroki.io
                  </span>
                )}
              </div>
              <CodeEditor value={source} kind={kind} onChange={(v) => { userEdited.current = true; setShareError(null); setSource(v); }} />
            </section>
            <div className="splitter" title="Drag to resize · double-click for 50/50"
              onPointerDown={splitDown} onPointerMove={splitMove} onPointerUp={splitUp} onDoubleClick={splitReset} />
            <section className="pane">
              {shareError && <div className="share-error">{shareError}</div>}
              {kind === "kymo" && !renderReady && !shareError
                ? <div className="boot"><KLoader /></div>
                : <div id="preview" dangerouslySetInnerHTML={{ __html: svg }} />}
            </section>
          </>
        )}
      </main>
      <div className={"status" + (statusErr ? " error" : "")}>{status}</div>
    </div>
  );
}

// Miro-style brand loader (full-page boot + wasm engine load in the preview pane).
function KLoader() {
  return (
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
  );
}
