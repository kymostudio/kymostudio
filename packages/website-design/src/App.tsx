import { useEffect, useState, type ReactNode } from "react";

/* ════════════════════════════════════════════════════════════════
   design.kymo.studio — the kymo brand & design system, as a React app.
   Content is canonical in docs/brand/README.md; tokens mirror
   packages/website/src/styles.css. This page dogfoods those tokens.
   ════════════════════════════════════════════════════════════════ */

// ── Data ─────────────────────────────────────────────────────────
type Swatch = { name: string; hex: string; role: string; labelInk?: boolean; border?: boolean };
const SWATCHES: Swatch[] = [
  { name: "Pink / crimson", hex: "#E0095F", role: "Primary. Tile background, node cores, all accents." },
  { name: "Navy", hex: "#242131", role: "Ink & dark surfaces. Inverse tiles." },
  { name: "White", hex: "#FFFFFF", role: "The K strokes & node rings. Paper.", labelInk: true, border: true },
  { name: "Teal (light)", hex: "#DDECEE", role: "Secondary accent. Pills, badges — optional.", labelInk: true },
];

type Contrast = { pairing: ReactNode; ratio: string; verdict: string; ok: boolean };
const CONTRAST: Contrast[] = [
  { pairing: <><span className="dot" style={{ background: "#e0095f" }} /> White on pink <code>#E0095F</code></>, ratio: "4.8 : 1", verdict: "✅ AA text — the master pairing", ok: true },
  { pairing: <><span className="dot" style={{ background: "#242131" }} /> Pink <code>#E0095F</code> on navy <code>#242131</code></>, ratio: "3.3 : 1", verdict: "✅ AA large / UI icon — inverse", ok: true },
  { pairing: <><span className="dot" style={{ background: "#76b900" }} /> White on green <code>#76B900</code></>, ratio: "2.4 : 1", verdict: "✗ Fails — why the mark moved off green", ok: false },
];

type Face = { role: string; face: string; specimen: ReactNode; glyphs: string; cls: string };
const FACES: Face[] = [
  { role: "Display", face: "SF Pro Rounded → Inter fallback", cls: "specimen-display", specimen: <>Diagram superpowers</>, glyphs: "Aa Bb Cc · 0123456789 · weight 800" },
  { role: "Body", face: "Inter", cls: "specimen-body", specimen: <>Prompt it. See it appear. Watch it animate. The renderer is deliberately dumb — you change the data, never the renderer.</>, glyphs: "Aa Bb Cc · 0123456789 · 400 / 500 / 600 / 700" },
  { role: "Mono", face: "JetBrains Mono", cls: "specimen-mono", specimen: <>component "api" {"{"}<br />&nbsp;&nbsp;icon: aws/lambda<br />{"}"}</>, glyphs: "Aa Bb Cc · 0123456789 · 400 / 600" },
];

type Token = { name: string; val: string; demo?: string; radius?: boolean };
const COLOUR_TOKENS: Token[] = [
  { name: "--accent", val: "#e0095f", demo: "#e0095f" },
  { name: "--accent-deep", val: "#c70854", demo: "#c70854" },
  { name: "--ink", val: "#242131", demo: "#242131" },
  { name: "--dim", val: "#6e6a7c", demo: "#6e6a7c" },
  { name: "--paper", val: "#fcfcfd", demo: "#fcfcfd" },
  { name: "--bg-soft", val: "#f7f7fa", demo: "#f7f7fa" },
  { name: "--border", val: "#e8e6ef", demo: "#e8e6ef" },
  { name: "--teal", val: "#ddecee", demo: "#ddecee" },
];
const SHAPE_TOKENS: Token[] = [
  { name: "--radius", val: "16px", radius: true },
  { name: "--max", val: "1240px (content width)" },
  { name: "--pad", val: "24px (gutter)" },
  { name: "--accent-soft", val: "rgba(224,9,95,.07)", demo: "rgba(224,9,95,.07)" },
];

type Voice = { label: string; line: string; where: string };
const VOICE: Voice[] = [
  { label: "Tagline — fixed", line: "Diagram superpowers", where: "Banner / hero assets, landing strap, GitHub repo description, docs description." },
  { label: "Slogan — one everywhere", line: "Prompt it. See it appear. Watch it animate.", where: "Landing hero lead, root README, package-registry descriptions. Keep the three-beat rhythm." },
  { label: "Eyebrow — category phrase", line: "The diagram studio for coding agents", where: "Landing hero eyebrow. A category phrase (tldraw / Linear pattern), not a keyword list." },
  { label: "Positioning", line: "The diagram renderer for coding agents", where: "Connect them over MCP; output is a self-contained, animated SVG file — not a canvas locked in a platform." },
];

const DONTS: ReactNode[] = [
  <>set the white K on a bright / high-luminance background — see the contrast table.</>,
  <>add a <code>&lt;text&gt;</code> element to the mark — keep the glyph as strokes so there's no font dependency.</>,
  <>stretch the tile or change its corner radius — keep <code>rx</code> proportional (≈18%).</>,
  <>merge the tagline and slogan into one sentence — noun phrase + action line, kept distinct.</>,
];

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
  return (
    <nav>
      <div className="nav-inner">
        <a className="brand" href="/">
          <img src="/brand/logo.svg" alt="kymo logo" />
          KymoStudio <span className="sub">/ design</span>
        </a>
        <div className="nav-links">
          <span className="nav-anchors">
            <a href="#mark">Mark</a>
            <a href="#colour">Colour</a>
            <a href="#type">Type</a>
            <a href="#tokens">Tokens</a>
            <a href="#voice">Voice</a>
          </span>
          <a className="nav-ext" href="https://kymo.studio">kymo.studio&nbsp;↗</a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <header className="hero wrap">
      <span className="eyebrow">Brand &amp; Design System</span>
      <div className="hero-wordmark">
        <img src="/brand/wordmark.svg" alt="KymoStudio — Diagram superpowers" />
      </div>
      <p className="tagline">Diagram superpowers.</p>
      <p className="slogan">
        Prompt it. See it appear. Watch it animate. This page is the single source of truth for the kymo mark,
        palette, type and voice — and it's built with the very tokens it documents.
      </p>
      <div className="hero-cta">
        <a className="btn btn-primary" href="/brand/logo.svg" download>Download the mark</a>
        <a className="btn btn-alt" href="#mark">Brand guidelines</a>
      </div>
    </header>
  );
}

function MarkSection() {
  return (
    <section id="mark" className="wrap">
      <div className="sec-head">
        <span className="sec-num">01 — Logo</span>
        <h2>The mark</h2>
        <p>
          A <b>K</b> built from three round-capped strokes — stem, upper arm, lower leg — each junction carrying a
          node handle: a white ring with a pink core. The letter as a tiny node-and-edge graph, echoing exactly what
          kymo renders. No text element, no font dependency: the glyph is pure geometry, so it renders identically
          everywhere.
        </p>
      </div>
      <div className="mark-row">
        <div className="mark-tile">
          <img src="/brand/logo.svg" alt="kymo logo — pink tile, white node-graph K" />
        </div>
        <div>
          <ul className="mark-notes">
            <li><b>Pink tile</b> at <code>rx 18</code> (≈18% of a 100 side) — never stretch it; keep the corner radius proportional.</li>
            <li><b>White K</b> as three strokes at <code>stroke-width 11.5</code>, round caps.</li>
            <li><b>Six node handles</b> — white ring (r 5.8) over a pink core (r 2.44) — the connector dots of a diagram editor.</li>
            <li>The <b>favicon is the master mark</b>: <code>favicon.svg</code> is identical to <code>logo.svg</code>. Use them interchangeably.</li>
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
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Wordmark lockup — light</div>
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: 28, margin: "12px 0" }}>
            <img src="/brand/wordmark.svg" alt="KymoStudio wordmark, light" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
          <p style={{ color: "var(--dim)", fontSize: 14, margin: "0 0 14px" }}>Navy primary + pink accent, tagline outlined to paths. For light backgrounds.</p>
          <a className="btn btn-alt" href="/brand/wordmark.svg" download>wordmark.svg</a>
        </div>
        <div className="card" style={{ background: "var(--ink)", borderColor: "var(--ink)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff" }}>Wordmark lockup — dark</div>
          <div style={{ background: "#1b1926", borderRadius: 12, padding: 28, margin: "12px 0" }}>
            <img src="/brand/wordmark-dark.svg" alt="KymoStudio wordmark, dark" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
          <p style={{ color: "#b6b2c4", fontSize: 14, margin: "0 0 14px" }}>White primary + pink accent. For dark backgrounds and inverse surfaces.</p>
          <a className="btn btn-alt" href="/brand/wordmark-dark.svg" download style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.3)" }}>wordmark-dark.svg</a>
        </div>
      </div>
    </section>
  );
}

function ColourSection({ copied, copy }: { copied: string | null; copy: (t: string) => void }) {
  return (
    <section id="colour" className="wrap">
      <div className="sec-head">
        <span className="sec-num">02 — Colour</span>
        <h2>The Mermaid palette</h2>
        <p>Sourced from Mermaid: signature pink, deep navy, a pale-teal accent. Pink is the constant; everything else supports it. Click a swatch to copy its hex.</p>
      </div>
      <div className="grid grid-4">
        {SWATCHES.map((s) => (
          <button key={s.hex} className="swatch" onClick={() => copy(s.hex)} title={`Copy ${s.hex}`}>
            <div className="chip" style={{ background: s.hex, borderBottom: s.border ? "1px solid var(--border)" : undefined }}>
              <span className="chip-label" style={{ color: s.labelInk ? "#6e6a7c" : "#fff" }}>
                {copied === s.hex ? "copied ✓" : s.hex}
              </span>
            </div>
            <div className="meta">
              <div className="name">{s.name}</div>
              <div className="hex">{s.hex}</div>
              <div className="role">{s.role}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>Contrast — approved pairings (WCAG)</div>
        <table className="spec">
          <thead><tr><th>Pairing</th><th>Ratio</th><th>Verdict</th></tr></thead>
          <tbody>
            {CONTRAST.map((c, i) => (
              <tr key={i}>
                <td>{c.pairing}</td>
                <td>{c.ratio}</td>
                <td className={c.ok ? "verdict-ok" : "verdict-no"}>{c.verdict}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TypeSection() {
  return (
    <section id="type" className="wrap">
      <div className="sec-head">
        <span className="sec-num">03 — Typography</span>
        <h2>Three faces</h2>
        <p>A rounded display face for headings and the brand, a neutral grotesque for body, and a mono for code and tokens.</p>
      </div>
      <div className="grid grid-3">
        {FACES.map((f) => (
          <div key={f.role} className="card type-card">
            <div className="role">{f.role}</div>
            <div className="face">{f.face}</div>
            <div className={f.cls}>{f.specimen}</div>
            <div className="glyphs">{f.glyphs}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TokenRow({ t, copied, copy }: { t: Token; copied: string | null; copy: (s: string) => void }) {
  const demo = t.demo ?? (t.radius ? "var(--bg-raise)" : undefined);
  return (
    <button className="token-row" onClick={() => copy(t.name)} title={`Copy ${t.name}`}>
      <span className="token-name">{copied === t.name ? `${t.name} ✓` : t.name}</span>
      <span className="token-val">{t.val}</span>
      {demo && <span className="token-demo" style={{ background: demo, borderRadius: t.radius ? 16 : undefined }} />}
    </button>
  );
}

function TokensSection({ copied, copy }: { copied: string | null; copy: (s: string) => void }) {
  return (
    <section id="tokens" className="wrap">
      <div className="sec-head">
        <span className="sec-num">04 — Tokens</span>
        <h2>Design tokens</h2>
        <p>The CSS custom properties every kymo surface is built on — landing, docs, editor, icons and this page. Lifted verbatim from <code>:root</code>. Click a name to copy it.</p>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Colour &amp; surface</div>
          {COLOUR_TOKENS.map((t) => <TokenRow key={t.name} t={t} copied={copied} copy={copy} />)}
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Shape &amp; scale</div>
          {SHAPE_TOKENS.map((t) => <TokenRow key={t.name} t={t} copied={copied} copy={copy} />)}
          <div style={{ fontWeight: 700, margin: "20px 0 8px" }}>Components</div>
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
  return (
    <section id="voice" className="wrap">
      <div className="sec-head">
        <span className="sec-num">05 — Voice</span>
        <h2>Brand language</h2>
        <p>The fixed lines. The tagline lives inside the brand assets, so changing it means regenerating them — treat it as immutable. One slogan everywhere.</p>
      </div>
      <div className="grid grid-2">
        {VOICE.map((v) => (
          <div key={v.label} className="card voice-card">
            <div className="label">{v.label}</div>
            <div className="line">{v.line}</div>
            <div className="where">{v.where}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="voice-card-label">One-liner (listings)</div>
        <div style={{ fontSize: 16 }}>
          Generate animated SVG diagrams from text — or from coding agents over MCP. Diagram-as-code with PNG, WebP,
          Figma &amp; Excalidraw export.
        </div>
      </div>
    </section>
  );
}

function DontsSection() {
  const mid = Math.ceil(DONTS.length / 2);
  const cols = [DONTS.slice(0, mid), DONTS.slice(mid)];
  return (
    <section id="donts" className="wrap">
      <div className="sec-head">
        <span className="sec-num">06 — Don'ts</span>
        <h2>What not to do</h2>
      </div>
      <div className="grid grid-2">
        {cols.map((col, i) => (
          <div key={i}>
            {col.map((d, j) => (
              <div key={j} className="dont"><b>Don't</b> <span>{d}</span></div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Global footer directory (Apple-HIG-style) ────────────────────
type FLink = [label: string, href: string];
type FSection = { title: string; links: FLink[] };
const FOOTER_DIRECTORY: FSection[][] = [
  [
    { title: "kymo.studio", links: [
      ["Home", "https://kymo.studio"],
      ["Documentation", "https://docs.kymo.studio"],
      ["Editor", "https://editor.kymo.studio"],
      ["Icons", "https://icons.kymo.studio"],
      ["Design system", "/"],
    ] },
    { title: "Design system", links: [
      ["The mark", "#mark"],
      ["Colour", "#colour"],
      ["Typography", "#type"],
      ["Design tokens", "#tokens"],
      ["Voice", "#voice"],
      ["Don'ts", "#donts"],
    ] },
  ],
  [
    { title: "Diagram types", links: [
      ["Flowchart", "https://docs.kymo.studio/diagrams/flowchart"],
      ["Architecture", "https://docs.kymo.studio/diagrams/architecture"],
      ["Sequence", "https://docs.kymo.studio/diagrams/sequence"],
      ["Class", "https://docs.kymo.studio/diagrams/class"],
      ["State", "https://docs.kymo.studio/diagrams/state"],
      ["Entity-Relationship", "https://docs.kymo.studio/diagrams/entity-relationship"],
      ["Block", "https://docs.kymo.studio/diagrams/block"],
      ["Mindmap", "https://docs.kymo.studio/diagrams/mindmap"],
      ["Kanban", "https://docs.kymo.studio/diagrams/kanban"],
      ["Quadrant", "https://docs.kymo.studio/diagrams/quadrant"],
      ["Requirement", "https://docs.kymo.studio/diagrams/requirement"],
      ["BPMN", "https://docs.kymo.studio/diagrams/bpmn"],
    ] },
  ],
  [
    { title: "Outputs", links: [
      ["Animated SVG", "https://docs.kymo.studio"],
      ["WebP", "https://docs.kymo.studio"],
      ["PNG", "https://docs.kymo.studio"],
      ["Figma", "https://docs.kymo.studio"],
      ["Excalidraw", "https://docs.kymo.studio"],
    ] },
    { title: "Resources", links: [
      ["Documentation", "https://docs.kymo.studio"],
      ["Samples", "https://github.com/kymostudio/kymostudio/tree/main/samples"],
      ["DSL spec", "https://github.com/kymostudio/kymostudio/blob/main/docs/DSL.md"],
      ["Changelog", "https://github.com/kymostudio/kymostudio/blob/main/CHANGELOG.md"],
    ] },
  ],
  [
    { title: "Install", links: [
      ["PyPI · kymostudio", "https://pypi.org/project/kymostudio/"],
      ["npm · kymostudio", "https://www.npmjs.com/package/kymostudio"],
      ["crates.io · core", "https://crates.io/crates/kymostudio-core"],
      ["VS Code Marketplace", "https://marketplace.visualstudio.com/search?term=kymostudio&target=VSCode"],
    ] },
    { title: "Developers", links: [
      ["GitHub", "https://github.com/kymostudio/kymostudio"],
      ["Issues", "https://github.com/kymostudio/kymostudio/issues"],
      ["Discussions", "https://github.com/kymostudio/kymostudio/discussions"],
      ["Connect over MCP", "https://kymo.studio/#mcp"],
    ] },
  ],
];

function Footer() {
  return (
    <footer id="globalfooter" role="contentinfo">
      <div className="footer-inner">
        <nav className="footer-breadcrumb" aria-label="Breadcrumb">
          <a className="footer-home" href="https://kymo.studio">
            <img src="/brand/logo.svg" alt="" /> KymoStudio
          </a>
          <span className="footer-crumbs">
            <span className="sep" aria-hidden="true">›</span>
            <a href="https://kymo.studio">kymo.studio</a>
            <span className="sep" aria-hidden="true">›</span>
            <a href="/">Design system</a>
          </span>
        </nav>

        <div className="footer-directory">
          {FOOTER_DIRECTORY.map((col, i) => (
            <div className="footer-col" key={i}>
              {col.map((sec) => (
                <div className="footer-sec" key={sec.title}>
                  <h3>{sec.title}</h3>
                  <ul>
                    {sec.links.map(([label, href]) => (
                      <li key={label}><a href={href}>{label}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="footer-legal">
          <div className="footer-feedback">
            Found an issue with these guidelines? <a href="https://github.com/kymostudio/kymostudio/issues/new">Open an issue on GitHub</a>. The canonical source is <code>docs/brand</code>.
          </div>
          <div className="footer-mini">
            <div className="footer-copyright">Copyright © 2026 KymoStudio. Licensed under Apache-2.0.</div>
            <div className="footer-legal-links">
              <a href="https://github.com/kymostudio/kymostudio/blob/main/LICENSE">License</a>
              <a href="https://github.com/kymostudio/kymostudio/tree/main/docs/brand">Brand assets</a>
              <a href="https://github.com/kymostudio/kymostudio">GitHub</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function App() {
  const { copied, copy } = useCopy();
  return (
    <>
      <Nav />
      <Hero />
      <MarkSection />
      <ColourSection copied={copied} copy={copy} />
      <TypeSection />
      <TokensSection copied={copied} copy={copy} />
      <VoiceSection />
      <DontsSection />
      <Footer />
    </>
  );
}
