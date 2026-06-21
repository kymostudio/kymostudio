---
name: fmt-sweep
description: Fix a red "Format & clippy" (rust.yml) CI job on kymostudio — auto-apply cargo fmt, verify the exact CI lint gate goes green, and ship the fix. Use when a Rust core CI run fails on the rustfmt or clippy step, or to pre-empt one before pushing Rust changes. Formatting is deterministic and non-semantic, so the fmt fix is safe to auto-apply; clippy failures are surfaced, not blindly rewritten.
when_to_use: A `Rust core` workflow run is red on rustfmt/clippy, or before pushing changes under packages/rust/.
argument-hint: "[run-id]"
allowed-tools: Bash Read Edit Grep
---

The **Rust CI sweeper** loop. Pattern: Retry (atomic, mechanical). The goal contract is the
*exact* lint gate `.github/workflows/rust.yml` runs — nothing looser.

## Goal contract (what "green" means)

Two working directories, the same commands CI uses:

```bash
# in packages/rust/kymostudio-core
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
cargo clippy --all-targets --features bpmn -- -D warnings
cargo check --no-default-features
cargo clippy --lib --no-default-features --features wasm,pdf --target wasm32-unknown-unknown -- -D warnings
# in packages/rust/kymostudio
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
```

`cargo fmt --all` here also reformats local path-dependency crates (e.g. `kymo-layout`,
`kymo-mermaid`), which is why a fmt break in a sibling crate surfaces in this job.

## Loop

1. **Identify** (optional `$1` = failing run id): confirm which step is red.
   ```bash
   gh run view "$1" --json jobs -q '.jobs[] | select(.name=="Format & clippy") | .steps[] | select(.conclusion=="failure") | .name'
   ```
2. **See the diff** (don't fix blind):
   ```bash
   cd packages/rust/kymostudio-core && cargo fmt --all --check
   ```
3. **Auto-apply the fmt fix** (deterministic — safe to apply without classifying):
   ```bash
   cd packages/rust/kymostudio-core && cargo fmt --all
   cd ../kymostudio && cargo fmt --all
   ```
4. **Re-verify the whole gate** (step "Goal contract" above). The fmt clauses must now pass.
   - If a **clippy** clause is red, **stop and report it** — `-D warnings` failures can be
     semantic (unused result, needless clone). Surface the lint; let a human decide the fix.
     Do not `clippy --fix` blindly in this loop.
5. **Scope check**: `git diff --stat` should touch only whitespace/formatting in the offending
   crate(s). Any logic change means fmt rewrote something unexpected — review before shipping.
6. **Ship**: branch `fix/rust-fmt`, commit `style(rust): cargo fmt <crate>` (no AI-attribution
   trailer), open + merge a PR with `gh` (repo uses `--merge`, squash is disabled).

## Output

Report: which crate/file was mis-formatted, the `git diff --stat`, the final gate verdict
(all clauses pass), and the merged PR URL. If clippy was red, report the lint instead of
shipping and hand back to the user.
