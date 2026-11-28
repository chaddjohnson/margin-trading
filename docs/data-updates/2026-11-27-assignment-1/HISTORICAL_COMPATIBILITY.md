# Historical research reproducibility after the VGT/GDX append (Assignment 1 §6)

**Summary.**
- **Every historical input is intact and recoverable exactly.** An append leaves each earlier canonical file as a byte
  prefix of today's file. All 8 recorded vintages verify as such prefixes; a new test checks this whenever the data
  are present.
- **No completed study was restored to HEAD.** Each affected study checks the whole file inside code that its own
  sealed freeze guard pins, or that guard already fails at HEAD for unrelated code drift. Editing that code would break
  or bypass the guard, which §6.2 rules out, so none was edited.
- **A general, temporary, verified reproduction mechanism now exists:** `tools/historical-repro/env.ts`. It rebuilds
  the exact historical file from the verified prefix in a detached worktree at the study's own commit, outside the
  repository.
- **Verified on two affected studies:**
  - **vg-l0-full-joint** at `67b4ae71`: door check PASS, 47 of 47 sealed records verify.
  - **Priority 2** (`vgt-d1-growth-joint`) at `47422d04`: doors rebuilt and verified, and `doors-pins.json` regenerated
    byte-identical to the committed record.
- **Observed at HEAD:** both studies fail closed, write nothing, and name the changed file.

Survey notes with file and line references: `evidence/whole-file-inventory-survey.md`. "Observed" means a command was
run; "inferred" means the conclusion was read from source.

## 1. How the original input is obtained and verified

1. The canonical files only grow by `npm run datasets -- append`, which proves the old file is an exact byte prefix of
   the new one and records the new vintage in `config/market-data/vintages.json`.
2. A study's whole-file pin (sha256 of the file it read) is therefore one of the recorded vintages: its `bytes`-long
   prefix of today's file hashes to that sha256 (`src/lib/canonicalPrefix.ts` `historicalPin`, `verifyBytePin`).
3. `tools/historical-repro/env.ts prepare` takes the study's commit and its pins and builds a temporary environment:
   - it resolves each pin to a verified prefix, and refuses anything else;
   - it creates a detached worktree **outside the repository**;
   - it writes `data/<SYM>/data.csv` there as exactly those bytes, re-hashes the copy and makes it read-only;
   - it copies git-ignored inputs the study needs (for example its prefix-door cache), re-hashing every file;
   - it restores the read-only mode of each sealed record whose sha256 matches its seal log (git does not keep file
     modes), and lists any absent sealed caches;
   - it links `node_modules` and records everything in `REPRODUCTION.json`.
4. The study's own command runs unchanged inside that worktree: same code, same pins, same guards.
5. `tools/historical-repro/env.ts remove` deletes the worktree and the copies. No second canonical dataset remains.

```bash
# vg-l0-full-joint (Assignment 3) at its final commit: the canonical 2026-10-30 vintages, P3's door cache, its seals
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/historical-repro/env.ts prepare \
  --commit 67b4ae71 --dir /tmp/<scratch>/repro-vgl0fj \
  --data VGT=2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e \
  --data GDX=77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049 \
  --copy .cache/vg-d1-growth-joint/doors --seals research/vg-l0-full-joint/results/seals.jsonl
cd /tmp/<scratch>/repro-vgl0fj/tree
GPU_POLICY_PURPOSE=diagnostic npm run vg-l0fj -- doors     # PASS: canonical 2ee06310…/77dba9b2…, D19–D24 verified
GPU_POLICY_PURPOSE=diagnostic npm run vg-l0fj -- verify    # 47 sealed record(s) verify
cd - && node --experimental-transform-types --disable-warning=ExperimentalWarning tools/historical-repro/env.ts remove --dir /tmp/<scratch>/repro-vgl0fj

# Priority 2 (VGT-only) at its final commit
… prepare --commit 47422d04 --dir /tmp/<scratch>/repro-p2 \
  --data VGT=2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e \
  --copy .cache/vgt-d1-growth-joint/doors --seals research/vgt-d1-growth-joint/results/seals.jsonl
cd /tmp/<scratch>/repro-p2/tree && GPU_POLICY_PURPOSE=diagnostic npm run vgt-joint -- doors   # PASS; git status clean
```

The environment records are kept in `evidence/repro-vg-l0-full-joint-67b4ae71.environment.json` (with `.doors.json`)
and `evidence/repro-vgt-d1-growth-joint-47422d04.environment.json`. The `--dir` must be outside the repository, and
the tool refuses one inside it.

For a study pinned to an older vintage (2026-10-13 / 2026-10-29) the same command works with that vintage's sha256.
That holds as long as **every** symbol it reads is either unchanged or a registered vintage; see §3 for the symbols
for which this is not yet true.

## 2. Inventory: studies whose own code checks a whole canonical VGT/GDX file

| Study (all COMPLETE) | Check (location) | Pinned VGT / GDX vintage | In vintages.json | Shared loader? | Status at HEAD | Restorable at HEAD without breaking its own guard? | Reproduction |
|---|---|---|---|---|---|---|---|
| vg-l0-full-joint (A3) and 6 more Priority 3-family studies: c4-gdx-growth-partner, gdx-growth-standalone, vg-d1-growth-expanded, vg-l0-risk-families, vg-l0-shadow-eligibility, vg-lifecycle-matched-optimization | `src/<study>/doors.ts` `verifyDoors` (the `doors` subcommand); their FULL stages go through P3's door, which is fine | 2026-10-30: 2ee06310… / 77dba9b2… | yes | P3 doors | **FAILS** (observed for vg-l0-full-joint: "the canonical GDX file changed: aa23522d…") | No: `doors.ts` is in each study's frozen evaluation digest, and those digests already differ at HEAD (P3's `data.ts`/`context.ts` and `lib/{csv,evaluation}.ts` changed in 7a41ff0b) | **Verified** for vg-l0-full-joint at 67b4ae71; the others follow the same commands |
| vgt-d1-growth-joint (Priority 2) | `src/vgt-d1-growth-joint/data.ts` `buildDoors`, `openFullDoor` | 2026-10-30 VGT 2ee06310… | yes | loadDatasetSessions | **FAILS** (observed: "the canonical VGT file changed") | No: `data.ts` is in P2's `evaluationFiles`, whose digest still equals the frozen `c936f691…` (observed); an edit would break P2's `assertFrozenCode` and vgt-pair's `verifyP2Pins` | **Verified** at 47422d04 |
| vgt-d1-growth-separate-pooled | via P2's `openFullDoor` | as P2 | yes | via P2 | FAILS (inferred, downstream of P2) | No (pins P2's digest) | Its own commit, P2's pin |
| growth140-vgt-s8m, growth140-vgt-stable | `src/growth140-vgt-s8m/data.ts` FULL, `growth140-vgt-stable/data.ts` `buildDoors` | VGT 2ee06310… | yes | loadDatasetSessions | FAILS (inferred) | No: their `verifyPins` code guards already fail at HEAD (changed `lib/csv.ts`, `lib/evaluation.ts`) | Own commit, VGT 2ee06310… |
| intraday-d1-vgt | `src/intraday-d1/data.ts` validation door (own reader) | VGT 2ee06310… | yes | **own reader** | FAILS (inferred) | Not safely: its reader takes the last session in the file, so dropping the check without truncation would silently move its end to 2026-11-25 | Own commit, VGT 2ee06310… |
| vg-balanced-entry-eligibility (Priority 1) | `src/vg-balanced-entry-eligibility/data.ts` `verifyCanonical`, and `dataSha256` = pin | 2026-10-29 / 2026-10-30 | yes | `loadNUniverse` (no `pin` option) | FAILS (inferred) | No: its `evaluationFiles` are unchanged at HEAD and enforced (`validate.ts`) | Own commit with its pins |
| growth-etf-screening | `src/growth-etf-screening/doors.ts` FULL against sealed `DOORS.json` | VGT/GDX 2026-10-30 | yes | loadDatasetSessions | FAILS (inferred) | No: its frozen digest already differs at HEAD | Own commit (it reads 61 symbols: the other 59 must still match their pins) |
| gdx-d1-growth (P8) tooling | `tools/gdx-d1-growth/data.ts` `pins` | GDX 77dba9b2… | yes | own | FAILS (inferred: "exists with other content") | Possible, but its sealed outcome is complete and the tool is not needed to reproduce it; left unchanged | Own commit |
| optimization-process-audit | `src/optimization-process-audit/freeze.ts` `verifyData` | 2026-10-30 | yes | – | unreachable (it refuses "already frozen" first) | n/a | n/a |

**Already failing or skipping before this append, unrelated to it.** These are Studies 3–9, B4/B5 pools,
d1-robust/diverse/ranked-preemption/wide-library/signal-capital, Study 8 integrity, joint-16 and others.
- They pin the 2026-10-13 or 2026-10-29 VGT/GDX vintages, which are registered and verified.
- They also pin **other symbols (VOOG, XBI, XRT, KRE, …) whose current files match no pin and have no vintage
  record**.
- Those files were rewritten before 2026-11-27 (outside this work's append). The append changed nothing for these
  studies.
- They stay reproducible only if those other symbols' historical files are recovered from the legacy archive
  (`data/archive/legacy-research-inputs/`) or their own sealed copies. **Unresolved, not in this assignment's scope.**

## 3. The four required lists (§6.4)

| List | Studies |
|---|---|
| Reproducible at HEAD | Every study that reads VGT/GDX only through Priority 3's FULL/D19–D24 doors and has no code-digest guard over changed files: the sealed N/original and New L0 replays (`npm run manual-eval -- --window research`, = the sealed figures), Strategy Lab's six pooled candidates (parity verified), the Growth golden masters (`offParity*`, via `historicalPin`), the risk-metrics engine tests. |
| Restored to HEAD compatibility by this assignment | None by editing study code: every candidate's whole-file check sits in code its own freeze guard pins (or that guard already fails at HEAD). What this assignment adds at HEAD is the verified reconstruction tool, the vintage-registry test, and Strategy Lab's research window for N/original (its sealed figures and per-lot ledger, parity verified). |
| Intentionally requiring their original commit | The table in §2 (newly failing since 2026-11-27): the 7 Priority 3-family `doors` checks, Priority 2 and vgt-pair, growth140-s8m/stable, intraday-d1-vgt, vg-balanced, growth-etf-screening, gdx-d1-growth tooling. Procedure: §1 (verified on vg-l0-full-joint and Priority 2). |
| Unresolved reproduction issues | The pre-existing other-symbol pins of Studies 3–9 / B4–B5 / d1-* (their VOOG, XBI, XRT, KRE … files changed before 2026-11-27 and have no vintage record; see the survey notes). Their VGT/GDX parts are recoverable. |

## 4. Why the shared loaders were not changed again

- `src/lib/evaluation.ts` and Priority 3's doors already accept a `pin` and read only the verified prefix (previous
  assignment).
- The remaining checks are in study-private code, which is pinned by each study's own frozen evaluation digest.
- `loadNUniverse` / `multi-etf-allocator/dataset.ts` have no `pin`. Their whole-file hashes appear in about 25 studies'
  sealed records, and they read many symbols whose histories are not vintage-registered. Adding prefix support there
  would change frozen identities and help only studies whose other symbols are unrecoverable anyway (§2).
- No integrity check was weakened, no sealed manifest or result was touched, and no permanent copy of canonical data
  was created. The two reproduction environments existed only for the verification runs and were removed (`git
  worktree list` shows the main checkout only).

## 5. Dynamic-endpoint risks found (silent changes, not failures)

- **`data/partitions.json` `final`/`all` have no end.** An unpinned load without `endDate` reads VGT/GDX through
  2026-11-25 while other symbols stop at 2026-10-30.
  - Mixed universes fail closed on unequal session counts (inferred).
  - A VGT-only, GDX-only or VGT+GDX universe silently reaches the newest session.
  - Formal stages are protected (standard §1.12: `development`/`validation` access, doors, preflight). This affects
    only legacy manual runs.
- **Study 5's `final` door** has no end check. Its write-once seal refuses a rerun, but only after opening the door
  (inferred).
- **Strategy Lab Run Test dialog.** "All" ends at the newest local session.
  - Fixed in this assignment: the dialog now labels dates after 2026-10-30 as a manual post-validation evaluation.
  - The run view shows the evaluated dates, and a saved run's chart stops at the sessions it evaluated.
