# AMENDMENTS — walk-forward robustness failure investigation

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect.

## A1 — 2026-11-13T18:51:10Z — simulation caps; D6 source; dry runs disclosed

- **Change.**
  1. D7 cap raised from 3,500 to 4,000 fresh simulations; the overall cap from 4,200 to 5,000 (`STANDARD_ADOPTION.json`
     is not re-issued: its budget field is the protocol's original cap and this amendment supersedes it for the record).
  2. Clarification of PROTOCOL.md §4 ("replays of them are allowed only for trade-level features (§6 D4)"): the
     reference should read **§6 D6**. D6's training-period features of alternatives come from the same continuous
     evaluation-door run (equal to the training-door run through the boundary by causality, verified for every fold
     primary by gate G3's causal-prefix check: 12 of 12 equal field for field), not from separate training-door runs.
  3. Disclosure: the `--dry` checks before each sealed stage ran in-process in the Claude session's scope, not in a
     systemd unit (peak RSS 1.3–1.9 GB each, under 25 s each); every sealing run ran in a `vgwfd.slice` unit.
- **Why.** The D7 parity check (regenerating each fold primary's sealed selection family with its study's own code and
  seeds) was dry-run on three subjects (5B C21, B1 C21, SES C21: 768 simulations) before the full 12-subject run (3,072),
  so D7 needs 3,840 in all. Every check passed (sealed median, p10 and robust net reproduced to the cent).
- **Results existing at this time.** Sealed: protocol freeze, gates (G1, G2, G4/D2), primaries' replays, session replays;
  D5 selection trace dry-run (unsealed). Unsealed D7 dry outputs for the three subjects above (their outcomes were seen:
  slice breaches 178/256, 241/256, 256/256). No criterion, subject, door or statistic changes; nothing is selected; the cap
  change only allows the planned run to complete.
- **Simulations so far (before the D7 sealed run):** primaries 58 + 71 dry and 71 sealed; session 21 dry and 21 sealed;
  D7 768 dry — 1,010 in all.

## A2 — 2026-11-13T18:57:51Z — D9 market-regime description (data only, no simulation)

- **Change.** Adds D9: a descriptive table of the VGT and GDX price regimes in each training window (2016–2019,
  2016–2021, 2016–2023) and slice (2020–2021, 2022–2023, 2024), from the engine's own session closes of door D24
  (Priority 3's `openPrefixDoor`; development data only): total return, maximum close-to-close drawdown with its peak,
  trough and duration, the worst 15- and 30-calendar-day close-to-close declines (the exposure window of a D1 lot held to
  its maximum hold), distinct peak-to-trough declines of 15% and 20%, and the share of sessions below the 200-session
  simple moving average. Report-only; it chooses nothing and changes no criterion.
- **Why.** Hypothesis H2 (regime sensitivity) needs an objective statement of what the training windows did and did not
  contain; the sealed records describe strategies, not markets.
- **Results existing at this time.** Sealed: protocol freeze, gates, D3/D4 replays (primaries, session), D5, D6, D7, D8.
  Their outcomes were seen (the breaching episodes are 2020-02/03 and 2022). The regime metrics above were chosen as the
  standard descriptive set for dip-buying exposure before computing them; no metric is added after seeing its value.
