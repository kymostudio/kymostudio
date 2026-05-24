/**
 * The Editor facade (DESIGN-ENGINE-001 §6, FR-EN-01) — a thin imperative wrapper
 * over the reactive store, shaped like tldraw's `Editor` so `Board.tsx` /
 * `Inspector.tsx` port with no logic change. Headless: it adds selection and
 * camera *state* over the store; the DOM render loop that consumes the camera
 * is a later phase (§8.2).
 *
 * Geometry note (§7 lands in Phase 4): `createShape` fills defaults and
 * `zoomToFit` measures shapes via an optional, structural `ShapeUtilLike`
 * registry. Until real utils are registered, `zoomToFit` falls back to the
 * shape's `x/y` + `props.w/h` — faithful for kymo shapes, which carry `w/h`.
 */
import {
  Store,
  type RunOpts,
  type Shape,
  type ShapeId,
  type ShapePartial,
} from "./store.js";
import type { Box, Vec } from "./shape.js";

export interface Camera {
  x: number;
  y: number;
  z: number;
}

/** The slice of a shape util the editor needs. Phase 4's `ShapeUtil` satisfies
 *  this structurally (it adds `validateProps` + a real `getGeometry`). */
export interface ShapeUtilLike {
  type: string;
  getDefaultProps?(): Record<string, unknown>;
  getGeometry?(shape: Shape): { bounds: Box };
  validateProps?(props: Record<string, unknown>, opts?: { partial?: boolean }): void;
}

export interface EditorOptions {
  shapeUtils?: ShapeUtilLike[];
  viewport?: { w: number; h: number };
}

/** Fallback shape size when no util geometry is available (px). */
const DEFAULT_SHAPE_SIZE = 100;
/** Default headless viewport; the render layer sets the real size (§8.2). */
const DEFAULT_VIEWPORT = { w: 1024, h: 768 };
/** Fraction of the viewport the fitted content fills. */
const DEFAULT_PADDING = 0.9;
/** Zoom clamp (§8.1). */
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;

export class Editor {
  readonly store: Store;
  private utils = new Map<string, ShapeUtilLike>();
  private selected = new Set<ShapeId>();
  private camera: Camera = { x: 0, y: 0, z: 1 };
  private viewport: { w: number; h: number };

  constructor(store: Store, opts: EditorOptions = {}) {
    this.store = store;
    for (const u of opts.shapeUtils ?? []) this.utils.set(u.type, u);
    this.viewport = opts.viewport ?? { ...DEFAULT_VIEWPORT };
  }

  // --- queries ---

  /** All shapes on the page, in `index` (z-)order. */
  getCurrentPageShapes(): Shape[] {
    return this.store.getAll();
  }

  getShape(id: ShapeId): Shape | undefined {
    return this.store.get(id);
  }

  // --- mutations ---

  createShape(shape: ShapePartial): void {
    const final = this.withDefaults(shape);
    this.validate(final);
    this.store.put(final);
  }

  createShapes(shapes: ShapePartial[]): void {
    const finals = shapes.map((s) => this.withDefaults(s));
    for (const f of finals) this.validate(f);
    this.store.run(() => {
      for (const f of finals) this.store.put(f);
    }, { source: "user" });
  }

  updateShape(partial: ShapePartial): void {
    this.validate(partial, { partial: true });
    this.store.update(partial);
  }

  deleteShape(id: ShapeId): void {
    this.store.remove(id);
    this.selected.delete(id);
  }

  deleteShapes(ids: ShapeId[]): void {
    this.store.removeMany(ids);
    for (const id of ids) this.selected.delete(id);
  }

  run(fn: () => void, opts?: RunOpts): void {
    this.store.run(fn, opts);
  }

  // --- selection (state; tools set it in Phase 6, Inspector reads it) ---

  select(ids: ShapeId[]): void {
    this.selected = new Set(ids);
  }

  getSelectedShapeIds(): ShapeId[] {
    return [...this.selected];
  }

  getOnlySelectedShape(): Shape | undefined {
    if (this.selected.size !== 1) return undefined;
    const [id] = this.selected;
    return this.store.get(id);
  }

  // --- camera (state; the render transform consumes it in Phase 5, §8) ---

  getCamera(): Camera {
    return { ...this.camera };
  }

  setCamera(camera: Camera): void {
    this.camera = { ...camera };
  }

  setViewportSize(size: { w: number; h: number }): void {
    this.viewport = { ...size };
  }

  /** Screen → page, inverting `screen = (page + cam) * z` (§8.1). */
  screenToPage(p: Vec): Vec {
    return { x: p.x / this.camera.z - this.camera.x, y: p.y / this.camera.z - this.camera.y };
  }

  /** Pan by a screen-space delta (e.g. a drag on empty canvas). */
  panBy(dxScreen: number, dyScreen: number): void {
    const { z } = this.camera;
    this.camera = { ...this.camera, x: this.camera.x + dxScreen / z, y: this.camera.y + dyScreen / z };
  }

  /** Zoom toward a screen point, keeping the page point under it fixed. */
  zoomToPoint(nextZ: number, screen: Vec): void {
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZ));
    const before = this.screenToPage(screen);
    // Choose cam so screenToPage(screen) at the new z still equals `before`.
    this.camera = { x: screen.x / z - before.x, y: screen.y / z - before.y, z };
  }

  /**
   * Fit the camera to the union of all shape world-bounds, centred, leaving a
   * padding margin (§8.3). Empty page → no-op. Deterministic, so idempotent;
   * touches only the camera.
   */
  zoomToFit(opts: { padding?: number } = {}): void {
    const shapes = this.getCurrentPageShapes();
    if (shapes.length === 0) return;
    const padding = opts.padding ?? DEFAULT_PADDING;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const s of shapes) {
      const b = this.worldBounds(s);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }

    const cw = maxX - minX;
    const ch = maxY - minY;
    const { w: vw, h: vh } = this.viewport;
    // screen = (page + cam) * z  (§8.1)
    const z = cw > 0 && ch > 0 ? Math.min(vw / cw, vh / ch) * padding : 1;
    const cx = minX + cw / 2;
    const cy = minY + ch / 2;
    this.camera = { x: vw / 2 / z - cx, y: vh / 2 / z - cy, z };
  }

  // --- internals ---

  private withDefaults(shape: ShapePartial): ShapePartial {
    const util = this.utils.get(shape.type);
    if (!util?.getDefaultProps) return shape;
    return { ...shape, props: { ...util.getDefaultProps(), ...(shape.props ?? {}) } };
  }

  /** Validate a shape's props against its util's declared validators (§9.2). */
  private validate(shape: ShapePartial, opts?: { partial?: boolean }): void {
    const util = this.utils.get(shape.type);
    if (util?.validateProps && shape.props) util.validateProps(shape.props, opts);
  }

  /** World-space bounds: util geometry if available, else `x/y` + `props.w/h`. */
  private worldBounds(shape: Shape): Box {
    const util = this.utils.get(shape.type);
    if (util?.getGeometry) {
      const { bounds } = util.getGeometry(shape);
      return { x: shape.x + bounds.x, y: shape.y + bounds.y, w: bounds.w, h: bounds.h };
    }
    const w = numberOr(shape.props.w, DEFAULT_SHAPE_SIZE);
    const h = numberOr(shape.props.h, DEFAULT_SHAPE_SIZE);
    return { x: shape.x, y: shape.y, w, h };
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
