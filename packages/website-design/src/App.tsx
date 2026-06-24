import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/* ════════════════════════════════════════════════════════════════
   design.kymo.studio — the kymo brand & design system, as a React app.
   Content is canonical in docs/brand/README.md; tokens mirror
   packages/website/src/styles.css. This page dogfoods those tokens.
   Trilingual (English / Tiếng Việt / 中文) — switched from the footer locale
   select. Brand-fixed lines (tagline, slogan, eyebrow, positioning, listing
   copy) stay in English in every language — they live inside the brand assets.
   ════════════════════════════════════════════════════════════════ */

// ── i18n plumbing ────────────────────────────────────────────────
type Lang = "en" | "vi" | "zh";
const LANGS: Lang[] = ["en", "vi", "zh"];
type L<T = string> = { en: T; vi: T; zh: T };
const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });
const useLang = () => useContext(LangContext);
const kept = (s: string): L => ({ en: s, vi: s, zh: s }); // proper nouns kept across languages

// ── Data ─────────────────────────────────────────────────────────
type Swatch = { name: L; hex: string; role: L; labelInk?: boolean; border?: boolean };
const SWATCHES: Swatch[] = [
  { name: { en: "Pink / crimson", vi: "Hồng / crimson", zh: "粉 / 绯红" }, hex: "#E0095F", role: { en: "Primary. Tile background, node cores, all accents.", vi: "Màu chính. Nền ô, lõi node, mọi điểm nhấn.", zh: "主色。方块背景、节点内核、所有点缀。" } },
  { name: kept("Navy"), hex: "#242131", role: { en: "Ink & dark surfaces. Inverse tiles.", vi: "Mực chữ & bề mặt tối. Ô nền đảo màu.", zh: "墨色与深色表面。反转方块。" } },
  { name: { en: "White", vi: "Trắng", zh: "白" }, hex: "#FFFFFF", role: { en: "The K strokes & node rings. Paper.", vi: "Nét chữ K & vòng node. Nền giấy.", zh: "K 的笔画与节点圆环。纸面。" }, labelInk: true, border: true },
  { name: { en: "Teal (light)", vi: "Teal (nhạt)", zh: "Teal（浅）" }, hex: "#DDECEE", role: { en: "Secondary accent. Pills, badges — optional.", vi: "Nhấn phụ. Pill, badge — tuỳ chọn.", zh: "次要点缀。胶囊、徽章 — 可选。" }, labelInk: true },
];

type Contrast = { pairing: L<ReactNode>; ratio: string; verdict: L; ok: boolean };
const CONTRAST: Contrast[] = [
  { pairing: { en: <><span className="dot" style={{ background: "#e0095f" }} /> White on pink <code>#E0095F</code></>, vi: <><span className="dot" style={{ background: "#e0095f" }} /> Trắng trên hồng <code>#E0095F</code></>, zh: <><span className="dot" style={{ background: "#e0095f" }} /> 粉底白字 <code>#E0095F</code></> }, ratio: "4.8 : 1", verdict: { en: "✅ AA text — the master pairing", vi: "✅ Chữ AA — cặp chuẩn", zh: "✅ AA 正文 — 标准配色" }, ok: true },
  { pairing: { en: <><span className="dot" style={{ background: "#242131" }} /> Pink <code>#E0095F</code> on navy <code>#242131</code></>, vi: <><span className="dot" style={{ background: "#242131" }} /> Hồng <code>#E0095F</code> trên navy <code>#242131</code></>, zh: <><span className="dot" style={{ background: "#242131" }} /> 粉色 <code>#E0095F</code> 置于 navy <code>#242131</code></> }, ratio: "3.3 : 1", verdict: { en: "✅ AA large / UI icon — inverse", vi: "✅ AA cỡ lớn / icon UI — đảo màu", zh: "✅ AA 大字 / UI 图标 — 反转" }, ok: true },
  { pairing: { en: <><span className="dot" style={{ background: "#76b900" }} /> White on green <code>#76B900</code></>, vi: <><span className="dot" style={{ background: "#76b900" }} /> Trắng trên xanh lá <code>#76B900</code></>, zh: <><span className="dot" style={{ background: "#76b900" }} /> 绿底白字 <code>#76B900</code></> }, ratio: "2.4 : 1", verdict: { en: "✗ Fails — why the mark moved off green", vi: "✗ Không đạt — lý do biểu tượng bỏ màu xanh lá", zh: "✗ 不达标 — 标志弃用绿色的原因" }, ok: false },
];

type Face = { role: L; face: string; specimen: L<ReactNode>; glyphs: string; cls: string };
const monoSpec = <>component "api" {"{"}<br />&nbsp;&nbsp;icon: aws/lambda<br />{"}"}</>;
const FACES: Face[] = [
  { role: kept("Display"), face: "SF Pro Rounded → Inter fallback", cls: "specimen-display", specimen: { en: <>Diagram superpowers</>, vi: <>Diagram superpowers</>, zh: <>Diagram superpowers</> }, glyphs: "Aa Bb Cc · 0123456789 · weight 800" },
  { role: { en: "Body", vi: "Nội dung", zh: "正文" }, face: "Inter", cls: "specimen-body", specimen: { en: <>Prompt it. See it appear. Watch it animate. The renderer is deliberately dumb — you change the data, never the renderer.</>, vi: <>Sơ đồ as code: gõ văn bản, nhận về SVG động — bố cục tự động, định tuyến cạnh trực giao, hoạt hoạ bằng CSS.</>, zh: <>Prompt it. See it appear. Watch it animate. The renderer is deliberately dumb — you change the data, never the renderer.</> }, glyphs: "Aa Bb Cc · 0123456789 · 400 / 500 / 600 / 700" },
  { role: kept("Mono"), face: "JetBrains Mono", cls: "specimen-mono", specimen: { en: monoSpec, vi: monoSpec, zh: monoSpec }, glyphs: "Aa Bb Cc · 0123456789 · 400 / 600" },
];

type Token = { name: string; val: L; demo?: string; radius?: boolean };
const COLOUR_TOKENS: Token[] = [
  { name: "--accent", val: kept("#e0095f"), demo: "#e0095f" },
  { name: "--accent-deep", val: kept("#c70854"), demo: "#c70854" },
  { name: "--ink", val: kept("#242131"), demo: "#242131" },
  { name: "--dim", val: kept("#6e6a7c"), demo: "#6e6a7c" },
  { name: "--paper", val: kept("#fcfcfd"), demo: "#fcfcfd" },
  { name: "--bg-soft", val: kept("#f7f7fa"), demo: "#f7f7fa" },
  { name: "--border", val: kept("#e8e6ef"), demo: "#e8e6ef" },
  { name: "--teal", val: kept("#ddecee"), demo: "#ddecee" },
];
const SHAPE_TOKENS: Token[] = [
  { name: "--radius", val: kept("16px"), radius: true },
  { name: "--max", val: { en: "1240px (content width)", vi: "1240px (bề rộng nội dung)", zh: "1240px（内容宽度）" } },
  { name: "--pad", val: { en: "24px (gutter)", vi: "24px (lề)", zh: "24px（栏距）" } },
  { name: "--accent-soft", val: kept("rgba(224,9,95,.07)"), demo: "rgba(224,9,95,.07)" },
];

type Voice = { label: L; line: string; where: L };
const VOICE: Voice[] = [
  { label: { en: "Tagline — fixed", vi: "Tagline — cố định", zh: "Tagline — 固定" }, line: "Diagram superpowers", where: { en: "Banner / hero assets, landing strap, GitHub repo description, docs description.", vi: "Banner / hero, dòng strap ở landing, mô tả repo GitHub, mô tả trang docs.", zh: "Banner / hero 素材、landing 标语、GitHub 仓库描述、docs 描述。" } },
  { label: { en: "Slogan — one everywhere", vi: "Slogan — một cho tất cả", zh: "Slogan — 全局统一" }, line: "Prompt it. See it appear. Watch it animate.", where: { en: "Landing hero lead, root README, package-registry descriptions. Keep the three-beat rhythm.", vi: "Câu dẫn hero ở landing, README gốc, mô tả trên các registry. Giữ nhịp ba vế.", zh: "Landing hero 引导语、根 README、各 registry 描述。保持三段节奏。" } },
  { label: { en: "Eyebrow — category phrase", vi: "Eyebrow — cụm định danh", zh: "Eyebrow — 品类短语" }, line: "The diagram studio for coding agents", where: { en: "Landing hero eyebrow. A category phrase (tldraw / Linear pattern), not a keyword list.", vi: "Eyebrow hero ở landing. Một cụm định danh (kiểu tldraw / Linear), không phải danh sách từ khoá.", zh: "Landing hero eyebrow。一个品类短语（tldraw / Linear 风格），而非关键词列表。" } },
  { label: { en: "Positioning", vi: "Định vị", zh: "定位" }, line: "The diagram renderer for coding agents", where: { en: "Connect them over MCP; output is a self-contained, animated SVG file — not a canvas locked in a platform.", vi: "Kết nối qua MCP; đầu ra là một file SVG động, độc lập — không phải canvas bị khoá trong một nền tảng.", zh: "通过 MCP 连接；输出是一个自包含的动画 SVG 文件 — 而非锁定在某个平台里的画布。" } },
];

const DONTS: L<ReactNode>[] = [
  { en: <>set the white K on a bright / high-luminance background — see the contrast table.</>, vi: <>đặt chữ K trắng trên nền sáng / độ chói cao — xem bảng tương phản.</>, zh: <>把白色 K 放在明亮 / 高亮度背景上 — 参见对比度表。</> },
  { en: <>add a <code>&lt;text&gt;</code> element to the mark — keep the glyph as strokes so there's no font dependency.</>, vi: <>thêm phần tử <code>&lt;text&gt;</code> vào biểu tượng — giữ glyph ở dạng nét để không phụ thuộc font.</>, zh: <>给标志添加 <code>&lt;text&gt;</code> 元素 — 让字形保持为笔画，避免依赖字体。</> },
  { en: <>stretch the tile or change its corner radius — keep <code>rx</code> proportional (≈18%).</>, vi: <>kéo giãn ô nền hay đổi bo góc — giữ <code>rx</code> theo tỉ lệ (≈18%).</>, zh: <>拉伸方块或改变圆角 — 保持 <code>rx</code> 成比例（约 18%）。</> },
  { en: <>merge the tagline and slogan into one sentence — noun phrase + action line, kept distinct.</>, vi: <>gộp tagline và slogan thành một câu — cụm danh từ + dòng hành động, giữ tách biệt.</>, zh: <>把 tagline 和 slogan 合成一句 — 名词短语 + 行动句，保持分开。</> },
];

// ── UI strings ───────────────────────────────────────────────────
const T = {
  navSub: kept("/ design"),
  nav: {
    mark: { en: "Mark", vi: "Biểu tượng", zh: "标志" },
    colour: { en: "Colour", vi: "Màu sắc", zh: "颜色" },
    type: { en: "Type", vi: "Kiểu chữ", zh: "字体" },
    tokens: kept("Tokens"),
    voice: { en: "Voice", vi: "Giọng điệu", zh: "语调" },
  },
  hero: {
    eyebrow: { en: "Brand & Design System", vi: "Thương hiệu & Hệ thống thiết kế", zh: "品牌与设计系统" },
    sloganRest: {
      en: "This page is the single source of truth for the kymo mark, palette, type and voice — and it's built with the very tokens it documents.",
      vi: "Trang này là nguồn tham chiếu chính thức cho biểu tượng, bảng màu, kiểu chữ và giọng điệu của kymo — và được dựng bằng chính những token mà nó mô tả.",
      zh: "本页是 kymo 标志、调色板、字体与语调的唯一权威来源 — 并且由它所记录的那些 token 构建而成。",
    },
    download: { en: "Download the mark", vi: "Tải biểu tượng", zh: "下载标志" },
    guidelines: { en: "Brand guidelines", vi: "Hướng dẫn thương hiệu", zh: "品牌规范" },
  },
  mark: {
    num: kept("01 — Logo"),
    h2: { en: "The mark", vi: "Biểu tượng", zh: "标志" },
    desc: {
      en: "A K built from three round-capped strokes — stem, upper arm, lower leg — each junction carrying a node handle: a white ring with a pink core. The letter as a tiny node-and-edge graph, echoing exactly what kymo renders. No text element, no font dependency: the glyph is pure geometry, so it renders identically everywhere.",
      vi: "Chữ K dựng từ ba nét bo tròn đầu — thân, tay trên và chân dưới — mỗi điểm nối mang một node handle: vòng trắng với lõi hồng. Chữ cái như một đồ thị node-và-cạnh thu nhỏ, đúng như những gì kymo vẽ ra. Không có phần tử text, không phụ thuộc font: glyph là hình học thuần tuý nên hiển thị y hệt ở mọi nơi.",
      zh: "由三段圆头笔画构成的 K — 主干、上臂、下肢 — 每个连接点带一个节点手柄：白色圆环加粉色内核。字母如同一张微缩的节点-连线图，正是 kymo 所渲染的样子。没有文本元素、不依赖字体：字形是纯几何，因此在任何地方都渲染一致。",
    },
    notes: [
      { en: <><b>Pink tile</b> at <code>rx 18</code> (≈18% of a 100 side) — never stretch it; keep the corner radius proportional.</>, vi: <><b>Ô nền hồng</b> với <code>rx 18</code> (≈18% cạnh 100) — đừng kéo giãn; giữ bo góc theo tỉ lệ.</>, zh: <><b>粉色方块</b>，<code>rx 18</code>（约为 100 边长的 18%）— 切勿拉伸；保持圆角比例。</> },
      { en: <><b>White K</b> as three strokes at <code>stroke-width 11.5</code>, round caps.</>, vi: <><b>Chữ K trắng</b> gồm ba nét <code>stroke-width 11.5</code>, đầu bo tròn.</>, zh: <><b>白色 K</b> 由三段 <code>stroke-width 11.5</code> 的笔画组成，圆头。</> },
      { en: <><b>Six node handles</b> — white ring (r 5.8) over a pink core (r 2.44) — the connector dots of a diagram editor.</>, vi: <><b>Sáu node handle</b> — vòng trắng (r 5.8) trên lõi hồng (r 2.44) — chính là các điểm nối của trình vẽ sơ đồ.</>, zh: <><b>六个节点手柄</b> — 白色圆环（r 5.8）覆盖粉色内核（r 2.44）— 即图表编辑器的连接点。</> },
      { en: <>The <b>favicon is the master mark</b>: <code>favicon.svg</code> is identical to <code>logo.svg</code>. Use them interchangeably.</>, vi: <><b>Favicon chính là biểu tượng gốc</b>: <code>favicon.svg</code> giống hệt <code>logo.svg</code>. Dùng thay thế cho nhau được.</>, zh: <><b>favicon 就是主标志</b>：<code>favicon.svg</code> 与 <code>logo.svg</code> 完全相同，可互换使用。</> },
    ] as L<ReactNode>[],
    lightTitle: { en: "Wordmark lockup — light", vi: "Khối wordmark — nền sáng", zh: "字标组合 — 浅色" },
    darkTitle: { en: "Wordmark lockup — dark", vi: "Khối wordmark — nền tối", zh: "字标组合 — 深色" },
    lightDesc: { en: "Navy primary + pink accent, tagline outlined to paths. For light backgrounds.", vi: "Chữ chính navy + nhấn hồng, tagline đã outline thành path. Dùng cho nền sáng.", zh: "主色 navy + 粉色点缀，tagline 已转为路径。用于浅色背景。" },
    darkDesc: { en: "White primary + pink accent. For dark backgrounds and inverse surfaces.", vi: "Chữ chính trắng + nhấn hồng. Dùng cho nền tối và bề mặt đảo màu.", zh: "主色白 + 粉色点缀。用于深色背景与反转表面。" },
  },
  colour: {
    num: { en: "02 — Colour", vi: "02 — Màu sắc", zh: "02 — 颜色" },
    h2: { en: "The Mermaid palette", vi: "Bảng màu Mermaid", zh: "Mermaid 调色板" },
    desc: { en: "Sourced from Mermaid: signature pink, deep navy, a pale-teal accent. Pink is the constant; everything else supports it. Click a swatch to copy its hex.", vi: "Lấy từ Mermaid: hồng đặc trưng, navy đậm, nhấn teal nhạt. Hồng là hằng số; mọi màu khác bổ trợ cho nó. Bấm vào ô màu để chép mã hex.", zh: "取自 Mermaid：标志性的粉色、深 navy、淡 teal 点缀。粉色是恒量；其余皆为辅助。点击色块复制其 hex。" },
    copied: { en: "copied ✓", vi: "đã chép ✓", zh: "已复制 ✓" },
    tableTitle: { en: "Contrast — approved pairings (WCAG)", vi: "Tương phản — các cặp đạt chuẩn (WCAG)", zh: "对比度 — 通过的配色（WCAG）" },
    thPairing: { en: "Pairing", vi: "Cặp màu", zh: "配色" },
    thRatio: { en: "Ratio", vi: "Tỉ lệ", zh: "比值" },
    thVerdict: { en: "Verdict", vi: "Kết luận", zh: "结论" },
  },
  type: {
    num: { en: "03 — Typography", vi: "03 — Kiểu chữ", zh: "03 — 字体" },
    h2: { en: "Three faces", vi: "Ba kiểu chữ", zh: "三款字体" },
    desc: { en: "A rounded display face for headings and the brand, a neutral grotesque for body, and a mono for code and tokens.", vi: "Một kiểu display bo tròn cho tiêu đề và thương hiệu, một grotesque trung tính cho nội dung, và một kiểu mono cho code và token.", zh: "标题与品牌用圆润的 display 字体，正文用中性的 grotesque，代码与 token 用 mono。" },
  },
  tokens: {
    num: kept("04 — Tokens"),
    h2: { en: "Design tokens", vi: "Token thiết kế", zh: "设计 token" },
    desc: { en: "The CSS custom properties every kymo surface is built on — landing, docs, editor, icons and this page. Lifted verbatim from :root. Click a name to copy it.", vi: "Các CSS custom property mà mọi bề mặt kymo dựa trên — landing, docs, editor, icons và trang này. Lấy nguyên từ :root. Bấm vào tên để chép.", zh: "每个 kymo 界面所依赖的 CSS 自定义属性 — landing、docs、editor、icons 以及本页。原样取自 :root。点击名称即可复制。" },
    colourSurface: { en: "Colour & surface", vi: "Màu & bề mặt", zh: "颜色与表面" },
    shapeScale: { en: "Shape & scale", vi: "Hình & tỉ lệ", zh: "形状与尺度" },
    components: { en: "Components", vi: "Thành phần", zh: "组件" },
  },
  voice: {
    num: { en: "05 — Voice", vi: "05 — Giọng điệu", zh: "05 — 语调" },
    h2: { en: "Brand language", vi: "Ngôn ngữ thương hiệu", zh: "品牌语言" },
    desc: { en: "The fixed lines. The tagline lives inside the brand assets, so changing it means regenerating them — treat it as immutable. One slogan everywhere.", vi: "Những dòng cố định. Tagline nằm trong chính các tài nguyên thương hiệu, nên đổi nó nghĩa là phải tạo lại — hãy xem là bất biến. Một slogan ở mọi nơi.", zh: "那些固定的句子。tagline 内嵌于品牌素材中，更改它意味着重新生成 — 视其为不可变。一句 slogan，处处通用。" },
    oneLinerLabel: { en: "One-liner (listings)", vi: "Một dòng (cho listing)", zh: "一句话（用于 listing）" },
  },
  donts: {
    num: { en: "06 — Don'ts", vi: "06 — Tránh", zh: "06 — 禁忌" },
    h2: { en: "What not to do", vi: "Những điều không nên", zh: "不要这样做" },
    dont: { en: "Don't", vi: "Đừng", zh: "不要" },
  },
  footer: {
    copyright: { en: "Copyright © 2026 KymoStudio. Licensed under Apache-2.0.", vi: "Bản quyền © 2026 KymoStudio. Cấp phép theo Apache-2.0.", zh: "版权所有 © 2026 KymoStudio。依 Apache-2.0 许可。" },
    license: { en: "License", vi: "Giấy phép", zh: "许可证" },
    brandAssets: { en: "Brand assets", vi: "Tài nguyên thương hiệu", zh: "品牌素材" },
    selectLang: { en: "Select language", vi: "Chọn ngôn ngữ", zh: "选择语言" },
  },
  title: { en: "KymoStudio — Brand & Design System", vi: "KymoStudio — Thương hiệu & Hệ thống thiết kế", zh: "KymoStudio — 品牌与设计系统" },
};

// ── Click-to-copy hook ───────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (copied === null) return;
    const t = setTimeout(() => setCopied(null), 1100);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => setCopied(text)).catch(() => {});
  };
  return { copied, copy };
}

// ── Sections ─────────────────────────────────────────────────────
function Nav() {
  const { lang } = useLang();
  return (
    <nav>
      <div className="nav-inner">
        <a className="brand" href="/">
          <img src="/brand/logo.svg" alt="kymo logo" />
          KymoStudio <span className="sub">{T.navSub[lang]}</span>
        </a>
        <div className="nav-links">
          <span className="nav-anchors">
            <a href="#mark">{T.nav.mark[lang]}</a>
            <a href="#colour">{T.nav.colour[lang]}</a>
            <a href="#type">{T.nav.type[lang]}</a>
            <a href="#tokens">{T.nav.tokens[lang]}</a>
            <a href="#voice">{T.nav.voice[lang]}</a>
          </span>
          <a className="nav-ext" href="https://kymo.studio">kymo.studio&nbsp;↗</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const { lang } = useLang();
  return (
    <header className="hero wrap">
      <span className="eyebrow">{T.hero.eyebrow[lang]}</span>
      <div className="hero-wordmark">
        <img src="/brand/wordmark.svg" alt="KymoStudio — Diagram superpowers" />
      </div>
      <p className="tagline">Diagram superpowers.</p>
      <p className="slogan">Prompt it. See it appear. Watch it animate. {T.hero.sloganRest[lang]}</p>
      <div className="hero-cta">
        <a className="btn btn-primary" href="/brand/logo.svg" download>{T.hero.download[lang]}</a>
        <a className="btn btn-alt" href="#mark">{T.hero.guidelines[lang]}</a>
      </div>
    </header>
  );
}

function MarkSection() {
  const { lang } = useLang();
  return (
    <section id="mark" className="wrap">
      <div className="sec-head">
        <span className="sec-num">{T.mark.num[lang]}</span>
        <h2>{T.mark.h2[lang]}</h2>
        <p>{T.mark.desc[lang]}</p>
      </div>
      <div className="mark-row">
        <div className="mark-tile">
          <img src="/brand/logo.svg" alt="kymo logo — pink tile, white node-graph K" />
        </div>
        <div>
          <ul className="mark-notes">
            {T.mark.notes.map((n, i) => <li key={i}>{n[lang]}</li>)}
          </ul>
          <div className="mark-variants">
            <div className="mark-chip"><img src="/brand/logo.svg" alt="logo on light" /></div>
            <div className="mark-chip dark"><img src="/brand/logo.svg" alt="logo on navy" /></div>
            <a className="btn btn-alt" href="/brand/logo.svg" download style={{ alignSelf: "center" }}>logo.svg</a>
            <a className="btn btn-alt" href="/brand/favicon.svg" download style={{ alignSelf: "center" }}>favicon.svg</a>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{T.mark.lightTitle[lang]}</div>
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: 28, margin: "12px 0" }}>
            <img src="/brand/wordmark.svg" alt="KymoStudio wordmark, light" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
          <p style={{ color: "var(--dim)", fontSize: 14, margin: "0 0 14px" }}>{T.mark.lightDesc[lang]}</p>
          <a className="btn btn-alt" href="/brand/wordmark.svg" download>wordmark.svg</a>
        </div>
        <div className="card" style={{ background: "var(--ink)", borderColor: "var(--ink)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff" }}>{T.mark.darkTitle[lang]}</div>
          <div style={{ background: "#1b1926", borderRadius: 12, padding: 28, margin: "12px 0" }}>
            <img src="/brand/wordmark-dark.svg" alt="KymoStudio wordmark, dark" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
          <p style={{ color: "#b6b2c4", fontSize: 14, margin: "0 0 14px" }}>{T.mark.darkDesc[lang]}</p>
          <a className="btn btn-alt" href="/brand/wordmark-dark.svg" download style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.3)" }}>wordmark-dark.svg</a>
        </div>
      </div>
    </section>
  );
}

function ColourSection({ copied, copy }: { copied: string | null; copy: (t: string) => void }) {
  const { lang } = useLang();
  return (
    <section id="colour" className="wrap">
      <div className="sec-head">
        <span className="sec-num">{T.colour.num[lang]}</span>
        <h2>{T.colour.h2[lang]}</h2>
        <p>{T.colour.desc[lang]}</p>
      </div>
      <div className="grid grid-4">
        {SWATCHES.map((s) => (
          <button key={s.hex} className="swatch" onClick={() => copy(s.hex)} title={`Copy ${s.hex}`}>
            <div className="chip" style={{ background: s.hex, borderBottom: s.border ? "1px solid var(--border)" : undefined }}>
              <span className="chip-label" style={{ color: s.labelInk ? "#6e6a7c" : "#fff" }}>
                {copied === s.hex ? T.colour.copied[lang] : s.hex}
              </span>
            </div>
            <div className="meta">
              <div className="name">{s.name[lang]}</div>
              <div className="hex">{s.hex}</div>
              <div className="role">{s.role[lang]}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>{T.colour.tableTitle[lang]}</div>
        <table className="spec">
          <thead><tr><th>{T.colour.thPairing[lang]}</th><th>{T.colour.thRatio[lang]}</th><th>{T.colour.thVerdict[lang]}</th></tr></thead>
          <tbody>
            {CONTRAST.map((c, i) => (
              <tr key={i}>
                <td>{c.pairing[lang]}</td>
                <td>{c.ratio}</td>
                <td className={c.ok ? "verdict-ok" : "verdict-no"}>{c.verdict[lang]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TypeSection() {
  const { lang } = useLang();
  return (
    <section id="type" className="wrap">
      <div className="sec-head">
        <span className="sec-num">{T.type.num[lang]}</span>
        <h2>{T.type.h2[lang]}</h2>
        <p>{T.type.desc[lang]}</p>
      </div>
      <div className="grid grid-3">
        {FACES.map((f) => (
          <div key={f.face} className="card type-card">
            <div className="role">{f.role[lang]}</div>
            <div className="face">{f.face}</div>
            <div className={f.cls}>{f.specimen[lang]}</div>
            <div className="glyphs">{f.glyphs}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TokenRow({ t, copied, copy }: { t: Token; copied: string | null; copy: (s: string) => void }) {
  const { lang } = useLang();
  const demo = t.demo ?? (t.radius ? "var(--bg-raise)" : undefined);
  return (
    <button className="token-row" onClick={() => copy(t.name)} title={`Copy ${t.name}`}>
      <span className="token-name">{copied === t.name ? `${t.name} ✓` : t.name}</span>
      <span className="token-val">{t.val[lang]}</span>
      {demo && <span className="token-demo" style={{ background: demo, borderRadius: t.radius ? 16 : undefined }} />}
    </button>
  );
}

function TokensSection({ copied, copy }: { copied: string | null; copy: (s: string) => void }) {
  const { lang } = useLang();
  return (
    <section id="tokens" className="wrap">
      <div className="sec-head">
        <span className="sec-num">{T.tokens.num[lang]}</span>
        <h2>{T.tokens.h2[lang]}</h2>
        <p>{T.tokens.desc[lang]}</p>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{T.tokens.colourSurface[lang]}</div>
          {COLOUR_TOKENS.map((t) => <TokenRow key={t.name} t={t} copied={copied} copy={copy} />)}
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{T.tokens.shapeScale[lang]}</div>
          {SHAPE_TOKENS.map((t) => <TokenRow key={t.name} t={t} copied={copied} copy={copy} />)}
          <div style={{ fontWeight: 700, margin: "20px 0 8px" }}>{T.tokens.components[lang]}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a className="btn btn-primary" href="#tokens">Primary</a>
            <a className="btn btn-alt" href="#tokens">Alt</a>
            <span className="eyebrow" style={{ margin: 0 }}>Eyebrow pill</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function VoiceSection() {
  const { lang } = useLang();
  return (
    <section id="voice" className="wrap">
      <div className="sec-head">
        <span className="sec-num">{T.voice.num[lang]}</span>
        <h2>{T.voice.h2[lang]}</h2>
        <p>{T.voice.desc[lang]}</p>
      </div>
      <div className="grid grid-2">
        {VOICE.map((v) => (
          <div key={v.line} className="card voice-card">
            <div className="label">{v.label[lang]}</div>
            <div className="line">{v.line}</div>
            <div className="where">{v.where[lang]}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="voice-card-label">{T.voice.oneLinerLabel[lang]}</div>
        <div style={{ fontSize: 16 }}>
          Generate animated SVG diagrams from text — or from coding agents over MCP. Diagram-as-code with PNG, WebP,
          Figma &amp; Excalidraw export.
        </div>
      </div>
    </section>
  );
}

function DontsSection() {
  const { lang } = useLang();
  const mid = Math.ceil(DONTS.length / 2);
  const cols = [DONTS.slice(0, mid), DONTS.slice(mid)];
  return (
    <section id="donts" className="wrap">
      <div className="sec-head">
        <span className="sec-num">{T.donts.num[lang]}</span>
        <h2>{T.donts.h2[lang]}</h2>
      </div>
      <div className="grid grid-2">
        {cols.map((col, i) => (
          <div key={i}>
            {col.map((d, j) => (
              <div key={j} className="dont"><b>{T.donts.dont[lang]}</b> <span>{d[lang]}</span></div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Global footer directory (Apple-HIG-style) ────────────────────
type FLink = [label: L, href: string];
type FSection = { title: L; links: FLink[] };
const FOOTER_DIRECTORY: FSection[][] = [
  [
    { title: kept("kymo.studio"), links: [
      [{ en: "Home", vi: "Trang chủ", zh: "首页" }, "https://kymo.studio"],
      [{ en: "Documentation", vi: "Tài liệu", zh: "文档" }, "https://docs.kymo.studio"],
      [kept("Editor"), "https://editor.kymo.studio"],
      [kept("Icons"), "https://icons.kymo.studio"],
      [{ en: "Design system", vi: "Hệ thống thiết kế", zh: "设计系统" }, "/"],
    ] },
    { title: { en: "Design system", vi: "Hệ thống thiết kế", zh: "设计系统" }, links: [
      [{ en: "The mark", vi: "Biểu tượng", zh: "标志" }, "#mark"],
      [{ en: "Colour", vi: "Màu sắc", zh: "颜色" }, "#colour"],
      [{ en: "Typography", vi: "Kiểu chữ", zh: "字体" }, "#type"],
      [{ en: "Design tokens", vi: "Token thiết kế", zh: "设计 token" }, "#tokens"],
      [{ en: "Voice", vi: "Giọng điệu", zh: "语调" }, "#voice"],
      [{ en: "Don'ts", vi: "Tránh", zh: "禁忌" }, "#donts"],
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
    { title: { en: "Outputs", vi: "Đầu ra", zh: "输出" }, links: [
      [kept("Animated SVG"), "https://docs.kymo.studio"],
      [kept("WebP"), "https://docs.kymo.studio"],
      [kept("PNG"), "https://docs.kymo.studio"],
      [kept("Figma"), "https://docs.kymo.studio"],
      [kept("Excalidraw"), "https://docs.kymo.studio"],
    ] },
    { title: { en: "Resources", vi: "Tài nguyên", zh: "资源" }, links: [
      [{ en: "Documentation", vi: "Tài liệu", zh: "文档" }, "https://docs.kymo.studio"],
      [{ en: "Samples", vi: "Mẫu", zh: "示例" }, "https://github.com/kymostudio/kymostudio/tree/main/samples"],
      [kept("DSL spec"), "https://github.com/kymostudio/kymostudio/blob/main/docs/DSL.md"],
      [kept("Changelog"), "https://github.com/kymostudio/kymostudio/blob/main/CHANGELOG.md"],
    ] },
  ],
  [
    { title: { en: "Install", vi: "Cài đặt", zh: "安装" }, links: [
      [kept("PyPI · kymostudio"), "https://pypi.org/project/kymostudio/"],
      [kept("npm · kymostudio"), "https://www.npmjs.com/package/kymostudio"],
      [kept("crates.io · core"), "https://crates.io/crates/kymostudio-core"],
      [kept("VS Code Marketplace"), "https://marketplace.visualstudio.com/search?term=kymostudio&target=VSCode"],
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
              <a href="https://github.com/kymostudio/kymostudio/blob/main/LICENSE">{T.footer.license[lang]}</a>
              <a href="https://github.com/kymostudio/kymostudio/tree/main/docs/brand">{T.footer.brandAssets[lang]}</a>
              <a href="https://github.com/kymostudio/kymostudio">GitHub</a>
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

export function App() {
  const { copied, copy } = useCopy();
  const [lang, setLangState] = useState<Lang>("en");

  // restore saved choice on mount
  useEffect(() => {
    const saved = localStorage.getItem("kymo-lang");
    if (saved && (LANGS as string[]).includes(saved)) setLangState(saved as Lang);
  }, []);

  // persist + reflect on <html lang> and the document title
  useEffect(() => {
    localStorage.setItem("kymo-lang", lang);
    document.documentElement.lang = lang;
    document.title = T.title[lang];
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang: setLangState }}>
      <Nav />
      <Hero />
      <MarkSection />
      <ColourSection copied={copied} copy={copy} />
      <TypeSection />
      <TokensSection copied={copied} copy={copy} />
      <VoiceSection />
      <DontsSection />
      <Footer />
    </LangContext.Provider>
  );
}
