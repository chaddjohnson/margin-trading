# Research recovery checkpoint — robust D1 pool discovery (Phase 2)

Written 2026-10-25T19:30Z; **updated 2026-10-25T22:00Z: THE STUDY IS COMPLETE (M0–M4). Nothing remains to run.**
Outcome: **no advancement** (G-WF failed); the benchmarks are retained. Nothing has been committed; no order was
placed; nothing from this study was evaluated after training. Read `README.md` and `RECOMMENDATION.md` for results.

## Summary (final state)

- M0–M2: protocol, ingestion (48 ETFs, 61 eligible), audit, tier E, freeze, controls, parity, pilots, both folds,
  G-WF FAILED (`results/walkforward/GWF.json` `c4ed4e55…`).
- M3: pre-search review → amendment 2; determinism identical; final search (`results/final/`, 2 × 24,000; one family;
  one passing finalist GDX KRE XBI XLE, seeded arm, not nominated); pre-freeze review → amendment 3;
  **`FROZEN_SELECTION.json` (`2b56ed01…`, 21:39:36Z): no advancement, no nominee**; confirm-b (`results/confirmB/`).
- M4: `evaluate` wrote only its no-advancement record (`results/evaluation/evaluation.json`, 21:45:22Z); the four
  RETROSPECTIVE R1/R4 runs are in `evaluations/robust-d1/retrospective/` (training reproduced exactly; 16-ETF directory
  unchanged).
- Reports: README (verdict), WALK_FORWARD_RESULTS, SEARCH_COVERAGE, POOL_FAMILIES_AND_REFINEMENT,
  NEIGHBORHOOD_ROBUSTNESS, HOLDOUT_FINAL_RESULTS, RETROSPECTIVE_R1_R4, IMPLEMENTATION_AUDIT, RECOMMENDATION; tables in
  `results/tables/` (`npm run robust-d1 -- tables`).
- **Do not rerun any stage.** Every stage refuses a rerun (sealed or existence guards). Per §23 the study is stopped: a
  new question needs a new protocol. Committing is left to the user.

## 1. Environment

```bash
cd /Users/chad/development/personal/margin-trading
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH   # Node v24.21.0 (engines ≥ 24.21.0)
npm run robust-d1 -- <command>                                                      # 12 GB heap; no .env autoload
```

- Branch `research/trailing-buy-four-family-optimization`, HEAD `0e2df80d` (unchanged). **Do not commit** unless the
  user asks.
- Modified tracked files (all intended): `.gitignore` (study logs), `config/market-events/splits.json` (13 appended
  splits; existing entries unchanged), `config/phenotypes/COMPATIBILITY.md` (generated row `robustD1`),
  `package.json` (script `robust-d1`), `src/lib/tests/corporateActions.test.ts` (extended to the 13 splits, strict
  equality kept), `src/phenotype/strategies.ts` (entry `robustD1`). Untracked: `src/d1-robust/`, `src/app/robustD1.ts`,
  `research/d1-robust-pool-discovery/`, `config/market-events/raw/split-sources-2026-10-25/`, 48 new `data/<SYMBOL>/`.
- Hardware: Apple M1 Pro, 10 cores, 16 GB; tier E uses 8 worker threads.
- The Alpaca credentials are read from `.env` by the ingestion orchestrator only (no further downloads are needed).

## 2. The freeze and its hashes (never rewrite these files)

| Record | Value |
|---|---|
| `results/protocol_draft_commitment.json` | pre-ingestion protocol `74d09beb…`, context `18a921f6…` (2026-10-25T15:10:38Z) |
| `results/protocol_freeze.json` (sealed, body `5120b804…`) | frozen 17:23:46Z; protocol `9ec36890…`, context `18a921f6…`, universe `ea7011ff…`, tier `0f0206df…`, splits `e5bde427…`, ledger `3b4342eb…`, code manifest `02ed10c9…` (376 files) |
| `results/amendments.jsonl` | amendment 1 (stage pilot, 18:31:51Z, post-outcome flagged): protocol → `03025d98…`, code → `eb9b60b6…`, hash `a1a1847a…` |
| `results/amendments.jsonl` | amendment 2 (stages search … research-run, 20:12:40Z, before any of their outputs; after GWF.json): protocol → `3becd349…`, code → `f32d5e5a…`, hash `ddd4f7ca…` |
| `results/amendments.jsonl` | amendment 3 (stages freeze-selection … research-run; after the final search, before the freeze): protocol → `5a216c53…`, code → `d8b9b900…`, hash `91aadfdd…` |
| current head | PROTOCOL.md `5a216c53…`, context.ts `18a921f6…`, code manifest `d8b9b900…` |
| `FROZEN_SELECTION.json` (sealed) | body `2b56ed01…`, 2026-10-25T21:39:36Z: no advancement, no nominee; binds 24 records, 61 data files, engine and code hashes |
| record hashes | `results/records.sha256` (every study JSON record and retrospective output), `results/jsonl-records.sha256` (every JSON-lines log, incl. the git-ignored discovery logs) |

**Code discipline after the freeze.** Every outcome stage calls `requireProtocolFrozen`, which throws unless the
protocol, context and code manifest (every `src/**/*.ts` except tests, `generated/` and `src/d1-robust/report.ts`)
equal the amendment head. Any further code or protocol change needs, *before the affected stage's first output*: the
change, its text appended to PROTOCOL.md §24, then
`npm run robust-d1 -- amend --stage <stage> --change "…" --reason "…" --outputs <paths that must not exist>`.
`report.ts` (tables) may be edited freely.

## 3. Completed stages — do not rerun (write-once guards in brackets)

| Stage | Command | Records | Guard / note |
|---|---|---|---|
| commitment | `commit-draft` | `results/protocol_draft_commitment.json` | refuses if present |
| ingestion | `ingest …`, `ingest X --resolve` | `results/ingestion/` (attempt logs, logs, results), `market-events-verify.txt` | canonical files exist → `exists`; never re-ingest |
| audit | `audit` | `results/audit/universe.json` | refuses after the freeze |
| benchmark | `benchmark` | `results/benchmark/{benchmark,tier}.json` | refuses after the freeze |
| freeze | `freeze-protocol --changes results/changes-since-commitment.txt` | `results/protocol_freeze.json` | sealed, write-once |
| controls | `controls` | `results/controls/controls.json` (passed) | rerun harmless but unnecessary (~6 min) |
| parity | `parity` | `results/parity/parity.json` (passed), `lookahead-supplement.json` | rerun harmless but unnecessary (~17 min) |
| pilots | `pilot --window fold-a|fold-b|final` | `results/pilot/<w>/{pilot.json,controls.jsonl,pilot_freeze.json}`; first failed run in `first-run/` | `pilot_freeze.json` sealed; refuses to rerun |

Pilot constants (sealed): n_D = 12 in all windows. References (R_m/R_t): **final** all strata $35,000/$45,000
(floors); **fold-a** k ≤ 5 floors, k = 6 $35,379/$49,061, k ≥ 8 $48,649/$62,644; **fold-b** k ≤ 6 floors, k ≥ 8
$45,438/$54,295. Pilot freeze bodies: fold-a `27937e19…`, fold-b `dc4a23b1…`, final `bb2336e7…`.

## 4. Fold-a: COMPLETE (round and validation) — do not rerun

Both commands refuse to rerun (`walkforward` refuses once `PICKS.json` exists; `validate` once `validation.json`
exists). Records in `results/walkforward/fold-a/`: `round.json` (door record, budgets), `J/` and `Q/`
(`discovery.jsonl` 12,000 evaluations each, `discovery.json` incl. descriptive PBO, `promotion.json`,
`refine-f1..f4.json`, `assessment.json`), `benchmarks.json`, sealed **`PICKS.json`** (body `38a220964cf0…`, frozen
19:31:34Z), `round-run.json` (timings), sealed **`validation.json`** (body `d350ea4d5024…`, 19:35:52Z; its `picksHash`
equals the PICKS body hash; 49 windowed-drawdown self-checks all equal the replay). Run log:
`/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/72e17b81-e77c-48a2-a54d-99f11614423a/scratchpad/fold-a.out`.

Fold-a results (training window ≤ 2020-06-30; validation 2020-07-01 → 2021-12-31; fixed pool, 5 bps):

| | Members | Search-window centre (E0) | P50_A (256 draws) | Validation net V | Percentile among 40 eligible controls | Validation minute DD |
|---|---|---:|---:|---:|---:|---:|
| **J primary** | EDV GDX KRE | $173,900 | $175,746 | **+$4,189** | 0.40 | $27,959 |
| J alternate 1 | EDV GDX XRT | $184,604 | $182,239 | +$120,241 | 1.00 | $78,831 |
| J alternate 2 | GDX IJH SMH | $171,334 | $169,202 | −$24,004 | 0.03 | $43,523 |
| **Q primary** | EWZ GDX | $201,814 | $137,694 | **−$30,323** | 0.03 | $49,172 |
| Q alternate 1 | GDX XHB | $180,439 | $141,572 | +$46,573 | 0.95 | $36,166 |
| Q alternate 2 | GDX XLI | $177,505 | $62,613 | +$4,557 | 0.40 | $38,289 |
| B1 / B4 / B5 (in-sample references) | | $80,585 / $67,278 / $171,036 | | +$32,629 / +$62,144 / +$46,508 | 0.85 / 1.00 / 0.95 | |

Control quantiles of V: ctl_0.25 = $0, ctl_0.50 = $8,777, ctl_0.75 = $23,936. For G-WF this fold gives: J primary
V > ctl_0.25 (clause ii satisfied, narrowly), V < ctl_0.75 (clause i not met in this fold), DD ≤ $45,000 (clause iii
satisfied). G-WF is decided only after fold-b (`gwf`). Portfolio validation returns (symmetric, own base): J primary
+65.4% (training daily % DD 22.5%), Q primary +54.7%, B5 +79.8%. Labels: J primary capacity-limited (EDV) — not an
exclusion in a fold; two J finalists thin evidence.

## 4b. Fold-b, G-WF, amendment 2, determinism: COMPLETE — do not rerun

Fold-b (`results/walkforward/fold-b/`): J arm's top 300 chained into one family (all contain GDX and XRT); its one
finalist GDX IBB XME XRT (P50_A $263,243, S_A $243,243) failed G3 (XRT smoothed marginal −$1,897) → **no J pick**. Q pick
GDX VGT XHB: V −$39,158 (0th percentile of 42 eligible controls; ctl_0.25 −$11,622, ctl_0.75 $4,565), validation DD
$68,783. G-WF FAILED. Reports: `WALK_FORWARD_RESULTS.md` (written), tables `results/tables/walkforward.md`,
`coverage.md` (`npm run robust-d1 -- tables`; report.ts is outside the manifest and was extended).

## 5. Remaining work, in order (PROTOCOL.md §20)

```bash
# folds, G-WF, determinism, pre-search review and amendment 2: DONE
npm run robust-d1 -- search                         # DONE (50 min)
#   → independent review BEFORE the selection freeze: DONE → amendment 3 (91aadfdd…)
npm run robust-d1 -- freeze-selection               # DONE (2b56ed01…, no advancement)
npm run robust-d1 -- confirm-b                      # DONE
npm run robust-d1 -- evaluate                       # DONE (no-advancement record only)
# evaluate --confirm: refused without nominees (not applicable)
npm run robust-d1 -- research-run --config R1 --mode fixed     --dataset all --cost 5 --acknowledge-retrospective
npm run robust-d1 -- research-run --config R1 --mode portfolio --dataset all --cost 5 --acknowledge-retrospective
npm run robust-d1 -- research-run --config R4 --mode fixed     --dataset all --cost 5 --acknowledge-retrospective
npm run robust-d1 -- research-run --config R4 --mode portfolio --dataset all --cost 5 --acknowledge-retrospective
# the four research runs: DONE (write-once; a rerun is refused)
npm run robust-d1 -- tables                         # regenerable at any time (reads records only)
```

Order constraints enforced in code: validation needs the fold's sealed PICKS; `gwf` needs both validations; `search`
needs `GWF.json` and refuses if `selection-candidates.json` or `FROZEN_SELECTION.json` exists; `freeze-selection`
reads G-WF from the sealed `GWF.json`; `confirm-b` and `evaluate` need the sealed selection; the retrospective runner
needs the sealed selection **and** `results/evaluation/evaluation.json`. If G-WF fails, the final round still runs as
exploration, nothing is nominated, and `evaluate` writes only its no-advancement record.

**Not implemented, and not needed (G-WF failed, so no nominee can exist; since amendment 2 `evaluate` refuses
nominees without it):** the §16 dividend diagnostic for nominees and benchmarks
(issuer histories, else Alpaca corporate actions; a fully accounted fixed-pool diagnostic when complete). With no
nominee, report per-book omission bounds only (lot-days × $100k × 1/3/6% ÷ 365, from the evaluation or assessment
lots).

**Reports still to write** (from the records; tables via `report.ts`): WALK_FORWARD_RESULTS.md (folds, J vs Q,
controls' percentiles, regimes, G-WF), SEARCH_COVERAGE.md, POOL_FAMILIES_AND_REFINEMENT.md, NEIGHBORHOOD_ROBUSTNESS.md,
HOLDOUT_FINAL_RESULTS.md (E0–E3 labels; or the no-advancement statement), RETROSPECTIVE_R1_R4.md (label; pointers to
the four `evaluations/robust-d1/retrospective/` outputs), IMPLEMENTATION_AUDIT.md, RECOMMENDATION.md, README.md
(verdict). Already written: PROTOCOL, APPROVED_DEVIATIONS_FROM_FABLE, DATA_AND_UNIVERSE_AUDIT, INGESTION_RUNS,
PILOT_CALIBRATION, CACHE_AND_CAUSAL_PARITY, README (runbook draft).

**Final audit checklist:** `npm test` (last full run 519/519), `npx tsc --noEmit` (clean), `npx eslint` (0 errors, 15
warnings = baseline); compare `data/*/data.csv` and tracked files with `results/audit/baseline-2026-10-25/` hash lists
(expected changes: the six tracked files in §1 only; the 16 existing data files and reports must be identical); 16-ETF
manifest unchanged; `git status`; update the auto-memory file for this programme.

## 6. Decisions and constants (all in PROTOCOL.md / context.ts; summary)

- Universe: 61 symbols (`results/audit/universe.json` → `eligible`), one calendar of 2,710 sessions 2016-01-04 →
  2026-10-13; splits forward-adjusted from the registry (19 entries). XLF's 2016-09-19 in-kind distribution checked
  harmless for reference highs (`results/checks/xlf-distribution-check.ts`).
- Tier E: discovery 24,000 configurations per final arm (two arms), 12,000 per fold arm (J and Q); islands 8 × 48,
  cap (budget − 15% reserve) ÷ 8; promotion top 300 at 96 draws; refinement ≤ 6 families final / ≤ 4 fold, 48 draws,
  cap 800 / 500; confirm-A and confirm-B 256 draws; A2 128, N2 64, N3 8/member.
- Objective S = P50 − $5,000·k − 1.0·max(0, DDmed − R_m) − 0.5·max(0, DD90 − R_t); hard F1 centre minute DD ≤ $35k
  at 5 and 10 bps; F-P training portfolio daily % DD ≤ 35% (symmetric dividends). Q arm: centre net − $5,000·k.
- Gates G1–G8 (§14): materiality $25k ($50k if portfolio DD in (30%, 35%]) versus B4 and B5 with a 90% paired-
  bootstrap lower bound > 0 and S_A(C) ≥ S_A(B). G-WF (§13.4) as written, with the ≥ 10-control comparator floor.
- Seeds: every stream `Rng.from('robust-d1', window, stage, …)`; library `deriveSeed('robust-d1','library',
  'sobol-scramble')`; pilot configurations `('robust-d1','pilot-config',k,i)`.
- Benchmarks reproduced (5 bps, `all`): B4 fixed $284,244.74, portfolio $3,608,484.05, 34.65%; B5 fixed $486,207.77,
  portfolio $5,410,976.72, 29.67%, fixed minute DD $26,509.97.
- Pilot findings: B4/B5 final-window P50 $133,125 / $205,455, DDmed ≈ $36.8k, DD90 $51k / $58k (would fail Fable's
  hard F2); random controls' persistence ≈ 0 (raw −0.006, smoothed 0.023).
- Fold-a J discovery: 8,286 of 12,000 centre-feasible; descriptive PBO 0.63 (S = 8) / 0.79 (S = 16).

## 7. Things to disclose in the final report

1. Amendment 1 (post-outcome, pilot shareAbove pool) — PROTOCOL §24, PILOT_CALIBRATION §1.
2. While fetching the IJR prospectus supplement from sec.gov, the user's email address was sent in the HTTP
   User-Agent header (SEC asks for a contact); not repeated since.
3. Ingestion: 26 symbols needed retries (connection resets); 11 ingest result records were overwritten by the first
   `--resolve` and rebuilt from the attempt logs (marked `reconstructed`); no data affected.
4. The frozen-stage P3 lookahead check was thin (1 earlier decision); the supplementary check (12 pools, 25–75 earlier
   decisions) is in `results/parity/lookahead-supplement.json` (script `results/checks/lookahead-supplement.ts`).
5. The independent pre-freeze review (3 material, 20 minor findings) and the fixes: APPROVED_DEVIATIONS §9 and
   `results/changes-since-commitment.txt`.
6. The independent pre-search review (2 material — both on the nominee path of `evaluate` — and 7 minor findings) and
   amendment 2, recorded after GWF.json (PROTOCOL §24, APPROVED_DEVIATIONS A-2). The fold assessments keep the
   never-computed C0 same-dates drawdown (NaN) that amendment 2 fixed for the final round.
7. G-WF clause (iii) recorded as failing for the fold without a J pick (the protocol text says that only of (ii)).
8. Fold-a's J primary was decided by the key tie-break within M ÷ 2 (EDV GDX KRE over EDV GDX XRT).
9. `src/d1-robust/tests/records.test.ts` would have made an acknowledged R1/R4 call during `npm test` after the
   selection freeze; guarded (tests are outside the manifest).
