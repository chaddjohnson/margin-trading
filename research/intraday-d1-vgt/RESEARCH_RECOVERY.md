# Research recovery checkpoint — Intraday D1 (VGT, 1-minute), Study 8–style robust optimization

## Top screen

- **Updated:** 2026-11-06T17:35Z (UTC, from the clock). **Status: INCOMPLETE — about to freeze the protocol.**
- **Current stage:** implementation complete (`src/intraday-d1/`: engine, periods, data doors, space, records, lab +
  worker pool, fitness (Study 8 functions imported), search (Study 8 V-track port), evidence/qualify/freeze, validate,
  ledger, tables; tests). `PROTOCOL.md` written. Study tests 17/17 pass; data-free D1 suites 21/21 pass; tsc/eslint
  clean. Smoke search ran end to end (scratch output only).
- **Next commands (repo root):** `npm run intraday-d1 -- seal-protocol`, then `npm run intraday-d1 -- parity`, then
  git commit (protocol freeze), then `npm run intraday-d1 -- search` (background, log to
  `research/intraday-d1-vgt/results/logs/search.log`).
- **Authority:** the brief `research/intraday-d1-vgt/brief/BRIEF.md` (sha256 `1ef65015…c639b147b639`, verified complete).
  No protocol frozen yet; no amendments.
- **Stages complete:** Phase 1 audit (files below). **Running:** nothing.

## Environment

- Repository root `/home/chad/projects/margin-trading`, main checkout, no other worktree.
- Branch `research/intraday-d1-vgt` from `353e33f21c1539dccf58d2827b92003aa7f61d11` (created 16:49Z). Nothing committed yet.
- Node `v24.21.0`; 16 threads, 59 GB RAM.
- Working tree: only new files under `research/intraday-d1-vgt/` and `src/intraday-d1/` (this task).

## Authority and audit records (sha256 recomputed 2026-11-06T17:17Z)

| File | sha256 |
|---|---|
| `audit/D1_AUDIT.md` | `313edebb90094f1a65d9ee89bd59efbda69888c401c758453a2fd9e47f461b71` |
| `audit/STUDY8_AUDIT.md` | `aa488b8f8bd29feb697a33bdf33b281da3464b65fb980daceaffac8a898c7acc` |
| `audit/PRIOR_INTRADAY_AND_INFRA_AUDIT.md` | `6f3f4dc34eed3ddc73e2169962a38243a8a01751dd199f573f0082655b429e3b` |
| `audit/METHODOLOGY_TRANSFER_MAP.md` | `6b0cab2dd7627af0b2580a73a48bb6c3629f949ee797992750feb5a921819cc3` |
| `audit/RULE_PARITY_DESIGN.md` | `01b6120c5d11f6757feecf4be094eddf3a918840b4b034bb15d53524762b4b69` |

## Key decisions taken (written in the audit files; to be frozen in PROTOCOL.md)

- Strategy `intradayD1` in `src/intraday-d1/`: D1's session → B-minute period clock (B ∈ {5,10,15,30,65,130}); L and W
  in trading minutes → periods; hold in scheduled trading minutes; interest unchanged (calendar days between session
  dates). Session clock = D1 exactly (parity mode).
- Study 8 V-track pipeline reproduced on a 9-D intraday grid; Study 8 constants imported from
  `src/study8-expanded-regime-d1/context.ts` (import reads only `config/archive/legacy-research-inputs.json`).
  Only the F24-equivalent fold (no walk-forward folds — brief excludes them). C3 episodes adapted to distinct
  calendar quarters with an entry. E3 dropped (pool-only). B1 = daily D1 `primary` via session clock as comparator.
- Common arming date 2016-02-01; accounting from the first session.

## Data doors

- Development: byte prefix of `data/VGT/data.csv`, 42,469,694 bytes, 743,918 rows, sha256
  `c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb`, last row 2024-12-31T21:11Z (verified twice:
  shell and `loadDevelopmentSessions`). 2,264 sessions, 734,112 regular bars.
- Validation (after freeze only): whole file sha256 `2ee06310…412e`, 935,608 rows, last complete session 2026-10-30,
  split 8:1 2026-04-21 forward-adjusted.
- Disclosure: while pinning the prefix, the shell displayed the next row's timestamp only (2025-01-02T12:26Z), no prices.

## Verification so far

- **Non-regression (D1 unchanged):** canonical D1 CLI on the dev prefix (scratch copy, sha256 `c144619f…`):
  net $137,222.97, minute DD $19,330.69, daily DD $15,611.46, 17 trades — equals the sealed development record
  (`research/vgt-d1-refinement/results/baseline/baseline.json`). Command:
  `node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts allIn-trailingBuy-postExitContinuation VGT - - <prefix.csv> <outdir> stop`
  (and `next-open`).
- **Parity P1:** engine session clock, costs 0, armFrom 0 vs those D1 trades.csv: 0 mismatches over 17 trades in both
  `stop` and `next-open` modes (entry/exit dates and minute times, prices, reasons, executions, kinds, interest,
  profit; Object.is equality), DD equal. Engine runtime ≈ 4–14 ms per run.

## Guards

- **Do not rerun:** nothing sealed yet.
- **Do not modify:** original D1 sources, phenotypes, baselines, frozen studies, `data/`, `src/lib/*`, Study 8 code.
- No code path may read VGT bars after 2024-12-31 before the freeze is committed; run full `npm test` only after it.
- Commit/push at the end (brief + wrapper ask for it).

## Disclosures

- The timestamp-only peek above.
