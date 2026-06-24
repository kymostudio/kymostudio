import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// ── i18n plumbing ────────────────────────────────────────────────
// Trilingual UI chrome (EN / Tiếng Việt / 中文) for icons.kymo.studio,
// switched from the footer locale select. Only chrome (nav, buttons, labels)
// is translated — icon/brand content (keys, names, sets) stays as-is. Shares
// the `kymo-lang` localStorage key with the other kymo sites.
export type Lang = "en" | "vi" | "zh";
const LANGS: Lang[] = ["en", "vi", "zh"];
export type L<T = string> = { en: T; vi: T; zh: T };
const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });
export const useLang = () => useContext(LangContext);
const kept = (s: string): L => ({ en: s, vi: s, zh: s });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("kymo-lang");
    if (saved && (LANGS as string[]).includes(saved)) setLang(saved as Lang);
  }, []);
  useEffect(() => {
    localStorage.setItem("kymo-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

// ── UI chrome strings ────────────────────────────────────────────
export const T = {
  nav: {
    docs: { en: "Docs", vi: "Tài liệu", zh: "文档" },
    editor: kept("Editor"),
    menu: { en: "Menu", vi: "Menu", zh: "菜单" },
    github: kept("GitHub"),
    toggleTheme: { en: "Toggle theme", vi: "Đổi giao diện", zh: "切换主题" },
  },
  gallery: {
    iconsSuffix: { en: "icons", vi: "icon", zh: "图标" },
    filters: { en: "Filters", vi: "Bộ lọc", zh: "筛选" },
    appliedFilters: { en: "Applied filters", vi: "Bộ lọc đang dùng", zh: "已应用筛选" },
    clearAll: { en: "Clear all", vi: "Xoá tất cả", zh: "清除全部" },
    previewSize: { en: "Preview size", vi: "Cỡ xem trước", zh: "预览尺寸" },
    sets: { en: "Sets", vi: "Bộ", zh: "图标集" },
    all: { en: "All", vi: "Tất cả", zh: "全部" },
    searchPlaceholder: {
      en: "Search for icons — “ec2”, “kubernetes”, “database”…",
      vi: "Tìm icon — “ec2”, “kubernetes”, “database”…",
      zh: "搜索图标 — “ec2”、“kubernetes”、“database”…",
    },
    sortName: { en: "Name A→Z", vi: "Tên A→Z", zh: "名称 A→Z" },
    sortSet: { en: "By set", vi: "Theo bộ", zh: "按图标集" },
    sort: { en: "Sort", vi: "Sắp xếp", zh: "排序" },
    countOne: { en: "icon", vi: "icon", zh: "图标" },
    countMany: { en: "icons", vi: "icon", zh: "图标" },
  },
  back: { en: "← Gallery", vi: "← Thư viện", zh: "← 图库" },
  allIcons: { en: "← All icons", vi: "← Tất cả icon", zh: "← 全部图标" },
  loading: { en: "Loading…", vi: "Đang tải…", zh: "加载中…" },
  onThisPage: { en: "On this page", vi: "Trên trang này", zh: "本页内容" },
  brandNotFound: { en: "Brand not found", vi: "Không tìm thấy brand", zh: "未找到品牌" },
  iconNotFound: { en: "Icon not found", vi: "Không tìm thấy icon", zh: "未找到图标" },
  noBrand: { en: "No brand", vi: "Không có brand", zh: "无品牌" },
  noIcon: { en: "No icon", vi: "Không có icon", zh: "无图标" },
  relatedIcons: { en: "Related icons", vi: "Icon liên quan", zh: "相关图标" },
  actions: {
    brand: { en: "Brand", vi: "Brand", zh: "品牌" },
    copyKey: { en: "Copy key", vi: "Chép key", zh: "复制 key" },
    copyUrl: { en: "Copy URL", vi: "Chép URL", zh: "复制 URL" },
    copyColor: { en: "Copy color", vi: "Chép màu", zh: "复制颜色" },
    copySnippet: { en: "Copy snippet", vi: "Chép đoạn mã", zh: "复制代码" },
    download: { en: "Download", vi: "Tải về", zh: "下载" },
    downloadMono: { en: "Download mono", vi: "Tải mono", zh: "下载 mono" },
    downloadColor: { en: "Download color", vi: "Tải màu", zh: "下载彩色" },
    downloadCircle: { en: "Download circle", vi: "Tải tròn", zh: "下载圆形" },
    downloadSquare: { en: "Download square", vi: "Tải vuông", zh: "下载方形" },
    close: { en: "Close", vi: "Đóng", zh: "关闭" },
    useInDiagram: { en: "Use in a .kymo diagram", vi: "Dùng trong sơ đồ .kymo", zh: "在 .kymo 图表中使用" },
  },
  toast: {
    copiedKey: { en: "Copied key", vi: "Đã chép key", zh: "已复制 key" },
    copiedUrl: { en: "Copied URL", vi: "Đã chép URL", zh: "已复制 URL" },
    copiedSnippet: { en: "Copied snippet", vi: "Đã chép đoạn mã", zh: "已复制代码" },
    copiedColor: { en: "Copied color", vi: "Đã chép màu", zh: "已复制颜色" },
    copiedCombine: { en: "Downloaded combine", vi: "Đã tải combine", zh: "已下载组合" },
    copiedAvatar: { en: "Downloaded avatar", vi: "Đã tải avatar", zh: "已下载头像" },
  },
  sections: {
    icons: { en: "Icons", vi: "Icon", zh: "图标" },
    text: { en: "Text", vi: "Chữ", zh: "文字" },
    combine: { en: "Combine", vi: "Kết hợp", zh: "组合" },
    avatars: { en: "Avatars", vi: "Avatar", zh: "头像" },
    colors: { en: "Colors", vi: "Màu", zh: "颜色" },
  },
  footer: {
    trademark: {
      en: "Logos are trademarks of their respective owners, shown for identification only. kymo is not affiliated with, sponsored by, or endorsed by them.",
      vi: "Các logo là thương hiệu của chủ sở hữu tương ứng, chỉ hiển thị để nhận diện. kymo không liên kết, được tài trợ hay xác nhận bởi họ.",
      zh: "各 logo 为其各自所有者的商标，仅用于识别。kymo 与之无关联，未受其赞助或认可。",
    },
    copyright: { en: "Copyright © 2026 KymoStudio. Licensed under Apache-2.0.", vi: "Bản quyền © 2026 KymoStudio. Cấp phép theo Apache-2.0.", zh: "版权所有 © 2026 KymoStudio。依 Apache-2.0 许可。" },
    selectLang: { en: "Select language", vi: "Chọn ngôn ngữ", zh: "选择语言" },
  },
};

// ── Global footer directory (mirrors kymo.studio) ────────────────
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

export function Footer() {
  const { lang, setLang } = useLang();
  return (
    <footer id="globalfooter" role="contentinfo">
      <div className="footer-inner">
        <p className="footer-trademark">{T.footer.trademark[lang]}</p>
        <div className="footer-directory">
          {FOOTER_DIRECTORY.map((col, i) => (
            <div className="footer-col" key={i}>
              {col.map((sec) => (
                <div className="footer-sec" key={sec.title.en}>
                  <h3>{sec.title[lang]}</h3>
                  <ul>
                    {sec.links.map(([label, href]) => (
                      <li key={label.en}><a href={href}>{label[lang]}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-legal">
          <div className="footer-mini">
            <div className="footer-copyright">{T.footer.copyright[lang]}</div>
            <div className="footer-legal-links">
              <label className="footer-locale">
                <span className="visuallyhidden">{T.footer.selectLang[lang]}</span>
                <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={T.footer.selectLang[lang]}>
                  <option value="en">English</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="zh">中文</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
