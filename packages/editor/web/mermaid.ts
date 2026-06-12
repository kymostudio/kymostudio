// Mermaid renders IN-BROWSER (mermaid.js, a lazy chunk) — kroki is only the
// share-link warm-up path. Rules of the race:
//   - a pristine share link has an early proxy warm-up in flight (index.html);
//     give it EARLY_WINDOW_MS to answer — an edge cache hit returns in ~300 ms
//     and costs zero extra bytes (the mermaid chunk is never downloaded);
//   - a cache miss, a kroki outage, or any later render (typing) goes local:
//     no kroki round-trip per keystroke, immune to kroki's bad days, works
//     offline once the chunk is cached.
import { earlyResponse } from "./kroki";

let mod: Promise<any> | null = null;
function loadMermaid(): Promise<any> {
  return (mod ??= import("mermaid").then((m) => {
    m.default.initialize({ startOnLoad: false, securityLevel: "strict" });
    return m.default;
  }));
}

let n = 0;
async function renderLocal(source: string): Promise<string> {
  const mermaid = await loadMermaid();
  const { svg } = await mermaid.render(`mmd-${++n}`, source);
  return svg;
}

// An edge cache hit answers well under this; a kroki cache-miss render takes
// seconds — past the window, downloading mermaid.js locally is the faster path.
const EARLY_WINDOW_MS = 900;

export async function renderMermaid(source: string): Promise<string> {
  const early = await Promise.race([
    earlyResponse("mermaid", source),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), EARLY_WINDOW_MS)),
  ]);
  if (early && early.ok) return await early.text();
  return renderLocal(source);
}
