# Implementation audit — Study 3, Stage 1b

## 1. Git and scope

- `main`: policy-only commit `3ef43015f812c651c9f4608bbe4f01af4a0b81af` (`RECOVERY_POLICY_MAIN_INTEGRATION.md`).
- Research branch `research/study3-vgt-momentum-stage1b`, created from Stage 1's verified head
  `db6a3ec83bfade06441efe9ae2219e2bc07a25fc` (= `origin/research/study3-vgt-momentum-first-principles`), not from `main`.
- Every sealed record holds `git.head` = `db6a3ec8…` and `git.outside` = [] (no change outside
  `research/study3-vgt-momentum-stage1b/` and `src/study3-vgt-momentum-stage1b/` relative to `db6a3ec`, and no untracked
  file elsewhere). No `package.json` change: Stage 1's code-freeze manifest includes `package.json`, so the Stage 1b CLI
  is `scripts/study3-momentum-stage1b.sh` (preferred name kept, no npm script).
- Stage 1's tree is untouched: the audit record's Stage 1 manifest (138 tracked files, digest `16db614c…`) and
  `npm run study3-momentum -- verify` → no problems (run in this checkout before the commit; see §6).

## 2. Freezes, amendment, records

| Item | sha256 / hash |
|---|---|
| `PROTOCOL_FREEZE.json` (2026-10-28T23:47:17Z) | file `236eaffa…`, body `5438e10528a7cb5a…` |
| `PROTOCOL.md` v1.2 / `ENGINE_CONTRACT.md` / `EXPERIMENT_MATRIX.json` v1.2 | `aa255bc9…` / `7eed7cc0…` / `7790d016…` |
| brief / review dispositions 1, 2, re-review 3 | `c7b09fe8…` / `f016aa72…`, `b0342898…`, `446d8b74…` |
| `AMENDMENTS.md` (A1, 2026-10-29T00:19:04Z, pre-outcome) | `3dc95e6d…` |
| `results/code_freeze.json` (2026-10-29T00:24:43Z) | file `594e6168…`, manifest `dc37a602…` (80 files: the import closure of `main.ts`, the worker, tests, package files); equal to the manifest the parity stage recorded |
| `engine.ts` / `reference.ts` | `54f26b09…` / `50d34873…` |

| Stage | Sealed (UTC) | Record sha256 | Body hash | HEAD | Files outside scope |
|---|---|---|---|---|---|
| `audit` | 2026-10-28T23:35:46Z | `4712ba922131fe5c…` | `44fcaaf5f3acdce0…` | db6a3ec8 | 0 |
| `parity` | 2026-10-29T00:23:11Z | `fc0ddd7c0d2348d3…` | `ccef907516f8cf42…` | db6a3ec8 | 0 |
| `develop-A` | 00:26:28Z | `3984057bb3bb1b93…` | `b905df882b9fdb09…` | db6a3ec8 | 0 |
| `develop-B` | 00:28:45Z | `de55a6e4ff3a9a71…` | `bfb86efc6c47c4cc…` | db6a3ec8 | 0 |
| `develop-C` | 00:31:26Z | `a581a62c584782ac…` | `bb86d80266709db4…` | db6a3ec8 | 0 |
| `develop-D` | 00:34:10Z | `b501e3fdef38fe0c…` | `1fc22c4d339705e9…` | db6a3ec8 | 0 |
| `develop-H` | 00:37:24Z | `bd16190ef9ca114c…` | `c855668526698fd3…` | db6a3ec8 | 0 |
| `repair` | 00:37:44Z | `9c85db00afb2fcf2…` | `2a0c774aa44041f6…` | db6a3ec8 | 0 |
| `evaluate` | 00:37:48Z | `99be7b3f8e658337…` | `cab15b31d759425e…` | db6a3ec8 | 0 |
| `robustness` | 00:38:23Z | `a9dd7f682ef9c841…` | `86d6d4ff58c5b77f…` | db6a3ec8 | 0 |
| `analysis` | 00:38:23Z | `5c6b4f5674798548…` | `d999eb98cd67d4f0…` | db6a3ec8 | 0 |

Every stage ran once; none was rerun. `sh scripts/study3-momentum-stage1b.sh verify` recomputes every record's body
hash, every payload's sha256 and both freezes: no problems. Payloads total 59 MB (search archives ≈ 10–12 MB per
history, compact rows with money rounded to the cent; selection used unrounded values in memory).

## 3. Data and doors

`data/VGT/data.csv` sha256 `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09` (= Stage 1's) through
the shared loader (training partition, access `optimization`); every load asserted its last session equals the request
and no retained bar is at or after 2023-12-30T00:00Z (last bars 20:59Z on each history end). Development stages loaded
only their development data; parity ≤ 2019-12-31; repair, evaluate, robustness ≤ 2023-12-29. Requests for 2024-01-02,
2025-12-31 and 2026-01-02 were refused before any read (parity record). The loader parses and hashes the whole file but
retains nothing after the request (disclosed in PROTOCOL §2). No 2024–2026 bar entered any computation.

## 4. Engine verification

- **Stage 1 parity** (fixed-slot mode; parity record (a)): 1,626 runs on fold-A data (all 12 families × 11 Stage 1 exits ×
  6 re-entry rules, 768 random TPL vectors, the controls, delays, slippage, costs): 0 differences, max |Δ| 2.8 × 10⁻¹¹.
  Stage 1's sealed anchors reproduced to the cent in `repair` (every window V and DD, Σ +$252.98, Π DD $63,569.06, the
  E04 lot, the H pick +$120,095.52 / $25,808.63).
- **Independent reference** (`reference.ts`, written in a separate agent context from the frozen protocol, contract and
  `types.ts` only, without reading the fast engine; `reviews/REFERENCE_AUTHOR_BRIEF.md`, `REFERENCE_AUTHOR_NOTES.md`):
  synthetic parity round 1 found one fast-engine defect (window dollar-days credited to the wrong window) and five
  contract underspecifications, resolved by pre-outcome amendment A1 in both engines (`reviews/PARITY_DEVELOPMENT_LOG.md`);
  round 2: 0 differences on 2 × 3,720 synthetic runs; sealed parity (b): 3,728 runs on fold-A data, both financing modes,
  every exit family default × 3 entries × 10 re-entry rules, 64 random vectors per exit box and per pairing box, every
  sizing variant, the controls, execution stresses, S1/S2/S3 policy chains — 0 differences (max |Δ| 3.6 × 10⁻¹¹; trade
  paths, kinds, reasons, stop components, money fields, daily marks, DDs, dollar-days). In `evaluate`, all 25 sealed
  paths and controls again: 0 differences.
- **Guards:** prefix invariance, poisoned future and truncated-run prefix at 2017-12-29, 2018-12-31 (parity) and at
  every boundary 2019-12-31 … 2022-12-30 (evaluate): 0 differences. b-marks: all 15 sealed picks reproduce their
  development liquidation mark and trade path on the full data.
- **Ledgers:** identities (i), (ii), (iii), (v), (vii) and the executability checks on every sealed evaluate path: no
  problem (`analysis.json` `ledgerProblems`).
- **Coverage:** every required stop component, exit reason and re-entry rule fired in parity; four branches did not on
  fold-A data — fill-bar stop (fixture F2), trim with the loan to zero (F8), S3 sell branch (F13) and **S2 across two
  boundaries (no fixture; checked fast = reference on a hand-built path in the dev log) — a disclosed deviation from
  PROTOCOL §12 (c)**: a fixture could not be added after the parity stage without breaking the parity-pinned manifest.

## 5. Tests

- Stage 1b: `node --test src/study3-vgt-momentum-stage1b/tests/engine.test.ts` — 27 tests, 27 pass (closed-form fixtures
  F1–F3, F5–F8, F10, F11, F13 (part), F14, F23; F4, F9, F12, F18 not built (§8); invariants and guards F15–F17, F19, F21, F22, F24, F25; matrix = code constants;
  policy-ID test vector; Sobol = Stage 1 on 8 dimensions).
- Repository suite before Stage 1b files existed (`results/logs/baseline-tests.json`, embedded in the audit record):
  764 tests, 757 pass, 7 fail — the 6 inherited filename-case failures (`src/app/allin-original.ts` vs the tracked
  `allIn-original.ts`) and Study 2's branch-bound `realData.test.ts:83` protected-input guard. After Stage 1b: see §6.
- `npx tsc --noEmit -p .`: no error in Stage 1b files. `npx eslint src/study3-vgt-momentum-stage1b`: 0 errors (style
  warnings for use-before-define, as in Stage 1's own code).

## 6. After-study checks (2026-10-29T00:51Z)

- `npm test`: **791 tests, 784 pass, 7 fail** — the same 7 inherited failures as the baseline (Study 2's
  `realData.test.ts:83`; `intraday-study` study.test.ts:19; `minute-optimizer` goldenMaster.test.ts:36; `trailing-buy`
  goldenMaster.test.ts:39, :43, :49, :58), plus the 27 Stage 1b tests, all passing.
- `npm run study3-momentum -- verify` (Stage 1, in this checkout): no problems.
- `npx tsc --noEmit -p .`: no errors in the repository.
- `git status --short`: only `research/study3-vgt-momentum-stage1b/` and `src/study3-vgt-momentum-stage1b/` (untracked,
  to be committed).
- The independent final code-and-evidence audit is `reviews/FINAL_AUDIT.md`, with its dispositions beside it.

## 7. Reviews

`reviews/METHODOLOGY_REVIEW_1.md` (32 findings), `METHODOLOGY_REVIEW_2.md` (30, one blocker), `METHODOLOGY_REREVIEW_3.md`
(re-review of v1.1: 3 major, 13 minor), each verbatim with dispositions; superseded drafts v1.0 and v1.1 in
`reviews/superseded/`. The reviewers and the reference author were separate agent contexts; the dispositions are the
author's (not independent).

## 8. Disclosed limitations, deviations and omitted deliverables

**From the final audit (`reviews/FINAL_AUDIT.md`, dispositions beside it; amendment A2):**

- **Fixtures not implemented** (PROTOCOL §12 fixture table, review-2 disposition 6): F4 (levels reset above the close →
  `level above prior close`), F9 (trim on a gap-down open; trim + same-session stop), F12 (−20% opening gap through
  XF/XV/XRD/XE/XU levels), F18 (XO count across a re-entry); F20 only partly (identities (iv) and (vi) not asserted); F13
  without its crash-time, pending-minute, pending-trim and New-Year sub-cases; F15 without per-rule hand paths beyond RS.
  These behaviours are exercised by fast-vs-reference parity (0 differences) but not by closed-form fixtures.
- **Diagnostics not produced by the sealed stages:** the splice − executable decomposition into carried-lot, transition,
  re-entry-timing and interest lines (per-window differences only, `results/tables/diagnostics.md`); per-rule re-entry
  attribution inside the L-C variants (only Π1's own entries, `diagnostics.md`); per-up-leg neighbour capture and lost
  post-stop gain; XV crisis traces for the fold B and D picks (only fold A's pick was traced); coverage counters for
  delayed and closing-print fills. Computed read-only from sealed payloads after the audit: the drawdown-matched and
  principal-day benchmarks (Π1 −$17,917 and −$32,376), turnover (17.6× a year), net and drawdown per $1M notional
  dollar-days (`diagnostics.md`). None of these enters a rubric item.
- **Identities in code:** (i), (ii), (iii), (v), (vii) and the executability checks are asserted on every sealed path;
  (iv) and (vi) and "L never increases" are not — the final audit recomputed (iv) on all 280 evaluate trades (holds).
- **Event-ledger defect:** exit-type rows in the sealed `events` arrays hold pre-fill S, G and a double-counted mark (the
  `event()` call precedes clearing the position). Descriptive field only; no rubric quantity or table uses it; not
  rerun (amendment A2).
- **Descriptive paths' (g):** for Π1-S3, Π-P0, Π-noE06 and the static path no leg statistics were sealed, so their up-leg
  clause uses 0 (their (f) is "not computed"); their labels are descriptive.
- `C-ALZ1|reset` equals `C-AL|reset` (an annual-reset always-long control takes Π1's overlays, which were Z1/Z2).
- **Pre-freeze development runs on market data:** during implementation the fast engine was compared with Stage 1's engine
  on **Stage 1 configurations only**, on fold-A data (≤ 2019-12-31), printing difference counts only (no net, mark or
  drawdown): first between 22:49Z and 23:02Z on 2026-10-28 (before the protocol freeze at 23:47:17Z), then after engine
  edits (≈23:07Z, ≈23:40Z, ≈00:18Z). No Stage 1b mechanism was run on market data before the freeze.
- **Historical code-closure verifiers:** `src/d1-ranked-preemption/freeze.ts` hashes all `src/**/*.ts`, so new Stage 1b
  files change its digest on this branch (as Stage 1's did); run at its own commit `40da6dd` in a detached worktree, its
  `verify` passes (`reviews/historical-verifiers/d1-ranked-preemption-verify-at-40da6dd.log`). Stage 1's verifier passes in
  this checkout (§6).

**Other limitations:**

Designer knowledge of 2016–2023; the S2-two-boundary coverage gap (§4); the archive rounding (§2); trade interest on
each trade's own principal with the account's net-debit difference as a separate line (A1-era design, re-review 3 #4);
descriptive paths' (f) not computed and their up-leg clause using 0 where no leg statistics were sealed (Π1-S3, Π-P0,
Π-noE06, static); the C-STOP control is reported but not a rubric control; distributions only as a separate ledger;
no margin-call model.
