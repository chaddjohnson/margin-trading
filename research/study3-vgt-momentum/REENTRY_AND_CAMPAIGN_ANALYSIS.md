# Re-entry and campaign analysis (brief §5 "important challenge", §6.7)

Sources: sealed `evaluate-{A..D}.json` (the fold picks with R1/R2/R0 swapped in, descriptive), `diagnostics.json` (M2R:
E01, E02, E07, E11 at defaults with CX1 under R0–R5, full history, in-sample), `robustness.json` (finalists with R1/R2/R0).
Campaign = a first entry (no live campaign) plus every re-entry while that campaign stayed alive (`PROTOCOL.md` §3).

## 1. First entry or re-entry?

| Fold pick | First entries / re-entries in the window | Window V | V with R1 (fresh only) | R2 (10-session cool-down) | R0 (immediate) |
|---|---|---:|---:|---:|---:|
| 2020 E06 | 1 / 0 | +$18,608 | +$18,608 | +$18,608 | +$18,608 |
| 2021 E04 | 1 / 0 | +$14,577 | +$14,577 | +$14,577 | +$14,577 |
| 2022 E04 | 2 / 1 | −$57,578 | −$54,263 | −$78,880 | −$85,019 |
| 2023 E06 | 3 / 0 | +$24,646 | +$24,646 | +$24,646 | +$24,646 |

The selected picks exit mostly through their own OUT signal, after which only a fresh signal can enter, so the
re-entry rule rarely applies. In the one window where it did (2022), every re-entry rule lost more than R1's
"no re-entry inside a campaign". Immediate re-entry (R0) was worst, adding −$27,441: re-buying a falling market after
each stop. In this replay, the outcome was decided by first entries and their exposure, not by re-entry (2022's loss
was mainly a carried first-entry lot, `CHRONOLOGICAL_RESULTS.md` §3).

All seven lots of the in-sample H pick (E06) were fresh first entries (no re-entries); its full-history R1/R2/R0
variants are identical (+$120,096 each, `robustness.md`).

## 2. Re-entry rules at fixed entries and exits (full history, defaults with CX1: hard 8%, trail 10%)

| Rule | E01 peak proximity | E02 financing hurdle | E07 breakout acceptance | E11 durable permission |
|---|---:|---:|---:|---:|
| R0 immediate | +$25,104 ($43,754) | +$50,021 ($37,669) | +$15,737 ($39,597) | +$32,910 ($37,730) |
| R1 fresh signal only | +$34,049 ($35,659) | +$34,875 ($28,952) | +$18,690 ($38,743) | +$22,558 ($34,980) |
| R2 10-session cool-down | +$24,471 ($36,512) | +$40,559 ($43,383) | +$18,690 ($38,743) | +$25,266 ($32,272) |
| R3 reclaim the stopped high | +$28,123 ($41,585) | +$31,017 ($45,153) | +$18,690 ($38,743) | +$22,558 ($34,980) |
| R4 half the pullback recovered | +$21,797 ($38,102) | +$39,863 ($35,973) | +$18,690 ($38,743) | +$22,558 ($34,980) |
| R5 none until own OUT | +$34,049 ($35,659) | +$34,875 ($28,952) | +$18,690 ($38,743) | +$21,370 ($26,862) |

Net, with the minute drawdown in parentheses.

- **The level families** (E01, E02) are the only place where the re-entry rule mattered a lot. E02 with R0 earned the
  most (+$50,021, 12 re-entries, 75% exposure), but lost −$19,916 in 2022. R1/R5 (no re-entry, 28% exposure) earned
  +$34,875, sat out 2022 entirely (2022 change $0) and had the smallest drawdown. In these runs, renewed participation
  is a bet on the regime, not a free improvement.
- **The event family E07** almost never had a live campaign to re-enter: a 10% decline from the high usually also
  makes a 20-session low close, which ends the campaign. R1–R5 are therefore identical, and R0 differs by one
  re-entry.
- **E11** (permission + fast trigger), the K-style renewable campaign: R0 renewed 13 times for +$32,910 but lost
  −$23,521 in 2022; R5 renewed none (+$21,370, $26,862 drawdown, 2022 $0).
- **Missed post-stop gains.** The leg ledger (`TREND_CAPTURE…` §2) shows the H pick's lost post-stop gain was 0% on
  every leg (it never stopped out: 0 stop fills). C-SMA's was at most 3.3% per leg. The stop-and-wait cost the brief worried about was small
  for these rules; the larger cost was late first entries after crashes.

## 3. Campaign economics (full history, defaults; `diagnostics.md` "Campaigns" and "Re-entries")

Under CX1 the families made 4–26 campaigns with 0–10 re-entries; under CX2, more re-entries (E05: 5 campaigns and 18
re-entries; E11: 4 and 24). More renewal raised turnover (friction $0.8–2.8k; E09 $6.4k) and exposure, without a
consistent net effect: E05 CX2 +$34,136 vs CX1 +$25,062 and E11 CX2 +$33,999 vs CX1 +$22,558, but E02 CX2 +$26,737 vs
CX1 +$31,017. Full trade-by-trade campaign ledgers, losing restarts included, are in the `rows` payload of
`diagnostics.json` and in the fold payloads (`evaluate-*/runs.json.gz`).

## 4. Hysteresis (brief J) and churn

Single-threshold versions churned. E02 with a_gap = 0 made 62 lots (vs 10) and turned +$31,017 into −$7,711. E01 with
d_gap = 0.1% made 60 lots and earned less (+$20,733 vs +$28,123), though its drawdown fell to $16,836, because it was
rarely invested for long. Hysteresis reduced churn substantially. It did not by itself protect against 2022 (E02
hysteretic −$10,718, single-threshold −$5,003).
