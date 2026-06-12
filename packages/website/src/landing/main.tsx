import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const RAW = "https://raw.githubusercontent.com/kymostudio/kymostudio/main/samples";
const GH = "https://github.com/kymostudio/kymostudio";

type Feature = { title: string; desc: string };
const FEATURES: Feature[] = [
  { title: "Diagrams as code", desc: "Describe your diagram in a clean, line-oriented .kymo syntax — no dragging boxes around." },
  { title: "Animated by default", desc: "Edges come alive with built-in flowing animation, straight to a self-contained SVG." },
  { title: "Write once, export anywhere", desc: "One source compiles to SVG, PNG, WebP, Figma and Excalidraw — and imports BPMN 2.0." },
];

type Sample = { title: string; desc: string; file: string; preview: string; size: string };
const SAMPLES: Sample[] = [
  {
    title: "NVIDIA AIQ — Autonomous Deep Researcher",
    desc: "Multi-region architecture: routing chain, sub-agents, RAG pipeline, shared file system, and three loop-back rails.",
    file: "aiq.kymo",
    preview: `${RAW}/nvidia-aiq-animated.svg`,
    size: "1367 × 759",
  },
  {
    title: "AWS — Lex chatbot + Bedrock RAG",
    desc: "Lex chatbot meeting Bedrock RAG inside us-east-1, with numbered step badges and dashed async fan-out to DynamoDB / Kendra.",
    file: "aws_1.kymo",
    preview: `${RAW}/aws-1-animated.svg`,
    size: "1280 × 680",
  },
  {
    title: "NIM container architecture",
    desc: "Tutorial 01: code-server IDE → NVIDIA Brev (GPU pod) → NVIDIA Cloud, grid layout with cross-region row alignment.",
    file: "data.kymo",
    preview: `${RAW}/data-animated.svg`,
    size: "1080 × 658",
  },
];

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
  const [sourceHtml, setSourceHtml] = useState('<span class="tok-comment"># Loading…</span>');
  useEffect(() => {
    let stop = false;
    setSourceHtml('<span class="tok-comment"># Loading…</span>');
    (async () => {
      try {
        const res = await fetch(`${RAW}/${sample.file}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const text = await res.text();
        if (!stop) setSourceHtml(highlightDsl(text));
      } catch {
        if (!stop) setSourceHtml(escapeHtml("(failed to load source — open on GitHub instead)"));
      }
    })();
    return () => { stop = true; };
  }, [sample]);
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
            <a className="modal-gh" href={`${GH}/blob/main/samples/${sample.file}`} target="_blank" rel="noopener">View on GitHub ↗</a>
            <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
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
    <a className="nav-gh" href={GH} aria-label="Star kymostudio on GitHub">
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

function KindsRow({ items, reverse }: { items: typeof KINDS; reverse?: boolean }) {
  return (
    <div className={reverse ? "kinds-marquee reverse" : "kinds-marquee"}>
      <div className="kinds-track">
        {[...items, ...items].map((k, i) => (
          <a
            className="kind"
            key={`${k.name}-${i}`}
            href={k.href}
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
  // three rows, each blending two thirds of the catalogue: A+B / B+C / C+A —
  // long enough that the marquee's duplicate copy stays off-screen
  const third = Math.ceil(KINDS.length / 3);
  const A = KINDS.slice(0, third);
  const B = KINDS.slice(third, third * 2);
  const C = KINDS.slice(third * 2);
  return (
    <section className="kinds" aria-label="Supported diagram types">
      <p className="kinds-head">
        <strong>Every diagram, one studio</strong> — from architecture to BPMN, your agent picks the right kind.
      </p>
      <KindsRow items={[...A, ...B]} />
      <KindsRow items={[...B, ...C]} reverse />
      <KindsRow items={[...C, ...A]} />
    </section>
  );
}

const MCP_SNIPPETS = [
  { key: "claude", label: "Claude Code", code: `claude mcp add --transport sse kymo \\\n  https://mcp.kymo.studio/sse` },
  { key: "any", label: "Any MCP client", code: `{ "mcpServers": {\n    "kymo": { "url": "https://mcp.kymo.studio/mcp" }\n} }` },
];

function McpTerminal() {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const text = MCP_SNIPPETS[tab].code;
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
      <div className="mcp-term">
        <div className="mcp-term-bar">
          <span className="mcp-term-dots" aria-hidden="true"><i /><i /><i /></span>
          <div className="mcp-tabs" role="tablist" aria-label="Connect snippet">
            {MCP_SNIPPETS.map((s, i) => (
              <button key={s.key} role="tab" aria-selected={i === tab} className={i === tab ? "mcp-tab active" : "mcp-tab"} onClick={() => { setTab(i); setCopied(false); }}>
                {s.label}
              </button>
            ))}
          </div>
          <button className="mcp-copy-btn" onClick={copy} aria-live="polite">{copied ? "Copied ✓" : "Copy"}</button>
        </div>
        <pre><code>{MCP_SNIPPETS[tab].code}</code></pre>
      </div>
      <p className="mcp-note">Sign in with Google on first connect — diagrams open live in the editor.</p>
    </div>
  );
}

function App() {
  const [selected, setSelected] = useState<Sample | null>(null);
  return (
    <>
      <nav>
        <div className="nav-inner">
          <div className="brand"><img src="./logo.svg" alt="" />KymoStudio</div>
          <div className="nav-right">
            <GitHubStars />
            <a className="btn btn-primary btn-sm" href="https://editor.kymo.studio">Start free</a>
          </div>
        </div>
      </nav>

      <header className="hero hero-split">
        {/* the product's signature: an orthogonal edge with flowing-dash animation */}
        <svg className="hero-edge" viewBox="0 0 1240 480" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <path className="edge-path" d="M 96 462 H 596 Q 612 462 612 446 V 156 Q 612 140 628 140 H 1056" />
          <g className="edge-node">
            <circle cx="96" cy="462" r="7" />
            <circle className="core" cx="96" cy="462" r="2.8" />
          </g>
          <g className="edge-node">
            <circle cx="1056" cy="140" r="7" />
            <circle className="core" cx="1056" cy="140" r="2.8" />
          </g>
        </svg>
        <div className="hero-text">
          <p className="eyebrow"><span className="eyebrow-dot" />The diagram studio for coding agents</p>
          <h1>
            <span className="name">KymoStudio</span><br />
            <span className="strap">Diagram <em>superpowers</em></span>
          </h1>
          <p className="lead">Prompt it. See it appear. Watch it animate.</p>
          <div className="ctas">
            <a className="btn btn-primary btn-pill" href="https://docs.kymo.studio/guide/getting-started">Getting Started</a>
            <a className="btn btn-alt btn-pill" href="#mcp">Connect Your Agent</a>
            <a className="btn btn-alt btn-pill" href="https://editor.kymo.studio">Open the live Editor ↗</a>
          </div>
        </div>
        <div className="hero-art">
          <img src="./logo.svg" alt="KymoStudio" />
        </div>
      </header>

      <section className="features" id="features">
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <KindsStrip />

      <section className="mcp" id="mcp">
        <div className="mcp-inner">
          <div className="mcp-copy">
            <h2>Connect your coding agent, over MCP</h2>
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
            <p>
              kymo runs a hosted <strong>MCP server</strong> at <code>mcp.kymo.studio</code>. Claude
              Code, Cursor, Copilot — any MCP client — can create and edit your diagrams, rendering
              live in the editor while the agent types.
            </p>
            <ol className="mcp-steps">
              <li>Add the server to your agent — one line of config.</li>
              <li>Ask for a diagram — the agent writes .kymo source and calls the tools.</li>
              <li>Watch it draw at editor.kymo.studio — animated SVG, ready to export.</li>
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
          <h2>Samples</h2>
          <span className="hint">Click a card to view source + rendered output side by side.</span>
        </div>
        <div className="grid">
          {SAMPLES.map((s) => (
            <article className="card" key={s.file} onClick={() => setSelected(s)}>
              <div className="card-preview"><img src={s.preview} alt={s.title} loading="lazy" /></div>
              <div className="card-body">
                <h3 className="card-title">{s.title}</h3>
                <p className="card-desc">{s.desc}</p>
                <div className="card-meta"><span>{s.file}</span><span>·</span><span>{s.size}</span></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <div className="reg-badges">
          <a href="https://pypi.org/project/kymostudio/"><img alt="PyPI" src="https://img.shields.io/pypi/v/kymostudio?logo=pypi&logoColor=white&label=PyPI&color=e0095f" /></a>
          <a href="https://www.npmjs.com/package/kymostudio"><img alt="npm" src="https://img.shields.io/npm/v/kymostudio?logo=npm&label=npm&color=e0095f" /></a>
          <a href="https://crates.io/crates/kymostudio"><img alt="crates.io" src="https://img.shields.io/crates/v/kymostudio?logo=rust&logoColor=white&label=crates.io&color=e0095f" /></a>
          <a href="https://marketplace.visualstudio.com/items?itemName=kymostudio.kymostudio-vscode"><img alt="VS Code Extension" src="https://img.shields.io/badge/VS%20Code-Extension-e0095f?logo=visualstudiocode&logoColor=white" /></a>
        </div>
        <a href={GH}>github.com/kymostudio/kymostudio</a> · Apache 2.0
      </footer>

      {selected && <Modal sample={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
