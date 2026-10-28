# PROTOCOL — Study 3 Stage 1 `study3-vgt-independent-momentum-v1`

**Version 1.2** (v1.0 draft revised after methodology review 1 and re-review 2: `reviews/METHODOLOGY_REVIEW_1.md`,
`reviews/METHODOLOGY_REVIEW_2.md`, dispositions beside them; the v1.0 drafts are kept in `reviews/superseded/`). It becomes
binding when the `freeze-protocol` stage records the sha256 of this file and of `MECHANISM_CATALOG.json`,
`EXPERIMENT_MATRIX.json`, `FIRST_PRINCIPLES_AND_HYPOTHESES.md`, `MECHANISM_SELECTION.md`, the brief and both review
disposition files in `PROTOCOL_FREEZE.json`. **Precedence** where frozen texts differ: catalog v1.1 definitions >
this protocol > the experiment matrix > the FP and selection narrative (FP §6 lists its superseded sentences).
No momentum mechanism has been run on market data before that freeze. After it, changes are append-only amendments
(`AMENDMENTS.md`, `results/amendments.jsonl`); anything they introduce after outcomes are seen is exploratory.

## 1. Question, scope, evidence level, design-bias register

- **Question (brief §1).** Can a simple, executable long-only rule on VGT recognise ongoing upward movement, enter
  without an earlier deep decline, stay in profitable trends or renew positions after exits, and control downside and
  financing drag across regimes — after 11% interest, friction and execution stress?
- **Scope.** VGT alone; one fixed $100,000 borrowed slot; standalone. No D1/B4/B5 pairing, shared pool or combined
  allocator (Stages 2–4 are not authorised). No change to any existing strategy, phenotype, pool, registry, config,
  data or prior study.
- **Evidence level.** Every window of 2016–2023 was inspected by earlier studies and the designer knows its broad
  history. The fold replays are **retrospective, chronology-respecting evaluations of a frozen selection procedure**:
  they test only that the procedure's *execution* is blind to each window, not that its *design* is. The full-history
  (2017–2023) run is an in-sample exploratory reference. No significance is claimed; four overlapping one-year windows
  support screening, not inference.
- **Known-history design-bias register.** (a) The fold layout (brief §4) has three advancing windows (2020, 2021,
  2023) and one declining (2022), as the designer knew. (b) The template defaults (hard 8%, trailing 10%), the
  catastrophic 15%, E01's d_out 10% and E11's D 15% are round values chosen with general knowledge of VGT's ~1.5–2%
  daily volatility and of its 2018/2020/2022 declines. (c) E06 (calm advance, M05) is motivated by Study 2's finding that
  the D1 slot sat idle in calm advances (2017–18, 2019, 2021, late 2023), which include windows B and D. (d) The M1
  gates run at these defaults, so this knowledge influences which families are searched. (e) Every parameter box was
  set with the same general knowledge. These are disclosed, not neutralised.

## 2. Data and doors

- **Input.** `data/VGT/data.csv` through the shared loader only (`src/lib/evaluation.ts loadDatasetSessions`,
  partition `training`, access `optimization`, which refuses holdout/final/all before reading), with an explicit end
  date ≤ **2023-12-29**; regular-session bars and the closing print; recorded splits forward-adjusted (none falls in
  2016–2023 for VGT). File sha256 and loaded-bar sha256 are recorded in every stage record. The code refuses any end
  after 2023-12-29.
- **Doors per stage.** A history's development stage loads data **through its development end only** (A 2019-12-31,
  B 2020-12-31, C 2021-12-31, D 2022-12-30, H 2023-12-29). A fold's evaluation loads through its window end and
  refuses to run unless that fold's selection record is sealed and verifies.
- **Calendar.** New York session dates; early closes from `src/lib/calendar.ts`; missing minutes are never imputed.
- **Accounting basis.** **Price-only** for every candidate and control (the frozen fixed-slot convention). A
  distribution diagnostic (`config/market-events/distributions.csv`, ex-dates ≤ 2023-12-29, shares held over each
  ex-date) is reported separately for finalists, C-AL and C-ALR; it never enters a decision. Price-only accounting
  understates high-exposure rules by roughly VGT's dividend yield on their exposure (about 0.6–1% a year).

## 3. Execution and accounting (identical for candidates and controls)

- **Clock.** Daily rules decide at a session's close from sessions ≤ s and execute at the next session's opening
  trade (O = the first regular minute's open). Minute rules (E09/E10) decide at completed minutes (decision time = bar
  start + 60 s) and fill at the first trade at or after the decision — D1's `firstTradeAfterDecision`/`priceAt`/`timeAt`,
  imported (the next minute's open, the closing print for a decision before the close, else the next session's opening
  trade). First decision close **2017-01-03**; first order 2017-01-04; accounting from the close of 2017-01-03 (mark 0);
  lookbacks ≤ 250 sessions from 2016-01-04. Minute rules' first eligible decision session is 2017-01-04.
- **State machines** start at the first session where their inputs are defined (from 2016-01-04): hysteresis states
  (start OUT), the E04 CUSUM, the E05 zigzag, the E11 permission, E07's pending breakout. Event and intraday detectors
  run every session; triggers while long are ignored. **A level family's fresh signal** is any flat close whose state is
  IN while no campaign is alive (including the first decision close). Because an own-OUT condition seen while long ends
  the campaign, a state that lapsed and re-qualified *during* a trade lets the next flat close enter after a stop (as a
  first entry), whereas a state that stayed IN waits for the re-entry rule — a disclosed asymmetry of the level
  semantics.
- **Resting stop.** One sell-stop level per session = the maximum of the configuration's active components (hard:
  raw first fill × (1 − h); trailing, catastrophic: Hc × (1 − x), Hc = max(raw first fill, closes held); X2's
  ATR-scaled level; X5a's stages; X5b's probation/promotion), recomputed at each close and **never lowered except by
  X5b's promotion** (a deliberate widening). All components are active from the fill bar (at the fill, Hc = the raw
  fill and X2 uses the previous close's ATR). Scanning minutes in time order from the fill bar (bar 0 for a carried
  lot), the first minute whose open ≤ stop exits at that open (a **gap stop** at bar 0), otherwise the first whose low ≤
  stop exits at the stop level. The closing print does not trigger a stop (the frozen D1 convention; the next session's
  gap check applies). A close-decided exit executing at an opening trade that is ≤ the stop is recorded as a gap stop.
  Stop slippage (M5) applies to every stop and gap-stop fill.
- **Same-session order.** (1) a pending close-decided exit (or gap stop), else the gap check, then a pending entry
  and tranche changes at the opening trade (+ delay in M5); (2) the minute loop: resting stop, the minute rule, minute
  marks; (3) at the close: features, Hc, exit decisions, campaign state, entry decisions, the next stop level; (4)
  daily marks. **At most one entry fills per session and none in a session that had an exit**; a close-decided entry
  at the close of a session with an exit fills next open; if one close yields an exit and an entry signal, only the
  exit executes. Z1/Z2 tranche changes are not entries.
- **Campaigns and re-entry** (catalog `campaignState`). After an exit other than own OUT, a campaign stays alive while
  the family's own condition holds (level: state IN; event and intraday: own OUT not yet true at a close; E11:
  permission ON). An own-OUT condition seen at any close **while long** ends the campaign at the exit even when the
  configuration does not exit on own OUT. While alive, the configuration's re-entry rule applies; an event family's
  fresh trigger re-enters the same campaign with its own references (under R1 it is the only way in, under R5 nothing
  enters while alive, and R2's cool-down yields to it). The R3/R4
  reference is Hc of the most recently stopped trade. **First entry** = an entry while no campaign is alive.
- **Minute-rule references.** E09's lowest and E10's highest minute price accumulate from the exit minute (including
  the rest of the exit session; at the start from 2017-01-03's minutes) and can trigger only from the next session.
  E10's reference starts at the exited trade's Hc, so it buys only a genuine new high since the exit.
- **Fills, friction, interest.** Buy at raw × (1 + slippage) × (1 + bps/10⁴), sell at raw × (1 − stop slippage) ×
  (1 − bps/10⁴); baseline **5 bps per side**, no slippage. Shares = principal / buy price (fractional). Interest =
  principal × rate × (exit session date − entry session date) / 365 days, **11%** simple; same-session round trips pay
  none. Each tranche is its own lot. No compounding, no borrowing against proceeds.
- **Marks and drawdowns.** Mark = realised + Σ open lots (shares × price − principal − interest to the session date),
  at every minute close while a lot is open, at each fill and at each session close; the **minute drawdown** is the
  frozen `Tracker.updateStrict` maximum of those marks (minute closes, not lows, and without exit friction — slightly
  understating intraminute risk); the daily drawdown uses the session-close marks. **Liquidation-equivalent** marks
  (exit friction deducted) value window increments and horizon ends. Every drawdown percentage is $DD / $100,000.
  Per lot: MAE/MFE from minute lows/highs between fill and exit.
- **Window increments and the procedure path.** For a window (b, e], V = liquidation mark at e's close − liquidation
  mark at b's close of one continuous run from the first session (an open lot at b is carried, with its old stop
  references — a hypothetical switch at b would rebuy at b + 1's open; disclosed). Window drawdowns restart the peak at
  b's mark. The **procedure path Π** chains the four fold picks' window marks (P\*_A over 2020, P\*_B over 2021, …),
  each window continuing from the previous window's end value with the peak carried across boundaries.
- **Development-end accounting.** Development net = the liquidation mark at the development-end close; a pending
  order is not executed; closed-trade counts exclude the open lot; the trade-path hash encodes an open lot's exit as
  (−1, −1). Stage S5 checks that the replay's liquidation mark at b equals the sealed development value within $10⁻⁶
  (different code paths; differences observed on synthetic data ≤ $10⁻¹⁰).

## 4. Mechanisms (frozen in `MECHANISM_CATALOG.json` v1.1)

Panel entries E01–E12 (ten distinct rules in seven groups; E01 at d_in = 0, E07 at A = 0, E11 and C-DON are all
N-session-high rules, and E02 at a_in = a_gap = 0 is close to C-TSM), the exploratory prototype X-CS (defaults only,
never searched or selected), the M3 template TPL, exits OX, CX1 (= X1 = X6c = X8P), CX2 (= X8T), X2–X6b, X8OR,
X8AND, HS, re-entry rules R0–R5 and R3F, sizing Z0–Z2, modifiers A1–A3, controls C-SMA, C-DON, C-TSM (and each × TPL
defaults), C-AL (one lot whose exposure drifts with price), C-ALR (the always-long fixed-slot reference), C-IDLE, and
the registered VGT D1 primary (context only, frozen engine).

## 5. Histories and folds (frozen before any result)

| History | Development data | Evaluation window (b, e] | Purpose |
|---|---|---|---|
| A | 2016-01-04 → 2019-12-31 | (2019-12-31, 2020-12-31] | shock and recovery |
| B | → 2020-12-31 | (2020-12-31, 2021-12-31] | continuation, chop |
| C | → 2021-12-31 | (2021-12-31, 2022-12-30] | extended decline, false recoveries |
| D | → 2022-12-30 | (2022-12-30, 2023-12-29] | new advance while D1 is idle |
| H | → 2023-12-29 | none | in-sample exploratory reference; candidate register; M5 finalists |

Development metrics cover decisions from 2017-01-03 to the development end (fold A has three trading years).

## 6. Stages (write-once, in this order, code-enforced)

| Stage | Content | Door |
|---|---|---|
| S0 `audit` | data QA (sessions, minutes, gaps, early closes, closing prints, overnight moves), file and loaded-bar hashes, protected-input manifest, baseline test status | ≤ 2023-12-29 (no strategy run) |
| S1 `freeze-protocol` | sha256 of PROTOCOL.md, MECHANISM_CATALOG.json, EXPERIMENT_MATRIX.json, FIRST_PRINCIPLES_AND_HYPOTHESES.md, MECHANISM_SELECTION.md, the brief | none |
| S2 `parity` | (a) D1 anchor: VGT primary through 2023-12-29 via Study 2's `standaloneRun` = its sealed record, every trade field; (b) fast engine = slow reference on fold A's development data (≤ 2019-12-31) for every panel default × OX/CX1/CX2/TPL, X-CS, C-SMA/C-DON/C-TSM × {own exit, TPL}, C-AL, C-ALR (independent restatement), Z1 on every family, and 64 seeded random TPL vectors per family — recording **only** field names, difference counts and \|Δ\| (no net, mark, DD or P&L level, in records or logs); (c) synthetic adversarial fixtures and default trigger rates on synthetic walks; (d) door refusals. A failing attempt stays sealed (redacted); after a code fix S2 reruns as `parity-rerun-<n>`; S3 requires the latest attempt to pass. | ≤ 2019-12-31 for (b); (a) is the D1 engine |
| S3 `freeze-code` | sha256 of every file in the import closure of `src/study3-vgt-momentum/` (incl. `src/lib/**`, the imported strategy, data and tracker files) + `package.json`, `package-lock.json`, `tsconfig.json` | none |
| S4-A, S4-B, S4-C, S4-D, then S4-H `develop-<X>` | M1 panel (entries × OX/CX1/CX2/TPL at defaults, X-CS, controls) → gates → planned-count check → M3 search → selection → **seal** | development end |
| S5-A..D `evaluate-<F>` (after S4-H) | replays of the sealed picks, every champion, P0, every family's TPL default and every control through the window end; re-entry swaps R1/R2/R0 of P\*_F; R0 stresses; the b-mark equality check | window end; needs the fold's seal |
| S6 `diagnostics` | M2 matrices on H (and per calendar year) | ≤ 2023-12-29 |
| S7 `robustness` | M5 on the finalist set; full-history parity (fast = reference) for every finalist and control | ≤ 2023-12-29 |
| S8 `analysis` | rubric, labels, ledgers (§13) from sealed records only | sealed records |

Every stage records the git HEAD, `git status --porcelain` outside the study (only the authorised policy files and
`package.json` may differ), the protocol-freeze and code-freeze hashes, its door and its payloads' sha256, and verifies
its predecessors. A defect found after S3 that violates a predeclared test or identity is fixed only through an
append-only amendment: re-hash the code freeze, rerun every affected stage with its original seeds as `rerun-<n>`, keep
both records, and base the verdict on the rerun. No other code change is allowed after S3.

## 7. M1 gates (per family and history; development window; 5 bps, 11%)

A family enters M3 in a history only if, at its **TPL default** (catalog defaults, h 8%, t 10%): (g1) ≥ 6 closed
trades and ≥ 3 campaigns; (g2) a lot held at a close in ≥ 3 distinct calendar years; (g3) minute drawdown ≤ $50,000;
and (g4) development net > 0 under at least one of OX, CX1, CX2, TPL. Every gate outcome is recorded; failed families
stay in the denominator of mechanisms investigated.

## 8. M3 search and selection (per passing family and history)

- **Box.** The family's catalog parameters plus h ∈ [3%, 15%] and t ∈ [4%, 30%] (d ≤ 5); quantised per the catalog;
  derived thresholds from their gaps. Continuous mapping lo + u(hi − lo); integer mapping min(hi, floor(lo + u(hi − lo +
  1))).
- **Global stage.** 1,024 points of a Sobol sequence (Joe–Kuo, Gray-code order) with a random digital shift; seed =
  first 8 hex digits of sha256(`study3|<family>|<history>|global`) → mulberry32 → one 32-bit XOR mask per dimension.
  Identical quantised vectors are evaluated once (the first index keeps them).
- **Feasibility.** Development minute drawdown ≤ **$35,000**; ≥ 6 closed trades and ≥ 3 campaigns; a lot held at a
  close in ≥ 3 calendar years; development net > 0.
- **Local refinement.** The 4 best feasible, trade-path-distinct points by development net; 32 points each, spread
  uniformly (a digitally shifted Sobol sequence, seed `…|local|<k>`) over ±10% of each parameter's range around it
  (clamped, quantised; tie-break index 1024 + 32k + j).
- **Shortlist.** The 16 best feasible, trade-path-distinct points of global ∪ local by development net (ties by index).
- **Neighbourhood.** For each shortlisted point, the 2d one-at-a-time points at ±10% of each parameter's range
  (integers: half-away-from-zero, at least one step); a point clamped onto the centre is replaced — the + point by
  centre − 2·step, the − point by centre + 2·step, quantised — and dropped (shrinking the denominator) if that equals
  the centre or leaves the box. Neighbourhood median = median
  development net over the centre and its points; neighbourhood feasibility = share of them with minute drawdown ≤
  $35,000 and net > 0. Each shortlisted centre is re-simulated at 10 bps.
- **Family champion.** Highest neighbourhood median among shortlisted points with neighbourhood feasibility ≥ 0.75 and
  10 bps net > 0; ties by lower index. None qualifying → no champion. Champions on a box boundary are reported.
- **Procedure pick P\*.** The family champion with the highest neighbourhood median (ties by family ID). **P0**: the
  M1-passing family whose TPL default has the highest development net (no search). Secondary, descriptive: P\*-R =
  highest neighbourhood median ÷ max(minute drawdown, $5,000); a Pareto report over development net, minute drawdown
  and exposure.
- **Budget (code-enforced).** Planned evaluations per family-history = 1,024 + 128 + 32d + 16 = 1,168 + 32d; the M1
  panel (≤ 70 runs per history) is counted separately. Caps: 16,000 per history and 80,000 in total; a history whose
  planned count (from its gate outcomes) exceeds a cap refuses to start. Every evaluated point is archived (compressed
  JSONL: parameters, index, stage, net, price gain, interest, friction, closed trades, campaigns, years held, minute
  and daily DD, exposure, borrowed dollar-days, worst/best lot, MAE/MFE, holds, entry/re-entry mix, exit-reason mix,
  profit factor, trade-path hash, feasibility flags).
- **Seal.** The history's selection record (gates, planned and used counts, champions, P\*, P0, archive hashes) is
  sealed before any evaluation window is loaded.

## 9. M4 evaluation (per fold)

P\*, every champion, P0, every family's TPL default, the controls (incl. C-SMA/C-DON/C-TSM × TPL defaults) and
C-IDLE, each replayed continuously from 2016 through the window end. Reported: V, price gain, interest, friction,
lots entered and carried, exposure and borrowed dollar-days, window minute and daily DD ($ and % of $100,000), worst
lot, insufficient-evidence flag, first-entry vs re-entry split, campaign economics, and from the window's trade rows
the realised/unrealised split, profit factor, holding statistics and MAE/MFE. P\*_F is also replayed with R1, R2
and R0 in place of its re-entry rule (descriptive). D1 appears from its own frozen engine (context, its own arming
convention).

## 10. M5 robustness (finalists)

- **R0 (procedure stresses).** Each sealed P\*_F re-simulated over its window without re-selection at 10 bps, at 14%,
  with 25 bps stop slippage (incl. gap fills) and with a +1 minute delay.
- **Finalists (≤ 5):** H's P\*, D's P\* (if different), and H's champions of the next families by neighbourhood median.
  On 2017-01-03 → 2023-12-29: friction 0/2/5/10 bps (re-simulated); interest 8/11/14% (X6b's 0.11 constant is fixed);
  stop slippage 10/25/50 bps; entry slippage 10/25 bps on every entry fill; delays +1 and +5 minutes (opening fills at
  the first trade ≥ open + k; stops at the first trade ≥ trigger minute + k; minute entries at decision + k; a minute decision carried to the next session as an opening fill, at the first trade ≥ that open + k); missing
  bars (a seeded 1% and 5% of non-first minutes removed); one-at-a-time ±1 and ±2 steps of 5% of each range; 64 joint
  draws uniform in ±10% of each range (seed `study3|<candidate>|joint`); re-entry swaps R1/R2/R0; random-entry placebo
  (200 draws, seed `study3|<candidate>|placebo|<k>`: at each eligible flat close enter with probability = the
  candidate's entries ÷ its eligible flat closes; the family's entry rule — its minute rule included — and own OUT are
  unused; each entry's exit is decided at the close of its n-th session held, n drawn from the candidate's own sessions
  to the exit decision (sessions held − 1, at least 1), unless its price stops (h, t) fire first), with the candidate's
  percentile reported as descriptive, not a significance test; inverted-state placebo for level families (enter when
  the state is OUT, exit when IN, same stops). Outputs: largest win/loss by lot and campaign, consecutive losses,
  recovery time, time underwater, holding distribution, exit-reason mix, % time funded, interest and friction, net per
  borrowed dollar-day, MAE/MFE, Z1 against Z0 scaled to Z1's average exposure, and the count of held sessions whose
  closing print was at or below the untriggered stop with the next open's outcome. Brief §6.2's crisis trace of the X2
  stop (ratcheted and un-ratcheted ATR levels, late 2018 and early 2020) is part of S6. A delayed stop closes the lot at
  the trigger minute's iteration at the delayed price, so the minutes in between are not marked (stress runs only).
  Settings other than 5 bps / 11% / no stress are **exploratory** except as used in §11.

## 11. Verdict rubric (frozen; labels applied in this order)

Let V_F be P\*_F's increment in fold F's window (V_F = 0 if P\*_F is undefined). A window is **positive** if V_F ≥
+$2,000 (|V_F| < $2,000 is flat).
1. **No acceptable candidates** if P\* is undefined in ≥ 2 folds.
2. **Insufficient evidence** if P\* has no lot entered or carried in ≥ 2 windows.
3. **T:** (i) Σ_F V_F ≥ +$20,000; (ii) positive in ≥ 3 of 4 windows; (iii) window minute drawdown ≤ $35,000 in every
   window; (iv) min_F V_F ≥ −$15,000; (v) Π's minute drawdown ≤ $35,000. T fails → **no demonstrated standalone edge**.
4. **E (exposure-matched edge):** f_F = P\*_F's borrowed dollar-days in window F ÷ ($100,000 × calendar days from b to
   e), where borrowed dollar-days = Σ over sessions s from b to e − 1 of the principal held at s's close × calendar days to
   s + 1 (so f_F ∈ [0, 1]); B_F = f_F × V_F(C-ALR). E passes if Σ_F (V_F − B_F) ≥ +$10,000 and V_F − B_F ≥ +$2,000 in ≥ 2
   of 4 windows. E fails →
   **positive retrospective net explained by exposure; no demonstrated timing edge**.
5. **R:** R0 holds (Σ_F V_F > 0 under each of its four stresses, and every stressed window's minute drawdown ≤
   $35,000), and for both H's P\* and D's
   P\* on 2017–2023: (r1) net > 0 at 10 bps; (r2) net > 0 at 14%; (r3) ≥ 75% of the 64 joint draws have net > 0 and
   minute DD ≤ $35,000; (r4) net > 0 with 25 bps stop slippage; (r5) net > 0 with a +1 minute delay; (r6) minute DD ≤
   $35,000 (r1 and r6 are identity checks for H's P\*). R fails if H's or D's P\* is undefined (D's P\* equal to H's counts once). R fails → **no demonstrated
   standalone edge (fragile)**.
6. **K:** P\* exceeds a control C ∈ {C-SMA, C-DON, C-TSM} iff Σ_F V_F(P\*) − Σ_F V_F(C) ≥ +$5,000 **and** P\*'s largest
   window minute drawdown (over the folds where P\* is defined) ≤ C's (over all four folds), or ≤ $35,000 where C's
   exceeds $35,000. Not all three → **promising standalone value, no
   demonstrated advantage over conventional trend controls (unvalidated)**.
7. Otherwise → **promising but unvalidated**.

Π (T(v)) chains the fold picks' non-liquidation minute marks: each window is offset to start at the previous window's
end mark, the peak starts at 0 at fold A's boundary and carries across, and folds without a P\* are flat. "Campaigns"
in the gates and feasibility = first lots of first entries in the development window, an open one included. The
search's value is reported as Σ_F V_F(P0) against Σ_F V_F(P\*) (descriptive).

Every label is retrospective; none authorises deployment or pooling. H's P\* is the candidate carried to any later
stage; its evidence is the procedure's fold record, not its own in-sample result. **Family labels (descriptive):**
"positive in ≥ 3 windows" (Σ V > 0 and positive in ≥ 3 of the folds where it had a champion), "regime-dependent" (Σ V
> 0 otherwise), "negative" (Σ V ≤ 0), "insufficient" (champion in < 2 folds); the same labels are computed for every
TPL default and control as reference rates. The total number of evaluated configurations accompanies every result;
P\*'s development net is never quoted as an expected result.

## 12. Reviews, disclosures and limits

A methodology review preceded this version; a separate final code/evidence review follows the results; both are kept
verbatim with dispositions in `reviews/`. Disclosed limits: one ETF and one secular bull market with three declines;
overlapping regimes; inspected history and designer knowledge (§1); no bid/ask data (slippage is synthetic stress); no
margin-call or maintenance modelling; price-only accounting; minute-close drawdown sampling; carried lots at fold
boundaries; M2 diagnostics run after M3 by design (so they cannot choose the template — a deliberate departure from
the brief's M2 → M3 order); the engine mirrors D1's minute fills, interest and friction but, unlike D1, checks stops
from the fill bar and trails from closes.

## 13. Ledgers (frozen formulas; hindsight labels, descriptive only)

- **Trend legs.** Zigzag on daily closes with 10% reversal from 2016-01-04; an up-leg runs from a confirmed trough
  session t0 to its next peak session t1 within 2017-01-03 → 2023-12-29 and gains ≥ 15% (C_{t1}/C_{t0} − 1); a final
  unconfirmed leg counts if it gains ≥ 15% to 2023-12-29.
- **Per leg and strategy.** Capture = Σ_lots shares × (end − start) ÷ ($100,000 × leg return), start = entry raw if the
  lot entered after t0 else C_{t0}, end = exit raw if it exited by t1 else C_{t1} (lots not overlapping (t0, t1]
  contribute 0); entry delay = sessions from t0 to the first entry inside the leg (n/a if none); idle share = share of
  sessions in (t0, t1] with no lot at the close; lost post-stop gain = Σ over exits inside the leg of max(0, P_next −
  P_exit) ÷ P_exit, P_next = the next entry's raw price if before t1 else C_{t1}; net inside the leg = liquidation-mark
  change from t0 to t1.
- **Episodes.** E2018 = 2018-10-01 → 2019-04-30; ECOVID = 2020-02-19 → 2020-08-31; E2021, E2022, E2023 = the calendar
  years (2023 ends 2023-12-29). Net, DD, lots, exposure per episode.
- **Concentration.** The largest lot's and the largest campaign's share of net (when net > 0).
- **D1-idle overlap.** Sessions at whose close the sealed VGT D1 primary ledger (Study 2, `signals-2023-12-29`, View U
  VGT) held no lot; the candidate's daily-mark changes split into D1-idle and D1-holding sessions. Descriptive timing
  only — not a shared-capital simulation.
