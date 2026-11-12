# A / B / C: neighbourhood robustness, stresses, causal removals and overfitting evidence (development 2016–2024)

One instrument for all rows (this study’s selection and confirmation families; the same draws under both units). Local stability is not chronological reliability; perturbation frequencies on one history are not probabilities of future losses.

| Row | Centre net | Centre DD | Sel. robust | Conf. median | Conf. p10 | Conf. p90 DD | Conf. p95 DD | Worst-10% mean DD | Draws > $35k [Wilson 95%] | Mean excess | Worst DD | Distinct ledgers | Gates |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|
| A | $382,721.46 | $19,459.83 | $223,954.26 | $252,016.25 | $201,551.68 | $30,684.44 | $34,897.47 | $35,456.44 | 4.7% [3.0%, 7.3%] | $3,186.34 | $49,782.20 | 384 | qualified |
| B | $340,857.79 | $23,473.39 | $211,924.27 | $236,349.19 | $191,186.37 | $37,684.14 | $40,439.88 | $41,501.50 | 17.2% [13.7%, 21.3%] | $4,300.35 | $51,932.49 | 384 | fails Q3 |
| C | $373,676.67 | $20,374.21 | $233,543.98 | $255,710.71 | $203,987.88 | $27,574.23 | $29,514.12 | $31,985.52 | 2.1% [1.1%, 4.1%] | $6,356.37 | $49,299.70 | 384 | qualified |
| independent primary | $247,744.92 | $22,028.81 | $167,033.56 | $187,091.51 | $136,490.54 | $34,475.77 | $40,242.29 | $40,593.43 | 9.6% [7.1%, 13.0%] | $5,915.87 | $58,529.86 | 384 | qualified |

**Stresses (centre net / DD):**

| Row | 10 bps | 20 bps | 14% interest | +25 bps stop slippage | Next-open stops |
|---|---|---|---|---|---|
| A | $378,878.54 / $19,651.95 | $368,949.36 / $20,035.62 | $365,781.73 / $19,673.53 | $374,342.60 / $19,732.58 | $382,794.36 / $19,459.83 |
| B | $337,459.11 / $23,660.88 | $330,883.14 / $24,035.31 | $324,836.76 / $23,777.50 | $333,320.86 / $23,746.14 | $340,798.50 / $23,473.39 |
| C | $369,941.24 / $20,664.72 | $362,481.57 / $21,244.89 | $356,679.06 / $20,686.53 | $365,057.99 / $20,898.04 | $372,404.94 / $20,407.67 |
| independent primary | $241,235.12 / $22,317.49 | $228,678.37 / $23,582.35 | $229,853.30 / $22,234.29 | $238,685.85 / $22,298.56 | $247,003.70 / $22,028.81 |

**Causal removals (net without the component; its causal contribution):**

| Row | Removed | Net without | Causal contribution |
|---|---|---:|---:|
| A | without D1 | $80,212.26 | $302,509.20 |
| A | without Growth | $293,288.86 | $89,432.60 |
| A | without GDX | $188,432.98 | $194,288.48 |
| A | without VGT | $162,764.37 | $219,957.09 |
| A | without D1:VGT | $247,641.71 | $135,079.75 |
| B | without D1 | $80,212.26 | $260,645.53 |
| B | without Growth | $282,794.24 | $58,063.55 |
| B | without GDX | $177,494.25 | $163,363.54 |
| B | without VGT | $153,846.42 | $187,011.37 |
| B | without D1:VGT | $207,354.71 | $133,503.08 |
| C | without D1 | $94,233.87 | $279,442.80 |
| C | without Growth | $285,182.50 | $88,494.17 |
| C | without GDX | $196,148.79 | $177,527.88 |
| C | without VGT | $150,096.12 | $223,580.55 |
| C | without D1:VGT | $238,590.29 | $135,086.38 |
| independent primary | without D1 | $30,564.14 | $217,180.78 |
| independent primary | without Growth | $234,430.42 | $13,314.50 |
| independent primary | without GDX | $101,041.96 | $146,702.96 |
| independent primary | without VGT | $170,037.15 | $77,707.77 |
| independent primary | without D1:VGT | $183,351.65 | $64,393.27 |

**Search variability.** Informed replicates' seed-level bests: $354,977.15, $367,534.24, $373,676.67, $354,129.54, $354,129.54, $371,128.56 (spread $19,547.13). Independent replicates' bests: $208,635.99, $226,455.49, $247,744.92, $183,909.89, $201,015.68, $217,182.70 (spread $63,835.03).

**Half- and 1.5×-radius families under sessions (p10 net, p90 DD, draws > $35,000):**

| Row | Exported as | Small p10 | Small p90 DD | Small > $35k | Wide p10 | Wide p90 DD | Wide > $35k |
|---|---|---:|---:|---:|---:|---:|---:|
| R01 | final actual-profit/informed actual-profit/informed R3 actual-profit | $256,887.82 | $24,426.42 | 0.0% | $159,349.72 | $42,428.97 | 20.3% |
| R02 | final robust-profit | $264,631.43 | $24,154.60 | 0.0% | $179,846.44 | $49,036.97 | 28.1% |
| R03 | final balanced | $261,873.51 | $24,428.95 | 0.0% | $193,373.89 | $45,286.17 | 18.8% |
| R04 | final lower-drawdown | $147,640.58 | $18,305.75 | 0.0% | $74,784.26 | $28,039.19 | 0.8% |
| R05 | independent actual-profit/independent R3 actual-profit | $136,924.85 | $30,875.64 | 0.8% | $129,141.95 | $38,633.03 | 16.4% |
| R06 | informed R1 actual-profit | $265,378.76 | $24,560.24 | 0.0% | $162,302.01 | $47,873.28 | 28.1% |
| R07 | informed R2 actual-profit | $262,747.34 | $24,560.24 | 0.0% | $168,584.22 | $44,186.33 | 17.2% |
| R08 | informed R4 actual-profit; informed R5 actual-profit | $273,343.17 | $24,426.42 | 0.0% | $170,738.82 | $45,907.68 | 22.7% |
| R09 | informed R6 actual-profit | $257,468.71 | $24,426.42 | 0.0% | $178,866.53 | $42,064.77 | 18.0% |
| R10 | independent R1 actual-profit | $130,950.25 | $23,486.44 | 0.0% | $70,649.67 | $35,342.94 | 10.9% |
| R11 | independent R2 actual-profit | $108,851.62 | $26,754.92 | 0.8% | $66,883.54 | $40,197.87 | 21.9% |
| R12 | independent R4 actual-profit | $137,427.84 | $27,520.61 | 0.8% | $94,469.05 | $33,911.95 | 8.6% |
| R13 | independent R5 actual-profit | $157,028.24 | $28,412.06 | 0.0% | $82,640.33 | $33,815.80 | 7.8% |
| R14 | independent R6 actual-profit | $180,671.47 | $23,561.86 | 0.0% | $117,251.91 | $45,873.35 | 20.3% |
| R15 | NL0 | $236,085.16 | $35,435.10 | 14.8% | $174,589.82 | $39,737.03 | 27.3% |

**Leading winning episode blacked out (causal rerun, no new funding inside it):**

| Row | Exported as | Unit | Leading episode | Centre net | Net without it |
|---|---|---|---|---:|---:|
| R01 | final actual-profit/informed actual-profit/informed R3 actual-profit | cal | 2020-03-12 → 2020-09-04 | $340,449.39 | $220,269.69 |
| R01 | final actual-profit/informed actual-profit/informed R3 actual-profit | ses | 2020-03-12 → 2020-09-04 | $373,676.67 | $253,496.97 |
| R05 | independent actual-profit/independent R3 actual-profit | cal | 2019-10-10 → 2020-04-15 | $223,051.09 | $131,673.89 |
| R05 | independent actual-profit/independent R3 actual-profit | ses | 2019-10-10 → 2020-04-15 | $247,744.92 | $156,367.72 |
| R15 | NL0 | cal | 2020-03-12 → 2020-09-04 | $382,721.46 | $262,373.05 |
| R15 | NL0 | ses | 2020-03-12 → 2020-09-04 | $340,857.79 | $220,509.38 |
| R16 | C4 | cal | 2020-03-12 → 2020-05-14 | $302,785.91 | $205,448.15 |
| R16 | C4 | ses | 2020-03-12 → 2020-05-14 | $302,711.41 | $205,373.65 |
| R17 | C4R | cal | 2020-03-12 → 2020-05-13 | $360,569.71 | $262,824.79 |
| R17 | C4R | ses | 2020-03-12 → 2020-05-13 | $348,956.68 | $251,211.77 |

**Episode dependence of the selection neighbourhoods (128 draws, session unit):**

| Cutoff | Role | Holder | Centre leading episode | Neighbours sharing it | Median share of net inside it | Neighbours ≤ $0 | Clipped |
|---|---|---|---|---:|---:|---:|---:|
| C24 | final primary | C24/ses/informed/R3#1 profit | 2020-03-12 → 2020-09-04 ($120,179.70, 32.0% of the centre) | 99.0% | 36.0% | 0 | 81 |
| C24 | independent primary | C24/ses/indep/R3/V3#1 profit | 2019-10-10 → 2020-04-15 ($104,154.87, 42.0% of the centre) | 91.0% | 39.0% | 0 | 98 |
| C19 | fold primary | C19/ses/indep/R6/V1#1 profit | 2016-03-15 → 2018-12-19 ($90,951.37, 73.0% of the centre) | 100.0% | 71.0% | 0 | 116 |
| C21 | fold primary | C21/ses/indep/R1/V3#1 profit | 2020-02-28 → 2020-04-15 ($95,532.67, 40.0% of the centre) | 100.0% | 57.0% | 0 | 121 |
| C23 | fold primary | C23/ses/indep/R5/V2#1 profit | 2019-10-29 → 2020-04-15 ($82,424.85, 41.0% of the centre) | 100.0% | 50.0% | 0 | 86 |
