# Research recovery checkpoint — New L0 shadow-position eligibility (vg-l0-shadow-eligibility)

## Top screen

- **Updated:** 2026-11-12T20:02Z (UTC, from the clock). **Status: INCOMPLETE — protocol FROZEN; the study chain is
  RUNNING (C21 B1 qualification; C19 complete).**
- **Task:** the user's brief "New L0 Shadow-Position Eligibility: Implementation and Comprehensive Optimization"
  (`brief/BRIEF.md`, 831 lines, sha256 `3547d5efee0e92f26977231b6425e869859369ec367efcb70ecf05d3f51e8ed3`, read in full
  to its final section "Overall Objective"; not truncated).
- **Branch:** `research/vg-l0-shadow-eligibility` (main checkout), from `6eb85160` (before the trading-session engine change
  `e3b0ae37`) + merge of `main` `2346a1b5`; pushed at `0bd0db96` (2026-11-12T12:48Z; `git ls-remote` = local).
- **Authority:** `PROTOCOL.md` sha256 `fc6dbdcc4f8b933b…` (frozen 2026-11-12T12:47:53Z, record
  `results/protocol-freeze.json`, commit `0bd0db96`; code-closure digest `16bd44c056b8…`); `AMENDMENTS.md` (none);
  standard 2.1.0 (`ac5c2c69…`); NL0 1.0.0 (`9b387bb4…`); stage V `results/parity/parity.json` and
  `results/parity/parity-frozen-code.json` (730 checks, 0 failed each); `CONTROL_MANIFEST.json` sealed.
- **Running:** systemd user unit `vgl0se-chain1.service` (outside the session; KillMode=process) running
  `bash research/vg-l0-shadow-eligibility/chains/chain1.sh`, started 2026-11-12T12:48:18Z; chain log
  `research/vg-l0-shadow-eligibility/results/logs/chain1.log` (git-ignored); each stage is its own unit
  `vgl0se-<stage>` with log `results/logs/<unit>.log`; job progress `.cache/vg-l0-shadow-eligibility/jobs/<job>/progress.json`.
  The chain commits each sealed block itself (step ids a01 … f04). Finished cleanly iff the chain log ends with
  "CHAIN1 DONE"; a failure prints "CHAIN FAILED at [id]".
- **Recovery:** if the chain unit is gone without "CHAIN1 DONE": read the chain log's last "start [id]"; check
  `systemctl --user list-units 'vgl0se-*'` (never start a duplicate of a running stage unit); then relaunch the chain from
  that id: `systemd-run --user --unit=vgl0se-chain1b --collect -p KillMode=process -E PATH="$PATH" -E HOME="$HOME"
  --working-directory=/home/chad/projects/margin-trading -p StandardOutput=append:<abs>/results/logs/chain1.log
  -p StandardError=append:<abs>/results/logs/chain1.log /bin/bash research/vg-l0-shadow-eligibility/chains/chain1.sh <id>`
  (an interrupted job resumes from its archive; sealed stages refuse to rerun; a commit step is idempotent only if
  something is staged — resume at the step after a completed commit).
- **Next step after "CHAIN1 DONE":** `node --experimental-transform-types tools/vg-l0-shadow-eligibility/tables.ts`;
  full `npm test` (after the validation only); REPORT.md; ROADMAP row + Phase 8 decision; final checkpoint; commit; push.
- **Do not rerun:** stage V, the control manifest, the freeze, any sealed stage; FULL opens only in step f03 (once).

## Chain progress (from `results/logs/chain1.log`; every block below is sealed and committed by the chain)

| Step | Stage | Window (UTC) | Result | Commit |
|---|---|---|---|---|
| a01–a02 | phase 2 (New L0 × 8, D24) | 12:48–12:49 | 5,208 fresh; all-OFF best ($382,721.46); every D1 toggle combination harmful | `0f338cf4` |
| b11 | C19 search B1 (96 lanes) | 12:49–15:04 | 1,666,266 fresh, 14,043 hits; 95 lanes triggers not met, 1 at cap | `5265b419` |
| b12 | C19 qualify B1 | 15:04–15:22 | 32/32 replicates qualified; primary `C19/B1/R21/V2#1 profit` $148,747.23 / DD $24,916.05 (111) | `5265b419` |
| b13–b14 | C19 B2 step d1 (48 lanes) + finalists | 15:22–15:51 | 878,968 fresh; F1 $102,840.62 (010), F2 $84,907.67 (010) | `5265b419` |
| b15–b16 | C19 B2 step g (48 lanes) + selection | 15:51–16:40 | 667,758 fresh; primary `C19/B2-g/F1/R8/V3#1 profit` (011) | `5265b419` |
| b18 | C19 fold evaluation (D21) | 16:41 | slice 2020–2021: B1 +$89,021.67 (DD $48,255.05); B2 +$48,104.08 (DD $44,645.13); New L0 $171,402.70 (descriptive) | `de0e13ab` |
| b21 | C21 search B1 | 16:41–20:00 | 1,712,642 fresh, 13,866 hits | (with b27) |

## Phase 0 (complete)

- **0.1 Documentation integration into `main`:** commit `2346a1b5` (parent `aa5754d4` = previous `main` =
  `origin/main` before the push; fast-forward) adds only `docs/research/{OPTIMIZATION_STANDARD.md,
  optimization-standard.versions.json, STUDY_PROTOCOL_TEMPLATE.md, templates/, methods/, ROADMAP.md}` and
  `research/vg-l0-session-hold/` (105 files, additions only) taken unchanged from `research/vg-l0-session-hold`
  `18674b39`. Not integrated: any `src/` change (the session-hold engine option `e3b0ae37`; the preflight tool, whose tests
  read research-line studies). Built with a temporary index (no checkout of `main`; the live Strategy Lab server
  `server/main.ts`, PID 2277059, was not disturbed). Pushed 2026-11-12T11:36Z (outside the sandbox): `git ls-remote` →
  `main` = `docs/nl0-method-standard-integration` = `2346a1b589e881631c3ad54a487149f8e5a531e4`.
- **0.2 Historical integrity:** this branch does not contain `e3b0ae37`; Priority 3's evaluation digest here =
  `147cad7c17eff3fa…` = its historical sealed digest (checked 2026-11-12T12:0xZ); the new feature lives only in new files.
- **0.3 New L0 verified:** development $382,721.46 / DD $19,459.83 / 34 lots reproduced through this study's engine on D24
  (engineering smoke and stage V dry run); full-history figures ($479,605.18 / DD $20,385.99; validation $96,883.72 /
  reset DD $20,385.99; realized $485,169.93; unrealized −$5,564.76) verified from 5B `validation.json` (`83931139…`),
  the session-hold `validation.json` (`f474c421…`) and Strategy Lab parity (`59424ff9…`); reproduced through this engine
  at the validation stage (FULL stays closed until the frozen selection: PROTOCOL AD11).

## Engineering results (pilot and bench: cache only; stage V sealed)

- Pilot `straight` (2026-11-12T12:21–12:29Z): all 21 stage paths on P18 passed; interruption tests: SIGTERM (exit 75)
  and worker SIGKILL (exit 1) resumed identically; the unit kill needed two retries (first two attempts killed nothing or
  only during worker start-up — disclosed below); the third (kill at 15 s; 599 records archived) resumed with 667 archive
  hits; `pilot-compare ref straight sigterm wkill unitkill` → identical lane results. Pilot `p2` (12:36–12:43Z) re-ran every
  stage path on the final code (compact stress/removal evidence): identical lane results, primaries and nominee.

- Unit tests: `src/vg-l0-shadow-eligibility/tests/{allocator,position,study}.test.ts` — 32 pass.
- Stage V dry run (2026-11-12T12:08Z, unit `vgl0se-dryv1`, 102 s, 1,363 simulations): 730 checks, 0 failed (G1 9, G2 2
  incl. ≈ 1,000 archived 5B records identical through the new allocator, G3 48, G4 36, G5 540, G6 61, G7 2, G8 1, G9 5,
  G10 2, G11 24).
- Bench (D24, 96 centres × 17): 12 workers 90.4 ev/s (7.7 GiB), **14 → 92.8 ev/s** (149 ms/eval, 8.9 GiB), 16 → 92.3 ev/s;
  files `.cache/vg-l0-shadow-eligibility/pilot/bench/w*-strata.json`.
- Engineering smoke (D24, New L0 centres, disclosed in PROTOCOL §2): every D1-toggle combination far below all-OFF.

## Disclosures

- The pilot's first unit-kill attempts did not test a mid-job kill (the job finished before the 45 s kill; a reused unit name
  made the next launch exit at once; an 8 s kill landed during worker start-up with nothing archived); fixed (fresh unit names,
  kill at 15 s) and repeated successfully; pilot outputs of those attempts were removed from the cache only.
- After the first pilot, stress and removal reruns are kept in compact form in the evidence (full records stay in the job
  archives) to keep the committed records proportionate; the second pilot verified identical results.
- The code was prettier-formatted after the first sealed stage V; a second sealed stage V on the formatted (frozen) code
  passed identically (`results/parity/parity-frozen-code.json`).

- The New L0 × 8 combination centres on D24 were seen during engineering, before the protocol (PROTOCOL §2); no
  combination is excluded from any search.
