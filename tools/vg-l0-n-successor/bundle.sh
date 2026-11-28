#!/bin/bash
# P5-NS portable handoff ZIP (brief §9). Contents: the required documents at the top level (READ_FIRST.md first), every
# committed file of research/vg-l0-n-successor/ under study/ except the bulky per-lane search and qualification records
# (committed at the commit named in IDENTITY.txt; listed with size and sha256 in OMITTED_ARTIFACTS.md; their compact
# per-lane summary is study/reports/tables/lanes.csv), the chain log, the study's code (source/: src/ and tools/ of the
# study, package.json, and the branch's whole code patch against its base), the unchanged inputs it cites (reference/),
# IDENTITY.txt and SHA256SUMS.txt over every file. Verified after building: zip -T, every checksum after extraction, a
# secrets / personal-data scan, no database or market-data file.
#   tools/vg-l0-n-successor/bundle.sh <scratch dir> <remote-verified commit>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; REMOTE_HEAD=$2
NAME=vg-l0-n-successor-handoff
P=research/vg-l0-n-successor
BASE=5d587bb28860967327a9f1b1263154b26f144e8c
BRANCH=$(git rev-parse --abbrev-ref HEAD); HEAD_SHA=$(git rev-parse HEAD)
[ "$REMOTE_HEAD" = "$HEAD_SHA" ] || { echo "HEAD $HEAD_SHA is not the remote-verified commit $REMOTE_HEAD"; exit 1; }
[ -z "$(git status --porcelain -- $P src/vg-l0-n-successor tools/vg-l0-n-successor package.json)" ] || { echo "uncommitted study changes"; exit 1; }
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
B="$S/$NAME"

# 1. the required documents at the top level
for f in READ_FIRST.md DECISION_REGISTER.md REPORT.md PROTOCOL.md METHOD_AND_BUDGET_RECONSTRUCTION.md SEARCH_AND_CONVERGENCE_REPORT.md \
  GPU_PARITY_AND_ACCEPTANCE.md ROBUSTNESS_AND_RISK.md CHRONOLOGICAL_VALIDATION.md FINAL_CANDIDATES.md AMENDMENTS.md RESEARCH_RECOVERY.md \
  RUN_COMMANDS.md STANDARD_ADOPTION.json FROZEN_SELECTION.json README.md; do cp "$P/$f" "$B/$f"; done
cp $P/results/protocol-freeze.json "$B/PROTOCOL_FREEZE.json"

# 2. the study directory (committed files), minus the bulky lane records and the bundle itself
git ls-files $P | grep -v "^$P/bundle/" | grep -vE "^$P/results/(search|qualification)/" | while read -r f; do
  mkdir -p "$B/study/$(dirname "${f#$P/}")"; cp "$f" "$B/study/${f#$P/}"; done
mkdir -p "$B/study/results/logs"; cp $P/results/logs/chain.log "$B/study/results/logs/chain.log"

# 3. source: the study's code, the npm scripts, the whole code patch of the branch against its base
git ls-files src/vg-l0-n-successor tools/vg-l0-n-successor package.json | while read -r f; do mkdir -p "$B/source/$(dirname "$f")"; cp "$f" "$B/source/$f"; done
git diff $BASE "$HEAD_SHA" -- src tools package.json > "$B/source/branch-code.patch"

# 4. unchanged inputs the study cites
for f in config/gpu-backend/acceptance.json docs/research/OPTIMIZATION_STANDARD.md docs/research/optimization-standard.versions.json \
  docs/research/methods/NEW_L0_METHOD.md docs/gpu/PARITY_CHECKLIST.md docs/gpu/FEATURE_MATRIX.md CLAUDE.md docs/claude/context-recovery.md \
  src/vg-l0-risk-envelope-pilot/search.ts src/vg-l0-risk-families/evaluate.ts src/vg-l0-full-joint/space.ts; do
  [ -f "$f" ] && { mkdir -p "$B/reference/$(dirname "$f")"; cp "$f" "$B/reference/$f"; }; done

# 5. omitted artifacts (paths, sizes, sha256, restoration)
{
  echo "# OMITTED ARTIFACTS — P5-NS handoff"
  echo
  echo "Nothing below is needed to read the findings; everything is needed only to replay or audit at lane level."
  echo "Sizes in bytes; sha256 recomputed at packaging (archives: \`study/reports/diagnostics/*.sha256\`)."
  echo
  echo "## 1. Per-lane search and qualification records (in the repository, not in the ZIP)"
  echo
  echo "Committed on branch \`$BRANCH\` at \`$HEAD_SHA\` (and sealed: \`study/results/seals.jsonl\`). Restore:"
  echo "\`git fetch origin $BRANCH && git checkout $HEAD_SHA -- <path>\`. Compact per-lane summary in the ZIP:"
  echo "\`study/reports/tables/lanes.csv\` (one row per lane: islands, requested, stop reason, best shortlisted member)."
  echo
  echo "| Path | Bytes | sha256 |"
  echo "|---|---:|---|"
  git ls-files $P/results/search $P/results/qualification | while read -r f; do echo "| \`$f\` | $(stat -c %s "$f") | \`$(sha256sum "$f" | cut -d' ' -f1)\` |"; done
  echo
  echo "## 2. Official job archives (Apollo only; git-ignored)"
  echo
  echo "29 SQLite archives under \`$P/cache/jobs/<job>/archive.sqlite\`, $(awk '{s+=$2} END {printf "%.1f GB", s/1e9}' $P/reports/diagnostics/job-archives.sha256) in all; each"
  echo "line of \`study/reports/diagnostics/job-archives.sha256\` is \`sha256  bytes  path\`. They are kept **uncompressed until"
  echo "the user's review** (DECISION_REGISTER F3). Reproduction without them: rerun the official chain at \`$HEAD_SHA\`"
  echo "(\`study/chains/chain.sh\`, \`RUN_COMMANDS.md\`) — seeds, budgets and doors are frozen, so the sealed records reproduce"
  echo "(E3/E5 showed lane-level determinism); a missing archive means recomputation, not a different result."
  echo
  echo "## 3. Engineering, pilot and diagnostic caches (Apollo only; git-ignored)"
  echo
  echo "\`$P/cache/engineering\`, \`$P/cache/pilot\`, \`$P/cache/diagnostics\`, \`$P/cache/lot-rows\`, \`$P/cache/strategy-lab-scratch\`:"
  echo "$(du -sb $P/cache/engineering $P/cache/pilot $P/cache/diagnostics $P/cache/lot-rows $P/cache/strategy-lab-scratch 2>/dev/null | awk '{printf "%s %s bytes; ", $2, $1}')"
  echo "files over 1 MB hashed in \`study/reports/diagnostics/other-caches.sha256\`. Regenerated by the engineering and"
  echo "diagnostic commands in \`RUN_COMMANDS.md\` (non-official)."
  echo
  echo "## 4. Market data (local, git-ignored)"
  echo
  echo "\`data/GDX/\`, \`data/VGT/\` (and the tail-stress proxies \`data/GDXJ/\`, \`data/XLK/\`). The door files each stage read"
  echo "are identified by bytes, rows, sha256 and last row in \`PROTOCOL_FREEZE.json\` → \`doors\` (D19, D21, D23, D24, FULL);"
  echo "see \`docs/canonical-dataset-migration.md\` in the repository for the dataset layout."
  echo
  echo "## 5. GPU binary and toolchain"
  echo
  echo "\`research/gpu-phase7/build/gb7\` sha256 \`$(sha256sum research/gpu-phase7/build/gb7 | cut -d' ' -f1)\` ($(stat -c %s research/gpu-phase7/build/gb7) bytes): rebuilt"
  echo "reproducibly from the pinned sources by \`tools/gpu-backend/verify-acceptance.sh --rebuild\` (record \`reference/config/gpu-backend/acceptance.json\`)."
  echo
  echo "## 6. Logs and dependencies"
  echo
  echo "Per-stage logs \`$P/results/logs/*.log\` ($(ls $P/results/logs | wc -l) files, $(du -sb $P/results/logs | cut -f1) bytes; the chain log is included as"
  echo "\`study/results/logs/chain.log\`) and per-job logs \`$P/results/jobs/*/logs/\` stay on Apollo; \`node_modules\` is restored"
  echo "by \`npm ci\`."
} > "$B/OMITTED_ARTIFACTS.md"

# 6. identity
{
  echo "P5-NS (Priority 5: comprehensive N/original successor optimization) — handoff identity"
  echo "branch: $BRANCH"
  echo "commit: $HEAD_SHA"
  echo "remote: origin $(git remote get-url origin | sed -E 's#https://[^@]*@#https://#')"
  echo "remote head verified (git ls-remote origin $BRANCH) before packaging: $REMOTE_HEAD"
  echo "branch base: $BASE"
  echo "main (untouched): $(git rev-parse main)"
  echo "protocol: PROTOCOL.md sha256 $(sha256sum $P/PROTOCOL.md | cut -d' ' -f1)"
  echo "protocol freeze record: sha256 $(sha256sum $P/results/protocol-freeze.json | cut -d' ' -f1)"
  echo "frozen selection: sha256 $(sha256sum $P/FROZEN_SELECTION.json | cut -d' ' -f1)"
  echo "outcome: results/outcome.json sha256 $(sha256sum $P/results/outcome.json | cut -d' ' -f1)"
  echo "GPU acceptance record: config/gpu-backend/acceptance.json sha256 $(sha256sum config/gpu-backend/acceptance.json | cut -d' ' -f1)"
  echo "node: $(cat .node-version 2>/dev/null || node --version)"
  echo "built: $(date -u +%FT%TZ)"
  echo
  echo "Exact tree: git clone <remote> && git checkout $HEAD_SHA (study files under $P/)."
  echo "Reading order: READ_FIRST.md → REPORT.md → DECISION_REGISTER.md → FINAL_CANDIDATES.md → ROBUSTNESS_AND_RISK.md →"
  echo "  CHRONOLOGICAL_VALIDATION.md → SEARCH_AND_CONVERGENCE_REPORT.md → METHOD_AND_BUDGET_RECONSTRUCTION.md →"
  echo "  GPU_PARITY_AND_ACCEPTANCE.md → PROTOCOL.md (+ PROTOCOL_FREEZE.json, STANDARD_ADOPTION.json, AMENDMENTS.md) →"
  echo "  RUN_COMMANDS.md, RESEARCH_RECOVERY.md → study/ (sealed records, tables, diagnostics) → source/ → reference/ → OMITTED_ARTIFACTS.md"
} > "$B/IDENTITY.txt"

# 7. checksums, zip, verification
( cd "$B" && find . -type f ! -name SHA256SUMS.txt | sort | xargs sha256sum > SHA256SUMS.txt )
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" && zip -T "$NAME.zip" )
mkdir -p "$S/x" && ( cd "$S/x" && unzip -q "../$NAME.zip" && cd "$NAME" && sha256sum -c --quiet SHA256SUMS.txt && echo "checksums OK after extraction: $(wc -l < SHA256SUMS.txt) files" )
if grep -rIlE 'BEGIN [A-Z ]*PRIVATE KEY|ALPACA_(API|SECRET)_KEY=[A-Za-z0-9]|APCA_API_(KEY_ID|SECRET_KEY)=[A-Za-z0-9]|ghp_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]{20}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{24}|@gmail\.com|[Pp]assword *[:=] *[^ ]' "$S/x/$NAME"; then echo "FORBIDDEN CONTENT"; exit 1; fi
if find "$S/x/$NAME" \( -name '*.sqlite*' -o -name '*.zst' -o -name 'data.csv' -o -name '*.parquet' -o -name 'api-token' \) | grep -q .; then echo "A DATABASE, ARCHIVE OR MARKET-DATA FILE IS IN THE BUNDLE"; exit 1; fi
echo "secrets / personal-data scan: clean; no database or market-data file"
sha256sum "$S/$NAME.zip"; stat -c '%s bytes' "$S/$NAME.zip"; unzip -l "$S/$NAME.zip" | tail -1
