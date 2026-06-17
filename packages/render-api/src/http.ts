/** An error that already knows its HTTP status. Anything else becomes a 500. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// The render output is public, so most callers get the wildcard origin. The
// editor authenticates with the session cookie (CR-KEDITOR-002) to claim the
// signed-in rate-limit tier, and a *credentialed* request can't be answered with
// "*" — so for the editor's own origin we echo it + allow-credentials instead.
const CREDENTIALED_ORIGINS = new Set(["https://editor.kymo.studio"]);
export function corsHeaders(request: Request): Record<string, string> {
  const base: Record<string, string> = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, accept, authorization",
    "access-control-expose-headers": "x-render-cache, x-render-api-version, x-ratelimit-tier",
  };
  const origin = request.headers.get("Origin") || "";
  if (CREDENTIALED_ORIGINS.has(origin)) {
    return { ...base, "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "vary": "Origin" };
  }
  return { ...base, "access-control-allow-origin": "*" };
}

export type Format = "svg" | "png" | "pdf";

export const CONTENT_TYPES: Record<Format, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  pdf: "application/pdf",
};
