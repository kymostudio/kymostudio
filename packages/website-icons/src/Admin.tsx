import { useEffect, useRef, useState } from "react";
import { API } from "./App";
import { splitLocale } from "./i18n";
import { ADMIN_EMAIL, GOOGLE_CLIENT_ID, type Claims, exchange, fileToBase64, loadGsi, signOut, whoami } from "./auth";

type Overlay = { icons: Record<string, { path: string; ver: number }>; removed: string[] };

export function Admin() {
  const [claims, setClaims] = useState<Claims | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => { whoami().then((c) => { setClaims(c); setLoading(false); }); }, []);

  // Render the Google Sign-In button when signed out.
  useEffect(() => {
    if (loading || claims) return;
    let cancelled = false;
    (async () => {
      try {
        await loadGsi();
        if (cancelled) return;
        const g = (window as any).google;
        g.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp: any) => {
            setMsg("Signing in…");
            try { setClaims(await exchange(resp.credential)); setMsg(""); }
            catch (e: any) { setMsg(e?.message || "Sign-in failed"); }
          },
        });
        if (btnRef.current) g.accounts.id.renderButton(btnRef.current, { theme: "filled_blue", size: "large", text: "signin_with", shape: "pill" });
      } catch (e: any) { setMsg(e?.message || "Google sign-in unavailable"); }
    })();
    return () => { cancelled = true; };
  }, [loading, claims]);

  const isAdmin = !!claims && claims.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  // After a successful admin sign-in on /login, move to /admin (the management URL).
  const onLogin = splitLocale(location.pathname).rest === "/login";
  const redirecting = isAdmin && onLogin;
  useEffect(() => { if (redirecting) location.replace("/admin"); }, [redirecting]);

  return (
    <>
      <header>
        <div className="top">
          <a className="brand" href="/" style={{ textDecoration: "none" }}>
            <img className="k" src="/logo.svg" alt="kymo" width={26} height={26} /> Kymo Icons <small>· admin</small>
          </a>
          <nav className="nav">
            <a href="/">← Gallery</a>
            {claims && <button className="icon-btn" style={{ width: "auto", padding: "0 12px" }} onClick={() => signOut().then(() => setClaims(null))}>Sign out</button>}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto" }}>
        {loading || redirecting ? (
          <p className="count">{redirecting ? "Signed in — opening admin…" : "Checking session…"}</p>
        ) : !claims ? (
          <div className="login-card">
            <h2>Admin sign-in</h2>
            <p>Sign in with Google to manage icons. Admin only.</p>
            <div ref={btnRef} />
            {msg && <p className="login-msg">{msg}</p>}
          </div>
        ) : !isAdmin ? (
          <div className="login-card">
            <h2>Not authorized</h2>
            <p>Signed in as <b>{claims.email}</b> — this account can't manage icons.</p>
          </div>
        ) : (
          <AdminPanel email={claims.email} />
        )}
      </main>
    </>
  );
}

function AdminPanel({ email }: { email: string }) {
  const [overlay, setOverlay] = useState<Overlay>({ icons: {}, removed: [] });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { const o = await fetch(`${API}/api/icons`).then((r) => r.json()); setOverlay({ icons: o.icons || {}, removed: o.removed || [] }); } catch { /* ignore */ }
  };
  useEffect(() => { refresh(); }, []);

  const fmtOf = (f: File): "svg" | "png" => (f.type.includes("svg") || f.name.toLowerCase().endsWith(".svg") ? "svg" : "png");

  const onAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = (fd.get("file") as File) || null;
    const set = String(fd.get("set") || "").trim();
    const name = String(fd.get("name") || "").trim();
    const subset = String(fd.get("subset") || "").trim();
    if (!set || !name || !file || !file.size) { setNote("set, name and an image file are required"); return; }
    setBusy(true); setNote("Uploading…");
    try {
      const image = await fileToBase64(file);
      const r = await fetch(`${API}/api/icons`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ set, name, subset: subset || undefined, image, format: fmtOf(file) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setNote(`✓ Added ${j.key}`); form.reset(); await refresh();
    } catch (e: any) { setNote(`✗ ${e?.message || e}`); } finally { setBusy(false); }
  };

  const onEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const key = String(fd.get("key") || "").trim();
    const file = (fd.get("file") as File) || null;
    if (!key || !file || !file.size) { setNote("key and a replacement image are required"); return; }
    setBusy(true); setNote("Replacing…");
    try {
      const image = await fileToBase64(file);
      const r = await fetch(`${API}/api/icons`, {
        method: "PATCH", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, image, format: fmtOf(file) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setNote(`✓ Edited ${j.key}`); form.reset(); await refresh();
    } catch (e: any) { setNote(`✗ ${e?.message || e}`); } finally { setBusy(false); }
  };

  const onDelete = async (key: string) => {
    if (!key || !confirm(`Remove icon "${key}"?`)) return;
    setBusy(true); setNote("Removing…");
    try {
      const r = await fetch(`${API}/api/icons?key=${encodeURIComponent(key)}`, { method: "DELETE", credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setNote(`✓ Removed ${key}`); await refresh();
    } catch (e: any) { setNote(`✗ ${e?.message || e}`); } finally { setBusy(false); }
  };

  const added = Object.entries(overlay.icons);
  return (
    <div className="admin">
      <p className="count">Admin: <b>{email}</b>. Changes go live on the gallery immediately.</p>

      <section className="admin-card">
        <h3>Add / replace an icon</h3>
        <form onSubmit={onAdd} className="admin-form">
          <input className="q" name="set" placeholder="set (e.g. aws, custom)" autoComplete="off" />
          <input className="q" name="subset" placeholder="subset (optional, e.g. model · application · provider)" autoComplete="off" />
          <input className="q" name="name" placeholder="name (e.g. lambda)" autoComplete="off" />
          <input type="file" name="file" accept="image/png,image/svg+xml" />
          <button className="btn primary" disabled={busy} type="submit">Upload icon</button>
        </form>
      </section>

      <section className="admin-card">
        <h3>Edit existing art (by key)</h3>
        <form onSubmit={onEdit} className="admin-form">
          <input className="q" name="key" placeholder="key (e.g. aws:compute-ec2)" autoComplete="off" />
          <input type="file" name="file" accept="image/png,image/svg+xml" />
          <button className="btn" disabled={busy} type="submit">Replace art</button>
        </form>
      </section>

      <section className="admin-card">
        <h3>Delete an icon (by key)</h3>
        <form className="admin-form" onSubmit={(e) => { e.preventDefault(); onDelete(String(new FormData(e.currentTarget).get("key") || "").trim()); }}>
          <input className="q" name="key" placeholder="key (e.g. aws:compute-ec2)" autoComplete="off" />
          <button className="btn" disabled={busy} type="submit">Remove</button>
        </form>
      </section>

      {note && <p className="admin-note">{note}</p>}

      <section className="admin-card">
        <h3>Overlay ({added.length} added · {overlay.removed.length} hidden)</h3>
        {!added.length && !overlay.removed.length && <p className="count">No admin changes yet.</p>}
        <div className="admin-list">
          {added.map(([key, v]) => (
            <div key={key} className="admin-row">
              <img src={`https://cdn.kymo.studio/${v.path}?v=${v.ver}`} alt={key} width={32} height={32} />
              <code>{key}</code>
              <button className="btn" onClick={() => onDelete(key)} disabled={busy}>Delete</button>
            </div>
          ))}
          {overlay.removed.map((key) => (
            <div key={key} className="admin-row removed"><code>{key}</code><span>hidden</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
