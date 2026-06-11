const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// 16 random base62 chars ≈ 95 bits — the room id doubles as the share secret,
// so it needs real entropy (the old 8-hex slice was 32 bits).
export function newId(len = 16): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

// Derive a display title from the first node label: A[Nhận đơn hàng] → "Nhận đơn hàng".
export function titleFrom(source: string): string {
  // Strip the block wrapper ("flowchart TD {" … "}") so its braces don't match as a diamond node.
  const body = source.replace(/^\s*(?:flowchart|bpmn)[^{]*\{/i, "");
  const m = body.match(/\[([^\]]+)\]|\(\(([^()]+)\)\)|\{([^{}]+)\}|\(([^()]+)\)/);
  const t = ((m && (m[1] || m[2] || m[3] || m[4])) || "").trim();
  return t ? t.slice(0, 60) : "Untitled";
}
