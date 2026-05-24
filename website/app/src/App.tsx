/**
 * kymostudio playground — React + TypeScript port (Phase 0) of the original
 * vanilla `app.js`. Same behaviour and markup/CSS contract: a controlled
 * `.kymo`/BPMN editor on the left, a live SVG preview on the right, a FigJam
 * floating toolbelt (sample · canvas bg · download) and a Share-link pill.
 *
 * Rendering keeps the `renderToken` race-guard (a newer keystroke supersedes a
 * slower async render) and a 220 ms debounce on typing; theme/sample/boot
 * render immediately, matching the original.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseDiagram, parseBpmn, renderSVG, type Diagram } from "../../../packages/js/dist/index.js";
import { SAMPLES, DEFAULT_SAMPLE, isBpmn, svgBackground, type Theme } from "./kymo";
import { syncURL, loadFromURL } from "./share";
import { Board } from "./Board";
import { EngineBoard } from "./engine/EngineBoard";

// canvas-engine A/B: `?engine=native` mounts the in-house engine (read-only,
// Phase 5) instead of tldraw. Read once at load.
const ENGINE_NATIVE = new URL(location.href).searchParams.get("engine") === "native";

/** Pull the intrinsic width/height off the rendered `<svg>` header. */
function svgSize(svg: string): { w: number; h: number } {
  const wm = svg.match(/width="([\d.]+)"/);
  const hm = svg.match(/height="([\d.]+)"/);
  return { w: wm ? parseFloat(wm[1]) : 320, h: hm ? parseFloat(hm[1]) : 200 };
}

export function App() {
  const [source, setSource] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const [transparent, setTransparent] = useState(false);
  const [sampleKey, setSampleKey] = useState(DEFAULT_SAMPLE);
  const [svg, setSvg] = useState("");
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [isBpmnState, setIsBpmnState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const renderToken = useRef(0);
  const debounceId = useRef<number | undefined>(undefined);
  const toastId = useRef<number | undefined>(undefined);
  const lastSvg = useRef(""); // last successful render, used for download
  const pendingSel = useRef<number | null>(null); // caret to restore after Tab

  // Latest theme/transparent for closures inside the debounce timer.
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const transparentRef = useRef(transparent);
  transparentRef.current = transparent;
  const sourceRef = useRef(source);
  sourceRef.current = source;

  // Re-theme the whole app (header/editor/panes) via [data-theme] on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Restore the caret after a Tab-insert mutates the controlled value.
  useLayoutEffect(() => {
    if (pendingSel.current != null && editorRef.current) {
      editorRef.current.selectionStart = editorRef.current.selectionEnd = pendingSel.current;
      pendingSel.current = null;
    }
  });

  async function render(src: string, th: Theme, tr: boolean): Promise<void> {
    const token = ++renderToken.current;
    try {
      const bpmn = isBpmn(src);
      const parsed = bpmn ? parseBpmn(src) : parseDiagram(src);
      const out = await renderSVG(parsed, { background: svgBackground(th, tr) });
      if (token !== renderToken.current) return; // a newer keystroke superseded us
      lastSvg.current = out;
      setSvg(out);
      setDiagram(parsed);
      setIsBpmnState(bpmn);
      setError(null);
    } catch (err) {
      if (token !== renderToken.current) return;
      setError(err instanceof Error ? err.message : String(err));
      // keep the last good preview underneath
    }
  }

  function scheduleRender(src: string): void {
    window.clearTimeout(debounceId.current);
    debounceId.current = window.setTimeout(() => {
      void render(src, themeRef.current, transparentRef.current);
      void syncURL(src);
    }, 220);
  }

  // Phase 3: canvas → text. The board hands back surgically-patched `.kymo`;
  // treat it like a programmatic edit — re-parse + re-sync. The board's
  // genuine-delta filter prevents the resulting text→canvas write from echoing.
  function onPatch(text: string): void {
    setSource(text);
    void render(text, themeRef.current, transparentRef.current);
    void syncURL(text);
  }

  // ── Boot: shared link wins, else default sample (runs once on mount). ──
  useEffect(() => {
    (async () => {
      const loaded = await loadFromURL();
      const initial = loaded ?? SAMPLES[DEFAULT_SAMPLE].src;
      if (!loaded) setSampleKey(DEFAULT_SAMPLE);
      setSource(initial);
      void render(initial, themeRef.current, transparentRef.current);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  function onEditorChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    const v = e.target.value;
    setSource(v);
    scheduleRender(v);
  }

  // Tab inserts two spaces instead of moving focus.
  function onEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const s = ta.selectionStart;
    const end = ta.selectionEnd;
    const v = source.slice(0, s) + "  " + source.slice(end);
    pendingSel.current = s + 2;
    setSource(v);
    scheduleRender(v);
  }

  function onSampleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const key = e.target.value;
    const s = SAMPLES[key];
    if (!s) return;
    setSampleKey(key);
    setSource(s.src);
    void render(s.src, themeRef.current, transparentRef.current);
    void syncURL(s.src);
  }

  function selectBg(mode: "light" | "dark" | "transparent"): void {
    let th = theme;
    let tr: boolean;
    if (mode === "transparent") {
      tr = true;
    } else {
      th = mode;
      tr = false;
      setTheme(mode);
    }
    setTransparent(tr);
    void render(sourceRef.current, th, tr);
  }

  async function onShare(): Promise<void> {
    await syncURL(sourceRef.current);
    try {
      await navigator.clipboard.writeText(location.href);
      showToast("Share link copied");
    } catch {
      showToast("Copy failed — URL is in the address bar");
    }
  }

  function onDownload(): void {
    if (!lastSvg.current) return;
    const blob = new Blob([lastSvg.current], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  function showToast(msg: string): void {
    setToast({ msg, show: true });
    window.clearTimeout(toastId.current);
    toastId.current = window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 1600);
  }

  const bgActive = (mode: "light" | "dark" | "transparent"): boolean =>
    mode === "transparent" ? transparent : !transparent && theme === mode;

  const size = svgSize(svg);

  // ── Markup (mirrors the original index.html body; same ids/classes). ────
  return (
    <>
      <header>
        <span className="brand">
          <span className="brand-dot" /> kymo <small>playground</small>
        </span>
        <div className="spacer" />
        <button id="copy" className="share" title="Copy a shareable link to this diagram" onClick={onShare}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
          Share link
        </button>
      </header>

      <main>
        <section className="pane editor">
          <div className="editor-bar">
            <span className="chip">source</span>
            <span className="hint">.kymo DSL or BPMN 2.0 — renders live</span>
          </div>
          <textarea
            id="editor"
            ref={editorRef}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            placeholder="Write a .kymo DSL or paste a BPMN 2.0 file…"
            value={source}
            onChange={onEditorChange}
            onKeyDown={onEditorKeyDown}
          />
        </section>

        <section className="pane view">
          {ENGINE_NATIVE ? (
            <EngineBoard diagram={diagram} svg={svg} w={size.w} h={size.h} isBpmn={isBpmnState} source={source} onPatch={onPatch} />
          ) : (
            <Board diagram={diagram} svg={svg} w={size.w} h={size.h} isBpmn={isBpmnState} source={source} onPatch={onPatch} />
          )}
          <div id="error" hidden={error == null}>
            {error}
          </div>

          {/* FigJam-style floating toolbelt */}
          <div className="toolbar" role="toolbar" aria-label="Diagram tools">
            <span className="pick">
              <select id="sample" title="Load a starter diagram" value={sampleKey} onChange={onSampleChange}>
                {Object.entries(SAMPLES).map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>

            <span className="sep" />

            <div className="bg-toggle" title="Canvas background">
              <button className={`tbtn${bgActive("light") ? " active" : ""}`} title="Light canvas" aria-label="Light canvas" onClick={() => selectBg("light")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              </button>
              <button className={`tbtn${bgActive("dark") ? " active" : ""}`} title="Dark canvas" aria-label="Dark canvas" onClick={() => selectBg("dark")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              </button>
              <button className={`tbtn${bgActive("transparent") ? " active" : ""}`} title="Transparent (no background)" aria-label="Transparent canvas" onClick={() => selectBg("transparent")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" />
                  <rect x="13" y="13" width="8" height="8" rx="1.5" />
                  <rect x="13" y="3" width="8" height="8" rx="1.5" opacity=".4" />
                  <rect x="3" y="13" width="8" height="8" rx="1.5" opacity=".4" />
                </svg>
              </button>
            </div>

            <span className="sep" />

            <button id="download" className="tbtn" title="Download the rendered SVG" onClick={onDownload}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="m7 11 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              SVG
            </button>
          </div>
        </section>
      </main>

      <div id="toast" className={toast.show ? "show" : undefined}>
        {toast.msg}
      </div>
    </>
  );
}
