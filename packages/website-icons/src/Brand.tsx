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

  const v = (name: string) => brand.variants.find((x) => x.variant === name);
  const iconV = v("icon"), colorV = v("color"), textV = v("text"), brandV = v("brand");
  const mono = iconV || colorV;                 // for avatars (whitened on the brand color)
  const color = brand.color || "#3a3a3a";
  const img = (vr: Variant, cls: string) => <img className={cls} src={iconUrl(vr.path, vr.ver)} alt={vr.key} />;

  const Bar = ({ vr }: { vr: Variant }) => (
    <div className="showcase-bar">
      <code>{vr.key}</code>
      <div className="showcase-actions">
        <button className="sc-btn" onClick={() => { copy(vr.key); flash(`Copied ${vr.key}`); }}>Copy key</button>
        <button className="sc-btn" onClick={() => { copy(iconUrl(vr.path, vr.ver)); flash("Copied URL"); }}>Copy URL</button>
        <button className="sc-btn" onClick={() => download(vr.key, vr.path)}>Download</button>
      </div>
    </div>
  );

  const toc: string[] = [];
  if (iconV || colorV) toc.push("Icons");
  if (textV) toc.push("Text");
  if (textV && (iconV || colorV)) toc.push("Combine");
  if (mono) toc.push("Avatars");
  if (color) toc.push("Colors");

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
          {(colorV || iconV) && (() => { const d = colorV || iconV!; return (
            <div className="snippet brand-import">
              <code>{`node box/${d.key}/blue "Label"`}</code>
              <button title="Copy snippet" aria-label="Copy snippet" onClick={() => { copy(`node box/${d.key}/blue "Label"`); flash("Copied snippet"); }}><CopyMini /></button>
            </div>
          ); })()}

          {(iconV || colorV) && (
            <section id="icons" className="brand-section">
              <h2>Icons</h2>
              <div className="showcase">
                <div className="showcase-art row">
                  {iconV && img(iconV, "sc-icon")}
                  {colorV && img(colorV, "sc-icon")}
                  {brandV && img(brandV, "sc-icon")}
                </div>
                {iconV && <Bar vr={iconV} />}
                {colorV && <Bar vr={colorV} />}
                {brandV && <Bar vr={brandV} />}
              </div>
            </section>
          )}

          {textV && (
            <section id="text" className="brand-section">
              <h2>Text</h2>
              <div className="showcase">
                <div className="showcase-art">{img(textV, "sc-text")}</div>
                <Bar vr={textV} />
              </div>
            </section>
          )}

          {textV && (iconV || colorV) && (
            <section id="combine" className="brand-section">
              <h2>Combine</h2>
              <div className="showcase">
                <div className="showcase-art col">
                  {iconV && <div className="combine-row">{img(iconV, "ci")}{img(textV, "ct")}</div>}
                  {colorV && <div className="combine-row">{img(colorV, "ci")}{img(textV, "ct")}</div>}
                </div>
              </div>
            </section>
          )}

          {mono && (
            <section id="avatars" className="brand-section">
              <h2>Avatars</h2>
              <div className="showcase">
                <div className="showcase-art row">
                  <div className="avatar circle" style={{ background: color }}>{img(mono, "av")}</div>
                  <div className="avatar square" style={{ background: color }}>{img(mono, "av")}</div>
                </div>
              </div>
            </section>
          )}

          {color && (
            <section id="colors" className="brand-section">
              <h2>Colors</h2>
              <div className="showcase">
                <div className="showcase-art"><div className="color-swatch" style={{ background: color }} /></div>
                <div className="showcase-bar">
                  <code>{color}</code>
                  <div className="showcase-actions">
                    <button className="sc-btn" onClick={() => { copy(color); flash(`Copied ${color}`); }}>Copy color</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          <footer className="legal">
            Logos are trademarks of their respective owners, shown for identification only.
            kymo is not affiliated with, sponsored by, or endorsed by them.
          </footer>
        </main>

        <aside className="brand-toc">
          <p className="toc-label">On this page</p>
          {toc.map((t) => <a key={t} href={`#${t.toLowerCase()}`}>{t}</a>)}
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
