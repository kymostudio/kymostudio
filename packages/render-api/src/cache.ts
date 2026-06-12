// Content-hash edge cache, same scheme as the mcp render proxy: diagrams are
// immutable by construction (new source = new hash), so a 1-year TTL is safe
// and every visitor after the first gets the render in one edge round-trip.
import type { RenderRequest } from "./kroki.js";

export async function cacheKey(origin: string, { kind, format, source, scale }: RenderRequest): Promise<Request> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${kind}\0${format}\0${scale}\0${source}`),
  );
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // The Cache API only matches GET requests — synthesize a GET key from the
  // content hash so POST and GET renders of the same diagram share one entry.
  return new Request(`${origin}/__cache/${kind}/${format}?h=${hash}`, { method: "GET" });
}

export function cacheable(res: Response): Response {
  res.headers.set("cache-control", "public, max-age=31536000, immutable");
  return res;
}
