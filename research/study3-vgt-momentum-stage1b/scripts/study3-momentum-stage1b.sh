#!/bin/sh
# The Stage 1b CLI (no package.json script: Stage 1's code-freeze manifest includes package.json).
# Run from the repository root: sh research/study3-vgt-momentum-stage1b/scripts/study3-momentum-stage1b.sh status
exec node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=16384 \
  src/study3-vgt-momentum-stage1b/main.ts "$@"
