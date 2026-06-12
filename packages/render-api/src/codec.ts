// Kroki GET URLs carry the diagram source deflate-compressed (zlib) and
// base64url-encoded — the same codec as the editor's ?s= share links
// (packages/editor/web/share.ts), so payloads from kroki.io URLs and editor
// share links drop in unchanged.
import { HttpError } from "./http.js";

const MAX_ENCODED = 256 * 1024; // path segment cap
const MAX_DECODED = 2 * 1024 * 1024; // zip-bomb guard on the inflated source

export async function decodeKrokiSource(encoded: string): Promise<string> {
  if (encoded.length > MAX_ENCODED) throw new HttpError(413, "encoded diagram too large");
  let bin: string;
  try {
    bin = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    throw new HttpError(400, "invalid base64url payload");
  }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));

  // Read the inflate stream incrementally so a tiny payload can't balloon
  // past MAX_DECODED before we notice.
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    let r: ReadableStreamReadResult<Uint8Array>;
    try {
      r = await reader.read();
    } catch {
      throw new HttpError(400, "invalid deflate payload");
    }
    if (r.done) break;
    total += r.value.byteLength;
    if (total > MAX_DECODED) throw new HttpError(413, "decoded diagram too large");
    chunks.push(r.value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder().decode(out);
}
