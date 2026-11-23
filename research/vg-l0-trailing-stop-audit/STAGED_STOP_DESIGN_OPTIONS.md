# STAGED_STOP_DESIGN_OPTIONS — proposals for Priority 4 (not implemented, not authorized)

Everything here is **[P] proposal**. No value below has been evaluated on any history, and none is recommended as a
setting. Parameter domains are mechanism-derived search boxes for a future, separately authorized optimization in
which **OFF stays selectable**. The audit facts this builds on are in AUDIT_REPORT.md (§3, §6, §10).

## 0. Requirements every option must meet

1. **Augment, never replace.**
   - The existing stage, a net-profit-activated trail at τ₁ (the existing genes `trailingStopPercentage` for D1 and
     `trailingStopPercent` for Growth), stays exactly as it is.
   - A staged rule may only **raise** the level after a later, explicit profit condition.
2. **Exact OFF parity.** OFF per book reproduces today's trades, fills, marks, identities and evaluation keys bit for
   bit, on the CPU and the GPU.
3. **Causal, once-a-day semantics.** The rule reads only the post-entry high H that the existing level already uses, at
   the instants the level is already recomputed: the fill (`onEntry`) and each later session close (`afterSession`).
   - A change therefore takes effect from the next session.
   - This avoids any intra-minute ordering of a new high and a trigger.
4. **Monotone.** The level never falls, and an armed stage never disarms.
5. **Scale-invariant.** It is defined by price ratios, so a funded lot still exits exactly with its virtual lot (pool
   contract), and split-adjusted series stay consistent.
6. **Per book, independent.** D1·GDX, D1·VGT and Growth·VGT each get their own state. Growth·GDX stays OFF.
7. **A trading rule, not a qualification rule.** It changes trades. P0 (marked DD ≤ $35,000 = 35 % of the initial
   $100,000 allocation) and every research gate stay exactly as they are (§7).

## 1. Option S1 (recommended for a first experiment): two-stage profit-activated tightening

### 1.1 Definition

Per book with mode ON, two new genes:

- **A**, the activation gain: a fraction of the raw entry fill e;
- **τ₂**, the stage-2 trailing distance: a fraction of H, with τ₂ < τ₁.

Let H(s) be the existing post-entry high through session s: the fill, the entry-session close and the later minute
highs of the entry session, then the later session highs.

```
actPrice   = e × (1 + A)                  computed once at the fill (cf. RC adaptive hold's progressPrice)
armed(s)   = armed(s−1) ∨ H(s) ≥ actPrice  checked in onEntry (s = entry session) and afterSession(s)
τ_eff(s)   = armed(s) ? τ₂ : τ₁
L(s)       = max(L(s−1), H(s) × (1 − τ_eff(s)))     the existing ratchet with τ replaced by τ_eff
```

- **Eligibility.** The **existing net-profit rule is unchanged**: the level is eligible in session s+1 iff
  q × L(s) − N − I(s+1) > 0.
- **Triggers and fills.** Unchanged: gap → opening trade; minute open → that open; minute low → L. The exit reason
  stays `trailing stop` / `trailing stop gap`, so the stop-slippage stress applies to it exactly as to today's
  trailing stop.
- **New diagnostics, not new reasons.** The session of arming, the stage-2 level at the exit, and per-book counters of
  arms and of exits whose level was stage-2 (§4 of GPU_PARITY_AND_INTEGRATION_PLAN.md).

### 1.2 Units, denominators, time anchors

| Quantity | Unit / denominator | Anchor |
|---|---|---|
| A | fraction of the **raw** entry fill e (gross price appreciation; no cost, no interest) | the same H as the existing level: session highs (fill-minute-onwards on the entry session) |
| τ₂ | fraction of H (as τ₁) | — |
| Arming | latched; monotone by construction (H non-decreasing, e fixed) | evaluated at the fill (entry-session high) and after each close |
| Effect | from the **next** session's start | as the existing level |

**Why gross gain on H, not net profit.**
- Net profit depends on interest, and therefore on time; it would make arming lapse-prone and path-dependent in a way
  the hold and level are not.
- H is the only high the level reads.
- The RC adaptive hold already uses exactly this anchor, H ≥ e(1 + g) (`progressPrice`), so the GPU has a proven
  bit-exact precedent.

### 1.3 Validity, canonical form and genes (no duplicate dimensions)

- **τ₁ is the existing gene.** S1 adds two numeric genes plus one structural switch per book.
- **Required: τ₂ < τ₁.** Repair τ₂ to ≤ τ₁ − 0.5 points, after the RC precedent "extended hold repaired to ≥ hold + 3".
  Otherwise the stage is inert and two identities would be one behaviour.
- **Recommended: (1 + A)(1 − τ₂) > 1 + c.** At arming the stage-2 level then sits above the cost-adjusted entry, so
  stage 2 never arms a level that locks a loss.
- **Low arming gains.** An A below the existing implied activation (≈ τ₁ ÷ (1 − τ₁)) makes stage 2 **lower the
  effective activation**: a higher level becomes net-positive sooner. That is a different hypothesis (an "early lock"),
  not a tightening. Report it as a separate stratum, or exclude it by requiring A ≥ τ₁ ÷ (1 − τ₁) + c (decision D7).
- **OFF canonicalization.** With mode OFF, A and τ₂ are inactive: masked in the identity, absent from the canonical
  JSON, never perturbed.

### 1.4 Proposed domains (for approval; mechanism-derived, not fitted)

| Gene | Domain (search grid / fine grid) | Rationale |
|---|---|---|
| mode | {OFF, ON} per book | OFF must be reachable and protected |
| A (D1) | 5.0 %–50.0 % in tenths of a point (screen step 5 tenths, fine 1) | Lower: about the smallest existing implied activation (τ₁ 3 % → +3.2 %; New L0 6.1–7.9 %); lower values only re-define activation. Upper: D1 buys after X = 8–30 % declines, and regaining the reference high needs X ÷ (1 − X) ≤ 43 %. Above ≈ 50 % the stage is nearly inert, and OFF covers that |
| A (Growth) | 5.0 %–50.0 %, step 0.5 point (fine 0.1) | Growth's percent convention; trend gains of 25–70 % exist in its book. The bound is not fitted to them: a wider box costs only coverage |
| τ₂ (D1) | 1.5 % – (τ₁ − 0.5 point), tenths (screen 5, fine 1) | Upper: strictly tighter than stage 1. Lower: half of the existing D1 box's lower bound (3.0 %, "tighter than one day of sector-ETF noise"); a once-a-day level below ≈ 1.5 % of H is mostly a same-week noise exit |
| τ₂ (Growth) | 1.5 % – (τ₁ − 0.5 point), step 0.5 (fine 0.1) | the same reasoning |

**Alternative parametrization (decision D8).** τ₂ = r × τ₁ with r ∈ [0.20, 0.90] has no invalid combinations. But it
couples τ₂ to τ₁ in perturbations and makes the effective floor depend on τ₁. Absolute τ₂ with repair is recommended
because it matches the existing grids and the neighbourhood instrument (radius in grid units).

### 1.5 Ordering inside a session (unchanged machinery)

At the close of session s:
1. H ← max(H, high_s);
2. armed ← armed ∨ H ≥ actPrice;
3. L ← max(L, H(1 − τ_eff)).

At the start of session s+1:
1. the hold-due test;
2. the active test (net rule on L);
3. the minute scan, exactly as today.

Neither a new high nor arming affects session s's own exits. The fill session follows the same pattern: `onEntry`
computes H from the fill minute on, arms if H ≥ actPrice, and sets L; the first exit-eligible session is the next one.

### 1.6 Can arming cause an immediate exit?

Yes, and it should be labelled, not hidden.
- If session s pushes H through actPrice and also closes more than τ₂ below H, then L(s) = H(1 − τ₂) > close_s.
- Session s+1 then either opens below L, giving a `trailing stop gap` at the opening trade, or trades down to L at once.
- This is a level **placed** above the market, not a resting stop gapped through.

| Choice (decision D6) | Behaviour | Remarks |
|---|---|---|
| **P-a (recommended)**: H-anchored, as defined | may exit at the next open after a sharp intraday reversal on the arming session | simplest; one H for both stages; consistent with the existing level's semantics. Count these "placement exits" separately |
| P-b: arming-close anchor | stage 2 trails H₂ = max(close_s, later highs); L = max(L, H₂(1 − τ₂)) | avoids placement exits; adds one more state variable and a second high series |

### 1.7 Gaps, partial fills, liquidity, same-minute events

- **Gaps.** A tighter level is gapped through no less often; the loss beyond it is measured from a higher level.
  Prior gaps stay gaps.
- **Partial fills and liquidity.** The engine models neither. Because S1 multiplies stop-level fills that are assumed,
  not observed, Priority 4 must report the stop-slippage stress and, for D1, the `next-open` stress. Growth cannot run
  `next-open` with its optional rules on.
- **Same minute.** S1 changes no intraday ordering: the level is fixed before the session starts.
  - An initial stop below it is reached later within a minute (higher level first).
  - The pool's "exits, then fills, then the new lot's own exits" order is unchanged.

### 1.8 Interactions

| Mechanism | Behaviour with S1 |
|---|---|
| D1 continuation | a staged exit is net-positive by construction (with the §1.3 constraint) → opens the window at the raw exit price. Re-entry still needs a P pullback from max(exit, later highs) and a Y rebound |
| D1 deep entry | unchanged rules; an earlier exit leaves the book flat earlier, but re-arming needs an X decline |
| Flat-since-session-start | unchanged: no D1 arming in the exit session |
| RC protective stop / entry-day | independent fixed level far below. Precedence unchanged (the higher level is reached first) |
| RC adaptive / disabled hold | unchanged; the hold acts only on trades losing at the open, and an armed S1 level makes a loss at the open an `open ≤ L` gap first |
| Decline gate | staged exits are profitable → they end an unblocked episode and are never failed attempts |
| Growth initial stop | independent; candidate order unchanged (`trailing` outranks `initial` at one trade) |
| Growth retention | **decision D9.** Recommended: S1 changes only the stage-`full` level, so retention's partial sale happens at the first (possibly staged) trailing event and the remainder continues to the SMA exit. Alternative: refuse S1 together with retention in the first experiment (then declare the reduced domain) |
| Growth continuation, eligibility, drawdown gate | unchanged; they see an earlier or later flat state |
| Max hold / buffer | unchanged; they act only on losing trades, which S1 never arms (with the §1.3 constraint) |
| Pool | unchanged code; different exit instants → different funding (slot freed sooner or later) |
| Reset / restart of a position | each new position starts unarmed with its own actPrice from its own fill. The D1 `initFromHigh` (T1 transfer path of older engines) is not on the canonical path; if ever used, arming must be recomputed from the carried H |

### 1.9 Numerical examples (hypothetical prices; e = 100, $100,000 principal, c = 5 bps, 11 % interest)

The prices are invented for illustration only. None is a back-test.

**E1. An early position with a tiny gain** (τ₁ 7.3 %; S1 with A = 15 %, τ₂ = 4 %):
- After three sessions H = 102 (+2 %).
- Stage 1: L = 94.55. It is inactive: the net rule needs H above ≈ 107.93.
- S1: 102 < actPrice 115, so it is not armed. **Nothing changes.**
- The position keeps today's behaviour: no trailing exit and the hold age rule. S1 cannot cause a premature exit at
  small gains.

**E2. A substantial long winner** (held 120 days):
- H = 160 (+60 %). Stage 1: L = 148.32 → net ≈ $44,555 if the final decline reaches L.
- S1 armed at H ≥ 115: L = 153.60 → net ≈ $49,830 **if** no earlier pullback after arming reached 4 % (+$5,275).
- For scale only: New L0's lot #11 had H = 340.74 and stopped at 315.866 (7.3 %). A 4 % stage-2 level would have been
  327.11, but its interim path is unknown to this audit.

**E3. The same trade with one interim 5 % pullback after H = 130** (assumed on day 60):
- S1 exits at 124.80 → net ≈ $22,867 (60 days of interest), against ≈ $44,555 under stage 1 alone (120 days):
  **−$21,688**.
- The D1 book then needs a P pullback before continuation can re-arm; a Growth book needs a new edge-triggered crossing.
- This is the central risk: **one ordinary pullback deeper than τ₂ after arming forfeits the rest of the trend**.

**E4. Placement exit** (P-a): the session reaches H = 121 (armed at A = 20 %) but closes at 115.5. Then L = 116.16 >
115.5, so the next session exits at its opening trade or at the first touch.

**E5. Interest lapse (Growth, 300 days held; A = 10 %, τ₂ = 3 %):**
- H = 110.5 → L = 107.19 (+7.2 % gross, about $7,078 before interest).
- Accrued interest is $9,041, so the net rule makes the stage-2 level **ineligible** (net ≈ −$1,963 at L).
- With the legacy rule retained, a long, slow Growth trade can be armed but unprotected. Decision D5 decides whether a
  stage-2 level should be eligible once armed, irrespective of interest. That is a second behavioural change; keep it
  out of the minimal design unless approved.

### 1.10 Where S1 can harm profit or utilisation

1. **Premature exits in persistent trends.** D1 and Growth cannot cheaply re-enter after an exit (continuation needs
   P, deep entry needs X, Growth needs a new crossing) [E3].
2. **Displacement.**
   - A freed slot may be taken by a weaker trade decided while the slot is free. With L0 funding, the later, better
     decision is refused and never revived.
   - Conversely, a longer-occupied slot can also block. The sign is empirical.
3. **Optimistic fills.** There are more assumed level fills; the base case has no slippage.
4. **Placement exits** after blow-off sessions [E4].
5. **Costs.** 10 bps per round trip more often; interest saved partly offsets this.
6. **Retention interaction.** An earlier partial sale and an SMA remainder may hold a smaller position through the
   trend.
7. **Search-side harm.**
   - A larger genome dilutes a fixed budget.
   - A superset space wins training comparisons mechanically.
   - Both demand paired designs and chronological evidence (PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md).

## 2. Option S2: multi-stage monotone ladder (k ≥ 2 tightening steps)

A₁ < A₂ < … with τ₁ > τ₂ > τ₃ > …, the same ratchet with τ_eff = the τ of the highest armed step.
- **Mechanically.** It is S1 iterated: the same code path, more genes (2 per extra step), and ordering constraints that
  need repair.
- **Not recommended yet.**
  - Each step doubles the interaction surface.
  - The evidence (AUDIT_REPORT §10.3) does not distinguish "moderate" from "very large" winners well enough: New L0 has 37
    winners over ten years, 7 with a marked peak of at least $30k and 4 of at least $40k.
  - It would be a candidate only if S1 shows a robust, chronologically supported effect, and only with a finding that
    the S1 optimum sits at a domain edge.

## 3. Option S3 (comparison only, not recommended first): retained-profit floor

Once H ≥ e(1 + A_min), the floor is F = e + ρ(H − e), with ρ ∈ (0, 1) the retained share of the gross peak gain, and
L = max(L₁, F).

**Its implied distance below H** is d(g) = (1 − ρ) × g ÷ (1 + g) with g = H/e − 1. It is **tight at small gains and loose
at large ones**, the opposite of S1:

| ρ | g = 2 % | 5 % | 10 % | 20 % | 40 % | 60 % |
|---|---:|---:|---:|---:|---:|---:|
| 0.5 | 0.98 % | 2.38 % | 4.55 % | 8.33 % | 14.29 % | 18.75 % |
| 0.7 | 0.59 % | 1.43 % | 2.73 % | 5.00 % | 8.57 % | 11.25 % |
| 0.8 | 0.39 % | 0.95 % | 1.82 % | 3.33 % | 5.71 % | 7.50 % |

- **Minimum activation is mandatory.** Without A_min, ρ = 0.7 at g = 2 % exits on a 0.6 % dip.
- **It binds where premature exits are likeliest, not on the largest winners.** Because L = max(L₁, F), the floor acts
  only while d(g) < τ₁, i.e. for g < τ₁ ÷ ((1 − ρ) − τ₁). At τ₁ = 7.3 % that is g below ≈ 17 % (ρ 0.5), ≈ 32 % (ρ 0.7)
  or ≈ 57 % (ρ 0.8).
  - Above that gain the floor is looser than the existing trail and inert.
  - S3 therefore tightens small and moderate winners, where ordinary pullbacks are most common, and leaves the largest
    winners, where most giveback dollars sit (AUDIT_REPORT §10.3), to τ₁ unless ρ is high.
- **Overlap.** For high ρ it overlaps S1's region with one more nonlinearity.
- **Prior art.** Study 3's XRP was this family: in-sample attractive, failed forward.
- **Keep it as a later comparator** only if S1 shows an effect.

## 4. Alternatives considered and excluded for now

| Alternative | Why not now |
|---|---|
| A lower activation / break-even floor for small gains | Targets the never-armed losers (peaks 0.1–5.7 %). Prior D1 studies (B-A/B-B/B-C/B-D) found nothing for VGT D1; it multiplies premature exits in every trade's early phase |
| Volatility-scaled (ATR) trail | Adds a new data dependency and state (a GPU port of ATR exists for Growth only); Study 3's XV was in-sample only |
| Time-based tightening | Interacts with the calendar hold and with financing; a different hypothesis |
| Dollar giveback cap | Not ratio-based (a retained remainder changes the scale); Study 3's XRD |
| Entry-session (intraday) staged protection | Would change the "no exit on the entry session" convention of the trailing stop (cf. RC 2): a separate, larger change. Entry-session peaks (lot #9) are a gap problem |
| Partial staged sale (sell a fraction at A) | Overlaps Growth retention, needs partial-lot accounting in D1 (none exists) |

## 5. Recommendation

- **Test first:** S1 on all three active books independently (mode per book), H-anchored (P-a), gross-gain arming on
  the existing H, the legacy net-profit eligibility retained, absolute τ₂ with repair, and exit reasons unchanged.
- **The §1.3 constraint.** Recommended: (1 + A)(1 − τ₂) > 1 + c, with the low-A "early lock" region either excluded or
  reported as a stratum (D7).
- **Do not test yet:** S2 (no evidence that one stage is insufficient) and S3 (the opposite distance profile, overlap,
  failed prior art); the §4 alternatives.

## 6. A trading exit versus P0 risk qualification

S1 changes trading behaviour: fills, lots, funding and the marked path. P0 is an optimizer **qualification** limit on a
historical path: marked DD ≤ $35,000 relative to the initial $100,000 allocation. It is not a stop, and it is untouched.
- Separately reported, never gated, as today:
  - trade principal loss (relative to funded principal);
  - banked-capital DD (relative to the initial allocation);
  - profit giveback in dollars and in % of peak profit.
- A staged stop is judged by whether the **jointly optimized, P0-qualified** portfolio is better. It is never judged by
  whether it lowers the DD of a fixed phenotype, and it is never used to justify a looser envelope (the P3 envelope
  stays not adopted).
