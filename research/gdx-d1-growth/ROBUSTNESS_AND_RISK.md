# Robustness and risk of the C24 finalists (brief Phase 6 items 4–6; PROTOCOL §8, §16)

Development figures are 2016-01-04 → 2024-12-31 (D24). The **validation** columns are the single 2025-01-02 → 2026-10-30
evaluation. They are retrospective, previously examined history, and were never used for any choice. The small and wide
neighbourhood families, the tail stress and the lot replays are report-only diagnostics, run after the sealed outcome.
Every arm report (STANDALONE_D1_REPORT.md … SEQUENTIAL_REPORT.md, sections E–H) carries the same figures for every
finalist and control.

## 1. Neighbourhoods: the centre against its surroundings (development)

Main confirmation family 3 × 128 draws (the qualification radius). Small (0.5×) and wide (1.5×) families of 128 draws each.

| Primary | Centre net / DD | Confirmation median / p10 / robust | p90 / p95 DD | Worst-10 % mean DD | Breach share (Wilson 95 %) | Small 0.5×: median / p90 DD / breaches | Wide 1.5×: median / p90 DD / breaches |
|---|---:|---:|---:|---:|---:|---:|---:|
| D `D.D1/R103#1` | $270,780 / $17,595 | $165,729 / $110,093 / $137,911 | $30,392 / $33,225 | $33,954 | 3.1 % (1.8–5.4 %) | $213,028 / $27,253 / 0 % | $143,520 / $37,417 / **14.1 %** |
| G `G.h1.s1/R105#1` | $161,457 / $17,744 | $87,458 / $55,341 / $71,400 | $28,618 / $31,586 | $34,035 | 2.9 % (1.6–5.1 %) | $107,117 / $23,426 / 0.8 % | $71,605 / $46,779 / **18.8 %** |
| C `DF2×GF1` | $273,035 / $18,641 | $198,041 / $162,027 / $180,034 | $30,096 / $33,105 | $34,164 | 2.3 % (1.2–4.4 %) | $222,522 / $25,315 / 0 % | $172,313 / $36,858 / **11.7 %** |
| J `J.B1.h0.s0/R102#1` | $230,410 / $20,510 | $159,611 / $125,477 / $142,544 | $29,916 / $31,630 | $32,232 | 1.0 % (0.4–2.7 %) | $184,878 / $26,035 / 0 % | $146,612 / $31,700 / 7.0 % |
| S `S.C24F1.h0.s0/R106#1` | $336,819 / $28,008 | $206,733 / $149,291 / $178,012 | $34,369 / $36,986 | $37,233 | **8.6 %** (6.2–11.8 %) | $258,947 / $31,289 / 0 % | $172,415 / $42,010 / **27.3 %** |
| G+ `G/informed/G.h1.s1/R101#1` | $178,523 / $16,155 | $94,679 / $49,002 / $71,841 | $22,125 / $25,340 | $26,975 | 0.5 % (0.1–1.9 %) | — | — |
| C+ `D+F1×G+F2` | $297,262 / $17,977 | $177,478 / $127,413 / $152,446 | $33,437 / $37,022 | $37,763 | 8.1 % (5.8–11.2 %) | — | — |

**Reading.** Every primary is a sharp peak. Its centre net is 1.4–1.8× its neighbourhood's median (D 1.63×, G 1.85×, C 1.38×,
J 1.44×, S 1.63×). Its centre DD ($17.6k–$28.0k) is far below the neighbourhood's p90 ($28.6k–$34.4k). At the 1.5× radius,
7–27 % of draws breach the ceiling. The qualification gate (Q1–Q6 at the main radius) passed them all. The weaker wide
neighbourhoods show how quickly the risk grows off-centre.

## 2. Stresses (development centre; validation slice in brackets)

| Primary | 10 bps per side | 20 bps per side | 14 % interest | +25 bps stop slippage | Next-open stops | Cost 0 bps (path check) |
|---|---:|---:|---:|---:|---:|---:|
| D | $267,271 / $18,186 [−$15,642] | $258,289 / $19,366 [−$16,414] | $264,091 [−$15,888] | $263,457 / $18,119 | $270,536 / $17,281 | $275,281 |
| G | $157,989 / $17,736 [+$9,482] | $151,065 / $17,718 [**−$1,810**] | $159,369 [+$9,817] | $153,774 | $161,457 | **$81,563** |
| C | $268,988 / $18,739 [+$4,002] | $258,819 / $18,935 [**−$8,084**, DD $34,431] | $268,540 [+$4,093] | $261,757 | $271,966 | **$194,968** |
| J | $226,257 / $20,911 [+$7,689, DD $60,144] | $215,489 / $19,802 | $223,695 | $217,644 | $228,683 | $234,567 |
| S | $333,038 / $28,120 [+$21,237, DD $59,872] | $323,513 / $28,345 | $328,496 | $328,817 | $336,468 | $341,593 |

The D1-only and joint books degrade smoothly with costs. **The Growth-bearing G and C primaries are not monotone in cost.**
At 0 or 2 bps per side their development net falls by about $80,000 (G $81,563 / $80,809; C $194,968 / $193,483) against
$157,989 / $268,988 at 10 bps. One large 2016 Growth·GDX trade exists only on the exact cost path of the base and higher
costs. This is fragility, not robustness, and it sits in the two configurations the outcome lists as development-only.

## 3. Validation neighbourhoods (256 draws around each primary, on the 2025–2026 slice)

| Primary | Median slice P&L | p10 slice P&L | p90 slice DD | Breach share (Wilson 95 %) | Training breach share |
|---|---:|---:|---:|---:|---:|
| D | −$5,171 | −$12,388 | $31,494 | 1.2 % (0.4–3.4 %) | 5.1 % |
| G | +$5,908 | −$17,494 | $43,310 | **21.1 %** (16.5–26.5 %) | 6.3 % |
| C | +$2,466 | −$18,517 | $45,627 | **29.7 %** (24.4–35.6 %) | 4.7 % |
| J | +$8,078 | +$6,966 | $60,066 | **100 %** (98.5–100 %) | 2.3 % |
| S | +$24,547 | +$15,733 | $60,119 | **64.5 %** (58.4–70.1 %) | 9.0 % |
| G+ | $0 | $0 | $0 | 0 % | 0.8 % |
| C+ | −$2,930 | −$11,534 | $31,707 | 2.3 % (1.1–5.0 %) | 7.8 % |

The breach shares on the validation slice are 3–43 times the training shares for G, C, J and S (G 3.4×, C 6.3×, S 7.2×, J 43×).

## 4. What drove the validation breaches: an unrestricted Growth lot left open

The J and S primaries both carry an **unrestricted Growth·GDX book** (exit-protection structure `h0.s0`: no protective exit).
Both books profited from the 2025 rally with trailing-stop exits: J +$36,720 and S +$45,321 on their 2025-05/06 → 2025-10-21
lots. Both then re-entered on 2026-02-26/27 and **still held that lot at the 2026-10-30 endpoint, 245 days later, marked
−$40,493 (J) and −$39,467 (S)**. The worst marks were −$43,680 and −$42,754, including about $7,400 of accrued interest. That
single open lot produces their $60k validation drawdowns.

The D primary's worst validation lot is a maximum-hold D1·GDX lot, 2026-05-19 → 2026-07-17, at −$19,102. Its best mark was
+$6,525, so its giveback was $25,627. In development the D1 tail stress shows the protective stop working: pre-2016 worst
−$25,076, gap-through-stop worst 3.2 % below the stop. The C19 D primary had no stop (family A1); the 2020–2021 breach in
CHRONOLOGICAL_VALIDATION.md §2 comes from that book.

## 5. Lot-level risk (full run 2016–2026; CPU reference replays, `reports/diagnostics/lots.json`)

| Primary | Lots | Win rate | Worst realized lot | Worst marked lot excursion | Giveback Σ (best mark − final net) / largest |
|---|---:|---:|---:|---:|---:|
| D | 46 | 58.7 % | −$19,102 (2026-05-19) | −$19,102 | $320,273 / $25,627 |
| G | 41 | 82.9 % | −$3,108 (2026-09-10) | −$10,199 | $169,914 / $10,463 |
| C | 62 | 82.3 % | −$14,732 (2026-06-16) | −$17,420 | $343,039 / $18,777 |
| J | 43 | 81.0 % | −$4,997 (2021-08-09; the open lot: −$40,493) | **−$43,680** | $359,963 / $41,775 |
| S | 48 | 66.0 % | −$5,069 (2017-02-28; the open lot: −$39,467) | **−$42,754** | $411,930 / $42,320 |
| G+ | 12 | 91.7 % | −$643 | −$6,584 | $105,508 / $10,981 |
| C+ | 51 | 60.8 % | −$19,102 | −$19,102 | $354,806 / $25,627 |

Definitions (kept distinct, brief Phase 5.4):
- **Principal loss** is a lot's loss of the borrowed $100,000 principal (development, marked / liquidation: D $6,786 / $6,833;
  G $10,199; C $11,619; J $7,170; S $6,786).
- **Banked-capital drawdown** is the fall from banked realized profit (D $10,048; G $10,199; C $11,619; J $11,500; S $10,048).
- **Giveback** is a lot's best mark minus its final net, summed.
- **Total-account equity giveback** is the account's maximum marked drawdown (TOTAL_PORTFOLIO_COMPARISON.md).

## 6. Attribution (development centre; causal removals)

| Primary | D1 booked / lots | Growth booked / lots | Without D1 | Without Growth | Allocator refusals (full run) |
|---|---:|---:|---:|---:|---|
| C `DF2×GF1` | $149,312 / 21 | $123,723 / 29 | $161,457 / $17,744 | $175,537 / $18,641 | Growth refused while D1 held the slot 5; D1 refused while Growth held it 1 |
| J `J.B1.h0.s0` | $212,648 / 38 | $17,762 / 1 | $17,762 / $19,157 | $212,648 / $17,528 | D1 refused while Growth held it 8 |
| S `S.C24F1.h0.s0` | $270,780 / 42 | $66,040 / 2 | $80,105 / $28,008 | $270,780 / $17,595 | Growth 1; D1 4 |
| C+ `D+F1×G+F2` | $209,917 / 39 | $87,345 / 8 | $145,002 / $17,451 | $270,780 / $17,595 | Growth 7; D1 3 |

**Growth's increment over D1** is concentrated in one episode, the 2016 gold-miner rally. S's Growth book is two 2016 lots
worth +$66,040. J's is one lot. The fixed pair's Growth book is the G primary, cost-path-dependent as §2 shows. Displacement
is small (≤ 10 refused decisions per run). The shared-slot conflict mostly reshapes paths rather than blocking value.

## 7. Execution and capacity

One lot is $100,000 of GDX: about 7,000 shares at the 2016 price of $14 and about 1,300 at the 2026 price of $77. The study
measured no liquidity statistic beyond the minute-bar fills it trades on. The engine fills at minute prices with 5 bps per side
and stops at the bar's price or, when gapped through, at the open. The tail stress reports gap-through-stop excesses of
3.2–4.4 % pre-2016. The canonical closing-print proxy differs from the official close on 2020-03-17 / -18 (GDX_DATA_AUDIT.md
§4): marks on those two sessions are uncertain. Real fills in fast markets (March 2020, the 2025 rally) could be worse than the
+25 bps slippage stress.
