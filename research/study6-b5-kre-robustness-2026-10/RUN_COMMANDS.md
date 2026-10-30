# Run commands (verified)

Run everything from the repository root with Node v24.21.0:

```bash
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
```

The canonical data `data/{VGT,XBI,XRT,KRE,GDX}/data.csv` must be at the hashes in `results/data/data-audit.json`
(through 2026-10-29). No credentials, network or broker are used.

## 1. Verified commands (re-runnable; executed 2026-10-30T23:17–23:21Z, all exit 0)

`bash research/study6-b5-kre-robustness-2026-10/scripts/verify_commands.sh` runs them all. The outputs are in
`results/logs/commands/NN.log` and the exit statuses in `results/logs/commands/index.txt`.

| # | Command | Exit | What it printed (key figures) |
|---|---|---:|---|
| 01 | `npm run pools -- fixed B5 --end 2026-10-13 --out evaluations/study6/commands/B5-fixed-2026-10-13` | 0 | frozen B5 **pinned endpoint**: net $486,207.77, 94 lots, minute DD $26,509.97 (2020-02-19 12:49 → 2020-03-12 10:23 ET) |
| 02 | `npm run pools -- fixed B5 --out evaluations/study6/commands/B5-fixed-2026-10-29` | 0 | frozen B5 **current endpoint**: 95 lots (1 open: GDX since 2026-10-22, marked −$1,570.80), realized $486,207.77, minute DD $26,509.97 |
| 03 | `npm run study6 -- verify-records` | 0 | 31 sealed records verified, 0 failures; 18 manifest records and 47 tables re-hashed; protocol unchanged at 23:17Z. Re-run at 23:22Z, after the §13 disclosures were appended, it reports `PROTOCOL.md` `b4f29153…` as "amended after the freeze — see §13" (still exit 0) |
| 04 | `npm run study6 -- nbhd B5` | 0 | centre $484,637 / DD $26,510; **joint N1 C1: 31.3% < $35,000, p90 $55,952 → gate FAIL**; per-book KRE 57.8% (p90 $35,251), GDX 89.1%, VGT 95.3%, XBI 100%, XRT 100% |
| 05 | `npm run study6 -- nbhd B5 --window W13` | 0 | the same at 2026-10-13: centre $486,208, C1 31.3%, p90 $55,952 → FAIL |
| 06 | `npm run study6 -- trace B5` | 0 | worst minute DD $26,510 = tracker; peak 2020-02-19 12:49, trough 2020-03-12 10:23; lots VGT 2019-08-05 −$10,783, VGT 2020-02-28 +$2,295, KRE 2020-03-09 −$18,023; residual 3.6e−12 |
| 07 | `npm run study6 -- pool fixed S6-K3` | 0 | research pool K3 (Track K): 89 lots, realized $419,602.45, minute DD $30,583.58 (2020-06-08 → 2020-08-07) |
| 08 | `npm run study6 -- pool fixed S6-J1 --end 2026-10-13 --out evaluations/study6/commands/S6-J1-fixed-2026-10-13` | 0 | research pool J1 (Track J) at the pinned endpoint: 99 lots, $374,714.38, DD $28,889.87 (2024-04-12 → 2025-04-08) |
| 09 | `npm run study6 -- pool fixed S6-O-PA-S` | 0 | research pool O-PA-S (B5 optimizer): 81 lots, realized $424,505.30, DD $32,201.05 |
| 10 | `npm run study6 -- pool fixed S6-O-ME-lowDd` | 0 | research pool O-ME-lowDd (multi-etf-d1 method): 100 lots, realized $467,658.51, DD $26,509.97 |
| 11 | `npm run study6 -- nbhd S6-J1` | 0 | centre $373,144 / $28,890; joint C1 31.3%, p90 $65,527 → FAIL (XBI per-book 57.8%) |
| 12 | `npm run study6 -- nbhd S6-O-PA-S` | 0 | centre $422,935 / $32,201; joint C1 35.2%, p90 $50,008 → FAIL |
| 13 | `npm run study6 -- trace S6-K3` | 0 | worst DD $30,584 (2020-06-08 → 2020-08-07): a chain of KRE max-hold losses |
| 14 | `npm run study6 -- trace S6-J1` | 0 | worst DD $28,890 (2024-04-12 → 2025-04-08): GDX −$9,803, VGT 2025-04-03 −$11,326, XRT −$5,860 |
| 15 | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study6-b5-kre-robustness/tests/study6.test.ts src/pools/tests/pools.test.ts src/pools/tests/forward.test.ts` | 0 | **31 tests: 29 pass, 0 fail, 2 skipped** (the B4/B5 anchor tests skip because the canonical files were appended; commands 01/02 and parity P3 cover those anchors) |

**Usage of the inspection commands:**
- `nbhd <B5|S6-ID> [--window W29|W13] [--rep 1|2|3]` and `trace <B5|S6-ID> [--window W29|W13]` work for frozen B5 and
  for any research pool `S6-K1…K6`, `S6-J1…J4`, `S6-O-PA-S`, `S6-O-ME-primary`, `S6-O-ME-lowDd`.
- `pool fixed S6-<ID> [--end YYYY-MM-DD] [--cost-bps N] [--json]` runs any research pool through the unchanged pools
  engine and report.
- Every candidate's full five-ETF parameter vector is in its `config/research-pools/study6-b5-kre-robustness/S6-*.json`
  file and in `CANDIDATE_ROBUSTNESS.md`.

## 2. The study's stage commands (executed once; write-once — they refuse to overwrite a sealed record)

Logs are in `results/logs/<stage>.log`. To replicate from scratch, move `results/` aside first; every stage is
deterministic. `final --confirm` is the one stage designed to re-run: it reproduced `final.json` exactly.

```bash
npm run study6 -- freeze-protocol          # 2026-10-30T22:41:46Z
npm run study6 -- parity                   # P1/P3/P5 (≈ 1.5 min)
npm run study6 -- data                     # S2
npm run study6 -- a1 && npm run study6 -- a2
for w in WDEV W23 W13 W29; do npm run study6 -- a3 $w; done   # neighbourhoods (≈ 3–4 min per window)
for w in WDEV W23 W29; do npm run study6 -- a4 $w; done       # joint decomposition
npm run study6 -- a5 && npm run study6 -- a6 && npm run study6 -- a7 && npm run study6 -- a8
npm run study6 -- p4                                          # B5-optimizer reproduction (≈ 1 min)
STUDY6_WORKTREES=/path/to/scratch npm run study6 -- r-om      # multi-etf-d1 KRE search in a detached worktree (≈ 1.5 min)
npm run study6 -- diagnostic-freeze                           # then commit (Part B refuses otherwise)
npm run study6 -- b-track-k main && npm run study6 -- b-track-k wf19 && npm run study6 -- b-track-k wf20
npm run study6 -- b-track-o-pa
STUDY6_WORKTREES=/path/to/scratch npm run study6 -- b-track-o-me
npm run study6 -- b-wf-test && npm run study6 -- b-track-j
npm run study6 -- b-shortlist && npm run study6 -- b-validate && npm run study6 -- freeze-selection
npm run study6 -- final && npm run study6 -- final --confirm
npm run study6 -- research-configs                            # writes the labelled research configuration files
```

## 3. Not run here (by design)

- **No actual-portfolio, VOOG/VGT core or 20%-of-equity margin command:** out of scope.
- **No broker command, and no `--env-file` load:** the `study6` script does not load `.env`.
