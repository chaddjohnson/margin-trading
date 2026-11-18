# Protocol — Risk metrics and optimization methodology (pre-optimization assignment)

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before the
baseline parity stage and before any selector result of P2 exists). Afterwards it is never edited; changes go to
`AMENDMENTS.md` (append-only).

Research only. Nothing here changes a trading rule, optimizes a phenotype, adopts or deploys a strategy, replaces New L0,
promotes N/original, issues or prepares a broker order, alters the canonical optimizer's fitness or selection defaults,
registers a standard version, or merges anything into `main`. Every proposed rule is **experimental and not adopted**.
Reports are written analysis, Markdown tables and machine-readable results only (standard §7.7).

- **Study:** `research/vg-l0-risk-metrics/`; code `src/vg-l0-risk-metrics/` (research-only pure metric functions, the
  engine adapter, the margin model, the experimental selectors) and `tools/vg-l0-risk-metrics/` (stage runners). Run
  from the repository root with `node --experimental-transform-types --disable-warning=ExperimentalWarning <file>`.
- **Brief:** `brief/BRIEF.md` (the user's "Claude Code — Risk Metrics and Optimization Methodology (Pre-Optimization
  Assignment)", 258 lines, 27,831 bytes, sha256 `c2eaa0e83a9427c40a1f045f6e9fdab5a5a39fb6900b64c3941bf394174d2657`,
  read in full to its final "Success criterion").
- **Branch:** `research/vg-l0-risk-metrics` (main checkout) from `67b4ae711bea141bbd721d78bb08fb3a2f07a977` (=
  `origin/research/vg-l0-full-joint`, Assignment 3's verified tip; it contains `main` = `108c241b`). No worktree.

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.2.0`, sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24` (registered current) |
| Read / adopted (UTC) | read in full 2026-11-18T05:30Z; adopted at the manifest's `adoptedAt` |
| Adoption manifest | `STANDARD_ADOPTION.json` (checked by `npm run research-preflight -- --study research/vg-l0-risk-metrics`; the stage runners call `requireStandardAdoption`) |
| Scope | `diagnostic` (bounded replays of fixed sealed selections, metric research and a retrospective selector experiment on archived populations; no search) |
| Reference method | none reproduced. NL0 1.0.0 (`docs/research/methods/NEW_L0_METHOD.md`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`) is the audited method and the control, unchanged |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5 | adaptation | No primary, no role and no candidate is selected for any use. The experimental selectors P2/P2b are applied retrospectively to Assignment 3's archived populations to compare them with the unchanged P0 (NL0 original) and P1 (RA1); their outputs are research comparisons, never nominations. | — (brief Stage 5, success criterion) |
| AD2 | §0.2, §5.8, §5.9 | **departure (study-specific)** | The experimental selector P2 (and P2b) uses new and report-only risk quantities as gates and ranking inputs: trade principal loss, banked-capital drawdown, the stop-aware conservative value of the open lot at the cutoff, and a structural bounded-loss-exit tier (§9). Only P2/P2b and their ablations use them; P0, P1, Q1–Q6 and every sealed record are unchanged; the standard is not changed. | Brief Stage 5: "Prepare explicit, versioned experimental alternatives … P2 / capital-and-stop-aware: a proposed selector that distinguishes losses below trade principal from profitable-trade giveback, accounts for actual stop state and exposure …" |
| AD3 | §1.2, §1.4, §1.6 | adaptation | FULL (2016-01-04 → 2026-10-30) is opened only to replay FIXED configurations already sealed by completed studies whose own FULL guards are sealed and committed (Assignment 3's FROZEN_SELECTION.json and validation; Assignment 2's; 5B's), and for the P2 primaries' C24 descriptive rows after P2 is frozen here. 2025–2026 is **previously examined history**; no choice, threshold or formula of this study uses it; P2 is frozen before any P2 result exists. | — |
| AD4 | §4, §0.1 | adaptation | No search, no new phenotype vector, no parameter perturbation beyond regenerating already-sealed neighbourhood families with the audited study's own code and seeds (report-only). Fresh simulations are bounded deterministic replays (cap §10). | — (brief Stage 3, Stage 5.8) |
| AD5 | §6.3 | adaptation | No tuning benchmark; replays run in-process inside one contained systemd unit at a time; observed resources are reported. | — |
| AD6 | §1.8, §1.9 | adaptation | The fold paths of P2/P2b are **retrospective**: P2 was designed after 2020–2026 had been examined repeatedly and after P0's and P1's fold outcomes were published (§2). They are reported with the frozen labels of Assignment 3 but are never presented as independent chronological evidence of P2; "supported" for P2 would mean "retrospectively consistent", not qualification. | — (brief Stage 5.6, 5.10) |

## 1. Question, objectives and outcomes

- **Question.** Does the NL0/RA1 optimization-and-selection process conflate principal loss, profit giveback and
  margin-liquidation exposure, and would a capital-and-stop-aware selector choose materially different candidates on the
  same archived populations — without being tuned to a preferred historical winner?
- **Objectives.**
  1. Reproduce New L0 and N/original exactly (Stage 0).
  2. Define, implement and test separate metrics for marked-equity drawdown, trade principal loss, account principal
     and banked-equity risk, unrealized-profit giveback and stop-aware conditional protection (Stage 1).
  3. Build a parameterized, illustrative account-margin scenario model kept apart from the fixed-slot ledger (Stage 2).
  4. Audit existing sealed candidates with the new metrics (Stage 3) and audit where risk enters every optimizer stage,
     with concrete evidence of exclusions (Stage 4).
  5. Compare P0, P1, P2, P2b on identical archived populations with identical evidence (Stage 5).
  6. Propose (not adopt) a versioned method revision for a later, separately authorized successor search (Stage 6).
- **Valid outcomes.** Any result, including "P2 selects the same candidates", "P2 is worse chronologically", "the
  populations cannot answer the question because they were pruned upstream", and "no change recommended". A negative
  result is a result.

## 2. Prior knowledge and provenance (disclosed before any P2 result)

- **Examined history.** 2016-01-04 → 2026-10-30 has been examined by Priorities 3–8, 5B, the session and shadow studies,
  the walk-forward diagnostic, Assignments 1–3 and Strategy Lab; 2020, 2022 and 2025–2026 repeatedly. Everything here is
  **retrospective analysis on previously examined history**.
- **What the designer of P2 knew before designing it** (read in full on 2026-11-18 before this protocol): Assignment 3's
  REPORT (P0 and RA1 fold primaries, sequential paths and verdicts on L, B, F; RA1's "risk improvement" in all three
  populations; L/RA1 the only supported main procedure; F/RA1's 2022–2023 breach via one Growth·VGT lot with no maximum
  hold and no initial stop; L/RA1's 2025 V2/V3 failure via a Growth·VGT lot carried from 2024-10-30; the C24 finalists'
  FULL figures); Assignment 2's REPORT; the walk-forward diagnostic (carried open winners bought near the March 2020
  bottom gave back $37–38k in January 2022; open-lot share +0.72 correlated with 2022–2023 DD; D1 dip-buys have no loss
  stop before the maximum hold; protective stops filled up to 7.4 points beyond their levels on 2020 gap days); NL0 1.0.0.
- **Consequences for P2's design.** P2's thresholds are the existing $35,000 research ceiling (no new number is fitted);
  its stress gap (10%) is a round value chosen knowing that historical stop fills reached ≈ 7 points beyond the level;
  its bounded-loss-exit tier is a first-principles requirement (every funded position needs an executable loss exit)
  whose relevance the designer knew from Assignment 3's 2022 and 2025 failures. Both are disclosed, and the tier's
  effect is isolated by a precommitted ablation (P2−tier, §9.4).
- **Subjects.** New L0 (frozen; informed; chosen with later data) — the official baseline. N/original
  (`C24/informed/GD.VB/R2#1 profit`, cell GD1.VB0; incumbent-informed; no independent chronological test) — a research
  finalist, not the adopted benchmark. Every other subject is labelled with its provenance in every table.

## 3. Data, doors and windows

- Canonical minute files: `data/VGT/data.csv` sha256 `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e`,
  `data/GDX/data.csv` sha256 `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049`; Priority 3's
  byte-prefix doors D19, D21, D23, D24 (size, sha256 and last row verified before parsing by Priority 3's loader) and
  FULL (2016-01-04 → 2026-10-30, the common complete endpoint; forward split adjustment, VGT 8:1 on 2026-04-21) behind
  Priority 3's guard and Assignment 3's sealed frozen selection (sha256 `4080d4b1…f2d7`). Priority 3's door log is
  silenced; every opening is logged in this study's `results/doors.jsonl`.
- Illustrative margin overlay only (Stage 2, report-only, never a selection input): `data/VOOG/data.csv` sha256
  `1699c89f83fe44c1ea4e3f3a51ee62c78d9e0567be5b731009c1f47352c55732` and the VGT file, partition `all` (VOOG 6:1 on
  2026-04-21 forward-adjusted), daily session closes.
- Windows: development 2016-01-04 → 2024-12-31; previously examined 2025-01-02 → 2026-10-30 (reset at the 2024-12-31
  close); full history. Fold cutoffs C19 (2019-12-31, D19), C21 (2021-12-31, D21), C23 (2023-12-29, D23), C24
  (2024-12-31, D24); slices 2020–2021 (D21), 2022–2023 (D23), 2024 (D24). Every run is continuous from 2016-01-04.
- No data are downloaded or bought; no November–December 2026 data exist and none is implied.

## 4. Subjects and populations

- **Stage 3 candidates (FULL, boundary 2024-12-31):** New L0 (frozen; 5B R01); every one of Assignment 3's 48 frozen
  finalists (`research/vg-l0-full-joint/FROZEN_SELECTION.json`), which include N/original, N/RA1 (`C24/informed/GB.VD/
  R2#4 best GB0.VD1`), L/RA1 (`C24/refine/GA0.VA0/R2#6 profit order`), L/original, F/original = B/original
  (`C24/refine/GD1.VC1/R2#1 profit`), F/RA1 (`C24/refine/GB0.VB1/R2#1 profit`), B/RA1 and the incumbents C4, C4-refined;
  and Assignment 2's C24 primaries F/RA1 `GD0e.VC0`, F/original `GA0.VB1e` and L/original (Growth·VGT frozen at New L0's;
  labelled "Assignment 2, conditional") from `research/vg-l0-risk-families/FROZEN_SELECTION.json` (sha256 `4174ae53…a143`).
  Each must reproduce its sealed FULL net and DD to the cent before any metric of it is reported.
- **Stage 5 populations:** Assignment 3's archived members at each cutoff (`results/folds/<C>/{broad,refine,informed}-
  qualification.json`, 2,520 members, de-duplicated by label as Assignment 3's `allEvidence`), with Assignment 3's
  population definitions unchanged: L (Track I, cell GA0.VA0), B (Track I, no entry-day book), F (Track I, all cells),
  and at C24 N (Track N + the four incumbents) and U (F ∪ N). The New L0 control row is not a member.

## 5. Engine and conventions (unchanged)

Assignment 3's evaluation path: RC 2's `runWithControls2` (`src/d1-risk-controls-rc2/run.ts`) on Priority 3's books
and pool (`src/vg-d1-growth-joint/`) with options `{ enabled: { 'G:GDX': false } }`; one exclusive funded $100,000 slot;
5 bps per side inside fill prices; 11% simple interest on outstanding principal by calendar day (365-day year); stops
fill at the level or the gapped open; fractional shares; calendar-day holds; harmonized D1 arming; Growth lifecycle L0;
Growth·GDX OFF; shadow-entry eligibility OFF. Nothing in the engine is edited; this study imports it read-only and runs
it with its detail and minute-mark recording switched on.

## 6. Metric definitions (frozen; METRIC_SPECIFICATION.md gives the data dictionary)

Notation. Lot i has funded principal P_i ($100,000), shares q_i(t) and outstanding principal p_i(t) (reduced only by
partial sales), realized fills ρ_i(t) (net of each fill: proceeds − repaid principal − interest on it), entry session
date e_i. At a **marking instant** t (every regular-session minute close of the held lot's symbol from its fill minute,
and every session close; the engine's own instants) with price x and session date d:
- interest I_i(t) = p_i(t) × 0.11 × (d − e_i) ÷ 365 days;
- **marked lot P&L** π_i(t) = ρ_i(t) + q_i(t)·x − p_i(t) − I_i(t) (no exit cost: the marked-net convention);
- **liquidation-equivalent lot P&L** λ_i(t) = π_i(t) − q_i(t)·x·0.0005 (the 5 bps sale cost of the open shares);
- after its final exit, π_i = λ_i = the lot's realized net n_i (exit costs and interest included); before its fill, 0.
- Portfolio: marked net M(t) = Σ_i π_i(t); liquidation net M^L(t) = Σ_i λ_i(t); **banked (realized) net** R(t) =
  Σ_i ρ_i(t). One funded slot: at most one lot has 0 < its fill ≤ t < its exit.

### 6.1 Conventional marked-equity drawdown (retained intact)
**DD** = max over t of [peak(t) − M(t)], peak(t) = the running maximum of M with a strict tracker starting at 0 at the
first instant (the engine's `Tracker.updateStrict`); its peak and trough instants are the first instants attaining them.
It must equal the engine's record exactly. The liquidation twin DD^L uses M^L. Period (reset) DD restarts at a boundary
close with peak = M there. The $35,000 ceiling stays the unchanged reference policy of P0/P1.

### 6.2 Trade-level principal loss (per funded lot, liquidation basis unless stated)
- **PL_i** = max(0, −min_t λ_i(t)) over every marking instant of its life **and** its realized exit; PL_i^M uses π_i;
  PL_i% = PL_i ÷ P_i. Report 0 when the lot never fell below its funded principal. Its date is the first instant of the
  minimum.
- **Realized principal loss** = max(0, −n_i) for a closed lot.
- The engine's **canonical MAE** (min(lowest π_i mark, n_i), not floored) is published separately; the differences
  (no floor at 0; exit cost on open marks; sign convention) are tabulated.
- **Trade principal-loss maximum of a run** PL_max = max_i PL_i.

### 6.3 Portfolio principal and banked-equity risk
- **Starting-capital floor shortfall FS** = max(0, −min_t M^L(t)) (FS^M with M). Convention: the research account has
  starting capital C0 (any value) and no contributions or withdrawals; the funded principal is financed at 11% (the
  ledger's interest), so account equity − C0 = the net at every instant and FS is independent of C0.
- **Realized-equity drawdown RDD** = the strict drawdown of R (it changes only at fills; start 0). Carried open lots
  contribute nothing until they fill; timestamps are fill instants.
- **Banked-capital drawdown BD** = max over t of [H(t) − M(t)], H(t) = max(0, max_{u ≤ t} R(u)) (BD^L with M^L). It
  counts realized erosion and open losses below what had been banked, and never a decline of profit that was never
  banked. Window versions start H at the window's starting R.
- **Realized loss clusters**: episodes of R below its running high (start 0): high, trough and recovery exits; depth;
  lots closed from the high to the trough, losing lots, gross losses, intervening gross wins, worst lot, worst PL, days.
  Longest and deepest runs of consecutive losing closed lots.

### 6.4 Unrealized-profit giveback (per lot, marked basis; liquidation twins reported)
- **Peak profit** G_i = max(0, max_t π_i(t)); **maximum giveback above break-even** GB_i = max over t of [max(0, max_{u≤t}
  π_i(u)) − max(0, π_i(t))]; **maximum decline from a running peak** D_i = max_t [max_{u≤t} π_i(u) − π_i(t)], split at its
  trough into its part above break-even and its part below (the latter is principal loss, never added to giveback);
  **giveback to exit** max(0, G_i − max(0, n_i)); GB_i ÷ G_i (undefined when G_i = 0); GB_i ÷ P_i.
- **Exact attribution of a portfolio drawdown window** [t_p, t_t] (the DD's peak and trough, or any window):
  M(t_p) − M(t_t) = Σ_i [π_i(t_p) − π_i(t_t)], and each term splits exactly into **profit giveback** max(π_i(t_p),0) −
  max(π_i(t_t),0) and **principal loss** max(−π_i(t_t),0) − max(−π_i(t_p),0). Negative terms (gains inside the window)
  are reported as offsets; the residual is floating point only and is reported.
- §5.9 items at each cutoff: open-lot share of the training net, the largest open lot's market-value multiple.

### 6.5 Stop-aware conditional protection of an open lot at a cutoff close c
Reconstructed from the raw bars with the exit managers' own rules (`src/shared-margin-portfolio/strategy.ts
ExitManager`, `src/d1-risk-controls/`, `src/growth-trading/optionalRules.ts`), verified against every historical exit
(§8, gate G-S):
- **Trailing stop** (D1 and Growth, net-profit policy): post-entry high H = max(the entry fill's raw price, the entry
  session's close, every minute high from the fill minute on), then H = max(H, session high) after each session through
  c; level L_t = H × (1 − ts). **Armed** iff q·L_t − p − I(next session) > 0 (a fill at the level would net a profit after
  interest; the exit cost is not in this rule). The next session date is the next weekday after c (holidays ignored).
- **RC 2 protective stop** (D1 families B, C, D): L_p = entry raw × (1 − d ÷ 1000), armed from the session after the
  fill (or the fill session with entry-day activation).
- **Growth initial stop** (when ON): L_i = entry raw − m × ATR(L sessions before the fill) (`atrBefore`), armed from the
  fill.
- **Not price protection:** maximum-hold exits, the buffered intraday loss, retention's trend exit. A lot with a
  partial (retention) sale before c is a **retained remainder**: no executable price protection is credited.
- **Effective executable level** L* = the highest armed level. **Stressed fill** F_g = min(L*, close_c) × (1 − g), g =
  10% (also reported: g = 0 and 20%). **Stressed protected value** V_g = ρ + q·F_g·(1 − 0.0005) − p − I(next session).
- **Conservative open value** CV = min(λ(c), V_g) when an executable price stop is armed; otherwise CV = min(0, λ(c)).
  Conditional profit protected = max(0, V_g); profit at risk = max(0, λ(c)) − max(0, V_g) (armed) or max(0, λ(c)) (not).
- **Stop-aware conservative training net** CN* = Σ realized nets of the lots closed by c + CV.
- **Bounded loss exit** (structural): every funded book has an executable loss exit — D1 books always do (a maximum-hold
  loss exit, or a protective stop in families B/C/D); Growth·VGT does iff `maximumHoldEnabled` or `initialStopEnabled`.

Limitations stated with every result: minute OHLCV does not order prices inside a minute; marks use minute closes;
stops are not guaranteed fills or loss caps (gaps, halts, queues and latency are not modelled beyond the stress gaps).

## 7. Account-margin scenario model (Stage 2; illustrative, never a selection input and never confused with the ledger)

- **Model.** Positions (symbol, quantity, price, marginable, maintenance rate), cash, debt and accrued interest; market
  value MV = Σ q·x; equity E = MV + cash − debt − accrued interest; requirement Req = Σ q·x·m; **excess** = E − Req
  (deficiency when < 0); equity ratio E ÷ MV; headroom in dollars and percentage points (E ÷ MV − the
  MV-weighted requirement); **first-deficiency shock**: the uniform (and the core-versus-traded two-factor) decline at
  which excess = 0, solved in closed form when linear; "none" when debt ≤ cash.
- **Sources** (accessed 2026-11-18): Vanguard Brokerage Initial Margin Risk Disclosure Statement
  (https://investor.vanguard.com/client-benefits/margin-disclosure-statement): "the minimum margin maintenance
  requirement is 35% for most marginable Securities"; "a 50% or higher maintenance requirement for concentrated
  positions"; "can increase Our 'house' maintenance margin requirements at any time without advance written notice";
  may sell "at any time without contacting You"; "You are not automatically entitled to receive an extension";
  "Purchases of open-end mutual funds and Vanguard ETFs® will settle in Your cash account and after 30 days be journaled
  into Your Margin Account." FINRA Rule 4210 minimum maintenance 25% for long margin securities; Regulation T initial
  50%. The concentration trigger is not published: it is a scenario parameter.
- **Scenario grid (declared now, not fitted):** maintenance 25%, 35% (published house minimum), 50% (published
  concentrated minimum), 70% (stress), applied to every position or to the traded ETF only; illustrative core 60% VOOG /
  40% VGT of $250,000, $500,000 or $1,000,000; strategy slot = the ledger's $100,000 loan in the traded ETF at its path's
  market value; other debt $0, $100,000, $200,000; shocks core −10/−20/−30/−40% with traded ETF −0/−10/−20/−30/−50%; the
  $100k → $250k → $210k example. Historical overlay (illustrative): the core bought at 2016-01-04 closes and held, plus a
  candidate's daily strategy mark and position value; daily excess; its minimum and date per scenario.
- **What it cannot say:** it is not the user's account, holdings, effective rates or Vanguard's actual treatment; it does
  not predict a call or a liquidation; intraday house actions, the 30-day journaling rule for Vanguard ETF purchases,
  distributions and corporate actions of a real account are outside it.

## 8. Stages and gates (a failed gate stops every dependent stage; failures are kept)

| Stage | Work | Gate |
|---|---|---|
| S0 | Verify pins (standard, NL0, brief, Assignment 3/2/5B records, canonical files); replay New L0 on FULL and D24, N/original on FULL and D24, and each Stage 3 candidate on FULL; Assignment 3's `verify` of its 47 seals | **G0**: New L0 FULL $479,605.18 / DD $20,385.99 / 46 lots, D24 $382,721.46 / $19,459.83 / 34 lots; N/original FULL $482,700.73 / $20,385.99 and its 2025–2026 P&L equal to the sealed validation row; every candidate = its sealed FULL net and DD to the cent; the rebuilt ledger reconciles (every engine minute-mark change, DD and its instants, Σ lots = net, every lot's canonical MAE and best mark) |
| S1 | Metric module, synthetic and historical tests | **G1**: the brief's §1.6 cases pass; independent arithmetic checks; determinism (two runs byte-identical) |
| S1-stop | Stop-state reconstruction | **G-S**: for every historical exit of the audited candidates and of the Stage 5 replays: a trailing-stop exit filled at its level equals the reconstructed armed level at that session (relative 1e-9); a gap exit opened at or below it; a protective / initial-stop exit likewise; any mismatch blocks P2's stop credit (fail closed) |
| S2 | Margin model, scenario grid, overlay | unit tests of the closed forms |
| S3 | Candidate audit (FULL; development, 2025–2026 and full windows; cutoffs; episodes 2020, 2022, 2025; selection-family neighbourhoods of the key candidates on D24, regenerated with Assignment 3's `drawsOf`/`famOf('select', ['select', rep, 'C24'])`) | regenerated families reproduce the sealed selection p90 DD of each key candidate |
| S4 | Pipeline audit; exclusion evidence from Assignment 3's search archives (read-only: screen proposals regenerated with `screenGenomes`/`pinStratum`, records by `evalKeyOf`; every fitted centre from `configs`) and bounded replays of the highest-net DD-infeasible centres | the regenerated screen reasons reproduce each lane file's `screenReasons` |
| S5 | Member replays at each cutoff on its door; P0/P1 re-derived; P2/P2b and ablations; fold replays of new primaries; sequential paths | **G5a**: every member replay equals its archived evidence (centre net, DD, realized, unrealized, lots, conservative net, worst MAE, occupancy); **G5b**: P0, P1 and RA2 re-derive every sealed primary of Assignment 3; **G5c**: the re-chained P0/P1/RA2 sequential paths equal the sealed `sequential.json` to the cent |
| S6–S7 | Proposed method; deliverables; QA; commit and push | final seal verification |

Resume semantics: every stage writes sealed records once; a rerun of a sealed stage is refused; an interrupted stage is
rerun from the start with the identical configuration (replays are deterministic and cheap).

## 9. Selector experiment (frozen before any P2 result)

### 9.1 Evidence (identical for every selector)
Per cutoff and member: Assignment 3's archived evidence (the gates, the centre record, the selection family statistics,
the detailed training centre) plus this study's replay of the same centre on the same cutoff door (G5a), from which the
§6 metrics are computed **at the cutoff close with training data only**. No selector reads a confirmation family for
ranking, a later slice, a next-slice neighbourhood or FULL. No member is added, removed or re-simulated with other
parameters.

### 9.2 Controls (unchanged code, imported)
- **P0 / NL0-original:** `selectors.original` (`src/vg-l0-full-joint/select.ts` → Assignment 2's code): highest centre
  marked net among the Q1–Q6 qualified; ties selection robust, lower centre DD, label.
- **P1 / RA1:** `selectors.RA1`: screens S1 open-lot multiple ≤ 1.50, S2 open-lot share ≤ 25%, S3 worst MAE ≥ −$17,500, S4
  selection worst-10% mean DD ≤ $35,000; fewest failed screens → 5% band of the conservative net → lowest occupancy →
  ties.
- RA2 is re-derived for the parity gate only.

### 9.3 P2 / capital-and-stop-aware (= P2a, MDD-hard) — the primary experimental selector
1. **Eligible:** Q1–Q6 qualified (the conventional $35,000 centre DD, the confirmation p90 DD ≤ $35,000 and the 10 bps
   stress unchanged) **and** G1: PL_max ≤ $35,000 (trade principal loss, liquidation basis, every training lot including
   the open lot to c) **and** G2: BD ≤ $35,000 (banked-capital drawdown, marked basis, whole training run).
2. **Tier:** members with a bounded loss exit (§6.5) first; the other tier is used only when the first is empty.
3. **Band:** within the tier, the members whose CN* ≥ floor, floor = best × 0.95 when best ≥ 0, else best × 1.05 (RA1's
   band formula on CN*).
4. **Pick** within the band: the lowest BD; ties lower PL_max, higher CN*, higher selection robust net, lower centre DD,
   label. The complete order is built iteratively like RA1's.
5. A population without an eligible member has **no primary** (a fold without a primary: the path is incomplete).

### 9.4 Variants and ablations
- **P2b / alternative constraint (relaxed MDD):** eligible = Q1 ∧ Q4 ∧ Q6 ∧ 10 bps net > 0 ∧ centre DD ≤ $50,000 ∧ 10 bps
  DD ≤ $50,000 ∧ confirmation p90 DD ≤ $50,000 ∧ G1 ∧ G2 ($35,000 each); ordered as P2. $50,000 is a candidate research
  scenario, not a recommended limit; P2b's primaries get the §7 margin-scenario assessment. On these archives it can only
  admit members that failed Q2/Q3/Q5 by drawdown (51 such members exist, all with centre DD < $35,000), which is itself
  evidence about upstream pruning.
- **Report-only ablations (never a verdict, never compared as a proposal):** P2−tier (step 2 removed); P2−stop (CN*
  replaced by RA1's conservative net R + min(0, U)); P2@25k (G1 and G2 at $25,000: the "preferred" scenario).

### 9.5 Chronology and labels
- For each of L, B, F and each of P2, P2b (and the ablations, report-only): the fold primaries at C19, C21, C23 are
  replayed on the next door with Assignment 3's `foldRun` (continuous run, boundary = cutoff) and chained with Assignment
  3's rule (5 bps of $100,000 per open lot closed or adopted at a switch; Priority 3's `sequentialDrawdown`). Verdict rule
  unchanged (supported iff every fold has a primary, sequential net > 0, sequential DD ≤ $35,000), labelled
  "retrospective (AD6)".
- Frozen comparison labels of Assignment 3 (band $2,500): P2 vs P0 and P2 vs P1 in each of L, B, F; P2b vs P2.
- Report-only principal-aware path metrics: the exact attribution of the sequential DD window into giveback and
  principal loss across slices; max trade principal loss and banked-capital DD per slice; carried-lot giveback.
- C24: each selector's primary in L, B, F, N, U; their development evidence; their FULL figures (previously examined,
  descriptive only).
- Item 9 of brief Stage 5: members that P0 ranks in its top 10 at a cutoff and that fail only S1 and/or S2 under RA1: their
  stop state, CN* versus RA1's conservative net, and (report-only, bounded) their next-slice outcome.

## 10. Budget (fresh simulations; record and archive reads counted apart)

| Use | Cap |
|---|---:|
| S0 parity (New L0, N/original on FULL/D24) and S3 candidates on FULL and D24 | 160 |
| S3 neighbourhoods (selection families of ≤ 10 key candidates on D24, ≤ 2 on FULL) | 3,100 |
| S4 bounded replays of DD-infeasible centres | 120 |
| S5 member replays (2,520) + fold replays + item-9 replays + C24 FULL rows | 2,800 |
| Margin overlay | 0 (prices only) |
| **Total cap** | **6,200** |

No search proposal (distinct proposals = 0).

## 11. Resources and integrity

- Heavy runs in a transient systemd user unit inside `vgl0rm.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0),
  one at a time; observed memory reported. Node v24.21.0.
- `results/protocol-freeze.json` records this protocol's, the brief's, the adoption manifest's and the pinned records'
  sha256 and the code digest of `src/vg-l0-risk-metrics/`; sealed records are write-once (0444) with sha256 in
  `results/seals.jsonl`. Checkpoint: `RESEARCH_RECOVERY.md`.
- Assignment 3's, Assignment 2's, 5B's and every earlier study's files are read only; their seals are verified, never
  rewritten. The engine and Priority 3's/5B's/Assignment 2's/3's evaluation digests are not touched.

## 12. Reporting commitments

The deliverables of brief Stage 7 (PROTOCOL, BASELINE_AND_PROVENANCE, METRIC_SPECIFICATION, IMPLEMENTATION_AND_TESTS,
CANDIDATE_RISK_AUDIT, SELECTION_PIPELINE_AUDIT, SELECTOR_COMPARISON, PROPOSED_METHOD, REPORT) and machine-readable
tables; every figure from a sealed record; the evidence labels (frozen, informed, independent, retrospective, previously
examined, illustrative scenario) on every row; the answers to the brief's final questions; the user decision points.
Every proposed rule is labelled **experimental and not adopted**.
