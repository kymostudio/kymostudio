/**
 * The custom-shape API (DESIGN-ENGINE-001 §7, §9, FR-EN-03): `Rectangle2d`
 * geometry, the `T` prop validators, and the `ShapeUtil` base class.
 *
 * Headless by design: the render hooks (`component`/`getIndicatorPath`/`toSvg`)
 * are declared **render-agnostic** (`unknown`) so this package pulls in no React
 * or DOM types. The Phase-5 React bindings narrow them to `ReactNode`/`Path2D`
 * (a covariant override), and the app's `KymoNodeShapeUtil` extends this base
 * unchanged apart from the import path.
 */
import type { Shape } from "./store.js";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec {
  x: number;
  y: number;
}

// --- §7 Geometry -----------------------------------------------------------

/** A rectangle used for hit-testing, selection bounds, and the zoom-to-fit
 *  union. The only geometry the kymo shapes use. */
export class Rectangle2d {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly isFilled: boolean;

  constructor(opts: { width: number; height: number; isFilled?: boolean; x?: number; y?: number }) {
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.w = opts.width;
    this.h = opts.height;
    this.isFilled = opts.isFilled ?? false;
  }

  /** Shape-local bounds. */
  get bounds(): Box {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /** Filled → inside the box (± `margin`); else within `margin` of the border. */
  hitTestPoint(p: Vec, margin = 0): boolean {
    const { x, y, w, h } = this;
    const inOuter =
      p.x >= x - margin && p.x <= x + w + margin && p.y >= y - margin && p.y <= y + h + margin;
    if (this.isFilled) return inOuter;
    const inInner =
      p.x > x + margin && p.x < x + w - margin && p.y > y + margin && p.y < y + h - margin;
    return inOuter && !inInner;
  }

  /** Rectangle as an SVG path — the default selection indicator (§9.1). */
  toSvgPath(): string {
    const { x, y, w, h } = this;
    return `M${x},${y} h${w} v${h} h${-w} Z`;
  }
}

// --- §9.2 Prop validators (`T`) --------------------------------------------

export interface Validator<T> {
  validate(value: unknown): T;
}

const number: Validator<number> = {
  validate(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`Expected a finite number, got ${describe(value)}`);
    }
    return value;
  },
};

const string: Validator<string> = {
  validate(value) {
    if (typeof value !== "string") throw new TypeError(`Expected a string, got ${describe(value)}`);
    return value;
  },
};

const boolean: Validator<boolean> = {
  validate(value) {
    if (typeof value !== "boolean") throw new TypeError(`Expected a boolean, got ${describe(value)}`);
    return value;
  },
};

function literal<V extends string | number | boolean>(lit: V): Validator<V> {
  return {
    validate(value) {
      if (value !== lit) throw new TypeError(`Expected ${JSON.stringify(lit)}, got ${describe(value)}`);
      return lit;
    },
  };
}

function optional<U>(inner: Validator<U>): Validator<U | undefined> {
  return {
    validate(value) {
      return value === undefined ? undefined : inner.validate(value);
    },
  };
}

export const T = { number, string, boolean, literal, optional };

function describe(value: unknown): string {
  return value === null ? "null" : typeof value;
}

// --- §9.1 Custom-shape base ------------------------------------------------

/**
 * Base class for shape utils. Subclasses set `static type` and (optionally)
 * `static props`, and implement `getDefaultProps` + `getGeometry`. The render
 * hooks are optional here (filled by the React layer in Phase 5).
 */
export abstract class ShapeUtil<S extends Shape = Shape> {
  static type = "";
  static props?: Record<string, Validator<unknown>>;

  /** Instance mirror of `static type` — the editor registry keys utils by it. */
  get type(): string {
    return (this.constructor as typeof ShapeUtil).type;
  }

  abstract getDefaultProps(): S["props"];
  abstract getGeometry(shape: S): Rectangle2d;

  // Render hooks — render-agnostic (Phase 5 narrows to ReactNode / Path2D).
  component?(shape: S): unknown;
  getIndicatorPath?(shape: S): unknown;
  toSvg?(shape: S): unknown;

  canResize(): boolean {
    return true;
  }
  canEdit(): boolean {
    return false;
  }
  hideRotateHandle(): boolean {
    return false;
  }

  /**
   * Validate props against `static props` (§9.2). No-op in production or when no
   * validators are declared. When `partial`, only validates the keys present —
   * for `updateShape`, which carries a subset.
   */
  validateProps(props: Record<string, unknown>, opts: { partial?: boolean } = {}): void {
    if (process.env.NODE_ENV === "production") return;
    const validators = (this.constructor as typeof ShapeUtil).props;
    if (!validators) return;
    for (const [key, validator] of Object.entries(validators)) {
      if (opts.partial && !(key in props)) continue;
      validator.validate(props[key]);
    }
  }
}
