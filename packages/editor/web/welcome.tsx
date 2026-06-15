import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useDiagrams, KindIcon } from "./sidebar";
import { TEMPLATES, type Template } from "./templates";
import { docHref, extFor } from "./kroki";
import { Plus, FolderOpen, BookOpen, ArrowRight } from "lucide-react";

// Six common starters surfaced on the welcome screen (rest live in the gallery).
const QUICK = ["Flowchart", "Sequence", "BPMN", "C4", "ER", "Class"];

const promptSignIn = () => (window as any).google?.accounts?.id?.prompt?.();

export function WelcomeView({ onNew, onOpenFile, onTemplate }: {
  onNew: () => void; onOpenFile: (f: File) => void; onTemplate: (t: Template) => void;
}) {
  const { claims } = useAuth();
  const { items } = useDiagrams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const recent = [...items].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8);
  const quick = QUICK.map((n) => TEMPLATES.find((t) => t.name === n)).filter(Boolean) as Template[];
  const openFile = () => fileRef.current?.click();
  const fileInput = (
    <input ref={fileRef} data-testid="wel-open-input" type="file" accept=".kymo,.bpmn,.mmd,.mermaid,.txt,.md" hidden
      onChange={(e) => { const f = e.target.files?.[0]; if (f) onOpenFile(f); e.target.value = ""; }} />
  );

  // ── Logged-out: a purpose-built landing focused on the three jobs — understand
  // (hero demo) · create (primary actions) · explore (template grid). Signed-in
  // users get the compact VS Code-style home further below.
  if (!claims) {
    return (
      <div className="wlg" data-testid="welcome">
        <div className="wlg-bg" aria-hidden="true" />
        <div className="wlg-inner">
          <section className="wlg-hero">
            <div className="wlg-copy">
              <img className="wlg-lockup" src="/wordmark.svg" alt="kymostudio — Diagram superpowers" />
              <span className="wlg-eyebrow"><i /> Free — no sign-in to start</span>
              <h1 className="wlg-title">Prompt it.<br />See it appear.<br /><em>Watch it animate.</em></h1>
              <p className="wlg-sub">Describe a diagram in plain text — kymo renders a clean, animated SVG. Flowcharts, BPMN, sequence, C4 and more. No dragging boxes.</p>
              <div className="wlg-actions">
                <button className="wlg-btn wlg-btn-primary" data-testid="wel-new" onClick={onNew}><Plus size={18} strokeWidth={2.4} />New diagram<ArrowRight size={17} strokeWidth={2.4} className="wlg-btn-arrow" /></button>
                <button className="wlg-btn wlg-btn-ghost" data-testid="wel-open" onClick={openFile}><FolderOpen size={17} strokeWidth={2.1} />Open file</button>
              </div>
              <p className="wlg-micro">Your work lives in this page's link as you edit.{" "}
                <button className="wlg-inline" data-testid="wel-signin" onClick={promptSignIn}>Sign in</button> to save it to your diagrams and reach it anywhere.</p>
            </div>
            <div className="wlg-demo">
              <div className="wlg-window">
                <div className="wlg-window-bar"><span /><span /><span /><b>access-request.kymo</b></div>
                <div className="wlg-window-body">
                  <img className="wlg-demo-svg" src="/welcome-hero.svg?v=11" alt="Approval workflow drawn as a diagram by kymo" />
                </div>
              </div>
            </div>
          </section>

          <section className="wlg-templates">
            <div className="wlg-sec-head">
              <h2>Jump in with a template</h2>
              <button className="wlg-sec-link" onClick={onNew}>All 28 types<ArrowRight size={15} strokeWidth={2.2} /></button>
            </div>
            <div className="wlg-grid">
              {quick.map((t) => (
                <button key={t.name} className="wlg-card" data-testid="wel-template" title={`New ${t.name} (${t.via})`} onClick={() => onTemplate(t)}>
                  <span className="wlg-card-glyph">{t.glyph}</span>
                  <span className="wlg-card-name">{t.name}</span>
                  <span className="wlg-card-via">{t.via}</span>
                </button>
              ))}
            </div>
          </section>

          <footer className="wlg-foot">
            <a className="wlg-doc" href={docHref("kymo")} target="_blank" rel="noopener noreferrer"><BookOpen size={16} strokeWidth={2} />Read the docs</a>
            <span className="wlg-foot-note">The diagram studio for coding agents</span>
          </footer>
          {fileInput}
        </div>
      </div>
    );
  }

  // ── Signed-in: compact home. A returning user came back to resume, so Recent
  // leads; Start (create) and the template/learn column follow.
  return (
    <div className="welcome" data-testid="welcome">
      <div className="wel-inner">
        <img className="wel-lockup" src="/wordmark.svg" alt="kymostudio — Diagram superpowers" />
        <div className="wel-cols">
          <div className="wel-col">
            <section className="wel-block">
              <h2 className="wel-h">Recent</h2>
              {recent.length ? (
                recent.map((it) => (
                  <button key={it.id} className="wel-recent" data-testid="wel-recent-item" title={it.title || "Untitled"} onClick={() => navigate("/?d=" + encodeURIComponent(it.id))}>
                    <KindIcon kind={it.kind} /><span className="wel-recent-name">{it.title || "Untitled"}<span className="wel-ext">.{extFor(it.kind)}</span></span>
                  </button>
                ))
              ) : (
                <p className="wel-empty">No diagrams yet — pick a template to start.</p>
              )}
            </section>
            <section className="wel-block">
              <h2 className="wel-h">Start</h2>
              <button className="wel-cta" data-testid="wel-new" onClick={onNew}><Plus size={17} strokeWidth={2.2} />New diagram…</button>
              <button className="wel-link" onClick={openFile}><FolderOpen size={17} strokeWidth={2} />Open file…</button>
              {fileInput}
            </section>
          </div>

          <div className="wel-col">
            <section className="wel-block">
              <h2 className="wel-h">Templates</h2>
              <div className="wel-tpls">
                {quick.map((t) => (
                  <button key={t.name} className="wel-tpl" title={`New ${t.name} (${t.via})`} onClick={() => onTemplate(t)}>
                    <span className="wel-tpl-glyph">{t.glyph}</span>
                    <span className="wel-tpl-text"><span className="wel-tpl-name">{t.name}</span><span className="wel-tpl-via">{t.via}</span></span>
                  </button>
                ))}
              </div>
            </section>
            <section className="wel-block">
              <h2 className="wel-h">Learn</h2>
              <a className="wel-link" href={docHref("kymo")} target="_blank" rel="noopener noreferrer"><BookOpen size={17} strokeWidth={2} />Documentation</a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
