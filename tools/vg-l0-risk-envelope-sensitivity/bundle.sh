#!/bin/bash
# RES-A 1.0.0 portable handoff ZIP (brief §9.10): READ_FIRST.md and the reading order, every committed file of
# research/vg-l0-risk-envelope-sensitivity/ (git-tracked; reports, policy matrix, protocol, tables, CSV / JSON results, the
# CPU replay records, the brief), the audit's tools (scripts essential to independent review), the unchanged risk policy
# module and the reference documents the audit cites; IDENTITY.txt with the branch and commit identifiers; MANIFEST.sha256
# over every file. Verified after building: zip -T, every checksum after extraction, a scan for secrets. Excluded (named
# with paths and hashes in POPULATION_AND_PROVENANCE.md instead): market data, SQLite archives and their copies, caches,
# copied sealed optimization archives.
#   tools/vg-l0-risk-envelope-sensitivity/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; NAME=vg-l0-risk-envelope-sensitivity-stage-a
P=research/vg-l0-risk-envelope-sensitivity
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
git ls-files $P tools/vg-l0-risk-envelope-sensitivity | grep -v "^$P/bundle/" | while read -r f; do mkdir -p "$S/$NAME/$(dirname "$f")"; cp "$f" "$S/$NAME/$f"; done
for f in src/risk-envelope/policy.ts src/risk-envelope/diagnostics.ts docs/research/methods/NEW_L0_METHOD.md config/gpu-backend/acceptance.json \
  research/vg-l0-risk-envelope-pilot/READ_FIRST.md research/vg-l0-risk-envelope-pilot/REPORT.md research/vg-l0-risk-envelope-pilot/PROTOCOL.md \
  research/vg-l0-risk-envelope-pilot/AMENDMENTS.md research/vg-l0-risk-envelope-pilot/DECISION_REGISTER.md CLAUDE.md; do
  mkdir -p "$S/$NAME/reference/$(dirname "$f")"; cp "$f" "$S/$NAME/reference/$f"; done
cp $P/READ_FIRST.md "$S/$NAME/READ_FIRST.md"
{
  echo "RES-A 1.0.0 Stage A handoff — identity"
  echo "branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "commit: $(git rev-parse HEAD)"
  echo "source (pilot) branch: research/vg-l0-risk-envelope-pilot at 7f69d0d2f3f5fd8f1e81169d9f5577812b0ec999"
  echo "predeclaration commit: 93bc76a3ff435f8d83f3ec16f7045a29eaf3f618"
  echo "main (untouched): $(git rev-parse main)"
  echo "GPU acceptance record: config/gpu-backend/acceptance.json sha256 $(sha256sum config/gpu-backend/acceptance.json | cut -d' ' -f1)"
  echo "built: $(date -u +%FT%TZ)"
  echo
  echo "Reading order: READ_FIRST.md → research/vg-l0-risk-envelope-sensitivity/REPORT.md → POLICY_MATRIX.md →"
  echo "  POPULATION_AND_PROVENANCE.md → METHOD_AND_CHECKS.md → DECISION_REGISTER.md → STAGE_B_OPTION.md → AMENDMENTS.md →"
  echo "  results/TABLES.md (+ CSV / JSON) → PROTOCOL.md, brief/BRIEF.md → tools/ → reference/ (unchanged inputs)"
} > "$S/$NAME/IDENTITY.txt"
( cd "$S/$NAME" && find . -type f ! -name MANIFEST.sha256 | sort | xargs sha256sum > MANIFEST.sha256 )
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" && zip -T "$NAME.zip" )
mkdir -p "$S/x" && ( cd "$S/x" && unzip -q "../$NAME.zip" && cd "$NAME" && sha256sum -c --quiet MANIFEST.sha256 && echo "checksums OK: $(wc -l < MANIFEST.sha256) files" )
if grep -rIlE 'BEGIN (RSA|OPENSSH) PRIVATE|ALPACA_(API|SECRET)_KEY=[A-Za-z0-9]|ghp_[A-Za-z0-9]{20}|@gmail\.com' "$S/x/$NAME" ; then echo "FORBIDDEN CONTENT"; exit 1; fi
if find "$S/x/$NAME" -name '*.sqlite*' -o -name 'data.csv' | grep -q .; then echo "A DATABASE OR MARKET DATA FILE IS IN THE BUNDLE"; exit 1; fi
sha256sum "$S/$NAME.zip"; stat -c '%s bytes' "$S/$NAME.zip"; unzip -l "$S/$NAME.zip" | tail -1
