# Test report — the full joint genome (Assignment 3): engineering readiness before the freeze

Every layer passes, apart from the 7 known pre-existing failures of the full suite (§4), which are unrelated to this work.
**Everything here was verified before the optimizer evaluated any searched configuration's performance** (brief §1): the
synthetic and unit tests, the stage-V dry runs (12:22–12:36Z), the full suite (12:42–12:5xZ), the pilot (12:42–12:50Z)
and the sealed stage V (12:56:39Z) all precede the protocol freeze and the first search.

## 1. Summary

| Layer | What | Result |
|---|---|---|
| Synthetic adverse scenarios | `src/vg-l0-full-joint/tests/gaps.test.ts` (RC 2's book, unchanged) | **24/24 pass** |
| Space tests | `tests/space.test.ts` (cells, genome, identity masking, strata, neighbourhoods, moves, projections, Track N seeds) | **13/13 pass** |
| Selector tests | `tests/select.test.ts` (Assignment 2's 36 sealed primaries re-derived; populations; refinement plan) | **7/7 pass** |
| Module tests (RC 1, RC 2, Assignment 2, this study) | stage V V7 | **177/177 pass** |
| Type check | `npx tsc --noEmit -p tsconfig.json` | 0 errors in `src/vg-l0-full-joint/` |
| Full suite | `npm test` in unit `vgl0fj-npm-test` (`results/logs/npm-test.log`) | 1,654 tests: **1,643 pass, 7 fail (all known, pre-existing)**, 4 skipped |
| Stage V (sealed `results/parity/parity.json`, `0e8ca216…`) | V0–V8 on real data, 3,075 simulations, 328 s | **0 failed of 18,091 checks** |
| Bench | D24, 10/12/14/16 workers | 96.7 / 97.6 / 98.8 / 99.0 evaluations/s (flat; 6.5–10.2 GiB) |
| Pilot | every stage path on P18 (D19), 4 cells + 2 family pairs, pilot budgets | every stage completes |
| Interruption tests | graceful SIGTERM (stop after 1,500 fresh), worker SIGKILL (after 150), unit SIGKILL (20 s) | each resumed; **identical lane results** to the reference run |

## 2. Against the brief's engineering checks (§1)

| Brief item | Evidence |
|---|---|
| 1. Legacy defaults reproduce frozen New L0 exactly (ledger, funding, minute marks, risk metrics) | V1: this study's evaluation path = Priority 3's engine (books, lots, funding, every mark change, drawdowns, the record) on FULL (AD3) and D19–D24; FULL $479,605.18 / $20,385.99 / 46 lots, validation $96,883.72 / reset DD $20,385.99, ledger signature `7b17578108747911`, 79 funding decisions, 547,753 mark changes; the foundation's sealed trade-list, funding and mark hashes equal; D24 $382,721.46 / $19,459.83 / 34 lots; IJ1 $382,163.79, C4 $302,785.91, C4-refined $360,569.71 on D24 = 5B's sealed values; New L0's identity `a2e385640ca61012` |
| 2. RC 1 unchanged where RC 2 is not selected; next-session = RC 1 | V0 (RC 1 and RC 2 files = Assignment 2's frozen closure); V2: 96 random next-session full joint configurations, RC 2 = RC 1 (books with logs, results with marks) on D21 and D24 (1,102 protective exits exercised); 40 legacy configurations with random Growth = Priority 3 |
| 3. Entry-day activation sees only post-fill observations; gap-through-stop preserved; not a loss cap | V4: 96 random configurations, 53 entry-day exits re-derived from the raw bars (52 later-minute lows, 1 minute open through the level), 160 pre-fill lows below a level correctly ignored, 4,544 entry sessions survived with no other exit; `gaps.test.ts`: −10/−20/−30% gaps through an 8% stop fill at the gapped open in families B, C, D and both activations (loss ≥ the gap); a −30% gap through a 25% stop loses 30%; a halt fills at the first trade after it; next-open stress fills at the following minute's open; family A rides a −30% gap to its hold |
| 4. Both D1 books honour their own controls; no cross-book mutation, double funding, noncausal fill, duplicate state | V5: 64 random configurations, every book's trades closed by D21's end identical on D21 and D24; Σ lots = net; no overlapping lots (one slot); principal ≤ $100,000; funded fills = virtual fills; V2/V4 per-book controls |
| 5. Growth genes change Growth's executable signals and state; masking, serialization, identity, caching | V3: 44 random Growth genomes (38 structures, both resolutions) — the pooled Growth book = the canonical Growth 1.4.0 path (every trade, daily marks, drawdowns); an active one-step move changes the identity in 40 of 40 (and the trades in 11 of 40); **each of the 50 numeric genes and 7 optional rules changes the engine's parameters in every sampled context and its trades or decision log in at least one** (trades changed at ±R in 195 of 456 contexts); inactive-gene genomes give the identical configuration and record (40 of 40); 182 funded Growth lots = Growth's virtual trades. `space.test.ts`: decode/encode exact in all 64 cells at both resolutions; inactive genes never change an identity; JSON round trips keep identity and evaluation key |
| 6. P&L, costs, calendar-day interest, marks, carried state, same-minute ordering reconcile | V1 (New L0 to the cent on FULL with sealed hashes), V2 (deep equality with Priority 3 / RC 1 including marks), V5 (accounting identities) |
| 7. Determinism, worker/restart reproducibility, doors, identity masking, split adjustments, prior digests | V4 determinism; V6 48 configurations: child-process workers = in-process records, JSON round trips; the interruption tests; V0 Priority 3 `147cad7c…`, 5B `3f902532…`, shadow `54304b69…`, Assignment 2 `6bc03fec…` (decision `3b9efbc7…`) unchanged; doors verified by size, sha256 and last row |
| 8. All relevant tests pass; unrelated failures documented | §1, §4 |

## 3. Stage V on real data (sealed; pass/fail counts and hashes only)

| Gate | Requirement | Checks |
|---|---|---|
| V0 isolation | only `src/vg-l0-full-joint/**` and the `vg-l0fj` npm script changed under src/apps/config since `73d3a748`; research changes only in this study; RC 1/RC 2 = Assignment 2's frozen closure; five sealed digests unchanged | 49/49 |
| V1 New L0 and the incumbents | as §2 item 1 | 18/18 |
| V2 random full joint parity | 40 legacy (Priority 3) + 96 next-session (RC 1) × D21, D24 | 272/272 |
| V3 Growth | canonical parity, signal causality and reach, inactive genes, pooled Growth lots | 342/342 |
| V4 entry-day invariants | 96 random configurations over the protected cells | 10,726/10,726 |
| V5 causality and accounting | 64 random configurations | 6,530/6,530 |
| V6 worker reproducibility | 48 configurations | 96/96 |
| V7 module tests | 177 tests | 1/1 |
| V8 frozen work | `research-preflight --all`; the foundation's 9 and Assignment 2's 47 sealed records | 57/57 |

The evaluation digest at stage V: `2aeeee42decc54708280ed171a6a87b97ca5af35dcc42a3288e0de475c4f31b0`.

**The pre-registration revision of V3 (AMENDMENTS R1).** The first dry run tested a provisional threshold (an active
ONE-fine-step Growth move must change Growth's trades in at least half of 40 cases) and failed (11 of 40): a 0.1-point
nudge often leaves discrete signals unchanged. The second used an incomplete fill fingerprint (it missed the retention
sale fraction) and flagged 14 genes. An engineering diagnostic (counts only) showed every gene reaching the engine's
parameters; five context-dependent genes changed trades only under larger moves (e.g. the drawdown gate's discovery window
in 18 of 40 contexts at its box minimum); the reset/renew eligibility levels act only on renewal watches, which on VGT
2016–2024 end by supersession or lapse, so they change the engine's logged state but rarely its trades. The sealed check
is: identity change for every one-step move; for every gene and rule, parameter change in every context and trade-or-log
change in at least one. **Limit:** a gene whose effect is rare on this history (the reset/renew levels, several
continuation inputs) is searched but is nearly inert in practice; that is a property of the canonical engine on this
market, not of the integration.

## 4. Known pre-existing failures of the full suite (unchanged)

| Test file | Cause |
|---|---|
| `src/intraday-study/tests/study.test.ts:19` | opens `src/app/allin-original.ts` (lowercase), absent on this case-sensitive filesystem |
| `src/minute-optimizer/tests/goldenMaster.test.ts:36` | same |
| `src/trailing-buy/tests/goldenMaster.test.ts:39, 43, 49, 58` | same (4 tests) |
| `src/study7-runners/tests/runners.test.ts:148` | its reconciliation applies only when the data end on 2026-10-29 (the canonical VGT file ends 2026-10-30) |

The suite grew from 1,610 (Assignment 2) to 1,654 tests: +44 tests of this study (gaps 24, space 13, select 7). The 7
failures are exactly Assignment 2's list. The full suite reads whole data files (as in Assignment 2); none of its output
feeds a study decision.

## 5. Limits

- OHLC minute bars do not order prices inside a minute; RC 2 uses only the fill minute's low and wholly later minutes. A
  real stop order's latency and queue position are not modelled.
- A protective stop is not a loss cap in either activation mode (gaps, minute opens through the level, halts).
- The pilot exercised the code paths and resumption; it was not a performance test and none of its figures is reported.
