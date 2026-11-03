# Study 8 — baselines and engineering parity

Every figure here was produced by `npm run study8 -- parity`, **attempt 2**, 2026-11-01T15:56Z–16:06:07Z. It is
sealed as `results/parity/parity.json` (file sha256 `3da4a3e3…`, body `4d91be308585…`) and is chain entry 3 `parity`
(`aa9e2726…`).

**Attempt 1** (15:46–15:55Z) passed every gate except P5. P5's code read the period keys `DEV`/`VAL`, which Study 8
names `TRAIN-F21`/`TEST-F21`, so its period figures were `undefined`. Attempt 1 is preserved in
`results/parity/attempt-1/`; the fix is amendment E1, chain phase `code-E1`.

Accounting throughout:
- fixed $100,000 single funded slot; 11% simple interest; 5 bps per side unless stated;
- stops at the stop or the gapped open;
- accounting from the close of 2016-01-04; arming on 2017-06-15.

## Gates (PROTOCOL.md §9)

| Gate | Result | What was checked |
|---|---|---|
| P1 | **pass**, 0 differences in 147 comparisons | Fast replay against the authoritative N-book engine: lots, signals, virtual trades, daily rows, both drawdowns, net. Seven configurations at 0/5/10 bps on W23 (training partition, to 2023-12-29), W24 (to 2024-12-31) and W29 (to 2026-10-29): B1, VG, VXR, VXRG, B5, G-PA, G-NM1. Six random joint perturbations each of VG, VXR, VXRG and the five-book pool on all three horizons. VG, VXR and B5 at 8%, 14%, next-open and +25 bps on W29. Comparisons per horizon: W23 45, W24 45, W29 57 |
| P2 | **pass**, 147/147 | This study's evaluator equals the Study 5 evaluator on the same runs (net, minute and daily DD, lots) |
| P3 | **pass** | The pools CLI (`npm run pools -- fixed B5 --end 2026-10-13`) equals `config/pools/B5.json`'s regression anchors and this evaluator. Study 7's sealed `final.json` has exactly 15 controls and ranks 1–12; all 27 are reproduced to the cent on W29, and all 27 W13 rows on W13 |
| P4 | **pass** | Data hashes, the 2026-10-13 prefixes equal the B5 pins, 2,722 sessions to 2026-10-29 |
| P5 | **pass** (attempt 2) | GDX control provenance. IDs and grids equal Study 5's records. G-PA, G-TS, G-SR and G-NM1–3 re-run on W23 reproduce Study 5's sealed DEV and VAL net and minute DD to the cent. G-T1P, G-T1S, G-T2C and G-T2P are **grid-only** (Study 5's Track 1/2a records hold no comparable figure). The frozen grids equal the registry files for all five books |
| N1 | **pass**, 110 checks | No lookahead at two cuts, 2024-12-31 (`parity-cut`) and 2019-12-31 (`parity-F19`). 80 traces (8 random vectors × 5 books × 2 cuts) reproduce the full run's closed trades and decisions before the cut. 18 pools (VG, VXR, VXRG and five-book pools, plus frozen B5) reproduce funded lots and daily marks. 12 more pools do so under next-open stops and +25 bps slippage |
| C1 | **pass** | Trace and setting cache keys distinct; caches refused across doors and engines; 200 cached records recomputed equal |
| D1 | **pass** | A smoke search run twice fresh and once stopped after 3,000 points and resumed: identical bodies (`ab137511…`) and archives (`54b21c2f…`) |
| T0 | **pass** | The test-stage pipeline (the code of every test door) ran twice on frozen configurations under F23 geometry: holders frozen VG and G-NM1, B5 as a lite member, controls B1, B5, VG and G-PA. The two runs were identical in sealed form, with minute series, gap risk, 6 bootstraps per holder, return rank and outcome present. Only booleans and counts were kept |
| G1 | **pass** | During parity, `search-F24`, `search-F19`, `test-F19`, `test-F24` and `pilot-F24` all refused |

## Frozen controls on the full history (W29: 2016-01-04 → 2026-10-29, 5 bps; reproduced to the cent)

These are Study 7's sealed final-door figures, reproduced by this study's evaluator. They were already inspected
before Study 8. Minute DD is the maximum minute-sampled mark-to-market drawdown per $100,000.

| Control | Net | Minute DD | Daily DD | Lots |
|---|---:|---:|---:|---:|
| B1 (VGT `primary`) | $176,260.47 | $19,534.41 | $15,817.01 | 21 |
| VG frozen | $278,265.71 | $25,773.90 | $22,562.67 | 34 |
| VXR frozen | $228,474.83 | $19,534.41 | $17,162.60 | 38 |
| VXRG frozen | $387,856.56 | $25,773.90 | $22,562.67 | 53 |
| **B5** | **$484,636.97** | $26,509.97 | $23,788.61 | 95 |
| G-PA (GDX `portfolioAware`) | $197,028.85 | $34,133.92 | $32,183.99 | 26 |
| G-NM1 / G-NM2 / G-NM3 | $262,019.78 / $255,319.34 / $252,771.51 | $30,615.72 / $30,833.96 / $34,238.68 | — | 86 / 93 / 87 |

At **2026-10-13** (W13, the prospective cutoff):
- B5: **$486,207.77**, minute DD $26,509.97, 94 lots. This equals `config/pools/B5.json`'s anchors and the pools CLI.
- B1: $176,260.47, DD $19,534.41, 21 lots. B1 took no trade between 2026-10-13 and 10-29.

These match the figures the brief quotes from Study 7 (B5 $486,207.77 at 2026-10-13 and $484,636.97 at 2026-10-29).
They were read from the sealed records, not typed in.

## Study 7 research references (W29, reproduced to the cent)

| Study 7 rank | Net | Minute DD | Lots |
|---|---:|---:|---:|
| #1 VG profit | $284,271.14 | $28,297.09 | 63 |
| #2 VG robust | $274,857.19 | $26,017.67 | 49 |
| #5 VG balanced | $244,081.10 | $21,020.11 | 28 |
| #6 VXR profit | $222,332.01 | $26,103.54 | 34 |
| #7 G profit | $168,377.56 | $18,333.46 | 22 |
| #10 G balanced | $162,406.31 | $17,280.74 | 19 |
| #11 G robust | $166,638.18 | $17,280.74 | 20 |

These are Study 7's in-sample-through-2023 candidates. On 2025–2026 they are **not** out-of-sample, and they never
enter any Study 8 selection.

## Data and conventions

- **Data:** sha256 VGT `624e4094…`, XBI `83b71f75…`, XRT `c625ca57…`, KRE `fd7ab8aa…`, GDX `134b7450…`. The
  2026-10-13 prefixes equal the B5 pins. Pinned at the freeze and re-checked at every door.
- **Distributions:**
  - The worktree reads the committed `config/market-events/distributions.csv` (`3b4342eb…`). The user's modified copy
    in the main checkout (`30feaa99…`), which Study 7 read, is untouched.
  - The fixed pool books no distributions. P3's equality with Study 7's sealed figures confirms the difference has no
    effect.
- **Comparison convention:** every comparison in this study uses the fixed-pool convention above. The ordinary
  `npm run app` standalone path defaults to 0 bps and is not comparable without matching the costs.
