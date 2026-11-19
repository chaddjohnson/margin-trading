# Amendments — growth140-vgt-stable

Append-only. Each entry: `## <ID> — <UTC time> — <title>`, then what changed, why, the exposure at that time (which
doors had been opened and which stages were sealed), and which results it affects. A code change after the freeze also
needs `npm run growth140-stable -- acknowledge-code <ID>`.


## O1 — 2026-11-07T14:43Z — operational incident: P0 parity failed on a job-name collision; stages started out of order

- **What happened.** The first study run of P0 parity (14:41:01Z) passed the browser comparison for every
  configuration it reached (0 differences) and then failed opening its door-causality sub-job: the pilot run of the
  same command had created `.cache/growth140-vgt-stable/jobs/parity-causality-D24` (and D19/D21/D23, `parity-reuse`)
  under the unfrozen binding, and the archive correctly refused the frozen binding. The launch chain did not stop on
  the failure (a shell `set -e` inside `{ … } || …`), so the archive-only audit ran and sealed (14:41:51Z), and the audit
  re-evaluation (14:41:52Z) and the sensitivity job (14:42:3xZ) started before P0 had passed. Both were stopped
  gracefully (SIGTERM → checkpoint, exit 75) within a minute; no seeds were written and no search had started.
- **Remedy (no protocol or code change).** The pilot's five sub-job folders were moved to
  `.cache/growth140-vgt-stable/pilot-attempt-2-subjobs/`; P0 is rerun in full (its browser part recomputes from the
  same frozen-bound archive); the audit re-evaluation and the sensitivity job then resume with their unchanged
  commands (deterministic resume, §3.3). Later chains stop explicitly on any non-zero status.
- **Exposure.** Development doors only (D24 for the browser parity and the two stopped jobs). The sealed audit is
  archive-only (no evaluation) and is unaffected by P0's order. Disclosed in the report.
- **Also disclosed.** The pre-freeze pilot run of the P0 checks opened D19, D21, D23 and D24 (engineering booleans
  only), and the pilot sensitivity code ran on D19.
