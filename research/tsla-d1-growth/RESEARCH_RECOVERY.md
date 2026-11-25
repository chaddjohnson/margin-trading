# RESEARCH_RECOVERY — Priority 6: TSLA D1 + Growth (study `research/tsla-d1-growth/`)

## Top screen

- **Updated:** 2026-11-25T11:50Z (clock, UTC). **Status: INCOMPLETE — pre-freeze: the final-code engineering gates are
  rerunning (unit `tsla-gates-final`); then the regression chain (E7/E8), gates seal, protocol freeze, official chain.**
- **Brief:** `brief/BRIEF.md` sha256 `65c59cf0…` (read in full).
- **Protocol:** `PROTOCOL.md` P6-TSLA 1.0.0 (NOT yet frozen; committed in `a80dc415`); `STANDARD_ADOPTION.json` written
  (preflight PASS 11:46Z). No official optimization has run.
- **Running:** systemd user unit `tsla-gates-final` (log `research/tsla-d1-growth/cache/logs/gates-final.log`; script
  copy `research/tsla-d1-growth/cache/gates-final.sh`): E2 ✓, E3 ✓, then E4, E6, E5 with `TSLA_ENG_TAG=final`.
- **Next commands (in order):**
  1. wait for `GATES FINAL COMPLETE` in the log (check `systemctl --user is-active tsla-gates-final`);
  2. `tools/tsla-d1-growth/launch.sh tsla-tests $PWD/research/tsla-d1-growth/cache/logs/tests.log --wait -- /bin/bash research/tsla-d1-growth/chains/tests.sh`
     (E7, E8; GPU must be free);
  3. commit; `npm run tsla -- gates`; commit; `npm run tsla -- freeze`; commit; push;
  4. launch the chain: `tools/tsla-d1-growth/launch.sh tsla-chain $PWD/research/tsla-d1-growth/cache/logs/chain.log -- /bin/bash $PWD/research/tsla-d1-growth/chains/chain.sh`.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/tsla-d1-growth`** (from `dc023c3b`). Commits:
  `3be39b65` (inventory), `9bfcafad` (storage + data + code), `3b73c181` (final code), `a80dc415` (protocol + adoption).
- GPU acceptance `bb0e3fcf…` VERIFIED (E1 at 11:44Z: rebuild + device + entrypoint audit clean).
- Node 24, `--no-maglev`. Alpaca credentials only in the git-ignored `.env`.

## Stages

| Stage | Status | Record |
|---|---|---|
| 0 Recovery + inventory | complete | `storage/INVENTORY.json` |
| 0A P5 archive compression | complete 11:07Z | `storage/ACTIONS.jsonl`, `storage/POST_VERIFY.json` (29/29; 179.8 GB recovered) |
| 0A other-cache audit | complete | `storage/OTHER_CACHE_AUDIT.json` (22.6 GB; 20.97 GB candidates; nothing deleted); `STORAGE_PRESERVATION_REPORT.md` |
| 2 TSLA data | complete | `TSLA_DATA_AUDIT.json/.md`, `data/DOOR_PINS.json` `193fc206…`, `data/TSLA-splits.json` `e96d6236…`, `reports/data/SUITABILITY.json` |
| 3 Functionality audit | complete | `FUNCTIONALITY_AUDIT.md` |
| 5 Engineering | E1 ✓ (11:44Z), E7 ✓ (18/18); E2–E6 rerunning on the final code (first runs passed on an earlier digest: E4 0/4,660 differ, E5 all identical, E6 all identities) ; pilot ✓ (`results/engineering/pilot.json`: 692 requested/s; means D 8,750 / G 9,992 / J 7,197 / refine 31,480) | `results/engineering/*` |
| 4 Protocol freeze | not yet | — |
| 6 Stages A–F | not started | `chains/chain.sh` |

## Decisions taken pre-freeze (to DECISION_REGISTER.md)

- Slot binding (no evaluation change); TSLA split ledger kept in the study (central file sha-pinned by frozen studies).
- Endpoint 2026-10-30 (program's); later TSLA data not downloaded.
- R_S rule replaced pre-freeze: lane-count matching R_S(F) = max(4, ⌈160/(6F)⌉) (the cost-based draft gave 22 from an
  unrepresentative hash-selected pilot frozen D1); refinement seeds ≤ 24 per cell.
- Smoke-test attribution fix in the P5 compressor (copied incumbent rows) — disclosed in the storage report.

## Guards

- Priority 5 sealed: never edit tracked files or rerun. Restore its archives with `zstd -d -q <arc>.zst -o <arc>`.
- Other P5 caches: audit only. No broker, deployment, merge into `main`, MSFT.
- After the freeze: no src/tsla-d1-growth change without a sealed code amendment (`npm run tsla -- code-amendment`).
