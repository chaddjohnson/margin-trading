#!/bin/bash
# TSLA outcome identity fix — portable handoff ZIP (brief §6). Contents (top directory tsla-outcome-identity-fix-handoff/):
# the required documents (READ_FIRST.md first), the brief and the checkpoint, the report-only replay output, the scoped
# patch and the full new/changed sources at the fix commit (plus the pre-fix outcome.ts), the evidence (fingerprints,
# reproduction, test logs, acceptance and seal verification), the five sealed TSLA inputs of the replay (byte copies,
# sha256-pinned) for independent checking, IDENTITY.txt, VERIFICATION.md and SHA256SUMS.txt.
# Two passes: the first archive is extracted and verified (zip -T, every checksum, secrets / personal-data scan, no
# database / archive / binary / market data, no file over 5 MB) and VERIFICATION.md records it; the final archive adds
# VERIFICATION.md, regenerates SHA256SUMS.txt and is verified the same way. The final result is printed (recorded
# outside the ZIP in bundle/FINAL_VERIFICATION.txt by the caller).
#   tools/tsla-outcome-identity-fix/bundle.sh <scratch dir> <remote-verified fix commit>
set -euo pipefail
cd /home/chad/projects/margin-trading
S=$1; FIX=$2
NAME=tsla-outcome-identity-fix-handoff
E=docs/engineering/tsla-outcome-identity-fix
BASE=421e4c87780844e4e49c079586aa5c4945cc9e35
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git merge-base --is-ancestor "$FIX" HEAD || { echo "the fix commit $FIX is not an ancestor of HEAD"; exit 1; }
CODE="src/research-outcome src/tsla-d1-growth/outcome.ts src/tsla-d1-growth/tests/outcome.test.ts tools/tsla-outcome-identity-fix"
[ -z "$(git diff "$FIX" -- $CODE)" ] || { echo "the code differs from the fix commit $FIX"; exit 1; }
rm -rf "$S/$NAME" "$S/$NAME.zip" "$S/x"; mkdir -p "$S/$NAME"
B="$S/$NAME"

# 1. documents
for f in READ_FIRST.md REPORT.md SOURCE_DIFF.md TEST_REPORT.md OUTCOME_RECONCILIATION.md RESEARCH_RECOVERY.md DECISION_REGISTER.md BRIEF.md WORK_RECOVERY.md; do
  [ -f "$E/$f" ] || { echo "missing $E/$f"; exit 1; }
  cp "$E/$f" "$B/$f"
done
mkdir -p "$B/replay" "$B/chains" && cp "$E/replay/outcome.corrected.report-only.json" "$B/replay/" && cp "$E/chains/"* "$B/chains/"

# 2. source: the scoped patch against the Priority 6 handoff commit, the new/changed files at the fix commit, the
#    pre-fix outcome.ts
git diff "$BASE" "$FIX" -- $CODE > "$B/source.patch"
for f in $(git diff --name-only "$BASE" "$FIX" -- $CODE); do mkdir -p "$B/source/$(dirname "$f")"; git show "$FIX:$f" > "$B/source/$f"; done
mkdir -p "$B/source/original/src/tsla-d1-growth" && git show "$BASE:src/tsla-d1-growth/outcome.ts" > "$B/source/original/src/tsla-d1-growth/outcome.ts"

# 3. evidence (text only)
mkdir -p "$B/evidence/tests"
find "$E/evidence" -maxdepth 1 -type f -exec cp {} "$B/evidence/" \;
cp "$E/evidence/tests/"* "$B/evidence/tests/"

# 4. the sealed TSLA inputs of the replay (byte copies; sha256 equal to their pins)
for f in FROZEN_SELECTION.json results/validation/validation.json results/sequential.json results/outcome.json reports/tables/outcome-join.json; do
  mkdir -p "$B/reference/research/tsla-d1-growth/$(dirname "$f")"; cp "research/tsla-d1-growth/$f" "$B/reference/research/tsla-d1-growth/$f"
  chmod u+w "$B/reference/research/tsla-d1-growth/$f"
done

# 5. identity
{
  echo "TSLA outcome-reporting identity fix (pre-GDX engineering assignment) — handoff identity"
  echo "branch: $BRANCH"
  echo "fix commit (code, tests, tools, engineering record; remote-verified before packaging): $FIX"
  echo "handoff commit: the commit after $FIX on $BRANCH adds this ZIP (verify with git ls-remote origin $BRANCH)"
  echo "base: $BASE (research/tsla-d1-growth, Priority 6 handoff)"
  echo "remote: origin $(git remote get-url origin | sed -E 's#https://[^@]*@#https://#')"
  echo "main (untouched): $(git rev-parse main)"
  echo "sealed outcome (unchanged): research/tsla-d1-growth/results/outcome.json sha256 $(sha256sum research/tsla-d1-growth/results/outcome.json | cut -d' ' -f1)"
  echo "report-only replay: $E/replay/outcome.corrected.report-only.json sha256 $(sha256sum $E/replay/outcome.corrected.report-only.json | cut -d' ' -f1)"
  echo "GPU acceptance record (unchanged): config/gpu-backend/acceptance.json sha256 $(sha256sum config/gpu-backend/acceptance.json | cut -d' ' -f1)"
  echo "brief: BRIEF.md sha256 $(sha256sum $E/BRIEF.md | cut -d' ' -f1)"
  echo "node: $(cat .node-version)"
  echo "built: $(date -u +%FT%TZ)"
} > "$B/IDENTITY.txt"

verify() { # <zip> → extraction, checksums, scans
  rm -rf "$S/x"; mkdir -p "$S/x"
  ( cd "$S" && zip -T "$1" )
  ( cd "$S/x" && unzip -q "../$1" && cd "$NAME" && sha256sum -c --quiet SHA256SUMS.txt && echo "checksums OK after extraction: $(wc -l < SHA256SUMS.txt) files" )
  if grep -rIlE 'BEGIN [A-Z ]*PRIVATE KEY|ALPACA_(API|SECRET)_KEY *= *[A-Za-z0-9]|APCA_API_(KEY_ID|SECRET_KEY) *= *[A-Za-z0-9]|ghp_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]{20}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{24}|@gmail\.com|[Pp]assword *[:=] *[^ ]' "$S/x/$NAME"; then echo "FORBIDDEN CONTENT"; exit 1; fi
  if [ -f .env ]; then while IFS='=' read -r k v; do v=${v%\"}; v=${v#\"}; if [ ${#v} -ge 12 ] && grep -rqF -- "$v" "$S/x/$NAME"; then echo "A CREDENTIAL VALUE FROM .env ($k) IS IN THE BUNDLE"; exit 1; fi; done < <(grep -E '^[A-Z_]+=' .env); fi
  if find "$S/x/$NAME" \( -name '*.sqlite*' -o -name '*.zst' -o -name 'data.csv' -o -name '*.parquet' -o -name 'api-token' -o -name '*.bin' -o -name 'gb7' -o -name '*.so' -o -name '*.csv.gz' -o -name '*.zip' \) | grep -q .; then echo "A DATABASE, ARCHIVE, BINARY OR MARKET-DATA FILE IS IN THE BUNDLE"; exit 1; fi
  if find "$S/x/$NAME" -type f -size +5M | grep -q .; then echo "A FILE OVER 5 MB IS IN THE BUNDLE"; exit 1; fi
  for f in FROZEN_SELECTION.json:0ebb6b62ad95b1bdb9b6fb14a4a50f38ddceb49ba86b045d3cd34ef53e1a8791 results/validation/validation.json:b0f654009960fbaca6debdb0a803885083d2a5428e206ff3234b647e126ff63f results/sequential.json:2a1079a0a9d1e6dea4cd9d809e1a0413794ccc41152a02a975105c7210f28ce8 results/outcome.json:a414631e41da8285f6785e2f98dc92bca0244b24fb149da534ba36a18463bf79 reports/tables/outcome-join.json:df18bd93e85f145419ab83342707e9de51025f7f2c741cda186870c144ca0cb2; do
    [ "$(sha256sum "$S/x/$NAME/reference/research/tsla-d1-growth/${f%%:*}" | cut -d' ' -f1)" = "${f##*:}" ] || { echo "reference ${f%%:*} differs from its pin"; exit 1; }
  done
  echo "secrets / personal-data scan: clean (patterns and every .env value); no database, archive, binary or market-data file; no file over 5 MB; the 5 sealed reference inputs equal their pins"
}
sums() { ( cd "$B" && find . -type f ! -name SHA256SUMS.txt | sort | xargs -d '\n' sha256sum > SHA256SUMS.txt ); }

# 6. pass 1: build, verify, record
sums
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" )
P1=$(verify "$NAME.zip")
P1SHA=$(sha256sum "$S/$NAME.zip" | cut -d' ' -f1); P1N=$(wc -l < "$B/SHA256SUMS.txt")
{
  echo "# VERIFICATION — handoff ZIP extraction and checksum report"
  echo
  echo "Built by \`tools/tsla-outcome-identity-fix/bundle.sh\` from fix commit \`$FIX\` on \`$BRANCH\`."
  echo
  echo "## Pass 1 (every file of this bundle except this report)"
  echo
  echo "- archive sha256 \`$P1SHA\`, $P1N files listed in SHA256SUMS.txt"
  echo '```'
  echo "$P1"
  echo '```'
  echo
  echo "## Final archive"
  echo
  echo "The final archive is pass 1 plus this report, with SHA256SUMS.txt regenerated over every file. It is verified the"
  echo "same way (zip -T; extraction; \`sha256sum -c SHA256SUMS.txt\`; the scans; the five reference inputs against their"
  echo "pins). Its own sha256 is recorded outside the archive in \`$E/bundle/FINAL_VERIFICATION.txt\` and in the final report."
  echo
  echo "## How to re-verify after download"
  echo
  echo '```'
  echo "unzip $NAME.zip && cd $NAME && sha256sum -c SHA256SUMS.txt"
  echo '```'
} > "$B/VERIFICATION.md"

# 7. final: rebuild with VERIFICATION.md, verify again
rm -f "$S/$NAME.zip"; sums
( cd "$S" && zip -qr -X "$NAME.zip" "$NAME" )
verify "$NAME.zip"
sha256sum "$S/$NAME.zip"; stat -c '%s bytes' "$S/$NAME.zip"; unzip -l "$S/$NAME.zip" | tail -1
