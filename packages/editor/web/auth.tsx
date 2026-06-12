import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "./const";

export function jwtField(jwt: string, f: string): any {
  try { return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))[f]; } catch { return null; }
}
export function tokenValid(t: string | null): boolean {
  const e = t && jwtField(t, "exp");
  return !!(e && e * 1000 > Date.now() + 30000);
}
const AVATAR_COLORS = ["#f5b8d0", "#ddecee", "#c7e3f5", "#fde2b8", "#d9d4f7", "#c9efc9", "#f7d4c4", "#e3e1ea"];
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

type Claims = { email: string; name?: string; sub: string };
type AuthVal = { idToken: string | null; claims: Claims | null; signOut: () => void; expireSession: () => void };
const Ctx = createContext<AuthVal>({ idToken: null, claims: null, signOut: () => {}, expireSession: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [idToken, setIdToken] = useState<string | null>(() => {
    const t = localStorage.getItem("kymo_idtoken");
    return tokenValid(t) ? t : null;
  });
  useEffect(() => {
    let stop = false;
    gsiCallback = (resp: any) => { try { localStorage.setItem("kymo_idtoken", resp.credential); } catch {} setIdToken(resp.credential); };
    function init() {
      if (stop) return;
      const g = (window as any).google?.accounts?.id;
      if (!g) { setTimeout(init, 150); return; }
      ensureGsiInit(g);
      if (!tokenValid(localStorage.getItem("kymo_idtoken"))) g.prompt();
    }
    init();
    return () => { stop = true; };
  }, []);
  const signOut = useCallback(() => {
    try { localStorage.removeItem("kymo_idtoken"); } catch {}
    (window as any).google?.accounts?.id?.disableAutoSelect();
    setIdToken(null);
    setTimeout(() => (window as any).google?.accounts?.id?.prompt(), 60);
  }, []);
  // Session lapsed (token expired, or the server 401'd it): drop the stale
  // claims — unlike signOut, keep auto_select so GIS can renew silently.
  const expireSession = useCallback(() => {
    try { localStorage.removeItem("kymo_idtoken"); } catch {}
    setIdToken(null);
    (window as any).google?.accounts?.id?.prompt();
  }, []);
  // Google id_tokens live ~1h; tokenValid() is only checked at mount. Without
  // this watchdog a long-lived tab keeps showing "Signed in as …" while every
  // API call 401s ("Session expired") — expire the moment the token does.
  useEffect(() => {
    if (!idToken) return;
    const exp = jwtField(idToken, "exp");
    if (!exp) return;
    const t = setTimeout(expireSession, Math.max(0, exp * 1000 - Date.now() - 30000));
    return () => clearTimeout(t);
  }, [idToken, expireSession]);
  const claims = useMemo<Claims | null>(() =>
    idToken ? { email: jwtField(idToken, "email"), name: jwtField(idToken, "name"), sub: jwtField(idToken, "sub") } : null, [idToken]);
  return <Ctx.Provider value={{ idToken, claims, signOut, expireSession }}>{children}</Ctx.Provider>;
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
      g.renderButton(ref.current, { type: "standard", theme: "outline", size: "medium", text: "signin_with" });
    }
    r();
    return () => { stop = true; };
  }, []);
  return <div ref={ref} />;
}
