#!/bin/bash
# gpu-phase5 (PROTOCOL.md §13; brief §6; adapted from tools/gpu-phase3/bundle.sh): the portable, self-contained handoff
# bundle research/gpu-phase5/bundle/gpu-phase5-final-handoff.zip — the seven reports (start with GPU_FINAL_HANDOFF.md),
# the study's brief/protocol/amendments/adoption/commands/checkpoint, the policy documents and the acceptance record
# (when one exists), the machine-readable evidence (results/ without raw-large/, logs/, ledger/ and the device
# responses), the unit logs of the campaign's steps (results/runlogs/, a copy of the git-ignored results/logs/ made
# before bundling), MANIFEST.json and CHECKSUMS.sha256 over every
# file. No market data, secrets, CUDA toolchain, binaries, caches or raw archives. Verification: zip -T, extraction
# into a scratch directory, sha256sum -c of every file, a forbidden-content scan.
#   tools/gpu-phase5/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
SCRATCH=${1:?scratch dir}
NAME=gpu-phase5-final-handoff
OUT=research/gpu-phase5/bundle/$NAME.zip
STAGE="$SCRATCH/$NAME"
REPORTS="GPU_FINAL_HANDOFF.md PARITY_ROOT_CAUSE.md ATOMIC_CACHE_AND_CONCURRENCY.md PERFORMANCE_AUDIT.md GPU_ACCEPTANCE_REPORT.md MERGE_AND_RESTORE.md PILOT_HANDOFF_ONLY.md"
rm -rf "$STAGE" && mkdir -p "$STAGE" research/gpu-phase5/bundle
copy() { mkdir -p "$STAGE/$(dirname "$1")" && cp "$1" "$STAGE/$1"; }
for f in $REPORTS PROTOCOL.md AMENDMENTS.md STANDARD_ADOPTION.json MANIFEST.json RUN_COMMANDS.md RESEARCH_RECOVERY.md brief/BRIEF.md; do
  [ -f "research/gpu-phase5/$f" ] && copy "research/gpu-phase5/$f"
done
for f in CLAUDE.md CONTRIBUTING.md .github/pull_request_template.md docs/research/OPTIMIZATION_STANDARD.md \
         docs/research/optimization-standard.versions.json docs/gpu/README.md docs/gpu/PARITY_CHECKLIST.md \
         docs/gpu/FEATURE_MATRIX.md config/gpu-backend/entrypoints.json config/gpu-backend/acceptance.json \
         tools/gpu-backend/verify-acceptance.sh; do
  [ -f "$f" ] && copy "$f"
done
# machine-readable evidence (no raw-large/, logs/, ledger/; receipts/telemetry/monitor JSONL are small)
find research/gpu-phase5/results -type f \( -path '*/raw-large/*' -o -path '*/logs/*' -o -path '*/ledger/*' -o -name '*.bin' \) -prune -o -type f -print \
  | sort | while read -r f; do copy "$f"; done
# the deliverables and the machine-readable summaries also at the top level, for a reviewer opening the ZIP
for f in $REPORTS MANIFEST.json; do cp "research/gpu-phase5/$f" "$STAGE/$f"; done
mkdir -p "$STAGE/summaries"
for f in results/perf/performance.json results/perf/performance.csv results/perf/cpuprof-summary.json results/parity/final/SUMMARY.json \
         results/acceptance-gates.txt results/integration/post-merge-verification.json results/integration/merge-audit.json \
         results/integration/tests/post-merge-tests.json results/optimizer/regression.json results/seals/check-after.json; do
  [ -f "research/gpu-phase5/$f" ] && cp "research/gpu-phase5/$f" "$STAGE/summaries/$(basename "$f")"
done
cat > "$STAGE/README.md" <<'TXT'
# GPU Phase 5 — parity root cause, atomic dataset cache, performance audit, acceptance and integration: handoff bundle

READ FIRST: `GPU_FINAL_HANDOFF.md` (status, the accepted version and its record sha256, the merged revision or the
reason none was made, the checked-out branch, risks). Then, as needed:

| File | Content |
|---|---|
| `PARITY_ROOT_CAUSE.md` | the Phase 4 mismatch: evidence, cause, fix, attribution limits |
| `ATOMIC_CACHE_AND_CONCURRENCY.md` | the atomic dataset export, its tests, job isolation, the 1-job / 2-job modes |
| `PERFORMANCE_AUDIT.md` | profiles, every candidate (kept or rejected), end-to-end timings against Phase 3 |
| `GPU_ACCEPTANCE_REPORT.md` | every gate with its counts, hashes and evidence files; diagnostics |
| `MERGE_AND_RESTORE.md` | commits, the merge and its verification, or the exact reason no merge occurred |
| `PILOT_HANDOFF_ONLY.md` | context for the pilot's owner — **RISK-ENVELOPE PILOT NOT STARTED** |

The seven reports and `MANIFEST.json` at this level are copies of the files in `research/gpu-phase5/`; paths such as
`results/…` inside the reports are relative to that directory, where the machine-readable evidence lies (JSON, JSONL,
CSV, the campaign's unit logs under `results/runlogs/`). `summaries/` holds the main machine-readable summaries.
`research/gpu-phase5/{PROTOCOL.md,AMENDMENTS.md,RUN_COMMANDS.md,RESEARCH_RECOVERY.md,brief/BRIEF.md}` are the method,
its changes, the exact commands and the checkpoint. Verify the bundle with `sha256sum -c CHECKSUMS.sha256` inside the
extracted directory. No market data, binaries, caches or credentials are included.
TXT
( cd "$STAGE" && find . -type f ! -name CHECKSUMS.sha256 | sort | sed 's#^\./##' | xargs -d '\n' sha256sum > CHECKSUMS.sha256 )
rm -f "$OUT"
( cd "$SCRATCH" && zip -q -r -X "$OLDPWD/$OUT" "$NAME" )
zip -T "$OUT"
VERIFY="$SCRATCH/verify" && rm -rf "$VERIFY" && mkdir -p "$VERIFY"
unzip -q "$OUT" -d "$VERIFY"
( cd "$VERIFY/$NAME" && sha256sum --quiet -c CHECKSUMS.sha256 ) && echo "checksums OK"
# no forbidden content (CSV only as this study's summaries)
if unzip -Z1 "$OUT" | grep -Ev "/(summaries|research/gpu-phase5/results/(perf|rootcause))/[A-Za-z0-9_-]+\.csv$|/research/gpu-phase5/results/cache/" \
   | grep -Eiq '\.(csv|sqlite|gb2ds|so|a|whl|bin|zip)$|/data/|/build/|/cache/|api-token|\.env'; then echo "FORBIDDEN CONTENT"; exit 1; fi
echo "files: $(unzip -Z1 "$OUT" | grep -vc '/$')  bytes: $(stat -c %s "$OUT")  sha256: $(sha256sum "$OUT" | cut -d' ' -f1)"
