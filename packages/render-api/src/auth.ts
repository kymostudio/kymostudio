// Identify the caller from a Google id_token — the same token the editor stores
// as `kymo_idtoken` and the mcp worker verifies. Used ONLY to choose the
// rate-limit tier: render output and caching are identical for anonymous and
// signed-in callers, so a missing or invalid token simply falls back to the
// anonymous (per-IP) tier rather than failing the request.
import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export interface Caller {
  sub: string;
  email?: string;
}

/** Verify a Google id_token (Bearer header or ?id_token); null if absent/invalid. */
export async function identify(request: Request, url: URL, clientId: string): Promise<Caller | null> {
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const idToken = bearer || url.searchParams.get("id_token") || "";
  if (!idToken) return null;
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    return payload.sub ? { sub: payload.sub, email: payload.email as string | undefined } : null;
  } catch {
    return null;
  }
}
