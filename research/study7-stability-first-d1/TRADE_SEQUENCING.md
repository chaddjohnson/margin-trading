# Trade sequencing, single-slot interactions and drawdown decomposition

## Sources

- Phase A decomposition and sequence records (`results/phaseA/*-W29.json`, §6.2 of the protocol).
- Funded-sequence diagnostics of every validated candidate (`results/phaseD/*/*/validation.json`).
- The final door's sequence diagnostics and minute-series drawdown decompositions for the role holders and controls
  (`results/final/final.json`).
- Funded-lot ledgers: `results/final/final-lots.jsonl.gz`.

## Conventions

- **Lot contributions** are computed inside one path and sum exactly to the drawdown (Study 6's `lotContributions`;
  residual < $10⁻⁶).
- **"Kept"** means a centre lot with the same symbol, entry minute and exit minute.
- **Interaction** = Δ pool net − Σ of each book's standalone Δ net. It is the part of a perturbation's effect that
  comes from funding and blocking, not from the book's own trades.

## 1. Frozen subsets: who holds the slot, and who breaks the pool (W29)

| Config | Funded lots by book (net) | Refusals (decider < holder) |
|---|---|---|
| B1 | VGT 21 ($176,260) | none |
| VG | VGT 17 ($112,637); GDX 17 ($165,629) | GDX<VGT 9; VGT<GDX 4 |
| VXR | VGT 15 ($162,972); XBI 16 ($51,162); XRT 7 ($14,341) | XBI<VGT 13; XRT<VGT 9; XRT<XBI 4; VGT<XBI 3; VGT<XRT 3 |
| VXRG | VGT 13 ($106,551); GDX 17 ($165,629); XBI 17 ($76,844); XRT 6 ($38,833) | 43 refusals in total; GDX<VGT 7; XRT<VGT 7; XBI<VGT 8 |
| B5 | VGT 12 ($110,095); XBI 16 ($53,064); XRT 4 ($12,842); KRE 46 ($104,981); GDX 17 ($203,655) | 78 refusals in total; KRE<GDX 16; KRE<VGT 9 |

The decomposition of neighbourhood breaches (book reset / only-book perturbed), the own-P&L versus funding
interaction, and the breach-episode quarters are in `BASELINES_AND_FIXED_SUBSETS.md` §4. In short:

- **Funding interactions are large.** They account for 71–90% of the variance of a pool's net change under
  perturbation.
- **Funded sequences almost never survive a perturbation.** Kept-lot shares are 5–12%.
- **GDX re-entries in 2022-Q3 are the dominant breach mechanism** of every GDX-holding pool. VXR's is the 2025-Q2
  tariff shock plus 2022.

### Major drawdowns (minute series; peak → trough; largest lot contributions)

| Config | DD | Peak → trough (New York) | Lots that made it |
|---|---:|---|---|
| B1 / VXR centre | $19,534 | 2020-02-19 12:49 → 2020-03-18 14:27 | VGT 2019-08-05 −$10,783; VGT 2020-03-12 −$11,047; VGT 2020-02-28 +$2,295 |
| VG / VXRG centre | $25,774 | 2026-04-01 11:44 → 2026-07-17 09:34 | GDX 2026-03-19 −$9,213; GDX 2026-05-19 −$6,711; GDX 2026-06-22 −$8,015; GDX 2026-07-13 −$6,617; GDX 2026-06-09 +$4,782 |
| B5 centre | $26,510 | 2020-02-19 12:49 → 2020-03-12 10:23 | VGT 2019-08-05 −$10,783; KRE 2020-03-09 −$18,023; VGT 2020-02-28 +$2,295 |
| VG representative breach | $49,327 | 2022-03-29 → 2022-09-26 | GDX 09-08 −$11,346; GDX 08-19 −$9,320; GDX 06-30 −$9,312; VGT 03-14 −$8,714; GDX 06-10 −$4,917 |
| VXRG representative breach | $50,775 | 2022-03-29 → 2022-09-26 | GDX 09-12 −$15,953; GDX 06-28 −$13,714; VGT 03-14 −$7,894 |
| VXR representative breach | $35,090 | 2022-03-29 → 2025-04-07 | VGT 2025-04-04 −$8,258; VGT 2022-03-14 −$7,771; XRT 2023-02-15 −$6,943; XBI 2022-06-10 −$5,364 |

## 2. The 12 Class L nominees (final door, full history to 2026-10-29)

| Rank | Nominee | Funded lots by book (net) | Refusals | Median kept share / Jaccard (final set 1) | Median abs. Δ pool / abs. interaction | Neighbours with Jaccard < 0.5: share / median net | Worst minute DD and its lots |
|---:|---|---|---|---|---|---|---|
| 1 | VG profit | GDX 52 ($197,151); VGT 11 ($87,120) | GDX<VGT 11; VGT<GDX 7 | 0.22 / 0.12 | $20,245 / $11,481 | 100% / $268,662 | $28,297, 2026-04-01 → 2026-07-20: GDX 03-24 −$9,189, GDX 07-14 −$8,384, GDX 06-05 −$3,039 |
| 2 | VG robust | GDX 36 ($171,931); VGT 13 ($102,927) | GDX<VGT 15; VGT<GDX 5 | 0.14 / 0.08 | $21,329 / $10,722 | 100% / $253,529 | $26,018, 2026-06-17 → 2026-07-31: GDX 06-10 −$7,649, 07-14 −$6,486, 06-22 −$6,378 |
| 3 | VXRG profit | GDX 16 ($127,072); VGT 13 ($66,005); XRT 5 ($80,664); XBI 6 ($2,416) | 14 | 0.12 / 0.08 | $64,852 / $25,482 | 100% / $211,305 | $24,202, 2022-02-01 → 2022-05-12: XBI 04-28 −$11,105, XBI 05-10 −$9,340 |
| 4 | VXRG balanced | GDX 15; VGT 13; XRT 3; XBI 6 | 14 | 0.11 / 0.06 | $62,881 / $24,837 | 100% / $192,506 | $19,228, 2026-04-01 → 2026-05-04: GDX 04-22 −$10,251, GDX 03-27 −$8,977 |
| 5 | VG balanced | VGT 13 ($122,228); GDX 15 ($121,853) | 7 | 0.18 / 0.10 | $32,858 / $5,636 | 100% / $214,124 | $21,020, 2025-10-29 → 2026-06-10: GDX 2026-06-05 −$11,049, VGT 2025-04-11 −$10,713 |
| 6 | VXR profit | VGT 10 ($128,619); XBI 8 ($23,404); XRT 16 ($70,309) | 6 | 0.09 / 0.05 | $42,181 / $9,677 | 100% / $180,151 | $26,104, 2024-03-08 → 2024-08-05: VGT 2024-08-01 −$13,401, VGT 2023-11-02 −$12,703 |
| 7 | G profit | GDX 22 ($168,378) | — | 0.18 / 0.11 | $27,744 / $0 | 100% / $140,633 | $18,333, 2026-04-01 → 2026-06-10: GDX 06-05 −$9,257, 03-27 −$9,076 |
| 8 | VXRG robust | GDX 7; VGT 12; XRT 6; XBI 7 | 9 | 0.12 / 0.06 | $23,775 / $11,147 | 100% / $130,087 | $19,196, 2026-04-01 → 2026-05-04: GDX 04-22 −$10,251, 03-27 −$8,944 |
| 9 | VXR balanced | VGT 20 ($75,254); XBI 14 ($46,686); XRT 12 ($74,960) | 11 | 0.07 / 0.04 | $58,086 / $11,025 | 100% / $138,813 | $18,399, 2020-03-13 → 2020-03-18: XBI 03-13 −$10,889, VGT 03-18 −$5,608 |
| 10 | G balanced | GDX 19 ($162,406) | — | 0.16 / 0.11 | $44,958 / $0 | 100% / $117,449 | $17,281, 2020-03-19 (one lot) |
| 11 | G robust | GDX 20 ($166,638) | — | 0.20 / 0.12 | $44,889 / $0 | 100% / $121,749 | $17,281, 2020-03-19 (one lot) |
| 12 | VXR robust | VGT 19 ($123,028); XBI 9 ($20,677); XRT 11 ($33,316) | 17 | 0.10 / 0.06 | $42,076 / $23,201 | 99% / $134,513 | $17,173, 2022-03-18 → 2022-05-12: XBI 05-10 −$9,446, 03-16 −$5,131 |

- **Profit does not hinge on one capital-contention sequence.**
  - In every nominee almost all neighbours fund a **different** sequence: Jaccard < 0.5 for 99–100% of them.
  - Those neighbours still keep a median net of 70–95% of the centre.
  - The predeclared `sequence-dependent` flag is **false** for every nominee. This is the opposite of frozen B5.
- **Interactions are smaller than in the frozen pools.**
  - Their median absolute interaction is $5.6k–$25k, against $42k–$114k for the frozen VG, VXR, VXRG and B5.
  - The nominees' books compete for the slot less: 6–20 refusals, against 13–78 for the frozen pools.
  - This comes largely from **deep-entry VGT books (X ≈ 30%) and lower-activity GDX books**. It is a design that
    trades less often in exchange for less contention.
- **The VG nominees' worst drawdowns lie in the out-of-fold window.** They are 2026 GDX re-entry sequences of $21k–$28k.
  The 2026 drawdown of #1 ($28,297) leaves a $6,700 cushion. The 2022 bear, which broke every fold-M candidate, costs
  them less because they were selected with it in sample.

## 3. Paired comparison with frozen controls

Stationary block bootstrap (block 21 sessions, 5,000 resamples) of daily mark differences, nominee − control. Each
cell gives the observed total difference and the share of resamples above 0.

| Nominee | vs B1 FULL | vs B1 FX | vs B5 FULL | vs B5 FX | vs frozen subset FULL | vs frozen subset FX |
|---|---|---|---|---|---|---|
| 1 VG profit | +$108,011 (0.91) | +$19,173 (0.77) | −$200,366 (0.00) | −$36,073 (0.06) | VG +$6,005 (0.50) | VG −$34,926 (0.06) |
| 2 VG robust | +$98,597 (0.91) | +$16,692 (0.73) | −$209,780 (0.00) | −$38,554 (0.07) | VG −$3,409 (0.45) | VG −$37,407 (0.08) |
| 3 VXRG profit | +$99,896 (0.88) | −$25,468 (0.20) | −$208,480 (0.01) | −$80,714 (0.03) | VXRG −$111,700 (0.13) | VXRG −$81,133 (0.03) |
| 4 VXRG balanced | +$79,127 (0.81) | −$29,198 (0.16) | −$229,250 (0.00) | −$84,444 (0.02) | VXRG −$132,469 (0.08) | VXRG −$84,863 (0.02) |
| 5 VG balanced | +$67,821 (0.82) | +$28,488 (0.91) | −$240,556 (0.00) | −$26,758 (0.21) | VG −$34,185 (0.30) | VG −$25,611 (0.23) |
| 6 VXR profit | +$46,072 (0.83) | +$23,216 (0.75) | −$262,305 (0.00) | −$32,030 (0.23) | VXR −$6,143 (0.45) | VXR +$21,650 (0.73) |
| 7 G profit | −$7,883 (0.44) | −$30,908 (0.14) | −$316,259 (0.00) | −$86,154 (0.02) | — | — |
| 8 VXRG robust | −$33,071 (0.28) | −$35,114 (0.12) | −$341,448 (0.00) | −$90,360 (0.02) | VXRG −$244,667 (0.00) | VXRG −$90,779 (0.02) |
| 9 VXR balanced | +$20,639 (0.66) | −$27,854 (0.07) | −$287,737 (0.00) | −$83,101 (0.01) | VXR −$31,575 (0.27) | VXR −$29,420 (0.07) |
| 10 G balanced | −$13,854 (0.40) | −$34,048 (0.11) | −$322,231 (0.00) | −$89,295 (0.01) | — | — |
| 11 G robust | −$9,622 (0.43) | −$33,459 (0.12) | −$317,999 (0.00) | −$88,705 (0.01) | — | — |
| 12 VXR robust | +$760 (0.51) | −$18,519 (0.14) | −$307,617 (0.00) | −$73,766 (0.02) | VXR −$51,455 (0.13) | VXR −$20,085 (0.12) |

- **Every nominee earns less than frozen B5** over the full history, by $200k–$341k, and in 2024–2026.
- **The VG nominees roughly match frozen VG's full-history net** (−$34k to +$6k) with far better neighbourhoods
  (97.7–100% against 71.6%). They earned **less** in 2024–2026, by $26k–$37k.
- **Against B1**, the VG and VXR-profit nominees add about +$46k to +$108k over the full history and +$17k to +$28k in
  2024–2026. Bootstrap shares above zero are 0.73–0.91: suggestive, not decisive. B1 is in-sample through 2025, which
  favours it.
- **The GDX standalone and VXRG robust nominees do not beat B1.**

These are retrospective comparisons on exposed data, not predictive probabilities.
