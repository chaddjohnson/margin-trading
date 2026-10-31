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
