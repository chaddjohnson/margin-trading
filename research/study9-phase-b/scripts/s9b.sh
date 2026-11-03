#!/usr/bin/env bash
# Study 9 Phase B command wrapper (RUN_COMMANDS.md): research/study9-phase-b/scripts/s9b.sh <command> [args…]
# Runs src/study9-phase-b/main.ts from the repository root with Node v24.21.0. (The npm script `study9b` is added to
# package.json only after the study: Phase A's integrity pins include package.json.)
set -euo pipefail
R=/home/chad/projects/margin-trading
cd "$R"
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
exec node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288 \
  src/study9-phase-b/main.ts "$@"
