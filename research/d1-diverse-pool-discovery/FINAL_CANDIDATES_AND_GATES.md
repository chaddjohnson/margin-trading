# Final candidates and gates (PROTOCOL.md §15) — training 2016–2023 only

**Outcome: no advancement.** Both procedures failed the walk-forward procedure gate (`PROCEDURE_GATE.json`), so §15.3
allows no procedure to nominate. The final round ran as training-only exploration (§15.1), and nothing is evaluated
after 2023-12-29. The sealed selection is `results/rounds/final/selection.json` (body `26b29f03…`). The frozen
record is `FROZEN_SELECTION.json` (file `9f2ec049…`, body `ae20e9844c40…`, frozen 2026-10-26T10:44:31Z, outcome "no
advancement — neither procedure passed its preregistered procedure gate GP (§14.5)", nominees `[]`).

Even setting GP aside, **no unseeded finalist passed the final gates**, and the primary may come only from an
unseeded arm. The six finalists that pass every gate are all from the seeded arms and all descend from B5. Under the
protocol they could only have been alternates, labelled "seeded from inspected benchmarks — start not walk-forward
testable".

## 1. The final gates (per procedure P, 5 bps, confirm-A n = 256)

| Gate | Rule |
|---|---|
| G1 | replay = full engine, field for field, at 0/2/5/10 bps; members in the frozen universe |
| G2 | centre minute DD ≤ $35,000 at 5 and 10 bps; training portfolio daily % DD ≤ 35% |
| G3 | ≥ 12 funded lots in ≥ 3 calendar years; every member's P-marginal > 0 |
| G4 | P50 of the neighbours' net at 10 bps > 0 and ≥ 0.80 × at 5 bps; centre net > 0 at 0, 2 and 10 bps |
| G5 | Q25 of the neighbours' net ≥ 0; centre − two largest lots > 0; centre − best regime > 0 |
| G6 | versus B4 **and** B5: ΔP50 ≥ M with paired 90% lower bound > 0 and S(C) ≥ S(B); M = $25,000, or $50,000 if portfolio DD is in (30%, 35%] |
| G7 | training portfolio end equity (symmetric, 5 bps) ≥ B5's borrowing ladder interpolated at C's borrowing dollar-days |
| G8 | centre-net change under each tie order ≤ $25,000; boundary-sitting coordinates ≤ 25% |

## 2. Every final finalist, ranked by its procedure's score (J: S_J on net; T: S_T on net_T)

| Rank (procedure) | Finalist | Members | Score S | G1 | G2 | G3 | G4 | G5 | G6 | G7 | G8 | Result | Labels |
|---|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| J #1 | J-u-f1 | EWW FXI GDX KBE XME | $324k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified |
| J #2 | J-u-f5 | EWW FXI GDX SMH XME | $311k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified |
| J #3 | J-u-f2 | EWW FXI GDX SMH XME | $302k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified |
| J #4 | J-u-f3 | EWW FXI GDX SMH XME | $299k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified |
| J #5 | J-u-f6 | EWW FXI GDX SMH XME | $296k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified |
| J #6 | J-s-f2 | GDX KRE XBI XRT | $294k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pass | — |
| J #7 | J-s-f3 | GDX KRE XBI XRT | $293k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pass | capacity-unverified |
| J #8 | J-s-f1 | GDX KRE XBI XRT | $292k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pass | capacity-unverified |
| J #9 | J-s-f5 | GDX KRE XBI XRT | $282k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pass | capacity-unverified |
| J #10 | J-s-f6 | GDX KRE VGT XBI XRT | $281k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | thin evidence, capacity-limited, capacity-unverified, brokerage-constraint pending, portfolio DD in (30%, 35%] |
| J #11 | J-s-f4 | GDX KRE XBI XRT | $271k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pass | — |
| J #12 | J-s-f8 | EWW EWZ FXI GDX KRE VGT XME | $268k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | thin evidence, capacity-unverified, brokerage-constraint pending |
| J #13 | J-u-f4 | FXI GDX XHB | $238k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | thin evidence, portfolio DD in (30%, 35%] |
| J #14 | J-u-f8 | EDV GDX SLV XLK | $214k | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | **✗** | ✓ | fail | capacity-limited, capacity-unverified, brokerage-constraint pending, portfolio DD in (30%, 35%] |
| J #15 | J-u-f7 | EWW FXI XLK XME | $185k | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | **✗** | ✓ | fail | capacity-unverified, portfolio DD in (30%, 35%] |
| J #16 | J-s-f7 | FXI ILF IWN SLV | $163k | ✓ | ✓ | ✓ | **✗** | ✓ | **✗** | **✗** | ✓ | fail | thin evidence, capacity-limited, capacity-unverified, portfolio DD in (30%, 35%] |
| T #1 | T-s-f2 | DBC GDX KRE SMH VGT XRT | $241k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | thin evidence, capacity-unverified, brokerage-constraint pending, portfolio DD in (30%, 35%] |
| T #2 | T-s-f1 | GDX KRE VGT XBI XRT | $223k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified, brokerage-constraint pending, portfolio DD in (30%, 35%] |
| T #3 | T-s-f3 | GDX KRE VGT XBI | $218k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified, brokerage-constraint pending, portfolio DD in (30%, 35%] |
| T #4 | T-s-f5 | GDX KRE VGT XBI XRT | $217k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pass | capacity-unverified, brokerage-constraint pending |
| T #5 | T-u-f1 | EWW FXI KRE MTUM SLV XME | $216k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | thin evidence, capacity-unverified, portfolio DD in (30%, 35%] |
| T #6 | T-s-f4 | GDX KRE VGT XBI XRT | $213k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified, brokerage-constraint pending, portfolio DD in (30%, 35%] |
| T #7 | T-u-f7 | EWW FXI KRE MTUM SLV XME | $208k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | thin evidence, capacity-unverified, portfolio DD in (30%, 35%] |
| T #8 | T-u-f6 | EWW FXI MTUM SLV XME | $207k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-unverified, portfolio DD in (30%, 35%] |
| T #9 | T-u-f5 | DBC GDX SLV SMH XBI | $205k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | thin evidence, portfolio DD in (30%, 35%] |
| T #10 | T-u-f3 | EWW GDX ILF VGT XBI | $205k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-limited, capacity-unverified, brokerage-constraint pending |
| T #11 | T-u-f2 | EWW GDX ILF VGT XBI | $202k | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | fail | capacity-limited, capacity-unverified, brokerage-constraint pending |
| T #12 | T-s-f8 | GDX IWF IWN | $172k | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | **✗** | **✗** | fail | capacity-unverified, portfolio DD in (30%, 35%] |
| T #13 | T-u-f4 | EWW SLV XME | $163k | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | **✗** | ✓ | fail | capacity-unverified, portfolio DD in (30%, 35%] |
| T #14 | T-s-f7 | EWW FXI IWN SLV | $121k | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | **✗** | ✓ | fail | capacity-unverified, portfolio DD in (30%, 35%] |

Fixed-pool and portfolio figures for every row are in `NEIGHBORHOOD_AND_RISK.md` §2. The machine-readable record is
`results/rounds/final/select/<arm>/assessment.json`; trade ledgers, per-year and per-member metrics are in
`results/ledgers/final-finalists.json` and `results/ledgers/final/<label>.csv`.

## 3. Why each finalist stopped

**G7 (borrowing efficiency against B5) stopped every unseeded finalist.**
- At equal borrowing, B5's 20% portfolio ends higher. For example:
  - J-u-f1: $2.23M against $2.47M;
  - T-u-f1: $1.94M against $2.38M.
- In the fixed $100k pool, 14 of the 15 unseeded finalists beat B5 at the median, by $25k–$140k; G6 (materiality)
  passed for 12.
- Measured per borrowing dollar-day in the compounding portfolio, they end below B5. A $100k-pool advantage is
  therefore not a portfolio advantage; G7 exists to catch exactly this.

**Other failures:**

| Finalist | Gate | Detail |
|---|---|---|
| J-u-f7 (EWW FXI XLK XME) | G6 | versus B5: ΔP50 −$3,243 [−$14,062, +$4,204] |
| J-u-f8 (EDV GDX SLV XLK) | G6 | versus B5: ΔP50 +$25,288 [+$13,483, +$33,735] < M = $50,000 |
| T-u-f4 (EWW SLV XME) | G6 | versus B5: ΔP50 +$32,964 < M = $50,000 |
| J-s-f7 (FXI ILF IWN SLV) | G4 | P50 net at 10 bps $91,177 vs $182,643 at 5 bps (retention 0.50 < 0.80) |
| J-s-f7 | G6 | versus B5: ΔP50 −$25,895 [−$35,793, −$18,755] |
| T-s-f7 (EWW FXI IWN SLV) | G6 | versus B5: ΔP50 −$4,229 [−$9,315, +$1,660] |
| T-s-f8 (GDX IWF IWN) | G6 | versus B5: ΔP50 +$41,504 < M = $50,000 |
| T-s-f8 | G8 | a tie order moved the centre net by $32,942 > $25,000 |

**Passing every gate (all seeded, all B5 descendants):**
- J-s-f1, f2, f3, f4 and f5: GDX KRE XBI XRT, i.e. B5 without VGT, with re-tuned parameters;
- T-s-f5: GDX KRE VGT XBI XRT, B5's own members re-tuned.

None is labelled near an inspected reference (R1/R4/the October 25 finalist GDX KRE XBI XLE).
- "Near" needs membership Jaccard distance < 0.5 **and** every shared member within 2 step units on every parameter.
  The pre-selection-freeze review recomputed the labels and agreed.
- The near misses are close:
  - J-s-f1–f5 have **R1's exact membership** (GDX KRE XBI XRT), with 4 or more coordinates beyond 2 step units (XBI
    up to 10 units).
  - J-s-f1 misses "near the October 25 finalist" by one GDX coordinate at 3.0 units.
  - T-s-f1, f4 and f5 have B5's exact membership; XRT differs from B5's by 37–42 units on one coordinate.
- In plain terms, the passing finalists are re-tunings of pools already inspected and not advanced (R1) or already
  the leading candidate (B5).

**Centre-feasible but on a drawdown cliff.** G2 judges the centre only. Several finalists have neighbourhoods whose
drawdowns breach the $35,000 limit often:
- T-s-f5 (the T hypothetical alternate): only 50% of neighbours within F1; median neighbour DD $35,042.
- J-s-f2 (the J hypothetical alternate): 67% within F1; DD90 $42,545.
- J-u-f4: 23%; T-u-f5: 22%.

## 4. Hypothetical lists (NOT nominations)

`selection.json` records what each procedure *would* nominate if it had passed GP, for exploratory reporting:
- **J:** J-s-f2 as "alternate 1" (no primary-eligible finalist; seeded — start not walk-forward testable).
- **T:** T-s-f5 likewise.

Neither procedure passed GP, so these lists carry no status. They are not forward-test candidates and were not
evaluated after 2023.

**The runner-up interval (J):** the difference between the top two passing rows (J-s-f2 and J-s-f3, which have
identical membership) is +$1,624 [−$7,168, +$10,100], within perturbation uncertainty. The
pre-final review (minor 5) noted that this compares the top two passing rows of the combined order, not the primary
against its runner-up. With no primary, it is descriptive only.

**Reading the frozen record** (pre-selection-freeze review, minor 1–2; reported, not amended):
- In `FROZEN_SELECTION.json`, the `records` map mixes two kinds of hash:
  - **body hashes** for `<window>/search`, `<window>/calibration`, `final/selection.json`, `PROCEDURE_GATE`, `PICKS`
    and the validations: verify with the record's own `bodyHash`;
  - **file sha256** for the per-arm `search.json`, `promotion.json`, `assessment.json`, `refine-f*.json` and
    `benchmarks.json`.
- `final/selection.json` holds the body hash `26b29f03…`, not the file hash `19eae964…`.
- Its `hypotheticalNominations` carry only role and key. The labels and notes are in `selection.json`'s
  `procedures.<P>.wouldNominate`, which are themselves hypothetical: sealed without a marker, covered by the frozen
  record's note.

## 5. Rejection ledger (final round)

| Stage | J-u | T-u | J-s | T-s | Reason |
|---|---:|---:|---:|---:|---|
| Credible families formed | 5,276 | 4,979 | 4,151 | 4,353 | — |
| Not reached by any slot | 5,268 | 4,969 | 4,143 | 4,345 | 8 slots per arm; by design |
| Failed promotion feasibility | 0 | 3 | 0 | 0 | far slot: three FXI VGT VPU XHB families, F-P portfolio daily % DD |
| Promoted | 8 | 7 | 8 | 8 | — |
| No finalist after pruning | 0 | 0 | 0 | 1 | T-s broad: F-P 35.16% after pruning, no feasible prune-satisfying state |
| Assessed finalists | 8 | 7 | 8 | 7 | — |
| Failed final gates | 8 (G7; also G6 ×2) | 7 (G7; also G6 ×1) | 3 (G7; G4/G6 ×1) | 6 (G7; G6 ×2; G8 ×1) | see §3 |
| Passed all gates | 0 | 0 | 5 | 1 | seeded; could only be alternates |
| Nominated | 0 | 0 | 0 | 0 | **GP failed for both procedures** |

Fold-round ledgers (picks, finalists and their gates) are in `CHRONOLOGICAL_METHOD_COMPARISON.md` and
`results/tables/round-fold-*.md`.

## 6. Fixed pool versus portfolio, in one line each (training, 5 bps)

| Configuration | Fixed $100k: centre net / minute DD | Fixed: P50 net (E1) | 20% portfolio: end equity / daily % DD (symmetric) |
|---|---|---:|---|
| B4 (default) | $242k / $29k | $128k | $1.67M / 35% |
| B5 (leading) | $388k / $27k | $209k | $2.26M / 30% |
| best unseeded J (J-u-f1) | $379k / $25k | $349k | $2.23M / 27% (below B5's ladder at its borrowing: $2.47M) |
| best unseeded T (T-u-f1) | $341k / $26k | $286k | $1.94M / 32% (ladder $2.38M) |
| best passing seeded J (J-s-f2) | $335k / $31k | $314k | $2.05M / 30% (ladder $1.91M) |
| passing seeded T (T-s-f5) | $377k / $28k | $292k | $2.17M / 30% (ladder $2.10M) |

All of this is in-sample. B4 and B5 were themselves chosen on data covering these years, so beating them in training
says little about the future (E1 at best).
