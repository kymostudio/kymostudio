/**
 * URL sharing — mirrors play.d2lang.com: the source is deflate-compressed and
 * base64url-encoded into the `?script=` query param, decoded on load. Ported
 * verbatim from the original vanilla `app.js`; framework-agnostic.
 *
 * Token scheme: a leading "1" means deflate-raw compressed, "0" means raw bytes.
 */

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encodeSource(src: string): Promise<string> {
  const bytes = new TextEncoder().encode(src);
  if (typeof CompressionStream !== "undefined") {
    const cs = new CompressionStream("deflate-raw");
    const w = cs.writable.getWriter();
    void w.write(bytes as BufferSource);
    void w.close();
    const buf = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    return "1" + b64urlEncode(buf);
  }
  return "0" + b64urlEncode(bytes);
}

export async function decodeSource(token: string): Promise<string> {
  const scheme = token[0];
  const bytes = b64urlDecode(token.slice(1));
  if (scheme === "1" && typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("deflate-raw");
    const w = ds.writable.getWriter();
    void w.write(bytes as BufferSource);
    void w.close();
    const out = new Uint8Array(await new Response(ds.readable).arrayBuffer());
    return new TextDecoder().decode(out);
  }
  return new TextDecoder().decode(bytes);
}

/** Compress `source` and write it to the address bar's `?script=` (no reload). */
export async function syncURL(source: string): Promise<void> {
  const token = await encodeSource(source);
  const url = new URL(location.href);
  url.searchParams.set("script", token);
  history.replaceState(null, "", url);
}

/** Decode a shared `?script=` link, or `null` if absent/invalid. */
export async function loadFromURL(): Promise<string | null> {
  const token = new URL(location.href).searchParams.get("script");
  if (!token) return null;
  try {
    return await decodeSource(token);
  } catch {
    return null;
  }
}
