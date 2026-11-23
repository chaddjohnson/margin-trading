# GPU_PARITY_AND_INTEGRATION_PLAN — how option S1 would be implemented and accepted (proposal; nothing implemented)

Scope: the recommended option S1 (STAGED_STOP_DESIGN_OPTIONS.md §1) for D1·GDX, D1·VGT and Growth·VGT. The plan
follows standard 3.0.0 §9 and `docs/gpu/PARITY_CHECKLIST.md` §2 (a full cycle, not §2a). Every line reference is to the
base revision `48090c55`.

## 1. Does the accepted GPU backend need to change? Yes.

- Official optimization can reach only features with a capability bit, a CUDA port and parity evidence (§9.4).
- S1 changes the trailing level in both families. That level is computed on the GPU in two kernels
  (`gb_d1.cuh` 378 and 541–546; `gb_growth.cuh` `gOnEntry` 147–157 and 1314–1320).
- The new genes must reach the device (`GbD1In`, `GbGrowthIn`).
- Any S1 search is therefore **blocked** until:
  - a CPU reference;
  - its CUDA port;
  - the encoder and domain changes;
  - a full parity campaign;
  - a new ACCEPTED record exist.
- The current record (`bb0e3fcf…`, VERIFIED read-only on 2026-11-23) becomes STALE at the first edit of any manifest
  file.

## 2. CPU reference design: additive modules, frozen files untouched where possible

| Component | Proposed location | Change |
|---|---|---|
| Rule library | **new** `src/staged-stop/` (`config.ts`, `level.ts`, `tests/`) | types, limits, validation, canonical form, and **one** pure function used by both families: `arm(H, actPrice, armed)`, `raise(stopPrice, H, τ₂, armed) = armed ? max(stopPrice, H × (1 − τ₂)) : stopPrice`; `actPrice = raw × (1 + activationTenths / 1000)` (the RC `progressPrice` expression) |
| D1 | **new** `src/d1-risk-controls-rc3/` (RC 3 = RC 2 + per-book `stagedStop: { mode: 'on', activationTenths, stage2Tenths }`) | a `RiskShadowBook3 extends RiskShadowBook2` that applies `arm` + `raise` **after** the manager's own `onEntry` (in `open`) and its `afterSession` (book hook). `strategy.ts`, `shadow.ts`, RC 1 and RC 2 files stay unchanged. A runner `runD1BookRc3` = `runD1BookRc2` line for line |
| D1 identity | RC 3 config | canonical version 3 **only** when some book has staged ON; otherwise RC 2's / RC 1's / Priority 3's identity and evaluation key byte for byte (`riskId2` / `riskEvalKey2` precedent). `rc3-…` identity and a `\|rc3:<canonical JSON>` key suffix |
| Growth | **Growth 1.5.0** (`riseTrading.ts`, edited as every Growth version was, with an OFF-parity fixture test `offParity-1.4.0`) | optional `stagedTrailingStop: { activationPercent, stage2Percent } \| null` (OFF = absent). The same book hook after `book.open` (and after `rules.onFill`) and after `book.afterSession(s)`. It works for both the plain `ExitManager` and `RulesExitManager`, which share `stopPrice` / `postEntryHigh`. Retention: the raised level matters only in stage `full`, since `isStopActive` is already false in `remainder`. `optionalRules.ts` and `strategy.ts` stay unchanged |
| Growth identity | `src/growth140-vgt-s8m/space.ts` genes + `gId` | the new genes are active only when staged ON. Canonical identity omits them when OFF, so every existing Growth identity is unchanged (to be proven by a test over all archived identities in the parity fixtures) |
| Search space | `src/vg-d1-growth-joint/space.ts`-style genome for P4's runner (new namespace) | the structural switch per book; the numeric genes A, τ₂ with repair τ₂ ≤ τ₁ − 5 tenths (D1) / − 0.5 (Growth); masking when OFF |
| Records | new optional record fields | per-book `staged: { arms, stagedExits, placementExits }` only when ON, so OFF records stay byte-identical. Detailed rows add the arming date and the level at exit |
| Pool | `src/vg-d1-growth-joint/pool.ts` | **no change** (exit reasons unchanged; scale invariance kept) |

**Why a book hook and not a new ExitManager subclass.**
- `ShadowBook.open` constructs the frozen `ExitManager`. RC 1 and Growth's optional rules each replace it after the
  fill, and RC 2 records an entry-day decision against it.
- A hook that raises `stopPrice` right after each `onEntry` / `afterSession` is valid whatever the manager's class. It
  keeps every existing class untouched and needs one implementation of the rule for both families.
- RC 2's entry-day decision is made from the protective level only. Its recorded `stopPrice` / `stopActive` fields must
  be taken **after** the hook (a test).

## 3. CUDA design

| Item | Change |
|---|---|
| Protocol | `GB_PROTOCOL_VERSION` 2 → 3 (input sizes change; an old server refuses a v3 batch and vice versa) |
| `GbD1In` (128 bytes, no spare field) | + `double tsp2` (host-computed by the CPU's expression `stage2Tenths / 1000`), + `int32 stagedOn, actTenths` → 144 bytes; `static_assert` updated |
| `GbGrowthIn` (328 bytes, one `pad`) | + `double stActFactor` (host: 1 + percentToFraction(A)), `double stTsp2`; `stagedOn` takes the existing `pad`, so 344 bytes |
| `GbCandIn` | 1,016 → 1,080 bytes |
| `GbBookOut` | `pad[2]` → `stagedArms`, `stagedExits` (size unchanged) |
| Features | `D1_STAGED_STOP` (bit 36) and `G_STAGED_STOP` (bit 37) in `gb.h` `GbFeature`, `layout.ts` `FEATURE`, `encode.ts`, `domain.ts` (`d1StructureFeatures`, `growthStructureFeatures`, the P4 domain) |
| Shared device code | one `__device__ inline` function in `gb_common.cuh`, `stagedArmRaise(H, actPrice, tsp2, armed&, stopPrice&)`, called from the D1 fill (after line 378), the D1 after-session ratchet (after 545), `gOnEntry` (after 154) and the Growth after-session ratchet (after 1319) |
| State | `D1State` / `G`: `bool stArmed; int stArmedS; double stActPrice;` reset at each fill |
| Numerics | the CPU operation order exactly: `armed = armed \|\| H >= actPrice; if (armed) stopPrice = jsmax(stopPrice, H * (1 - tsp2))`; binary64, `--fmad=false`; `actPrice = raw * (1 + (double)actTenths / 1000)` (the `progressPrice` precedent, `gb_d1.cuh` 386) |
| Errors | a per-candidate status for each new CPU throw (invalid staged config, τ₂ ≥ τ₁ after repair, NaN factors) |

**Duplication risk is small and contained.**
- The rule is two statements per site, at four sites, through one device function and one TypeScript function.
- The larger engineering risk sits in the host-side encoding of Growth genes (identity, inactive masking) and in
  Growth 1.5.0's OFF parity. Both are covered by fixed tests (§5).

## 4. Diagnostics and records

- Exit reasons stay `trailing stop` / `trailing stop gap`. A staged exit therefore receives the stop-slippage stress
  exactly as a trailing stop does, and the pool, layout reason tables and risk metrics need no change.
- **Per-book counters** (GPU `GbBookOut`, CPU compact record):
  - arms;
  - exits whose level was stage 2;
  - placement exits: an exit in the session after arming at the opening trade or the first touch.
- **Per-trade detail is CPU only**, like RcLog2: the arming session, H at arming, the stage-1 and stage-2 levels at the
  exit. It is used for the mechanism reports and never read by official records.

## 5. Tests and parity gates (before any official evaluation)

**Unit (synthetic datasets; CPU):**
1. **OFF parity.** Every existing D1 / RC 1 / RC 2 / Growth 1.4.0 fixture reproduces byte for byte. Growth: an
   `offParity-1.4.0` fixture captured before the edit.
2. **Threshold equality.** H == actPrice exactly arms (≥); H one ulp below does not. The tenths-to-fraction
   conversions are compared against the CPU expression.
3. **Session boundaries.**
   - Arming on the entry session (from the fill-minute high) takes effect at the next session.
   - Arming at a close takes effect next session only.
   - A session's own prices never move its own level.
4. **Gaps.** A placement exit at the next open (P-a); a gap through an armed level; a gap that also triggers the
   protective / initial stop (precedence unchanged).
5. **Same-minute transitions.**
   - A stage-2 level and a Growth initial stop reached in one minute: the higher level first.
   - The RC 2 entry-day trigger in the fill minute is unaffected.
6. **The net-rule interaction.** An armed but ineligible level (interest lapse, design example E5) does not exit; the
   level is still raised.
7. **Repair and validity.** τ₂ ≥ τ₁ − 0.5 point is repaired or refused; the (1 + A)(1 − τ₂) > 1 + c rule, if
   approved; invalid / unknown keys are refused.
8. **Profit resets.**
   - Each new position starts unarmed.
   - Continuation after a staged exit is anchored at the raw exit price.
   - The decline gate ends an episode on a staged (profitable) exit.
9. **Retention.** A staged first event triggers the partial sale; the remainder ignores the stage-2 level.
10. **Disabled / adaptive holds** with staged ON; **stop slippage** and **next-open** stresses (D1) with staged exits.
11. **Split invariance.** A synthetic forward-adjusted series gives the same trades as an unsplit one.
12. **Identity and keys.**
    - OFF → the legacy / RC 1 / RC 2 identities and keys are unchanged, for every archived configuration in the parity
      subject sets.
    - ON → `rc3-…` and the Growth identity change, deterministic and order-independent.

**Apollo verification (PARITY_CHECKLIST §2.6; every Node process `--no-maglev`):**
- **Build.** `tools/gpu-backend/build.sh` with the new evaluation digest; reproducible.
- **Parity campaign.** At least 100,000 seeded random genomes, with **staged strata** at both ends of every domain and
  at τ₂ = τ₁ − 0.5 point. Adversarial fixtures for items 2–11. Every door, every option set, determinism across batch
  sizes, input order and host-worker counts, through the official host path. **Zero tolerance.**
- **Sanitizer.** memcheck / racecheck / initcheck / synccheck: 0 errors.
- **Negative tests and the tamper suite**, including an old server refusing the new bits and protocol v3.
- **Fixed-seed mini-optimization** with staged genes on both backends, interrupted and resumed.
- **OFF-parity replays of sealed jobs** on the new binary (genome without staged genes):
  - `a3:C19:broad1`, `a2:C19:base`, and one Stage B CTRL lane per cutoff;
  - **identical** to their sealed records.
  - This is the proof that existing studies' semantics are preserved.
- **Acceptance.**
  - A new acceptance record (schema 2) by a successor acceptance study (e.g. `research/gpu-phase8/`), committed.
  - Its sha256 is kept outside the repository.
  - `FEATURE_MATRIX.md` gets two new rows.
- **Merge gate.** `npm test` passes (the 7 known pre-existing failures only); Strategy Lab's suites (parity and
  Playwright) unchanged.

## 6. Preserving existing capabilities and provenance

| Concern | Plan |
|---|---|
| CPU reference / Strategy Lab | TypeScript remains authoritative. Strategy Lab's runners call the same engines: OFF by default, so their results are unchanged (Strategy Lab parity suite). Exposing the option in the Growth UI is a separate decision (D13). Test guards in Strategy Lab grep Growth text for /retrace\|recovery\|reference/, so name the option without those words or scope the guard |
| Shared-capital event order, costs, interest | unchanged code (pool, fills, interest); a staged exit is an ordinary exit fill |
| Floating point / `Number` | no new transcendental functions; one comparison and one multiply per update; host-computed doubles by the CPU's own expressions; JavaScript `Math.max` semantics through `jsmax` |
| `--no-maglev` | required for every evaluating process (runtime guard unchanged) |
| No CPU fallback | the official path is unchanged (`openOfficialGpuSession` → `GpuPool` → `EvalLab`). The domain derivation adds the staged bits, so a server without them refuses the domain |
| Enumeration, seeds, checkpoints, cache identity | candidate identity covers the staged genes. Archives bind `(study, job, door, pin, evaluation digest, backend)`, so P4 archives never mix with earlier ones. Resume semantics are unchanged |
| Frozen studies' code fingerprints | adding source files changes `src/**/*.ts` manifests that some frozen studies verify. As established, verify those studies at their own commit (detached copy); never repin or relax a guard. Their sealed records stay untouched |
| Acceptance dependencies | any manifest change triggers a **full** renewed acceptance campaign (§5), not §2a |
| Branches | engineering on a research branch; `main` and its acceptance record (`3610caaf…`) unchanged until a reviewed merge. The phase-7 risk-envelope chain (`bb0e3fcf…`) is the base |

## 7. Engineering phases and gates (for Priority 4 authorization)

| Gate | Content | Blocks |
|---|---|---|
| E0 | User approval of the rule (D2–D10) and of the protocol | everything |
| E1 | CPU reference (library, RC 3, Growth 1.5.0) + unit tests; OFF parity CPU-side | E2 |
| E2 | CUDA port, encoder, domain, layout; build | E3 |
| E3 | Apollo parity campaign, sanitizer, negative, tamper, mini-optimization, sealed-job OFF replays | E4 |
| E4 | New acceptance record committed; `npm test`; Strategy Lab suites | any official P4 evaluation |
| E5 | P4 pilot benchmark on the new binary (throughput, VRAM) to size the budget before the protocol freeze | protocol freeze |

**Estimated engineering effort** (inference from Phases 2–7, not a measurement):
- the CPU and CUDA code is small;
- the acceptance campaign took about a day of Apollo time in earlier phases (a 144,795-candidate parity campaign);
- expect a comparable campaign.

**Would GPU support require substantial duplicated logic or unverified behaviour?** No.
- The duplicated logic is a few lines behind one function per side.
- The unverified surface is the interaction set in §5 (retention, entry-day, adaptive hold, placement exits), and the
  parity fixtures target each of them explicitly.
- If the user prefers less risk, implement and accept **D1 first** (RC 3 only). Growth's staged option then stays
  refused by its capability bit, and the reduced domain is declared in the P4 protocol.
