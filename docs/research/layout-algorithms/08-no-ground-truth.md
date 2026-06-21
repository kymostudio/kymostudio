# 08 — No Ground Truth: "beautiful" can't be fully formalised

| Field       | Value                                                            |
|-------------|------------------------------------------------------------------|
| Document ID | RES-LAYOUT-ALGO-009                                             |
| Version     | 0.1                                                            |
| Issue Date  | 2026-06-21                                                     |
| Status      | Draft                                                         |
| Category    | Meta-problem                                                 |
| Related     | [Index](README.md) · prev [07 Scalability](07-scalability.md) · next [09 Degenerate inputs](09-degenerate-inputs.md) |

## The problem

There is no objective, agreed definition of a "good" layout. The measurable proxies (crossings,
bends, symmetry) correlate with readability but don't capture it; human preference varies by task,
domain, and individual. This is the **meta-problem** sitting under all the others: you can't fully
optimise what you can't fully define.

## Why it's hard

- Aesthetic-metric studies (Purchase et al.) give *partial*, task-dependent rankings, not a formula.
- The **"Turing Test for Graph Drawing"** (Eades, Hong, et al., 2020) found people often *cannot*
  reliably tell algorithm-drawn from human-drawn graphs — evidence that "human quality" is fuzzy and
  that good heuristics already approach it, but also that there's no crisp target to optimise to.
- Different audiences want different things (a compiler engineer vs. a slide author), so a single
  global optimum doesn't exist even in principle.

## Consequence

Every engine, including the best, is **betting on a proxy plus taste**. "Best layout in the market"
therefore is not a provable claim; it is *winning on a chosen proxy* and *winning user perception*.
That is fine — it just means the proxy must be (a) honestly correlated with human judgement and
(b) paired with real human review, never trusted blindly.

## Where kymo stands

kymo's `benches/layout-algorithms/metric.mjs` composite is exactly such a proxy, and `RES-LOOP-002` is explicit
about its limits: the loop is **hybrid-gated and L2** (a human reviews every change), and the very
first step is **calibration** — confirming the score tracks human judgement before any hill-climbing,
so the loop doesn't optimise a bad proxy. This document is the honest framing of why that discipline
matters: chasing the metric without human grounding optimises a number, not a diagram.

> Practical rule (from the loop's design): treat the metric as a *gradient*, not a *verdict*. Use it
> to find candidates and to gate regressions; let a human decide "is this actually nicer?".

## References

- P. Eades, S.-H. Hong, et al. — *A Turing Test for Graph Drawing Algorithms* (2020).
- H. Purchase — empirical aesthetic-metric studies (1997–2002).
- `RES-LOOP-002` (hybrid gate, calibration step), `benches/layout-algorithms/metric.mjs`.
