# Final comparison and recommendation — D1 ranked preemption

**Decision: no advancement.** B4 stays the default and B5 the leading incumbent. No configuration of this study is
nominated, none was evaluated on any bar after 2023-12-29, and nothing is registered for prospective monitoring:
**the forward observation count is 0** (no verified bar after 2026-10-13 exists in this repository).

Sealed record: `FROZEN_SELECTION.json` (body `ee251d7a…`), written after `results/walkforward/PROCEDURE_GATE.json`
(body `d2bd6ebd…`) failed every procedure. Protocol: `PROTOCOL.md` (frozen, body `e7f6f5fa…`).

## 1. The answers

| Question | Answer | Evidence |
|---|---|---|
| Does ranked net-breakeven preemption (P1) improve B5 with its vectors unchanged (A vs B)? | **No.** On training it *lowered* B5's net in every window (final: B-R1 $334,495, B-R2 $354,960 vs A $388,489). Out of sample it helped in fold-a (+$24.0k / +$24.6k vs B5, +$8.3k / +$8.9k vs B4) and hurt in fold-b (−$49.2k / −$63.5k vs B5). Both B procedures failed the procedure gate in fold-b. | E0 (training), E2 (reused folds) |
| Does joint optimization under P1 beat the standalone-ranked assembly (C vs D)? | **In-sample yes, out of sample not reliably.** Training: D ≫ C in every window (final D-R1 $543,069 vs C-R1 $265,683; D-R2 $431,110 vs C-R2 $179,839). Validation: R1 — D > C in fold-a (+$11.6k) but D < C in fold-b (−$20.8k); R2 — D > C in both folds (+$26.8k, +$2.9k) but D-R2 itself lost to the incumbents and broke the $35k drawdown ceiling in fold-b. H2 is "supported" (by the frozen definition) only for R2, and only descriptively. | E0, E2 |
| Does the full proposal beat the incumbents (A vs D)? | **No.** D failed F2 in both folds for both rankings (fold-a V $22.9k / $24.2k vs the better incumbent $62.2k; fold-b −$39.9k / +$9.3k vs $171.0k) and F1 in fold-b (minute drawdown $56.0k / $42.8k). | E2 |
| R1 vs R2? | **Neither is supportable.** Both fail GP. R2 is the more stable ranking across windows (Spearman over the ranked symbols 0.57–0.72 between windows vs R1's 0.09–0.41) and its D was the less bad out of sample, but no R2 procedure passed both folds. | E0, E2 |
| Would anything have been nominated if GP had passed? | **No.** Every candidate also fails N3 on 64 fresh neighbourhood draws: the share of draws keeping the minute drawdown ≤ $35k is 30–58% (≥ 75% required) and the median draw net ($196k–$230k) is far below B5's $388k centre — the in-sample optima are sharp peaks. B-R1/B-R2 also fail N2; B-R1 and D-R2 fail N4. | E1 (training neighbourhood) |

## 2. A/B/C/D for R1 and R2

Fixed $100,000 pool, 5 bps per side, 11% simple interest. **Training rows (E0) are in-sample** — D was optimized on
them, B and A use vectors chosen with 2016–2026 hindsight. **Validation rows (E2) are inspected years reused as
chronological diagnostics**, not independent proof. Validation figures are increments after the search-end close
under the liquidation convention at both ends; the validation run is continuous from 2016-01-04.

### Final calibration window (training 2016-01-04 → 2023-12-29; books armed 2017-06-15) — E0

| ID | Ranking | Members | Net (5 bps) | Minute DD | Preemptions executed (declined) | Net 0 / 2 / 10 bps | Portfolio end equity / max daily DD | Productivity ($ per $1M borrowing dollar-days) |
|---|---|---|---:|---:|---:|---|---|---:|
| A = B5 (P0) | — | VGT XBI XRT KRE GDX | $388,489 | $26,510 | — | $396,715 / $393,667 / $379,867 | $2,270,264 / 29.67% | 3,102 |
| B4 (P0) | — | VGT XBI XRT KRE | $242,196 | $28,659 | — | $249,174 / $246,625 / $233,867 | $1,677,751 / 34.65% | 2,161 |
| B1 (P0) | — | VGT | $135,359 | $19,534 | — | $137,223 / $136,477 / $133,497 | $1,375,791 / 32.78% | 1,351 |
| B-R1 | R1 | B5 vectors, P1 | $334,495 | $26,510 | 5 (11) | $340,967 / $338,620 / $327,624 | $2,003,344 / 29.67% | 2,644 |
| C-R1 | R1 | FXI XME XLI VGT IBB | $265,683 | $31,474 | 4 (10) | $269,487 / $284,006 / $246,239 | $1,773,546 / 34.36% | 2,200 |
| D-R1 | R1 | EEM EWW FXI GDX IWF KBE LQD XLK XLP XME | $543,069 | $19,568 | 20 (19) | $545,101 / $541,987 / $534,012 | $3,010,451 / 28.68% | 2,975 |
| D-R1 under P0 | — | same vectors | $353,008 | $28,922 | — | — | — | — |
| B-R2 | R2 | B5 vectors, P1 | $354,960 | $26,510 | 13 (12) | $355,935 / $351,785 / $345,501 | $2,154,559 / 30.20% | 3,291 |
| C-R2 | R2 | IWN XME XLE KIE XBI | $179,839 | $27,617 | 7 (13) | $169,604 / $175,051 / $174,474 | $1,538,964 / 32.42% | 2,153 |
| D-R2 | R2 | EDV EWY GDX ILF INDA IWF KBE SLV VOOG XHB XLK | $431,110 | $22,410 | 44 (27) | $389,625 / $385,393 / $409,114 | $2,497,756 / 27.27% | 2,558 |
| D-R2 under P0 | — | same vectors | $168,898 | $56,028 | — | — | — | — |

Per-symbol net (final, 5 bps): A — GDX $149.6k, KRE $105.4k, VGT $66.9k, XBI $53.1k, XRT $13.6k. B-R1 — VGT
$131.9k, GDX $90.8k, KRE $70.2k, XBI $26.8k, XRT $14.7k. B-R2 — KRE $125.1k, XBI $79.5k, GDX $67.1k, VGT $58.8k, XRT
$24.5k. C-R1 — XME $152.3k, FXI $56.0k, IBB $26.4k, XLI $16.3k, VGT $14.6k. C-R2 — IWN $64.8k, XME $63.9k, XBI $25.1k,
KIE $17.4k, XLE $8.6k. D-R1 — XME $197.9k, GDX $133.4k, FXI $65.2k, XLK $44.6k, KBE $40.6k, EWW $34.1k, IWF $20.5k,
XLP $5.5k, EEM $0.9k, LQD $0.4k. D-R2 — GDX $121.3k, KBE $78.9k, XLK $64.6k, SLV $61.2k, EDV $26.4k, ILF $22.9k,
VOOG $15.6k, XHB $15.3k, INDA $9.0k, IWF $8.3k, EWY $7.7k.

Exploratory incumbent-seeded arm (not nominable, B4/B5 vectors chosen with hindsight): DB-R1 (EEM GDX KRE XBI XRT)
$487,572, DB-R2 (11 ETFs) $586,644 — training only, reported for transparency.

### Chronological validation — E2 (inspected years)

| ID | fold-a V (2020-07-01 → 2021-12-31) | fold-a V minute DD | fold-b V (2022-01-01 → 2023-12-29) | fold-b V minute DD | Fold gates |
|---|---:|---:|---:|---:|---|
| A = B5 | $46,506 | $16,557 | $170,997 | $17,269 | — |
| B4 | $62,161 | $17,702 | $112,826 | $22,327 | — |
| B1 | $32,698 | $14,894 | $22,145 | $17,421 | — |
| B-R1 | $70,462 | $17,702 | $121,764 | $17,269 | fold-a pass; fold-b fail (F2) |
| B-R2 | $71,062 | $15,930 | $107,540 | $22,327 | fold-a pass; fold-b fail (F2) |
| C-R1 (control) | $11,362 | $28,677 | −$19,116 | $41,856 | not nominable |
| C-R2 (control) | −$2,622 | $14,277 | $6,464 | $27,537 | not nominable |
| D-R1 | $22,944 | $18,061 | −$39,909 | $55,955 | fail (F2); fail (F1, F2) |
| D-R1 under P0 | −$5,135 | $24,653 | −$53,694 | $77,118 | ablation |
| D-R2 | $24,209 | $20,442 | $9,323 | $42,833 | fail (F2); fail (F1, F2) |
| D-R2 under P0 | $22,745 | $18,996 | $55,572 | $33,905 | ablation |

The folds' D vectors and memberships differ from the final ones (each window re-ran the whole procedure); see
`CHRONOLOGICAL_VALIDATION.md`.

### Cost sensitivity and path dependence

P1 outcomes are **not monotone in friction**: D-R2 nets $389.6k at 0 bps, $385.4k at 2 bps, $431.1k at 5 bps and
$409.1k at 10 bps; C-R2 is similar. Friction changes which liquidation tests pass, which switches happen, and therefore
every later trade. The incumbents under P0 are monotone. This path dependence is itself evidence against reading
in-sample P1 figures as stable.

## 3. Switching economics (final training window, 5 bps)

| | B-R1 | B-R2 | C-R1 | C-R2 | D-R1 | D-R2 |
|---|---:|---:|---:|---:|---:|---:|
| Executed / declined / aborted switches | 5 / 11 / 0 | 13 / 12 / 0 | 4 / 10 / 0 | 7 / 13 / 3 | 20 / 19 / 0 | 44 / 27 / 0 |
| … replacement bought in the minute of the sale | 5 | 13 | 4 | 7 | 20 | 43 |
| Realized net of the preempted lots | $12,872 | $121,807 | $26,944 | $30,167 | $139,059 | $187,931 |
| Net of the replacement lots | $21,623 | $62,046 | $58,104 | $29,764 | $175,496 | $224,483 |
| Paired difference vs the same vectors under P0 | −$53,994 | −$33,529 | +$24,391 | +$25,282 | +$190,061 | +$262,212 |

**Frictions and interest on the two legs of each executed switch** (engine exports of `npm run ranked-preemption --
preemptions RP-final-<id>`, training data; logs `results/logs/cli-preemptions-RP-final-*.log`; table from
`python3 -I research/d1-ranked-preemption/scripts/switching_costs.py`):

| | B-R1 | B-R2 | C-R1 | C-R2 | D-R1 | D-R2 |
|---|---:|---:|---:|---:|---:|---:|
| Sale exit friction (the preempted lots) | $257 | $714 | $215 | $366 | $1,074 | $2,300 |
| Interest on the preempted lots through the sale | $482 | $4,732 | $2,562 | $573 | $7,805 | $10,548 |
| Replacement lots' friction (entry and exit) | $513 | $1,333 | $432 | $717 | $2,098 | $4,469 |
| Replacement lots' interest | $3,707 | $4,912 | $5,214 | $4,430 | $20,041 | $26,882 |

The counts and the preempted lots' nets equal the sealed controls; the replacement nets do too, except D-R2's export
($224,540), which marks one open replacement (EDV) at the last close without its $57 exit friction (sealed:
$224,483). At 5 bps the frictions are small; what decides a switch's value is the two lots' subsequent paths, which
is why the paired P0 difference, not the friction, is the relevant total.

The preempted lots are sold at or above breakeven by construction. Superseded switches: none in any final run. The
"hindsight continuation" of each preempted lot (its own-rule exit, known only afterwards) is in `results/tables/
controls-final.md` and was never used. Almost every executed switch relies on the same-minute latency assumption
(PROTOCOL §0(f), §5.3.4).

## 4. What the evidence does and does not show

- **Preemption alone hurts B5 on training and is inconsistent out of sample.** In fold-a B beat A, but the gain was
  not shown to come from switching inside the window: B-R1 executed one switch there (KRE→GDX, 2021-09-28), and most
  of its lead over A came in the second half of 2020 from the holding state carried across the 2020-06-30 boundary
  (its 2020-H2 increment equals B4's to the dollar). In fold-b it gave up a large part of B5's 2022–2023 gain.
  The P0R ablation (ranked same-minute ties without preemption) equals P0 in every window: no two of B5's books ever
  decided in the same minute while the slot was free, so the whole B-vs-A effect comes from preemption and its
  downstream path.
- **Within a jointly optimized pool, P1 adds a lot on training** (D vs its own P0 ablation: +$190k, +$262k) because the
  vectors were optimized *with* P1 active. Out of sample that benefit was mixed (fold-a D-R1 +$28.1k vs its P0; fold-b
  D-R2 −$46.2k vs its P0).
- **The joint search overfits.** The fold picks' training nets of $304k–$434k collapsed to −$40k…+$24k in their
  validation windows (the final window's $431k–$543k were never validated); neighbourhoods of the final picks are
  fragile (N3). The neighbourhood-median selection did not prevent it.
- **Standalone-derived priorities are unstable.** R1 (mean net per trade) reorders heavily from window to window
  (Spearman 0.09 between fold-a and final over the ranked symbols); R2 is steadier but its priorities did not make
  preemption profitable.
- Nothing here estimates future returns. Every figure is on inspected history; B5's GDX concentration (GDX $149.6k
  of A's $388.5k in the final window) is not assumed to recur.
- **Caveats that apply to every comparison:** the folds are reused, inspected years (E2); four procedures were tested
  in two folds (multiple comparisons — one fold pass is weak evidence, which is why GP needs both); B4/B5 were chosen
  with 2016–2026 hindsight; nearly every executed switch assumes the replacement can be bought in the same minute as
  the sale (latency assumption, PROTOCOL §0(f)); the universe's eligibility uses data through 2026 (mild survivorship in
  the early folds); the fold gates have no portfolio-drawdown test (fold-b validation portfolio daily drawdowns:
  C-R1 36.76%, D-R1 39.24%, D-R2 36.94% — reported, never gated).

## 5. What would change the decision

Only prospective evidence, or a new, separately preregistered study (for example: preemption restricted to
replacement fills strictly after the sale; priorities from a ranking that is stable across windows; neighbourhood-
robust joint objectives). This study's sealed stages are never rerun and its gates are not revisited.
