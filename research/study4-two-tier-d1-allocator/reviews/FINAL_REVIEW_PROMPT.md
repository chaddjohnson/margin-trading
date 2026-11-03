# Prompt given to the final independent code-and-evidence reviewer (verbatim)

You are the independent final code-and-evidence reviewer of Study 4 in /home/chad/projects/margin-trading (branch
research/study4-two-tier-d1-allocator). READ-ONLY: do not edit, create or delete any file except your report (which the
study lead saves); do not run npm scripts that write records (`develop`, `evaluate`, `final`, `freeze-*`, `parity-*`);
do NOT open anything under data/ (the 2024–2026 bars are embargoed; reading any bar file is forbidden). You may run:
`npm run study4-allocator -- status`, `npm run study4-allocator -- verify`,
`python3 -I research/study4-two-tier-d1-allocator/scripts/report.py` (regenerates results/tables/, results/ledgers/ and the
root reports from report_templates/ — idempotent on the sealed records; report any diff it produces with `git diff`/
`diff`), `git` read-only commands, and the Study 4 unit tests
(`node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/study4-two-tier-d1-allocator/tests/*.test.ts'`,
synthetic data only). Node: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.

Read the brief (`research/study4-two-tier-d1-allocator/brief/…md`), PROTOCOL.md, ENGINE_CONTRACT.md, SEARCH_PLAN.md,
AMENDMENTS.md, IMPLEMENTATION_AUDIT.md, the reports, the sealed records under results/ (JSON) and the code in
src/study4-two-tier-d1-allocator/.

Check and report, with file:line or record-path evidence:
1. Recompute the decision rubric (PROTOCOL §12) and every experiment's chained Δ versus B5 from the sealed machine
   records (results/evaluation/RECORD.json and the stage records), independently of the study's own rubric code; flag
   any disagreement with results/FINAL.json or the reports.
2. Verify that 4D-A, 4D-A0P, 4D-B, 4D-B0, 4D-C and 4D-C0 ran to their frozen floors in every window (F20–F23, H), that
   4A covered every symbol with a band, and that the amendments (A1–A5) are transparent and did not change any
   criterion after outcomes. A5 was made after the evaluation door opened (the first evaluation run crashed after
   printing four procedures' results): check that the fix is mechanical, that nothing was sealed by the crashed run,
   that the rerun reproduced the printed figures (results/logs/evaluate-run1-crashed.log versus evaluate.log) and that
   the disclosure is complete.
3. Challenge the preemption execution and causal ordering in allocator.ts against ENGINE_CONTRACT.md (sale/purchase
   timing, supersession, stale/orphan rules, fill tests, P4, P0M, gates, chained transitions); look for look-ahead.
4. Check the 2024+ embargo: doors.ts, the door log results/doors.jsonl, every stage's door record (last dates, prefix
   bytes), and that no code path (tests, overlays, parity) read bars after 2023-12-29 or hashed whole data files.
5. Check that every fold selection was sealed before the (first) evaluation door opened, and that H ran after the
   evaluation was sealed (results/doors.jsonl, the records' sealedAt fields).
6. Check B5 parity (results/parity/*), the reference engine's independence and its one documented patch (A18), and the
   claim that fast = reference.
7. Inspect every path modified relative to commit 9d9513bf (`git status`, `git diff --stat 9d9513bf`), and confirm that
   no frozen control (config/pools, config/phenotypes, the prospective shadow protocol, earlier studies, data/) changed.
8. Check scripts/report.py (it derives seed stability, B5's idle gaps, exposure and the per-trade preservation listing
   from the sealed records) and tests/doors.test.ts (made location- and state-independent after the first data-less
   run). Check that the reports' numbers match the sealed records and that limitations (in-sample nature, designer knowledge,
   B5 hindsight, overlay not evaluated, mirror-lot management, F20's two B5 lots) are stated.

Output: a numbered list of findings with severity (BLOCKER / MAJOR / MINOR / NOTE), evidence, and a concrete fix; then
your independent recomputation of the labels; then an overall assessment. Under 2,500 words.
