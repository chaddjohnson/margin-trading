#!/bin/bash
# Priority 4 (P4-S1 1.0.0) portable handoff ZIP (brief §10): READ_FIRST.md first; the decision register, the executive and
# detailed reports, the report tables, the protocol, amendments, adoption and rule specification, the run commands and
# reproducibility notes; every committed file of research/vg-l0-staged-stop/ (sealed records, seals, door log, jobs,
# attestations, engineering gates, logs, report-only diagnostics, the brief); the study's code and tools; the engine and
# GPU implementation of S1 as a patch against the branch base (implementation/engine-and-gpu.patch) with its diffstat;
# the GPU Phase 8 acceptance evidence (every committed file of research/gpu-phase8/ and config/gpu-backend/acceptance.json);
# IDENTITY.txt; SHA256SUMS.txt over every file. Verified after building: zip -T, every checksum after extraction, a scan
# for secrets / personal data, no database, archive, market-data or binary file. Excluded (named in READ_FIRST.md):
# market data, SQLite / zstd archives, the evaluation caches, the CUDA binary.
#   tools/vg-l0-staged-stop/bundle.sh <scratch dir>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; NAME=vg-l0-staged-trailing-stop-priority4
P=research/vg-l0-staged-stop
BASE=5d587bb28860967327a9f1b1263154b26f144e8c
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
copy() { mkdir -p "$S/$NAME/$(dirname "$2")"; cp "$1" "$S/$NAME/$2"; }
git ls-files $P src/vg-l0-staged-stop src/staged-stop tools/vg-l0-staged-stop research/gpu-phase8 tools/gpu-phase8 src/gpu-phase8 \
  | grep -vE '\.(sqlite|zst|bin|cubin|fatbin|so|zip)$' | while read -r f; do copy "$f" "$f"; done
for f in config/gpu-backend/acceptance.json CLAUDE.md docs/gpu/FEATURE_MATRIX.md docs/gpu/PARITY_CHECKLIST.md docs/gpu/README.md \
  docs/research/OPTIMIZATION_STANDARD.md research/vg-l0-trailing-stop-audit/DECISION_REGISTER.md \
  research/vg-l0-trailing-stop-audit/PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md research/vg-l0-trailing-stop-audit/STAGED_STOP_DESIGN_OPTIONS.md; do
  copy "$f" "reference/$f"; done
mkdir -p "$S/$NAME/implementation"
git diff --stat=160 $BASE..HEAD -- src tools config docs package.json ':!src/vg-l0-staged-stop' ':!tools/vg-l0-staged-stop' ':!src/gpu-phase8' ':!tools/gpu-phase8' > "$S/$NAME/implementation/engine-and-gpu.diffstat.txt"
git diff $BASE..HEAD -- src config package.json ':!src/vg-l0-staged-stop' ':!src/gpu-phase8' > "$S/$NAME/implementation/engine-and-gpu.patch"
cp $P/READ_FIRST.md "$S/$NAME/READ_FIRST.md"
{
  echo "Priority 4 (P4-S1 1.0.0) staged trailing stops — handoff identity"
  echo "branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "commit: $(git rev-parse HEAD)"
  echo "branch base: $BASE (research/vg-l0-trailing-stop-audit)"
  echo "main (untouched): $(git rev-parse main)"
  echo "protocol: $P/PROTOCOL.md sha256 $(sha256sum $P/PROTOCOL.md | cut -d' ' -f1)"
  echo "protocol freeze: $P/results/protocol-freeze.json sha256 $(sha256sum $P/results/protocol-freeze.json | cut -d' ' -f1)"
  echo "GPU acceptance record: config/gpu-backend/acceptance.json sha256 $(sha256sum config/gpu-backend/acceptance.json | cut -d' ' -f1)"
  echo "built: $(date -u +%FT%TZ)"
  echo
  echo "Reading order: READ_FIRST.md → $P/DECISION_REGISTER.md → $P/REPORT.md → $P/reports/FINAL_COMPARISON.md →"
  echo "  $P/reports/SEARCH_REPORT.md, RISK_REPORT.md, ABLATION_REPORT.md, IMPLEMENTATION_VERIFICATION.md, REPRODUCIBILITY.md →"
  echo "  $P/reports/tables/ → $P/PROTOCOL.md, AMENDMENTS.md, RULE_SPECIFICATION.md, STANDARD_ADOPTION.json, RUN_COMMANDS.md →"
  echo "  $P/results/ (sealed records, seals.jsonl, doors.jsonl, jobs/, gpu-attestations/, engineering/) → src/, tools/, implementation/ →"
  echo "  research/gpu-phase8/ (acceptance evidence) → reference/ (unchanged inputs) → $P/brief/BRIEF.md"
} > "$S/$NAME/IDENTITY.txt"
( cd "$S/$NAME" && find . -type f ! -name SHA256SUMS.txt | sort | xargs sha256sum > SHA256SUMS.txt )
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME/READ_FIRST.md" && zip -qr -X "$NAME.zip" "$NAME" && zip -T "$NAME.zip" )
[ "$(unzip -Z1 "$S/$NAME.zip" | head -1)" = "$NAME/READ_FIRST.md" ] || { echo "READ_FIRST.md is not the first entry"; exit 1; }
mkdir -p "$S/x" && ( cd "$S/x" && unzip -q "../$NAME.zip" && cd "$NAME" && sha256sum -c --quiet SHA256SUMS.txt && echo "checksums OK: $(wc -l < SHA256SUMS.txt) files" )
if grep -rIlE 'BEGIN (RSA|OPENSSH) PRIVATE|ALPACA_(API|SECRET)_KEY=[A-Za-z0-9]|ghp_[A-Za-z0-9]{20}|@gmail\.com' "$S/x/$NAME" ; then echo "FORBIDDEN CONTENT"; exit 1; fi
if find "$S/x/$NAME" \( -name '*.sqlite*' -o -name '*.zst' -o -name 'data.csv' -o -name '*.bin' -o -name '*.cubin' \) | grep -q .; then echo "A DATABASE, ARCHIVE, MARKET DATA OR BINARY FILE IS IN THE BUNDLE"; exit 1; fi
sha256sum "$S/$NAME.zip"; stat -c '%s bytes' "$S/$NAME.zip"; unzip -l "$S/$NAME.zip" | tail -1
