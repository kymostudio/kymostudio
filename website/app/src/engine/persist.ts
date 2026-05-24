/**
 * canvas-engine Phase 7 — board persistence (DESIGN-ENGINE-001 §11, FR-EN-07).
 * Replaces tldraw's `persistenceKey`: a small snapshot in IndexedDB, restored on
 * reload. Kymo shapes are re-derived from the `.kymo` text (and round-trip via
 * the URL), so the snapshot persists the **camera** (pan/zoom) and reserves a
 * `freeform` field for the whiteboard layer that arrives in `canvas-figjam`.
 *
 * Browser-coupled (IndexedDB) → lives in the app, like the rest of the render
 * layer; the headless `packages/js-canvas` core stays pure.
 */

const DB_NAME = "kymo-engine";
const STORE = "canvas";
const KEY = "snapshot";
const SCHEMA_VERSION = 1;
const SAVE_DEBOUNCE_MS = 400;

export interface Snapshot {
  schemaVersion: number;
  camera: { x: number; y: number; z: number };
  /** Freeform (non-kymo) shapes — empty until the FigJam tools land (canvas-figjam). */
  freeform: unknown[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Read the snapshot, or `null` on miss / schema mismatch (a safe drop). */
export async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const db = await openDb();
    const snap = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!snap || typeof snap !== "object") return null;
    const s = snap as Partial<Snapshot>;
    if (s.schemaVersion !== SCHEMA_VERSION || !s.camera) return null;
    return s as Snapshot;
  } catch {
    return null; // IndexedDB unavailable (private mode, etc.) → no persistence
  }
}

let saveTimer: number | undefined;

/** Debounced write of the snapshot (always stamps the current schema version). */
export function saveSnapshot(snap: Omit<Snapshot, "schemaVersion">): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const full: Snapshot = { schemaVersion: SCHEMA_VERSION, ...snap };
    void (async () => {
      try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(full, KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      } catch {
        // best-effort — persistence failure must never break the board
      }
    })();
  }, SAVE_DEBOUNCE_MS);
}
