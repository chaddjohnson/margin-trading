# Walk-forward results and the procedure gate (PROTOCOL.md §13) — 2026-10-25

**Verdict: G-WF FAILED → no advancement.** The selection procedure did not show forward persistence inside training.
In fold-a the robust (J) arm's pick finished at the 40th percentile of random controls, short of the 75th that clause
(i) needs. In fold-b the J arm produced no pick at all (its only finalist failed G3), which fails clause (ii) by rule.
The final round is still run and reported as exploration (§13.4), nothing is nominated, and nothing is evaluated on
2024–2026 (§14, §15). Sealed record: `results/walkforward/GWF.json` (body `c4ed4e55…`, decided 2026-10-25T20:07:07Z).

Two folds can catch a procedure that clearly fails; they cannot certify one that passes. Here they caught one that
did not persist.

## 1. What ran

| | fold-a | fold-b |
|---|---|---|
| Search window (data physically truncated at load) | 2016-01-04 → 2020-06-30 | 2016-01-04 → 2021-12-31 |
| Validation (opened only after `PICKS.json`) | 2020-07-01 → 2021-12-31 | 2022-01-01 → 2023-12-29 |
| Universe / tier | 61 eligible symbols / E | same |
| Arms (identical seeds, budgets, universe) | J (risk-aware neighbourhood score S) and Q (peak: centre net − $5,000·k) | same |
| Discovery per arm | 12,000 configurations (J 8,286 centre-feasible; Q 8,079) | 12,000 (J 7,772; Q 8,011) |
| Pilot constants (sealed) | n_D = 12; references: floors for k ≤ 5, calibrated above | n_D = 12; floors for k ≤ 6, calibrated for k ≥ 8 |
| Families at promotion (top 300 by the arm's ranking) | J 6 (sizes 131, 97, 58, 11, 2, 1); Q 30 | **J 1 (all 298 feasible candidates)**; Q 5 |
| Refined and assessed finalists | J 4, Q 4 | **J 1**, Q 3 |
| `PICKS.json` (sealed) | `38a22096…`, 19:31:34Z | `6581e498…`, 20:00:58Z |
| `validation.json` (sealed; `picksHash` = the PICKS body hash) | `d350ea4d…`, 49 drawdown self-checks equal | `a6c3e24f…`, 47 equal |
| Wall-clock (round + validation) | 15 min + 4 min | 17 min + 4 min |

## 2. Fold results (fixed pool, 5 bps, one continuous run; V = mark at the validation end − mark at the search end)

| Fold | | Members | Search-window centre (E0) | P50_A (E1) | V | Percentile among eligible controls | Validation minute DD |
|---|---|---|---:|---:|---:|---:|---:|
| fold-a | **J primary** | EDV GDX KRE | $173,900 | $175,746 | **+$4,189** | 0.40 | $27,959 |
| fold-a | J alternate 1 | EDV GDX XRT | $184,604 | $182,239 | +$120,241 | 1.00 | $78,831 |
| fold-a | J alternate 2 | GDX IJH SMH | $171,334 | $169,202 | −$24,004 | 0.03 | $43,523 |
| fold-a | **Q primary** | EWZ GDX | $201,814 | $137,694 | **−$30,323** | 0.03 | $49,172 |
| fold-a | Q alternate 1 | GDX XHB | $180,439 | $141,572 | +$46,573 | 0.95 | $36,166 |
| fold-a | Q alternate 2 | GDX XLI | $177,505 | $62,613 | +$4,557 | 0.40 | $38,289 |
| fold-a | controls (40 eligible) | | | | ctl_0.25 $0 · ctl_0.50 $8,777 · ctl_0.75 $23,936 | | |
| fold-b | **J primary** | **none** — the only finalist (GDX IBB XME XRT) failed G3 | $271,526 | $263,243 | — | — | — |
| fold-b | **Q primary** | GDX VGT XHB | $241,844 | $200,203 | **−$39,158** | 0.00 | $68,783 |
| fold-b | Q alternate 1 | EWZ GDX XBI XLK | $241,802 | −$27,345 | −$13,506 | 0.24 | $72,067 |
| fold-b | controls (42 eligible) | | | | ctl_0.25 −$11,622 · ctl_0.50 −$3,864 · ctl_0.75 $4,565 | | |

B1/B4/B5 are reported in the full tables as **in-sample references only** — their vectors were chosen on data that
includes every validation year here (fold-a V: +$32,629 / +$62,144 / +$46,508; fold-b: +$22,145 / +$112,774 /
+$170,945). They are not comparators for G-WF and no conclusion is drawn from them.

Full tables (every finalist with E0, E1, intervals, failed gates and labels; every pick at 0/2/5/10 bps, the isolated
flat-start run, portfolio validation returns, validation-window neighbourhoods): `results/tables/walkforward.md`;
search coverage per symbol and arm: `results/tables/coverage.md`.

## 3. Why each fold came out as it did

**Fold-a, J.** All four finalists passed the fold gates. The primary was decided by the §14 tie rule: EDV GDX XRT
(S_A $167,239) and EDV GDX KRE (S_A $160,746) were within M ÷ 2 = $12,500, had equal cardinality and provenance, and the
key broke the tie. The protocol-mandated pick then earned +$4,189 over 18 months; the tie-loser earned +$120,241 but
with a $78,831 validation drawdown (most of it a lot carried open across the search end: its isolated flat-start run
lost $4,732). Neither outcome was known when the pick was frozen, and the rule is applied as written.

**Fold-b, J.** The J search converged: every one of the 298 feasible top-300 configurations contains GDX and XRT
(mostly with SLV and/or IBB), and the three linking criteria of §10.3 (membership Jaccard < 0.5, funded-trade overlap
≥ 0.5, regime Spearman ≥ 0.7) chained them into one single-linkage family. The §10.4 diversity requirements could not
add a second family: the representative (GDX IBB XRT) already satisfies the ≤ 3-book requirement, and no family
representative was ≥ 0.75 from B5's membership because no other family existed. Refinement added XME (accepted moves
must gain > $5,000); on the 256 confirm-A draws, removing XRT from the result raises S by $1,897, so XRT's smoothed
marginal is −$1,897 and G3 fails. The two thresholds are different by design (refinement removes a member only for a
gain above δ; G3 requires every member to add value), and the protocol's consequence is applied: no J pick, and
§13.4 (ii) says a fold with no J pick fails. The finalist's validation was not computed — only picks are validated,
and a post-hoc look at a non-pick is exactly what the stop rules forbid.

**Fold-b, Q.** The peak arm's pick lost $39,158 (below every eligible control) with a $68,783 validation drawdown, and
its alternate's training neighbourhood median was already negative (−$27,345 against a $241,802 centre): the peak was
a knife-edge.

## 4. G-WF, clause by clause (§13.4)

| Clause | Requirement | fold-a | fold-b | Result |
|---|---|---|---|---|
| (i) | some fold: V(J primary) ≥ ctl_0.75 and > 0 | $4,189 < $23,936 | no J pick | **fails** |
| (ii) | no fold: V(J primary) ≤ ctl_0.25 (a fold with no J pick fails) | $4,189 > $0 | no J pick | **fails** |
| (iii) | no fold: J primary validation minute DD > $45,000 | $27,959 | no J pick | recorded **fails** (see note) |
| comparator floor | ≥ 10 eligible controls with finite quantiles | 40 | 42 | met |

*Note on (iii).* The implementation counts a fold without a J pick as failing (iii) too; the protocol text says so only
for (ii). Read literally, (iii) holds (fold-a's J drawdown is $27,959 and fold-b has no J primary to exceed $45,000).
The sealed record is left as written and the outcome is unchanged: (i) and (ii) fail on their own.

## 5. J versus Q (the ablation; H1)

| Fold | V(J primary) | V(Q primary) | J − Q | Descriptive PBO, J (S = 8 / 16) | PBO, Q (S = 8 / 16) |
|---|---:|---:|---:|---|---|
| fold-a | +$4,189 (40th pct) | −$30,323 (3rd pct) | +$34,511 | 0.63 / 0.78 | 0.60 / 0.70 |
| fold-b | no pick | −$39,158 (0th pct) | — | 0.49 / 0.61 | 0.94 / 0.97 |

Where both arms picked (fold-a), the neighbourhood-scored pick did better than the peak pick, and in both folds the
peak pick finished in the bottom 3% of random unoptimized controls with validation drawdowns above $45,000 — selecting
on peak net persists worst. That is weak evidence *for* the study's premise that peak selection overfits. But the
robust arm did not persist well either: one fold at the 40th percentile and one fold with no pick. H1 is **not
supported** at the level G-WF requires, and the evidence is one paired comparison. The PBO figures (CSCV on quarterly
attribution of each archive's top 1,000) are descriptive; the Q arm's fold-b archive is the most overfit (0.94).

## 6. Caveats

- **The controls are random, unoptimized configurations**, and the percentile compares one pick with them on 18–24
  months. The validation V of a single pool rests on 17–36 funded lots; one lot can move it by $10k–$30k.
- **V carries state across the search end** (one continuous run, as specified); a lot opened before the cut and closed
  after it counts in V. The isolated flat-start run is reported beside it in the full tables.
- **Fold-b's J outcome turned on a $1,897 marginal** in a family the search had converged on. A different, equally
  defensible family-linkage or acceptance rule could have produced a pick; this protocol's rules did not, and no rule
  is changed after the outcome.
- The fold-a primary is labelled capacity-limited (EDV); in a fold that is a label, not an exclusion. Several fold
  finalists are thin evidence (a member with < 3 virtual trades, < 2 funded lots or lots in < 2 regimes).
- The portfolio figures in the full tables (validation return on own base; maximum daily % drawdown from 2016 to the
  validation end) are descriptive; no portfolio rule enters G-WF.
