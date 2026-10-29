# Executable annual selection (brief §3, PROTOCOL §5)

Sealed sources: `results/records/repair.json` (Stage 1's picks), `evaluate.json` (Stage 1b's picks); tables
`results/tables/stage1-repair.md`, `paths-full.md`, `ledger-Pi1-S1.md`, `ledger-Pi1-S2.md`.

## 1. Stage 1's original splice, reproduced and reconciled

Stage 1's picks were re-derived read-only from its sealed selection records under its own rule (highest
neighbourhood median): A E06-9ee2ce7bd5, B E04-86b6d59a31, C E04-b4a27ac53b, D E06-47640253c0, H E06-4978efef20 — all
equal to the sealed picks. Their continuous runs (from 2017-01-03, fixed-slot) reproduce Stage 1 **to the cent** with
both Stage 1's engine (imported) and the Stage 1b engine:

| Fold | Pick | Sealed V | Stage 1 engine | Stage 1b engine | Window minute DD |
|---|---|---:|---:|---:|---:|
| A 2020 | E06-9ee2ce7bd5 | +$18,608.32 | +$18,608.32 | +$18,608.32 | $25,298.04 |
| B 2021 | E04-86b6d59a31 | +$14,576.96 | +$14,576.96 | +$14,576.96 | $24,808.14 |
| C 2022 | E04-b4a27ac53b | −$57,578.30 | −$57,578.30 | −$57,578.30 | $63,078.29 |
| D 2023 | E06-47640253c0 | +$24,646.00 | +$24,646.00 | +$24,646.00 | $18,359.46 |

Σ V = +$252.98 and the chained minute DD = $63,569.06, both by Stage 1's chaining method and by an exact chaining of
the minute-mark streams. **Why this is not an account:** each window is the increment of a different policy's run since
2017. The run that supplies 2022 (E04-b4a27ac53b) carried into 2022 a lot it had decided at the 2020-03-13 close and
filled at the 2020-03-16 opening trade (517.15 shares at $193.27) — with that lot's fixed share count, stop references
(E, Hc), campaign and re-entry state. The 2021 policy (E04-86b6d59a31) was a different policy and the 2020 policy
(E06) a different family; no account selected in real time held that lot on 2022-01-03.

**The lot, correctly described** (fixed-slot, Stage 1's own run; `stage1-repair.md`): decided 2020-03-13, filled
2020-03-16 at $193.27; exit decided 2022-01-21 by the CUSUM's own OUT, filled 2022-01-24 at $393.88. **Lifetime net
+$83,131.09** (price gain +$103,745.92, interest $20,463.01, friction $151.82). At 2021-12-31 it was worth $236,943.67
on the original $100,000 loan (L/G 0.42) with **+$117,085.47 unrealised**; its 2022 window increment was **−$33,954.39** —
a giveback of part of that unrealised gain, not a loss of principal. Its peak open profit was +$121,425.51 (giveback
from peak to exit $38,294.42); peak gross value $241,044.69.

## 2. Executable semantics (frozen)

- **S1 flat-then-adopt (primary):** at the boundary close b the old policy's pending orders and campaign are cancelled;
  an open position is sold at b+1's opening trade (`transition`); the new policy starts with no campaign and first
  decides at b's close if flat, else at b+1's close (no entry in the exit session). A first entry decided at that
  adoption close is labelled `adoption`.
- **S2 continue-old (sensitivity, required by the verdict):** an open position stays under its own policy's exits,
  stops and trims until it exits; the new policy then adopts the latest pick.
- **S3 netted re-entry (sensitivity):** if the new policy's fresh-entry rule holds at b and the old policy has no pending
  exit, the position is converted at b+1's open to B₀/C_b shares with friction only on the traded difference; the new
  trade gets fresh references (E = Hc = Hh = the fill) and a new campaign. A true transfer of the old policy's stop
  references or campaign state to a new policy is **rejected as undefined**.
- Identical re-selections are never transitioned; a missing pick is a C-IDLE window (no fold lacked a pick).
- Synthetic fixtures (F13: S1 transition timing, S2 continuation, the sell and buy branches of S3 in closed form,
  identical re-selection; F24: S2 identical re-selection, a C-IDLE window; crash-time and holiday-boundary switch
  fixtures were **not** built — disclosed, final audit F1) and fast-vs-reference parity on fold-A data with boundaries 2017-12-29 and 2018-12-31 (3,728
  runs, 0 differences) cover these rules; S2 across two boundaries was checked on a hand-built path (dev log).

## 3. Stage 1's picks as executable paths

| Path | 2020 | 2021 | 2022 | 2023 | Σ | Chained minute DD |
|---|---:|---:|---:|---:|---:|---:|
| Splice (non-executable) | +$18,608 | +$14,577 | −$57,578 | +$24,646 | +$253 | $63,569 |
| S1, fixed-slot | +$18,973 | +$18,280 | −$31,730 | +$25,437 | +$30,959 | $37,667 |
| S1, net-debit | +$18,450 | +$21,309 | −$30,572 | +$28,647 | +$37,834 | $36,672 |
| S2, net-debit | +$18,450 | +$27,608 | −$52,685 | +$41,919 | +$35,291 | $59,556 |
| S3, net-debit | +$18,450 | +$18,817 | −$30,599 | +$28,436 | +$35,104 | $36,689 |

Under S1 the account buys E06-9ee2ce7bd5 at 2020-01-02 (an adoption entry; Stage 1's run had been long since
2019-03-12), which exits by its own OUT on 2020-03-06 (−$7,714); a fresh E06 entry on 2020-06-04 is sold at the 2021-01-04
transition (+$27,164 lifetime); E04-86b6d59a31 enters 2021-01-05 and again 2021-03-10 (sold at the 2022-01-03 transition at $458.73, +$19,479), and the 2022 policy's own entries lose: stopped
2022-01-10 (−$8,173), gap-stopped 2022-02-24 (−$10,609) and 2022-10-13 (−$9,699), and a re-entry sold at the 2023-01-03
transition (−$2,525). The splice overstated the 2022 loss by about $27k (the inherited appreciated lot) and understated
the four-year result by about $31–38k. **Executed honestly, Stage 1's procedure still fails Stage 1's own rubric:** T
fails (2022 −$30,572 < −$15,000; chained DD $36,672 > $35,000) and E fails (Σ excess over principal-matched C-ALR
negative) in every convention (`results/tables/verdict.md`). Under S2 the 2021 E04 position is carried into 2022 under
its own exits and loses $52,685 — the convention matters, which is why the verdict requires S2 too.

## 4. Stage 1b's picks: executable path versus splice

| | 2020 | 2021 | 2022 | 2023 | Σ | Chained DD |
|---|---:|---:|---:|---:|---:|---:|
| Π1 (S1) | +$14,432 | +$18,059 | −$30,966 | +$11,049 | +$12,573 | $42,882 |
| Π1-S2 | +$14,432 | +$9,885 | −$38,716 | +$28,016 | +$13,617 | $44,342 |
| Π1-S3 | +$14,432 | +$15,583 | −$31,063 | +$10,865 | +$9,817 | $43,010 |
| Static path (P\*_A held) | +$14,432 | −$3,846 | −$6,303 | +$25,357 | +$29,640 | $24,616 |
| Splice of the same picks (diagnostic) | +$19,385 | +$15,742 | −$28,223 | +$16,446 | +$23,350 | $39,921 |

The splice again differs from the account (+$23,350 vs +$12,573): each pick's continuous run had been in or out of the
market at the boundary on its own history, while the account had to liquidate and re-adopt. Transitions in Π1: 2021-01-04 (E06 × XV position sold), 2022-01-03 (E03 × XV sold at $458.73, +$3,935 lifetime), 2023-01-03
(E03 × XT sold, −$5,566). Every boundary changed the pick, so S1 reset exposure three times. Π1's carried-balance
interest was −$5,032 (realised gains reduced later borrowing). The static path — one selection on 2019-12-31, no
reselection — did better than reselection (+$29,640, DD $24,616) but fails (b) and (e); it is a predeclared
descriptive check, not a candidate.

## 5. What this repair establishes

The executable account is the right object: the splice mis-stated Stage 1 by tens of thousands of dollars in both
directions. With it, Stage 1's procedure is less bad than its splice suggested and Stage 1b's procedure is worse than
Stage 1's in the same account; neither passes its own risk gate.
