#!/bin/bash
# RES-BD 1.0.0 S5 — proportionate nonregression for a report-only assignment (brief §5): the tool tests, Stage B's own
# tests, the full `npm test` (known pre-existing failures compared by name), the study preflights of every study, the
# sealed-file check of every study, the integrity diff against Stage B's final commit 1c1f9e72 outside the two new
# namespaces, the independent acceptance verifier (pins = tree; no rebuild, no device job), and Strategy Lab's portfolio
# parity with state/strategy-lab fingerprinted before and after (the live dist untouched). No GPU job is started.
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
OUT=research/vg-l0-risk-envelope-stage-b-diagnostics/results/regression
mkdir -p "$OUT"
echo "head $(git rev-parse HEAD) t $(date -u +%FT%TZ)" > "$OUT/head.txt"
fp() { find state/strategy-lab -type f -printf '%p %s %T@\n' | sort | sha256sum | cut -d' ' -f1; }
fp > "$OUT/strategy-lab-state-before.txt"
find apps/strategy-lab/dist -type f -newer research/vg-l0-risk-envelope-stage-b-diagnostics/PROTOCOL.md | wc -l > "$OUT/strategy-lab-dist-newer-before.txt"
r() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@" > "$OUT/$name.txt" 2>&1; local rc=$?; echo "exit=$rc" >> "$OUT/$name.txt"; echo "$(date -u +%FT%TZ) end [$name] rc=$rc"; return 0; }
r tool-tests "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test tools/vg-l0-risk-envelope-stage-b-diagnostics/tests/tools.test.ts
r stageb-tests "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-l0-risk-envelope-stage-b/tests/*.test.ts
r npm-test npm test
r preflight-all npm run --silent research-preflight -- --all
r seals "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/seal-protect.ts --check --out "$OUT/seals.json"
r integrity-diff git diff --stat 1c1f9e72 HEAD -- . ':(exclude)research/vg-l0-risk-envelope-stage-b-diagnostics' ':(exclude)tools/vg-l0-risk-envelope-stage-b-diagnostics'
r acceptance tools/gpu-backend/verify-acceptance.sh --expect-record-sha256 bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7
r portfolio-parity npm --prefix apps/strategy-lab run portfolio-parity -- --out research/vg-l0-risk-envelope-stage-b-diagnostics/results/regression/portfolio-parity.json
fp > "$OUT/strategy-lab-state-after.txt"
find apps/strategy-lab/dist -type f -newer research/vg-l0-risk-envelope-stage-b-diagnostics/PROTOCOL.md | wc -l > "$OUT/strategy-lab-dist-newer-after.txt"
echo "$(date -u +%FT%TZ) REGRESSION COMPLETE"
