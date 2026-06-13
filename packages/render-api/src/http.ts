/** An error that already knows its HTTP status. Anything else becomes a 500. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-expose-headers": "x-render-cache, x-render-api-version",
};

export type Format = "svg" | "png" | "pdf";

export const CONTENT_TYPES: Record<Format, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  pdf: "application/pdf",
};
