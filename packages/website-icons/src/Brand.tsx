import { useEffect, useState } from "react";
import { API } from "./App";

const CDN_BASE = "https://cdn.kymo.studio/";
const iconUrl = (path: string, ver?: number) => CDN_BASE + path + (ver ? `?v=${ver}` : "");
function copy(text: string) { try { navigator.clipboard?.writeText(text); } catch { /* noop */ } }
function save(href: string, filename: string) {
  const a = document.createElement("a"); a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
const download = (key: string, path: string) =>
  save(`${API}/api/icons/download?key=${encodeURIComponent(key)}`, key.replace(/[:/]/g, "-") + (path.toLowerCase().endsWith(".svg") ? ".svg" : ".png"));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Variant = { variant: string; key: string; path: string; ver: number };
type Brand = { set: string; slug: string; name: string; color: string; variants: Variant[] };

export function BrandPage() {
  const parts = location.pathname.replace(/\/+$/, "").split("/"); // /brand/<slug>
  const slug = decodeURIComponent(parts.slice(2).join("/") || "");
  const [brand, setBrand] = useState<Brand | null | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1500); };

  useEffect(() => {
    const t = (localStorage.getItem("kymo-icons-theme") as string) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const d = await fetch(`${API}/api/icons`).then((r) => r.json());
        setBrand((d.brands || []).find((x: Brand) => x.slug === slug) || null);
      } catch { setBrand(null); }
    })();
  }, []);
  if (brand) document.title = `${brand.name} · kymo icons`;

  const Header = (
    <header>
      <div className="top">
        <a className="brand" href="/" style={{ textDecoration: "none" }}>
          <img className="k" src="/logo.svg" alt="kymo" width={26} height={26} /> kymo icons
        </a>
        <nav className="nav"><a href={brand ? `/?set=${brand.set}` : "/"}>← Gallery</a></nav>
      </div>
    </header>
  );

  if (brand === undefined) return <>{Header}<main className="brandpage"><p className="count">Loading…</p></main></>;
  if (!brand) return <>{Header}<main className="brandpage"><div className="login-card"><h2>Brand not found</h2><p>No brand <b>{slug}</b>.</p><a href="/">← All icons</a></div></main></>;

  const def = brand.variants.find((v) => v.variant === "color") || brand.variants[0];

  return (
    <>
      {Header}
      <div className="brand-wrap">
        <main className="brandpage">
          <h1 className="brand-title">{brand.name}</h1>
          <div className="brand-sub">
            <span className="dlg-set">{brand.set}</span>
            {brand.color && <span className="swatch" title={brand.color} style={{ background: brand.color }} />}
            <span>{brand.variants.length} variant{brand.variants.length === 1 ? "" : "s"}</span>
          </div>
          <div className="snippet brand-import">
            <code>{`node box/${def.key}/blue "Label"`}</code>
            <button title="Copy snippet" aria-label="Copy snippet" onClick={() => { copy(`node box/${def.key}/blue "Label"`); flash("Copied snippet"); }}><CopyMini /></button>
          </div>

          {brand.variants.map((v) => (
            <section key={v.key} id={`v-${v.variant}`} className="brand-section">
              <h2>{cap(v.variant)}</h2>
              <div className="showcase">
                <div className="showcase-art"><img src={iconUrl(v.path, v.ver)} alt={v.key} /></div>
                <div className="showcase-bar">
                  <code>{v.key}</code>
                  <div className="showcase-actions">
                    <button className="sc-btn" title="Copy key" onClick={() => { copy(v.key); flash(`Copied ${v.key}`); }}>Copy key</button>
                    <button className="sc-btn" title="Copy URL" onClick={() => { copy(iconUrl(v.path, v.ver)); flash("Copied URL"); }}>Copy URL</button>
                    <button className="sc-btn" title="Download" onClick={() => download(v.key, v.path)}>Download</button>
                  </div>
                </div>
              </div>
            </section>
          ))}

          <footer className="legal">
            Logos are trademarks of their respective owners, shown for identification only.
            kymo is not affiliated with, sponsored by, or endorsed by them.
          </footer>
        </main>

        <aside className="brand-toc">
          <p className="toc-label">On this page</p>
          {brand.variants.map((v) => <a key={v.variant} href={`#v-${v.variant}`}>{cap(v.variant)}</a>)}
        </aside>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

const CopyMini = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);
