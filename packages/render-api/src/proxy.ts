// Passthrough to kroki.io for the kinds the local engine doesn't cover —
// the same fallback the editor uses, generalized to png/pdf. kroki's own
// errors (bad source, unsupported kind×format combo) relay with their status.
import { CONTENT_TYPES, HttpError, type Format } from "./http.js";

export async function proxyKroki(kind: string, format: Format, source: string): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(`https://kroki.io/${encodeURIComponent(kind)}/${format}`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: source,
    });
  } catch (e) {
    throw new HttpError(502, `kroki unreachable: ${e instanceof Error ? e.message : e}`);
  }
  if (!upstream.ok) throw new HttpError(upstream.status, (await upstream.text()).trim() || `kroki ${upstream.status}`);
  return new Response(upstream.body, {
    headers: { "content-type": upstream.headers.get("content-type") ?? CONTENT_TYPES[format] },
  });
}
