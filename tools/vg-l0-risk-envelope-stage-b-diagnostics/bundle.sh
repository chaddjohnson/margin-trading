#!/bin/bash
# RES-BD 1.0.0 portable handoff ZIP (brief §7): READ_FIRST.md first; every committed file of
# research/vg-l0-risk-envelope-stage-b-diagnostics/ (plan, amendments, adoption, reports, machine-readable census,
# draw and giveback records, verification evidence, the brief) and tools/vg-l0-risk-envelope-stage-b-diagnostics/; the
# unchanged inputs it cites (Stage B's reports and frozen protocol, the original census.ts / giveback.ts, the pilot's
# diag-core, the D3 and risk-metric definitions, the policy, Stage A's replay tools); IDENTITY.txt; MANIFEST.sha256
# over every file. Verified after building: zip -T, every checksum after extraction, a scan for secrets / personal data,
# no database or market-data file. Excluded (named with paths and sha256 in VERIFICATION.md / RESEARCH_RECOVERY.md):
# SQLite archives, market data, caches, logs, compiled artifacts.
#   tools/vg-l0-risk-envelope-stage-b-diagnostics/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; NAME=vg-l0-risk-envelope-stage-b-diagnostics
P=research/vg-l0-risk-envelope-stage-b-diagnostics
B=research/vg-l0-risk-envelope-stage-b
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
git ls-files $P tools/vg-l0-risk-envelope-stage-b-diagnostics | grep -v "^$P/bundle/" | while read -r f; do mkdir -p "$S/$NAME/$(dirname "$f")"; cp "$f" "$S/$NAME/$f"; done
for f in $B/READ_FIRST.md $B/REPORT.md $B/DECISION_REGISTER.md $B/PROTOCOL.md $B/AMENDMENTS.md $B/results/analysis/TABLES.md $B/results/analysis/SUPPLEMENT.md \
  tools/vg-l0-risk-envelope-stage-b/census.ts tools/vg-l0-risk-envelope-stage-b/giveback.ts tools/vg-l0-risk-envelope-pilot/diag-core.ts \
  src/risk-envelope/diagnostics.ts src/risk-envelope/policy.ts src/vg-l0-risk-metrics/metrics.ts src/vg-l0-risk-metrics/ledger.ts src/gpu-phase7/envelope.ts \
  src/vg-l0-risk-envelope-stage-b/context.ts src/vg-l0-risk-envelope-stage-b/stats.ts src/vg-l0-risk-envelope-pilot/fitness.ts \
  research/vg-l0-risk-envelope-pilot/DIAGNOSTICS_SPEC.md tools/vg-l0-risk-envelope-sensitivity/population.ts tools/vg-l0-risk-envelope-sensitivity/qualification.ts \
  tools/vg-l0-risk-envelope-sensitivity/diagWorker.ts config/gpu-backend/acceptance.json CLAUDE.md; do
  mkdir -p "$S/$NAME/reference/$(dirname "$f")"; cp "$f" "$S/$NAME/reference/$f"; done
cp $P/READ_FIRST.md "$S/$NAME/READ_FIRST.md"
{
  echo "RES-BD 1.0.0 Stage B diagnostics handoff — identity"
  echo "branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "commit (content of this ZIP): $(git rev-parse HEAD)"
  echo "source: Stage B final commit 1c1f9e72a1a746ffba18f58ba4c7bac0098bc20c (research/vg-l0-risk-envelope-stage-b, unchanged)"
  echo "main (untouched): $(git rev-parse main)"
  echo "GPU acceptance record: config/gpu-backend/acceptance.json sha256 $(sha256sum config/gpu-backend/acceptance.json | cut -d' ' -f1)"
  echo "Stage B job archives (git-ignored, on Apollo; sha256 before = after): $B/cache/jobs/<job>/archive.sqlite — see $P/results/verification/archives-before.sha256 and archives-after.sha256"
  echo "built: $(date -u +%FT%TZ)"
  echo
  echo "Reading order: READ_FIRST.md → $P/REPORT.md → CENSUS_REPORT.md → GIVEBACK_REPORT.md → VERIFICATION.md → DECISION_REGISTER.md →"
  echo "  results/analysis/TABLES.md and DATA_SCHEMAS.md (+ results/census, results/qualification, results/giveback) → PROTOCOL.md, AMENDMENTS.md,"
  echo "  STANDARD_ADOPTION.json → RESEARCH_RECOVERY.md → tools/ → reference/ (unchanged inputs) → brief/BRIEF.md"
} > "$S/$NAME/IDENTITY.txt"
( cd "$S/$NAME" && find . -type f ! -name MANIFEST.sha256 | sort | xargs sha256sum > MANIFEST.sha256 )
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" && zip -T "$NAME.zip" )
mkdir -p "$S/x" && ( cd "$S/x" && unzip -q "../$NAME.zip" && cd "$NAME" && sha256sum -c --quiet MANIFEST.sha256 && echo "checksums OK: $(wc -l < MANIFEST.sha256) files" )
if grep -rIlE 'BEGIN (RSA|OPENSSH) PRIVATE|ALPACA_(API|SECRET)_KEY=[A-Za-z0-9]|ghp_[A-Za-z0-9]{20}|@gmail\.com' "$S/x/$NAME" ; then echo "FORBIDDEN CONTENT"; exit 1; fi
if find "$S/x/$NAME" -name '*.sqlite*' -o -name 'data.csv' -o -name '*.zst' | grep -q .; then echo "A DATABASE OR MARKET DATA FILE IS IN THE BUNDLE"; exit 1; fi
sha256sum "$S/$NAME.zip"; stat -c '%s bytes' "$S/$NAME.zip"; unzip -l "$S/$NAME.zip" | tail -1
