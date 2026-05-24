/**
 * The reactive store — the load-bearing core of the in-house canvas engine
 * (DESIGN-ENGINE-001 §5). Pure, headless, no DOM and no tldraw.
 *
 * It owns the shape records and a single **source-tagging choke-point**: every
 * mutation funnels through one private `_apply`, and a transaction's `source` is
 * fixed once when the transaction opens. This is what makes the canvas↔text
 * round-trip loop-guard correct (RK-EN-01 / RK-05): a programmatic `text→canvas`
 * apply (`run(fn, { history: "ignore" })`) is `source:"remote"` and therefore
 * never reaches a `{ source: "user" }` listener — no echo. A user gesture is a
 * direct mutation, `source:"user"`, and fires the listener exactly once.
 */

/** A branded shape id. Deterministic ids come from `createShapeId(seed)`. */
export type ShapeId = string & { readonly __brand: "ShapeId" };

/** `createShapeId("kymo-node-x")` → a stable id; no seed → a random one. */
export function createShapeId(seed?: string): ShapeId {
  return `shape:${seed ?? Math.random().toString(36).slice(2)}` as ShapeId;
}

export interface BaseShape<Type extends string = string, Props = Record<string, unknown>> {
  id: ShapeId;
  type: Type;
  /** Top-left in page space. */
  x: number;
  y: number;
  rotation?: number;
  /** Fractional z-order key; assigned on create when omitted (§5.5). */
  index: string;
  parentId?: ShapeId;
  props: Props;
  /** Untyped on purpose — kymo writes `meta.kymo = { id, kind, … }`. */
  meta: Record<string, unknown>;
}

export type Shape = BaseShape;
export type ShapePartial = Partial<Shape> & { id: ShapeId; type: string };

export type ChangeSource = "user" | "remote";
export type ChangeScope = "document" | "session" | "presence";

export interface StoreListenerOpts {
  scope?: ChangeScope;
  source?: ChangeSource;
}

export interface RunOpts {
  history?: "record" | "ignore";
  source?: ChangeSource;
}

export interface HistoryEntry {
  source: ChangeSource;
  scope: ChangeScope;
  added: Shape[];
  updated: { from: Shape; to: Shape }[];
  removed: Shape[];
}

export type StoreListener = (entry: HistoryEntry) => void;

interface Transaction {
  source: ChangeSource;
  history: "record" | "ignore";
  added: Map<ShapeId, Shape>;
  updated: Map<ShapeId, { from: Shape; to: Shape }>;
  removed: Map<ShapeId, Shape>;
}

export class Store {
  private records = new Map<ShapeId, Shape>();
  private listeners: { cb: StoreListener; opts: StoreListenerOpts }[] = [];
  private history: HistoryEntry[] = [];
  private seq = 0;
  private tx: Transaction | null = null;

  // --- queries ---

  get(id: ShapeId): Shape | undefined {
    return this.records.get(id);
  }

  /** All shapes on the page, in `index` (z-)order. */
  getAll(): Shape[] {
    return [...this.records.values()].sort((a, b) =>
      a.index < b.index ? -1 : a.index > b.index ? 1 : 0,
    );
  }

  /** The recorded change log (entries with `history:"record"`). The *consuming*
   *  undo/redo stack is a later feature (canvas-figjam `FR-FJ-02`). */
  getHistory(): HistoryEntry[] {
    return this.history;
  }

  // --- mutations (each opens an implicit `source:"user"` transaction unless
  //     already inside a `run`) ---

  put(shape: ShapePartial): void {
    this.transact(() => this.applyPut(shape));
  }

  putMany(shapes: ShapePartial[]): void {
    this.transact(() => {
      for (const s of shapes) this.applyPut(s);
    });
  }

  update(partial: ShapePartial): void {
    this.transact(() => this.applyUpdate(partial));
  }

  remove(id: ShapeId): void {
    this.transact(() => this.applyRemove(id));
  }

  removeMany(ids: ShapeId[]): void {
    this.transact(() => {
      for (const id of ids) this.applyRemove(id);
    });
  }

  /**
   * Batch writes into a single transaction with one end-of-transaction flush.
   * Programmatic by default (`source:"remote"`); pass `{ source: "user" }` for a
   * batched user gesture. `{ history: "ignore" }` excludes the change from the
   * recorded log (and so, later, from undo).
   */
  run(fn: () => void, opts: RunOpts = {}): void {
    if (this.tx) {
      // Nested: join the parent transaction (its source/history win).
      fn();
      return;
    }
    this.tx = newTx(opts.source ?? "remote", opts.history ?? "record");
    try {
      fn();
    } finally {
      const tx = this.tx;
      this.tx = null;
      this.flush(tx);
    }
  }

  listen(cb: StoreListener, opts: StoreListenerOpts = {}): () => void {
    const entry = { cb, opts };
    this.listeners.push(entry);
    return () => {
      const i = this.listeners.indexOf(entry);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  // --- internals ---

  /** Wrap a direct mutation in an implicit `source:"user"` transaction, unless
   *  one is already open (then join it — the choke-point that fixes source). */
  private transact(body: () => void): void {
    if (this.tx) {
      body();
      return;
    }
    this.tx = newTx("user", "record");
    try {
      body();
    } finally {
      const tx = this.tx;
      this.tx = null;
      this.flush(tx);
    }
  }

  private applyPut(input: ShapePartial): void {
    const shape: Shape = {
      id: input.id,
      type: input.type,
      x: input.x ?? 0,
      y: input.y ?? 0,
      rotation: input.rotation,
      index: input.index ?? this.nextIndex(),
      parentId: input.parentId,
      props: { ...(input.props ?? {}) },
      meta: { ...(input.meta ?? {}) },
    };
    this.records.set(shape.id, shape);
    this.tx!.added.set(shape.id, shape);
  }

  private applyUpdate(partial: ShapePartial): void {
    const prev = this.records.get(partial.id);
    if (!prev) return;
    const next: Shape = { ...prev };
    if (partial.x !== undefined) next.x = partial.x;
    if (partial.y !== undefined) next.y = partial.y;
    if (partial.rotation !== undefined) next.rotation = partial.rotation;
    if (partial.index !== undefined) next.index = partial.index;
    if (partial.parentId !== undefined) next.parentId = partial.parentId;
    if (partial.props) next.props = { ...prev.props, ...partial.props };
    if (partial.meta) next.meta = { ...prev.meta, ...partial.meta };
    this.records.set(next.id, next);
    // If this shape was created earlier in the same transaction, keep it in
    // `added` (net effect is an add), just with the merged value.
    if (this.tx!.added.has(next.id)) {
      this.tx!.added.set(next.id, next);
    } else {
      const existing = this.tx!.updated.get(next.id);
      this.tx!.updated.set(next.id, { from: existing?.from ?? prev, to: next });
    }
  }

  private applyRemove(id: ShapeId): void {
    const prev = this.records.get(id);
    if (!prev) return;
    this.records.delete(id);
    this.tx!.added.delete(id);
    this.tx!.updated.delete(id);
    this.tx!.removed.set(id, prev);
  }

  private flush(tx: Transaction): void {
    if (tx.added.size === 0 && tx.updated.size === 0 && tx.removed.size === 0) {
      return; // no-op transaction → no notification
    }
    const entry: HistoryEntry = {
      source: tx.source,
      scope: "document",
      added: [...tx.added.values()],
      updated: [...tx.updated.values()],
      removed: [...tx.removed.values()],
    };
    if (tx.history !== "ignore") this.history.push(entry);
    for (const { cb, opts } of [...this.listeners]) {
      if (opts.scope !== undefined && opts.scope !== entry.scope) continue;
      if (opts.source !== undefined && opts.source !== entry.source) continue;
      cb(entry);
    }
  }

  /** Monotonic, fixed-width base-36 key → lexicographically sortable. */
  private nextIndex(): string {
    return (this.seq++).toString(36).padStart(10, "0");
  }
}

function newTx(source: ChangeSource, history: "record" | "ignore"): Transaction {
  return { source, history, added: new Map(), updated: new Map(), removed: new Map() };
}
