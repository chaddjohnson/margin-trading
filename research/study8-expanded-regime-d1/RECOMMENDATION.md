# Study 8 — recommendation

**Research only. Nothing here is deployed, merged or added to the prospective B4/B5 system. Frozen B1 and B5 remain
the benchmarks.**

## 1. Mechanical protocol result (from sealed records; no judgment)

- **Primary one-time evaluation (F24):** trained 2016-01-04 → 2024-12-31, tested once on 2025-01-02 → 2026-10-29.
  - Outcome class **qualified**.
  - **18 research nominations** among 26 sealed F24 role holders: 16 pass and 2 ambiguous (#12 G profit, #26 V
    extra), in the sealed training-only order.
  - The **primary nominee** is the top-ranked one: **#1 VG profit**, `VGT:d1-f41ebcd961` + `GDX:d1-016d8e4257`
    (`config/research-pools/study8-expanded-regime-d1/S8-VG-F24-1.json`; `npm run study8-run -- run s8-vg-best`).
- **Per track** (best non-failed holder by the sealed order):

  | Track | Holder | Test net | Run DD | T |
  |---|---|---:|---:|---|
  | VG | #1 | $64,166 | $31,225 | pass |
  | VXRG | #3 | $65,312 | $21,192 | pass |
  | VXRKG | #8 | $34,414 | $25,616 | pass |
  | G | #12 | $31,441 | $30,359 | ambiguous |
  | VXR | #15 | $67,745 | $22,020 | pass |
  | V | #25 | $41,715 | $21,330 | pass |

  Every track has at least one non-failed holder.
- **Procedure folds:** holders not failed were F19 0/19, F20 0/27, F21 0/28 and F23 1/26. Every candidate failed on
  test windows containing a drawdown regime absent from its training (2020 for F19; 2022 for F20 and F21).
  - Some failed only on other gates.
  - Most F23 candidates kept risk under control in 2024 but did not earn the required $10k in that nearly inactive
    year.
- **Exposure:** the 2025–2026 window was previously inspected by Studies 5–7. Its pass is a **retrospective
  chronological persistence result, not independent validation**.

## 2. Economic judgment

**Profit in 2025–2026 was not distinctive; robustness was.**

- **Test-window profit:** over the 22-month window the nominees earned $19.5k–$83.8k (#1 $64.2k). Frozen B5 earned
  $72.0k, frozen VG $70.4k and B1 $40.9k.
  - Neither control is out of sample on this window. B1's registry records that 2024–2025 was inspected by the
    programs that chose it (PROTOCOL.md §1.4). B5 was frozen prospectively at 2026-10-13, after 2024 → 2026-10-13 had
    been inspected (PROTOCOL.md §3.4). This favours B1 in the tier, E3 and the bootstrap comparisons.
  - A paired stationary block bootstrap gives #1 −$7.8k against B5 (5–95%: −$35.6k to +$19.0k) and +$23.3k against B1
    (5–95%: −$19.3k to +$70.2k). Neither difference is clearly different from zero.
  - Over the whole run 2016–2026 every nominee earned less than B5 ($484.6k), whose books were chosen with hindsight.
    Most earned more than B1 ($176.3k).
- **Robustness:**
  - The nominees sit on broad parameter neighbourhoods: 91.9–100% of 384 fresh test-family neighbours below $35k, with
    p90 DD of $23.9k–$34.7k.
  - On the same sets B5 has 29.2% (p90 $53.9k), frozen VG 71.9% and G-PA 15.4%.
  - That property was selected on 2016–2024. In 2025–2026, 25 of 26 holders kept their test share within about
    5 points of their training share, and 24 of 26 passed T2.
  - Under the protocol's gates, frozen B5 and frozen VG fail on neighbourhood breadth (T2) despite their profit.
- **Large-profit plateau or inert region?** Neither extreme.
  - The nominees are active: 3–16 new funded lots in the test window, 21–62 lots over the run, and $40k–$123k
    per occupied capital-year (the floor is $11k).
  - They are profitable at about the frozen pools' level, on much broader plateaus. They are not a step change in
    profit.
- **Within the nominees**, by the sealed order and by the brief's preference for profit among candidates passing the
  gates: #1 VG profit had the highest training robust profit ($29.3k/yr).
  - On the test window #2 VG balanced looked better: test net $79.9k against $64.2k, run DD $21.3k against $31.2k,
    share 98.2% against 93.2%. #1's worst drawdown ($31.2k, 89% of the ceiling) happened out of sample in 2026.
  - **The rules forbid reordering on test outcomes, and #1 remains the primary nominee.** The analyst's evidence-weighted
    note is that #2 had the better risk profile in the one-time window. This is a single window's observation, not a
    selection.

## 3. Evidence confidence

- **Training (in-sample, strong selection pressure):**
  - 440,126 configurations at rung 1 and about 10 million neighbourhood evaluations, all on overlapping windows from
    2016.
  - PBO above 0.5 in 20 of 30 track-folds (F24: G 0.64, V 0.81, VG 0.39, VXR 0.49, VXRG 0.87, VXRKG 0.14).
  - Training rank carried no information out of sample in F19–F23 (Spearman −0.32 to +0.11) and little in F24
    (+0.27 to +0.39).
- **Retrospective forward (2025–2026, the closed door):** the window was favourable for D1 in general.
  - 96% of training-qualified and 100% of non-qualified shortlist members had a positive test window.
  - 3 of 9 members that **failed** training qualification also survived the T gates.
  - Study 7's VG/VXR references, trained only through 2023, pass the same gates.
  - Survival in this window is therefore weak evidence for any particular configuration. It is better read as
    evidence about the VG/VXRG/VXRKG architectures on broad neighbourhoods.
- **No genuinely unseen history:** every session through 2026-10-29 had been inspected before Study 8, and the 12
  sessions after 2026-10-13 are not independent observations.
- **The strongest negative evidence is the procedure folds.** Whenever the test window held a drawdown regime absent
  from training, every candidate failed (F19–F21). Training through 2024 contains 2020 and 2022, but a future regime
  unlike both could break these nominees the same way. A neighbourhood pass rate is not a probability of future
  safety.
- **Concentration:** 2020 is the best year of 17 of the 18 nominees. The best year is 24–59% of whole-run net. Leaving 2020 out
  removes $41k–$160k from each nominee's net.

## 4. Decision

- **Research nomination (retrospectively chronologically persistent; research-only, NOT DEPLOYED): #1 VG profit**,
  with the other 17 non-failed F24 holders as the research set. Ambiguous holders (#12 G profit, #26 V extra) are
  labelled so.
- **No deployment and no change to B1, B5 or the prospective system.** The frozen benchmarks stay frozen.
- **Realistic risks:**
  - run drawdowns up to $34.5k per $100k (#26 V extra, 2020) and test-window drawdowns up to $31.2k (#1 VG profit,
    2026); close to the $35k screen for #1, #12 and #26;
  - gap fills beyond stops;
  - single-slot sequencing that re-routes trades under small parameter changes;
  - heavy dependence on 2020-type rebounds;
  - the procedure folds' failure under unseen regimes.

**Clean prospective follow-up plan** (a new, separate study; nothing here authorizes it):

1. **Freeze now:** the primary nominee and, at most, the six per-track bests above. Use the research configurations
   under `config/research-pools/study8-expanded-regime-d1/`, plus B1 and B5 as controls.
2. **Run forward only on sessions after 2026-10-29.** Those are genuinely unseen. Use the unchanged pools engine at
   5 bps and 11%, with daily `npm run study8-run -- compare` runs into new output directories.
3. **Predeclare before the first new session:**
   - a minimum horizon (e.g. 12 months);
   - a kill rule: minute DD ≥ $35k, or a pooled neighbourhood share below 0.90 on fresh seeds over the forward window;
   - and that the forward window will not be used to re-select.
4. **Mark 2025–2026 as exposed** for any future optimization study.

The user decides whether any of this proceeds.
