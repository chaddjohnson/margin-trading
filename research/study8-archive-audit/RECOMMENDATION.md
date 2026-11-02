# Recommendation — Study 8 archive audit

**Scope.**

- A read-only audit of the sealed Study 8 records.
- No optimization, search, replay, new test door, threshold change or reranking.
- The Study 8 nominations, ranks and gates are unchanged.
- Training comparisons use F24 training records only. 2025–2026 figures appear only for sealed, already-tested
  members, and descriptively.

## Answers to the five questions

### 1. Do the existing records contain overlooked high-profit, ≥ 95%-stable candidates worth further independent investigation?

**No.**

- **The sealed holders are already at the top.** At rung 3 (128 points), no risk-feasible configuration in VG, VXR,
  VXRG or VXRKG exceeds the best holder's own rung-3 value.
- **At rung 2 (64 points) some do, by small margins:**
  - VG: 41, up to +8.3%. They are compared with #2 VG balanced's rung-2 value; #1 has no rung-2 record, and its
    384-point value is higher.
  - VXRG: 5, up to +4.0%. VXR: 3, up to +1.9%.
  - Every one of them that was re-measured at rung 3 (VG 16 of 41; all of VXR and VXRG) fell back below the holder.
- **The highest retained fidelity gives the same picture.** Taking each configuration at its highest retained
  fidelity, each pooled track's best non-holder is −3% to +6% from the holder (`PROFIT_ROBUSTNESS_FRONTIER.md` §2).
- **Shortlisting lost nothing at the top.** The best rung-3 configuration left out is 0.2–6.1% *below* the best
  shortlisted one.
- **The rung-1 leads are within estimation noise:**
  - VG has 53 and VXRKG 21 configurations above their holders' 16-point values, at up to +9%.
  - G has 223 leads (up to +12.8%): 181 at 15/16, which a 16-point record cannot place in the ≥ 95% band, and 42 at
    16/16, at most +4.0% above holder #12's 16-point value.
  - Measured on the same configurations, robust profit shrinks 5–6.5% from 16 to 64 points, and 15/16 shares hold
    ≥ 0.90 only 52% of the time.
- **Not worth a dedicated study.** At most, a cheap ≥ 128-point re-measurement of those leads on the training door
  could be bundled into a future, separately approved study.

### 2. Is there a defensible high-profit 93–95% exception?

**Not from the archive.**

- **No configuration in the 93–95% band is ≥ 10% more profitable than its track's holder,** at any fidelity of
  ≥ 64 points.
- **The profitable vectors outside ≥ 95% are G's,** at 88–92% shares with p90 DD within $1k of the $35k ceiling. They
  sit below the 93% exception band; their extra profit is exactly their lost breadth.
- **The sealed holders in or near the 93–95% band:**
  - **#26 V extra** (`VGT:d1-3a9036cc5b`, confirmation 94.0%, nominated as ambiguous) has a robust profit of only
    $7,352/yr. It is not a high-profit case.
  - **#3 VXRG profit** sits at the edge (selection 94.5%, rung 3 95.3%, confirmation 96.6%).
  - **#1 VG profit**'s share measured across five sets: 93.8% at rung 3 (128 points), 97.3% on the selection families
    (256), 95.7% on the T2 rescore (256), 96.4% at confirmation (384), and 93.2% on the test families (384, sealed).
- **The comparison with #2 VG balanced.** #1's case over #2 is +8% training robust profit ($29.3k against $27.1k per
  year). That is a band placement uncertain by about 4 share points between measurements.
  Descriptively, on the exposed 2025–2026 window #2 had:
  - the higher test net ($79.9k against $64.2k);
  - the lower run drawdown ($21.3k against $31.2k; #1's peak was 89% of the ceiling, reached in 2026);
  - the higher test share (98.2% against 93.2%).
- **By the stated preference, #2 is the configuration that meets the ≥ 95% default at every measurement.** The
  preference is ≥ 95% by default; 93–95% only with a compelling economic case *and* positive validation; and no
  nomination with poorer chronological evaluation merely for higher training profit.
- **This is an observation for the user's decision, not a reranking.** Study 8's sealed order (#1 primary) stands, and
  the 2025–2026 window is exposed.

### 3. Did the shortlist or selection procedure unnecessarily discard anything important?

**At ≥ 64-point precision, nothing important, with one G exception that the archive cannot settle.**

- **In the pooled tracks, no non-risk criterion removed a materially more profitable configuration:**
  - activity, economics, concentration, the cap of six, L∞ distinctness, ledger de-duplication;
  - the ½·median + ½·p10 scoring rule.
  - From rung 2 on, no F24 record even violates C3, C4, C6 or C7.
- **G's more profitable configurations sit on the risk boundary:**
  - the profit pick failed Q2/Q2b/Q7 at 88.3% share and p90 $35,190;
  - the centre pick failed Q2 at 89.3%;
  - the 91.9% front member failed only the Q7 stress gate (p90 $34,467).
- **The one G exception:**
  - `GDX:d1-f99216b79e` (+8% at rung 3, share 90.6%, p90 $34,848, no violated constraint) was excluded only by L∞
    distinctness: it is 0.032 from the profit pick, which then failed Q2 at 384 points.
  - It was never measured at 384 points, so whether it would qualify is not knowable from the archive. Its 90.6%
    128-point share (Wilson lower bound 85.5%) places it in the same boundary region.

**Below rung 2 it is not knowable from the retained archive:**

- the point caches are gone;
- the rung-1 archive keeps 16-point summaries only, without the C3 lot-years / C4 / C6 / C7 inputs;
- unpromoted screen vectors exist only as counts.

The 13 rung-1 leads excluded by those unstored constraints (V 6, VG 4, VXRKG 3), and the feasible but unpromoted
leads, cannot be resolved without new computation.

### 4. Is additional optimization, or a different fitness objective, warranted by the evidence?

**No change recommended.** The evidence (`OPTIMIZER_SELECTION_AUDIT.md`):

- the top of every pooled training frontier is flat within estimation noise;
- the alternative robust-profit weightings and the share thresholds 0.93, 0.95 and 0.98 surface no materially better
  risk-feasible configuration (raising the minimum to 0.95 costs 0–2% in the pooled tracks, though about 25% in G);
- PBO exceeds 0.5 in 20 of 30 track-folds;
- training rank barely orders test outcomes (+0.26 on F24, negative on F19–F21);
- the location of the "best" vector moves L∞ 0.42–0.97 between folds.

More search under the same objective would mostly add multiple testing.

The island trajectories show the 32-D and 40-D searches were budget-bound rather than converged. That is a reason to
expect *more configurations*, not better-ranked ones.

**Optional record-keeping improvements for any future study** (not a fitness change):

- persist per-neighbour results, or at least the C3–C7 inputs, at rung 1;
- keep T2-rescored values for every rescored configuration;
- record island origin;
- keep point caches until the final report is sealed.

These would make an audit like this one answerable below rung 2.

### 5. Should the next study begin with new ETF combination selection, or with more local exploration?

**Neither as an optimization yet. If one is chosen, start with the ETF-combination screening stages, not local
exploration.**

- **Local exploration of the six existing tracks is saturated in profit at the top** (point 4), and the existing
  nominees already sit on broad neighbourhoods.
- **The ETF question is genuinely open,** but the prior evidence is sobering:
  - 0 of 18 complementarity replays passed;
  - idle-slot trades lose money;
  - 66% of the 61 ETFs' decisions fall in 21 market-wide events.
- **So a new study should begin with the cheap, replay-based screening stages S0–S3** of
  `FUTURE_ETF_POOL_DISCOVERY_DESIGN.md`:
  - eligibility, standalone viability on fixed vectors, contention, and the marginal shared-slot contribution;
  - training-only, through 2024;
  - four VGT/GDX families with equal budgets.
  Joint optimization (S5) follows only if S3 finds a book with a positive marginal contribution in the actual
  shared-slot replay.

## Prioritized next actions (each needs the user's approval; none is started)

1. **Decide the research nominee in light of §2 (#1 against #2 VG balanced) without reranking the sealed study.** For
   example, freeze both for forward-only tracking as Study 8's recommendation already proposes.
   - Only sessions after 2026-10-29 are genuinely unseen.
   - Predeclare horizon and kill rules; B1 and B5 serve as controls.
   - This is the only route to evidence that is not retrospective.
2. **Refresh the local data to one common end date** before any new study. Today 59 of the 64 files end 2026-10-13,
   and only the B5 five run to 2026-10-29. Record the new hashes; Study 8's pins will then differ by design.
3. **If a new study is wanted:** ETF-combination screening S0–S3 (training ≤ 2024-12-31), as designed. Budget-capped,
   with every trial counted and 2025–2026 marked exposed.
4. **Optional, low priority:** a predeclared training-only re-measurement (≥ 128 points) of the rung-1 leads above the
   holders and the rung-2 near-ties. There are 305 leads (223 in G, 181 of them at 15/16), listed in
   `outputs/f24-funnel.md` and `outputs/f24-overlooked.md`. It is worth doing only as a precision check, with no
   expectation of a material gain.

**Stop.** No optimization, ETF selection test or selection-rule change follows from this audit until the user and a
reviewer have examined it.
