import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useDiagrams, KindIcon } from "./sidebar";
import { Plus, FolderOpen } from "lucide-react";

// VS Code-style "Welcome" shown in the editor area when you open `/` with no
// diagram (no ?d= room, no ?s= share). Two columns: Start actions + Recent.
export function WelcomeView({ onNew, onOpenFile }: { onNew: () => void; onOpenFile: (f: File) => void }) {
  const { claims } = useAuth();
  const { items } = useDiagrams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const recent = [...items].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8);

  return (
    <div className="welcome">
      <div className="wel-inner">
        <img className="wel-lockup" src="/wordmark.svg" alt="kymostudio — Diagram superpowers" />
        <div className="wel-cols">
          <section className="wel-col">
            <h2 className="wel-h">Start</h2>
            <button className="wel-link" onClick={onNew}><Plus size={16} strokeWidth={2} />New diagram…</button>
            <button className="wel-link" onClick={() => fileRef.current?.click()}><FolderOpen size={16} strokeWidth={2} />Open file…</button>
            <input ref={fileRef} type="file" accept=".kymo,.bpmn,.mmd,.mermaid,.txt,.md" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onOpenFile(f); e.target.value = ""; }} />
          </section>
          <section className="wel-col">
            <h2 className="wel-h">Recent</h2>
            {!claims ? (
              <div className="wel-guest">
                <p className="wel-empty">Sign in to see your diagrams.</p>
                <button className="wel-signin" onClick={() => (window as any).google?.accounts?.id?.prompt?.()}>Sign in with Google</button>
              </div>
            ) : recent.length ? (
              recent.map((it) => (
                <button key={it.id} className="wel-recent" title={it.title || "Untitled"}
                  onClick={() => navigate("/?d=" + encodeURIComponent(it.id))}>
                  <KindIcon kind={it.kind} />
                  <span className="wel-recent-name">{it.title || "Untitled"}</span>
                </button>
              ))
            ) : (
              <p className="wel-empty">No diagrams yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
