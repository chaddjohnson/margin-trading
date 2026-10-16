# Protocol (frozen before any strategy-grid result was computed)

Written 2026-10-16 after reading the code, running the golden master and listing the development-period (2014–2022) episodes and candidates. No strategy-variant result, Phase 3 diagnostic or holdout outcome had been computed. The SHA-256 of this file is stored in `PROTOCOL.sha256`. Any later change is an amendment at the end, with its reason.

**Disclosure.** The researcher (an AI model) knows the public market history through mid-2026, including the 2025 tariff crash. That knowledge cannot be removed; the holdout is "untouched" by the selection code, not by the researcher's general knowledge. Rules are pre-specified here to limit the damage.

## Data and periods

- VGT: `data/VGT/VGT-2005-2026.csv` (Stooq back-adjusted history, extended through 2026-10-13). Proxies: Stooq processed daily files (through 2026-09-08). VIX: CBOE `VIX_History.csv` (copied from the regime-filters branch, sha 142da967…), always lagged one session.
- Development: signals 2014-01-02 → 2022-12-30; outcomes truncated (censored) at 2022-12-30 when evaluated on development.
- Holdout: 2023-01-03 → 2026-10-13. Read once, after the frozen choices are written to `results/frozen.json`.
- External stress test: VGT 2006-01-03 → 2013-12-31 (frozen rules only; never for selection).
- External robustness: QQQ, VOOG, SOXX, IGV, XLY, IWN, 2014-01-02 → 2026-09-08 (frozen rules only, no retuning).
- Strategy runs are continuous from 2014-01-02 (earlier bars feed the reference high and indicators only); window metrics are slices of the continuous run's daily mark-to-market.

## Events and labels

- Reference high and signal: the original's (max high of the 90 previous sessions; signal when `1 − close/refHigh ≥ 10%`).
- Episode: starts at the first signal while no episode is active; frozen peak P = that session's reference high; ends at the first close ≥ P; right-censored otherwise.
- Candidate: first signal against each distinct reference-high bar. Velocity = sessions from that bar to the first signal.
- Primary label: some close in [signal, signal+40] ≤ 0.8 × reference high. Robustness: 15/25/30% × 10/20/60 sessions. Censored (null) when the window passes the outcome end without reaching the level.
- Velocity bins (hypothesis bins, not thresholds): ≤15, 16–40, >40 sessions.

## Features

As listed in `src/drawdown-entry/features.ts` (`featureSpecs`): speed/acceleration, volume, volatility (incl. lagged VIX), cross-ETF proxies (QQQ, SOXX, IGV, SPY, IWN; ≥3 available required; no forward fill), stabilization. Phase 3 evaluates each feature individually on development candidates and episodes, then the pre-specified flags of `policies.ts`.

## Strategy grid (all in `policies.ts`; 58 rules + F)

A original; B velocity (skipFast 5/10/15/20, skipSlow 20/40/60, deferFast 10/15 × 5 sessions); C deterioration gates (18 flags, defer while raised) and 3 reject-at-first-signal variants; D stabilization (8 confirmations × zone/rebound); E adaptive thresholds (11 rules). F = one C gate flag combined with one D zone stabilizer, both chosen by the selection procedure (if the flag is raised on a 10% signal, wait for the stabilizer; otherwise enter as A). Exits, sizing, interest, the 0.5%/3%/38% restriction and the one-position rule are unchanged for every rule.

## Execution conventions

- Research convention: same-close (signal and fill at session t's close), as the original. All selection uses it.
- Executable sensitivity: next-session open fill; reported separately with the frozen choices; never blended.
- Cost sensitivity: 5 and 10 bp per side (P&L only). Margin-rate sensitivity: 8% and 14%.

## Selection

- Objective on a window: J = net P&L − maximum mark-to-market drawdown (both $, window-relative).
- Family pick: the member with the highest J; ties → the earlier member in grid order. F pick: highest-J C gate flag and highest-J D zone stabilizer, composed.
- Walk-forward (development only): expanding training windows 2014→Y−1, test year Y ∈ {2018, 2019, 2020, 2021, 2022}. The family pick on training is applied to year Y; out-of-sample results are stitched daily increments of the picked rules.
- Frozen choice per family: the pick on all of development (2014–2022).

## Validation criteria (a rule is "validated" only if all hold)

1. Walk-forward: the stitched out-of-sample J of the family's selection procedure exceeds A's over the same test years.
2. Holdout: the frozen rule's J exceeds A's on 2023-01-03 → 2026-10-13 under the research convention.
3. Not one episode: the development improvement in J does not come from a single episode (leave-one-episode-out on episode-attributed P&L keeps ΔP&L ≥ 0, or the drawdown reduction does not depend on one episode).
4. Next-open execution does not reverse the sign of ΔJ on development and holdout.

Cross-ETF and pre-2014 results are reported as supporting or contradicting evidence; correlated ETFs are not independent crashes. If nothing is validated, the recommendation is no change.

## Uncertainty

Rates on episodes and candidates use Wilson intervals; candidate- and signal-level statistics use a cluster bootstrap by episode (2,000 replicates, seed 20261016). With ~10 development episodes and 2 severe ones, no classifier accuracy claim will be made.

## Amendment 1 (2026-10-16, after the first development run, before any holdout read)

**What was seen.** The first development run showed that A with next-open execution earns about $30k more than A with same-close execution on 2014–2022, because a one-session shift happened to catch a two-year hold (Feb 2016 → Feb 2018). The in-sample family picks draw much of their edge from the same trade.

**Added (diagnostic only; no selection, objective, grid or validation criterion changed):**

1. A placebo: uninformed random deferral of each candidate's entry by 0–5 or 0–10 sessions (500 seeds each, `placebo()` in `policies.ts`). The frozen picks' Δ J is reported as a percentile of the placebo distribution, on development and on the holdout.
2. Episode attribution is trade-based (each trade's P&L belongs to the episode of its signal) instead of the mark-to-market change inside the episode window, which left long holds "outside" the episodes.

`results/frozen.json` was written by the first run and is unchanged by this amendment (the selection code did not change).

## Amendment 2 (2026-10-16, after an independent code review, before any holdout read)

An independent review (truncation tests at six cut dates: zero differences in features, marks and decisions; selection reproduced exactly) found no lookahead or leakage. Changes, none of which affects J, selection or `frozen.json`:

1. Costs are cash deductions (shares bought at the market price), so a cost sensitivity can never change a decision, as stated above.
2. Candidate decision counts include family-D rebound entries on sessions without a 10% signal (reporting columns only).
3. Criterion 3 removes the episode with the largest **positive** difference (it removed the largest absolute one). The drawdown alternative in criterion 3 is not computed, which makes the check stricter than registered; this is disclosed in ROBUSTNESS.md.
4. Added a sensitivity: walk-forward test years started flat with each year's pick.
5. Documented: walk-forward picks break ties by grid order as registered (ties occur in 2018 E, 2020 B, 2022 B); a next-open order fills at the next open even if that open is above the restriction's re-entry level; cross-ETF features are missing after 2026-09-08, so flags that use them are off for VGT's last ~24 holdout sessions.
