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
          <p className="eyebrow"><span className="eyebrow-dot" />MCP server · diagram-as-code · animated SVG</p>
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

      <section className="mcp" id="mcp">
        <div className="mcp-inner">
          <div className="mcp-copy">
            <h2>Connect your coding agent, over MCP</h2>
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
          <div className="mcp-snippets">
            <div className="mcp-snippet">
              <div className="mcp-snippet-label">Claude Code</div>
              <pre><code>{`claude mcp add --transport sse kymo \\
  https://mcp.kymo.studio/sse`}</code></pre>
            </div>
            <div className="mcp-snippet">
              <div className="mcp-snippet-label">Any MCP client</div>
              <pre><code>{`{ "mcpServers": {
    "kymo": { "url": "https://mcp.kymo.studio/mcp" }
} }`}</code></pre>
            </div>
            <p className="mcp-note">Sign in with Google on first connect — diagrams open live in the editor.</p>
          </div>
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
