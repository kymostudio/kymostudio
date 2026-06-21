export const meta = {
  name: 'layout-hillclimb',
  description: 'Hill-climb kymo graph-layout toward best-in-market on an ABSOLUTE quality score',
  whenToUse:
    'Run to push kymo flowchart layout past mermaid.js on the absolute layout-quality metric ' +
    '(crossings, overlap, orthogonality, …). Reward = composite score UP; HYBRID-gated so pixel-Δ, ' +
    'golden layout tests and crate tests never regress. Proposes diffs for review — never auto-merges.',
  phases: [
    { title: 'Baseline', detail: 'score the flowchart corpus, read the leaderboard' },
    { title: 'Hypothesize', detail: 'one kymo-layout fix per round, in an isolated worktree' },
    { title: 'Verify', detail: 'rebuild wasm, re-score, HYBRID gate (quality↑ + no pixel/golden/test regress)' },
  ],
}

// ── The layout-quality hill-climb (RES-LOOP-002 Loop; sibling of mermaid-hillclimb) ─
// Reward  : kComposite (ABSOLUTE layout-quality 0–100, HIGHER better) for the target
//           fixture must RISE. Source: benches/layout-algorithms/layout-quality.mjs →
//           research/assets/<date>-layout-quality/scores.json + leaderboard.json.
// Subject : packages/rust/kymo-layout (dagre.rs / sugiyama.rs) — the graph layout that
//           mermaidToSvgDagre routes through. A fix there is rebuilt to the kymo-mermaid
//           wasm the bench loads, then re-scored.
// HYBRID gate — keep a fix ONLY if ALL hold (pursue #1 while staying safe):
//   (1) target fixture kComposite strictly RISES;
//   (2) pixel-Δ vs mermaid.js does NOT worsen by > EPS_PIXEL (visual-fidelity guard);
//   (3) golden layout tests green: pytest tests/test_layout.py;
//   (4) cargo test -p kymo-layout green;
//   (5) no OTHER fixture's kComposite drops by > EPS.
// Output  : kept fixes as unified diffs for review. Never touches the main tree —
//           every hypothesis runs in its own git worktree (isolation:'worktree').
//
// PRECONDITIONS (local macOS bench harness):
//   - Google Chrome at the default path (override with $CHROME); mmdc + puppeteer-core.
//   - wasm toolchain: wasm-pack + rust wasm32 target.
//   - Bench deps: cd benches/layout-algorithms && npm ci   (and a kymo-mermaid wasm build).
// See benches/layout-algorithms/README.md for the full contract.

const BENCH = 'benches/layout-algorithms'
const WASM_BUILD =
  'cd packages/rust/kymo-mermaid && wasm-pack build --target web --out-dir pkg ' +
  '--out-name kymo_mermaid -- --no-default-features --features wasm,math'
const EPS = 0.5 // composite slack (0–100 units) before a move counts as a regression
const EPS_PIXEL = 0.3 // pixel-Δ slack (×100) before a visual regression
const MAX_DRY = 2 // stop after this many consecutive rounds with no kept fix

const SCORE_SCHEMA = {
  type: 'object',
  required: ['scores'],
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'kComposite', 'mComposite'],
        properties: {
          file: { type: 'string' },
          kComposite: { type: 'number' }, // kymo absolute quality 0–100 (higher better)
          mComposite: { type: 'number' }, // mermaid.js absolute quality 0–100 (the bar)
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
    applied: { type: 'boolean' }, // did the agent actually change kymo-layout?
    rationale: { type: 'string' }, // ONE sentence: why this raises quality (comprehension-debt guard)
    patch: { type: 'string' }, // `git diff` of the worktree change (empty if !applied)
    newComposite: { type: 'number' }, // target fixture kComposite after the change
    pixelDeltaBefore: { type: 'number' }, // target pixel-Δ vs mermaid.js before (×100)
    pixelDeltaAfter: { type: 'number' }, // …after (must not rise > EPS_PIXEL)
    goldenGreen: { type: 'boolean' }, // pytest tests/test_layout.py green?
    testsPass: { type: 'boolean' }, // cargo test -p kymo-layout green?
    otherRegressions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'drop'],
        properties: { file: { type: 'string' }, drop: { type: 'number' } }, // composite DROP on another fixture
      },
    },
  },
}

phase('Baseline')
const base = await agent(
  `Establish the layout-quality baseline.\n` +
    `1. cd ${BENCH} && node layout-quality.mjs --all  (scores the flowchart corpus through kymo + mermaid.js)\n` +
    `2. Read ${BENCH}/research/assets/*-layout-quality/scores.json (latest date) and return, per fixture, ` +
    `file, kComposite (the kymo.composite field), mComposite (the mermaidjs.composite field). ` +
    `Skip any fixture where either engine errored.\n` +
    `Return the scores array verbatim — this is the gradient we climb (HIGHER is better). Do not change any code.`,
  { label: 'baseline', phase: 'Baseline', schema: SCORE_SCHEMA },
)
if (!base || !base.scores?.length) {
  log('Baseline failed — bench produced no scores. Check preconditions (Chrome/mmdc/wasm + npm ci).')
  return { error: 'no-baseline' }
}

// Worst-first: largest gap where kymo TRAILS mermaid, then lowest absolute quality.
const ranked = base.scores
  .filter((s) => s.kComposite < s.mComposite + EPS) // headroom: kymo not already clearly ahead
  .sort((a, b) => (b.mComposite - b.kComposite) - (a.mComposite - a.kComposite) || a.kComposite - b.kComposite)
const meanK = +(base.scores.reduce((s, x) => s + x.kComposite, 0) / base.scores.length).toFixed(2)
const meanM = +(base.scores.reduce((s, x) => s + x.mComposite, 0) / base.scores.length).toFixed(2)
log(`Baseline: kymo mean ${meanK} vs mermaid.js ${meanM} (kymo ${meanK >= meanM ? 'LEADS' : 'trails'}). ` +
    `${ranked.length} fixtures with headroom; worst: ${ranked.slice(0, 3).map((s) => `${s.file}=${s.kComposite.toFixed(1)}`).join(', ')}`)

const kept = []
const tried = new Set()
let dry = 0
let cursor = 0

while (dry < MAX_DRY && cursor < ranked.length) {
  let target = null
  while (cursor < ranked.length) {
    const c = ranked[cursor++]
    if (!tried.has(c.file)) { target = c; break }
  }
  if (!target) break
  tried.add(target.file)

  phase('Hypothesize')
  log(`Round: target ${target.file} (kComposite ${target.kComposite.toFixed(1)}, mermaid ${target.mComposite.toFixed(1)})`)

  const fix = await agent(
    `You are hill-climbing ONE fixture's ABSOLUTE layout quality for kymo's graph layout. ` +
      `You are in an isolated git worktree — changes here never reach the user's tree.\n\n` +
      `TARGET: ${target.file}  (current kComposite=${target.kComposite.toFixed(2)}, mermaid.js bar ` +
      `mComposite=${target.mComposite.toFixed(2)}; the composite is 0–100, HIGHER is better).\n\n` +
      `The metric (benches/layout-algorithms/metric.mjs, per docs/diagrams/best-practices.md §6/§7.6) rewards: fewer edge ` +
      `crossings, no node/edge overlap, orthogonal edges, sane compactness/aspect. Read the per-term breakdown ` +
      `for this fixture in benches/layout-algorithms/research/assets/*-layout-quality/scores.json to see which term is weakest.\n\n` +
      `STEPS:\n` +
      `1. Diagnose the weakest term for ${target.file}. Inspect the source ` +
      `benches/mermaid-format/datasets/mermaid-cypress/flowchart/${target.file}.mmd and the kymo geometry.\n` +
      `2. Make ONE focused fix in packages/rust/kymo-layout (dagre.rs / sugiyama.rs — ranking, ordering, ` +
      `coordinate assignment, or edge routing). Keep it minimal and principled. Do NOT edit the metric or the bench.\n` +
      `3. Rebuild the wasm the bench loads: ${WASM_BUILD}\n` +
      `4. Re-score: cd ${BENCH} && node layout-quality.mjs --all ; read the new scores.json.\n` +
      `5. Visual-fidelity guard: cd benches/mermaid-format && node layout-accuracy.mjs ${target.file} ` +
      `and read its pixel-Δ for this fixture, BEFORE and AFTER your change.\n` +
      `6. Golden + crate tests: cd packages/python && uv run --group dev python -m pytest tests/test_layout.py -q ; ` +
      `and cargo test -p kymo-layout (from packages/rust).\n\n` +
      `Return: targetFile, applied, ONE-sentence rationale, the \`git diff\` patch, newComposite (target ` +
      `kComposite after), pixelDeltaBefore, pixelDeltaAfter, goldenGreen, testsPass, and otherRegressions ` +
      `(any other fixture whose kComposite DROPPED by > ${EPS}). ` +
      `Do NOT edit any metric/golden/scores file to force a pass — improve the layout, not the yardstick.`,
    { label: `fix:${target.file}`, phase: 'Verify', schema: FIX_SCHEMA, isolation: 'worktree' },
  )

  if (!fix || !fix.applied) { dry++; log(`  no change applied (${dry}/${MAX_DRY} dry)`); continue }

  const improved = fix.newComposite > target.kComposite + 1e-6
  const pixelOk = !(fix.pixelDeltaAfter > fix.pixelDeltaBefore + EPS_PIXEL)
  const regressed = (fix.otherRegressions || []).filter((r) => r.drop > EPS)
  const ok = improved && pixelOk && fix.goldenGreen && fix.testsPass && regressed.length === 0

  if (ok) {
    dry = 0
    kept.push({
      file: target.file,
      before: target.kComposite,
      after: fix.newComposite,
      gain: +(fix.newComposite - target.kComposite).toFixed(2),
      rationale: fix.rationale,
      patch: fix.patch,
    })
    log(`  ✓ kept ${target.file}: ${target.kComposite.toFixed(1)} → ${fix.newComposite.toFixed(1)} (${fix.rationale})`)
  } else {
    dry++
    const why = !improved ? 'no quality gain'
      : !pixelOk ? 'pixel-Δ regressed'
      : !fix.goldenGreen ? 'golden layout tests red'
      : !fix.testsPass ? 'cargo tests red'
      : `regressed ${regressed.map((r) => r.file).join(',')}`
    log(`  ✗ rejected ${target.file} (${why}) — ${dry}/${MAX_DRY} dry`)
  }
}

log(`Done. ${kept.length} fix(es) kept for review; converged after ${dry} dry round(s).`)
return {
  kept, // unified diffs for the user to apply — NOT auto-merged
  baseline: { meanKymo: meanK, meanMermaid: meanM },
  triedFiles: [...tried],
  totalGain: +kept.reduce((s, k) => s + k.gain, 0).toFixed(2),
}
