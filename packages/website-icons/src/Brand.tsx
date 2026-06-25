import { useEffect, useState } from "react";
import { API } from "./App";
import { useLang, T, Footer, splitLocale, localizedHref } from "./i18n";

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
type Brand = { set: string; slug: string; name: string; color: string; subset?: string; website?: string; variants: Variant[] };

// strip scheme/trailing slash for a compact display label (deepai.org)
const hostLabel = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/+$/, "");

export function BrandPage() {
  const parts = splitLocale(location.pathname).rest.split("/"); // /brand/<slug>
  const slug = decodeURIComponent(parts.slice(2).join("/") || "");
  const { lang } = useLang();
  const [brand, setBrand] = useState<Brand | null | undefined>(undefined);
  const [showLoader, setShowLoader] = useState(false); // delayed → no flash on fast loads
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
  // only reveal the loader if loading drags past ~200ms — fast loads never flash it
  useEffect(() => {
    const t = window.setTimeout(() => setShowLoader(true), 200);
    return () => clearTimeout(t);
  }, []);
  if (brand) document.title = `${brand.name} · Kymo Icons`;

  const Header = (
    <header>
      <div className="top">
        <a className="brand" href={localizedHref(lang, "/")} style={{ textDecoration: "none" }}>
          <img className="k" src="/logo.svg" alt="kymo" width={26} height={26} /> Kymo Icons
        </a>
        <nav className="nav"><a href={localizedHref(lang, brand ? `/set/${brand.set}` : "/")}>{T.back[lang]}</a></nav>
      </div>
    </header>
  );
  if (brand === undefined) return <>{Header}<main className="brandpage">{showLoader && <div className="kloader-wrap"><KLoader /></div>}</main></>;
  if (!brand) return <>{Header}<main className="brandpage"><div className="login-card"><h2>{T.brandNotFound[lang]}</h2><p>{T.noBrand[lang]} <b>{slug}</b>.</p><a href={localizedHref(lang, "/")}>{T.allIcons[lang]}</a></div></main></>;

  const v = (name: string) => brand.variants.find((x) => x.variant === name);
  const iconV = v("icon"), colorV = v("color"), textV = v("text"), brandV = v("brand");
  const mono = iconV || colorV;                 // for avatars (whitened on the brand color)
  const color = brand.color || "#3a3a3a";
  const img = (vr: Variant, cls: string) => <img className={cls} src={iconUrl(vr.path, vr.ver)} alt={vr.key} />;

  const Bar = ({ vr }: { vr: Variant }) => (
    <div className="showcase-bar">
      <code>{vr.key}</code>
      <div className="showcase-actions">
        <button className="sc-btn" onClick={() => { copy(vr.key); flash(T.toast.copiedKey[lang]); }}>{T.actions.copyKey[lang]}</button>
        <button className="sc-btn" onClick={() => { copy(iconUrl(vr.path, vr.ver)); flash(T.toast.copiedUrl[lang]); }}>{T.actions.copyUrl[lang]}</button>
        <button className="sc-btn" onClick={() => download(vr.key, vr.path)}>{T.actions.download[lang]}</button>
      </div>
    </div>
  );

  // Combine + Avatar are composed client-side, so their Download builds a
  // standalone SVG (referencing the CDN art) and saves it as a data-URL.
  const dataSvg = (svg: string, name: string) => save("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), name);
  const imgDim = (url: string): Promise<[number, number]> => new Promise((res) => {
    const im = new Image(); im.onload = () => res([im.naturalWidth || 1, im.naturalHeight || 1]); im.onerror = () => res([1, 1]); im.src = url;
  });
  const dlCombine = async (useColor: boolean) => {
    const ic = useColor ? colorV! : iconV!;
    const iu = iconUrl(ic.path, ic.ver), tu = iconUrl(textV!.path, textV!.ver);
    const [iw, ih] = await imgDim(iu); const [tw, th] = await imgDim(tu);
    const H = 56, gap = 18, isw = Math.round(iw * (H / ih)), tsw = Math.round(tw * (H / th)), W = isw + gap + tsw;
    dataSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><image href="${iu}" x="0" y="0" width="${isw}" height="${H}"/><image href="${tu}" x="${isw + gap}" y="0" width="${tsw}" height="${H}"/></svg>`, `${brand.slug}-combine${useColor ? "-color" : ""}.svg`);
    flash(T.toast.copiedCombine[lang]);
  };
  const dlAvatar = async (circle: boolean) => {
    const a = mono!; const au = iconUrl(a.path, a.ver);
    const [iw, ih] = await imgDim(au);
    const S = 128, pad = 34, ih2 = S - 2 * pad, iw2 = Math.round(iw * (ih2 / ih)), ix = Math.round((S - iw2) / 2), iy = pad, rx = circle ? S / 2 : 28;
    dataSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><defs><filter id="w"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter></defs><rect width="${S}" height="${S}" rx="${rx}" fill="${color}"/><image href="${au}" x="${ix}" y="${iy}" width="${iw2}" height="${ih2}" filter="url(#w)"/></svg>`, `${brand.slug}-avatar-${circle ? "circle" : "square"}.svg`);
    flash(T.toast.copiedAvatar[lang]);
  };

  const toc: (keyof typeof T.sections)[] = [];
  if (iconV || colorV) toc.push("icons");
  if (textV) toc.push("text");
  if (textV && (iconV || colorV)) toc.push("combine");
  if (mono) toc.push("avatars");
  if (color) toc.push("colors");

  return (
    <>
      {Header}
      <div className="brand-wrap">
        <main className="brandpage">
          <h1 className="brand-title">{brand.name}</h1>
          <div className="brand-sub">
            {brand.website && (
              <>
                <a className="brand-site" href={brand.website} target="_blank" rel="noopener noreferrer">
                  {hostLabel(brand.website)}<ExtMini />
                </a>
                <span className="row-break" />
              </>
            )}
            <span className="dlg-set">{brand.set}</span>
            {brand.subset && (
              <a className="dlg-sub" href={localizedHref(lang, `/set/${brand.set}/${brand.subset}`)} title={`Browse ${brand.set} · ${brand.subset}`}>{brand.subset}</a>
            )}
          </div>
          {(colorV || iconV) && (() => { const d = colorV || iconV!; return (
            <div className="snippet brand-import">
              <code>{`node box/${d.key}/blue "Label"`}</code>
              <button title={T.actions.copySnippet[lang]} aria-label={T.actions.copySnippet[lang]} onClick={() => { copy(`node box/${d.key}/blue "Label"`); flash(T.toast.copiedSnippet[lang]); }}><CopyMini /></button>
            </div>
          ); })()}

          {(iconV || colorV) && (
            <section id="icons" className="brand-section">
              <h2>{T.sections.icons[lang]}</h2>
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
              <h2>{T.sections.text[lang]}</h2>
              <div className="showcase">
                <div className="showcase-art">{img(textV, "sc-text")}</div>
                <Bar vr={textV} />
              </div>
            </section>
          )}

          {textV && (iconV || colorV) && (
            <section id="combine" className="brand-section">
              <h2>{T.sections.combine[lang]}</h2>
              <div className="showcase">
                <div className="showcase-art col">
                  {iconV && <div className="combine-row">{img(iconV, "ci")}{img(textV, "ct")}</div>}
                  {colorV && <div className="combine-row">{img(colorV, "ci")}{img(textV, "ct")}</div>}
                </div>
                <div className="showcase-bar">
                  <code>{brand.slug}-combine</code>
                  <div className="showcase-actions">
                    {iconV && <button className="sc-btn" onClick={() => dlCombine(false)}>{colorV ? T.actions.downloadMono[lang] : T.actions.download[lang]}</button>}
                    {colorV && <button className="sc-btn" onClick={() => dlCombine(true)}>{iconV ? T.actions.downloadColor[lang] : T.actions.download[lang]}</button>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {mono && (
            <section id="avatars" className="brand-section">
              <h2>{T.sections.avatars[lang]}</h2>
              <div className="showcase">
                <div className="showcase-art row">
                  <div className="avatar circle" style={{ background: color }}>{img(mono, "av")}</div>
                  <div className="avatar square" style={{ background: color }}>{img(mono, "av")}</div>
                </div>
                <div className="showcase-bar">
                  <code>{brand.slug}-avatar</code>
                  <div className="showcase-actions">
                    <button className="sc-btn" onClick={() => dlAvatar(true)}>{T.actions.downloadCircle[lang]}</button>
                    <button className="sc-btn" onClick={() => dlAvatar(false)}>{T.actions.downloadSquare[lang]}</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {color && (
            <section id="colors" className="brand-section">
              <h2>{T.sections.colors[lang]}</h2>
              <div className="showcase">
                <div className="showcase-art"><div className="color-swatch" style={{ background: color }} /></div>
                <div className="showcase-bar">
                  <code>{color}</code>
                  <div className="showcase-actions">
                    <button className="sc-btn" onClick={() => { copy(color); flash(T.toast.copiedColor[lang]); }}>{T.actions.copyColor[lang]}</button>
                  </div>
                </div>
              </div>
            </section>
          )}

        </main>

        <aside className="brand-toc">
          <p className="toc-label">{T.onThisPage[lang]}</p>
          {toc.map((t) => <a key={t} href={`#${t}`}>{T.sections[t][lang]}</a>)}
        </aside>
      </div>
      <Footer />
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

// kymo brand loader (the animated "K") — mirrors the editor.kymo.studio splash.
const KLoader = () => (
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

const CopyMini = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const ExtMini = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ marginLeft: 4, verticalAlign: "-1px" }}>
    <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);
