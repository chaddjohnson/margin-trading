# RULE_SPECIFICATION — S1 staged trailing stop (`staged-stop@1`), engineering gate E0

Status: **E0 FROZEN** at the commit that adds this file, before any engine code was written and before any staged
evaluation of any kind. Changes after this commit are recorded in `AMENDMENTS.md` (append-only) with the reason, and
re-run every engineering gate they affect. Written analysis and tables only (standard §7.7).

- **Authority:** the user's Priority 4 brief (`brief/BRIEF.md`, sha256 `720e0b36…`), which approves the Priority 3
  audit's recommended S1 design (decisions D1–D17 of `research/vg-l0-trailing-stop-audit/DECISION_REGISTER.md`), all
  three active books independently, and the engineering-first order.
- **Code basis verified at this branch's base** `5d587bb2` (= the audit's base `48090c55` plus documentation only:
  `git diff --stat 48090c55 5d587bb2 -- src apps config tools` is empty). Every line reference of the audit's
  SOURCE_MAP still holds.

## 1. The rule

Per enabled book b ∈ {D1·GDX, D1·VGT, Growth·VGT}, with integer genes `a` (activation, tenths of a percentage point)
and `t2` (stage-2 distance, tenths of a percentage point); τ₁ is the book's existing trailing distance gene.

```text
A          = a / 1000                    (JavaScript: activationTenths / 1000)
tsp2       = t2 / 1000                   (JavaScript: stage2Tenths / 1000)
actPrice   = e × (1 + A)                 e = the raw entry fill (VirtualTrade.entryRawPrice); computed once at the fill
armed(s)   = armed(s−1) ∨ H(s) ≥ actPrice
L(s)       = armed(s) ? max(L′(s), H(s) × (1 − tsp2)) : L′(s)
```

`L′(s)` is the level the existing manager has just set (`onEntry`: H × (1 − τ₁); `afterSession`: max(L(s−1),
H × (1 − τ₁))). Because `1 − tsp2 > 1 − τ₁` (t2 ≤ t1 − 5) and rounding is monotone, `max(L′, H(1 − tsp2))` equals
`max(L(s−1), H(1 − τ_eff))` exactly: the implementation and the formula coincide bit for bit.

| Item | Specification |
|---|---|
| Anchor H | the existing `postEntryHigh`: on the entry session max(raw fill, entry-session close, highs of the fill minute and every later minute of that session); after each later session max(H, session high). Unchanged |
| Instants | (i) immediately after the manager's `onEntry` at the fill (s = the entry session); (ii) immediately after the manager's `afterSession(s)` for every later session s while the position is open. Nothing else moves the stage. A session's own prices never move that session's level; the raised level acts from the next session (D1, Growth: no trailing exit acts on an entry session) |
| Latch | armed never resets while the position is open; each new position starts unarmed with its own actPrice |
| Monotone | the level is never lowered (max) |
| Eligibility | **unchanged** legacy net-profit rule (`isStopActive`), re-decided at each session start; Growth's `RulesExitManager` keeps its "stage full only" rule. An armed level may be ineligible (interest lapse) and may lapse again |
| Triggers, fills, reasons | unchanged: gap at the open → `trailing stop gap` at the opening trade; minute open ≤ L → that open; minute low ≤ L → L (`stop`) or the `next-open` stress fill (D1; Growth without optional rules); stop slippage stress applies (same reasons) |
| Precedence | unchanged in every manager (ExitManager, RiskExitManager RC 1/RC 2, RulesExitManager) |
| Transition (D6) | P-a, H-anchored: when the arming session closes at or below the newly placed level, the next session may exit at its opening trade or first touch; counted as a placement exit (§4) |
| Retention (D10) | the raised level is the stage-`full` level; the first qualifying trailing event may be retention's partial sale; in stage `remainder` the trailing stop is inactive (existing rule), so the stage never governs the remainder |
| Interactions | D1 continuation, deep re-entry, flat-since-session-start, decline gate, RC protective / entry-day stops, legacy / adaptive / disabled holds, buffered loss, Growth initial ATR stop, losing maximum hold, trend exits, continuation, eligibility, drawdown gate, the pool: **no code change**; they see different exit instants and prices only |

### 1.1 Where the hook runs (verified for every manager variant)

| Path | Manager at the fill | Hook after `onEntry` | Hook after `afterSession` |
|---|---|---|---|
| D1, RC 1 / RC 2 / RC 3 (every D1 book in this study) | `RiskExitManager` (RC 1 replaces the frozen `ExitManager` after the same `onEntry`) | `RiskShadowBook3.open` after `super.open` (RC 2's open, which ran RC 1's open). RC 2's entry-day decision object was built before the hook from the manager's `stopPrice` / `isStopActive`: its two record-only fields are re-taken after the hook (same object, so RC 2's identity test in `close` holds). The decision's trigger uses only the protective level | `RiskShadowBook3.afterSession` after `super.afterSession`, only while a position is open and not on its entry session (the exact condition of `ShadowBook.afterSession`) |
| Growth without optional rules | `ExitManager` (book's own) | `simulateTrading` right after `book.open` | right after `book.afterSession(s)` (same condition) |
| Growth with initial stop and/or retention | `RulesExitManager` installed by `PositionRules.onFill`, which calls `onEntry` again (resetting the level) and then evaluates the entry session (initial stop only; trailing inactive) | inside `onFill`, immediately after `mgr.onEntry` and before the entry-session evaluation, through an optional runtime callback `afterEntry` (absent = the 1.4.0 path byte for byte). Not after `book.open` (it would be lost and double-counted) | right after `book.afterSession(s)` |

In every variant no trailing exit can act on the entry session, so the hook's effect begins at the next session start;
the placement inside the entry session matters only for record/log fields, which the table makes exact.

## 2. Units, domains, validity and repair

| Gene | Unit | Box | Coarse grid (independent screens, islands) | Fine grid (neighbourhoods, refinement, informed lanes) |
|---|---|---|---|---|
| switch per book | {OFF, ON} | — | balanced in screens | — (fixed in numeric neighbourhoods) |
| `a` (A) | tenths of a point of gross price appreciation over e | 50–500 (5.0 %–50.0 %) | step 5 (91 levels) | step 1 |
| `t2` (τ₂) | tenths of a point of H | 15–145 (1.5 %–14.5 %) | step 5 (27 levels) | step 1 |

τ₁ in tenths: D1 `t1 = grid.trailingStopPercentage` (an integer, 30–150); Growth `t1 = round(10 × trailingStopPercent)`,
required exact (|10 p − t1| ≤ 1e-9; the Growth box is 3–15 % on 0.5 / 0.1 grids). One unit and one expression for all
three books.

**Validity (engine; a violation is refused with an error, never repaired).** With c = 5 bps = 1/2000 (the study's base
cost per side; a configuration rule, not re-evaluated under cost stresses):

| Rule | Exact integer form | Meaning |
|---|---|---|
| V1 | a, t2 integers; 50 ≤ a ≤ 500; 15 ≤ t2 ≤ 145 | domain |
| V2 (strictly tighter) | t2 ≤ t1 − 5 | τ₂ ≤ τ₁ − 0.5 point |
| V3 (D7, no early lock) | (2a − 1)(1000 − t1) ≥ 2000 · t1 | A ≥ τ₁ ÷ (1 − τ₁) + c, **equality valid** |
| V4 (locks a gain) | (1000 + a)(1000 − t2) > 1,000,500 | (1 + A)(1 − τ₂) > 1 + c, strict (implied by V2 ∧ V3; checked anyway) |
| V5 | books ⊆ {D1:GDX, D1:VGT, G:VGT}; Growth·GDX refused; unknown keys refused; version = 1 | scope |

All comparisons are integer arithmetic (no floating-point equality question). Examples: t1 = 73 → minimum a = 80
(a = 79 fails: 157 × 927 = 145,539 < 146,000; a = 80 passes: 159 × 927 = 147,393); t1 = 61 → 66; t1 = 57 → 61;
t1 ≤ 46 → the box minimum 50 (V3 does not bind). An exhaustive check over t1 ∈ [30, 150], a ∈ [50, 500] found **no**
integral equality case of V3 (2a − 1 is odd), and **no** case where V2 ∧ V3 hold but V4 fails. Tests check both sides of
every boundary (the last failing and first passing a for every t1; t2 = t1 − 5 versus t1 − 4; t2 = 15 versus 14).

**Search repair (the search space's constructor only; deterministic, after every decode, perturbation and move):**
1. t2 ← min(t2, t1 − 5) (then within the box: t1 ≥ 30 ⇒ t1 − 5 ≥ 25 ≥ 15);
2. a ← max(a, aMin(t1)), aMin(t1) = max(50, the least integer satisfying V3) (177 at t1 = 150, so ≤ 500 always);
3. assert V1–V4. A repaired value may lie off the coarse grid (it is canonical in tenths); repairs are counted.

## 3. Configuration, identity, keys, records

```text
StagedConfig = { version: 1, books: { "D1:GDX"?: {activationTenths, stage2Tenths},
                                      "D1:VGT"?: {…}, "G:VGT"?: {…} } }      (absent book = OFF)
```

- **Canonical form:** books in the fixed order D1:GDX, D1:VGT, G:VGT; keys in the order activationTenths,
  stage2Tenths; a config with no book is `null` (OFF). OFF genes are absent (masked), so they never enter an identity, a
  perturbation or a cache key.
- **Identity:** OFF → the existing identity byte for byte (`riskId2`: Priority 3's `quadId`, `rc1-…` or `rc2-…`). ON →
  `st1-` + the first 16 hex of sha256(`"st1#" + canonical JSON + "#" + riskId2(quad, controls)`).
- **Evaluation key:** OFF → the existing key (`riskEvalKey2`) byte for byte. ON → that key + `"|st1:" + canonical JSON`.
  The GPU EvalLab appends the same suffix; `|detail` and `|risk` suffixes follow it unchanged.
- **D1 book key** (per-book caches): RC 2's key, + `|st1:{"activationTenths":a,"stage2Tenths":t2}` when ON. **Growth
  book key:** Priority 3's `growthKeyOf`, + the same suffix when ON.
- **Compact record:** OFF → the existing record byte for byte. ON → `id` = the staged identity and one added field
  `staged: { "<book>": { arms, stagedExits, placementExits } }` for the ON books only.

## 4. Diagnostics (counters exact on CPU and GPU; detail rows CPU only)

| Counter (per ON book) | Definition |
|---|---|
| `arms` | positions whose `armed` turned true (at most one per position; virtual book) |
| `stagedExits` | executed trailing-stop events (`trailing stop` / `trailing stop gap`; for Growth with retention, including the partial sale) while the position was armed |
| `placementExits` | staged exits executed in session s_a + 1 (the session index right after the arming instant's session s_a) where the arming session's close C(s_a) ≤ the level after the arming raise |

**CPU detail rows** (diagnostics only, `purpose = diagnostic`, never read by official records): per position of an ON
book — entry date and raw fill, actPrice, arming date and H at arming, placed flag, the level in force at the exit and
the stage-1 counterfactual H × (1 − τ₁) of the same H, the executed raw exit price and reason. "Protected profit" at a
level is reported as an accounting identity (shares × (L − L₁)), **never** as realized incremental P&L.

## 5. Implementation map (smallest clean design; OFF = exact legacy behaviour)

| Component | Change |
|---|---|
| `src/staged-stop/` (new) | config, validation, canonical form, identity / key helpers, repair, the per-book tracker (arm / raise / counters / detail rows); one pure rule used by both families |
| `src/d1-risk-controls-rc3/` (new) | `RiskShadowBook3 extends RiskShadowBook2` (the hooks), `runD1BookRc3` (= `runD1BookRc2` line for line with the RC 3 book; staged absent ⇒ identical VBook), the pooled runner `evaluateStaged` (staged null ⇒ calls the existing `evaluate` itself) |
| Growth engine (`src/growth-trading/riseTrading.ts`, `optionalRules.ts`) | **Growth engine revision 1.5.0**: an optional `SimulationOptions.staged` (absent / null = the 1.4.0 path byte for byte) and an optional `PositionRulesRuntime.afterEntry` callback. **Reconciliation with D15 and the brief (no new Strategy Lab controls):** the staged option is an engine-level research option, **not** a Strategy Lab parameter; Strategy Lab's strategy schema and version stay `rise-from-recent-low-trading@1.4.0`, so no UI, catalogue, request or identity of Strategy Lab changes. The fixture `src/growth-trading/tests/offParity-1.4.0.test.ts` (captured from the unedited engine before the edit) proves OFF parity |
| `src/vg-d1-growth-joint/books.ts` | `simulateGrowth` / `runGrowthBook` pass an optional `staged` through (absent = unchanged; key suffix only when ON) |
| GPU (`src/gpu-backend/`) | protocol v3; `GbD1In` 128 → 144 bytes (+ `stagedOn`, `actTenths`, `st2Tenths`, pad); `GbGrowthIn` 328 → 344 (`pad` → `stagedOn`, + `actTenths`, `st2Tenths`, `pad`); `GbCandIn` 1,016 → 1,080; `GbBookOut` 96 → 104 (`pad[2]` → `stagedArms`, `stagedExits`, + `placementExits`, `pad`); `GbCandOut` 624 → 656. Capability bits `F_D1_STAGED_STOP` (36) and `F_G_STAGED_STOP` (37); `GB_SUPPORTED` = bits 0–37. One `__device__` rule in `gb_common.cuh` called at the D1 fill (after the onEntry block) and after-session ratchet, and in `gOnEntry` and the Growth after-session ratchet; device-side domain check → `C_INVALID`. Host: `layout.ts`, `encode.ts` (values + bits), `batch.ts` (counters → record, staged identity), `lab.ts` (key suffix; `Task.staged` present only when ON, so an OFF task is the earlier task object), `domain.ts` (reachable bits), the server's supported set and sizes |
| Records / pool / fills / costs / interest | **no change** |

Expression parity: `actPrice = raw * (1 + (double)actTenths / 1000)` and `stop = jsmax(stop, H * (1 - (double)st2Tenths
/ 1000))`, binary64, `--fmad=false`, the CPU's operation order and `Math.max` semantics (`jsmax`).

## 6. Search-space rules (for the protocol; frozen here so ablation outcomes cannot shape them)

- EXP genome = Assignment 3's 92 genes + 3 categorical switches + 6 ordinal staged genes. Shared genes keep CTRL's screen
  coordinates exactly (common random numbers); the staged genes come from separate streams; each book's switch is ON
  in exactly half of every screen (the 8 ON/OFF patterns equally often, a seeded balanced permutation).
- Neighbourhood radii (fine units): a ± 20, t2 ± 5, by round(u × scale × radius) from a separate Latin stream; clipped to
  the box widened to include the centre; repaired (§2); switches fixed (ON→OFF is a separate structural report).
- Refinement moves: a ± {10, 20}, t2 ± {3, 5} (Assignment 3's `max(1, round(f × R))`, f ∈ {½, 1}), each repaired, and
  each ON book switched OFF (the precedent of "every enabled optional Growth rule OFF").
- An EXP configuration with every switch OFF **is** the CTRL configuration (same identity, key, neighbourhood): shared
  work is an archive hit, and OFF remains reachable and protected.

## 7. Excluded (separate hypotheses; not implemented)

A third stage, ATR-scaled tightening, retained-profit floors (S3), time-based tightening, dollar caps, earlier or
entry-session activation, intraday entry-session exits, staged partial sales, eligibility-once-armed (D5's alternative),
the P-b transition, Growth·GDX, other symbols.
