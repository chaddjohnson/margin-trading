# Adaptive re-entry research specification (coordinator; frozen before any family agent runs)

Phase 2 of the adaptive-reentry brief. Phase 1 (production `allIn.ts` with `baseline`/`lower3`
configurations, verified trade for trade) is complete: `PHASE1_VERIFICATION.md`. Production code is
frozen for all of Phase 2 (`CHECKSUMS.txt`), as are the research engine, the data files and the shared
`common/` infrastructure.

## Rules for every research agent

1. **Write only inside your assigned directory** (temp files in `<your dir>/tmp/`). Never write to
   `common/`, `phase1/`, `baseline/`, `lower-price-reentry/`, `data/`, `src/`, another family's
   directory, or any shared scratchpad. Do not commit. Do not modify production code.
2. **Use the shared infrastructure without modification.**
   - `sys.path.insert(0, '<repo>/research/risk-management/adaptive-reentry/common')` and
     `sys.path.insert(0, '<repo>/research/risk-management/baseline')`.
   - Strategies are compositions of `framework.AdaptiveStrategy` components (`trigger`,
     `required_level`, `reset`, `alt_entry`; see framework.py's docstring for exact chronology and the
     episode/correction state available to components). Families D and E may subclass
     `AdaptiveStrategy` when a composition cannot express a design, overriding hooks while preserving
     the chronology contract; any override must be called out in the report with its exact semantics.
   - Runs go through `runner.run_family(experiment, your_dir, configs)`, which enforces the
     calibration gate, computes the standard metrics, BOTH matched-exposure controls (baseline and the
     existing 3% strategy, the latter labeled ex-post), the vs-reference deltas, matching to the
     baseline, recovery windows (incl. 2026), false-reset and near-miss diagnostics, and writes
     `results/` (summary.json, trades/, daily/, states/, events/, matching/, recovery/).
   - If a configuration genuinely cannot be expressed, stop and report why. Do not copy the engine.
3. **Register before evaluating.** Every configuration — including each agent-proposed mechanism and
   every failure — is registered via `registry.register(your_dir, [...])` with `name`, `family`,
   `description`, `params`, `hypothesis` BEFORE its first run. The runner refuses unregistered names.
   The registry is append-only; do not delete entries that turned out badly.
4. **Predefined coarse grids only.** The grids below are fixed. Agent-proposed mechanisms (where a
   family asks for them) must be structurally distinct, have few parameters, carry a one-paragraph
   economic rationale in the registry, and be registered before evaluation. No refinement of any
   threshold after seeing results; promising neighborhoods are flagged for the validation stage, not
   explored ad hoc.
5. **No look-ahead.** Decisions at session i use data through session i's close. Indicator conventions
   are fixed in `common/indicators.py`; when an indicator is unavailable (NaN), fall back to the fixed
   3% requirement and count it (`ctx.counters['indicator_fallbacks']`).
6. **Datasets:** VGT_2005_2015, QQQ_1999_2015, VGT_2016_2026, QQQ_2016_2026 (full files; QQQ 2016–2026
   ends 2026-10-07). The runner handles loading.
7. **Python:** `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/41909225-8d9b-4bef-b77e-5932b66e8053/scratchpad/venv/bin/python`
   (pandas, numpy, tabulate; < 3.10, so no `X | Y` annotations at runtime). Read-only; install nothing.
8. **Verification duties (per agent):** after running, spot-check at least three restriction episodes
   of your most interesting configuration against raw prices (dates, frozen values, thresholds,
   resolution), confirm counter/episode consistency (the runner's events CSVs make this easy), and
   state in your report what you checked. Independent replay of top candidates happens centrally in
   the validation stage.
9. **Report** (filename per family below), organised as: (1) hypotheses as registered; (2) exact
   mechanism definitions; (3) results per dataset (net, max DD, P/DD, trades, W/L, blocked sessions,
   re-entries, resets, false resets, vs baseline, vs existing 3%, vs both matched controls);
   (4) bear windows (2000–02, 2007–09, 2022) and recovery windows (2003, 2009, 2020, 2023, 2025,
   2026); (5) the family-specific questions; (6) failure cases — name the episodes and trades;
   (7) dependence on few trades; (8) per-config classification (Promising / Inconclusive /
   Unpromising) with historical observation vs inference clearly separated; (9) parameters flagged
   for the validation stage. Do not summarize away negative findings.
10. **Economics, not scores.** Judge mechanisms by whether they fix an identified failure mechanism
    (repeated bear-market losses; missed V-bottom recoveries; financing-only false triggers; stale
    resets) at acceptable cost, not by net profit alone. The known reference points:
    baseline / existing-3% net profit (max DD): VGT05-15 11,602 (73,404) / 26,384 (54,279);
    QQQ99-15 −2,886 (149,561) / 40,258 (91,469); VGT16-26 161,772 (38,323) / 182,094 (28,687);
    QQQ16-26 116,388 (39,237) / 132,242 (23,564). Known failure episodes to watch: QQQ 2000–02
    cascade; QQQ/VGT 2008–09 (the −8% config missed March 2009 entirely); VGT 2020-03/04 (−5% missed
    the rebound by 1.0% of price); VGT 2023-01 (a −$143 loss blocked a +$28k winner; miss 1.6%);
    VGT 2025-04; VGT 2026-03 (−8% missed by 1.5%); QQQ 2003 basing period (all fixed thresholds
    missed the spring 2003 entries).

## Shared mechanics fixed in advance (do not reinterpret)

- Restriction chronology is the verified one (framework docstring). Reset priority on a same-session
  close; no entry on exit sessions; restriction clears when a position opens; profitable exits clear
  the correction.
- "Price return" of a trade = exit_price / entry_price − 1 (execution prices, interest excluded).
- "Financing-only loss" = net P&L < 0 with exit_price ≥ entry_price.
- Episode low = lowest CLOSE since the arming exit session (inclusive), `st.min_close`.
- All % thresholds compare CLOSES (the established same-close approximation); intraday alternatives
  belong to Family F only.
- A "false reset" = a reset whose next trade closes at a net loss (runner computes it).
- "Major winner" = baseline trade with net P&L ≥ $10,000; "rebound winner" = major winner whose
  preceding baseline trade lost.

## Family definitions

### A — Loss classification. Directory `loss-classification/`, report `LOSS_CLASSIFICATION.md`, experiment `adaptive_loss_class`.

Vary ONLY the trigger; discount fixed at 3% off the loss exit, reset fixed at frozen-high 95%.
Configs: `A0_net_loss` (any net loss; equals REF_lower3, run as anchor); `A1_price_loss_only`
(exit < entry); `A2_material_{05,1,2,3}` (price return ≤ −0.5/−1/−2/−3%); `A3_bands_a` (price loss
< $500: no restriction; $500–$5,000: 3% discount; > $5,000: 5% discount — dollar loss measured as
net P&L, bands on its absolute value); `A3_bands_b` (< $1,000: none; otherwise 3%);
`A4_proportional_{05,10}` (trigger: any price loss; required decline = clip(k·|price return|, 1%, 8%),
k = 0.5 / 1.0). A3/A4 need a `required_level` that reads `st.loss`/`st.price_return` — still pure
compositions. Questions: the brief's §6 list; count financing-only-loss restrictions per dataset under
A0 and name every major winner they blocked (the VGT 2023-01 −$143 episode explicitly); verify A1/A2
do not re-open the 2000–02 repeated-loss problem (bear-window table).

### B — Adaptive lower-price requirements. Directory `adaptive-discounts/`, report `ADAPTIVE_DISCOUNTS.md`, experiment `adaptive_discounts`.

Vary ONLY `required_level`; trigger = net loss; reset = frozen-high 95%. All discounts are off the
loss-exit price unless stated. Clip every computed discount to [1%, 10%] unless stated.
Configs: `B1_vol_k{1,2,3}`: discount = k·NATR14. `B2_loss_k{05,10}`: discount = 1% + k·|price
return|, k = 0.5/1.0; `B2_inverse`: discount = clip(3% − 0.5·|price return|, 0.5%, 3%) (severe loss ⇒
less extra waiting — do not prejudge direction). `B3_entry_anchor_{3,5}`: level = losing ENTRY price
× (1 − 3%/5%). `B4_credit_{50,100}`: level = exit × (1 − max(0, 3% − credit·max(0, −price return))),
credit = 0.5/1.0 (the trade's own decline counts toward the required discount). `B5_shallow3_deep15`:
discount = 3% while dd252 < 20%, else 1.5%; `B5_shallow3_deep6`: 3% while dd252 < 20%, else 6%
(dd252 = ind.dd_from_high(252); NaN ⇒ fallback). `B6_up`: discount by n_failed = 3%/5%/8% (1st/2nd/
≥3rd); `B6_down`: 5%/3%/2%. `B7_decay120`: discount = 3% · max(0, 1 − sessions_restricted/120);
`B7_stall`: 3% while the episode low is younger than 20 sessions, else decays linearly to 0 over the
next 60 sessions (age = i − st.min_close_i). `B8_first_entry_ladder`: level = correction first entry ×
(1 − 3%·n_failed); `B8_min_entry`: level = (lowest entry price in the correction) × 0.97.
`B9_atr_below_entry_k{1,2}`: level = losing entry − k·ATR14[i]. Plus `B10_*`: at least five
agent-proposed, structurally distinct mechanisms (registered with rationale first; not renamed
ATR/SMA/fixed-percent variants). Questions: which anchor (exit vs entry vs correction) best matches
the objective "a materially better purchase than the last failed one"; which mechanisms survive both
grinding bears and V-bottoms; fallback counts; knife-edge sensitivity at the known near-miss episodes.

### C — Recovery resets. Directory `recovery-resets/`, report `RECOVERY_RESETS.md`, experiment `adaptive_resets`.

Vary ONLY `reset`; trigger = net loss; discount fixed 3%. Configs: `C0_none` (mandatory diagnostic:
report unresolved episodes and sidelined opportunity cost); `C1_frozen95` (anchor = REF);
`C2_exit_price` (close ≥ frozen loss-exit price); `C3_entry_price` (close ≥ frozen losing entry);
`C4_rebound_{10,15,20}` (close ≥ (1+x)·episode low); `C5_atr_rebound_{3,5}` (close ≥ episode low +
k·ATR14[i]); `C6_retrace_{38,50}` (close ≥ low + f·(frozen ref high − low)); `C7_rolling95` (close ≥
0.95 · rolling 90-session prev high — REPORT the share of resets where the rolling high had fallen
below the frozen one, i.e. resets "earned" by decay rather than recovery); `C8_breakout20` (close >
highest close of sessions i−20…i−1); `C9_base40` (no new episode low for 40 sessions: i −
st.min_close_i ≥ 40); `C10_time_price` (sessions_restricted ≥ 60 AND close ≥ 1.05·episode low);
`C11_graduated` (state machine via required_level: 3% discount until close ≥ 1.08·low, then 1.5%,
plus the C1 reset for full normality — register as one config). Plus `C12_*`: ≥5 proposed resets
aimed at recognizing a stale/changed correction without a return near the old peak. Questions: false
resets during 2000–02 bear rallies per mechanism; which resets rescue the 2020/2023/2026 V-bottom
misses; C0's cost; whether C2 recreates the repeated-entry problem; obsolescence (longest episodes).

### D — Recovery opportunity preservation. Directory `recovery-opportunities/`, report `RECOVERY_OPPORTUNITIES.md`, experiment `adaptive_recovery_opps`.

Keep trigger/discount/reset at REF (net loss / 3% / frozen95) and add paths. Configs:
`D1_reset_only_rebound12`: ADDITIONAL reset when close ≥ 1.12·episode low (restriction clears; the
10% signal is still required for any entry — baseline-compatible). `D1_alt_entry_rebound10`:
alternative ENTRY while restricted when close ≥ 1.10·episode low AND close ≤ 0.85·frozen ref high
(narrow, explicitly exploratory; report separately). `D2_window`: alt entry when close ≤ required
level × 1.02 AND close ≥ 1.03·episode low (near-miss rescue: "almost reached the level, now turning
up"). `D3_tolerance_deep`: required level × 1.02 only while dd252 ≥ 25% (else exact) — compare
honestly against simply using a smaller fixed threshold. `D4_score`: alt entry when ≥ 2 of
{close ≤ losing entry × 0.97; close ≤ loss exit; dd252 ≥ 20%; close ≥ 1.05·episode low} — exact
definition registered before running. `D5_stabilized_relax`: discount drops to 1% once
max_close/min_close over the last 20 sessions < 1.05 (range stabilization; measure bear-market
false-stability explicitly). `D6` (diagnostic, no new config): for EVERY baseline winner blocked
under REF_lower3/5/8 (use lower-price-reentry results plus your own REF runs), classify the failure:
never reached the level / reached intraday only (ind: session low vs level) / variant was holding /
signal had lapsed / reset too late / small-loss trigger. Produce a table. Plus `D7_*`: ≥5 proposed
mechanisms. Questions: §9 of the brief; above all whether any path buys back the missed rebounds
without buying 2001-style bear rallies (count the 2000–02 alt entries and their P&L).

### E — Correction memory and state management. Directory `state-memory/`, report `CORRECTION_MEMORY.md`, experiment `adaptive_state_memory`.

Design question: what is the MINIMAL state that prevents both repeated losses and stale restrictions?
Configs (each a different state machine, ordered by state size): `E1_exit_only` (= REF anchor);
`E2_entry_only` (level = last losing entry × 0.97; no other memory); `E3_entry_count` (B8-style
first-entry ladder but with reset = C4 rebound 15% — register exact form); `E4_cum_loss` (discount =
clip(1% + |correction cum loss|/$100k, 1%, 8%)); `E5_no_small_rearm` (restriction arms only when the
correction's CUMULATIVE price decline from its first entry exceeds 2%; single small losses never
rearm). Use `correction_ends_on_reset` deliberately and state the choice per config. Answer the
seven questions of brief §10 explicitly, using your runs plus families A–C references where needed
(read their registries/results if available; do not wait for them). Flag, do not build, any state
machine needing more than ~4 remembered quantities.

### F — Intraday execution feasibility. Directory `execution-feasibility/`, report `INTRADAY_FEASIBILITY.md`, experiment `intraday_feasibility`.

Diagnostic first (daily OHLC): for REF_lower3, lower5 (fixed_discount(0.05)) and lower8 (0.08) —
register and run them as anchors — list every restricted, flat session where session low ≤ required
level < close. Classify each: (a) legitimately executable resting limit (level frozen before the
session AND level ≤ 0.90 × previous-90-session high so the dip condition holds at the limit price
itself — the close-based 10% signal is NOT knowable intraday; say so); (b) executable only under a
close-dependent condition; (c) gap-through (open < level ⇒ open fill); (d) ambiguous ordering. For
the known missed episodes (VGT 2020-03/04 C and D, VGT 2023-01 all, VGT 2026-03 D, QQQ 2003), state
whether a resting limit would have filled, at what price, and what the resulting trade would have
earned under the engine's exit rules (you may run an exploratory variant with a documented
limit-order execution model — clearly labeled as an execution-model change, filled at the limit
level, or at the open when it gaps through; sensitivity: also require low ≤ level × 0.999). Do NOT
fill at session lows. Then: minute-data availability — check both repos' data dirs (margin-trading
has none; /Users/chad/development/personal/trading/data has a Stooq DAILY archive only) and report
honestly what free, reliable minute history for QQQ/VGT 1999–2026 would require; quantify what stays
unresolved without it. No multiyear intraday backtest unless the diagnostic shows it would change
conclusions materially — justify either way.

### G — Combinations. Directory `combinations/`, report `COMBINATIONS.md`. Launched by the coordinator AFTER standalone families return; selection per brief §12 (complementary mechanisms, ablations, no Cartesian products).

### Validation. Directory `validation/`, report `ROBUSTNESS.md`. After G: independent replay of top candidates, sensitivity around their parameters, episode-level consistency, and unchanged-parameter tests on fresh instruments (data/QLD, data/SOXX, data/VOOG 2016–2026; optionally long-history ETFs from the trading repo's Stooq archive).

## Coordinator responsibilities

Freeze/checksum (done: `CHECKSUMS.txt`); consolidate `HYPOTHESES.md` from the registries; select and
launch G; run validation; write `COMPARISON.md` and `RECOMMENDATIONS.md` with the brief's nine
rankings and twelve final questions; maintain the complete experiment registry (union of family
registries) and the multiple-testing caveats.
