# Priority 4 — reproducibility and recovery

Written analysis only. This file covers the environment, what is versioned and what is not, how to verify the sealed
records, the exact commands of every stage (official and report-only) and how to recover an interrupted run. The frozen
command list is `RUN_COMMANDS.md` (pinned in the protocol freeze). The commands added after the freeze, all report-only,
are listed in §4 below. The live state of the task is in `RESEARCH_RECOVERY.md`.

## 1. Environment

| Item | Value |
|---|---|
| Repository / branch | main checkout `/home/chad/projects/margin-trading`, branch `research/vg-l0-staged-trailing-stop` (no extra worktree) |
| Branch base | `5d587bb28860967327a9f1b1263154b26f144e8c` (`research/vg-l0-trailing-stop-audit`); `main` untouched (`3606f4b3`) |
| Node | 24.21.0 (`.node-version`); every evaluating process runs `node --no-maglev` (enforced by `src/gpu-backend/runtime.ts`) |
| GPU | NVIDIA GeForce RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, compute capability 12.0 |
| CUDA | user-space toolkit 13.2.2, `--fmad=false`, reproducible stripped build |
| GPU binary | `research/gpu-phase8/build/gb8` sha256 `86b30753813ba1cfbf53acb917405fadacfb4915b7c64357329bff28cf8428d3` (protocol v3, capability bits 36/37 = staged stop) |
| Acceptance record | `config/gpu-backend/acceptance.json` sha256 `c02a8a928946b5acc4df61a7fceb3e5656bf6d12ee33749d615edc7c54fad126`, ACCEPTED 2026-11-23T18:03:20Z (GPU Phase 8; this branch only; supersedes Phase 7's `bb0e3fcf…` here) |
| Out-of-band pin | `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase8-c02a8a92.json` (mode 0444) + a `pins.jsonl` line |
| Study code digest | `431493ded7292705cd45d7be5d83b5d5f98d9b111dd8e00935e1fdff3c7b9eb1` (import closure of `src/vg-l0-staged-stop/main.ts`; recorded in every sealed record) |
| Protocol | `PROTOCOL.md` sha256 `bd57ea2a476be9735e3f199749e511d184f247b9c903dd5853e847899de8b6f7`, frozen 2026-11-23T18:17:12Z (`results/protocol-freeze.json`) |
| Containment | every official stage runs as its own `systemd-run --user` unit (`tools/vg-l0-staged-stop/launch.sh`; MemoryHigh 44G / MemoryMax 48G) |

## 2. What is versioned and what is not

- **Versioned (git):** the protocol, amendments, adoption, rule specification, run commands, the brief copy; every sealed
  record under `results/` (`seals.jsonl` lists each with its sha256), the door log `results/doors.jsonl`, the job records
  `results/jobs/`, the GPU attestations `results/gpu-attestations/`, the engineering gates `results/engineering/`, the
  stage logs `results/logs/`; the reports, tables and report-only diagnostics under `reports/`; the code
  (`src/vg-l0-staged-stop/`, `src/staged-stop/`, the engine and CUDA changes) and tools (`tools/vg-l0-staged-stop/`).
- **Not versioned:** market data (`data/<SYMBOL>/`, git-ignored; the doors pin each file's sha256 — `results/doors.jsonl`
  and `src/vg-d1-growth-joint/context.ts`), the evaluation caches and job archives (`research/vg-l0-staged-stop/cache/`,
  git-ignored), the GPU binary (rebuilt reproducibly by `tools/gpu-backend/verify-acceptance.sh --rebuild`). None of these
  was erased.

## 3. Verifying the sealed records

```bash
cd /home/chad/projects/margin-trading
# every sealed record against the seal log
node -e 'const fs=require("fs"),c=require("crypto");for(const l of fs.readFileSync("research/vg-l0-staged-stop/results/seals.jsonl","utf8").trim().split("\n")){const s=JSON.parse(l);const f=s.file.startsWith("research/")?s.file:"research/vg-l0-staged-stop/"+s.file;const h=c.createHash("sha256").update(fs.readFileSync(f)).digest("hex");console.log(h===s.sha256?"OK  ":"BAD ",s.file)}'
# the acceptance record (rebuild the binary, re-run the device smoke, compare the record hash)
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 c02a8a928946b5acc4df61a7fceb3e5656bf6d12ee33749d615edc7c54fad126
# the study's preflight (standard adoption, protocol hash, acceptance)
npm run research-preflight -- --study research/vg-l0-staged-stop
```

A sealed record is write-once: its stage refuses to run again (`… exists: … is sealed`). Gate R (each fold) proves the
search is deterministic: CTRL lanes R3–R18 reproduced Stage B's sealed lanes exactly, envelopes included.

## 4. Commands

The official stages and the engineering gates: `RUN_COMMANDS.md` §1–§3 (unchanged). The report-only analyses added after
the freeze (purpose `diagnostic`, CPU reference, never official evidence; each reads only doors that `doors.ts` allows for
diagnostics):

```bash
cd /home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
D=research/vg-l0-staged-stop/reports/diagnostics; T=research/vg-l0-staged-stop/reports/tables
# report tables from the sealed records (no evaluation)
GPU_POLICY_PURPOSE=diagnostic npm run vg-l0ss-tools -- analyze
# declared pair sets and their trade-by-trade CPU replays
GPU_POLICY_PURPOSE=diagnostic npm run -s vg-l0ss-tools -- pairs ablation --out $D/pairs-ablation.json
GPU_POLICY_PURPOSE=diagnostic npm run -s vg-l0ss-tools -- diagnose --spec $D/pairs-ablation.json --door D24 --out $D/ablation-D24.json
for C in C19:D19 C21:D21 C24:D24; do GPU_POLICY_PURPOSE=diagnostic npm run -s vg-l0ss-tools -- pairs selection --cutoff ${C%:*} --out $D/pairs-selection-${C%:*}.json
  GPU_POLICY_PURPOSE=diagnostic npm run -s vg-l0ss-tools -- diagnose --spec $D/pairs-selection-${C%:*}.json --door ${C#*:} --out $D/selection-${C%:*}-${C#*:}.json; done
GPU_POLICY_PURPOSE=diagnostic npm run -s vg-l0ss-tools -- pairs decomposition --out $D/pairs-decomposition.json
GPU_POLICY_PURPOSE=diagnostic npm run -s vg-l0ss-tools -- diagnose --spec $D/pairs-decomposition.json --door D24 --out $D/decomposition-D24.json
GPU_POLICY_PURPOSE=diagnostic npm run -s vg-l0ss-tools -- diagnose --spec $D/pairs-decomposition.json --door FULL --out $D/decomposition-FULL.json
# mechanism tables from a diagnose output
$N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-staged-stop/mechanism.ts --in $D/ablation-D24.json --out $T/ablation-mechanism.md
$N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-staged-stop/mechanism.ts --in $D/selection-C21-D21.json --out $T/selection-C21-mechanism.md --group none
# lot-level risk diagnostics of the frozen subjects of an interval / validation record
for R in C19:D21 C21:D23 C24:FULL; do GPU_POLICY_PURPOSE=diagnostic $N --no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288 \
  src/gpu-backend/legacyRunner.ts vg-l0ss-lots tools/vg-l0-staged-stop/lots.ts --record ${R%:*} --door ${R#*:} --out $D/lots-${R%:*}-${R#*:}.json --md $T/lots-${R%:*}-${R#*:}.md; done
# the handoff ZIP (verified: zip -T, every checksum after extraction, a secrets scan, no data / archive / binary)
tools/vg-l0-staged-stop/bundle.sh /tmp/claude-1000/vgl0ss-bundle && cp /tmp/claude-1000/vgl0ss-bundle/vg-l0-staged-trailing-stop-priority4.zip ~/.local/share/margin-trading-gpu/handoffs/
```

The CPU diagnostics reproduce the sealed official GPU figures where they overlap (`lots.ts` checks each subject's
whole-run net and marked DD against the sealed record: every subject matched to the cent).

## 5. Recovery

- The authoritative checkpoint is `RESEARCH_RECOVERY.md` (top screen: stage, running units, next command). The protocol,
  amendments and sealed records outrank it.
- Each fold chain (`chains/fold.sh`) is fail-fast and commits each sealed block before the next step. After a failure:
  `START=<step>` (and `RESUME=1` for an interrupted job, which resumes from its job archive under `cache/`); a sealed
  stage never reruns. Example: `tools/vg-l0-staged-stop/launch.sh vgl0ss-fold-C24 <abs log> -- /usr/bin/env CUT=C24 START=qualify RESUME=1 /bin/bash research/vg-l0-staged-stop/chains/fold.sh`.
- Doors: every opening is logged in `results/doors.jsonl`; FULL opened once for the official validation, afterwards only
  for the report-only diagnostics of the same frozen subjects.
- Never edit a pinned file (the protocol documents, `RUN_COMMANDS.md`, `chains/fold.sh`, `launch.sh`, the pinned tools,
  the code closure) and never commit while a chain runs (it commits `results/` itself).
