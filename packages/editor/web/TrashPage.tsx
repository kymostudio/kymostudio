import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useConfirm } from "./confirm";
import { kindLabel } from "./kroki";
import { TRASH_API } from "./const";
import { timeAgo } from "./util";
import { Folder as FolderIcon, FileText, RotateCcw, Trash2, ArrowLeft } from "lucide-react";

type TItem = { type: "folder" | "diagram"; id: string; name: string; kind?: string; deletedAt: number };

export default function TrashPage() {
  const { idToken, claims, signOut, expireSession } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [items, setItems] = useState<TItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { document.title = "Trash · Kymostudio"; return () => { document.title = "Kymostudio"; }; }, []);
  useEffect(() => { if (!claims) navigate("/login?next=/trash", { replace: true }); }, [claims, navigate]);

  const load = useCallback(async () => {
    if (!idToken) return;
    try {
      const r = await fetch(TRASH_API + "?id_token=" + encodeURIComponent(idToken), { cache: "no-store" });
      if (r.status === 401) { expireSession(); return; }
      if (!r.ok) { setError("Error " + r.status); return; }
      const j = await r.json();
      const merged: TItem[] = [
        ...(j.folders || []).map((f: any) => ({ type: "folder" as const, id: f.id, name: f.name || "Untitled", deletedAt: f.deletedAt })),
        ...(j.diagrams || []).map((d: any) => ({ type: "diagram" as const, id: d.id, name: d.title || "Untitled", kind: d.kind, deletedAt: d.deletedAt })),
      ].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
      setItems(merged); setError("");
    } catch (e: any) { setError("Error: " + e.message); }
    setLoaded(true);
  }, [idToken, expireSession]);
  useEffect(() => { load(); }, [load]);

  async function restore(it: TItem) {
    if (!idToken) return;
    await fetch(TRASH_API + "?id_token=" + encodeURIComponent(idToken), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: it.type, id: it.id }),
    }).catch(() => {});
    load();
  }
  async function purge(it: TItem) {
    if (!idToken) return;
    if (!(await confirm({
      title: it.type === "folder" ? `Permanently delete folder “${it.name}” and its contents?` : `Permanently delete “${it.name}”?`,
      detail: "This can’t be undone.",
    }))) return;
    await fetch(`${TRASH_API}?id=${encodeURIComponent(it.id)}&kind=${it.type}&id_token=${encodeURIComponent(idToken)}`, { method: "DELETE" }).catch(() => {});
    load();
  }
  async function emptyTrash() {
    if (!idToken || !items.length) return;
    if (!(await confirm({ title: "Empty trash?", detail: "Everything in the trash will be permanently deleted." }))) return;
    await fetch(`${TRASH_API}?all=1&id_token=${encodeURIComponent(idToken)}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  return (
    <main className="scroll" style={{ height: "100%" }}>
      <div className="page">
        <div className="page-head">
          <h1>Trash</h1>
          <div className="head-actions">
            <Link className="pill" to="/diagrams"><ArrowLeft size={15} strokeWidth={2} />Diagrams</Link>
            {!!items.length && <button className="pill" onClick={emptyTrash}>Empty trash</button>}
          </div>
        </div>
        {!claims ? null : (
          <>
            <p className="trash-note">Items here are permanently deleted 30 days after you trash them.</p>
            {error && <div className="empty">{error}</div>}
            <div className="rows">
              {items.map((it) => (
                <div key={it.type + it.id} className="rrow trash-row">
                  <span className="rthumb empty">{it.type === "folder" ? <FolderIcon size={17} strokeWidth={1.9} /> : <FileText size={16} strokeWidth={1.8} />}</span>
                  <span className="rtitle">{it.name}</span>
                  {it.type === "folder" ? <span className="rkind">Folder</span> : it.kind && <span className="rkind">{kindLabel(it.kind)}</span>}
                  <button className="rrestore" onClick={() => restore(it)} title="Restore"><RotateCcw size={14} strokeWidth={2} />Restore</button>
                  <button className="rdel" onClick={() => purge(it)} title="Delete forever"><Trash2 size={14} strokeWidth={2} /></button>
                  <span className="rtime">{timeAgo(it.deletedAt)}</span>
                </div>
              ))}
              {loaded && !items.length && !error && <div className="empty">Trash is empty.</div>}
            </div>
            <div className="foot">
              <span>Signed in as {claims.email}</span>
              <button className="linklike" onClick={signOut}>Sign out</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
