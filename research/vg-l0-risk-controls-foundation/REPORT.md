# REPORT — Assignment 1: New L0 risk-aware successor foundation

**Outcome.** The foundation is ready, and every acceptance gate passed. Nothing was optimized, selected, deployed or
replaced. The frozen **New L0 primary: VGT + GDX** is unchanged and reproduced exactly. Assignment 2 needs the user's
approval (§7).

Written analysis and tables only (standard §7.7). Details:

- [STANDARD_CHANGE_RECORD.md](STANDARD_CHANGE_RECORD.md) (the standard);
- [SPECIFICATION.md](SPECIFICATION.md) (the controls);
- [BASELINE_MANIFEST.md](BASELINE_MANIFEST.md) (New L0's reproduction);
- [TEST_REPORT.md](TEST_REPORT.md) (every test and gate);
- [ASSIGNMENT2_HANDOFF.md](ASSIGNMENT2_HANDOFF.md) (the next study's design draft);
- [RUN_COMMANDS.md](RUN_COMMANDS.md) (reproduction).

## 1. What changed

| Deliverable | Result |
|---|---|
| **Standard 2.2.0** (user-approved) | **Minor version**: no [M] rule changed, item numbers kept. `docs/research/OPTIMIZATION_STANDARD.md`, sha256 `0085cff2…`, registered. It adds two items. **§1.8 [S] Consequence:** before searching, a protocol states what a failed independent chronological verdict means. The default is "no chronological support: not a deployment-qualified candidate without an explicit user decision". It is governance, not a fitness term, ranking input or gate. An informed lane's selection is labelled "no independent chronological test", and "no qualifying candidate" is a valid outcome. **§5.9 [R] Chronological exposure disclosure** covers six report-only items with no threshold: open-lot share of training net (≤ 0 handling fixed); the largest open lot's market-value multiple; its give-back; per-lot MAE; a D1 hold-window tail stress on a declared reference history; the training neighbourhood on the next slice. The evidence limits are stated. The template, the adoption template, the preflight (it requires `chronologicalConsequence` from new optimization and continuation adopters) and its tests follow. NL0 1.0.0 is not edited. |
| **Three optional D1 risk controls** (`src/d1-risk-controls/`, specification RC 1) | Per book, independently on D1·VGT and D1·GDX. **2A**: an unconditional protective stop at the entry fill's raw price × (1 − d). It is immutable, inclusive and active whether or not the lot was ever profitable. It uses the trailing stop's fill conventions (gap → opening trade; minute open through it → that open; low → the level) and gets stop slippage under stress. It is not evaluated on the entry session (the D1 convention). **2B**: maximum hold in three modes. *Legacy* (calendar days, loss at the open) is exactly the old rule. *Disabled* is allowed only with the stop; the loss buffer then never acts either. *Adaptive* is the repository's existing progress-hold concept: the base hold, latched to a finite extended bound once the post-entry high through the previous session reaches entry × (1 + g). The loss-only expiry condition is kept in every mode. **2C**: a decline gate. After K failed virtual attempts (net ≤ 0) in one episode, it refuses new arming until a session close recovers r of the decline from the first attempt's reference high to the episode low, or until a cooldown of C sessions ends. A profitable exit ends an unblocked episode. It is driven by the book's own virtual trades whether funded or not, and every permitted and blocked decision is logged. |
| **Isolation** | No frozen file was edited. The module subclasses the frozen `ExitManager` and `ShadowBook`, mirrors Priority 3's `runD1Book` loop, and reuses `runPool`, the Growth books and `recordOf` unchanged. The Priority 3, 5B and shadow-study evaluation digests equal their sealed values (G0), so every historical integrity check keeps passing at this branch's HEAD. |
| **Identity** | Legacy configurations keep the frozen identity, evaluation key and record byte for byte. Non-default ones get `rc1-…` identities over canonical controls, with inactive genes masked. Old JSON configurations stay valid. |

## 2. What was deliberately not changed

- New L0's parameters, its calendar-day holds, the allocator (one slot, D1 → GDX → VGT), the data, the costs (5 bps
  per side, 11% simple interest by calendar day), and every sealed record and digest.
- Growth·VGT's rules; Growth·GDX stays off; shadow-entry eligibility stays off (Priority 3's pool has no such path).
- No search, no thresholds, no objective weights, no winner. **No performance of any control on real data was
  computed into a record** (protocol AD7): Assignment 2's boxes are not informed by outcomes seen here.
- Out of scope, as the brief requires: the TSLA/MSFT studies and the Strategy Lab drag-to-measure bug.

## 3. Acceptance gates (all pass)

| Gate | Result |
|---|---|
| G0 isolation | only `src/d1-risk-controls/**` and `src/research-standard/**` changed; 3/3 digests equal sealed |
| G1 New L0, FULL 2016-01-04 → 2026-10-30 | **$479,605.18 net, $20,385.99 maximum minute DD, 46 lots** (1 open). 5B's sealed full-history record (R01) matches in every field. With legacy controls, the controlled runner equals Priority 3's engine in every virtual trade, funded lot (instants, raw and cost-adjusted prices, reasons, gross, interest, net, MAE), funding decision (79, of which 33 refused) and mark change (547,753). |
| G2 development ledger | 34/34 lots equal 5B's ledger |
| G3 D19, D21, D23, D24 | all identical; D24 ($382,721.46 / $19,459.83) equals 5B's sealed C24 centre in 33 fields |
| G4 random configurations | 120/120 runs identical (60 configurations × D21, D24; 5,279 funded lots) |
| G5 non-default invariants | 120 random (configuration, controls) pairs covering every family and the gate. Checks: causality (D21 vs D24), determinism, accounting, independence, stop levels, never on the entry session, holds, gate bounds. All pass (pass counts only) |
| G6 tests and demonstrations | 81 module tests, 26 preflight tests, `tsc` clean; full suite 1,551 tests with only the 7 known pre-existing failures; deterministic synthetic demonstrations of every mode |
| G7 frozen work | 14/14 studies pass the preflight (earlier pins retained); the sealed records of 5B (28), shadow (90), walk-forward (10), session (27) and Priority 3 (43) verify; `vg-lmo verify` and `vg-l0se verify` pass at HEAD |

**Process disclosures.** Three gate scripts had tool errors, and each was diagnosed read-only and fixed by an amendment:

- the C24 lookup also matched stress records (A1);
- the causality test treated a Growth trade with a retention partial as closed (A2);
- seal paths under `.cache/` were re-prefixed (A3).

The failed records stay sealed beside the passing reruns. A4 adds 7 synthetic tests after the freeze, with no engine
change. No engine defect was found.

**What the demonstrations show (synthetic; mechanics, not performance).** On a crash path an 8% protective stop gapped
through at the open lost $11,320.50, more than 8%: a stop is not a loss cap. A shorter adaptive base cut a failed lot
earlier, and a wider stop with no hold gave back more. None of this says which family is better on real data.

## 4. Diagnostic evidence the controls rest on, and its limits

The walk-forward diagnostic found no defect, and failures rooted in regimes absent from training, open-lot credit at
the cutoff, D1's lack of a loss exit before its maximum hold, and local robustness that did not travel. The controls
address only the third. They do not address a long-held winner's give-back (the trailing stop does), regime shift,
or search coverage. The $35,000 ceiling is a research criterion, not an enforceable loss limit. 2020, 2022 and
2025–2026 are previously examined history and cannot become a holdout by relabelling. New L0's own backtest is a
different object from the earlier-cutoff procedures that failed. It was never tested by them: it came from an informed
lane chosen with later data.

## 5. Unresolved blockers

None for this assignment. Two open items need the user before Assignment 2:

1. **Reference history for the §5.9 D1 tail stress.** The canonical files start in 2016. Options: acquire pre-2016
   VGT/GDX data (disjoint), use declared peers (proxy), or run a labelled in-sample stress.
2. **Merging the research branch.** `src/d1-risk-controls/` and the preflight change stay on
   `research/vg-l0-risk-controls-foundation` until reviewed. Nothing is merged into `main` automatically.

## 6. Git

| Item | Value |
|---|---|
| Research branch | `research/vg-l0-risk-controls-foundation`: commits `92f37734` (standard, module, freeze), `90df91fa` (gates, documents), `cf4102cb`, merge `4b24d3f1` (syncs `main`), then this report |
| `main` (documentation only) | `108c241b` "Integrate optimization standard 2.2.0 (documentation only)". It adds the four standard documents, the roadmap's version note, this study's brief and the change record. No code. Parent `2346a1b5` (`origin/main` was verified unchanged before the commit), so it is a fast-forward. The research branch contains it, so a later merge of the branch into `main` is a fast-forward. |
| Pushes | recorded in `RESEARCH_RECOVERY.md` (verified with `git ls-remote`) |

## 7. What requires the user's approval before Assignment 2

1. The Assignment 2 design (`ASSIGNMENT2_HANDOFF.md`):
   - the cell design (S1 symmetric, S2 full cross, or **S3 staged**, proposed);
   - the research boxes and radii for the new genes;
   - budgets, caps and stopping rules;
   - the old-versus-risk-aware selection 2 × 2 and its selection rules.
2. The chronological consequence (the 2.2.0 default is proposed) and the definition of a "qualifying successor"
   against New L0. "No qualifying successor" stays a valid outcome.
3. Whether any §5.9 item may become a ranking input. Under 2.2.0 they are report-only, so this needs a departure or a
   new standard version.
4. The tail-stress reference history (§5.1).
5. A review of `src/d1-risk-controls/` for eventual merging (never automatic).
