import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

const RAW = "https://raw.githubusercontent.com/kymostudio/kymostudio/main/samples";
const GH = "https://github.com/kymostudio/kymostudio";

// ── i18n plumbing ────────────────────────────────────────────────
// Trilingual (English / Tiếng Việt / 中文), switched from the footer locale
// select — mirrors design.kymo.studio. Brand-fixed lines (tagline, slogan,
// eyebrow) and proper nouns stay in English in every language via kept().
type Lang = "en" | "vi" | "zh";
const LANGS: Lang[] = ["en", "vi", "zh"];
type L<T = string> = { en: T; vi: T; zh: T };
const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });
const useLang = () => useContext(LangContext);
const kept = (s: string): L => ({ en: s, vi: s, zh: s }); // proper nouns kept across languages

type Feature = { title: L; desc: L };
const FEATURES: Feature[] = [
  {
    title: { en: "Diagrams as code", vi: "Sơ đồ as code", zh: "图表即代码" },
    desc: {
      en: "Describe your diagram in a clean, line-oriented .kymo syntax — no dragging boxes around.",
      vi: "Mô tả sơ đồ bằng cú pháp .kymo gọn gàng, theo dòng — không cần kéo thả từng ô.",
      zh: "用简洁、按行书写的 .kymo 语法描述你的图表 — 无需拖拽方块。",
    },
  },
  {
    title: { en: "Animated by default", vi: "Hoạt hoạ mặc định", zh: "默认带动画" },
    desc: {
      en: "Edges come alive with built-in flowing animation, straight to a self-contained SVG.",
      vi: "Các cạnh sống động với hoạt hoạ chuyển động sẵn có, xuất thẳng ra SVG độc lập.",
      zh: "连线通过内置的流动动画活起来，直接输出为自包含的 SVG。",
    },
  },
  {
    title: { en: "Write once, export anywhere", vi: "Viết một lần, xuất mọi nơi", zh: "一次编写，处处导出" },
    desc: {
      en: "One source compiles to SVG, PNG, WebP, Figma and Excalidraw — and imports BPMN 2.0.",
      vi: "Một nguồn biên dịch ra SVG, PNG, WebP, Figma và Excalidraw — và nhập được BPMN 2.0.",
      zh: "一份源文件编译为 SVG、PNG、WebP、Figma 和 Excalidraw — 并可导入 BPMN 2.0。",
    },
  },
];

type Sample = { title: string; desc: L; file: string; preview: string; size: string };
const SAMPLES: Sample[] = [
  {
    title: "NVIDIA AIQ — Autonomous Deep Researcher",
    desc: {
      en: "Multi-region architecture: routing chain, sub-agents, RAG pipeline, shared file system, and three loop-back rails.",
      vi: "Kiến trúc đa vùng: chuỗi định tuyến, sub-agent, pipeline RAG, hệ thống file dùng chung và ba nhánh vòng lặp ngược.",
      zh: "多区域架构：路由链、子智能体、RAG 流水线、共享文件系统，以及三条回环轨道。",
    },
    file: "aiq.kymo",
    preview: `${RAW}/nvidia-aiq-animated.svg`,
    size: "1367 × 759",
  },
  {
    title: "AWS — Lex chatbot + Bedrock RAG",
    desc: {
      en: "Lex chatbot meeting Bedrock RAG inside us-east-1, with numbered step badges and dashed async fan-out to DynamoDB / Kendra.",
      vi: "Chatbot Lex gặp Bedrock RAG trong us-east-1, có badge đánh số bước và nhánh async nét đứt toả ra DynamoDB / Kendra.",
      zh: "Lex 聊天机器人在 us-east-1 中对接 Bedrock RAG，带编号步骤徽章，以及虚线异步扇出到 DynamoDB / Kendra。",
    },
    file: "aws_1.kymo",
    preview: `${RAW}/aws-1-animated.svg`,
    size: "1280 × 680",
  },
  {
    title: "NIM container architecture",
    desc: {
      en: "Tutorial 01: code-server IDE → NVIDIA Brev (GPU pod) → NVIDIA Cloud, grid layout with cross-region row alignment.",
      vi: "Tutorial 01: code-server IDE → NVIDIA Brev (GPU pod) → NVIDIA Cloud, bố cục lưới với căn hàng xuyên vùng.",
      zh: "教程 01：code-server IDE → NVIDIA Brev（GPU pod）→ NVIDIA Cloud，网格布局并跨区域对齐行。",
    },
    file: "data.kymo",
    preview: `${RAW}/data-animated.svg`,
    size: "1080 × 658",
  },
];

// ── UI strings (i18n) ────────────────────────────────────────────
// Brand-fixed lines (eyebrow, strap, slogan) stay English in every language.
const T = {
  title: { en: "KymoStudio — Diagram superpowers", vi: "KymoStudio — Diagram superpowers", zh: "KymoStudio — Diagram superpowers" },
  nav: {
    startFree: { en: "Start free", vi: "Bắt đầu miễn phí", zh: "免费开始" },
  },
  hero: {
    eyebrow: kept("The diagram studio for coding agents"),
    lead: kept("Prompt it. See it appear. Watch it animate."),
    gettingStarted: { en: "Getting Started", vi: "Bắt đầu", zh: "快速上手" },
    connectAgent: { en: "Connect Your Agent", vi: "Kết nối Agent", zh: "连接你的 Agent" },
    openEditor: { en: "Open the live Editor ↗", vi: "Mở Editor trực tiếp ↗", zh: "打开实时编辑器 ↗" },
  },
  kinds: {
    head: {
      en: <><strong>Every diagram, one studio</strong> — from architecture to BPMN, your agent picks the right kind.</>,
      vi: <><strong>Mọi sơ đồ, một studio</strong> — từ kiến trúc đến BPMN, agent của bạn chọn đúng loại.</>,
      zh: <><strong>每种图表，一个 studio</strong> — 从架构到 BPMN，你的 agent 自动挑选合适的类型。</>,
    } as L<ReactNode>,
  },
  demo: {
    agent: { en: "AI Agents", vi: "AI Agent", zh: "AI 智能体" },
    visual: { en: "Visual Editor", vi: "Trình sửa trực quan", zh: "可视化编辑器" },
    sync: { en: "Universal Sync", vi: "Đồng bộ đa định dạng", zh: "通用同步" },
    collab: { en: "Live Collaboration", vi: "Cộng tác trực tiếp", zh: "实时协作" },
  },
  mcp: {
    h2: { en: "Connect your coding agent, over MCP", vi: "Kết nối coding agent của bạn qua MCP", zh: "通过 MCP 连接你的编程 agent" },
    lead: {
      en: <>kymo runs a hosted <strong>MCP server</strong> at <code>mcp.kymo.studio</code>. Claude Code, Cursor, Copilot, Codex — even ChatGPT and Claude in your browser — any MCP client can create and edit your diagrams, rendering live in the editor while the agent types.</>,
      vi: <>kymo vận hành một <strong>MCP server</strong> tại <code>mcp.kymo.studio</code>. Claude Code, Cursor, Copilot, Codex — kể cả ChatGPT và Claude trên trình duyệt — bất kỳ MCP client nào cũng tạo và sửa sơ đồ của bạn, vẽ trực tiếp trong editor khi agent gõ.</>,
      zh: <>kymo 在 <code>mcp.kymo.studio</code> 托管了一个 <strong>MCP server</strong>。Claude Code、Cursor、Copilot、Codex — 甚至浏览器里的 ChatGPT 和 Claude — 任何 MCP 客户端都能创建并编辑你的图表，在 agent 输入时于编辑器中实时渲染。</>,
    } as L<ReactNode>,
    step1: { en: "Add the server to your agent — one line of config.", vi: "Thêm server vào agent — chỉ một dòng cấu hình.", zh: "把 server 加到你的 agent — 一行配置。" },
    step2: { en: "Ask for a diagram — the agent writes .kymo source and calls the tools.", vi: "Yêu cầu một sơ đồ — agent viết mã .kymo và gọi các tool.", zh: "请求一张图 — agent 编写 .kymo 源码并调用工具。" },
    step3: { en: "Watch it draw at editor.kymo.studio — animated SVG, ready to export.", vi: "Xem nó vẽ tại editor.kymo.studio — SVG động, sẵn sàng xuất.", zh: "在 editor.kymo.studio 看它绘制 — 动画 SVG，随时导出。" },
    copy: { en: "Copy", vi: "Chép", zh: "复制" },
    copied: { en: "Copied ✓", vi: "Đã chép ✓", zh: "已复制 ✓" },
  },
  samples: {
    h2: { en: "Samples", vi: "Mẫu", zh: "示例" },
    hint: { en: "Click a card to view source + rendered output side by side.", vi: "Bấm vào thẻ để xem mã nguồn + kết quả render cạnh nhau.", zh: "点击卡片，并排查看源码与渲染结果。" },
  },
  modal: {
    viewGitHub: { en: "View on GitHub ↗", vi: "Xem trên GitHub ↗", zh: "在 GitHub 查看 ↗" },
    close: { en: "Close", vi: "Đóng", zh: "关闭" },
    loading: { en: "# Loading…", vi: "# Đang tải…", zh: "# 加载中…" },
    failed: { en: "(failed to load source — open on GitHub instead)", vi: "(không tải được mã nguồn — mở trên GitHub thay thế)", zh: "（源码加载失败 — 请改在 GitHub 打开）" },
  },
  footer: {
    copyright: { en: "Copyright © 2026 KymoStudio. Licensed under Apache-2.0.", vi: "Bản quyền © 2026 KymoStudio. Cấp phép theo Apache-2.0.", zh: "版权所有 © 2026 KymoStudio。依 Apache-2.0 许可。" },
    selectLang: { en: "Select language", vi: "Chọn ngôn ngữ", zh: "选择语言" },
  },
};

// ── Global footer directory (Apple-HIG-style, mirrors design.kymo.studio) ──
// Links are absolute so the directory resolves identically from any kymo site.
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

function Footer() {
  const { lang, setLang } = useLang();
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
                <select id="locale" name="locale" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={T.footer.selectLang[lang]}>
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

// ---- kymo DSL highlighting (same token rules as the old static page) ----
// Container kinds + container options + `row` + `external`/`above`; the DSL
// has no `component`/`region`/`layout` keywords (v2.0+).
const KEYWORDS_INLINE = /\b(outer|inner|horizontal|vertical|row|external|above|pos|gap|align|padding-bottom|padding|dash|stroke|icon|label-position|label-anchor)\b/g;
const DIRECTIVES_LINE_START = /^(\s*)(canvas:|title:|subtitle:)/;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
function highlightDsl(text: string): string {
  return text.split("\n").map((line) => {
    if (/^\s*#/.test(line)) return `<span class="tok-comment">${escapeHtml(line)}</span>`;
    let s = escapeHtml(line);
    s = s.replace(/"([^"]*)"/g, '<span class="tok-str">"$1"</span>');
    s = s.replace(/(--&gt;|==&gt;)/g, '<span class="tok-op">$1</span>');
    s = s.replace(DIRECTIVES_LINE_START, '$1<span class="tok-kw">$2</span>');
    s = s.replace(KEYWORDS_INLINE, '<span class="tok-kw">$1</span>');
    return s;
  }).join("\n");
}

function Modal({ sample, onClose }: { sample: Sample; onClose: () => void }) {
  const { lang } = useLang();
  const loadingHtml = `<span class="tok-comment">${escapeHtml(T.modal.loading[lang])}</span>`;
  const [sourceHtml, setSourceHtml] = useState(loadingHtml);
  useEffect(() => {
    let stop = false;
    setSourceHtml(loadingHtml);
    (async () => {
      try {
        const res = await fetch(`${RAW}/${sample.file}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const text = await res.text();
        if (!stop) setSourceHtml(highlightDsl(text));
      } catch {
        if (!stop) setSourceHtml(escapeHtml(T.modal.failed[lang]));
      }
    })();
    return () => { stop = true; };
  }, [sample, lang]);
  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("modal-open"); document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <header className="modal-header">
          <h3 className="modal-title">{sample.title}</h3>
          <div className="modal-actions">
            <a className="modal-gh" href={`${GH}/blob/main/samples/${sample.file}`} target="_blank" rel="noopener">{T.modal.viewGitHub[lang]}</a>
            <button className="modal-close" onClick={onClose} aria-label={T.modal.close[lang]}>✕</button>
          </div>
        </header>
        <div className="modal-body">
          <div className="modal-pane-source"><pre><code dangerouslySetInnerHTML={{ __html: sourceHtml }} /></pre></div>
          <div className="modal-pane-preview"><img src={sample.preview} alt={sample.title} /></div>
        </div>
      </div>
    </div>
  );
}

function formatStars(n: number): string {
  return n >= 1000 ? `${(Math.round(n / 100) / 10).toFixed(1)}k` : String(n);
}

function GitHubStars() {
  const [stars, setStars] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    fetch("https://api.github.com/repos/kymostudio/kymostudio")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!stop && d && typeof d.stargazers_count === "number") setStars(formatStars(d.stargazers_count));
      })
      .catch(() => {});
    return () => { stop = true; };
  }, []);
  return (
    <a className="nav-gh" href={GH} title="Star kymostudio on GitHub">
      <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
      Stars
      {stars !== null && <span className="nav-gh-count">{stars}</span>}
    </a>
  );
}

// Diagram kinds band — a clean, clickable row in a bordered full-bleed strip.
// Each kind carries a small line glyph (uniform 1.8 stroke, 24 grid).
const DOCS = "https://docs.kymo.studio";
const EDITOR = "https://editor.kymo.studio";
const G = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const KINDS: { name: string; href: string; glyph: React.ReactNode }[] = [
  { name: "Flowchart", href: `${DOCS}/diagrams/flowchart`, glyph: <svg viewBox="0 0 24 24" {...G}><rect x="6.5" y="3" width="11" height="5.5" rx="1.3" /><path d="M12 8.5v3" /><path d="M12 11.5l4.5 4.5-4.5 4.5-4.5-4.5z" /></svg> },
  { name: "Architecture", href: "#samples", glyph: <svg viewBox="0 0 24 24" {...G}><rect x="3" y="3.5" width="18" height="17" rx="2" /><rect x="6.5" y="7" width="5.5" height="5" rx="1" /><path d="M12 12l3 3" /><rect x="15" y="13" width="4" height="4" rx="1" /></svg> },
  { name: "BPMN", href: `${DOCS}/diagrams/bpmn`, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="4.6" cy="12" r="2.1" /><path d="M6.7 12H9" /><rect x="9" y="8.8" width="6.4" height="6.4" rx="1.4" /><path d="M15.4 12h2.2" /><circle cx="19.7" cy="12" r="2.1" /><circle cx="19.7" cy="12" r="0.9" fill="currentColor" stroke="none" /></svg> },
  { name: "Sequence", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><path d="M6.5 4v16M17.5 4v16" /><path d="M6.5 9h11" /><path d="M15.2 6.8L17.5 9l-2.3 2.2" /><path d="M17.5 15.5h-11" /></svg> },
  { name: "Class", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><rect x="4.5" y="3.5" width="15" height="17" rx="1.6" /><path d="M4.5 9h15M4.5 14.5h15" /></svg> },
  { name: "ER", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><rect x="2.8" y="8.3" width="7.2" height="7.4" rx="1.2" /><rect x="15" y="8.3" width="6.2" height="7.4" rx="3.1" /><path d="M10 12h5M15 12l-2.6-2.3M15 12l-2.6 2.3" /></svg> },
  { name: "State", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" /><path d="M6.7 12h3.3" /><rect x="10" y="8.3" width="10.5" height="7.4" rx="3.7" /></svg> },
  { name: "C4", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="7" cy="5.8" r="2.1" /><path d="M3.5 12.5c0-2 1.6-3.3 3.5-3.3s3.5 1.3 3.5 3.3" /><rect x="13.5" y="7.5" width="7.5" height="6" rx="1.2" /><path d="M7 12.5v4.5h6.5" /></svg> },
  { name: "Use case", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="5.5" cy="5.5" r="1.9" /><path d="M5.5 7.4v4.6M3 9.5h5M5.5 12l-2 4M5.5 12l2 4" /><ellipse cx="16.5" cy="12" rx="5" ry="3.4" /></svg> },
  { name: "Activity", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="4.3" cy="12" r="1.6" fill="currentColor" stroke="none" /><path d="M5.9 12h2.6" /><rect x="8.5" y="8.8" width="7" height="6.4" rx="2.6" /><path d="M15.5 12H17" /><path d="M17 12l2.3-2.3L21.6 12l-2.3 2.3z" /></svg> },
  { name: "Component", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><rect x="7.5" y="4" width="13" height="16" rx="1.5" /><rect x="3" y="7.5" width="7" height="3.4" rx="0.9" /><rect x="3" y="13.1" width="7" height="3.4" rx="0.9" /></svg> },
  { name: "Deployment", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><path d="M4.5 8.5L9 4h10.5v11.5L15 20H4.5z" /><path d="M4.5 8.5H15V20M15 8.5L19.5 4" /></svg> },
  { name: "Database", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><ellipse cx="12" cy="5.6" rx="7" ry="2.6" /><path d="M5 5.6v12.8c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5.6" /><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" /></svg> },
  { name: "Gantt", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><path d="M4 4v16" /><path d="M7 7.5h7M7 12h10M7 16.5h5" strokeWidth="2.6" /></svg> },
  { name: "Timeline", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><path d="M3 12h18" /><path d="M7 12V7.5M13 12v4.5M19 12V7.5" /><circle cx="7" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="13" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" /></svg> },
  { name: "Git graph", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="6.5" cy="5.5" r="1.9" /><circle cx="6.5" cy="18.5" r="1.9" /><circle cx="17.5" cy="12" r="1.9" /><path d="M6.5 7.4v9.2" /><path d="M8 6.7c4.5 1 7.6 2.6 8.4 3.6" /></svg> },
  { name: "Network", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="12" cy="12" r="2.5" /><circle cx="5" cy="5.5" r="1.8" /><circle cx="19" cy="5.5" r="1.8" /><circle cx="5" cy="18.5" r="1.8" /><circle cx="19" cy="18.5" r="1.8" /><path d="M10.2 10.4L6.3 6.8M13.8 10.4l3.9-3.6M10.2 13.6l-3.9 3.6M13.8 13.6l3.9 3.6" /></svg> },
  { name: "Mindmap", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="12" cy="12" r="2.7" /><path d="M14.3 10.5l4-3.2M14.5 13l4.2 1.6M9.7 13.6L5.3 16.8" /><circle cx="19.8" cy="6.3" r="1.6" /><circle cx="20.2" cy="15.3" r="1.6" /><circle cx="4" cy="17.8" r="1.6" /></svg> },
  { name: "Kanban", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><rect x="3.5" y="4" width="5" height="13" rx="1" /><rect x="9.5" y="4" width="5" height="9" rx="1" /><rect x="15.5" y="4" width="5" height="16" rx="1" /></svg> },
  { name: "Timing", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><path d="M3 16h3V8h4.5v8H15V8h4v8h2" /></svg> },
  { name: "Pie", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="12" cy="12" r="8" /><path d="M12 12V4M12 12l6.8 4.2" /></svg> },
  { name: "XY chart", href: EDITOR, glyph: <svg viewBox="0 0 24 24" {...G}><path d="M4.5 4v15.5H20" /><path d="M7 14.5l3.8-4.7 3.4 2.9 4.8-6.7" /></svg> },
];

// Every kind opens a ready-made example in the editor. The diagram source is
// deflate+base64url-encoded into the share URL (the editor's own scheme,
// share.ts) — computed once on mount; until then (or on browsers without
// CompressionStream) the links fall back to the plain hrefs above.
const KIND_EXAMPLES: Record<string, { kind: string; source: string }> = {
  Flowchart: {
    kind: "kymo",
    source: `flowchart TD {
  A[Receive order] --> B{In stock?}
  B -->|Yes| C[Take payment]
  B -->|No| D[Notify customer]
  C --> E[Pack items]
  E --> F((Ship order))
  D --> G[Cancel order]
}`,
  },
  Architecture: {
    kind: "mermaid",
    source: `architecture-beta
    group api(cloud)[API]

    service db(database)[Database] in api
    service disk1(disk)[Storage] in api
    service disk2(disk)[Storage] in api
    service server(server)[Server] in api

    db:L -- R:server
    disk1:T -- B:server
    disk2:T -- B:db`,
  },
  BPMN: {
    kind: "bpmn",
    source: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="defs" targetNamespace="http://kymo.studio/bpmn">
  <bpmn:process id="proc" isExecutable="false">
    <bpmn:startEvent id="start" name="Start">
      <bpmn:outgoing>f1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="task" name="Do work">
      <bpmn:incoming>f1</bpmn:incoming>
      <bpmn:outgoing>f2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="end" name="End">
      <bpmn:incoming>f2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="task" />
    <bpmn:sequenceFlow id="f2" sourceRef="task" targetRef="end" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="dia">
    <bpmndi:BPMNPlane id="plane" bpmnElement="proc">
      <bpmndi:BPMNShape id="s_start" bpmnElement="start">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="s_task" bpmnElement="task">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="s_end" bpmnElement="end">
        <dc:Bounds x="392" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="e_f1" bpmnElement="f1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e_f2" bpmnElement="f2">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="392" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
  },
  Sequence: {
    kind: "mermaid",
    source: `sequenceDiagram
    participant A as Alice
    participant J as John
    A->>J: Hello John, how are you?
    J-->>A: Great!
    A-)J: See you later`,
  },
  Class: {
    kind: "mermaid",
    source: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal : +isMammal()
    Animal : +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }`,
  },
  ER: {
    kind: "mermaid",
    source: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`,
  },
  State: {
    kind: "mermaid",
    source: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,
  },
  C4: {
    kind: "mermaid",
    source: `C4Context
    title System Context diagram for Internet Banking
    Person(customer, "Banking Customer", "A customer of the bank.")
    System(banking, "Internet Banking System", "Allows customers to view accounts.")
    System_Ext(mail, "E-mail System", "The internal e-mail system.")
    Rel(customer, banking, "Uses")
    Rel(banking, mail, "Sends e-mail", "SMTP")`,
  },
  "Use case": {
    kind: "plantuml",
    source: `@startuml
left to right direction
actor Customer
actor Support
rectangle Store {
  Customer -- (Browse catalog)
  Customer -- (Place order)
  (Place order) .> (Pay) : include
  Support -- (Handle refund)
}
@enduml`,
  },
  Activity: {
    kind: "plantuml",
    source: `@startuml
start
:Receive order;
if (In stock?) then (yes)
  :Take payment;
  :Pack items;
  :Ship order;
else (no)
  :Notify customer;
  :Cancel order;
endif
stop
@enduml`,
  },
  Component: {
    kind: "plantuml",
    source: `@startuml
package "Storefront" {
  [Web App] --> [API Gateway]
}
[API Gateway] --> [Orders Service]
[API Gateway] --> [Catalog Service]
[Orders Service] --> [Payments]
database "Orders DB" as DB
[Orders Service] --> DB
@enduml`,
  },
  Deployment: {
    kind: "plantuml",
    source: `@startuml
node "Cloud" {
  node "Kubernetes" {
    artifact "api v2.4" as api
    artifact "worker v2.4" as worker
  }
  database "Postgres" as db
  queue "Events" as q
}
node "Browser" as b
b --> api : HTTPS
api --> db
api --> q
q --> worker
@enduml`,
  },
  Database: {
    kind: "d2",
    source: `users: {
  shape: sql_table
  id: int {constraint: primary_key}
  email: varchar
  created_at: timestamp
}

orders: {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

orders.user_id -> users.id`,
  },
  Gantt: {
    kind: "mermaid",
    source: `gantt
    title A Gantt Diagram
    dateFormat YYYY-MM-DD
    section Section
        A task          :a1, 2024-01-01, 30d
        Another task    :after a1, 20d
    section Another
        Task in Another :2024-01-12, 12d
        another task    :24d`,
  },
  Timeline: {
    kind: "mermaid",
    source: `timeline
    title History of Social Media
    2002 : LinkedIn
    2004 : Facebook
         : Google
    2005 : YouTube
    2006 : Twitter`,
  },
  "Git graph": {
    kind: "mermaid",
    source: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    commit`,
  },
  // NOT nwdiag: kroki's blockdiag family currently answers 200 with an empty
  // body, which the editor shows as a blank preview.
  Network: {
    kind: "graphviz",
    source: `graph network {
  rankdir=TB;
  node [shape=box, style=rounded, fontname="Helvetica"];
  internet [shape=ellipse, label="Internet"];
  router  [label="Router"];
  sw1 [label="Switch A"];
  sw2 [label="Switch B"];
  internet -- router;
  router -- sw1;
  router -- sw2;
  sw1 -- web01;
  sw1 -- web02;
  sw2 -- db01;
  sw2 -- db02;
}`,
  },
  Mindmap: {
    kind: "mermaid",
    source: `mindmap
  root((kymo))
    Origins
      Long history
      Popularisation
    Research
      On effectiveness
      On automatic creation
    Tools
      Pen and paper
      Diagram as code`,
  },
  Kanban: {
    kind: "mermaid",
    source: `kanban
  Todo
    [Create Documentation]
    docs[Create Blog about the new diagram]
  [In progress]
    id6[Create renderer so that it works in all cases]
  id9[Ready for deploy]
    id8[Design grammar]
  id10[Done]
    id5[define getData]`,
  },
  Timing: {
    kind: "wavedrom",
    source: `{ "signal": [
  { "name": "clk",  "wave": "p......" },
  { "name": "bus",  "wave": "x.34.5x", "data": ["head", "body", "tail"] },
  { "name": "wire", "wave": "0.1..0." }
]}`,
  },
  Pie: {
    kind: "mermaid",
    source: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,
  },
  "XY chart": {
    kind: "mermaid",
    source: `xychart-beta
    title "Sales Revenue"
    x-axis [jan, feb, mar, apr, may, jun, jul]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000]
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000]`,
  },
};

// Same encoding as the editor's share.ts: zlib deflate → base64url.
async function editorShareUrl(kind: string, source: string): Promise<string> {
  const stream = new Blob([new TextEncoder().encode(source)]).stream().pipeThrough(new CompressionStream("deflate"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const s = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${EDITOR}/?${kind === "kymo" ? "" : `k=${encodeURIComponent(kind)}&`}s=${s}`;
}

function KindsRow({ items, links, reverse }: { items: typeof KINDS; links: Record<string, string>; reverse?: boolean }) {
  return (
    <div className={reverse ? "kinds-marquee reverse" : "kinds-marquee"}>
      <div className="kinds-track">
        {[...items, ...items].map((k, i) => (
          <a
            className="kind"
            key={`${k.name}-${i}`}
            href={links[k.name] ?? k.href}
            aria-hidden={i >= items.length || undefined}
            tabIndex={i >= items.length ? -1 : undefined}
          >
            {k.glyph}
            {k.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function KindsStrip() {
  const { lang } = useLang();
  const [links, setLinks] = useState<Record<string, string>>({});
  useEffect(() => {
    if (typeof CompressionStream === "undefined") return; // keep fallback hrefs
    let stop = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const [name, ex] of Object.entries(KIND_EXAMPLES)) out[name] = await editorShareUrl(ex.kind, ex.source);
      if (!stop) setLinks(out);
    })();
    return () => { stop = true; };
  }, []);
  // three rows, each blending two thirds of the catalogue: A+B / B+C / C+A —
  // long enough that the marquee's duplicate copy stays off-screen
  const third = Math.ceil(KINDS.length / 3);
  const A = KINDS.slice(0, third);
  const B = KINDS.slice(third, third * 2);
  const C = KINDS.slice(third * 2);
  return (
    <section className="kinds" aria-label="Supported diagram types">
      <p className="kinds-head">{T.kinds.head[lang]}</p>
      <KindsRow items={[...A, ...B]} links={links} />
      <KindsRow items={[...B, ...C]} links={links} reverse />
      <KindsRow items={[...C, ...A]} links={links} />
    </section>
  );
}

// Per-client connect recipes — commands verified against each client's docs.
const SSE = "https://mcp.kymo.studio/sse";
const HTTP = "https://mcp.kymo.studio/mcp";
// btoa('{"url":"https://mcp.kymo.studio/sse"}')
const CURSOR_DEEPLINK = "cursor://anysphere.cursor-deeplink/mcp/install?name=kymo&config=eyJ1cmwiOiJodHRwczovL21jcC5reW1vLnN0dWRpby9zc2UifQ==";
const VSCODE_INSTALL = `https://vscode.dev/redirect/mcp/install?name=kymo&config=${encodeURIComponent(JSON.stringify({ type: "sse", url: SSE }))}`;

// Brand marks (Simple Icons CC0 + Devicon for VS Code), fill follows currentColor.
const MARK = (vb: string, d: string) => (
  <svg viewBox={vb} fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);
const MARKS = {
  anthropic: MARK("0 0 24 24", "M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"),
  claude: MARK("0 0 24 24", "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"),
  cursor: MARK("0 0 24 24", "M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"),
  vscode: MARK("0 0 128 128", "M90.767 127.126a7.968 7.968 0 0 0 6.35-.244l26.353-12.681a8 8 0 0 0 4.53-7.209V21.009a8 8 0 0 0-4.53-7.21L97.117 1.12a7.97 7.97 0 0 0-9.093 1.548l-50.45 46.026L15.6 32.013a5.328 5.328 0 0 0-6.807.302l-7.048 6.411a5.335 5.335 0 0 0-.006 7.888L20.796 64 1.74 81.387a5.336 5.336 0 0 0 .006 7.887l7.048 6.411a5.327 5.327 0 0 0 6.807.303l21.974-16.68 50.45 46.025a7.96 7.96 0 0 0 2.743 1.793Zm5.252-92.183L57.74 64l38.28 29.058V34.943Z"),
  openai: MARK("0 0 24 24", "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"),
  gemini: MARK("0 0 24 24", "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"),
  windsurf: MARK("0 0 24 24", "M23.55 5.067c-1.2038-.002-2.1806.973-2.1806 2.1765v4.8676c0 .972-.8035 1.7594-1.7597 1.7594-.568 0-1.1352-.286-1.4718-.7659l-4.9713-7.1003c-.4125-.5896-1.0837-.941-1.8103-.941-1.1334 0-2.1533.9635-2.1533 2.153v4.8957c0 .972-.7969 1.7594-1.7596 1.7594-.57 0-1.1363-.286-1.4728-.7658L.4076 5.1598C.2822 4.9798 0 5.0688 0 5.2882v4.2452c0 .2147.0656.4228.1884.599l5.4748 7.8183c.3234.462.8006.8052 1.3509.9298 1.3771.313 2.6446-.747 2.6446-2.0977v-4.893c0-.972.7875-1.7593 1.7596-1.7593h.003a1.798 1.798 0 0 1 1.4718.7658l4.9723 7.0994c.4135.5905 1.05.941 1.8093.941 1.1587 0 2.1515-.9645 2.1515-2.153v-4.8948c0-.972.7875-1.7594 1.7596-1.7594h.194a.22.22 0 0 0 .2204-.2202v-4.622a.22.22 0 0 0-.2203-.2203Z"),
  mcp: MARK("0 0 24 24", "M13.85 0a4.16 4.16 0 0 0-2.95 1.217L1.456 10.66a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l9.442-9.442a2.49 2.49 0 0 1 3.541 0 2.49 2.49 0 0 1 0 3.541L8.59 12.97l-.1.1a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l.1-.098 7.03-7.034a2.49 2.49 0 0 1 3.542 0l.049.05a2.49 2.49 0 0 1 0 3.54l-8.54 8.54a1.96 1.96 0 0 0 0 2.755l1.753 1.753a.835.835 0 0 0 1.18 0 .835.835 0 0 0 0-1.18l-1.753-1.753a.266.266 0 0 1 0-.394l8.54-8.54a4.185 4.185 0 0 0 0-5.9l-.05-.05a4.16 4.16 0 0 0-2.95-1.218c-.2 0-.401.02-.6.048a4.17 4.17 0 0 0-1.17-3.552A4.16 4.16 0 0 0 13.85 0m0 3.333a.84.84 0 0 0-.59.245L6.275 10.56a4.186 4.186 0 0 0 0 5.902 4.186 4.186 0 0 0 5.902 0L19.16 9.48a.835.835 0 0 0 0-1.18.835.835 0 0 0-1.18 0l-6.985 6.984a2.49 2.49 0 0 1-3.54 0 2.49 2.49 0 0 1 0-3.54l6.983-6.985a.835.835 0 0 0 0-1.18.84.84 0 0 0-.59-.245"),
};

type Agent = { key: string; label: string; mark: React.ReactNode; context: string; code: string; deeplink?: { href: string; text: string } };
const AGENTS: Agent[] = [
  { key: "claude-code", label: "Claude Code", mark: MARKS.anthropic, context: "terminal", code: `claude mcp add --transport sse kymo \\\n  ${SSE}` },
  { key: "cursor", label: "Cursor", mark: MARKS.cursor, context: "~/.cursor/mcp.json", code: `{ "mcpServers": {\n    "kymo": { "url": "${SSE}" }\n} }`, deeplink: { href: CURSOR_DEEPLINK, text: "Add to Cursor ↗" } },
  { key: "vscode", label: "VS Code", mark: MARKS.vscode, context: "terminal · Copilot", code: `code --add-mcp \\\n  '{"name":"kymo","type":"sse","url":"${SSE}"}'`, deeplink: { href: VSCODE_INSTALL, text: "Install in VS Code ↗" } },
  { key: "codex", label: "Codex", mark: MARKS.openai, context: "terminal", code: `codex mcp add kymo --url ${HTTP}` },
  { key: "gemini", label: "Gemini CLI", mark: MARKS.gemini, context: "terminal", code: `gemini mcp add --transport sse kymo ${SSE}` },
  { key: "windsurf", label: "Windsurf", mark: MARKS.windsurf, context: "~/.codeium/windsurf/mcp_config.json", code: `{ "mcpServers": {\n    "kymo": { "serverUrl": "${SSE}" }\n} }` },
  { key: "claude", label: "Claude", mark: MARKS.claude, context: "web · desktop · mobile", code: `# Settings → Connectors\nAdd custom connector\nURL: ${HTTP}` },
  { key: "chatgpt", label: "ChatGPT", mark: MARKS.openai, context: "developer mode", code: `# Settings → Apps → Create\nConnector URL: ${HTTP}` },
  { key: "any", label: "Any MCP client", mark: MARKS.mcp, context: "mcp.json", code: `{ "mcpServers": {\n    "kymo": { "url": "${HTTP}" }\n} }` },
];

function McpTerminal() {
  const { lang } = useLang();
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const agent = AGENTS[tab];
  const copy = () => {
    const text = agent.code;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch { /* leave label as-is */ }
      ta.remove();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
    else fallback();
  };
  return (
    <div className="mcp-snippets">
      <div className="mcp-agents" role="tablist" aria-label="Pick your agent">
        {AGENTS.map((a, i) => (
          <button key={a.key} role="tab" aria-selected={i === tab} className={i === tab ? "mcp-agent active" : "mcp-agent"} onClick={() => { setTab(i); setCopied(false); }}>
            {a.mark}
            {a.label}
          </button>
        ))}
      </div>
      <div className="mcp-term">
        <div className="mcp-term-bar">
          <span className="mcp-term-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="mcp-term-label">{agent.context}</span>
          {agent.deeplink && <a className="mcp-bar-link" href={agent.deeplink.href}>{agent.deeplink.text}</a>}
          <button className="mcp-copy-btn" onClick={copy} aria-live="polite">{copied ? T.mcp.copied[lang] : T.mcp.copy[lang]}</button>
        </div>
        <pre><code>{agent.code}</code></pre>
      </div>
    </div>
  );
}

// Embedded product mockups (docs/brand/screenshots/screen1.html → /hero-demo.html,
// screen3.html → /diagrams-demo.html, both copied by build.sh). In ?embed mode each
// renders only the app window (fixed 1280×720); we scale it to the section width and
// lazily load once it scrolls into view. A top tab bar (Cherry-Studio style) switches
// between the agent-live storyboard and the diagram kinds.
const DEMO_W = 1280;
const DEMO_H = 720;
// one tab per demo screen; each plays itself (screen3 cycles Kanban → C4 → Class)
type DemoTab = { id: string; label: L; href: (reduce: boolean) => string; icon: React.ReactNode };
const DEMO_TABS: DemoTab[] = [
  {
    id: "agent", label: T.demo.agent,
    href: (r) => `./hero-demo.html?embed=1${r ? "" : "&autoplay=1"}`,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>,
  },
  {
    id: "visual", label: T.demo.visual,
    href: (r) => `./sequence-demo.html?embed=1${r ? "" : "&autoplay=1"}`,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z" /><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /></svg>,
  },
  {
    id: "diagrams", label: T.demo.sync,
    href: (r) => `./diagrams-demo.html?embed=1${r ? "" : "&autoplay=1"}`,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" /></svg>,
  },
  {
    id: "collab", label: T.demo.collab,
    href: (r) => `./collab-demo.html?embed=1${r ? "" : "&autoplay=1"}`,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg>,
  },
];
function HeroDemo() {
  const { lang } = useLang();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [armed, setArmed] = useState(false);
  const [scale, setScale] = useState(1);
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false });
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => {
      const s = Math.min(1, frame.clientWidth / DEMO_W);
      setScale(s);
      frame.style.height = `${DEMO_H * s}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    // load the iframe only when the demo nears the viewport
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setArmed(true); io.disconnect(); }
    }, { rootMargin: "200px" });
    io.observe(frame);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  // auto-advance to the next tab once the embedded demo finishes one full cycle
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e?.data?.type === "kymo-demo-done") setActive((a) => (a + 1) % DEMO_TABS.length);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // slide the pill indicator under the active tab (Cherry-Studio style)
  useEffect(() => {
    const wrap = tabsRef.current;
    if (!wrap) return;
    const measure = () => {
      const b = wrap.querySelectorAll<HTMLButtonElement>(".demo-tab")[active];
      if (b) {
        setInd({ left: b.offsetLeft, width: b.offsetWidth, ready: true });
        // keep the active tab visible when the pill scrolls on narrow screens
        b.scrollIntoView({ inline: "nearest", block: "nearest" });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [active]);

  const src = armed ? DEMO_TABS[active].href(reduce) : undefined;

  return (
    <section className="demo" aria-label="KymoStudio in action">
      <div className="demo-tabs" role="tablist" aria-label="Demo" ref={tabsRef}>
        <span
          className="demo-tab-ind"
          aria-hidden="true"
          style={{ transform: `translateX(${ind.left}px)`, width: ind.width, opacity: ind.ready ? 1 : 0 }}
        />
        {DEMO_TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={t.label[lang]}            /* accessible name when the label is icon-only on mobile */
            title={t.label[lang]}
            className={"demo-tab" + (i === active ? " active" : "")}
            onClick={() => setActive(i)}
          >
            <span className="demo-tab-ic">{t.icon}</span>
            <span className="demo-tab-label">{t.label[lang]}</span>
          </button>
        ))}
      </div>
      <div className="demo-frame" ref={frameRef}>
        <iframe
          key={active}                              /* fresh load per tab */
          className="demo-iframe"
          style={{ transform: `scale(${scale})` }}  /* state-driven so it survives remounts */
          src={src}
          title="KymoStudio — prompt a diagram, watch it build and animate"
          loading="lazy"
          scrolling="no"
        />
        {/* fade the bottom edge into the page background — the mockup dissolves in */}
        <div className="demo-fade" aria-hidden="true" />
      </div>
    </section>
  );
}

function Page() {
  const { lang } = useLang();
  const [selected, setSelected] = useState<Sample | null>(null);
  return (
    <>
      <nav>
        <div className="nav-inner">
          <div className="brand"><img src="./logo.svg" alt="" />KymoStudio</div>
          <div className="nav-right">
            <GitHubStars />
            <a className="btn btn-primary btn-sm" href="https://editor.kymo.studio">{T.nav.startFree[lang]}</a>
          </div>
        </div>
      </nav>

      <main>
      <header className="hero hero-split hero-center">
        <div className="hero-text">
          <h1>
            <span className="strap">Bring your Diagrams to <em>Life</em></span>
          </h1>
          <p className="lead">
            <span className="mark mark-1">Prompt it</span>. <span className="mark mark-2">See it appear</span>. <span className="mark mark-3">Watch it animate</span>.
          </p>
          <div className="ctas">
            <a className="btn btn-dark btn-pill" href="https://editor.kymo.studio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
              Launch App
            </a>
            <a className="btn btn-alt btn-pill btn-docs" href="https://docs.kymo.studio">
              Docs
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      <HeroDemo />

      <KindsStrip />

      <section className="mcp" id="mcp">
        <div className="mcp-inner">
          <div className="mcp-copy">
            <h2>{T.mcp.h2[lang]}</h2>
            {/* the brand motif: a flowing-dash edge between two ports */}
            <svg className="mcp-h2-edge" viewBox="0 0 260 16" width="260" height="16" aria-hidden="true">
              <path className="edge-path" d="M 8 8 H 252" />
              <g className="edge-node">
                <circle cx="8" cy="8" r="5.5" />
                <circle className="core" cx="8" cy="8" r="2.2" />
              </g>
              <g className="edge-node">
                <circle cx="252" cy="8" r="5.5" />
                <circle className="core" cx="252" cy="8" r="2.2" />
              </g>
            </svg>
            <p>{T.mcp.lead[lang]}</p>
            <ol className="mcp-steps">
              <li>{T.mcp.step1[lang]}</li>
              <li>{T.mcp.step2[lang]}</li>
              <li>{T.mcp.step3[lang]}</li>
            </ol>
            <ul className="mcp-tools" aria-label="MCP tools">
              <li><code>new_diagram</code></li>
              <li><code>edit_diagram</code></li>
              <li><code>get_diagram</code></li>
              <li><code>list_diagrams</code></li>
              <li><code>delete_diagram</code></li>
            </ul>
          </div>
          <McpTerminal />
        </div>
      </section>

      <div className="preview">
        <div className="preview-frame">
          <img src={`${RAW}/nvidia-aiq-animated.webp`} alt="kymo demo — NVIDIA AIQ replica, animated WebP" />
        </div>
      </div>

      <section className="samples" id="samples">
        <div className="section-header">
          <h2>{T.samples.h2[lang]}</h2>
          <span className="hint">{T.samples.hint[lang]}</span>
        </div>
        <div className="grid">
          {SAMPLES.map((s) => (
            <article className="card" key={s.file} onClick={() => setSelected(s)}>
              <div className="card-preview"><img src={s.preview} alt={s.title} loading="lazy" /></div>
              <div className="card-body">
                <h3 className="card-title">{s.title}</h3>
                <p className="card-desc">{s.desc[lang]}</p>
                <div className="card-meta"><span>{s.file}</span><span>·</span><span>{s.size}</span></div>
              </div>
            </article>
          ))}
        </div>
      </section>
      </main>

      <Footer />

      {selected && <Modal sample={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function App() {
  const [lang, setLang] = useState<Lang>("en");

  // restore saved choice on mount (shared key with design.kymo.studio)
  useEffect(() => {
    const saved = localStorage.getItem("kymo-lang");
    if (saved && (LANGS as string[]).includes(saved)) setLang(saved as Lang);
  }, []);

  // persist + reflect on <html lang> and the document title
  useEffect(() => {
    localStorage.setItem("kymo-lang", lang);
    document.documentElement.lang = lang;
    document.title = T.title[lang];
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <Page />
    </LangContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
