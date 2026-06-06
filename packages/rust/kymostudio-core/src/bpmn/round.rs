//! Rounding helper — half-to-even, matching Python's built-in `round()`.
//!
//! Rust's `f64::round` rounds half *away from zero*; Python (and the JS
//! `pyRound` in `packages/js/src/round.ts`) round half to *even*. That 1px split
//! at exact `.5` boundaries was the single root cause of every Python↔JS BPMN
//! divergence reconciled in the conformance suite — so use [`py_round`] anywhere
//! Python uses `int(round(...))` (coordinate normalization, centre↔top-left
//! conversion, the whole layout engine).
//!
//! Mirrors `round.ts` exactly (floor + fractional-part test), not Rust's
//! `f64::round`.

/// Round `x` half-to-even and return it as an `i64` (Python `int(round(x))`).
pub fn py_round(x: f64) -> i64 {
    let f = x.floor();
    let diff = x - f;
    let r = if diff < 0.5 {
        f
    } else if diff > 0.5 {
        f + 1.0
    } else {
        // exactly .5 → nearest even
        if (f as i64) % 2 == 0 {
            f
        } else {
            f + 1.0
        }
    };
    r as i64
}

#[cfg(test)]
mod tests {
    use super::py_round;

    #[test]
    fn matches_python_round_half_to_even() {
        // Ties go to the even neighbour (the cases Math.round / f64::round miss).
        assert_eq!(py_round(0.5), 0);
        assert_eq!(py_round(1.5), 2);
        assert_eq!(py_round(2.5), 2);
        assert_eq!(py_round(3.5), 4);
        assert_eq!(py_round(-0.5), 0);
        assert_eq!(py_round(-1.5), -2);
        assert_eq!(py_round(-2.5), -2);
        // Non-ties round normally.
        assert_eq!(py_round(0.49), 0);
        assert_eq!(py_round(0.51), 1);
        assert_eq!(py_round(2.4), 2);
        assert_eq!(py_round(2.6), 3);
        assert_eq!(py_round(-2.6), -3);
        assert_eq!(py_round(10.0), 10);
    }
}
