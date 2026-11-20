#!/bin/bash
# gpu-phase5 (PROTOCOL.md §13; brief §6; adapted from tools/gpu-phase3/bundle.sh): the portable, self-contained handoff
# bundle research/gpu-phase5/bundle/gpu-phase5-concurrency-final-handoff.zip — the five reports (start with
# GPU_CONCURRENCY_FINAL_HANDOFF.md), the machine-readable summaries (results/bench/SUMMARY.json, groups.csv, jobs.csv,
# decisions), the study's brief/protocol/amendments/adoption/commands/checkpoint, the policy documents and the
# acceptance record, the machine-readable evidence (results/ without raw-large/, logs/, ledger/), MANIFEST.json and
# CHECKSUMS.sha256 over every file. No market data, secrets, CUDA toolchain, binaries, caches or raw archives; the only
# CSV files are this study's benchmark summaries. Verification: zip -T, extraction into a scratch directory,
# sha256sum -c of every file, a forbidden-content scan.
#   tools/gpu-phase5/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
SCRATCH=${1:?scratch dir}
NAME=gpu-phase5-concurrency-final-handoff
OUT=research/gpu-phase5/bundle/$NAME.zip
STAGE="$SCRATCH/$NAME"
REPORTS="GPU_CONCURRENCY_FINAL_HANDOFF.md GPU_CONCURRENCY_BENCHMARKS.md GPU_CONCURRENCY_CORRECTNESS.md GPU_ACCEPTANCE_AND_MERGE.md GPU_OPERATING_RECOMMENDATIONS.md"
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
find research/gpu-phase5/results -type f \( -path '*/raw-large/*' -o -path '*/logs/*' -o -path '*/ledger/*' \) -prune -o -type f -print \
  | sort | while read -r f; do copy "$f"; done
# the deliverables and the machine-readable summaries also at the top level, for a reviewer opening the ZIP
for f in $REPORTS MANIFEST.json; do cp "research/gpu-phase5/$f" "$STAGE/$f"; done
mkdir -p "$STAGE/summaries"
for f in SUMMARY.json groups.csv jobs.csv; do cp "research/gpu-phase5/results/bench/$f" "$STAGE/summaries/$f"; done
cp research/gpu-phase5/results/decisions/*.json "$STAGE/summaries/"
cat > "$STAGE/README.md" <<'TXT'
# GPU Phase 5 — concurrency, batching, final acceptance: handoff bundle

Start with `GPU_CONCURRENCY_FINAL_HANDOFF.md`. The five reports and `MANIFEST.json` at this level are copies of the files
in `research/gpu-phase5/`; paths such as `results/…` inside the reports are relative to that directory, where the
machine-readable evidence lies. `summaries/` holds the benchmark summaries (SUMMARY.json, groups.csv, jobs.csv) and the
frozen-rule decisions. `CHECKSUMS.sha256` lists the sha256 of every file (`sha256sum -c CHECKSUMS.sha256`).
Risk-envelope pilot NOT STARTED.
TXT
( cd "$STAGE" && find . -type f ! -name CHECKSUMS.sha256 | sort | sed 's#^\./##' | xargs -d '\n' sha256sum > CHECKSUMS.sha256 )
rm -f "$OUT"
( cd "$SCRATCH" && zip -q -r -X "$OLDPWD/$OUT" "$NAME" )
zip -T "$OUT"
VERIFY="$SCRATCH/verify" && rm -rf "$VERIFY" && mkdir -p "$VERIFY"
unzip -q "$OUT" -d "$VERIFY"
( cd "$VERIFY/$NAME" && sha256sum --quiet -c CHECKSUMS.sha256 ) && echo "checksums OK"
# no forbidden content (CSV only as this study's summaries)
if unzip -Z1 "$OUT" | grep -Ev "/(summaries|research/gpu-phase5/results/bench)/(groups|jobs)\.csv$" \
   | grep -Eiq '\.(csv|sqlite|gb2ds|so|a|whl|bin|zip)$|/data/|/build/|/cache/|api-token|\.env'; then echo "FORBIDDEN CONTENT"; exit 1; fi
echo "files: $(unzip -Z1 "$OUT" | grep -vc '/$')  bytes: $(stat -c %s "$OUT")  sha256: $(sha256sum "$OUT" | cut -d' ' -f1)"
