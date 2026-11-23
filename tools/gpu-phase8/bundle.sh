#!/bin/bash
# gpu-phase8: the portable handoff ZIP — the report, the study's committed records and evidence (git-tracked files of
# research/gpu-phase8/, no raw-large, no logs, no caches), the acceptance record and the operations docs, with
# CHECKSUMS.sha256 and a README. Verified after building (zip -T; every checksum after extraction).
#   tools/gpu-phase8/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; NAME=gpu-phase8-infrastructure-hardening-handoff
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
git ls-files research/gpu-phase8 | grep -v '^research/gpu-phase8/bundle/' | while read -r f; do mkdir -p "$S/$NAME/$(dirname "$f")"; cp "$f" "$S/$NAME/$f"; done
for f in config/gpu-backend/acceptance.json docs/gpu/README.md docs/gpu/PARITY_CHECKLIST.md docs/strategy-lab/OPERATIONS.md CLAUDE.md; do mkdir -p "$S/$NAME/$(dirname "$f")"; cp "$f" "$S/$NAME/$f"; done
cp research/gpu-phase8/GPU_INFRASTRUCTURE_HARDENING_REPORT.md "$S/$NAME/"
cat > "$S/$NAME/README.md" <<'R'
# GPU Phase 6 handoff — read GPU_INFRASTRUCTURE_HARDENING_REPORT.md first

GPU infrastructure hardening completed. Risk-envelope pilot NOT STARTED.

Reading order: GPU_INFRASTRUCTURE_HARDENING_REPORT.md; research/gpu-phase8/JOB_ISOLATION.md; research/gpu-phase8/MERGE_AND_RESTORE.md;
research/gpu-phase8/PROTOCOL.md and AMENDMENTS.md; research/gpu-phase8/results/ (campaign/summary.json, compare/, parity/, policy/,
tests/, integrity/, integration/); config/gpu-backend/acceptance.json (sha256 in the report). CHECKSUMS.sha256 lists every file.
R
( cd "$S/$NAME" && find . -type f ! -name CHECKSUMS.sha256 | sort | xargs sha256sum > CHECKSUMS.sha256 )
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" && zip -T "$NAME.zip" )
mkdir -p "$S/x" && ( cd "$S/x" && unzip -q "../$NAME.zip" && cd "$NAME" && sha256sum -c --quiet CHECKSUMS.sha256 && echo "checksums OK: $(wc -l < CHECKSUMS.sha256) files" )
if grep -rIlE 'BEGIN (RSA|OPENSSH) PRIVATE|ALPACA_(API|SECRET)_KEY=[A-Za-z0-9]' "$S/x/$NAME" ; then echo "FORBIDDEN CONTENT"; exit 1; fi
sha256sum "$S/$NAME.zip"
