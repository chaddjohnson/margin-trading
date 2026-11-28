# Baselines and the GDX-only N/original ablation (brief Phase 1.2–1.3)

All baselines are read only from sealed, sha256-pinned records and reproduced on the accepted GPU and the CPU reference
(gate E3, `results/engineering/E3-references.json`). No sealed record of New L0, N/original, TSLA, the GPU phases or
Priority 5 was written or re-hashed.

## 1. N/original and New L0 reproduced

| Benchmark | Door | Net | Marked DD | Lots | Signature | Equal to the sealed record |
|---|---|---:|---:|---:|---|:---:|
| N/original (VGT D1 + GDX D1 + VGT Growth) | FULL 2016-01-04 → 2026-10-30 | **$482,700.73** | **$20,385.99** | 44 | `54d1c2e07c2dbbfd` | ✓ (GPU = CPU, 0 differences) |
| N/original | D24 (development through 2024-12-31) | $388,031.02 | | | | ✓ |
| New L0 | FULL | **$479,605.18** | $20,385.99 | 46 | `7b17578108747911` | ✓ |
| New L0 | D24 | $382,721.46 | | | | ✓ |

Both were run on their own VGT/GDX doors. Gate E2 proved that this study's GDX door equals the GDX slot of N/original's door
bar by bar on D24 and FULL, so the GDX-only arms and N/original see exactly the same GDX data.

## 2. The ablation: N/original with both VGT books disabled

**Definition (frozen).** N/original's configuration with its VGT D1 and VGT Growth books disabled. It keeps only the GDX D1
book, with the same parameters, signals and controls, alone in the $100,000 slot. Gate E3(b) showed that the native
ablation (on N/original's own door) **equals the projected control `control: N/original GDX D1 (ablation)`** in this
study's trading slot (arm D). The match holds in every scalar, every year, the book's statistics and the detailed lot
ledger, on D24 and FULL, and GPU = CPU. The same identity holds for New L0's and VG #2's GDX D1 books.

| | Development 2016–2024 | Validation 2025-01-02 → 2026-10-30 | Full |
|---|---:|---:|---:|
| Net | $163,924.96 | +$25,648.34 | $189,573.30 |
| Marked DD | $27,053.38 (27.1 % of the allocation) | reset $20,385.99 | $27,053.38 |
| Lots | 37 (21 W / 16 L) | 10 | 47 |
| Q1–Q6 at C24 | **fails Q3** | | |

The ablation's chronological path over the fold slices is descriptive: it was chosen with later data in view. It earned
$163,608.79 with a $27,053.38 DD, under the ceiling. In the qualification it fails Q4 and Q5 at C19 and Q3 at C23 and C24.

**What the VGT books did for N/original's GDX book.** Inside N/original the GDX D1 book funded 27 lots and netted
$223,904.88. Alone it funds 47 lots and nets $189,573.30. All 27 of N/original's lots recur identically (same entry date and
net). The 20 extra lots, funded only because no VGT book holds the slot, **lost $34,331.58 in total**. They include 11 lots
between 2016-12 and 2017-07 and the June–July 2022 sequence. N/original refused its GDX D1 book 20 times: 15 while VGT
Growth held the slot and 5 while VGT D1 held it. In this history the shared slot acted as a filter, and the GDX D1 book was
better for being refused (TOTAL_PORTFOLIO_COMPARISON.md §N).

## 3. GDX-only against N/original, the fixed references side by side

| | Trading net (full) | Development | Validation | Marked DD (full) | Total account @ $500k core: terminal | max DD |
|---|---:|---:|---:|---:|---:|---:|
| N/original | $482,700.73 | $388,031.02 | $94,669.70 | $20,385.99 | $3,871,873 | $612,387 (21.1 %) |
| New L0 | $479,605.18 | $382,721.46 | $96,883.72 | $20,385.99 | $3,868,778 | $612,193 |
| Ablation (GDX D1 alone) | $189,573.30 | $163,924.96 | $25,648.34 | $27,053.38 | $3,577,728 | $635,512 (32.5 %) |
| Core only | — | — | — | — | $3,389,172 | $631,158 (33.7 %) |

**The trade-off of the ablation:** $293,127 less trading net than N/original over 2016–2026 (−60.7 %), a larger trading-sleeve
DD (+$6,667), and in the total account $294,145 less terminal wealth with a $23,125 larger maximum drawdown. The ablation
raises the core's 2022 drawdown (+$4,354 vs core only). Without the VGT books, N/original's GDX D1 book was a weaker and
riskier strategy, not a diversifier.

## 4. The other incumbents (controls; GDX D1 and GDX Growth)

| Control | Development net / DD (D24) | Q1–Q6 | Validation P&L / reset DD |
|---|---:|---|---:|
| New L0 GDX D1 | $162,764.37 / $35,975.28 | fails Q2 Q3 Q5 | +$25,500.55 / $20,385.99 |
| VG #2 GDX D1 | $194,340.61 / $36,160.34 | fails Q2 Q3 Q5 | +$27,449.46 / $21,303.61 |
| 4A primary indep-rise#1 | $139,668.45 / $17,483.62 (11 lots) | — | $0 (no lot) |
| 4A informed#2 robust | $110,158.59 / $18,840.58 (16) | — | +$39,487.05 / $11,730.77 |
| 4A/3C P08 | $121,008.75 / $18,840.58 (11) | — | $0 |
| 4A/3C P09 | $100,056.17 / $17,744.39 (15) | — | $0 |
| Appendix A | $53,816.50 / $17,709.96 (13) | — | +$87,340.87 / $17,709.24 |

The 4A figures reproduce 4A's sealed development figures to the cent (gate E3(c)). Every incumbent is exactly
representable on this study's fine grid (unit test). They enter the arms as external controls (D, G, J) and as members of
the informed populations D+ and G+ only (PROTOCOL §5). They have no independent chronological test.
