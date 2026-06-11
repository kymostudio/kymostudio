import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const RAW = "https://raw.githubusercontent.com/kymostudio/kymostudio/main/samples";
const GH = "https://github.com/kymostudio/kymostudio";

type Feature = { title: string; desc: string };
const FEATURES: Feature[] = [
  { title: "Draws what you actually need", desc: "Software architecture, process flows and standard BPMN, all rendered faithfully." },
  { title: "Starts from any source", desc: "Author in the .kymo DSL, or feed it BPMN, JSON or Python." },
  { title: "Write once, export anywhere", desc: "One source compiles to SVG, PNG, WebP, Figma and Excalidraw." },
  { title: "Diagrams as code", desc: "Describe your diagram in a clean, line-oriented .kymo syntax — no dragging boxes around." },
  { title: "Animated by default", desc: "Edges come alive with built-in flowing animation, straight to a self-contained SVG." },
  { title: "Smart auto-layout", desc: "Frames, anchoring, edge routing and canvas sizing are figured out for you." },
  { title: "A rich icon library", desc: "2,460 icons spanning AWS, Azure, GCP, Kubernetes, on-prem and more." },
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

function App() {
  const [selected, setSelected] = useState<Sample | null>(null);
  return (
    <>
      <nav>
        <div className="nav-inner">
          <div className="brand"><img src="./favicon.svg" alt="" />KymoStudio</div>
          <div className="nav-links">
            <a href="https://editor.kymo.studio">Editor</a>
            <a href="#features">Features</a>
            <a href="#samples">Samples</a>
            <a href={GH}>GitHub →</a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <h1>Type it. See it appear.<br /><span className="accent">Watch it animate.</span></h1>
        <p className="lead">
          Kymostudio turns diagram-as-code source into animated SVG — and PNG, WebP,
          Figma and Excalidraw. Write a <code>.kymo</code> file (or feed it BPMN, JSON,
          Python), get auto-layout, orthogonal edge routing and flowing-dash animation,
          no headless browser required.
        </p>
        <div className="install install-multi">
          <span className="install-row">pip install kymostudio</span>
          <span className="install-row">npm install kymostudio</span>
          <span className="install-row">cargo install kymostudio</span>
        </div>
        <div className="ctas">
          <a className="btn btn-primary" href="https://editor.kymo.studio">Open live editor →</a>
          <a className="btn btn-ghost" href={GH}>View on GitHub</a>
          <a className="btn btn-ghost" href="#samples">See samples ↓</a>
        </div>
        <div className="reg-badges">
          <a href="https://pypi.org/project/kymostudio/"><img alt="PyPI" src="https://img.shields.io/pypi/v/kymostudio?logo=pypi&logoColor=white&label=PyPI&color=e0095f" /></a>
          <a href="https://www.npmjs.com/package/kymostudio"><img alt="npm" src="https://img.shields.io/npm/v/kymostudio?logo=npm&label=npm&color=e0095f" /></a>
          <a href="https://crates.io/crates/kymostudio"><img alt="crates.io" src="https://img.shields.io/crates/v/kymostudio?logo=rust&logoColor=white&label=crates.io&color=e0095f" /></a>
          <a href="https://marketplace.visualstudio.com/items?itemName=kymostudio.kymostudio-vscode"><img alt="VS Code Extension" src="https://img.shields.io/badge/VS%20Code-Extension-e0095f?logo=visualstudiocode&logoColor=white" /></a>
        </div>
      </header>

      <div className="preview">
        <div className="preview-frame">
          <img src={`${RAW}/nvidia-aiq-animated.webp`} alt="kymo demo — NVIDIA AIQ replica, animated WebP" />
        </div>
      </div>

      <section className="features" id="features">
        <div className="section-header">
          <h2>Features</h2>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

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
        <a href={GH}>github.com/kymostudio/kymostudio</a> · Apache 2.0
      </footer>

      {selected && <Modal sample={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
