import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID, SESSION_API, ME_API } from "./const";

// no pinks: the avatar sits next to the brand-pink Share CTA and must not compete with it
const AVATAR_COLORS = ["#d8dce6", "#ddecee", "#c7e3f5", "#fde2b8", "#d9d4f7", "#c9efc9", "#f7d4c4", "#e3e1ea"];
export function colorFor(str: string): string {
  let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// GIS requires initialize() before renderButton(), but React runs the
// GoogleButton (child) effect before the AuthProvider (parent) effect.
// Route both through one idempotent init so call order doesn't matter.
let gsiCallback: ((resp: any) => void) | null = null;
let gsiInitialized = false;
function ensureGsiInit(g: any) {
  if (gsiInitialized) return;
  gsiInitialized = true;
  g.initialize({
    client_id: GOOGLE_CLIENT_ID, auto_select: true,
    callback: (resp: any) => gsiCallback?.(resp),
  });
}

export function isLocalhost(): boolean {
  const h = location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".local");
}

// The session of record is a Worker-issued httpOnly cookie (CR-KEDITOR-002) — the
// editor never holds a credential in JS. `claims` is display-only {email,name}
// derived from the login response / GET /api/me, cached in localStorage for an
// instant signed-in paint and revalidated against the cookie on mount.
type Claims = { email: string; name?: string; sub: string };
const CLAIMS_KEY = "kymo_claims";
function readClaims(): Claims | null { try { const s = localStorage.getItem(CLAIMS_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function writeClaims(c: Claims | null) { try { if (c) localStorage.setItem(CLAIMS_KEY, JSON.stringify(c)); else localStorage.removeItem(CLAIMS_KEY); } catch {} }
const asClaims = (j: any): Claims => ({ email: j.email, name: j.name, sub: j.sub || j.email });

type AuthVal = { claims: Claims | null; signedIn: boolean; signOut: () => void; expireSession: () => void; devSignIn: () => void };
const Ctx = createContext<AuthVal>({ claims: null, signedIn: false, signOut: () => {}, expireSession: () => {}, devSignIn: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaimsState] = useState<Claims | null>(readClaims);
  const setClaims = useCallback((c: Claims | null) => { writeClaims(c); setClaimsState(c); }, []);
  useEffect(() => {
    let stop = false;
    try { localStorage.removeItem("kymo_idtoken"); } catch {} // one-time: drop the legacy pre-cookie token
    // GIS hands back a Google credential → exchange it for our session cookie.
    gsiCallback = async (resp: any) => {
      try {
        const r = await fetch(SESSION_API, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential: resp.credential }) });
        if (r.ok && !stop) setClaims(asClaims(await r.json()));
      } catch {}
    };
    function init() {
      if (stop) return;
      const g = (window as any).google?.accounts?.id;
      if (!g) { setTimeout(init, 150); return; }
      ensureGsiInit(g);
      // Returning user landing on a bare "/" (no share ?s= / doc ?d=): let One Tap
      // auto sign them in. Share links and doc routes stay silent. (Needs an
      // authorized JS origin, so this only fires in production, not on localhost.)
      const sp = new URLSearchParams(location.search);
      if (!readClaims() && location.pathname === "/" && !sp.has("s") && !sp.has("d")) g.prompt();
    }
    init();
    // Revalidate the persisted session against the cookie (prod only — on localhost
    // the API is the localdb interceptor / dev-login, there is no real cookie).
    if (!isLocalhost()) {
      fetch(ME_API, { credentials: "include" }).then(async (r) => {
        if (stop) return;
        if (r.ok) setClaims(asClaims(await r.json()));
        else if (r.status === 401) setClaims(null);
      }).catch(() => {});
    }
    return () => { stop = true; };
  }, [setClaims]);
  const signOut = useCallback(() => {
    fetch(SESSION_API, { method: "DELETE", credentials: "include" }).catch(() => {}); // revoke the server session
    (window as any).google?.accounts?.id?.disableAutoSelect();
    setClaims(null); // signing out means OUT — don't immediately re-prompt
  }, [setClaims]);
  // Localhost-only sign-in: no Google OAuth (can't run on 127.0.0.1) and no real
  // backend (localdb serves /api). Just set display claims to preview the shell.
  const devSignIn = useCallback(() => {
    if (!isLocalhost()) return;
    setClaims({ email: "dev@localhost", name: "Local Dev", sub: "dev-local" });
  }, [setClaims]);
  // Session lapsed (the server 401'd the cookie — expired/revoked): drop the stale
  // claims and, unlike signOut, keep auto_select so GIS can renew silently.
  const expireSession = useCallback(() => {
    setClaims(null);
    (window as any).google?.accounts?.id?.prompt();
  }, [setClaims]);
  return <Ctx.Provider value={{ claims, signedIn: !!claims, signOut, expireSession, devSignIn }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

export function GoogleButton() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let stop = false;
    function r() {
      if (stop) return;
      const g = (window as any).google?.accounts?.id;
      if (!g || !ref.current) { setTimeout(r, 150); return; }
      ensureGsiInit(g);
      ref.current.innerHTML = "";
      g.renderButton(ref.current, { type: "standard", theme: "outline", size: "medium", text: "signin_with", locale: "en" }); // UI is English — don't let browser locale leak in
    }
    r();
    return () => { stop = true; };
  }, []);
  return <div ref={ref} />;
}
