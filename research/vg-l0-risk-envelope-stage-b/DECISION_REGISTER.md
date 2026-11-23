# DECISION_REGISTER — Stage B RES-B 1.0.0

Everything below is a recommendation from one replicated study on previously inspected history. Nothing is decided,
adopted or authorized by it. The original NL0 method (P0: marked DD ≤ 35 % of C0) remains the authoritative reference
until the user decides otherwise. Evidence: `REPORT.md` (sections cited), `results/analysis/TABLES.md`,
`SUPPLEMENT.md`, and the sealed selection and interval records.

## 1. Findings and recommendations

| ID | Topic | Finding / recommendation | Evidence | Grade |
|---|---|---|---|---|
| S1 | Precommitted primary rule | **P3 non-inferior and superior** at C21 (mean D +$10,729, L90 +$6,276) and C24 (+$16,387, L90 +$9,892), on paired training-period best qualified centre net. At C19, the secondary cutoff, it is non-inferior but not superior (−$750, L90 −$2,759) | §0, §4 | strong for what it measures (32 paired lanes per cutoff, the bound sealed at selection time) |
| S2 | Mechanism | **The gain is the 40 % marked-DD allowance, not the envelope's protections.** No member qualified under P0 but not P3 (CTRL-only = 0 at every cutoff), and P3's PL / BD gates offset a 40 % DD admission once. 11/32 (C21) and 12/32 (C24) EXP-30 representatives would fail P0, all on confirmation p90 DD in ($35k, $40k]. Judged under P0, EXP-30's searches are worse on average (C21 −$4.7k, C24 −$11.2k) | §5, §6 | strong on these lanes |
| S3 | Principal / banked-capital benefit | **None shown.** The representatives' centre PL and BD (liquidation) differ by −$184 to +$741, every 80 % interval including 0. Marked DD is higher: +$1.6k to +$3.0k at the centre and +$2.2k to +$4.6k at the confirmation p90. Confirmation draws above 35 % DD rise from 2.2 % to 8.8 % (C21) and from 3.3 % to 13.2 % (C24). The PL ≤ 25 % and BD ≤ 30 % guarantees are already met by P0's selections | §7 | strong on these lanes |
| S4 | Chronology (retrospective) | **Unfavourable to P3 at both primary cutoffs.** Paired interval DD is larger by $2,933 (2022–2023) and $7,180 (2025–2026), so T2 fails. T1 (pooled P0 primaries) fails too. Paired interval net is −$4,048 and −$12,381, with C24's 80 % interval entirely negative. C19 → 2020–2021 is favourable (+$9,329 net, T1 and T2 hold) | §9 | weak to moderate (correlated, previously inspected intervals) |
| S5 | **Adopt P3?** | **No.** It passed the profit test it was given, but its distinctive gates were inactive and its extra marked drawdown recurred out of training. Do not change the optimization standard or NL0 1.0.0 | §12 | judgment |
| S6 | Narrow follow-up? | Only one question remains open: whether a **40 % marked-DD ceiling** (P1, without the inactive gates) is acceptable. That is a risk-preference decision, not an envelope question. This study's interval evidence argues against it, so **no follow-up optimization is recommended** | §5, §9 | judgment |
| S7 | Next work | **Return to P0 and the staged trailing-stop work** (the default suggested by Stage A, now supported by replicated evidence) | — | judgment |
| S8 | BD 25 % vs 30 % | Stage A's finding stands: at 30 % the banked gate no longer removes P0's candidates (0 CTRL representatives lost to P3). It also adds no protection P0 lacked | §5, §7 | strong on these lanes |

## 2. Decisions for the user (none taken here)

| ID | Decision | Options | Study's suggestion |
|---|---|---|---|
| U1 | Adopt P3, or any envelope, as a qualification standard | adopt / do not adopt | do not adopt |
| U2 | Revisit the marked-DD ceiling (35 % → 40 %) as its own question | separate study / no | no; the interval evidence is unfavourable |
| U3 | Run the two report-only diagnostics not performed after the window (census, profit-giveback replay; tools committed) | run / skip | optional; they cannot change the result. Both are zero-evaluation or bounded CPU work, tens of minutes |
| U4 | Return to staged trailing-stop work | yes / later | yes |
| U5 | Branches | keep `research/vg-l0-risk-envelope-stage-b`, Stage A's and the pilot's branches unmerged / merge parts | keep unmerged until review |
| U6 | Git-ignored caches | keep / compress / remove the Stage B job archives (`research/vg-l0-risk-envelope-stage-b/cache/jobs/`, ≈ 18 GB; the three search archives 4.2–5.0 GB each) | keep until the review |
| U7 | Any change of the optimization standard or NL0 1.0.0 | — | none recommended |
