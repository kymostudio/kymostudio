// Global directory footer, rendered on every docs page (Layout bottom slot).
// Mirrors the kymo.studio landing footer so the sites stay consistent, with a
// trilingual EN/VI/ZH selector. The docs CONTENT stays English — only the
// footer chrome translates. The selector is self-contained (no app-wide
// provider in RSPress); it persists the shared `kymo-lang` key so the choice
// carries across the other kymo sites. Styling uses RSPress design tokens
// (see styles.css) so it follows light/dark automatically.
import { useEffect, useState } from "react";

type Lang = "en" | "vi" | "zh";
const LANGS: Lang[] = ["en", "vi", "zh"];
type L<T = string> = { en: T; vi: T; zh: T };
const kept = (s: string): L => ({ en: s, vi: s, zh: s });

function splitLocale(pathname: string): { lang: Lang; rest: string } {
  const m = pathname.match(/^\/(vi|zh)(\/.*)?$/);
  if (m) return { lang: m[1] as Lang, rest: m[2] || "/" };
  return { lang: "en", rest: pathname || "/" };
}
function localizedHref(lang: Lang, logicalPath: string): string {
  const p = logicalPath || "/";
  if (lang === "en") return p;
  return p === "/" ? `/${lang}/` : `/${lang}${p}`;
}

function readLang(): Lang {
  if (typeof location !== "undefined") {
    const { lang } = splitLocale(location.pathname);
    if (lang !== "en") return lang;
  }
  if (typeof document !== "undefined") {
    const c = document.cookie.match(/(?:^|;\s*)kymo-lang=(en|vi|zh)\b/);
    if (c) return c[1] as Lang;
  }
  try {
    const saved = localStorage.getItem("kymo-lang");
    if (saved && (LANGS as string[]).includes(saved)) return saved as Lang;
  } catch {}
  const tags =
    typeof navigator === "undefined" ? []
    : navigator.languages?.length ? navigator.languages : [navigator.language];
  const hit = tags.map((t) => (t || "").slice(0, 2).toLowerCase()).find((t) => (LANGS as string[]).includes(t));
  return (hit as Lang) || "en";
}

// Persist an explicit choice to localStorage + a `.kymo.studio` cookie (the
// cookie is what carries the choice across subdomains; localStorage is
// origin-scoped and would not).
function persistLang(l: Lang): void {
  try { localStorage.setItem("kymo-lang", l); } catch {}
  if (typeof document !== "undefined") {
    const shared = location.hostname.endsWith("kymo.studio") ? "; domain=.kymo.studio" : "";
    document.cookie = `kymo-lang=${l}; path=/${shared}; max-age=31536000; SameSite=Lax`;
  }
}

const LOCALE_SITES = ["https://kymo.studio", "https://docs.kymo.studio", "https://icons.kymo.studio", "https://design.kymo.studio"];
function localizeFooterHref(href: string, lang: Lang): string {
  if (lang === "en") return href;
  for (const base of LOCALE_SITES) {
    if (href === base || href.startsWith(base + "/") || href.startsWith(base + "#")) {
      const rest = href.slice(base.length);
      return rest ? `${base}/${lang}${rest}` : `${base}/${lang}/`;
    }
  }
  return href;
}

type FLink = [label: L, href: string];
type FSection = { title: L; links: FLink[] };
const FOOTER_DIRECTORY: FSection[][] = [
  [
    { title: kept("kymo.studio"), links: [
      [{ en: "Home", vi: "Trang chủ", zh: "首页" }, "https://kymo.studio"],
      [{ en: "Documentation", vi: "Tài liệu", zh: "文档" }, "https://docs.kymo.studio"],
      [kept("Editor"), "https://editor.kymo.studio"],
      [kept("Icons"), "https://icons.kymo.studio"],
      [{ en: "Design", vi: "Thiết kế", zh: "设计" }, "https://design.kymo.studio"],
    ] },
  ],
  [
    { title: { en: "Diagram types", vi: "Loại sơ đồ", zh: "图表类型" }, links: [
      [kept("Flowchart"), "https://docs.kymo.studio/diagrams/flowchart"],
      [kept("Architecture"), "https://docs.kymo.studio/diagrams/architecture"],
      [kept("Sequence"), "https://docs.kymo.studio/diagrams/sequence"],
      [kept("Class"), "https://docs.kymo.studio/diagrams/class"],
      [kept("State"), "https://docs.kymo.studio/diagrams/state"],
      [kept("Entity-Relationship"), "https://docs.kymo.studio/diagrams/entity-relationship"],
      [kept("Block"), "https://docs.kymo.studio/diagrams/block"],
      [kept("Mindmap"), "https://docs.kymo.studio/diagrams/mindmap"],
      [kept("Kanban"), "https://docs.kymo.studio/diagrams/kanban"],
      [kept("Quadrant"), "https://docs.kymo.studio/diagrams/quadrant"],
      [kept("Requirement"), "https://docs.kymo.studio/diagrams/requirement"],
      [kept("BPMN"), "https://docs.kymo.studio/diagrams/bpmn"],
    ] },
  ],
  [
    { title: { en: "Diagram formats", vi: "Định dạng sơ đồ", zh: "图表格式" }, links: [
      [kept("Mermaid"), "https://docs.kymo.studio"],
      [kept("D2"), "https://docs.kymo.studio"],
      [kept("PlantUML"), "https://docs.kymo.studio"],
      [kept("Graphviz"), "https://docs.kymo.studio"],
      [kept("BPMN"), "https://docs.kymo.studio/diagrams/bpmn"],
      [kept("WaveDrom"), "https://docs.kymo.studio"],
    ] },
    { title: { en: "Diagram outputs", vi: "Đầu ra sơ đồ", zh: "图表输出" }, links: [
      [kept("Animated SVG"), "https://docs.kymo.studio"],
      [kept("WebP"), "https://docs.kymo.studio"],
      [kept("PNG"), "https://docs.kymo.studio"],
      [kept("Figma"), "https://docs.kymo.studio"],
      [kept("Excalidraw"), "https://docs.kymo.studio"],
    ] },
  ],
  [
    { title: { en: "Packages", vi: "Gói", zh: "软件包" }, links: [
      [kept("PyPI"), "https://pypi.org/project/kymostudio/"],
      [kept("npm"), "https://www.npmjs.com/package/kymostudio"],
      [kept("crates.io"), "https://crates.io/crates/kymostudio-core"],
      [kept("VS Code"), "https://marketplace.visualstudio.com/search?term=kymostudio&target=VSCode"],
    ] },
    { title: { en: "Developers", vi: "Nhà phát triển", zh: "开发者" }, links: [
      [kept("GitHub"), "https://github.com/kymostudio/kymostudio"],
      [kept("Issues"), "https://github.com/kymostudio/kymostudio/issues"],
      [{ en: "Discussions", vi: "Thảo luận", zh: "讨论" }, "https://github.com/kymostudio/kymostudio/discussions"],
      [{ en: "Connect over MCP", vi: "Kết nối qua MCP", zh: "通过 MCP 连接" }, "https://kymo.studio/#mcp"],
    ] },
  ],
];

const COPYRIGHT: L = { en: "Copyright © 2026 KymoStudio. Licensed under Apache-2.0.", vi: "Bản quyền © 2026 KymoStudio. Cấp phép theo Apache-2.0.", zh: "版权所有 © 2026 KymoStudio。依 Apache-2.0 许可。" };
const SELECT_LANG: L = { en: "Select language", vi: "Chọn ngôn ngữ", zh: "选择语言" };

export function Footer() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const detected = readLang();
    setLang(detected);
    if (detected !== "en" && !location.pathname.startsWith(`/${detected}`)) {
      history.replaceState(null, "", localizedHref(detected, location.pathname));
    }
  }, []);
  const onChange = (l: Lang) => {
    if (l === lang) return;
    setLang(l);
    persistLang(l);
    const { rest } = splitLocale(location.pathname);
    history.replaceState(null, "", localizedHref(l, rest));
  };
  return (
    <footer id="globalfooter" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-directory">
          {FOOTER_DIRECTORY.map((col, i) => (
            <div className="footer-col" key={i}>
              {col.map((sec) => (
                <div className="footer-sec" key={sec.title.en}>
                  <h3>{sec.title[lang]}</h3>
                  <ul>
                    {sec.links.map(([label, href]) => (
                      <li key={label.en}><a href={localizeFooterHref(href, lang)}>{label[lang]}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-legal">
          <div className="footer-mini">
            <div className="footer-copyright">{COPYRIGHT[lang]}</div>
            <label className="footer-locale">
              <span className="visuallyhidden">{SELECT_LANG[lang]}</span>
              <select value={lang} onChange={(e) => onChange(e.target.value as Lang)} aria-label={SELECT_LANG[lang]}>
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
                <option value="zh">中文</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </footer>
  );
}
