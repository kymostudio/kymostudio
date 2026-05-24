/**
 * Rounding helper shared by the layout/alignment stages.
 *
 * Round half-to-even, matching Python's built-in `round()` — so positions,
 * grid snapping, lane offsets and edge waypoints land on the same pixels as the
 * Python implementation. `Math.round` differs only at exact .5 boundaries,
 * where it rounds up; that 1px split is exactly what the Python↔JS conformance
 * suite (`conformance/`) guards against, so use `pyRound` anywhere Python uses
 * `int(round(...))`.
 */
export function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff < 0.5) return f;
  if (diff > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1; // exactly .5 → nearest even
}
