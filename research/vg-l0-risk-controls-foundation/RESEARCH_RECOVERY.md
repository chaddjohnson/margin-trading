# RESEARCH_RECOVERY — Assignment 1: New L0 risk-aware successor foundation

## Top screen

- **Updated (UTC):** 2026-11-13T23:04Z (from `date -u`).
- **Status:** **INCOMPLETE** — standard 2.2.0 written and registered (sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24`;
  preflight 13/13 PASS, preflight tests 26/26); `SPECIFICATION.md` written before the code; `src/d1-risk-controls/`
  implemented (config, exit, book, run) with 74 synthetic tests passing (config 9, exit 35, book 20, pool 10). Nothing
  committed yet. Real-data gates not started.
- **Brief:** `brief/BRIEF.md` sha256 `4a2e14f3f923196ab517810e34a74562f25b61b5c2b1a27efa01f2ecdab1c3a5` (225 newlines,
  24,193 bytes, final section "Success criterion" present; copied unchanged from the user's upload).
- **Branch:** `research/vg-l0-risk-controls-foundation` from `38222fb9` (tip of `research/vg-l0-walk-forward-diagnostic`),
  main checkout (no extra worktree). Working tree was clean at the start.
- **Running processes:** none started by this task. The Strategy Lab server (`server/main.ts`, PIDs 2277032/58/59) is the
  user's live service: never touch it.
- **Next step:** PROTOCOL.md + STANDARD_ADOPTION.json (2.2.0, scope diagnostic) → preflight → freeze record → commit;
  then the real-data gates (tools/vg-l0-risk-controls-foundation/).

## Environment

- Node v24.21.0 (`.node-version`); absolute node path for systemd units:
  `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Standard at start: 2.1.0 (`ac5c2c69…`); all 13 adopted studies pass `npm run research-preflight -- --all`.

## Decisions taken so far (on disk here, not only in the conversation)

1. **No edit to any frozen engine file.** The risk controls live in a new module `src/d1-risk-controls/` that extends
   (subclasses) the frozen `ExitManager` / `ShadowBook` and reuses Priority 3's `runPool`, `runGrowthBook`, `recordOf`
   unchanged. Reason: the evaluation digests of Priority 3 (`147cad7c…`), 5B (`3f902532…`) and the shadow study
   (`54304b69…`) hash `strategy.ts`, `shadow.ts`, `phenotypes.ts`, `books.ts`, `pool.ts` by name; an edit would break the
   sealed guards that pass on this line today.
2. **Adaptive hold = the repository's existing progress-hold concept** (`src/app/allIn-trailingBuy-progressHold.ts`):
   base hold for positions without progress, a finite extended hold once the post-entry high (through the previous
   session) reaches entry × (1 + g).
3. **No performance figures for non-default controls on real data.** Real-data runs of non-default modes report only
   invariant pass/fail and hashes (development door only), so Assignment 2's thresholds are not informed by results
   seen here. FULL is opened only to reproduce the frozen New L0 (legacy defaults).
4. **Documentation-only integration into `main`:** precedent `2346a1b5` (2.1.0 docs added to `main` as one docs-only
   commit). Decide at the end whether the 2.2.0 docs apply cleanly to `main`'s copies.
