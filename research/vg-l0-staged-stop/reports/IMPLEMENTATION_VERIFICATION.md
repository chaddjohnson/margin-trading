# Priority 4 — CPU/GPU implementation and verification report (S1, `staged-stop@1`)

Written analysis and tables only. The rule itself is `../RULE_SPECIFICATION.md` (E0, frozen at `3aa51963` before any
engine code); this report states what was built, how it is identified and how it was verified.

## 1. Code identity

| Step | Commit (UTC) | Content |
|---|---|---|
| E0 | `3aa51963` | `RULE_SPECIFICATION.md` frozen; brief copy; checkpoint |
| baseline | `62574e98` (12:01:58Z) | Growth 1.4.0 OFF-parity fixture captured on the **unedited** engine (`src/growth-trading/tests/fixtures/baseline-1.4.0.json`, sha256 `f7b50992…`) |
| E1 | `3e960ccf` (12:15:00Z) | CPU reference: `src/staged-stop/` (config, validation, canonical form, identity, repair, tracker), `src/d1-risk-controls-rc3/` (RC 3 D1 book and pooled runner), Growth engine revision 1.5.0 option; OFF-parity and mechanism tests |
| E2 | `bb1b51f2` (12:21:38Z) | CUDA port: protocol v3 layouts, capability bits 36/37, one device rule at the D1 and Growth entry and after-session sites; host encode/decode/Lab/domain/official mini-set |
| spaces | `a3e8b6d2` (12:33:14Z) | P4 search spaces (CTRL = Assignment 3; EXP = + 3 switches + 6 staged genes; restricted informed spaces) and the mechanically derived lane |
| Phase 8 | `5d3ddccc` (12:55:39Z), `54261ea0` (E1), `0ca36f68` (E2) | the GPU acceptance study `research/gpu-phase8/` and its amendments |

Branch `research/vg-l0-staged-trailing-stop`, rooted at `5d587bb2` (the trailing-stop audit's delivery; `main` =
`3606f4b3`, unchanged).

## 2. What changed (the evaluation manifest against the base commit)

| Group | Files | Nature |
|---|---|---|
| CPU closure | `src/staged-stop/config.ts`, `tracker.ts` (new); `src/d1-risk-controls-rc3/book.ts`, `growth.ts`, `run.ts` (new); `src/growth-trading/riseTrading.ts`, `optionalRules.ts` | the rule (one pure tracker for both families); RC 3 = RC 2 + the hooks; Growth engine revision 1.5.0: an optional `staged` option (absent = the 1.4.0 path byte for byte) and an optional `afterEntry` runtime callback |
| CUDA | `gb.h`, `gb_common.cuh`, `gb_d1.cuh`, `gb_growth.cuh` | protocol v3 structures; `stagedInit` / `stagedOnEntry` / `stagedStep` / `stagedOnExit` / `stagedDomainOk` in `gb_common.cuh`; calls at the D1 fill, the D1 after-session ratchet, `gOnEntry`, the Growth after-session ratchet and every exit path |
| Host | `batch.ts`, `client.ts`, `compat.ts`, `encode.ts`, `layout.ts`, `toolchain.ts` | layouts and sizes; staged values and capability bits; counters → record and staged identity; the manifest entry; the client fails closed on a dead server's input pipe (Phase 8 E1); default build `gb8` |
| Enforcement | `domain.ts` (`stagedStopDomain`), `lab.ts` (key suffix; a task carries `staged` only when ON), `official.ts` (staged parity subjects in the mini-set; VRAM plan), `entrypoints.ts` / `entrypoints.json` (`gpu-phase8` registered non-official) | the gate covers the staged domain |

Layouts: `GbD1In` 128 → 144 bytes, `GbGrowthIn` 328 → 344, `GbCandIn` 1,016 → 1,080, `GbBookOut` 96 → 104,
`GbCandOut` 624 → 656; `GB_SUPPORTED` = bits 0–37; batch protocol version 3 (a v2 server refuses a v3 batch; a v3
server refuses a v2 batch).

**Not changed:** the pool, fills, costs, interest, records of OFF configurations, Strategy Lab (its strategy schema stays
`rise-from-recent-low-trading@1.4.0`; the staged option is an engine-level research option, never a Strategy Lab
parameter), broker interfaces, production configurations, frozen research.

## 3. Identity, keys and records

OFF → every identity, key and record of the earlier engine byte for byte (`riskId2` / `riskEvalKey2`; an OFF task is
the earlier task object). ON → identity `st1-` + 16 hex of sha256(`"st1#" + canonical JSON + "#" + riskId2`); evaluation
key + `|st1:<canonical JSON>`; the record adds `staged: {book: {arms, stagedExits, placementExits}}` for the ON books
whose stage ran. An EXP configuration with every switch OFF is the CTRL configuration (same identity, key, archive
entry).

## 4. CPU verification (E1)

| Test file | Tests | What |
|---|---|---|
| `src/growth-trading/tests/offParity-1.4.0.test.ts` | 9 | the Growth 1.4.0 fixture captured before the edit is reproduced exactly with the option absent and `null` |
| `src/staged-stop/tests/config.test.ts` | 12 | validity V1–V5, repair, canonical form, identity / key helpers, the no-early-lock minimum (no integral equality case) |
| `src/d1-risk-controls-rc3/tests/book.test.ts` | 13 | RC 3 = RC 2 when absent; arming at the exact threshold and one ulp below; entry-session rule; placement exits; gap exits; interest lapse; counters |
| `src/d1-risk-controls-rc3/tests/pooled.test.ts` | 3 | the staged Growth runner = Priority 3's for both comparators and every stress when absent; OFF reproduces the sealed development figures and identities of the pooled runner |
| `src/growth-trading/tests/stagedStop.test.ts` | 7 | the Growth hook placements (plain manager, initial-stop / retention rules via `afterEntry`), counters, retention partial sale |
| `src/vg-l0-staged-stop/tests/space.test.ts` | 8 | CTRL = Assignment 3's space; EXP's base part = Assignment 3 exactly; repairs; balanced screens; bounded moves; restricted spaces |
| `src/vg-l0-staged-stop/tests/study.test.ts` | 18 | budget, statistics and the outcome label's order, OFF projections, the ablation grid, informed free genes, lane keys, door guards, the derived lane |

Existing D1 / RC / Growth / pool suites: 420/420 pass (unchanged behaviour).

## 5. GPU verification (E2–E4): the Phase 8 acceptance

[Completed from `config/gpu-backend/acceptance.json` and `research/gpu-phase8/` after the record is written.]

## 6. Engineering dry run of the study's stage logic

`results/engineering/dryrun/dryrun-checks.txt`: a mini-scale, non-official run (purpose parity-test, engineering doors
D19 / D21, `DRY` seeds, the in-process CPU reference) of exactly the official post-search code — the union with OFF
projections, the full qualification instrument, the selection (lane values, pairs, statistics, mechanism, pooled P0,
interval subjects), the decomposition rows and the interval rows — 11/11 invariant checks. It found no defect beyond the
evidence-identity issue fixed before it (amendment E2).
