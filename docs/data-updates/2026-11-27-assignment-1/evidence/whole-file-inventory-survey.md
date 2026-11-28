# Survey notes: whole-file VGT/GDX identity checks at HEAD 9d2eaec4 (read-only subagent survey, 2026-11-27 ~19:40Z)

Working notes for `HISTORICAL_COMPATIBILITY.md` (not a sealed record). "Observed" = a read-only node check was run;
everything else was inferred from source.

## Newly failing since the 2026-11-27 append (pins VGT 53395054/2ee06310, GDX 80036100/77dba9b2; both in vintages.json)

| Location | Study | Now | Shared loader? | Exercised by | Freeze guard over the file |
|---|---|---|---|---|---|
| `src/vgt-d1-growth-joint/data.ts:48` buildDoors, `:163-165` openFullDoor | Priority 2 | FAILS | loadDatasetSessions after the check (pin = small fix) | `npm run vgt-joint`; no test | YES: P2 evaluationFiles (lab.ts:25-49); digest observed = frozen `c936f691…` → an edit breaks `assertFrozenCode` (freeze.ts:101) and vgt-pair's `verifyP2Pins` (manifest.ts:63-67) |
| `src/vgt-d1-growth-separate-pooled/compare.ts`, `neighbourhood.ts` (via P2 openFullDoor) | vgt-pair | FAILS downstream | via P2 | `npm run vgt-pair` | pins P2's digest |
| `src/growth140-vgt-s8m/data.ts:120-122` loadFullDoorUnchecked (pin context.ts:35); from `growth140-vgt-stable/data.ts:190` | growth140-s8m / -stable | FAILS | loadDatasetSessions | `npm run growth140-s8m` / `growth140-stable` | integrity.ts verifyPins already broken at HEAD (csv.ts/evaluation.ts changed; no code_acks). Both context.ts are in acceptance.json compat/cpu files (observed) |
| `src/growth140-vgt-stable/data.ts:74` buildDoors | growth140-stable | FAILS | own cutter (door copies unaffected) | build-doors | integrity.ts:42 compares canonical.sha256 with frozen data.canonicalSha256 |
| `src/intraday-d1/data.ts:123-127` loadValidationSessions (pin context.ts:43) | intraday-d1-vgt | FAILS | own reader; lastDate = sessions.at(-1): dropping the check without truncation would silently move the end to 2026-11-25 | `npm run intraday-d1`; doors.test.ts covers dev door only | seal.ts digest over src/intraday-d1/** + lib/csv.ts already differs (recorded, apparently not enforced) |
| `src/vg-balanced-entry-eligibility/data.ts:59-67` verifyCanonical, `:229-233` dataSha256 = pin | vg-balanced (VGT, GDX) | FAILS | via loadNUniverse (no pin option) | `npm run vg-eligibility` | evaluationFiles unchanged at HEAD (observed), enforced validate.ts:25 |
| `src/growth-etf-screening/doors.ts:204-208` FULL vs sealed DOORS.json | growth-etf-screening | FAILS | loadDatasetSessions (returns whole-file sha) | `npm run getf` | frozen digest already differs (observed) |
| `verifyDoors` in c4-gdx-growth-partner, gdx-growth-standalone, vg-d1-growth-expanded, vg-l0-full-joint, vg-l0-risk-families, vg-l0-shadow-eligibility, vg-lifecycle-matched-optimization (`doors.ts:58-67`) | 7 P3-family studies | FAILS (`-- doors` subcommand only; FULL goes through P3's pinned door) | hash only; fix = verifyBytePin(p3 canonical) | `npm run c4gdx/gdxg/vg-exp/vg-l0fj/vg-l0rf/vg-l0se/vg-lmo -- doors` | all 7 frozen digests already differ at HEAD (7a41ff0b edited P3 data/context + lib csv/evaluation) |
| `tools/gdx-d1-growth/data.ts:56-78` pins | gdx-d1-growth | FAILS ("exists with other content": whole-file block vs DOOR_PINS.json; door copies still match) | own | legacyRunner gdx8-data | none |
| `src/optimization-process-audit/freeze.ts:23-34` verifyData | opa | unreachable (refuses "already frozen" first) | – | `npm run opa -- freeze` | POLICY_FREEZE |

## Already failing/skipping before this append (older vintages 2026-10-13 / 2026-10-29; all in vintages.json)

- B4/B5 pool pins (`config/pools/B4.json:137` VGT d8e6991d; `B5.json:155,159` VGT d8e6991d, GDX 86ce101f, plus VOOG/XBI/XRT/KRE whose current files match no pin and are not in vintages.json). Readers: pools/report.ts (labels only), pools/verify.ts FAILS, b4-b5-robustness/cli.ts loadAuditUniverse FAILS (shared by b4-b5-robustness, vgt-standalone-robustness, d1-standalone-opportunity-audit), pools/forward/* FAIL; tests SKIP: pools.test.ts:293-324, b4-b5-robustness regression, vgt-standalone-robustness regression.
- vgt-standalone-robustness/verify.ts:62-67 hard-coded 2026-10-13 pins: FAILS.
- assertAudited (loadNUniverse dataSha256 vs sealed universe.json): d1-robust, d1-diverse, d1-ranked-preemption, d1-wide-library-selection, d1-signal-capital-complementarity: FAIL. realData.test.ts of d1-signal-capital SKIPS.
- Study 8 integrity.ts (2026-10-29 pins) FAILS; Studies 6/7 last-session = 2026-10-29 checks FAIL.
- lastCommonSession 2026-10-13 checks (joint-16, d1-robust, d1-diverse, ranked-preemption, portfolio-aware) FAIL.
- Unaffected: Study 4, Study 3 (records only), Study 6 partA, Study 7 parity, Study 8/9b runners, Study 9/9b door prefixes, legacy archive studies; Growth golden masters (historicalPin) no longer skip.

## Silent changes and dynamic-endpoint risks

- `data/partitions.json` final/all have end null: an unpinned load without endDate reads VGT/GDX through 2026-11-25
  (loadDatasetSessions, loadNUniverse, multi-etf-allocator/dataset.ts, complementary-etf-d1/data.ts, pools runs without
  --end). Mixed universes fail closed in assembleUniverse (unequal sessions, inferred); a VGT-only/GDX-only/VGT+GDX
  universe silently reaches 2026-11-25.
- Study 5 `final` door (no end, no last-date check): the write-once seal refuses a rerun only after the door is opened
  and logged.
- Strategy Lab Run Test dialog (RunTestDialog.tsx:36-54 from server/prices.ts:214-224): the default `to` for final/all
  is now 2026-11-25 for VGT/GDX with no post-validation label.
- Strategy Lab previews.ts:196-200: saved VGT/GDX runs report `drift.data` (warning only); preview-identity.ts: VGT/GDX
  previews miss the cache (by design: content-addressed).
- Study 7/8/9b runners default to the files' common last session (manual runs, labelled).
- `tools/gdx-d1-growth/data.ts audit` would overwrite GDX_DATA_AUDIT.json if rerun; `tools/gdx-d1-growth/portfolio.ts:87`
  records the new VGT sha.
- Identity drift: an unpinned loadDatasetSessions sets dataSha256 = whole-file hash; a fix that deletes a check instead
  of passing `pin` would change frozen ids (P2 FULL ds.id, growth140 FULL, growth-etf-screening, vg-balanced :231).
- The vintages.json description claims a src/data-partition test verifies every entry against the local files; no such
  test exists at HEAD (to fix).

## Shared modules

- `src/lib/evaluation.ts` loadDatasetSessions (has `pin`); `src/lib/canonicalPrefix.ts`.
- `src/vg-d1-growth-joint/{context,data}.ts` (P3 canonical pin; imported by the 7 verifyDoors, gpu-backend, opa, vg-l0-*);
  these and lib/csv.ts, lib/evaluation.ts are in the GPU compat/cpu closure (observed).
- `src/portfolio-aware-d1/nbook/universe.ts` loadNUniverse and `src/multi-etf-allocator/dataset.ts`: no `pin`; their
  whole-file hashes are in ~25 studies' sealed records.
- `src/multi-etf-allocator/data.ts` assembleUniverse; `src/b4-b5-robustness/cli.ts`; `src/pools/{run,report,verify}.ts`,
  `src/pools/forward/*`; study-private loaders shared across studies: P2 data.ts (vgt-pair), growth140-s8m data.ts
  (growth140-stable).
