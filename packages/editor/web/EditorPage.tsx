import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, GoogleButton, colorFor } from "./auth";
import { useRoom } from "./room";
import { useWorkspace, assignDiagram } from "./workspace";
import { KINDS, renderKroki, sanitizeSvg } from "./kroki";
import { renderMermaid } from "./mermaid";
import { CodeEditor } from "./codeeditor";
import { Preview } from "./preview";
import { SAMPLES } from "./samples";
import { RENDER_API, SAMPLE } from "./const";
import { newId, titleFrom } from "./util";
import { encodeShare, decodeShare, shareUrl } from "./share";
import { TemplateGallery, takePendingTemplate, type Template } from "./templates";
import { ActivityBar, ExplorerPanel, SearchPanel, TemplatesPanel, type Panel } from "./sidebar";
import { WelcomeView } from "./welcome";
import { AddressBar } from "./addressbar";
import { sniffKind } from "./detect";
import { FileCode2, FileImage, Code2, Link2, Check, Save, Pencil, Copy, Menu, PanelLeft, SquareCode, Eye, Download, ChevronDown, FilePlus2 } from "lucide-react";

export default function EditorPage() {
  const { claims, idToken, signOut } = useAuth();
  const { currentFolder, currentProject } = useWorkspace();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const d = params.get("d");
  const roomId = d;
  // ?s= carries the whole diagram in the URL (kroki-style share link, no room/account).
  const sharedSrc = params.get("s");
  const sharedKind = params.get("k");
  const shared = !!sharedSrc && !d;

  // Save model is two-state: a no-?d buffer is always a DRAFT that lives only in
  // the URL (?s=) — nothing on the server until the explicit Save (button /
  // Cmd-S). Landing on "/" therefore shows a fresh draft of the sample; existing
  // files are opened from /diagrams. (Old behaviour auto-created a server room on
  // the first edit, which littered the Diagrams list with anonymous drafts.)

  // Shared links carry their kind in the URL — seed state from it so the first
  // render cycle never runs against the kymo sample (which would pull the 2.5 MB
  // wasm engine chunk that a kroki-rendered share link never uses).
  const initialKind = shared && sharedKind && KINDS.some((x) => x.value === sharedKind) ? sharedKind : "kymo";
  const [source, setSource] = useState(shared ? "" : SAMPLE);
  const [kind, setKind] = useState(initialKind);
  const [svg, setSvg] = useState("");
  const [status, setStatus] = useState(initialKind === "kymo" ? "Loading engine…" : "Rendering…");
  const [statusTitle, setStatusTitle] = useState(""); // dev detail (bytes · ms), shown only on hover
  const [statusErr, setStatusErr] = useState(false);
  const [live, setLive] = useState(false);
  const [title, setTitle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  // Set when the user starts a diagram from the Welcome panel. State, not a ref:
  // picking the Flowchart template seeds the editor with SAMPLE (its source is
  // byte-identical), so source never changes — only a re-render hides Welcome.
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [detected, setDetected] = useState<string | null>(null); // kind chosen by paste auto-detect (transient chip)
  const [sharePayload, setSharePayload] = useState(""); // deflate+base64url of the current source
  const warmedShare = useRef(""); // last kind+source warmed into the render cache
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [renderReady, setRenderReady] = useState(false); // wasm engine loaded
  const [editingName, setEditingName] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false); // explicit Save in flight (draft → room)
  // split = width of the source pane in % (dbdiagram-style draggable divider)
  const [split, setSplit] = useState(() => {
    const v = parseFloat(localStorage.getItem("kymo_split") || "");
    return v >= 15 && v <= 85 ? v : 50;
  });
  const splitRef = useRef(split);
  splitRef.current = split;
  const mainRef = useRef<HTMLElement>(null);
  const draggingSplit = useRef(false);
  // VSCode-style activity bar: which side panel is open (null = collapsed).
  // Explorer open by default on desktop, collapsed on phones.
  const isPhone = () => typeof matchMedia !== "undefined" && matchMedia("(max-width: 720px)").matches;
  const [activePanel, setActivePanel] = useState<Panel | null>(() => {
    const v = localStorage.getItem("kymo_panel");
    if (v === "explorer" || v === "search" || v === "templates") return v;
    if (v === "none") return null;
    return isPhone() ? null : "explorer";
  });
  // click an activity icon: toggle off if it's already active, else switch to it.
  const selectPanel = useCallback((p: Panel) => {
    setActivePanel((cur) => {
      const next = cur === p ? null : p;
      try { localStorage.setItem("kymo_panel", next ?? "none"); } catch {}
      return next;
    });
  }, []);
  // opening a file closes the panel on phones only (it's a drawer there).
  const closePanelOnPhone = useCallback(() => {
    if (isPhone()) { setActivePanel(null); try { localStorage.setItem("kymo_panel", "none"); } catch {} }
  }, []);

  // Three-region visibility (VS Code-style): the side Explorer (activePanel) plus
  // the source editor and the preview. At least one of source/preview stays on.
  const [panes, setPanes] = useState<{ source: boolean; preview: boolean }>(() => {
    try { const j = JSON.parse(localStorage.getItem("kymo_panes") || ""); if (j && typeof j.source === "boolean" && typeof j.preview === "boolean") return j; } catch {}
    return { source: true, preview: true };
  });
  const togglePane = useCallback((k: "source" | "preview") => {
    setPanes((p) => {
      const next = { ...p, [k]: !p[k] };
      if (!next.source && !next.preview) return p; // never hide both regions
      try { localStorage.setItem("kymo_panes", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const toggleExplorer = useCallback(() => {
    setActivePanel((cur) => { const next = cur ? null : "explorer"; try { localStorage.setItem("kymo_panel", next ?? "none"); } catch {} return next; });
  }, []);

  const renderRef = useRef<((s: string) => Promise<string>) | null>(null);
  const applyingRemote = useRef(false);
  const synced = useRef(false);
  const lastSvg = useRef("");
  const fresh = useRef(false);      // room exists on the server but has no document yet
  const userEdited = useRef(false); // the user actually typed in this room
  const pendingImport = useRef<{ source: string; kind: string; title?: string } | null>(null); // carry draft/shared content into a new room
  const pendingSave = useRef(false); // guest hit Save → sign in, then auto-save once the token lands
  // Auto-title tracks the source (titleFrom) until the user renames by hand; then
  // it locks. `autoTitle` is the last value we derived, so we can tell an
  // untouched auto name from one the user typed.
  const autoTitle = useRef("");
  const titleUserSet = useRef(false);
  const titleRef = useRef(title);
  titleRef.current = title;
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const renderSeq = useRef(0); // kroki renders are async fetches — drop stale responses

  // The wasm engine chunk is ~2.5 MB on the wire: load it on first kymo render,
  // never for kroki kinds (a mermaid share link must not pay for it).
  const enginePromise = useRef<Promise<void> | null>(null);
  const loadEngine = useCallback(() => {
    enginePromise.current ??= import("./engine").then((m) => { renderRef.current = m.renderDiagram; setRenderReady(true); });
    return enginePromise.current;
  }, []);

  const doRender = useCallback(async (src: string, k: string) => {
    const seq = ++renderSeq.current;
    if (!src.trim()) { setSvg(""); setStatus("Enter diagram source…"); setStatusErr(false); return; }
    const t0 = performance.now();
    try {
      let out: string;
      if (k === "kymo") {
        if (!renderRef.current) await loadEngine();
        if (seq !== renderSeq.current) return;
        out = await renderRef.current!(src);
      } else if (k === "mermaid") {
        // Mermaid renders in-browser (lazy mermaid.js chunk); a share link's
        // early kroki warm-up is only raced for the first paint. Same sanitize
        // pass as kroki output — the source is untrusted either way.
        out = sanitizeSvg(await renderMermaid(src));
      } else {
        // Kroki SVG is third-party markup — and with ?s= links the source can be
        // anyone's. Strip scripts/handlers before it touches the DOM.
        out = sanitizeSvg(await renderKroki(k, src));
      }
      if (seq !== renderSeq.current) return;
      lastSvg.current = out; setSvg(out);
      // Plain-language success — the byte/latency detail is dev-debug, kept only
      // in the tooltip. Errors stay verbose (the catch below), they're useful.
      setStatus(""); setStatusTitle(`${out.length.toLocaleString()} bytes · ${Math.round(performance.now() - t0)} ms`); setStatusErr(false);
    } catch (e: any) {
      if (seq !== renderSeq.current) return;
      setStatus(String(e?.message ?? e)); setStatusTitle(""); setStatusErr(true);
    }
  }, [loadEngine]);

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
    if (shared) return; // ?s= state is seeded at mount and owned by the decode effect below
    const imp = pendingImport.current ?? takePendingTemplate(); pendingImport.current = null;
    setSource(imp ? imp.source : SAMPLE); setKind(imp ? imp.kind : "kymo");
    setTitle(imp?.title || ""); setEditingName(false); setShareError(null); setSavingDraft(false);
    // A manually-named draft carries its title into the new room; otherwise the
    // name auto-tracks the source until the user renames.
    titleUserSet.current = !!imp?.title; autoTitle.current = "";
    // userEdited only matters when there's a room to push into (an explicit Save /
    // "Save a copy"); imported content with no ?d is a draft — keep pristine.
    synced.current = false; fresh.current = false; userEdited.current = !!imp && !!d;
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
        titleUserSet.current = false; autoTitle.current = "";
        setShareError(null);
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
    // A rename event locks auto-title — unless it's the echo of our OWN auto-rename
    // (title === the value we just derived), which must keep tracking the source.
    onMeta: (t) => { if (t && t !== autoTitle.current) titleUserSet.current = true; setTitle(t && t !== "Untitled" ? t : ""); },
    onDoc: (src, t, fromSelf, k) => {
      setSyncing(false);
      if (t !== undefined) setTitle(t && t !== "Untitled" ? t : "");
      synced.current = true;
      if (fromSelf) return;
      // adopt the snapshot's kind only when it carries a real document — a fresh
      // room's empty snapshot reports the server default ("kymo"), which must not
      // override the kind a template/"Save a copy" just seeded into the editor
      if (k && src.trim()) setKind(k);
      if (!src.trim()) {
        fresh.current = true;
        // explicit Save / "Save a copy" / typed-before-sync: content is already
        // waiting in the editor. Nothing will touch `source` again, so persist it
        // now instead of on next keystroke.
        if (userEdited.current) {
          fresh.current = false;
          room.sendSource(source, kind);
          const t2 = titleUserSet.current ? titleRef.current : titleFrom(source, kind);
          if (t2 && t2 !== "Untitled") { autoTitle.current = titleUserSet.current ? autoTitle.current : t2; setTitle(t2); room.sendRename(t2); }
        }
        return;
      }
      // A stored title that no longer matches its source was typed by a human → lock it.
      autoTitle.current = titleFrom(src, k || kind);
      titleUserSet.current = !!(t && t !== "Untitled" && t !== autoTitle.current);
      fresh.current = false;
      applyingRemote.current = true;
      setSource(src);
    },
  });

  useEffect(() => {
    const id = setTimeout(() => {
      doRender(source, kind);
      if (applyingRemote.current) { applyingRemote.current = false; return; }
      if (!d) return; // draft: no server room; the header title comes from localTitle and the URL-sync effect persists it
      if (!synced.current) return;
      if (fresh.current && !userEdited.current) return; // untouched sample: nothing worth persisting
      room.sendSource(source, kind);
      fresh.current = false;
      // Auto-title: keep the saved name in step with the source until the user
      // renames by hand (titleUserSet locks it).
      if (!titleUserSet.current) {
        const t = titleFrom(source, kind);
        const nt = t !== "Untitled" ? t : "";
        if (nt && nt !== titleRef.current) { autoTitle.current = nt; setTitle(nt); room.sendRename(nt); }
      }
    }, lastSvg.current ? (kind === "kymo" ? 120 : 450) : 0); // debounce typing, but never the very first render
    return () => clearTimeout(id);
  }, [source, kind]); // eslint-disable-line

  // Editing without a room (signed out / shared link): keep the kroki-style ?s=
  // URL in sync so the address bar is always a working share link. Only after a
  // real local edit — never rewrite a pristine share URL (Back must keep it intact).
  useEffect(() => {
    if (d || !userEdited.current || !source.trim()) return;
    const t = setTimeout(async () => {
      window.history.replaceState(null, "", shareUrl(kind, await encodeShare(source)));
    }, 300);
    return () => clearTimeout(t);
  }, [source, kind, d]); // eslint-disable-line

  useEffect(() => {
    const h = () => { setMenuOpen(false); setShareOpen(false); setExportOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") h(); };
    document.addEventListener("click", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("click", h); document.removeEventListener("keydown", k); };
  }, []);

  // Without a room there's no stored title — derive one from the source so share
  // links and the guest editor aren't a blank "/" in the header (kymo kind only).
  const localTitle = !d ? titleFrom(source, kind) : "Untitled";
  const diagramLabel = title || (localTitle !== "Untitled" ? localTitle : "Untitled");
  // Only a room waiting for its first doc "boots"; a draft lives at "/" with no
  // room, so it renders immediately.
  const booting = syncing;
  const initial = ((claims?.email || claims?.name || "?").trim()[0] || "?").toUpperCase();
  // A draft (no room, not a pristine share view) is unsaved until the explicit Save.
  const isDraft = !d && !shared;
  // VS Code-style Welcome: a fresh "/" (untouched sample) shows the Welcome panel
  // instead of the editor. Any in-place action (pick template / open file) arms
  // `welcomeDismissed`; navigating to a real route re-arms it (effect below).
  const showWelcome = isDraft && source === SAMPLE && !welcomeDismissed;

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
    // Warm the render cache (fire-and-forget): opening Share signals intent, so
    // render now — the recipient's first paint, and GitHub's first fetch of a
    // Copy-Markdown-image URL, become an edge cache hit instead of a render.
    // POST and the GET share-URL hash to the same content-addressed entry.
    const warmKey = kind + "\0" + source;
    if (warmedShare.current !== warmKey) {
      warmedShare.current = warmKey;
      fetch(`${RENDER_API}/${encodeURIComponent(kind)}/svg`, {
        method: "POST", headers: { "content-type": "text/plain" }, body: source,
      }).catch(() => {});
    }
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
  // "+ New" opens the template gallery — users pick a diagram TYPE; the
  // template carries the right kind, so the syntax choice happens for them.
  // Nothing is created server-side here: the pick seeds a DRAFT (URL-only). It
  // becomes a room only via the explicit Save — abandoned templates never litter
  // the Diagrams list.
  // Re-arm the Welcome panel whenever the route changes (back to a fresh "/").
  useEffect(() => { setWelcomeDismissed(false); }, [d, shared]);

  // "Open file…" on the Welcome panel: load a local diagram source into the draft.
  function openLocalFile(file: File) {
    file.text().then((txt) => {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const byExt = ext === "bpmn" ? "bpmn" : ext === "mmd" || ext === "mermaid" ? "mermaid" : "kymo";
      const k = sniffKind(txt) || byExt;
      setWelcomeDismissed(true);
      userEdited.current = true; titleUserSet.current = false; autoTitle.current = "";
      setTitle(""); setShareError(null);
      setKind(KINDS.some((x) => x.value === k) ? k : "kymo");
      setSource(txt);
      window.history.replaceState(null, "", "/");
    }).catch(() => {});
  }

  function pickTemplate(t: Template) {
    setGalleryOpen(false);
    setWelcomeDismissed(true); // leaving the Welcome panel for a real diagram
    // No room = the only copy of edited content is this tab/URL. Ask first.
    if (!d && userEdited.current && !window.confirm("Replace the current diagram with a fresh one?\nYour current version stays reachable via the Back button.")) return;
    titleUserSet.current = false; autoTitle.current = "";
    if (d) {
      pendingImport.current = { source: t.source, kind: t.kind }; // consumed by the ?d-change effect → lands as a draft
      navigate("/");
    } else {
      // already on a no-room buffer (draft/share view): seed in place
      setSource(t.source); setKind(t.kind); setTitle(""); setShareError(null);
      userEdited.current = false;
      window.history.replaceState(null, "", "/"); // pristine template isn't in the URL yet
    }
  }
  // Pop the Google sign-in prompt (guests can't own server files).
  const promptSignIn = useCallback(() => { (window as any).google?.accounts?.id?.prompt?.(); }, []);
  // Explicit Save: a draft → a real server file. Guests are prompted to sign in
  // first, then the save replays once the token lands (pendingSave).
  const save = useCallback(() => {
    if (d) return; // already a saved room
    if (!sourceRef.current.trim()) return;
    if (!idToken) { pendingSave.current = true; promptSignIn(); return; }
    setSavingDraft(true);
    const id = newId();
    pendingImport.current = { source: sourceRef.current, kind: kindRef.current, title: titleUserSet.current ? titleRef.current : undefined };
    assignDiagram(idToken, id, currentFolder, currentProject || undefined); // lands in the folder you're saving into
    navigate("/?d=" + id);
  }, [d, idToken, currentFolder, currentProject, navigate, promptSignIn]);
  const saveRef = useRef(save); saveRef.current = save;
  // Guest hit Save → signed in → finish the save now that we have a token.
  useEffect(() => {
    if (idToken && pendingSave.current) { pendingSave.current = false; saveRef.current(); }
  }, [idToken]);
  // Cmd/Ctrl-S saves a draft (no-op once it's a room — it autosaves).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); if (!d) saveRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d]);
  // Paste auto-detect: a whole-buffer paste in a recognizable grammar switches
  // the kind so the source "just renders" — the select stays as manual override.
  const detectTimer = useRef<number | undefined>(undefined);
  function onEditorPaste(text: string, fullReplace: boolean) {
    if (!fullReplace && userEdited.current) return;
    const k = sniffKind(text);
    if (!k || k === kindRef.current || !KINDS.some((x) => x.value === k)) return;
    setKind(k);
    setDetected(KINDS.find((x) => x.value === k)?.label ?? k);
    window.clearTimeout(detectTimer.current);
    detectTimer.current = window.setTimeout(() => setDetected(null), 4000);
  }
  // Signed-in user viewing a share link: import the shared content into a real room.
  function saveCopy() {
    const id = newId();
    pendingImport.current = { source, kind };
    assignDiagram(idToken, id, currentFolder, currentProject || undefined);
    navigate("/?d=" + id);
  }
  function commitRename(v: string) {
    const t = v.trim();
    if (t && t !== title) {
      titleUserSet.current = true; // a hand-typed name locks auto-title
      if (d) room.sendRename(t); // a draft keeps the name locally; save() carries it into the room
      setTitle(t);
    }
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

  // The document title element: a skeleton while booting, nothing on the Welcome
  // home screen (the panel below is self-evident — a redundant "Welcome" label in
  // the header just clutters it), an inline rename field / editable name when
  // signed in, else read-only. Rendered standalone for guests/welcome/share and
  // inside the AddressBar otherwise.
  const titleEl = booting ? <span className="skeleton name-skel" /> : showWelcome ? (
    null
  ) : claims ? (
    editingName ? (
      <input className="diagram-input" autoFocus maxLength={60} defaultValue={title} placeholder="Untitled"
        onKeyDown={(e) => { if (e.key === "Enter") commitRename((e.target as HTMLInputElement).value); else if (e.key === "Escape") setEditingName(false); }}
        onBlur={(e) => commitRename(e.target.value)} />
    ) : (
      <span className={"diagram-name editable" + (title ? "" : " untitled")} title={`${diagramLabel} — Rename`}
        role="button" tabIndex={0} aria-label="Rename diagram" onClick={() => setEditingName(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditingName(true); } }}>
        <span className="dn-text">{diagramLabel}</span>
        <Pencil size={12.5} strokeWidth={2.1} className="pencil" />
      </span>
    )
  ) : <span className={"diagram-name" + (diagramLabel === "Untitled" ? " untitled" : "")} title={diagramLabel}><span className="dn-text">{diagramLabel}</span></span>;

  return (
    <div className="layout">
      <header>
        {/* phones have no activity-bar rail → a hamburger opens the file drawer */}
        {claims && !shared && (
          <button className="hdr-menu mob-only" onClick={() => selectPanel("explorer")} title="Files" aria-label="Files"><Menu size={18} strokeWidth={2.2} /></button>
        )}
        {/* identity & document: logo → your Diagrams when signed in (the natural
            "home"), else the product site */}
        {claims
          ? <Link className="brand" to="/" title="Home" aria-label="Home"><img src="/logo.svg" alt="" /></Link>
          : <a className="brand" href="https://kymo.studio" target="_blank" rel="noopener" title="Kymo Studio" aria-label="Kymo Studio"><img src="/logo.svg" alt="" /></a>}
        {/* address bar (breadcrumb + ⌘K jump) wraps the editable title when signed in;
            guests / welcome / share links show the bare title */}
        {claims && !shared && !showWelcome
          ? <AddressBar titleNode={titleEl} />
          : titleEl}
        {/* the steady "Saved" pill is dropped (saving is silent + automatic); only
            surface the disconnection warning, and the unsaved-draft state below */}
        {claims && d && !booting && !live && (
          <span className="save-ind off" title="Disconnected — changes are not being saved">
            Offline
          </span>
        )}
        {isDraft && !booting && !showWelcome && (
          <span className="save-ind unsaved" title="Not saved anywhere yet — this draft only lives in this page's URL. Save to keep it in your Diagrams (⌘/Ctrl-S).">
            {savingDraft ? "Saving…" : "Unsaved"}
          </span>
        )}
        <div className="spacer" />
        {/* actions: nav · create · output (Share is the CTA) · account last */}
        <nav className="nav-group">
          {/* three-region toggles (VS Code-style): Explorer · Source · Preview */}
          {!showWelcome && !booting && (
            <div className="pane-toggles mob-hide" role="group" aria-label="Panels">
              {claims && !shared && (
                <button className={"pane-tg" + (activePanel ? " on" : "")} onClick={toggleExplorer} title="Toggle Explorer" aria-pressed={!!activePanel}><PanelLeft size={16} strokeWidth={2} /></button>
              )}
              <button className={"pane-tg" + (panes.source ? " on" : "")} onClick={() => togglePane("source")} title="Toggle Source" aria-pressed={panes.source}><SquareCode size={16} strokeWidth={2} /></button>
              <button className={"pane-tg" + (panes.preview ? " on" : "")} onClick={() => togglePane("preview")} title="Toggle Preview" aria-pressed={panes.preview}><Eye size={16} strokeWidth={2} /></button>
            </div>
          )}
          {/* draft Save stays a visible CTA when there's unsaved work to rescue */}
          {isDraft && !booting && !showWelcome && (
            <button className="btn-primary mob-hide" onClick={save} title="Save to your Diagrams (⌘/Ctrl-S)">
              <Save size={16} strokeWidth={2} />
              Save
            </button>
          )}
          {/* Export this diagram (SVG / PNG / source) — its own dropdown next to Share */}
          {!showWelcome && (
          <div className="account mob-hide" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setExportOpen((o) => !o)} aria-haspopup="menu" aria-expanded={exportOpen} title="Export this diagram">
              <Download size={16} strokeWidth={2} />Export<ChevronDown size={16} strokeWidth={2.2} className="chev-icon" />
            </button>
            {exportOpen && (
              <div className="acct-menu exp-menu">
                <button className="acct-item exp-item" onClick={() => { setExportOpen(false); download(); }}><FileCode2 size={17} strokeWidth={1.9} />To SVG</button>
                <button className="acct-item exp-item" onClick={() => { setExportOpen(false); exportPNG(); }}><FileImage size={17} strokeWidth={1.9} />To PNG</button>
                <div className="menu-sep" />
                <button className="acct-item exp-item" onClick={() => { setExportOpen(false); exportSource(); }}><Code2 size={17} strokeWidth={1.9} />Source (.kymo)</button>
              </div>
            )}
          </div>
          )}
          {/* Share is the standing CTA; New/Docs/Projects/Trash/Sign-out live on the
              activity-bar rail (hamburger + account). */}
          {!showWelcome && (
          <div className="account" onClick={(e) => e.stopPropagation()}>
            {/* Share is the standing CTA, but a draft's Save outranks it — demote Share to secondary then */}
            <button className={isDraft && !booting ? "" : "btn-primary"} onClick={openShare} title="Share this diagram — the entire content lives in the link">
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
                  <button className="acct-item exp-item" disabled={!link}
                    title="SVG image rendered by render.kymo.studio — paste straight into a GitHub README"
                    onClick={() => copyText("img", `![${diagramLabel}](https://render.kymo.studio/${encodeURIComponent(kind)}/svg/${sharePayload})`)}>
                    {copiedKey === "img" ? <Check size={17} strokeWidth={2.2} /> : <FileImage size={17} strokeWidth={1.9} />}
                    {copiedKey === "img" ? "Copied!" : "Copy Markdown image"}
                  </button>
                  {shared && claims && (<>
                    <div className="menu-sep" />
                    <button className="acct-item exp-item" onClick={() => { setShareOpen(false); saveCopy(); }}><Save size={17} strokeWidth={1.9} />Save a copy to my diagrams</button>
                  </>)}
                </div>
              );
            })()}
          </div>
          )}
        </nav>
        {/* signed-in account lives at the bottom of the activity bar (VSCode-style); guests sign in here */}
        {!claims && <GoogleButton />}
      </header>
      {galleryOpen && <TemplateGallery onPick={pickTemplate} onClose={() => setGalleryOpen(false)} />}
      <div className="workarea">
        {claims && !shared && (
          <>
            <ActivityBar active={activePanel} onSelect={selectPanel} onNewDiagram={() => setGalleryOpen(true)} />
            {activePanel === "explorer" && <ExplorerPanel currentId={d} currentTitle={diagramLabel} onNewDiagram={() => setGalleryOpen(true)} onClose={closePanelOnPhone} />}
            {activePanel === "search" && <SearchPanel currentId={d} onClose={closePanelOnPhone} />}
            {activePanel === "templates" && <TemplatesPanel onPick={pickTemplate} onClose={closePanelOnPhone} />}
            {activePanel && <div className="sb-backdrop" onClick={closePanelOnPhone} />}
          </>
        )}
        <main ref={mainRef}>
        {booting ? (
          <div className="boot"><KLoader /></div>
        ) : showWelcome ? (
          <WelcomeView onNew={() => setGalleryOpen(true)} onOpenFile={openLocalFile} onTemplate={pickTemplate} />
        ) : (
          <>
            {panes.source && (
            <section className="pane" style={panes.preview ? { flex: `0 0 ${split}%` } : undefined}>
              <div className="pane-bar">
                {/* Guests have no Explorer, so the New affordance lives here. A fresh
                    draft only — it never writes the DB (that happens on Save). */}
                {!claims && (
                  <button className="newdiag-btn" onClick={() => setGalleryOpen(true)}
                    title="Start a new diagram (a local draft — saved only when you Save)">
                    <FilePlus2 size={14} strokeWidth={2} />New
                  </button>
                )}
                {/* a visible label so the dropdown reads as a 28-format switcher, not a mystery control */}
                <label className="kind-label" htmlFor="kind-select">Type</label>
                <select id="kind-select" className="kind-select" value={kind} title="Diagram type — 28 formats"
                  onChange={(e) => {
                    // kroki.io behaviour: switching type loads that type's example. That OVERWRITES
                    // the buffer, so confirm first when the user has typed something worth keeping.
                    const k = e.target.value;
                    const sample = kindRef.current === "kymo" ? SAMPLE : (SAMPLES[kindRef.current] ?? "");
                    const dirty = source.trim() && source !== sample;
                    if (dirty && !window.confirm(`Switch to ${KINDS.find((x) => x.value === k)?.label ?? k}?\nThis replaces the current source with a ${KINDS.find((x) => x.value === k)?.label ?? k} starter — your edits will be lost.`)) {
                      e.target.value = kindRef.current; // revert the select; leave source untouched
                      return;
                    }
                    userEdited.current = true;
                    setKind(k);
                    setSource(k === "kymo" ? SAMPLE : (SAMPLES[k] ?? ""));
                  }}>
                  {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
                {detected && <span className="detect-chip">auto-detected {detected}</span>}
              </div>
              <CodeEditor value={source} kind={kind} onPaste={onEditorPaste} onChange={(v) => { userEdited.current = true; setShareError(null); setSource(v); }} />
            </section>
            )}
            {panes.source && panes.preview && (
              <div className="splitter" title="Drag to resize · double-click for 50/50"
                onPointerDown={splitDown} onPointerMove={splitMove} onPointerUp={splitUp} onDoubleClick={splitReset} />
            )}
            {panes.preview && (
            <section className="pane">
              {shareError && <div className="share-error">{shareError}</div>}
              {kind === "kymo" && !renderReady && !shareError
                ? <div className="boot"><KLoader /></div>
                : <Preview svg={svg} fitKey={(d || "shared") + ":" + kind} />}
            </section>
            )}
          </>
        )}
        </main>
      </div>
      {!showWelcome && <div className={"status" + (statusErr ? " error" : "")} title={statusTitle}>{status}</div>}
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
