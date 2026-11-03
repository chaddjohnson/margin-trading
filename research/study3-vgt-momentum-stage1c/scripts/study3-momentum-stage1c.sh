#!/bin/sh
# The Stage 1c CLI (no package.json script: earlier studies' code-freeze manifests include package.json).
# Run from the repository root, one stage per process (each stage has one data door):
#   sh research/study3-vgt-momentum-stage1c/scripts/study3-momentum-stage1c.sh status | verify | timing | stage <name> [history]
exec node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=16384 \
  src/study3-vgt-momentum-stage1c/main.ts "$@"
