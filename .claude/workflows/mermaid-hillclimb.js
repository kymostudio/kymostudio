export const meta = {
  name: 'mermaid-hillclimb',
  description: 'Hill-climb the kymo-mermaid renderer against the worst-10 pixel-diff fixtures',
  whenToUse:
    'Run to incrementally narrow the kymo↔mermaid.js visual gap on the worst flowchart fixtures. ' +
    'Offline (no deploy), reward is a real number (pixel-diff Δ), guarded against regressions. ' +
    'Proposes fixes for human review — never auto-merges to the working tree.',
  phases: [
    { title: 'Baseline', detail: 'render worst-10 through all engines, read scores.json' },
    { title: 'Hypothesize', detail: 'one renderer fix per round, in an isolated worktree' },
    { title: 'Verify', detail: 'rebuild wasm, re-score, gate on Δ + no-regression + tests' },
  ],
}

// ── Loop B: the "hill-climbing" loop from the loop-engineering design ─────────
// Reward  : kScore (kymo pixel-diff vs the mmdc reference) for the target file
//           must DROP. Lower = closer to mermaid.js. Source of the number:
//             benches/mermaid-format/worst10-grid.mjs
//               → research/assets/2026-06-16-worst10/scores.json  (kScore/mScore ×100)
// Subject : the Rust crate packages/rust/kymo-mermaid (mermaidToSvgDagre). A fix
//           there is rebuilt to wasm, then re-scored.
// Guards  : (1) the target file's kScore strictly improves;
//           (2) no OTHER worst-10 file's kScore regresses by > EPS;
//           (3) `cargo test -p kymo-mermaid` stays green.
// Output  : kept fixes as unified diffs for the user to apply. This workflow
//           does NOT touch the main working tree — every hypothesis runs in its
//           own git worktree (isolation:'worktree'), which is auto-discarded.
//
// PRECONDITIONS (this is a local macOS bench harness):
//   - Google Chrome at the default macOS path (override with $CHROME).
//   - @mermaid-js/mermaid-cli (mmdc) + puppeteer-core available to the bench.
//   - wasm toolchain: `wasm-pack` + rust wasm32 target.
//   - Bench deps installed: cd benches/mermaid-format && npm ci
// See benches/mermaid-format/README.md for the full bench contract.

const BENCH = 'benches/mermaid-format'
const SCORES = `${BENCH}/research/assets/2026-06-16-worst10/scores.json`
const EPS = 0.2 // allowed slack (in ×100 score units) before "regression"
const MAX_DRY = 2 // stop after this many consecutive rounds with no kept fix

const SCORE_SCHEMA = {
  type: 'object',
  required: ['scores'],
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'kScore', 'mScore'],
        properties: {
          file: { type: 'string' },
          kScore: { type: 'number' }, // kymo pixel-diff ×100 (lower better)
          mScore: { type: 'number' }, // merman pixel-diff ×100 (reference baseline)
        },
      },
    },
  },
}

const FIX_SCHEMA = {
  type: 'object',
  required: ['targetFile', 'applied', 'rationale'],
  properties: {
    targetFile: { type: 'string' },
    applied: { type: 'boolean' }, // did the agent actually change kymo-mermaid?
    rationale: { type: 'string' }, // ONE sentence: why this should narrow Δ (comprehension debt guard)
    patch: { type: 'string' }, // `git diff` of the worktree change (empty if !applied)
    newKScore: { type: 'number' }, // target file kScore after the change
    otherRegressions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'delta'],
        properties: { file: { type: 'string' }, delta: { type: 'number' } },
      },
    },
    testsPass: { type: 'boolean' }, // `cargo test -p kymo-mermaid` green?
  },
}

phase('Baseline')
const base = await agent(
  `Establish the hill-climb baseline for the kymo-mermaid renderer.\n` +
    `1. cd ${BENCH} && node worst10-grid.mjs  (renders worst-10 through kymo/merman/mmdc, writes scores.json)\n` +
    `2. Read ${SCORES} and return its per-file kScore + mScore.\n` +
    `Return the scores array verbatim — this is the gradient we climb. Do not change any code.`,
  { label: 'baseline', phase: 'Baseline', schema: SCORE_SCHEMA },
)
if (!base || !base.scores?.length) {
  log('Baseline failed — bench did not produce scores.json. Check preconditions (Chrome/mmdc/wasm).')
  return { error: 'no-baseline' }
}

// Worst kymo file first; skip files where kymo already matches/beats merman.
const ranked = base.scores
  .filter((s) => s.kScore > s.mScore - EPS)
  .sort((a, b) => b.kScore - a.kScore)
log(`Baseline: ${base.scores.length} files; ${ranked.length} with headroom. ` +
    `Worst kymo: ${ranked.map((s) => `${s.file}=${s.kScore.toFixed(1)}`).slice(0, 3).join(', ')}`)

const kept = []
const tried = new Set()
let dry = 0
let cursor = 0

while (dry < MAX_DRY && cursor < ranked.length) {
  // next untried file with headroom
  let target = null
  while (cursor < ranked.length) {
    const c = ranked[cursor++]
    if (!tried.has(c.file)) { target = c; break }
  }
  if (!target) break
  tried.add(target.file)

  phase('Hypothesize')
  log(`Round: target ${target.file} (kScore ${target.kScore.toFixed(1)}, merman ${target.mScore.toFixed(1)})`)

  const fix = await agent(
    `You are hill-climbing ONE fixture's pixel-diff for the kymo-mermaid renderer. ` +
      `You are in an isolated git worktree — changes here never reach the user's tree.\n\n` +
      `TARGET: ${target.file}  (current kymo kScore=${target.kScore.toFixed(2)}, ` +
      `merman reference mScore=${target.mScore.toFixed(2)}; lower is closer to the mmdc reference).\n\n` +
      `STEPS:\n` +
      `1. Inspect the fixture render gap: open ${BENCH}/datasets/mermaid-cypress/flowchart/${target.file}.mmd ` +
      `and the rendered PNGs under ${BENCH}/research/assets/2026-06-16-worst10/{kymo,mermaidjs}/${target.file}.png. ` +
      `Diagnose ONE concrete cause of the kymo↔mermaid.js visual difference (label wrapping, node sizing, ` +
      `edge routing, classDef fill, KaTeX math, etc.).\n` +
      `2. Make ONE focused fix in packages/rust/kymo-mermaid (the mermaidToSvgDagre path). Keep it minimal.\n` +
      `3. Rebuild the wasm the bench loads: cd packages/rust/kymo-mermaid && ` +
      `wasm-pack build --target web --out-dir pkg --out-name kymo_mermaid -- --features wasm,full,katex-layout\n` +
      `4. Re-score: cd ${BENCH} && node worst10-grid.mjs ; then read ${SCORES}.\n` +
      `5. Run crate tests: cargo test -p kymo-mermaid (from packages/rust).\n\n` +
      `Return: targetFile, applied, ONE-sentence rationale, the \`git diff\` patch, the target's newKScore, ` +
      `otherRegressions (any other worst-10 file whose kScore rose by > ${EPS}), and testsPass. ` +
      `Do NOT regenerate or edit any golden/scores file to force a pass — reconcile the renderer, not the metric.`,
    { label: `fix:${target.file}`, phase: 'Verify', schema: FIX_SCHEMA, isolation: 'worktree' },
  )

  if (!fix || !fix.applied) { dry++; log(`  no change applied (${dry}/${MAX_DRY} dry)`); continue }

  const improved = fix.newKScore < target.kScore - 1e-6
  const regressed = (fix.otherRegressions || []).filter((r) => r.delta > EPS)
  const ok = improved && fix.testsPass && regressed.length === 0

  if (ok) {
    dry = 0
    kept.push({
      file: target.file,
      before: target.kScore,
      after: fix.newKScore,
      gain: +(target.kScore - fix.newKScore).toFixed(2),
      rationale: fix.rationale,
      patch: fix.patch,
    })
    log(`  ✓ kept ${target.file}: ${target.kScore.toFixed(1)} → ${fix.newKScore.toFixed(1)} (${fix.rationale})`)
  } else {
    dry++
    const why = !improved ? 'no Δ gain' : !fix.testsPass ? 'tests red' : `regressed ${regressed.map((r) => r.file).join(',')}`
    log(`  ✗ rejected ${target.file} (${why}) — ${dry}/${MAX_DRY} dry`)
  }
}

log(`Done. ${kept.length} fix(es) kept for review; converged after ${dry} dry round(s).`)
return {
  kept, // unified diffs for the user to apply — NOT auto-merged
  triedFiles: [...tried],
  totalGain: +kept.reduce((s, k) => s + k.gain, 0).toFixed(2),
}
