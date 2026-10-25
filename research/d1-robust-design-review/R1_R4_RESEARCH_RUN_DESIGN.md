# R1 and R4 retrospective research runs: design of a read-only, opt-in diagnostic (implementation deferred to Phase 2)

## 1. Status and purpose

R1 = {XBI, XRT, KRE, GDX} and R4 = {XBI, KRE, GDX, XLF} are the 16-ETF study's leading refined training results. They
were **not accepted** (both failed gate T6; R4 also T8), were never run on holdout, final or `all`, and the study's
`FROZEN_SELECTION.json` records "no advancement" with zero nominees. The current `npm run joint-16-etf-d1 -- run
--config …` accepts only `B1`, `B4`, `B5`, `C0` and nominee keys (none exist), so **no command runs R1 or R4 on any
partition today**; the commands below are an interface to implement and verify, not an existing capability.

The user wants their continuous `all` histories in fixed and 20%-portfolio mode at 5 bps. This is legitimate
*historical inspection*: it tells us what those two training peaks did in 2024–2026, it does not validate anything,
and once seen it makes those two memberships/vectors (and their neighbourhoods) "inspected" for every later study.

## 2. Desired interface (to implement under the new study's namespace, never inside `joint-16-etf-d1`)

```bash
npm run robust-d1 -- research-run --config R1 --mode fixed     --dataset all --cost 5
npm run robust-d1 -- research-run --config R1 --mode portfolio --dataset all --cost 5
npm run robust-d1 -- research-run --config R4 --mode fixed     --dataset all --cost 5
npm run robust-d1 -- research-run --config R4 --mode portfolio --dataset all --cost 5
```

Options: `--config R1|R4` (the only accepted keys in this runner; benchmarks remain in the existing `run` commands),
`--mode fixed|portfolio`, `--dataset all` (the only dataset this runner accepts: an isolated `holdout`/`final` run of
an unaccepted configuration adds nothing and invites misreading), `--cost <bps>` (default 5; 0/2/10 permitted),
`--dividends frozen|symmetric` (portfolio only; default `frozen`, see ETF_UNIVERSE §7), and a mandatory
`--acknowledge-retrospective` flag whose absence prints the evidence label and exits. Output goes to
`evaluations/robust-d1/retrospective/<config>-<mode>-all-<cost>bps-<dividends>/` (git-ignored like every
`evaluations/` path), never under `research/`.

## 3. Provenance: read the exact vectors from the archived artifacts

1. Verify `research/joint-16-etf-d1/FROZEN_SELECTION.json` by its body hash (`readVerifiedSelection`, existing code).
2. Read `records['robust/robust.json']` (= `b6cd917f…`) and `records['refine/refine.json']` (= `5336ed54…`) from the
   manifest; compute the sha256 of the two files on disk; **stop** on any mismatch.
3. From `results/robust/robust.json` take `gated[].battery` with `label` exactly `R1 (refined c1)` and
   `R4 (refined c4)`: their `key`, `books[]` (symbol, vector id, eight-parameter grid in grid units) and their training
   `costs['5']` (net, minute/daily drawdown, lots) and `full.portfolio` (ending equity, daily/minute % DD,
   borrowing-dollar-days).
4. Cross-check each key against `results/refine/refine.json` `runs[].result` for slots 1 and 4 (expected
   `GDX:d1-e7461ea563|KRE:d1-a389037400|XBI:d1-43a297e3fd|XRT:d1-752c561fac` and
   `GDX:d1-c0909c54a6|KRE:d1-a389037400|XBI:d1-e080f1a385|XLF:d1-d731d5c68f`), and each vector id against the
   d1-refinement candidate-ID function of its grid (`idOf`). **Never** reconstruct a vector from the report tables'
   rounded percentages; the grids in `robust.json` are authoritative.
5. Write `evaluations/robust-d1/retrospective/PROVENANCE.json`: the manifest hash, both record hashes, the two
   configurations' keys, grids, training figures, the git HEAD, the code hashes of the engine files used, and the
   evidence label of §6. The runner refuses to run if this file exists with different content (write-once per
   provenance; re-runs append a `runs[]` entry).

Expected training figures to reproduce (from `robust.json`, 5 bps, full engine fixed = replay exact): R1 net
$467,805.77, minute DD $21,625.76, 73 lots; portfolio ending equity $2,645,257, daily % DD 29.01%, minute 30.33%.
R4 net $371,689.72, minute DD $21,690.60, 81 lots; portfolio $2,229,808, 29.01% / 30.42%.

## 4. Order of operations inside the runner (each run)

1. **Training reproduction first** (always, both modes): load the configuration's members (plus VOOG/VGT for portfolio)
   on `training` with `access: 'manual evaluation'`, run the **full N-book engine** (`runNAllocator`), compare net,
   minute/daily DD, lot count and, for fixed mode, the replay field for field (`replayAgainstFull`). Any difference
   from the archived training figures beyond exact equality (the archive's own standard) **stops the runner** with a
   diagnostic; nothing further is computed.
2. **Continuous `all` run**: `loadNUniverse({ partition: 'all', access: 'manual evaluation', warmupSessions: 0 })`,
   books arming 2017-06-15, every state carried across 2024-01-01 and 2025-10-17 through the last common session;
   the universe's end must equal the last common session recorded in the 16-ETF manifest (2026-10-13) unless newer
   verified data exists, in which case the end is recorded and labelled. Fixed and portfolio exactly as the existing
   `evaluate` does for benchmarks (`src/joint-16-etf-d1/evaluation.ts` is the template; copy, do not import across
   study boundaries if that would couple the frozen study's code to new code).
3. **Outputs** (same CSV/JSON shapes as the existing evaluation runs): `summary.json` (segments development/holdout/
   final/full: strategy P&L, interest, costs, lots entered/exited, equity return on own base for the portfolio, daily
   and minute drawdowns in dollars and percent, borrowing-dollar-days, post-training borrowing), `lots.csv`,
   `daily.csv`, `signals.csv`, the bridge against B5 and B4 by segment (`bridgeOf`), the two-largest-lots dependence of
   the post-training Δ, the omitted-distribution bound for every member (lot-days × $100k × yield ÷ 365 at 1/3/6%),
   and `report.txt` headed by the evidence label.
4. **Replay check** on the fixed `all` run (replay = full engine, field for field), recorded.

## 5. Isolation from the new study (invariants and tests)

- The runner lives in its own module (`src/d1-robust/retrospective.ts`) that **no search, pilot, library, promotion,
  refinement or selection module imports**; a test greps the import graph.
- It opens data through a dedicated door `retrospectiveUniverse()` which requires the `--acknowledge-retrospective`
  flag, refuses any partition but `all`, refuses any configuration key but `R1`/`R4`, and refuses to run unless
  `PROVENANCE.json`'s content hash matches; the optimizer's door (`trainingUniverse`, `access: 'optimization'`) stays
  the only data path of every search module (existing tests re-used).
- Nothing it writes is under `research/`; nothing in `research/joint-16-etf-d1/` is modified (the no-advancement
  manifest and every record keep their hashes; a test re-hashes them before and after a runner invocation).
- Its outputs are **never** read by any module of the new study: the fitness, ranking, shortlist and gates have no
  code path to `evaluations/`. R1 and R4 appear in the new study only as **inspect-only comparators** — their
  configurations are evaluated under the new neighbourhood definition on training like B1/B4/B5, labelled
  `inspected post-2023 (retrospective run <date>)` in every table — and never as seeds, controls in the library, or
  initial-population members (see WALK_FORWARD §4 B10 for the general rule on inspected vectors).

## 6. Evidence label (verbatim, first line of every output file and console report)

```
RETROSPECTIVE — INSPECTED HISTORY — NOT AN INDEPENDENT HOLDOUT — NOT ACCEPTED.
This configuration was the leading training result of research/joint-16-etf-d1 (frozen "no advancement", 2026-10-25),
failed its preregistered gates and was never nominated. Post-2023 figures below are a historical inspection of a
training-optimized peak on data examined repeatedly by this research programme; they validate nothing and must not
inform any training fitness, ranking or shortlist.
```

## 7. Staging relative to the new study

Recommended order (default; see OPEN_DECISIONS.md D3 for the alternative):

1. The new study's protocol is written and **frozen** (its rules and constants can no longer be influenced by what the
   retrospective shows).
2. The runner is implemented and its training reproduction verified (step 4.1) — this is also a useful early test of the
   engine on the expanded universe load.
3. The four `all` runs execute and are reported to the user under the label.
4. The search stages run. The implementing agent then knows R1/R4's post-2023 history; the residual bias channel is
   implementation choices made after that point (bug fixes, logging), which the protocol freeze, the tests and the
   independent code review are designed to bound.

Alternative: run the four commands **after** the new study's selection freeze and locked confirmation. Cleaner, later.

## 8. Interpretation rules (written before the results exist)

- A strong post-2023 result for R1 or R4 does **not** make either a candidate; it is one more inspected observation of
  the {XBI, KRE, GDX} basin that B5 already represents. A weak or negative result does not condemn the basin either; a
  one-lot pool's two-year P&L is a handful of lots.
- The runs are reported in the new study's README under "Historically inspected exploration", separate from E1–E3
  evidence, with the bridges against B4/B5 so that the 2020 re-timing story can be followed into 2024–2026.
- After these runs, the training-fitness of any configuration within Jaccard distance < 0.5 of R1 or R4 **and** within
  2 step units of their vectors on shared members is additionally labelled "neighbour of an inspected configuration"
  in every report of the new study (reporting only; no gate).
