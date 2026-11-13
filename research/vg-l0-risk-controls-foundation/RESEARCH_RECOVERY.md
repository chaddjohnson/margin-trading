# RESEARCH_RECOVERY — Assignment 1: New L0 risk-aware successor foundation

## Top screen

- **Updated (UTC):** 2026-11-13T23:30Z (from `date -u`).
- **Status:** **INCOMPLETE** — every gate passed and is sealed; documents written; remaining: final REPORT.md, the
  docs-only integration into `main`, commits and pushes. No process is running.
- **Commits:** `92f37734` (standard 2.2.0, module, protocol freeze); the gate-records commit follows this update.
- **Sealed records** (`results/seals.jsonl`): protocol freeze `4e9409fe…`; G0 `2c9aa9f1…`; demonstrations `0d1e9c2a…`;
  G1–G3 `b05b5c78…`; G4 (120/120); G5 first run (7 tool-error failures, kept) and G5 rerun `-a2` `f698f6be…` (0
  failures); G7 first run (resolver error, kept) and G7 rerun `-a3` `4b710e9c…` (pass). Amendments A1–A4 (tool fixes
  and post-freeze tests; no engine change).
- **Tests:** module 81/81, preflight 26/26, full `npm test` 1,551 / 1,540 pass / 7 known failures / 4 skipped
  (before A4's 7 tests), `tsc` 0 errors, `vg-lmo verify` 28, `vg-l0se verify` 90.
- **Brief:** `brief/BRIEF.md` sha256 `4a2e14f3f923196ab517810e34a74562f25b61b5c2b1a27efa01f2ecdab1c3a5` (complete).
- **Branch:** `research/vg-l0-risk-controls-foundation` from `38222fb9`, main checkout. Standard 2.2.0
  `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24`; adoption preflight PASS (scope diagnostic).
- **Protocol:** `PROTOCOL.md` sha256 `d04ec35df8c868be185caa4f1011955f45c881d4e14ea7e4da3e9ce8275a05eb`, frozen.
- **Next step:** REPORT.md; commit; push the branch (unsandboxed, retried); the docs-only commit on `main` (plumbing
  with a temporary index, no checkout switch) if `origin/main` is still `2346a1b5`; push `main` (fast-forward only);
  verify with `git ls-remote`; record the pushes here.
- **Do not rerun:** S1, G0, G1–G3, G4, G5, G5-a2, G7, G7-a3, demonstrations (sealed; they refuse). Do not touch the
  Strategy Lab server (PIDs 2277032/58/59).

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
