#!/bin/bash
# gpu-phase2: the portable report bundle research/gpu-phase2/bundle/gpu-phase2-report-bundle.zip — the deliverables,
# the policy documents, the machine-readable evidence (results/, without raw-large/, logs/, ledgers) and MANIFEST.json,
# with CHECKSUMS.sha256 over every file. No market data, secrets, CUDA toolchain or binaries, caches or raw archives.
# Verification: zip -T, then an extraction into a scratch directory and sha256sum -c of every file.
#   tools/gpu-phase2/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
SCRATCH=${1:?scratch dir}
OUT=research/gpu-phase2/bundle/gpu-phase2-report-bundle.zip
STAGE="$SCRATCH/gpu-phase2-report-bundle"
rm -rf "$STAGE" && mkdir -p "$STAGE" research/gpu-phase2/bundle
copy() { mkdir -p "$STAGE/$(dirname "$1")" && cp "$1" "$STAGE/$1"; }
for f in GPU_PHASE2_HANDOFF.md GPU_PHASE2_REPORT.md GPU_PHASE2_FEATURE_MATRIX.md GPU_PHASE2_PARITY.md GPU_PHASE2_BENCHMARKS.md \
         GPU_PHASE2_POLICY_AND_ENFORCEMENT.md GPU_PHASE2_OPERATIONS.md PHASE2_SCOPE_AND_FEATURE_MATRIX.md PROTOCOL.md \
         AMENDMENTS.md STANDARD_ADOPTION.json MANIFEST.json RUN_COMMANDS.md RESEARCH_RECOVERY.md brief/BRIEF.md; do
  copy "research/gpu-phase2/$f"
done
for f in CLAUDE.md CONTRIBUTING.md .github/pull_request_template.md docs/research/OPTIMIZATION_STANDARD.md \
         docs/research/optimization-standard.versions.json docs/research/STUDY_PROTOCOL_TEMPLATE.md \
         docs/research/templates/STANDARD_ADOPTION.template.json docs/gpu/README.md docs/gpu/PARITY_CHECKLIST.md \
         docs/gpu/FEATURE_MATRIX.md config/gpu-backend/entrypoints.json config/gpu-backend/acceptance.json; do
  [ -f "$f" ] && copy "$f"
done
# machine-readable evidence (no raw-large/, logs/, ledger/; receipts/telemetry JSONL are small)
find research/gpu-phase2/results -type f \( -path '*/raw-large/*' -o -path '*/logs/*' -o -path '*/ledger/*' \) -prune -o -type f -print \
  | sort | while read -r f; do copy "$f"; done
( cd "$STAGE" && find . -type f ! -name CHECKSUMS.sha256 | sort | sed 's#^\./##' | xargs -d '\n' sha256sum > CHECKSUMS.sha256 )
rm -f "$OUT"
( cd "$SCRATCH" && zip -q -r -X "$OLDPWD/$OUT" gpu-phase2-report-bundle )
zip -T "$OUT"
VERIFY="$SCRATCH/verify" && rm -rf "$VERIFY" && mkdir -p "$VERIFY"
unzip -q "$OUT" -d "$VERIFY"
( cd "$VERIFY/gpu-phase2-report-bundle" && sha256sum --quiet -c CHECKSUMS.sha256 ) && echo "checksums OK"
# no forbidden content
if unzip -l "$OUT" | grep -Eiq '\.(csv|sqlite|gb2ds|so|a|whl)$|/data/|/build/|/cache/|api-token|\.env'; then echo "FORBIDDEN CONTENT"; exit 1; fi
echo "files: $(unzip -Z1 "$OUT" | grep -vc '/$')  bytes: $(stat -c %s "$OUT")  sha256: $(sha256sum "$OUT" | cut -d' ' -f1)"
