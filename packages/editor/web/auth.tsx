import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "./const";

export function jwtField(jwt: string, f: string): any {
  try { return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))[f]; } catch { return null; }
}
export function tokenValid(t: string | null): boolean {
  const e = t && jwtField(t, "exp");
  return !!(e && e * 1000 > Date.now() + 30000);
}
export function colorFor(str: string): string {
  let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 68% 64%)`;
}

type Claims = { email: string; name?: string; sub: string };
type AuthVal = { idToken: string | null; claims: Claims | null; signOut: () => void };
const Ctx = createContext<AuthVal>({ idToken: null, claims: null, signOut: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [idToken, setIdToken] = useState<string | null>(() => {
    const t = localStorage.getItem("kymo_idtoken");
    return tokenValid(t) ? t : null;
  });
  useEffect(() => {
    let stop = false;
    function init() {
      if (stop) return;
      const g = (window as any).google?.accounts?.id;
      if (!g) { setTimeout(init, 150); return; }
      g.initialize({
        client_id: GOOGLE_CLIENT_ID, auto_select: true,
        callback: (resp: any) => { try { localStorage.setItem("kymo_idtoken", resp.credential); } catch {} setIdToken(resp.credential); },
      });
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
  const claims = useMemo<Claims | null>(() =>
    idToken ? { email: jwtField(idToken, "email"), name: jwtField(idToken, "name"), sub: jwtField(idToken, "sub") } : null, [idToken]);
  return <Ctx.Provider value={{ idToken, claims, signOut }}>{children}</Ctx.Provider>;
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
      ref.current.innerHTML = "";
      g.renderButton(ref.current, { type: "standard", theme: "filled_black", size: "medium", text: "signin_with" });
    }
    r();
    return () => { stop = true; };
  }, []);
  return <div ref={ref} />;
}
