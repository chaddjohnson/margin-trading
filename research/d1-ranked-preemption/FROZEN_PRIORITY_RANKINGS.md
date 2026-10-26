# Frozen priority rankings (Stage B)

Two separate rankings per window, computed only from the Stage A representatives and sealed before any joint search
(PROTOCOL §8). They were never refitted, reordered or recomputed from joint results; every joint evaluation carried the
ranking's body hash in its allocation id.

- **R1** = mean net per trade of the representative = Σ trade nets ÷ trades.
- **R2** = Σ trade nets ÷ Σ max(1, calendar days from the entry session's date to the exit session's date).
- Both count every entered trade; a trade open at the search end counts once at its liquidation value at the last
  close (exit friction and interest to that session included). Calendar days because interest accrues on calendar
  days and the slot is unavailable to other books then; a same-day round trip counts as one day. A standalone book
  has one funded state, so there is no double count.
- Ties (exact equality): more trades first, then the symbol. Unrankable (no trade): last, alphabetically.
- All 61 symbols receive a position: survivors and screened-down symbols by their (credible) representative;
  rejected symbols by their best-J_s vector with at least one trade, labelled `non-credible`; unrankable symbols (no
  trade in any vector: IEF and SHY in fold-a, SHY in fold-b and final) last, alphabetically. Every B5 member always
  has a training-derived rank.

| Window | R1 file (body) | R2 file (body) | Recheck by the full engine | Spearman R1 vs R2 (ranked symbols; all 61 positions) |
|---|---|---|---|---:|
| fold-a | `rankings/fold-a/R1.json` (`e41be4a2…`) | `rankings/fold-a/R2.json` (`15696c20…`) | 59/59 reproduced | 0.44; 0.49 |
| fold-b | `rankings/fold-b/R1.json` (`f9f06524…`) | `rankings/fold-b/R2.json` (`0f58ae76…`) | 60/60 | 0.46; 0.49 |
| final | `rankings/final/R1.json` (`d78064c4…`) | `rankings/final/R2.json` (`db4f4682…`) | 60/60 | 0.38; 0.41 |

The recheck (`recheck-rankings`, `results/rankings-check/<window>.json`) reran each representative's phenotype JSON
alone through the derived engine and recomputed both scores from the engine's own lots: identical to 1e-6.

## Top ten (score, trades, sample label, status)

| Window | R1 (mean net per trade) | R2 (net per occupied day) |
|---|---|---|
| fold-a | VGT $11,269 (7), GDX $10,134 (15), VPU $9,293 (4), XLU $9,291 (4), GLD $8,310 (4), IYT $7,689 (8), XLI $7,659 (8), XLK $7,146 (11), AGG $7,118 (1, rejected), IWM $6,678 (8) | IYT $932 (8), XLU $845 (4), VPU $826 (4), TIP $820 (2, rejected), VOOG $669 (7), XLB $523 (11), KBE $517 (19), IWN $507 (15, screened-down), XOP $481 (16, screened-down), EFA $476 (8) |
| fold-b | XLK $18,155 (6), VGT $15,183 (7), XME $12,074 (13), GDX $11,788 (14), XLI $8,755 (9), RSP $7,988 (9), IEMG $6,991 (6, screened-down), VGK $5,943 (8), IYT $5,870 (14), IWF $5,705 (13) | TIP $820 (2, rejected), XOP $513 (28), IWN $436 (14), VGK $383 (8), IWM $376 (13), KRE $347 (31), XME $341 (13), XLE $333 (23), XLI $322 (9), IYT $314 (14) |
| final | DBC $14,433 (7, screened-down), FXI $11,146 (8), XME $10,847 (20), XLI $7,980 (12), VGT $7,366 (17), IBB $7,009 (12), XHB $6,707 (20), EDV $6,273 (10), XLK $5,341 (22), XLY $5,063 (16) | TIP $684 (2, rejected), IWN $347 (19), XME $341 (20), XLE $336 (26), KIE $328 (18), XBI $312 (30), RSP $274 (12), VOOG $270 (16), KRE $269 (71), XLI $262 (12) |

Low-sample symbols reach the top of both rankings (R1 rewards a few large trades; R2 rewards short, profitable
holdings). Their labels are in the files; they only matter for a pool that holds them (rejected symbols never enter a
joint pool).

## B5's members in each ranking (position among 61; their relative order is B's priority)

| Window | R1 order (positions) | R2 order (positions) |
|---|---|---|
| fold-a | VGT 1 > GDX 2 > XRT 17 > XBI 22 > KRE 43 | KRE 15 > XBI 16 > XRT 17 > GDX 20 > VGT 41 |
| fold-b | VGT 2 > GDX 4 > XRT 24 > XBI 45 > KRE 46 | KRE 6 > GDX 16 > XRT 22 > XBI 23 > VGT 37 |
| final | VGT 5 > GDX 31 > XBI 39 > XRT 46 > KRE 56 | XBI 6 > KRE 9 > GDX 15 > XRT 18 > VGT 40 |

R1 puts the large-trade books (VGT, GDX) first; R2 puts the short-holding books (KRE, XBI) first and VGT last.

## Stability across windows (Spearman rank correlation)

Over the symbols that are ranked (have a trade) in both windows (59–60), and in brackets over all 61 positions
(`scripts/summary.py`, which keeps the unrankable tail in its fixed last places and so inflates the figures slightly):

| | fold-a vs fold-b | fold-b vs final | fold-a vs final |
|---|---:|---:|---:|
| R1 | 0.41 (0.47) | 0.39 (0.42) | 0.09 (0.18) |
| R2 | 0.72 (0.75) | 0.60 (0.62) | 0.57 (0.61) |

R1 is unstable: a priority learned in one window is a poor guide to the next. R2 is markedly more persistent. Neither
ranking's priorities produced a supportable preemption gain (`FINAL_COMPARISON_AND_RECOMMENDATION.md`). Not computed
for ranking: the average of the top N trades (descriptive only per the brief; not used).

Full tables (all 61 positions): `results/tables/rankings-<window>.md`; `npm run ranked-preemption -- show
ranking:<window>:<R1|R2>`.
