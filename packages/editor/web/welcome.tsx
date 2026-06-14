import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useDiagrams, KindIcon } from "./sidebar";
import { TEMPLATES, type Template } from "./templates";
import { DIAGRAMS_API } from "./const";
import { Plus, FolderOpen } from "lucide-react";

// A few common starters surfaced as quick-start chips (rest live in the gallery).
const QUICK = ["Flowchart", "Sequence", "BPMN", "C4", "ER"];

// "Welcome" home shown in the editor area on a fresh `/` (no ?d= room, no ?s=).
// Lockup → Start (actions + template chips) → Recent (visual thumbnail cards).
export function WelcomeView({ onNew, onOpenFile, onTemplate }: {
  onNew: () => void; onOpenFile: (f: File) => void; onTemplate: (t: Template) => void;
}) {
  const { claims, idToken } = useAuth();
  const { items } = useDiagrams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const recent = [...items].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8);
  const quick = QUICK.map((n) => TEMPLATES.find((t) => t.name === n)).filter(Boolean) as Template[];

  return (
    <div className="welcome">
      <div className="wel-inner">
        <img className="wel-lockup" src="/wordmark.svg" alt="kymostudio — Diagram superpowers" />

        <section className="wel-block">
          <h2 className="wel-h">Start</h2>
          <div className="wel-start">
            <button className="wel-link" onClick={onNew}><Plus size={16} strokeWidth={2} />New diagram…</button>
            <button className="wel-link" onClick={() => fileRef.current?.click()}><FolderOpen size={16} strokeWidth={2} />Open file…</button>
            <input ref={fileRef} type="file" accept=".kymo,.bpmn,.mmd,.mermaid,.txt,.md" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onOpenFile(f); e.target.value = ""; }} />
          </div>
          <div className="wel-templates">
            {quick.map((t) => (
              <button key={t.name} className="wel-tpl" title={`New ${t.name} (${t.via})`} onClick={() => onTemplate(t)}>
                <span className="wel-tpl-glyph">{t.glyph}</span>{t.name}
              </button>
            ))}
          </div>
        </section>

        <section className="wel-block">
          <h2 className="wel-h">Recent</h2>
          {!claims ? (
            <div className="wel-guest">
              <p className="wel-empty">Sign in to see your diagrams.</p>
              <button className="wel-signin" onClick={() => (window as any).google?.accounts?.id?.prompt?.()}>Sign in with Google</button>
            </div>
          ) : recent.length ? (
            <div className="wel-grid">
              {recent.map((it) => (
                <button key={it.id} className="wel-card" title={it.title || "Untitled"}
                  onClick={() => navigate("/?d=" + encodeURIComponent(it.id))}>
                  <span className="wel-thumb">
                    <KindIcon kind={it.kind} />
                    {/* backend renders the thumbnail on demand; hide on error → kind icon shows */}
                    <img loading="lazy" alt="" src={`${DIAGRAMS_API}/thumb?id=${encodeURIComponent(it.id)}&id_token=${encodeURIComponent(idToken || "")}`}
                      onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  </span>
                  <span className="wel-card-name">{it.title || "Untitled"}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="wel-empty">No diagrams yet — pick a template above to start.</p>
          )}
        </section>
      </div>
    </div>
  );
}
