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
