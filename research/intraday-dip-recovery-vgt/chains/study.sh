#!/usr/bin/env bash
# The study chain (PROTOCOL.md §7, §9, §10): C19 → C21 → C23 (each fold selection sealed and COMMITTED before its slice
# opens), the sequential verdict, the ablation and the controls (development), then C24 (independent, informed and
# exploratory lanes), its qualification and the development diagnostics. It stops before freeze-selection, which is run
# by hand after inspection, committed, and only then followed by the one-time validation. Run from the repository root.
set -euo pipefail
R="npm run --silent dip-recovery --"
S=research/intraday-dip-recovery-vgt
st() { echo "[chain $(date -u +%H:%M:%SZ)] $*"; }
commit() {
  git add "$S/results" "$S/RESEARCH_RECOVERY.md" 2>/dev/null || true
  git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DuunkPS1YRZarRmZkuK5Bf"
  st "committed $(git log --oneline -1)"
}

for C in C19 C21 C23; do
  for F in F1 F2 F3 F4; do
    st "search $C indep $F"
    $R launch --unit dip-search-$C-indep-$F --wait -- search --cutoff $C --lane indep --family $F
  done
  st "qualify $C"
  $R launch --unit dip-qualify-$C --wait -- qualify --cutoff $C
  $R launch --unit dip-seal-fold-$C --wait -- seal-fold --cutoff $C
  commit "intraday-dip-recovery-vgt: $C searches, qualification and the sealed fold selection (committed before its slice opens)"
  $R launch --unit dip-fold-eval-$C --wait -- fold-eval --cutoff $C
  commit "intraday-dip-recovery-vgt: $C fold evaluation (its slice, after the committed selection)"
done

st "sequential, ablation, controls"
$R launch --unit dip-sequential --wait -- sequential
$R launch --unit dip-ablation --wait -- ablation
$R launch --unit dip-controls --wait -- controls
commit "intraday-dip-recovery-vgt: the sequential procedure verdict, the L0–L5 ablation and the development controls"

for L in indep informed explore2; do
  for F in F1 F2 F3 F4; do
    st "search C24 $L $F"
    $R launch --unit dip-search-C24-$L-$F --wait -- search --cutoff C24 --lane $L --family $F
  done
done
st "qualify C24"
$R launch --unit dip-qualify-C24 --wait -- qualify --cutoff C24
$R launch --unit dip-diagnostics --wait -- diagnostics
commit "intraday-dip-recovery-vgt: C24 searches (independent, informed, exploratory 2 bps), qualification and development diagnostics"
st "chain done: inspect, then freeze-selection, commit, validate"
