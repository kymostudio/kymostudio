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

type Variant = { variant: string; key: string; path: string; ver: number };
type Brand = { set: string; slug: string; name: string; color: string; variants: Variant[] };

export function BrandPage() {
  // /brand/<set>/<slug>
  const parts = location.pathname.replace(/\/+$/, "").split("/");
  const set = decodeURIComponent(parts[2] || "");
  const slug = decodeURIComponent(parts.slice(3).join("/") || "");
  const [brand, setBrand] = useState<Brand | null | undefined>(undefined); // undefined = loading
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
        setBrand((d.brands || []).find((x: Brand) => x.set === set && x.slug === slug) || null);
      } catch { setBrand(null); }
    })();
  }, []);

  if (brand) document.title = `${brand.name} · kymo icons`;

  return (
    <>
      <header>
        <div className="top">
          <a className="brand" href="/" style={{ textDecoration: "none" }}>
            <img className="k" src="/logo.svg" alt="kymo" width={26} height={26} /> kymo icons
          </a>
          <nav className="nav"><a href={set ? `/?set=${set}` : "/"}>← Gallery</a></nav>
        </div>
      </header>

      <main className="brandpage">
        {brand === undefined ? (
          <p className="count">Loading…</p>
        ) : !brand ? (
          <div className="login-card">
            <h2>Brand not found</h2>
            <p>No brand <b>{set}:{slug}</b> in the catalogue.</p>
            <a href="/">← All icons</a>
          </div>
        ) : (
          <>
            <div className="brand-hero">
              <div className="brand-hero-art">
                <img src={iconUrl((brand.variants.find((v) => v.variant === "color") || brand.variants[0]).path, (brand.variants.find((v) => v.variant === "color") || brand.variants[0]).ver)} alt={brand.name} />
              </div>
              <div className="brand-hero-meta">
                <h1>{brand.name}</h1>
                <div className="brand-hero-sub">
                  <span className="dlg-set">{brand.set}</span>
                  {brand.color && <span className="swatch" title={brand.color} style={{ background: brand.color }} />}
                  <span className="count">{brand.variants.length} variant{brand.variants.length === 1 ? "" : "s"}</span>
                </div>
              </div>
            </div>

            <div className="brand-variants">
              {brand.variants.map((v) => (
                <div key={v.key} className="bv-card">
                  <div className="bv-preview"><img src={iconUrl(v.path, v.ver)} alt={v.key} /></div>
                  <div className="bv-name">{v.variant}</div>
                  <code className="bv-key">{v.key}</code>
                  <div className="bv-actions">
                    <button className="btn" onClick={() => { copy(v.key); flash(`Copied ${v.key}`); }}>Copy key</button>
                    <button className="btn" onClick={() => { copy(iconUrl(v.path, v.ver)); flash("Copied URL"); }}>Copy URL</button>
                    <button className="btn" onClick={() => download(v.key, v.path)}>Download</button>
                  </div>
                  <div className="snippet bv-snippet">
                    <code>{`node box/${v.key}/blue "Label"`}</code>
                    <button title="Copy snippet" aria-label="Copy snippet" onClick={() => { copy(`node box/${v.key}/blue "Label"`); flash("Copied snippet"); }}>copy</button>
                  </div>
                </div>
              ))}
            </div>
            <footer className="legal">
              Logos are trademarks of their respective owners, shown for identification only.
              kymo is not affiliated with, sponsored by, or endorsed by them.
            </footer>
          </>
        )}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
