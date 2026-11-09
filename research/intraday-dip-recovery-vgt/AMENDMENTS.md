# Amendments to PROTOCOL.md

Append-only. Each entry is dated from the clock (UTC). It states what changed and why, which results existed when it
was made, and its effect, and it confirms that no validation-period information was involved. Criteria are never
loosened once results they govern exist. Sealed records are never rewritten; superseded attempts are kept beside their
reruns. An evaluation-code change is acknowledged by a sealed `results/amendments/<ID>.json` that records the new code
digest.

(No amendment yet. Before the freeze, the engineering record of the parity dry runs is preserved in
`results/parity/dry-run-1-failed.txt`. That run found a defect of the independent reference, not of the engine.)
