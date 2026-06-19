import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, GoogleButton, colorFor, isLocalhost } from "./auth";
import { useRoom } from "./room";
import { useWorkspace, assignDiagram } from "./workspace";
import { KINDS, renderKroki, sanitizeSvg, extFor } from "./kroki";
import { renderMermaid } from "./mermaid";
import { CodeEditor } from "./codeeditor";
import { Preview } from "./preview";
import { RENDER_API, SAMPLE } from "./const";
import { newId } from "./util";
import { encodeShare, decodeShare, shareUrl } from "./share";
import { TemplateGallery, takePendingTemplate, type Template } from "./templates";
import { ActivityBar, ExplorerPanel, SearchPanel, useDiagrams, KindIcon, type Panel } from "./sidebar";
import { WelcomeView } from "./welcome";
import { ConnectAI } from "./connectai";
import { useMcpActive, setSessionCtx, registerConnectToggle, registerSidebarToggle } from "./mcpstatus";
import { AddressBar } from "./addressbar";
import { sniffKind } from "./detect";
import { readTabsLocal, writeTabsLocal, fetchTabsRemote, putTabsRemote, registerOpener, registerCloser } from "./tabs";
import { readDoc, writeDoc, dropDoc } from "./doccache";
import { KLoader } from "./kloader";
import { FileCode2, FileImage, Code2, Link2, Check, Save, Pencil, Copy, Menu, PanelLeft, SquareCode, Eye, Download, ChevronDown, FilePlus2, X, Sparkles } from "lucide-react";

export default function EditorPage() {
  const { claims, signedIn, signOut, devSignIn } = useAuth();
  const { currentFolder, currentProject, projects, setCurrentProject } = useWorkspace();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // Signed-in users browse by PROJECT: the home URL is ?p=<projectId> (not a
  // file). ?d= / ?s= are read only at mount (deep-link / share); steady state is ?p=.
  const urlD = params.get("d");
  const p = params.get("p");
  // ?s= carries the whole diagram in the URL (kroki-style share link, no room/account).
  const sharedSrc = params.get("s");
  const sharedKind = params.get("k");

  // Open editor tabs (VS Code-style): the ordered set of open diagrams + the
  // active one, per project. Persisted (localStorage + backend). The single live
  // room follows the active tab; everything below keys on `activeTab` (aliased to
  // `d` so the room/draft/autosave logic is unchanged).
  const projAtMount = () => { try { return localStorage.getItem("kymo_project") || ""; } catch { return ""; } };
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    if (urlD) return [urlD];
    if (sharedSrc || !claims) return [];
    const mp = currentProject || projAtMount();
    return mp ? (readTabsLocal(mp)?.tabs ?? []) : [];
  });
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    if (urlD) return urlD;
    if (sharedSrc || !claims) return null;
    const mp = currentProject || projAtMount();
    return mp ? (readTabsLocal(mp)?.active ?? null) : null;
  });
  const d = activeTab;          // alias — the open diagram is the active tab
  const roomId = activeTab;
  const shared = !!sharedSrc && !activeTab;
  // The project's diagram list — drives tab titles + prunes tabs whose diagram
  // was deleted elsewhere. (Same hook the Explorer/Search use.)
  const { items, loaded: itemsLoaded, reload: reloadDiagrams, addLocal: addLocalDiagram } = useDiagrams();

  // Save model is two-state: a no-?d buffer is always a DRAFT that lives only in
  // the URL (?s=) — nothing on the server until the explicit Save (button /
  // Cmd-S). Landing on "/" therefore shows a fresh draft of the sample; existing
  // files are opened from /diagrams. (Old behaviour auto-created a server room on
  // the first edit, which littered the Diagrams list with anonymous drafts.)

  // Shared links carry their kind in the URL — seed state from it so the first
  // render cycle never runs against the kymo sample (which would pull the 2.5 MB
  // wasm engine chunk that a kroki-rendered share link never uses).
  const initialKind = shared && sharedKind && KINDS.some((x) => x.value === sharedKind) ? sharedKind : "kymo";
  // Optimistic paint: the last doc we showed for the tab being restored. Seeding
  // source/kind/title/svg from it makes the first frame the real diagram instead
  // of a loader (then a re-render) while the room syncs over the WebSocket.
  // Read once at mount (the initializers below consume it) — not every render.
  const seed = useMemo(() => (!shared && activeTab ? readDoc(activeTab) : null), []); // eslint-disable-line
  const [source, setSource] = useState(shared ? "" : seed ? seed.source : SAMPLE);
  const [kind, setKind] = useState(!shared && seed ? seed.kind : initialKind);
  const [svg, setSvg] = useState(seed ? seed.svg : "");
  const [status, setStatus] = useState(initialKind === "kymo" ? "Loading engine…" : "Rendering…");
  const [statusTitle, setStatusTitle] = useState(""); // dev detail (bytes · ms), shown only on hover
  const [statusErr, setStatusErr] = useState(false);
  const [live, setLive] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const [booted, setBooted] = useState(false); // first-load full-screen splash until the project's data is in
  const [flashTab, setFlashTab] = useState<string | null>(null); // briefly highlight a just-opened/created tab
  const [title, setTitle] = useState(seed ? seed.title : "");
  // Source ready: the code we're showing is the confirmed doc (seeded from cache,
  // a draft/import, or delivered by the room) rather than the pre-sync SAMPLE
  // placeholder. Gates the CODE pane loader; the PREVIEW pane has its own loader
  // keyed on the rendered SVG, so the two panes load independently while the tab
  // bar stays put.
  const [sourceReady, setSourceReady] = useState(activeTab && !shared ? !!seed : true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  // Let the ⌘/Ctrl+⇧+A shortcut (handled globally) toggle the Connect AI panel.
  useEffect(() => { registerConnectToggle(() => setConnectOpen((o) => !o)); return () => registerConnectToggle(null); }, []);
  const mcpLive = useMcpActive(); // an AI client (MCP) is actively driving this editor
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
  // split = width of the source pane in % (dbdiagram-style draggable divider)
  const [split, setSplit] = useState(() => {
    const v = parseFloat(localStorage.getItem("kymo_split") || "");
    return v >= 15 && v <= 85 ? v : 50;
  });
  const splitRef = useRef(split);
  splitRef.current = split;
  const mainRef = useRef<HTMLElement>(null);
  const tabsBarRef = useRef<HTMLDivElement>(null);
  const draggingSplit = useRef(false);
  // VSCode-style activity bar: which side panel is open (null = collapsed).
  // Explorer open by default on desktop, collapsed on phones.
  const isPhone = () => typeof matchMedia !== "undefined" && matchMedia("(max-width: 720px)").matches;
  const [activePanel, setActivePanel] = useState<Panel | null>(() => {
    const v = localStorage.getItem("kymo_panel");
    if (v === "explorer" || v === "search") return v;
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
  // Let the ⌘/Ctrl+B shortcut (handled globally) toggle the primary sidebar.
  useEffect(() => { registerSidebarToggle(() => toggleExplorer()); return () => registerSidebarToggle(null); }, [toggleExplorer]);

  const renderRef = useRef<((s: string) => Promise<string>) | null>(null);
  const applyingRemote = useRef(false);
  const synced = useRef(false);
  const lastSvg = useRef(seed ? seed.svg : "");
  const fresh = useRef(false);      // room exists on the server but has no document yet
  const userEdited = useRef(false); // the user actually typed in this room
  const pendingImport = useRef<{ source: string; kind: string; title?: string } | null>(null); // carry draft/shared content into a new room
  const closedAll = useRef(false); // last tab was just closed → reset to an empty buffer (no-file state), not the sample
  const pendingSave = useRef(false); // guest hit Save → sign in, then auto-save once the token lands
  // A diagram is "Untitled" until the user renames it by hand — no auto-naming
  // from the source. `titleUserSet` tracks whether a real (hand-typed) name exists.
  const titleUserSet = useRef(false);
  const titleRef = useRef(title);
  titleRef.current = title;
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const dRef = useRef(d); // current room id, readable from the stable doRender callback
  dRef.current = d;
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
      // Cache the doc we just painted so the next load is instant. Gate on
      // synced/edited so the SAMPLE placeholder shown before a fresh tab's first
      // sync never gets cached as if it were the real document.
      if (dRef.current && src.trim() && (synced.current || userEdited.current)) {
        writeDoc(dRef.current, { source: src, kind: k, title: titleRef.current || "", svg: out });
      }
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
    if (d && signedIn) {
      setSyncing(true);
      // Failsafe: never wedge on the loader if the room or render never resolves.
      const t = setTimeout(() => { setSyncing(false); setSourceReady(true); }, 5000);
      return () => clearTimeout(t);
    }
    setSyncing(false);
  }, [d, signedIn]);

  // First-load boot splash: a full-screen KLoader until the project's data is in.
  // Guests / share links have nothing to fetch → reveal immediately; signed-in
  // users wait for the diagrams list (+ projects) so the shell doesn't flash empty.
  useEffect(() => {
    if (booted) return;
    if (!claims || shared || (itemsLoaded && projects.length > 0)) setBooted(true);
  }, [booted, claims, shared, itemsLoaded, projects.length]);
  useEffect(() => {
    if (booted) return;
    const t = setTimeout(() => setBooted(true), 5000); // failsafe — never wedge on the splash
    return () => clearTimeout(t);
  }, [booted]);

  // "Offline" is for a genuine, sustained disconnection — not the momentary socket
  // drop while switching tabs (old room's WS closes before the new one opens) or
  // the initial connect. Only surface it after `live` stays false past a grace
  // window; switching rooms (`d`) re-arms it so a tab change never flashes it.
  useEffect(() => {
    if (live) { setShowOffline(false); return; }
    setShowOffline(false);
    const t = setTimeout(() => setShowOffline(true), 2500);
    return () => clearTimeout(t);
  }, [live, d]);

  // Rooms are switched client-side (+ New uses navigate()), so reset per-room state on ?d change.
  useEffect(() => {
    if (shared) return; // ?s= state is seeded at mount and owned by the decode effect below
    const imp = pendingImport.current ?? takePendingTemplate(); pendingImport.current = null;
    // After closing the last tab there's no file to show — reset to an EMPTY
    // buffer (→ "no file open" empty state), not the SAMPLE (→ Welcome home).
    const emptied = closedAll.current; closedAll.current = false;
    // Switching to a saved tab: paint its cached doc immediately (no loader) and
    // let the room sync reconcile. An import (template/copy) overrides the cache.
    const cached = imp ? null : readDoc(d);
    // Code is ready when we already have its real text: an import, a cached doc,
    // or no room at all. A freshly-opened (uncached) tab shows SAMPLE as a
    // placeholder, so the code pane stays in its loader until the room answers.
    setSourceReady(!!imp || !!cached || !d);
    setSource(imp ? imp.source : cached ? cached.source : emptied ? "" : SAMPLE);
    setKind(imp ? imp.kind : cached ? cached.kind : "kymo");
    setSvg(cached ? cached.svg : ""); lastSvg.current = cached ? cached.svg : "";
    setTitle(imp?.title || cached?.title || ""); setEditingName(false); setShareError(null);
    // A manually-named draft carries its title into the new room; otherwise it's Untitled.
    titleUserSet.current = !!imp?.title;
    // userEdited only matters when there's a room to push into (an explicit Save /
    // "Save a copy"); imported content with no ?d is a draft — keep pristine.
    synced.current = false; fresh.current = false; userEdited.current = !!imp && !!d;
    // A seeded import (template pick / "Save a copy") is a real draft → keep the
    // Welcome home hidden even though the Flowchart template's source is byte-
    // identical to SAMPLE. A bare reset (no import) re-arms Welcome for a fresh "/".
    setWelcomeDismissed(!!imp);
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
        titleUserSet.current = false;
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

  const room = useRoom(roomId, signedIn, {
    onLive: setLive, // not cleared here: the OLD socket closing on room switch would kill the boot state
    // Any stored non-"Untitled" title is a hand-typed name (no auto-naming).
    onMeta: (t) => { if (t && t !== "Untitled") titleUserSet.current = true; setTitle(t && t !== "Untitled" ? t : ""); },
    onDoc: (src, t, fromSelf, k) => {
      setSyncing(false);
      if (t !== undefined) setTitle(t && t !== "Untitled" ? t : "");
      synced.current = true;
      setSourceReady(true); // the room has answered — the code pane shows the real doc now
      if (fromSelf) return; // our own content is already on screen
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
          // only push a real, hand-typed name (no auto-title from content)
          if (titleUserSet.current && titleRef.current && titleRef.current !== "Untitled") room.sendRename(titleRef.current);
        }
        return;
      }
      // Any stored non-"Untitled" title is a hand-typed name.
      titleUserSet.current = !!(t && t !== "Untitled");
      fresh.current = false;
      // The synced doc differs from the SAMPLE placeholder we may have rendered
      // while booting — drop that stale SVG so the preview pane shows its loader
      // (not a flash of the sample) until the real content renders.
      if (src !== sourceRef.current) { setSvg(""); lastSvg.current = ""; }
      applyingRemote.current = true;
      setSource(src);
      if (src === sourceRef.current) applyingRemote.current = false; // no-op setSource → release the latch the skipped render would have cleared
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
      // No auto-titling: the name stays whatever the user set (or "Untitled").
    }, lastSvg.current ? (kind === "kymo" ? 120 : 450) : 0); // debounce typing, but never the very first render
    return () => clearTimeout(id);
  }, [source, kind]); // eslint-disable-line

  // Editing without a room (signed out / shared link): keep the kroki-style ?s=
  // URL in sync so the address bar is always a working share link. Only after a
  // real local edit — never rewrite a pristine share URL (Back must keep it intact).
  useEffect(() => {
    // Signed-in drafts live under ?p= (saved via Save), so never rewrite the URL
    // to ?s= for them — that would clobber the project URL. Guests still sync.
    if (d || claims || !userEdited.current || !source.trim()) return;
    const t = setTimeout(async () => {
      window.history.replaceState(null, "", shareUrl(kind, await encodeShare(source)));
    }, 300);
    return () => clearTimeout(t);
  }, [source, kind, d, claims]); // eslint-disable-line

  useEffect(() => {
    const h = () => { setMenuOpen(false); setShareOpen(false); setExportOpen(false); setTabMenu(null); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") h(); };
    document.addEventListener("click", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("click", h); document.removeEventListener("keydown", k); };
  }, []);

  // No auto-naming: a diagram is whatever the user titled it, else "Untitled".
  const diagramLabel = title || "Untitled";
  // `booting` = the CODE pane is still waiting for its real text (a room that
  // hasn't answered yet). The tab bar + pane chrome stay mounted; only the pane
  // bodies show loaders. A cached doc / draft is never booting.
  const booting = !!d && !shared && !sourceReady;
  // The PREVIEW pane loads independently of the code pane: a loader until the
  // first SVG for the real content exists. Hidden while booting (so the SAMPLE
  // placeholder's render never flashes); for an empty doc there's nothing to
  // render, so no loader. Errors fall through to the Preview (message shown).
  const previewLoading = !shareError && (booting || (!svg && !!source.trim()));
  const initial = ((claims?.email || claims?.name || "?").trim()[0] || "?").toUpperCase();
  // A draft (no room, not a pristine share view) is unsaved until the explicit Save.
  const isDraft = !d && !shared;
  // VS Code-style Welcome: a fresh "/" (untouched sample) shows the Welcome panel
  // instead of the editor. Any in-place action (pick template / open file) arms
  // `welcomeDismissed`; navigating to a real route re-arms it (effect below).
  const showWelcome = isDraft && source === SAMPLE && !welcomeDismissed;
  // Signed-in, nothing open: no active tab and an empty draft buffer (e.g. after
  // closing the last tab). Keep the Command Center, but show a "no file open"
  // placeholder instead of empty editor panes. Guests always have their draft.
  const noFileOpen = !!claims && isDraft && !source.trim() && !userEdited.current;

  useEffect(() => {
    document.title = diagramLabel !== "Untitled" ? diagramLabel + " · Kymo" : "Kymostudio";
  }, [diagramLabel]);

  // Report this window's project + active diagram to the control channel so the
  // MCP `ui_list_sessions` tool can show which window is showing what.
  useEffect(() => {
    const projectName = projects.find((x) => x.id === currentProject)?.name;
    setSessionCtx({ project: currentProject || undefined, projectName, diagram: d || undefined, title: diagramLabel });
  }, [currentProject, projects, d, diagramLabel]);

  // Project-as-URL (signed-in only). The project home is ?p=<projectId> showing
  // the Welcome scoped to that project; a bare "/" redirects to the active
  // project, and ?p= in the URL adopts that project. (?d= editing is unaffected.)
  useEffect(() => {
    if (!claims || shared || d) return;
    if (p) {
      if (currentProject && p !== currentProject && projects.some((x) => x.id === p)) setCurrentProject(p);
      return; // an unknown ?p simply shows the (default-scoped) home until projects load
    }
    if (currentProject) navigate("/?p=" + encodeURIComponent(currentProject), { replace: true });
  }, [claims, shared, d, p, currentProject, projects, setCurrentProject, navigate]);

  // ---- Open-tab persistence (per project): localStorage now + debounced PUT ----
  const putTimer = useRef<number | undefined>(undefined);
  const putPending = useRef<{ proj: string; tabs: string[]; active: string | null } | null>(null);
  const flushTabs = useCallback(() => {
    if (putTimer.current) { clearTimeout(putTimer.current); putTimer.current = undefined; }
    const pend = putPending.current; putPending.current = null;
    if (pend && signedIn) putTabsRemote(pend.proj, { tabs: pend.tabs, active: pend.active });
  }, [signedIn]);
  const persistTabs = useCallback((tabs: string[], active: string | null) => {
    if (!currentProject) return;
    writeTabsLocal(currentProject, { tabs, active });
    putPending.current = { proj: currentProject, tabs, active };
    if (putTimer.current) clearTimeout(putTimer.current);
    putTimer.current = window.setTimeout(flushTabs, 600);
  }, [currentProject, flushTabs]);

  // Tab operations — never navigate; the URL stays ?p=<project>.
  // Scroll the tab bar so the active tab is visible — a newly-created tab is
  // appended at the end and can be off-screen when the bar overflows.
  useEffect(() => {
    if (!activeTab) return;
    const t = setTimeout(() => {
      tabsBarRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeTab)}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" });
    }, 40); // let a just-added tab mount first
    return () => clearTimeout(t);
  }, [activeTab]);

  const openDiagram = useCallback((id: string) => {
    const next = openTabs.includes(id) ? openTabs : [...openTabs, id];
    setOpenTabs(next); setActiveTab(id); persistTabs(next, id);
    setWelcomeDismissed(true);
    setFlashTab(id); window.setTimeout(() => setFlashTab((f) => (f === id ? null : f)), 1000); // focus pulse on the new/opened tab
  }, [openTabs, persistTabs]);
  const activateTab = useCallback((id: string) => {
    if (id === activeTab) return;
    setActiveTab(id); persistTabs(openTabs, id);
  }, [activeTab, openTabs, persistTabs]);
  const closeTab = useCallback((id: string) => {
    const i = openTabs.indexOf(id);
    const next = openTabs.filter((x) => x !== id);
    // VS Code rule: closing the active tab activates the right neighbour, else left.
    const nextActive = activeTab === id ? (next[i] ?? next[i - 1] ?? null) : activeTab;
    setOpenTabs(next); setActiveTab(nextActive); persistTabs(next, nextActive);
    if (nextActive === null) {
      // Closed the last tab → no file open. Flag it so the per-room reset effect
      // (keyed on the active tab) clears the buffer to EMPTY instead of seeding
      // the SAMPLE — the latter would trip showWelcome and show the Welcome home;
      // we want the lightweight "no file open" empty state with the Command Center.
      closedAll.current = true;
      setWelcomeDismissed(true); setSource(""); setTitle(""); setShareError(null);
      userEdited.current = false;
    }
  }, [openTabs, activeTab, persistTabs]);

  // Close a set of tabs in one shot (Close Others / to the Right / All). Keeps the
  // active tab if it survives, else picks the nearest survivor to its right.
  const closeTabs = useCallback((ids: string[]) => {
    const kill = new Set(ids);
    if (!kill.size) return;
    const next = openTabs.filter((x) => !kill.has(x));
    let nextActive = activeTab;
    if (activeTab && kill.has(activeTab)) {
      const oi = openTabs.indexOf(activeTab);
      nextActive = next.find((x) => openTabs.indexOf(x) > oi) ?? next[next.length - 1] ?? null;
    }
    setOpenTabs(next); setActiveTab(nextActive); persistTabs(next, nextActive);
    if (nextActive === null) {
      closedAll.current = true;
      setWelcomeDismissed(true); setSource(""); setTitle(""); setShareError(null);
      userEdited.current = false;
    }
  }, [openTabs, activeTab, persistTabs]);

  // Right-click tab context menu (VS Code-style close actions).
  const [tabMenu, setTabMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  // Publish openDiagram/closeTab so the sibling UserChannel (MCP ui_open_diagram /
  // ui_close_file) can drive this tab.
  useEffect(() => registerOpener(openDiagram), [openDiagram]);
  useEffect(() => registerCloser(closeTab), [closeTab]);

  // Deep-link ?d=<id> (old bookmarks / MCP fallback): open it as a tab, then
  // normalize the URL to ?p=<project>. Waits for the project so the tab set merges.
  const bootedDeepLink = useRef(false);
  useEffect(() => {
    if (!urlD || !claims || !currentProject) return;
    if (!bootedDeepLink.current) { bootedDeepLink.current = true; openDiagram(urlD); }
    navigate("/?p=" + encodeURIComponent(currentProject), { replace: true });
  }, [urlD, claims, currentProject, openDiagram, navigate]);

  // Restore the project's tab set on project change (localStorage instant, then
  // backend reconcile — backend wins). Skips while a ?d/?s URL is being consumed.
  const prevProj = useRef<string | null>(null);
  useEffect(() => {
    if (!claims || !currentProject || prevProj.current === currentProject) return;
    prevProj.current = currentProject;
    if (params.get("d") || params.get("s")) return; // bootstrap / share own the state
    const local = readTabsLocal(currentProject);
    setOpenTabs(local?.tabs ?? []); setActiveTab(local?.active ?? null);
    if (!signedIn) return;
    let stale = false;
    fetchTabsRemote(currentProject).then((remote) => {
      // Adopt the server set only if it actually has tabs — an empty server blob
      // (never-written, or this device is ahead) must not wipe the local tabs.
      if (stale || prevProj.current !== currentProject || !remote || remote.tabs.length === 0) return;
      setOpenTabs(remote.tabs); setActiveTab(remote.active); writeTabsLocal(currentProject, remote);
    });
    return () => { stale = true; };
  }, [claims, currentProject, signedIn]); // eslint-disable-line

  // Drop tabs whose diagram was deleted elsewhere (once the list has loaded).
  useEffect(() => {
    if (!claims || !currentProject || !itemsLoaded) return;
    const valid = openTabs.filter((id) => items.some((it) => it.id === id));
    if (valid.length === openTabs.length) return;
    openTabs.filter((id) => !valid.includes(id)).forEach(dropDoc); // forget cached snapshots of deleted diagrams
    const nextActive = activeTab && valid.includes(activeTab) ? activeTab : (valid[valid.length - 1] ?? null);
    setOpenTabs(valid); setActiveTab(nextActive); persistTabs(valid, nextActive);
  }, [items, itemsLoaded]); // eslint-disable-line

  // Flush a pending tab PUT when the tab is backgrounded / closed.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flushTabs(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushTabs);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flushTabs); flushTabs(); };
  }, [flushTabs]);

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
  // Re-arm the Welcome panel when leaving a share view back to a fresh "/". The
  // per-room reset effect above owns the d-change case so it can honour a pending
  // template pick (which seeds SAMPLE and must NOT re-show the Welcome home).
  useEffect(() => { if (!shared) setWelcomeDismissed(false); }, [shared]);

  // "Open file…" on the Welcome panel: load a local diagram source into the draft.
  function openLocalFile(file: File) {
    file.text().then((txt) => {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const byExt = ext === "bpmn" ? "bpmn" : ext === "mmd" || ext === "mermaid" ? "mermaid" : "kymo";
      const k = sniffKind(txt) || byExt;
      setWelcomeDismissed(true);
      userEdited.current = true; titleUserSet.current = false;
      setTitle(""); setShareError(null);
      setKind(KINDS.some((x) => x.value === k) ? k : "kymo");
      setSource(txt);
      window.history.replaceState(null, "", "/");
    }).catch(() => {});
  }

  function pickTemplate(t: Template, name?: string) {
    setGalleryOpen(false);
    setWelcomeDismissed(true); // leaving the Welcome panel for a real diagram
    // A draft is the only copy in this tab/URL — ask before replacing it.
    if (!activeTab && userEdited.current && !window.confirm("Replace the current diagram with a fresh one?\nYour current version stays reachable via the Back button.")) return;
    // The name typed in the gallery becomes the file's title ("Untitled" = leave unset).
    const wantTitle = name && name.trim() && name.trim() !== "Untitled" ? name.trim().slice(0, 60) : "";
    titleUserSet.current = !!wantTitle;
    if (activeTab) {
      // a file is open → New opens a fresh DRAFT (deactivate the tab; the reset
      // effect consumes the seeded template). The other tabs stay open.
      pendingImport.current = { source: t.source, kind: t.kind, title: wantTitle || undefined };
      persistTabs(openTabs, null);
      setActiveTab(null);
    } else {
      // already on a draft/share buffer: seed in place
      setSource(t.source); setKind(t.kind); setTitle(wantTitle); setShareError(null);
      userEdited.current = false;
      if (!claims) window.history.replaceState(null, "", "/"); // guest draft isn't in the URL yet
    }
  }
  // Gallery "Create": skip the draft+Save dance — make a real, saved diagram now,
  // open it as a focused tab. Guests can't own server files, so they fall back to
  // a seeded draft (the visible Save button then prompts sign-in).
  function createDiagram(t: Template, name: string) {
    if (!signedIn) { pickTemplate(t, name); return; }
    setGalleryOpen(false); setWelcomeDismissed(true);
    const id = newId();
    const title = name && name.trim() && name.trim() !== "Untitled" ? name.trim().slice(0, 60) : "Untitled";
    titleUserSet.current = title !== "Untitled";
    pendingImport.current = { source: t.source, kind: t.kind, title: titleUserSet.current ? title : undefined };
    assignDiagram(signedIn, id, currentFolder, currentProject || undefined, { source: t.source, title, kind: t.kind });
    addLocalDiagram({ id, title, kind: t.kind, ws: currentFolder, updatedAt: Date.now() });
    openDiagram(id); // adds + activates the tab (focus pulse), Explorer focuses the row
    window.setTimeout(() => reloadDiagrams(), 1800);
  }
  // Pop the Google sign-in prompt (guests can't own server files).
  const promptSignIn = useCallback(() => { (window as any).google?.accounts?.id?.prompt?.(); }, []);
  // Explicit Save: a draft → a real server file, opened as a tab. Guests are
  // prompted to sign in first, then the save replays once the token lands.
  const save = useCallback(() => {
    if (activeTab) return; // already a saved, autosaving tab
    if (!sourceRef.current.trim()) return;
    if (!signedIn) { pendingSave.current = true; promptSignIn(); return; }
    const id = newId();
    const title = (titleUserSet.current && titleRef.current.trim()) || "Untitled";
    pendingImport.current = { source: sourceRef.current, kind: kindRef.current, title: titleUserSet.current ? titleRef.current : undefined };
    // Persist the content with the create so it's durable immediately (a quick
    // follow-up "New diagram" can't abandon the room before it flushed).
    assignDiagram(signedIn, id, currentFolder, currentProject || undefined, { source: sourceRef.current, title, kind: kindRef.current });
    // Surface the new file in the Explorer + tab bar immediately (optimistic), then
    // reconcile once the room has stored its title server-side.
    addLocalDiagram({ id, title, kind: kindRef.current, ws: currentFolder, updatedAt: Date.now() });
    openDiagram(id); // adds the new diagram as a tab + activates it; URL stays ?p=
    setTimeout(() => reloadDiagrams(), 1800);
  }, [activeTab, signedIn, currentFolder, currentProject, openDiagram, promptSignIn, addLocalDiagram, reloadDiagrams]);
  const saveRef = useRef(save); saveRef.current = save;
  // Guest hit Save → signed in → finish the save now that we have a token.
  useEffect(() => {
    if (signedIn && pendingSave.current) { pendingSave.current = false; saveRef.current(); }
  }, [signedIn]);
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
    const title = "Untitled";
    pendingImport.current = { source, kind };
    assignDiagram(signedIn, id, currentFolder, currentProject || undefined, { source, title, kind });
    addLocalDiagram({ id, title, kind, ws: currentFolder, updatedAt: Date.now() });
    openDiagram(id);
    setTimeout(() => reloadDiagrams(), 1800);
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
  ) : shared ? <span className={"diagram-name" + (diagramLabel === "Untitled" ? " untitled" : "")} title={diagramLabel}><span className="dn-text">{diagramLabel}</span></span> : (
    // Guest draft: no name in the header — they're here to edit one file fast,
    // the title would just be noise (and there's no Diagrams list to file it under).
    null
  );

  return (
    <div className="layout">
      {/* Full-screen brand splash over everything until the first load settles. */}
      {!booted && <div className="boot-splash"><KLoader /></div>}
      <header>
        {/* phones have no activity-bar rail → a hamburger opens the file drawer */}
        {claims && !shared && (
          <button className="hdr-menu mob-only" onClick={() => selectPanel("explorer")} title="Files" aria-label="Files"><Menu size={18} strokeWidth={2.2} /></button>
        )}
        {/* identity & document: logo → your Diagrams when signed in (the natural
            "home"), else the product site */}
        {claims
          ? <Link className="brand" to={currentProject ? "/?p=" + encodeURIComponent(currentProject) : "/"} title="Home" aria-label="Home"><img src="/logo.svg" alt="" /></Link>
          : <a className="brand" href="https://kymo.studio" target="_blank" rel="noopener" title="Kymo Studio" aria-label="Kymo Studio"><img src="/logo.svg" alt="" /></a>}
        {/* address bar (project switcher + ⌘K jump) shows for any signed-in view —
            including the Welcome home, so the project/search bar is always there.
            Guests / share links show the bare title. */}
        {claims && !shared
          ? <AddressBar titleNode={titleEl} onOpenDiagram={openDiagram} />
          : titleEl}
        {/* the steady "Saved" pill is dropped (saving is silent + automatic); the
            unsaved-draft pill is dropped too (the draft Save button already signals
            it). Only the disconnection warning still surfaces. */}
        {claims && d && !booting && showOffline && (
          <span className="save-ind off" title="Disconnected — changes are not being saved">
            Offline
          </span>
        )}
        <div className="spacer" />
        {/* actions: nav · create · output (Share is the CTA) · account last */}
        <nav className="nav-group">
          {/* three-region toggles (VS Code-style): Explorer · Source · Preview */}
          {!showWelcome && !noFileOpen && !booting && (
            <div className="pane-toggles mob-hide" role="group" aria-label="Panels">
              {claims && !shared && (
                <button className={"pane-tg" + (activePanel ? " on" : "")} onClick={toggleExplorer} title="Toggle Explorer" aria-pressed={!!activePanel}><PanelLeft size={16} strokeWidth={2} /></button>
              )}
              <button className={"pane-tg" + (panes.source ? " on" : "")} onClick={() => togglePane("source")} title="Toggle Source" aria-pressed={panes.source}><SquareCode size={16} strokeWidth={2} /></button>
              <button className={"pane-tg" + (panes.preview ? " on" : "")} onClick={() => togglePane("preview")} title="Toggle Preview" aria-pressed={panes.preview}><Eye size={16} strokeWidth={2} /></button>
            </div>
          )}
          {/* guests have no Explorer/activity-bar rail — surface New here in the header */}
          {!claims && !showWelcome && (
            <button className="mob-hide" onClick={() => setGalleryOpen(true)}
              title="Start a new diagram (a local draft — saved only when you Save)">
              <FilePlus2 size={16} strokeWidth={2} />New
            </button>
          )}
          {/* draft Save stays a visible CTA when there's unsaved work to rescue */}
          {isDraft && !booting && !showWelcome && !noFileOpen && (
            <button className="btn-primary mob-hide" onClick={save} title="Save to your Diagrams (⌘/Ctrl-S)">
              <Save size={16} strokeWidth={2} />
              Save
            </button>
          )}
          {/* Export + Share now live in the Preview pane header (next to the diagram
              they act on), not in the top navbar — see the preview pane-bar below. */}
        </nav>
        {/* signed-in account lives at the bottom of the activity bar (VSCode-style); guests sign in here */}
        {!claims && <GoogleButton />}
        {/* localhost only: fake sign-in to preview the signed-in UI without Google OAuth */}
        {!claims && isLocalhost() && (
          <button className="dev-login" onClick={devSignIn}
            title="Local dev only — fake sign-in to preview the signed-in UI (backend calls still need a real Google login)">
            Dev login
          </button>
        )}
      </header>
      {galleryOpen && <TemplateGallery onPick={createDiagram} onClose={() => setGalleryOpen(false)} />}
      <div className="workrow">
      <div className="workcol">
      <div className="workarea">
        {claims && !shared && (
          <>
            <ActivityBar active={activePanel} onSelect={selectPanel} onNewDiagram={() => setGalleryOpen(true)} onConnectAI={() => setConnectOpen((o) => !o)} aiOpen={connectOpen} />
            {activePanel === "explorer" && <ExplorerPanel currentId={d} currentTitle={diagramLabel} onOpen={openDiagram} onNewDiagram={() => setGalleryOpen(true)} onClose={closePanelOnPhone} />}
            {activePanel === "search" && <SearchPanel currentId={d} onOpen={openDiagram} onClose={closePanelOnPhone} />}
            {activePanel && <div className="sb-backdrop" onClick={closePanelOnPhone} />}
          </>
        )}
        <main ref={mainRef}>
        {/* The tab bar + pane chrome stay mounted while a tab loads; only the pane
            bodies below swap in a loader (code vs preview, independently). */}
        {showWelcome || noFileOpen ? (
          // Nothing open (fresh draft OR all tabs closed) → the full Welcome home.
          <WelcomeView onNew={() => setGalleryOpen(true)} onOpenFile={openLocalFile} onTemplate={pickTemplate} onOpen={openDiagram} />
        ) : (
          <>
            {panes.source && (
            <section className="pane" style={panes.preview ? { flex: `0 0 ${split}%` } : undefined}>
              {/* The editor-tab bar is for signed-in users (it pairs with the
                  Explorer/Diagrams list). A guest is editing one throwaway draft —
                  no tab, no close ✕; the pane only surfaces if paste auto-detect
                  has something to say. */}
              {/* VS Code-style editor tabs: one per open diagram (signed-in only),
                  the active one highlighted; the pane also surfaces for a guest if
                  paste auto-detect has something to say. */}
              {((claims && openTabs.length > 0) || detected) && (
              <div className="pane-bar tabs-bar" ref={tabsBarRef}>
                {openTabs.map((id) => {
                  const isActive = id === activeTab;
                  const name = isActive && diagramLabel !== "Untitled" ? diagramLabel : (items.find((i) => i.id === id)?.title || "Untitled");
                  const k = items.find((i) => i.id === id)?.kind || "kymo";
                  const ext = extFor(k);
                  return (
                    <div key={id} data-tab-id={id} className={"file-tab" + (isActive ? " active" : "") + (flashTab === id ? " flash" : "")} title={`${name}.${ext}`}
                      role="tab" aria-selected={isActive} onClick={() => activateTab(id)}
                      onContextMenu={(e) => { e.preventDefault(); setMenuOpen(false); setShareOpen(false); setExportOpen(false); setTabMenu({ x: e.clientX, y: e.clientY, id }); }}>
                      <span className="file-tab-icon"><KindIcon kind={k} /></span>
                      <span className="file-tab-name">{name}<span className="sb-ext">.{ext}</span></span>
                      {isActive && mcpLive && <span className="file-tab-ai" title="An AI client (MCP) is driving this diagram"><Sparkles size={11} strokeWidth={2.4} /></span>}
                      <button className="file-tab-close" aria-label="Close tab" title="Close tab"
                        onClick={(e) => { e.stopPropagation(); closeTab(id); }}>
                        <X size={13} strokeWidth={2.4} />
                      </button>
                    </div>
                  );
                })}
                {detected && <span className="detect-chip">auto-detected {detected}</span>}
              </div>
              )}
              {tabMenu && (() => {
                const idx = openTabs.indexOf(tabMenu.id);
                const right = openTabs.slice(idx + 1);
                const others = openTabs.filter((x) => x !== tabMenu.id);
                const act = (fn: () => void) => { fn(); setTabMenu(null); };
                return (
                  <div className="acct-menu tab-menu" style={{ left: tabMenu.x, top: tabMenu.y }} onClick={(e) => e.stopPropagation()} role="menu">
                    <button className="acct-item" role="menuitem" onClick={() => act(() => closeTab(tabMenu.id))}>Close</button>
                    <button className="acct-item" role="menuitem" disabled={!others.length} onClick={() => act(() => closeTabs(others))}>Close Others</button>
                    <button className="acct-item" role="menuitem" disabled={!right.length} onClick={() => act(() => closeTabs(right))}>Close to the Right</button>
                    <div className="menu-sep" />
                    <button className="acct-item" role="menuitem" onClick={() => act(() => closeTabs([...openTabs]))}>Close All</button>
                  </div>
                );
              })()}
              {booting
                ? <PaneLoading />
                : <CodeEditor value={source} kind={kind} onPaste={onEditorPaste} onChange={(v) => { userEdited.current = true; setShareError(null); setSource(v); }} />}
            </section>
            )}
            {panes.source && panes.preview && (
              <div className="splitter" title="Drag to resize · double-click for 50/50"
                onPointerDown={splitDown} onPointerMove={splitMove} onPointerUp={splitUp} onDoubleClick={splitReset} />
            )}
            {panes.preview && (
            <section className="pane">
              {/* Preview header — same height as the Explorer / Source bars; holds the
                  output actions (Export · Share) right by the diagram they act on. */}
              <div className="pane-bar preview-bar">
                <span className="pane-bar-label">Preview</span>
                <div className="pane-bar-actions" onClick={(e) => e.stopPropagation()}>
                  {/* Export this diagram (SVG / PNG / source) */}
                  <div className="account" onClick={(e) => e.stopPropagation()}>
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
                  {/* Share — the entire diagram lives in the link */}
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
                </div>
              </div>
              {shareError && <div className="share-error">{shareError}</div>}
              {previewLoading
                ? <PaneLoading />
                : <Preview svg={svg} fitKey={(d || "shared") + ":" + kind} />}
            </section>
            )}
          </>
        )}
        </main>
      </div>
      {!showWelcome && !noFileOpen && <div className={"status" + (statusErr ? " error" : "")} title={statusTitle}>{status}</div>}
      </div>
      {connectOpen && claims && !shared && <ConnectAI onClose={() => setConnectOpen(false)} />}
      </div>
    </div>
  );
}

// VS Code-style pane loading: a thin indeterminate progress bar sweeping across
// the top of the pane (instead of a centered spinner), over an empty body.
function PaneLoading() {
  return (
    <div className="pane-loading" role="img" aria-label="Loading">
      <div className="pane-progress"><div className="pane-progress-bit" /></div>
    </div>
  );
}
