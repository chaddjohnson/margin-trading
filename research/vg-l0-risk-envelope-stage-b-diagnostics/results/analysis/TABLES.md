# RES-BD 1.0.0 — generated tables (tools/vg-l0-risk-envelope-stage-b-diagnostics/analyze.ts; zero-evaluation archive replays and the bounded CPU replays)

Generated 2026-11-23T07:51:56Z. Report-only; never official Stage B evidence. Cutoffs: C19.

## A1. Census replay and zero-evaluation evidence

| Cutoff | Archive rows | Lanes = sealed | Requested CTRL / EXP30 (replayed = sealed) | Lane archive hits | Neighbourhood reads | Fresh | Pool calls | Rows open → close | Original sha256 unchanged |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 1,120,604 | 64/64 yes | 571,767 / 596,373 | 1,168,140 | 1,025,280 | 0 | 0 | 1,120,604 → 1,120,604 | yes |

## A2. Centres visited (unique by canonical identity)

| Cutoff | Unique centres | Requested by CTRL only / EXP30 only / both | Error | Family unfunded | Net ≤ 0 | Scope (profitable, funded) | Scope by origin CTRL / EXP30 / both | Scope by highest stage (screen / r1 / refine / r2 / r3 / shortlist) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 98,339 | 40,133 / 41,812 / 16,394 | 0 | 19,266 | 6,478 | 72,595 | 32,781 / 33,923 / 5,891 | 4,168 / 50,763 / 16,819 / 383 / 270 / 192 |

## A3. Centre plausibility under both policies on the identical candidate set (scope)

P0 = !error ∧ net > 0 ∧ DD ≤ $35k ∧ both families funded; P3 = the same with DD ≤ $40k ∧ PL (liq.) ≤ $25k ∧ BD (liq.) ≤ $30k. **Centre plausibility is not qualification.**

**C19**

| Population | Centres | Both | P0 only | P3 only | Neither |
|---|---:|---:|---:|---:|---:|
| all (scope) | 72,595 | 66,314 | 284 | 2,256 | 3,741 |
| requested by CTRL only | 32,781 | 30,856 | 122 | 740 | 1,063 |
| requested by EXP30 only | 33,923 | 31,561 | 98 | 951 | 1,313 |
| requested by both | 5,891 | 3,897 | 64 | 565 | 1,365 |
| screen proposals (identical in both arms: pure eligibility) | 5,884 | 3,891 | 64 | 565 | 1,364 |
| post-screen centres requested by CTRL lanes | 34,398 | 32,375 | 126 | 769 | 1,128 |
| post-screen centres requested by EXP30 lanes | 35,538 | 32,975 | 100 | 1,085 | 1,378 |
| highest stage: screen | 4,168 | 2,377 | 60 | 431 | 1,300 |
| highest stage: rung 1 | 50,763 | 46,301 | 223 | 1,811 | 2,428 |
| highest stage: refinement | 16,819 | 16,792 | 1 | 13 | 13 |
| highest stage: rung 2 | 383 | 382 | 0 | 1 | 0 |
| highest stage: rung 3 / endpoint | 270 | 270 | 0 | 0 | 0 |
| highest stage: shortlist | 192 | 192 | 0 | 0 | 0 |

## A4. Limits, the ($35k, $40k] band and P0-pass-P3-fail (scope centres)

| Cutoff | DD > $35k | DD > $40k | PL > $25k | BD > $30k | Band centres | Band admitted by P3 | Band offset by PL / BD | P0 pass ∧ P3 fail (by BD / by PL) | P3 binding metric among P3 failures (DD / PL / BD) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 5,997 | 2,911 | 160 | 3,057 | 3,086 | 2,256 | 830 (PL 51, BD 787) | 284 (218 / 68) | 1,403 / 111 / 2,511 |

C19 P3 failing combinations (scope centres failing P3): markedDd+bankedDd 2,033; bankedDd 995; markedDd 837; principalLoss 109; markedDd+principalLoss 22; markedDd+principalLoss+bankedDd 19; principalLoss+bankedDd 10. Band by origin: CTRL 1021, EXP30 1259, both 806; screen 805; post-screen CTRL 1064 / EXP30 1407.

## A5. Centre net on the common population (centre plausibility, not qualified finalists)

| Cutoff | Population | n | median | p90 | p99 | max | top-10 mean |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | p0Plausible | 66,598 | $59,774 | $91,630 | $102,989 | $127,622 | $123,683 |
| C19 | p3Plausible | 68,570 | $58,910 | $91,447 | $102,989 | $127,622 | $123,683 |
| C19 | bothPlausible | 66,314 | $59,937 | $91,630 | $102,989 | $127,622 | $123,683 |
| C19 | p3OnlyPlausible | 2,256 | $35,516 | $62,646 | $76,908 | $99,804 | $87,376 |
| C19 | postScreenCTRL_p0 | 32,501 | $59,957 | $91,630 | $104,343 | $127,622 | $123,683 |
| C19 | postScreenEXP30_p0 | 33,075 | $61,570 | $91,894 | $101,699 | $111,862 | $109,851 |
| C19 | postScreenEXP30_p3 | 34,060 | $60,889 | $91,780 | $101,493 | $111,862 | $109,851 |

| Cutoff | Finalists (192 searched members): both / P0 only / P3 only / neither | by origin CTRL | by origin EXP30 | best qualified centre net P0 / P3 |
|---|---:|---:|---:|---:|
| C19 | 183 / 0 / 6 / 3 | 96: 94 / 0 / 1 / 1 | 96: 89 / 0 / 5 / 2 | $127,622 / $127,622 |

## A6. Rung fits under both policies (centre + measured neighbourhood p90 gates; frozen violationArm)

| Cutoff | Rung (draws) | Measured fits | Fitted by CTRL / EXP30 / both | Feasible both | CTRL only | EXP30 only | Neither | EXP30-only: CTRL failing parts | EXP30-only with p90 DD in ($35k, $40k] | EXP30 infeasible: failing parts |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | r1 (16) | 48,271 | 22719 / 24139 / 1413 | 37,026 | 465 | 4,439 | 6,341 | p90 4371, dd 445 | 4,371 | p90 4714, p90bd 5323, p90pl 172, bd 88, pl 39 |
| C19 | r2 (64) | 767 | 383 / 383 / 1 | 719 | 1 | 27 | 20 | p90 27 | 27 | p90 14, p90bd 18 |
| C19 | r3 (128) | 462 | 232 / 230 / 0 | 444 | 0 | 14 | 4 | p90 14 | 14 | p90 3, p90bd 2 |
| C19 | refine (16) | 9,045 | 4508 / 4537 / 0 | 8,672 | 0 | 60 | 313 | dd 2, p90 59 | 59 | p90bd 304, p90 297, p90pl 1 |

## A7. Zero-evaluation giveback bound on centres: max(0, DD − BD_marked) ÷ DD ≤ U ÷ DD

| Cutoff | Population | n | mean bound share | median | provably giveback-dominated (bound ≥ ½ DD) |
|---|---:|---:|---:|---:|---:|
| C19 | all scope | 72,595 | 59.7 % | 62.3 % | 47,218 (65.0 %) |
| C19 | plausible under both | 66,314 | 62.4 % | 65.3 % | 46,175 (69.6 %) |
| C19 | P3-only plausible | 2,256 | 45.5 % | 41.6 % | 746 (33.1 %) |
| C19 | DD in ($35k, $40k] | 3,086 | 36.9 % | 35.2 % | 746 (24.2 %) |

## A8. Representatives’ confirmation draws (zero evaluations; 3 × 128 per representative, sealed draws)

| Cutoff | Arm | Draws | > $35k DD | of which bound ≥ ½ DD | mean bound share among > $35k | mean BD_marked among > $35k | mean PL (liq.) among > $35k | BD (liq.) > $30k | PL (liq.) > $25k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | CTRL | 12,288 | 213 (1.7 %) | 42 (19.7 %) | 26.5 % | $30,579 | $14,027 | 154 | 0 |
| C19 | EXP30 | 12,288 | 434 (3.5 %) | 139 (32.0 %) | 35.7 % | $29,137 | $12,989 | 185 | 0 |

## B1. Parity of the CPU replays

| Cutoff | Subjects | To the cent (net, DD, 4 envelope values) | Bit for bit (canonical record + envelope) |
|---|---:|---:|---:|
| C19 | 67 | true | true |

## B2. Paired representatives (EXP-30 − CTRL; 32 pairs; stratified paired bootstrap, B = 100,000; 80 % interval)

| Cutoff | Metric | CTRL mean | EXP-30 mean | Mean diff | 80 % interval | Diff > 0 / < 0 | CTRL median | EXP-30 median |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | net | $97,030 | $96,280 | −$750 | −$2,757 … +$1,245 | 14 / 18 | $95,840 | $94,989 |
| C19 | dd | $21,020 | $22,888 | +$1,868 | +$510 … +$3,199 | 22 / 10 | $19,945 | $22,957 |
| C19 | ddLiquidation | $20,992 | $22,860 | +$1,869 | +$508 … +$3,193 | 22 / 10 | $19,927 | $22,924 |
| C19 | unbankedGiveback | $19,558 | $21,276 | +$1,717 | +$44 … +$3,384 | 18 / 14 | $19,042 | $21,063 |
| C19 | bankedErosion | $1,461 | $1,612 | +$151 | −$632 … +$939 | 10 / 7 | $0 | $0 |
| C19 | capitalLoss | $0 | $0 | $0 | $0 … $0 | 0 / 0 | $0 | $0 |
| C19 | erosionPlusCapitalLoss | $1,461 | $1,612 | +$151 | −$636 … +$940 | 10 / 7 | $0 | $0 |
| C19 | unbankedGivebackShare | 93.0 % | 93.1 % | 0.1 pp | -3.7 pp … 3.9 pp | 7 / 10 | 100.0 % | 100.0 % |
| C19 | givebackLowerBound | $16,482 | $18,534 | +$2,052 | +$135 … +$3,944 | 18 / 14 | $15,791 | $19,023 |
| C19 | lotProfitGiveback | $19,558 | $21,276 | +$1,717 | +$46 … +$3,376 | 18 / 14 | $19,042 | $21,063 |
| C19 | lotPrincipalLoss | $1,461 | $1,612 | +$151 | −$631 … +$943 | 10 / 7 | $0 | $0 |
| C19 | bankedDdMarked | $4,538 | $4,354 | −$184 | −$1,140 … +$770 | 15 / 16 | $4,641 | $3,756 |
| C19 | bankedDdLiquidation | $4,586 | $4,402 | −$184 | −$1,139 … +$781 | 15 / 16 | $4,690 | $3,805 |
| C19 | principalLossLiquidation | $4,098 | $3,951 | −$146 | −$1,014 … +$731 | 14 / 17 | $3,805 | $2,746 |
| C19 | maxTradeGivebackAboveBreakeven | $20,375 | $22,096 | +$1,720 | +$260 … +$3,174 | 19 / 13 | $19,042 | $21,965 |
| C19 | maxTradePeakProfit | $57,416 | $60,117 | +$2,700 | +$492 … +$4,894 | 19 / 11 | $58,670 | $59,326 |
| C19 | worstTradeNet | $6,959 | $3,896 | −$3,063 | −$7,664 … +$1,472 | 15 / 17 | −$312 | −$822 |
| C19 | windowGivebackClosedProfitable | $15,789 | $19,112 | +$3,323 | +$230 … +$6,409 | 19 / 12 | $19,042 | $21,063 |
| C19 | windowGivebackClosedLoss | $0 | $0 | $0 | $0 … $0 | 0 / 0 | $0 | $0 |
| C19 | windowPrincipalLossClosedLoss | $719 | $632 | −$87 | −$693 … +$526 | 4 / 4 | $0 | $0 |
| C19 | occupancy | 84.3 % | 83.7 % | -0.6 pp | -2.2 pp … 1.0 pp | 17 / 15 | 84.4 % | 83.9 % |
| C19 | lots | 6.3 | 6.7 | 0.4 | -0.8 … 1.6 | 14 / 14 | 5.5 | 5.0 |
| C19 | liq.unbankedGiveback | $19,517 | $21,228 | +$1,712 | +$38 … +$3,372 | 18 / 14 | $19,022 | $20,982 |
| C19 | liq.bankedErosion | $1,475 | $1,632 | +$157 | −$633 … +$956 | 10 / 7 | $0 | $0 |
| C19 | liq.capitalLoss | $0 | $0 | $0 | $0 … $0 | 0 / 0 | $0 | $0 |

## B3. Arm-level decomposition of the representatives’ maximum drawdowns (shares of the summed DD; giveback-dominated = U ≥ ½ DD)

| Cutoff | Arm | Summed DD | U share | E share | F share | Giveback-dominated | F > 0 | Bound U ≥ DD − BD holds |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | CTRL | $672,638 | 93.0 % | 7.0 % | 0.0 % | 32 / 32 | 0 / 32 | 32 / 32 |
| C19 | EXP30 | $732,407 | 93.0 % | 7.0 % | 0.0 % | 32 / 32 | 0 / 32 | 32 / 32 |

## B4. Identity of the mean paired DD increase (arm-level magnitudes of different episodes, not one shared episode)

| Cutoff | Mean ΔDD | Mean ΔU | Mean ΔE | Mean ΔF | Residual |
|---|---:|---:|---:|---:|---:|
| C19 | +$1,868 | +$1,717 | +$151 | $0 | -4.55e-13 |

## B5. EXP-30 representatives that P0 would reject (sealed verdicts) versus the other pairs

| Cutoff | Subset | Pairs | EXP-30 mean DD | EXP-30 U / E / F shares | EXP-30 giveback-dominated | CTRL mean DD | CTRL U / E / F shares | Mean ΔDD | Mean ΔU / ΔE / ΔF | Mean Δnet |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | EXP-30 rep. rejected by P0 | 2 | $24,187 | 91 % / 9 % / 0 % | 2 / 2 | $18,755 | 100 % / 0 % / 0 % | +$5,431 | +$3,188 / +$2,244 / $0 | +$1,644 |
| C19 | other pairs | 30 | $22,801 | 93 % / 7 % / 0 % | 30 / 30 | $21,171 | 93 % / 7 % / 0 % | +$1,630 | +$1,619 / +$11 / $0 | −$909 |

## B6. Winning versus losing positions inside the maximum-DD windows (lot lens; sums over the 32 representatives)

| Cutoff | Arm | Window giveback, lots closed profitable | closed at a loss | open at the door end | Window principal loss, lots closed at a loss | Trades with giveback: ended profitable / at a loss | Losing trades | Lots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | CTRL | $505,242 | $0 | $120,630 | $22,995 | 114 / 57 | 57 | 203 |
| C19 | EXP30 | $611,588 | $0 | $69,232 | $20,216 | 135 / 47 | 49 | 215 |

## B7. Benchmarks (descriptive frozen references; never selectable)

| Cutoff | Benchmark | Net | DD | U / E / F | Giveback-dominated | BD (liq.) | PL (liq.) | Window |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | benchmark: New L0 | $79,970 | $10,633 | $10,472 / $161 / $0 | true | $3,687 | $3,687 | 2019-05-01 → 2019-10-23 |
| C19 | benchmark: N/original | $80,437 | $10,691 | $10,530 / $161 / $0 | true | $3,929 | $3,929 | 2019-05-01 → 2019-10-23 |

## B8. Episode illustrations (each arm’s own maximum-DD window; side by side, never subtracted)

- **C19 CTRL pooled P0 primary: CTRL C19/broad/GA0.VA0/R15#1 profit** — net $127,622, DD $18,217 = U $18,217 + E $0 + F $0; window 2018-01-26 → 2018-02-09 (net $89,305 → $71,088, banked high $61,192). Largest lots: G:VGT 2016-07-13→2018-11-19 (open at peak and trough; $44,168 → $25,951; giveback $18,217, below principal $0; lot net $31,134)
- **C19 EXP-30 pooled P0 primary: EXP30 C19/broad/GB0.VD1/R10#1 profit** — net $111,862, DD $17,149 = U $17,149 + E $0 + F $0; window 2019-05-01 → 2019-06-03 (net $101,114 → $83,965, banked high $70,600). Largest lots: D1:VGT 2018-12-26→open (open at peak and trough; $30,513 → $13,364; giveback $17,149, below principal $0; lot net $41,261)
- **C19 largest paired ΔDD (GB0.VD1 R9) CTRL: CTRL C19/broad/GB0.VD1/R9#1 profit** — net $96,376, DD $17,344 = U $17,344 + E $0 + F $0; window 2019-05-01 → 2019-06-03 (net $85,409 → $68,065, banked high $53,270). Largest lots: D1:VGT 2018-12-26→open (open at peak and trough; $32,139 → $14,794; giveback $17,344, below principal $0; lot net $43,106)
- **C19 largest paired ΔDD (GB0.VD1 R9) EXP-30: EXP30 C19/broad/GB0.VD1/R9#1 profit** — net $100,984, DD $26,866 = U $26,866 + E $0 + F $0; window 2018-10-03 → 2018-10-29 (net $59,326 → $32,460, banked high $3,366). Largest lots: G:VGT 2016-07-13→2018-11-02 (open at peak and trough; $59,326 → $32,460; giveback $26,866, below principal $0; lot net $41,532)

