// Request decoding: the three kroki API shapes normalize to one RenderRequest.
//
//   GET  /{kind}/{format}/{encoded}     encoded = deflate+base64url (codec.ts)
//   POST /{kind}/{format}               text/plain body
//   POST /{kind}                        text/plain body, format via Accept
//   POST /                              JSON {diagram_source, diagram_type, output_format}
import { decodeKrokiSource } from "./codec.js";
import { HttpError, type Format } from "./http.js";

export interface RenderRequest {
  kind: string;
  format: Format;
  source: string;
  /** PNG raster scale (?scale= on any shape), clamped to [1, 4]. */
  scale: number;
}

const MAX_BODY = 512 * 1024; // mirrors the mcp proxy's cap

const FORMATS = new Set<string>(["svg", "png", "pdf"]);

const ACCEPT_FORMATS: [string, Format][] = [
  ["image/svg+xml", "svg"],
  ["image/png", "png"],
  ["application/pdf", "pdf"],
];

function parseFormat(format: string): Format {
  if (!FORMATS.has(format)) {
    throw new HttpError(400, `unsupported output format "${format}" (svg, png, pdf)`);
  }
  return format as Format;
}

function acceptFormat(accept: string | null): Format {
  for (const [mime, format] of ACCEPT_FORMATS) {
    if (accept?.includes(mime)) return format;
  }
  return "svg";
}

function parseScale(url: URL): number {
  const raw = url.searchParams.get("scale");
  if (raw === null) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, `scale must be a positive number, got "${raw}"`);
  return Math.min(Math.max(n, 1), 4);
}

async function readBody(request: Request): Promise<string> {
  const source = await request.text();
  if (source.length > MAX_BODY) throw new HttpError(413, "diagram source too large");
  if (!source.trim()) throw new HttpError(400, "empty diagram source");
  return source;
}

/** Decode any of the kroki request shapes; null = not a render route. */
export async function decodeRequest(request: Request, url: URL): Promise<RenderRequest | null> {
  const scale = parseScale(url);
  const segments = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && segments.length === 3) {
    const [kind, format, encoded] = segments;
    return { kind, format: parseFormat(format), source: await decodeKrokiSource(encoded), scale };
  }

  if (request.method === "POST" && segments.length === 0) {
    let body: { diagram_source?: unknown; diagram_type?: unknown; output_format?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "invalid JSON body");
    }
    const { diagram_source, diagram_type, output_format } = body;
    if (typeof diagram_source !== "string" || typeof diagram_type !== "string") {
      throw new HttpError(400, "diagram_source and diagram_type are required");
    }
    if (diagram_source.length > MAX_BODY) throw new HttpError(413, "diagram source too large");
    if (!diagram_source.trim()) throw new HttpError(400, "empty diagram source");
    const format =
      output_format === undefined ? acceptFormat(request.headers.get("accept")) : parseFormat(String(output_format));
    return { kind: diagram_type, format, source: diagram_source, scale };
  }

  if (request.method === "POST" && segments.length === 2) {
    const [kind, format] = segments;
    return { kind, format: parseFormat(format), source: await readBody(request), scale };
  }

  if (request.method === "POST" && segments.length === 1) {
    return {
      kind: segments[0],
      format: acceptFormat(request.headers.get("accept")),
      source: await readBody(request),
      scale,
    };
  }

  return null;
}
