#!/bin/bash
# P8-GDX portable handoff ZIP (brief Phase 7). Contents: the required documents at the top level (READ_FIRST.md first), every
# committed file of research/gdx-d1-growth/ under study/ except the bulky per-lane search and qualification records and
# the bundle itself (committed at the commit named in IDENTITY.txt; listed with size and sha256 in OMITTED_ARTIFACTS.md;
# their compact per-lane summary is study/reports/tables/lanes.csv), the chain log, the study's code (source/: src/ and
# tools/ of the study, package.json, and the branch's whole code patch against its base), the unchanged inputs it cites
# (reference/), IDENTITY.txt and SHA256SUMS.txt over every file. Verified after building: zip -T, every checksum after
# extraction, a secrets / personal-data scan, no database, archive, binary or market-data file.
#   tools/gdx-d1-growth/bundle.sh <scratch dir> <remote-verified commit>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; REMOTE_HEAD=$2
NAME=gdx-d1-growth-handoff
P=research/gdx-d1-growth
BRANCH=$(git rev-parse --abbrev-ref HEAD); HEAD_SHA=$(git rev-parse HEAD)
BASE=$(git rev-parse --verify 421e4c87^{commit})
[ "$REMOTE_HEAD" = "$HEAD_SHA" ] || { echo "HEAD $HEAD_SHA is not the remote-verified commit $REMOTE_HEAD"; exit 1; }
[ -z "$(git status --porcelain -- $P src/gdx-d1-growth tools/gdx-d1-growth package.json | grep -v '^?? '"$P"'/bundle/')" ] || { echo "uncommitted study changes"; git status --short -- $P src/gdx-d1-growth tools/gdx-d1-growth package.json | head; exit 1; }
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
B="$S/$NAME"

# 1. the required documents at the top level
for f in READ_FIRST.md REPORT.md DECISION_REGISTER.md PROTOCOL.md AMENDMENTS.md STANDARD_ADOPTION.json FROZEN_SELECTION.json \
  GDX_DATA_AUDIT.md GDX_DATA_AUDIT.json FUNCTIONALITY_AUDIT.md BASELINES_AND_ABLATION.md TOTAL_PORTFOLIO_COMPARISON.md \
  STANDALONE_D1_REPORT.md STANDALONE_GROWTH_REPORT.md FIXED_COMBINATION_REPORT.md JOINT_REPORT.md SEQUENTIAL_REPORT.md \
  COMPARISON.md FINAL_CANDIDATES.md CHRONOLOGICAL_VALIDATION.md ROBUSTNESS_AND_RISK.md SEARCH_AND_CONVERGENCE_REPORT.md \
  OUTCOME_IDENTITY_RECONCILIATION.md GPU_PARITY_AND_ACCEPTANCE.md RESEARCH_RECOVERY.md RUN_COMMANDS.md; do cp "$P/$f" "$B/$f"; done
cp $P/results/protocol-freeze.json "$B/PROTOCOL_FREEZE.json"

# 2. the study directory (committed files), minus the bulky lane records and the bundle itself
git ls-files $P | grep -v "^$P/bundle/" | grep -vE "^$P/results/(search|qualification)/" | while read -r f; do
  mkdir -p "$B/study/$(dirname "${f#$P/}")"; cp "$f" "$B/study/${f#$P/}"; done
mkdir -p "$B/study/results/logs"; cp $P/cache/logs/chain.log "$B/study/results/logs/chain.log"

# 3. source: the study's code, the npm scripts, the whole code patch of the branch against its base
git ls-files src/gdx-d1-growth tools/gdx-d1-growth package.json | while read -r f; do mkdir -p "$B/source/$(dirname "$f")"; cp "$f" "$B/source/$f"; done
git diff "$BASE" "$HEAD_SHA" -- src tools package.json > "$B/source/branch-code.patch"

# 4. unchanged inputs the study cites
for f in config/gpu-backend/acceptance.json docs/research/OPTIMIZATION_STANDARD.md docs/research/optimization-standard.versions.json \
  docs/research/methods/NEW_L0_METHOD.md docs/gpu/PARITY_CHECKLIST.md docs/gpu/FEATURE_MATRIX.md CLAUDE.md docs/claude/context-recovery.md \
  config/market-events/splits.json config/market-events/distributions.csv config/market-events/distributions.manifest.json \
  src/vg-l0-risk-envelope-pilot/search.ts src/vg-l0-full-joint/space.ts src/research-outcome/identityJoin.ts \
  research/vg-l0-n-successor/PROTOCOL.md research/tsla-d1-growth/PROTOCOL.md research/tsla-d1-growth/READ_FIRST.md \
  research/gdx-growth-standalone/FROZEN_SELECTION.json; do
  [ -f "$f" ] && { mkdir -p "$B/reference/$(dirname "$f")"; cp "$f" "$B/reference/$f"; }; done

# 5. omitted artifacts (paths, sizes, sha256, restoration)
{
  echo "# OMITTED ARTIFACTS — P8-GDX handoff"
  echo
  echo "Nothing below is needed to read the findings; everything is needed only to replay or audit at lane level."
  echo "Sizes in bytes; sha256 recomputed at packaging."
  echo
  echo "## 1. Per-lane search and qualification records (in the repository, not in the ZIP)"
  echo
  echo "Committed on branch \`$BRANCH\` at \`$HEAD_SHA\` (and sealed: \`study/results/seals.jsonl\`). Restore:"
  echo "\`git fetch origin $BRANCH && git checkout $HEAD_SHA -- <path>\`. Compact per-lane summary in the ZIP:"
  echo "\`study/reports/tables/lanes.csv\` (one row per lane: islands, requested, stop reason, best feasible net)."
  echo
  echo "| Path | Bytes | sha256 |"
  echo "|---|---:|---|"
  git ls-files $P/results/search $P/results/qualification | while read -r f; do echo "| \`$f\` | $(stat -c %s "$f") | \`$(sha256sum "$f" | cut -d' ' -f1)\` |"; done
  echo
  echo "## 2. Official job archives of this study (Apollo only; git-ignored)"
  echo
  echo "Every official job's SQLite archive, compressed per file with zstd after its cutoff completed and verified"
  echo "(\`study/storage/GDX8_JOB_ACTIONS.jsonl\`: original sha256 and bytes, compressed sha256 and bytes, a restore test with"
  echo "\`PRAGMA integrity_check\`, the evaluation ids reproduced). Paths: \`$P/results/jobs/<job>/\` (job descriptors,"
  echo "committed) and \`$P/cache/jobs/<job>/archive.sqlite.zst\` (Apollo). Restore: \`zstd -d -q <archive>.zst -o <archive>\`,"
  echo "then compare with the recorded sha256. Reproduction without them: rerun the official chain at \`$HEAD_SHA\`"
  echo "(\`study/chains/chain.sh\`, \`RUN_COMMANDS.md\`) — seeds, budgets and doors are frozen and E5 showed lane-level"
  echo "determinism, so a missing archive means recomputation, not a different result."
  echo
  echo "Current on-disk sizes: $(du -sb $P/cache/jobs 2>/dev/null | cut -f1) bytes under \`$P/cache/jobs\`."
  echo
  echo "## 3. The total-portfolio daily series"
  echo
  echo "\`study/reports/portfolio/series/*.csv\` (one per scenario, primary leverage and variant) are in the ZIP; the other"
  echo "leverage levels and variants are reproducible with \`npm run gdx8-port -- run\` (RUN_COMMANDS.md)."
  echo
  echo "## 4. Engineering, pilot, diagnostic and door caches (Apollo only; git-ignored)"
  echo
  echo "$(for d in engineering pilot diagnostics doors datasets independent strategy-lab-scratch diag-test; do [ -d $P/cache/$d ] && printf '`%s` %s bytes; ' "$P/cache/$d" "$(du -sb $P/cache/$d | cut -f1)"; done)"
  echo "Regenerated by the engineering and diagnostic commands in \`RUN_COMMANDS.md\` (non-official)."
  echo
  echo "## 5. Market data (local, git-ignored; licensed)"
  echo
  echo "\`data/GDX/\`, \`data/VOOG/\`, \`data/VGT/\` (Alpaca SIP minute bars; \`GDX_DATA_AUDIT.json\` gives hashes and coverage; the"
  echo "core files' hashes are in \`study/reports/portfolio/portfolio.json\`). The door files each stage read are identified by bytes, rows, sha256 and last row in"
  echo "\`study/data/DOOR_PINS.json\` and \`PROTOCOL_FREEZE.json\`. The independent Yahoo daily series used for the split check"
  echo "and the pre-2016 tail stress, and the distribution events, are in \`$P/cache/independent/\` (not redistributed)."
  echo
  echo "## 6. GPU binary and toolchain"
  echo
  echo "\`research/gpu-phase7/build/gb7\` sha256 \`$(sha256sum research/gpu-phase7/build/gb7 | cut -d' ' -f1)\` ($(stat -c %s research/gpu-phase7/build/gb7) bytes): rebuilt"
  echo "reproducibly from the pinned sources by \`tools/gpu-backend/verify-acceptance.sh --rebuild\` (record \`reference/config/gpu-backend/acceptance.json\`)."
  echo
  echo "## 7. Logs and dependencies"
  echo
  echo "Per-stage logs \`$P/cache/logs/chain/*.log\` ($(ls $P/cache/logs/chain | wc -l) files, $(du -sb $P/cache/logs/chain | cut -f1) bytes; the chain log is included as"
  echo "\`study/results/logs/chain.log\`) and per-job logs stay on Apollo; \`node_modules\` is restored by \`npm ci\`."
} > "$B/OMITTED_ARTIFACTS.md"

# 6. identity
{
  echo "P8-GDX (Priority 8: GDX-only D1 + Growth and the matched total-portfolio comparison) — handoff identity"
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
  echo "brief: brief/BRIEF.md sha256 $(sha256sum $P/brief/BRIEF.md | cut -d' ' -f1)"
  echo "node: $(cat .node-version 2>/dev/null || node --version)"
  echo "built: $(date -u +%FT%TZ)"
  echo
  echo "Exact tree: git clone <remote> && git checkout $HEAD_SHA (study files under $P/)."
  echo "Reading order: see READ_FIRST.md."
} > "$B/IDENTITY.txt"

# 7. checksums, zip, verification
( cd "$B" && find . -type f ! -name SHA256SUMS.txt | sort | xargs -d '\n' sha256sum > SHA256SUMS.txt )
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" && zip -T "$NAME.zip" )
mkdir -p "$S/x" && ( cd "$S/x" && unzip -q "../$NAME.zip" && cd "$NAME" && sha256sum -c --quiet SHA256SUMS.txt && echo "checksums OK after extraction: $(wc -l < SHA256SUMS.txt) files" )
if grep -rIlE 'BEGIN [A-Z ]*PRIVATE KEY|ALPACA_(API|SECRET)_KEY *= *[A-Za-z0-9]|APCA_API_(KEY_ID|SECRET_KEY) *= *[A-Za-z0-9]|ghp_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]{20}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{24}|@gmail\.com|[Pp]assword *[:=] *[^ ]' "$S/x/$NAME"; then echo "FORBIDDEN CONTENT"; exit 1; fi
if [ -f .env ]; then while IFS='=' read -r k v; do v=${v%\"}; v=${v#\"}; if [ ${#v} -ge 12 ] && grep -rqF -- "$v" "$S/x/$NAME"; then echo "A CREDENTIAL VALUE FROM .env ($k) IS IN THE BUNDLE"; exit 1; fi; done < <(grep -E '^[A-Z_]+=' .env); fi
if find "$S/x/$NAME" \( -name '*.sqlite*' -o -name '*.zst' -o -name 'data.csv' -o -name '*.parquet' -o -name 'api-token' -o -name '*.bin' -o -name 'gb7' -o -name '*.so' -o -name '*.csv.gz' \) | grep -q .; then echo "A DATABASE, ARCHIVE, BINARY OR MARKET-DATA FILE IS IN THE BUNDLE"; exit 1; fi
if find "$S/x/$NAME" -type f -size +20M | grep -q .; then echo "A FILE OVER 20 MB IS IN THE BUNDLE"; find "$S/x/$NAME" -type f -size +20M; exit 1; fi
echo "secrets / personal-data scan: clean (patterns and every .env value); no database, archive, binary or market-data file"
sha256sum "$S/$NAME.zip"; stat -c '%s bytes' "$S/$NAME.zip"; unzip -l "$S/$NAME.zip" | tail -1
