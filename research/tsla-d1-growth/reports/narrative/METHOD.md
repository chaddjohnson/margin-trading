## 2. What was fixed, and what was searched

**Fixed (PROTOCOL §5; decision register P2).** The program's accepted engine, unchanged: one exclusive, fully funded $100,000
trading slot, granted only at a decision's own instant when nothing is open or reserved; at a same instant D1 decides first,
then Growth; no compounding, preemption or forced switch; 5 bps per executed side inside the fill prices; 11 % simple
interest on outstanding principal by calendar day; stops at the stop level or the gapped open; fractional shares; calendar-day
maximum holds; D1's shadow lifecycle and Growth lifecycle L0; shadow-entry eligibility OFF; S1 absent. Both engine slots
carry one TSLA data door; the VGT-slot books (D1·VGT, Growth·VGT) trade TSLA and the GDX books are disabled, so no evaluation
file changed (gates E1, E4, E6). Risk is the marked minute drawdown in dollars of the fixed $100,000 allocation (P0: ≤ $35,000
= 35 %), never a percentage of peak equity.

**Searched (PROTOCOL §6–§7).** The original parameter domains: Study 8's D1 box, Assignment 2's RC 2 control families,
Growth 1.4.0's complete genome on growth140's boxes (75 genes: 11 categorical, 64 ordinal). Five arms, each with protected
cells that get identical budgets:

| Arm | What it searches | Cells | Base replicates | Base broad lanes per cutoff |
|---|---|---:|---:|---:|
| D — D1 standalone | D1·TSLA (Growth off): D1 family A–D × decline gate | 8 | 4 | 32 |
| G — Growth standalone | Growth·TSLA (D1 off): exit protection {hold off; hold on, buffer off; hold on, buffer on} × initial ATR stop | 6 (`G.h0.s0` = unrestricted) | 8 | 48 |
| C — fixed combination | every pair of D's and G's finalists (≤ 3 each), vectors unchanged, one slot — **no search** | ≤ 9 pairs | — | — |
| J — fully joint | D1 and Growth together | 48 (8 × 6) | 4 | 192 |
| S — D1-first sequential | arm D's finalists frozen (≤ 3: primary, robust-profit, balanced role), Growth searched in the shared slot against them | 6 per frozen D1 | R_S(F) = max(4, ⌈160 ÷ 6F⌉) | ≥ 160 (with D's 32 lanes ≥ J's 192) |

Each lane is the New L0 method's (NL0 1.0.0) unchanged per-lane schedule (screen 512 → plausibility → promotion 64 → rung 1 →
islands → rungs 2 and 3 → refinement → shortlist), with Priority 5's two-tier stopping. **Tier 1:** a lane runs another
island while NL0's trigger fires, up to NL0's caps (6 broad, 8 refinement), and beyond them up to 16 islands only while a
performance component (> 5 %) fires. **Tier 2:** a replicate round of every cell of an arm runs while the last replicate
raised the arm's union of feasible fits by > 2 % (≤ 4 rounds). A stage-2 refinement then runs 4 informed lanes in each of up
to D 8 / G 6 / J 16 / S 12 cells chosen by a frozen rule from the arm's qualified broad members. A search with > 10 % of its
lanes at the 16-island cap, or one that ends at the replicate cap, is labelled "budget-limited (not converged)".
**Budget exhausted is never described as convergence.** Hard ceiling: 120 M requested official evaluations (a safeguard).

**Qualification and selection (PROTOCOL §9–§10).** Every member that reaches a lane's shortlist is qualified on its own
cutoff's development door with gates Q1–Q6: Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 confirmation p90 DD ≤ $35,000 over
3 × 128 neighbourhood draws; Q4 confirmation p10 net > 0; Q5 at 10 bps per side centre net > 0 and DD ≤ $35,000; Q6 every
family of the arm funded at the centre. **The same selection rule applies to every arm** — NL0's original rule: the primary
is the qualified member with the highest centre net (ties: selection robust net, lower DD, label); roles robust-profit,
balanced and lower-drawdown from the selection families. RA1, an experimental risk-aware rule, is computed on the identical
populations and is report-only. External controls (New L0's and N/original's VGT books projected unchanged onto TSLA) are
qualified and replayed beside the arms, never selected.

**Chronology (PROTOCOL §3, §11–§12).** Development 2016-01-04 → 2024-12-31; data doors are byte prefixes, opened in order.
Folds: C19 (data through 2019) → slice 2020–2021; C21 → 2022–2023; C23 → 2024. At each fold the complete
search-and-selection procedure of every arm ran on the data before the cutoff only; its selection was sealed and committed;
then one official job replayed every subject on the next period without retuning (continuous runs from 2016; slice P&L from
the cutoff close; reset slice DD beside the whole-run DD). Each arm's **independent chronological verdict** chains its three
fold primaries: *supported* iff every fold produced a primary, the sequential net > 0 and the sequential drawdown ≤ $35,000.
C24 (data through 2024) gives the finalists; `FROZEN_SELECTION.json` sealed the finalists, their development and
chronological labels before the 2025-01-02 → 2026-10-30 period was opened **once** (V1 validation P&L > 0; V2 reset
validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000). A finalist is a *TSLA research candidate for the user's review* only if
it passes Q1–Q6 at C24, is its arm's primary with a *supported* verdict, and passes V1–V3. The 2025–2026 period is
**retrospective, previously examined broader-market history** (examined by many of this program's studies), never a
pristine holdout; there is no prospective unseen period.

**Architecture comparisons (PROTOCOL §12).** For each combined arm K ∈ {C, J, S} against the better standalone primary B (D or
G), and J against S both ways, on C24 development evidence with the same instrument and draws: K is a *material improvement*
iff both are qualified and either type P (centre net ≥ B + $10,000, confirmation robust ≥ B + $5,000, centre DD and
confirmation p90 DD each ≤ B + $2,500) or type R (confirmation p90 DD ≤ B − $2,500, centre DD ≤ B + $2,500, centre net and
confirmation robust each ≥ B − $2,500) holds **and replicates** (qualified members of K from ≥ 2 replicate numbers meet the
same type; arm C has no seeds, so not applicable). A single historical comparison never proves an architecture superior.
