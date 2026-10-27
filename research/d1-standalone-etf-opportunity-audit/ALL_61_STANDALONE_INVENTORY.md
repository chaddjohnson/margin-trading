# All 61 standalone D1 research records — census (Stage A)

**Evidence tier: T-train (inspected training).** Every figure below is a *stored* output of the ranked-preemption
study (`research/d1-ranked-preemption/`), read from its sealed, hash-verified records; nothing on this page was re-run
or optimised. Derived columns (top-3 share, per-day ratios) are arithmetic on stored fields. The machine-readable
census, one row per symbol × window, is `results/inventory/census.json` (complete records) and
`results/inventory/census.csv` (flat columns).

## Source and its procedure (verified, not assumed)

Each of the 61 eligible ETFs (the October 25 audited universe; GDXJ and OIH are late, XLRE excluded) received the
same procedure in each window on that window's training data only: 2,048 paired Sobol vectors over the source box,
a local search from the four best credible starts, a 16-draw neighbourhood check of the eight best credible vectors
with distinct trades, the **representative** (the best neighbourhood median of J_s = net − best trade − max(0,
minute DD − $20,000)), and a **library** of up to four phenotypes whose entry sessions differ by Jaccard distance
≥ 0.5. One $100,000 slot, 5 bps per side, 11% simple interest, books armed 2017-06-15. "Credible" = trades ≥
max(4, ⌈eligible years⌉) (fold-a 4, fold-b 5, final 7), minute DD ≤ $35,000 and net > 0.

| Window (search end) | Evaluations | Survivors (uncertain) | Screened-down | Rejected | Unrankable | Sealed body |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| fold-a (2020-06-30) | 144,782 | 49 (22) | 8 | 4 | 2 | `46b91ce15569…` |
| fold-b (2021-12-31) | 146,211 | 54 (11) | 3 | 4 | 1 | `fb025f3f0045…` |
| final (2023-12-29) | 147,689 | 53 (5) | 6 | 2 | 1 | `180e64984e98…` |

- The source's **exploration reserve was empty in every window** — a defect of its pooled rule (idleness measured
  against 49–54 simultaneously active survivors). That rule is not used here: standalone screening has no cross-symbol
  idleness rule.
- Library files: 428 across the three windows (representatives included).

### Source checks (`results/inventory/source-checks.json`)

- PASS — universe: 61 eligible symbols: 61 eligible in research/d1-ranked-preemption/results/audit/universe.json
- PASS — fold-a: STAGE_A.json body hash verifies: 46b91ce15569967d6b88e97fcac17f89a6b46500c2809748afd299933979c657
- PASS — fold-a: door ends at the search end: 2020-06-30 / last 2020-06-30, 1131 sessions
- PASS — fold-a: every profile and phenotype file hashes as sealed: 191 files, 0 mismatched
- PASS — fold-a: archive hash and row count as sealed: 137486 rows, sha256 480adf5ddab3
- PASS — fold-b: STAGE_A.json body hash verifies: fb025f3f00457e928b26e9beafbefd37460fa75312e55e843f972afc8fa2ad8f
- PASS — fold-b: door ends at the search end: 2021-12-31 / last 2021-12-31, 1511 sessions
- PASS — fold-b: every profile and phenotype file hashes as sealed: 203 files, 0 mismatched
- PASS — fold-b: archive hash and row count as sealed: 138915 rows, sha256 3f11cbd1a357
- PASS — final: STAGE_A.json body hash verifies: 180e64984e98697e2ecece91db3e7e0ecd16904803be98c87346fc005b31257b
- PASS — final: door ends at the search end: 2023-12-29 / last 2023-12-29, 2012 sessions
- PASS — final: every profile and phenotype file hashes as sealed: 217 files, 0 mismatched
- PASS — final: archive hash and row count as sealed: 140137 rows, sha256 c4c59c763551
- PASS — every library and representative phenotype file hashes as its profile records: 428 library files, 0 unverified
- PASS — every profile’s data hash equals the audited universe: 0 mismatches
- PASS — the shortlist anchor equals the sealed same-window VGT primary control (CONTROLS.json final, B1, 5 bps): stored net 135359.0411970347, held days 917

## Final window (search end 2023-12-29) — the representative of every symbol

Status a/b/final: `surv` survivor, `*` uncertain (< 10 trades), `scr-down` screened-down. "nb" = the stored
16-draw neighbourhood of the representative; its scores are J_s values (not nets) and its credible count is the
number of draws that were credible. "Sobol credible" = the share of the symbol's 2,048 Sobol vectors that were credible
(the breadth of the credible region over the whole box). R1/R2 = the frozen source rankings (descriptive only; they
are not this study's objective).

| ETF | cluster | status a/b/final | trades | net | min. DD | worst | top-3 share | occ. days | interest | nb credible | nb median J | nb P10 J | Sobol credible | R1 / R2 | library | note |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| AGG | rates-credit | rejected / rejected / scr-down | 7 | $726 | $13,089 | −$1,943 | 568% | 547 | $16,485 | 2/16 | −$3,243 | −$5,264 | 0.0% | 60 / 60 | 1 |  |
| DBC | broad-commodities | surv* / surv / scr-down | 7 | $101,030 | $18,837 | −$1,049 | 103% | 826 | $24,893 | 2/16 | −$6,445 | −$14,703 | 10.4% | 1 / 41 | 4 | $27M/day |
| EDV | rates-credit | surv / surv* / surv | 10 | $62,727 | $11,589 | −$1,150 | 82% | 331 | $9,975 | 16/16 | $23,923 | $11,933 | 9.1% | 8 / 19 | 3 | coverage 47%; $16M/day |
| EEM | em-broad | scr-down / surv / surv | 18 | $36,721 | $22,052 | −$6,510 | 69% | 309 | $9,312 | 16/16 | $1,028 | −$5,308 | 7.0% | 49 / 43 | 4 |  |
| EFA | developed-ex-us | surv* / surv* / surv | 17 | $61,194 | $10,220 | −$3,234 | 54% | 376 | $11,332 | 16/16 | $34,463 | $22,470 | 11.2% | 29 / 27 | 1 |  |
| EMB | rates-credit | surv* / surv* / surv* | 8 | $26,319 | $11,763 | −$179 | 76% | 311 | $9,373 | 15/16 | $11,741 | $8,501 | 1.9% | 34 / 48 | 4 |  |
| EWJ | developed-ex-us | surv* / surv / surv | 13 | $49,590 | $14,871 | −$10,123 | 74% | 556 | $16,756 | 16/16 | $18,509 | $3,010 | 9.6% | 26 / 47 | 4 |  |
| EWW | em-latam | surv / surv / surv | 38 | $104,277 | $22,812 | −$7,025 | 43% | 719 | $21,668 | 16/16 | $69,855 | $60,882 | 7.9% | 40 / 34 | 2 |  |
| EWY | em-asia | surv / surv / surv | 15 | $65,435 | $28,263 | −$6,982 | 75% | 377 | $11,362 | 16/16 | $10,871 | $6,309 | 4.8% | 19 / 24 | 4 |  |
| EWZ | em-latam | scr-down / surv / surv | 48 | $111,647 | $27,988 | −$7,502 | 46% | 640 | $19,288 | 5/16 | $50,024 | $19,309 | 1.5% | 44 / 23 | 2 |  |
| FXI | em-asia | surv / surv / surv* | 8 | $89,172 | $16,702 | −$956 | 84% | 344 | $10,367 | 15/16 | $40,459 | $27,359 | 7.8% | 2 / 12 | 3 |  |
| GDX | precious-metals | surv / surv / surv | 54 | $185,534 | $26,433 | −$6,574 | 47% | 878 | $26,460 | 13/16 | $125,373 | $101,307 | 4.3% | 31 / 15 | 3 |  |
| GLD | precious-metals | surv* / surv / surv | 20 | $36,901 | $16,127 | −$5,820 | 88% | 585 | $17,630 | 15/16 | $5,921 | −$1,012 | 11.5% | 53 / 56 | 4 |  |
| HYG | rates-credit | surv* / scr-down / surv* | 7 | $14,795 | $6,913 | −$1,185 | 118% | 114 | $3,436 | 16/16 | $4,623 | $656 | 0.6% | 48 / 39 | 1 |  |
| IAU | precious-metals | surv* / surv / surv* | 8 | $40,014 | $15,497 | −$2,346 | 109% | 489 | $14,737 | 16/16 | $8,323 | $1,486 | 11.5% | 11 / 49 | 2 |  |
| IBB | us-healthcare-biotech | surv / surv / surv | 12 | $84,102 | $17,098 | −$1,469 | 70% | 578 | $17,419 | 14/16 | $23,964 | $6,431 | 16.7% | 6 / 33 | 3 |  |
| IEF | rates-credit | rejected / rejected / scr-down | 8 | $2,604 | $6,037 | −$694 | 196% | 201 | $6,058 | 13/16 | −$3,808 | −$4,794 | 0.1% | 59 / 59 | 1 |  |
| IEMG | em-broad | surv* / scr-down / surv | 25 | $38,651 | $20,067 | −$9,093 | 77% | 526 | $15,852 | 16/16 | $10,303 | −$3,316 | 7.9% | 55 / 54 | 2 |  |
| IGV | us-tech-growth | surv / surv / surv | 38 | $121,016 | $28,982 | −$11,764 | 34% | 845 | $25,466 | 12/16 | $58,476 | −$22,059 | 11.4% | 35 / 35 | 2 |  |
| IJH | us-broad-size-factor | surv / surv / surv | 24 | $87,166 | $17,275 | −$3,285 | 46% | 443 | $13,351 | 16/16 | $13,009 | −$6,850 | 10.9% | 28 / 17 | 3 |  |
| IJR | us-broad-size-factor | surv / surv / surv | 16 | $76,567 | $17,406 | −$7,778 | 50% | 447 | $13,471 | 16/16 | $48,233 | $39,896 | 12.0% | 13 / 25 | 2 |  |
| ILF | em-latam | surv / surv / surv | 40 | $92,843 | $28,455 | −$8,253 | 50% | 572 | $17,238 | 9/16 | $29,073 | −$3,616 | 1.6% | 45 / 28 | 3 | $33M/day |
| INDA | em-asia | scr-down / surv / surv | 21 | $74,647 | $33,086 | −$5,786 | 55% | 963 | $29,022 | 14/16 | $15,707 | $1,078 | 7.1% | 30 / 52 | 4 |  |
| IWD | us-broad-size-factor | surv* / surv / surv | 13 | $54,865 | $16,550 | −$1,217 | 55% | 304 | $9,162 | 14/16 | $13,646 | $8,139 | 10.0% | 21 / 21 | 2 |  |
| IWF | us-tech-growth | surv / surv / surv | 50 | $117,211 | $22,625 | −$7,681 | 38% | 1502 | $45,266 | 6/16 | $20,418 | −$15,654 | 23.0% | 43 / 51 | 4 |  |
| IWM | us-broad-size-factor | surv* / surv / surv | 38 | $68,670 | $25,769 | −$13,718 | 52% | 746 | $22,482 | 10/16 | $2,492 | −$18,120 | 13.9% | 54 / 46 | 3 |  |
| IWN | us-broad-size-factor | scr-down / surv / surv | 19 | $74,268 | $16,065 | −$6,630 | 59% | 214 | $6,449 | 14/16 | $22,137 | −$1,873 | 9.4% | 25 / 2 | 2 |  |
| IYT | us-cyclical | surv* / surv / surv | 34 | $115,869 | $15,204 | −$6,276 | 60% | 519 | $15,641 | 11/16 | $24,138 | $8,560 | 15.4% | 32 / 13 | 2 | coverage 62%; $37M/day |
| KBE | us-financials | surv / surv / surv | 69 | $137,138 | $25,344 | −$17,568 | 40% | 664 | $20,011 | 9/16 | $65,628 | $26,985 | 2.9% | 51 / 16 | 3 |  |
| KIE | us-financials | scr-down / surv / surv | 18 | $61,266 | $17,348 | −$10,664 | 68% | 187 | $5,636 | 16/16 | $30,700 | $8,759 | 17.4% | 33 / 5 | 4 | $11M/day |
| KRE | us-financials | surv / surv / surv | 71 | $109,514 | $23,453 | −$19,702 | 41% | 407 | $12,266 | 4/16 | $42,897 | $12,202 | 1.0% | 56 / 9 | 2 |  |
| LQD | rates-credit | surv* / surv* / surv* | 7 | $13,957 | $11,418 | −$529 | 86% | 289 | $8,710 | 6/16 | $4,913 | $3,125 | 2.6% | 50 / 58 | 4 |  |
| MTUM | us-tech-growth | surv / surv / surv | 16 | $69,881 | $17,614 | −$856 | 50% | 468 | $14,104 | 16/16 | $41,338 | $22,920 | 23.7% | 18 / 32 | 2 |  |
| QUAL | us-tech-growth | surv / surv / surv | 18 | $76,588 | $15,460 | −$1,573 | 54% | 639 | $19,258 | 16/16 | $23,732 | −$16,976 | 16.9% | 20 / 42 | 4 |  |
| RSP | us-broad-size-factor | surv* / surv* / surv | 12 | $55,705 | $16,316 | $267 | 72% | 203 | $6,118 | 16/16 | $26,988 | $5,325 | 11.2% | 16 / 7 | 3 |  |
| SHY | rates-credit | rejected / rejected / rejected | — | n/a | n/a | n/a | n/a | — | n/a | — | n/a | n/a | 0.0% | 61 / 61 | 0 |  |
| SLV | precious-metals | surv* / surv / surv | 25 | $103,793 | $17,597 | −$5,194 | 49% | 397 | $11,964 | 16/16 | $49,376 | $29,319 | 21.3% | 22 / 11 | 1 |  |
| SMH | us-tech-growth | surv / surv / surv | 38 | $119,866 | $20,957 | −$12,274 | 34% | 668 | $20,132 | 15/16 | $76,866 | $29,526 | 11.7% | 36 / 22 | 2 | semiconductor (research-only) |
| SPLV | us-broad-size-factor | scr-down / scr-down / scr-down | 20 | $45,386 | $21,987 | −$4,299 | 65% | 636 | $19,167 | 16/16 | −$895 | −$18,504 | 9.6% | 47 / 55 | 2 |  |
| TIP | rates-credit | rejected / rejected / rejected | 2 | $8,208 | $5,741 | $3,308 | 100% | 12 | $362 | — | n/a | n/a | 0.0% | 23 / 1 | 1 |  |
| TLT | rates-credit | surv* / surv* / surv | 10 | $44,990 | $7,784 | −$931 | 88% | 301 | $9,071 | 16/16 | $16,167 | $11,839 | 9.6% | 17 / 31 | 2 |  |
| USMV | us-broad-size-factor | surv / surv / surv | 25 | $48,547 | $18,134 | −$2,673 | 56% | 636 | $19,167 | 16/16 | $4,073 | −$5,998 | 7.2% | 52 / 53 | 4 |  |
| VGK | developed-ex-us | surv* / surv* / scr-down | 38 | $58,504 | $21,241 | −$11,760 | 70% | 541 | $16,304 | 15/16 | −$127 | −$12,590 | 15.5% | 57 / 45 | 2 |  |
| VGT | us-tech-growth | surv* / surv* / surv | 17 | $125,218 | $22,889 | −$4,617 | 74% | 998 | $30,077 | 16/16 | $40,848 | $27,984 | 27.3% | 5 / 40 | 1 | control instrument |
| VIG | us-broad-size-factor | surv / surv / surv | 17 | $66,906 | $15,378 | −$2,188 | 52% | 409 | $12,326 | 15/16 | $15,576 | −$8,173 | 12.9% | 24 / 26 | 3 |  |
| VOOG | us-tech-growth | surv* / surv / surv | 16 | $59,474 | $9,220 | −$3,150 | 51% | 220 | $6,630 | 16/16 | $35,301 | $14,999 | 22.0% | 27 / 8 | 2 | coverage 41%; $16M/day |
| VPU | us-defensive | surv* / surv / surv | 11 | $53,774 | $17,828 | −$7,250 | 68% | 357 | $10,759 | 16/16 | $30,217 | $17,035 | 14.1% | 12 / 30 | 3 | coverage 58%; $22M/day |
| XBI | us-healthcare-biotech | surv / surv / surv | 30 | $85,550 | $23,477 | −$2,587 | 40% | 274 | $8,258 | 16/16 | $35,158 | $15,841 | 2.2% | 39 / 6 | 2 |  |
| XHB | us-cyclical | surv / surv / surv | 20 | $134,145 | $23,493 | −$4,742 | 38% | 999 | $30,107 | 16/16 | $81,854 | $67,688 | 11.6% | 7 / 38 | 1 |  |
| XLB | materials-metals-mining | surv / surv / surv | 18 | $84,008 | $11,613 | −$358 | 40% | 392 | $11,814 | 16/16 | $56,096 | $27,198 | 17.4% | 15 / 14 | 1 |  |
| XLE | energy | scr-down / surv / surv | 26 | $123,315 | $26,609 | −$9,686 | 52% | 367 | $11,060 | 4/16 | $52,210 | $24,943 | 0.5% | 14 / 4 | 1 |  |
| XLF | us-financials | surv / surv / surv | 28 | $83,732 | $17,653 | −$6,488 | 37% | 598 | $18,022 | 10/16 | $57,101 | −$25,940 | 15.9% | 37 / 36 | 4 |  |
| XLI | us-cyclical | surv* / surv* / surv | 12 | $95,759 | $17,044 | −$1,878 | 56% | 366 | $11,030 | 11/16 | $28,967 | $9,567 | 9.7% | 4 / 10 | 2 |  |
| XLK | us-tech-growth | surv / surv* / surv | 22 | $117,501 | $26,601 | −$9,322 | 81% | 993 | $29,926 | 16/16 | $26,315 | $19,215 | 26.8% | 9 / 44 | 3 |  |
| XLP | us-defensive | surv / surv / surv | 18 | $51,984 | $16,180 | −$9,264 | 52% | 642 | $19,348 | 16/16 | $21,875 | $3,842 | 14.1% | 38 / 50 | 4 |  |
| XLU | us-defensive | surv* / surv* / surv | 17 | $40,429 | $19,990 | −$2,250 | 48% | 214 | $6,449 | 16/16 | $14,708 | −$9,621 | 15.1% | 42 / 20 | 3 |  |
| XLV | us-healthcare-biotech | surv / surv / surv | 25 | $64,887 | $28,314 | −$5,938 | 52% | 1135 | $34,205 | 15/16 | $16,923 | −$6,599 | 12.6% | 41 / 57 | 4 |  |
| XLY | us-cyclical | surv / surv / surv | 16 | $81,010 | $23,986 | −$12,081 | 58% | 586 | $17,660 | 16/16 | $47,701 | $17,469 | 17.9% | 10 / 37 | 3 |  |
| XME | materials-metals-mining | surv / surv / surv | 20 | $216,940 | $21,845 | −$14,776 | 47% | 637 | $19,197 | 16/16 | $64,632 | $36,009 | 3.3% | 3 / 3 | 3 |  |
| XOP | energy | scr-down / surv / scr-down | 13 | $16,473 | $27,148 | −$19,279 | 115% | 103 | $3,104 | 6/16 | −$111,158 | −$136,957 | 0.0% | 58 / 29 | 2 |  |
| XRT | us-cyclical | surv* / surv / surv | 41 | $93,378 | $25,279 | −$10,765 | 37% | 485 | $14,616 | 14/16 | $58,739 | $36,739 | 7.8% | 46 / 18 | 3 |  |

## Fold windows — the period-correct representatives

The fold-a and fold-b representatives were chosen on data through 2020-06-30 and 2021-12-31; they are generally
**different vectors** from the final-window representative of the same ETF. A final-window vector says nothing about
an earlier fold's out-of-sample years.

| ETF | fold-a status | fold-a trades / net / min. DD | fold-b status | fold-b trades / net / min. DD | final trades / net | final vector (X Y stop hold L buffer P W) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| AGG | rejected | 1 / $7,118 / $2,526 | rejected | 1 / $65 / $952 | 7 / $726 | 8.7% Y 1.6% L 116 stop 4.1% hold 16 buffer 5.1% P 14.6% W 138 |
| DBC | surv* | 6 / $11,040 / $8,710 | surv | 11 / $54,664 / $11,883 | 7 / $101,030 | 26.7% Y 0.2% L 141 stop 8.9% hold 12 buffer 2.3% P 6.2% W 34 |
| EDV | surv | 12 / $53,172 / $13,235 | surv* | 7 / $28,515 / $12,694 | 10 / $62,727 | 20.7% Y 3.8% L 41 stop 5.1% hold 25 buffer 5.4% P 8.0% W 165 |
| EEM | scr-down | 20 / $28,035 / $21,983 | surv | 19 / $38,250 / $21,983 | 18 / $36,721 | 16.4% Y 0.1% L 69 stop 3.2% hold 19 buffer 3.9% P 9.2% W 157 |
| EFA | surv* | 8 / $32,836 / $6,586 | surv* | 9 / $46,854 / $6,378 | 17 / $61,194 | 28.1% Y 0.1% L 166 stop 3.1% hold 23 buffer 1.4% P 6.6% W 176 |
| EMB | surv* | 5 / $18,476 / $11,763 | surv* | 5 / $18,468 / $11,763 | 8 / $26,319 | 15.7% Y 1.2% L 71 stop 3.7% hold 11 buffer 0.3% P 19.3% W 89 |
| EWJ | surv* | 6 / $28,188 / $7,036 | surv | 10 / $43,171 / $12,360 | 13 / $49,590 | 23.0% Y 1.1% L 139 stop 3.3% hold 25 buffer 5.1% P 5.0% W 89 |
| EWW | surv | 28 / $59,584 / $22,708 | surv | 31 / $69,570 / $23,174 | 38 / $104,277 | 19.1% Y 1.3% L 178 stop 4.0% hold 26 buffer 2.6% P 15.3% W 187 |
| EWY | surv | 10 / $31,556 / $27,450 | surv | 13 / $68,073 / $27,450 | 15 / $65,435 | 29.6% Y 2.4% L 140 stop 3.9% hold 22 buffer 2.0% P 3.9% W 161 |
| EWZ | scr-down | 20 / $45,546 / $26,660 | surv | 33 / $68,419 / $27,795 | 48 / $111,647 | 30.0% Y 0.2% L 223 stop 4.5% hold 11 buffer 5.4% P 19.7% W 47 |
| FXI | surv | 18 / $28,495 / $18,277 | surv | 17 / $29,722 / $17,785 | 8 / $89,172 | 26.2% Y 1.1% L 58 stop 7.6% hold 9 buffer 2.8% P 16.3% W 149 |
| GDX | surv | 15 / $152,012 / $17,507 | surv | 14 / $165,035 / $25,472 | 54 / $185,534 | 27.8% Y 1.1% L 231 stop 7.6% hold 3 buffer 2.2% P 7.0% W 127 |
| GLD | surv* | 4 / $33,238 / $11,562 | surv | 20 / $35,491 / $15,830 | 20 / $36,901 | 13.5% Y 0.6% L 123 stop 3.0% hold 14 buffer 5.2% P 3.9% W 78 |
| HYG | surv* | 6 / $10,772 / $13,659 | scr-down | 7 / $9,459 / $13,659 | 7 / $14,795 | 16.4% Y 2.6% L 223 stop 3.0% hold 12 buffer 1.1% P 15.5% W 97 |
| IAU | surv* | 7 / $17,138 / $6,681 | surv | 14 / $24,674 / $10,585 | 8 / $40,014 | 13.1% Y 2.0% L 101 stop 5.7% hold 25 buffer 4.4% P 11.4% W 180 |
| IBB | surv | 17 / $71,449 / $17,877 | surv | 23 / $76,365 / $18,524 | 12 / $84,102 | 22.8% Y 0.6% L 56 stop 6.2% hold 24 buffer 2.1% P 11.1% W 48 |
| IEF | rejected | — | rejected | 1 / −$113 / $1,738 | 8 / $2,604 | 10.7% Y 1.4% L 118 stop 6.2% hold 3 buffer 2.7% P 18.8% W 171 |
| IEMG | surv* | 4 / $18,000 / $12,390 | scr-down | 6 / $41,946 / $11,668 | 25 / $38,651 | 20.9% Y 0.8% L 125 stop 3.3% hold 22 buffer 1.3% P 3.2% W 118 |
| IGV | surv | 21 / $68,664 / $24,125 | surv | 37 / $87,270 / $20,667 | 38 / $121,016 | 18.2% Y 3.2% L 193 stop 3.9% hold 23 buffer 1.6% P 7.0% W 97 |
| IJH | surv | 11 / $49,413 / $17,084 | surv | 17 / $67,412 / $17,275 | 24 / $87,166 | 23.6% Y 0.5% L 165 stop 3.1% hold 11 buffer 2.4% P 7.1% W 104 |
| IJR | surv | 10 / $49,108 / $15,929 | surv | 28 / $83,774 / $20,399 | 16 / $76,567 | 17.5% Y 4.9% L 194 stop 3.7% hold 24 buffer 5.5% P 16.6% W 36 |
| ILF | surv | 20 / $52,261 / $27,968 | surv | 30 / $90,818 / $25,479 | 40 / $92,843 | 27.2% Y 0.5% L 210 stop 3.6% hold 11 buffer 2.4% P 14.7% W 123 |
| INDA | scr-down | 16 / $29,998 / $29,407 | surv | 15 / $68,728 / $33,086 | 21 / $74,647 | 22.6% Y 0.5% L 188 stop 5.2% hold 14 buffer 0.4% P 4.4% W 145 |
| IWD | surv* | 7 / $31,682 / $16,550 | surv | 11 / $54,664 / $16,584 | 13 / $54,865 | 27.7% Y 0.7% L 226 stop 3.7% hold 22 buffer 1.0% P 4.1% W 143 |
| IWF | surv | 10 / $53,716 / $9,388 | surv | 13 / $74,165 / $9,388 | 50 / $117,211 | 10.6% Y 1.3% L 192 stop 4.3% hold 13 buffer 1.9% P 4.6% W 90 |
| IWM | surv* | 8 / $53,420 / $14,323 | surv | 13 / $57,474 / $14,451 | 38 / $68,670 | 18.7% Y 1.4% L 112 stop 3.8% hold 13 buffer 5.2% P 8.7% W 96 |
| IWN | scr-down | 15 / $44,082 / $17,325 | surv | 14 / $61,540 / $17,265 | 19 / $74,268 | 26.0% Y 0.3% L 125 stop 3.4% hold 11 buffer 4.8% P 14.0% W 121 |
| IYT | surv* | 8 / $61,515 / $11,001 | surv | 14 / $82,182 / $15,429 | 34 / $115,869 | 21.2% Y 1.1% L 198 stop 4.8% hold 5 buffer 5.4% P 6.0% W 44 |
| KBE | surv | 19 / $85,835 / $20,312 | surv | 37 / $118,195 / $25,335 | 69 / $137,138 | 25.5% Y 3.2% L 208 stop 3.9% hold 4 buffer 2.6% P 4.6% W 187 |
| KIE | scr-down | 15 / $40,438 / $17,991 | surv | 17 / $53,341 / $20,596 | 18 / $61,266 | 27.7% Y 1.3% L 211 stop 3.9% hold 14 buffer 0.5% P 7.2% W 73 |
| KRE | surv | 19 / $59,166 / $24,070 | surv | 31 / $85,042 / $24,070 | 71 / $109,514 | 29.7% Y 1.6% L 208 stop 3.0% hold 5 buffer 0.8% P 17.4% W 19 |
| LQD | surv* | 4 / $14,289 / $10,526 | surv* | 5 / $12,775 / $10,910 | 7 / $13,957 | 12.4% Y 1.3% L 50 stop 3.4% hold 29 buffer 2.3% P 4.3% W 104 |
| MTUM | surv | 13 / $40,399 / $17,614 | surv | 14 / $66,541 / $17,614 | 16 / $69,881 | 20.5% Y 0.9% L 75 stop 3.7% hold 27 buffer 1.4% P 12.5% W 162 |
| QUAL | surv | 13 / $45,926 / $9,606 | surv | 10 / $56,728 / $15,283 | 18 / $76,588 | 21.1% Y 1.0% L 153 stop 3.7% hold 26 buffer 5.2% P 7.7% W 171 |
| RSP | surv* | 9 / $49,530 / $17,117 | surv* | 9 / $71,890 / $19,218 | 12 / $55,705 | 20.9% Y 0.8% L 236 stop 3.6% hold 18 buffer 1.3% P 12.8% W 31 |
| SHY | rejected | — | rejected | — | — | — |
| SLV | surv* | 9 / $46,993 / $10,955 | surv | 18 / $90,549 / $17,597 | 25 / $103,793 | 23.7% Y 3.6% L 129 stop 3.2% hold 24 buffer 0.5% P 4.7% W 159 |
| SMH | surv | 20 / $60,186 / $16,245 | surv | 49 / $119,487 / $32,065 | 38 / $119,866 | 24.2% Y 2.2% L 50 stop 3.9% hold 25 buffer 3.5% P 3.1% W 182 |
| SPLV | scr-down | 11 / $28,607 / $21,773 | scr-down | 14 / $45,841 / $21,773 | 20 / $45,386 | 12.6% Y 1.4% L 176 stop 3.2% hold 20 buffer 0.9% P 8.9% W 69 |
| TIP | rejected | 2 / $10,660 / $5,781 | rejected | 2 / $10,660 / $5,781 | 2 / $8,208 | 9.5% Y 2.9% L 23 stop 3.1% hold 4 buffer 0.0% P 4.5% W 170 |
| TLT | surv* | 8 / $38,275 / $22,663 | surv* | 7 / $20,650 / $12,262 | 10 / $44,990 | 19.0% Y 1.7% L 68 stop 3.5% hold 17 buffer 1.9% P 6.9% W 124 |
| USMV | surv | 10 / $41,666 / $17,111 | surv | 16 / $51,406 / $18,134 | 25 / $48,547 | 13.2% Y 1.6% L 174 stop 3.0% hold 11 buffer 1.5% P 3.6% W 61 |
| VGK | surv* | 9 / $36,949 / $10,396 | surv* | 8 / $47,547 / $8,067 | 38 / $58,504 | 10.1% Y 2.2% L 46 stop 3.0% hold 4 buffer 0.4% P 5.4% W 43 |
| VGT | surv* | 7 / $78,881 / $23,260 | surv* | 7 / $106,278 / $21,278 | 17 / $125,218 | 22.9% Y 3.5% L 194 stop 7.8% hold 8 buffer 3.4% P 9.5% W 60 |
| VIG | surv | 12 / $29,853 / $16,286 | surv | 10 / $54,557 / $15,717 | 17 / $66,906 | 18.5% Y 0.2% L 242 stop 3.6% hold 7 buffer 3.7% P 4.9% W 24 |
| VOOG | surv* | 7 / $38,114 / $8,991 | surv | 26 / $88,584 / $13,681 | 16 / $59,474 | 28.0% Y 1.7% L 126 stop 3.4% hold 12 buffer 4.8% P 3.2% W 92 |
| VPU | surv* | 4 / $37,173 / $7,208 | surv | 12 / $38,387 / $19,855 | 11 / $53,774 | 19.9% Y 0.6% L 185 stop 5.8% hold 8 buffer 1.9% P 12.2% W 88 |
| XBI | surv | 15 / $71,747 / $18,519 | surv | 31 / $87,321 / $21,835 | 30 / $85,550 | 24.7% Y 2.3% L 31 stop 3.6% hold 17 buffer 0.7% P 6.4% W 192 |
| XHB | surv | 13 / $80,589 / $20,321 | surv | 21 / $111,914 / $20,321 | 20 / $134,145 | 26.7% Y 4.7% L 235 stop 6.7% hold 28 buffer 1.3% P 4.9% W 27 |
| XLB | surv | 11 / $63,263 / $10,926 | surv | 13 / $67,424 / $11,613 | 18 / $84,008 | 25.3% Y 0.5% L 127 stop 3.7% hold 25 buffer 2.2% P 4.1% W 42 |
| XLE | scr-down | 15 / $65,580 / $24,872 | surv | 23 / $89,167 / $26,140 | 26 / $123,315 | 29.2% Y 2.7% L 74 stop 6.4% hold 4 buffer 0.1% P 13.3% W 179 |
| XLF | surv | 16 / $53,866 / $14,966 | surv | 23 / $97,353 / $17,164 | 28 / $83,732 | 22.6% Y 1.1% L 121 stop 3.2% hold 27 buffer 0.7% P 6.0% W 161 |
| XLI | surv* | 8 / $61,269 / $17,003 | surv* | 9 / $78,794 / $17,003 | 12 / $95,759 | 21.8% Y 0.9% L 188 stop 4.6% hold 28 buffer 0.9% P 12.9% W 19 |
| XLK | surv | 11 / $78,610 / $16,870 | surv* | 6 / $108,932 / $34,534 | 22 / $117,501 | 19.1% Y 1.4% L 193 stop 7.7% hold 11 buffer 4.0% P 9.6% W 55 |
| XLP | surv | 10 / $32,965 / $15,178 | surv | 22 / $38,515 / $14,887 | 18 / $51,984 | 13.4% Y 0.7% L 51 stop 4.3% hold 3 buffer 2.1% P 6.5% W 171 |
| XLU | surv* | 4 / $37,163 / $12,027 | surv* | 8 / $44,714 / $21,846 | 17 / $40,429 | 16.2% Y 1.3% L 72 stop 3.2% hold 20 buffer 2.6% P 13.9% W 102 |
| XLV | surv | 10 / $32,672 / $17,620 | surv | 20 / $41,192 / $17,890 | 25 / $64,887 | 11.9% Y 1.7% L 194 stop 4.4% hold 14 buffer 4.5% P 7.5% W 159 |
| XLY | surv | 10 / $60,619 / $13,067 | surv | 16 / $69,566 / $13,150 | 16 / $81,010 | 22.1% Y 3.0% L 81 stop 5.5% hold 16 buffer 0.7% P 11.4% W 156 |
| XME | surv | 34 / $68,707 / $24,161 | surv | 13 / $156,968 / $20,976 | 20 / $216,940 | 27.7% Y 0.5% L 25 stop 7.5% hold 4 buffer 2.7% P 9.7% W 193 |
| XOP | scr-down | 16 / $57,269 / $25,530 | surv | 28 / $100,095 / $25,530 | 13 / $16,473 | 29.8% Y 4.9% L 20 stop 4.5% hold 28 buffer 3.1% P 9.3% W 91 |
| XRT | surv* | 9 / $48,283 / $19,481 | surv | 20 / $88,830 / $24,302 | 41 / $93,378 | 24.0% Y 1.6% L 84 stop 3.0% hold 19 buffer 5.8% P 6.6% W 93 |

## What the source never stored (must be computed, never assumed)

- per-trade ledger (dates, entry/exit prices, exit reasons) — only aggregates and nets by exit year are stored
- MAE/MFE and intratrade adverse excursion
- episode-level breadth (which correction/recovery each trade belongs to)
- portfolio-mode (20% of marked equity) results
- cost/interest stress beyond 5 bps per side and 11%
- fold validation of the standalone vector itself (only pooled configurations were validated)
- neighbourhood nets: the 16 stored draws hold J_s scores (net − best trade − DD excess over $20,000), not nets

These are computed in Stage C for the shortlisted phenotypes only (`OPPORTUNITY_*`, `COST_AND_TAIL_RISK.md`,
`PORTFOLIO_AND_CAPITAL_EFFICIENCY.md`) and, for the fold representatives of all 61, in Stage D
(`CHRONOLOGICAL_EVIDENCE_AND_SELECTION_BIAS.md`).

## Instrument notes

- **Semiconductors:** SMH is the only semiconductor fund in the universe. It stays in this census with all its
  records; it is research-only and not presumed eligible for the user's holdings, so the shortlist scores it but never
  places it.
- **Liquidity:** minute coverage below 75% (EDV, IYT, VOOG, VPU) or training median dollar volume below $50M
  (DBC, EDV, ILF, IYT, KIE, VOOG, VPU) is noted per row; fills at "the first trade after the decision" can lag in thin
  minutes.
- **Survivorship:** the universe is today's listed funds with complete 2016–2026 data; funds that closed or launched
  later are absent, and the universe was chosen by an earlier study.
- **Splits** are forward-adjusted from `config/market-events/splits.json`; distributions exist only for VGT/VOOG.
