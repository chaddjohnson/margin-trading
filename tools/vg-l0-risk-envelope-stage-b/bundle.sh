#!/bin/bash
# RES-B 1.0.0 portable handoff ZIP (brief §7): READ_FIRST.md and the reading order, every committed file of
# research/vg-l0-risk-envelope-stage-b/ (protocol, amendments, adoption, seed/budget matrix, data-door record, sealed
# records, engineering and parity evidence, job records, analysis tables, reports, the brief), the study's code and tools,
# the unchanged inputs it cites (risk policy, the pilot's reused lane/fitness, Stage A's policy matrix and Stage B option,
# the standard's NL0 method, the acceptance record); IDENTITY.txt with the branch and commit identifiers; MANIFEST.sha256
# over every file. Verified after building: zip -T, every checksum after extraction, a scan for secrets / personal data,
# no database or market-data file. Excluded (named with paths and hashes in the reports): market data, SQLite archives,
# caches, logs.
#   tools/vg-l0-risk-envelope-stage-b/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; NAME=vg-l0-risk-envelope-stage-b
P=research/vg-l0-risk-envelope-stage-b
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
git ls-files $P src/vg-l0-risk-envelope-stage-b tools/vg-l0-risk-envelope-stage-b | grep -v "^$P/bundle/" | while read -r f; do mkdir -p "$S/$NAME/$(dirname "$f")"; cp "$f" "$S/$NAME/$f"; done
for f in src/risk-envelope/policy.ts src/vg-l0-risk-envelope-pilot/search.ts src/vg-l0-risk-envelope-pilot/fitness.ts src/vg-l0-risk-envelope-pilot/qualify.ts \
  src/vg-l0-risk-envelope-pilot/select.ts docs/research/methods/NEW_L0_METHOD.md config/gpu-backend/acceptance.json CLAUDE.md \
  research/vg-l0-risk-envelope-sensitivity/READ_FIRST.md research/vg-l0-risk-envelope-sensitivity/STAGE_B_OPTION.md research/vg-l0-risk-envelope-sensitivity/POLICY_MATRIX.md \
  research/vg-l0-risk-envelope-sensitivity/REPORT.md research/vg-l0-risk-envelope-sensitivity/DECISION_REGISTER.md tools/vg-l0-risk-envelope-sensitivity/policies.ts \
  research/vg-l0-risk-envelope-pilot/READ_FIRST.md research/vg-l0-risk-envelope-pilot/REPORT.md research/vg-l0-risk-envelope-pilot/PROTOCOL.md; do
  mkdir -p "$S/$NAME/reference/$(dirname "$f")"; cp "$f" "$S/$NAME/reference/$f"; done
cp $P/READ_FIRST.md "$S/$NAME/READ_FIRST.md"
{
  echo "RES-B 1.0.0 Stage B handoff — identity"
  echo "branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "commit: $(git rev-parse HEAD)"
  echo "preregistration commit: 59493083d3aa0eeeb28cf52f31f319148749c9fe"
  echo "protocol freeze commit: 2922e04d9bddfb953f36bdc28a950ab20d4237f1"
  echo "source (Stage A) commit: 0c2f9dd5 (pilot 7f69d0d2, Phase 7 lineage fc027eed)"
  echo "main (untouched): $(git rev-parse main)"
  echo "GPU acceptance record: config/gpu-backend/acceptance.json sha256 $(sha256sum config/gpu-backend/acceptance.json | cut -d' ' -f1)"
  echo "built: $(date -u +%FT%TZ)"
  echo
  echo "Reading order: READ_FIRST.md → research/vg-l0-risk-envelope-stage-b/REPORT.md → results/analysis/TABLES.md (+ CSV / JSON) →"
  echo "  DECISION_REGISTER.md → PROTOCOL.md, AMENDMENTS.md, STANDARD_ADOPTION.json, SEED_BUDGET_MATRIX.json → EXECUTION_PLAN.md,"
  echo "  RUN_COMMANDS.md → results/ (sealed records; seals.jsonl; doors.jsonl; engineering/; jobs/; gpu-attestations/; regression/) →"
  echo "  src/ and tools/ → reference/ (unchanged inputs) → brief/BRIEF.md"
} > "$S/$NAME/IDENTITY.txt"
( cd "$S/$NAME" && find . -type f ! -name MANIFEST.sha256 | sort | xargs sha256sum > MANIFEST.sha256 )
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" && zip -T "$NAME.zip" )
mkdir -p "$S/x" && ( cd "$S/x" && unzip -q "../$NAME.zip" && cd "$NAME" && sha256sum -c --quiet MANIFEST.sha256 && echo "checksums OK: $(wc -l < MANIFEST.sha256) files" )
if grep -rIlE 'BEGIN (RSA|OPENSSH) PRIVATE|ALPACA_(API|SECRET)_KEY=[A-Za-z0-9]|ghp_[A-Za-z0-9]{20}|@gmail\.com' "$S/x/$NAME" ; then echo "FORBIDDEN CONTENT"; exit 1; fi
if find "$S/x/$NAME" -name '*.sqlite*' -o -name 'data.csv' | grep -q .; then echo "A DATABASE OR MARKET DATA FILE IS IN THE BUNDLE"; exit 1; fi
sha256sum "$S/$NAME.zip"; stat -c '%s bytes' "$S/$NAME.zip"; unzip -l "$S/$NAME.zip" | tail -1
