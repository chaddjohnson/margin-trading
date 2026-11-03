# Chronological evidence and selection bias (Stage D)

**Evidence tier: T-retro (inspected walk-forward history), weaker than a true walk-forward.** Each fold
representative was chosen by the source study on data through its fold's search end (fold-a 2020-06-30, fold-b
2021-12-31) and is run here, unchanged, through that fold's validation end (2021-12-31, 2023-12-29) — exactly what the
source study's own read-only door permits after its sealed validation. Those validation years were inspected by
earlier studies, and the source procedure itself was designed with 2016–2026 known. **No final-window vector is run on
an earlier slice and called out-of-sample**; the fold vectors are generally *different vectors* from the final ones.

**V** = the liquidation-equivalent strategy mark at the validation end minus the same at the search-end close. The mark
at the search-end close equals the stored Stage A net for every one of the 119 fold vectors (checked; `analyze`
stops otherwise). There are 119 fold vectors, not the 122 that PROTOCOL §9.1 states (and 238 runs, not §12's 244):
IEF in fold-a and SHY in both folds had no trade in any evaluated vector, so the source study has no representative for
them (reporting amendment A1). Machine-readable: `results/tables/folds.csv`.

## The cross-section of 61 ETFs (the less biased view)

| Fold | symbols | Spearman (training net vs V) | median V | V > 0 | V < 0 | no evidence | top-10 training above median V | boundary parity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| fold-a | 59 | 0.23 | $2,402 | 58% | 22% | 20% | 80% | 100% |
| fold-b | 60 | 0.22 | −$211 | 33% | 50% | 17% | 70% | 100% |

Rank stability of the stored training nets across windows (Spearman): fold-a vs fold-b 0.85; fold-b vs final 0.82; fold-a vs final 0.80.

Each fold's ten best training ETFs and their validation increment V:

- **fold-a:** GDX $152,012 → V $1,133; KBE $85,835 → V −$1,346; XHB $80,589 → V $23,350; VGT $78,881 → V $11,905; XLK $78,610 → V $10,394; XBI $71,747 → V $16,951; IBB $71,449 → V $5,876; XME $68,707 → V $30,130; IGV $68,664 → V $14,157; XLE $65,580 → V $9,097
- **fold-b:** GDX $165,035 → V $4,196; XME $156,968 → V $15,100; SMH $119,487 → V $11,437; KBE $118,195 → V $50,532; XHB $111,914 → V −$7,200; XLK $108,932 → V −$30,164; VGT $106,278 → V −$20,933; XOP $100,095 → V $4,038; XLF $97,353 → V $4,183; ILF $90,818 → V $10,351

- **Training rank says little about the next 18–24 months.** The Spearman correlation between a fold's training net and
  its V is 0.23 (fold-a) and 0.22 (fold-b) — positive but weak (descriptive only; ETFs, trades and years are not
  independent, so no p-value is computed).
- **The fold-b window (2022–2023) was hard for the procedure:** the median V is −$211, half of the 60 vectors lost
  money, and only a third gained. Fold-a's (2020-07 → 2021-12) median V is +$2,402, with 58% positive.
- **Training ranks are persistent** (0.80–0.85 across windows): the same ETFs look good in every training window, which
  is consistent both with durable D1-friendliness and with overlapping training data (fold-b contains fold-a's).

## The shortlisted ETFs and VGT (period-correct fold representatives)

| ETF | fold-a status (training net) | fold-a V 5 / 10 bps (lots after, open at boundary) | fold-b status (training net) | fold-b V 5 / 10 bps (lots after, open at boundary) | final percentile among 61 | drift a→final / b→final (step units) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| XME | survivor ($68,707) | $30,130 / $29,498 (6, 1) | survivor ($156,968) | $15,100 / $57,271 (3, 1) | 99% | 82 / 4 |
| GDX | survivor ($152,012) | $1,133 / $123 (10, 1) | survivor ($165,035) | $4,196 / $3,481 (7, 0) | 98% | 53 / 60 |
| KBE | survivor ($85,835) | −$1,346 / −$1,645 (3, 1) | survivor ($118,195) | $50,532 / $48,175 (23, 0) | 96% | 67 / 36 |
| SLV | survivor* ($46,993) | $52,584 / $51,427 (11, 1) | survivor ($90,549) | −$9,989 / −$10,883 (9, 1) | 76% | 81 / 11 |
| FXI | survivor ($28,495) | $2,782 / $1,574 (12, 0) | survivor ($29,722) | −$9,931 / −$10,453 (19, 1) | 68% | 82 / 59 |
| IJH | survivor ($49,413) | $12,403 / $11,987 (4, 0) | survivor ($67,412) | $14,023 / $13,407 (6, 0) | 66% | 76 / 10 |
| XLB | survivor ($63,263) | −$261 / −$361 (1, 0) | survivor ($67,424) | $13,294 / $12,814 (5, 0) | 61% | 43 / 10 |
| MTUM | survivor ($40,399) | $4,206 / $4,102 (1, 0) | survivor ($66,541) | −$11,095 / −$12,093 (10, 0) | 50% | 87 / 59 |
| XHB | survivor ($80,589) | $23,350 / $0 (4, 1) | survivor ($111,914) | −$7,200 / −$8,499 (13, 0) | 94% | 52 / 48 |
| EWW | survivor ($59,584) | $2,249 / $1,544 (7, 1) | survivor ($69,570) | $17,506 / $17,187 (3, 0) | 78% | 44 / 34 |
| EDV | survivor ($53,172) | −$16,837 / −$18,221 (14, 0) | survivor* ($28,515) | −$9,218 / −$11,121 (19, 0) | 42% | 124 / 68 |
| VGT | survivor* ($78,881) | $11,905 / $11,791 (1, 1) | survivor* ($106,278) | −$20,933 / −$21,819 (9, 0) | 93% | 47 / 47 |

Columns: V at 5 / 10 bps (lots entered after the boundary, lots open across it); the final-window net percentile among
the 61; the step-unit distance from each fold vector to the final vector (X 5, Y 1, stop 5, hold 1, L 5, buffer 5, P 5,
W 10 grid units).

- **Only IJH, EWW, XME and GDX have V > 0 in both folds.** IJH +$12,403 / +$14,023; EWW +$2,249 / +$17,506; XME
  +$30,130 / +$15,100; GDX only +$1,133 / +$4,196 despite the largest training nets of all.
- **SLV, FXI, MTUM, XHB, KBE, XLB and EDV have a negative fold** (F8 negative): SLV −$9,989, FXI −$9,931, MTUM −$11,095,
  XHB −$7,200 in fold-b; KBE −$1,346 and XLB −$261 in fold-a; EDV negative in both (−$16,837, −$9,218).
- **Fold V can flip with cost:** XME's fold-b vector gains $15,100 at 5 bps but $57,271 at 10 bps, and XHB's fold-a
  vector gains $23,350 at 5 bps but nothing at 10 bps — one exit's sign decides whether D1's continuation window opens.
- **VGT's own period-correct fold representatives:** +$11,905 (fold-a) and **−$20,933** (fold-b). VGT primary's stored
  fold increments (fold-a $32,698 at 5 bps (2 lots); fold-b $22,145 at 5 bps (9 lots)) are not a test: VGT primary was chosen with those years known.
- An F8 pass for a shortlisted ETF is conditioned on its selection (the shortlist used final-window records that
  contain 2020–2023); the 61-ETF cross-section above is the less biased reading.

## Stored pooled fold records (membership only; per-ETF validation attribution was never stored)

| Fold | procedure | members | validation net | lots | min. DD | gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| fold-a | C-R1 | GDX GLD VGT VPU XLU | $11,362 | 11 | $28,677 | control (no gate) |
| fold-a | C-R2 | IYT VOOG VPU XLB XLU | −$2,622 | 3 | $14,277 | control (no gate) |
| fold-a | D-R1 | EDV EWW FXI GDX IAU IGV XHB XLY | $22,944 | 23 | $18,061 | false |
| fold-a | D-R2 | EDV EWW EWY FXI GDX ILF VIG XHB | $24,209 | 21 | $20,442 | false |
| fold-b | C-R1 | GDX VGT XLI XLK XME | −$19,116 | 16 | $41,856 | control (no gate) |
| fold-b | C-R2 | IWM IWN KRE VGK XOP | $6,464 | 32 | $27,537 | control (no gate) |
| fold-b | D-R1 | EWW FXI GDX IBB ILF KRE SMH TLT XLY XOP XRT | −$39,909 | 54 | $55,955 | false |
| fold-b | D-R2 | EWZ FXI GDX GLD INDA IWF KRE XBI XME XOP XRT | $9,323 | 44 | $42,833 | false |

Every source procedure failed its fold gates. In fold-a, EDV, EWW, FXI, GDX and XHB sat in both D picks; in fold-b, FXI
and GDX sat in both D picks, EWW in D-R1 and XME in D-R2 and C-R1. Pooled validation results mix shared-slot effects and say nothing about a standalone vector.

## Selection bias, stated plainly

- **Instrument selection:** the 11 ETFs were chosen from 61 by inspecting stored 2016–2023 outcomes; the merit picks
  (XME, GDX, KBE) were chosen *because* their stored nets beat VGT primary's — the winner's curse applies most to them.
- **Phenotype selection:** each vector is the best of ~2,300 evaluated per ETF and window (2,048 Sobol plus local
  search), chosen by a neighbourhood score over 16 draws. The local robustness measured here does not undo that search.
- **The comparison is asymmetric:** the candidates were fitted to this window; VGT primary was not. The
  procedure-matched VGT control shows what the same procedure finds on VGT: its joint median net is $60,635 (against
  VGT primary's $71,174), it raises F4, F8 (negative), F9 and F10, and its fold-b vector lost $20,933 — the source
  procedure's own VGT pick looks worse than VGT primary on the neighbourhood and capture tests (though more
  cost-robust: C1 keeps 89% of its net against VGT primary's 63%).
- **No bootstrap, p-value, PBO or deflated Sharpe** is reported: the trials are neither independent nor complete.

## All 119 fold vectors

| ETF | fold | status | training net (stored) | V 5 bps | V 10 bps | lots after | open at boundary | windowed daily DD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| AGG | fold-a | rejected | $7,118 | −$7,212 | −$7,211 | 0 | 1 | $7,554 |
| DBC | fold-a | survivor* | $11,040 | $0 | $0 | 0 | 0 | $0 |
| EDV | fold-a | survivor | $53,172 | −$16,837 | −$18,221 | 14 | 0 | $16,837 |
| EEM | fold-a | screened-down | $28,035 | $6,012 | $6,005 | 0 | 1 | $2,988 |
| EFA | fold-a | survivor* | $32,836 | $16,218 | $15,697 | 5 | 0 | $4,691 |
| EMB | fold-a | survivor* | $18,476 | −$665 | −$666 | 0 | 1 | $4,863 |
| EWJ | fold-a | survivor* | $28,188 | $3,933 | $3,626 | 3 | 0 | $4,427 |
| EWW | fold-a | survivor | $59,584 | $2,249 | $1,544 | 7 | 1 | $10,652 |
| EWY | fold-a | survivor | $31,556 | $34,709 | $34,369 | 3 | 1 | $10,636 |
| EWZ | fold-a | screened-down | $45,546 | $20,500 | $18,874 | 16 | 1 | $23,303 |
| FXI | fold-a | survivor | $28,495 | $2,782 | $1,574 | 12 | 0 | $9,872 |
| GDX | fold-a | survivor | $152,012 | $1,133 | $123 | 10 | 1 | $21,690 |
| GLD | fold-a | survivor* | $33,238 | $2,204 | $1,695 | 5 | 1 | $18,277 |
| HYG | fold-a | survivor* | $10,772 | $0 | $0 | 0 | 0 | $0 |
| IAU | fold-a | survivor* | $17,138 | −$16,441 | −$17,434 | 10 | 0 | $21,193 |
| IBB | fold-a | survivor | $71,449 | $5,876 | $4,865 | 10 | 0 | $13,261 |
| IEMG | fold-a | survivor* | $18,000 | $15,676 | $15,455 | 2 | 1 | $13,000 |
| IGV | fold-a | survivor | $68,664 | $14,157 | $13,103 | 11 | 0 | $14,404 |
| IJH | fold-a | survivor | $49,413 | $12,403 | $11,987 | 4 | 0 | $7,685 |
| IJR | fold-a | survivor | $49,108 | $6,880 | $6,772 | 1 | 1 | $4,106 |
| ILF | fold-a | survivor | $52,261 | $1,655 | $349 | 13 | 1 | $18,300 |
| INDA | fold-a | screened-down | $29,998 | $5,809 | $5,500 | 3 | 0 | $9,172 |
| IWD | fold-a | survivor* | $31,682 | $9,205 | $8,891 | 3 | 1 | $6,532 |
| IWF | fold-a | survivor | $53,716 | $21,322 | $20,997 | 3 | 1 | $7,984 |
| IWM | fold-a | survivor* | $53,420 | $0 | $0 | 0 | 0 | $0 |
| IWN | fold-a | screened-down | $44,082 | $13,126 | $12,912 | 2 | 1 | $4,359 |
| IYT | fold-a | survivor* | $61,515 | $0 | $0 | 0 | 0 | $0 |
| KBE | fold-a | survivor | $85,835 | −$1,346 | −$1,645 | 3 | 1 | $6,848 |
| KIE | fold-a | screened-down | $40,438 | $9,508 | $9,280 | 2 | 1 | $3,073 |
| KRE | fold-a | survivor | $59,166 | $21,637 | $14,930 | 13 | 1 | $9,646 |
| LQD | fold-a | survivor* | $14,289 | $0 | $0 | 0 | 0 | $0 |
| MTUM | fold-a | survivor | $40,399 | $4,206 | $4,102 | 1 | 0 | $3,551 |
| QUAL | fold-a | survivor | $45,926 | $0 | $0 | 0 | 0 | $0 |
| RSP | fold-a | survivor* | $49,530 | $0 | $0 | 0 | 0 | $0 |
| SLV | fold-a | survivor* | $46,993 | $52,584 | $51,427 | 11 | 1 | $13,262 |
| SMH | fold-a | survivor | $60,186 | −$1,846 | −$2,045 | 2 | 0 | $10,547 |
| SPLV | fold-a | screened-down | $28,607 | $4,721 | $4,513 | 2 | 1 | $7,252 |
| TIP | fold-a | rejected | $10,660 | $0 | $0 | 0 | 0 | $0 |
| TLT | fold-a | survivor* | $38,275 | −$18,645 | −$19,437 | 8 | 1 | $24,993 |
| USMV | fold-a | survivor | $41,666 | −$775 | −$875 | 1 | 0 | $2,670 |
| VGK | fold-a | survivor* | $36,949 | −$3,158 | −$3,356 | 2 | 0 | $8,557 |
| VGT | fold-a | survivor* | $78,881 | $11,905 | $11,791 | 1 | 1 | $15,507 |
| VIG | fold-a | survivor | $29,853 | $0 | $0 | 0 | 0 | $0 |
| VOOG | fold-a | survivor* | $38,114 | −$3,218 | −$3,316 | 1 | 1 | $7,612 |
| VPU | fold-a | survivor* | $37,173 | $2,882 | $2,877 | 0 | 1 | $4,787 |
| XBI | fold-a | survivor | $71,747 | $16,951 | $15,429 | 15 | 0 | $16,823 |
| XHB | fold-a | survivor | $80,589 | $23,350 | $0 | 4 | 1 | $6,994 |
| XLB | fold-a | survivor | $63,263 | −$261 | −$361 | 1 | 0 | $3,048 |
| XLE | fold-a | screened-down | $65,580 | $9,097 | $8,786 | 3 | 0 | $6,689 |
| XLF | fold-a | survivor | $53,866 | $36,028 | $37,500 | 6 | 1 | $8,640 |
| XLI | fold-a | survivor* | $61,269 | −$2,470 | −$2,468 | 0 | 1 | $4,208 |
| XLK | fold-a | survivor | $78,610 | $10,394 | $10,181 | 2 | 0 | $10,506 |
| XLP | fold-a | survivor | $32,965 | $0 | $0 | 0 | 0 | $0 |
| XLU | fold-a | survivor* | $37,163 | $2,402 | $2,298 | 1 | 0 | $4,480 |
| XLV | fold-a | survivor | $32,672 | $0 | $0 | 0 | 0 | $0 |
| XLY | fold-a | survivor | $60,619 | $0 | $0 | 0 | 0 | $0 |
| XME | fold-a | survivor | $68,707 | $30,130 | $29,498 | 6 | 1 | $7,034 |
| XOP | fold-a | screened-down | $57,269 | $5,873 | $5,366 | 5 | 1 | $10,436 |
| XRT | fold-a | survivor* | $48,283 | −$1,551 | −$1,649 | 1 | 0 | $4,208 |
| AGG | fold-b | rejected | $65 | −$423 | −$571 | 2 | 0 | $627 |
| DBC | fold-b | survivor | $54,664 | $0 | $0 | 0 | 0 | $0 |
| EDV | fold-b | survivor* | $28,515 | −$9,218 | −$11,121 | 19 | 0 | $40,500 |
| EEM | fold-b | survivor | $38,250 | −$11,413 | −$12,407 | 10 | 0 | $24,192 |
| EFA | fold-b | survivor* | $46,854 | $6,410 | $6,001 | 4 | 0 | $9,121 |
| EMB | fold-b | survivor* | $18,468 | −$17,802 | −$18,691 | 9 | 0 | $29,104 |
| EWJ | fold-b | survivor | $43,171 | $0 | $0 | 0 | 0 | $0 |
| EWW | fold-b | survivor | $69,570 | $17,506 | $17,187 | 3 | 0 | $4,507 |
| EWY | fold-b | survivor | $68,073 | −$11,896 | −$12,792 | 9 | 0 | $31,391 |
| EWZ | fold-b | survivor | $68,419 | $23,284 | $22,253 | 10 | 1 | $19,185 |
| FXI | fold-b | survivor | $29,722 | −$9,931 | −$10,453 | 19 | 1 | $36,189 |
| GDX | fold-b | survivor | $165,035 | $4,196 | $3,481 | 7 | 0 | $34,976 |
| GLD | fold-b | survivor | $35,491 | $624 | −$686 | 13 | 0 | $19,759 |
| HYG | fold-b | screened-down | $9,459 | −$15,540 | −$17,332 | 18 | 0 | $15,768 |
| IAU | fold-b | survivor | $24,674 | −$7,924 | −$8,923 | 10 | 1 | $19,177 |
| IBB | fold-b | survivor | $76,365 | −$37,642 | −$39,130 | 16 | 1 | $43,639 |
| IEF | fold-b | rejected | −$113 | −$8,807 | −$9,139 | 10 | 0 | $12,846 |
| IEMG | fold-b | screened-down | $41,946 | $0 | $0 | 0 | 0 | $0 |
| IGV | fold-b | survivor | $87,270 | −$20,002 | −$22,896 | 29 | 1 | $60,267 |
| IJH | fold-b | survivor | $67,412 | $14,023 | $13,407 | 6 | 0 | $5,132 |
| IJR | fold-b | survivor | $83,774 | −$8,365 | −$10,060 | 17 | 0 | $18,480 |
| ILF | fold-b | survivor | $90,818 | $10,351 | $9,637 | 7 | 1 | $18,278 |
| INDA | fold-b | survivor | $68,728 | −$2,486 | −$2,685 | 2 | 1 | $8,572 |
| IWD | fold-b | survivor | $54,664 | $0 | $0 | 0 | 0 | $0 |
| IWF | fold-b | survivor | $74,165 | −$23,272 | −$16,687 | 11 | 0 | $36,062 |
| IWM | fold-b | survivor | $57,474 | $0 | $0 | 0 | 0 | $0 |
| IWN | fold-b | survivor | $61,540 | $0 | $0 | 0 | 0 | $0 |
| IYT | fold-b | survivor | $82,182 | $13,847 | $12,329 | 15 | 0 | $11,520 |
| KBE | fold-b | survivor | $118,195 | $50,532 | $48,175 | 23 | 0 | $15,383 |
| KIE | fold-b | survivor | $53,341 | $0 | $0 | 0 | 0 | $0 |
| KRE | fold-b | survivor | $85,042 | $13,303 | $10,484 | 28 | 0 | $24,133 |
| LQD | fold-b | survivor* | $12,775 | −$24,811 | −$28,202 | 40 | 0 | $32,675 |
| MTUM | fold-b | survivor | $66,541 | −$11,095 | −$12,093 | 10 | 0 | $24,550 |
| QUAL | fold-b | survivor | $56,728 | −$8,003 | −$8,499 | 5 | 0 | $16,703 |
| RSP | fold-b | survivor* | $71,890 | −$781 | −$794 | 3 | 1 | $6,978 |
| SLV | fold-b | survivor | $90,549 | −$9,989 | −$10,883 | 9 | 1 | $21,419 |
| SMH | fold-b | survivor | $119,487 | $11,437 | $8,214 | 32 | 1 | $32,310 |
| SPLV | fold-b | screened-down | $45,841 | −$3,273 | −$2,653 | 6 | 0 | $14,529 |
| TIP | fold-b | rejected | $10,660 | −$3,934 | −$4,533 | 6 | 0 | $5,667 |
| TLT | fold-b | survivor* | $20,650 | −$14,073 | −$15,770 | 17 | 0 | $33,559 |
| USMV | fold-b | survivor | $51,406 | $446 | −$459 | 9 | 0 | $9,240 |
| VGK | fold-b | survivor* | $47,547 | $0 | $0 | 0 | 0 | $0 |
| VGT | fold-b | survivor* | $106,278 | −$20,933 | −$21,819 | 9 | 0 | $32,522 |
| VIG | fold-b | survivor | $54,557 | $3,151 | $2,245 | 9 | 0 | $9,672 |
| VOOG | fold-b | survivor | $88,584 | −$11,745 | −$14,772 | 34 | 0 | $29,078 |
| VPU | fold-b | survivor | $38,387 | $3,432 | $3,128 | 3 | 0 | $4,366 |
| XBI | fold-b | survivor | $87,321 | −$6,531 | −$8,531 | 20 | 0 | $42,909 |
| XHB | fold-b | survivor | $111,914 | −$7,200 | −$8,499 | 13 | 0 | $23,173 |
| XLB | fold-b | survivor | $67,424 | $13,294 | $12,814 | 5 | 0 | $7,396 |
| XLE | fold-b | survivor | $89,167 | $15,464 | $15,048 | 4 | 0 | $10,686 |
| XLF | fold-b | survivor | $97,353 | $4,183 | $3,477 | 7 | 0 | $8,044 |
| XLI | fold-b | survivor* | $78,794 | $0 | $0 | 0 | 0 | $0 |
| XLK | fold-b | survivor* | $108,932 | −$30,164 | −$31,242 | 11 | 1 | $33,593 |
| XLP | fold-b | survivor | $38,515 | −$4,859 | −$6,363 | 15 | 0 | $15,423 |
| XLU | fold-b | survivor* | $44,714 | $0 | $0 | 0 | 0 | $0 |
| XLV | fold-b | survivor | $41,192 | $1,067 | $119 | 15 | 0 | $17,662 |
| XLY | fold-b | survivor | $69,566 | −$44,668 | −$48,032 | 34 | 1 | $63,552 |
| XME | fold-b | survivor | $156,968 | $15,100 | $57,271 | 3 | 1 | $13,103 |
| XOP | fold-b | survivor | $100,095 | $4,038 | $3,533 | 5 | 0 | $10,300 |
| XRT | fold-b | survivor | $88,830 | −$30,154 | −$31,731 | 16 | 0 | $37,509 |
