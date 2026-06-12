// Kroki-style URL sharing: the diagram source is deflate-compressed and
// base64url-encoded straight into the link (?s=…&k=<kind>) — no server, no
// account needed. Same encoding as kroki.io GET URLs ("deflate" = zlib),
// so a payload lifted from a kroki URL drops in unchanged.

async function pump(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(out);
}

export async function encodeShare(source: string): Promise<string> {
  const deflated = await pump(new TextEncoder().encode(source), new CompressionStream("deflate"));
  let bin = "";
  for (const b of deflated) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function decodeShare(encoded: string): Promise<string> {
  const bin = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(await pump(bytes, new DecompressionStream("deflate")));
}

export function shareUrl(kind: string, encoded: string): string {
  return location.origin + "/?" + (kind === "kymo" ? "" : "k=" + encodeURIComponent(kind) + "&") + "s=" + encoded;
}
