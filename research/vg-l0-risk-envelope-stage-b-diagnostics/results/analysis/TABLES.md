# RES-BD 1.0.0 — generated tables (tools/vg-l0-risk-envelope-stage-b-diagnostics/analyze.ts; zero-evaluation archive replays and the bounded CPU replays)

Generated 2026-11-23T08:06:59Z. Report-only; never official Stage B evidence. Cutoffs: C19, C21, C24.

## A1. Census replay and zero-evaluation evidence

| Cutoff | Archive rows | Lanes = sealed | Requested CTRL / EXP30 (replayed = sealed) | Lane archive hits | Neighbourhood reads | Fresh | Pool calls | Rows open → close | Original sha256 unchanged |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 1,120,604 | 64/64 yes | 571,767 / 596,373 | 1,168,140 | 1,025,280 | 0 | 0 | 1,120,604 → 1,120,604 | yes |
| C21 | 1,142,375 | 64/64 yes | 602,894 / 581,227 | 1,184,121 | 1,047,200 | 0 | 0 | 1,142,375 → 1,142,375 | yes |
| C24 | 948,677 | 64/64 yes | 458,526 / 518,904 | 977,430 | 845,344 | 0 | 0 | 948,677 → 948,677 | yes |

## A2. Centres visited (unique by canonical identity)

| Cutoff | Unique centres | Requested by CTRL only / EXP30 only / both | Error | Family unfunded | Net ≤ 0 | Scope (profitable, funded) | Scope by origin CTRL / EXP30 / both | Scope by highest stage (screen / r1 / refine / r2 / r3 / shortlist) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 98,339 | 40,133 / 41,812 / 16,394 | 0 | 19,266 | 6,478 | 72,595 | 32,781 / 33,923 / 5,891 | 4,168 / 50,763 / 16,819 / 383 / 270 / 192 |
| C21 | 97,779 | 41,912 / 39,478 / 16,389 | 0 | 12,960 | 1,951 | 82,868 | 38,152 / 35,899 / 8,817 | 6,739 / 58,738 / 16,496 / 384 / 319 / 192 |
| C24 | 106,318 | 43,620 / 46,304 / 16,394 | 0 | 13,612 | 4,329 | 88,377 | 38,636 / 40,935 / 8,806 | 7,187 / 63,979 / 16,319 / 384 / 316 / 192 |

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

**C21**

| Population | Centres | Both | P0 only | P3 only | Neither |
|---|---:|---:|---:|---:|---:|
| all (scope) | 82,868 | 62,410 | 514 | 5,918 | 14,026 |
| requested by CTRL only | 38,152 | 32,253 | 277 | 1,927 | 3,695 |
| requested by EXP30 only | 35,899 | 28,494 | 194 | 3,128 | 4,083 |
| requested by both | 8,817 | 1,663 | 43 | 863 | 6,248 |
| screen proposals (identical in both arms: pure eligibility) | 8,812 | 1,659 | 43 | 863 | 6,247 |
| post-screen centres requested by CTRL lanes | 39,883 | 33,643 | 305 | 1,967 | 3,968 |
| post-screen centres requested by EXP30 lanes | 37,634 | 29,573 | 198 | 3,508 | 4,355 |
| highest stage: screen | 6,739 | 272 | 15 | 482 | 5,970 |
| highest stage: rung 1 | 58,738 | 45,253 | 496 | 4,965 | 8,024 |
| highest stage: refinement | 16,496 | 16,011 | 3 | 450 | 32 |
| highest stage: rung 2 | 384 | 376 | 0 | 8 | 0 |
| highest stage: rung 3 / endpoint | 319 | 312 | 0 | 7 | 0 |
| highest stage: shortlist | 192 | 186 | 0 | 6 | 0 |

**C24**

| Population | Centres | Both | P0 only | P3 only | Neither |
|---|---:|---:|---:|---:|---:|
| all (scope) | 88,377 | 47,285 | 375 | 7,534 | 33,183 |
| requested by CTRL only | 38,636 | 24,031 | 221 | 2,593 | 11,791 |
| requested by EXP30 only | 40,935 | 23,012 | 146 | 4,786 | 12,991 |
| requested by both | 8,806 | 242 | 8 | 155 | 8,401 |
| screen proposals (identical in both arms: pure eligibility) | 8,797 | 236 | 8 | 154 | 8,399 |
| post-screen centres requested by CTRL lanes | 40,050 | 24,273 | 229 | 2,748 | 12,800 |
| post-screen centres requested by EXP30 lanes | 42,405 | 23,254 | 154 | 4,941 | 14,056 |
| highest stage: screen | 7,187 | 0 | 0 | 0 | 7,187 |
| highest stage: rung 1 | 63,979 | 31,142 | 372 | 6,525 | 25,940 |
| highest stage: refinement | 16,319 | 15,297 | 3 | 963 | 56 |
| highest stage: rung 2 | 384 | 366 | 0 | 18 | 0 |
| highest stage: rung 3 / endpoint | 316 | 297 | 0 | 19 | 0 |
| highest stage: shortlist | 192 | 183 | 0 | 9 | 0 |

## A4. Limits, the ($35k, $40k] band and P0-pass-P3-fail (scope centres)

| Cutoff | DD > $35k | DD > $40k | PL > $25k | BD > $30k | Band centres | Band admitted by P3 | Band offset by PL / BD | P0 pass ∧ P3 fail (by BD / by PL) | P3 binding metric among P3 failures (DD / PL / BD) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 5,997 | 2,911 | 160 | 3,057 | 3,086 | 2,256 | 830 (PL 51, BD 787) | 284 (218 / 68) | 1,403 / 111 / 2,511 |
| C21 | 19,944 | 11,818 | 4,002 | 9,984 | 8,126 | 5,918 | 2,208 (PL 935, BD 1685) | 514 (301 / 222) | 6,213 / 2,124 / 6,203 |
| C24 | 40,717 | 30,291 | 6,091 | 28,980 | 10,426 | 7,534 | 2,892 (PL 440, BD 2618) | 375 (262 / 121) | 10,847 / 2,729 / 19,982 |

C19 P3 failing combinations (scope centres failing P3): markedDd+bankedDd 2,033; bankedDd 995; markedDd 837; principalLoss 109; markedDd+principalLoss 22; markedDd+principalLoss+bankedDd 19; principalLoss+bankedDd 10. Band by origin: CTRL 1021, EXP30 1259, both 806; screen 805; post-screen CTRL 1064 / EXP30 1407.

C21 P3 failing combinations (scope centres failing P3): markedDd+bankedDd 5,679; markedDd 3,294; markedDd+principalLoss+bankedDd 2,319; bankedDd 1,565; principalLoss 736; markedDd+principalLoss 526; principalLoss+bankedDd 421. Band by origin: CTRL 2833, EXP30 3986, both 1307; screen 1306; post-screen CTRL 2886 / EXP30 4380.

C24 P3 failing combinations (scope centres failing P3): markedDd+bankedDd 20,910; markedDd+principalLoss+bankedDd 5,190; markedDd 3,851; bankedDd 2,706; principalLoss 387; markedDd+principalLoss 340; principalLoss+bankedDd 174. Band by origin: CTRL 4134, EXP30 5998, both 294; screen 292; post-screen CTRL 4428 / EXP30 6269.

## A5. Centre net on the common population (centre plausibility, not qualified finalists)

| Cutoff | Population | n | median | p90 | p99 | max | top-10 mean |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | p0Plausible | 66,598 | $59,774 | $91,630 | $102,989 | $127,622 | $123,683 |
| C19 | p3Plausible | 68,570 | $58,910 | $91,447 | $102,989 | $127,622 | $123,683 |
| C19 | bothPlausible | 66,314 | $59,937 | $91,630 | $102,989 | $127,622 | $123,683 |
| C19 | p3OnlyPlausible | 2,256 | $35,516 | $62,646 | $76,908 | $99,804 | $87,376 |
| C19 | p0PassP3Fail | 284 | $18,384 | $37,182 | $52,823 | $57,304 | $51,872 |
| C19 | bandAdmittedByP3 | 2,256 | $35,516 | $62,646 | $76,908 | $99,804 | $87,376 |
| C19 | bandOffsetByPlOrBd | 830 | $14,767 | $35,325 | $60,581 | $81,536 | $68,251 |
| C19 | postScreenCTRL_p0 | 32,501 | $59,957 | $91,630 | $104,343 | $127,622 | $123,683 |
| C19 | postScreenEXP30_p0 | 33,075 | $61,570 | $91,894 | $101,699 | $111,862 | $109,851 |
| C19 | postScreenEXP30_p3 | 34,060 | $60,889 | $91,780 | $101,493 | $111,862 | $109,851 |
| C21 | p0Plausible | 62,924 | $128,824 | $196,549 | $220,393 | $247,284 | $235,998 |
| C21 | p3Plausible | 68,328 | $126,699 | $196,088 | $220,366 | $247,284 | $235,998 |
| C21 | bothPlausible | 62,410 | $129,273 | $196,598 | $220,393 | $247,284 | $235,998 |
| C21 | p3OnlyPlausible | 5,918 | $101,142 | $167,185 | $201,792 | $228,007 | $211,825 |
| C21 | p0PassP3Fail | 514 | $81,477 | $134,591 | $171,241 | $191,329 | $175,454 |
| C21 | bandAdmittedByP3 | 5,918 | $101,142 | $167,185 | $201,792 | $228,007 | $211,825 |
| C21 | bandOffsetByPlOrBd | 2,208 | $64,717 | $113,261 | $155,008 | $189,233 | $177,863 |
| C21 | postScreenCTRL_p0 | 33,948 | $124,980 | $190,114 | $219,818 | $231,149 | $227,442 |
| C21 | postScreenEXP30_p0 | 29,771 | $133,180 | $200,673 | $224,590 | $247,284 | $235,998 |
| C21 | postScreenEXP30_p3 | 33,081 | $131,219 | $200,000 | $224,590 | $247,284 | $235,998 |
| C24 | p0Plausible | 47,660 | $112,316 | $173,618 | $214,734 | $248,578 | $240,032 |
| C24 | p3Plausible | 54,819 | $109,543 | $172,759 | $211,836 | $248,578 | $240,032 |
| C24 | bothPlausible | 47,285 | $112,766 | $173,618 | $214,734 | $248,578 | $240,032 |
| C24 | p3OnlyPlausible | 7,534 | $92,956 | $163,081 | $192,159 | $224,752 | $218,241 |
| C24 | p0PassP3Fail | 375 | $62,686 | $116,055 | $164,082 | $179,025 | $163,281 |
| C24 | bandAdmittedByP3 | 7,534 | $92,956 | $163,081 | $192,159 | $224,752 | $218,241 |
| C24 | bandOffsetByPlOrBd | 2,892 | $69,566 | $126,233 | $168,293 | $213,839 | $198,321 |
| C24 | postScreenCTRL_p0 | 24,502 | $110,175 | $166,283 | $198,550 | $244,632 | $225,275 |
| C24 | postScreenEXP30_p0 | 23,408 | $114,103 | $180,002 | $218,729 | $248,578 | $238,913 |
| C24 | postScreenEXP30_p3 | 28,195 | $111,634 | $178,243 | $218,188 | $248,578 | $238,913 |

| Cutoff | Finalists (192 searched members): both / P0 only / P3 only / neither | by origin CTRL | by origin EXP30 | best qualified centre net P0 / P3 |
|---|---:|---:|---:|---:|
| C19 | 183 / 0 / 6 / 3 | 96: 94 / 0 / 1 / 1 | 96: 89 / 0 / 5 / 2 | $127,622 / $127,622 |
| C21 | 160 / 0 / 30 / 2 | 96: 94 / 0 / 2 / 0 | 96: 66 / 0 / 28 / 2 | $247,284 / $247,284 |
| C24 | 152 / 0 / 36 / 4 | 96: 96 / 0 / 0 / 0 | 96: 56 / 0 / 36 / 4 | $248,578 / $248,578 |

## A6. Rung fits under both policies (centre + measured neighbourhood p90 gates; frozen violationArm)

| Cutoff | Rung (draws) | Measured fits | Fitted by CTRL / EXP30 / both | Feasible both | CTRL only | EXP30 only | Neither | EXP30-only: CTRL failing parts | EXP30-only with p90 DD in ($35k, $40k] | EXP30 infeasible: failing parts |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | r1 (16) | 48,271 | 22719 / 24139 / 1413 | 37,026 | 465 | 4,439 | 6,341 | p90 4371, dd 445 | 4,371 | p90 4714, p90bd 5323, p90pl 172, bd 88, pl 39 |
| C19 | r2 (64) | 767 | 383 / 383 / 1 | 719 | 1 | 27 | 20 | p90 27 | 27 | p90 14, p90bd 18 |
| C19 | r3 (128) | 462 | 232 / 230 / 0 | 444 | 0 | 14 | 4 | p90 14 | 14 | p90 3, p90bd 2 |
| C19 | refine (16) | 9,045 | 4508 / 4537 / 0 | 8,672 | 0 | 60 | 313 | dd 2, p90 59 | 59 | p90bd 304, p90 297, p90pl 1 |
| C21 | r1 (16) | 49,378 | 24517 / 23783 / 1078 | 31,605 | 526 | 7,046 | 10,201 | p90 6954, dd 1177 | 6,954 | p90 7503, p90pl 2104, p90bd 7516, bd 180, pl 132 |
| C21 | r2 (64) | 768 | 384 / 384 / 0 | 641 | 3 | 102 | 22 | p90 101, dd 17 | 101 | p90 14, p90bd 6, p90pl 8 |
| C21 | r3 (128) | 511 | 255 / 256 / 0 | 428 | 1 | 77 | 5 | p90 76, dd 12 | 76 | p90 4, p90pl 1, p90bd 1 |
| C21 | refine (16) | 8,912 | 4694 / 4218 / 0 | 7,980 | 1 | 879 | 52 | p90 876, dd 161 | 876 | p90 49, p90pl 12, p90bd 8 |
| C24 | r1 (16) | 36,083 | 16000 / 19841 / 242 | 11,756 | 144 | 5,836 | 18,347 | p90 5768, dd 596 | 5,767 | p90 15654, p90bd 15834, p90pl 2232, bd 161, pl 70 |
| C24 | r2 (64) | 768 | 384 / 384 / 0 | 493 | 3 | 178 | 94 | p90 178, dd 28 | 178 | p90 57, p90bd 68, p90pl 7 |
| C24 | r3 (128) | 508 | 255 / 253 / 0 | 368 | 0 | 115 | 25 | p90 115, dd 22 | 115 | p90 17, p90pl 3, p90bd 13 |
| C24 | refine (16) | 9,615 | 4917 / 4698 / 0 | 7,156 | 5 | 1,555 | 899 | dd 566, p90 1551 | 1,551 | p90bd 408, p90 566, p90pl 123, pl 2 |

## A7. Zero-evaluation giveback bound on centres: max(0, DD − BD_marked) ÷ DD ≤ U ÷ DD

| Cutoff | Population | n | mean bound share | median | provably giveback-dominated (bound ≥ ½ DD) |
|---|---:|---:|---:|---:|---:|
| C19 | all scope | 72,595 | 59.7 % | 62.3 % | 47,218 (65.0 %) |
| C19 | plausible under both | 66,314 | 62.4 % | 65.3 % | 46,175 (69.6 %) |
| C19 | P3-only plausible | 2,256 | 45.5 % | 41.6 % | 746 (33.1 %) |
| C19 | DD in ($35k, $40k] | 3,086 | 36.9 % | 35.2 % | 746 (24.2 %) |
| C21 | all scope | 82,868 | 41.5 % | 38.7 % | 28,433 (34.3 %) |
| C21 | plausible under both | 62,410 | 45.2 % | 44.2 % | 26,106 (41.8 %) |
| C21 | P3-only plausible | 5,918 | 40.5 % | 37.6 % | 1,221 (20.6 %) |
| C21 | DD in ($35k, $40k] | 8,126 | 34.1 % | 33.4 % | 1,221 (15.0 %) |
| C24 | all scope | 88,377 | 31.5 % | 29.2 % | 11,814 (13.4 %) |
| C24 | plausible under both | 47,285 | 37.4 % | 35.8 % | 10,505 (22.2 %) |
| C24 | P3-only plausible | 7,534 | 35.7 % | 35.9 % | 727 (9.6 %) |
| C24 | DD in ($35k, $40k] | 10,426 | 30.2 % | 29.3 % | 727 (7.0 %) |

## A8. Representatives’ confirmation draws (zero evaluations; 3 × 128 per representative, sealed draws)

| Cutoff | Arm | Draws | > $35k DD | of which bound ≥ ½ DD | mean bound share among > $35k | mean BD_marked among > $35k | mean PL (liq.) among > $35k | BD (liq.) > $30k | PL (liq.) > $25k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | CTRL | 12,288 | 213 (1.7 %) | 42 (19.7 %) | 26.5 % | $30,579 | $14,027 | 154 | 0 |
| C19 | EXP30 | 12,288 | 434 (3.5 %) | 139 (32.0 %) | 35.7 % | $29,137 | $12,989 | 185 | 0 |
| C21 | CTRL | 12,288 | 276 (2.2 %) | 47 (17.0 %) | 36.1 % | $25,484 | $16,403 | 98 | 42 |
| C21 | EXP30 | 12,288 | 1,085 (8.8 %) | 345 (31.8 %) | 46.9 % | $20,350 | $16,777 | 121 | 77 |
| C24 | CTRL | 12,288 | 403 (3.3 %) | 28 (6.9 %) | 27.8 % | $28,255 | $12,749 | 176 | 12 |
| C24 | EXP30 | 12,288 | 1,621 (13.2 %) | 160 (9.9 %) | 37.4 % | $24,393 | $16,994 | 219 | 46 |

## A9. Paired representatives’ confirmation families (EXP-30 − CTRL; 32 pairs; zero evaluations; stratified paired bootstrap, 80 % interval)

Quantiles do not add: the p90 of the bound and the p90 of BD are reported beside the p90 DD, not as its parts.

| Cutoff | Statistic | CTRL mean | EXP-30 mean | Mean diff | 80 % interval | Diff > 0 / < 0 |
|---|---:|---:|---:|---:|---:|---:|
| C19 | p90Dd | $26,468 | $28,654 | +$2,186 | +$612 … +$3,738 | 22 / 10 |
| C19 | p90GivebackLowerBound | $18,507 | $20,904 | +$2,397 | +$530 … +$4,255 | 21 / 11 |
| C19 | p90BdMarked | $13,106 | $13,637 | +$531 | −$1,456 … +$2,535 | 16 / 16 |
| C19 | p90PlLiq | $9,916 | $9,545 | −$371 | −$1,630 … +$912 | 14 / 18 |
| C19 | over35 | 6.7 | 13.6 | +6.9 | +1.6 … +12.7 | 16 / 14 |
| C21 | p90Dd | $28,065 | $32,627 | +$4,562 | +$3,446 … +$5,684 | 27 / 5 |
| C21 | p90GivebackLowerBound | $16,402 | $18,743 | +$2,341 | +$1,037 … +$3,643 | 19 / 13 |
| C21 | p90BdMarked | $17,871 | $20,197 | +$2,325 | +$673 … +$3,925 | 21 / 11 |
| C21 | p90PlLiq | $12,533 | $15,737 | +$3,204 | +$1,745 … +$4,640 | 19 / 13 |
| C21 | over35 | 8.6 | 33.9 | +25.3 | +17.1 … +33.7 | 22 / 8 |
| C24 | p90Dd | $29,806 | $33,374 | +$3,568 | +$2,446 … +$4,700 | 25 / 7 |
| C24 | p90GivebackLowerBound | $11,871 | $14,549 | +$2,678 | +$1,505 … +$3,856 | 20 / 12 |
| C24 | p90BdMarked | $21,451 | $22,526 | +$1,076 | −$126 … +$2,303 | 18 / 14 |
| C24 | p90PlLiq | $13,443 | $14,400 | +$957 | −$168 … +$2,109 | 18 / 14 |
| C24 | over35 | 12.6 | 50.7 | +38.1 | +23.3 … +54.5 | 23 / 8 |

## B1. Parity of the CPU replays

| Cutoff | Subjects | To the cent (net, DD, 4 envelope values) | Bit for bit (canonical record + envelope) |
|---|---:|---:|---:|
| C19 | 67 | true | true |
| C21 | 66 | true | true |
| C24 | 66 | true | true |

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
| C21 | net | $201,227 | $211,957 | +$10,729 | +$6,293 … +$15,455 | 26 / 6 | $201,989 | $211,080 |
| C21 | dd | $21,988 | $23,577 | +$1,589 | +$105 … +$3,074 | 18 / 13 | $21,398 | $23,592 |
| C21 | ddLiquidation | $21,965 | $23,549 | +$1,584 | +$94 … +$3,061 | 18 / 13 | $21,383 | $23,560 |
| C21 | unbankedGiveback | $19,788 | $21,027 | +$1,239 | −$335 … +$2,792 | 18 / 13 | $18,853 | $20,084 |
| C21 | bankedErosion | $2,200 | $2,549 | +$350 | −$517 … +$1,202 | 12 / 9 | $251 | $216 |
| C21 | capitalLoss | $0 | $0 | $0 | $0 … $0 | 0 / 0 | $0 | $0 |
| C21 | erosionPlusCapitalLoss | $2,200 | $2,549 | +$350 | −$514 … +$1,206 | 12 / 9 | $251 | $216 |
| C21 | unbankedGivebackShare | 89.8 % | 89.6 % | -0.2 pp | -3.8 pp … 3.4 pp | 9 / 12 | 98.9 % | 99.3 % |
| C21 | givebackLowerBound | $15,027 | $16,498 | +$1,471 | −$62 … +$3,003 | 16 / 16 | $15,504 | $15,051 |
| C21 | lotProfitGiveback | $19,712 | $20,925 | +$1,213 | −$414 … +$2,820 | 17 / 14 | $19,092 | $20,084 |
| C21 | lotPrincipalLoss | $2,276 | $2,652 | +$376 | −$563 … +$1,300 | 12 / 9 | $251 | $216 |
| C21 | bankedDdMarked | $6,961 | $7,079 | +$118 | −$622 … +$866 | 13 / 18 | $6,738 | $5,938 |
| C21 | bankedDdLiquidation | $7,008 | $7,126 | +$118 | −$621 … +$868 | 13 / 18 | $6,786 | $5,986 |
| C21 | principalLossLiquidation | $6,445 | $6,739 | +$294 | −$412 … +$1,052 | 12 / 18 | $6,708 | $5,638 |
| C21 | maxTradeGivebackAboveBreakeven | $21,091 | $22,065 | +$974 | −$387 … +$2,325 | 16 / 13 | $19,098 | $21,095 |
| C21 | maxTradePeakProfit | $59,735 | $65,231 | +$5,496 | +$170 … +$11,060 | 18 / 13 | $58,939 | $59,196 |
| C21 | worstTradeNet | −$1,827 | −$253 | +$1,574 | +$733 … +$2,426 | 18 / 11 | −$1,775 | −$348 |
| C21 | windowGivebackClosedProfitable | $18,965 | $17,301 | −$1,665 | −$4,274 … +$946 | 16 / 15 | $18,298 | $18,594 |
| C21 | windowGivebackClosedLoss | $0 | $582 | +$582 | $0 … +$1,165 | 1 / 0 | $0 | $0 |
| C21 | windowPrincipalLossClosedLoss | $1,242 | $892 | −$350 | −$1,141 … +$423 | 4 / 4 | $0 | $0 |
| C21 | occupancy | 75.2 % | 77.5 % | 2.3 pp | -0.5 pp … 5.0 pp | 20 / 12 | 75.6 % | 78.4 % |
| C21 | lots | 14.3 | 12.0 | -2.3 | -3.6 … -1.0 | 7 / 20 | 12.0 | 10.0 |
| C21 | liq.unbankedGiveback | $19,741 | $20,975 | +$1,235 | −$318 … +$2,784 | 18 / 13 | $18,813 | $20,066 |
| C21 | liq.bankedErosion | $2,224 | $2,573 | +$349 | −$522 … +$1,215 | 12 / 9 | $276 | $241 |
| C21 | liq.capitalLoss | $0 | $0 | $0 | $0 … $0 | 0 / 0 | $0 | $0 |
| C24 | net | $177,117 | $193,504 | +$16,387 | +$9,835 … +$22,769 | 23 / 9 | $178,399 | $191,435 |
| C24 | dd | $21,551 | $24,514 | +$2,963 | +$1,797 … +$4,150 | 22 / 10 | $21,479 | $23,511 |
| C24 | ddLiquidation | $21,533 | $24,495 | +$2,962 | +$1,801 … +$4,147 | 22 / 10 | $21,458 | $23,496 |
| C24 | unbankedGiveback | $12,642 | $14,767 | +$2,125 | +$424 … +$3,812 | 20 / 12 | $11,371 | $15,397 |
| C24 | bankedErosion | $8,515 | $9,748 | +$1,232 | −$857 … +$3,330 | 16 / 15 | $9,216 | $9,773 |
| C24 | capitalLoss | $395 | $0 | −$395 | −$789 … $0 | 0 / 1 | $0 | $0 |
| C24 | erosionPlusCapitalLoss | $8,910 | $9,748 | +$838 | −$1,328 … +$3,008 | 16 / 15 | $10,590 | $9,773 |
| C24 | unbankedGivebackShare | 60.1 % | 61.5 % | 1.4 pp | -7.0 pp … 9.8 pp | 16 / 15 | 47.1 % | 56.4 % |
| C24 | givebackLowerBound | $9,573 | $11,943 | +$2,370 | +$1,162 … +$3,576 | 20 / 12 | $9,168 | $11,830 |
| C24 | lotProfitGiveback | $12,689 | $15,124 | +$2,435 | +$540 … +$4,319 | 20 / 12 | $11,371 | $15,251 |
| C24 | lotPrincipalLoss | $8,862 | $9,390 | +$528 | −$1,829 … +$2,909 | 15 / 16 | $11,343 | $9,560 |
| C24 | bankedDdMarked | $11,978 | $12,571 | +$593 | −$601 … +$1,797 | 17 / 15 | $11,904 | $12,300 |
| C24 | bankedDdLiquidation | $12,025 | $12,617 | +$592 | −$597 … +$1,795 | 17 / 15 | $11,950 | $12,346 |
| C24 | principalLossLiquidation | $9,474 | $10,215 | +$741 | −$95 … +$1,593 | 16 / 16 | $9,315 | $9,202 |
| C24 | maxTradeGivebackAboveBreakeven | $18,174 | $20,199 | +$2,024 | +$1,015 … +$3,052 | 18 / 8 | $17,744 | $18,277 |
| C24 | maxTradePeakProfit | $50,845 | $51,082 | +$237 | −$1,045 … +$1,503 | 13 / 11 | $48,118 | $47,947 |
| C24 | worstTradeNet | −$5,710 | −$5,622 | +$88 | −$908 … +$1,087 | 14 / 18 | −$5,355 | −$6,114 |
| C24 | windowGivebackClosedProfitable | $11,869 | $13,744 | +$1,876 | −$205 … +$3,933 | 20 / 12 | $10,848 | $14,538 |
| C24 | windowGivebackClosedLoss | $821 | $1,380 | +$559 | −$821 … +$2,017 | 2 / 2 | $0 | $0 |
| C24 | windowPrincipalLossClosedLoss | $6,597 | $6,399 | −$198 | −$2,559 … +$2,166 | 13 / 16 | $3,962 | $5,844 |
| C24 | occupancy | 53.8 % | 60.3 % | 6.5 pp | 1.4 pp … 11.4 pp | 23 / 9 | 56.2 % | 64.6 % |
| C24 | lots | 29.3 | 23.9 | -5.4 | -8.4 … -2.5 | 13 / 19 | 26.5 | 22.5 |
| C24 | liq.unbankedGiveback | $12,587 | $14,706 | +$2,119 | +$423 … +$3,826 | 20 / 12 | $11,299 | $15,332 |
| C24 | liq.bankedErosion | $8,550 | $9,788 | +$1,238 | −$855 … +$3,346 | 16 / 15 | $9,257 | $9,820 |
| C24 | liq.capitalLoss | $396 | $0 | −$396 | −$792 … $0 | 0 / 1 | $0 | $0 |

## B3. Arm-level decomposition of the representatives’ maximum drawdowns (shares of the summed DD; giveback-dominated = U ≥ ½ DD)

| Cutoff | Arm | Summed DD | U share | E share | F share | Giveback-dominated | F > 0 | Bound U ≥ DD − BD_marked holds (to 2 cents) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | CTRL | $672,638 | 93.0 % | 7.0 % | 0.0 % | 32 / 32 | 0 / 32 | 32 / 32 |
| C19 | EXP30 | $732,407 | 93.0 % | 7.0 % | 0.0 % | 32 / 32 | 0 / 32 | 32 / 32 |
| C21 | CTRL | $703,620 | 90.0 % | 10.0 % | 0.0 % | 31 / 32 | 0 / 32 | 32 / 32 |
| C21 | EXP30 | $754,459 | 89.2 % | 10.8 % | 0.0 % | 30 / 32 | 0 / 32 | 32 / 32 |
| C24 | CTRL | $689,647 | 58.7 % | 39.5 % | 1.8 % | 15 / 32 | 1 / 32 | 32 / 32 |
| C24 | EXP30 | $784,461 | 60.2 % | 39.8 % | 0.0 % | 21 / 32 | 0 / 32 | 32 / 32 |

## B4. Identity of the mean paired DD increase (arm-level magnitudes of different episodes, not one shared episode)

The residual is cent rounding: diag-core rounds DD, U, E and F to cents separately.

| Cutoff | Mean ΔDD | Mean ΔU | Mean ΔE | Mean ΔF | Residual |
|---|---:|---:|---:|---:|---:|
| C19 | +$1,868 | +$1,717 | +$151 | $0 | -4.55e-13 |
| C21 | +$1,589 | +$1,239 | +$350 | $0 | -3.13e-4 |
| C24 | +$2,963 | +$2,125 | +$1,232 | −$395 | -2.19e-3 |

## B5. EXP-30 representatives that P0 would reject (sealed verdicts) versus the other pairs

| Cutoff | Subset | Pairs | EXP-30 mean DD | EXP-30 U / E / F shares | EXP-30 giveback-dominated | CTRL mean DD | CTRL U / E / F shares | Mean ΔDD | Mean ΔU / ΔE / ΔF | Mean Δnet |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | EXP-30 rep. rejected by P0 | 2 | $24,187 | 91 % / 9 % / 0 % | 2 / 2 | $18,755 | 100 % / 0 % / 0 % | +$5,431 | +$3,188 / +$2,244 / $0 | +$1,644 |
| C19 | other pairs | 30 | $22,801 | 93 % / 7 % / 0 % | 30 / 30 | $21,171 | 93 % / 7 % / 0 % | +$1,630 | +$1,619 / +$11 / $0 | −$909 |
| C21 | EXP-30 rep. rejected by P0 | 11 | $25,045 | 85 % / 15 % / 0 % | 10 / 11 | $23,607 | 92 % / 8 % / 0 % | +$1,439 | −$356 / +$1,794 / $0 | +$1,249 |
| C21 | other pairs | 21 | $22,808 | 91 % / 9 % / 0 % | 20 / 21 | $21,140 | 89 % / 11 % / 0 % | +$1,667 | +$2,074 / −$407 / $0 | +$15,696 |
| C24 | EXP-30 rep. rejected by P0 | 12 | $26,476 | 63 % / 37 % / 0 % | 10 / 12 | $21,260 | 60 % / 40 % / 0 % | +$5,216 | +$3,961 / +$1,255 / $0 | +$19,888 |
| C24 | other pairs | 20 | $23,337 | 58 % / 42 % / 0 % | 11 / 20 | $21,726 | 58 % / 39 % / 3 % | +$1,611 | +$1,023 / +$1,219 / −$631 | +$14,286 |

## B6. Winning versus losing positions inside the maximum-DD windows (lot lens; sums over the 32 representatives)

| Cutoff | Arm | Window giveback, lots closed profitable | closed at a loss | open at the door end | Window principal loss, lots closed at a loss | Trades with giveback: ended profitable / at a loss | Losing trades | Lots |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | CTRL | $505,242 | $0 | $120,630 | $22,995 | 114 / 57 | 57 | 203 |
| C19 | EXP30 | $611,588 | $0 | $69,232 | $20,216 | 135 / 47 | 49 | 215 |
| C21 | CTRL | $606,895 | $0 | $23,889 | $39,742 | 337 / 88 | 91 | 458 |
| C21 | EXP30 | $553,628 | $18,636 | $97,336 | $28,540 | 298 / 53 | 55 | 385 |
| C24 | CTRL | $379,794 | $26,266 | $0 | $211,113 | 592 / 313 | 331 | 938 |
| C24 | EXP30 | $439,812 | $44,166 | $0 | $204,765 | 529 / 206 | 214 | 764 |

## B6b. Lots of the maximum-DD windows by their recorded exit reason (gross giveback above break-even / gross deepening below principal; sums over the 32 representatives)

“open” = still held at the training door’s end; “… gap” = filled at a gapped open below the stop level (recorded by the engine).

| Cutoff | Arm | Exit reason | Window lots | Gross giveback | Gross below-principal | Giveback lots that closed profitable | Below-principal lots that closed at a loss |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | CTRL | trend exit | 20 | $434,512 | $0 | 20 | 0 |
| C19 | CTRL | open | 10 | $120,630 | $8,314 | 0 | 0 |
| C19 | CTRL | trailing stop | 8 | $59,520 | $15,458 | 4 | 0 |
| C19 | CTRL | maximum hold | 11 | $0 | $20,944 | 0 | 11 |
| C19 | CTRL | trailing stop gap | 1 | $11,210 | $0 | 1 | 0 |
| C19 | CTRL | buffered intraday loss | 1 | $0 | $2,051 | 0 | 1 |
| C19 | EXP30 | trend exit | 23 | $514,147 | $0 | 23 | 0 |
| C19 | EXP30 | trailing stop | 11 | $101,912 | $20,862 | 5 | 0 |
| C19 | EXP30 | open | 7 | $69,232 | $5,215 | 0 | 0 |
| C19 | EXP30 | maximum hold | 7 | $0 | $18,768 | 0 | 6 |
| C19 | EXP30 | buffered intraday loss | 1 | $0 | $3,832 | 0 | 1 |
| C19 | EXP30 | trailing stop gap | 1 | $0 | $2,911 | 0 | 0 |
| C21 | CTRL | trailing stop gap | 20 | $208,844 | $17,337 | 11 | 0 |
| C21 | CTRL | trend exit | 9 | $184,735 | $7,461 | 8 | 0 |
| C21 | CTRL | trailing stop | 15 | $175,177 | $8,297 | 10 | 0 |
| C21 | CTRL | maximum hold | 7 | $41,059 | $25,311 | 2 | 5 |
| C21 | CTRL | open | 1 | $23,889 | $0 | 0 | 0 |
| C21 | CTRL | protective stop | 1 | $0 | $7,583 | 0 | 1 |
| C21 | CTRL | initial stop | 1 | $0 | $6,847 | 0 | 1 |
| C21 | EXP30 | trend exit | 16 | $277,343 | $2,974 | 14 | 0 |
| C21 | EXP30 | trailing stop | 19 | $137,108 | $44,644 | 6 | 0 |
| C21 | EXP30 | trailing stop gap | 11 | $136,375 | $8,700 | 6 | 0 |
| C21 | EXP30 | open | 4 | $97,336 | $0 | 0 | 0 |
| C21 | EXP30 | maximum hold | 11 | $36,429 | $18,597 | 1 | 10 |
| C21 | EXP30 | initial stop | 2 | $0 | $9,943 | 0 | 2 |
| C24 | CTRL | maximum hold | 58 | $18,636 | $184,995 | 0 | 57 |
| C24 | CTRL | trailing stop gap | 17 | $154,483 | $14,576 | 11 | 1 |
| C24 | CTRL | trend exit | 14 | $154,882 | $8,244 | 8 | 0 |
| C24 | CTRL | trailing stop | 23 | $91,035 | $28,576 | 10 | 0 |
| C24 | CTRL | open | 3 | $0 | $22,923 | 0 | 0 |
| C24 | CTRL | initial stop | 1 | $15,598 | $0 | 1 | 0 |
| C24 | CTRL | protective stop | 3 | $0 | $14,673 | 0 | 3 |
| C24 | CTRL | buffered intraday loss | 4 | $7,630 | $4,370 | 0 | 4 |
| C24 | CTRL | protective stop gap | 1 | $0 | $5,229 | 0 | 1 |
| C24 | EXP30 | trend exit | 16 | $239,065 | $51,281 | 11 | 2 |
| C24 | EXP30 | trailing stop | 28 | $166,605 | $47,033 | 13 | 0 |
| C24 | EXP30 | maximum hold | 40 | $23,010 | $146,948 | 1 | 38 |
| C24 | EXP30 | trailing stop gap | 14 | $74,911 | $15,027 | 5 | 2 |
| C24 | EXP30 | initial stop | 2 | $0 | $14,450 | 0 | 2 |
| C24 | EXP30 | protective stop | 2 | $0 | $12,244 | 0 | 2 |
| C24 | EXP30 | buffered intraday loss | 2 | $0 | $9,081 | 0 | 2 |
| C24 | EXP30 | protective stop gap | 1 | $0 | $4,420 | 0 | 1 |

## B7. Benchmarks (descriptive frozen references; never selectable)

| Cutoff | Benchmark | Net | DD | U / E / F | Giveback-dominated | BD (liq.) | PL (liq.) | Window |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | benchmark: New L0 | $79,970 | $10,633 | $10,472 / $161 / $0 | true | $3,687 | $3,687 | 2019-05-01 → 2019-10-23 |
| C19 | benchmark: N/original | $80,437 | $10,691 | $10,530 / $161 / $0 | true | $3,929 | $3,929 | 2019-05-01 → 2019-10-23 |
| C21 | benchmark: New L0 | $251,373 | $17,281 | $17,281 / $0 / $0 | true | $5,638 | $5,638 | 2020-03-19 → 2020-03-19 |
| C21 | benchmark: N/original | $251,839 | $17,281 | $17,281 / $0 / $0 | true | $5,638 | $5,638 | 2020-03-19 → 2020-03-19 |
| C24 | benchmark: New L0 | $382,721 | $19,460 | $9,124 / $10,336 / $0 | false | $10,384 | $8,093 | 2023-01-25 → 2023-02-24 |
| C24 | benchmark: N/original | $388,031 | $19,460 | $9,124 / $10,336 / $0 | false | $10,384 | $8,093 | 2023-01-25 → 2023-02-24 |

## B8. Episode illustrations (each arm’s own maximum-DD window; side by side, never subtracted)

- **C19 CTRL pooled P0 primary: CTRL C19/broad/GA0.VA0/R15#1 profit** — net $127,622, DD $18,217 = U $18,217 + E $0 + F $0; window 2018-01-26 → 2018-02-09 (net $89,305 → $71,088, banked high $61,192). Largest lots: G:VGT 2016-07-13→2018-11-19 (open at peak and trough; $44,168 → $25,951; giveback $18,217, below principal $0; lot net $31,134)
- **C19 EXP-30 pooled P0 primary: EXP30 C19/broad/GB0.VD1/R10#1 profit** — net $111,862, DD $17,149 = U $17,149 + E $0 + F $0; window 2019-05-01 → 2019-06-03 (net $101,114 → $83,965, banked high $70,600). Largest lots: D1:VGT 2018-12-26→open (open at peak and trough; $30,513 → $13,364; giveback $17,149, below principal $0; lot net $41,261)
- **C19 largest paired ΔDD (GB0.VD1 R9) CTRL: CTRL C19/broad/GB0.VD1/R9#1 profit** — net $96,376, DD $17,344 = U $17,344 + E $0 + F $0; window 2019-05-01 → 2019-06-03 (net $85,409 → $68,065, banked high $53,270). Largest lots: D1:VGT 2018-12-26→open (open at peak and trough; $32,139 → $14,794; giveback $17,344, below principal $0; lot net $43,106)
- **C19 largest paired ΔDD (GB0.VD1 R9) EXP-30: EXP30 C19/broad/GB0.VD1/R9#1 profit** — net $100,984, DD $26,866 = U $26,866 + E $0 + F $0; window 2018-10-03 → 2018-10-29 (net $59,326 → $32,460, banked high $3,366). Largest lots: G:VGT 2016-07-13→2018-11-02 (open at peak and trough; $59,326 → $32,460; giveback $26,866, below principal $0; lot net $41,532)

- **C21 CTRL pooled P0 primary: CTRL C21/broad/GB0.VD1/R12#1 profit** — net $231,149, DD $26,389 = U $24,349 + E $2,040 + F $0; window 2020-02-19 → 2020-03-12 (net $105,071 → $78,682, banked high $80,722). Largest lots: D1:VGT 2018-12-26→2020-02-27 (open at peak; $59,065 → $34,716; giveback $24,349, below principal $0; lot net $34,716); D1:GDX 2020-03-12→2020-03-13 (entered in window; $0 → −$2,040; giveback $0, below principal $2,040; lot net $2,920)
- **C21 EXP-30 pooled P0 primary: EXP30 C21/broad/GA0.VA0/R13#1 profit** — net $247,284, DD $26,359 = U $26,359 + E $0 + F $0; window 2020-09-02 → 2020-09-21 (net $198,466 → $172,106, banked high $121,899). Largest lots: D1:VGT 2020-03-23→open (open at peak and trough; $76,567 → $50,208; giveback $26,359, below principal $0; lot net $125,386)
- **C21 largest paired ΔDD (GB0.VD1 R16) CTRL: CTRL C21/broad/GB0.VD1/R16#1 profit** — net $210,186, DD $17,576 = U $7,307 + E $10,270 + F $0; window 2020-11-06 → 2021-03-03 (net $214,999 → $197,423, banked high $207,693). Largest lots: D1:GDX 2020-10-28→2020-11-09 (open at peak; $12,041 → $4,734; giveback $7,307, below principal $0; lot net $4,734); D1:GDX 2020-11-19→2020-11-27 (entered in window; $0 → −$5,393; giveback $0, below principal $5,393; lot net −$5,393); D1:GDX 2021-02-26→2021-03-05 (entered in window; $0 → −$4,236; giveback $0, below principal $4,236; lot net −$2,359); D1:GDX 2021-02-04→2021-02-17 (entered in window; $0 → −$641; giveback $0, below principal $641; lot net −$641)
- **C21 largest paired ΔDD (GB0.VD1 R16) EXP-30: EXP30 C21/broad/GB0.VD1/R16#1 profit** — net $212,014, DD $33,030 = U $12,835 + E $20,195 + F $0; window 2018-01-26 → 2018-12-24 (net $51,666 → $18,635, banked high $38,830). Largest lots: G:VGT 2018-10-15→2020-02-24 (entered in window; $0 → −$20,195; giveback $0, below principal $20,195; lot net $17,543); G:VGT 2016-06-30→2018-02-06 (open at peak; $51,666 → $35,800; giveback $15,866, below principal $0; lot net $35,800); G:VGT 2018-02-07→2018-10-10 (entered in window; $0 → $3,030; giveback −$3,030, below principal $0; lot net $3,030)

- **C24 CTRL pooled P0 primary: CTRL C24/broad/GB0.VD1/R18#1 profit** — net $227,874, DD $17,744 = U $17,744 + E $0 + F $0; window 2020-03-19 → 2020-03-19 (net $125,304 → $107,560, banked high $100,943). Largest lots: D1:GDX 2020-03-19→2020-03-20 (open at peak and trough; $24,361 → $6,617; giveback $17,744, below principal $0; lot net $13,898)
- **C24 EXP-30 pooled P0 primary: EXP30 C24/broad/GA0.VA0/R5#1 profit** — net $248,578, DD $20,167 = U $6,759 + E $13,408 + F $0; window 2018-01-26 → 2019-08-23 (net $27,602 → $7,435, banked high $20,842). Largest lots: G:VGT 2017-10-06→2018-02-05 (open at peak; $13,045 → $6,285; giveback $6,759, below principal $0; lot net $6,285); G:VGT 2019-08-22→2019-09-10 (entered in window; $0 → −$4,051; giveback $0, below principal $4,051; lot net −$955); G:VGT 2018-04-13→2018-05-01 (entered in window; $0 → −$3,058; giveback $0, below principal $3,058; lot net −$3,058); G:VGT 2019-06-10→2019-08-05 (entered in window; $0 → −$1,624; giveback $0, below principal $1,624; lot net −$1,624)
- **C24 largest paired ΔDD (GB0.VD1 R11) CTRL: CTRL C24/broad/GB0.VD1/R11#1 profit** — net $189,452, DD $17,653 = U $9,912 + E $7,741 + F $0; window 2023-07-19 → 2024-09-06 (net $194,751 → $177,098, banked high $184,839). Largest lots: G:VGT 2023-01-27→2023-10-30 (open at peak; $27,619 → $16,531; giveback $11,087, below principal $0; lot net $16,531); G:VGT 2024-08-19→open (entered in window; $0 → −$7,741; giveback $0, below principal $7,741; lot net $4,614); G:VGT 2023-12-14→2024-08-08 (entered in window; $0 → $1,175; giveback −$1,175, below principal $0; lot net $1,175)
- **C24 largest paired ΔDD (GB0.VD1 R11) EXP-30: EXP30 C24/broad/GB0.VD1/R11#3 Growth entry alternative** — net $187,965, DD $31,514 = U $18,182 + E $13,331 + F $0; window 2020-08-05 → 2022-03-14 (net $155,778 → $124,264, banked high $137,595). Largest lots: D1:GDX 2020-06-08→2020-08-11 (open at peak; $37,737 → $19,555; giveback $18,182, below principal $0; lot net $19,555); G:VGT 2021-06-29→2022-01-24 (entered in window; $0 → −$8,501; giveback $0, below principal $8,501; lot net −$8,501); D1:GDX 2020-08-26→2020-09-08 (entered in window; $0 → −$4,565; giveback $0, below principal $4,565; lot net −$4,565); D1:VGT 2022-03-14→2022-04-06 (entered in window; $0 → −$266; giveback $0, below principal $266; lot net $8,794)

