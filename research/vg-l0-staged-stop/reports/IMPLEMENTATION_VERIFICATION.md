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

**Record:** `config/gpu-backend/acceptance.json` (schema 2) **ACCEPTED** 2026-11-23T18:03:20Z by `research/gpu-phase8/`,
sha256 `c02a8a928946b5acc4df61a7fceb3e5656bf6d12ee33749d615edc7c54fad126` (committed `0d61e71b`; source revision
`6d2cd141`); binary `research/gpu-phase8/build/gb8` sha256 `86b30753…` (nvcc 13.2.86, `--fmad=false`, reproducible),
NVIDIA GeForce RTX 5090 `GPU-ae5f222c…`, capabilities `0x3fffffffff` (bits 0–37), evaluation digest `a54b98b1…`,
protocol v3. It supersedes Phase 7's `bb0e3fcf…` on this branch only (`main` keeps Phase 6's `3610caaf…`).
`tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 c02a8a92…` → **VERIFIED** (CPU 99 +
CUDA 7 + host 12 + policy 29 pinned files, digests, 45 evidence files, reproducible rebuild, device); the record is pinned
out of band (`~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase8-c02a8a92.json`, `pins.jsonl`).

| Gate | Evidence (research/gpu-phase8/results/) | Result |
|---|---|---|
| B1 | `final-binary.json` | gb8 built from the tree, reproducible, digest compiled in |
| A1 parity | `parity/final/` (63 runs; `SUMMARY.json`) | **159,240 subjects, 0 mismatches**, zero tolerance: 155,600 seeded random genomes (126,336 with S1 ON; ON per book D1·GDX 72,347, D1·VGT 73,223, Growth·VGT 73,119; 744,513 arms, 721,903 staged exits, 67,452 placement exits), 26 doors/windows (D19, D21, D23, D24, FULL, E-2020/2022/2025, S0–S7, W-*), 18 option sets (stresses, next-open, removals, d1only/gonly/vgtonly, periods, growth-first, …), the six exact-threshold fixtures T (arming at = and not one ulp below; entry session; gap after; interest lapse; placement), 64,173 envelopes, 192 determinism runs (batch sizes) |
| A2 | `parity/finalists.json` | Assignment 3's 48 sealed finalists on D24: CPU (no Maglev) = GPU = sealed figures |
| R1–R3 | `risk-parity/*.json` | risk-delivery parity (edge D21/D24, finalists D24, random D19): 0 differences; rankings identical |
| A3 | `compare/a3-*`, `a2-*`, `sb-C19/C21/C24-vs-sealed.json` | Assignment 3 / 2 sealed searches replayed identically; **one Stage B CTRL lane per cutoff replayed by Priority 4's derived lane (CTRL arm, S1 OFF) = Stage B's sealed lane (0 differences)** |
| A4 | `compare/mini-*`, `compare/p4-*` | fixed-seed mini-optimizations (Assignment 3's, and Priority 4's both arms with the staged genes: 16 lanes, 30,922 archived): CPU = GPU, workers 0/1/8, stop (exit 75) + resume, SIGKILL + resume, two concurrent jobs — all identical |
| Q1 | `qualify/p4-mini.json` | qualification and ranking parity on the staged mini archives: 61,844 assessments, 0 differing |
| A5 | `sanitizer-final/` | compute-sanitizer memcheck, racecheck, initcheck, synccheck clean (risk mode and staged ON included) |
| A6 | `sustained/p0`, `p1` | 32 min, two concurrent processes, 1,605,632 evaluations each, 0 restarts, 0 CPU-scored, parity samples pass |
| E3 | `policy/negative-final.json` | 82/82 negative tests (8 staged-stop cases: the staged domain refused by the previous server gb7; a staged task outside the attested domain; invalid tasks — activation below the no-early-lock minimum, stage 2 not 0.5 point tighter, Growth·GDX, a non-integer activation, an empty configuration; and a positive control) |
| E4 | `policy/tamper-final.json` | 23/23 source-tamper cases in a sandbox clone |
| E7–E9 | `tests/` | Strategy Lab portfolio parity (five frozen pooled candidates), npm test (below), root tsc 0 errors, Strategy Lab typecheck/lint/Vitest 314/build/Playwright 81 of 81 |
| E10 | `integrity/integrity.json` | 5/5: 21,929 tracked research files as at `5d587bb2`; 28 study preflights; sealed-file modes; the B4/B5 forward freeze; the changed evaluation files are exactly the declared staged-stop set |
| P5 / after the record | `policy/policy-tests.txt`, `tests/record-in-force-after.txt` | policy/enforcement/layout/host/dataset/jobs/risk/staged tests; after the record 42/42 and **30/30 study preflights PASS** |

**npm test** (17:40–17:45Z): 1,875 tests, 1,859 pass, 12 fail = the 7 known pre-existing failures (lower-case
`allin-original.ts` ×6, Study 7 data end), 3 record-in-force tests before the record (pass afterwards), and **2 new,
declared failures** of the completed Priority 5A study (`src/vg-growth-funding-lifecycle/tests/parity.test.ts`: its byte
pin of `riseTrading.ts` v1.4.0 and the line-range diff against it). They follow by construction from the declared Growth
engine revision 1.5.0; the study verifies at its own commit (`5d587bb2`: pin and orchestrator diff hold), its behavioural
test (D24 lifecycle books = canonical books) and the 1.5.0 OFF-parity fixture pass at HEAD (Phase 8 amendment E3). They
are not relaxed; a merge into `main` would inherit them (review decision).

**Phase 8 incidents (all in `research/gpu-phase8/AMENDMENTS.md`).** E1: campaign attempt 1 stopped at the negative suite
(an EPIPE race when the server died; the client now fails closed on the input pipe; two expectations corrected); the
campaign reran from step 1. E2: the E8/E10 tools adapted to studies that require the GPU backend (stale-record
preflights) and the integrity baseline `5d587bb2`. E3: the two declared consequences above; the live-dist check
computed. E4: the generator's first run found two copy defects (a duplicate declaration; Phase 7's Q1 file name); the
negative and tamper suites were rerun on the final pinned files (82/82, 23/23). E5: one generator attempt failed on a
timing-dependent positive control of the Maglev probe (protection assertions all passed); the unchanged rerun was
ACCEPTED.

### 5.1 Priority 4's own engineering gates (`results/engineering/gates.json`, sealed, all pass)

| Gate | Evidence | Result |
|---|---|---|
| E0 | `E0/rule.txt` | RULE_SPECIFICATION.md unchanged since `3aa51963`, which precedes the first implementation commit `3e960ccf` |
| E1 | `E1/tests.txt` | 70/70 CPU-reference tests (config, RC 3 book and pooled, Growth staged and 1.4.0 OFF-parity fixture, P4 space and study tests), code digest `431493de…` |
| E2/E3 | the ACCEPTED record | CUDA port and the parity campaign (above) |
| E4 | `E4/verify-acceptance.txt`, `runtime.txt`, `official-preflight-D19/D21/D24.txt` | VERIFIED; the official runner refuses a process without `--no-maglev` and a non-official purpose (exit 3); the official gate opens on D19, D21, D24 (live device attestation) |
| E5 | `E5/bench.json`, `preflight.txt` | benchmark (§6.2 of the protocol) and the standard preflight PASS |

The protocol froze at 2026-11-23T18:17:12Z (`results/protocol-freeze.json` sha256 `ea75d7ed…`; protocol sha256
`bd57ea2a…`, code digest `431493de…`, acceptance `c02a8a92…`).

## 6. Engineering dry run of the study's stage logic

`results/engineering/dryrun/dryrun-checks.txt`: a mini-scale, non-official run (purpose parity-test, engineering doors
D19 / D21, `DRY` seeds, the in-process CPU reference) of exactly the official post-search code — the union with OFF
projections, the full qualification instrument, the selection (lane values, pairs, statistics, mechanism, pooled P0,
interval subjects), the decomposition rows and the interval rows — 11/11 invariant checks. It found no defect beyond the
evidence-identity issue fixed before it (amendment E2).
