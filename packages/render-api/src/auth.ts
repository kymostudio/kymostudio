// Identify the caller to choose the rate-limit tier: the session cookie the
// editor sets (CR-KEDITOR-002) is preferred; a legacy Google id_token is still
// accepted. Render output and caching are identical for anonymous and signed-in
// callers, so an absent/invalid credential simply falls back to the anonymous
// (per-IP) tier rather than failing the request.
import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

// Mirror the mcp worker's session cookie (same shared `sessions` D1 table).
const SESSION_COOKIE = "__Secure-kymo_sess";
const SESSION_ABS_MS = 30 * 24 * 60 * 60 * 1000; // absolute cap

export interface Caller {
  sub: string;
  email?: string;
}
export interface AuthEnv {
  GOOGLE_CLIENT_ID: string;
  DB?: D1Database; // the shared kymo-editor DB (sessions table); absent → cookie tier off
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function getCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") || "").split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

/** Resolve the caller (cookie [preferred] or legacy id_token); null → anon tier. */
export async function identify(request: Request, url: URL, env: AuthEnv): Promise<Caller | null> {
  // 1) Session cookie → the shared `sessions` D1 table (mcp worker / CR-KEDITOR-002).
  const raw = getCookie(request, SESSION_COOKIE);
  if (raw && env.DB) {
    try {
      const row = await env.DB.prepare("SELECT email, created_at, expires_at, revoked FROM sessions WHERE id_hash=?")
        .bind(await sha256hex(raw)).first<{ email: string; created_at: number; expires_at: number; revoked: number }>();
      const now = Date.now();
      if (row && !row.revoked && now < row.expires_at && now < row.created_at + SESSION_ABS_MS) {
        return { sub: "sess:" + row.email, email: row.email }; // rate-limit key per user
      }
    } catch { /* fall through to anon */ }
  }
  // 2) Legacy Google id_token (Bearer or ?id_token).
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const idToken = bearer || url.searchParams.get("id_token") || "";
  if (!idToken) return null;
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: env.GOOGLE_CLIENT_ID,
    });
    return payload.sub ? { sub: payload.sub, email: payload.email as string | undefined } : null;
  } catch {
    return null;
  }
}
