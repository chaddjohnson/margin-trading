#!/usr/bin/env bash
# Runs every command listed in RUN_COMMANDS.md and keeps each log with its exit status (repository root, Node 24).
set -u
L=research/study5-gdx-d1-b5-three-etf-2026-10/results/logs/commands
mkdir -p "$L"
RES=config/research-phenotypes/study5-gdx-d1-b5-three-etf/D1/GDX.json
run() { local name=$1; shift; local started; started=$(date -u +%FT%TZ); "$@" > "$L/$name.log" 2>&1; local code=$?; echo "$started $name exit $code :: $*" | tee -a "$L/index.txt"; }
: > "$L/index.txt"
run pools-validate npm run pools -- validate
run pools-fixed-B5 npm run pools -- fixed B5 --out evaluations/study5/commands/B5-fixed-all
run pools-fixed-B5-end-2026-10-13 npm run pools -- fixed B5 --end 2026-10-13 --out evaluations/study5/commands/B5-fixed-to-2026-10-13
run pools-fixed-B5-3ETF-ablation npm run pools -- fixed B5-3ETF-ablation --out evaluations/study5/commands/B5-3ETF-ablation-fixed-all
run study5-pool-S5-T1P npm run study5 -- pool fixed S5-T1P
run study5-pool-S5-T1S npm run study5 -- pool fixed S5-T1S
run study5-pool-S5-GDX-portfolioAware npm run study5 -- pool fixed S5-GDX-portfolioAware
run study5-pool-S5-GDX-NearMiss1 npm run study5 -- pool fixed S5-GDX-NearMiss1
run study5-pool-S5-GDX-NearMiss2 npm run study5 -- pool fixed S5-GDX-NearMiss2
run study5-pool-S5-GDX-NearMiss3 npm run study5 -- pool fixed S5-GDX-NearMiss3
run app-GDX-all-portfolioAware npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype portfolioAware
run app-GDX-all-NearMiss1 npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype s5StandaloneNearMiss1 --phenotype-file $RES
run app-GDX-all-NearMiss2 npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype s5StandaloneNearMiss2 --phenotype-file $RES
run app-GDX-all-NearMiss3 npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype s5StandaloneNearMiss3 --phenotype-file $RES
run app-GDX-all-Track1P npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype s5Track1P --phenotype-file $RES
