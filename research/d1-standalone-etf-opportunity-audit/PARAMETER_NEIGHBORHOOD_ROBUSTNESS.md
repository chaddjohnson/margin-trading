# Parameter neighbourhood robustness (Stage C1)

**Evidence tier: T-train (2016-01-04 → 2023-12-29, the window every candidate was optimised on).** Every row is a
diagnostic run of an existing vector or of a perturbation of it; **no neighbour is a candidate** and none is written
anywhere but `results/runs/`. Window 2016-01-04 → 2023-12-29 (2012 sessions; books armed 2017-06-15); fixed $100,000 slot, 5 bps per side, 11% simple interest. Base-run
parity before any neighbourhood run: 386/386 checks passed (`results/parity/BASE_PARITY.json`).

## Designs (bound before any result, `results/designs/designs.json`)

- **OAT:** each of the eight D1 parameters at v − m, v − s, v + s, v + m with the completed audits' distances (≥ 2.0%:
  ±0.5/±1.0 pp; below 2.0%: ±max(0.1 pp, 25%·v)/±max(0.2 pp, 50%·v); whole numbers ±max(1, 10%·v)/±max(s+1, 20%·v)).
  Points outside the engine's legal grid are truncated and not run (GDX and GDX alt hold −m, KBE alt stop −m, EDV
  buffer +m); points outside the source's narrower search box but inside the legal grid are run and marked †.
- **Joint 8-D:** two Latin hypercubes of 64 over [v − m, v + m] ∩ legal grid, all eight parameters moving together,
  drawn from **one common stream for every phenotype** (common random numbers: every phenotype's samples sit at the
  same relative strata of its own intervals; VGT primary's 128 vectors are exactly those the completed VGT audit ran on
  2016–2026).
- **Relative sizes differ.** The same rule is a ±32% change of IJH's 3.1% stop but ±13% of GDX's 7.6%; one day is ±33%
  of GDX's 3-day hold; ±1 pp of X is milder for a 37%-volatility fund (GDX) than a 20% one (MTUM, EDV). Differences
  between ETFs partly reflect where each vector sits and each fund's volatility, not only intrinsic robustness.
- **Retention** = a run's net ÷ its own base net. A candidate's base is a fitted optimum on this exact window, so its
  retention is biased down relative to VGT primary's (chosen with other data); compare absolute neighbourhood nets too.

## Joint 8-D neighbourhoods, 128 pooled samples (the primary design)

| Phenotype | design | N | median net | P10 | P90 | worst | net > 0 | ≥ 50% of base | median retention | DD ≤ $35k | median min. DD | median per $1M $-days | median port. daily DD | port. DD > 35% |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VGT primary (control) | jointPooled | 128 | $71,174 | $38,886 | $102,517 | $856 | 100% | 54% | 0.53 | 100% | $22,606 | $1,235 | 34.0% | 8% |
| VGT research rep. (procedure-matched control) | jointPooled | 128 | $60,635 | $24,948 | $89,849 | −$9,200 | 97% | 45% | 0.48 | 77% | $30,724 | $808 | 36.4% | 96% |
| XME:representative | jointPooled | 128 | $61,287 | $18,377 | $135,050 | −$4,215 | 98% | 31% | 0.28 | 94% | $26,170 | $2,693 | 34.5% | 11% |
| XME:alternative-1 | jointPooled | 128 | $44,252 | $18,517 | $83,516 | −$6,283 | 99% | 22% | 0.33 | 16% | $45,362 | $789 | 36.6% | 92% |
| GDX:representative | jointPooled | 128 | $136,158 | $107,647 | $160,043 | $64,531 | 100% | 96% | 0.73 | 38% | $37,275 | $1,695 | 35.9% | 68% |
| GDX:alternative-1 | jointPooled | 128 | $126,790 | $93,096 | $153,291 | $65,822 | 100% | 93% | 0.74 | 34% | $37,394 | $1,845 | 36.0% | 69% |
| KBE:representative | jointPooled | 128 | $71,917 | $41,327 | $110,831 | $2,805 | 100% | 55% | 0.52 | 45% | $35,881 | $1,363 | 34.4% | 34% |
| KBE:alternative-1 | jointPooled | 128 | $70,510 | $36,209 | $101,543 | $17,895 | 100% | 65% | 0.57 | 45% | $36,683 | $1,012 | 35.5% | 100% |
| SLV:representative | jointPooled | 128 | $61,267 | $35,089 | $86,847 | $20,319 | 100% | 64% | 0.59 | 98% | $22,079 | $1,646 | 33.8% | 19% |
| FXI:representative | jointPooled | 128 | $56,108 | $35,165 | $75,067 | $22,297 | 100% | 77% | 0.63 | 99% | $22,127 | $1,905 | 32.1% | 0% |
| FXI:alternative-1 | jointPooled | 128 | $51,858 | $30,706 | $75,847 | $5,356 | 100% | 68% | 0.60 | 98% | $20,011 | $1,780 | 32.3% | 0% |
| IJH:representative | jointPooled | 128 | $31,142 | $9,651 | $54,975 | $1,094 | 100% | 27% | 0.36 | 99% | $28,501 | $1,404 | 35.3% | 75% |
| IJH:alternative-1 | jointPooled | 128 | $35,681 | $20,465 | $62,754 | −$3,078 | 99% | 41% | 0.45 | 48% | $38,106 | $665 | 36.1% | 77% |
| XLB:representative | jointPooled | 128 | $55,359 | $25,886 | $72,117 | $13,803 | 100% | 72% | 0.66 | 100% | $12,160 | $2,315 | 33.5% | 0% |
| MTUM:representative | jointPooled | 128 | $36,766 | $16,333 | $53,281 | $9,509 | 100% | 55% | 0.53 | 100% | $17,614 | $1,105 | 32.7% | 0% |
| MTUM:alternative-1 | jointPooled | 128 | $22,668 | $8,011 | $42,322 | −$9,279 | 98% | 28% | 0.36 | 95% | $20,171 | $558 | 34.4% | 30% |
| XHB:representative | jointPooled | 128 | $72,226 | $32,643 | $103,718 | $5,075 | 100% | 53% | 0.54 | 56% | $31,907 | $943 | 35.4% | 59% |
| EWW:representative | jointPooled | 128 | $65,459 | $46,284 | $86,165 | $19,257 | 100% | 77% | 0.63 | 88% | $27,651 | $1,038 | 33.9% | 15% |
| EWW:alternative-1 | jointPooled | 128 | $64,923 | $45,412 | $83,315 | $6,233 | 100% | 88% | 0.69 | 98% | $23,226 | $1,229 | 33.5% | 11% |
| EDV:representative | jointPooled | 128 | $36,045 | $12,337 | $52,846 | −$6,185 | 98% | 58% | 0.57 | 97% | $17,417 | $1,206 | 34.2% | 29% |
| EDV:alternative-1 | jointPooled | 128 | $13,646 | −$6,371 | $30,000 | −$31,519 | 79% | 16% | 0.25 | 79% | $26,123 | $439 | 35.5% | 71% |

## Per seed (the standing axes must hold on each seed)

| Phenotype | design | N | median net | P10 | P90 | worst | net > 0 | ≥ 50% of base | median retention | DD ≤ $35k | median min. DD | median per $1M $-days | median port. daily DD | port. DD > 35% |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VGT primary (control) | jointSeed1 | 64 | $71,291 | $43,369 | $103,302 | $856 | 100% | 52% | 0.53 | 100% | $22,943 | $1,217 | 34.1% | 11% |
| VGT primary (control) | jointSeed2 | 64 | $70,994 | $37,384 | $100,816 | $10,607 | 100% | 56% | 0.52 | 100% | $22,517 | $1,257 | 33.9% | 5% |
| VGT research rep. (procedure-matched control) | jointSeed1 | 64 | $60,643 | $26,146 | $90,157 | −$9,200 | 95% | 45% | 0.48 | 80% | $30,220 | $808 | 36.5% | 97% |
| VGT research rep. (procedure-matched control) | jointSeed2 | 64 | $59,812 | $24,365 | $84,589 | −$1,602 | 98% | 44% | 0.48 | 75% | $31,099 | $809 | 36.4% | 95% |
| XME:representative | jointSeed1 | 64 | $62,534 | $26,655 | $140,477 | −$1,189 | 98% | 34% | 0.29 | 95% | $26,170 | $2,730 | 34.5% | 9% |
| XME:representative | jointSeed2 | 64 | $60,728 | $13,823 | $123,122 | −$4,215 | 97% | 28% | 0.28 | 92% | $26,170 | $2,676 | 34.5% | 13% |
| XME:alternative-1 | jointSeed1 | 64 | $43,428 | $14,433 | $84,473 | −$6,283 | 98% | 20% | 0.33 | 19% | $44,857 | $760 | 36.6% | 91% |
| XME:alternative-1 | jointSeed2 | 64 | $46,224 | $25,791 | $82,394 | $15,441 | 100% | 23% | 0.35 | 14% | $45,568 | $803 | 36.6% | 94% |
| GDX:representative | jointSeed1 | 64 | $130,268 | $107,270 | $159,892 | $67,554 | 100% | 98% | 0.70 | 34% | $38,653 | $1,681 | 35.9% | 67% |
| GDX:representative | jointSeed2 | 64 | $138,204 | $110,784 | $159,617 | $64,531 | 100% | 94% | 0.74 | 42% | $35,811 | $1,714 | 35.6% | 69% |
| GDX:alternative-1 | jointSeed1 | 64 | $126,284 | $92,358 | $156,281 | $65,822 | 100% | 94% | 0.73 | 31% | $37,610 | $1,865 | 36.3% | 69% |
| GDX:alternative-1 | jointSeed2 | 64 | $126,790 | $97,449 | $150,496 | $68,172 | 100% | 92% | 0.74 | 38% | $36,611 | $1,844 | 35.9% | 69% |
| KBE:representative | jointSeed1 | 64 | $70,184 | $43,624 | $111,093 | $2,963 | 100% | 53% | 0.51 | 45% | $35,683 | $1,350 | 34.6% | 31% |
| KBE:representative | jointSeed2 | 64 | $72,297 | $39,373 | $105,728 | $2,805 | 100% | 58% | 0.53 | 44% | $35,906 | $1,425 | 34.4% | 36% |
| KBE:alternative-1 | jointSeed1 | 64 | $71,444 | $34,053 | $99,963 | $17,895 | 100% | 69% | 0.58 | 45% | $36,908 | $1,015 | 35.5% | 100% |
| KBE:alternative-1 | jointSeed2 | 64 | $69,067 | $36,751 | $102,405 | $18,517 | 100% | 61% | 0.56 | 44% | $35,981 | $1,010 | 35.5% | 100% |
| SLV:representative | jointSeed1 | 64 | $61,205 | $37,351 | $84,810 | $24,240 | 100% | 66% | 0.59 | 98% | $22,116 | $1,633 | 33.9% | 20% |
| SLV:representative | jointSeed2 | 64 | $61,394 | $33,974 | $88,540 | $20,319 | 100% | 63% | 0.59 | 97% | $21,931 | $1,665 | 33.6% | 17% |
| FXI:representative | jointSeed1 | 64 | $55,576 | $36,416 | $74,024 | $26,690 | 100% | 77% | 0.62 | 98% | $22,127 | $1,912 | 32.1% | 0% |
| FXI:representative | jointSeed2 | 64 | $56,828 | $33,809 | $75,396 | $22,297 | 100% | 77% | 0.64 | 100% | $22,280 | $1,905 | 32.1% | 0% |
| FXI:alternative-1 | jointSeed1 | 64 | $53,490 | $31,164 | $72,568 | $5,356 | 100% | 70% | 0.62 | 97% | $20,249 | $1,795 | 32.3% | 0% |
| FXI:alternative-1 | jointSeed2 | 64 | $51,124 | $30,941 | $76,276 | $19,225 | 100% | 66% | 0.59 | 100% | $19,879 | $1,774 | 32.2% | 0% |
| IJH:representative | jointSeed1 | 64 | $31,839 | $9,753 | $54,291 | $1,094 | 100% | 28% | 0.37 | 100% | $28,419 | $1,404 | 35.4% | 75% |
| IJH:representative | jointSeed2 | 64 | $31,083 | $9,718 | $57,975 | $3,830 | 100% | 25% | 0.36 | 98% | $28,593 | $1,403 | 35.3% | 75% |
| IJH:alternative-1 | jointSeed1 | 64 | $34,695 | $21,268 | $59,372 | $5,731 | 100% | 39% | 0.44 | 47% | $38,763 | $660 | 36.1% | 78% |
| IJH:alternative-1 | jointSeed2 | 64 | $35,889 | $19,858 | $64,551 | −$3,078 | 98% | 42% | 0.45 | 48% | $36,762 | $669 | 35.6% | 77% |
| XLB:representative | jointSeed1 | 64 | $55,736 | $25,409 | $70,826 | $13,803 | 100% | 69% | 0.66 | 100% | $12,160 | $2,283 | 33.5% | 0% |
| XLB:representative | jointSeed2 | 64 | $54,245 | $26,629 | $73,530 | $18,287 | 100% | 75% | 0.65 | 100% | $12,208 | $2,320 | 33.4% | 0% |
| MTUM:representative | jointSeed1 | 64 | $36,644 | $16,257 | $54,266 | $9,509 | 100% | 56% | 0.52 | 100% | $17,614 | $1,101 | 32.7% | 0% |
| MTUM:representative | jointSeed2 | 64 | $36,851 | $17,419 | $52,038 | $10,254 | 100% | 53% | 0.53 | 100% | $17,614 | $1,110 | 32.8% | 0% |
| MTUM:alternative-1 | jointSeed1 | 64 | $25,354 | $4,929 | $41,269 | −$7,912 | 97% | 27% | 0.41 | 92% | $20,171 | $589 | 34.3% | 31% |
| MTUM:alternative-1 | jointSeed2 | 64 | $20,317 | $8,385 | $42,556 | −$9,279 | 98% | 30% | 0.33 | 98% | $20,115 | $541 | 34.4% | 30% |
| XHB:representative | jointSeed1 | 64 | $71,548 | $30,658 | $104,388 | $16,408 | 100% | 53% | 0.53 | 53% | $32,677 | $925 | 35.6% | 64% |
| XHB:representative | jointSeed2 | 64 | $73,603 | $36,431 | $100,425 | $5,075 | 100% | 53% | 0.55 | 59% | $31,692 | $964 | 35.3% | 55% |
| EWW:representative | jointSeed1 | 64 | $64,435 | $45,716 | $85,585 | $25,389 | 100% | 78% | 0.62 | 86% | $27,569 | $1,013 | 34.0% | 14% |
| EWW:representative | jointSeed2 | 64 | $67,934 | $47,525 | $86,069 | $19,257 | 100% | 77% | 0.65 | 89% | $28,012 | $1,057 | 33.8% | 16% |
| EWW:alternative-1 | jointSeed1 | 64 | $68,193 | $46,168 | $82,627 | $22,465 | 100% | 88% | 0.72 | 98% | $23,815 | $1,268 | 33.5% | 13% |
| EWW:alternative-1 | jointSeed2 | 64 | $63,339 | $39,727 | $85,387 | $6,233 | 100% | 88% | 0.67 | 97% | $23,021 | $1,181 | 33.6% | 9% |
| EDV:representative | jointSeed1 | 64 | $34,857 | $12,400 | $52,068 | −$855 | 98% | 58% | 0.56 | 95% | $17,649 | $1,272 | 34.4% | 28% |
| EDV:representative | jointSeed2 | 64 | $36,175 | $12,100 | $52,988 | −$6,185 | 97% | 58% | 0.58 | 98% | $17,090 | $1,188 | 34.2% | 30% |
| EDV:alternative-1 | jointSeed1 | 64 | $13,446 | −$6,706 | $27,364 | −$31,519 | 77% | 11% | 0.24 | 81% | $26,028 | $431 | 35.5% | 72% |
| EDV:alternative-1 | jointSeed2 | 64 | $14,766 | −$5,467 | $32,088 | −$24,470 | 81% | 20% | 0.27 | 77% | $26,705 | $512 | 35.7% | 70% |

## One-at-a-time

| Phenotype | design | N | median net | P10 | P90 | worst | net > 0 | ≥ 50% of base | median retention | DD ≤ $35k | median min. DD | median per $1M $-days | median port. daily DD | port. DD > 35% |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VGT primary (control) | oat | 32 | $124,311 | $107,034 | $135,359 | $71,772 | 100% | 100% | 0.92 | 100% | $19,534 | $1,470 | 32.8% | 0% |
| VGT research rep. (procedure-matched control) | oat | 32 | $120,433 | $85,271 | $125,218 | $51,897 | 100% | 97% | 0.96 | 100% | $22,889 | $1,225 | 34.9% | 28% |
| XME:representative | oat | 32 | $204,889 | $71,141 | $216,940 | $35,992 | 100% | 84% | 0.94 | 100% | $21,845 | $3,384 | 32.3% | 0% |
| XME:alternative-1 | oat | 32 | $121,766 | $66,550 | $133,319 | $44,920 | 100% | 88% | 0.91 | 84% | $24,136 | $1,933 | 34.2% | 22% |
| GDX:representative | oat | 31 | $177,386 | $160,604 | $185,534 | $145,777 | 100% | 100% | 0.96 | 87% | $26,433 | $2,067 | 31.9% | 0% |
| GDX:alternative-1 | oat | 31 | $167,096 | $148,191 | $172,859 | $125,925 | 100% | 100% | 0.97 | 84% | $27,169 | $2,469 | 32.0% | 3% |
| KBE:representative | oat | 32 | $129,931 | $100,271 | $137,138 | $79,184 | 100% | 100% | 0.95 | 88% | $25,344 | $1,970 | 34.0% | 9% |
| KBE:alternative-1 | oat | 31 | $113,017 | $95,132 | $123,681 | $56,313 | 100% | 97% | 0.91 | 87% | $31,953 | $1,443 | 35.5% | 100% |
| SLV:representative | oat | 32 | $96,837 | $63,103 | $103,793 | $44,405 | 100% | 97% | 0.93 | 100% | $17,597 | $2,471 | 32.9% | 3% |
| FXI:representative | oat | 32 | $86,358 | $67,676 | $89,172 | $64,437 | 100% | 100% | 0.97 | 100% | $16,702 | $2,545 | 31.4% | 0% |
| FXI:alternative-1 | oat | 32 | $84,833 | $55,091 | $87,070 | $42,010 | 100% | 97% | 0.98 | 100% | $19,095 | $1,993 | 31.3% | 0% |
| IJH:representative | oat | 32 | $82,705 | $61,516 | $87,166 | $29,267 | 100% | 94% | 0.95 | 100% | $17,275 | $1,968 | 32.6% | 13% |
| IJH:alternative-1 | oat | 32 | $75,388 | $44,372 | $79,382 | $34,070 | 100% | 94% | 0.95 | 94% | $21,236 | $1,253 | 33.4% | 13% |
| XLB:representative | oat | 32 | $80,583 | $58,933 | $84,008 | $36,503 | 100% | 97% | 0.96 | 100% | $11,613 | $2,143 | 33.4% | 0% |
| MTUM:representative | oat | 32 | $66,501 | $47,552 | $69,881 | $24,380 | 100% | 97% | 0.95 | 100% | $17,614 | $1,456 | 31.9% | 0% |
| MTUM:alternative-1 | oat | 32 | $55,645 | $29,058 | $62,298 | $5,618 | 100% | 88% | 0.89 | 100% | $17,703 | $895 | 33.3% | 3% |
| XHB:representative | oat | 32 | $128,583 | $98,362 | $134,145 | $66,584 | 100% | 97% | 0.96 | 91% | $23,493 | $1,343 | 33.5% | 16% |
| EWW:representative | oat | 32 | $97,044 | $81,813 | $104,277 | $70,127 | 100% | 100% | 0.93 | 100% | $22,812 | $1,415 | 32.8% | 0% |
| EWW:alternative-1 | oat | 32 | $88,954 | $61,472 | $94,311 | $52,483 | 100% | 100% | 0.94 | 97% | $22,299 | $1,598 | 33.2% | 3% |
| EDV:representative | oat | 31 | $58,811 | $40,879 | $62,727 | $31,534 | 100% | 100% | 0.94 | 100% | $11,589 | $1,812 | 34.0% | 6% |
| EDV:alternative-1 | oat | 32 | $50,887 | $27,354 | $55,381 | $8,073 | 100% | 88% | 0.92 | 97% | $13,566 | $1,520 | 34.5% | 22% |

### Every OAT point (value → retention; † outside the source's search box)

| Phenotype | parameter | −m | −s | +s | +m |
| --- | ---: | ---: | ---: | ---: | ---: |
| VGT primary (control) | targetPercentChange | 206 → 0.79 | 211 → 0.99 | 221 → 0.97 | 226 → 0.90 |
| VGT primary (control) | trailingBuyPercentage | 1 → 0.99 | 2 → 0.99 | 4 → 0.99 | 5 → 0.68 |
| VGT primary (control) | trailingStopPercentage | 63 → 0.53 | 68 → 0.70 | 78 → 0.90 | 83 → 0.84 |
| VGT primary (control) | maximumHoldDays | 6 → 0.83 | 7 → 0.92 | 9 → 0.85 | 10 → 0.84 |
| VGT primary (control) | tickWindowSize | 59 → 0.92 | 67 → 1.00 | 81 → 0.99 | 89 → 0.95 |
| VGT primary (control) | intradayLossBuffer | 19 → 0.98 | 24 → 1.00 | 34 → 1.00 | 39 → 1.00 |
| VGT primary (control) | pullback | 80 → 0.89 | 85 → 0.99 | 95 → 0.88 | 100 → 0.80 |
| VGT primary (control) | continuationWindow | 48 → 0.85 | 54 → 0.85 | 66 → 1.00 | 72 → 1.00 |
| VGT research rep. (procedure-matched control) | targetPercentChange | 219 → 0.97 | 224 → 1.00 | 234 → 1.00 | 239 → 1.00 |
| VGT research rep. (procedure-matched control) | trailingBuyPercentage | 25 → 0.94 | 30 → 0.96 | 40 → 0.85 | 45 → 0.63 |
| VGT research rep. (procedure-matched control) | trailingStopPercentage | 68 → 0.41 | 73 → 0.75 | 83 → 0.95 | 88 → 1.00 |
| VGT research rep. (procedure-matched control) | maximumHoldDays | 6 → 0.86 | 7 → 0.98 | 9 → 0.90 | 10 → 0.92 |
| VGT research rep. (procedure-matched control) | tickWindowSize | 155 → 0.67 | 175 → 0.67 | 213 → 1.00 | 233 → 1.00 |
| VGT research rep. (procedure-matched control) | intradayLossBuffer | 24 → 1.00 | 29 → 1.00 | 39 → 1.00 | 44 → 1.00 |
| VGT research rep. (procedure-matched control) | pullback | 85 → 0.82 | 90 → 0.82 | 100 → 0.96 | 105 → 0.96 |
| VGT research rep. (procedure-matched control) | continuationWindow | 48 → 0.84 | 54 → 0.96 | 66 → 1.00 | 72 → 0.98 |
| XME:representative | targetPercentChange | 267 → 0.99 | 272 → 0.99 | 282 → 1.01 | 287 → 0.98 |
| XME:representative | trailingBuyPercentage | 2 → 0.76 | 4 → 0.81 | 6 → 0.99 | 8 → 0.25 |
| XME:representative | trailingStopPercentage | 65 → 0.28 | 70 → 0.56 | 80 → 0.81 | 85 → 0.67 |
| XME:representative | maximumHoldDays | 2 → 0.59† | 3 → 0.91 | 5 → 0.94 | 6 → 0.94 |
| XME:representative | tickWindowSize | 20 → 1.00 | 22 → 1.00 | 28 → 1.00 | 30 → 1.00 |
| XME:representative | intradayLossBuffer | 17 → 0.73 | 22 → 0.72 | 32 → 1.00 | 37 → 1.00 |
| XME:representative | pullback | 87 → 0.17 | 92 → 0.75 | 102 → 0.33 | 107 → 0.34 |
| XME:representative | continuationWindow | 154 → 1.00 | 174 → 1.00 | 212 → 1.00† | 232 → 1.00† |
| XME:alternative-1 | targetPercentChange | 224 → 0.94 | 229 → 0.98 | 239 → 0.77 | 244 → 0.77 |
| XME:alternative-1 | trailingBuyPercentage | 4 → 0.82 | 7 → 1.00 | 11 → 0.94 | 14 → 0.89 |
| XME:alternative-1 | trailingStopPercentage | 25 → 0.34† | 30 → 0.49 | 40 → 0.84 | 45 → 1.07 |
| XME:alternative-1 | maximumHoldDays | 10 → 0.49 | 12 → 0.58 | 14 → 0.64 | 16 → 0.45 |
| XME:alternative-1 | tickWindowSize | 140 → 0.85 | 157 → 0.89 | 193 → 0.96 | 210 → 0.85 |
| XME:alternative-1 | intradayLossBuffer | 0 → 0.96 | 1 → 1.00 | 3 → 1.00 | 4 → 1.00 |
| XME:alternative-1 | pullback | 132 → 0.89 | 137 → 0.90 | 147 → 0.98 | 152 → 0.92 |
| XME:alternative-1 | continuationWindow | 111 → 1.00 | 125 → 1.00 | 153 → 1.00 | 167 → 1.00 |
| GDX:representative | targetPercentChange | 268 → 0.90 | 273 → 0.96 | 283 → 0.87 | 288 → 0.85 |
| GDX:representative | trailingBuyPercentage | 5 → 0.92 | 8 → 0.88 | 14 → 0.89 | 17 → 0.82 |
| GDX:representative | trailingStopPercentage | 66 → 0.90 | 71 → 0.98 | 81 → 0.94 | 86 → 0.89 |
| GDX:representative | maximumHoldDays | truncated (1) | 2 → 0.79† | 4 → 0.96 | 5 → 0.97 |
| GDX:representative | tickWindowSize | 185 → 0.95 | 208 → 0.91 | 254 → 0.92† | 277 → 0.92† |
| GDX:representative | intradayLossBuffer | 12 → 0.99 | 17 → 0.98 | 27 → 0.99 | 32 → 0.99 |
| GDX:representative | pullback | 60 → 0.99 | 65 → 1.00 | 75 → 0.99 | 80 → 0.96 |
| GDX:representative | continuationWindow | 102 → 1.00 | 114 → 1.00 | 140 → 1.00 | 152 → 1.00 |
| GDX:alternative-1 | targetPercentChange | 268 → 0.96 | 273 → 0.95 | 283 → 0.87 | 288 → 0.87 |
| GDX:alternative-1 | trailingBuyPercentage | 5 → 0.92 | 8 → 0.94 | 14 → 0.99 | 17 → 0.86 |
| GDX:alternative-1 | trailingStopPercentage | 66 → 0.86 | 71 → 0.92 | 81 → 0.94 | 86 → 0.88 |
| GDX:alternative-1 | maximumHoldDays | truncated (1) | 2 → 0.73† | 4 → 0.95 | 5 → 1.01 |
| GDX:alternative-1 | tickWindowSize | 165 → 0.80 | 185 → 0.98 | 227 → 1.07 | 247 → 1.06 |
| GDX:alternative-1 | intradayLossBuffer | 3 → 0.98 | 5 → 1.00 | 9 → 1.00 | 11 → 1.00 |
| GDX:alternative-1 | pullback | 50 → 0.83 | 55 → 0.97 | 65 → 1.00 | 70 → 1.00 |
| GDX:alternative-1 | continuationWindow | 102 → 1.00 | 114 → 1.00 | 140 → 1.00 | 152 → 1.00 |
| KBE:representative | targetPercentChange | 245 → 0.92 | 250 → 0.92 | 260 → 0.99 | 265 → 0.99 |
| KBE:representative | trailingBuyPercentage | 22 → 0.67 | 27 → 1.09 | 37 → 0.86 | 42 → 0.85 |
| KBE:representative | trailingStopPercentage | 29 → 0.69† | 34 → 0.58 | 44 → 0.88 | 49 → 0.91 |
| KBE:representative | maximumHoldDays | 2 → 0.89† | 3 → 0.81 | 5 → 0.97 | 6 → 0.93 |
| KBE:representative | tickWindowSize | 166 → 0.79 | 187 → 0.99 | 229 → 1.00 | 250 → 0.96 |
| KBE:representative | intradayLossBuffer | 16 → 0.92 | 21 → 0.99 | 31 → 1.00 | 36 → 0.99 |
| KBE:representative | pullback | 36 → 0.73 | 41 → 0.75 | 51 → 1.00 | 56 → 0.98 |
| KBE:representative | continuationWindow | 150 → 1.00 | 168 → 1.00 | 206 → 1.00† | 224 → 1.00† |
| KBE:alternative-1 | targetPercentChange | 260 → 1.00 | 265 → 0.96 | 275 → 0.98 | 280 → 1.01 |
| KBE:alternative-1 | trailingBuyPercentage | truncated (0) | 1 → 1.03 | 3 → 0.89 | 4 → 0.93 |
| KBE:alternative-1 | trailingStopPercentage | 28 → 0.56† | 33 → 0.87 | 43 → 0.95 | 48 → 0.89 |
| KBE:alternative-1 | maximumHoldDays | 10 → 0.69 | 11 → 0.99 | 13 → 0.88 | 14 → 0.77 |
| KBE:alternative-1 | tickWindowSize | 164 → 0.46 | 184 → 0.80 | 226 → 1.00 | 246 → 0.79 |
| KBE:alternative-1 | intradayLossBuffer | 2 → 0.96 | 4 → 0.91 | 6 → 1.00 | 8 → 1.01 |
| KBE:alternative-1 | pullback | 71 → 0.85 | 76 → 0.89 | 86 → 0.94 | 91 → 0.77 |
| KBE:alternative-1 | continuationWindow | 42 → 0.79 | 47 → 0.79 | 57 → 1.00 | 62 → 1.00 |
| SLV:representative | targetPercentChange | 227 → 0.89 | 232 → 0.89 | 242 → 1.00 | 247 → 1.00 |
| SLV:representative | trailingBuyPercentage | 26 → 0.43 | 31 → 0.83 | 41 → 0.70 | 46 → 0.61 |
| SLV:representative | trailingStopPercentage | 22 → 0.62† | 27 → 0.99† | 37 → 0.76 | 42 → 0.65 |
| SLV:representative | maximumHoldDays | 19 → 0.52 | 22 → 0.55 | 26 → 0.93 | 29 → 0.94 |
| SLV:representative | tickWindowSize | 103 → 1.00 | 116 → 1.00 | 142 → 0.92 | 155 → 0.92 |
| SLV:representative | intradayLossBuffer | 2 → 1.00 | 4 → 1.00 | 6 → 1.00 | 8 → 1.00 |
| SLV:representative | pullback | 37 → 0.95 | 42 → 1.00 | 52 → 0.92 | 57 → 0.88 |
| SLV:representative | continuationWindow | 127 → 1.00 | 143 → 1.00 | 175 → 1.00 | 191 → 1.00 |
| FXI:representative | targetPercentChange | 252 → 0.80 | 257 → 0.80 | 267 → 1.00 | 272 → 0.76 |
| FXI:representative | trailingBuyPercentage | 5 → 0.89 | 8 → 0.87 | 14 → 0.98 | 17 → 0.94 |
| FXI:representative | trailingStopPercentage | 66 → 0.72 | 71 → 0.72 | 81 → 0.98 | 86 → 0.93 |
| FXI:representative | maximumHoldDays | 7 → 0.93 | 8 → 1.01 | 10 → 1.00 | 11 → 1.00 |
| FXI:representative | tickWindowSize | 46 → 0.87 | 52 → 0.88 | 64 → 0.77 | 70 → 0.73 |
| FXI:representative | intradayLossBuffer | 18 → 1.00 | 23 → 1.00 | 33 → 1.00 | 38 → 1.00 |
| FXI:representative | pullback | 153 → 0.96 | 158 → 0.96 | 168 → 0.99 | 173 → 0.97 |
| FXI:representative | continuationWindow | 119 → 1.00 | 134 → 1.00 | 164 → 1.00 | 179 → 0.99 |
| FXI:alternative-1 | targetPercentChange | 256 → 0.73 | 261 → 0.98 | 271 → 0.63 | 276 → 0.52 |
| FXI:alternative-1 | trailingBuyPercentage | 3 → 1.02 | 5 → 1.01 | 9 → 1.03 | 11 → 1.01 |
| FXI:alternative-1 | trailingStopPercentage | 67 → 0.63 | 72 → 0.75 | 82 → 0.97 | 87 → 0.93 |
| FXI:alternative-1 | maximumHoldDays | 14 → 0.99 | 16 → 0.96 | 20 → 0.97 | 22 → 0.99 |
| FXI:alternative-1 | tickWindowSize | 46 → 0.87 | 52 → 0.87 | 64 → 0.49 | 70 → 0.70 |
| FXI:alternative-1 | intradayLossBuffer | 20 → 1.00 | 25 → 1.00 | 35 → 1.00 | 40 → 1.00 |
| FXI:alternative-1 | pullback | 91 → 0.97 | 96 → 0.99 | 106 → 1.00 | 111 → 0.92 |
| FXI:alternative-1 | continuationWindow | 121 → 1.00 | 136 → 1.00 | 166 → 1.00 | 181 → 1.00 |
| IJH:representative | targetPercentChange | 226 → 0.71 | 231 → 0.74 | 241 → 0.34 | 246 → 0.34 |
| IJH:representative | trailingBuyPercentage | 2 → 0.94 | 4 → 0.99 | 6 → 0.99 | 8 → 0.96 |
| IJH:representative | trailingStopPercentage | 21 → 0.85† | 26 → 0.97† | 36 → 0.74 | 41 → 0.62 |
| IJH:representative | maximumHoldDays | 9 → 0.95 | 10 → 0.95 | 12 → 0.96 | 13 → 0.96 |
| IJH:representative | tickWindowSize | 132 → 0.83 | 148 → 0.82 | 182 → 1.00 | 198 → 1.05 |
| IJH:representative | intradayLossBuffer | 14 → 1.00 | 19 → 1.00 | 29 → 1.00 | 34 → 1.00 |
| IJH:representative | pullback | 61 → 0.71 | 66 → 0.93 | 76 → 0.97 | 81 → 0.91 |
| IJH:representative | continuationWindow | 83 → 0.90 | 94 → 0.90 | 114 → 1.00 | 125 → 1.00 |
| IJH:alternative-1 | targetPercentChange | 131 → 0.74 | 136 → 0.87 | 146 → 0.97 | 151 → 0.86 |
| IJH:alternative-1 | trailingBuyPercentage | 2 → 0.92 | 3 → 0.96 | 5 → 0.94 | 6 → 0.99 |
| IJH:alternative-1 | trailingStopPercentage | 28 → 1.01† | 33 → 0.90 | 43 → 0.83 | 48 → 0.81 |
| IJH:alternative-1 | maximumHoldDays | 3 → 0.47 | 4 → 0.51 | 6 → 0.54 | 7 → 0.43 |
| IJH:alternative-1 | tickWindowSize | 127 → 0.88 | 143 → 0.89 | 175 → 0.88 | 191 → 0.98 |
| IJH:alternative-1 | intradayLossBuffer | 11 → 0.93 | 16 → 1.00 | 26 → 1.00 | 31 → 1.00 |
| IJH:alternative-1 | pullback | 131 → 1.00 | 136 → 1.00 | 146 → 1.00 | 151 → 1.00 |
| IJH:alternative-1 | continuationWindow | 16 → 1.00 | 18 → 1.00 | 22 → 1.00 | 24 → 1.00 |
| XLB:representative | targetPercentChange | 243 → 0.94 | 248 → 0.95 | 258 → 1.00 | 263 → 1.01 |
| XLB:representative | trailingBuyPercentage | 2 → 0.75 | 4 → 0.70 | 6 → 0.99 | 8 → 0.93 |
| XLB:representative | trailingStopPercentage | 27 → 0.43† | 32 → 0.88 | 42 → 0.64 | 47 → 0.61 |
| XLB:representative | maximumHoldDays | 20 → 0.97 | 22 → 0.97 | 28 → 1.00 | 30 → 0.99 |
| XLB:representative | tickWindowSize | 102 → 0.85 | 114 → 1.00 | 140 → 1.00 | 152 → 1.00 |
| XLB:representative | intradayLossBuffer | 12 → 0.95 | 17 → 0.95 | 27 → 1.00 | 32 → 1.00 |
| XLB:representative | pullback | 31 → 0.80 | 36 → 0.93 | 46 → 0.92 | 51 → 0.84 |
| XLB:representative | continuationWindow | 34 → 1.00 | 38 → 1.00 | 46 → 1.00 | 50 → 1.00 |
| MTUM:representative | targetPercentChange | 195 → 0.73 | 200 → 0.78 | 210 → 0.91 | 215 → 0.96 |
| MTUM:representative | trailingBuyPercentage | 4 → 0.95 | 7 → 1.03 | 11 → 0.98 | 14 → 0.89 |
| MTUM:representative | trailingStopPercentage | 27 → 0.66† | 32 → 0.35 | 42 → 0.92 | 47 → 0.84 |
| MTUM:representative | maximumHoldDays | 22 → 0.98 | 24 → 0.98 | 30 → 0.99 | 32 → 0.98† |
| MTUM:representative | tickWindowSize | 60 → 0.59 | 67 → 0.67 | 83 → 0.93 | 90 → 0.92 |
| MTUM:representative | intradayLossBuffer | 7 → 1.00 | 10 → 1.00 | 18 → 1.00 | 21 → 1.00 |
| MTUM:representative | pullback | 115 → 0.98 | 120 → 0.98 | 130 → 0.91 | 135 → 0.91 |
| MTUM:representative | continuationWindow | 130 → 0.90 | 146 → 1.00 | 178 → 1.00 | 194 → 1.00 |
| MTUM:alternative-1 | targetPercentChange | 191 → 0.42 | 196 → 0.44 | 206 → 0.99 | 211 → 0.87 |
| MTUM:alternative-1 | trailingBuyPercentage | 5 → 0.59 | 7 → 0.69 | 13 → 0.82 | 15 → 0.82 |
| MTUM:alternative-1 | trailingStopPercentage | 29 → 0.46† | 34 → 0.09 | 44 → 0.94 | 49 → 0.74 |
| MTUM:alternative-1 | maximumHoldDays | 10 → 0.92 | 11 → 0.97 | 13 → 1.00 | 14 → 0.98 |
| MTUM:alternative-1 | tickWindowSize | 82 → 1.00 | 93 → 1.00 | 113 → 1.00 | 124 → 0.95 |
| MTUM:alternative-1 | intradayLossBuffer | 3 → 0.75 | 5 → 0.75 | 9 → 1.00 | 11 → 1.00 |
| MTUM:alternative-1 | pullback | 42 → 0.82 | 47 → 0.56 | 57 → 0.76 | 62 → 0.80 |
| MTUM:alternative-1 | continuationWindow | 154 → 1.00 | 173 → 1.00 | 211 → 1.00† | 230 → 1.00† |
| XHB:representative | targetPercentChange | 257 → 0.99 | 262 → 1.00 | 272 → 1.00 | 277 → 1.00 |
| XHB:representative | trailingBuyPercentage | 37 → 0.50 | 42 → 0.96 | 52 → 0.75† | 57 → 0.73† |
| XHB:representative | trailingStopPercentage | 57 → 0.60 | 62 → 0.80 | 72 → 0.93 | 77 → 0.85 |
| XHB:representative | maximumHoldDays | 22 → 0.84 | 25 → 0.69 | 31 → 0.84† | 34 → 0.91† |
| XHB:representative | tickWindowSize | 188 → 0.96 | 211 → 0.96 | 259 → 1.00† | 282 → 1.00† |
| XHB:representative | intradayLossBuffer | 6 → 1.00 | 10 → 1.00 | 16 → 1.00 | 20 → 1.00 |
| XHB:representative | pullback | 39 → 0.95 | 44 → 1.00 | 54 → 0.96 | 59 → 0.96 |
| XHB:representative | continuationWindow | 22 → 1.00 | 24 → 1.00 | 30 → 1.00 | 32 → 1.00 |
| EWW:representative | targetPercentChange | 181 → 0.83 | 186 → 0.89 | 196 → 0.90 | 201 → 0.78 |
| EWW:representative | trailingBuyPercentage | 6 → 0.67 | 10 → 0.82 | 16 → 0.78 | 20 → 0.75 |
| EWW:representative | trailingStopPercentage | 30 → 0.79 | 35 → 0.86 | 45 → 1.01 | 50 → 1.08 |
| EWW:representative | maximumHoldDays | 21 → 0.98 | 23 → 0.96 | 29 → 0.88 | 31 → 0.88† |
| EWW:representative | tickWindowSize | 142 → 0.79 | 160 → 1.00 | 196 → 0.96 | 214 → 0.86 |
| EWW:representative | intradayLossBuffer | 16 → 1.00 | 21 → 1.00 | 31 → 1.00 | 36 → 1.00 |
| EWW:representative | pullback | 143 → 0.87 | 148 → 1.00 | 158 → 1.00 | 163 → 1.00 |
| EWW:representative | continuationWindow | 150 → 1.00 | 168 → 1.00 | 206 → 1.00† | 224 → 0.88† |
| EWW:alternative-1 | targetPercentChange | 181 → 0.86 | 186 → 0.95 | 196 → 0.73 | 201 → 0.59 |
| EWW:alternative-1 | trailingBuyPercentage | 5 → 0.65 | 7 → 0.78 | 13 → 0.92 | 15 → 0.82 |
| EWW:alternative-1 | trailingStopPercentage | 20 → 0.56† | 25 → 0.98† | 35 → 0.77 | 40 → 0.94 |
| EWW:alternative-1 | maximumHoldDays | 19 → 0.95 | 22 → 0.93 | 26 → 0.86 | 29 → 0.93 |
| EWW:alternative-1 | tickWindowSize | 138 → 0.66 | 156 → 0.65 | 190 → 0.99 | 208 → 0.83 |
| EWW:alternative-1 | intradayLossBuffer | 16 → 1.00 | 21 → 1.00 | 31 → 1.00 | 36 → 1.00 |
| EWW:alternative-1 | pullback | 148 → 1.00 | 153 → 1.00 | 163 → 1.00 | 168 → 1.03 |
| EWW:alternative-1 | continuationWindow | 142 → 1.00 | 159 → 1.00 | 195 → 1.00 | 212 → 1.00† |
| EDV:representative | targetPercentChange | 197 → 0.50 | 202 → 0.82 | 212 → 0.94 | 217 → 0.57 |
| EDV:representative | trailingBuyPercentage | 28 → 1.11 | 33 → 1.02 | 43 → 0.91 | 48 → 0.87 |
| EDV:representative | trailingStopPercentage | 41 → 0.50 | 46 → 0.73 | 56 → 0.93 | 61 → 0.82 |
| EDV:representative | maximumHoldDays | 20 → 0.97 | 22 → 0.99 | 28 → 0.96 | 30 → 0.94 |
| EDV:representative | tickWindowSize | 33 → 0.65 | 37 → 1.02 | 45 → 0.94 | 49 → 0.72 |
| EDV:representative | intradayLossBuffer | 44 → 1.00 | 49 → 1.00 | 59 → 1.00 | truncated (64) |
| EDV:representative | pullback | 70 → 0.71 | 75 → 0.80 | 85 → 0.98 | 90 → 0.93 |
| EDV:representative | continuationWindow | 132 → 1.00 | 148 → 1.00 | 182 → 1.00 | 198 → 1.00 |
| EDV:alternative-1 | targetPercentChange | 223 → 0.31 | 228 → 0.41 | 238 → 0.72 | 243 → 0.72 |
| EDV:alternative-1 | trailingBuyPercentage | 13 → 0.53 | 18 → 0.51 | 28 → 0.84 | 33 → 0.49 |
| EDV:alternative-1 | trailingStopPercentage | 28 → 0.89† | 33 → 0.95 | 43 → 0.65 | 48 → 0.70 |
| EDV:alternative-1 | maximumHoldDays | 9 → 0.99 | 10 → 1.01 | 12 → 0.99 | 13 → 0.93 |
| EDV:alternative-1 | tickWindowSize | 79 → 0.68 | 89 → 0.72 | 109 → 0.61 | 119 → 0.15 |
| EDV:alternative-1 | intradayLossBuffer | 39 → 1.00 | 44 → 1.00 | 54 → 1.00 | 59 → 1.00 |
| EDV:alternative-1 | pullback | 109 → 0.91 | 114 → 0.99 | 124 → 0.96 | 129 → 0.95 |
| EDV:alternative-1 | continuationWindow | 142 → 1.00 | 159 → 1.00 | 195 → 1.00 | 212 → 1.00† |

## Findings

- **Every phenotype stays profitable in almost every neighbour.** The pooled 128-sample share with net > 0 is 97–100%
  everywhere except EDV alternative-1 (79%). Profitability alone does not separate the candidates; the size of the
  neighbourhood's profit, its drawdown and its capture of the base's events do.
- **Joint moves are much harsher than one-at-a-time moves.** OAT median retention is 0.89–0.98 for every phenotype,
  but the joint median retention falls to 0.25–0.74. A single parameter rarely matters; moving all eight together
  costs about half of the fitted net for most vectors.
- **GDX keeps the most in absolute dollars:** a joint median of $136,158 (representative) and $126,790 (alternative),
  P10 $107,647 and $93,096, worst sample above $64,000, against VGT primary's $71,174 median. But only 38% (representative) and 34%
  (alternative) of GDX's joint samples stay within the $35,000 minute-drawdown ceiling: **F10 (neighbourhood drawdown)
  is raised** for both. GDX's profit is broad; its drawdown control is a property of the exact vector.
- **XME's fitted net is a sharp peak:** $216,940 at the base, a joint median of $61,287 (retention 0.28; **F9**). Its
  alternative-1 keeps profit (99% positive) but only 16% of its samples stay within the drawdown ceiling (**F10**).
- **KBE, KBE alt, XHB, IJH alt and the procedure-matched VGT control also raise F10;** IJH (both phenotypes), XME (both),
  MTUM alt, EDV alt and the VGT control raise **F9** (retention < 50% or < 75% profitable).
- **EWW has the highest joint P10 in dollars of any phenotype without F9/F10** ($46,284; XLB and EWW alt keep a
  larger share of their own nets and stay within the drawdown ceiling more often): joint median $65,459 (retention 0.63), 100% profitable on both
  seeds, P10 $46,284 and worst $19,257, 88% of samples within the drawdown ceiling, median portfolio daily DD 33.9%.
  Its alternative-1 is similar (median $64,923, 98% within the ceiling).
- **VGT primary on this window:** joint median $71,174 (retention 0.53), 100% profitable, worst sample $856, 100% within
  the drawdown ceiling. On 2016–2026 the completed VGT audit reported about 70% median retention for its 8-D samples;
  on this shorter window the same kind of perturbation keeps a smaller share of VGT primary's net.
- **Seeds mostly agree,** but not always on the comparison with VGT primary: KBE's median-net axis is above VGT
  primary's on the pooled samples and seed 2 but below it on seed 1, and KBE alt, XME alt and IJH alt also differ by
  seed on one axis. The predeclared rule counts such an axis as **not met**, which is what the both-seeds requirement
  is for.

## B4/B5 (different property; full history; quoted, not blended)

The completed B4/B5 audit perturbed all pooled parameters at once (32 dimensions for B4, 40 for B5) on 2016-01-04 →
2026-10-13: every one of 128 samples per pool was profitable and the median kept **47%** of the frozen net (B4 seed 1;
B5 47% seed 1, 45% seed 2; `research/b4-b5-robustness-audit/PARAMETER_STABILITY.md`). That measures the fragility of a
whole pool's configuration; it is not comparable with an 8-D distribution and enters no comparison here.
