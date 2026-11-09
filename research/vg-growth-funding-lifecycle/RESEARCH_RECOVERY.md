# RESEARCH RECOVERY — Priority 5A (brought forward): Growth funding lifecycle and fixed portfolio combinations

## Top screen

- **Updated:** 2026-11-09T16:24Z (UTC, from the clock). **Status: COMPLETE** — every stage sealed (V passed), the report, tables,
  roadmap and documentation written. **Follow-up gate:** the user's review of `REPORT.md` (recommendation: Priority 3B
  under L0 with protected both-symbol exploration; 4A separately). Nothing further is started.
- **Task:** `brief/BRIEF.md` (sha256 `26be1bceb44c28bf4cfee1cd902365e3fa287bd4d20ed65099f26635bbf970e3`, 236 lines,
  read in full). Bounded fixed-arm comparison (L0/L1/L2 Growth refusal lifecycles) on unchanged phenotypes, matched
  neighbourhoods, standalone neighbourhood assessment. No search. No Strategy Lab, no broker, no deployment.
- **Branch:** `research/vg-growth-funding-lifecycle` (main checkout; no worktree), from `927cd0ab`. Commits: freeze
  `6b0ecf10`, development records `3f2d800c`, FULL manifest `aaa4384c`, final (this checkpoint's commit).
- **Authority:** `PROTOCOL.md` `5db1e08b393f…` (unchanged since the freeze); `STUDY_MANIFEST.json`
  `b37cf60c957a62e827509a74632f6897a3f27a6df71d0929c4192b35b90c5bbf`; `results/protocol-freeze.json`
  `c95a770970149a67b9cedcc88eaffcbbcf2d3dba7a8d2d2016bea5b19169c7bf`; amendments: none. Standard **2.0.0**
  (`2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105`), scope `diagnostic`, preflight PASS.
- **Running processes:** none (`systemctl --user list-units 'vgflc*'` empty).
- **Next step:** none in this study. A new question needs a new study namespace; sealed records are never rerun.

## Sealed records (`npm run vg-life -- verify`: 9 ok)

| Stage | Record | sha256 | Simulations | Peak memory |
|---|---|---|---:|---:|
| Manifest | `STUDY_MANIFEST.json` | `b37cf60c957a62e827509a74632f6897a3f27a6df71d0929c4192b35b90c5bbf` | — | — |
| Freeze | `results/protocol-freeze.json` | `c95a770970149a67b9cedcc88eaffcbbcf2d3dba7a8d2d2016bea5b19169c7bf` | — | — |
| V | `results/verification/verification.json` | `4b88dff7eacc2c107f0ca725e87508bc011a57c4cb0f681f3d6b173c70918eb7` | 353 dev (PASSED) | 9.2 GB |
| C | `results/development/centres.json` | `09afda78f6fa40fb18a43557e4e24a3bf7fe159c148cc6858b72b2c31785feb8` | 130 dev | 8.2 GB |
| N | `results/development/neighbourhoods.json` | `86d14f19876f942cd500071c380302ecb9e54f77dfb894e1fc3e2e2998b1e7ca` | 12,160 dev + 5,120 archived | 11.4 GB |
| S | `results/development/standalone.json` | `35f28d1851c1cec5872d414c3283423ebb513056324c32b48c69648ba05e7154` | 1,920 dev | 10 GB |
| P | `results/development/verdicts.json` | `3a16a387eb5de81f137d61389174ecbac22284665c759d7449380853368fe319` | 0 | — |
| FULL guard | `FULL_MANIFEST.json` | `876a2a43f207287954068437553bd181aa48eab107a3f5a36b9ebaad92dd9317` | — | — |
| F | `results/full/full.json` | `b708f76356604dfdd10f3289b42cb6bbb2b8c5c5d435563d04ea89623b05ec36` | 49 FULL | 9.5 GB |

Totals: 14,563 development (plan 14,563; ceiling 20,000) and 49 FULL (ceiling 200) fresh simulations; 0 retries;
27,354 consistency rounds; 34,129 Growth re-simulations; 5,120 archive reads; 112 book-parity runs; about 390 engineering
pilot evaluations before the freeze (mechanics only; uninterrupted / SIGTERM / worker-kill / unit-SIGKILL runs resumed
identically). Stage units ran in `vgflc.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0), 12 workers.

## Deliverables

- `REPORT.md` (Q1–Q7, mechanism, neighbourhoods, standalone, full history, limitations, next task) and
  `results/tables/*.md` (`tools/vg-growth-funding-lifecycle/tables.ts`, `standalone-drivers.ts`), text and tables only.
- Code `src/vg-growth-funding-lifecycle/` (`npm run vg-life`), `results/engine/orchestrator.diff`.
- Docs: standard 2.0.0 (§7.7 no visuals) + registry + template; `CLAUDE.md` reporting preference;
  `docs/research/ROADMAP.md` (5A complete; 3B next under L0; 4A/4B; decisions recorded).

## Results in one paragraph (development verdicts, rule R1–R6; details in REPORT.md)

L1 does little (all nine core Growth subjects "little"); L2 helps A, hurts B and C85; at the centres L1/L2 reduce the
GDX-including combinations (A −$11,696.39) and IP falls $83,057.12 (freed Growth books displace D1). The GDX-to-VGT cost
is the refusal at VGT's trend entry, not the virtual waiting; no lifecycle recovers it. No combination dominates (L0: E,
C4, C85, A non-dominated; L1/L2: E, C4); B dominated. Standalone: 08500a60 strongest matched local stability, then #4;
Appendix A alone fragile (52.1% breaches). Neither L1 nor L2 recommended for 3B. FULL: every L0 target to the cent;
validation identical across arms.

## Tests

- This study: 26/26 (`tests/lifecycle.test.ts` 23 synthetic, `tests/parity.test.ts` 3); preflight 17/17.
- Full suite as unit `vgflc-npm-test` (with the shell's PATH), 2026-11-09T16:19:45Z → about 16:24Z: 1,355 tests, 1,344
  pass, 4 skipped, 7 fail — exactly the 7 known pre-existing failures (`src/app/allin-original.ts` ×6: intraday-study 1,
  minute-optimizer 1, trailing-buy 4; Study 7 runners' sealed-final-door parity / data end). No regression.
- Historical seals: Priority 3 `npm run vg-joint -- verify` 21 ok; 3A `npm run vg-diag -- verify` 7 ok; preflights of
  Priority 3 and the Priority 2 follow-up (1.0.0) and 3A (1.1.0) pass with retained-pin notices.

## Guards

- Priority 3 and 3A are complete and frozen: never edit, re-seal or rerun their records or archives (read-only here).
- No search, no new winner, no tuning of the L2 constants; validation never changes a rule.
- Backend only; Strategy Lab never touched. Job archives `.cache/vg-growth-funding-lifecycle/` and logs
  `results/logs/` are git-ignored.

## Disclosures

- Pre-freeze engineering (PROTOCOL.md §2, §13): L0 parity, request and lot counts by outcome/source (A, B, GP4), pilot
  equality/timing/memory; no L1/L2 net, DD or neighbourhood figure was printed before the freeze.
- E's L0 development centre was known from Priority 3's sealed removal record (stage V confirmed it).
- The checkpoint written just before `full-manifest` carried an estimated time (16:18Z) a minute after the clock's
  16:17:33Z manifest seal; corrected here (times now taken from `date -u`).
- Retained pins: Priority 3 and the Priority 2 follow-up keep 1.0.0, 3A keeps 1.1.0.

## Push record

(to be appended after the push: `git push -u origin research/vg-growth-funding-lifecycle`, verified with
`git ls-remote`.)
