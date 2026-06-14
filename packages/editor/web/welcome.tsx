import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useDiagrams, KindIcon } from "./sidebar";
import { TEMPLATES, type Template } from "./templates";
import { docHref, extFor } from "./kroki";
import { Plus, FolderOpen, BookOpen } from "lucide-react";

// A few common starters surfaced as the right column (rest live in the gallery).
const QUICK = ["Flowchart", "Sequence", "BPMN", "C4", "ER", "Class"];

// VS Code-style "Welcome" home (editor area on a fresh `/`): brand top-left, then
// two columns — left: Start + Recent (text lists); right: Templates + Learn.
export function WelcomeView({ onNew, onOpenFile, onTemplate }: {
  onNew: () => void; onOpenFile: (f: File) => void; onTemplate: (t: Template) => void;
}) {
  const { claims } = useAuth();
  const { items } = useDiagrams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const recent = [...items].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8);
  const quick = QUICK.map((n) => TEMPLATES.find((t) => t.name === n)).filter(Boolean) as Template[];

  // "Start" — the create actions (New diagram is the primary CTA).
  const startBlock = (
    <section className="wel-block" key="start">
      <h2 className="wel-h">Start</h2>
      <button className="wel-cta" onClick={onNew}><Plus size={17} strokeWidth={2.2} />New diagram…</button>
      <button className="wel-link" onClick={() => fileRef.current?.click()}><FolderOpen size={17} strokeWidth={2} />Open file…</button>
      <input ref={fileRef} type="file" accept=".kymo,.bpmn,.mmd,.mermaid,.txt,.md" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onOpenFile(f); e.target.value = ""; }} />
    </section>
  );
  // Guests get a value-first "No sign-in needed" note; signed-in users get their
  // recent diagrams (a returning user came back to resume, so this leads).
  const recentBlock = (
    <section className="wel-block" key="recent">
      <h2 className="wel-h">{claims ? "Recent" : "No sign-in needed"}</h2>
      {!claims ? (
        <p className="wel-note">
          Pick a template and start right away — your work lives in this page's link as you edit.{" "}
          <button className="wel-inline-link" onClick={() => (window as any).google?.accounts?.id?.prompt?.()}>Sign in</button>{" "}
          to save it to your diagrams and open it from any device.
        </p>
      ) : recent.length ? (
        recent.map((it) => (
          <button key={it.id} className="wel-recent" title={it.title || "Untitled"} onClick={() => navigate("/?d=" + encodeURIComponent(it.id))}>
            <KindIcon kind={it.kind} /><span className="wel-recent-name">{it.title || "Untitled"}<span className="wel-ext">.{extFor(it.kind)}</span></span>
          </button>
        ))
      ) : (
        <p className="wel-empty">No diagrams yet — pick a template to start.</p>
      )}
    </section>
  );

  return (
    <div className="welcome">
      <div className="wel-inner">
        <img className="wel-lockup" src="/wordmark.svg" alt="kymostudio — Diagram superpowers" />
        {!claims && (
          <p className="wel-tagline">Describe your diagram in plain text — kymo renders clean, animated SVG. Flowcharts, BPMN, sequence, C4 and more, no dragging boxes.</p>
        )}
        {!claims && <img className="wel-hero" src="/welcome-hero.svg" alt="Example flowchart rendered by kymo" />}
        <div className="wel-cols">
          <div className="wel-col">
            {claims ? [recentBlock, startBlock] : [startBlock, recentBlock]}
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
