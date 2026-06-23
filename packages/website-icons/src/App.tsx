import { Fragment, useEffect, useMemo, useRef, useState } from "react";

// ── config ────────────────────────────────────────────────────────────────
const FIRST = 80; // initial paint batch — small so the grid appears fast (≈1 viewport)
const PAGE = 120; // incremental render batch (infinite scroll)
// Icon art is hosted on Cloudflare R2 (bucket `kymo-icons`, public via
// cdn.kymo.studio) — NOT bundled into this deploy. The manifest keeps RELATIVE
// paths (`icons/<set>/…`, shared with the Python/JS impls); we resolve them
// against the CDN here. Override at runtime with ?cdn=… for local testing.
const CDN_BASE = new URLSearchParams(location.search).get("cdn") || "https://cdn.kymo.studio/";
// icons-admin backend (shares the kymo.studio Google session); serves the live
// overlay (added/removed) merged over the static manifest.
export const API = "https://api.kymo.studio";
export const iconUrl = (path: string, ver?: number) => CDN_BASE + path + (ver ? `?v=${ver}` : "");

export type Variant = { variant: string; key: string; path: string; ver: number };
// An item is one card: a static icon, an inline-SVG icon, or a BRAND (1 card with
// several variants — icon/color/text/brand — switchable in the dialog / icon page).
export type Icon = { key: string; set: string; path?: string; svg?: string; ver?: number; name?: string; subset?: string; variants?: Variant[] };

// A per-icon permalink slug, e.g. ai:mistral → "ai-mistral" (the /icon/<slug> page).
export const iconSlugOf = (key: string) => key.replace(/[:/]/g, "-");
export const iconHref = (key: string) => "/icon/" + iconSlugOf(key);

// Shared catalogue loader: static manifest ⊕ live DB (brands+variants, removed).
// Used by the gallery and the per-icon page so both resolve icons identically.
//
// Both fetches fire in PARALLEL (no manifest→api waterfall), but the merged list
// is only returned once BOTH resolve — we deliberately do NOT paint the static
// manifest first. Partial paint flickers the counts (manifest 2.4k → merged 3.3k
// as brands fold in) and reshuffles brand cards, which reads as broken.
export async function loadCatalog(): Promise<Icon[]> {
  const manifestP = fetch("/icons-manifest.json").then((r) => r.json());
  const overlayP = fetch(`${API}/api/icons`).then((r) => r.json()).catch(() => null);

  const m = await manifestP;
  const all: Icon[] = Object.entries(m.icons as Record<string, string>).map(
    ([key, path]) => ({ key, path, set: key.split(":")[0] }),
  );

  let merged = all;
  try {
    const ov: any = await overlayP;
    if (!ov) throw new Error("overlay unavailable");
    const removed = new Set<string>(ov.removed || []);
    const map = new Map<string, Icon>();
    for (const it of all) if (!removed.has(it.key)) map.set(it.key, it);
    const brandKeys = new Set<string>();
    for (const b of (ov.brands || []) as any[]) {
      const variants: Variant[] = b.variants || [];
      for (const v of variants) brandKeys.add(v.key);
      const def = variants.find((v) => v.variant === "color") || variants.find((v) => v.variant === "icon") || variants[0];
      if (!def) continue;
      const key = `${b.set}:${b.slug}`;
      brandKeys.add(key);
      map.set(key, { key, set: b.set, name: b.name, subset: b.subset, path: def.path, ver: def.ver, variants });
    }
    for (const [key, v] of Object.entries<any>(ov.icons || {})) {
      if (brandKeys.has(key)) continue;
      map.set(key, { key, set: key.split(":")[0], path: v.path, ver: v.ver });
    }
    merged = [...map.values()];
  } catch { /* catalogue unavailable — static only */ }
  merged.sort((a, b) => a.key.localeCompare(b.key));
  return merged;
}

// ── inline SVG glyphs (Lucide-style) ──────────────────────────────────────
const S = (d: React.ReactNode, vb = "0 0 24 24", fill = "none") => (
  <svg viewBox={vb} fill={fill} stroke={fill === "none" ? "currentColor" : "none"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const SearchGlyph = () => S(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>);
const CopyGlyph = () => S(<><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>);
const LinkGlyph = () => S(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>);
const DownloadGlyph = () => S(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>);
const CloseGlyph = () => S(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const ExternalGlyph = () => S(<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>);
const SunGlyph = () => S(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>);
const MoonGlyph = () => S(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />);
const MenuGlyph = () => S(<><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></>);
const FiltersGlyph = () => S(<><line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="16" y2="16" /></>);
const GridGlyph = () => S(<><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>);
const SizeGlyph = () => S(<><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>);
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

export const snippetFor = (key: string) => `node box/${key}/blue "Label"`;

// Acronyms / proper brand names CSS `capitalize` would mangle (ai → "Ai").
// capitalize only touches the first letter, so a correctly-cased value survives.
const SET_LABELS: Record<string, string> = {
  ai: "AI", aws: "AWS", ibm: "IBM", gcp: "GCP", oci: "OCI", gis: "GIS", saas: "SaaS",
  openstack: "OpenStack", digitalocean: "DigitalOcean", alibabacloud: "Alibaba Cloud",
};
const setLabel = (s: string) => SET_LABELS[s] || s;

// Count actual icons, not cards: a brand card bundles several variant icons.
const iconCount = (list: Icon[]) => list.reduce((n, it) => n + (it.variants?.length || 1), 0);

// The gallery view (set + subset) lives in the path: /set/<set>[/<subset>].
// Falls back to the legacy ?set=&sub= query for old links.
function viewFromUrl(): { set: string; sub: string } {
  const m = location.pathname.replace(/\/+$/, "").match(/^\/set\/([^/]+)(?:\/([^/]+))?$/);
  if (m) return { set: decodeURIComponent(m[1]), sub: m[2] ? decodeURIComponent(m[2]) : "" };
  const q = new URLSearchParams(location.search);
  return { set: q.get("set") || "all", sub: q.get("sub") || "" };
}

export function App() {
  const [items, setItems] = useState<Icon[]>([]);
  const [set, setSet] = useState(() => viewFromUrl().set);
  const [sub, setSub] = useState(() => viewFromUrl().sub); // selected subset within a set
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") || "");
  const [sortBy, setSortBy] = useState<"name" | "set">("name");
  const [shown, setShown] = useState(FIRST);
  const [dialog, setDialog] = useState<Icon | null>(null);
  const [dlgVar, setDlgVar] = useState<Variant | null>(null); // selected variant in the modal
  const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);
  const [toast, setToastState] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("kymo-icons-theme") as "light" | "dark") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const [size, setSize] = useState(() => Number(localStorage.getItem("kymo-icons-size")) || 40);
  const [menuOpen, setMenuOpen] = useState(false); // mobile hamburger nav

  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const flash = (msg: string) => {
    setToastState(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastState(null), 1600);
  };

  // ── load the catalogue (static manifest ⊕ live DB) ───────────────────────
  useEffect(() => { loadCatalog().then(setItems); }, []);

  // set list (counts), biggest first
  const sets = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of items) counts[i.set] = (counts[i.set] || 0) + (i.variants?.length || 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  // subsets per set (brand `subset`, e.g. ai → model/application/provider), biggest first
  const subsets = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const i of items) if (i.subset) { (m[i.set] ||= {})[i.subset] = ((m[i.set] ||= {})[i.subset] || 0) + (i.variants?.length || 1); }
    const out: Record<string, [string, number][]> = {};
    for (const s in m) out[s] = Object.entries(m[s]).sort((a, b) => b[1] - a[1]);
    return out;
  }, [items]);

  // if a ?set= from the URL isn't a real set, fall back to "all"
  useEffect(() => {
    if (set !== "all" && items.length && !sets.some(([s]) => s === set)) setSet("all");
  }, [items, sets, set]);
  // drop a stale subset selection (set changed, or sub not valid for this set)
  useEffect(() => {
    if (items.length && sub && !(subsets[set]?.some(([g]) => g === sub))) setSub("");
  }, [items, set, sub, subsets]);

  // filtered + sorted view
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = items.filter(
      (it) => (set === "all" || it.set === set) && (!sub || it.subset === sub) && (!q || it.key.toLowerCase().includes(q) || (it.name || "").toLowerCase().includes(q)),
    );
    out.sort(sortBy === "set"
      ? (a, b) => a.set.localeCompare(b.set) || a.key.localeCompare(b.key)
      : (a, b) => a.key.localeCompare(b.key));
    return out;
  }, [items, set, sub, query, sortBy]);

  // reset the infinite-scroll window whenever the view changes
  useEffect(() => { setShown(FIRST); }, [set, sub, query, sortBy]);

  // keep the view in the URL as a clean path: /set/<set>[/<subset>][?q=…]
  useEffect(() => {
    const q = query.trim() ? "?q=" + encodeURIComponent(query.trim()) : "";
    const path = set === "all" ? "/" : "/set/" + set + (sub ? "/" + sub : "");
    history.replaceState(null, "", path + q);
  }, [set, sub, query]);

  // theme + preview-size → CSS, persisted
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kymo-icons-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.setProperty("--cell-icon", size + "px");
    localStorage.setItem("kymo-icons-size", String(size));
  }, [size]);
  // close the mobile menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: Event) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".nav-menu") && !t.closest(".nav-toggle")) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  // infinite scroll — observer handles scroll-driven loading (rootMargin so the
  // next batch starts before the user hits the bottom)
  const filteredLen = filtered.length;
  const lenRef = useRef(filteredLen);
  lenRef.current = filteredLen;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) setShown((s) => (s < lenRef.current ? s + PAGE : s));
    }, { rootMargin: "800px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // Keep filling while the sentinel sits within/near the viewport. The observer
  // only fires on an enter/exit transition, so when the rendered batch is shorter
  // than the screen (e.g. the small first batch) it never re-fires — without this
  // the grid would stick at FIRST. Chains one batch per frame until the sentinel
  // is pushed below the fold, then the observer takes over for real scrolling.
  useEffect(() => {
    if (shown >= filteredLen) return;
    const el = sentinelRef.current;
    if (!el) return;
    if (el.getBoundingClientRect().top > window.innerHeight + 800) return; // below fold → wait for scroll
    const id = requestAnimationFrame(() => setShown((s) => (s < filteredLen ? s + PAGE : s)));
    return () => cancelAnimationFrame(id);
  }, [shown, filteredLen]);

  // ⌘K focuses search · Esc closes the modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select();
      } else if (e.key === "Escape" && location.pathname.startsWith("/icon/")) {
        history.back();
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
  const downloadIcon = (it: Icon) => {
    const base = it.key.replace(/[:/]/g, "-");
    // Inline SVG (e.g. ai:) → data URL. R2-backed art → the worker streams it with
    // Content-Disposition:attachment, which forces a save even cross-origin.
    if (it.svg) save("data:image/svg+xml;charset=utf-8," + encodeURIComponent(it.svg), base + ".svg");
    else save(`${API}/api/icons/download?key=${encodeURIComponent(it.key)}`, base + (it.path!.toLowerCase().endsWith(".svg") ? ".svg" : ".png"));
  };

  // ── modal as a route ─────────────────────────────────────────────────────
  // Clicking a card opens a MODAL and pushes the shareable /icon/<slug> URL.
  // A DIRECT visit to /icon/<slug> renders the full IconPage (see main.tsx).
  const showIcon = (it: Icon) => {
    setDialog(it);
    setDlgVar(it.variants ? (it.variants.find((v) => v.variant === "color") || it.variants[0]) : null);
  };
  const openIcon = (it: Icon) => {
    setTip(null); showIcon(it);
    history.pushState({ icon: it.key }, "", iconHref(it.key));
  };
  const closeIcon = () => {
    if (location.pathname.startsWith("/icon/")) history.back(); // pop URL → popstate closes
    else setDialog(null);
  };
  // the active variant of the open modal (a brand's selected variant, else the card)
  const av: Icon | null = dialog
    ? (dlgVar ? { key: dlgVar.key, set: dialog.set, path: dlgVar.path, ver: dlgVar.ver } : dialog)
    : null;
  // sync the modal to the URL on back/forward
  useEffect(() => {
    const onPop = () => {
      const p = location.pathname.replace(/\/+$/, "");
      if (p.startsWith("/icon/")) {
        const slug = decodeURIComponent(p.split("/").slice(2).join("/"));
        const it = items.find((i) => iconSlugOf(i.key) === slug);
        if (it) showIcon(it); else setDialog(null);
      } else setDialog(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [items]);

  const visible = filtered.slice(0, shown);

  return (
    <>
      <header>
        <div className="top">
          <span className="brand">
            <img className="k" src="/logo.svg" alt="kymo" width={26} height={26} /> Kymo Icons{" "}
            {items.length > 0 && <small>· {iconCount(items).toLocaleString()} icons</small>}
          </span>
          <button className="nav-toggle icon-btn" aria-label="Menu" aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <CloseGlyph /> : <MenuGlyph />}
          </button>
          <div className={`nav-menu${menuOpen ? " open" : ""}`}>
            <nav className="nav-links" onClick={() => setMenuOpen(false)}>
              <a href="https://docs.kymo.studio">Docs</a>
              <a href="https://editor.kymo.studio">Editor</a>
              <a href="https://kymo.studio">kymo.studio</a>
            </nav>
            <div className="nav-actions">
              <a className="icon-btn" href="https://github.com/kymostudio/kymostudio" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub"><GitHubGlyph /></a>
              <button className="icon-btn" title="Toggle theme" aria-label="Toggle theme"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
                {theme === "dark" ? <SunGlyph /> : <MoonGlyph />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="body">
        <aside>
          <div className="side-head"><FiltersGlyph /><span>Filters</span></div>
          {(set !== "all" || sub) && (
            <div className="side-block applied">
              <div className="applied-head">
                <p className="side-label">Applied filters</p>
                <button className="clear-all" onClick={() => { setSet("all"); setSub(""); }}>Clear all <CloseGlyph /></button>
              </div>
              <div className="chips">
                {set !== "all" && (
                  <button className="chip" onClick={() => { setSet("all"); setSub(""); }}>{setLabel(set)} <CloseGlyph /></button>
                )}
                {sub && (
                  <button className="chip" onClick={() => setSub("")}>{sub} <CloseGlyph /></button>
                )}
              </div>
            </div>
          )}
          <div className="side-block sizes">
            <p className="side-label"><SizeGlyph />Preview size</p>
            <div className="size-row">
              <input type="range" min={24} max={80} step={4} value={size}
                onChange={(e) => setSize(Number(e.target.value))} />
              <span className="v">{size}px</span>
            </div>
          </div>
          <div className="side-block">
            <p className="side-label"><GridGlyph />Sets</p>
            <div className="sets">
              <button className={"set-row" + (set === "all" ? " active" : "")} onClick={() => { setSet("all"); setSub(""); }}>
                <span className="label">All</span>
                <span className="n">{iconCount(items).toLocaleString()}</span>
              </button>
              {sets.map(([s, n]) => (
                <Fragment key={s}>
                  <button className={"set-row" + (set === s && !sub ? " active" : "")} onClick={() => { setSet(s); setSub(""); }}>
                    <span className="label">{setLabel(s)}</span>
                    <span className="n">{n.toLocaleString()}</span>
                  </button>
                  {set === s && subsets[s]?.map(([g, c]) => (
                    <button key={g} className={"set-row sub-row" + (sub === g ? " active" : "")} onClick={() => { setSet(s); setSub(g); }}>
                      <span className="label">{g}</span>
                      <span className="n">{c.toLocaleString()}</span>
                    </button>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </aside>

        <main>
          <div className="search-bar">
            <div className="search-wrap">
              <span className="s"><SearchGlyph /></span>
              <input ref={searchRef} className="q" type="search" autoFocus autoComplete="off"
                placeholder="Search for icons — “ec2”, “kubernetes”, “database”…"
                value={query} onChange={(e) => setQuery(e.target.value)} />
              <span className="kbd">⌘K</span>
            </div>
            <select className="sort" aria-label="Sort" value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "set")}>
              <option value="name">Name A→Z</option>
              <option value="set">By set</option>
            </select>
          </div>
          {set !== "all" && (
            <h1 className="view-title">
              <a href={`/set/${set}`}>{setLabel(set)}</a>
              {sub && <><span className="view-sep">›</span><span className="view-sub">{sub}</span></>}
            </h1>
          )}
          <p className="count">{iconCount(filtered).toLocaleString()} icon{iconCount(filtered) === 1 ? "" : "s"}</p>
          <div className="grid">
            {visible.map((it) => (
              <a key={it.key} className="cell" href={iconHref(it.key)}
                onClick={(e) => {
                  // let cmd/ctrl/shift/middle-click open the full page in a new tab
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault(); openIcon(it);
                }}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setTip({ key: it.key, x: r.left + r.width / 2, y: r.top - 8 });
                }}
                onMouseLeave={() => setTip(null)}>
                <Art it={it} />
              </a>
            ))}
          </div>
          <div ref={sentinelRef} className="sentinel" />
          <footer className="legal">
            Logos are trademarks of their respective owners, shown for identification only.
            kymo is not affiliated with, sponsored by, or endorsed by them.
          </footer>
        </main>
      </div>

      {tip && (
        <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.key}</div>
      )}

      {toast && (
        <div className="toast" dangerouslySetInnerHTML={{ __html: toast }} />
      )}

      {dialog && av && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeIcon(); }}>
          <div className="dialog" role="dialog" aria-modal="true">
            {dialog.variants && (
              <a className="brand-tag brand-tag-corner" href={`/brand/${dialog.key.split(":")[1]}`} target="_blank" rel="noopener" title={`Open ${dialog.name || ""} brand page`}>
                Brand<span className="ext-ic"><ExternalGlyph /></span>
              </a>
            )}
            <div className="dlg-preview"><Art it={av} /></div>
            <div className="dlg-body">
              <div className="dlg-head">
                <span className="dlg-key">{dialog.name || av.key}</span>
                <a className="dlg-set" href={`/set/${dialog.set}`} title={`Browse ${dialog.set}`}>{dialog.set}</a>
                {dialog.subset && <a className="dlg-sub" href={`/set/${dialog.set}/${dialog.subset}`} title={`Browse ${dialog.set} · ${dialog.subset}`}>{dialog.subset}</a>}
              </div>
              {dialog.variants && dialog.variants.length > 1 && (
                <div className="dlg-variants">
                  {dialog.variants.map((v) => (
                    <button key={v.key} className={"vtab" + (dlgVar?.key === v.key ? " active" : "")}
                      onClick={() => setDlgVar(v)}>{v.variant}</button>
                  ))}
                </div>
              )}
              <div className="dlg-actions">
                <button className="btn primary" onClick={() => { copy(av.key); flash(`Copied <code>${av.key}</code>`); }}>
                  <CopyGlyph /> Copy key
                </button>
                <button className="btn" onClick={() => { copy(av.svg ? av.key : iconUrl(av.path!, av.ver)); flash("Copied URL"); }}>
                  <LinkGlyph /> Copy URL
                </button>
                <button className="btn" onClick={() => downloadIcon(av)}>
                  <DownloadGlyph /> Download
                </button>
                <button className="btn" onClick={closeIcon}>
                  <CloseGlyph /> Close
                </button>
              </div>
              <div className="dlg-usage">
                <p className="ul">Use in a .kymo diagram</p>
                <div className="snippet">
                  <code>{snippetFor(av.key)}</code>
                  <button title="Copy snippet" aria-label="Copy snippet"
                    onClick={() => { copy(snippetFor(av.key)); flash("Copied snippet"); }}>
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
