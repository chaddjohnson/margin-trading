# Growth-entry discovery — research direction

**Recorded:** 2026-11-03, from the user's brief
(`brief/2026-11-03-strategy-entry-explorer-ui-brief.md`). **Status:** research direction only.

> **This document authorises nothing beyond Stage 0.** Stage 0 (the Strategy Entry Explorer with synthetic demo data)
> is the only stage built so far. Every later stage needs a new instruction from the user and — for research stages — a
> study namespace under `research/<study>/` with its own frozen protocol, as every earlier study in this repository has.
> No growth-entry mechanism has been implemented, run on market data or optimised.

## 1. Objective

- Discover **robust entries that capture sustained price growth**, as a complement to the existing D1/B5 dip and
  recovery methods.
- **Do not change** D1, B5, `vg-balanced`, or any other frozen strategy, phenotype, pool or completed study.
- The research is about **entries** first. Exit optimisation is a later phase (§3, step 8).
- The user trades **all-in or not at all** at the strategy-entry level: no pyramiding or scaling-in research.
- **No leveraged ETFs.**

## 2. Entry hypotheses for later investigation

These are hypotheses to test, not requirements to code, and nothing about them is settled:

| ID | Hypothesis | Notes |
| --- | --- | --- |
| H1 | **Established rebound**: enter once price is about 5% above a recent low. | Lookback and threshold are research parameters. |
| H2 | **Shallow pullback within an established uptrend.** | Needs a frozen definition of "established uptrend". |
| H3 | **Breakout / growth resumption** above a prior high or base. | |
| H4 | **Re-entry after a profitable exit.** | Depends on a frozen exit policy, so it cannot be studied before one exists. |

Aim for **5–10 structurally distinct mechanisms**, distinct in the market condition they look for and their trigger
logic, not hundreds of cosmetic parameter variants.

**Prior evidence that the future protocol must address** (read before designing the study):

- `research/trailing-buy-entry/` asked whether VGT's daily dip-buy improves by waiting for a rebound of Y% (or K × ATR)
  from the lowest close. Its answer was **"no, keep the immediate entry"**. That is close to H1 in a different context
  (after a 10% drawdown arming signal).
- `research/study3-vgt-momentum*` (Stages 1, 1b, 1c) tested standalone VGT momentum entries with exits under a frozen
  rubric. The verdict each time was **no demonstrated edge**.
- `research/vgt-recovery-eligibility/` documents a phenotype that stayed out of the whole 2023 recovery. That is exactly
  the kind of missed growth this programme targets.

These results do not rule out the hypotheses above, but a new study should say what it does differently and should
not rediscover the same rules under new names.

## 3. Method (in order)

1. **Interactive chart with synthetic data — Stage 0, done in this task.** The Strategy Entry Explorer
   (`apps/strategy-entry-explorer/`, documented in [ENTRY_EXPLORER.md](ENTRY_EXPLORER.md)) shows a price series with
   the entry events of many variations, two at a time.
2. **Standard results schema, then real data.** A strategy-agnostic, versioned dataset schema (v1) now exists.
   A later task connects real historical price series and entry-event outputs through a **read-only adapter** that
   enforces the study's data doors (step 7).
3. **Implement a handful of distinct mechanisms** in a later task. Inspect their entry timing visually and evaluate them
   statistically **before any optimisation**.
4. **Measure each entry**, on explicitly defined horizons:
   - forward returns at fixed horizons (e.g. 21, 63 and 126 sessions);
   - the probability of reaching illustrative upside thresholds (+5%, +10%, +15%) within each horizon, and the time to
     reach them;
   - maximum favourable and adverse excursion (MFE / MAE);
   - early versus late participation in sustained rallies. Rally episodes need a fixed, pre-registered definition; then
     measure where in the rally (trough to peak) the entry falls and what share of the rally remains;
   - **baselines**: unconditional entry at every session; random entries matched in count and calendar distribution;
     buy-and-hold; and the existing D1/B5 entries as reference points, not as targets to replace.

   **Methodology to settle in the protocol:**
   - **Horizons and censoring.** Events without a full horizon are censored, reported separately and never counted as
     misses (the explorer's demo statistics already do this). Survival-style estimates (e.g. Kaplan–Meier) are the
     option for time to target.
   - **Trading costs.** Spread and slippage for executable entries; minute data for fills; the existing 5 bps per side
     and financing assumptions where a held position is simulated.
   - **Overlapping and clustered signals.** Signals within one horizon share the same price path, so they are not
     independent evidence. Report non-overlapping counts, group signals into episodes, and use block bootstrap or
     effective-N corrections so clustered entries do not overstate the evidence.
5. **Raw signals versus executable entries.** A signal may fire while the single all-in position is already open. The
   research exposes **all raw opportunities** and never calls them executed trades. Executable entries require a frozen
   position state and exit policy. The schema separates `signal` and `executed` events for this reason.
6. **Narrow mechanisms before tuning parameters.** Optimise only *promising* mechanisms, with restrained local sweeps and
   the repository's real optimisation tooling, not blind parameter searches. Prefer **stable parameter neighbourhoods**
   and behaviour across regimes over a single best historical point.
7. **Chronological validation and data doors.**
   - Use chronological train/validation splits, walk-forward tests where sensible, and untouched final holdouts, with
     explicit protection against hindsight and leakage. The repository's partitions (`data/partitions.json`) are
     training 2016-01-01–2023-12-31, holdout 2024-01-01–2025-10-16, and final from 2025-10-17.
   - Earlier D1 studies have already inspected data through 2026-10-29 (Study 9 Phase B disclosure). The protocol must
     state which periods are genuinely unseen *for this question*; a forward (paper) period after the freeze may be the
     only clean holdout.
   - **Do not render or inspect reserved holdout dates in research charts before the candidate is frozen.** A chart is
     itself a form of data exposure. The real-data adapter must clamp to the allowed dates, and the explorer must refuse
     anything beyond them.
   - Never optimise on holdout results.
8. **Entries need exits before they can be called useful.** Forward returns alone cannot establish that an entry is
   useful. Promising entries are later tested against one or two **frozen, standard exit policies** as a sanity check.
   After selection, entries and exits may be researched jointly, but without uncontrolled search overfitting. Exit
   optimisation is a later phase.
9. **Reusable infrastructure.** The schema and the explorer are for D1, B5, other strategies and ETFs, and later exit
   markers. They are permanent research infrastructure, not a one-off strategy viewer.

## 4. Success criterion — to define before any optimisation

Entry success must be **measurable and aligned with sustained growth**, not "the highest frequency of a small +5% gain".
A signal's attractiveness depends on several things together:

- upside capture of sustained moves (forward returns at the longer horizons; share of a rally captured);
- adverse excursion (e.g. the MAE 10th percentile);
- timing (time to target; early versus late in the rally);
- opportunity frequency (non-overlapping events per year);
- risk while held, once a frozen exit exists (drawdown, financing drag);
- results after exits and costs, eventually.

The study protocol must fix the criterion, its baseline comparisons and its decision rule, and freeze them, **before**
any parameter search. This document deliberately does not choose one.

## 5. Stage roadmap

| Stage | Content | Status | Authorised |
| --- | --- | --- | --- |
| 0 | Strategy Entry Explorer, schema v1, synthetic demo fixture, this plan | **Done (2026-11-03), awaiting the user's review** | Yes (this task) |
| 1 | User review of the UI; adjustments from that review | Next | Needs the user |
| 2 | Read-only real-data adapter (price series + existing D1/B5 entry events), with date-door enforcement | Future | No |
| 3 | Growth-entry study protocol: hypotheses, criterion, horizons, baselines, splits, doors, budgets; frozen | Future | No |
| 4 | Implement 5–10 distinct mechanisms; training-period visual and statistical evaluation, before optimisation | Future | No |
| 5 | Narrow to promising mechanisms; restrained optimisation with stability requirements | Future | No |
| 6 | Sanity check against frozen standard exits; validation; one-time holdout | Future | No |
| 7 | Joint entry–exit research under controlled search | Future | No |

**Boundary of the current stage.** The repository contains the explorer, its schema and validator, a synthetic fixture
generator, and this documentation. It contains no growth-entry strategy, no real-data entry events, no optimisation
run and no strategy change.

## 6. Warning: visual selection creates hindsight bias

Looking at a full-history chart and keeping the rules whose markers "look right" fits the past: the eye has already
seen the outcome. In particular:

- Look at **training-period charts only** until a candidate is frozen; the holdout is never rendered before then (§3.7).
- Write each hypothesis and its definition down **before** looking at its markers.
- Use the chart to **diagnose** — does the rule fire where its definition says it should, are signals clustered, are
  the executed entries plausible? Selection is the pre-registered statistical criterion's job.
- Treat every variation that was looked at as part of the search budget. A later version of the explorer should keep
  an audit log of what was viewed, and when.

## 7. What the current explorer is — and is not

- Its prices are **synthetic and fictional**: a seeded random walk. `VGT` is only an illustrative label.
- Its twelve demo variations are **toy rules** that make the fixture internally consistent. They are not
  implementations of H1–H4, they were never run on market data, and they are not candidates.
- Its "executed" entries come from an **illustrative occupancy placeholder**, not an exit or portfolio simulation.
- Its statistics are computed from the synthetic series with a documented horizon. They are **not evidence about any
  strategy or about VGT**.

## 8. Files

| File | Contents |
| --- | --- |
| `PLAN.md` | This research direction |
| [ENTRY_EXPLORER.md](ENTRY_EXPLORER.md) | The explorer: data contract (schema v1), semantics, alignment, JSON example, architecture, demo generator |
| `brief/2026-11-03-strategy-entry-explorer-ui-brief.md` | The user's brief for Stage 0, verbatim |
| `reference/strategy-entry-explorer-mockup.png` | The design mockup supplied with the brief |
| `../../../apps/strategy-entry-explorer/README.md` | How to run, test and extend the app |
