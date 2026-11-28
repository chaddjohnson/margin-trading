#!/bin/bash
# Assignment 2 §6.2: the two previously demonstrated historical reproductions, re-run with the candidate's tool
# (tools/historical-repro/env.ts), environments outside the repository, removed afterwards. Outputs: evidence/historical-repro/.
W=$(cd "$(dirname "$0")/../../../.." && pwd)   # the checkout holding this script (the Assignment 2 worktree when first run)
E=$W/docs/data-updates/2026-11-27-assignment-2/evidence/historical-repro
B=/home/chad/.local/share/margin-trading-worktrees
NODE="node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning"
cd "$W" || exit 1
say() { echo "$(date -u +%FT%TZ) $*"; }
# 1. vg-l0-full-joint (Assignment 3) at 67b4ae71
say "prepare vg-l0-full-joint"
$NODE tools/historical-repro/env.ts prepare --commit 67b4ae71 --dir $B/repro-vgl0fj \
  --data VGT=2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e \
  --data GDX=77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049 \
  --copy .cache/vg-d1-growth-joint/doors --seals research/vg-l0-full-joint/results/seals.jsonl > "$E/vgl0fj-prepare.txt" 2>&1; say "prepare exit=$?"
cp -f $B/repro-vgl0fj/REPRODUCTION.json "$E/vgl0fj-REPRODUCTION.json" 2>/dev/null
( cd $B/repro-vgl0fj/tree && GPU_POLICY_PURPOSE=diagnostic npm run vg-l0fj -- doors > "$E/vgl0fj-doors.txt" 2>&1; echo "exit=$?" >> "$E/vgl0fj-doors.txt"
  GPU_POLICY_PURPOSE=diagnostic npm run vg-l0fj -- verify > "$E/vgl0fj-verify.txt" 2>&1; echo "exit=$?" >> "$E/vgl0fj-verify.txt"
  git status --porcelain --untracked-files=no > "$E/vgl0fj-git-status.txt"; echo "exit=$?" >> "$E/vgl0fj-git-status.txt" )
say "vg-l0-full-joint doors $(tail -1 "$E/vgl0fj-doors.txt"), verify $(tail -1 "$E/vgl0fj-verify.txt")"
$NODE tools/historical-repro/env.ts remove --dir $B/repro-vgl0fj > "$E/vgl0fj-remove.txt" 2>&1; say "remove exit=$?"
# 2. Priority 2 (VGT-only) at 47422d04
say "prepare vgt-d1-growth-joint"
$NODE tools/historical-repro/env.ts prepare --commit 47422d04 --dir $B/repro-p2 \
  --data VGT=2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e \
  --copy .cache/vgt-d1-growth-joint/doors --seals research/vgt-d1-growth-joint/results/seals.jsonl > "$E/p2-prepare.txt" 2>&1; say "prepare exit=$?"
cp -f $B/repro-p2/REPRODUCTION.json "$E/p2-REPRODUCTION.json" 2>/dev/null
( cd $B/repro-p2/tree && GPU_POLICY_PURPOSE=diagnostic npm run vgt-joint -- doors > "$E/p2-doors.txt" 2>&1; echo "exit=$?" >> "$E/p2-doors.txt"
  git status --porcelain --untracked-files=no > "$E/p2-git-status.txt"; echo "exit=$?" >> "$E/p2-git-status.txt" )
say "priority 2 doors $(tail -1 "$E/p2-doors.txt")"
$NODE tools/historical-repro/env.ts remove --dir $B/repro-p2 > "$E/p2-remove.txt" 2>&1; say "remove exit=$?"
git -C "$W" worktree list > "$E/worktree-list-after.txt"
say "done"
