# The frozen selection: nominee, track primaries, labels and decompositions

Generated from the sealed records by `tools/vg-l0-shadow-eligibility/tables.ts` (not sealed).

Nominee (the actual-profit role of the final selectable set): **C24/A1/R26#1 profit**.

| Track | Primary |
|---|---:|
| A1 | C24/A1/R26#1 profit |
| A2 | C24/A2-g/F1/R2#1 profit |
| B1 | C24/B1/R15/V3#1 profit |
| B2 | C24/B2-g/F1/R7/V1#1 profit |

## Frozen comparison labels (development and folds only; computed before FULL opened)

| Comparison | X net | Y net | Dev | Risk | Chron | Label |
|---|---:|---:|---:|---:|---:|---:|
| F(100) vs A — New L0 with D1·GDX (fixed parameters) | $331,894.78 | $382,721.46 | − | worse | n/a | harmful |
| F(010) vs A — New L0 with D1·VGT (fixed parameters) | $267,557.86 | $382,721.46 | − | worse | n/a | harmful |
| F(001) vs A — New L0 with Growth·VGT (fixed parameters) | $382,721.46 | $382,721.46 | 0 | same | n/a | no material difference |
| F(110) vs A — New L0 with D1·GDX + D1·VGT (fixed parameters) | $246,335.09 | $382,721.46 | − | worse | n/a | harmful |
| F(101) vs A — New L0 with D1·GDX + Growth·VGT (fixed parameters) | $330,652.98 | $382,721.46 | − | worse | n/a | harmful |
| F(011) vs A — New L0 with D1·VGT + Growth·VGT (fixed parameters) | $267,557.86 | $382,721.46 | − | worse | n/a | harmful |
| F(111) vs A — New L0 with D1·GDX + D1·VGT + Growth·VGT (fixed parameters) | $245,093.28 | $382,721.46 | − | worse | n/a | harmful |
| A1 primary vs A | $386,376.04 | $382,721.46 | mixed | same | n/a | inconclusive |
| A2 primary vs A | $384,122.07 | $382,721.46 | 0 | same | n/a | no material difference |
| B1 primary vs A | $232,082.54 | $382,721.46 | − | same | 0 | harmful |
| B2 primary vs A | $315,441.49 | $382,721.46 | − | worse | 0 | harmful |
| nominee vs A | $386,376.04 | $382,721.46 | mixed | same | n/a | inconclusive |
| B1 vs B2 (fresh: joint vs sequential) | $232,082.54 | $315,441.49 | − | better | 0 | harmful |
| A1 vs A2 (informed: joint vs sequential) | $386,376.04 | $384,122.07 | 0 | same | n/a | no material difference |
| A1 vs B1 (joint: informed vs fresh) | $386,376.04 | $232,082.54 | + | same | n/a | conditional profit/risk trade-off (development improvement (no chronological test applies)) |
| A2 vs B2 (sequential: informed vs fresh) | $384,122.07 | $315,441.49 | + | better | n/a | conditional profit/risk trade-off (development improvement (no chronological test applies)) |

## Decompositions (D24 centres): X − A = toggles on New L0 + parameters with toggles OFF + interaction

| Row | Exported as | Toggles | Total (X − A) | Toggles effect on New L0 | Parameters (X all OFF − A) | Interaction | Eligibility within X | Driver |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| R01 | nominee (final actual-profit)/final actual-profit/A1 actual-profit/A1 R26 actual | 001 | +$3,654.58 | +$0.00 | −$12,975.05 | +$16,629.63 | +$16,629.63 | interaction |
| R34 | A2 actual-profit/A2 R2 actual-profit | 001 | +$1,400.61 | +$0.00 | −$9,176.58 | +$10,577.19 | +$10,577.19 | no material total effect |
| R42 | B1 actual-profit/B1 R15 actual-profit | 000 | −$150,638.92 | +$0.00 | −$150,638.92 | +$0.00 | +$0.00 | parameters |
| R76 | B2 actual-profit/B2 R7 actual-profit | 001 | −$67,279.97 | +$0.00 | −$77,401.45 | +$10,121.48 | +$10,121.48 | parameters |
