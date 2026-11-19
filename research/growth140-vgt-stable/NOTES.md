# Working notes — growth140-vgt-stable (narrative; the sealed records under results/ are authoritative)

## Audit (sealed `results/audit/audit.json`, tables `results/tables/audit.md`)

- Archive: 427,894 configurations, 23,235 centres (r1 23,040; r2 192; refine 213; r3 48; r3+r3b 8), 404,659
  neighbour-only points; 6,369 island duplicates. Manifest and all shard hashes verified.
- **Rise was barely explored and never promoted.** Rung-1 centres: rise 1,962 vs breakout 21,078 (the islands
  drifted to breakout). Zero rise centres were feasible under the old rules (every one failed the neighbourhood-median
  floor and the concentration rule except 2/1,962 that failed only the median); 336 are feasible under the new rules
  (16 draws); none reached rung 2. Breakout: 5,362 old-feasible → 15,559 new-feasible; 192 reached rung 2.
- Old rung-1 reasons (overlapping), rise: median floor 1,950, concentration 1,935, stability 1,649, capital efficiency
  1,337, activity 1,214, drawdown 357. Breakout: median floor 14,731, concentration 9,824, stability 6,066.
- Crowding: rung 2 = 127 breakout/hold-off/gate-off + 65 breakout/hold-on/gate-off; rung 3 = 47 + 1; shortlist 6
  breakout/hold-off/gate-off. No gate-ON or Rise structure reached rung 2.
- Best centre net with DD ≤ $35k: rise $109,754 (44bf6d2e, 16 draws, fragile); breakout $155,375.

## Audit re-evaluation (sealed `results/audit/reeval.json`; draws `audit`, 256 + 384)

- 31 configurations: 24 audit candidates + #4 + 6 prior frozen. 26 qualified (G1–G5), 5 fail G3 (p90 > $35k).
- #4: confirm median $42,782.80, p10 $9,605.88, p90 $22,760.06 → qualifies (rank 26 of 26).
- Best rise: `06baffd6897b6fe0` (rise, hold OFF, gate OFF, cont shallow_pullback): centre $97,522.28, DD $27,434.69,
  select robust $89,680.47, confirm median $95,986.66, p10 $85,737.10, p90 $32,374.16; 8 trades (5/2); top episode
  49% of net. Rank 7.
- Best breakout: a7f0a450 (robust $100,606), 3bd5a407 ($101,603), 0c7f46c1 ($95,167); prior C1 ec124684 $91,595.

## #4 sensitivity (sealed `results/sensitivity/sensitivity.json`)

- Reproduction exact ($92,575.71 / $14,578.10).
- Not the cause: recovery retracement (fine scan 38–52: $83,985–$95,738, never > $10k change; 44.9/45.1 within $352)
  and the 2.9% buffer (no effect at all on development; 2.3–3.5 identical ledger).
- Sensitive (share of fine points moving net > $10k): trailing stop 54% (5.9 and 6.4 already break it), recent-low
  lookback N 46% (93 breaks), trend minimum return 43% (−1.7 breaks), ATR multiple 38% (1.3), X 32% (4.2), trend
  lookback 27% (31), eligibility age 20% (17), dip threshold 19% (10.9).
- Strong interactions: N × X (mean |interaction| $14,868), trend min return × trend lookback ($12,403).
- Joint: all@1 median $44,348.68 / p10 $10,993.24 (matches the prior study's $44.5k/$12.0k); all@0.25 already
  median $68.2k; named-7 jointly median $67.8k; the other 14 jointly $57.9k; top-6 jointly $44.0k → the low median is
  driven by the sensitive Rise-entry, trailing-stop and trend-filter inputs jointly, not retracement or buffer.
- Mechanism: the decisive points lose #4's 2020-06-26 winner (+$14,064) or, in the worst joint points, the
  2016-06-29 → 2018-02-05 winner (+$42,826, 46% of net): the entry timing in mid-2016 and the eligibility/trend
  decisions around it carry the centre's profit.
- Regional scan (64 draws): #4 robust $25,514; best nearby `da3fab879d969011` robust $44,215 (centre $97,622, DD
  $16,526, p90 $26,403); trailing stop +1 R robust $38,024; N −1 R $37,441. A nearby region improves the neighbourhood
  modestly; nothing near #4 approaches ≈ $90k robust.

## C19 (train 2016–2019, slice 2020–2021)

- Search 364,211 fresh evaluations (34 min); global/rise extended to 3 islands; all 18 shortlist members qualified.
- Primaries: global = global-breakout = all `e6bd6602562b2d6a`; global-rise `f9593d0302262402`; informed =
  informed-breakout `a3b0e354f61dbd33`; informed-rise `6b4b904d4cdb19dc`.
- Slice: e6bd6602 +$54,746 (slice DD $43,552 > ceiling); f9593d03 +$104,112 (DD $35,453); a3b0e354 +$34,121 (DD
  $25,677); 6b4b904d +$36,007 (DD $35,976); #4 +$26,604 (DD $9,501); prior primary +$33,733 (DD $17,773).

## C21 (train 2016–2021, slice 2022–2023)

- Search 360,304 fresh (16:14Z end); all 20 members qualified on 2016–2021.
- Primaries: global = global-breakout = all `24da107fc8b9ba04`; global-rise `8d5718573b5d0733`; informed =
  informed-rise `3bd8dba188107826`; informed-breakout `def6c323c5d0cb84`.
- Slice: 24da107f −$26,584 (slice DD $60,326); 8d571857 −$20,112 (DD $54,849); 3bd8dba1 −$6,831 (DD $37,261);
  def6c323 +$5,091 (DD $29,720); #4 +$7,604 (DD $6,578); prior primary +$8,050 (DD $16,768). Most global members held a
  carried-in position through 2022 (no new entries in the slice) — training profit $96k–$190k did not transfer.

## C23 (train 2016–2023, slice 2024) and the sequential policies

- Search 369,005 fresh (17:20Z end); 20/20 qualified. Primaries: global = global-breakout = all `48c7c0e9cd500dfd`;
  global-rise `da5a7527c44ef5b6` (no position at all in 2024); informed = informed-breakout `9fb4b0da95f0f712`;
  informed-rise `3886d486e9c64f98`.
- Slice 2024: 48c7c0e9 +$909 (DD $15,163); da5a7527 $0; 9fb4b0da +$14,034 (DD $14,778); #4 +$9,853 (DD $10,047);
  prior primary +$25,099 (DD $13,028).
- Sequential (2020–2024): global $28,871.36 (DD $61,437.15); global-rise $83,849.29 (DD $57,011.94); informed
  $41,124.07 (DD $38,007.71); informed-rise $31,349.08 (DD $37,992.90); informed-breakout $53,046.35 (DD $29,720.50);
  #4 $44,060.66 (DD $14,578.09); prior primary $66,881.91 (DD $17,772.79). **No eligible global policy → the final
  primary is chronologically unsupported** (PROTOCOL.md §7.5). Informed policies are diagnostics (later information).
