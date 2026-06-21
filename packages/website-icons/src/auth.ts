// Reuse the kymo.studio Google session (issued by api.kymo.studio, cookie
// Domain=kymo.studio → shared with icons.kymo.studio). Only the admin email may
// mutate icons; the worker enforces it, this is just the UI gate.
import { API } from "./App";

export const GOOGLE_CLIENT_ID = "745071116390-6idggmrtohc6heg6gvuubaamkt8dr68u.apps.googleusercontent.com";
export const ADMIN_EMAIL = "anhv.ict91@gmail.com";

export type Claims = { email: string; name?: string };

export async function whoami(): Promise<Claims | null> {
  try {
    const r = await fetch(`${API}/api/me`, { credentials: "include" });
    if (!r.ok) return null;
    return (await r.json()) as Claims;
  } catch { return null; }
}

export async function signOut(): Promise<void> {
  try { await fetch(`${API}/api/session`, { method: "DELETE", credentials: "include" }); } catch { /* ignore */ }
  try { (window as any).google?.accounts?.id?.disableAutoSelect?.(); } catch { /* ignore */ }
}

// Load Google Identity Services once.
let gsiPromise: Promise<void> | null = null;
export function loadGsi(): Promise<void> {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Identity Services failed to load"));
    document.head.appendChild(s);
  });
  return gsiPromise;
}

// Exchange the Google ID-token credential for a kymo.studio session cookie.
export async function exchange(credential: string): Promise<Claims> {
  const r = await fetch(`${API}/api/session`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!r.ok) {
    const j: any = await r.json().catch(() => ({}));
    throw new Error(j.error === "forbidden" ? `Not allowed: ${j.email || ""}` : `Sign-in failed (${j.error || r.status})`);
  }
  return (await r.json()) as Claims;
}

// Read a File as a base64 string (no data: prefix).
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = String(fr.result || "");
      resolve(s.includes(",") ? s.slice(s.indexOf(",") + 1) : s);
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
