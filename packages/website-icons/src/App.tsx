import { useEffect, useMemo, useRef, useState } from "react";

// ── config ────────────────────────────────────────────────────────────────
const PAGE = 200; // incremental render batch (infinite scroll)
// Icon art is hosted on Cloudflare R2 (bucket `kymo-icons`, public via
// cdn.kymo.studio) — NOT bundled into this deploy. The manifest keeps RELATIVE
// paths (`icons/<set>/…`, shared with the Python/JS impls); we resolve them
// against the CDN here. Override at runtime with ?cdn=… for local testing.
const CDN_BASE = new URLSearchParams(location.search).get("cdn") || "https://cdn.kymo.studio/";
// icons-admin backend (shares the kymo.studio Google session); serves the live
// overlay (added/removed) merged over the static manifest.
export const API = "https://api.kymo.studio";
const iconUrl = (path: string, ver?: number) => CDN_BASE + path + (ver ? `?v=${ver}` : "");

type Icon = { key: string; set: string; path?: string; svg?: string; ver?: number };

// ── inline SVG glyphs (Lucide-style) ──────────────────────────────────────
const S = (d: React.ReactNode, vb = "0 0 24 24", fill = "none") => (
  <svg viewBox={vb} fill={fill} stroke={fill === "none" ? "currentColor" : "none"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const SearchGlyph = () => S(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>);
const CopyGlyph = () => S(<><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>);
const LinkGlyph = () => S(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>);
const DownloadGlyph = () => S(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>);
const CloseGlyph = () => S(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const SunGlyph = () => S(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>);
const MoonGlyph = () => S(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />);
const GitHubGlyph = () => S(<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />, "0 0 16 16", "currentColor");

// the icon art itself — PNG from the CDN, or an inline IconifyJSON SVG body
function Art({ it }: { it: Icon }) {
  if (it.svg) return <span dangerouslySetInnerHTML={{ __html: it.svg }} />;
  return <img loading="lazy" src={iconUrl(it.path!, it.ver)} alt={it.key} />;
}

// clipboard with a textarea fallback for older / blocked browsers
function copy(text: string) {
  try {
    navigator.clipboard?.writeText(text);
  } catch {
    const t = document.createElement("textarea");
    t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch { /* noop */ }
    t.remove();
  }
}

const snippetFor = (key: string) => `node box/${key}/blue "Label"`;

export function App() {
  const [items, setItems] = useState<Icon[]>([]);
  const [set, setSet] = useState(() => new URLSearchParams(location.search).get("set") || "all");
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") || "");
  const [sortBy, setSortBy] = useState<"name" | "set">("name");
  const [shown, setShown] = useState(PAGE);
  const [dialog, setDialog] = useState<Icon | null>(null);
  const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);
  const [toast, setToastState] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("kymo-icons-theme") as "light" | "dark") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const [size, setSize] = useState(() => Number(localStorage.getItem("kymo-icons-size")) || 40);

  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const flash = (msg: string) => {
    setToastState(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastState(null), 1600);
  };

  // ── load manifest + vendored inline sets ─────────────────────────────────
  useEffect(() => {
    (async () => {
      const m = await fetch("icons-manifest.json").then((r) => r.json());
      const all: Icon[] = Object.entries(m.icons as Record<string, string>).map(
        ([key, path]) => ({ key, path, set: key.split(":")[0] }),
      );
      // vendored inline IconifyJSON sets (SVG body, no PNG) — e.g. ai:
      for (const pfx of ["ai"]) {
        try {
          const s = await fetch(`sets/${pfx}.json`).then((r) => r.json());
          const dw = s.width || 16, dh = s.height || 16;
          for (const [name, ic] of Object.entries<any>(s.icons || {})) {
            const w = ic.width || dw, h = ic.height || dh;
            all.push({
              key: `${pfx}:${name}`, set: pfx,
              svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${ic.body}</svg>`,
            });
          }
        } catch { /* set not shipped — skip */ }
      }
      // merge the live admin overlay (added/removed) so admin changes show
      // without a redeploy. Overlay-added icons carry `ver` to bust the CDN cache.
      let merged = all;
      try {
        const ov: any = await fetch(`${API}/api/icons`).then((r) => r.json());
        const removed = new Set<string>(ov.removed || []);
        const map = new Map<string, Icon>(all.filter((it) => !removed.has(it.key)).map((it) => [it.key, it]));
        for (const [key, v] of Object.entries<any>(ov.icons || {})) {
          map.set(key, { key, set: key.split(":")[0], path: v.path, ver: v.ver });
        }
        merged = [...map.values()];
      } catch { /* overlay unavailable — static catalogue only */ }
      merged.sort((a, b) => a.key.localeCompare(b.key));
      setItems(merged);
    })();
  }, []);

  // set list (counts), biggest first
  const sets = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of items) counts[i.set] = (counts[i.set] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  // if a ?set= from the URL isn't a real set, fall back to "all"
  useEffect(() => {
    if (set !== "all" && items.length && !sets.some(([s]) => s === set)) setSet("all");
  }, [items, sets, set]);

  // filtered + sorted view
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = items.filter(
      (it) => (set === "all" || it.set === set) && (!q || it.key.toLowerCase().includes(q)),
    );
    out.sort(sortBy === "set"
      ? (a, b) => a.set.localeCompare(b.set) || a.key.localeCompare(b.key)
      : (a, b) => a.key.localeCompare(b.key));
    return out;
  }, [items, set, query, sortBy]);

  // reset the infinite-scroll window whenever the view changes
  useEffect(() => { setShown(PAGE); }, [set, query, sortBy]);

  // keep set + query in the URL (shareable: ?set=aws&q=lambda)
  useEffect(() => {
    const p = new URLSearchParams();
    if (set !== "all") p.set("set", set);
    if (query.trim()) p.set("q", query.trim());
    const qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }, [set, query]);

  // theme + preview-size → CSS, persisted
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kymo-icons-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.setProperty("--cell-icon", size + "px");
    localStorage.setItem("kymo-icons-size", String(size));
  }, [size]);

  // infinite scroll
  const filteredLen = filtered.length;
  const lenRef = useRef(filteredLen);
  lenRef.current = filteredLen;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) setShown((s) => (s < lenRef.current ? s + PAGE : s));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ⌘K focuses search · Esc closes the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select();
      } else if (e.key === "Escape") {
        setDialog(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Force a real download (not open-in-tab). The `download` attribute is ignored
  // for cross-origin (CDN) URLs, so fetch the art as a same-origin blob first
  // (the kymo-icons bucket allows CORS GET). Inline SVGs use a data URL directly.
  const save = (href: string, filename: string) => {
    const a = document.createElement("a");
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  };
  const downloadIcon = async (it: Icon) => {
    const base = it.key.replace(/[:/]/g, "-");
    if (it.svg) { save("data:image/svg+xml;charset=utf-8," + encodeURIComponent(it.svg), base + ".svg"); return; }
    const ext = it.path!.toLowerCase().endsWith(".svg") ? ".svg" : ".png";
    try {
      const blob = await fetch(iconUrl(it.path!, it.ver)).then((r) => r.blob());
      const obj = URL.createObjectURL(blob);
      save(obj, base + ext);
      setTimeout(() => URL.revokeObjectURL(obj), 2000);
    } catch {
      window.open(iconUrl(it.path!, it.ver), "_blank"); // CORS/fetch failed — fall back to open
    }
  };

  const visible = filtered.slice(0, shown);

  return (
    <>
      <header>
        <div className="top">
          <span className="brand">
            <img className="k" src="/logo.svg" alt="kymo" width={26} height={26} /> kymo icons{" "}
            {items.length > 0 && <small>· {items.length.toLocaleString()} icons</small>}
          </span>
          <nav className="nav">
            <a href="https://docs.kymo.studio">Docs</a>
            <a href="https://editor.kymo.studio">Editor</a>
            <a href="https://kymo.studio">kymo.studio</a>
            <a className="icon-btn" href="https://github.com/kymostudio/kymostudio" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub"><GitHubGlyph /></a>
            <button className="icon-btn" title="Toggle theme" aria-label="Toggle theme"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
              {theme === "dark" ? <SunGlyph /> : <MoonGlyph />}
            </button>
          </nav>
        </div>
      </header>

      <div className="body">
        <aside>
          <div className="side-block sizes">
            <p className="side-label">Preview size</p>
            <div className="size-row">
              <input type="range" min={24} max={80} step={4} value={size}
                onChange={(e) => setSize(Number(e.target.value))} />
              <span className="v">{size}px</span>
            </div>
          </div>
          <div className="side-block">
            <p className="side-label">Sets</p>
            <div className="sets">
              <button className={"set-row" + (set === "all" ? " active" : "")} onClick={() => setSet("all")}>
                <span className="label">All</span>
                <span className="n">{items.length.toLocaleString()}</span>
              </button>
              {sets.map(([s, n]) => (
                <button key={s} className={"set-row" + (set === s ? " active" : "")} onClick={() => setSet(s)}>
                  <span className="label">{s}</span>
                  <span className="n">{n.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main>
          <div className="search-bar">
            <div className="search-wrap">
              <span className="s"><SearchGlyph /></span>
              <input ref={searchRef} className="q" type="search" autoFocus autoComplete="off"
                placeholder="Search 2,400+ icons — “ec2”, “kubernetes”, “database”…"
                value={query} onChange={(e) => setQuery(e.target.value)} />
              <span className="kbd">⌘K</span>
            </div>
            <select className="sort" aria-label="Sort" value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "set")}>
              <option value="name">Name A→Z</option>
              <option value="set">By set</option>
            </select>
          </div>
          <p className="count">{filtered.length.toLocaleString()} icon{filtered.length === 1 ? "" : "s"}</p>
          <div className="grid">
            {visible.map((it) => (
              <div key={it.key} className="cell" onClick={() => { setTip(null); setDialog(it); }}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setTip({ key: it.key, x: r.left + r.width / 2, y: r.top - 8 });
                }}
                onMouseLeave={() => setTip(null)}>
                <Art it={it} />
              </div>
            ))}
          </div>
          <div ref={sentinelRef} className="sentinel" />
        </main>
      </div>

      {tip && (
        <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.key}</div>
      )}

      {toast && (
        <div className="toast" dangerouslySetInnerHTML={{ __html: toast }} />
      )}

      {dialog && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="dialog" role="dialog" aria-modal="true">
            <div className="dlg-preview"><Art it={dialog} /></div>
            <div className="dlg-body">
              <div className="dlg-head">
                <span className="dlg-key">{dialog.key}</span>
                <span className="dlg-set">{dialog.set}</span>
              </div>
              <div className="dlg-actions">
                <button className="btn primary" onClick={() => { copy(dialog.key); flash(`Copied <code>${dialog.key}</code>`); }}>
                  <CopyGlyph /> Copy key
                </button>
                <button className="btn" onClick={() => { copy(dialog.svg ? dialog.key : iconUrl(dialog.path!, dialog.ver)); flash("Copied URL"); }}>
                  <LinkGlyph /> Copy URL
                </button>
                <button className="btn" onClick={() => downloadIcon(dialog)}>
                  <DownloadGlyph /> Download
                </button>
                <button className="btn" onClick={() => setDialog(null)}>
                  <CloseGlyph /> Close
                </button>
              </div>
              <div className="dlg-usage">
                <p className="ul">Use in a .kymo diagram</p>
                <div className="snippet">
                  <code>{snippetFor(dialog.key)}</code>
                  <button title="Copy snippet" aria-label="Copy snippet"
                    onClick={() => { copy(snippetFor(dialog.key)); flash("Copied snippet"); }}>
                    <CopyGlyph />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
