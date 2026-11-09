# Run commands — `intraday-dip-recovery-vgt`

Every command runs from the repository root with Node v24.21.0. Heavy stages run as transient systemd user units inside
`diprecovery.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a time, through `launch`. Their logs go to
`results/logs/<unit>.log`. Sealed stages refuse a rerun. A stopped or killed job resumes when the same command is rerun:
its archive `.cache/intraday-dip-recovery-vgt/jobs/<job>/archive.jsonl` is read back.

```sh
R="npm run --silent dip-recovery --"

# engineering, before the freeze
$R coverage                                   # results/data/coverage.json (timestamps only)
$R doors                                      # results/data/doors.json
$R launch --unit dip-parity --wait -- parity  # results/parity/parity.json (sealed)
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/intraday-dip-recovery/tests/*.test.ts
bash research/intraday-dip-recovery-vgt/chains/pilot.sh   # the pilot (cache outputs)
$R launch --unit dip-bench-w12 --wait -- bench --door D24 --centres 384 --workers 12 --gc 1024 --label w12
npm run research-preflight -- --study research/intraday-dip-recovery-vgt
$R freeze-protocol                            # results/protocol-freeze.json (then commit)

# the chain (research/intraday-dip-recovery-vgt/chains/study.sh)
$R launch --unit dip-search-C19-indep-F1 --wait -- search --cutoff C19 --lane indep --family F1   # … F2 F3 F4
$R launch --unit dip-qualify-C19 --wait -- qualify --cutoff C19
$R seal-fold --cutoff C19                     # then commit results/folds/C19-selection.json
$R fold-eval --cutoff C19                     # refuses an uncommitted selection
# … the same for C21 and C23, then:
$R sequential
$R ablation
$R controls
# C24: indep F1–F4, informed F1–F4, explore2 F1–F4, then
$R launch --unit dip-qualify-C24 --wait -- qualify --cutoff C24
$R diagnostics
$R freeze-selection                           # then commit FROZEN_SELECTION.json
$R launch --unit dip-validate --wait -- validate   # once; refuses unless FROZEN_SELECTION.json is committed
$R verify                                     # re-hash every sealed record
```
