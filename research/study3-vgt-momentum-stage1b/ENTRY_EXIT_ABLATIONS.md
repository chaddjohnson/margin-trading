# Entry × exit ablations (brief §5 "factorial isolation", §7A; PROTOCOL §7.2)

**Descriptive and in-sample.** The L-A matrix of each history crosses the 13 panel entries (all twelve Stage 1 families
and C-SMA, at Stage 1 defaults) with 20 exits at defaults (11 optimised families, XF-T, XM20/60/120/250, XD-P, XD-T,
B-D1T, B-D1N), R3F, Z0, plus every entry × XF under the other nine re-entry rules. It chooses nothing except P0. Shown:
history H (2017-01-03 → 2023-12-29, net-debit, 5 bps, 11%); every row is in `results/tables/screening-H.md` and the
fold histories' matrices are in each `develop-<F>` selection payload.

## 1. The matrix (net / minute DD, thousands of dollars)

| Entry | XF | XF-T | B-D1T | B-D1N | XV | XS | XT | XRD | XE | XU | XP | XO | XD | XD-P | XD-T | XM20 | XM250 | XRP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E01 | +41/40 | +36/31 | +54/22 | +68/25 | +51/18 | +86/29 | +59/23 | +68/36 | +103/29 | +61/42 | +39/17 | +58/28 | +57/28 | +58/28 | +32/21 | +11/34 | +36/46 | +66/43 |
| E02 | +44/44 | +39/35 | +58/27 | +94/26 | +48/18 | +107/32 | +62/28 | +38/52 | +104/36 | +43/53 | +24/26 | +109/31 | +60/32 | +61/32 | +35/25 | +7/29 | +37/60 | +50/51 |
| E03 | +37/31 | +44/27 | +66/28 | +48/29 | +64/21 | +118/31 | +63/30 | +83/29 | +135/34 | +57/33 | +53/21 | +35/34 | +72/23 | +73/23 | +43/31 | +32/22 | +108/40 | +70/61 |
| E04 | +7/43 | +11/39 | +29/32 | +5/53 | +30/31 | +73/45 | +60/42 | +55/34 | +76/39 | +4/68 | +13/32 | +9/50 | +43/37 | +43/37 | −2/44 | −4/39 | +16/56 | +18/53 |
| E05 | +51/27 | +57/23 | +73/22 | +95/24 | +66/23 | +105/29 | +71/28 | +87/30 | +72/37 | +51/37 | +69/23 | +92/39 | +55/33 | +56/33 | +48/24 | +41/22 | +69/48 | +77/72 |
| E06 | +37/28 | +45/26 | +79/20 | +57/20 | +91/16 | +121/31 | +61/26 | +68/38 | +129/23 | +68/36 | +65/20 | +32/26 | +65/25 | +66/25 | +72/20 | +19/29 | +93/35 | +78/37 |
| E07 | +16/35 | +16/33 | +41/32 | +20/31 | +35/26 | +105/31 | +51/30 | +56/40 | +122/33 | +41/34 | +6/35 | +15/36 | +57/25 | +58/25 | +15/36 | −18/39 | +81/40 | +60/37 |
| E08 | +18/37 | +21/33 | +40/24 | +89/31 | +40/17 | +83/29 | +47/24 | +12/43 | +89/29 | +39/38 | +20/18 | +75/34 | +41/27 | +42/27 | +15/25 | +6/23 | +44/40 | +46/40 |
| E09 | +62/55 | +57/59 | +124/44 | +80/53 | +112/49 | +136/60 | +96/59 | +138/51 | +149/50 | +129/62 | +106/59 | +72/64 | +133/49 | +131/49 | +72/64 | +87/45 | +112/55 | +108/87 |
| E10 | +14/22 | +14/22 | +36/23 | +18/22 | +32/18 | +81/30 | +42/25 | +32/45 | +76/30 | +31/40 | +23/20 | +13/22 | +41/30 | +42/30 | +13/22 | −15/40 | +19/48 | +49/44 |
| E11 | +38/32 | +46/25 | +58/25 | +79/24 | +75/25 | +85/39 | +75/26 | +57/38 | +70/42 | +71/40 | +51/24 | +70/36 | +57/31 | +58/31 | +52/25 | +30/25 | +33/49 | +55/43 |
| E12 | +21/34 | +13/29 | +23/22 | +11/29 | +30/20 | +59/29 | +55/23 | +55/33 | +42/31 | +33/29 | +22/22 | +36/38 | +49/22 | +49/22 | +25/30 | −4/27 | +6/48 | +31/63 |
| C-SMA | +55/40 | +49/39 | +59/31 | +92/28 | +61/28 | +91/52 | +76/38 | +42/55 | +95/40 | +72/42 | +37/38 | +103/44 | +75/37 | +75/37 | +19/54 | +12/38 | +109/32 | +95/56 |

128 of 260 R3F cells meet the center feasibility (DD ≤ $35k, ≥ 6 closed trades, ≥ 3 campaigns, ≥ 3 years, net > 0);
49 of the 377 screening runs duplicate another run's trade path (duplicate mechanisms, not independent evidence).

## 2. Controlled comparisons (common entry, different exits)

- **Slow structural and appreciation-aware exits earn most in-sample, at moderate drawdown.** XS (rising floor) and XE
  (exposure-scaled trail) top almost every row (E06: +$121k/$31k and +$129k/$23k), with 3–6 trades: they hold long trends.
  Their in-sample strength is the 2017–2021 advance; the same property carried Stage 1 into 2022.
- **A 7.3% immediate trail (B-D1T) beats the template default XF (h 8%, t 10%, own OUT) for every entry**, mainly because
  own OUT ends E06/E03 positions early; XF-T at t 8% sits between them. The D1-style profit-conditional benchmark B-D1N is
  better than B-D1T for six entries and worse for seven — no consistent edge from deferring the stop until a profit.
- **XV (volatility trail) gives the lowest drawdowns for calm-advance entries** (E06 $16k, E08 $17k, E10 $18k).
- **Price vs trend damage:** XD at its default (AND) ≈ XD-P (price damage alone) — the trend condition rarely adds a
  constraint once price damage holds; XD-T (trend damage alone, 20-session low) is a much faster exit and earns less for
  most entries (E06 is the exception: +$72k/$20k).
- **Negative control:** a fixed 20-session hold (XM20) is the worst exit for 12 of 13 entries; XM250 earns well but with
  the largest drawdowns — time in the market, not timing.

## 3. Common exit, different entries

E09 (trailing buy) is profitable under every exit but never meets the $35k drawdown (44–87k): it is nearly always long
(90–99% of sessions). E04 (CUSUM) is the weakest entry under most exits; E06, E03, E05 and E01 are the most consistent.
C-SMA (the conventional control) is competitive in net but at higher drawdown than E06/E05.

## 4. What the ablations are not

They are in-sample on a known history, at default parameters, with one re-entry rule; they motivated nothing after the
freeze (the pairing set and boxes were frozen before any run). They show *which mechanisms differ*, not which generalise:
the chronological replay (`NEIGHBORHOOD_AND_CHRONOLOGY.md`) is the test, and it failed.
