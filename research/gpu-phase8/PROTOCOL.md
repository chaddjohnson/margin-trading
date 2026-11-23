# GPU Phase 8 — acceptance of the staged-stop delivery (protocol v3), PROTOCOL 1.0.0

Status: **FROZEN** at the commit that adds it (before the campaign `chains/final.sh` runs). **Standard:** 3.0.0
(`docs/research/OPTIMIZATION_STANDARD.md`, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1`),
scope **diagnostic** (engineering acceptance; adaptations AD1, AD2, AD4–AD6, AD8 as in GPU Phase 7, `STANDARD_ADOPTION.json`). Engineering acceptance study
for Priority 4 (`research/vg-l0-staged-stop/`), gates E2–E4 of that brief. Research only: nothing here is official
optimization evidence, nothing is selected, nothing is merged into `main`, nothing is deployed.

## 1. Scope and authority

- **Authority:** the user's Priority 4 brief (`research/vg-l0-staged-stop/brief/BRIEF.md`, sha256 `720e0b36…`) §3–§4:
  the S1 staged trailing stop must receive an actual, equivalent CUDA implementation and a full renewed acceptance cycle
  before any official staged evaluation; standard 3.0.0 §9; `docs/gpu/PARITY_CHECKLIST.md` §2 (a full cycle, not §2a).
- **The change** (`research/vg-l0-staged-stop/RULE_SPECIFICATION.md`, frozen at `3aa51963`): the CPU closure gains
  `src/staged-stop/` (rule, configuration, tracker), `src/d1-risk-controls-rc3/` (the RC 3 D1 book and the staged pooled
  runner), the Growth engine revision 1.5.0 option (`src/growth-trading/riseTrading.ts`, `optionalRules.ts`; Strategy
  Lab's schema unchanged at 1.4.0) and the book pass-through in `src/vg-d1-growth-joint/books.ts`; the CUDA sources gain
  protocol v3 (`gb.h` layouts, capability bits 36/37) and one shared device rule (`gb_common.cuh`) called at the D1 fill
  and after-session ratchet (`gb_d1.cuh`) and in `gOnEntry`, the Growth exit events and after-session ratchet
  (`gb_growth.cuh`); the host group changes the codec (`batch.ts`, `encode.ts`, `layout.ts`), the manifest (`compat.ts`:
  the staged runner as a CPU entry) and the default binary (`toolchain.ts`: `research/gpu-phase8/build/gb8`); the
  enforcement group changes the Lab (`lab.ts`: the staged key suffix and task field), the domain (`domain.ts`:
  `stagedStopDomain`), the official gate's parity mini-set (`official.ts`: four staged subjects; the CPU side through the
  staged runners, which are the existing runners when OFF) and the entrypoint registry (`gpu-phase8` non-official).
- **Previous record:** `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf…` (GPU Phase 7, ACCEPTED, binary gb7
  `cb2ff30b…`, protocol v2). It is STALE from the first evaluation-manifest edit (`bb1b51f2`) until this study's generator
  writes a new record.

## 2. Gates (every one must pass; `tools/gpu-phase8/accept.ts` checks each against its evidence file)

| Gate | Requirement |
|---|---|
| S0–S2 | the superseded record is Phase 7's (out-of-repository sha256); the change is exactly the declared file set; carried evidence only where its files are unchanged (Phase 5 A10 atomic dataset export; Phase 6 E2 job isolation) |
| A0 | every evidence process ran with `--no-maglev` |
| B1 | the final binary gb8 (protocol v3) is reproducible and built from the committed tree with its evaluation digest |
| A1 | the parity campaign (`chains/parity.sh`): every door and window, every option set, the adversarial fixtures S0–S7, the six exact-threshold fixtures T (`src/gpu-phase8/stagedFixtures.ts`: a session high exactly at e·(1 + A) and one ulp below, arming on the entry session, a placement exit, a later gap, an interest lapse), ≥ 100,000 seeded random genomes with staged ON/OFF strata (≥ 50,000 subjects with some book ON, ≥ 20,000 OFF), staged exits and placement exits occurring, determinism across batch sizes, host-worker counts and input order — **zero mismatches** in books (trade by trade), pooled replays, records (compact and detailed, staged counters included) and risk envelopes |
| A2, R1–R3 | Assignment 3's sealed finalists = GPU = sealed figures; the risk-delivery parity (Phase 7's threshold-edge subjects, read-only) |
| A3 | sealed optimizer replays on the final binary: Assignment 3 C19 broad1 (plain and with the envelope), Assignment 2 C19 base, and one Stage B CTRL lane per cutoff (C19 GA0.VA0 R3, C21 GB0.VD1 R10, C24 GA0.VA0 R17) replayed by Priority 4's derived lane with the CTRL arm — identical to the sealed lanes, envelopes included (OFF parity at the search level) |
| A4 | fixed-seed mini-optimization: Phase 7's Assignment 3 set (CPU = GPU, host workers 0/1/8, stop + resume, SIGKILL + resume, envelope requested, two jobs at once) and Priority 4's staged set (both arms on the mini schedule: CPU = GPU, host workers 1 = 8, stop + resume, SIGKILL + resume, two jobs at once) |
| Q1 | qualification and ranking parity on the staged mini archives (every evaluation carries its envelope) |
| A5 | compute-sanitizer memcheck / racecheck / initcheck / synccheck: 0 errors, staged ON included |
| A6 | the bounded reliability run (two processes × 32 minutes; staged strata in every round) |
| E3 | the negative suite on the final pinned files, with a `staged` group: the previous (v2) server refuses a v3 batch; the official gate refuses the staged domain on the previous server; a staged task outside the attested domain is withheld; invalid staged configurations (early lock, not tighter, Growth·GDX, non-integer, empty) are refused before the device; a positive control |
| E4 | the source-tamper suite in a sandbox clone |
| E7–E10 | `chains/tests.sh`: `npm test` (known failures only), root `tsc`, ESLint, Strategy Lab (typecheck, lint, Vitest, build, Playwright, portfolio parity of the five frozen pooled candidates), integrity of historical research |
| P1, P5 | policy text unchanged; policy, enforcement, layout, host-pipeline, dataset, jobs, risk-envelope and staged-stop tests |

## 3. Data and door discipline

- Doors through `src/gpu-phase8/context.ts` (Priority 3's verified prefix doors and FULL; this study's own
  `results/doors.jsonl`). Engineering only: outcomes are compared CPU against GPU, never inspected for profitability.
- **No staged outcome of a comparator on 2025–2026:** on FULL-based doors (FULL, `E-2025`) the reference identities (New
  L0, N/original, IJ1, C4, C4-refined) run with the stage OFF only; staged strata apply to random genomes there.
- The official gate's parity mini-set (`official.ts`) evaluates four fixed staged subjects on the study door of each
  official job; it is an equality check, never reported as an outcome.

## 4. Resources and procedure

- Contained units in `gpup8.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0); one GPU campaign at a time; every Node
  process `node --no-maglev`; START=<n> resumes the chain; a failed step stops the chain (fail-fast).
- Sequence: commit the tree → `chains/final.sh` (B1 … A6) → commit the final study code of Priority 4 → `chains/tests.sh`
  (E7–E10) → `tools/gpu-phase8/accept.ts` (writes `config/gpu-backend/acceptance.json` only if every gate passes) →
  `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 <sha>` → the record-in-force tests →
  the live official preflight on Priority 4's doors → commit; the record's sha256 is kept outside the repository
  (`~/.local/share/margin-trading-gpu/acceptance-pins/`) as the out-of-band pin.
- Failures are kept; a fix after a failure is recorded in `AMENDMENTS.md` and the affected gates rerun.
