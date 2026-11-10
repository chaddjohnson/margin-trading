# RESEARCH RECOVERY — Priority 4A: standalone GDX Growth optimization (`gdx-growth-standalone`)

## Top screen

- **Updated:** 2026-11-10T17:45Z (UTC). **Status: INCOMPLETE — protocol written, pilot done; freezing now.** No
  search, qualification, fold or validation result exists. No process is running.
- **Brief:** `brief/BRIEF.md` sha256 `b7a784210452f59bf30622f68ca48be86bb75edeaa8d8bd1bd371a3f5cfcbac6` (read in full).
- **Standard:** 2.0.0 (`2005a88c…0105`, the registered current version). `PROTOCOL.md`, `AMENDMENTS.md`,
  `STANDARD_ADOPTION.json`: being written.
- **Sealed so far** (`results/seals.jsonl`, 2 entries):
  - `CONTROL_MANIFEST.json` `f59ca6f695b4770a4eca876bfdf9202aa9ee3a931a3cacfadb627f4c0a5ee912` (17:07:19Z): Appendix A,
    P01–P13 (prior rule), cash.
  - `results/parity/parity.json` `051069cf5c2454dba6a60d761225966e19a3a046a05d1c8a004b73459453b3ea` (17:08:50Z):
    294 checks, 0 failed (unit `gdxg-parity`, 70 s, peak 4.2 GiB).
- **Pilot and bench done** (`results/pilot/PILOT.md`): 12 workers, GC every 256; interruption tests identical;
  duplicate-key test pass; amendments R1 (pilot fixes) and R2 (resource contract). Preflight PASS (protocol
  `d8fd3a83…`, re-adopted 17:43:12Z).
- **Next step:** commit the pre-freeze work; `npm run gdxg -- freeze-protocol`; commit the freeze; launch the study chain
  as unit `gdxg-chain` (outside the slice): `systemd-run --user --unit=gdxg-chain --collect -p KillMode=mixed
  --working-directory=/home/chad/projects/margin-trading -p StandardOutput=append:<results/logs/study-chain.log> -p
  StandardError=append:<same> /bin/bash research/gdx-growth-standalone/chains/study.sh`.

## Environment

- Repository root `/home/chad/projects/margin-trading` (main checkout, no worktree). Branch
  `research/gdx-growth-standalone` from `b7ebfdc6` (pushed end of 3C). Uncommitted: `src/gdx-growth-standalone/`,
  `research/gdx-growth-standalone/`, `package.json` (`gdxg` script) — all this task's.
- Node v24.21.0. Host 16 threads, 59 GiB; other slices all 0 tasks (checked 17:06Z); mongod and a vLLM server outside.
- Code `src/gdx-growth-standalone/` (`npm run gdxg -- <command>`), adapted from 3C's verified modules; Priority 3's
  engine unchanged (digest `147cad7c…4e88`, E1).

## Decisions (to be frozen in the protocol)

- One arm S (Growth·GDX alone, all other books disabled); cash = GDX OFF reference.
- Independent lane at C19/C21/C23/C24: cells rise and breakout, each screen 4,096 + 4 × 1,024 islands (base 16,384 per
  cutoff), cap 12 islands per cell (32,768). Strata: gate × trend × (Rise) elig × hold × istop × retain (64 / 32).
- Informed lane at C24 only: Appendix A + P01–P13 as seeds (8 fine, 16 near, 16 broad designs each), islands absorb
  the remainder of 8,192; extensions of 1,024 up to 16,384; Appendix A refined directly.
- Gates Q1–Q5; primary = actual-profit of the C24 selectable set (independent + informed shortlists + Appendix A +
  P01–P13); independent primary separately; folds C19/C21/C23 independent only, Appendix A descriptive.
- Known before the protocol (engineering gates, development D24 centres of the controls): Appendix A $53,816.50 /
  $17,709.96 / 13 lots; P07 $126,406.73; P08 $121,008.75; P09 $100,056.17; P13 $55,345.40; others $6.8k–$34.9k.

## Disclosures so far

- **Door incident (minor):** the endpoint check (2026-11-10T17:07Z) printed the last two minute rows of the canonical
  GDX and VGT files (timestamps and one price bar each); no strategy result. The endpoint 2026-10-30 is the dataset
  report's `lastTimestamp` (sha256 = Priority 3's pin).

## Guards

- Never modify completed studies' code or records. Pilot jobs carry `--pilot NAME` (job names `pilot-NAME-…`).
- FULL stays closed until `FROZEN_SELECTION.json` is sealed and committed (guard in `doors.ts`).
- Do not rerun the control manifest or the parity gates (sealed).
