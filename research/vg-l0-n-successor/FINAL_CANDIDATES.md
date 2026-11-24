# FINAL CANDIDATES — P5-NS (C24)

Every C24 finalist (PROTOCOL.md §12) with its role, gates, development evidence (D24, 2016-01-04 → 2024-12-31), the
once-opened 2025-01-02 → 2026-10-30 validation (**previously examined history**) and the full history; complete vectors,
identities and per-finalist successor criteria are machine-readable in `reports/final-candidates.json` (taken from the
sealed `results/selection/C24.json` sha256 in `results/seals.jsonl`, and `results/validation/validation.json`). The
references reproduce their sealed figures to the cent. **No finalist is adopted; no candidate is nominated** (sealed
outcome: *no material improvement*).

## 1. The formal primaries and the references

| Role | Finalist | Track · cell | Centre net / DD (dev) | Conf. robust | Conf. p90 DD | Conf. worst-10 % DD | 2025–26 P&L / reset DD | Full net / DD |
|---|---|---|---:|---:|---:|---:|---:|---:|
| **U/original — the study's formal C24 primary; N/original** | `C24/informed/GB.VA/R103#1 profit` (`rc2-781a682c6f6d6ae2`) | N · GB1.VA1 | **$391,852.16 / $19,459.83** | $201,276 | $27,015 | $30,824 | $94,669.70 / $20,385.99 | $486,521.87 / $20,385.99 |
| N/original (reference, preferred incumbent) | `rc1-f1a8b57cb02455c3` | control · GD1.VB0 | **$388,031.02 / $19,459.83** | $193,011 | $28,012 | $31,605 | $94,669.70 / $20,385.99 | **$482,700.73 / $20,385.99** |
| New L0 (frozen benchmark) | `a2e385640ca61012` | control · GA0.VA0 | $382,721.46 / $19,459.83 | $228,463 | $30,658 | $34,808 | $96,883.72 / $20,385.99 | **$479,605.18 / $20,385.99** |
| I1 (Priority 4, S1-enabled; sealed; another instrument) | `st1-268048c1b4692283` | external · GA0.VA0 + S1 | $392,020.76 / $19,459.83 | $231,905 (P4) | $30,658 (P4) | $34,808 (P4) | $102,353.23 / $20,385.99 | $494,374.00 / $20,385.99 |
| F/original — the independent procedure's C24 primary | `C24/refine/GA0.VB1/R102#1 profit` | F · GA0.VB1 | $289,140.53 / $28,508.07 | $168,164 | $33,500 | $37,905 | $31,010.33 / $34,380.49 | $320,150.86 / $34,380.49 |
| L/original (secondary) | `C24/refine/GA0.VA0/R101#1 profit` | F · GA0.VA0 | $264,592.51 / $23,483.92 | $166,909 | $29,586 | $32,163 | $26,854.03 / $22,868.86 | $291,446.54 / $23,483.92 |
| B/original (secondary) | `C24/refine/GA0.VB1/R101#4 control alternative` | F · GA0.VB1 | $270,480.17 / $27,508.26 | $162,815 | $31,799 | $33,281 | $45,690.31 / $28,183.91 | $316,170.49 / $28,183.91 |

I1's figures are its own sealed Priority 4 records (`results/references/I1-sealed.json`): S1-enabled, qualified with
Priority 4's EXP neighbourhoods (staged genes perturbed) — never evaluated, searched around or nominated here.

**The primary against N/original** (exact vector in the JSON): D1·GDX family B (protective stop 16.3 %, entry-day
activation, legacy 12-day hold) instead of family D (15.9 % stop, adaptive 13 → 28 days); the same GDX decline gate (K 3,
r 700, c 60); D1·VGT family A with a decline gate (K 4, r 860, c 239) instead of family B (12.0 % stop); buffer 2.0 %,
hold 13 days, pullback 11.2 %, continuation 57 sessions on VGT; Growth·VGT eligibility `reset_renew` (drop 5.5 %, rebound
5.2 %) instead of `time_limited`, maximum hold 24 days (22), ATR initial stop 15 × 1.3 (16 × 1.2), classic pullback 10.8 %
(11.2 %). Its development ledger differs from N/original's; on 2025–2026 it earns exactly N/original's +$94,669.70.

## 2. Roles

| Population | Actual-profit | Robust-profit | Balanced | Lower-drawdown |
|---|---|---|---|---|
| F (independent) | `C24/refine/GA0.VB1/R102#1 profit` | `C24/refine/GD1.VA1/R103#2 robust` | `C24/refine/GD1.VB1/R104#2 balanced` | `C24/refine/GA0.VA0/R101#3 balanced` |
| N (informed + incumbents) | `C24/informed/GB.VA/R103#1 profit` | `C24/informed/GA.VC/R101#2 robust` | `C24/informed/GB.VC/R108#2 robust` | `C24/informed/GC.VC/R105#4 best GC0.VC0` |
| U (final selectable set) | as N | as N | as N | `C24/refine/GB1.VB0/R103#3 balanced` |

The distinct trade-off worth noting: **N's robust-profit holder `C24/informed/GA.VC/R101#2 robust`** (GA0.VC1): centre
$368,781.93 / $19,459.83, confirmation robust $240,974 (+$47,963 over N/original), p90 DD $23,174 (−$4,838), worst-10 %
mean $26,491; but centre net −$19,249 (fails the precommitted profit non-inferiority, so it is not a type-R improvement);
2025–26 +$62,740.79 / reset DD $20,746.93; full $431,522.72 / $23,083.79.

## 3. All 40 finalists (and the two references)

Columns: gates; development centre net / DD; confirmation robust (½ median + ½ p10 of 384); confirmation p90 DD;
worst-10 % mean DD; 2025–26 P&L / reset DD; full net / DD; V1–V3. Sorted as in the sealed record.

| Finalist | Track | Cell | Gates | Centre net / DD | Conf. robust | Conf. p90 DD | W-10 % | 2025–26 | Full | V1–V3 |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| `C24/refine/GA0.VB1/R102#1 profit` | F | GA0.VB1 | Q | $289,141 / $28,508 | $168,164 | $33,500 | $37,905 | $31,010 / $34,380 | $320,151 / $34,380 | pass |
| `C24/refine/GA0.VA0/R101#1 profit` | F | GA0.VA0 | Q | $264,593 / $23,484 | $166,909 | $29,586 | $32,163 | $26,854 / $22,869 | $291,447 / $23,484 | pass |
| `C24/refine/GA0.VB1/R101#4 control alternative` | F | GA0.VB1 | Q | $270,480 / $27,508 | $162,815 | $31,799 | $33,281 | $45,690 / $28,184 | $316,170 / $28,184 | pass |
| `C24/informed/GB.VA/R103#1 profit` | N | GB1.VA1 | Q | $391,852 / $19,460 | $201,276 | $27,015 | $30,824 | $94,670 / $20,386 | $486,522 / $20,386 | pass |
| `C24/refine/GD1.VA1/R103#2 robust` | F | GD1.VA1 | Q | $213,423 / $28,312 | $198,848 | $31,153 | $33,566 | $41,827 / $25,420 | $255,249 / $28,312 | pass |
| `C24/refine/GD1.VB1/R104#2 balanced` | F | GD1.VB1 | Q | $194,057 / $17,281 | $186,407 | $18,022 | $21,364 | $30,905 / $35,925 | $224,961 / $40,497 | **V2, V3 fail** |
| `C24/refine/GA0.VA0/R101#3 balanced` | F | GA0.VA0 | Q | $138,611 / $12,902 | $93,868 | $15,206 | $16,955 | $8,362 / $20,180 | $146,973 / $20,180 | pass |
| `C24/informed/GB.VC/R108#2 robust` | N | GB0.VC1 | Q | $312,571 / $18,550 | $244,523 | $32,045 | $38,576 | $63,531 / $31,825 | $376,102 / $32,625 | pass |
| `C24/informed/GA.VC/R101#2 robust` | N | GA0.VC1 | Q | $368,782 / $19,460 | $240,974 | $23,174 | $26,491 | $62,741 / $20,747 | $431,523 / $23,084 | pass |
| `C24/informed/GC.VC/R105#4 best GC0.VC0` | N | GC0.VC0 | Q | $136,198 / $17,865 | $134,258 | $20,958 | $23,329 | $29,039 / $21,354 | $165,237 / $21,354 | pass |
| `C24/refine/GB1.VB0/R103#3 balanced` | F | GB1.VB0 | Q | $113,174 / $17,281 | $109,571 | $17,281 | $18,018 | $54,787 / $23,409 | $167,960 / $23,409 | pass |
| `C24/refine/GA1.VC1/R101#1 profit` | F | GA1.VC1 | Q | $269,903 / $30,662 | $192,982 | $32,224 | $33,440 | −$10,050 / $37,643 | $259,852 / $50,754 | **V1–V3 fail** |
| `C24/broad/GA0.VD0/R104#1 profit` | F | GA0.VD0 | Q | $201,473 / $18,514 | $112,844 | $28,541 | $34,418 | $15,598 / $16,841 | $217,072 / $18,514 | pass |
| `C24/broad/GB1.VA0/R102#1 profit` | F | GB1.VA0 | Q | $209,587 / $19,291 | $144,031 | $34,010 | $35,258 | $52,253 / $18,580 | $261,840 / $21,055 | pass |
| `C24/refine/GB1.VB0/R102#1 profit` | F | GB1.VB0 | Q | $237,366 / $29,815 | $134,495 | $30,492 | $31,380 | $43,263 / $18,657 | $280,628 / $29,815 | pass |
| `C24/refine/GB1.VC0/R104#1 profit` | F | GB1.VC0 | Q | $269,096 / $17,281 | $159,871 | $23,693 | $26,306 | $41,853 / $25,658 | $310,949 / $25,658 | pass |
| `C24/refine/GB0.VD1/R103#1 profit` | F | GB0.VD1 | Q | $253,859 / $17,281 | $172,885 | $34,606 | $38,485 | −$23,601 / $30,829 | $230,257 / $31,623 | **V1 fail** |
| `C24/broad/GC1.VA1/R103#1 profit` | F | GC1.VA1 | Q | $215,169 / $21,649 | $122,296 | $29,370 | $31,890 | −$9,453 / $28,589 | $205,716 / $28,589 | **V1 fail** |
| `C24/refine/GC1.VB1/R101#1 profit` | F | GC1.VB1 | Q | $287,849 / $20,044 | $163,064 | $33,187 | $37,284 | $12,780 / $18,282 | $300,629 / $20,044 | pass |
| `C24/broad/GC0.VC0/R104#1 profit` | F | GC0.VC0 | Q | $197,783 / $24,273 | $124,540 | $30,311 | $34,180 | −$9,742 / $18,951 | $188,041 / $24,273 | **V1 fail** |
| `C24/broad/GC1.VD0/R101#1 profit` | F | GC1.VD0 | Q | $204,773 / $18,713 | $128,885 | $33,022 | $36,912 | $67,091 / $23,679 | $271,864 / $23,679 | pass |
| `C24/refine/GD1.VA1/R104#1 profit` | F | GD1.VA1 | Q | $244,255 / $23,804 | $165,946 | $31,527 | $35,526 | $16,396 / $34,309 | $260,650 / $34,309 | pass |
| `C24/refine/GD1.VB1/R103#1 profit` | F | GD1.VB1 | Q | $244,943 / $17,744 | $176,083 | $29,729 | $33,309 | $45,689 / $11,328 | $290,632 / $17,744 | pass |
| `C24/refine/GD0.VC1/R103#1 profit` | F | GD0.VC1 | Q | $262,465 / $22,545 | $174,021 | $28,301 | $30,882 | $1,240 / $35,740 | $263,705 / $46,873 | **V2, V3 fail** |
| `C24/broad/GD1.VD0/R103#1 profit` | F | GD1.VD0 | Q | $220,770 / $26,145 | $129,444 | $34,401 | $37,217 | $31,940 / $19,837 | $252,710 / $28,128 | pass |
| `C24/informed/GA.VA/R104#1 profit` | N | GA1.VA1 | Q | $388,925 / $19,460 | $201,011 | $27,572 | $31,270 | $92,661 / $20,386 | $481,587 / $20,386 | pass |
| `C24/informed/GA.VB/R108#1 profit` | N | GA1.VB0 | Q | $389,771 / $19,460 | $196,187 | $27,171 | $31,531 | $72,602 / $20,386 | $462,373 / $20,386 | pass |
| `C24/informed/GA.VC/R108#1 profit` | N | GA0.VC1 | Q | $383,275 / $19,460 | $219,196 | $24,362 | $31,362 | $70,669 / $20,386 | $453,944 / $20,386 | pass |
| `C24/informed/GA.VD/R107#1 profit` | N | GA1.VD0 | Q | $390,638 / $19,460 | $203,719 | $27,060 | $30,908 | $70,817 / $20,386 | $461,455 / $20,386 | pass |
| `C24/informed/GB.VB/R104#1 profit` | N | GB1.VB0 | Q | $390,638 / $19,460 | $197,397 | $27,090 | $31,005 | $94,670 / $20,386 | $485,307 / $20,386 | pass |
| `C24/informed/GB.VC/R107#1 profit` | N | GB0.VC0 | Q | $383,707 / $19,460 | $209,857 | $25,131 | $31,977 | $93,644 / $20,386 | $477,351 / $20,386 | pass |
| `C24/informed/GB.VD/R101#1 profit` | N | GB1.VD1 | Q | $390,171 / $19,460 | $202,276 | $27,456 | $31,580 | $94,670 / $20,386 | $484,841 / $20,386 | pass |
| `C24/informed/GC.VA/R105#1 profit` | N | GC0.VA0 | Q | $364,216 / $18,797 | $213,685 | $32,544 | $40,140 | $71,907 / $21,274 | $436,122 / $21,274 | pass |
| `C24/informed/GC.VB/R101#1 profit` | N | GC1.VB0 | Q | $362,207 / $21,227 | $184,266 | $30,902 | $40,431 | $68,005 / $21,901 | $430,212 / $21,901 | pass |
| `C24/informed/GC.VC/R101#1 profit` | N | GC1.VC1 | Q | $367,533 / $21,539 | $193,361 | $25,022 | $29,771 | $98,059 / $25,180 | $465,592 / $25,180 | pass |
| `C24/informed/GC.VD/R108#1 profit` | N | GC0.VD1 | Q | $366,891 / $21,229 | $219,308 | $28,535 | $36,680 | $86,180 / $26,481 | $453,071 / $26,481 | pass |
| `C24/informed/GD.VA/R101#1 profit` | N | GD1.VA1 | Q | $389,494 / $19,460 | $198,535 | $27,641 | $31,894 | $96,775 / $20,386 | $486,269 / $20,386 | pass |
| `C24/informed/GD.VB/R108#1 profit` | N | GD1.VB1 | Q | $391,299 / $19,460 | $197,280 | $27,403 | $31,394 | $94,670 / $20,386 | $485,969 / $20,386 | pass |
| `C24/informed/GD.VC/R107#1 profit` | N | GD0.VC0 | Q | $384,544 / $19,460 | $224,763 | $26,661 | $34,244 | $104,341 / $20,878 | $488,885 / $20,878 | pass |
| `C24/informed/GD.VD/R108#1 profit` | N | GD1.VD0 | Q | $391,409 / $19,460 | $191,025 | $29,157 | $31,536 | $94,702 / $20,386 | $486,111 / $20,386 | pass |
| control: N/original | ref | GD1.VB0 | Q | $388,031 / $19,460 | $193,011 | $28,012 | $31,605 | $94,670 / $20,386 | $482,701 / $20,386 | pass |
| control: New L0 | ref | GA0.VA0 | Q | $382,721 / $19,460 | $228,463 | $30,658 | $34,808 | $96,884 / $20,386 | $479,605 / $20,386 | pass |

**Behavioural equivalence.** `C24/informed/GA.VD/R107#1` and `C24/informed/GB.VB/R104#1` have the identical funded-lot
ledger on D24 (signature `e89b27…`) — two genomes, one development trade path (they differ on 2025–2026). Track N's
finalists share N/original's worst development lots (principal loss liquidation $8,093, banked DD liquidation $10,384 in
most rows) and four of them earn N/original's exact 2025–2026 result (+$94,669.70): they are re-parameterizations of one funded-trade
chronology, not independent alternatives.

## 4. Reproduction

From the repository root at the study's commit (`RUN_COMMANDS.md`): the sealed records are reproduced by the official
chain (`chains/chain.sh`; a rerun refuses sealed stages and replays an interrupted job from its archive). A single
finalist is replayed read-only with the CPU reference, e.g. (non-official, purpose cpu-reference):
`GPU_POLICY_PURPOSE=cpu-reference npm run vg-l0ns-diag -- lots --door D24` (every finalist's funded lots, D24) and
`… -- lots --door FULL`; the vector of each finalist is `rows[].cfg` of `reports/final-candidates.json` (Assignment 3's
`Cfg`: cell, D1 vectors in tenths, RC 2 controls, Growth 1.4.0 parameters), evaluated by
`src/vg-l0-risk-families/evaluate.ts evaluate(door, quadOf(cfg), cfg.controls, vOptions)`.
