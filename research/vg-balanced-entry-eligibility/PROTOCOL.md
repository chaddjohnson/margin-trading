# Protocol — Priority 1: bounded entry eligibility for VG #2 Balanced (D1 only, fixed control)

Status: **FROZEN** when `results/protocol-freeze.json` records this file's sha256 (before any eligibility-ON run on
real data). Changes after the freeze go to `AMENDMENTS.md` only; success criteria are never loosened there.

Authority: `brief/BRIEF.md` (sha256 `55718a68…a76eb`). Code: `src/vg-balanced-entry-eligibility/`; command
`npm run vg-eligibility -- <command>` from the repository root.

## 1. Question and scope

Does preserving a valid D1 entry that was refused only because the single $100,000 slot was occupied or reserved —
funding it later, at a current executable price, once the slot is free — improve the **actual shared-capital
portfolio** of Study 8 rank #2 VG Balanced, after costs and interest, within a maximum minute drawdown strictly below
**$35,000** (35% of the fixed $100,000 pool; the fixed-notional convention, not a percentage of account equity)?

D1 only: no Growth, partial exits, preemption, pyramiding, forced sales, extra capital or new families. All 16 D1
parameters stay fixed in the primary study. An honest negative or inconclusive result is an acceptable outcome.

## 2. The control (verified, S1–S2)

- Study 8 F24 rank #2, role balanced, runner alias `s8-vg-balanced` (= `s8-vg-3`), configuration
  `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json` (sha256 `27cbadf9…06c0da`), resolved by the
  Study 8 runner's resolver against the sealed F24 records.
- Books (checked in code, `control.ts`): VGT `d1-bd80e32ee4` X 23.5% Y 0.9% stop 7.4% hold 15 L 78 buffer 4.4% P 11.0%
  W 55; GDX `d1-7b99d2833d` X 27.6% Y 0.1% stop 5.7% hold 12 L 243 buffer 2.9% P 15.2% W 12.
- Conventions (checked in code): shadow funding, one funded slot, $100,000 per trade, no compounding; 11% simple
  interest, 365-day year; 5 bps per side, $0 commission; stops fill at the stop or the gapped open, 0 bps extra
  slippage; accounting from the close of 2016-01-04, first eligible session 2017-06-15; first executable decision
  wins; same-minute ties alphabetical (GDX before VGT); the broader core portfolio is not spending capacity.
- Reproduced through the existing runner (S1): development to 2024-12-31 net $260,223.13, minute DD $17,280.74,
  36 lots; full to 2026-10-30 net $334,911.93, minute DD $21,303.61, 48 lots; at 2026-10-29 the runner reconciles
  with the sealed Study 8 record trade by trade (48 lots, 0 mismatches).
- OFF parity (S2, `results/parity/`): the adapter with eligibility OFF equals the control engine (`runPoolOn` →
  `runNAllocator`) on every door with **zero tolerance** (every trade, lot, signal, daily row, drawdown and book state
  bit for bit; NaN = NaN), and the runner's own writers produce byte-identical `lots.csv`, `trades.csv`,
  `signals.csv`, `daily.csv`, `yearly.csv`, `monthly.csv`, `lots.txt` from it (development and full). Cash summaries
  reconcile to the cent. Any later parity failure stops every dependent stage.

## 3. Chronology, doors and exposure

| Door | Data | Partition / access | Use |
|---|---|---|---|
| D19 | byte prefixes through 2019-12-31 | training / optimization | C19 selection |
| D21 | through 2021-12-31 | training / optimization | C21 selection; C19 evaluation (2020–2021) |
| D23 | through 2023-12-29 | training / optimization | C23 selection; C21 evaluation (2022–2023) |
| D24 | through 2024-12-31 | all + end / manual evaluation | primary development selection C24; C23 evaluation (2024) |
| FULL | canonical files to 2026-10-30 | all + end / manual evaluation | parity (OFF only, done); the one-time validation |

- Doors D19–D24 are physical byte prefixes (pins in `results/doors-pins.json`); a process that opens one cannot read
  a later bar. Every opening is logged in `results/doors.jsonl` with its purpose.
- FULL may run eligibility-ON configurations only after `FROZEN_SELECTION.json` is committed and made read-only; the
  worker verifies its sha256 (the guard) before opening FULL.
- Development: 2016-01-04 → 2024-12-31 (all optimization, refinement and selection). Validation:
  2025-01-02 → 2026-10-30 (both ETFs complete through 2026-10-30; November–December 2026 do not exist locally and
  are not tested). Label: **2025–2026 validation on previously examined history** (every session through 2026-10-30
  was examined in earlier studies; not an untouched holdout).
- Every run is one continuous causal run from 2016-01-04; nothing is liquidated or reset at a boundary. Period P&L =
  change in marked equity between period-boundary closes. Period minute drawdowns are reported **reset at the period
  start** (the tracker restarts from the marked value at the prior close) and the whole-run minute drawdown spanning
  the boundary is reported beside them.
- Disclosed prior knowledge: before this protocol, the existing control run output (made before this task) and the
  S1 reproduction showed that the control has 14 refusals, all in 2020–2022, and none in 2023–2026. The validation
  window is therefore expected to offer the feature little or no opportunity; this was known when §10 was written.

## 4. The variant: state-transition specification (pre-audit; engine `engine.ts`)

The specification below was implemented before Phase A ran (engine sha256 `23ad6225…a774`, recorded in the
checkpoint); the only later engine changes are listed in `AMENDMENTS.md` R2–R3 (report-only options, a report-only
period-tracker defect, formatting), none of which changes a funding decision. It is a funding policy over the **unchanged shadow books**: the shadow books' signals and trades are
identical with eligibility ON or OFF; only funding and real lots change.

Per enabled ETF X with maximum age **A** (completed sessions) and maximum extension **E**:

1. **Arming.** A genuine shadow-book D1 signal of X whose funding decision is refused with reason `pool occupied (…)`
   or `pool reserved …` arms one opportunity, unless (logged `not armed`): X is not enabled; the refusal is for another
   reason; X itself holds the real lot or a late order; X already has a live opportunity. The opportunity's origin is
   immutable: origin session o, decision time t₀ and price P₀ (the confirming minute's close), D1's trigger
   K = trailing low × (1 + Y), the trailing low L, setup id/kind, the refused shadow trade, the occupant.
2. **Age.** age(s) = s − o (common-session indices). Selectable at any decision minute with age ≤ A. **Expiry** at the
   close of session o + A, after that close's exits and fills. No renewal.
3. **Cancellation.** (a) When the originating shadow trade closes (at its exit minute, before that minute's decisions,
   or at the closing print, before expiry); closed shadow trades are never funded. (b) **Invalidation:** at every
   completed minute of X after the origin minute (before that minute's decisions), if the minute's **low < L** — the
   decline resumed below the setup's trailing low, so D1's rebound confirmation no longer stands (D1's own machine
   would reset its trailing low there and require a new rebound, which this study never synthesizes).
4. **Revalidation** at a completed minute m of X (decision time = bar start + 60 s) when the slot is free after that
   minute's fresh decisions: **K ≤ close(m) ≤ P₀ × (1 + E)** (the favorable-price boundary is D1's original trigger;
   the cap is the original decision price extended by E). Evaluated afresh at every such minute: a minute outside the
   band leaves it pending; nothing is assumed to stay true.
5. **Priority.** At each minute: the shadow books' fresh signals are decided first, in the incumbent tie order; then,
   if the slot is still free, revalidated delayed candidates in order of oldest t₀, then alphabetical. One slot: the
   first reserves it; the others are `rejected` for that minute and stay live. A fresh signal that takes a slot
   freed at that minute rejects the delayed candidates of that minute.
6. **Fill.** The selected candidate reserves the slot; its order fills at the first trade after the delayed decision
   time (the next observed minute's open, or the closing print if the decision precedes the close; a decision at the
   last minute carries to the next session's opening trade). Never at P₀ or any earlier price; no bar's high/low is
   used to justify an earlier fill.
7. **The late lot.** Its own fill price after the 5 bps cost, shares = $100,000 ÷ that price, interest from its fill
   session, holding age from its fill session, post-entry high from its fill minute (D1's entry-session rule), and
   D1's original exit rules with X's unchanged parameters (trailing stop under the net-profit rule, maximum hold,
   buffered intraday loss and its overnight carry) — an independent `ExitManager`, never the shadow trade's exits.
   Its exit releases the slot. It never inherits the shadow trade's profit, interest, age or pre-entry high.
8. **Shadow and funded lifecycles.** The shadow books continue unchanged (shadow signals, shadow continuation windows
   opened only by shadow exits with shadow profit). A shadow exit never releases capital unless it closes a lot that
   the shadow trade itself funded; a late lot's exit never opens a shadow continuation window. While X holds a late lot,
   X's fresh signals are refused (pool occupied) and do not arm. A consumed opportunity is never funded again.
9. **Log.** Transitions `armed`, `not armed`, `pending` (logged when the failing boundary changes), `revalidated`,
   `rejected`, `selected`, `filled`, `expired`, `cancelled`, `live at end`, each with time, price, age and reason;
   with the signal ledger and the funded-lot ledger they reconstruct every trade.

## 5. Phase A (development door D24 only; done before this freeze)

`results/audit/phase-a.json` (sha256 `79043903…0871`) and `phase-a-refusals.csv` (`e058be7e…79e`), made by
`audit.ts` (`6689f379…f090`; a field-name defect found and fixed before the result was used, disclosed in
`AMENDMENTS.md` R1):

- 50 shadow signals, 14 refused, all `pool occupied` by a lot (none by a reservation, no other reason); VGT 7, GDX 7.
- First availability of the slot within 1 / 3 / 5 / 10 / 20 sessions: 2 / 3 / 6 / 9 / 12; with the shadow trade still
  open: 2 / 3 / 6 / 9 / 10; and not invalidated by a low below the trailing low: 0 / 0 / 0 / 1 / 2.
- First-order band check (ignoring the cascade a delayed lot causes): one opportunity (VGT, 2022-05-20) is selectable,
  and only at A = 20, E = 5% (age 14); none in any other bounded case. Most opportunities are invalidated within
  minutes to days because D1 buys a 0.1–0.9% rebound off the low.
- Decision: the brief's stopping condition ("none survives any bounded case") is not met, so the study proceeds, with
  the explicit expectation that the evidence is minimal. No rule was changed after the audit.

## 6. The bounded grid and its neighbourhoods

- **Grid:** OFF plus 60 ON configurations: ETF set S ∈ {VGT, GDX, VGT+GDX} × A ∈ {1, 3, 5, 10, 20} ×
  E ∈ {0, 1, 3, 5}%; VGT+GDX shares (A, E). Evaluated in full on each selection door.
- **Equivalence:** configurations are grouped by their funded-lot signature (sha256 over each lot's symbol, entry and
  exit time, exit reason and net in cents). "Never activated" = no late lot. Identical signatures are one piece of
  evidence, reported as one class.
- **Local box** of (S, A, E): ages from the previous to the next grid age (A = 1 → 1…3; A = 20 → 10…20), integers;
  extensions from the previous to the next grid extension on a 0.1-point lattice (0 → 0…1%; 5% → 3…5%).
- **Exploratory neighbourhood N_x:** the grid points of the 3 × 3 block (same S; clipped at the grid's edges; includes
  the centre) plus 16 uniform draws from the local box, seed `seedOf('explore', fold, S, A, e)` (e = E in tenths of a
  percentage point, as every seed label below).
- **Confirmation neighbourhood N_c:** 32 independent uniform draws from the local box, seed
  `seedOf('confirm', fold, S, A, e)`. Drawn only for exploratory-eligible configurations.
- **ETF-specific refinement (frozen trigger and budget):** at a fold, only if the exploratory-eligible sets of
  S = VGT and S = GDX are both non-empty: the combinations of the top 3 of each (by N_x median Δ) — at most 9 — each with
  24 exploratory draws (`seedOf('explore-etf', fold, A_VGT, e_VGT, A_GDX, e_GDX)`) and 32 confirmation draws
  (`seedOf('confirm-etf', fold, A_VGT, e_VGT, A_GDX, e_GDX)`)
  from the product of the two ETFs' boxes; they compete under §7's rules. At most 513 evaluations per fold; no second
  round; never triggered otherwise.
- Draws are recorded with their seeds; a smooth neighbourhood that changes no trades is reported as such (share of
  points identical to OFF and to the centre, number of distinct signatures).

## 7. Qualification, roles and stopping (identical at every cutoff)

On the fold's selection door, with Δ = net − net(OFF), dd = whole-run minute drawdown to the door end, ΔDD = dd − dd(OFF):

- **Exploratory-eligible:** changed signature, Δ > 0, dd < $35,000, median Δ over N_x > 0, and every N_x point dd <
  $35,000.
- **Qualified:** exploratory-eligible, median Δ over N_c > 0, and ≥ 90% of N_c points with dd < $35,000.
- **Roles** (among qualified): **high-profit** = highest N_x median Δ; **balanced** = highest Δ − max(0, ΔDD);
  **lower-drawdown** = lowest dd. Ties: larger Δ, smaller dd, then canonical order (S: VGT, GDX, VGT+GDX; smaller A;
  smaller E). One configuration may hold several roles; roles are not re-filled.
- **Priority:** high-profit, balanced, lower-drawdown. The fold's **selected configuration** is the high-profit holder,
  or **OFF** if nothing qualifies ("no qualifying improvement").
- Report-only beside the roles: the profit/drawdown frontier of all 61 configurations and every configuration with
  ΔDD < 0 ("lower-risk choices"), whatever its Δ.
- **Stopping:** the grid, its neighbourhoods and the conditional refinement are the whole search. Nothing is
  re-searched after any result.

## 8. Chronological folds (development only)

| Fold | Selection door | Evaluation period | Evaluation door |
|---|---|---|---|
| C19 | D19 | 2020-01-02 → 2021-12-31 | D21 |
| C21 | D21 | 2022-01-03 → 2023-12-29 | D23 |
| C23 | D23 | 2024-01-02 → 2024-12-31 | D24 |
| C24 | D24 (primary) | 2025-01-02 → 2026-10-30 | FULL (§10) |

Each fold runs §6–§7 on its own door only. Its selected configuration (or OFF) and OFF then run on the evaluation
door; reported: evaluation-period P&L and Δ, evaluation-period minute DD (reset) and whole-run DD, late lots in the
period. VG #2's D1 parameters were themselves selected on data through 2024, so these folds test the incremental
eligibility selection conditional on a retrospectively chosen control — not a nested reoptimization of the pool.

## 9. Diagnostics (report-only; development door unless stated)

- **Reference configuration:** VGT+GDX, A = 20, E = 5% (the most permissive grid point), reported as the feature's
  upper bound of activity whether or not selected; never a candidate on that account.
- **Matched comparison** (finalists and reference vs OFF): unchanged lots, new delayed (late) lots, new fresh lots,
  displaced incumbent lots; per-ETF contribution; capital conflicts (refusals by occupant), entry delays (sessions,
  minutes), late-lot MAE, holding periods, exposure (sessions with a lot ÷ sessions from first eligible), interest,
  friction, wins/losses, total losses, open positions; annual P&L; drawdown peaks, troughs and recoveries.
- **D1 stress (paired):** Latin hypercube over all 16 D1 coordinates of both books, Study 8's N1 radius (grid units: X
  ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10, W ±20), clip form on the Study 6 box, Study 6's
  `pointFromUnits`; n = 64 exploratory (`seedOf('d1', 'explore')`) and n = 128 confirmation (`seedOf('d1',
  'confirm')`), centre duplicates removed; at each point the configuration and OFF run with the same D1 values; the
  paired Δ distribution (median, p10, p90, shares > 0 / = 0 / < 0), dd p90 and share < $35k for both, activation, and
  clipping. No D1 point is ever selected.
- **Friction and execution stresses** (finalists, reference, OFF): 10 and 20 bps per side; 14% interest; next-open
  stop fills; +25 bps stop slippage; delayed entries filled at the fill minute's high (variant only).
- **Concentration:** pool-level episodes over the union of OFF's and the configuration's lots (a new episode starts
  when an entry is > 10 sessions after the previous exit, across both ETFs); per-episode Δ; for the largest positive-Δ
  episode and for the configuration's largest winning episode: the **arithmetic removal** (Δ minus that episode's Δ)
  and the **causal rerun** (both OFF and the configuration rerun with no new funding in that episode's sessions,
  capital availability changing accordingly). Labelled; neither is a veto.
- **Invalidation sensitivity (post-audit, specified here before any variant result):** the grid on D24 with the
  invalidation measured on minute closes instead of lows, and with no trailing-low invalidation (band only).
  Activation and Δ are reported; these variants are never candidates, never refined and never validated.
- **Examples:** one successful delayed entry and one harmful or displacing one, where they exist (reference or
  finalists on D24; else from the D1-stress runs, labelled).

## 10. Validation (FULL door, once, after `FROZEN_SELECTION.json` is committed and read-only)

`FROZEN_SELECTION.json` lists the C24 role holders in priority order (or none), the reference configuration, the
report-only validation perturbations, and the sha256 of this protocol and of the code. Then, once:

- OFF, each role holder and the reference run on FULL; reported for 2025–2026 (marked-equity change from the
  2024-12-31 close) and whole-run.
- Tests (role holders only; pass/fail labels, no retuning): **V1** whole-run minute DD < $35,000; **V2** 2025–2026
  Δ ≥ $0 vs OFF; **V3** 2025–2026 minute DD (reset at the 2024-12-31 close) < $35,000. Activation (late lots in
  2025–2026) is reported; with no activation the outcome is labelled "not exercised by validation".
- Report-only on FULL: the primary role holder's (else the reference's) N_c draws and the D1 confirmation stress
  (paired with OFF), 2025–2026 statistics only; and the friction stresses.
- A validation failure is reported, never repaired; no winner is chosen by validation profit.

## 11. Execution safety and integrity

- Heavy stages run in transient systemd user units (`systemd-run --user --collect -p MemoryHigh=44G -p MemoryMax=48G
  -p MemorySwapMax=0 -p KillMode=mixed`, the absolute Node binary), serialized (one unit at a time); the unit is the
  common capped parent of its coordinator and child-process workers. tmux, the Claude session and other services stay
  outside it.
- Workers: child processes started with `--expose-gc`; `gc()` every 8 evaluations or above 256 MiB of ArrayBuffers; a
  10-second monitor samples cgroup `memory.current/peak`, per-process RSS, heap, external and ArrayBuffer memory; a
  pressure threshold stops dispatching, finishes in-flight work, commits and exits 75 (no automatic restart).
- Results: an SQLite archive per job (bound to the job, door and code digest), committed every ≤ 2 s / 50 rows, and an
  atomic checkpoint (temporary file, fsync, rename) at least every 30 s and at each stage boundary. Resumption = the
  same command; stored records are never recomputed. A pilot (`pilot-` job names only) measures memory and tests
  SIGTERM interruption and abrupt worker termination with deterministic resumption before the study jobs.
- Tests (`src/vg-balanced-entry-eligibility/tests/`): OFF parity, expiry, cancellation (shadow close, invalidation),
  no future data, same-minute exit/funding order, fresh-versus-delayed priority, simultaneous candidates, duplicate
  prevention, fills after the decision, late-lot stop/interest/holding initialization, shadow/funded divergence,
  period accounting, cache correctness and resume equivalence. The repository suite runs inside a capped unit; known
  failures are listed separately.

## 12. Deliverables

`README.md`, `PROTOCOL.md`, `AMENDMENTS.md`, `REPORT.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`,
`FROZEN_SELECTION.json`, `results/` (doors, parity, audit, grids, neighbourhoods, folds, diagnostics, validation,
ledgers, transitions, tables, charts, memory, MANIFEST with sha256). Regenerable archives larger than 50 MB stay out
of git. The report ends with **"Priority 1 review — decision before Priority 2"**. Priority 2 (a jointly optimized
D1 + Growth pool for VGT) is not started.
