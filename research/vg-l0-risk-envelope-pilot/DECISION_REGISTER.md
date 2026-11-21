# Decision register — risk-envelope pilot (open items before authorization)

Nothing here is decided. "Proposed" is this draft's suggestion only; the user decides each item (standard §7.3: a
departure from an [M] rule needs the user's agreement; NL0 1.0.0 stays the reference method).

| ID | Decision | Options | Proposed | Why it matters |
|---|---|---|---|---|
| **D-0** | Authorize the pilot as a new study (standard 3.0.0, scope `optimization`, `evaluationBackend: gpu-required`) | authorize / revise / decline | — (the user's) | nothing runs without it |
| **D-1** | Cells | (a) 2 cells: GA0.VA0 + seeded GB0.VD1; (b) 1 cell GA0.VA0; (c) 3–4 cells (seeded); (d) cells chosen from Assignment 3's results (informed) | (a) | budget (§7) vs coverage; (d) would bias towards known regions and must be labelled informed |
| **D-2** | Budget rule | (a) expected ≈ 0.27–0.38 M with a stop before qualification if search > 450k; (b) hard per-arm job caps (risk of asymmetric truncation); (c) larger budget | (a) | the approved 0.3–0.5 M band; worst case 0.70 M; fairness |
| **D-3** | Basis of the two new gates | liquidation (charges the open shares' exit cost) / marked | liquidation for both; marked reported | conservative; differences ≈ $50–$100 per lot (5 bps) |
| **D-4** | Neighbourhood form of the envelope (rung feasibility and Q3) | (a) p90 of each metric ≤ its limit; (b) p90 marked DD only, PL/BD at the centre only; (c) worst-10 % mean | (a) | how strictly the principal limits act on local stability |
| **D-5** | An extra promotion reserve for "low principal loss, high giveback" proposals (PROPOSED_METHOD §3) | add (a deviation from NL0's schedule) / not | not | keeps NL0's shares unchanged in both arms |
| **D-6** | Island objectives | NL0's (−net, −robust, p90 marked DD) / four objectives adding p90 PL or BD | NL0's | changing objectives changes the algorithm (brief: do not) |
| **D-7** | New L0 / N/original roles | descriptive controls only / also selectable at C24 | descriptive only | no informed lane in the pilot |
| **D-8** | RA1's S4 threshold under EXP | 35 % of C0 (unchanged) / 40 % of C0 (the arm's cap) | 40 % under EXP, 35 % under CTRL | otherwise RA1 under EXP rejects members the envelope admits |
| **D-9** | Open-ended Growth exits | label + split tables (no genome change) / protected stratum / requirement | label only | domain changes need approval |
| **D-10** | Q5 under EXP | centre net > 0 ∧ full EXP envelope at 10 bps / ∧ marked DD only | full envelope | the stress should test the arm's own constraints |
| **D-11** | DD^L (liquidation-basis conventional DD) | report-only CPU diagnostic / add to the GPU outputs (a CUDA change + a full acceptance) | report-only | not needed by the approved thresholds |
| **D-12** | Whether C21 → 2022–2023 and C24 → 2025–2026 slices are computed for both selectors of both arms | yes / primaries of P0 only | yes (8 slice runs) | Q3; costs ≈ 300 replays each incl. neighbourhoods |
| **D-13** | Diagnostics D1–D3 coefficients for reporting | D1 at 40 % of peak equity; D2 40/30/60 (illustrative); D3 limits 25 % / 25 % | report the values; no pass/fail beyond illustration | they are nonbinding; coefficients are not approved thresholds |
| **D-14** | Merge of the reusable backend change (risk delivery, `src/risk-envelope/`) into `main` | merge after review (with its acceptance record) / keep on the branch | the user's (no merge done) | `main`'s acceptance record is Phase 6's; merging requires the Phase 7 record to travel with it (`research/gpu-phase7/INTEGRATION_PLAN.md`) |
| **D-15** | Retention of the two restored Assignment 3 archives | delete the scratch copies (the `.zst` originals remain) / keep until the pilot | delete after this review | 10.7 GB scratch |

Items the pilot must **not** decide on its own: adopting the experimental envelope into the standard, nominating a New L0
replacement, deployment, any change of NL0 1.0.0.
