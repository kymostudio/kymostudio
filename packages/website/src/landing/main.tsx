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
          <button className="mcp-copy-btn" onClick={copy} aria-live="polite">{copied ? "Copied ✓" : "Copy"}</button>
        </div>
        <pre><code>{agent.code}</code></pre>
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
              Code, Cursor, Copilot, Codex — even ChatGPT and Claude in your browser — any MCP
              client can create and edit your diagrams, rendering live in the editor while the
              agent types.
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
