# Study 7 — amendments and disclosures (append-only)

PROTOCOL.md is frozen (sha256 `6590ecfeca3be67fe7ce3051debdcc72953593fdba68504c52330e75b2a93581`, 2026-10-31T23:42:49Z) and
never edited. Each entry below states its UTC time, kind (amendment = a rule change; disclosure = an incident or a
fact the report must mention, no rule change), reason and exposure. Format note: each entry records the sha256 of this
file **before** the entry was appended (a hash chain; a hash of the file after the entry cannot sit inside it).

## E1 — 2026-10-31T23:45Z — disclosure (no rule change)

- **Chain:** first entry (no earlier content).
- **What:** the first `npm run study7 -- parity` (started 23:43:2xZ) crashed in the P5 registry check before writing any record:
  the code read `phenotypes[role].params`, but the registry files use `parameters`. P1 (74 comparisons, 0
  differences), P2, P3 and P4 had passed in that run (log `results/runlogs/parity-attempt1-crash.txt`). The field
  name was fixed in `src/study7-stability-first-d1/parity.ts` and the stage re-run from the start (it writes its
  sealed record only at the end; nothing had been sealed).
- **Code after the freeze:** `parity.ts` (this fix) and the new tooling module `poolrun.ts` (research-config export and
  the research-pool runner, adapted from Study 6's; it decides no result). Every later post-freeze code change is
  listed here with its module hash in the final integrity report.
- **Exposure:** none (parity reads only the frozen configurations and known anchors).

## E2 — 2026-11-01T01:46Z — disclosures (no rule change)

- **Chain:** sha256 of this file before this entry: `a5dd0769b0ad063d465096346c9ac2a2f68d18f50c6b9cee7e79b04de6a552a9`.
- **Partial 2026 on the final door.** The evaluator labels a period the run covers only partly as `<key>~partial`
  (PROTOCOL.md §10.2). On the final door this made calendar year 2026 (to 2026-10-29) `2026~partial`. The best-year
  computation (F4) and the leave-one-year-out table therefore skipped 2026. Recomputed with 2026 included, from the
  sealed final records: 2020 is the best year of every role holder; the 2026 year-to-date attributions are smaller
  (−$2,907 to +$31,894); **no F1–F4 flag changes**. The reports use the `2026~partial` figure wherever 2026 is shown.
  No other window is affected (every pre-final door ends on a complete calendar year).
- **Code after the freeze** (all after the parity fix of E1; none changes a rule, a seed or a result):
  - `commands.ts`: registered `research-configs` and `pool`;
  - `poolrun.ts`: research-pool runner and configuration export, adapted from Study 6;
  - `scripts/build_tables.py` and `scripts/run_jobs.sh`: report tables and the job orchestrator, outside the code
    digest.
  The modules that produced sealed records are unchanged since the parity stage. Their hashes at the end are listed in
  `EXECUTION_AND_INTEGRITY.md`.
- **Sequence of stages (UTC):**
  - parity 23:45–23:50Z;
  - Phase A 23:50–23:54Z, sealed and committed as `e6aebab`;
  - Phase B 23:54–01:14Z;
  - V trigger evaluated 00:46Z: not fired;
  - Phase D 01:14–01:24Z;
  - selection freeze 01:24:05Z;
  - final 01:24–01:35Z and `--confirm` 01:35–01:45Z, identical;
  - research configurations 01:45Z.
- **Phase A reading embargo:** respected. The first Phase A figures read by the analyst were the tables built after
  the selection freeze (01:24Z).
- **Exposure:** none of these items changes what was selected or how. The 2024–2026 window was opened only by the final
  door, as the protocol states, and by one research-pool run of nominee #1 afterwards (`results/runlogs/pool-S7-VG-L-19.txt`,
  equal to the final record).
