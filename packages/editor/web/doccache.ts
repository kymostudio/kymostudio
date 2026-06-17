// Optimistic per-diagram document cache (stale-while-revalidate).
//
// A saved tab's content lives in its room (Durable Object), fetched over a
// WebSocket on load. Without a cache the editor shows a loader for that whole
// round-trip and then re-renders code + preview — a visible "full reload" on
// every page load. We instead persist the last doc we showed (source, kind,
// title, rendered SVG) keyed by diagram id, seed it synchronously at mount so
// the first paint is real content, and let the room sync reconcile in the
// background (identical content => React bails, no flash).
//
// Storage is bounded: oversized sources/SVGs are skipped, and an LRU ring keeps
// only the most-recently-used handful of diagrams so localStorage never fills.

const PFX = "kymo_doc:";
const INDEX = "kymo_doc_ids";
const MAX_SOURCE = 80_000; // chars — bigger sources skip the cache (rare)
const MAX_SVG = 400_000; // chars — skip caching very large renders
const KEEP = 40; // most-recent diagrams to retain

export type DocSnap = { source: string; kind: string; title: string; svg: string };

export function readDoc(id: string | null): DocSnap | null {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(PFX + id);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d && typeof d.source === "string") {
      return { source: d.source, kind: d.kind || "kymo", title: d.title || "", svg: typeof d.svg === "string" ? d.svg : "" };
    }
  } catch {}
  return null;
}

export function writeDoc(id: string | null, snap: DocSnap): void {
  if (!id || snap.source.length > MAX_SOURCE) return;
  const svg = snap.svg.length > MAX_SVG ? "" : snap.svg; // keep source even if the SVG is too big
  try {
    const next = JSON.stringify({ source: snap.source, kind: snap.kind, title: snap.title, svg });
    if (localStorage.getItem(PFX + id) === next) return; // unchanged — skip the write
    localStorage.setItem(PFX + id, next);
    bump(id);
  } catch {
    // Quota hit: drop this entry rather than wedge the editor.
    try { localStorage.removeItem(PFX + id); } catch {}
  }
}

// Move `id` to the front of the LRU ring and evict anything past KEEP.
function bump(id: string): void {
  let ids: string[] = [];
  try { ids = JSON.parse(localStorage.getItem(INDEX) || "[]"); } catch {}
  ids = [id, ...ids.filter((x) => x !== id)];
  while (ids.length > KEEP) {
    const old = ids.pop();
    if (old) try { localStorage.removeItem(PFX + old); } catch {}
  }
  try { localStorage.setItem(INDEX, JSON.stringify(ids)); } catch {}
}

// Forget a diagram's cache (e.g. on delete) so a stale snapshot can't resurface.
export function dropDoc(id: string | null): void {
  if (!id) return;
  try {
    localStorage.removeItem(PFX + id);
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem(INDEX) || "[]"); } catch {}
    localStorage.setItem(INDEX, JSON.stringify(ids.filter((x) => x !== id)));
  } catch {}
}
