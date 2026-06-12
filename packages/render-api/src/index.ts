// kroki.kymo.studio — Kroki-compatible diagram render API.
//
//   GET  /{kind}/{format}/{encoded}   kroki URL encoding (deflate+base64url)
//   POST /{kind}/{format}             diagram source as text/plain body
//   POST /{kind}                      format via Accept header (default svg)
//   POST /                            JSON {diagram_source, diagram_type, output_format}
//
// kymo/mermaid/d2/graphviz/bpmn render in this worker (kymostudio engine +
// wasm); every other kroki kind proxies to kroki.io. Everything is cached at
// the edge by content hash (x-render-cache: hit|miss).
import { cacheKey, cacheable } from "./cache.js";
import { render } from "./dispatch.js";
import { CORS, HttpError } from "./http.js";
import { decodeRequest } from "./kroki.js";

const USAGE = {
  name: "kymo-render-api",
  api: {
    "GET /{kind}/{format}/{encoded}": "encoded = deflate+base64url of the source (kroki-compatible)",
    "POST /{kind}/{format}": "diagram source as text/plain body",
    "POST /": "JSON {diagram_source, diagram_type, output_format}",
  },
  formats: ["svg", "png", "pdf"],
  options: { scale: "PNG raster scale 1-4 (?scale=2)" },
  self_rendered: ["kymo", "mermaid", "d2", "graphviz", "bpmn"],
  proxied: "all other kroki.io diagram types",
};

function withCors(res: Response): Response {
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);
    if (url.pathname === "/healthz") return withCors(new Response("ok"));
    if (url.pathname === "/" && request.method === "GET") return withCors(Response.json(USAGE));

    try {
      const req = await decodeRequest(request, url);
      if (!req) return withCors(new Response("not found", { status: 404 }));

      const key = await cacheKey(url.origin, req);
      const cache = caches.default;
      const hit = await cache.match(key);
      if (hit) {
        const res = new Response(hit.body, hit);
        res.headers.set("x-render-cache", "hit");
        return withCors(res);
      }

      const res = cacheable(await render(req));
      ctx.waitUntil(cache.put(key, res.clone()));
      res.headers.set("x-render-cache", "miss");
      return withCors(res);
    } catch (e) {
      if (e instanceof HttpError) {
        return withCors(new Response(e.message, { status: e.status, headers: { "content-type": "text/plain" } }));
      }
      console.error("render failed:", e);
      const message = e instanceof Error ? e.message : String(e);
      return withCors(new Response(`render failed: ${message}`, { status: 500, headers: { "content-type": "text/plain" } }));
    }
  },
};
