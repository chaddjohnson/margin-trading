# Protocol — Priority 2 follow-up: the separately optimized VGT D1 and Growth selections, pooled

Status: **FROZEN** once `COMPARISON_MANIFEST.json` (sealed, read-only) records this file's sha256. The manifest and this
file are committed **before any evaluation of the pair**. This file is never edited afterwards; changes go to
`AMENDMENTS.md` (append-only).

**What this is:** a **bounded retrospective diagnostic** on previously examined history.

**What this is not:**
- not a search;
- not a selection;
- not a new primary of Priority 2;
- not fresh validation;
- not a test of an untouched holdout.

Priority 2's frozen selection (`research/vgt-d1-growth-joint/FROZEN_SELECTION.json`, primary `C24/informed#1 top`) is
unchanged and stays its primary.

## 0. Standard adoption (optimization standard read and adopted)

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `1.0.0`, sha256 `8c38ac15285753240be52c1a55739b2d1f4bed0e49531821c19e7437d3ae639d` |
| Read / adopted (UTC) | 2026-11-08T21:42Z / 2026-11-08T21:42Z, in this session, after the standard was registered (see `STANDARD_ADOPTION.json` for the exact times) |
| Adoption manifest | `research/vgt-d1-growth-separate-pooled/STANDARD_ADOPTION.json`; preflight `npm run research-preflight -- --study research/vgt-d1-growth-separate-pooled`, also run in code before every stage |
| Scope | `diagnostic` (standard §0.1: §1, §2.1, §3.4, §5 and §6 apply; no search) |
| Brief | `brief/BRIEF.md`, sha256 `671ce9b8210e5b51d2dc9842a6b6b9d9142699c1d5feda6fcc7836da04cc31c5` (182 lines, read in full) |
| Branch / base | `research/vgt-d1-growth-separate-pooled` from `47422d04` (the tip of `research/vgt-d1-growth-joint`), main checkout |

### Adaptations and departures

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §1.8, §4 | adaptation | **No search, no earlier-cutoff reruns.** The pair's components were selected by Priority 2's frozen C24 single-family lanes. The brief forbids a new search and rerunning expensive searches. Their chronological status is reported from Priority 2's records (§9 there): its folds tested the joint lane only. |
| AD2 | §5.1 | adaptation | **Parity reused.** The engine is Priority 2's, unchanged: its evaluation digest `c936f691…` and code-closure digest `65de4cc4…` must equal its freeze, or every stage stops. Its sealed parity (`results/parity/parity-3.json`, 341/341) therefore applies. On top of that, every comparator's development and full-history record must equal Priority 2's sealed record field for field (§5), and the neighbourhood instrument must reproduce the joint primary's sealed C24 evidence exactly (§7). |
| AD3 | §6.3, §6.4 | adaptation | **No tuning benchmark** (brief: "Do not launch a broad tuning benchmark"). The neighbourhood stage uses 8 workers, inside Priority 2's measured stable range; observed use is reported. **Interruption tests** cover the only parallel stage (neighbourhood): a worker kill must fail the job promptly, a graceful stop must exit 75, and each must then resume to the straight run's record (pilot jobs, development data, nothing sealed). The comparison stage is one in-process run of seconds that seals only at its end; it is rerun whole if interrupted. |

There are no departures.

## 1. Question

Under Priority 2's frozen pool engine and conventions, take Priority 2's two **separately optimized single-family
selections**, unchanged, and pool them in one $100,000 slot. How does that pair compare with the following, on
development, validation and the full history?

- Priority 2's frozen **joint primary**;
- each of the two families **alone**;
- the **fixed** D1 primary + Growth #4 and D1 primary + Growth 08500a60 combinations;
- their standalone controls.

The answers are descriptive.
- "X earned more than Y on window W" means a higher net (or validation P&L) on W. The drawdown is always shown beside
  it.
- There is no composite score and no winner is chosen.
- Nothing seen here changes a case, a comparator, a definition or a statistic.

## 2. Prior knowledge (disclosed)

All of 2016-01-04 → 2026-10-30 has been examined before.

- **The components alone** (Priority 2's sealed validation):
  - D1 alone earned +$16,056.95 on 2025–2026;
  - Growth alone earned +$13,516.86 there, and its validation DD was $35,924.63, above the ceiling.
- **Every comparator's development, validation and full-history figures** are known from Priority 2's report.
- **The pooled pair** was not computed before this manifest. None of the six cases' configuration identities appears
  in any Priority 2 sealed record. It is also absent from the 27 Priority 2 job archives (`.cache/vgt-d1-growth-joint/jobs/*`,
  queried read-only on 2026-11-08: 0 hits; the same query finds the joint primary).
- **Priority 2's chronological test failed.** Its selection procedure was chronologically unsupported. Its folds
  tested the joint independent lane, not the single-family lanes the pair comes from.
- **Not an untouched holdout.** 2025–2026 is validation on previously examined history.

## 3. The pair (exact; full vectors in the manifest)

Resolved from `FROZEN_SELECTION.json` `singleFamily` and checked against the sealed C24 qualification record
(`results/folds/C24/selection.json`: `singleFamily` primaries and the qualified evidence of both labels).

- **Provenance.** Each was selected separately on 2016–2024. Each is rank 1 of its lane by Priority 2's frozen banded
  order.
- **No substitution.** Neither is replaced by another member. The shipped D1 `primary`, VG #2's VGT book, Growth #4,
  Growth 08500a60 and the joint primary's family vectors are controls. The manifest code refuses to proceed if the
  pair equals any of them.

| Family | Label | Settings |
|---|---|---|
| D1 | `C24/d1only#1 top` | X 23.9%, Y 1.0%, trailing stop 12.0%, maximum hold 25, L 48, buffer 4.2%, P 3.1%, W 96 (grid `239,10,120,25,48,42,31,96`) |
| Growth 1.4.0 | `C24/gonly/breakout/off#1 top` | Trend-breakout entry (SMA 90, slope comparison 20, prior high 25); no trend filter; no recovery gate; trailing stop 8.0%; maximum hold OFF; initial stop OFF; retention ON (sell 30%, SMA 170, 1 close below); continuation `breakout` (window 100, buffer 2.25%, formation bars 10); 5 bps per side |

Priority 2 stores a single-family member as a full joint vector. The disabled family's part of it is an unused filler.
The pair takes D1 from `d1only` and Growth from `gonly`.

## 4. The six cases (and canonicalization)

| Case | Architecture and priority | Role |
|---|---|---|
| **A · D1-first** | A: one exclusive $100,000 slot; same-instant decisions D1 first | **primary diagnostic** |
| A · Growth-first | A, Growth first | sensitivity |
| B 100/100 · D1-first | B: shared residual capacity, targets 100%/100%, $10,000 minimum, partial repayment is capacity | sensitivity |
| B 100/100 · Growth-first | as above, Growth first | sensitivity |
| B 50/50 · D1-first | B, targets 50%/50% | sensitivity |
| B 50/50 · Growth-first | as above, Growth first | sensitivity |

- **Before running.** The six configuration identities (`jointId`; A ignores its targets) are distinct.
- **After running.**
  - Cases whose funded-lot ledger signature and every reported total are equal on both doors are reported as **one
    behavioural class**, listing every member.
  - No case is dropped, ranked or selected.
  - The grid is not expanded.
- **What B does not change.** B neither alters either phenotype nor grants a second $100,000: B 50/50 holds at most
  $100,000 of principal in all.
- **What stays unchanged.** Every other Priority 2 convention is unchanged. In particular there is no delayed D1
  eligibility, no new allocation rule and no funding-aware signal lifecycle.

## 5. Comparators (Priority 2's frozen records; recomputed and required to equal them)

| Comparator | Priority 2 source label (development = C24 evidence; validation/full = validation row) |
|---|---|
| Joint primary | `C24/informed#1 top` |
| Optimized D1 alone | `C24/d1only#1 top` (Growth disabled) |
| Optimized Growth alone | `C24/gonly/breakout/off#1 top` (D1 disabled) |
| D1 primary + Growth #4 · A, · B 100/100, · B 50/50 | `control: D1 primary + Growth #4 · …` |
| D1 primary + Growth 08500a60 · A, · B 100/100, · B 50/50 | `control: D1 primary + Growth 08500a60 · …` |
| D1 primary alone; Growth #4 alone; Growth 08500a60 alone | `control: …` |

**Reuse is verified.** Each comparator is rerun with the frozen evaluator on D24 and FULL. Its record must equal the
sealed one in every field, or the stage stops before sealing anything. The comparators' neighbourhoods are reused from
the sealed C24 evidence (§7), not recomputed.

## 6. Evidence (the comparison stage)

For every case and comparator, on D24 and FULL, the stage reports:

- **Net:** net profit with its realized/unrealized split.
- **Drawdown:** the maximum minute DD in dollars and as a percentage of the fixed $100,000, with its dates.
- **Activity:** lots (trades) with wins/losses; interest and costs.
- **Families:** booked P&L per family.
- **Exposure:** sessions held, sessions with both families held, mean, peak principal and peak market value, and
  principal-days per family.
- **Open positions.**
- **Funding refusals,** with their reasons and the refused virtual trades' own net.
- **Holding times,** drawdown episodes and the top pool-level episodes.

The validation window adds:
- the P&L (the marked change from the 2024-12-31 close);
- the change in realized and in unrealized P&L;
- the reset DD;
- the lots entered after the boundary, and the lots crossing it;
- the 2025 and 2026 P&L.

**Checks** (computed from the unrounded pool totals; each residual must be below half a cent, and all are recorded):
- the D24 net − FULL's marked net at the 2024-12-31 close;
- realized + unrealized − net;
- Δrealized + Δunrealized − the validation P&L.

**Causal family removal** (both doors): the same configuration rerun with D1, then Growth, disabled. It is reported for
the six cases, the joint primary, D1 primary + #4 · A and D1 primary + 08500a60 · A, separately from booked P&L.

- **Identity check:** removing Growth from the primary pair must equal the optimized D1 alone, and removing D1 must
  equal the optimized Growth alone (signature and net), or the stage stops.

**Matched trades** (Priority 2's `matchLots`, both doors): the primary pair against the joint primary, both fixed
A combinations, both families alone and each of the five sensitivities.

- Each comparison is decomposed into unchanged, resized, retimed exit, retimed, newly admitted and displaced lots.
  Σ Δ reconciles to Δ net.
- **Scaling versus price path:** resized lots, with the same fills and a net proportional to principal (checked), are
  position-size scaling. Every other difference is a different price path.

## 7. The neighbourhood instrument (development only, D24)

- **The instrument.** Priority 2's development instrument, unchanged: `qualifyMembers` in
  `src/vgt-d1-growth-joint/qualify.ts`, with the cutoff label `C24`. It runs on the primary diagnostic pair
  (A · D1-first).
- **The families:**
  - selection: 2 × 128, seeds `('select', rep, 'C24')`;
  - **confirmation: 3 × 128 = 384**, seeds `('confirm', rep, 'C24')`;
  - D1-only: 128 (`('d1only', 'C24')`);
  - Growth-only: 128 (`('gonly', 'C24')`);
  - small (scale 0.5): 128;
  - wide (scale 1.5): 128;
  - the five stresses, the categorical toggles and the causal removals.
- **The method.** All seeds are `deriveSeed('vgt-d1-growth-joint', 'nbhd', …labels)`: common random numbers with every
  Priority 2 C24 member. Radii, rounding, clipping and statistics are Priority 2 PROTOCOL.md §6.1.
- **Frozen inputs.** The manifest records every family's seed and the sha256 of its ordered neighbour identities. The
  stage refuses if they differ.
- **Seed provenance (disclosed).** The confirmation seeds were also the confirmation seeds of the pair's two components
  in their own single-family scopes, and of every C24 member. They decided qualification there, never ranking: ranking
  used the selection seeds.
- **Reproduction check.** The same stage reruns the instrument on Priority 2's joint primary. Every Evidence field
  (centre, all families, stresses, toggles, removals, gates) must equal its sealed C24 evidence, or nothing is sealed.
  The comparators' sealed neighbourhoods are then reused on matched definitions.
- **Report-only.** Nothing here selects or replaces a configuration. There is no validation perturbation sweep.

## 8. Data, doors and windows

- **Data:** `data/VGT/data.csv`, sha256 `2ee06310…412e`. The last complete session is 2026-10-30, and November–December
  2026 are not evaluated.
- **D24** (development, 2016-01-04 → 2024-12-31, 2,264 sessions): Priority 2's pinned byte prefix.
- **FULL** (2016-01-04 → 2026-10-30): one continuous run, with nothing liquidated or reset at 2024-12-31.
  - Validation = 2025-01-01 → 2026-10-30; the first session is 2025-01-02.
  - The reset validation DD and the whole-run DD are both reported.
- **Conventions,** verified from source and equal to Priority 2's freeze record:
  - the harmonized start 2016-01-04, with each indicator on its own causal history;
  - one fixed $100,000 principal budget;
  - 5 bps per side, $0 commission;
  - 11% simple interest on outstanding principal (365-day basis);
  - stops at the stop or the gapped open;
  - fractional shares;
  - marks every regular minute while held and at every session close;
  - the DD ceiling $35,000 (35% of the fixed budget).
- **Door order.** Both doors open only after the manifest guard holds (sealed, sha256 equal to its seal, committed and
  unchanged, Priority 2 pins and digest unchanged). Every opening is logged in `results/doors.jsonl`.

## 9. Order of stages and guards

| Stage | Command | Output | Guard |
|---|---|---|---|
| S1 manifest | `npm run vgt-pair -- manifest`, then commit | `COMPARISON_MANIFEST.json` (sealed) | refuses if it exists; needs the preflight to pass |
| S2 pilot | `launch … -- neighbourhood --pilot p1 --kill-worker-after 300`, then rerun; `--pilot p2` stopped by SIGTERM, then rerun | `.cache/vgt-d1-growth-separate-pooled/pilot/` | development only; nothing sealed |
| S3 comparison | `launch --unit vgtpair-compare --wait -- compare` | `results/comparison.json` (sealed), `results/ledgers/` | manifest guard; once |
| S4 neighbourhood | `launch --unit vgtpair-nbhd --wait -- neighbourhood --workers 8` | `results/neighbourhood.json` (sealed) | manifest guard; reproduction check; once |
| S5 report | `node … tools/vgt-d1-growth-separate-pooled/tables.ts`; charts | `results/tables/`, `REPORT.md` | reads sealed records only |

The pilot's results must equal the sealed neighbourhood's pair evidence. A difference is reported as an incident.

## 10. Resources

- **Containment.** Every stage runs as a transient user unit in `vgtpair.slice`: MemoryHigh 44G, MemoryMax 48G, swap 0,
  re-applied before every launch. Units run one at a time, with `KillMode=mixed`, `Restart=no`.
- **Neighbourhood workers.** 8 child processes (`--expose-gc`, 1.5 GiB old space), with a GC every 8 evaluations or
  above 256 MiB of ArrayBuffers and ≤ 2 tasks in flight each.
- **The archive.** A SQLite archive is bound to the study, job, door pin and Priority 2's evaluation digest.
- **Monitoring.** A 10-second memory monitor stops dispatching at 16 GiB of the job cgroup and exits 75. A worker
  death fails the job, and nothing restarts it.

## 11. Integrity

- **Seals.** Sealed records are write-once (0444), with their sha256 in `results/seals.jsonl`; `npm run vgt-pair --
  verify` rehashes them.
- **Recorded in the manifest:**
  - this protocol's, the brief's, the adoption manifest's and the standard's sha256;
  - Priority 2's pinned records;
  - the evaluation and closure digests;
  - the data hash;
  - this study's own code files;
  - git `HEAD`.
- **Code changes.** A change to this study's own code after the freeze is recorded in `AMENDMENTS.md`. A change to
  Priority 2's evaluation code is impossible without failing the guard.

## 12. Reporting commitments

`REPORT.md` contains:

- the exact pair;
- the six cases, with their behavioural classes;
- the comparator tables for development, validation and full history, with every metric of §6 and proper currency
  formatting;
- the neighbourhood comparison on matched definitions, with the breach disclosure;
- the funded-trade explanation against the joint primary and the fixed combinations:
  - displaced and newly admitted trades;
  - refused trades with their virtual P&L;
  - causal removals separated from booked profits;
  - whether architecture or priority alter trades;
  - scaling versus price path;
- explicit answers to the brief's questions 1–4, stating what this single matched comparison cannot establish:
  different compute budgets (the joint lanes against the single-family lanes, counted from Priority 2's sealed C24
  search record) and different selection provenance (the joint primary is from the informed lane);
- observed resource use.

It never relabels the diagnostic as Priority 2's primary.
