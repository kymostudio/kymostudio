import { useEffect, useState } from "react";
import { API, type Icon as Item, type Variant, iconUrl, snippetFor, loadCatalog, iconSlugOf, iconHref } from "./App";

function copy(text: string) { try { navigator.clipboard?.writeText(text); } catch { /* noop */ } }
function save(href: string, filename: string) {
  const a = document.createElement("a"); a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
const ExternalGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
    <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

export function IconPage() {
  const slug = decodeURIComponent(location.pathname.replace(/\/+$/, "").split("/").slice(2).join("/") || "");
  const [item, setItem] = useState<Item | null | undefined>(undefined); // undefined = loading
  const [all, setAll] = useState<Item[]>([]);
  const [vv, setVv] = useState<Variant | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1500); };

  useEffect(() => {
    const t = (localStorage.getItem("kymo-icons-theme") as string) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  useEffect(() => {
    loadCatalog().then((items) => {
      setAll(items);
      const it = items.find((i) => iconSlugOf(i.key) === slug) || null;
      setItem(it);
      if (it?.variants) setVv(it.variants.find((v) => v.variant === "color") || it.variants[0]);
    });
  }, []);
  // display name: the brand name, or a prettified version of the key's icon part
  const pretty = (it: Item) => it.name || it.key.split(":").slice(1).join(" ").replace(/[-_/]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || it.key;
  if (item) document.title = `${pretty(item)} · Kymo Icons`;

  const Header = (
    <header>
      <div className="top">
        <a className="brand" href="/" style={{ textDecoration: "none" }}>
          <img className="k" src="/logo.svg" alt="kymo" width={26} height={26} /> Kymo Icons
        </a>
        <nav className="nav"><a href={item ? `/set/${item.set}` : "/"}>← Gallery</a></nav>
      </div>
    </header>
  );
  if (item === undefined) return <>{Header}<main className="iconpage"><p className="count">Loading…</p></main></>;
  if (!item) return <>{Header}<main className="iconpage"><div className="login-card"><h2>Icon not found</h2><p>No icon <b>{slug}</b>.</p><a href="/">← All icons</a></div></main></>;

  // the active variant (a brand's selected variant, else the icon itself)
  const av: Item = item.variants && vv ? { key: vv.key, set: item.set, path: vv.path, ver: vv.ver } : item;
  const url = av.svg ? av.key : iconUrl(av.path!, av.ver);
  const download = () => {
    const base = av.key.replace(/[:/]/g, "-");
    if (av.svg) save("data:image/svg+xml;charset=utf-8," + encodeURIComponent(av.svg), base + ".svg");
    else save(`${API}/api/icons/download?key=${encodeURIComponent(av.key)}`, base + (av.path!.toLowerCase().endsWith(".svg") ? ".svg" : ".png"));
  };

  // related: same set (and same subset, if any), excluding self
  const related = all.filter((i) => i.set === item.set && i.key !== item.key && (!item.subset || i.subset === item.subset)).slice(0, 24);

  return (
    <>
      {Header}
      <main className="iconpage">
        <div className="icon-card">
          <div className="icon-hero">
            {av.svg
              ? <span className="icon-hero-art" dangerouslySetInnerHTML={{ __html: av.svg }} />
              : <img className="icon-hero-art" src={iconUrl(av.path!, av.ver)} alt={av.key} />}
            {item.variants && (
              <a className="brand-tag brand-tag-corner" href={`/brand/${item.key.split(":")[1]}`} title={`Open ${item.name || ""} brand page`}>
                Brand<span className="ext-ic"><ExternalGlyph /></span>
              </a>
            )}
          </div>

          <div className="icon-body">
            <div className="icon-head">
              <h1>{pretty(item)}</h1>
              <a className="dlg-set" href={`/set/${item.set}`} title={`Browse ${item.set}`}>{item.set}</a>
              {item.subset && <a className="dlg-sub" href={`/set/${item.set}/${item.subset}`} title={`Browse ${item.set} · ${item.subset}`}>{item.subset}</a>}
            </div>

            {item.variants && item.variants.length > 1 && (
              <div className="dlg-variants">
                {item.variants.map((v) => (
                  <button key={v.key} className={"vtab" + (vv?.key === v.key ? " active" : "")} onClick={() => setVv(v)}>{v.variant}</button>
                ))}
              </div>
            )}

            <code className="icon-key">{av.key}</code>

            <div className="icon-actions">
              <button className="btn primary" onClick={() => { copy(av.key); flash("Copied key"); }}>Copy key</button>
              <button className="btn" onClick={() => { copy(url); flash("Copied URL"); }}>Copy URL</button>
              <button className="btn" onClick={download}>Download</button>
            </div>

            <div className="icon-usage">
              <p className="ul">Use in a .kymo diagram</p>
              <div className="snippet">
                <code>{snippetFor(av.key)}</code>
                <button title="Copy snippet" aria-label="Copy snippet" onClick={() => { copy(snippetFor(av.key)); flash("Copied snippet"); }}>copy</button>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="related">
            <h2>Related icons</h2>
            <div className="related-grid">
              {related.map((r) => (
                <a key={r.key} className="cell related-cell" href={iconHref(r.key)} title={r.name || r.key}>
                  {r.svg
                    ? <span dangerouslySetInnerHTML={{ __html: r.svg }} />
                    : <img loading="lazy" src={iconUrl(r.path!, r.ver)} alt={r.key} />}
                </a>
              ))}
            </div>
          </section>
        )}

        <footer className="legal">
          Logos are trademarks of their respective owners, shown for identification only.
          kymo is not affiliated with, sponsored by, or endorsed by them.
        </footer>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
