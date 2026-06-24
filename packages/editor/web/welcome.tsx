import React, { useRef } from "react";
import { useDiagrams, KindIcon } from "./sidebar";
import { TEMPLATES, type Template } from "./templates";
import { docHref, extFor } from "./kroki";
import { Plus, FolderOpen, BookOpen } from "lucide-react";

// Six common starters surfaced on the welcome screen (rest live in the gallery).
const QUICK = ["Flowchart", "Sequence", "BPMN", "C4", "ER", "Class"];

export function WelcomeView({ onNew, onOpenFile, onTemplate, onOpen }: {
  onNew: () => void; onOpenFile: (f: File) => void; onTemplate: (t: Template) => void; onOpen: (id: string) => void;
}) {
  const { items } = useDiagrams();
  const fileRef = useRef<HTMLInputElement>(null);
  const recent = [...items].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8);
  const quick = QUICK.map((n) => TEMPLATES.find((t) => t.name === n)).filter(Boolean) as Template[];
  const openFile = () => fileRef.current?.click();
  const fileInput = (
    <input ref={fileRef} data-testid="wel-open-input" type="file" accept=".kymo,.bpmn,.dbml,.mmd,.mermaid,.txt,.md" hidden
      onChange={(e) => { const f = e.target.files?.[0]; if (f) onOpenFile(f); e.target.value = ""; }} />
  );

  // Guests never reach this view — a fresh "/" drops them straight into the
  // editor on the sample (see EditorPage `showWelcome`). Only signed-in users
  // see the home below.
  //
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
                  <button key={it.id} className="wel-recent" data-testid="wel-recent-item" title={it.title || "Untitled"} onClick={() => onOpen(it.id)}>
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
                  <button key={t.name} className="wel-tpl" data-testid="wel-template" title={`New ${t.name} (${t.via})`} onClick={() => onTemplate(t)}>
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
