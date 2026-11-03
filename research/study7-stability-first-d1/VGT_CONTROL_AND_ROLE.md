# VGT: the B1 control, the standalone-reoptimization decision, and VGT's role inside the pools

## Sources

- Phase A: `results/phaseA/B1-*.json`.
- Track V diagnostic: `results/phaseB/V/{M,L}/search.json`.
- The trigger: `npm run study7 -- v-trigger` (also sealed into `FROZEN_SELECTION.json` `v`).
- Validation controls: `results/phaseD/*/*/validation.json`.
- The final door: `results/final/final.json`.

B1 is VGT `primary` (`d1-ebc9f639b3`: X 21.6, Y 0.3, stop 7.3, hold 8, L 74, buffer 2.9, P 9.0, W 60) alone in the
fixed $100,000 slot. It is frozen everywhere and **in-sample through 2025**, because the VGT programs selected it with
2016–2025 data.

## 1. B1's robustness evidence (equal costs to every other configuration)

| Evidence | Window | Centre net / minute DD | Neighbourhood share < $35k | p90 DD | Median net | Source |
|---|---|---|---|---:|---:|---|
| Phase A joint N1 clip, 5 × 128 | W23 | $135,359 / $19,534 | 99.2% (reps 99–100%) | $28,848 | $74,997 | `phaseA/B1-W23.json` |
| Phase A joint N1 clip, 5 × 128 | W29 | $176,260 / $19,534 | 99.2% (reps 99–100%) | $28,848 | $120,679 | `phaseA/B1-W29.json` |
| Phase A in-box / 0.5r / 1.5r | W29 | — | 100% / 100% / 100% | — | — | same |
| Fold-M confirmation, 3 × 128 pooled | → 2023 | $135,359 / $19,534 | 100% | $28,294 | $11,690/yr | `phaseD/*/M/validation.json` |
| Final door, 3 × 128 pooled (new seeds) | FULL | $176,260 / $19,534 | **100%** | $28,704 | $125,304 | `final/final.json` |

- **Execution sensitivity (FULL):**

  | Setting | Net | Minute DD |
  |---|---:|---:|
  | 0 bps | $179k | $19.3k |
  | 20 bps | $171k | $20.1k |
  | 14% interest | $168k | $19.7k |
  | 25 bps slippage | $172k | $20.1k |

- **The only Phase A breach** (1 of 640 neighbours) is a 2020-Q1 path at $36,244.
- **This study's B1 figures agree with Study 6:** centre $19,534; 100% of neighbours below $35k; p90 $28.1k–$29.1k.
  B1 is the one configuration that passes the neighbourhood gate on every design, window and seed family in this study.
- **B1 is not "qualified" under Study 7's own gates.** It fails Q6 (its largest lot exceeds 25% of net) and Q8 (the
  neighbourhood median is below 60% of the centre on the training window). The centre sits at the top of a hill:
  - Phase A W29: median $120,679 against a centre of $176,260.
  - Two gates designed against concentration and peak-picking reject the canonical control. They were kept unchanged
    and are reported here.

## 2. Was a standalone VGT re-optimization warranted? — No

- **The test.** The Track V diagnostic ran the stability-first pipeline on VGT alone: 8,192 Sobol vectors, one island
  of 2,048, rungs 2 and 3, and refinement, in folds M and L. It is training-only.
- **The predeclared trigger** (PROTOCOL.md §9.5): some fold-M diagnostic candidate must reach ≥ 1.25× `primary`'s
  pooled-selection robust profit with p90 DD ≤ `primary`'s + $2,000.

| Fold | Candidate | Robust profit/yr | ÷ primary | p90 DD | Passes |
|---|---|---:|---:|---:|---|
| M | VGT `primary` (reference) | $10,623 | 1.00 | $28,146 | — |
| M | `d1-7526daa813` | $11,352 | 1.07 | $33,366 | no |
| M | `d1-58e9995c14` | $11,290 | 1.06 | $33,264 | no |
| M | `d1-961e438449` | $9,690 | 0.91 | $32,738 | no |
| M | `d1-841b08fd8d` | $8,932 | 0.84 | $31,836 | no |

**The trigger did not fire,** so the VC challenger track was never run.
- The search could not find a VGT vector that is both more profitable in its neighbourhood and no riskier than
  `primary`. The best one gains 7% robust profit at +$5,200 of p90 DD.
- Fold L's diagnostic tells the same story. Its best robust-profit candidate (`d1-9a39e9bd04`) has a training-selection
  p90 of $25,023 against `primary`'s $28,045, but a centre net of $14.8k/yr against `primary`'s $20.7k/yr.
- This matches vgt-d1-refinement's lesson that D1 on VGT is "the top of a smooth hill". **Further standalone VGT
  optimization adds little.** VGT `primary` stays the standalone control.

## 3. VGT's role inside the jointly optimized pools

The pools were allowed to move VGT's eight parameters jointly with the other books. Fold L's nominated pools chose VGT
books that **differ materially** from `primary`.

| Nominee (rank) | VGT parameters in the pool | VGT funded lots / net (FULL) | Other books' lots / net |
|---|---|---|---|
| VG profit (1) | X 23.3 Y 3.2 stop 5.8 hold 12 L 70 buf 1.7 P 5.1 W 115 | 11 / $87,120 | GDX 52 / $197,151 |
| VG robust (2) | X 29.9 Y 0.9 stop 6.7 hold 25 L 160 buf 4.3 P 3.4 W 90 | 13 / $102,927 | GDX 36 / $171,931 |
| VG balanced (5) | X 22.2 Y 1.4 stop 6.6 hold 12 L 77 buf 1.8 P 6.7 W 14 | 13 / $122,228 | GDX 15 / $121,853 |
| VXR profit (6) | X 23.4 Y 4.9 stop 8.9 hold 29 L 200 buf 0.0 P 10.3 W 128 | 10 / $128,619 | XBI 8 / $23,404; XRT 16 / $70,309 |
| VXR balanced (9) | X 20.2 Y 1.4 stop 3.4 hold 11 L 71 buf 5.8 P 13.3 W 187 | 20 / $75,254 | XBI 14 / $46,686; XRT 12 / $74,960 |
| VXR robust (12) | X 22.7 Y 1.1 stop 5.1 hold 25 L 44 buf 1.5 P 5.6 W 60 | 19 / $123,028 | XBI 9 / $20,677; XRT 11 / $33,316 |
| VXRG profit (3) / balanced (4) | X 29.9 Y 0.7 stop 4.5 hold 15–18 L 162–172 buf 5.2–5.8 P 13.1 W 191 | 13 / $66,005 | GDX 15–16; XRT 3–5; XBI 6 |
| VXRG robust (8) | X 29.9 Y 0.7 stop 7.7 hold 13 L 141 buf 0.0 P 12.8 W 191 | 12 / $29,547 | GDX 7; XRT 6; XBI 7 |
| B1 (VGT `primary`, alone) | X 21.6 Y 0.3 stop 7.3 hold 8 L 74 buf 2.9 P 9.0 W 60 | 21 / $176,260 | — |

The pooled optimizer moved VGT in two directions:

- **Toward a deep-entry VGT** (X 29.9 at the box ceiling, L 141–172) in VG robust and all VXRG nominees. VGT is then
  a rare, deep-crash book that leaves the slot to the other books most of the time.
- **Toward longer holds and different exits** (hold 11–29 instead of 8; Y 1.1–4.9 instead of 0.3) in VG profit,
  VG balanced and all VXR nominees.

None of the pools keeps `primary`. VGT's best role under capital contention differs from its best standalone role.
This was **not tested out of sample**. Fold M's VG and VXR candidates, which also moved VGT, all failed on 2022–2023.

**Box-bound dependence.** Several pooled nominees sit on the X ceiling (29.9–30.0%) for VGT and/or GDX. The box is
frozen (PROTOCOL.md §2.3) and was not widened. These candidates passed the in-box boundary check (Q2b and F2b), but a
deeper entry than 30% was never available to the search. The pull toward the ceiling suggests the optimizer was trading
activity for drawdown control at the box edge.
