#!/bin/bash
# gpu-phase3: the portable, self-contained handoff bundle research/gpu-phase3/bundle/gpu-phase3-final-handoff.zip — the
# six reports (start with GPU_ENGINE_FINAL_HANDOFF.md), the study's protocol/adoption/commands/checkpoint, the policy
# documents and the acceptance record, the machine-readable evidence (results/ without raw-large/, logs/, ledger/,
# cache/) and MANIFEST.json, with CHECKSUMS.sha256 over every file. No market data, secrets, CUDA toolchain, binaries,
# caches or raw archives. Verification: zip -T, an extraction into a scratch directory and sha256sum -c of every file.
#   tools/gpu-phase3/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
SCRATCH=${1:?scratch dir}
NAME=gpu-phase3-final-handoff
OUT=research/gpu-phase3/bundle/$NAME.zip
STAGE="$SCRATCH/$NAME"
rm -rf "$STAGE" && mkdir -p "$STAGE" research/gpu-phase3/bundle
copy() { mkdir -p "$STAGE/$(dirname "$1")" && cp "$1" "$STAGE/$1"; }
for f in GPU_ENGINE_FINAL_HANDOFF.md GPU_PERFORMANCE_BEFORE_AFTER.md GPU_FINAL_PARITY_AND_ACCEPTANCE.md GPU_ENFORCEMENT_INTEGRITY.md \
         GPU_INTEGRATION_AND_OPERATIONS.md GPU_PILOT_READINESS.md PROTOCOL.md AMENDMENTS.md STANDARD_ADOPTION.json MANIFEST.json \
         RUN_COMMANDS.md RESEARCH_RECOVERY.md brief/BRIEF.md; do
  [ -f "research/gpu-phase3/$f" ] && copy "research/gpu-phase3/$f"
done
for f in CLAUDE.md CONTRIBUTING.md .github/pull_request_template.md docs/research/OPTIMIZATION_STANDARD.md \
         docs/research/optimization-standard.versions.json docs/research/STUDY_PROTOCOL_TEMPLATE.md \
         docs/research/templates/STANDARD_ADOPTION.template.json docs/gpu/README.md docs/gpu/PARITY_CHECKLIST.md \
         docs/gpu/FEATURE_MATRIX.md config/gpu-backend/entrypoints.json config/gpu-backend/acceptance.json; do
  [ -f "$f" ] && copy "$f"
done
# machine-readable evidence (no raw-large/, logs/, ledger/; receipts/telemetry JSONL are small)
find research/gpu-phase3/results -type f \( -path '*/raw-large/*' -o -path '*/logs/*' -o -path '*/ledger/*' \) -prune -o -type f -print \
  | sort | while read -r f; do copy "$f"; done
( cd "$STAGE" && find . -type f ! -name CHECKSUMS.sha256 | sort | sed 's#^\./##' | xargs -d '\n' sha256sum > CHECKSUMS.sha256 )
rm -f "$OUT"
( cd "$SCRATCH" && zip -q -r -X "$OLDPWD/$OUT" "$NAME" )
zip -T "$OUT"
VERIFY="$SCRATCH/verify" && rm -rf "$VERIFY" && mkdir -p "$VERIFY"
unzip -q "$OUT" -d "$VERIFY"
( cd "$VERIFY/$NAME" && sha256sum --quiet -c CHECKSUMS.sha256 ) && echo "checksums OK"
# no forbidden content
if unzip -l "$OUT" | grep -Eiq '\.(csv|sqlite|gb2ds|so|a|whl|bin)$|/data/|/build/|/cache/|api-token|\.env'; then echo "FORBIDDEN CONTENT"; exit 1; fi
echo "files: $(unzip -Z1 "$OUT" | grep -vc '/$')  bytes: $(stat -c %s "$OUT")  sha256: $(sha256sum "$OUT" | cut -d' ' -f1)"
