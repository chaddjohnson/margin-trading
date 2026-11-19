# Frozen selection policies (Stage 2) — optimization-process audit

Frozen by `results/stage2/POLICY_FREEZE.json` (sealed and committed) **before any non-published next-slice outcome**.
Implementation: `src/optimization-process-audit/policies.ts`; tests: `src/optimization-process-audit/tests/policies.test.ts`.
These are **experimental policies of this audit only** (PROTOCOL.md departure D2, citing the brief). They change nothing
in the optimization standard, in ordinary studies or in any sealed verdict.

## Common rules (PROTOCOL.md §7.1–§7.2)

- **Universe:** E(s, c), the subject's sealed qualified independent set at the cutoff. The source gates stay intact;
  every policy only re-ranks E. Confirmation statistics are never read (they decided qualification once).
- **Inputs:** the §6 feature menu only (training door of the cutoff). No next-slice, validation, later-cutoff or C24
  information at an earlier cutoff.
- **Final tie-break of every policy:** the subjects' profit order (centre net ↓, selection robust net ↓, centre DD ↑,
  label ↑), so every choice is unique and independent of input order.
- **No selection:** only if no member is admissible (P1) or E is empty; the slice is then flat (uninvested) and
  reported as such.
- **Training-length normalization (single rule):** each score ranks the members of one cutoff only; the only dollar
  threshold is the fixed $35,000 drawdown budget; subperiods are calendar years; nothing depends on the cutoff.
- **Shortlist and reporting:** for every policy and cutoff the full score table of E is sealed in `CHOICES.json`
  (admissible flag, score); reports show the choice, the top five by the policy's order, and every E member with a
  higher training centre net that the policy rejected ("attractive candidates rejected").

| Key | Family | Name | Exact formula |
|---|---|---|---|
| P0 | reference | actual profit (unchanged original rule) | the highest centre net in E; ties by profit order |
| **P1** | severity-aware | **tail-mean-constrained actual profit** | admissible iff the selection family's **worst-10% mean DD** (the mean of the ⌈0.1 n⌉ largest maximum minute drawdowns of the pooled, de-duplicated 2 × 128 selection draws) **≤ $35,000**; choose the admissible member with the highest centre net (profit order). No admissible member → no selection. |
| **P2** | subperiod consistency | **best-year-excluded neighbourhood profit** | score = the **median over the pooled selection draws of (draw net − that draw's best calendar-year marked P&L)**; choose the highest score; ties by profit order. |
| **P3** | episode sensitivity | **profit without new funding in the leading episode** | score = the centre's **causal net from a rerun that refuses every new decision inside its largest winning pool-level episode** (window: the episode's first decision session → its last exit; a member without a winning episode scores its centre net); choose the highest score; ties by profit order. |

## Why these three (Stage 1 evidence; `results/stage1/mechanism.json`, `reproduction.json`)

- **Neighbourhoods reproduce one episode.** Among the 27 published role holders and C24 independent roles, the share of
  selection rep-1 neighbours whose own largest winning episode overlaps the centre's is 0.78–1.00 at every cutoff from
  C21 on (0.26–0.98 at C19), and in 4A the median neighbour earns 64%–104% of its net inside the centre's
  leading-episode window. Every neighbour is a distinct ledger (≈ 256 / 256), so duplicate ledgers did not inflate the
  instrument; what the instrument measured was insensitivity of **one episode's capture** to small parameter changes.
  → P3 removes the leading episode causally; P2 removes each neighbour's best calendar year, at neighbourhood level.
- **Heavy selection tails at the failed C19 choices.** Both C19 primaries had selection p90 DD just under the ceiling
  ($32,047.12 and $33,344.06) and a worst-10% mean above it ($37,801.79 and $35,178.86), i.e. the p90 gate passed a
  tail whose mean severity exceeded the budget. → P1 asks whether tail severity adds information beyond the p90 gate.
- **One market regime.** The C21 primaries earned most of their training net in 2020 (3B $129,849.94 of $264,501.50;
  4A $107,230.48 of $127,595.98) and lost in 2022–2023. → P2 (calendar subperiods) and P3 (the episode) both test
  whether withholding the dominant period ranks better candidates.

## Expected trade-offs (stated before any outcome)

- P1 changes a choice only where the most profitable member has a heavy selection tail; it surrenders the profit
  difference to the most profitable admissible member and can abstain if none is admissible (in E none is empty:
  25–37 of 38–40 members are admissible in 3B, 4–9 of 5–9 in 4A).
- P2 and P3 favour members whose training profit is spread over years or episodes; they surrender training profit
  concentrated in the 2020 rebound, possibly much of it. **P2 and P3 measure related things** (in 4A the best year
  usually contains the leading episode), so their agreement is not independent evidence; with three policies tested,
  one apparent success could be chance (multiplicity), which the frozen two-subject, repeated-slice rule guards against
  only partly.
- No policy fixes an execution or engine issue; none changes what the search discovered.

## Known before the freeze (disclosure)

The published fold outcomes of the original role holders (P0 and the robust, balanced and lower-drawdown roles) and
the Stage 1 features of every E member are known. Each policy's choices were computed only once, by the freeze
command, after this file and `policies.ts` were written; no alternative formula was evaluated.
