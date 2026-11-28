#!/bin/bash
# The risk-envelope pilot's portable handoff ZIP (PROTOCOL.md §18): READ_FIRST.md, the report, the frozen protocol and
# decisions, the engineering gates, every committed record of research/vg-l0-risk-envelope-pilot/ (git-tracked files; no
# logs, no caches, no raw-large), the pilot's code and tools (for review), the acceptance record and the GPU operations
# docs; MANIFEST.sha256 covers every file; verified after building (zip -T; every checksum after extraction; a scan for
# secrets). Excluded (named with paths and hashes in READ_FIRST.md instead): minute data, Assignment 3's .sqlite.zst
# populations, job archives and dataset caches.
#   tools/vg-l0-risk-envelope-pilot/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; NAME=vg-l0-risk-envelope-pilot-results
P=research/vg-l0-risk-envelope-pilot
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
git ls-files $P src/vg-l0-risk-envelope-pilot tools/vg-l0-risk-envelope-pilot | grep -v "^$P/bundle/" | while read -r f; do mkdir -p "$S/$NAME/$(dirname "$f")"; cp "$f" "$S/$NAME/$f"; done
for f in config/gpu-backend/acceptance.json docs/gpu/README.md docs/gpu/PARITY_CHECKLIST.md docs/research/methods/NEW_L0_METHOD.md src/risk-envelope/policy.ts src/risk-envelope/diagnostics.ts CLAUDE.md; do mkdir -p "$S/$NAME/$(dirname "$f")"; cp "$f" "$S/$NAME/$f"; done
cp $P/READ_FIRST.md "$S/$NAME/READ_FIRST.md"
cp $P/REPORT.md "$S/$NAME/REPORT.md"
( cd "$S/$NAME" && find . -type f ! -name MANIFEST.sha256 | sort | xargs sha256sum > MANIFEST.sha256 )
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" && zip -T "$NAME.zip" )
mkdir -p "$S/x" && ( cd "$S/x" && unzip -q "../$NAME.zip" && cd "$NAME" && sha256sum -c --quiet MANIFEST.sha256 && echo "checksums OK: $(wc -l < MANIFEST.sha256) files" )
if grep -rIlE 'BEGIN (RSA|OPENSSH) PRIVATE|ALPACA_(API|SECRET)_KEY=[A-Za-z0-9]|ghp_[A-Za-z0-9]{20}' "$S/x/$NAME" ; then echo "FORBIDDEN CONTENT"; exit 1; fi
sha256sum "$S/$NAME.zip"; stat -c '%s bytes' "$S/$NAME.zip"; unzip -l "$S/$NAME.zip" | tail -1
