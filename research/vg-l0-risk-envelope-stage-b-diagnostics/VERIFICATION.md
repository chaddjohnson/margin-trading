# VERIFICATION — RES-BD 1.0.0

Times are UTC. The evidence files are in `results/verification/` and `results/regression/`. Unit logs are copied to
`results/verification/unit-logs/`.

## 1. Original archive identities (before = after)

All 12 Stage B job archives in `research/vg-l0-risk-envelope-stage-b/cache/jobs/<job>/archive.sqlite`
(git-ignored, on Apollo) were hashed with sha256:
- **before any processing,** 07:32:35–07:32:42Z: `archives-before.sha256`, committed in `9e5c4767` with the plan;
- **after all processing,** 08:04:39Z: `archives-after.sha256`, by `archive.ts verify-all`;
- **result:** 12 / 12 unchanged.

They were uncompressed SQLite, cleanly closed (no `-wal` / `-shm`), so no `.sqlite.zst` restore was needed and none was
made. No Stage B archive was removed, truncated, compacted or opened for writing. The only direct opening of an
original besides hashing was the read-only `readFileSync` call that confirmed D1; it failed at the size check.

| Job archive | sha256 | Bytes |
|---|---|---:|
| C19-search | `1f3daea895f33a8e7a65b652301ea468ee10dcd03d6a8f586cf8ea74b5a13b6b` | 5,143,461,888 |
| C19-qualify | `990315c0d8d9eb68c4f1253edec72e2b5b5386a4770194d86515563ad82af62a` | 559,173,632 |
| C21-search | `975879891b7fc874948849364091265573740ff76a31fca601f9ae2879cd42e9` | 5,242,867,712 |
| C21-qualify | `f26698ee88346399ec71483f9524e1a8204436479beafeb72709f0805219572e` | 559,644,672 |
| C24-search | `9753f97bad5be7471c49b2e5cefc989d8c6268d2b37ddb2fb77bcadaa55e5ac9` | 4,389,294,080 |
| C24-qualify | `f8f46e0d12f824cd9a39a97db6724cf72c0aa90450f085384b8856d6be74e792` | 560,455,680 |
| the 6 others (repro, interval, validation) | `archives-before.sha256` | — (not read) |

**Copies and removals.** Every copy and removal is in `archive-actions.jsonl`.
- **Copies.** Each copy (`.cache/vg-l0-risk-envelope-stage-b-diagnostics/jobs/<job>/`) had sha256 = baseline and
  `PRAGMA integrity_check` = `ok`.
- **Removals.** Each was made only after its census or replay had verified, and only after the original had been
  re-hashed:
  - C19-search at 07:50:02Z;
  - C21-search at 08:00:28Z;
  - C24-search at 08:03:51Z;
  - the three qualify copies at 08:04:40–41Z.
- **Removed in all:** 6 archive copies (16.45 GB) plus their lock, progress and run files. Nothing else was removed.
- **Kept:** the derived intermediates, git-ignored, ≈ 78 MB:

| Intermediate (`.cache/vg-l0-risk-envelope-stage-b-diagnostics/`) | sha256 |
|---|---|
| population-C19.json.gz | `d99957adf022dc82aed0bfcad36521bb7d3d37aa169615c485b8f8f62857ca57` |
| population-C21.json.gz | `68b508d5999649c8d85a65457a32582bedf06f9f01c837718306d47f8e123905` |
| population-C24.json.gz | `9fb37c6283cd8f1d6ffe6af79d7a0464189e41c343f46cd2bd461ab71128c99e` |
| qualification-C19.json.gz | `4e72e7e34211c2f88804c976a7c1eaa16b5b1c5194454ccdcd043375ad0a231f` |
| qualification-C21.json.gz | `e27778b6c13d413035879cf5ee7401be1f6d4df0a6a5f564f12847fe6b9e2fe9` |
| qualification-C24.json.gz | `97961c2aa1d773e92f632ec4047301c1aa05d5daa07a43062bff561637fe6ce8` |
| giveback-C19.json.gz | `95b8a3c83df84f34058993c0fd5e725617196c9e36e340d330167f51342c0024` |
| giveback-C21.json.gz | `5da8c0647aec80a063ce61b054d02e807e44fe036a62b32f9a1dd40d0a82d5c6` |
| giveback-C24.json.gz | `49731a0de89017794f2c27c15d91ed9ee1b328335a54184a626d2c5fc7083158` |

**Stage B's sealed records.** The 22 sealed files of `results/seals.jsonl` were checked at 07:53:31Z
(`stage-b-seals-during.txt`): 22 / 22 sha256 equal and mode 0444. The repository-wide seal check (§5) also passes.

## 2. Census replay against the sealed search (zero evaluations)

| | C19 | C21 | C24 |
|---|---:|---:|---:|
| Replayed lanes identical to the sealed `LaneResult` (store encoding) | 64 / 64 | 64 / 64 | 64 / 64 |
| Replayed requested = sealed `requestedByArm`, CTRL / EXP-30 | 571,767 / 596,373 | 602,894 / 581,227 | 458,526 / 518,904 |
| Captured requests: screen + centre + neighbours = sealed, per arm | yes | yes | yes |
| Archive rows at open = at close | 1,120,604 | 1,142,375 | 948,677 |
| **Fresh evaluations** | **0** | **0** | **0** |
| **Refusing-pool calls** (any would have failed the replay) | **0** | **0** | **0** |
| Neighbourhood reads (regenerated; hits only) | 1,025,280 | 1,047,200 | 845,344 |
| Recomputed own-arm violation = search violation, for every fitting arm | all | all | all |
| Original archive sha256 at the end = baseline | yes | yes | yes |
| Census seconds | 527 | 538 | 469 |

**Cross-checks against Stage B's sealed figures** (reproduced exactly):
- screen plausibility, CTRL / EXP-30: 3,955 / 4,456, 1,702 / 2,522 and 244 / 390;
- the representatives' confirmation breach counts above $35k: 213 / 434, 276 / 1,085 and 403 / 1,621;
- the paired confirmation-p90 DD and BD differences: +$2,186 / +$531, +$4,562 / +$2,325 and +$3,568 / +$1,076.

## 3. Qualification replay against the sealed qualification (zero evaluations)

| | C19 | C21 | C24 |
|---|---:|---:|---:|
| Members | 194 | 194 | 194 |
| Replayed evidence = sealed evidence (`sealedEvidence`, store encoding) | yes | yes | yes |
| Requested = sealed requested | 126,682 | 126,682 | 126,682 |
| Pooled confirmation and selection statistics from the re-read draws = sealed | yes | yes | yes |
| Fresh / pool calls | 0 / 0 | 0 / 0 | 0 / 0 |

## 4. CPU / GPU parity of the giveback replays (non-official CPU, purpose `diagnostic`)

| | C19 | C21 | C24 |
|---|---:|---:|---:|
| Subjects | 67 | 66 | 66 |
| To the cent: net, DD and four envelope values vs the sealed GPU qualification evidence | 67 / 67 | 66 / 66 | 66 / 66 |
| Bit for bit: the canonical record + CPU envelope vs the archived official GPU centre record | 67 / 67 | 66 / 66 | 66 / 66 |
| Ledger path DD vs engine DD (≤ 1e-6 relative, identical instants) | 67 / 67, max gap $1.5e-11 | 66 / 66, $1.5e-11 | 66 / 66, $5.8e-11 |
| D3 identity U + E + F = path DD (residual < 1e-6) | all | all | all |
| Bound U ≥ DD − BD_marked (to two cents; D4) | 67 / 67 | 66 / 66 | 66 / 66 |

**CPU engine runs.**
- 597 in the successful runs: 199 subjects × 3, namely `diagnose`, `evaluate` and the ledger replay.
- Plus 201 in the stopped first C19 attempt (D3).
- **798 in total.** The plan said 630 (O3).
- **GPU evaluations: 0.** No GPU process was started. The official binary, the GPU evaluation code, the pins and
  `config/gpu-backend/acceptance.json` (sha256 `bb0e3fcf…`) are unchanged.

**Door openings.** The doors were opened through Stage B's own guard (use `diagnostic`) and logged in this namespace's
`results/doors.jsonl`: D19 × 16 (8 workers × 2 runs), D21 × 8, D24 × 8. D23 and FULL were never opened.

**Runtime.** Every evaluating or replaying process ran `node --no-maglev` with `GPU_POLICY_PURPOSE=diagnostic`, through
`src/gpu-backend/legacyRunner.ts`. Each ran as a transient systemd user unit in `vgl0rebd.slice` (44G / 48G /
swap 0). The peak unit memory was 21.9 GB, the C24 giveback with 8 workers.

## 5. Tests and nonregression (`chains/regression.sh`, 08:07:16–08:11:56Z, tree `d7f24591`)

| Check | Result |
|---|---|
| Diagnostic tool tests (`tools/…/tests/tools.test.ts`) | 7 / 7. They cover the D1 large-file hash; D2 encoding; the refusing pool failing closed with 0 fresh; the archive refusing another code digest; tampered-copy refusal; the bound on 2,000 random paths; no D23 / FULL |
| Stage B tests | 41 / 41 |
| `npm test` (full) | 1,805 tests: 1,794 pass, **7 fail**, 4 skipped. The 7 failures are **exactly the same set, by name**, as Stage B's final regression: the known pre-existing `allin-original.ts` ×6 and Study 7's data end ×1. There is no new failure |
| Study preflights (`--all`) | 28 / 28 PASS (Stage B's 27 + this namespace) |
| Sealed-file check (`tools/gpu-phase5/seal-protect.ts --check`) | 1,095 sealed files, 1,041 protected, **0 content differences**. The 11 absent and 43 untracked are the same git-ignored caches of older studies as before |
| Integrity diff vs Stage B's `1c1f9e72` outside the two new namespaces | **empty**: no file in `src/`, `apps/`, `config/`, `docs/`, `.gitignore`, `package.json` or any other study changed |
| GPU acceptance (`tools/gpu-backend/verify-acceptance.sh --expect-record-sha256 bb0e3fcf…`) | VERIFIED: pinned files committed and unchanged, binary `gb7` sha256. There was no rebuild and no device job |
| Strategy Lab portfolio parity | ALL VERIFIED: the five frozen pooled candidates, including New L0 |
| Strategy Lab state / live `dist` | fingerprint identical before and after; 0 `dist` files newer |

Strategy Lab's typecheck, lint, Vitest, build and Playwright were **not rerun**. No file under `apps/` or `src/`
changed; the integrity diff is empty. Stage B's final regression (81 / 81 Playwright) stands for the identical
application tree.

## 6. Incidents and corrections (AMENDMENTS.md)

- **D1.** Stage B's `census.ts` hashes archives with `readFileSync`, which Node refuses above 2 GiB. Fixed with a
  streaming hash; regression test.
- **D2.** `census.ts` compared lanes after a `JSON.stringify` round trip, which turns the sealed `"__Inf"` strings into
  `null` (30 of 64 C19 lanes affected). Fixed by comparing in the store's encoding; regression test.
- **D3.** My new path check was stricter than the repository's established 1e-6 reconciliation. The C19 giveback was
  stopped before writing anything, aligned with the established rule, and rerun. The financial parity had been clean.
- **D4.** The two-cent tolerance on the bound check (cent rounding).
- **O1, O2, O3.** Output locations and the added capture; two search copies at once; the CPU replay count.
