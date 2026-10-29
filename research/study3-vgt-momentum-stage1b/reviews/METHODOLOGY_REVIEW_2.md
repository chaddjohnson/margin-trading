# Methodology review 2 — Study 3 Stage 1b, PROTOCOL v1.0 (pre-freeze)

**Reviewer:** independent read-only agent context (lens: execution, accounting, mechanism definitions). Written
2026-10-28 between 23:04Z and 23:07Z (UTC, clock-read). No strategy was run, no `data/` file was read, no Git state
was changed. The only file written is this report.

**Reviewed (sha256):**
- `research/study3-vgt-momentum-stage1b/brief/BRIEF.md` `c7b09fe885a8115fd9a9605f0aa5eae99f274a562103f4159bade683a412079f`
- `research/study3-vgt-momentum-stage1b/PROTOCOL.md` (v1.0 draft) `1fee1998eb6b9ffd5cfae5bb7b375110c263f59a4148484f3d7804d7a2608979`
- `research/study3-vgt-momentum-stage1b/EXPERIMENT_MATRIX.json` `1b6417a0dd14e352dc9bbcced9e4449ca76a68e77068dc03e7687c59a129ac70`
- Context, read-only: `src/study3-vgt-momentum/engine.ts`
  `34b6a4ec93549c14f332070ae96583aa9afbffd6ef91beaca57144fa98efb051`, `specs.ts`
  `e03e897d558bd7723c07317f9260ff885b32e53e93048ce3cc23260e4e1d3657`, `signals.ts`
  `b1a54420623963e2e0e7ad42f85f3cf32e5127f7ac4c319e2dee5fc8e9447426`, `src/shared-margin-portfolio/strategy.ts`
  `0407559247569b2f471f8887faa9232502574fb28a34e3f435026fc3f0df7093`, `config/phenotypes/D1/VGT.json`
  `3e77a419943b6a066c5467494947dfd4e1212a436ea79f6777c99764ca6c5f70`, Stage 1 `PROTOCOL.md` §3,
  `EXIT_MECHANISM_STUDY.md`, `REENTRY_AND_CAMPAIGN_ANALYSIS.md`, Stage 1 review-2 dispositions, `src/lib/evaluation.ts`
  (`loadBounded`).

Severity scale: **BLOCKER** = must change before `freeze-protocol` (frozen self-contradiction or undefined verdict
mechanics); **MAJOR** = should change before freeze (bias of the order of a rubric threshold, or an ambiguity two
independent implementations would resolve differently); **MINOR** = fix or disclose; **NOTE** = record only.

---

## Findings

### 1. BLOCKER — §4.2 "Stage 1 equivalences": X4 ≠ XT(rat 0, N 50, h 0.15); HS under-specified

**Problem.** Stage 1 `exitOf('X4')` = `{ ownOut: false, catastrophic: 0.15, trendLow: 50 }` (`specs.ts`), and
`catastrophic` is `p.hc × (1 − x)` (`engine.ts` `stopLevelOf`): a 15% **trail from Hc**. XT's first layer is
"catastrophic hard **E**(1−h)", fixed at the entry. With rat 0, XT(h 0.15, N 50) keeps E·0.85 while X4 ratchets to
Hc·0.85: the trade paths differ as soon as the price rises. Parity (a) in §12 lists X4, and §11 rubric item 1 labels the
study **Invalid** on any parity failure — the frozen text would contradict itself (implement XT as written → parity
fails; implement it to pass → violates §4.2). Separately, "HS = XF with t = ∞" omits own and h; Stage 1 HS is
`{ ownOut: false, hard: 0.08 }`, while XF's default own is 1.
Checked and correct: TPL(h,t) = XF(h, t, ref 0, own 1); OX = XO(cat 0.15, c 1); X2 = XV defaults (dmin + dgap = 0.15);
X3 = XS defaults; X8AND = XD defaults (p 0.10, N 20, mode 1, cat 0.15, own 0).

**Fix.** Replace with **X4 = XT(h 0.15, N 50, rat 1, g 0, t2 0.15, own 0)** (g = 0 is outside the box; parity use
only — at g = 0 the ratchet is always on and max(E·0.85, Hc·0.85) = Hc·0.85), or redefine XT's catastrophic layer as
Hc(1−h) (then state the box consequences). Write HS = XF(h 0.08, t = ∞, own 0). State XV's ATR-undefined fallback
(Stage 1 uses the maximum distance) so X2 parity is defined.

### 2. MAJOR — §3.2: the account is not self-financing; negative cash is interest-free, positive cash idles while B₀ is re-borrowed

**Problem.** Deriving the state equations: entry sets L := B₀ "K unchanged"; exit puts "the residual (possibly
negative)" into K. Hence (a) after a losing trade K < 0 is money owed that **bears no interest** for the rest of the
path; (b) after a profitable trade (or after Z1/Z2 trims drove L to 0 and pushed proceeds into K), K > 0 earns 0% while
every subsequent entry borrows a fresh $100,000 at 11%; (c) S3 re-borrows up to B₀ even when trims had cut L. In a real
margin account cash and debit net into one balance. The two biases have opposite signs and are path-dependent: a
cumulative realised loss the size of Stage 1's 2022 window (−$57,578) carried for a year is ≈$6,334 of unbooked
interest; $80,000 of idle K beside a $100,000 loan overpays ≈$8,800/yr. Both are of the order of the §11 thresholds
($20k sum, $10k excess, $5k control margin, −$15k worst window). The brief asks for a **self-financing** identity (§4),
"repay or reconcile borrowing, transfer accrued equity/realized profits properly" (§3B.1), interest "based on actual
borrowing through time" and "no borrowed principal silently resetting after round trips or trims" (§10). The
protocol's "the slot has no own capital" makes the reset explicit but does not finance the losses.
Within a trade the trim equations are correct (derivation: mark before = K + Sp − L − I; after selling q at
p(1−c), with L' = L − min(L,P), K' = K + max(0, P − L), mark after = K + (S−q)p + P − L − I, i.e. the mark changes by
exactly −q·p·c; no double count, nothing lost; interest falls only through L).

**Fix.** Predeclare the verdict account before freeze. Recommended: a **net-debit account** for every executable path,
control and search run: debit D = L − K, interest on max(D, 0) at the run's rate, simple, segmented at every change of
D (entries, trims, exits, conversions); positive net cash earns 0%; each entry still buys B₀ of market value, so the
exposure semantics are unchanged. Keep the Stage 1 fixed-slot convention as a mode used only for Stage 1 parity and the
repair stage, named "fixed-slot P&L convention (not self-financing)". If the Stage 1 convention is kept as primary
instead, report for every sealed path the unbooked interest Σ max(−K,0)·rate·days/365 and the idle-cash overpayment
Σ min(K⁺, L)·rate·days/365, and evaluate rubric items (b), (e), (f) under the net-debit variant too.

### 3. MAJOR — §9 exposure-matched benchmark B_F (and §7.5 "Z0 scaled to f_MV"): financing is scaled by gross exposure

**Problem.** B_F = f_MV,F(Π1) × W_F(C-ALR). W(C-ALR) includes $100,000 × 11% interest, so B_F charges interest in
proportion to Π1's **gross market value**, while Π1 pays interest only on L ≤ B₀. For a Z0 lot whose value has drifted
to ≈2B₀ (Stage 1's carried E04 lot started 2022 at $236,944), f_MV ≈ 2 while the borrowed fraction is 1: B_F books
≈$22k of interest against Π1's $11k, a spurious ≈+$11k/yr in W_F − B_F — the same size as rubric (e)'s Σ(W_F − B_F)
≥ +$10,000 gate. The same scaling error affects L-D's "Z0 scaled to the variant's f_MV" (trims cut G and L by
different proportions). The brief (§4) also requires that an ex-post exposure match be labelled a hindsight comparator.

**Fix.** Define B_F = f_MV,F × (price gain_F(C-ALR) − friction_F(C-ALR)) − rate × BDD_F(Π1)/365, i.e. match gross
exposure for the price term and Π1's own borrowed-dollar-days for financing; report the current definition beside it;
use the corrected one in rubric (e). Apply the same split to L-D comparisons (price gain per notional dollar-day and
interest per borrowed dollar-day reported separately). Label both as ex-post exposure matches.

### 4. MAJOR — §5.2 S3 (and S1/S2 under delay): precedence with a pending old exit, an opening gap through the old stop and delays is undefined

**Problem.** §3.1(1) orders "a pending close-decided exit or transition, else the gap check of the resting stop; then a
pending trim; then a pending entry **or conversion**". Under S3 this leaves open: (i) if the old policy decided an exit
at b's close, is the position converted or exited? (ii) If b+1's opening trade ≤ the old stop, the gap check precedes
the conversion, the position exits as a gap stop, and §3.1 then forbids an entry in that exit session — so S3 silently
becomes S1 with a different reason, or the conversion overrides the stop; both readings are implementable and give
different ledgers (the brief requires a "pending stop" switching fixture). (iii) Under a k-minute delay, whether the old
resting stop is live in bars 0..k−1 before the transition/conversion (Stage 1's code keeps it live for any pending
exit) is not stated for S1 or S3. (iv) A conversion is an exit and an entry in one session at one price, contrary to
§3.1's rule unless explicitly exempted. (v) S2: whether the old policy's trims continue, and that S2 = S1 adoption when
flat at b, are not stated.
Arithmetic verified: sell branch S' = B₀/x, new-trade entry friction B₀ − S'x = 0, old proceeds q·x(1−c) + S'x; buy
branch q = (B₀ − Sx)/(x(1+c)), cost Sx + q·x(1+c) = B₀, entry friction q·x·c; continuous at Sx = B₀; old interest
through b+1's date, new from b+1's date (no day charged twice); L = B₀ afterwards. S3 is causal (data ≤ b plus the
b+1 fill). It is not a state transfer: it is "S1 as if flat at b", netted — acceptable as a sensitivity.

**Fix.** Freeze one ordering, e.g.: "S3 applies only if the old policy has no pending exit at b's close. The
conversion executes at the opening trade (+ delay) **before** the gap check, at that trade's price; the old trade's
reason is `conversion` (flagged `gap` if the open ≤ the old level). Under a delay the old resting stop is live in bars
before open + k; if it fires, S1 applies and the new policy's first decision is b+1's close. A conversion is not an
entry for §3.1's one-entry rule." For S1 state the same delay rule; for S2 state that the old policy's trims continue
(or not) and that S2 ≡ S1 when flat at b. Report the transition P&L (b's liquidation mark → b+1's actual fill) as its own
line in the window decomposition. Rename S3 "netted re-entry" in reports.

### 5. MAJOR — §5, §7.1, §7.4, §11: the verdict path is undefined when a fold has no P\*; "no champion" is not an elimination rule

**Problem.** Rubric 2 tolerates one fold with P\* undefined, but §5 never says what Π1 does in that window (stay flat?
keep the previous policy? fall back to P0?). Choosing after the fact is hindsight. Also §7.4 eliminates a pairing only
when it has "no feasible point"; a pairing with feasible points but no champion (every center φ < 0.75 or 10 bps net
≤ 0) has no "step-1 champion" for step 2.

**Fix.** "An undefined P\*_F makes the window's policy C-IDLE: an S1 transition to flat at b and no entry until the next
boundary" (or another rule, fixed now). "A pairing without a step-1 champion is eliminated (training-only, logged,
kept in the denominator)." Apply the same to P\*-NET and P0.

### 6. MAJOR — §12 parity (c): synthetic fixtures are not enumerated and have no independently derived expected values

**Problem.** The brief names required fixtures in §3B (crash, gain, pending stop, weekend/holiday, changing selection),
§4 (+100% then −30%, long flat, deep gap, partial trim) and §11 (synthetic gaps, next-session fills, stop precedence and
ratchets, switching on holidays, transfer/carry state, pending orders, same-day re-entry, principal repayment on trim,
cash/equity identities, future-bar rejection, no 2024–2026 read). §12 says only "synthetic fixtures". Unfrozen, the
fixture set can be chosen after seeing what the code does.

**Fix.** Freeze a fixture table (ID, minute path, mechanism, expected values derived in closed form by hand, never
from either engine). Minimum: F1 gap-down open through the stop (fill = open, never the level); F2 fill-bar low ≤ level;
F3 closing print ≤ untriggered stop, next-open gap; F4 level reset above the close (ref 1, XRD by interest accrual,
B-D1N); F5 +1/+5-minute delays with a stop triggered inside the delay; F6 Friday→Monday and holiday interest (3- and
4-day segments); F7 partial trim with L partly repaid; F8 trims driving L to 0 and the remainder to K, then exit; F9
trim pending on a gap-down open (q ≤ 0) and trim + same-session stop; F10 +100% then −30% under Z0/Z1/Z2(each)/Z3
with K, L, I, S, G, marks and all DD bases; F11 long flat (interest-only decay; XP stall; XRD interest-driven exit);
F12 −20% opening gap through XF/XV/XRD/XE levels; F13 S1/S2/S3 at a boundary in a crash (gap through the old stop at
b+1), in a gain (S3 sell branch), after a loss (S3 buy branch), with a pending close-decided exit at b, a pending minute
decision at b, a pending trim at b, b+1 after New Year's Day, same-ID reselection, S2 carried across two boundaries;
F14 exit and entry in one session blocked; minute trigger blocked in an exit session; F15 campaign death (own OUT seen
while long; RPM replacement and expiry); each re-entry rule on a hand path; F16 XE with tmin > t0 and with
S·Hc/B₀ < 1; F17 XS floor above price at entry; F18 XO count across a re-entry; F19 requested end > 2023-12-29 refused
before any read, retained-bar date assertion; F20 identities (i)–(vii) (#9) on every fixture.

### 7. MAJOR — §12 parity (a)/(b): coverage, reference independence and tolerances are insufficient for rubric item 1

**Problem.** (b) covers 5 of the 10 re-entry rules (RF, RP50, RS, RFL, REF never run against the reference on market
data). Random-vector parity exists only for exit families that appear in pairings, so **XRP, XP and XO — optimised in
12 L-B cells — are checked at defaults only**; XF ref 1, XD modes 0/2, XE at γ ≈ 0 and γ ≥ 1, XRD activation and
B-D1N activation are not guaranteed to be exercised. (a) omits the Stage 1 re-entry equivalences (RN = R5, RF = R1,
RC10 = R2, RP50 = R4, R0) and does not name the controls (C-AL, C-ALR, C-SMA, C-DON, C-TSM, C-IDLE). Nothing says the
"independent reference" is authored independently (brief §11: "independently authored"); no tolerance is stated
(brief: "to the cent where required"; Stage 1 used $10⁻⁶). Fold-A data (2017–2019) contain no crisis gaps and few
+100% lots, so trims with L → 0, deep gap stops and S3 branches may never be exercised on market data.

**Fix.** (1) Extend (b): every optimised family × {E06, E05, E09} × all 10 re-entry rules at defaults, plus ≥ 64 random
vectors over the **full box of every optimised family** (categoricals enumerated), every sizing variant, S1/S2/S3 over
a predeclared policy-pair matrix (level→level, level→event, event→intraday, intraday→level, Z1 → Z0 with L < B₀,
same ID). (2) Extend (a) with the re-entry equivalences and named controls. (3) The reference is written in a separate
agent context from the frozen protocol text only, without reading the fast engine, and keeps an explicit per-event
cash/loan/interest-segment ledger rather than per-lot formulas. (4) Tolerances: exact equality of trade paths
(session, bar, kind, rule, reason, stop component), |Δ| ≤ $10⁻⁶ on every trade's price gain, friction, interest and
net, every daily mark, minute/daily DD, BDD, Ḡ. (5) Record branch-coverage counters (each stop component binding, gap
and fill-bar stops, delayed stop fills, closing-print fills, trims with L → 0, both S3 branches, S2 across two
boundaries) and require each > 0 over market-data parity ∪ fixtures. (6) Repeat redacted fast-vs-reference parity on Π1
and every `evaluate`-stage path inside `evaluate` (data already authorised there); a failure triggers rubric item 1.

### 8. MAJOR — §4.3 RS: reference ambiguous and the rule degenerates to R0 after close-decided exits

**Problem.** stopAtExit = "the resting level in force at the exit decision **or** fill" names two different levels for
a close-decided exit (session s's level vs the level computed at s's close for s+1). For close-decided exits (XS, XT
trend, XD, XP, XO, XM) the decision close is above the resting level by construction (else the stop would have fired
intraday, closing-print cases aside), so C > stopAtExit typically holds at the first flat close and RS re-enters at the
next open — effectively R0, the control Stage 1 found most damaging in 2022. After a resting-stop exit in a session that
closes back above the level, RS also re-enters immediately. The brief (§6) asks for genuinely distinct rearming rules;
RS is the natural partner of the core hypothesis "protective stop + effective re-entry" (§5) and is malformed.

**Fix.** stopAtExit = the resting level in force in the exit fill's session; RS fires only on a **cross from below**:
at least one flat close ≤ stopAtExit since the exit, then a close > stopAtExit. Report RS/R0 path duplicates. For REF,
state whether the exit session's close counts as the "failed" close.

### 9. MINOR — §3.2: state definition of I contradicts the segment formula; exit step and identity (ii) wording invite double counting; missing identities

**Problem.** The state lists "interest accrued **since the current loan segment began**", but I = Σ over all segments.
Implemented literally, I resets at every trim and interest is lost. "K after the exit = K before the trade + its net"
is a correct identity, but an implementation that does K += net at the exit double-counts trim cash already in K.
Identity (ii) "raw_i − E_cost basis" is ambiguous (raw E or buy price). (v) "end liquidation mark = Σ window
increments" holds only for paths whose first boundary mark is 0.

**Fix.** "I = interest accrued since the trade's entry, Σ of its loan segments, settled at exit." Exit step:
K := K + P_final − L − I. (ii): price gain = Σ q_i (raw_i − E) with raw E; friction = (B₀ − S·E) + Σ q_i·raw_i·(1 −
haircut_i). (v): Σ W_F = liquidation mark at the path end − at the path start. Add (vi) every fill (entry, trim, exit,
transition, conversion) changes the mark at the fill price by exactly −(its friction + slippage); (vii) at every daily
row mark = cumulative fill cash flows + S·C − accrued interest. (vi) directly catches double-counted or vanished trim
cash.

### 10. MINOR — §3.3 per-trade ledger: realised vs unrealised and brief §4 fields

**Problem.** A trim whose proceeds repay principal realises a gain but moves no cash into K; if "realised" in §5.3 and
the window decomposition is taken from K, those gains are misclassified as unrealised. The ledger lacks remaining L
after each trim and at exit, K after each event, accrued I at each trim, realised gain per trim, LTV at each trim and
"cash available" — all listed in brief §4.

**Fix.** Add a per-event account ledger (event, time, raw, q, proceeds, repayment, ΔK, L, I, S, G, mark, LTV) and define
realised = Σ q_i(sell_i − E_cost) over fills, with interest realised at exit (or say otherwise, explicitly).

### 11. MINOR — §3.2 drawdown percentage bases are under-defined

**Problem.** "% of (B₀ + the peak mark)" and "% of the peak gross position value" do not say which peak (the DD
episode's?) and G is 0 while flat. On the notional-at-peak basis an appreciated lot's DD looks small, which is the
opposite of the brief's concern about appreciated exposure.

**Fix.** Basis 1: $DD / B₀ (lead metric). Basis 2: $DD / (B₀ + mark at the episode's peak time). Basis 3: $DD / max G
within the episode's [peak, trough]. State that basis 2 is the surrogate for "% of current equity" because the slot has
no own equity.

### 12. MINOR — §3.1 delay semantics for stops, pending orders and opening slippage

**Problem.** (1) reads "at the opening trade (+ delay): a pending close-decided exit or transition, else the gap check"
— implying the gap check also waits for the delay; Stage 1's code checks the resting stop from bar 0 and delays only
fills. The stop-fill fallback (no trade left → the last minute's close at a bar-start timestamp) is not stated.
Whether the 50 bps opening-fill slippage stacks with stop slippage on a bar-0 gap stop is not stated.

**Fix.** "Resting stops trigger from bar 0; a triggered stop fills at the first trade ≥ trigger time + k (the closing
print if none, else the last minute's close, timestamped at that minute's end); pending exits, trims, entries,
transitions execute at open + k and are cancelled if the resting stop fires first. Opening slippage applies to bar-0
fills including gap stops, and stacks / does not stack with stop slippage (choose)."

### 13. MINOR — §3.1/§4.2 levels reset above the close are recorded as gap stops; Hh can be below Hc

**Problem.** With ref 1 and small t (a session whose close is more than t below its intraday high), with XRD (interest
accrual raises the level at a constant price), XE and B-D1N, the level computed at a close can exceed that close. The
next opening trade is then "≤ level" and booked as a gap stop although no overnight gap occurred, contaminating the
"gaps that violate nominal levels" record the brief (§5) requires. Separately, Hh is defined from minute highs only; a
closing print above every minute high gives Hc > Hh, so ref 1 is then looser than ref 0 (D1's `onEntry` includes the
close).

**Fix.** Reason `level above prior close` distinct from `gap stop` (prior close > level ≥ open); per stop exit record
the shortfall level − fill and report gap statistics only over genuine gaps. Define Hh = max(raw fill, minute highs,
closes held). No fill better than the open is synthesised anywhere in §3.1 (checked: open ≤ level → open; open > level ≥
low → level ≤ open; delayed fills use real later trades).

### 14. MINOR — §4.2 XE: clamp bounds can invert; behaviour after trims; distinctness

**Problem.** The boxes allow tmin > t0 (t0 ∈ [0.06, 0.10), tmin ∈ (t0, 0.10]): ≈3.4% of uniform draws, where
clamp(x, tmin, t0) is implementation-defined (Math.min/Math.max order) and the reference may resolve it differently.
At entry S·Hc/B₀ = 1/(1+c) < 1, so t0·(·)^(−γ) > t0 and the clamp returns t0 — correct, but should be stated. After a
trim S falls, t_eff widens and the ratchet freezes the level — unstated. Distinctness: XE is a one-parameter
interpolation from XF (γ = 0) to ≈XRD(A = 0, G = t0·B₀) (γ = 1); it adds a dimension rather than a new state variable,
and the brief (§5.9) asks for a "genuinely distinct mechanism".

**Fix.** t_eff = min(t0, max(tmin, t0·(S·Hc/B₀)^(−γ))) (t0 wins), or reparameterise tmin = r·t0, r ∈ [0.1, 1]. State
the trim behaviour. Count XE as overlapping XF/XRD in the multiple-testing register; predeclare that a champion with
γ ≤ 0.05 or |γ − 1| ≤ 0.05 is reported as collapsing to XF/XRD; consider adding an invented family with a different
state variable (e.g. financing burden L/G or sessions since the last new high).

### 15. MINOR — §4.2/§4.4 XRD and Z3 with trims; Z3 notation

**Problem.** After a trim at x' = x(1−c) > ℓ, the per-share level for the same dollar giveback is
ℓ' = (Sℓ − q·x')/(S − q) < ℓ; "never lowered" keeps ℓ, so the realised giveback becomes G − q(x' − ℓ), tighter than
declared. Z3(G) "adds the XRD component (A = G …)" uses G for both Z3's parameter and XRD's giveback. XRD's level uses
I_s at the close while it rests through session s+1 (1–3 more days of interest). S → 0 cannot occur (Z1 keeps
B₀/raw, Z2 keeps B₀(1+v)/raw) but is not stated as an invariant.

**Fix.** State the trim behaviour (price-level ratchet kept). Write Z3(g) = XRD component with A = g and G = g
(break-even lock at activation). Declare the I_s convention. Add the invariant S > 0 while long, checked on ledgers.

### 16. MINOR — §4.2 XS: the position-independent floor can sit above the price at entry

**Problem.** In E05's `down` mode the last confirmed low stays the floor until a θ rebound confirms a new one, so a level
entry (E06, E03, C-SMA, E02) can fill while C < F(1−b). XS then exits at the first held close; the campaign survives
(`structural` is not own OUT) and R3F/R0 can churn on consecutive sessions. Brief §5 asks how a structural exit with its
own reference is paired with other entries.

**Fix.** Either arm the structural condition only after a held close with C > F(1−b) (or only for F < E), keeping
Stage 1 X3 semantics for parity via a flag; or keep the semantics and report, in L-A and L-B, the count of structural
exits at the first held close and the resulting churn. Predeclare which.

### 17. MINOR — §4.2 XO: consecutive count undefined; conflicts with campaign death on any own-OUT close

**Problem.** "c consecutive closes" does not say whether the count runs over held closes only, starts at the entry
session's close, or resets at each trade. §4.1/§4.3 end the campaign on **any** own-OUT close seen while long, so a
transient own-OUT close that XO(c ≥ 2) deliberately tolerates still kills the campaign at a later catastrophic stop. For
level families the OUT state is sticky, so XO(c) is mostly a (c−1)-session delay.

**Fix.** Count held closes only, from the entry session's close, reset per trade. Choose and state: under XO, campaign
death requires c consecutive own-OUT closes, or keep the Stage 1 rule and disclose. Disclose the level-family delay
equivalence.

### 18. MINOR — §4.2 B-D1N deviates from D1's actual net-profit rule

**Problem.** D1's `ExitManager.isStopActive` (`strategy.ts`, policy `net`): active in session s iff
S·level − B₀ − I(sTime[s]) > 0 — interest to the traded session, no sell friction, re-evaluated every session (it can
deactivate as interest accrues); D1's high starts at max(entry price, entry-session close, fill-onward minute highs) and
then adds session highs. B-D1N uses "E(1+c)/(1−c) + accrued interest per share at the close" (the interest term should
be I/(S(1−c)); with entry slippage the actual buy price should be used) and the global ratchet makes activation
permanent. Verified: D1 primary trail = 7.3% (`config/phenotypes/D1/VGT.json`).

**Fix.** Define B-D1N as D1's rule: active in s iff S·Hh_{s−1}(1−0.073) − B₀ − I_s > 0 (D1's no-friction form, or a
stated friction-inclusive form), re-evaluated each session, the level not carried while inactive; or list each
difference as a deliberate deviation.

### 19. MINOR — §4.4 Z1 month-end decision reads the next session's date; trim/exit conflicts at one close

**Problem.** "The last session of each calendar month" needs the next session's date. Reading `dates[s+1]` is a
look-ahead read and is impossible at development ends that are month-ends (all five are). Stage 1's review 2 #3 found
the same defect in C-TSM. §3.1(3) does not say whether a trim can be ordered at a close that orders an exit.

**Fix.** Decide at the first session of each month from the prior close's G and execute at that session's opening trade
(C-ALR's timing), or use the scheduled exchange calendar, never loaded bars. "No trim is ordered at a close that
orders an exit."

### 20. MINOR — §7.5 sizing selection by RoD favours trimming mechanically

**Problem.** A sizing variant replaces Z0 "if it scores higher on the same objective". Trimming cuts DD roughly with
gross exposure but cuts interest with L, so RoD = net/max(DD, $10k) tends to rise mechanically; brief §2/§7D: lower DD
from lower deployment is not automatically superior.

**Fix.** Additionally require that the variant's price gain per notional dollar-day is ≥ Z0's (or another
exposure-normalised guard, predeclared), and report the upside given up per major up-leg.

### 21. MINOR — §4.3 fresh and minute triggers override re-entry rules; no opportunity gate (brief §6)

**Problem.** Event fresh triggers bypass RC10, RP50, RS, RFL, REF, RPM; for E09 the minute trigger (reference reset at
every exit) fires under every rule but RN, so P08's ten rules are mostly "minute trigger OR rule". Step 2 runs all ten
rules on every pairing regardless of opportunity counts, contrary to brief §6 ("first measure reentry opportunity
counts").

**Fix.** Report per rule the share of re-entries caused by the rule vs by a fresh/minute trigger. Predeclare a
training-only gate, e.g. skip step 2 (keep R3F, log it) for a pairing with < 3 rule-eligible re-entry opportunities in
development.

### 22. MINOR — §4.2 priority among close-decided exit reasons

**Problem.** When several close-decided conditions hold at one close (own OUT, structural, trend, stall, max hold) the
reason label is unspecified; it changes the exit-reason statistics and RS/RP50 references (campaign survival is
already fixed by the own-OUT-seen rule).

**Fix.** Freeze a priority, e.g. Stage 1's: own out > trend > structural > max hold > stall.

### 23. MINOR — Omissions against brief §5

**Problem.** (a) No predeclared, training-only box-widening rule, though the brief treats ranges as "starting
hypotheses that can be widened under the predeclared conditional-research protocol". (b) XD has no "ablations versus
each alone" (§5.6); XF ref 0 is a resting stop, not the close-decided D_p. (c) No XV crisis trace (ratcheted vs
un-ratcheted, stop jumps) is specified (§5.2). (d) Gap shortfall statistics (see #13).

**Fix.** (a) If a development champion's continuous parameter lies within 5% of a non-natural box edge, extend that edge
once by 50% of the range with a fixed extra budget, logged. (b) Add XD-P (D_p alone + cat) and XD-T (D_t alone + cat)
at defaults to L-A. (c) Specify Stage 1-style X2 traces for XV finalists.

### 24. NOTE — §3.2 0% cash and simple interest

Within a trade K > 0 only after L = 0, so 0% on cash is conservative there; across trades see #2. Brokers post interest
monthly to the debit balance (monthly compounding); simple interest follows the brief (§2) — disclose the omitted
compounding (≈0.5% of annual interest at 11%).

### 25. NOTE — §3.1 closing-print fills for minute rules

An E09 decision before the close may fill at the closing print; closing-auction order-entry cutoffs make that fill
optimistic for late decisions. Inherited from D1; disclose.

### 26. NOTE — §7.1/§8 inert dimensions inflate neighbourhood robustness

For XF with t ≤ h the hard stop never binds (Hc ≥ E ⇒ Hc(1−t) ≥ E(1−h)); ≈25% of uniform XF draws. Similar inertness
for XT's hard layer under rat 1 and for XV's h below the vol level. J32/J128 perturbations of inert dimensions
reproduce the center's path and raise φ and retention. Report the share of path-identical neighbours and φ over
path-distinct neighbours.

### 27. NOTE — §2 door assertion per history

The bar-time assertion is stated only for 2023-12-30T00:00Z. `loadBounded` keeps ticks before end T00:00Z + 2 days,
then `selectRunSessions` trims. For the five chosen ends no next session falls in that window (2019-12-31 → the
2020-01-02 session starts after the 00:00Z cutoff; the others are Thursday-before-holiday or Friday), so nothing leaks,
but assert per history that every retained bar's New York date ≤ its development end.

### 28. NOTE — Matrix/protocol consistency and naming

`fixedExits` lists XF-T, which P03/P07 search. The matrix lacks the re-entry and sizing constants (RC10 10, RP50 0.5,
REF 30/0.30/0.11, RPM 0.85/SMA200/10, Z2 semantics, XM's hard 0.08, B-D1T/B-D1N). The protocol's precedence clause
covers this, but the code should read the constants from one frozen file. Stage 1b's Z1/Z2 (trims) collide with Stage
1's tranche-based Z1/Z2 (`engine.ts`); qualify every Stage 1 parity statement or rename.

### 29. NOTE — XP hurdle

rate·T/252 is the financing cost per unit of price only when L = G. For an appreciated Z0 lot (L/G = 0.5) the true
cost is half, and interest accrues on calendar days, not sessions. Acceptable as a heuristic; disclose, or use
rate·(L/G)·Δdays/365.

### 30. NOTE — Checked without finding

Stop computed at each close for the next session and at the fill from the previous close plus the fill price, ratchet
never lowered, closing print never triggers, gap fills at the open, fill-bar check on the low; Hh used only from the next
session (no current-minute high is used); minute-rule decision at bar start + 60 s with the next trade's fill; E09's
lowest-low reference includes the completed bar's low before comparing its close (causal); XD mode 2 SMA200 causal
and defined from late 2016; XP's C_{s−T} always a held close (held − 1 ≥ T), inactive while T > sessions held; XRD's
level formula P = trimCash + S·C − L − I (correct with trims: Σ trim proceeds = (B₀ − L) + trimCash); RPM, RFL, REF,
R3F, RP50, RC10 causal; Z1/Z2 never raise L, and the trim follows the gap check on the same open; interest on
session-date midnights UTC (no DST drift); S1 has no same-close fill and no inherited position; S3 arithmetic (#4).

---

## Overall assessment

The execution clock and stop semantics are causal and inherit Stage 1's verified conventions: I found no look-ahead,
no fill better than the opening trade, and no use of the current minute's high. The trim equations conserve value
exactly. The weaknesses are in the definitions the new work depends on. One parity anchor is wrong (X4), and since
parity failure means "Invalid", the frozen protocol would contradict itself. The account is not self-financing: losses
carry no interest and idle cash sits beside a re-borrowed $100,000. The exposure-matched benchmark charges interest on
gross exposure rather than on actual borrowing. Both distortions are as large as the rubric's dollar thresholds, so
they could change the verdict. Precedence at a switch (pending exit, gap through the old stop, delay) and Π1 in a fold
without P\* are undefined. RS collapses to immediate re-entry for close-decided exits. The parity and fixture plan does
not cover several optimised families and re-entry rules, does not require an independently authored reference, and
sets no tolerances. Correct the BLOCKER and the MAJOR items (#1–#8) before `freeze-protocol`; each needs a few
sentences of protocol text plus the corresponding fixtures. The MINOR items can be fixed or disclosed. None of them
needs market data to resolve, and none justifies opening any evaluation window.
