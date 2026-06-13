// render.kymo.studio — Kroki-compatible diagram render API.
//
//   GET  /{kind}/{format}/{encoded}   kroki URL encoding (deflate+base64url)
//   POST /{kind}/{format}             diagram source as text/plain body
//   POST /{kind}                      format via Accept header (default svg)
//   POST /                            JSON {diagram_source, diagram_type, output_format}
//
// Each route also accepts a /v1 prefix (the root path is v1 for kroki compat);
// GET /version reports the API + engine versions, and every response carries an
// x-render-api-version header. Render requests are rate-limited per client IP.
//
// kymo/mermaid/d2/graphviz/bpmn (+ the bundled JS engines) render in this
// worker; every other kroki kind proxies to kroki.io. Everything is cached at
// the edge by content hash (x-render-cache: hit|miss).
import { cacheKey, cacheable } from "./cache.js";
import { render, SELF_KINDS } from "./dispatch.js";
import { CORS, HttpError } from "./http.js";
import { decodeRequest } from "./kroki.js";
import { identify } from "./auth.js";
import { API_VERSION, VERSION_INFO } from "./version.js";

// Cloudflare native rate limiting binding (wrangler.jsonc ratelimits).
interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
interface Env {
  GOOGLE_CLIENT_ID: string;
  ANON_LIMITER: RateLimiter;
  USER_LIMITER: RateLimiter;
}

const RATE_ANON = "60 requests/minute (anonymous, by IP)";
const RATE_USER = "120 requests/minute (signed-in)";

const USAGE = {
  name: "kymo-render-api",
  api_version: API_VERSION,
  api: {
    "GET /{kind}/{format}/{encoded}": "encoded = deflate+base64url of the source (kroki-compatible)",
    "POST /{kind}/{format}": "diagram source as text/plain body",
    "POST /": "JSON {diagram_source, diagram_type, output_format}",
    "GET /version": "API + engine versions",
  },
  versioned_path: "prefix any render route with /v1 (root path is v1)",
  formats: ["svg", "png", "pdf"],
  options: { scale: "PNG raster scale 1-4 (?scale=2)" },
  rate_limit: {
    anonymous: RATE_ANON,
    authenticated: RATE_USER + " — send Authorization: Bearer <google id_token>",
  },
  self_rendered: SELF_KINDS,
  proxied: "all other kroki.io diagram types",
};

function withCors(res: Response): Response {
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  res.headers.set("x-render-api-version", API_VERSION);
  return res;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);

    // Optional /v1 API-version prefix. The un-prefixed root is v1 too, so
    // existing kroki-style URLs keep working; a future /v2 can diverge.
    let pathname = url.pathname;
    const vm = pathname.match(/^\/v(\d+)(?=\/|$)/);
    if (vm) {
      if (vm[1] !== "1") {
        return withCors(
          new Response(`unsupported API version v${vm[1]} (only v1)`, {
            status: 404,
            headers: { "content-type": "text/plain" },
          }),
        );
      }
      pathname = pathname.slice(vm[0].length) || "/";
    }

    // Metadata routes — never rate-limited (monitoring/version probes).
    if (pathname === "/healthz") return withCors(new Response("ok"));
    if (pathname === "/version") return withCors(Response.json(VERSION_INFO));
    if (pathname === "/" && request.method === "GET") return withCors(Response.json(USAGE));

    // Two-tier rate limit: a verified Google id_token (the editor's signed-in
    // token) raises the limit and keys on the user instead of the IP, so people
    // behind a shared NAT/proxy don't collide. No/invalid token → anonymous,
    // keyed on the connecting IP. Verification only runs when a token is present.
    const caller = await identify(request, url, env.GOOGLE_CLIENT_ID);
    const tier = caller ? "user" : "anon";
    const limiter = caller ? env.USER_LIMITER : env.ANON_LIMITER;
    const limitKey = caller ? `user:${caller.sub}` : (request.headers.get("cf-connecting-ip") ?? "unknown");
    const { success } = await limiter.limit({ key: limitKey });
    if (!success) {
      return withCors(
        new Response(`rate limit exceeded — ${caller ? RATE_USER : RATE_ANON}`, {
          status: 429,
          headers: { "content-type": "text/plain", "retry-after": "60", "x-ratelimit-tier": tier },
        }),
      );
    }

    try {
      const normUrl = new URL(url);
      normUrl.pathname = pathname;
      const req = await decodeRequest(request, normUrl);
      if (!req) return withCors(new Response("not found", { status: 404 }));

      const key = await cacheKey(url.origin, req);
      const cache = caches.default;
      const hit = await cache.match(key);
      if (hit) {
        const res = new Response(hit.body, hit);
        res.headers.set("x-render-cache", "hit");
        res.headers.set("x-ratelimit-tier", tier);
        return withCors(res);
      }

      const res = cacheable(await render(req));
      ctx.waitUntil(cache.put(key, res.clone()));
      res.headers.set("x-render-cache", "miss");
      res.headers.set("x-ratelimit-tier", tier);
      return withCors(res);
    } catch (e) {
      if (e instanceof HttpError) {
        return withCors(new Response(e.message, { status: e.status, headers: { "content-type": "text/plain" } }));
      }
      console.error("render failed:", e);
      const message = e instanceof Error ? e.message : String(e);
      return withCors(
        new Response(`render failed: ${message}`, { status: 500, headers: { "content-type": "text/plain" } }),
      );
    }
  },
};
