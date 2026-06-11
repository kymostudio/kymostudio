import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const RAW = "https://raw.githubusercontent.com/kymostudio/kymostudio/main/samples";
const GH = "https://github.com/kymostudio/kymostudio";

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
          <div className="brand"><img src="./favicon.svg" alt="" />kymo</div>
          <div className="nav-links">
            <a href="app/">Playground</a>
            <a href="https://editor.kymo.studio">Editor</a>
            <a href="#samples">Samples</a>
            <a href={GH}>GitHub →</a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <h1>Diagrams as code,<br /><span className="accent">animated by default.</span></h1>
        <p className="lead">
          A tiny DSL for architecture diagrams. Write a <code>.kymo</code> file,
          get a self-contained SVG — auto-layout, orthogonal edge routing,
          flowing-dash animation, exportable to animated WebP without a headless browser.
        </p>
        <div className="install">uv tool install git+https://github.com/kymostudio/kymostudio</div>
        <div className="ctas">
          <a className="btn btn-primary" href="app/">Open playground →</a>
          <a className="btn btn-ghost" href={GH}>View on GitHub</a>
          <a className="btn btn-ghost" href="#samples">See samples ↓</a>
        </div>
      </header>

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
        <a href={GH}>github.com/kymostudio/kymostudio</a> · Apache 2.0
      </footer>

      {selected && <Modal sample={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
